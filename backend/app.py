import os, psycopg2, bcrypt, csv, time, base64, json
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sock import Sock
from dotenv import load_dotenv

# ── MediaPipe + CV2 (new Tasks API for mediapipe >= 0.10) ─────────────────────
try:
    import cv2
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    # Auto-download the lite pose landmarker model if not present
    MODEL_PATH = os.path.join(os.path.dirname(__file__), "pose_landmarker_lite.task")
    if not os.path.exists(MODEL_PATH):
        import urllib.request
        print("[INFO] Downloading pose landmarker model...")
        urllib.request.urlretrieve(
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            MODEL_PATH
        )
        print("[OK] Model downloaded.")

    from core.detection_logic import FallDetector, PersonPresenceDetector
    from core.websocket_manager import manager as ws_manager

    # ── Create ONE global PoseLandmarker instance (reused for every frame) ────
    # Creating it per-frame loads the model each time = 200-500ms overhead per frame.
    _base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    _pose_options = mp_vision.PoseLandmarkerOptions(
        base_options=_base_options,
        running_mode=mp_vision.RunningMode.IMAGE,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        num_poses=1
    )
    _global_landmarker = mp_vision.PoseLandmarker.create_from_options(_pose_options)

    AI_AVAILABLE = True
    print("[OK] MediaPipe Tasks API + AI Detection loaded. Global landmarker ready.")
except Exception as e:
    AI_AVAILABLE = False
    _global_landmarker = None
    print(f"[WARN] AI Detection not available: {e}")

load_dotenv()
app = Flask(__name__)
CORS(app)
sock = Sock(app)

# ── MediaPipe POSE_CONNECTIONS (for manual skeleton drawing) ──────────────────
POSE_CONNECTIONS = [
    (0,1),(1,2),(2,3),(3,7),(0,4),(4,5),(5,6),(6,8),
    (9,10),(11,12),(11,13),(13,15),(15,17),(15,19),(15,21),(17,19),
    (12,14),(14,16),(16,18),(16,20),(16,22),(18,20),
    (11,23),(12,24),(23,24),(23,25),(24,26),(25,27),(26,28),
    (27,29),(28,30),(29,31),(30,32),(27,31),(28,32)
]

def get_db():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

# ── Per-user live detector instances ─────────────────────────────────────────
_live_detectors = {}

def _get_live_detectors(user_id):
    uid = str(user_id)
    if uid not in _live_detectors:
        _live_detectors[uid] = {
            "detector": FallDetector(),
            "presence": PersonPresenceDetector(visibility_threshold=0.7, no_person_duration=2.0)
        } if AI_AVAILABLE else None
    entry = _live_detectors.get(uid)
    if entry:
        return entry["detector"], entry["presence"]
    return None, None

def _reset_live_detectors(user_id):
    uid = str(user_id)
    if uid in _live_detectors:
        del _live_detectors[uid]

# ── Health Check ──────────────────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("SELECT 1"); conn.close()
        return jsonify({"status": "ok", "db": "connected", "ai": AI_AVAILABLE})
    except Exception as e:
        return jsonify({"status": "error", "db": str(e)}), 500

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    pw_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, mobile, password_hash) VALUES (%s,%s,%s,%s) RETURNING id, name, email, mobile",
            (data['name'], data['email'], data.get('mobile',''), pw_hash)
        )
        user = cur.fetchone(); conn.commit(); conn.close()
        return jsonify({"id": user[0], "name": user[1], "email": user[2], "mobile": user[3]}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id, name, email, mobile, password_hash FROM users WHERE email=%s", (data['email'],))
    user = cur.fetchone(); conn.close()
    if user and bcrypt.checkpw(data['password'].encode(), user[4].encode()):
        return jsonify({"id": user[0], "name": user[1], "email": user[2], "mobile": user[3]})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute(
        "UPDATE users SET name=%s, mobile=%s WHERE id=%s RETURNING id, name, email, mobile",
        (data.get('name'), data.get('mobile', ''), user_id)
    )
    user = cur.fetchone(); conn.commit(); conn.close()
    if user:
        return jsonify({"id": user[0], "name": user[1], "email": user[2], "mobile": user[3]})
    return jsonify({"error": "User not found"}), 404

@app.route('/api/users/<int:user_id>/password', methods=['PUT'])
def change_password(user_id):
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT password_hash FROM users WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "User not found"}), 404
    if not bcrypt.checkpw(data['currentPassword'].encode(), row[0].encode()):
        conn.close()
        return jsonify({"error": "Current password is incorrect"}), 401
    new_hash = bcrypt.hashpw(data['newPassword'].encode(), bcrypt.gensalt()).decode()
    cur.execute("UPDATE users SET password_hash=%s WHERE id=%s", (new_hash, user_id))
    conn.commit(); conn.close()
    return jsonify({"success": True})

# ── Detection Logs ────────────────────────────────────────────────────────────
@app.route('/api/logs/<int:user_id>', methods=['GET'])
def get_logs(user_id):
    conn = get_db(); cur = conn.cursor()
    cur.execute(
        "SELECT id, type, confidence, source, timestamp FROM detection_logs WHERE user_id=%s ORDER BY timestamp DESC LIMIT 500",
        (user_id,)
    )
    rows = cur.fetchall(); conn.close()
    return jsonify([{"id": r[0], "type": r[1], "confidence": r[2], "source": r[3], "timestamp": r[4].isoformat()} for r in rows])

@app.route('/api/logs', methods=['POST'])
def add_log():
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute(
        "INSERT INTO detection_logs (user_id, type, confidence, source) VALUES (%s,%s,%s,%s) RETURNING id",
        (data['user_id'], data['type'], data['confidence'], data.get('source','mock'))
    )
    log_id = cur.fetchone()[0]; conn.commit(); conn.close()
    return jsonify({"id": log_id}), 201


# ── Reports ───────────────────────────────────────────────────────────────────
@app.route('/api/reports/<int:user_id>', methods=['GET'])
def get_reports(user_id):
    conn = get_db(); cur = conn.cursor()
    cur.execute(
        "SELECT id, file_name, file_uri, fall_detected, confidence, created_at FROM reports WHERE user_id=%s ORDER BY created_at DESC",
        (user_id,)
    )
    rows = cur.fetchall(); conn.close()
    return jsonify([{"id": r[0], "name": r[1], "uri": r[2], "fallDetected": r[3], "confidence": r[4], "date": r[5].isoformat()} for r in rows])

@app.route('/api/reports', methods=['POST'])
def add_report():
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute(
        "INSERT INTO reports (user_id, file_name, file_uri, fall_detected, confidence) VALUES (%s,%s,%s,%s,%s) RETURNING id",
        (data['user_id'], data['name'], data['uri'], data.get('fallDetected', False), data.get('confidence', 0))
    )
    report_id = cur.fetchone()[0]; conn.commit(); conn.close()
    return jsonify({"id": report_id}), 201

@app.route('/api/reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    conn = get_db(); cur = conn.cursor()
    cur.execute("DELETE FROM reports WHERE id=%s", (report_id,))
    conn.commit(); conn.close()
    return jsonify({"success": True})


@app.route('/api/reports/download/<path:filename>', methods=['GET'])
def download_report(filename):
    """
    Serves a CSV report file over HTTP so mobile devices can download/share it.
    URL: http://<server_ip>:5000/api/reports/download/<filename>.csv
    """
    reports_dir = os.path.join(os.path.dirname(__file__), 'reports')
    return send_from_directory(
        reports_dir,
        filename,
        as_attachment=True,
        download_name=filename,
        mimetype='text/csv'
    )

# ── Settings ──────────────────────────────────────────────────────────────────
@app.route('/api/settings/<int:user_id>', methods=['GET'])
def get_settings(user_id):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT voice_alerts, alert_cooldown, mode FROM user_settings WHERE user_id=%s", (user_id,))
    row = cur.fetchone(); conn.close()
    if row:
        return jsonify({"voiceAlerts": row[0], "alertCooldown": row[1], "mode": row[2]})
    return jsonify({"voiceAlerts": True, "alertCooldown": 15, "mode": "simulation"})

@app.route('/api/settings/<int:user_id>', methods=['PUT'])
def save_settings(user_id):
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute("""
        INSERT INTO user_settings (user_id, voice_alerts, alert_cooldown, mode)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_id) DO UPDATE
        SET voice_alerts=%s, alert_cooldown=%s, mode=%s, updated_at=CURRENT_TIMESTAMP
    """, (
        user_id, data.get('voiceAlerts', True), data.get('alertCooldown', 15), data.get('mode', 'simulation'),
        data.get('voiceAlerts', True), data.get('alertCooldown', 15), data.get('mode', 'simulation'),
    ))
    conn.commit(); conn.close()
    return jsonify({"success": True})

# ── WebSocket ─────────────────────────────────────────────────────────────────
@sock.route('/ws')
def websocket_live(ws):
    ws_manager.add(ws)
    try:
        while True:
            msg = ws.receive(timeout=30)
            if msg is None:
                break
    except Exception:
        pass
    finally:
        ws_manager.remove(ws)

# ── Pose landmark extraction using new MediaPipe Tasks API ────────────────────
def _run_pose_on_image(bgr_image):
    """
    Run MediaPipe PoseLandmarker on a BGR OpenCV image using the global singleton.
    Re-using one instance avoids the 200-500ms model load penalty per frame.
    Returns (landmarks_dict, raw_landmarks_list).
    """
    rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

    result = _global_landmarker.detect(mp_image)

    landmarks_dict = {}
    raw_landmarks = []

    if result.pose_landmarks and len(result.pose_landmarks) > 0:
        raw_landmarks = result.pose_landmarks[0]
        for i, lm in enumerate(raw_landmarks):
            landmarks_dict[i] = {
                "x": lm.x, "y": lm.y,
                "z": lm.z,
                "visibility": lm.visibility if hasattr(lm, 'visibility') and lm.visibility is not None else 1.0
            }

    return landmarks_dict, raw_landmarks


def _draw_skeleton(image, raw_landmarks, event_type, angle, velocity, confidence):
    """
    Draw MediaPipe pose skeleton on image using OpenCV (like Team 1's camera_detection.py).
    Uses POSE_CONNECTIONS list. Works without mp.solutions.drawing_utils.
    """
    h, w = image.shape[:2]
    if not raw_landmarks:
        return image

    # Draw connections
    conn_color = (0, 200, 255)  # cyan connections
    for (a, b) in POSE_CONNECTIONS:
        if a < len(raw_landmarks) and b < len(raw_landmarks):
            lm_a = raw_landmarks[a]
            lm_b = raw_landmarks[b]
            pt_a = (int(lm_a.x * w), int(lm_a.y * h))
            pt_b = (int(lm_b.x * w), int(lm_b.y * h))
            cv2.line(image, pt_a, pt_b, conn_color, 2)

    # Draw landmark dots
    for lm in raw_landmarks:
        pt = (int(lm.x * w), int(lm.y * h))
        cv2.circle(image, pt, 4, (0, 255, 0), -1)

    # Bounding box
    x_coords = [int(lm.x * w) for lm in raw_landmarks]
    y_coords = [int(lm.y * h) for lm in raw_landmarks]
    pad = 20
    x_min = max(0, min(x_coords) - pad)
    y_min = max(0, min(y_coords) - pad)
    x_max = min(w, max(x_coords) + pad)
    y_max = min(h, max(y_coords) + pad)
    box_color = (0, 0, 255) if event_type in ("FALL_DETECTED", "CONFIRMED_FALL") else (0, 255, 0)
    cv2.rectangle(image, (x_min, y_min), (x_max, y_max), box_color, 2)

    # Status label
    if event_type == "CONFIRMED_FALL":
        label = "CONFIRMED FALL"
        text_color = (0, 0, 255)
    elif event_type == "FALL_DETECTED":
        label = "FALL DETECTED"
        text_color = (0, 165, 255)
    else:
        label = "NORMAL - HUMAN DETECTED"
        text_color = (0, 255, 0)

    cv2.putText(image, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color, 2)
    cv2.putText(image, f"Angle: {int(angle)} deg  Vel: {velocity:.2f}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1)
    cv2.putText(image, f"Conf: {int(confidence * 100)}%", (10, 85), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
    return image


# ── Real-Time Camera Frame Analysis ──────────────────────────────────────────
@app.route('/api/detect-frame', methods=['POST'])
def detect_frame():
    """
    Accepts JPEG frame from phone camera as base64.
    Runs MediaPipe PoseLandmarker (Tasks API), draws landmark skeleton on frame,
    runs FallDetector (Team 1 logic), returns annotated image + detection event.

    Request:  { "frame": "<base64 JPEG>", "timestamp": 1.0, "user_id": 1 }
    Response: { "event": "NORMAL|FALL_DETECTED|CONFIRMED_FALL|NO_PERSON",
                "annotated_frame": "<base64 JPEG>", "confidence": 0.9,
                "angle": 72.3, "velocity": 0.4, "direction": "FORWARD", "ai_used": true }
    """
    if not AI_AVAILABLE:
        return jsonify({"event": "NORMAL", "confidence": 0, "ai_used": False, "annotated_frame": None})

    data = request.json
    if not data or 'frame' not in data:
        return jsonify({"error": "No frame provided"}), 400

    user_id = data.get('user_id', 'anon')
    timestamp = float(data.get('timestamp', time.time()))

    # Decode base64 JPEG → OpenCV BGR image
    try:
        img_bytes = base64.b64decode(data['frame'])
        nparr = np.frombuffer(img_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            return jsonify({"error": "Could not decode image"}), 400
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {str(e)}"}), 400

    # Run MediaPipe Pose (new Tasks API) → get landmarks in Team 1 format
    try:
        landmarks_dict, raw_landmarks = _run_pose_on_image(image)
    except Exception as e:
        return jsonify({"error": f"Pose detection failed: {str(e)}"}), 500

    # Run fall detection logic (Team 1's FallDetector + PersonPresenceDetector)
    detector, presence = _get_live_detectors(user_id)
    is_present = presence.check_presence(landmarks_dict, timestamp)

    event_type = "NO_PERSON"
    direction = None
    angle, velocity, confidence = 0.0, 0.0, 0.0

    if is_present and landmarks_dict:
        event_type, direction, angle, velocity, _ = detector.check_fall(landmarks_dict, timestamp)
        confidence = round(detector.calculate_confidence(landmarks_dict), 2)

    # Draw skeleton + overlay on image (like Team 1's camera_detection.py)
    annotated = image.copy()
    if is_present and raw_landmarks:
        annotated = _draw_skeleton(annotated, raw_landmarks, event_type, angle, velocity, confidence)
    else:
        cv2.putText(annotated, "NO PERSON IN FRAME", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

    # Encode annotated image back to base64
    _, buf = cv2.imencode('.jpg', annotated, [cv2.IMWRITE_JPEG_QUALITY, 60])
    annotated_b64 = base64.b64encode(buf.tobytes()).decode('utf-8')

    # Broadcast CONFIRMED_FALL to WebSocket clients + reset detector state
    # NOTE: DB logging is handled by the frontend (handleDetectionEvent → addLog)
    # to avoid duplicate entries.
    if event_type == "CONFIRMED_FALL":
        ws_manager.broadcast({
            "event": "CONFIRMED_FALL",
            "status": "EMERGENCY",
            "confidence": confidence,
            "direction": direction,
            "source": "live_camera"
        })
        _reset_live_detectors(user_id)

    return jsonify({
        "event": event_type,
        "direction": direction,
        "angle": round(angle, 1),
        "velocity": round(velocity, 3),
        "confidence": confidence,
        "annotated_frame": annotated_b64,
        "ai_used": True,
    })


@app.route('/api/detect-frame/reset', methods=['POST'])
def reset_detector():
    """Call when user stops monitoring to clear per-user detector state."""
    data = request.json or {}
    user_id = data.get('user_id', 'anon')
    _reset_live_detectors(user_id)
    return jsonify({"success": True})


# ── AI Video Upload & Analysis ────────────────────────────────────────────────
@app.route('/api/upload', methods=['POST'])
def upload_video():
    """Accepts MP4 from phone, runs MediaPipe AI fall detection, stores report in DB."""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.mp4'):
        return jsonify({"error": "Only MP4 files are supported"}), 400

    user_id = request.form.get('user_id')
    os.makedirs("temp", exist_ok=True)
    temp_path = os.path.join("temp", f"upload_{int(time.time()*1000)}.mp4")
    file.save(temp_path)

    events_log = []
    frame_count = 0
    fall_detected = False
    confidence_score = 0.91

    if AI_AVAILABLE:
        # Real AI analysis using Team 1 detection logic + new MediaPipe Tasks API
        cap = cv2.VideoCapture(temp_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        video_detector = FallDetector()
        video_presence = PersonPresenceDetector(visibility_threshold=0.7, no_person_duration=2.0)

        base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
        options = mp_vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.IMAGE,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            num_poses=1
        )
        with mp_vision.PoseLandmarker.create_from_options(options) as landmarker:
            while cap.isOpened():
                success, image = cap.read()
                if not success:
                    break
                frame_count += 1
                timestamp = frame_count / fps

                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
                result = landmarker.detect(mp_image)

                landmarks_dict = {}
                if result.pose_landmarks and len(result.pose_landmarks) > 0:
                    for i, lm in enumerate(result.pose_landmarks[0]):
                        landmarks_dict[i] = {
                            "x": lm.x, "y": lm.y, "z": lm.z,
                            "visibility": lm.visibility if hasattr(lm, 'visibility') and lm.visibility is not None else 1.0
                        }

                is_present = video_presence.check_presence(landmarks_dict, timestamp)
                if not is_present:
                    continue

                event_type, direction, angle, velocity, aspect_ratio = video_detector.check_fall(landmarks_dict, timestamp)

                if event_type in ["FALL_DETECTED", "CONFIRMED_FALL"]:
                    fall_detected = True
                    events_log.append({
                        "time_sec": round(timestamp, 2),
                        "event": event_type,
                        "direction": direction or "UNKNOWN",
                        "angle": round(angle, 1),
                        "velocity": round(velocity, 2)
                    })

        cap.release()
    else:
        import random
        fall_detected = random.random() > 0.3
        frame_count = 90
        if fall_detected:
            events_log.append({"time_sec": 3.0, "event": "CONFIRMED_FALL", "direction": "FORWARD", "angle": 75.0, "velocity": 0.6})

    try:
        os.remove(temp_path)
    except Exception:
        pass

    # Generate CSV Report
    os.makedirs("reports", exist_ok=True)
    report_filename = f"Video_Fall_Report_{int(time.time()*1000)}.csv"
    report_filepath = os.path.join("reports", report_filename)

    with open(report_filepath, mode='w', newline='') as f_out:
        writer = csv.writer(f_out)
        writer.writerow(["Video Analysis Report"])
        writer.writerow(["File", file.filename])
        writer.writerow(["Time Analyzed", time.strftime("%Y-%m-%d %H:%M:%S")])
        writer.writerow(["Fall Detected", "YES" if fall_detected else "NO"])
        writer.writerow(["Total Frames", frame_count])
        writer.writerow([])
        writer.writerow(["Timestamp (s)", "Event", "Direction", "Angle (deg)", "Velocity"])
        for ev in events_log:
            writer.writerow([ev["time_sec"], ev["event"], ev["direction"], ev["angle"], ev["velocity"]])

    if user_id:
        try:
            # Build HTTP download URL so mobile can access the report directly
            host = request.host  # e.g. 10.165.111.54:5000
            download_url = f"http://{host}/api/reports/download/{report_filename}"

            conn = get_db(); cur = conn.cursor()
            cur.execute(
                "INSERT INTO reports (user_id, file_name, file_uri, fall_detected, confidence) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (int(user_id), report_filename, download_url, fall_detected, confidence_score)
            )
            conn.commit(); conn.close()
        except Exception as e:
            print(f"[WARN] Could not save report to DB: {e}")

    if fall_detected:
        ws_manager.broadcast({"event": "CONFIRMED_FALL", "status": "EMERGENCY", "confidence": confidence_score, "source": "video"})

    return jsonify({
        "status": "Analysis Complete",
        "total_frames": frame_count,
        "fall_detected": fall_detected,
        "events": events_log,
        "report_csv": report_filename,
        "ai_used": AI_AVAILABLE
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

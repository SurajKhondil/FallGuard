import os, psycopg2, bcrypt
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

def get_db():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

# ── Health Check ──────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("SELECT 1"); conn.close()
        return jsonify({"status": "ok", "db": "connected"})
    except Exception as e:
        return jsonify({"status": "error", "db": str(e)}), 500

# ── Auth ──────────────────────────────────────────────
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    pw_hash = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("INSERT INTO users (name, email, mobile, password_hash) VALUES (%s,%s,%s,%s) RETURNING id, name, email, mobile",
                    (data['name'], data['email'], data.get('mobile',''), pw_hash))
        user = cur.fetchone()
        conn.commit(); conn.close()
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

# ── Detection Logs ────────────────────────────────────
@app.route('/api/logs/<int:user_id>', methods=['GET'])
def get_logs(user_id):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id, type, confidence, source, timestamp FROM detection_logs WHERE user_id=%s ORDER BY timestamp DESC LIMIT 500", (user_id,))
    rows = cur.fetchall(); conn.close()
    return jsonify([{"id": r[0], "type": r[1], "confidence": r[2], "source": r[3], "timestamp": r[4].isoformat()} for r in rows])

@app.route('/api/logs', methods=['POST'])
def add_log():
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute("INSERT INTO detection_logs (user_id, type, confidence, source) VALUES (%s,%s,%s,%s) RETURNING id",
                (data['user_id'], data['type'], data['confidence'], data.get('source','mock')))
    log_id = cur.fetchone()[0]; conn.commit(); conn.close()
    return jsonify({"id": log_id}), 201

# ── Reports ───────────────────────────────────────────
@app.route('/api/reports/<int:user_id>', methods=['GET'])
def get_reports(user_id):
    conn = get_db(); cur = conn.cursor()
    cur.execute("SELECT id, file_name, file_uri, fall_detected, confidence, created_at FROM reports WHERE user_id=%s ORDER BY created_at DESC", (user_id,))
    rows = cur.fetchall(); conn.close()
    return jsonify([{"id": r[0], "name": r[1], "uri": r[2], "fallDetected": r[3], "confidence": r[4], "date": r[5].isoformat()} for r in rows])

@app.route('/api/reports', methods=['POST'])
def add_report():
    data = request.json
    conn = get_db(); cur = conn.cursor()
    cur.execute("INSERT INTO reports (user_id, file_name, file_uri, fall_detected, confidence) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                (data['user_id'], data['name'], data['uri'], data.get('fallDetected', False), data.get('confidence', 0)))
    report_id = cur.fetchone()[0]; conn.commit(); conn.close()
    return jsonify({"id": report_id}), 201

@app.route('/api/reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    conn = get_db(); cur = conn.cursor()
    cur.execute("DELETE FROM reports WHERE id=%s", (report_id,))
    conn.commit(); conn.close()
    return jsonify({"success": True})

# ── Settings ──────────────────────────────────────────
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

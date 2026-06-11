# 🛡️ FallGuard AI — AI-Based Fall Detection System

A full-stack, production-ready fall detection system built with **React Native (Expo)** for the mobile frontend and **Python Flask + MediaPipe + Neon PostgreSQL** for the AI-powered backend.

> Built as part of an internship project at **Enchanted Technologies Pvt. Ltd.**

---

## 📱 Features

| Feature | Description |
|---------|-------------|
| 🤖 **Real-Time AI Monitoring** | Live camera stream analyzed by MediaPipe Pose Landmarker (sub-20ms/frame) |
| 🎥 **Video Upload & Analysis** | Upload any MP4 — the backend runs full fall detection & generates a downloadable CSV report |
| 🦴 **Skeleton Overlay** | Annotated pose skeleton drawn on every camera frame sent back to the phone |
| 🚨 **Instant Alerts** | Emergency call + SMS triggered on fall confirmation |
| 📡 **WebSocket Broadcasting** | Real-time CONFIRMED_FALL events pushed to all connected clients instantly |
| ☁️ **Cloud Database** | All users, logs, reports, and settings stored securely in Neon PostgreSQL |
| 👤 **Per-User Data Isolation** | Each user sees only their own history and reports |
| 📊 **Analytics & Stats** | Charts showing fall event trends over the past 7 days |
| 🔐 **Secure Auth** | Passwords hashed with bcrypt; per-user session stored locally |

---

## 🏗️ Project Structure

```
AI-Fall_Detection_System/
├── App.js                            # Expo app entry point
├── index.js                          # Expo bootstrapper
├── app.json                          # Expo config (name, slug, permissions)
├── package.json                      # Frontend dependencies
│
├── backend/                          # Python Flask AI backend
│   ├── app.py                        # Main Flask server (15 routes + WebSocket)
│   ├── init_db.py                    # One-time DB schema creation
│   ├── requirements.txt              # Python dependencies (MediaPipe, OpenCV, etc.)
│   ├── pose_landmarker_lite.task     # MediaPipe model file (auto-downloaded if missing)
│   ├── .env                          # Neon DB connection string (not committed)
│   ├── reports/                      # Generated CSV reports served over HTTP
│   ├── temp/                         # Temporary uploaded video files (auto-cleaned)
│   └── core/
│       ├── detection_logic.py        # FallDetector + PersonPresenceDetector (Team 1 logic)
│       └── websocket_manager.py      # WebSocket broadcast manager
│
└── src/
    ├── context/AppContext.js         # Global state + API wiring
    ├── hooks/
    │   ├── useAuth.js                # Login / signup logic
    │   └── useDetection.js           # Detection service hook
    ├── navigation/AppNavigator.js    # Stack + Tab navigation
    ├── services/
    │   ├── api.js                    # All REST API calls to Flask backend
    │   └── mockDetectionService.js   # Simulation engine (offline fallback)
    ├── screens/
    │   ├── WelcomeScreen.js          # Landing / onboarding screen
    │   ├── LoginScreen.js            # User login
    │   ├── SignupScreen.js           # New account creation
    │   ├── InstructionScreen.js      # How-to guide for new users
    │   ├── DashboardScreen.js        # Main monitoring screen (camera + AI)
    │   ├── LogsScreen.js             # Detection event history
    │   ├── StatsScreen.js            # Analytics charts (7-day trend)
    │   ├── SettingsScreen.js         # App settings (alerts, mode, cooldown)
    │   └── ProfileScreen.js          # User profile + emergency number
    ├── components/
    │   ├── AlertModal.js             # Fall alert popup + emergency call button
    │   ├── EventCard.js              # Single detection event display card
    │   ├── ConfidenceBar.js          # Animated AI confidence progress bar
    │   ├── DetectionStatusPanel.js   # Live status indicator panel
    │   └── LiveActivityGraph.js      # Real-time activity graph
    └── utils/
        ├── theme.js                  # Colors, fonts, spacing tokens
        ├── helpers.js                # Utility/formatting functions
        └── storage.js                # AsyncStorage wrapper (expo-file-system/legacy)
```

---

## ✅ Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18 or higher | [nodejs.org](https://nodejs.org/) |
| Python | v3.10 or higher | [python.org](https://www.python.org/) |
| Expo Go | Latest | [App Store](https://apps.apple.com/app/expo-go/id982107779) / [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) |

> ⚠️ The backend requires **Python 3.10–3.11**. MediaPipe does not support Python 3.12+ yet.

---

## 🚀 How to Run the Project

### Step 1 — Clone & Install Frontend Dependencies

```bash
git clone https://github.com/SurajKhondil/AI_BASED_FALL_DETECTION_SYSTEM.git
cd AI-Fall_Detection_System
npm install
```

---

### Step 2 — Configure the Backend Environment

Navigate to the `backend` folder and create the `.env` file:

```bash
cd backend
```

Create `backend/.env` with your Neon PostgreSQL connection string:

```env
DATABASE_URL=postgresql://username:password@ep-your-neon-endpoint.aws.neon.tech/neondb?sslmode=require
```

> 💡 Get your connection string from [neon.tech](https://neon.tech) → your project → **Connection Details**.

---

### Step 3 — Install Python Dependencies

```bash
pip install -r backend/requirements.txt
```

This installs:
- `flask`, `flask-cors`, `flask-sock` — web server & real-time WebSocket
- `psycopg2-binary` — PostgreSQL connector
- `mediapipe` — pose estimation & fall detection AI
- `opencv-python` — video/frame processing
- `numpy`, `tensorflow`, `tflite-support` — ML inference support
- `bcrypt`, `python-dotenv` — security & config

---

### Step 4 — Initialize the Database *(First Time Only)*

This creates all required tables (`users`, `detection_logs`, `reports`, `user_settings`) in Neon DB:

```bash
cd backend
python init_db.py
```

Expected output:
```
[OK] All tables created successfully in Neon DB!
```

> ℹ️ The MediaPipe model (`pose_landmarker_lite.task`) is **auto-downloaded** on first backend start if not present.

---

### Step 5 — Set Your PC's IP in `api.js`

Find your PC's local IP:

```bash
# Windows
ipconfig
# Look for: IPv4 Address . . . . : 192.168.x.x
```

Open `src/services/api.js` and update the `BASE_URL`:

```js
const BASE_URL = 'http://YOUR_PC_IP:5000/api';
// Example: const BASE_URL = 'http://192.168.1.5:5000/api';
```

> ⚠️ Your phone and PC **must be on the same WiFi network**.

---

### Step 6 — Start the Flask Backend

Open **Terminal 1** in the `backend` folder:

```bash
cd backend
python app.py
```

Expected output:
```
[OK] MediaPipe Tasks API + AI Detection loaded. Global landmarker ready.
 * Running on http://0.0.0.0:5000
 * Running on http://192.168.x.x:5000   ← phone connects here
 * Debugger is active!
```

Verify the backend and DB are connected:
```
http://127.0.0.1:5000/api/health
```
Expected response:
```json
{"status": "ok", "db": "connected", "ai": true}
```

---

### Step 7 — Start the Expo App

Open **Terminal 2** in the project root:

```bash
npx expo start --clear
```

A QR code will appear in the terminal.

---

### Step 8 — Run on Your Phone

1. Open **Expo Go** on your Android/iOS device
2. Scan the **QR code** from the terminal
3. The app will load on your device

---

## 🧪 First-Time Test Flow

1. Open the app → tap **Get Started**
2. Tap **Sign Up** → register with name, email & password
3. Go to **Profile** → add your **Emergency Mobile Number** → Save
4. Go to **Settings** → choose detection mode (`AI` or `Simulation`)
5. Go to **Dashboard** → tap **Start Monitoring**
6. The live camera feed is sent frame-by-frame to the AI backend
7. A skeleton overlay is rendered over detected persons in real-time
8. When a fall is confirmed → an alert fires + emergency call button appears
9. To test **Video Analysis** → tap **Upload Video** → select an MP4 → wait for results
10. Go to **Logs** to view all past detection events
11. Go to **Stats** to view the 7-day trend chart

---

## 🔄 Running Again (After First Setup)

**Terminal 1 — Backend:**
```bash
cd AI-Fall_Detection_System\backend
python app.py
```

**Terminal 2 — Frontend:**
```bash
cd AI-Fall_Detection_System
npx expo start --clear
```

---

## 🧠 AI Architecture

```
Phone Camera Frame (JPEG)
        │
        ▼  base64 over HTTP POST
┌─────────────────────────┐
│   Flask /api/detect-frame│
│                         │
│  ┌─────────────────────┐│
│  │ MediaPipe Tasks API ││  ← Global singleton (no reload penalty)
│  │ PoseLandmarker.detect││  ← ~5–15ms per frame
│  └──────────┬──────────┘│
│             │ 33 landmarks│
│  ┌──────────▼──────────┐│
│  │   FallDetector      ││  ← Trunk angle + velocity + aspect ratio
│  │ PersonPresence      ││  ← Visibility check (2s no-person timeout)
│  └──────────┬──────────┘│
│             │ event type  │
│  ┌──────────▼──────────┐│
│  │  _draw_skeleton()   ││  ← OpenCV: skeleton lines + bounding box
│  └──────────┬──────────┘│
└─────────────┼───────────┘
              │ annotated base64 JPEG + event
              ▼
        Phone renders overlay
              │
        CONFIRMED_FALL?
              │
    ┌─────────▼──────────┐
    │  WebSocket broadcast│  → All connected clients notified
    │  DB log saved       │  → Frontend logs event via /api/logs
    └────────────────────┘
```

### Fall Detection Logic (`core/detection_logic.py`)

| Signal | Description |
|--------|-------------|
| **Trunk Angle** | Angle of spine from vertical; >60° flags a fall candidate |
| **Vertical Velocity** | Rate of hip/shoulder downward movement |
| **Aspect Ratio** | Body bounding-box width vs. height (horizontal body = fallen) |
| **PersonPresenceDetector** | Confirms a person is in frame before analyzing; ignores empty frames |

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server & DB health check (`ai: true/false`) |
| POST | `/api/register` | Register a new user |
| POST | `/api/login` | Login existing user |
| PUT | `/api/users/:id` | Update profile (name, mobile) |
| PUT | `/api/users/:id/password` | Change password (bcrypt verified) |
| GET | `/api/logs/:userId` | Get detection logs for user (last 500) |
| POST | `/api/logs` | Save a detection event |
| GET | `/api/reports/:userId` | Get analysis reports for user |
| POST | `/api/reports` | Save a new report record |
| DELETE | `/api/reports/:id` | Delete a report |
| GET | `/api/reports/download/:filename` | Download a CSV report file |
| GET | `/api/settings/:userId` | Get user settings |
| PUT | `/api/settings/:userId` | Save user settings (upsert) |
| POST | `/api/detect-frame` | Analyze a live camera frame (base64 JPEG → AI) |
| POST | `/api/detect-frame/reset` | Reset per-user live detector state |
| POST | `/api/upload` | Upload MP4 for full AI video analysis + CSV report |
| WS | `/ws` | WebSocket endpoint for real-time fall event broadcast |

---

## 🛠️ Troubleshooting

### "Network Request Failed" on Login/Signup
- Ensure Flask is running: `python app.py`
- Verify the IP in `src/services/api.js` matches your PC's IP (`ipconfig`)
- Both phone and PC must be on the **same WiFi** (not mobile data)

### Flask crashes on start — missing packages
```bash
pip install -r backend/requirements.txt
```

### `ai: false` in health check
MediaPipe failed to load. Common causes:
- Wrong Python version (use **3.10 or 3.11**)
- Missing `pose_landmarker_lite.task` — delete and restart; it will re-download
- `opencv-python` not installed

### DB tables missing or schema errors
```bash
cd backend
python init_db.py
```

### Expo QR code not scanning
```bash
npx expo start --clear --tunnel
```
Tunnel mode works even if phone and PC are on different networks.

### Port 5000 already in use
Edit the last line of `backend/app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # change port here
```
Then update `src/services/api.js` `BASE_URL` to use `:5001`.

### Duplicate detection log entries
Logging is handled **only by the frontend** (`handleDetectionEvent → addLog`) to prevent double-writes. Do not call `/api/logs` from the backend on `CONFIRMED_FALL` events.

---

## 🔗 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Neon DB Documentation](https://neon.tech/docs)
- [React Native Documentation](https://reactnative.dev/)
- [MediaPipe Tasks API](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)
- [flask-sock WebSocket](https://flask-sock.readthedocs.io/)

---

## 👩‍💻 Author

**Jyoti** — Intern, Enchanted Technologies Pvt. Ltd.
B.Tech Information Technology, K. K. Wagh Institute of Engineering Education & Research

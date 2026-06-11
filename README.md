# 🛡️ FallGuard AI — AI-Based Fall Detection System

<p align="center">
  <img src="assets/app-screenshots(5).jpeg" alt="Dashboard" width="30%" />
  <img src="assets/app-screenshots(1).jpeg" alt="Alert" width="30%" />
  <img src="assets/app-screenshots(4).jpeg" alt="Stats" width="30%" />
</p>

<p align="center">
  <a href="#-features">Features</a> • 
  <a href="#-tech-stack">Tech Stack</a> • 
  <a href="#-performance--results">Performance</a> • 
  <a href="#-how-to-run-the-project">Installation</a> • 
  <a href="#-ai-architecture">Architecture</a>
</p>

A full-stack, production-ready fall detection system built with **React Native (Expo)** for the mobile frontend and **Python Flask + MediaPipe + Neon PostgreSQL** for the AI-powered backend.

Built as part of an internship project at **Enchanted Technologies Pvt. Ltd.**

---

## 🚀 Tech Stack

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0083FA?style=for-the-badge&logo=google&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Neon](https://img.shields.io/badge/Neon_DB-00E599?style=for-the-badge&logo=neon&logoColor=black)

---

## 📱 Features

| Feature | Description |
|---------|-------------|
| 🤖 **Real-Time AI Monitoring** | Live camera stream analyzed by MediaPipe Pose Landmarker (sub-20ms/frame) |
| 🎥 **Video Upload & Analysis** | Upload any MP4 — the backend runs full fall detection & generates a downloadable CSV report |
| 🦴 **Skeleton Overlay** | Annotated pose skeleton drawn on every camera frame sent back to the phone |
| 🚨 **Instant Alerts** | Emergency call + SMS triggered on fall confirmation |
| 📡 **WebSocket Broadcasting** | Real-time `CONFIRMED_FALL` events pushed to all connected clients instantly |
| ☁️ **Cloud Database** | All users, logs, reports, and settings stored securely in Neon PostgreSQL |
| 👤 **Per-User Data Isolation** | Each user sees only their own history and reports |
| 📊 **Analytics & Stats** | Charts showing fall event trends over the past 7 days |
| 🔐 **Secure Auth** | Passwords hashed with bcrypt; per-user session stored locally |

---

## 📊 Performance & Results

- **Accuracy & Confidence:** The AI models reliably trigger with high confidence (averaging ~77% and scaling up to 97% during confirmed falls).
- **Latency:** Sub-20ms per frame processing time, ensuring real-time responsiveness and instant alerts.
- **False Positive Handling:** Optimized trunk angle and velocity thresholds to differentiate between a person quickly sitting down and a genuine fall. The system reliably logs "Normal" vs "Fall" events.

---

## 🧠 AI Architecture

The system uses a highly optimized pipeline to stream frames from the mobile device to the server, run inference, and return annotated frames in real-time.

```text
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

## 🚀 How to Run the Project

<details>
<summary><b>Click to expand Installation & Setup Instructions</b></summary>

### ✅ Prerequisites
| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18 or higher | [nodejs.org](https://nodejs.org/) |
| Python | v3.10 or higher | [python.org](https://www.python.org/) |
| Expo Go | Latest | [App Store](https://apps.apple.com/app/expo-go/id982107779) / [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) |

> ⚠️ The backend requires **Python 3.10–3.11**. MediaPipe does not support Python 3.12+ yet.

### Step 1 — Clone & Install Frontend Dependencies
```bash
git clone https://github.com/SurajKhondil/AI_BASED_FALL_DETECTION_SYSTEM.git
cd AI-Fall_Detection_System
npm install
```

### Step 2 — Configure the Backend Environment
Navigate to the `backend` folder and create the `.env` file:
```bash
cd backend
```
Create `backend/.env` with your Neon PostgreSQL connection string:
```env
DATABASE_URL=postgresql://username:password@ep-your-neon-endpoint.aws.neon.tech/neondb?sslmode=require
```

### Step 3 — Install Python Dependencies
```bash
pip install -r backend/requirements.txt
```

### Step 4 — Initialize the Database *(First Time Only)*
```bash
python init_db.py
```

### Step 5 — Set Your PC's IP in `api.js`
Find your PC's local IP (e.g., `192.168.1.5`). Open `src/services/api.js` and update the `BASE_URL`:
```js
const BASE_URL = 'http://YOUR_PC_IP:5000/api';
```

### Step 6 — Start the Flask Backend
```bash
# In backend folder
python app.py
```

### Step 7 — Start the Expo App
```bash
# In root folder
npx expo start --clear
```

### Step 8 — Run on Your Phone
Scan the QR code using the Expo Go app.
</details>

---

## 📡 API Endpoints Reference

<details>
<summary><b>Click to expand API Endpoints</b></summary>

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
</details>

---

## 👩‍💻 Author

**Suraj Khondil**

</br>
<p align="center">
  <i>If you found this project helpful, please leave a 🌟!</i>
</p>

# 🛡️ FallGuard AI — Fall Detection System

A full-stack AI-powered fall detection mobile app built with **React Native (Expo)** for the frontend and **Python Flask + Neon PostgreSQL** for the backend.

---

## 📱 Features

- **Real-Time Monitoring** — AI-powered detection via live camera
- **Video Analysis** — Upload any video to scan for falls
- **Instant Alerts** — Emergency call & SMS to registered contact number
- **Cloud Database** — All data stored securely in Neon PostgreSQL
- **Per-User Data** — Each user only sees their own history
- **Analytics** — Charts showing fall trends over 7 days

---

## 🏗️ Project Structure

```
AI-Fall_Detection_System/
├── App.js                        # App entry point
├── index.js                      # Expo entry point
├── app.json                      # Expo config
├── package.json                  # Frontend dependencies
│
├── backend/                      # Python Flask backend
│   ├── app.py                    # Main Flask API (11 routes)
│   ├── init_db.py                # One-time DB table creation
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Neon DB connection string
│
└── src/
    ├── context/AppContext.js     # Global state + API wiring
    ├── hooks/useAuth.js          # Login/signup logic
    ├── hooks/useDetection.js     # Detection service hook
    ├── navigation/AppNavigator.js# Stack + Tab navigation
    ├── services/
    │   ├── api.js                # All REST API calls to Flask
    │   └── mockDetectionService.js # Simulation engine
    ├── screens/
    │   ├── WelcomeScreen.js
    │   ├── LoginScreen.js
    │   ├── SignupScreen.js
    │   ├── InstructionScreen.js
    │   ├── DashboardScreen.js    # Main screen
    │   ├── LogsScreen.js
    │   ├── StatsScreen.js
    │   ├── SettingsScreen.js
    │   └── ProfileScreen.js
    ├── components/
    │   ├── AlertModal.js         # Fall alert with emergency call
    │   ├── EventCard.js
    │   ├── ConfidenceBar.js
    │   ├── DetectionStatusPanel.js
    │   └── LiveActivityGraph.js
    └── utils/
        ├── theme.js              # Colors, fonts, spacing
        ├── helpers.js            # Utility functions
        └── storage.js            # AsyncStorage wrapper
```

---

## ✅ Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Node.js | v18 or higher | [nodejs.org](https://nodejs.org/) |
| Python | v3.10 or higher | [python.org](https://www.python.org/) |
| Expo Go | Latest | [App Store](https://apps.apple.com/app/expo-go/id982107779) / [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) |

---

## 🚀 How to Run the Project

### Step 1 — Clone & Install Frontend Dependencies

```bash
cd AI-Fall_Detection_System
npm install
```

---

### Step 2 — Set Up the Backend Environment

Navigate to the `backend` folder and create the `.env` file:

```bash
cd backend
```

Open (or create) `backend/.env` and add your Neon DB connection string:

```env
DATABASE_URL=postgresql://username:password@ep-your-neon-endpoint.aws.neon.tech/neondb?sslmode=require
```

> 💡 Get your connection string from [neon.tech](https://neon.tech) → your project → **Connection Details**.

---

### Step 3 — Install Python Dependencies

```bash
pip install flask psycopg2-binary flask-cors python-dotenv bcrypt
```

Or if a `requirements.txt` exists:

```bash
pip install -r requirements.txt
```

---

### Step 4 — Initialize the Database (First Time Only)

This creates all the required tables in your Neon DB:

```bash
python init_db.py
```

Expected output:
```
[OK] All tables created successfully in Neon DB!
```

---

### Step 5 — Set Your PC's IP in `api.js`

Find your PC's local IP address:

```bash
# Windows
ipconfig
# Look for: IPv4 Address . . . . : 192.168.x.x
```

Open `src/services/api.js` and update line 8:

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

You should see:
```
 * Running on http://0.0.0.0:5000
 * Running on http://192.168.x.x:5000   ← phone connects here
 * Debugger is active!
```

Verify the DB is connected by opening in your browser:
```
http://127.0.0.1:5000/api/health
```
Expected response: `{"db": "connected", "status": "ok"}`

---

### Step 7 — Start the Expo App

Open **Terminal 2** in the project root:

```bash
cd AI-Fall_Detection_System
npx expo start --clear
```

A QR code will appear in the terminal.

---

### Step 8 — Run on Your Phone

1. Open **Expo Go** app on your Android/iOS phone
2. Scan the **QR code** from the terminal
3. The app will load on your device

---

## 🧪 First-Time Test Flow

1. Open the app → tap **Get Started**
2. Tap **Sign Up** → create an account with email + password
3. Go to **Profile** → add your **Emergency Mobile Number** → Save
4. Go to **Dashboard** → press **Start Monitoring**
5. Wait ~15 seconds → a simulated detection event will fire
6. To test a fall alert: tap the red **Trigger Fall** button
7. When the alert pops up → the **Call** button will dial your registered number

---

## 🔄 Running Again (After First Setup)

**Terminal 1:**
```bash
cd AI-Fall_Detection_System\backend
python app.py
```

**Terminal 2:**
```bash
cd AI-Fall_Detection_System
npx expo start --clear
```

---

## 🛠️ Troubleshooting

### "Network Request Failed" on Login/Signup
- Make sure Flask is running (`python app.py`)
- Check the IP in `src/services/api.js` matches your PC's IP (`ipconfig`)
- Ensure phone and PC are on the **same WiFi** (not mobile data)

### Flask crashes on start
```bash
# Missing packages?
pip install flask psycopg2-binary flask-cors python-dotenv bcrypt
```

### DB tables missing / errors
```bash
cd backend
python init_db.py
```

### Expo QR code not scanning
```bash
npx expo start --clear --tunnel
```
Tunnel mode works even if phone and PC are on different networks.

### Port 5000 in use
Edit the last line of `backend/app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=5001)  # change to 5001
```
Then update `src/services/api.js` `BASE_URL` to use `:5001`.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server + DB connection |
| POST | `/api/register` | Register new user |
| POST | `/api/login` | Login existing user |
| PUT | `/api/users/:id` | Update profile (name, mobile) |
| GET | `/api/logs/:userId` | Get detection logs for user |
| POST | `/api/logs` | Save a detection event |
| GET | `/api/reports/:userId` | Get analysis reports for user |
| POST | `/api/reports` | Save a new report |
| DELETE | `/api/reports/:id` | Delete a report |
| GET | `/api/settings/:userId` | Get user settings |
| PUT | `/api/settings/:userId` | Save user settings |

---

## 🔗 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Neon DB Documentation](https://neon.tech/docs)
- [React Native Documentation](https://reactnative.dev/)

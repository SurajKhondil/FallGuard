import os, psycopg2
from dotenv import load_dotenv

load_dotenv()

SQL = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mobile VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detection_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    confidence FLOAT,
    source VARCHAR(20) DEFAULT 'mock',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_uri TEXT,
    fall_detected BOOLEAN DEFAULT FALSE,
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    voice_alerts BOOLEAN DEFAULT TRUE,
    alert_cooldown INTEGER DEFAULT 15,
    mode VARCHAR(20) DEFAULT 'simulation',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

try:
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    cur.execute(SQL)
    conn.commit()
    conn.close()
    print("[OK] All tables created successfully in Neon DB!")
except Exception as e:
    print(f"[ERROR] {e}")

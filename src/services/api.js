/**
 * API Service Layer
 * Points to the local Python Flask backend which connects to Neon PostgreSQL.
 * Ensure your PC and phone are on the same Wi-Fi network.
 * Replace the IP below with your PC's local IP address (run `ipconfig` to find it).
 */

const BASE_URL = 'http://10.165.111.54:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  // ── Auth ────────────────────────────────────────────
  register: (data) => request('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  updateUser: (id, data) => request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  login: (data) => request('/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // ── Detection Logs ──────────────────────────────────
  getLogs: (userId) => request(`/logs/${userId}`),

  addLog: (data) => request('/logs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // ── Reports ─────────────────────────────────────────
  getReports: (userId) => request(`/reports/${userId}`),

  addReport: (data) => request('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteReport: (id) => request(`/reports/${id}`, {
    method: 'DELETE',
  }),

  // ── Settings ─────────────────────────────────────────
  getSettings: (userId) => request(`/settings/${userId}`),

  saveSettings: (userId, data) => request(`/settings/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // ── WebSocket (for live detection feed from Team 1) ─
  connectWebSocket(token, onMessage) {
    const ws = new WebSocket(`ws://10.165.111.54:5000/live?token=${token}`);
    ws.onmessage = (e) => {
      try {
        onMessage(JSON.parse(e.data));
      } catch (_) { }
    };
    return ws;
  },
};

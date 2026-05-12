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
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Request failed');
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

  changePassword: (id, data) => request(`/users/${id}/password`, {
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

  // ── AI Video Upload (Team 1 integration) ────────────
  uploadVideo: async (videoUri, userId) => {
    const formData = new FormData();
    formData.append('file', {
      uri: videoUri,
      name: 'analysis.mp4',
      type: 'video/mp4',
    });
    if (userId) formData.append('user_id', String(userId));

    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type — fetch sets multipart boundary automatically
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  // ── WebSocket — Live Fall Events (Team 1 Flask /ws) ─
  connectWebSocket(onMessage) {
    const ws = new WebSocket(`ws://${BASE_URL.replace('http://', '').replace('/api', '')}/ws`);
    ws.onopen = () => console.log('[WS] Connected to live detection');
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)); } catch (_) { }
    };
    ws.onerror = (e) => console.warn('[WS] Error:', e.message);
    ws.onclose = () => console.log('[WS] Disconnected');
    return ws;
  },

  // ── Real-Time Camera Frame Detection ─────────────────
  // Sends a single base64 JPEG frame to Flask for MediaPipe analysis.
  detectFrame: (base64Image, userId, timestamp) =>
    request('/detect-frame', {
      method: 'POST',
      body: JSON.stringify({
        frame: base64Image,
        user_id: userId,
        timestamp: timestamp ?? (Date.now() / 1000),
      }),
    }),

  // Resets the server-side per-user detector state when monitoring stops.
  resetDetector: (userId) =>
    request('/detect-frame/reset', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }).catch(() => {}),
};

"""
Flask-compatible WebSocket connection manager.
Works with flask-sock library.
"""
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections = []

    def add(self, ws):
        self.active_connections.append(ws)

    def remove(self, ws):
        if ws in self.active_connections:
            self.active_connections.remove(ws)

    def broadcast(self, message: dict):
        """Send JSON message to all connected WebSocket clients."""
        dead = []
        payload = json.dumps(message)
        for ws in self.active_connections:
            try:
                ws.send(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.remove(ws)

manager = ConnectionManager()

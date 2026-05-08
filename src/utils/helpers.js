export function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(isoString) {
  return `${formatDate(isoString)} ${formatTime(isoString)}`;
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password) {
  return password && password.length >= 6;
}

export function getStatusColor(status) {
  switch (status) {
    case 'FALL': return '#F85149';
    case 'NORMAL': return '#3FB950';
    case 'NO_PERSON': return '#8B949E';
    default: return '#8B949E';
  }
}

export function getStatusLabel(status) {
  switch (status) {
    case 'FALL': return 'Fall Detected';
    case 'NORMAL': return 'Person Detected';
    case 'NO_PERSON': return 'No Person';
    default: return 'Unknown';
  }
}

export function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return '#F85149';
  if (confidence >= 0.5) return '#D29922';
  return '#3FB950';
}

export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

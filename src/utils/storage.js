import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER: '@fallguard_user',
  LOGS: '@fallguard_logs',
  SETTINGS: '@fallguard_settings',
  ONBOARDED: '@fallguard_onboarded',
  REPORTS: '@fallguard_reports',
};

export const storage = {
  // Auth
  async saveUser(user) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  async getUser() {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async removeUser() {
    await AsyncStorage.removeItem(KEYS.USER);
  },

  // Onboarding
  async setOnboarded() {
    await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
  },
  async isOnboarded() {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
    return val === 'true';
  },

  // Event Logs
  async saveLogs(logs) {
    await AsyncStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
  },
  async getLogs() {
    const raw = await AsyncStorage.getItem(KEYS.LOGS);
    return raw ? JSON.parse(raw) : [];
  },
  async appendLog(entry) {
    const existing = await this.getLogs();
    const updated = [entry, ...existing].slice(0, 500); // keep max 500
    await this.saveLogs(updated);
    return updated;
  },
  async clearLogs() {
    await AsyncStorage.removeItem(KEYS.LOGS);
  },

  // Settings
  async saveSettings(settings) {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },
  async getSettings() {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : { mode: 'simulation', soundEnabled: true, alertCooldown: 15 };
  },

  // Reports
  async saveReports(reports) {
    await AsyncStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
  },
  async getReports() {
    const raw = await AsyncStorage.getItem(KEYS.REPORTS);
    return raw ? JSON.parse(raw) : [];
  },
  async appendReport(report) {
    const existing = await this.getReports();
    const updated = [report, ...existing].slice(0, 50);
    await this.saveReports(updated);
    return updated;
  },
  async deleteReport(id) {
    const existing = await this.getReports();
    const updated = existing.filter(r => r.id !== id);
    await this.saveReports(updated);
    return updated;
  },
};

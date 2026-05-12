import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { api } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Auth State ───────────────────────────────────────
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Detection State ──────────────────────────────────
  const [detectionStatus, setDetectionStatus] = useState('NO_PERSON'); // NO_PERSON | NORMAL | FALL
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [mode, setMode] = useState('simulation'); // simulation | live

  // ── Logs & Reports State ─────────────────────────────
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  // ── Alert State ──────────────────────────────────────
  const [activeAlert, setActiveAlert] = useState(null);
  const [alertCooldown, setAlertCooldown] = useState(false);

  // ── App Settings ─────────────────────────────────────
  const [settings, setSettings] = useState({ voiceAlerts: true, alertCooldown: 15 });

  // ── Helper: load user data from DB ──────────────────
  const loadUserDataFromDB = async (userId) => {
    try {
      const [apiLogs, apiReports, apiSettings] = await Promise.all([
        api.getLogs(userId),
        api.getReports(userId),
        api.getSettings(userId),
      ]);
      if (Array.isArray(apiLogs)) {
        setLogs(apiLogs);
        await storage.saveLogs(apiLogs);
      }
      if (Array.isArray(apiReports)) {
        setReports(apiReports);
        await storage.saveReports(apiReports);
      }
      if (apiSettings && typeof apiSettings === 'object' && !apiSettings.error) {
        const merged = { voiceAlerts: true, alertCooldown: 15, mode: 'simulation', ...apiSettings };
        setSettings(merged);
        if (merged.mode) setMode(merged.mode);
        await storage.saveSettings(merged);
      }
    } catch (_) {
      // Offline — use whatever is in local storage
    }
  };

  // ── Bootstrap ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [savedUser, savedLogs, savedSettings, savedReports] = await Promise.all([
          storage.getUser(),
          storage.getLogs(),
          storage.getSettings(),
          storage.getReports(),
        ]);
        if (savedUser) {
          setUser(savedUser);
          // Load local data first (fast)
          if (savedLogs?.length) setLogs(savedLogs);
          if (savedReports?.length) setReports(savedReports);
          if (savedSettings) {
            if (savedSettings.mode) setMode(savedSettings.mode);
            setSettings(prev => ({ ...prev, ...savedSettings }));
          }
          // Then fetch fresh user-specific data from Neon DB
          if (savedUser.id) await loadUserDataFromDB(savedUser.id);
        }
      } finally {
        setAuthLoading(false);
        setLogsLoaded(true);
      }
    })();
  }, []);

  // ── User / Auth Actions ──────────────────────────────
  const login = useCallback(async (userData) => {
    // Clear data if switching to a different user
    const previousUser = await storage.getUser();
    if (previousUser && previousUser.email !== userData.email) {
      await storage.clearLogs();
      await storage.saveReports([]);
      setLogs([]);
      setReports([]);
      setSettings({ voiceAlerts: true, alertCooldown: 15 });
      setMode('simulation');
    }
    await storage.saveUser(userData);
    setUser(userData);
    // Fetch this user's full history from Neon DB
    if (userData.id) await loadUserDataFromDB(userData.id);
  }, []);

  const updateUser = useCallback(async (userData) => {
    // Save locally first (fast, works offline)
    await storage.saveUser(userData);
    setUser(userData);
    // Sync to Neon DB if user has a server-side id
    if (userData.id) {
      try {
        const updated = await api.updateUser(userData.id, {
          name: userData.name,
          mobile: userData.mobile,
        });
        // Merge server response back (keeps id and email authoritative)
        const merged = { ...userData, ...updated };
        await storage.saveUser(merged);
        setUser(merged);
      } catch (_) {
        // Offline or server error — local save is enough for now
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await storage.removeUser();
    await storage.clearLogs();
    await storage.saveReports([]);
    setUser(null);
    setLogs([]);
    setReports([]);
    setIsMonitoring(false);
    setDetectionStatus('NO_PERSON');
    setCurrentConfidence(0);
  }, []);

  // ── Log Actions ──────────────────────────────────────
  const addLog = useCallback(async (event) => {
    const updated = await storage.appendLog(event);
    setLogs(updated);
    // Sync to DB (fire-and-forget, won't block the UI)
    if (user?.id) {
      api.addLog({
        user_id: user.id,
        type: event.type,
        confidence: event.confidence,
        source: event.source || 'mock',
      }).catch(() => {});
    }
  }, [user]);

  const clearLogs = useCallback(async () => {
    await storage.clearLogs();
    setLogs([]);
  }, []);

  const addReport = useCallback(async (report) => {
    const updated = await storage.appendReport(report);
    setReports(updated);
    // Sync to DB and get back the server-side id
    if (user?.id) {
      try {
        const saved = await api.addReport({
          user_id: user.id,
          name: report.name,
          uri: report.uri,
          fallDetected: report.fallDetected || false,
          confidence: report.confidence || 0,
        });
        // Store the DB id in the local report for deletion later
        if (saved?.id) {
          const withDbId = updated.map(r => r.id === report.id ? { ...r, dbId: saved.id } : r);
          await storage.saveReports(withDbId);
          setReports(withDbId);
        }
      } catch (_) {}
    }
  }, [user]);

  const deleteReport = useCallback(async (id) => {
    // Find the report to get its DB id before deleting locally
    const all = await storage.getReports();
    const target = all.find(r => r.id === id);
    const updated = await storage.deleteReport(id);
    setReports(updated);
    // Sync deletion to DB.
    // DB-fetched reports store the DB id in .id directly.
    // Locally-created reports (before first DB sync) store it in .dbId.
    const dbId = target?.dbId || target?.id;
    if (dbId) {
      api.deleteReport(dbId).catch(() => {});
    }
  }, []);

  // ── Refresh reports from DB ──────────────────────────
  const refreshReports = useCallback(async () => {
    if (!user?.id) return;
    try {
      const apiReports = await api.getReports(user.id);
      if (Array.isArray(apiReports)) {
        setReports(apiReports);
        await storage.saveReports(apiReports);
      }
    } catch (_) {}
  }, [user]);

  // ── Detection Actions ────────────────────────────────
  const handleDetectionEvent = useCallback(async (event) => {
    setDetectionStatus(event.type);
    setCurrentConfidence(event.confidence);

    // Add to logs
    await addLog(event);

    // Trigger alert on FALL with cooldown
    if (event.type === 'FALL' && !alertCooldown) {
      setActiveAlert(event);
      setAlertCooldown(true);
      setTimeout(() => setAlertCooldown(false), 15_000);
    }
  }, [addLog, alertCooldown]);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  const changeMode = useCallback(async (newMode) => {
    setMode(newMode);
    const newSettings = { ...settings, mode: newMode };
    setSettings(newSettings);
    await storage.saveSettings(newSettings);
    if (user?.id) api.saveSettings(user.id, newSettings).catch(() => {});
  }, [settings, user]);

  const updateSettings = useCallback(async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await storage.saveSettings(merged);
    if (user?.id) api.saveSettings(user.id, merged).catch(() => {});
  }, [settings, user]);

  const value = {
    // Auth
    user,
    authLoading,
    login,
    logout,
    updateUser,

    // Detection
    detectionStatus,
    setDetectionStatus,
    isMonitoring,
    setIsMonitoring,
    currentConfidence,
    setCurrentConfidence,
    handleDetectionEvent,
    mode,
    changeMode,

    // Alerts & Settings
    activeAlert,
    dismissAlert,
    alertCooldown,
    settings,
    updateSettings,

    // Logs & Reports
    logs,
    reports,
    logsLoaded,
    addLog,
    clearLogs,
    addReport,
    deleteReport,
    refreshReports,
  };


  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

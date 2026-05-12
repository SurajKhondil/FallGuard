import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { mockDetectionService } from '../services/mockDetectionService';
import { api } from '../services/api';

/**
 * useDetection
 *
 * - SIMULATION mode: uses mockDetectionService (random events for demo/testing)
 * - LIVE mode: connects to Flask WebSocket (/ws) and receives REAL events
 *   broadcast by Team 1's detection pipeline (camera_detection.py on server)
 */
export function useDetection() {
  const {
    isMonitoring,
    setIsMonitoring,
    handleDetectionEvent,
    mode,
  } = useApp();

  const unsubRef = useRef(null);   // mock service unsubscribe
  const wsRef = useRef(null);       // WebSocket connection

  // ── Simulation mode ───────────────────────────────────────
  const startMock = useCallback(() => {
    unsubRef.current = mockDetectionService.subscribe(handleDetectionEvent);
    mockDetectionService.start();
  }, [handleDetectionEvent]);

  const stopMock = useCallback(() => {
    mockDetectionService.stop();
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
  }, []);

  // ── Live mode (WebSocket) ─────────────────────────────────
  const startWebSocket = useCallback(() => {
    if (wsRef.current) return; // Already connected

    wsRef.current = api.connectWebSocket((data) => {
      /**
       * Team 1's backend broadcasts events in this format:
       * { event: 'CONFIRMED_FALL' | 'FALL_DETECTED' | 'NO_PERSON', status, confidence, source }
       */
      const eventMap = {
        CONFIRMED_FALL: 'FALL',
        FALL_DETECTED: 'FALL',
        NORMAL: 'NORMAL',
        NO_PERSON: 'NO_PERSON',
      };

      const type = eventMap[data.event] || data.event || 'NORMAL';
      handleDetectionEvent({
        id: `ws_${Date.now()}`,
        type,
        timestamp: new Date().toISOString(),
        confidence: data.confidence || 0.9,
        source: 'live',
      });
    });
  }, [handleDetectionEvent]);

  const stopWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // ── Main effect: start/stop based on monitoring + mode ────
  useEffect(() => {
    if (isMonitoring) {
      if (mode === 'live') {
        // Real WebSocket connection to Flask
        startWebSocket();
      } else {
        // Simulation mode — random mock events
        startMock();
      }
    } else {
      stopMock();
      stopWebSocket();
    }

    return () => {
      stopMock();
      stopWebSocket();
    };
  }, [isMonitoring, mode, startMock, stopMock, startWebSocket, stopWebSocket]);

  const startMonitoring = useCallback(() => setIsMonitoring(true), [setIsMonitoring]);
  const stopMonitoring = useCallback(() => setIsMonitoring(false), [setIsMonitoring]);

  const triggerFall = useCallback(() => {
    mockDetectionService.triggerManual('FALL');
  }, []);

  const triggerNormal = useCallback(() => {
    mockDetectionService.triggerManual('NORMAL');
  }, []);

  return { startMonitoring, stopMonitoring, triggerFall, triggerNormal };
}

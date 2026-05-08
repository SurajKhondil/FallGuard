import { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { mockDetectionService } from '../services/mockDetectionService';

/**
 * useDetection
 * Manages start/stop of mock detection service and wires
 * events into global AppContext.
 */
export function useDetection() {
  const {
    isMonitoring,
    setIsMonitoring,
    handleDetectionEvent,
    mode,
  } = useApp();

  const unsubRef = useRef(null);

  // Subscribe when monitoring starts
  useEffect(() => {
    if (isMonitoring) {
      unsubRef.current = mockDetectionService.subscribe(handleDetectionEvent);
      mockDetectionService.start();
    } else {
      mockDetectionService.stop();
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    }

    return () => {
      mockDetectionService.stop();
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [isMonitoring, handleDetectionEvent]);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, [setIsMonitoring]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, [setIsMonitoring]);

  const triggerFall = useCallback(() => {
    mockDetectionService.triggerManual('FALL');
  }, []);

  const triggerNormal = useCallback(() => {
    mockDetectionService.triggerManual('NORMAL');
  }, []);

  return { startMonitoring, stopMonitoring, triggerFall, triggerNormal };
}

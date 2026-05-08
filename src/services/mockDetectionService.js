/**
 * Mock AI Detection Service
 * Simulates a real-time fall detection AI pipeline.
 * Replace with WebSocket / API calls for production.
 */
import { generateId, randomBetween } from '../utils/helpers';

// Detection phases
const PHASES = ['NO_PERSON', 'NO_PERSON', 'NORMAL', 'NORMAL', 'NORMAL', 'FALL'];

class MockDetectionService {
  constructor() {
    this._timer = null;
    this._callbacks = [];
    this._phaseIndex = 0;
    this._running = false;
  }

  /**
   * Subscribe to detection events.
   * @param {Function} callback - Called with each DetectionEvent
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    this._callbacks.push(callback);
    return () => {
      this._callbacks = this._callbacks.filter((cb) => cb !== callback);
    };
  }

  _emit(event) {
    this._callbacks.forEach((cb) => cb(event));
  }

  _buildEvent(type) {
    return {
      id: generateId(),
      type,                        // 'NO_PERSON' | 'NORMAL' | 'FALL'
      timestamp: new Date().toISOString(),
      confidence: type === 'NO_PERSON' ? 0 : parseFloat(randomBetween(0.65, 0.99).toFixed(2)),
      snapshotUri: null,           // will be filled by snapshot service
      source: 'mock',
    };
  }

  /** Trigger a specific event manually */
  triggerManual(type) {
    if (!this._running) return;
    const event = this._buildEvent(type);
    this._emit(event);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._phaseIndex = 0;
    this._scheduleNext();
  }

  stop() {
    this._running = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  isRunning() {
    return this._running;
  }

  _scheduleNext() {
    if (!this._running) return;
    // Random interval 10–20 seconds
    const delay = randomBetween(10_000, 20_000);

    this._timer = setTimeout(() => {
      if (!this._running) return;

      // Advance phase cyclically, with weighted randomness
      const rand = Math.random();
      let type;
      if (rand < 0.25) {
        type = 'NO_PERSON';
      } else if (rand < 0.80) {
        type = 'NORMAL';
      } else {
        type = 'FALL';
      }

      const event = this._buildEvent(type);
      this._emit(event);
      this._scheduleNext();
    }, delay);
  }
}

// Singleton
export const mockDetectionService = new MockDetectionService();

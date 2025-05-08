// File: src/core/eventEmitter.js
// Simple pub/sub event emitter
const listeners = {};

/**
 * Subscribe to an event.
 * @param {string} eventName
 * @param {Function} handler
 */
export function on(eventName, handler) {
  if (!listeners[eventName]) listeners[eventName] = [];
  listeners[eventName].push(handler);
}

/**
 * Unsubscribe a handler from an event.
 * @param {string} eventName
 * @param {Function} handler
 */
export function off(eventName, handler) {
  const handlers = listeners[eventName];
  if (!handlers) return;
  const idx = handlers.indexOf(handler);
  if (idx > -1) handlers.splice(idx, 1);
}

/**
 * Emit an event with optional payload.
 * @param {string} eventName
 * @param {*} [payload]
 */
export function emit(eventName, payload) {
  const handlers = listeners[eventName] || [];
  handlers.forEach(fn => fn(payload));
}


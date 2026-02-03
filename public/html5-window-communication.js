/**
 * @fileoverview HTML5 cross-window communication module for table drag & drop.
 * 
 * @module html5-window-communication
 * @description
 * Provides utilities for HTML5 Drag & Drop cross-window communication via postMessage.
 * Includes validation and sanitization to prevent XSS and injection attacks.
 * 
 * @author iframe-dnd-demo
 * @version 1.0.0
 */

/**
 * HTML escape function to prevent XSS attacks.
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML-safe text
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Validate row data structure.
 * @param {*} data - Data to validate
 * @returns {boolean} True if valid row data
 */
export function isValidRowData(data) {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.description === 'string' &&
    data.description.length > 0 &&
    data.description.length < 1000
  );
}

/**
 * Validate and sanitize ID for use in querySelector.
 * @param {*} id - ID to validate
 * @returns {string|null} Sanitized ID or null if invalid
 */
export function validateId(id) {
  const strId = String(id || '');
  // Only allow alphanumeric, hyphen, and underscore
  if (/^[A-Za-z0-9_-]+$/.test(strId)) {
    return strId;
  }
  return null;
}

/**
 * Valid message types that can be relayed.
 */
export const VALID_MESSAGE_TYPES = new Set([
  'html5DragStart',
  'html5DragEnd',
  'rowCopied',
  'removeItem'
]);

/**
 * Validate message structure before processing.
 * @param {*} data - Message data to validate
 * @returns {boolean} True if valid message
 */
export function isValidMessage(data) {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.type === 'string' &&
    VALID_MESSAGE_TYPES.has(data.type)
  );
}

/**
 * Send a safe postMessage to window.opener.
 * @param {object} message - Message object with type and data
 * @param {string} origin - Target origin (use window.location.origin)
 */
export function sendToOpener(message, origin) {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(message, origin);
  }
}

/**
 * Create a message handler that validates data before processing.
 * @param {object} handlers - Map of message type to handler function
 * @param {string} origin - Expected origin for messages
 * @returns {function} Message event handler
 */
export function createMessageHandler(handlers, origin) {
  return function(event) {
    // Validate origin
    if (event.origin !== origin) {
      console.warn('[HTML5 Comm] Rejecting message from unexpected origin:', event.origin);
      return;
    }

    // Validate message structure
    if (!isValidMessage(event.data)) {
      console.warn('[HTML5 Comm] Rejecting invalid message structure:', event.data);
      return;
    }

    // Dispatch to appropriate handler
    const handler = handlers[event.data.type];
    if (handler && typeof handler === 'function') {
      try {
        handler(event.data, event);
      } catch (err) {
        console.error('[HTML5 Comm] Error in message handler:', err);
      }
    }
  };
}

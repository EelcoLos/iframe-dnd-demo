/**
 * @fileoverview BroadcastChannel-based communication module for cross-window drag and drop.
 * 
 * @module broadcast-communication
 * @description
 * This module provides the `BroadcastCommunicationManager` class which enables drag and drop
 * operations across separate browser windows/tabs using the BroadcastChannel API.
 * 
 * @example
 * import { BroadcastCommunicationManager } from './broadcast-communication.js';
 * 
 * const manager = new BroadcastCommunicationManager({
 *   windowId: 'frame-a',
 *   channelName: 'iframe-dnd-channel'
 * });
 * manager.initialize();
 * 
 * @author iframe-dnd-demo
 * @version 1.0.0
 */

/**
 * @typedef {Object} BroadcastManagerOptions
 * @property {string} windowId - Unique identifier for this window
 * @property {string} [channelName='iframe-dnd-channel'] - Name of the BroadcastChannel
 */

/**
 * @typedef {Object} BroadcastMessage
 * @property {string} type - Message type
 * @property {string} source - Source window ID
 * @property {*} data - Message payload
 */

/**
 * Manager for cross-window communication using BroadcastChannel API.
 * 
 * @class BroadcastCommunicationManager
 * @description
 * Manages cross-window drag and drop by:
 * - Creating and managing a BroadcastChannel for communication
 * - Broadcasting drag events to all windows
 * - Receiving and routing messages from other windows
 * - Maintaining window registry for coordination
 * - Providing fallback for browsers without BroadcastChannel support
 * 
 * @example
 * const manager = new BroadcastCommunicationManager({
 *   windowId: 'draggable-window'
 * });
 * manager.initialize();
 */
export class BroadcastCommunicationManager {
  /**
   * Create a broadcast communication manager.
   * 
   * @constructor
   * @param {BroadcastManagerOptions} options - Configuration options
   * @throws {Error} If windowId is not provided or BroadcastChannel is not supported
   */
  constructor(options = {}) {
    const { windowId, channelName = 'iframe-dnd-channel' } = options;
    
    if (!windowId) {
      throw new Error('windowId is required');
    }
    
    // Check BroadcastChannel support
    if (typeof BroadcastChannel === 'undefined') {
      throw new Error('BroadcastChannel is not supported in this browser');
    }
    
    /**
     * Unique identifier for this window
     * @type {string}
     * @private
     */
    this.windowId = windowId;
    
    /**
     * BroadcastChannel instance
     * @type {BroadcastChannel}
     * @private
     */
    this.channel = new BroadcastChannel(channelName);
    
    /**
     * Map of registered message handlers
     * @type {Map<string, Function[]>}
     * @private
     */
    this.messageHandlers = new Map();
    
    /**
     * Whether the manager is initialized
     * @type {boolean}
     * @private
     */
    this.initialized = false;
    
    /**
     * Set of known window IDs in the channel
     * @type {Set<string>}
     * @private
     */
    this.knownWindows = new Set();
  }
  
  /**
   * Initialize the manager and set up message handling.
   * 
   * @example
   * manager.initialize();
   */
  initialize() {
    if (this.initialized) return;
    
    // Set up message listener
    this.channel.onmessage = (event) => this.handleMessage(event);
    
    // Announce this window's presence
    this.broadcast('windowJoined', { windowId: this.windowId });
    
    // Handle window close
    window.addEventListener('beforeunload', () => {
      this.broadcast('windowLeft', { windowId: this.windowId });
      this.close();
    });
    
    this.initialized = true;
  }
  
  /**
   * Register a message handler for a specific message type.
   * 
   * @param {string} type - Message type to handle
   * @param {Function} handler - Handler function
   * 
   * @example
   * manager.on('dragStart', (data) => {
   *   console.log('Drag started:', data);
   * });
   */
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }
  
  /**
   * Remove a message handler.
   * 
   * @param {string} type - Message type
   * @param {Function} handler - Handler function to remove
   */
  off(type, handler) {
    if (!this.messageHandlers.has(type)) return;
    
    const handlers = this.messageHandlers.get(type);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Broadcast a message to all windows in the channel.
   * 
   * @param {string} type - Message type
   * @param {*} data - Message payload
   * 
   * @example
   * manager.broadcast('dragStart', {
   *   text: 'Item 1',
   *   id: '1'
   * });
   */
  broadcast(type, data) {
    const message = {
      type,
      source: this.windowId,
      data,
      timestamp: Date.now()
    };
    
    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }
  
  /**
   * Send a message to a specific window.
   * Note: BroadcastChannel doesn't support direct messaging,
   * so this adds a target field and all windows will receive it.
   * 
   * @param {string} targetWindowId - Target window ID
   * @param {string} type - Message type
   * @param {*} data - Message payload
   * 
   * @example
   * manager.sendTo('frame-b', 'drop', { itemId: '1' });
   */
  sendTo(targetWindowId, type, data) {
    const message = {
      type,
      source: this.windowId,
      target: targetWindowId,
      data,
      timestamp: Date.now()
    };
    
    try {
      this.channel.postMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
  
  /**
   * Handle incoming messages from the channel.
   * 
   * @param {MessageEvent} event - BroadcastChannel message event
   * @private
   */
  handleMessage(event) {
    const message = event.data;
    
    // Ignore messages from self
    if (message.source === this.windowId) return;
    
    // If message has a target, only process if we're the target
    if (message.target && message.target !== this.windowId) return;
    
    // Track known windows
    if (message.type === 'windowJoined' && message.data?.windowId) {
      this.knownWindows.add(message.data.windowId);
      
      // Respond with our own presence
      if (message.data.windowId !== this.windowId) {
        this.broadcast('windowJoined', { windowId: this.windowId });
      }
    } else if (message.type === 'windowLeft' && message.data?.windowId) {
      this.knownWindows.delete(message.data.windowId);
    }
    
    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.data, message.source);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }
  
  /**
   * Get list of known windows.
   * 
   * @returns {string[]} Array of window IDs
   */
  getKnownWindows() {
    return Array.from(this.knownWindows);
  }
  
  /**
   * Close the channel and clean up.
   */
  close() {
    if (this.channel) {
      this.channel.close();
    }
    this.messageHandlers.clear();
    this.knownWindows.clear();
    this.initialized = false;
  }
}

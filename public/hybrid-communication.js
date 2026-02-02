/**
 * @fileoverview Hybrid communication module using both BroadcastChannel and postMessage.
 * 
 * @module hybrid-communication
 * @description
 * This module provides cross-window communication with automatic fallback:
 * - Tries BroadcastChannel first (faster, cleaner)
 * - Falls back to window.postMessage when BroadcastChannel is partitioned (Firefox ETP)
 * - Maintains window references for postMessage relay
 * 
 * @author iframe-dnd-demo
 * @version 1.0.0
 */

/**
 * @typedef {Object} HybridCommunicationOptions
 * @property {string} windowId - Unique identifier for this window
 * @property {string} [channelName='iframe-dnd-channel'] - Channel name for BroadcastChannel
 * @property {boolean} [debug=false] - Enable debug logging
 */

/**
 * Hybrid manager for cross-window communication.
 * Uses BroadcastChannel when available, postMessage as fallback.
 */
export class HybridCommunicationManager {
  /**
   * Create a hybrid communication manager.
   * @param {HybridCommunicationOptions} options - Configuration options
   */
  constructor(options = {}) {
    const { windowId, channelName = 'iframe-dnd-channel', debug = false } = options;
    
    if (!windowId) {
      throw new Error('windowId is required');
    }
    
    this.debug = debug;
    
    this.windowId = windowId;
    this.channelName = channelName;
    this.messageHandlers = new Map();
    this.initialized = false;
    this.knownWindows = new Set();
    this.windowRefs = new Map(); // Store window references for postMessage
    this.isCoordinator = false;
    this.coordinatorWindow = null;
    this.useBroadcastChannel = false;
    
    // Try to use BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(channelName);
        this.useBroadcastChannel = true;
      } catch (e) {
        console.warn('BroadcastChannel failed, using postMessage fallback:', e);
        this.useBroadcastChannel = false;
      }
    }
  }
  
  /**
   * Log debug messages if debug mode is enabled.
   * @private
   */
  log(...args) {
    if (this.debug) {
      console.log('[HybridComm]', ...args);
    }
  }
  
  /**
   * Initialize as coordinator (parent window that opens child windows)
   */
  initializeAsCoordinator() {
    this.isCoordinator = true;
    this.initialize();
    
    // Set up postMessage listener for child windows
    window.addEventListener('message', (event) => this.handlePostMessage(event));
  }
  
  /**
   * Initialize as child window
   */
  initializeAsChild() {
    this.isCoordinator = false;
    
    // Store reference to opener (coordinator)
    if (window.opener && !window.opener.closed) {
      this.coordinatorWindow = window.opener;
      console.log(`[HybridComm] ${this.windowId} initialized as child, coordinator found`);
    } else {
      console.error(`[HybridComm] ${this.windowId} has NO coordinator window!`);
      console.error('Cross-window mode requires windows to be opened from the Coordinator.');
      console.error('Please open parent-windows.html and use the buttons there to open child windows.');
    }
    
    this.initialize();
    
    // Set up postMessage listener
    window.addEventListener('message', (event) => this.handlePostMessage(event));
    
    // Announce to coordinator via postMessage
    this.sendToCoordinator('windowJoined', { windowId: this.windowId });
  }
  
  initialize() {
    if (this.initialized) return;
    
    if (this.useBroadcastChannel && this.channel) {
      this.channel.onmessage = (event) => this.handleBroadcastMessage(event);
      
      // Test if BroadcastChannel actually works
      this.testBroadcastChannel();
    }
    
    // Handle window close
    window.addEventListener('beforeunload', () => {
      this.broadcast('windowLeft', { windowId: this.windowId });
      this.close();
    });
    
    this.initialized = true;
  }
  
  /**
   * Test if BroadcastChannel is working (not partitioned)
   */
  async testBroadcastChannel() {
    if (!this.useBroadcastChannel) return;
    
    const testId = Math.random().toString(36).slice(2, 11);
    let received = false;
    
    // Set up a temporary listener that processes ALL messages for testing
    const testHandler = (event) => {
      const message = event.data;
      if (message.type === 'broadcastTest' && message.data?.testId === testId) {
        received = true;
        console.log('[HybridComm] BroadcastChannel test message received - channel is working');
      }
    };
    
    this.channel.addEventListener('message', testHandler);
    
    console.log('[HybridComm] Testing BroadcastChannel connectivity for', this.windowId);
    this.broadcast('broadcastTest', { testId });
    
    // Wait to see if we receive our own message (BroadcastChannel sends to all including self)
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.channel.removeEventListener('message', testHandler);
    
    // If we didn't receive our own broadcast, it's partitioned
    if (!received) {
      console.warn('[HybridComm] BroadcastChannel appears to be partitioned for', this.windowId, '- using postMessage fallback');
      this.useBroadcastChannel = false;
    } else {
      console.log('[HybridComm] BroadcastChannel is working for', this.windowId);
    }
  }
  
  /**
   * Register window reference for postMessage
   */
  registerWindow(windowId, windowRef) {
    this.windowRefs.set(windowId, windowRef);
    this.knownWindows.add(windowId);
  }
  
  /**
   * Handle BroadcastChannel messages
   */
  handleBroadcastMessage(event) {
    const message = event.data;
    
    // Ignore messages from self
    if (message.source === this.windowId) return;
    
    // If message has a target, only process if we're the target
    if (message.target && message.target !== this.windowId) return;
    
    this.processMessage(message);
  }
  
  /**
   * Handle postMessage messages
   */
  handlePostMessage(event) {
    // Validate origin for security
    if (event.origin !== window.location.origin) {
      console.warn(`[HybridComm] ${this.windowId} rejected message from wrong origin:`, event.origin, 'expected:', window.location.origin);
      return;
    }
    
    const message = event.data;
    
    // Check if this is our message format
    if (!message.type || !message.source) {
      console.log(`[HybridComm] ${this.windowId} ignoring non-hybrid message:`, message);
      return;
    }
    
    // Ignore messages from self
    if (message.source === this.windowId) {
      console.log(`[HybridComm] ${this.windowId} ignoring message from self`);
      return;
    }
    
    console.log(`[HybridComm] ${this.windowId} received via postMessage:`, message.type, 'from', message.source);
    
    // If we're the coordinator, relay to other windows
    if (this.isCoordinator && message.relay !== false) {
      this.relayMessage(message, message.source);
    }
    
    // Process the message
    this.processMessage(message);
  }
  
  /**
   * Relay message to all other child windows (coordinator only)
   */
  relayMessage(message, sourceId) {
    if (!this.isCoordinator) return;
    
    console.log(`[HybridComm] Coordinator relaying message type="${message.type}" from ${sourceId} to other windows`);
    
    // Mark as relayed to prevent loops
    const relayedMessage = { ...message, relay: false };
    
    for (const [windowId, windowRef] of this.windowRefs.entries()) {
      // Don't send back to source
      if (windowId === sourceId) continue;
      
      // Skip if window is closed or invalid
      if (!windowRef) {
        console.warn(`[HybridComm] Window reference for ${windowId} is null/undefined, removing`);
        this.windowRefs.delete(windowId);
        this.knownWindows.delete(windowId);
        continue;
      }
      
      if (windowRef.closed) {
        console.warn(`[HybridComm] Window ${windowId} is closed, removing`);
        this.windowRefs.delete(windowId);
        this.knownWindows.delete(windowId);
        continue;
      }
      
      // Additional validation - verify window is accessible
      try {
        // Try to access window.name to verify window is accessible
        const windowName = windowRef.name || 'unknown';
      } catch (e) {
        console.warn(`[HybridComm] Cannot access window.name for ${windowId}:`, e.message);
      }
      
      try {
        console.log(`[HybridComm] Relaying to ${windowId}, window.closed:`, windowRef.closed, 'message:', relayedMessage);
        windowRef.postMessage(relayedMessage, window.location.origin);
        console.log(`[HybridComm] Successfully posted message to ${windowId}`);
      } catch (e) {
        console.error(`[HybridComm] Failed to relay message to ${windowId}:`, e);
      }
    }
  }
  
  /**
   * Process incoming message
   */
  processMessage(message) {
    console.log(`[HybridComm] ${this.windowId} processing message type="${message.type}"`, message);
    
    // Track known windows
    if (message.type === 'windowJoined' && message.data?.windowId) {
      this.knownWindows.add(message.data.windowId);
    } else if (message.type === 'windowLeft' && message.data?.windowId) {
      this.knownWindows.delete(message.data.windowId);
      this.windowRefs.delete(message.data.windowId);
    }
    
    // Call registered handlers
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      console.log(`[HybridComm] ${this.windowId} found ${handlers.length} handler(s) for type "${message.type}"`);
      handlers.forEach(handler => {
        try {
          handler(message.data, message.source);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    } else {
      console.warn(`[HybridComm] ${this.windowId} NO handlers registered for message type "${message.type}"`);
    }
  }
  
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }
  
  off(type, handler) {
    if (!this.messageHandlers.has(type)) return;
    
    const handlers = this.messageHandlers.get(type);
    const index = handlers.indexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  }
  
  /**
   * Broadcast message to all windows
   */
  broadcast(type, data) {
    const message = {
      type,
      source: this.windowId,
      data,
      timestamp: Date.now(),
      relay: true
    };
    
    console.log(`[HybridComm] ${this.windowId} broadcasting:`, type, this.useBroadcastChannel ? '(via BroadcastChannel)' : '(via postMessage)');
    
    // Try BroadcastChannel first
    if (this.useBroadcastChannel && this.channel) {
      try {
        this.channel.postMessage(message);
        return; // Success, no need for fallback
      } catch (error) {
        console.warn('[HybridComm] BroadcastChannel failed, using postMessage:', error);
        this.useBroadcastChannel = false;
      }
    }
    
    // Fallback to postMessage
    this.sendViaPostMessage(message);
  }
  
  /**
   * Send message via postMessage (fallback)
   */
  sendViaPostMessage(message) {
    if (this.isCoordinator) {
      // Coordinator sends to all child windows
      for (const [windowId, windowRef] of this.windowRefs.entries()) {
        if (!windowRef || windowRef.closed) {
          this.windowRefs.delete(windowId);
          this.knownWindows.delete(windowId);
          continue;
        }
        
        try {
          windowRef.postMessage(message, window.location.origin);
        } catch (e) {
          console.warn(`Failed to send to ${windowId}:`, e);
        }
      }
    } else {
      // Child sends to coordinator for relay
      this.sendToCoordinator(message.type, message.data);
    }
  }
  
  /**
   * Send message to coordinator (child window only)
   */
  sendToCoordinator(type, data) {
    if (this.isCoordinator || !this.coordinatorWindow || this.coordinatorWindow.closed) {
      return;
    }
    
    const message = {
      type,
      source: this.windowId,
      data,
      timestamp: Date.now(),
      relay: true
    };
    
    try {
      this.coordinatorWindow.postMessage(message, window.location.origin);
    } catch (e) {
      console.error('Failed to send to coordinator:', e);
    }
  }
  
  sendTo(targetWindowId, type, data) {
    const message = {
      type,
      source: this.windowId,
      target: targetWindowId,
      data,
      timestamp: Date.now(),
      relay: true
    };
    
    if (this.useBroadcastChannel && this.channel) {
      try {
        this.channel.postMessage(message);
        return;
      } catch (error) {
        this.useBroadcastChannel = false;
      }
    }
    
    this.sendViaPostMessage(message);
  }
  
  getKnownWindows() {
    return Array.from(this.knownWindows);
  }
  
  close() {
    if (this.channel) {
      this.channel.close();
    }
    this.messageHandlers.clear();
    this.knownWindows.clear();
    this.windowRefs.clear();
    this.initialized = false;
  }
}

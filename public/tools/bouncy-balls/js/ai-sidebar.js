/**
 * Chatooly AI Sidebar - Chat Interface
 *
 * Handles WebSocket connection to the backend server and manages
 * the chat interface for communicating with the Claude Agent.
 */

(function() {
  'use strict';

  // Configuration
  const WS_URL = `ws://${window.location.hostname}:3001/ws`;
  const RECONNECT_DELAY = 3000;
  const MAX_RECONNECT_ATTEMPTS = 5;

  // DOM Elements
  const statusEl = document.getElementById('ai-status');
  const messagesEl = document.getElementById('ai-messages');
  const inputEl = document.getElementById('ai-input');
  const sendBtn = document.getElementById('ai-send');
  const clearBtn = document.getElementById('ai-clear');

  // State
  let socket = null;
  let reconnectAttempts = 0;
  let isConnected = false;
  let isThinking = false;

  /**
   * Initialize the AI sidebar
   */
  function init() {
    if (!statusEl || !messagesEl || !inputEl || !sendBtn) {
      console.warn('AI Sidebar: Required elements not found');
      return;
    }

    // Connect to WebSocket
    connect();

    // Setup event listeners
    setupEventListeners();

    console.log('🤖 AI Sidebar initialized');
  }

  /**
   * Connect to WebSocket server
   */
  function connect() {
    try {
      socket = new WebSocket(WS_URL);

      socket.onopen = handleOpen;
      socket.onclose = handleClose;
      socket.onerror = handleError;
      socket.onmessage = handleMessage;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  function handleOpen() {
    console.log('🔌 Connected to AI server');
    isConnected = true;
    reconnectAttempts = 0;
    updateStatus('connected', 'Connected');
    sendBtn.disabled = false;
  }

  /**
   * Handle WebSocket close event
   */
  function handleClose() {
    console.log('🔌 Disconnected from AI server');
    isConnected = false;
    updateStatus('disconnected', 'Disconnected');
    sendBtn.disabled = true;
    scheduleReconnect();
  }

  /**
   * Handle WebSocket error event
   */
  function handleError(error) {
    console.error('WebSocket error:', error);
    updateStatus('disconnected', 'Error');
  }

  /**
   * Handle incoming WebSocket messages
   */
  function handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('📨 Received:', data.type);

      switch (data.type) {
        case 'connected':
          if (!data.hasApiKey) {
            addMessage('system', '⚠️ API key not configured. Add your ANTHROPIC_API_KEY to the .env file and restart the server.');
          }
          break;

        case 'thinking':
          isThinking = true;
          updateStatus('thinking', 'Thinking...');
          break;

        case 'assistant':
          isThinking = false;
          updateStatus('connected', 'Connected');
          addMessage('assistant', data.content);
          break;

        case 'tool_use':
          addMessage('tool-use', `🔧 Using: ${data.tool}`);
          break;

        case 'result':
          isThinking = false;
          updateStatus('connected', 'Connected');
          if (data.subtype === 'success') {
            addMessage('system', `✅ Task completed (${data.num_turns} turns, $${data.total_cost_usd?.toFixed(4) || '0.00'})`);
          } else {
            addMessage('error', `❌ ${data.subtype}: ${data.errors?.join(', ') || 'Unknown error'}`);
          }
          break;

        case 'system':
          if (data.subtype === 'init') {
            addMessage('system', `🚀 Agent initialized with ${data.tools?.length || 0} tools`);
          }
          break;

        case 'error':
          isThinking = false;
          updateStatus('connected', 'Connected');
          addMessage('error', data.message);
          break;

        case 'file-changed':
          handleFileChange(data);
          break;

        case 'pong':
          // Heartbeat response
          break;

        case 'cancelled':
          isThinking = false;
          updateStatus('connected', 'Connected');
          addMessage('system', '🛑 ' + data.message);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Handle file change events for live reload
   */
  function handleFileChange(data) {
    const { file, eventType } = data;
    console.log(`📝 File ${eventType}: ${file}`);

    // Reload scripts dynamically
    if (file.endsWith('.js') && !file.includes('ai-sidebar')) {
      reloadScript(file);
    }

    // For HTML changes, we might need a full reload
    if (file.endsWith('.html')) {
      addMessage('system', `📄 HTML changed: ${file} - Refresh to see changes`);
    }
  }

  /**
   * Dynamically reload a script
   */
  function reloadScript(src) {
    const normalizedSrc = src.startsWith('/') ? src : '/' + src;

    // Find existing script
    const existingScript = document.querySelector(`script[src^="${normalizedSrc}"]`);

    if (existingScript) {
      // Create new script with cache-busting
      const newScript = document.createElement('script');
      newScript.src = `${normalizedSrc}?t=${Date.now()}`;

      newScript.onload = () => {
        console.log(`♻️ Reloaded: ${src}`);

        // Trigger re-render if available
        if (typeof window.render === 'function') {
          window.render();
        }
        if (typeof window.draw === 'function') {
          window.draw();
        }
      };

      newScript.onerror = () => {
        console.error(`Failed to reload: ${src}`);
      };

      // Replace old script
      existingScript.parentNode.insertBefore(newScript, existingScript);
      existingScript.remove();

      addMessage('system', `♻️ Script reloaded: ${src}`);
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  function scheduleReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      addMessage('error', '❌ Could not connect to server. Please ensure the server is running (npm start)');
      return;
    }

    reconnectAttempts++;
    const delay = RECONNECT_DELAY * reconnectAttempts;

    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

    setTimeout(() => {
      if (!isConnected) {
        connect();
      }
    }, delay);
  }

  /**
   * Update the status indicator
   */
  function updateStatus(state, text) {
    statusEl.className = `ai-status ${state}`;
    statusEl.textContent = text;
  }

  /**
   * Add a message to the chat
   */
  function addMessage(type, content) {
    // Remove welcome message if present
    const welcome = messagesEl.querySelector('.ai-welcome');
    if (welcome) {
      welcome.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = `ai-message ${type}`;

    // Format content (handle markdown-like formatting)
    messageEl.innerHTML = formatContent(content);

    messagesEl.appendChild(messageEl);

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  /**
   * Format message content with basic markdown support
   */
  function formatContent(content) {
    if (!content) return '';

    // Escape HTML
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    return formatted;
  }

  /**
   * Send a message to the agent
   */
  function sendMessage() {
    const text = inputEl.value.trim();

    if (!text || !isConnected || isThinking) {
      return;
    }

    // Add user message to chat
    addMessage('user', text);

    // Send to server
    socket.send(JSON.stringify({
      type: 'chat',
      prompt: text
    }));

    // Clear input
    inputEl.value = '';
    inputEl.focus();
  }

  /**
   * Clear the conversation
   */
  function clearConversation() {
    // Reset messages area
    messagesEl.innerHTML = `
      <div class="ai-welcome">
        <h4>Welcome to Chatooly AI</h4>
        <p>Describe the tool you want to build, and I'll create it for you following all Chatooly conventions.</p>
        <p style="margin-top: 12px; font-size: 11px;">Examples:<br>
        "Create a gradient generator"<br>
        "Build a mandala pattern tool"<br>
        "Make a color palette picker"</p>
      </div>
    `;

    inputEl.focus();
  }

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Send button
    sendBtn.addEventListener('click', sendMessage);

    // Clear button
    clearBtn.addEventListener('click', clearConversation);

    // Enter to send (Shift+Enter for new line)
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Enable/disable send button based on input
    inputEl.addEventListener('input', () => {
      sendBtn.disabled = !isConnected || !inputEl.value.trim();
    });

    // Heartbeat to keep connection alive
    setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.ChatoolyAI = {
    connect,
    sendMessage,
    clearConversation,
    isConnected: () => isConnected,
    isThinking: () => isThinking
  };

})();

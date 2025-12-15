/**
 * Tool IPC - Inter-Process Communication for Tool iframe
 *
 * Handles communication between the tool iframe and the parent shell.
 * This script runs inside index.html (the tool) and:
 * - Notifies parent when tool is ready
 * - Receives file change notifications
 * - Handles hot-reload of scripts
 */

(function() {
  'use strict';

  // BroadcastChannel for communication with parent shell
  const ipcChannel = new BroadcastChannel('chatooly-ipc');

  /**
   * Initialize IPC
   */
  function init() {
    // Notify parent that tool iframe is ready
    ipcChannel.postMessage({ type: 'tool-ready' });

    // Setup message handler
    ipcChannel.onmessage = handleMessage;

    console.log('📱 Tool IPC initialized');
  }

  /**
   * Handle messages from parent shell
   */
  function handleMessage(event) {
    const { type, file, eventType } = event.data;

    switch (type) {
      case 'refresh-tool':
        // Parent requested a refresh
        window.location.reload();
        break;

      case 'file-changed':
        handleFileChange(file, eventType);
        break;

      default:
        console.log('Tool IPC received:', type, event.data);
    }
  }

  /**
   * Handle file change notifications
   */
  function handleFileChange(file, eventType) {
    console.log(`📝 File ${eventType}: ${file}`);

    // Reload JavaScript files dynamically (except this file)
    if (file.endsWith('.js') && !file.includes('tool-ipc')) {
      reloadScript(file);
    }

    // CSS files could be hot-reloaded here too
    if (file.endsWith('.css')) {
      reloadStylesheet(file);
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
        // Notify parent of error
        ipcChannel.postMessage({
          type: 'tool-error',
          data: { message: `Failed to reload script: ${src}` }
        });
      };

      // Replace old script
      existingScript.parentNode.insertBefore(newScript, existingScript);
      existingScript.remove();
    }
  }

  /**
   * Dynamically reload a stylesheet
   */
  function reloadStylesheet(src) {
    const normalizedSrc = src.startsWith('/') ? src : '/' + src;

    // Find existing stylesheet
    const existingLink = document.querySelector(`link[href^="${normalizedSrc}"]`);

    if (existingLink) {
      // Update href with cache-busting
      existingLink.href = `${normalizedSrc}?t=${Date.now()}`;
      console.log(`♻️ Reloaded CSS: ${src}`);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for debugging
  window.ToolIPC = {
    ipcChannel,
    reloadScript,
    reloadStylesheet
  };

})();

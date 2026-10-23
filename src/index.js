// Cloudflare Worker handling WebSocket connections and serving the UI
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle WebSocket Upgrade
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket" || url.pathname === "/ws") {
      if (upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept the server end
      server.accept();

      // On new connection, generate a random string with latest timestamp and send it
      const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const initialText = `RANDOM-${randomId}`;
      const initialPayload = `${initialText} | TS: ${new Date().toISOString()}`;
      
      // Send initial message right after handshake completes
      setTimeout(() => {
        try {
          server.send(initialPayload);
        } catch (e) {
          // Socket might have closed
        }
      }, 50);

      // Handle incoming messages from UI
      server.addEventListener("message", (event) => {
        try {
          const rawMessage = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
          
          // Strip any previous timestamp tag: " | TS: ..." or " | SERVER_TS: ..."
          const baseText = rawMessage.replace(/\s*\|\s*(TS|SERVER_TS|CLIENT_TS):.*$/i, "").trim();

          // Append latest server timestamp
          const responsePayload = `${baseText} | TS: ${new Date().toISOString()}`;

          server.send(responsePayload);
        } catch (err) {
          console.error("Error processing message:", err);
        }
      });

      server.addEventListener("close", (event) => {
        console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // 2. Serve the UI on regular HTTP GET requests
    return new Response(getHtmlContent(), {
      headers: {
        "Content-Type": "text/html;charset=utf-8",
      },
    });
  },
};

function getHtmlContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cloudflare Worker WSS Ping-Pong</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --server: #a855f7;
      --client: #22c55e;
      --accent: #f59e0b;
      --danger: #ef4444;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
    body {
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }
    .container {
      width: 100%;
      max-width: 860px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1rem;
    }
    h1 {
      font-size: 1.4rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      background: #334155;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #64748b;
    }
    .connected .dot { background: var(--client); box-shadow: 0 0 8px var(--client); }
    .connecting .dot { background: var(--accent); }
    .disconnected .dot { background: var(--danger); }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .stat-item {
      background: rgba(15, 23, 42, 0.6);
      padding: 1rem;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
    }
    .stat-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--primary);
      font-family: monospace;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }
    button {
      padding: 0.6rem 1.2rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      font-size: 0.9rem;
    }
    .btn-primary {
      background: var(--primary);
      color: #0f172a;
    }
    .btn-primary:hover {
      background: #7dd3fc;
    }
    .btn-danger {
      background: var(--danger);
      color: white;
    }
    .btn-danger:hover {
      background: #f87171;
    }
    .btn-secondary {
      background: var(--border);
      color: var(--text);
    }
    .btn-secondary:hover {
      background: #475569;
    }
    input {
      flex: 1;
      min-width: 200px;
      padding: 0.6rem 1rem;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: var(--text);
      font-family: monospace;
      outline: none;
    }
    input:focus {
      border-color: var(--primary);
    }

    .log-container {
      display: flex;
      flex-direction: column;
      height: 380px;
      overflow: hidden;
    }
    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .log-body {
      flex: 1;
      overflow-y: auto;
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.82rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .log-entry {
      padding: 0.35rem 0.5rem;
      border-radius: 0.25rem;
      display: flex;
      gap: 0.5rem;
      line-height: 1.4;
      word-break: break-all;
    }
    .log-entry.server {
      background: rgba(168, 85, 247, 0.12);
      border-left: 3px solid var(--server);
    }
    .log-entry.client {
      background: rgba(34, 197, 94, 0.12);
      border-left: 3px solid var(--client);
    }
    .log-entry.sys {
      background: rgba(148, 163, 184, 0.1);
      border-left: 3px solid #64748b;
      color: var(--text-muted);
    }
    .tag {
      font-weight: 700;
      flex-shrink: 0;
    }
    .tag-server { color: var(--server); }
    .tag-client { color: var(--client); }
    .tag-sys { color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>
        <span>⚡ Cloudflare Workers WebSocket</span>
      </h1>
      <div id="statusBadge" class="badge disconnected">
        <span class="dot"></span>
        <span id="statusText">Disconnected</span>
      </div>
    </header>

    <div class="card stats-grid">
      <div class="stat-item">
        <div class="stat-label">Loop Count</div>
        <div id="loopCount" class="stat-value">0</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Interval</div>
        <div class="stat-value">1.0 sec</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Active String</div>
        <div id="activeBaseString" class="stat-value" style="font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</div>
      </div>
    </div>

    <div class="card controls">
      <button id="toggleBtn" class="btn-primary" onclick="toggleConnection()">Connect</button>
      <input type="text" id="customInput" placeholder="Inject new string (e.g. CUSTOM-MSG)" />
      <button class="btn-secondary" onclick="sendCustom()">Inject String</button>
      <button class="btn-secondary" onclick="clearLogs()">Clear Log</button>
    </div>

    <div class="card log-container">
      <div class="log-header">
        <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-muted);">Real-time Exchange Stream</span>
        <label style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem;">
          <input type="checkbox" id="autoScroll" checked style="min-width: unset; width: auto;" /> Auto-scroll
        </label>
      </div>
      <div id="logBody" class="log-body"></div>
    </div>
  </div>

  <script>
    let socket = null;
    let loopCounter = 0;
    let nextSendTimeout = null;
    let isPaused = false;

    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const toggleBtn = document.getElementById('toggleBtn');
    const loopCountEl = document.getElementById('loopCount');
    const activeBaseStringEl = document.getElementById('activeBaseString');
    const logBody = document.getElementById('logBody');
    const autoScroll = document.getElementById('autoScroll');
    const customInput = document.getElementById('customInput');

    function addLog(type, text) {
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      
      const tag = document.createElement('span');
      tag.className = 'tag tag-' + type;
      tag.textContent = type === 'server' ? '[SERVER ➔ UI]' : (type === 'client' ? '[UI ➔ SERVER]' : '[SYSTEM]');
      
      const content = document.createElement('span');
      content.textContent = text;

      entry.appendChild(tag);
      entry.appendChild(content);
      logBody.appendChild(entry);

      if (autoScroll.checked) {
        logBody.scrollTop = logBody.scrollHeight;
      }
    }

    function clearLogs() {
      logBody.innerHTML = '';
    }

    function setStatus(state, text) {
      statusBadge.className = 'badge ' + state;
      statusText.textContent = text;
      if (state === 'connected') {
        toggleBtn.textContent = 'Disconnect';
        toggleBtn.className = 'btn-danger';
      } else if (state === 'connecting') {
        toggleBtn.textContent = 'Connecting...';
        toggleBtn.className = 'btn-secondary';
      } else {
        toggleBtn.textContent = 'Connect';
        toggleBtn.className = 'btn-primary';
      }
    }

    function connect() {
      if (socket) {
        socket.close();
      }

      setStatus('connecting', 'Connecting...');
      addLog('sys', 'Initiating WebSocket connection...');

      // Build WS/WSS URL matching current host
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = protocol + '//' + window.location.host + '/ws';

      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setStatus('connected', 'Connected');
        addLog('sys', 'WebSocket connected. Waiting for initial payload from server...');
      };

      socket.onmessage = (event) => {
        const receivedStr = event.data;
        addLog('server', receivedStr);

        // Extract base text by removing old timestamp (e.g. " | TS: ...")
        const base = receivedStr.replace(/\\s*\\|\\s*(TS|SERVER_TS|CLIENT_TS):.*$/i, '').trim();
        activeBaseStringEl.textContent = base;

        // Schedule next response to server in exactly 1 second (1000ms)
        if (nextSendTimeout) clearTimeout(nextSendTimeout);
        nextSendTimeout = setTimeout(() => {
          if (socket && socket.readyState === WebSocket.OPEN && !isPaused) {
            // Replace with new client timestamp
            const newClientTs = new Date().toISOString();
            const outgoingPayload = base + ' | TS: ' + newClientTs;

            socket.send(outgoingPayload);
            loopCounter++;
            loopCountEl.textContent = loopCounter;
            addLog('client', outgoingPayload);
          }
        }, 1000);
      };

      socket.onerror = (err) => {
        addLog('sys', 'WebSocket error encountered.');
      };

      socket.onclose = (event) => {
        if (nextSendTimeout) clearTimeout(nextSendTimeout);
        setStatus('disconnected', 'Disconnected');
        addLog('sys', 'Connection closed (code: ' + event.code + ').');
      };
    }

    function disconnect() {
      if (nextSendTimeout) clearTimeout(nextSendTimeout);
      if (socket) {
        socket.close();
        socket = null;
      }
      setStatus('disconnected', 'Disconnected');
    }

    function toggleConnection() {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        disconnect();
      } else {
        connect();
      }
    }

    function sendCustom() {
      const val = customInput.value.trim();
      if (!val) return;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        alert('Please connect first!');
        return;
      }
      if (nextSendTimeout) clearTimeout(nextSendTimeout);
      const outgoing = val + ' | TS: ' + new Date().toISOString();
      socket.send(outgoing);
      loopCounter++;
      loopCountEl.textContent = loopCounter;
      activeBaseStringEl.textContent = val;
      addLog('client', outgoing + ' (Manual injection)');
      customInput.value = '';
    }

    // Auto-connect on page load
    window.addEventListener('load', () => {
      connect();
    });
  </script>
</body>
</html>`;
}

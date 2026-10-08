import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8000;

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Load .env file if present
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  } catch (err) {
    console.warn('[server] Warning: gagal membaca .env:', err.message);
  }
}
loadEnv();

function getOfficeConfig() {
  // Re-read .env on demand so changes can reflect dynamically without restarting server
  loadEnv();
  const defaultModel = process.env.DEFAULT_AI_MODEL || 'Gemini 3.8 Flash';
  const agentIds = ['kamala', 'devin', 'audit', 'rani', 'aura', 'raka'];
  const agents = {};

  for (const id of agentIds) {
    const upper = id.toUpperCase();
    const name = process.env[`AGENT_${upper}_NAME`];
    const role = process.env[`AGENT_${upper}_ROLE`];
    const model = process.env[`AGENT_${upper}_MODEL`] || defaultModel;

    agents[id] = {};
    if (name) agents[id].name = name;
    if (role) agents[id].role = role;
    if (model) agents[id].model = model;
  }

  return {
    defaultModel,
    agents
  };
}

// State cache
let currentState = null;
const stateFilePath = path.join(__dirname, 'state.json');
try {
  if (fs.existsSync(stateFilePath)) {
    currentState = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
  }
} catch (e) {}

// Security & Config
const AUTH_KEY = process.env.SAMS_OFFICE_KEY || process.env.MSAM_OFFICE_KEY || null;
const MAX_PAYLOAD_BYTES = 64 * 1024; // 64 KB protection against DoS
const ALLOWED_ORIGINS = (process.env.SAMS_ALLOWED_ORIGINS || process.env.MSAM_ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Validasi otorisasi jika MSAM_OFFICE_KEY diset
 */
function isAuthorized(req) {
  if (!AUTH_KEY) return true; // Bebas akses jika env var tidak diset (default local development)
  
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.replace(/^Bearer\s+/i, '').trim() === AUTH_KEY) {
    return true;
  }
  
  const customHeader = req.headers['x-office-key'];
  if (customHeader && customHeader.trim() === AUTH_KEY) {
    return true;
  }

  // Cek token dari query parameter: ?token=xxx
  try {
    const parsedUrl = new URL(req.url, 'http://localhost');
    if (parsedUrl.searchParams.get('token') === AUTH_KEY) {
      return true;
    }
  } catch (e) {}

  return false;
}

/**
 * Validasi Origin untuk mencegah Cross-Site WebSocket Hijacking (CSWSH)
 */
function isValidOrigin(origin) {
  if (!origin) return true; // Direct non-browser clients (curl, python, node notify.js)
  const norm = origin.toLowerCase();
  
  // Izinkan origin localhost / 127.0.0.1 dalam development
  if (
    norm.includes('localhost') || 
    norm.includes('127.0.0.1') || 
    norm.startsWith('http://localhost') || 
    norm.startsWith('http://127.0.0.1') ||
    norm.startsWith('file://')
  ) {
    return true;
  }

  // Izinkan jika ada dalam daftar whitelist domain yang dikonfigurasi
  if (ALLOWED_ORIGINS.some(allowed => norm === allowed || norm.endsWith(allowed))) {
    return true;
  }

  return false;
}

// 1. Create HTTP Server for Static Files & API Endpoint
const server = http.createServer((req, res) => {
  const origin = req.headers['origin'];
  const safeOrigin = isValidOrigin(origin) ? (origin || '*') : 'null';

  // Secure CORS Headers
  res.setHeader('Access-Control-Allow-Origin', safeOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Office-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoint: POST /api/event (Agy / CLI / Hermes / OpenClaw sends events here)
  if (req.url.startsWith('/api/event') && req.method === 'POST') {
    if (!isAuthorized(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing SAMS_OFFICE_KEY' }));
      return;
    }

    let body = '';
    let receivedBytes = 0;

    req.on('data', chunk => {
      receivedBytes += chunk.length;
      if (receivedBytes > MAX_PAYLOAD_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload Too Large (Max 64KB)' }));
        req.destroy();
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (receivedBytes > MAX_PAYLOAD_BYTES) return;
      try {
        const payload = JSON.parse(body);
        broadcastState(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', broadcasted: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API Endpoint: GET /api/state
  if (req.url.startsWith('/api/state') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(currentState || {}));
    return;
  }

  // API Endpoint: GET /api/config
  if (req.url.startsWith('/api/config') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getOfficeConfig()));
    return;
  }

  // Static File Serving dengan Path Traversal Defense
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index-openspace.html';

  const normalizedPath = path.normalize(decodeURIComponent(reqPath));
  const safePath = path.resolve(__dirname, '.' + normalizedPath);

  // Pastikan file yang diakses tidak melompat keluar dari direktori root (Anti Path-Traversal)
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden: Invalid Path');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(safePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(safePath).pipe(res);
  });
});

// 2. Attach WebSocket Server dengan Security Handshake & Limits
const wss = new WebSocketServer({ 
  server,
  maxPayload: MAX_PAYLOAD_BYTES,
  verifyClient: (info, callback) => {
    // A. Verifikasi Origin
    if (!isValidOrigin(info.origin)) {
      console.warn(`[WebSocket Security] ⚠️ Koneksi ditolak: Origin tidak sah (${info.origin})`);
      return callback(false, 403, 'Forbidden Origin');
    }

    // B. Verifikasi Auth Key (jika MSAM_OFFICE_KEY diset)
    if (AUTH_KEY && !isAuthorized(info.req)) {
      console.warn(`[WebSocket Security] ⚠️ Koneksi ditolak: Token auth salah dari ${info.req.socket.remoteAddress}`);
      return callback(false, 401, 'Unauthorized: Invalid Office Token');
    }

    callback(true);
  }
});

function broadcastState(data) {
  if (!data) return;
  currentState = {
    ...currentState,
    ...data,
    updatedAt: data.updatedAt || new Date().toISOString()
  };

  // Write back to state.json as persistent cache
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(currentState, null, 2), 'utf8');
  } catch (e) {}

  const jsonStr = JSON.stringify(currentState);
  let activeClients = 0;

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
      activeClients++;
    }
  });

  console.log(`[WebSocket] ⚡ Broadcast event: stage=${currentState.stage || 'N/A'} -> ${activeClients} client(s)`);
}

wss.on('connection', (ws, req) => {
  console.log(`[WebSocket] 🟢 Client connected from ${req.socket.remoteAddress}`);

  // Send current state immediately on connect
  if (currentState) {
    ws.send(JSON.stringify(currentState));
  }

  // Handle incoming messages from browser clients
  ws.on('message', message => {
    try {
      const data = JSON.parse(message.toString());
      broadcastState(data);
    } catch (e) {}
  });

  ws.on('close', () => {
    console.log('[WebSocket] 🔴 Client disconnected');
  });
});

// 3. File Watcher for state.json (Fallback if agy edits file directly)
let isWritingInternally = false;
fs.watch(stateFilePath, (eventType) => {
  if (eventType === 'change') {
    setTimeout(() => {
      try {
        const fileContent = fs.readFileSync(stateFilePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (JSON.stringify(parsed) !== JSON.stringify(currentState)) {
          currentState = parsed;
          const jsonStr = JSON.stringify(currentState);
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(jsonStr);
            }
          });
          console.log('[FileWatcher] 📁 state.json changed externally -> broadcast to WebSocket clients');
        }
      } catch (e) {}
    }, 50);
  }
});

// Start Server
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 All-in-One Office Server berjalan!`);
  console.log(`🌐 HTTP Web:      http://localhost:${PORT}`);
  console.log(`⚡ WebSocket:     ws://localhost:${PORT}`);
  console.log(`📄 Open-Space:    http://localhost:${PORT}/index-openspace.html`);
  console.log(`📄 Cyber-Dark:    http://localhost:${PORT}/index.html`);
  console.log('====================================================');
});

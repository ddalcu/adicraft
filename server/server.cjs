const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const number = require('lib0/number');
const Y = require('yjs');
const { setupWSConnection, docs } = require('y-websocket/bin/utils');

const host = process.env.HOST || 'localhost';
const port = number.parseInt(process.env.PORT || '1234');
const dbDir = process.env.YPERSISTENCE || './dbDir';

// ========================
// Branch Metadata Store
// ========================

const BRANCHES_FILE = path.join(dbDir, 'branches.json');
const MAIN_BRANCH = 'adicraft-main';
const STALE_DAYS = 30;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function loadBranches() {
  try {
    if (fs.existsSync(BRANCHES_FILE)) {
      return JSON.parse(fs.readFileSync(BRANCHES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load branches.json:', e.message);
  }
  return {};
}

function saveBranches() {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(BRANCHES_FILE, JSON.stringify(branches, null, 2));
  } catch (e) {
    console.error('Failed to save branches.json:', e.message);
  }
}

let branches = loadBranches();

// Ensure main branch always exists
if (!branches[MAIN_BRANCH]) {
  branches[MAIN_BRANCH] = {
    parent: null,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };
  saveBranches();
}

function touchBranch(name) {
  if (branches[name]) {
    branches[name].lastActivity = new Date().toISOString();
    saveBranches();
  }
}

function getPlayerCount(roomName) {
  const doc = docs.get(roomName);
  if (!doc) return 0;
  let count = 0;
  doc.awareness.getStates().forEach((state) => {
    if (state && state.name) count++;
  });
  return count;
}

// ========================
// Room Stats + Branch Info
// ========================

function getRoomStats() {
  const rooms = [];
  for (const [name, doc] of docs) {
    const awareness = doc.awareness.getStates();
    const players = [];
    for (const [clientId, state] of awareness) {
      if (state && state.name) {
        players.push({
          name: state.name,
          dimension: state.dimension || 'overworld',
          x: Math.round(state.x || 0),
          y: Math.round(state.y || 0),
          z: Math.round(state.z || 0),
        });
      }
    }

    const blockCounts = {};
    for (const dim of ['overworld', 'end', 'outer_end']) {
      const map = doc.getMap(`blocks_${dim}`);
      blockCounts[dim] = map.size;
    }

    const chat = doc.getArray('chat');
    const mobEvents = doc.getArray('mob_events');
    const ops = doc.getMap('ops');
    const opsList = [];
    ops.forEach((val, key) => opsList.push(val));

    rooms.push({
      name,
      connections: doc.conns.size,
      players,
      blockCounts,
      chatMessages: chat.length,
      mobEvents: mobEvents.length,
      ops: opsList,
    });
  }
  return rooms;
}

function getBranchList() {
  const list = [];
  for (const [name, meta] of Object.entries(branches)) {
    list.push({
      name,
      parent: meta.parent,
      createdAt: meta.createdAt,
      lastActivity: meta.lastActivity,
      playerCount: getPlayerCount(name),
    });
  }
  // Sort by player count descending, then by name
  list.sort((a, b) => b.playerCount - a.playerCount || a.name.localeCompare(b.name));
  return list;
}

// ========================
// WebSocket Servers
// ========================

const yjsWss = new WebSocket.Server({ noServer: true });
const statusWss = new WebSocket.Server({ noServer: true });

function broadcastStatus() {
  const data = JSON.stringify({
    rooms: getRoomStats(),
    branches: getBranchList(),
  });
  for (const client of statusWss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// Hook into doc changes to push live updates
function watchDoc(doc, docName) {
  if (doc._statusWatched) return;
  doc._statusWatched = true;
  doc.on('update', () => {
    touchBranch(docName);
    broadcastStatus();
  });
  doc.awareness.on('update', () => {
    touchBranch(docName);
    broadcastStatus();
  });
}

// Watch existing docs and poll for new ones
setInterval(() => {
  for (const [name, doc] of docs) watchDoc(doc, name);
}, 500);

statusWss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    rooms: getRoomStats(),
    branches: getBranchList(),
  }));
});

// ========================
// Auto-cleanup stale branches
// ========================

function cleanupStaleBranches() {
  const now = Date.now();
  const staleMs = STALE_DAYS * 24 * 60 * 60 * 1000;
  let changed = false;

  for (const [name, meta] of Object.entries(branches)) {
    if (name === MAIN_BRANCH) continue;
    const age = now - new Date(meta.lastActivity).getTime();
    if (age > staleMs && getPlayerCount(name) === 0) {
      console.log(`Cleaning up stale branch: ${name} (inactive ${Math.round(age / 86400000)}d)`);
      deleteBranchData(name);
      delete branches[name];
      changed = true;
    }
  }

  if (changed) {
    saveBranches();
    broadcastStatus();
  }
}

function deleteBranchData(name) {
  // Destroy in-memory doc if loaded
  const doc = docs.get(name);
  if (doc) {
    doc.destroy();
    docs.delete(name);
  }
  // Remove LevelDB persistence directory
  const levelDir = path.join(dbDir, name);
  try {
    if (fs.existsSync(levelDir)) {
      fs.rmSync(levelDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error(`Failed to delete data for branch ${name}:`, e.message);
  }
}

setInterval(cleanupStaleBranches, CLEANUP_INTERVAL_MS);

// ========================
// Status Page HTML
// ========================

const STATUS_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdiCraft Server Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: monospace; background: #1a1a2e; color: #e0e0e0; padding: 24px; }
    h1 { color: #4ecca3; margin-bottom: 8px; font-size: 24px; }
    h2 { color: #4ecca3; margin: 24px 0 12px; font-size: 18px; }
    .subtitle { color: #888; margin-bottom: 24px; font-size: 14px; }
    .no-rooms { color: #888; padding: 32px; text-align: center; }
    .room { background: #16213e; border: 1px solid #0f3460; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .room-name { color: #4ecca3; font-size: 18px; font-weight: bold; }
    .conn-badge { background: #0f3460; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; margin-bottom: 12px; }
    .stat { background: #1a1a2e; padding: 8px 12px; border-radius: 4px; }
    .stat-label { color: #888; font-size: 11px; text-transform: uppercase; }
    .stat-value { color: #fff; font-size: 16px; margin-top: 2px; }
    .players { margin-top: 8px; }
    .players-title { color: #888; font-size: 12px; margin-bottom: 6px; }
    .player { display: inline-block; background: #0f3460; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px; }
    .player-name { color: #4ecca3; }
    .player-pos { color: #888; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
    .status-dot.connected { background: #4ecca3; }
    .status-dot.disconnected { background: #e74c3c; }
    .conn-status { color: #555; font-size: 11px; margin-top: 16px; text-align: center; }
    .branch-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .branch-table th { text-align: left; color: #888; font-size: 11px; text-transform: uppercase; padding: 8px; border-bottom: 1px solid #0f3460; }
    .branch-table td { padding: 8px; border-bottom: 1px solid rgba(15, 52, 96, 0.5); font-size: 13px; }
    .branch-table tr:hover { background: rgba(78, 204, 163, 0.05); }
    .branch-main { color: #4ecca3; font-weight: bold; }
    .branch-count { color: #fff; background: #0f3460; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
    .branch-age { color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <h1>AdiCraft Server</h1>
  <p class="subtitle">y-websocket relay &mdash; world status</p>

  <h2>Branches</h2>
  <div id="branches"></div>

  <h2>Active Rooms</h2>
  <div id="rooms"></div>

  <p class="conn-status"><span class="status-dot disconnected" id="dot"></span><span id="status">Connecting...</span></p>
  <script>
    function timeAgo(iso) {
      var ms = Date.now() - new Date(iso).getTime();
      var s = Math.floor(ms / 1000);
      if (s < 60) return s + 's ago';
      var m = Math.floor(s / 60);
      if (m < 60) return m + 'm ago';
      var h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      var d = Math.floor(h / 24);
      return d + 'd ago';
    }

    function renderBranches(branchList) {
      var el = document.getElementById('branches');
      if (!branchList || !branchList.length) {
        el.innerHTML = '<div class="no-rooms">No branches.</div>';
        return;
      }
      var rows = branchList.map(function(b) {
        var nameClass = b.name === 'adicraft-main' ? ' class="branch-main"' : '';
        var parent = b.parent || '—';
        return '<tr><td' + nameClass + '>' + b.name + '</td>' +
          '<td><span class="branch-count">' + b.playerCount + '</span></td>' +
          '<td>' + parent + '</td>' +
          '<td class="branch-age">' + timeAgo(b.lastActivity) + '</td>' +
          '<td class="branch-age">' + timeAgo(b.createdAt) + '</td></tr>';
      }).join('');
      el.innerHTML = '<table class="branch-table"><thead><tr><th>Name</th><th>Players</th><th>Parent</th><th>Last Active</th><th>Created</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    function renderRooms(rooms) {
      var el = document.getElementById('rooms');
      if (!rooms.length) {
        el.innerHTML = '<div class="no-rooms">No active rooms.</div>';
        return;
      }
      el.innerHTML = rooms.map(function(r) {
        var dims = Object.entries(r.blockCounts)
          .map(function(e) { return '<div class="stat"><div class="stat-label">' + e[0].replace('_', ' ') + ' blocks</div><div class="stat-value">' + e[1].toLocaleString() + '</div></div>'; })
          .join('');
        var players = r.players.length
          ? '<div class="players"><div class="players-title">Online Players</div>' +
            r.players.map(function(p) { return '<span class="player"><span class="player-name">' + p.name + '</span> <span class="player-pos">' + p.dimension + ' (' + p.x + ', ' + p.y + ', ' + p.z + ')</span></span>'; }).join('') +
            '</div>'
          : '';
        return '<div class="room">' +
          '<div class="room-header"><span class="room-name">' + r.name + '</span><span class="conn-badge">' + r.connections + ' conn</span></div>' +
          '<div class="stats">' + dims +
          '<div class="stat"><div class="stat-label">Chat Messages</div><div class="stat-value">' + r.chatMessages + '</div></div>' +
          '<div class="stat"><div class="stat-label">Mob Events</div><div class="stat-value">' + r.mobEvents + '</div></div>' +
          '<div class="stat"><div class="stat-label">Ops</div><div class="stat-value">' + (r.ops.length ? r.ops.join(', ') : 'none') + '</div></div>' +
          '</div>' + players + '</div>';
      }).join('');
    }

    function render(data) {
      renderBranches(data.branches);
      renderRooms(data.rooms);
    }

    function connect() {
      var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      var ws = new WebSocket(proto + '//' + location.host + '/__status');
      var dot = document.getElementById('dot');
      var status = document.getElementById('status');

      ws.onopen = function() {
        dot.className = 'status-dot connected';
        status.textContent = 'Live';
      };
      ws.onmessage = function(e) { render(JSON.parse(e.data)); };
      ws.onclose = function() {
        dot.className = 'status-dot disconnected';
        status.textContent = 'Reconnecting...';
        setTimeout(connect, 2000);
      };
    }
    connect();
  </script>
</body>
</html>`;

// ========================
// HTTP Server + API
// ========================

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers for API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/branches
  if (req.method === 'GET' && url.pathname === '/api/branches') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getBranchList()));
    return;
  }

  // POST /api/branches — create a new branch (fork from parent)
  if (req.method === 'POST' && url.pathname === '/api/branches') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { name, parent } = JSON.parse(body);

        if (!name || typeof name !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name is required' }));
          return;
        }

        // Sanitize: only allow lowercase alphanumeric + hyphens
        const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (!safeName || safeName.length < 1 || safeName.length > 32) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid name (1-32 chars, a-z 0-9 hyphens)' }));
          return;
        }

        const branchName = `adicraft-${safeName}`;

        if (branches[branchName]) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Branch already exists' }));
          return;
        }

        const parentName = parent || MAIN_BRANCH;
        if (!branches[parentName]) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Parent branch not found' }));
          return;
        }

        // Fork: copy parent Yjs doc state into new doc
        const parentDoc = docs.get(parentName);
        if (parentDoc) {
          const stateUpdate = Y.encodeStateAsUpdate(parentDoc);
          // Get or create the child doc by connecting to it briefly
          // The y-websocket utils will create it on first connection,
          // but we can pre-seed it by creating a temp doc and applying state
          const childDoc = docs.get(branchName);
          if (childDoc) {
            Y.applyUpdate(childDoc, stateUpdate);
          } else {
            // Doc doesn't exist yet in memory — we'll create a temporary doc,
            // apply the state, and let the persistence layer save it.
            // When a client connects, y-websocket will load from persistence.
            const tempDoc = new Y.Doc();
            Y.applyUpdate(tempDoc, stateUpdate);
            // Save via LevelDB persistence by triggering a doc creation
            // through the y-websocket utils — connect the update to the docs map
            // We need a simpler approach: just register the branch metadata
            // and let the first connecting client get the fork state via a special flow
            tempDoc.destroy();
          }
        }

        // Register branch metadata
        branches[branchName] = {
          parent: parentName,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          // Store fork state so first connecting client can receive it
          ...(parentDoc ? { _forkFrom: parentName } : {}),
        };
        saveBranches();
        broadcastStatus();

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          name: branchName,
          parent: parentName,
          createdAt: branches[branchName].createdAt,
        }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
    return;
  }

  // DELETE /api/branches/:name
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/branches/')) {
    const branchName = decodeURIComponent(url.pathname.slice('/api/branches/'.length));

    if (branchName === MAIN_BRANCH) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cannot delete main branch' }));
      return;
    }

    if (!branches[branchName]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Branch not found' }));
      return;
    }

    if (getPlayerCount(branchName) > 0) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Cannot delete branch with active players' }));
      return;
    }

    deleteBranchData(branchName);
    delete branches[branchName];
    saveBranches();
    broadcastStatus();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ deleted: branchName }));
    return;
  }

  // GET /api/rooms (legacy)
  if (req.method === 'GET' && url.pathname === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getRoomStats()));
    return;
  }

  // Status page
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(STATUS_PAGE);
});

// ========================
// WebSocket Upgrade
// ========================

yjsWss.on('connection', (ws, req) => {
  setupWSConnection(ws, req);

  // After connection, check if we need to fork state into the new doc
  const roomName = new URL(req.url, 'http://localhost').pathname.slice(1);
  const meta = branches[roomName];
  if (meta && meta._forkFrom) {
    const parentDoc = docs.get(meta._forkFrom);
    const childDoc = docs.get(roomName);
    if (parentDoc && childDoc && childDoc.getMap('blocks_overworld').size === 0) {
      // First connection to a forked branch — apply parent state
      const stateUpdate = Y.encodeStateAsUpdate(parentDoc);
      Y.applyUpdate(childDoc, stateUpdate);
    }
    // Remove fork marker after first use
    delete meta._forkFrom;
    saveBranches();
  }

  // Ensure the branch is registered (for rooms created by direct connection)
  if (!branches[roomName] && roomName.startsWith('adicraft-')) {
    branches[roomName] = {
      parent: null,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };
    saveBranches();
    broadcastStatus();
  }

  touchBranch(roomName);
});

server.on('upgrade', (request, socket, head) => {
  const url = request.url || '';
  if (url === '/__status') {
    statusWss.handleUpgrade(request, socket, head, (ws) => {
      statusWss.emit('connection', ws, request);
    });
  } else {
    yjsWss.handleUpgrade(request, socket, head, (ws) => {
      yjsWss.emit('connection', ws, request);
    });
  }
});

server.listen(port, host, () => {
  console.log(`AdiCraft server running at '${host}' on port ${port}`);
  console.log(`Branches: ${Object.keys(branches).length} (${Object.keys(branches).join(', ')})`);
});

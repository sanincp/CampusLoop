/**
 * CampusLoop - Lightweight Shared Local Server
 * Zero dependencies! Uses Node.js built-in 'http', 'fs', and 'path' modules.
 * Enables live data sharing between Normal browser, Incognito window, Edge, and mobile.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'campus_db.json');

// Ensure database file exists
function loadDb() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = { users: [], products: [], requests: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading DB, creating fresh state:', err);
    return { users: [], products: [], requests: [] };
  }
}

function saveDb(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      // Cap at 20MB for uploaded Base64 images
      if (body.length > 20 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // --- API ROUTES (Shared across all browser sessions) ---
  if (pathname === '/api/db' && req.method === 'GET') {
    const db = loadDb();
    return sendJson(res, 200, db);
  }

  if (pathname === '/api/products' && req.method === 'GET') {
    const db = loadDb();
    return sendJson(res, 200, db.products || []);
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    const db = loadDb();
    const body = await readBody(req);
    db.products = db.products || [];
    db.products.unshift(body);
    saveDb(db);
    return sendJson(res, 201, body);
  }

  if (pathname.startsWith('/api/products/') && req.method === 'PUT') {
    const id = pathname.replace('/api/products/', '');
    const db = loadDb();
    const body = await readBody(req);
    const idx = (db.products || []).findIndex(p => p.id === id);
    if (idx >= 0) {
      db.products[idx] = { ...db.products[idx], ...body };
      saveDb(db);
      return sendJson(res, 200, db.products[idx]);
    }
    return sendJson(res, 404, { error: 'Product not found' });
  }

  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/products/', '');
    const db = loadDb();
    db.products = (db.products || []).filter(p => p.id !== id);
    saveDb(db);
    return sendJson(res, 200, { success: true });
  }

  if (pathname === '/api/users' && req.method === 'POST') {
    const db = loadDb();
    const body = await readBody(req);
    db.users = db.users || [];
    const existingIndex = db.users.findIndex(u => u.email.toLowerCase() === body.email?.toLowerCase());
    if (existingIndex >= 0) {
      db.users[existingIndex] = { ...db.users[existingIndex], ...body };
    } else {
      db.users.push(body);
    }
    saveDb(db);
    return sendJson(res, 200, body);
  }

  if (pathname === '/api/requests' && req.method === 'POST') {
    const db = loadDb();
    const body = await readBody(req);
    db.requests = db.requests || [];
    db.requests.unshift(body);
    saveDb(db);
    return sendJson(res, 201, body);
  }

  if (pathname.startsWith('/api/requests/') && req.method === 'PUT') {
    const id = pathname.replace('/api/requests/', '');
    const db = loadDb();
    const body = await readBody(req);
    const reqItem = (db.requests || []).find(r => r.id === id);
    if (reqItem) {
      reqItem.status = body.status;
      saveDb(db);
      return sendJson(res, 200, reqItem);
    }
    return sendJson(res, 404, { error: 'Request not found' });
  }

  // --- STATIC FILE SERVING ---
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = 'index.html';

  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` CampusLoop Shared Server Running!`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` Open http://localhost:${PORT} in both Normal and Incognito!`);
  console.log(` Both windows will now see the exact same shared data!`);
  console.log(`=======================================================`);
});


import type { StarterTemplate, WorkspaceFile } from '../types';

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'node-http-fullstack',
    name: 'Node.js Fullstack (Zero-Install)',
    description: 'Instant startup using native Node.js HTTP server. No npm install needed to preview!',
    badge: 'Instant',
    defaultRunCommand: 'node server.js',
    recommendedPort: 3000,
    files: {
      'package.json': JSON.stringify(
        {
          name: 'in-browser-app',
          version: '1.0.0',
          type: 'module',
          scripts: {
            start: 'node server.js',
            dev: 'node server.js',
          },
          dependencies: {},
        },
        null,
        2
      ),
      'server.js': `import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 3000;

// Simple in-memory data store for live API demonstration
const todos = [
  { id: 1, text: 'Run entirely inside browser with WebContainer', done: true },
  { id: 2, text: 'Edit code in Monaco Editor with live autosave', done: true },
  { id: 3, text: 'Interact with terminal via Xterm.js', done: false },
  { id: 4, text: 'Persist code changes in IndexedDB', done: true },
];

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, \`http://localhost:\${PORT}\`);

  // API Endpoints
  if (url.pathname === '/api/todos') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ todos, timestamp: new Date().toISOString() }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          if (data.text) {
            const newTodo = { id: Date.now(), text: data.text, done: false };
            todos.push(newTodo);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(newTodo));
            return;
          }
        } catch (e) {
          // ignore
        }
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      });
      return;
    }
  }

  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }));
    return;
  }

  // Static File Serving from public/
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  const safePath = path.join(process.cwd(), 'public', filePath);

  fs.readFile(safePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + filePath);
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(\`\\x1b[32m[SERVER READY]\\x1b[0m Node server listening on http://localhost:\${PORT}\`);
  console.log(\`\\x1b[36mTry editing public/index.html or server.js to see live updates!\\x1b[0m\`);
});
`,
      'public/index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>In-Browser WebContainer Preview</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <div class="card">
    <div class="badge">Live WebContainer App</div>
    <h1>Browser Cloud IDE</h1>
    <p class="subtitle">Running real Node.js inside your browser WebContainer runtime!</p>

    <div class="stats-box" id="node-info">
      <span>Connecting to Node.js server...</span>
    </div>

    <div class="todo-section">
      <div class="section-header">
        <h3>Server Todos (Live API)</h3>
        <button id="refresh-btn" class="btn secondary">Refresh</button>
      </div>

      <div class="add-box">
        <input id="todo-input" type="text" placeholder="Add a new server-side task..." />
        <button id="add-btn" class="btn primary">Add</button>
      </div>

      <ul id="todo-list"></ul>
    </div>

    <div class="footer">
      <span>Powered by Monaco + WebContainer + Xterm + IndexedDB</span>
    </div>
  </div>

  <script src="/app.js"></script>
</body>
</html>
`,
      'public/style.css': `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif;
  background: #0f172a;
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 28px;
  max-width: 520px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.badge {
  display: inline-block;
  background: #0284c7;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 9999px;
  margin-bottom: 12px;
}

h1 {
  font-size: 24px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 6px;
}

.subtitle {
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.stats-box {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  color: #38bdf8;
  margin-bottom: 20px;
}

.todo-section {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #e2e8f0;
}

.add-box {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

input {
  flex: 1;
  background: #1e293b;
  border: 1px solid #475569;
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

input:focus {
  border-color: #38bdf8;
}

.btn {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn.primary {
  background: #0284c7;
  color: white;
}

.btn.primary:hover {
  background: #0369a1;
}

.btn.secondary {
  background: #334155;
  color: #e2e8f0;
}

.btn.secondary:hover {
  background: #475569;
}

#todo-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#todo-list li {
  background: #1e293b;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #334155;
}

#todo-list li.done span {
  text-decoration: line-through;
  color: #64748b;
}

.footer {
  text-align: center;
  font-size: 11px;
  color: #64748b;
}
`,
      'public/app.js': `async function fetchNodeStatus() {
  const infoEl = document.getElementById('node-info');
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    infoEl.innerHTML = \`Node \${data.nodeVersion} (\${data.platform}) • Uptime: \${Math.floor(data.uptime)}s • Memory: \${Math.round(data.memory.heapUsed / 1024 / 1024)}MB\`;
  } catch (err) {
    infoEl.innerHTML = 'Status: Waiting for server...';
  }
}

async function fetchTodos() {
  const listEl = document.getElementById('todo-list');
  try {
    const res = await fetch('/api/todos');
    const data = await res.json();
    listEl.innerHTML = '';
    data.todos.forEach(todo => {
      const li = document.createElement('li');
      if (todo.done) li.classList.add('done');
      li.innerHTML = \`
        <input type="checkbox" \${todo.done ? 'checked' : ''} disabled />
        <span>\${todo.text}</span>
      \`;
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error('Failed to load todos:', err);
  }
}

async function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      input.value = '';
      fetchTodos();
    }
  } catch (err) {
    alert('Error adding todo: ' + err.message);
  }
}

document.getElementById('add-btn').addEventListener('click', addTodo);
document.getElementById('todo-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTodo();
});
document.getElementById('refresh-btn').addEventListener('click', () => {
  fetchNodeStatus();
  fetchTodos();
});

// Initial load
fetchNodeStatus();
fetchTodos();
setInterval(fetchNodeStatus, 5000);
`,
      'README.md': `# In-Browser Node.js Workspace

Welcome to your production-grade Cloud IDE running on **WebContainer**!

### Key Features
- **No Backend**: Runs 100% inside your browser using WebAssembly.
- **Monaco Editor**: VS Code-powered syntax highlighting and editing.
- **Interactive Terminal**: Real bash-like \`jsh\` terminal with full Node and npm capability.
- **Live Preview**: Auto-detects server ports on port 3000 or 5173.
- **Persistence**: All files saved into your browser's IndexedDB.

### Quick Commands (in Terminal)
- Start the server: \`node server.js\`
- Inspect files: \`ls -la\`
- Check Node version: \`node -v\`
`,
    },
  },
  {
    id: 'express-api',
    name: 'Express.js Server',
    description: 'Express server with JSON routes and middleware. Requires "npm install" on first run.',
    badge: 'Express',
    defaultRunCommand: 'npm install && npm run dev',
    recommendedPort: 3000,
    files: {
      'package.json': JSON.stringify(
        {
          name: 'express-starter',
          version: '1.0.0',
          type: 'module',
          scripts: {
            start: 'node server.js',
            dev: 'node server.js',
          },
          dependencies: {
            express: '^4.19.2',
          },
        },
        null,
        2
      ),
      'server.js': `import express from 'express';
const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Express on WebContainer</title>
        <style>
          body { font-family: sans-serif; background: #121212; color: #fff; display: grid; place-items: center; height: 100vh; margin: 0; }
          .card { background: #1f1f1f; padding: 2rem; border-radius: 12px; border: 1px solid #333; }
          code { background: #2a2a2a; padding: 2px 6px; border-radius: 4px; color: #4ade80; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🚀 Express Server is Live!</h2>
          <p>Running on port <code>\${PORT}</code> via WebContainer inside your browser.</p>
          <p>Try testing GET <code>/api/hello</code> in your browser console.</p>
        </div>
      </body>
    </html>
  \`);
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express running in WebContainer!', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(\`Express server ready on http://localhost:\${PORT}\`);
});
`,
      'README.md': `# Express Server Starter

Run:
\`\`\`bash
npm install
npm run dev
\`\`\`
`,
    },
  },
];

export function templateToWorkspaceFiles(template: StarterTemplate): WorkspaceFile[] {
  const result: WorkspaceFile[] = [];
  const dirs = new Set<string>();

  for (const [filePath, content] of Object.entries(template.files)) {
    const parts = filePath.split('/');
    if (parts.length > 1) {
      let cur = '';
      for (let i = 0; i < parts.length - 1; i++) {
        const parent = cur;
        cur = cur ? `${cur}/${parts[i]}` : parts[i];
        if (!dirs.has(cur)) {
          dirs.add(cur);
          result.push({
            path: cur,
            name: parts[i],
            content: '',
            isDirectory: true,
            parentPath: parent,
            updatedAt: Date.now(),
          });
        }
      }
    }

    const name = parts[parts.length - 1];
    const parentPath = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
    result.push({
      path: filePath,
      name,
      content,
      isDirectory: false,
      parentPath,
      updatedAt: Date.now(),
    });
  }

  return result;
}

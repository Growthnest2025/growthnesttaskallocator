/**
 * GrowthNest Tech Solutions - Local Development Server
 * Ultra-lightweight: Uses Node.js native http and node:sqlite with ZERO external dependencies!
 * Serves the same API contracts as the Cloudflare Worker.
 */

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let DatabaseSync = null;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  console.warn('node:sqlite not natively available in this Node runtime:', e.message);
}

const PORT = process.env.PORT || 5000;
const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const DB_FILE = isVercel ? path.join('/tmp', 'growthnest.db') : path.join(__dirname, 'growthnest.db');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'uploads');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
}

// In-memory fallback if node:sqlite is not supported on this platform
function createMemoryDbFallback() {
  console.log('⚡ Initializing GrowthNest in-memory fallback store...');
  const users = [
    { id: 1, username: 'admin', password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', role: 'admin', full_name: 'Lead Trainer / Admin', email: 'admin@growthnesttech.com', phone: '+91 9876543210', joining_date: '2026-01-01', course_track: 'Frontend Web Development (HTML/CSS/JS)' },
    { id: 2, username: 'karthik', password_hash: '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', role: 'student', full_name: 'Karthik Raja', email: 'karthik@growthnest.com', phone: '+91 9876500001', joining_date: '2026-10-12', course_track: 'Frontend Web Development (HTML/CSS/JS)' },
    { id: 3, username: 'ananya', password_hash: '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', role: 'student', full_name: 'Ananya S', email: 'ananya@growthnest.com', phone: '+91 9876500002', joining_date: '2026-10-24', course_track: 'Frontend Web Development (HTML/CSS/JS)' },
    { id: 4, username: 'Berlin2005', password_hash: 'dad114b6ed7342bac65c79575f6c7ff761ec26b52c1f5f7a9110532973d05df2', role: 'student', full_name: 'Berlin', email: 'berlin@gmail.com', phone: '6385208839', joining_date: '2026-10-27', course_track: 'Frontend Web Development (HTML/CSS/JS)' },
    { id: 5, username: 'Berlin@2005', password_hash: 'dad114b6ed7342bac65c79575f6c7ff761ec26b52c1f5f7a9110532973d05df2', role: 'student', full_name: 'Berlin', email: 'berlin@growthnest.com', phone: '6385208839', joining_date: '2026-10-27', course_track: 'Frontend Web Development (HTML/CSS/JS)' }
  ];

  const tasks = [];
  if (fs.existsSync(SCHEMA_FILE)) {
    const rawSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const regex = /\((\d+),\s*(\d+),\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*\n?\s*'([^']+)',\s*\n?\s*'([^']+)',\s*\n?\s*'([^']+)'\)/g;
    let match;
    while ((match = regex.exec(rawSql)) !== null) {
      tasks.push({
        id: Number(match[1]),
        sequence_order: Number(match[2]),
        module: match[3],
        title: match[4],
        difficulty: match[5],
        estimated_days: Number(match[6]),
        description: match[7],
        instructions: match[8],
        requirements_json: match[9]
      });
    }
  }

  const student_progress = [
    { id: 1, student_id: 2, current_task_id: 1, status: 'APPROVED', unlocked_at: '2026-10-12', completed_at: '2026-10-13' },
    { id: 2, student_id: 2, current_task_id: 2, status: 'IN_PROGRESS', unlocked_at: '2026-10-13', completed_at: null },
    { id: 3, student_id: 3, current_task_id: 1, status: 'IN_PROGRESS', unlocked_at: '2026-10-24', completed_at: null },
    { id: 4, student_id: 4, current_task_id: 1, status: 'IN_PROGRESS', unlocked_at: '2026-10-27', completed_at: null },
    { id: 5, student_id: 5, current_task_id: 1, status: 'IN_PROGRESS', unlocked_at: '2026-10-27', completed_at: null }
  ];

  const submissions = [];

  return {
    exec(sql) {},
    prepare(sql) {
      const s = sql.trim().replace(/\s+/g, ' ');
      return {
        get(...params) {
          if (s.includes('FROM users WHERE') && s.includes('username')) {
            const targetU = (params[0] || '').toLowerCase().trim();
            if (s.includes('password_hash')) {
              const h = params[1];
              const p = params[2];
              return users.find(x => x.username.toLowerCase().trim() === targetU && (x.password_hash === h || x.password_hash === p));
            }
            return users.find(x => x.username.toLowerCase().trim() === targetU);
          }
          if (s.includes('FROM users WHERE id = ?')) {
            return users.find(x => x.id === Number(params[0]));
          }
          if (s.includes('COUNT(*) as count FROM users WHERE role =')) {
            return { count: users.filter(x => x.role === 'student').length };
          }
          if (s.includes('COUNT(*) as count FROM submissions WHERE status = \'PENDING\'')) {
            return { count: submissions.filter(x => x.status === 'PENDING').length };
          }
          if (s.includes('COUNT(*) as count FROM submissions WHERE status = \'APPROVED\'')) {
            return { count: submissions.filter(x => x.status === 'APPROVED').length };
          }
          if (s.includes('COUNT(*) as count FROM submissions WHERE status = \'CHANGES_REQUESTED\'')) {
            return { count: submissions.filter(x => x.status === 'CHANGES_REQUESTED').length };
          }
          if (s.includes('COUNT(*) as count FROM student_progress WHERE student_id = ? AND status = \'APPROVED\'')) {
            return { count: student_progress.filter(x => x.student_id === Number(params[0]) && x.status === 'APPROVED').length };
          }
          if (s.includes('COUNT(*) as count FROM submissions WHERE student_id = ? AND status = \'PENDING\'')) {
            return { count: submissions.filter(x => x.student_id === Number(params[0]) && x.status === 'PENDING').length };
          }
          if (s.includes('FROM submissions WHERE id = ?')) {
            return submissions.find(x => x.id === Number(params[0]));
          }
          if (s.includes('FROM tasks WHERE id = ?')) {
            return tasks.find(x => x.id === Number(params[0]));
          }
          return undefined;
        },
        all(...params) {
          if (s.includes('FROM tasks ORDER BY sequence_order ASC')) {
            return [...tasks].sort((a,b) => a.sequence_order - b.sequence_order);
          }
          if (s.includes('FROM student_progress WHERE student_id = ?')) {
            return student_progress.filter(x => x.student_id === Number(params[0]));
          }
          if (s.includes('FROM submissions WHERE student_id = ? ORDER BY id DESC')) {
            return submissions.filter(x => x.student_id === Number(params[0])).sort((a,b) => b.id - a.id);
          }
          if (s.includes('FROM submissions s JOIN tasks t') && s.includes('s.student_id = ?')) {
            return submissions.filter(x => x.student_id === Number(params[0])).map(sub => {
              const task = tasks.find(t => t.id === sub.task_id) || {};
              return {
                ...sub,
                sequence_order: task.sequence_order,
                task_title: task.title,
                module: task.module,
                task_module: task.module,
                task_desc: task.description,
                task_inst: task.instructions,
                requirements_json: task.requirements_json
              };
            }).sort((a,b) => b.id - a.id);
          }
          if (s.includes("role = 'student'") || s.includes('role = "student"')) {
            return users.filter(x => x.role === 'student').map(u => ({ ...u }));
          }
          if (s.includes('FROM submissions s JOIN tasks t') && s.includes('s.status = \'PENDING\'')) {
            return submissions.filter(x => x.status === 'PENDING').map(sub => {
              const task = tasks.find(t => t.id === sub.task_id) || {};
              const user = users.find(u => u.id === sub.student_id) || {};
              return { ...sub, task_title: task.title, sequence_order: task.sequence_order, module: task.module, student_name: user.full_name };
            });
          }
          return [];
        },
        run(...params) {
          if (s.includes('INSERT INTO users')) {
            let username, password_hash, role, full_name, email, phone, joining_date, course_track;
            if (params.length === 7) {
              [username, password_hash, full_name, email, phone, joining_date, course_track] = params;
              role = 'student';
            } else {
              [username, password_hash, role, full_name, email, phone, joining_date, course_track] = params;
            }
            const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
            users.push({ id: newId, username, password_hash, role: role || 'student', full_name, email, phone, joining_date, course_track });
            return { lastInsertRowid: newId, changes: 1 };
          }
          if (s.includes('INSERT INTO student_progress')) {
            const [student_id, current_task_id, status] = params;
            const existing = student_progress.find(x => x.student_id === Number(student_id) && x.current_task_id === Number(current_task_id));
            if (existing) {
              existing.status = status;
              return { lastInsertRowid: existing.id, changes: 1 };
            }
            const newId = student_progress.length > 0 ? Math.max(...student_progress.map(p => p.id)) + 1 : 1;
            student_progress.push({ id: newId, student_id: Number(student_id), current_task_id: Number(current_task_id), status: status || 'IN_PROGRESS' });
            return { lastInsertRowid: newId, changes: 1 };
          }
          if (s.includes('INSERT INTO submissions')) {
            const [student_id, task_id, code_html, code_css, code_js, sample_code_text, output_url, output_screenshot_key, student_notes] = params;
            const newId = submissions.length > 0 ? Math.max(...submissions.map(x => x.id)) + 1 : 1;
            submissions.push({
              id: newId,
              student_id: Number(student_id),
              task_id: Number(task_id),
              code_html, code_css, code_js, sample_code_text, output_url, output_screenshot_key, student_notes,
              status: 'PENDING',
              submitted_at: new Date().toISOString()
            });
            return { lastInsertRowid: newId, changes: 1 };
          }
          if (s.includes('UPDATE submissions SET status = ?')) {
            const [status, feedback, reviewed_by, subId] = params;
            const sub = submissions.find(x => x.id === Number(subId));
            if (sub) {
              sub.status = status;
              sub.admin_feedback = feedback;
              sub.reviewed_by = reviewed_by;
              sub.reviewed_at = new Date().toISOString();
            }
            return { changes: 1 };
          }
          if (s.includes('UPDATE student_progress SET status = ?')) {
            const [status, completed_at, student_id, task_id] = params.length === 4 ? params : [params[0], null, params[1], params[2]];
            const prog = student_progress.find(x => x.student_id === Number(student_id) && x.current_task_id === Number(task_id));
            if (prog) {
              prog.status = status;
              if (completed_at) prog.completed_at = completed_at;
            }
            return { changes: 1 };
          }
          if (s.includes('UPDATE users SET password_hash = ?')) {
            const [newHash, uid] = params;
            const u = users.find(x => x.id === Number(uid));
            if (u) u.password_hash = newHash;
            return { changes: 1 };
          }
          if (s.includes('UPDATE users SET avatar_url = ?')) {
            const [newAvatar, uid] = params;
            const u = users.find(x => x.id === Number(uid));
            if (u) u.avatar_url = newAvatar;
            return { changes: 1 };
          }
          return { lastInsertRowid: 1, changes: 1 };
        }
      };
    }
  };
}

let db = null;
if (DatabaseSync) {
  try {
    if (isVercel && !fs.existsSync(DB_FILE)) {
      const localDb = path.join(__dirname, 'growthnest.db');
      if (fs.existsSync(localDb)) {
        try { fs.copyFileSync(localDb, DB_FILE); } catch (e) {}
      }
    }

    db = new DatabaseSync(DB_FILE);
    if (fs.existsSync(SCHEMA_FILE)) {
      const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
      db.exec(schemaSql);
      console.log('✓ SQLite Database initialized from schema.sql');
    }
    try { db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;'); } catch (e) {}
  } catch (err) {
    console.warn('Could not initialize file SQLite DB, trying in-memory SQLite:', err.message);
    try {
      db = new DatabaseSync(':memory:');
      if (fs.existsSync(SCHEMA_FILE)) {
        db.exec(fs.readFileSync(SCHEMA_FILE, 'utf8'));
      }
      try { db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;'); } catch (e) {}
    } catch (e2) {
      db = createMemoryDbFallback();
    }
  }
} else {
  db = createMemoryDbFallback();
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function calculateDaysEnrolled(joiningDateStr) {
  if (!joiningDateStr) return 1;
  const join = new Date(joiningDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - join.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays + 1;
}

function getTodayIST() {
  const d = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(d.getTime() + istOffset).toISOString().slice(0, 10);
}

function getTimeIST() {
  const d = new Date();
  return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
}

function sendJson(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function formatUserResponse(user) {
  if (!user) return null;
  const totalFees = Number(user.total_fees || 0);
  const feesPaid = Number(user.fees_paid || 0);
  const pendingFees = Math.max(0, totalFees - feesPaid);
  let feesStatus = user.fees_status;
  if (!feesStatus) {
    if (totalFees === 0) feesStatus = 'PAID';
    else if (feesPaid >= totalFees) feesStatus = 'PAID';
    else if (feesPaid > 0) feesStatus = 'PARTIAL';
    else feesStatus = 'PENDING';
  }

  const userType = user.user_type || (user.role === 'admin' ? 'admin' : 'student');

  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email || '',
    phone: user.phone || '',
    role: user.role,
    user_type: userType,
    designation: user.designation || (userType === 'employee' ? 'Staff Member' : ''),
    department: user.department || (userType === 'employee' ? 'Technical Training' : ''),
    avatar_url: user.avatar_url || null,
    joining_date: user.joining_date,
    course_track: user.course_track || 'Frontend Web Development (HTML/CSS/JS)',
    days_enrolled: calculateDaysEnrolled(user.joining_date),
    // Fees Details (for Course Students & Interns)
    total_fees: totalFees,
    fees_paid: feesPaid,
    pending_fees: pendingFees,
    fees_status: feesStatus,
    fees_due_date: user.fees_due_date || '',
    payment_notes: user.payment_notes || '',
    // Salary Details (for Staff / Employees)
    salary_amount: Number(user.salary_amount || 0),
    salary_status: user.salary_status || 'PENDING',
    salary_date: user.salary_date || '',
    payment_mode: user.payment_mode || 'Bank Transfer',
    salary_notes: user.salary_notes || ''
  };
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) { // 20MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getRequestPathname(req) {
  // Support Vercel dynamic catch-all route api/[...path].js
  if (req.query && req.query.path) {
    const sub = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    return '/api/' + sub;
  }

  let raw = req.url || '/';
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-uri'];
  const matched = req.headers['x-matched-path'];

  if (forwarded && forwarded.startsWith('/api')) {
    raw = forwarded;
  } else if (matched && matched.startsWith('/api') && !matched.includes('[...path]') && !matched.endsWith('/index.js')) {
    raw = matched;
  }

  try {
    const parsed = new URL(raw, `http://${req.headers.host || 'localhost'}`);
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    return pathname;
  } catch {
    return (raw || '/').split('?')[0];
  }
}

const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || 'https://growthnest-task-portal.venkatgrowthnest.workers.dev';

function proxyRequestToCloudflare(req, res, targetPath, search) {
  const fullPath = targetPath + (search || '');
  const parsedTarget = new URL(CLOUDFLARE_WORKER_URL);

  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.host;
  delete forwardHeaders['content-length'];
  forwardHeaders['host'] = parsedTarget.hostname;
  forwardHeaders['x-forwarded-host'] = req.headers.host || '';

  let bodyBuffer = null;
  if (req.body) {
    if (typeof req.body === 'string') {
      bodyBuffer = Buffer.from(req.body);
    } else if (Buffer.isBuffer(req.body)) {
      bodyBuffer = req.body;
    } else {
      bodyBuffer = Buffer.from(JSON.stringify(req.body));
      if (!forwardHeaders['content-type']) {
        forwardHeaders['content-type'] = 'application/json';
      }
    }
    forwardHeaders['content-length'] = bodyBuffer.length;
  }

  const options = {
    hostname: parsedTarget.hostname,
    port: 443,
    path: fullPath,
    method: req.method,
    headers: forwardHeaders
  };

  const proxyReq = https.request(options, (proxyRes) => {
    const resHeaders = { ...proxyRes.headers };
    resHeaders['access-control-allow-origin'] = '*';
    resHeaders['access-control-allow-headers'] = 'Content-Type, Authorization';
    resHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';

    res.writeHead(proxyRes.statusCode, resHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy to Cloudflare Worker failed:', err);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Cloudflare Worker backend connection failed',
        details: err.message
      }));
    }
  });

  if (bodyBuffer) {
    proxyReq.write(bodyBuffer);
    proxyReq.end();
  } else {
    req.pipe(proxyReq, { end: true });
  }
}

const requestHandler = async (req, res) => {
  const pathname = getRequestPathname(req);
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // When deployed on Vercel (or explicitly configured with USE_CF_BACKEND), route /api/* to Cloudflare Worker + D1
  if ((isVercel || process.env.USE_CF_BACKEND === 'true') && pathname.startsWith('/api')) {
    return proxyRequestToCloudflare(req, res, pathname, parsedUrl.search);
  }

  try {
    // ------------------------------------------------------------------------
    // API: Health & Status
    // ------------------------------------------------------------------------
    if (pathname === '/api/health' || pathname === '/api' || pathname === '/api/' || pathname === '/api/index.js') {
      return sendJson(res, {
        status: 'ok',
        service: 'GrowthNest Tech Solutions Task Portal API',
        nodeVersion: process.version,
        isVercel,
        hasSqlite: Boolean(db),
        activeStudents: db ? (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get()?.count || 0) : 0,
        timestamp: new Date().toISOString()
      });
    }
    // ------------------------------------------------------------------------
    // API: Login
    // ------------------------------------------------------------------------
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const { username, password } = await parseJsonBody(req);
      const cleanUser = (username || '').trim();
      const cleanPass = (password || '').trim();

      if (!cleanUser || !cleanPass) {
        return sendJson(res, { error: 'Username and password are required' }, 400);
      }

      const hashed = sha256(cleanPass);

      // Find user by username (case-insensitive & trimmed)
      let user = null;
      try {
        const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(TRIM(username)) = LOWER(TRIM(?))`);
        user = stmt.get(cleanUser);
      } catch (e) {
        try {
          const stmt = db.prepare(`SELECT * FROM users WHERE username = ?`);
          user = stmt.get(cleanUser);
        } catch (e2) {}
      }

      if (!user) {
        return sendJson(res, { error: 'Invalid username or password' }, 401);
      }

      // Check password:
      // 1) Direct hash match or plaintext match
      // 2) Berlin user aliases: accept 'Berlin', 'Berlin2005', 'Berlin@2005', 'berlin', 'berlin2005', 'berlin@2005'
      const isDirectMatch = (user.password_hash === hashed || user.password_hash === cleanPass);
      const isBerlinAccount = (user.username.toLowerCase() === 'berlin2005' || user.username.toLowerCase() === 'berlin@2005');
      const isBerlinPasswordMatch = isBerlinAccount && [
        'berlin', 'berlin2005', 'berlin@2005',
        'Berlin', 'Berlin2005', 'Berlin@2005'
      ].includes(cleanPass);

      if (!isDirectMatch && !isBerlinPasswordMatch) {
        return sendJson(res, { error: 'Invalid username or password' }, 401);
      }

      // If user logged in using one of the Berlin variants, update hash to cleanPass so it is standardized
      if (isBerlinPasswordMatch && user.password_hash !== hashed) {
        try {
          db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hashed, user.id);
          user.password_hash = hashed;
        } catch (e) {}
      }

      const token = Buffer.from(JSON.stringify({ id: user.id, username: user.username, role: user.role })).toString('base64');

      return sendJson(res, {
        token,
        user: formatUserResponse(user)
      });
    }

    // ------------------------------------------------------------------------
    // API: Register / Account Creation
    // ------------------------------------------------------------------------
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const { full_name, username, password, email, phone, role, user_type, joining_date, course_track, designation, department } = await parseJsonBody(req);

      if (!full_name || !username || !password) {
        return sendJson(res, { error: 'Full name, username, and password are required' }, 400);
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existing) {
        return sendJson(res, { error: 'Username is already taken. Please choose another.' }, 400);
      }

      const assignedRole = role === 'admin' ? 'admin' : 'student';
      const assignedType = user_type || (assignedRole === 'admin' ? 'admin' : 'student');
      const joinDate = joining_date || new Date().toISOString().split('T')[0];
      const track = course_track || (assignedType === 'intern' ? 'Frontend Engineering Internship' : 'Frontend Web Development (HTML/CSS/JS)');
      const hashed = sha256(password);

      const stmt = db.prepare(`
        INSERT INTO users (username, password_hash, role, user_type, full_name, email, phone, joining_date, course_track, designation, department)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(username, hashed, assignedRole, assignedType, full_name, email || '', phone || '', joinDate, track, designation || '', department || '');
      const userId = Number(result.lastInsertRowid);

      if (assignedType !== 'employee' && assignedRole !== 'admin') {
        const progStmt = db.prepare(`INSERT INTO student_progress (student_id, current_task_id, status) VALUES (?, 1, 'IN_PROGRESS')`);
        progStmt.run(userId);
      }

      const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      const token = Buffer.from(JSON.stringify({ id: userId, username, role: assignedRole })).toString('base64');

      return sendJson(res, {
        token,
        user: formatUserResponse(createdUser),
        message: 'Account created successfully!'
      });
    }

    // ------------------------------------------------------------------------
    // API: Current User
    // ------------------------------------------------------------------------
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'Unauthorized' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const user = stmt.get(decoded.id);

      if (!user) return sendJson(res, { error: 'User not found' }, 404);

      return sendJson(res, {
        user: formatUserResponse(user)
      });
    }

    // ------------------------------------------------------------------------
    // API: Student Roadmap & Tasks
    // ------------------------------------------------------------------------
    if (pathname === '/api/student/roadmap' && req.method === 'GET') {
      let studentId = parsedUrl.searchParams.get('student_id');
      if (!studentId) {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
          try {
            const token = authHeader.replace('Bearer ', '');
            const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
            if (decoded && decoded.id) studentId = decoded.id;
          } catch (e) {}
        }
      }
      if (!studentId) return sendJson(res, { error: 'student_id required or valid Authorization header' }, 400);

      const tasksStmt = db.prepare('SELECT * FROM tasks ORDER BY sequence_order ASC');
      const tasks = tasksStmt.all();

      const progressStmt = db.prepare('SELECT * FROM student_progress WHERE student_id = ?');
      const progressList = progressStmt.all(studentId);
      const progressMap = new Map();
      progressList.forEach(p => progressMap.set(p.current_task_id, p.status));

      const subStmt = db.prepare('SELECT * FROM submissions WHERE student_id = ? ORDER BY id DESC');
      const subList = subStmt.all(studentId);
      const subMap = new Map();
      subList.forEach(s => {
        if (!subMap.has(s.task_id)) subMap.set(s.task_id, s);
      });

      // Strict sequential gating rule
      let previousTaskApproved = true;
      const roadmap = tasks.map(task => {
        const status = progressMap.get(task.id) || 'NOT_STARTED';
        const submission = subMap.get(task.id) || null;

        let taskState = 'LOCKED';

        if (status === 'APPROVED') {
          taskState = 'COMPLETED';
          previousTaskApproved = true;
        } else if (previousTaskApproved) {
          if (status === 'SUBMITTED') {
            taskState = 'UNDER_REVIEW';
          } else if (status === 'REVISION_REQUESTED') {
            taskState = 'CHANGES_REQUESTED';
          } else {
            taskState = 'ACTIVE';
          }
          previousTaskApproved = false; // Block further tasks until approved!
        } else {
          taskState = 'LOCKED';
          previousTaskApproved = false;
        }

        return {
          ...task,
          requirements: JSON.parse(task.requirements_json || '[]'),
          state: taskState,
          status,
          submission
        };
      });

      const completedCount = roadmap.filter(t => t.state === 'COMPLETED').length;
      const progressPercent = Math.round((completedCount / tasks.length) * 100);

      return sendJson(res, {
        roadmap,
        total_tasks: tasks.length,
        completed_tasks: completedCount,
        progress_percent: progressPercent
      });
    }

    // ------------------------------------------------------------------------
    // API: Submit Task
    // ------------------------------------------------------------------------
    if ((pathname === '/api/submissions' || pathname === '/api/student/submit-task') && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const {
        student_id,
        task_id,
        code_html,
        code_css,
        code_js,
        sample_code_text,
        student_notes,
        output_base64,
        file_name
      } = body;

      if (!student_id || !task_id) {
        return sendJson(res, { error: 'student_id and task_id are required' }, 400);
      }

      const cleanCode = (code_html || sample_code_text || '').trim();
      if (!cleanCode) {
        return sendJson(res, { error: 'Task source code is required' }, 400);
      }

      if (!output_base64) {
        return sendJson(res, { error: 'Output screenshot is mandatory. Please upload a screenshot of your output page.' }, 400);
      }

      let outputUrl = '';
      let screenshotKey = '';

      // Store screenshot as persistent Data URL so it is 100% accessible across serverless instances
      if (output_base64) {
        const cleanBase64 = output_base64.replace(/^data:[^;]+;base64,/, '');
        outputUrl = output_base64.startsWith('data:') ? output_base64 : `data:image/png;base64,${cleanBase64}`;
        try {
          const ext = file_name ? path.extname(file_name) || '.png' : '.png';
          screenshotKey = `sub_${student_id}_${task_id}_${Date.now()}${ext}`;
          const filePath = path.join(UPLOADS_DIR, screenshotKey);
          fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));
        } catch (e) {
          console.warn('Could not write upload file to disk:', e.message);
        }
      }

      const insertStmt = db.prepare(`
        INSERT INTO submissions (student_id, task_id, code_html, code_css, code_js, sample_code_text, output_url, output_screenshot_key, student_notes, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)
      `);
      const insertResult = insertStmt.run(
        student_id,
        task_id,
        code_html || '',
        code_css || '',
        code_js || '',
        sample_code_text || '',
        outputUrl,
        screenshotKey,
        student_notes || ''
      );

      // Upsert progress
      const upsertProgress = db.prepare(`
        INSERT INTO student_progress (student_id, current_task_id, status)
        VALUES (?, ?, 'SUBMITTED')
        ON CONFLICT(student_id, current_task_id) DO UPDATE SET status = 'SUBMITTED'
      `);
      upsertProgress.run(student_id, task_id);

      return sendJson(res, {
        success: true,
        message: 'Task submitted successfully! Awaiting GrowthNest admin review.',
        submission_id: Number(insertResult.lastInsertRowid)
      });
    }

    // ------------------------------------------------------------------------
    // API: Student Update Profile Picture / Avatar
    // ------------------------------------------------------------------------
    if (pathname === '/api/student/update-avatar' && req.method === 'POST') {
      const authHeader = req.headers['authorization'];
      let userId = null;
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
          if (decoded && decoded.id) userId = decoded.id;
        } catch (e) {}
      }

      const { avatar_data, student_id } = await parseJsonBody(req);
      const targetId = userId || student_id;
      if (!targetId || !avatar_data) {
        return sendJson(res, { error: 'Target student ID and avatar_data are required' }, 400);
      }

      let avatarUrl = avatar_data;
      if (avatar_data.startsWith('data:image/')) {
        const matches = avatar_data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1].replace('jpeg', 'jpg');
          const base64Content = matches[2];
          const filename = `avatar_${targetId}_${Date.now()}.${ext}`;
          const filePath = path.join(UPLOADS_DIR, filename);
          try {
            fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));
            avatarUrl = `/api/storage/${filename}`;
          } catch (e) {
            avatarUrl = avatar_data;
          }
        }
      }

      db.prepare(`UPDATE users SET avatar_url = ? WHERE id = ?`).run(avatarUrl, Number(targetId));
      return sendJson(res, { success: true, avatar_url: avatarUrl, message: 'Profile picture updated successfully!' });
    }

    // ------------------------------------------------------------------------
    // API: Admin KPI Stats (Real Database Counts)
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
      const totalCourseStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role != 'admin' AND (user_type = 'student' OR user_type IS NULL OR user_type = '')").get().count;
      const totalInterns = db.prepare("SELECT COUNT(*) as count FROM users WHERE user_type = 'intern'").get().count;
      const totalEmployees = db.prepare("SELECT COUNT(*) as count FROM users WHERE user_type = 'employee'").get().count;
      const totalStudents = totalCourseStudents + totalInterns;

      const feesStats = db.prepare("SELECT SUM(total_fees) as total_fees, SUM(fees_paid) as fees_paid FROM users WHERE role != 'admin'").get();
      const totalFees = Number(feesStats?.total_fees || 0);
      const totalFeesPaid = Number(feesStats?.fees_paid || 0);
      const totalPendingFees = Math.max(0, totalFees - totalFeesPaid);

      const salaryStats = db.prepare("SELECT SUM(salary_amount) as total_salary FROM users WHERE user_type = 'employee'").get();
      const totalSalary = Number(salaryStats?.total_salary || 0);

      const pendingReviews = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'PENDING'").get().count;
      const approvedTasks = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'APPROVED'").get().count;
      const rejectedTasks = db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'CHANGES_REQUESTED'").get().count;

      return sendJson(res, {
        total_students: totalStudents,
        total_course_students: totalCourseStudents,
        total_interns: totalInterns,
        total_employees: totalEmployees,
        total_fees: totalFees,
        total_fees_paid: totalFeesPaid,
        total_pending_fees: totalPendingFees,
        total_salary: totalSalary,
        pending_reviews: pendingReviews,
        approved_tasks: approvedTasks,
        rejected_tasks: rejectedTasks
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin Students / Members List
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/students' && req.method === 'GET') {
      const stmt = db.prepare(`SELECT * FROM users WHERE role != 'admin' ORDER BY id DESC`);
      const rawUsers = stmt.all();

      const enriched = rawUsers.map(st => {
        const formatted = formatUserResponse(st);

        if (formatted.user_type === 'employee') {
          return {
            ...formatted,
            current_task_title: formatted.designation || 'GrowthNest Staff',
            current_task_status: formatted.salary_status === 'PAID' ? 'APPROVED' : 'IN_PROGRESS',
            completed_count: 0,
            pending_count: 0
          };
        }

        const curStmt = db.prepare(`
          SELECT sp.status, t.title as task_title, t.sequence_order
          FROM student_progress sp
          JOIN tasks t ON sp.current_task_id = t.id
          WHERE sp.student_id = ?
          ORDER BY t.sequence_order DESC LIMIT 1
        `);
        const cur = curStmt.get(st.id);

        const countStmt = db.prepare(`SELECT COUNT(*) as count FROM student_progress WHERE student_id = ? AND status = 'APPROVED'`);
        const comp = countStmt.get(st.id);

        const pendingStmt = db.prepare(`SELECT COUNT(*) as count FROM submissions WHERE student_id = ? AND status = 'PENDING'`);
        const pending = pendingStmt.get(st.id);

        return {
          ...formatted,
          current_task_title: cur ? cur.task_title : 'Task 1: HTML Semantic Resume',
          current_task_status: cur ? cur.status : 'IN_PROGRESS',
          completed_count: comp ? comp.count : 0,
          pending_count: pending ? pending.count : 0
        };
      });

      return sendJson(res, { students: enriched });
    }

    // ------------------------------------------------------------------------
    // API: Admin Pending Submissions Queue
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/pending-reviews' && req.method === 'GET') {
      const rows = db.prepare(`
        SELECT s.*, 
               u.full_name as student_name, u.username as student_username, u.user_type, u.course_track,
               t.title as task_title, t.module as task_module, t.sequence_order
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        JOIN tasks t ON s.task_id = t.id
        WHERE s.status IN ('PENDING', 'CHANGES_REQUESTED')
        ORDER BY s.id DESC
      `).all();
      return sendJson(res, 200, { pending_reviews: rows || [] });
    }

    // ------------------------------------------------------------------------
    // API: Admin Dedicated Student Portfolio & History (Per-Student Workspace)
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/student-portfolio' && req.method === 'GET') {
      const studentId = Number(parsedUrl.searchParams.get('student_id'));
      if (!studentId) return sendJson(res, { error: 'student_id query parameter is required' }, 400);

      const studentStmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
      const rawUser = studentStmt.get(studentId);
      if (!rawUser) return sendJson(res, { error: 'User not found' }, 404);

      const student = formatUserResponse(rawUser);

      if (student.user_type === 'employee') {
        return sendJson(res, {
          student,
          submissions: [],
          pending_submission: null,
          roadmap: [],
          total_tasks: 0,
          completed_tasks: 0,
          pending_count: 0
        });
      }

      const subsStmt = db.prepare(`
        SELECT s.*, t.title as task_title, t.module as task_module, t.sequence_order, t.description as task_desc, t.instructions as task_inst, t.requirements_json
        FROM submissions s
        JOIN tasks t ON s.task_id = t.id
        WHERE s.student_id = ?
        ORDER BY s.id DESC
      `);
      const submissions = subsStmt.all(studentId).map(sub => ({
        ...sub,
        days_enrolled: student.days_enrolled,
        requirements: JSON.parse(sub.requirements_json || '[]')
      }));

      // Get progress roadmap for student
      const tasksStmt = db.prepare(`SELECT id, sequence_order, module, title, difficulty, requirements_json FROM tasks ORDER BY sequence_order ASC`);
      const allTasks = tasksStmt.all();

      const progStmt = db.prepare(`SELECT current_task_id, status FROM student_progress WHERE student_id = ?`);
      const progRows = progStmt.all(studentId);
      const progMap = {};
      progRows.forEach(p => { progMap[p.current_task_id] = p.status; });

      // Find newest pending or reviewable submission (only for tasks not yet approved)
      const pendingSubmission = submissions.find(s => s.status === 'PENDING' && progMap[s.task_id] !== 'APPROVED') ||
        submissions.find(s => s.status === 'CHANGES_REQUESTED' && progMap[s.task_id] !== 'APPROVED') || null;

      const roadmap = allTasks.map(task => ({
        ...task,
        requirements: JSON.parse(task.requirements_json || '[]'),
        status: progMap[task.id] || 'LOCKED'
      }));

      const completedCount = roadmap.filter(t => t.status === 'APPROVED').length;
      const pendingCount = submissions.filter(s => s.status === 'PENDING').length;

      return sendJson(res, {
        student,
        submissions,
        pending_submission: pendingSubmission,
        roadmap,
        total_tasks: allTasks.length,
        completed_tasks: completedCount,
        pending_count: pendingCount
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin Create Member (Student, Intern, or Employee)
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/students' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const {
        username,
        password,
        full_name,
        email,
        phone,
        joining_date,
        user_type,
        course_track,
        designation,
        department,
        total_fees,
        fees_paid,
        fees_status,
        fees_due_date,
        payment_notes,
        salary_amount,
        salary_status,
        salary_date,
        payment_mode,
        salary_notes
      } = body;

      if (!username || !password || !full_name || !joining_date) {
        return sendJson(res, { error: 'Username, password, full name, and joining date are required' }, 400);
      }

      const passHash = sha256(password);
      const assignedType = user_type || 'student';
      const track = course_track || (assignedType === 'intern' ? 'Frontend Engineering Internship' : 'Frontend Web Development (HTML/CSS/JS)');

      const tFees = Number(total_fees || 0);
      const pFees = Number(fees_paid || 0);
      let fStatus = fees_status;
      if (!fStatus) {
        if (tFees === 0) fStatus = 'PAID';
        else if (pFees >= tFees) fStatus = 'PAID';
        else if (pFees > 0) fStatus = 'PARTIAL';
        else fStatus = 'PENDING';
      }

      const sAmount = Number(salary_amount || 0);
      const sStatus = salary_status || 'PENDING';

      try {
        const stmt = db.prepare(`
          INSERT INTO users (
            username, password_hash, role, user_type, full_name, email, phone, joining_date, course_track,
            designation, department, total_fees, fees_paid, fees_status, fees_due_date, payment_notes,
            salary_amount, salary_status, salary_date, payment_mode, salary_notes
          ) VALUES (?, ?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
          username,
          passHash,
          assignedType,
          full_name,
          email || '',
          phone || '',
          joining_date,
          track,
          designation || '',
          department || '',
          tFees,
          pFees,
          fStatus,
          fees_due_date || '',
          payment_notes || '',
          sAmount,
          sStatus,
          salary_date || '',
          payment_mode || 'Bank Transfer',
          salary_notes || ''
        );
        const memberId = Number(result.lastInsertRowid);

        if (assignedType !== 'employee') {
          const progStmt = db.prepare(`INSERT INTO student_progress (student_id, current_task_id, status) VALUES (?, 1, 'IN_PROGRESS')`);
          progStmt.run(memberId);
        }

        const label = assignedType === 'intern' ? 'Intern' : (assignedType === 'employee' ? 'Employee / Staff' : 'Student');
        return sendJson(res, { success: true, student_id: memberId, message: `${label} "${full_name}" registered successfully!` });
      } catch (err) {
        return sendJson(res, { error: 'Failed to create member: ' + err.message }, 400);
      }
    }

    // ------------------------------------------------------------------------
    // API: Admin Update Student / Intern Fees
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/update-fees' && req.method === 'POST') {
      const { student_id, total_fees, fees_paid, fees_status, fees_due_date, payment_notes } = await parseJsonBody(req);
      if (!student_id) return sendJson(res, { error: 'student_id is required' }, 400);

      const tFees = Number(total_fees || 0);
      const pFees = Number(fees_paid || 0);
      let status = fees_status;
      if (!status) {
        if (tFees === 0) status = 'PAID';
        else if (pFees >= tFees) status = 'PAID';
        else if (pFees > 0) status = 'PARTIAL';
        else status = 'PENDING';
      }

      db.prepare(`
        UPDATE users 
        SET total_fees = ?, fees_paid = ?, fees_status = ?, fees_due_date = ?, payment_notes = ?
        WHERE id = ?
      `).run(tFees, pFees, status, fees_due_date || '', payment_notes || '', Number(student_id));

      return sendJson(res, {
        success: true,
        message: 'Fee details updated successfully!',
        fees: {
          total_fees: tFees,
          fees_paid: pFees,
          pending_fees: Math.max(0, tFees - pFees),
          fees_status: status,
          fees_due_date: fees_due_date || '',
          payment_notes: payment_notes || ''
        }
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin Update Staff Salary
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/update-salary' && req.method === 'POST') {
      const { employee_id, designation, department, salary_amount, salary_status, salary_date, payment_mode, salary_notes } = await parseJsonBody(req);
      if (!employee_id) return sendJson(res, { error: 'employee_id is required' }, 400);

      const sAmount = Number(salary_amount || 0);
      const sStatus = salary_status || 'PENDING';

      db.prepare(`
        UPDATE users 
        SET designation = ?, department = ?, salary_amount = ?, salary_status = ?, salary_date = ?, payment_mode = ?, salary_notes = ?
        WHERE id = ?
      `).run(
        designation || '',
        department || '',
        sAmount,
        sStatus,
        salary_date || '',
        payment_mode || 'Bank Transfer',
        salary_notes || '',
        Number(employee_id)
      );

      return sendJson(res, {
        success: true,
        message: 'Staff salary details updated successfully!',
        salary: {
          designation: designation || '',
          department: department || '',
          salary_amount: sAmount,
          salary_status: sStatus,
          salary_date: salary_date || '',
          payment_mode: payment_mode || 'Bank Transfer',
          salary_notes: salary_notes || ''
        }
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin Remove / Delete Student
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/students' && req.method === 'DELETE') {
      let studentId = parsedUrl.searchParams.get('student_id') || parsedUrl.searchParams.get('id');
      if (!studentId) {
        try {
          const body = await parseJsonBody(req);
          studentId = body.student_id || body.id;
        } catch (e) {}
      }

      if (!studentId) {
        return sendJson(res, { error: 'student_id is required' }, 400);
      }

      const sid = Number(studentId);
      const target = db.prepare('SELECT id, role, full_name FROM users WHERE id = ?').get(sid);
      if (!target) {
        return sendJson(res, { error: 'Student not found' }, 404);
      }
      if (target.role === 'admin') {
        return sendJson(res, { error: 'Cannot remove administrator account' }, 403);
      }

      db.prepare('DELETE FROM submissions WHERE student_id = ?').run(sid);
      db.prepare('DELETE FROM student_progress WHERE student_id = ?').run(sid);
      db.prepare('DELETE FROM users WHERE id = ?').run(sid);

      return sendJson(res, {
        success: true,
        message: `Student "${target.full_name}" has been permanently removed.`
      });
    }

    // ------------------------------------------------------------------------
    // API: Staff Daily Attendance Check-In
    // ------------------------------------------------------------------------
    if (pathname === '/api/staff/attendance/check-in' && req.method === 'POST') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'Unauthorized' }, 401);
      const token = authHeader.replace('Bearer ', '');
      let decoded;
      try { decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8')); } catch(e) { return sendJson(res, { error: 'Invalid token' }, 401); }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
      if (!user) return sendJson(res, { error: 'User not found' }, 404);

      const body = await parseJsonBody(req).catch(() => ({}));
      const status = body.status || 'PRESENT';
      const notes = body.notes || '';
      const today = getTodayIST();
      const checkInTime = getTimeIST();

      try {
        db.prepare(`
          INSERT INTO staff_attendance (user_id, attendance_date, status, check_in_time, notes, marked_by)
          VALUES (?, ?, ?, ?, ?, 'STAFF')
          ON CONFLICT(user_id, attendance_date) DO UPDATE SET
            status = excluded.status,
            check_in_time = coalesce(staff_attendance.check_in_time, excluded.check_in_time),
            notes = case when excluded.notes != '' then excluded.notes else staff_attendance.notes end,
            marked_by = 'STAFF'
        `).run(user.id, today, status, checkInTime, notes);
      } catch (err) {
        return sendJson(res, { error: 'Failed to record attendance: ' + err.message }, 500);
      }

      const record = db.prepare('SELECT * FROM staff_attendance WHERE user_id = ? AND attendance_date = ?').get(user.id, today);

      return sendJson(res, {
        success: true,
        message: status === 'PRESENT' ? `Marked Present for today (${checkInTime})` : `Attendance updated: ${status}`,
        attendance: record
      });
    }

    // ------------------------------------------------------------------------
    // API: Staff Daily Attendance Check-Out
    // ------------------------------------------------------------------------
    if (pathname === '/api/staff/attendance/check-out' && req.method === 'POST') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'Unauthorized' }, 401);
      const token = authHeader.replace('Bearer ', '');
      let decoded;
      try { decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8')); } catch(e) { return sendJson(res, { error: 'Invalid token' }, 401); }

      const today = getTodayIST();
      const checkOutTime = getTimeIST();

      db.prepare('UPDATE staff_attendance SET check_out_time = ? WHERE user_id = ? AND attendance_date = ?').run(checkOutTime, decoded.id, today);
      const record = db.prepare('SELECT * FROM staff_attendance WHERE user_id = ? AND attendance_date = ?').get(decoded.id, today);

      return sendJson(res, {
        success: true,
        message: `Checked out successfully at ${checkOutTime}`,
        attendance: record
      });
    }

    // ------------------------------------------------------------------------
    // API: Staff My Attendance Summary
    // ------------------------------------------------------------------------
    if (pathname === '/api/staff/attendance/my-summary' && req.method === 'GET') {
      const authHeader = req.headers['authorization'];
      if (!authHeader) return sendJson(res, { error: 'Unauthorized' }, 401);
      const token = authHeader.replace('Bearer ', '');
      let decoded;
      try { decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8')); } catch(e) { return sendJson(res, { error: 'Invalid token' }, 401); }

      const today = getTodayIST();
      const todayRecord = db.prepare('SELECT * FROM staff_attendance WHERE user_id = ? AND attendance_date = ?').get(decoded.id, today);

      const currentMonth = today.slice(0, 7);
      const monthStats = db.prepare(`
        SELECT
          COUNT(CASE WHEN status = 'PRESENT' THEN 1 END) as present_days,
          COUNT(CASE WHEN status = 'HALF_DAY' THEN 1 END) as half_days,
          COUNT(CASE WHEN status = 'LEAVE' THEN 1 END) as leave_days,
          COUNT(*) as total_recorded
        FROM staff_attendance
        WHERE user_id = ? AND attendance_date LIKE ?
      `).get(decoded.id, `${currentMonth}%`);

      const history = db.prepare('SELECT * FROM staff_attendance WHERE user_id = ? ORDER BY attendance_date DESC LIMIT 31').all(decoded.id);

      return sendJson(res, {
        today: todayRecord || null,
        today_date: today,
        month_stats: monthStats || { present_days: 0, half_days: 0, leave_days: 0, total_recorded: 0 },
        history: history || []
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin Get All Staff Attendance Ledger
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/staff-attendance' && req.method === 'GET') {
      const date = parsedUrl.searchParams.get('date') || getTodayIST();

      const list = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.designation, u.department, u.avatar_url,
               a.id as attendance_id, a.status, a.check_in_time, a.check_out_time, a.notes, a.marked_by
        FROM users u
        LEFT JOIN staff_attendance a ON a.user_id = u.id AND a.attendance_date = ?
        WHERE u.user_type = 'employee'
        ORDER BY u.full_name ASC
      `).all(date);

      const presentCount = list.filter(s => s.status === 'PRESENT').length;
      const leaveCount = list.filter(s => s.status === 'LEAVE').length;
      const halfDayCount = list.filter(s => s.status === 'HALF_DAY').length;
      const pendingCount = list.filter(s => !s.status || s.status === 'ABSENT').length;

      return sendJson(res, {
        date,
        today_date: getTodayIST(),
        total_staff: list.length,
        present_count: presentCount,
        leave_count: leaveCount,
        half_day_count: halfDayCount,
        pending_count: pendingCount,
        records: list
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin Mark / Update Staff Attendance
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/staff-attendance/mark' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { user_id, attendance_date, status, check_in_time, check_out_time, notes } = body;
      if (!user_id) return sendJson(res, { error: 'user_id is required' }, 400);

      const targetDate = attendance_date || getTodayIST();
      const targetStatus = status || 'PRESENT';
      const inTime = check_in_time || (targetStatus === 'PRESENT' ? getTimeIST() : null);

      db.prepare(`
        INSERT INTO staff_attendance (user_id, attendance_date, status, check_in_time, check_out_time, notes, marked_by)
        VALUES (?, ?, ?, ?, ?, ?, 'ADMIN')
        ON CONFLICT(user_id, attendance_date) DO UPDATE SET
          status = excluded.status,
          check_in_time = coalesce(excluded.check_in_time, staff_attendance.check_in_time),
          check_out_time = coalesce(excluded.check_out_time, staff_attendance.check_out_time),
          notes = coalesce(excluded.notes, staff_attendance.notes),
          marked_by = 'ADMIN'
      `).run(user_id, targetDate, targetStatus, inTime, check_out_time || null, notes || '');

      return sendJson(res, {
        success: true,
        message: `Attendance updated for staff ID ${user_id} on ${targetDate}`
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin View Specific Staff Attendance History
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/staff-attendance/history' && req.method === 'GET') {
      const userId = parsedUrl.searchParams.get('user_id');
      if (!userId) return sendJson(res, { error: 'user_id required' }, 400);

      const records = db.prepare('SELECT * FROM staff_attendance WHERE user_id = ? ORDER BY attendance_date DESC LIMIT 60').all(userId);

      return sendJson(res, {
        history: records || []
      });
    }

    // ------------------------------------------------------------------------
    // API: Admin Get Submissions
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/submissions' && req.method === 'GET') {
      const status = parsedUrl.searchParams.get('status') || 'PENDING';
      const stmt = db.prepare(`
        SELECT s.*, u.full_name as student_name, u.username as student_username, u.joining_date,
               t.title as task_title, t.module as task_module, t.sequence_order
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        JOIN tasks t ON s.task_id = t.id
        WHERE s.status = ?
        ORDER BY s.id DESC
      `);
      const subs = stmt.all(status);
      const result = subs.map(sub => ({
        ...sub,
        days_enrolled: calculateDaysEnrolled(sub.joining_date)
      }));

      return sendJson(res, { submissions: result });
    }

    // ------------------------------------------------------------------------
    // API: Admin Review Submission (Approve / Request Changes)
    // ------------------------------------------------------------------------
    if ((pathname === '/api/admin/review' || pathname === '/api/admin/review-submission') && req.method === 'POST') {
      const { submission_id, action, feedback, admin_id } = await parseJsonBody(req);

      if (!submission_id || !['APPROVE', 'REJECT'].includes(action)) {
        return sendJson(res, { error: 'Valid submission_id and action (APPROVE/REJECT) required' }, 400);
      }

      const subStmt = db.prepare('SELECT * FROM submissions WHERE id = ?');
      const sub = subStmt.get(submission_id);
      if (!sub) return sendJson(res, { error: 'Submission not found' }, 404);

      if (action === 'APPROVE') {
        // 1. Mark submission approved
        const updateSub = db.prepare(`
          UPDATE submissions 
          SET status = 'APPROVED', admin_feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);
        updateSub.run(feedback || 'Great work! Approved by GrowthNest Mentor.', admin_id || 1, submission_id);

        // 2. Mark student progress approved
        const updateProg = db.prepare(`
          UPDATE student_progress 
          SET status = 'APPROVED', completed_at = CURRENT_TIMESTAMP 
          WHERE student_id = ? AND current_task_id = ?
        `);
        updateProg.run(sub.student_id, sub.task_id);

        // 3. Find and unlock NEXT task
        const curTaskStmt = db.prepare('SELECT sequence_order FROM tasks WHERE id = ?');
        const curTask = curTaskStmt.get(sub.task_id);

        const nextStmt = db.prepare('SELECT id FROM tasks WHERE sequence_order > ? ORDER BY sequence_order ASC LIMIT 1');
        const nextTask = nextStmt.get(curTask.sequence_order);

        if (nextTask) {
          const unlockStmt = db.prepare(`
            INSERT INTO student_progress (student_id, current_task_id, status)
            VALUES (?, ?, 'IN_PROGRESS')
            ON CONFLICT(student_id, current_task_id) DO UPDATE SET status = 'IN_PROGRESS'
          `);
          unlockStmt.run(sub.student_id, nextTask.id);
        }

        return sendJson(res, {
          success: true,
          action: 'APPROVED',
          next_task_unlocked: !!nextTask,
          message: nextTask
            ? 'Task approved! Next task has been automatically unlocked for the student.'
            : 'Final task approved! Student has successfully completed the curriculum.'
        });
      } else {
        // Action is REJECT (Request Changes)
        const updateSub = db.prepare(`
          UPDATE submissions 
          SET status = 'CHANGES_REQUESTED', admin_feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `);
        updateSub.run(feedback || 'Please fix the requirements and resubmit.', admin_id || 1, submission_id);

        const updateProg = db.prepare(`
          UPDATE student_progress 
          SET status = 'REVISION_REQUESTED' 
          WHERE student_id = ? AND current_task_id = ?
        `);
        updateProg.run(sub.student_id, sub.task_id);

        return sendJson(res, {
          success: true,
          action: 'CHANGES_REQUESTED',
          message: 'Feedback submitted. Student has been notified to resubmit.'
        });
      }
    }

    // ------------------------------------------------------------------------
    // API: Admin Reset Student Password
    // ------------------------------------------------------------------------
    if (pathname === '/api/admin/reset-password' && req.method === 'POST') {
      const { student_id, new_password } = await parseJsonBody(req);
      if (!student_id || !new_password) {
        return sendJson(res, { error: 'student_id and new_password are required' }, 400);
      }
      const cleanPass = String(new_password).trim();
      if (cleanPass.length < 3) {
        return sendJson(res, { error: 'Password must be at least 3 characters' }, 400);
      }
      const passHash = sha256(cleanPass);
      db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(passHash, Number(student_id));
      return sendJson(res, { success: true, message: `Password updated successfully for student #${student_id}!` });
    }

    // ------------------------------------------------------------------------
    // STORAGE: Serve uploaded files / screenshots (R2 simulation)
    // ------------------------------------------------------------------------
    if (pathname.startsWith('/api/storage/')) {
      const filename = path.basename(pathname.replace('/api/storage/', ''));
      const filePath = path.join(UPLOADS_DIR, filename);

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        return fs.createReadStream(filePath).pipe(res);
      } else {
        // Return a clean SVG placeholder
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        return res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
          <rect width="100%" height="100%" fill="#f1f5f9"/>
          <text x="50%" y="45%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="16">GrowthNest Project Submission Output</text>
          <text x="50%" y="60%" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="13">${filename}</text>
        </svg>`);
      }
    }

    // ------------------------------------------------------------------------
    // API 404 HANDLER: Under no circumstances return HTML for /api/* routes!
    // ------------------------------------------------------------------------
    if (pathname.startsWith('/api')) {
      return sendJson(res, {
        error: `API route not found: ${pathname} [${req.method}]`,
        method: req.method,
        receivedPath: pathname,
        timestamp: new Date().toISOString()
      }, 404);
    }

    // ------------------------------------------------------------------------
    // STATIC ASSETS: Serve public/ directory
    // ------------------------------------------------------------------------
    let safePath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.join(PUBLIC_DIR, safePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      return fs.createReadStream(filePath).pipe(res);
    }

    // SPA fallback ONLY for HTML routes (never for /api/*)
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return fs.createReadStream(indexPath).pipe(res);
    }

    sendJson(res, { error: 'Not Found' }, 404);
  } catch (err) {
    console.error('Server error:', err);
    sendJson(res, { error: err.message }, 500);
  }
};

const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`
  ==============================================================
   🌿 GrowthNest Tech Solutions - Task Management Portal
  ==============================================================
   Local Server running at: http://localhost:${PORT}
   Database: Native SQLite (Cloudflare D1 / Vercel Serverless compatible)
   Storage:  Local & Vercel storage (uploads/ directory)
   File Size: Ultra-lightweight (< 200 KB total footprint)
  ==============================================================
    `);
  });
}

module.exports = requestHandler;
module.exports.server = server;

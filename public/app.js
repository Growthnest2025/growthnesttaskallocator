/**
 * GrowthNest Tech Solutions - Student Learning & Task Portal
 * Brand Identity: Emerald Green (#10b981), Golden Amber (#f59e0b), Dark Obsidian (#080c14)
 * Architecture & Features:
 * - 23 Sequential Progressive Tasks (HTML5 -> CSS3 -> JavaScript)
 * - Gating Enforcement: Next task unlocks ONLY after Admin review & approval
 * - Automatic time elapsed calculation from student's real joining date
 * - Empty code box for student to paste own code
 * - Admin Dashboard with Side Dashboard (Sidebar) organized per individual student
 * - Notification badges showing which students submitted tasks awaiting review
 * - 100% Clean: No dummy data, no "R2 cloud" text
 */

const API_BASE = window.location.origin;

const app = {
  currentUser: null,
  token: null,
  currentView: 'home', // 'home', 'student-auth', 'admin-auth', 'student-portal', 'admin-portal'
  authTab: 'login', // 'login' or 'register'

  // Student Portal State
  roadmap: [],
  selectedTaskId: null,
  currentOutputBase64: null,
  currentOutputName: null,

  // Admin Dashboard State
  adminStats: null,
  allStudents: [],
  selectedStudentId: null,
  selectedStudentPortfolio: null,
  sidebarFilter: 'all', // 'all', 'pending', 'completed'
  sidebarSearch: '',
  adminMobileTab: 'students', // 'students' or 'workspace' (responsive mobile tabs)

  async init() {
    const savedToken = localStorage.getItem('gn_token');
    const savedUser = localStorage.getItem('gn_user');

    if (savedToken && savedUser) {
      try {
        this.token = savedToken;
        this.currentUser = JSON.parse(savedUser);
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          this.currentUser = data.user;
          localStorage.setItem('gn_user', JSON.stringify(this.currentUser));
          this.renderNav();
          await this.loadPortal();
          return;
        }
      } catch (e) {
        console.error('Session expired', e);
      }
    }

    this.renderNav();
    this.showHome();
  },

  // --------------------------------------------------------------------------
  // Clean Minimal Navigation Bar
  // --------------------------------------------------------------------------
  renderNav() {
    const nav = document.getElementById('headerUserStrip');
    if (!this.currentUser) {
      nav.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="app.showStudentAuth()">Student Portal</button>
        <button class="btn btn-outline btn-sm nav-admin-btn" onclick="app.showAdminAuth()">🛡️ Admin</button>
      `;
      return;
    }

    const u = this.currentUser;
    const isAdm = u.role === 'admin';
    const pendingTotal = this.allStudents ? this.allStudents.filter(s => s.pending_count > 0).length : 0;

    nav.innerHTML = `
      ${isAdm && pendingTotal > 0 ? `
        <button class="nav-notif-btn has-pending" onclick="app.quickOpenNextPending()" title="${pendingTotal} student submission(s) awaiting review! Click to review now.">
          🔔 <span class="notif-badge-pill">${pendingTotal} New</span>
        </button>
      ` : ''}
      <div class="user-pill ${isAdm ? 'admin-pill' : 'student-pill'}">
        ${!isAdm && u.avatar_url ? `<img src="${u.avatar_url}" alt="" class="nav-avatar-img">` : ''}
        ${isAdm ? '🛡️ Admin' : `🎓 ${this.escape(u.full_name || u.username)}`}
      </div>
      <button class="nav-logout-btn" onclick="app.logout()">Sign Out</button>
    `;
  },

  // --------------------------------------------------------------------------
  // 1. HOME SCREEN (Clean Landing & Role Clarification)
  // --------------------------------------------------------------------------
  showHome() {
    this.currentView = 'home';
    const main = document.getElementById('appRoot');

    main.innerHTML = `
      <!-- Hero Showcase with Official GrowthNest Logo -->
      <section class="home-hero-section">
        <div class="home-logo-showcase">
          <img src="logo.png" alt="GrowthNest Tech Solutions Official Logo">
        </div>
        <span class="home-badge-pill">🚀 Practical Real-Time Software Training &bull; Tirunelveli</span>
        <h1>GrowthNest Tech Solutions <span>Student Task Portal</span></h1>
        <p>
          Master Full-Stack Frontend Engineering from <strong>HTML5 &rarr; CSS3 &rarr; JavaScript</strong>. Complete 23 hands-on practical assignments, write your own code, and advance sequentially as trainers evaluate and approve each milestone.
        </p>
      </section>

      <!-- Clear Role Selection (Student vs Admin) -->
      <div class="portal-choices-grid">
        <!-- Student Portal Card -->
        <div class="portal-choice-card student-theme" onclick="app.showStudentAuth()">
          <div>
            <div class="portal-card-icon student-bg">🎓</div>
            <h3>Student Portal</h3>
            <p>Access your personalized task roadmap, write or paste your code, attach output screenshots, and track your active training timeline.</p>
          </div>
          <button class="btn btn-primary" style="width: 100%; padding: 12px;">
            Access Student Portal &rarr;
          </button>
        </div>

        <!-- Admin Portal Card -->
        <div class="portal-choice-card admin-theme" onclick="app.showAdminAuth()">
          <div>
            <div class="portal-card-icon admin-bg">🛡️</div>
            <h3>Admin & Mentor Hub</h3>
            <p>Review student code, evaluate output screenshots, receive real-time submission notifications per student, and approve progress.</p>
          </div>
          <button class="btn btn-gold" style="width: 100%; padding: 12px; font-weight:700;">
            Enter Admin Dashboard &rarr;
          </button>
        </div>
      </div>

      <!-- 23 Progressive Curriculum Modules -->
      <div class="academy-courses-section">
        <div class="academy-courses-header">
          <h3>Full-Stack Curriculum (23 Hands-On Progressive Tasks)</h3>
          <p>Sequential Task Progression &bull; Next Task Unlocks Only After Mentor Approval</p>
        </div>

        <div class="courses-tri-grid">
          <div class="course-box">
            <div>
              <span class="course-meta-tag" style="background:#fee2e2; color:#b91c1c;">Module 1 &bull; 7 Tasks</span>
              <h4 style="margin-top:8px;">HTML5 Foundations</h4>
              <p>Semantic tags, lists, multimedia embeds, interactive forms with validation, tables, and full accessible structures.</p>
            </div>
            <div style="font-size:11px; font-weight:700; color:var(--emerald-dark);">Tasks 1 to 7 &bull; Basic to Intermediate</div>
          </div>

          <div class="course-box">
            <div>
              <span class="course-meta-tag" style="background:#dbeafe; color:#1d4ed8;">Module 2 &bull; 8 Tasks</span>
              <h4 style="margin-top:8px;">CSS3 & Responsive Design</h4>
              <p>Box model, typography, backgrounds, Flexbox navigation, CSS Grid layouts, media queries, and keyframe animations.</p>
            </div>
            <div style="font-size:11px; font-weight:700; color:var(--emerald-dark);">Tasks 8 to 15 &bull; Intermediate to Advanced</div>
          </div>

          <div class="course-box">
            <div>
              <span class="course-meta-tag" style="background:#fef3c7; color:#b45309;">Module 3 &bull; 8 Tasks</span>
              <h4 style="margin-top:8px;">JavaScript & Live APIs</h4>
              <p>Variables, loops, DOM events, form validation, LocalStorage CRUD persistence, and real-time REST Fetch API capstone.</p>
            </div>
            <div style="font-size:11px; font-weight:700; color:var(--emerald-dark);">Tasks 16 to 23 &bull; Advanced Capstone</div>
          </div>
        </div>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // 2. AUTHENTICATION SCREENS (Student & Admin)
  // --------------------------------------------------------------------------
  showStudentAuth(errorMsg = '', successMsg = '') {
    this.currentView = 'student-auth';
    const main = document.getElementById('appRoot');
    const today = new Date().toISOString().split('T')[0];

    main.innerHTML = `
      <div class="auth-box">
        <button class="back-role-btn" onclick="app.showHome()">&larr; Back to Home</button>

        <div style="text-align: center; margin-bottom: 20px;">
          <img src="logo.png" alt="GrowthNest Logo" style="height:52px; width:auto; border-radius:8px; margin-bottom:10px;">
          <h2 style="font-size: 20px; font-weight: 800; color: var(--dark-navy);">Student Portal</h2>
          <p style="font-size: 13px; color: var(--text-muted);">Sign in to access your assigned tasks and submit your code</p>
        </div>

        <div class="auth-tabs">
          <button class="auth-tab ${this.authTab === 'login' ? 'active' : ''}" onclick="app.setStudentAuthTab('login')">
            Student Sign In
          </button>
          <button class="auth-tab ${this.authTab === 'register' ? 'active' : ''}" onclick="app.setStudentAuthTab('register')">
            New Student Sign Up
          </button>
        </div>

        ${errorMsg ? `<div class="alert-box alert-danger">⚠️ ${this.escape(errorMsg)}</div>` : ''}
        ${successMsg ? `<div class="alert-box alert-success">✓ ${this.escape(successMsg)}</div>` : ''}

        ${this.authTab === 'login' ? `
          <form onsubmit="app.handleLogin(event, 'student')">
            <div class="form-group">
              <label>Student Username</label>
              <input type="text" id="loginUsername" class="form-input" required placeholder="Enter student username (e.g. Berlin2005)" autocomplete="username">
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="margin-bottom:0;">Password</label>
                <button type="button" onclick="app.togglePasswordVisibility('loginPassword', this)" style="background:none; border:none; color:var(--emerald-dark); font-size:12px; font-weight:700; cursor:pointer;">👁️ Show Password</button>
              </div>
              <input type="password" id="loginPassword" class="form-input" required placeholder="Enter password" autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">Sign In to Student Portal &rarr;</button>
          </form>
        ` : `
          <form onsubmit="app.handleRegister(event)">
            <div class="form-group">
              <label>Full Name *</label>
              <input type="text" id="regName" class="form-input" required placeholder="e.g. Ramesh Kumar">
            </div>
            <div class="form-group">
              <label>Username * (for login)</label>
              <input type="text" id="regUser" class="form-input" required placeholder="Create username (e.g. Berlin2005)">
            </div>
            <div class="form-group">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label style="margin-bottom:0;">Password *</label>
                <button type="button" onclick="app.togglePasswordVisibility('regPass', this)" style="background:none; border:none; color:var(--emerald-dark); font-size:12px; font-weight:700; cursor:pointer;">👁️ Show</button>
              </div>
              <input type="password" id="regPass" class="form-input" required placeholder="Create a password">
            </div>
            <div class="form-group">
              <label>Real Joining Date * (Time calculation starts from here)</label>
              <input type="date" id="regJoinDate" class="form-input" value="${today}" required>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px;">Create Student Account & Start Task 1 &rarr;</button>
          </form>
        `}
      </div>
    `;
  },

  showAdminAuth(errorMsg = '') {
    this.currentView = 'admin-auth';
    const main = document.getElementById('appRoot');

    main.innerHTML = `
      <div class="auth-box">
        <button class="back-role-btn" onclick="app.showHome()">&larr; Back to Home</button>

        <div style="text-align: center; margin-bottom: 20px;">
          <img src="logo.png" alt="GrowthNest Logo" style="height:52px; width:auto; border-radius:8px; margin-bottom:10px;">
          <h2 style="font-size: 20px; font-weight: 800; color: var(--dark-navy);">Admin & Mentor Hub</h2>
          <p style="font-size: 13px; color: var(--text-muted);">Sign in to inspect student submissions, view code & track progress</p>
        </div>

        ${errorMsg ? `<div class="alert-box alert-danger">⚠️ ${this.escape(errorMsg)}</div>` : ''}

        <form onsubmit="app.handleLogin(event, 'admin')">
          <div class="form-group">
            <label>Admin Username</label>
            <input type="text" id="loginUsername" class="form-input" required placeholder="Enter admin username (e.g. admin)">
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label style="margin-bottom:0;">Password</label>
              <button type="button" onclick="app.togglePasswordVisibility('loginPassword', this)" style="background:none; border:none; color:var(--dark-navy); font-size:12px; font-weight:700; cursor:pointer;">👁️ Show</button>
            </div>
            <input type="password" id="loginPassword" class="form-input" required placeholder="Enter password">
          </div>
          <button type="submit" class="btn btn-gold" style="width: 100%; padding: 12px;">
            Sign In as Admin / Mentor &rarr;
          </button>
        </form>
      </div>
    `;
  },

  setStudentAuthTab(tab) {
    this.authTab = tab;
    this.showStudentAuth();
  },

  async handleLogin(e, role) {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    await this.quickLogin(u, p);
  },

  async quickLogin(username, password) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('gn_token', this.token);
      localStorage.setItem('gn_user', JSON.stringify(this.currentUser));

      this.renderNav();
      await this.loadPortal();
    } catch (err) {
      if (this.currentView === 'admin-auth') {
        this.showAdminAuth(err.message);
      } else {
        this.showStudentAuth(err.message);
      }
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regName').value.trim();
    const username = document.getElementById('regUser').value.trim();
    const password = document.getElementById('regPass').value.trim();
    const joiningDate = document.getElementById('regJoinDate').value;

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          username,
          password,
          role: 'student',
          joining_date: joiningDate
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('gn_token', this.token);
      localStorage.setItem('gn_user', JSON.stringify(this.currentUser));

      this.renderNav();
      await this.loadPortal();
      this.showToast(
        `Welcome ${fullName}! Task 1 has been allocated.`,
        'success',
        'Registration Successful'
      );
    } catch (err) {
      this.showStudentAuth(err.message);
    }
  },

  logout() {
    this.showDialog({
      type: 'warning',
      title: 'Sign Out?',
      message: 'Are you sure you want to sign out from the GrowthNest Task Portal?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      onConfirm: () => {
        this.currentUser = null;
        this.token = null;
        localStorage.removeItem('gn_token');
        localStorage.removeItem('gn_user');
        this.renderNav();
        this.showToast('You have been signed out.', 'info', 'Signed Out');
        this.showHome();
      }
    });
  },

  async loadPortal() {
    if (!this.currentUser) return this.showHome();
    if (this.currentUser.role === 'admin') {
      await this.loadAdminPortal();
    } else {
      await this.loadStudentPortal();
    }
  },

  // --------------------------------------------------------------------------
  // 3. STUDENT PORTAL (Progressive 23-Task Workflow)
  // --------------------------------------------------------------------------
  async loadStudentPortal() {
    this.currentView = 'student-portal';
    const main = document.getElementById('appRoot');
    main.innerHTML = `<p style="text-align:center; padding:40px; color:var(--text-muted);">Loading your curriculum & tasks...</p>`;

    try {
      const res = await fetch(`${API_BASE}/api/student/roadmap?student_id=${this.currentUser.id}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (!res.ok) throw new Error('Failed to load student roadmap');
      const data = await res.json();

      this.roadmap = data.roadmap || [];

      // Select active task by default, or first task
      const activeTask = this.roadmap.find(t => t.state === 'ACTIVE' || t.state === 'UNDER_REVIEW' || t.state === 'CHANGES_REQUESTED')
        || this.roadmap[0];

      this.selectedTaskId = activeTask ? activeTask.id : 1;
      this.renderStudentPortal(data);
    } catch (err) {
      main.innerHTML = `<div class="alert-box alert-danger">Error: ${this.escape(err.message)}</div>`;
    }
  },

  renderStudentPortal(data) {
    const main = document.getElementById('appRoot');
    const u = this.currentUser;
    const task = this.roadmap.find(t => t.id === this.selectedTaskId) || this.roadmap[0];

    main.innerHTML = `
      <!-- Student Profile & Progress Banner -->
      <div class="student-hero-banner">
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="student-avatar-wrapper" onclick="document.getElementById('avatarFileInput').click()" title="Click to upload or change profile photo">
            ${u.avatar_url ? `
              <img src="${u.avatar_url}" alt="Profile" class="student-avatar-img">
            ` : `
              <div class="student-avatar" style="width:52px; height:52px; font-size:18px;">
                ${this.getInitials(u.full_name)}
              </div>
            `}
            <div class="avatar-camera-pill" title="Upload Photo">📷</div>
            <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" onchange="app.handleAvatarUpload(event)">
          </div>
          <div>
            <h2 style="font-size:20px; font-weight:800; color:var(--dark-navy);">${this.escape(u.full_name)}</h2>
            <div style="font-size:13px; color:var(--text-muted); display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;">
              <span>@${this.escape(u.username)}</span>
              <span>&bull;</span>
              <span style="color:var(--emerald-dark); font-weight:700;">⏱️ Day ${u.days_enrolled}</span>
              <span>&bull;</span>
              <span>${this.escape(u.course_track || 'Frontend Development')}</span>
              <span>&bull;</span>
              <button type="button" class="btn btn-outline" style="padding:1px 8px; font-size:11px; height:auto; line-height:1.4; border-radius:12px;" onclick="document.getElementById('avatarFileInput').click()">📷 Change Photo</button>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Curriculum</div>
          <div style="font-size:20px; font-weight:800; color:var(--emerald-dark);">${data.completed_tasks} / ${data.total_tasks} <span style="font-size:13px; font-weight:600; color:var(--text-muted);">Tasks</span></div>
        </div>
      </div>

      <!-- Progressive 23-Task Stepper Strip -->
      <div style="margin-bottom: 10px; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="font-size: 15px; font-weight: 800; color: var(--dark-navy);">
          📚 Curriculum Track (23 Tasks)
        </h3>
        <span style="font-size: 12px; color: var(--emerald-dark); font-weight:700;">${data.progress_percent}% Progress</span>
      </div>

      <div class="roadmap-strip">
        ${this.roadmap.map(t => {
          let stateClass = '';
          let icon = '🔒';
          let label = 'Locked';

          if (t.state === 'COMPLETED') {
            stateClass = 'completed';
            icon = '✓';
            label = 'Approved';
          } else if (t.state === 'UNDER_REVIEW') {
            stateClass = 'active';
            icon = '⏳';
            label = 'In Review';
          } else if (t.state === 'CHANGES_REQUESTED') {
            stateClass = 'active';
            icon = '⚠️';
            label = 'Revise';
          } else if (t.state === 'ACTIVE') {
            stateClass = 'active';
            icon = '🚀';
            label = 'Active';
          } else {
            stateClass = 'locked';
          }

          const isSelected = t.id === this.selectedTaskId ? 'style="border-color:var(--emerald); box-shadow:0 0 0 2px var(--emerald-glow);"' : '';

          return `
            <div class="step-card ${stateClass}" ${isSelected} onclick="app.selectStudentTask(${t.id})">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span class="step-badge step-badge-${t.module.toLowerCase()}">${t.module}</span>
                <span style="font-weight:700;">${icon} ${label}</span>
              </div>
              <div style="font-weight:700; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                Task ${t.sequence_order}: ${this.escape(t.title)}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Task Details and Submission Workspace -->
      <div class="card" style="box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border-radius:14px;">
        ${this.renderStudentTaskDetail(task)}
      </div>
    `;
  },

  selectStudentTask(taskId) {
    const task = this.roadmap.find(t => t.id === taskId);
    if (!task) return;
    if (task.state === 'LOCKED') {
      const prevTask = this.roadmap.find(t => t.sequence_order === task.sequence_order - 1);
      this.showDialog({
        type: 'lock',
        title: `🔒 Task ${task.sequence_order} is Locked`,
        message: `Complete and obtain approval for <strong>Task ${task.sequence_order - 1}${prevTask ? ': ' + this.escape(prevTask.title) : ''}</strong> first to unlock this milestone.`,
        confirmText: 'Go to Active Task',
        cancelText: 'Close',
        onConfirm: () => {
          const active = this.roadmap.find(t => t.state === 'ACTIVE' || t.state === 'CHANGES_REQUESTED' || t.state === 'UNDER_REVIEW');
          if (active) app.selectStudentTask(active.id);
        }
      });
      return;
    }
    this.selectedTaskId = taskId;
    this.currentOutputBase64 = null;
    this.currentOutputName = null;
    this.renderStudentPortal({
      completed_tasks: this.roadmap.filter(t => t.state === 'COMPLETED').length,
      total_tasks: this.roadmap.length,
      progress_percent: Math.round((this.roadmap.filter(t => t.state === 'COMPLETED').length / this.roadmap.length) * 100)
    });
  },

  renderStudentTaskDetail(task) {
    const sub = task.submission;

    return `
      <!-- Task Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
        <div>
          <span class="step-badge step-badge-${task.module.toLowerCase()}">${task.module} &bull; Task ${task.sequence_order}</span>
          <span class="req-chip" style="padding:2px 8px; font-size:11px; margin-left:6px;">${task.difficulty}</span>
          <h2 style="font-size:19px; font-weight:800; color:var(--dark-navy); margin-top:4px;">${this.escape(task.title)}</h2>
        </div>
        <div>
          ${task.state === 'COMPLETED' ? '<span class="home-badge-pill" style="background:var(--success-bg); color:var(--emerald-deep); border-color:var(--success-border);">✓ Approved</span>' : ''}
          ${task.state === 'UNDER_REVIEW' ? '<span class="home-badge-pill" style="background:var(--gold-light); color:var(--gold-deep); border-color:var(--gold-border);">⏳ In Review</span>' : ''}
          ${task.state === 'CHANGES_REQUESTED' ? '<span class="home-badge-pill" style="background:var(--danger-bg); color:var(--danger); border-color:var(--danger-border);">⚠️ Revisions Needed</span>' : ''}
          ${task.state === 'ACTIVE' ? '<span class="home-badge-pill" style="background:var(--emerald-light); color:var(--emerald-deep); border-color:var(--emerald-border);">🚀 Active</span>' : ''}
        </div>
      </div>

      <!-- Clean Status Notification (concise, no text clutter) -->
      ${task.state === 'UNDER_REVIEW' ? `
        <div class="task-status-pill status-review">
          <span>⏳</span>
          <div>Submission in mentor review queue. Next task unlocks upon approval.</div>
        </div>
      ` : ''}

      ${task.state === 'CHANGES_REQUESTED' ? `
        <div class="task-status-pill status-revision">
          <span>⚠️</span>
          <div>Mentor Feedback: <strong>"${this.escape(sub ? sub.admin_feedback : 'Please update code and resubmit.')}"</strong></div>
        </div>
      ` : ''}

      ${task.state === 'COMPLETED' ? `
        <div class="task-status-pill status-approved">
          <span>🎉</span>
          <div>Task Approved! Mentor Feedback: "${this.escape(sub && sub.admin_feedback ? sub.admin_feedback : 'Great work!')}"</div>
        </div>
      ` : ''}

      <!-- Clean Compact Brief (Replaces long paragraphs) -->
      <div class="task-brief-box">
        <p class="task-brief-text">${this.escape(task.description)}</p>
      </div>

      <!-- Key Checklist Chips -->
      ${task.requirements && task.requirements.length > 0 ? `
        <div class="task-req-chips">
          ${task.requirements.map(r => `<span class="req-chip">✓ ${this.escape(r)}</span>`).join('')}
        </div>
      ` : ''}

      <!-- Collapsible Detailed Instructions (Hidden by default to keep dashboard neat) -->
      <details class="instructions-accordion">
        <summary>📘 View Instructions Guide</summary>
        <div class="instructions-body">${this.escape(task.instructions)}</div>
      </details>

      <!-- Student Submission Workspace -->
      ${task.state === 'ACTIVE' || task.state === 'CHANGES_REQUESTED' ? `
        <div style="border-top:1px solid var(--border); padding-top:18px;">
          <h3 class="workspace-heading">📝 Submit Assignment</h3>

          <div class="form-group" style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="font-size:13px; margin-bottom:0;">Source Code (HTML / CSS / JS):</label>
              ${task.state === 'CHANGES_REQUESTED' && sub && sub.code_html ? `
                <button type="button" class="btn btn-outline" style="font-size:11px; padding:2px 8px;" onclick="document.getElementById('taskCodeInput').value = decodeURIComponent('${encodeURIComponent(sub.code_html)}')">↺ Load Previous Code</button>
              ` : ''}
            </div>
            <textarea id="taskCodeInput" class="code-box" placeholder="Write or paste your complete code here..."></textarea>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:14px;">
            <div>
              <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px;">Screenshot:</label>
              <div class="compact-dropzone" onclick="document.getElementById('taskFilePicker').click()">
                📸 <span id="filePickedText">Attach Screenshot (.png/.jpg)</span>
                <input type="file" id="taskFilePicker" accept="image/*" style="display:none;" onchange="app.handleFilePick(event)">
              </div>
            </div>
            <div>
              <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px;">Notes (Optional):</label>
              <input type="text" id="taskNotesInput" class="form-input" style="height:48px;" placeholder="Notes for mentor..." value="${this.escape(sub ? sub.student_notes || '' : '')}">
            </div>
          </div>

          <div style="text-align:right;">
            <button class="btn btn-primary" style="padding:10px 22px;" onclick="app.submitActiveTask(${task.id})">
              🚀 Submit Task for Approval
            </button>
          </div>
        </div>
      ` : ''}

      ${(task.state === 'UNDER_REVIEW' || task.state === 'COMPLETED') && sub ? `
        <div style="border-top:1px solid var(--border); padding-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <h4 style="font-size:13.5px; font-weight:700; color:var(--dark-navy);">Submitted Code:</h4>
            <button class="btn btn-outline btn-sm" onclick="app.copyCodeToClipboard('submittedCodeBox')">📋 Copy</button>
          </div>
          <textarea id="submittedCodeBox" class="code-box" readonly style="height:140px;">${this.escape(sub.code_html || sub.sample_code_text || '')}</textarea>

          ${sub.output_url ? `
            <div style="margin-top:12px;">
              <strong style="font-size:12.5px; display:block; margin-bottom:4px; color:var(--dark-navy);">Uploaded Screenshot:</strong>
              <img src="${sub.output_url}" alt="Output Screenshot" style="max-width:100%; max-height:200px; border-radius:6px; border:1px solid var(--border); cursor:pointer;" onclick="app.previewImage('${sub.output_url}')">
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;
  },

  async handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return this.showToast('Please select a valid image file (.png, .jpg, .webp)', 'error', 'Invalid File');
    }

    if (file.size > 5 * 1024 * 1024) {
      return this.showToast('Please choose an image under 5MB', 'warning', 'File Too Large');
    }

    this.showToast('Processing photo...', 'info', 'Uploading');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        try {
          const res = await fetch(`${API_BASE}/api/student/update-avatar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({
              student_id: this.currentUser.id,
              avatar_data: compressedBase64
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');

          this.currentUser.avatar_url = data.avatar_url;
          localStorage.setItem('gn_user', JSON.stringify(this.currentUser));
          this.renderNav();
          await this.loadPortal();
          this.showToast('Profile photo updated successfully!', 'success', 'Photo Updated');
        } catch (err) {
          this.showToast(err.message, 'error', 'Upload Failed');
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },

  handleFilePick(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('filePickedText').innerText = `✓ Selected: ${file.name}`;
    const reader = new FileReader();
    reader.onload = ev => {
      this.currentOutputBase64 = ev.target.result;
      this.currentOutputName = file.name;
    };
    reader.readAsDataURL(file);
  },

  async submitActiveTask(taskId) {
    const code = document.getElementById('taskCodeInput').value;
    const notes = document.getElementById('taskNotesInput').value;

    if (!code.trim() && !this.currentOutputBase64) {
      this.showToast('Please paste your code or attach an output screenshot before submitting.', 'warning', 'Assignment Incomplete');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          student_id: this.currentUser.id,
          task_id: taskId,
          code_html: code,
          sample_code_text: code,
          student_notes: notes,
          output_base64: this.currentOutputBase64,
          file_name: this.currentOutputName || 'screenshot.png'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      this.showDialog({
        type: 'success',
        title: '🎉 Assignment Submitted!',
        message: 'Your code and screenshot have been delivered to the <strong>GrowthNest mentor review queue</strong>. Once evaluated and approved, the next curriculum milestone will automatically unlock.',
        confirmText: 'View Dashboard'
      });
      await this.loadStudentPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Submission Failed');
    }
  },

  // --------------------------------------------------------------------------
  // 4. ADMIN DASHBOARD WITH SIDE DASHBOARDS & PER-STUDENT WORKSPACE
  //    "admin dashboard with side dashbpards ellaroda project um motathama illama
  //     ovvourhtnaga name la and yaru submit pannagalo avanga ithula notification vantah mathitiri"
  // --------------------------------------------------------------------------
  async loadAdminPortal() {
    this.currentView = 'admin-portal';
    const main = document.getElementById('appRoot');
    main.innerHTML = `<p style="text-align:center; padding:40px; color:var(--text-muted);">Loading GrowthNest admin dashboard...</p>`;

    try {
      const [statsRes, studentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers: { 'Authorization': `Bearer ${this.token}` } }),
        fetch(`${API_BASE}/api/admin/students`, { headers: { 'Authorization': `Bearer ${this.token}` } })
      ]);

      const statsData = await statsRes.json();
      const studentsData = await studentsRes.json();

      this.adminStats = statsData;
      this.allStudents = studentsData.students || [];

      // Update navbar with live notification bell
      this.renderNav();

      // Automatically select the first student with a pending submission, or the first student in the list
      if (!this.selectedStudentId || !this.allStudents.some(s => s.id === this.selectedStudentId)) {
        const studentWithPending = this.allStudents.find(s => s.pending_count > 0);
        this.selectedStudentId = studentWithPending ? studentWithPending.id : (this.allStudents[0] ? this.allStudents[0].id : null);
      }

      // Fetch dedicated portfolio for selected student
      if (this.selectedStudentId) {
        await this.fetchStudentPortfolio(this.selectedStudentId);
      }

      this.renderAdminPortal();
    } catch (err) {
      main.innerHTML = `<div class="alert-box alert-danger">Error: ${this.escape(err.message)}</div>`;
    }
  },

  async fetchStudentPortfolio(studentId) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/student-portfolio?student_id=${studentId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        this.selectedStudentPortfolio = await res.json();
      }
    } catch (e) {
      console.error('Error fetching student portfolio', e);
    }
  },

  async selectStudent(studentId, shouldScroll = false) {
    this.selectedStudentId = studentId;
    this.adminMobileTab = 'workspace';
    await this.fetchStudentPortfolio(studentId);
    this.renderAdminPortal();

    if (shouldScroll) {
      setTimeout(() => {
        const reviewBox = document.getElementById('pendingReviewBox');
        if (reviewBox) {
          reviewBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          reviewBox.classList.remove('review-pulse-focus');
          void reviewBox.offsetWidth; // trigger reflow
          reviewBox.classList.add('review-pulse-focus');
        } else {
          const workspace = document.getElementById('studentWorkspace');
          if (workspace) {
            workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 50);
    }
  },

  setAdminMobileTab(tab) {
    this.adminMobileTab = tab;
    this.renderAdminPortal();
  },

  async selectStudentAndReview(studentId) {
    await this.selectStudent(studentId, true);
  },

  async quickOpenNextPending() {
    if (!this.allStudents || this.allStudents.length === 0) {
      await this.loadAdminPortal();
    }
    const pendingStudent = this.allStudents.find(s => s.pending_count > 0);
    if (pendingStudent) {
      this.sidebarFilter = 'pending';
      await this.selectStudent(pendingStudent.id, true);
    } else {
      this.showToast('All caught up! No submissions are currently waiting for mentor review.', 'info', 'Review Queue Clear');
    }
  },

  setSidebarFilter(filter) {
    this.sidebarFilter = filter;
    this.renderAdminPortal();
  },

  handleSidebarSearch(e) {
    this.sidebarSearch = e.target.value.toLowerCase();
    this.renderAdminPortal();
  },

  renderAdminPortal() {
    const main = document.getElementById('appRoot');
    const stats = this.adminStats || { total_students: 0, pending_reviews: 0, approved_tasks: 0, rejected_tasks: 0 };

    // Filter students for sidebar
    const filteredStudents = this.allStudents.filter(s => {
      const matchesSearch = !this.sidebarSearch
        || s.full_name.toLowerCase().includes(this.sidebarSearch)
        || s.username.toLowerCase().includes(this.sidebarSearch);

      if (!matchesSearch) return false;

      if (this.sidebarFilter === 'pending') {
        return s.pending_count > 0;
      } else if (this.sidebarFilter === 'completed') {
        return s.pending_count === 0;
      }
      return true;
    });

    const pendingTotal = this.allStudents.filter(s => s.pending_count > 0).length;

    main.innerHTML = `
      <!-- Top Header & Enroll Button -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="logo.png" alt="GrowthNest Logo" style="height:44px; width:auto; border-radius:6px;">
          <div>
            <h2 style="font-size:22px; font-weight:800; color:var(--dark-navy);">GrowthNest Admin & Mentor Hub</h2>
            <p style="font-size:13px; color:var(--text-muted);">Master-Detail Student Task Evaluation & Real-Time Tracking</p>
          </div>
        </div>
        <button class="btn btn-primary" onclick="app.openModal('addStudentModal')">
          ➕ Enroll New Student
        </button>
      </div>

      <!-- Real KPI Stats Bar -->
      <div class="admin-stats-strip">
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:var(--emerald-light); color:var(--emerald-deep);">👥</div>
          <div>
            <div class="stat-metric-val">${stats.total_students}</div>
            <div class="stat-metric-lbl">Total Students</div>
          </div>
        </div>

        <div class="stat-metric-card clickable" onclick="app.quickOpenNextPending()" title="Click to view and review pending submissions" style="border-color:${stats.pending_reviews > 0 ? 'var(--gold)' : 'var(--border)'};">
          <div class="stat-metric-icon" style="background:var(--gold-light); color:var(--gold-deep);">🔔</div>
          <div>
            <div class="stat-metric-val" style="color:${stats.pending_reviews > 0 ? 'var(--gold-deep)' : 'var(--text-main)'};">
              ${stats.pending_reviews}
            </div>
            <div class="stat-metric-lbl">Pending Submissions &rarr;</div>
          </div>
        </div>

        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:var(--success-bg); color:var(--emerald-deep);">✓</div>
          <div>
            <div class="stat-metric-val">${stats.approved_tasks}</div>
            <div class="stat-metric-lbl">Approved Tasks</div>
          </div>
        </div>

        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:var(--danger-bg); color:var(--danger);">⚠️</div>
          <div>
            <div class="stat-metric-val">${stats.rejected_tasks}</div>
            <div class="stat-metric-lbl">Revisions Requested</div>
          </div>
        </div>
      </div>

      <!-- Mobile View Switcher (Only visible on screens <= 860px) -->
      <div class="admin-mobile-nav-bar">
        <button class="mobile-nav-btn ${this.adminMobileTab === 'students' ? 'active' : ''}" onclick="app.setAdminMobileTab('students')">
          👥 Students (${this.allStudents.length})
        </button>
        <button class="mobile-nav-btn ${this.adminMobileTab === 'workspace' ? 'active' : ''}" onclick="app.setAdminMobileTab('workspace')">
          📁 ${this.selectedStudentPortfolio && this.selectedStudentPortfolio.student ? this.escape(this.selectedStudentPortfolio.student.full_name) : 'Student Workspace'}
          ${(this.selectedStudentPortfolio && this.selectedStudentPortfolio.pending_count > 0) ? `<span class="notif-badge-pill" style="margin-left:4px;">🔔</span>` : ''}
        </button>
      </div>

      <!-- 2-Column Responsive Workspace: Side Dashboard + Individual Student View -->
      <div class="admin-workspace-grid">
        <!-- LEFT COLUMN: Side Dashboard (Students List with Notifications) -->
        <aside class="admin-sidebar-panel ${this.adminMobileTab === 'workspace' ? 'mobile-tab-hidden' : ''}">
          <div class="sidebar-header-row">
            <h3>👥 Students Directory</h3>
            <span style="font-size:12px; font-weight:700; color:var(--text-muted);">${this.allStudents.length} Enrolled</span>
          </div>

          <input type="text" class="sidebar-search-box" placeholder="🔍 Search student name..." value="${this.escape(this.sidebarSearch)}" oninput="app.handleSidebarSearch(event)">

          <div class="sidebar-filter-tabs">
            <button class="filter-tab-pill ${this.sidebarFilter === 'all' ? 'active' : ''}" onclick="app.setSidebarFilter('all')">
              All (${this.allStudents.length})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'pending' ? 'active' : ''}" onclick="app.setSidebarFilter('pending')" style="${pendingTotal > 0 ? 'color:var(--gold-deep); font-weight:800;' : ''}">
              🔔 Needs Review (${pendingTotal})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'completed' ? 'active' : ''}" onclick="app.setSidebarFilter('completed')">
              ✓ Up to date
            </button>
          </div>

          <!-- Students List -->
          <div class="admin-students-list">
            ${filteredStudents.length === 0 ? `
              <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">
                No students match your filter.
              </div>
            ` : filteredStudents.map(s => {
              const isSelected = s.id === this.selectedStudentId;
              const hasPending = s.pending_count > 0;

              return `
                <div class="student-card-item ${isSelected ? 'selected' : ''}" onclick="app.selectStudentAndReview(${s.id})">
                  <div class="student-card-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                      ${s.avatar_url ? `
                        <img src="${s.avatar_url}" alt="" class="student-avatar-img" style="width:38px; height:38px;">
                      ` : `
                        <div class="student-avatar">
                          ${this.getInitials(s.full_name)}
                        </div>
                      `}
                      <div>
                        <div class="student-name-text">${this.escape(s.full_name)}</div>
                        <div class="student-username-text">@${this.escape(s.username)}</div>
                      </div>
                    </div>
                    ${hasPending ? `
                      <span class="student-notif-pill" onclick="event.stopPropagation(); app.selectStudentAndReview(${s.id})" title="Click to jump directly to this review!">
                        <span class="pulse-dot"></span>
                        🔔 ${s.pending_count} New
                      </span>
                    ` : ''}
                  </div>

                  <div class="student-meta-strip">
                    <span>🗓️ Day ${s.days_enrolled} (${s.joining_date})</span>
                    <span style="font-weight:700; color:var(--emerald-dark);">${s.completed_count}/23 Tasks</span>
                  </div>

                  <div style="font-size:11px; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    📌 ${this.escape(s.current_task_title || 'Task 1')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </aside>

        <!-- RIGHT COLUMN: Dedicated Student Workspace (Per-Student View) -->
        <section id="studentWorkspace" class="admin-detail-panel ${this.adminMobileTab === 'students' ? 'mobile-tab-hidden' : ''}">
          <button class="mobile-back-to-list-btn" onclick="app.setAdminMobileTab('students')">
            &larr; Back to Students Directory
          </button>
          ${this.renderStudentWorkspace()}
        </section>
      </div>
    `;
  },

  renderStudentWorkspace() {
    if (!this.selectedStudentPortfolio || !this.selectedStudentPortfolio.student) {
      return `
        <div class="card" style="text-align:center; padding:48px 20px;">
          <div style="font-size:36px; margin-bottom:12px;">👈</div>
          <h3 style="color:var(--dark-navy);">Select a Student from the Side Dashboard</h3>
          <p style="color:var(--text-muted); font-size:13.5px; margin-top:4px;">
            Click any student in the directory to inspect their submitted code, output screenshots, and progress roadmap.
          </p>
        </div>
      `;
    }

    const { student, submissions, pending_submission, roadmap, total_tasks, completed_tasks, pending_count } = this.selectedStudentPortfolio;
    const progressPercent = Math.round((completed_tasks / total_tasks) * 100);

    return `
      <!-- Student Banner Card -->
      <div class="student-profile-hero">
        <div class="profile-top-bar">
          <div style="display:flex; align-items:center; gap:14px;">
            ${student.avatar_url ? `
              <img src="${student.avatar_url}" alt="" class="student-avatar-img" style="width:48px; height:48px;">
            ` : `
              <div class="student-avatar" style="width:48px; height:48px; font-size:17px;">
                ${this.getInitials(student.full_name)}
              </div>
            `}
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <h2 style="font-size:20px; font-weight:800; color:var(--dark-navy);">${this.escape(student.full_name)}</h2>
                <span class="user-tag" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;">@${this.escape(student.username)}</span>
              </div>
              <div style="font-size:12.5px; color:var(--text-muted); display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:3px;">
                <span>📅 Joined: <strong>${student.joining_date}</strong></span>
                <span>&bull;</span>
                <span style="color:var(--emerald-dark); font-weight:700;">⏱️ Time Elapsed: ${student.days_enrolled} Days</span>
                <span>&bull;</span>
                <span>🎓 ${this.escape(student.course_track || 'Frontend Development')}</span>
                <span>&bull;</span>
                <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:11px; height:auto; line-height:1.4; border-color:#cbd5e1; color:#334155;" onclick="app.promptResetPassword(${student.id}, '${this.escape(student.username)}')">🔑 Reset Password</button>
              </div>
            </div>
          </div>

          <div style="text-align:right;">
            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Sequential Progress</div>
            <div style="font-size:20px; font-weight:800; color:var(--emerald-dark);">${completed_tasks} / ${total_tasks} <span style="font-size:12px; font-weight:600; color:var(--text-muted);">Approved</span></div>
            <div style="font-size:11px; color:var(--text-muted);">${progressPercent}% Complete</div>
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
        </div>
      </div>

      <!-- ACTIVE SUBMISSION AWAITING REVIEW (If student has a pending task) -->
      ${pending_submission ? `
        <div id="pendingReviewBox" class="review-hero-card review-pulse-focus">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="student-notif-pill">
                  <span class="pulse-dot"></span> 🔔 Awaiting Mentor Review
                </span>
                <span class="step-badge step-badge-${pending_submission.task_module.toLowerCase()}">${pending_submission.task_module} Module</span>
              </div>
              <h3 style="font-size:18px; font-weight:800; color:var(--dark-navy);">
                Task ${pending_submission.sequence_order}: ${this.escape(pending_submission.task_title)}
              </h3>
            </div>
            <div style="font-size:12px; color:var(--text-muted);">
              Submitted: <strong>${new Date(pending_submission.submitted_at).toLocaleString()}</strong>
            </div>
          </div>

          ${pending_submission.student_notes ? `
            <div style="background:#f8fafc; border-left:3px solid var(--emerald); padding:10px 14px; font-size:13px; margin-bottom:16px; border-radius:4px; color:#334155;">
              <strong>Student's Note:</strong> "${this.escape(pending_submission.student_notes)}"
            </div>
          ` : ''}

          <!-- Submitted Code Box with Copy Feature -->
          <div style="margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="font-size:13px; font-weight:700; color:var(--dark-navy);">Student's Submitted Source Code:</label>
              <button class="btn btn-outline btn-sm" onclick="app.copyCodeToClipboard('subCode_${pending_submission.id}')">📋 Copy Code</button>
            </div>
            <textarea id="subCode_${pending_submission.id}" class="code-box" readonly style="height:170px;">${this.escape(pending_submission.code_html || pending_submission.sample_code_text || 'No code provided')}</textarea>
          </div>

          <!-- Uploaded Screenshot (Clean Label - NO R2) -->
          ${pending_submission.output_url ? `
            <div style="margin-bottom:16px;">
              <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:var(--dark-navy);">
                Output Screenshot (Click to enlarge):
              </label>
              <div style="cursor:pointer; display:inline-block;" onclick="app.previewImage('${pending_submission.output_url}')">
                <img src="${pending_submission.output_url}" alt="Output Screenshot" style="max-width:100%; max-height:220px; border-radius:8px; border:1px solid var(--border); box-shadow:var(--shadow-sm);">
                <div style="font-size:11px; color:var(--emerald-dark); margin-top:3px; font-weight:700;">🔍 Click image to zoom</div>
              </div>
            </div>
          ` : ''}

          <!-- Mentor Evaluation Form -->
          <div style="margin-bottom:18px; border-top:1px solid var(--gold-border); padding-top:16px;">
            <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:var(--dark-navy);">
              Feedback / Remarks for ${this.escape(student.full_name)}:
            </label>
            <input type="text" id="feedback_${pending_submission.id}" class="form-input" placeholder="Enter mentor feedback..." value="Great work! Requirements satisfied. Approved by GrowthNest Mentor.">

            <div class="feedback-chips-strip">
              <span class="feedback-chip" onclick="app.insertFeedback(${pending_submission.id}, '✓ Excellent clean HTML5 semantic structure! All requirements satisfied.')">✓ Clean Semantics</span>
              <span class="feedback-chip" onclick="app.insertFeedback(${pending_submission.id}, '✓ Well done! Requirements verified and approved.')">✓ Requirements Met</span>
              <span class="feedback-chip" onclick="app.insertFeedback(${pending_submission.id}, '⚠️ Please check closing tags and verify all requirements.')">⚠️ Check Closing Tags</span>
              <span class="feedback-chip" onclick="app.insertFeedback(${pending_submission.id}, '⚠️ Please format and indent your code properly.')">⚠️ Indent Code</span>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-danger" onclick="app.adminDecide(${pending_submission.id}, 'REJECT')">
              ✕ Request Changes
            </button>
            <button class="btn btn-success" onclick="app.adminDecide(${pending_submission.id}, 'APPROVE')">
              ✓ Approve & Unlock Next Task
            </button>
          </div>
        </div>
      ` : `
        <div class="card" style="background:#f8fafc; border-style:dashed;">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:24px;">✓</span>
            <div>
              <strong style="color:var(--dark-navy);">No Pending Submissions for ${this.escape(student.full_name)}</strong>
              <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">
                Student is currently working on their next assignment. As soon as they submit, a notification badge will appear here.
              </div>
            </div>
          </div>
        </div>
      `}

      <!-- Student's Submissions History & Timeline -->
      <div class="card">
        <h3 style="font-size:16px; font-weight:800; color:var(--dark-navy); margin-bottom:14px;">
          📜 Submission History for ${this.escape(student.full_name)} (${submissions.length})
        </h3>

        ${submissions.length === 0 ? `
          <p style="font-size:13px; color:var(--text-muted);">No submissions made yet by this student.</p>
        ` : `
          <div class="table-wrapper">
            <table class="clean-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Module</th>
                  <th>Status</th>
                  <th>Submitted At</th>
                  <th>Mentor Feedback</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${submissions.map(sub => {
                  let statusBadge = '';
                  if (sub.status === 'APPROVED') {
                    statusBadge = '<span class="course-meta-tag" style="background:var(--success-bg); color:var(--emerald-deep);">✓ Approved</span>';
                  } else if (sub.status === 'PENDING') {
                    statusBadge = '<span class="course-meta-tag" style="background:var(--gold-light); color:var(--gold-deep);">⏳ Pending Review</span>';
                  } else {
                    statusBadge = '<span class="course-meta-tag" style="background:var(--danger-bg); color:var(--danger);">⚠️ Changes Requested</span>';
                  }

                  return `
                    <tr>
                      <td>
                        <strong>Task ${sub.sequence_order}: ${this.escape(sub.task_title)}</strong>
                      </td>
                      <td>
                        <span class="step-badge step-badge-${sub.task_module.toLowerCase()}">${sub.task_module}</span>
                      </td>
                      <td>${statusBadge}</td>
                      <td style="font-size:12px; color:var(--text-muted);">${new Date(sub.submitted_at).toLocaleString()}</td>
                      <td style="font-size:12.5px; color:#334155;">${this.escape(sub.admin_feedback || '—')}</td>
                      <td>
                        <button class="btn btn-outline btn-sm" onclick="app.viewCodeModal('${this.escape(sub.task_title)}', ${sub.id})">
                          Inspect Code
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- Curriculum Roadmap Checklist for this Student -->
      <div class="card">
        <h3 style="font-size:16px; font-weight:800; color:var(--dark-navy); margin-bottom:12px;">
          🗺️ 23-Task Curriculum Checklist for ${this.escape(student.full_name)}
        </h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:10px;">
          ${roadmap.map(t => {
            let badge = '';
            if (t.status === 'APPROVED') {
              badge = '<span style="color:var(--emerald); font-weight:800;">✓ Approved</span>';
            } else if (t.status === 'SUBMITTED') {
              badge = '<span style="color:var(--gold-deep); font-weight:800;">⏳ Under Review</span>';
            } else if (t.status === 'IN_PROGRESS') {
              badge = '<span style="color:#2563eb; font-weight:800;">🚀 Active</span>';
            } else {
              badge = '<span style="color:var(--text-muted);">🔒 Locked</span>';
            }

            return `
              <div style="border:1px solid var(--border); border-radius:8px; padding:10px 12px; background:white; font-size:12px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span class="step-badge step-badge-${t.module.toLowerCase()}">${t.module}</span>
                  ${badge}
                </div>
                <div style="font-weight:700; color:var(--dark-navy); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                  Task ${t.sequence_order}: ${this.escape(t.title)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  async adminDecide(submissionId, action) {
    const feedbackInput = document.getElementById(`feedback_${submissionId}`);
    const feedback = feedbackInput ? feedbackInput.value.trim() : '';

    try {
      const res = await fetch(`${API_BASE}/api/admin/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          submission_id: submissionId,
          action,
          feedback,
          admin_id: this.currentUser.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');

      const isApproved = action === 'APPROVE';
      this.showToast(
        data.message || (isApproved ? '✓ Submission approved! Next task unlocked for student.' : '⚠️ Changes requested. Student notified.'),
        isApproved ? 'success' : 'warning',
        isApproved ? 'Milestone Approved' : 'Feedback Dispatched'
      );
      await this.loadAdminPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Review Failed');
    }
  },

  viewCodeModal(title, subId) {
    const sub = (this.selectedStudentPortfolio && this.selectedStudentPortfolio.submissions || []).find(s => s.id === subId);
    if (!sub) return;

    const modal = document.getElementById('imagePreviewModal');
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div style="background:white; border-radius:12px; max-width:800px; width:100%; padding:24px; position:relative;" onclick="event.stopPropagation()">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
          <h3 style="font-size:17px; font-weight:800; color:var(--dark-navy);">${this.escape(title)} - Submitted Code</h3>
          <button style="background:none; border:none; font-size:24px; cursor:pointer;" onclick="app.closeModal('imagePreviewModal')">&times;</button>
        </div>
        <textarea class="code-box" readonly style="height:320px;">${this.escape(sub.code_html || sub.sample_code_text || 'No code text')}</textarea>
        ${sub.output_url ? `
          <div style="margin-top:14px;">
            <strong style="font-size:12.5px; display:block; margin-bottom:6px;">Submitted Screenshot:</strong>
            <img src="${sub.output_url}" style="max-width:100%; max-height:220px; border-radius:6px; border:1px solid var(--border);">
          </div>
        ` : ''}
      </div>
    `;
  },

  async handleAdminEnroll(e) {
    e.preventDefault();
    const full_name = document.getElementById('addName').value.trim();
    const username = document.getElementById('addUsername').value.trim();
    const password = document.getElementById('addPassword').value.trim();
    const joining_date = document.getElementById('addJoiningDate').value;

    try {
      const res = await fetch(`${API_BASE}/api/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          full_name,
          username,
          password,
          joining_date
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrollment failed');

      // Clear form inputs
      const addNameEl = document.getElementById('addName');
      const addUserEl = document.getElementById('addUsername');
      const addPassEl = document.getElementById('addPassword');
      if (addNameEl) addNameEl.value = '';
      if (addUserEl) addUserEl.value = '';
      if (addPassEl) addPassEl.value = '';

      // Reset sidebar filter so the new student is immediately visible in the directory
      this.sidebarFilter = 'all';
      this.sidebarSearch = '';
      if (data.student_id) {
        this.selectedStudentId = Number(data.student_id);
      }
      this.adminMobileTab = 'workspace';

      this.closeModal('addStudentModal');
      await this.loadAdminPortal();
      if (data.student_id) {
        await this.selectStudent(Number(data.student_id));
      }

      this.showToast(
        `✓ ${full_name} (@${username}) enrolled successfully & Task 1 assigned!`,
        'success',
        'Student Enrolled'
      );
    } catch (err) {
      this.showToast(err.message, 'error', 'Enrollment Failed');
    }
  },

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  previewImage(url) {
    const modal = document.getElementById('imagePreviewModal');
    const img = document.getElementById('previewModalImg');
    if (modal && img) {
      img.src = url;
      modal.style.display = 'flex';
    }
  },

  copyCodeToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
      navigator.clipboard.writeText(el.value).then(() => {
        this.showToast('Student source code copied to clipboard!', 'success', 'Copied');
      }).catch(() => {
        el.select();
        document.execCommand('copy');
        this.showToast('Student source code copied to clipboard!', 'success', 'Copied');
      });
    }
  },

  togglePasswordVisibility(id, btn) {
    const input = document.getElementById(id);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '🙈 Hide';
    } else {
      input.type = 'password';
      btn.innerHTML = '👁️ Show';
    }
  },

  async promptResetPassword(studentId, username) {
    const newPass = prompt(`Enter new password for @${username}:`, 'student123');
    if (!newPass || !newPass.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          student_id: studentId,
          new_password: newPass.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password reset failed');

      this.showDialog({
        type: 'success',
        title: '✓ Password Reset Successfully',
        message: `Password for <strong>@${this.escape(username)}</strong> has been updated to: <br><div style="margin:12px 0; background:#f1f5f9; padding:8px 14px; border-radius:6px; font-weight:800; font-size:15px; letter-spacing:0.5px; font-family:monospace; color:var(--dark-navy); text-align:center;">${this.escape(newPass.trim())}</div>The student can now log in with this password immediately.`,
        confirmText: 'Done'
      });
    } catch (err) {
      this.showToast(err.message, 'error', 'Reset Failed');
    }
  },

  // --------------------------------------------------------------------------
  // Modern Toast Notification System (replaces invasive alert popups)
  // --------------------------------------------------------------------------
  showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const defaultTitles = {
      success: 'Success',
      error: 'Error',
      warning: 'Attention',
      info: 'GrowthNest Notice'
    };

    const toast = document.createElement('div');
    toast.className = `toast-card toast-${type}`;
    toast.innerHTML = `
      <div class="toast-icon-badge">${icons[type] || 'ℹ️'}</div>
      <div class="toast-body">
        <div class="toast-title">${this.escape(title || defaultTitles[type] || 'Notification')}</div>
        <div class="toast-message">${this.escape(message)}</div>
      </div>
      <button class="toast-close-btn" onclick="this.parentElement.remove()" title="Close notification">&times;</button>
      <div class="toast-progress-bar"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
    }, 3800);
  },

  // --------------------------------------------------------------------------
  // Modern Interactive Dialog Box System (replaces window.alert & window.confirm)
  // --------------------------------------------------------------------------
  dialogCallback: null,

  showDialog({ title, message, type = 'info', confirmText = 'OK', cancelText = null, onConfirm = null }) {
    const dialogBackdrop = document.getElementById('globalAppDialog');
    const titleEl = document.getElementById('dialogTitle');
    const msgEl = document.getElementById('dialogMessage');
    const iconWrap = document.getElementById('dialogIconWrap');
    const iconText = document.getElementById('dialogIconText');
    const confirmBtn = document.getElementById('dialogConfirmBtn');
    const cancelBtn = document.getElementById('dialogCancelBtn');

    if (!dialogBackdrop) return;

    const iconMap = {
      success: { icon: '✓', class: 'dialog-icon-success', btnClass: 'btn-primary' },
      lock: { icon: '🔒', class: 'dialog-icon-lock', btnClass: 'btn-gold' },
      warning: { icon: '⚠️', class: 'dialog-icon-warning', btnClass: 'btn-gold' },
      error: { icon: '✕', class: 'dialog-icon-danger', btnClass: 'btn-danger' },
      info: { icon: '💡', class: 'dialog-icon-info', btnClass: 'btn-primary' }
    };

    const cfg = iconMap[type] || iconMap.info;
    iconWrap.className = `dialog-icon-circle ${cfg.class}`;
    iconText.textContent = cfg.icon;

    titleEl.textContent = title || 'Notification';
    msgEl.innerHTML = message || '';

    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${cfg.btnClass}`;

    if (cancelText) {
      cancelBtn.style.display = 'inline-flex';
      cancelBtn.textContent = cancelText;
    } else {
      cancelBtn.style.display = 'none';
    }

    this.dialogCallback = onConfirm;
    dialogBackdrop.style.display = 'flex';
  },

  closeDialog() {
    const dialogBackdrop = document.getElementById('globalAppDialog');
    if (dialogBackdrop) dialogBackdrop.style.display = 'none';
    this.dialogCallback = null;
  },

  confirmDialog() {
    const cb = this.dialogCallback;
    this.closeDialog();
    if (typeof cb === 'function') {
      cb();
    }
  },

  closeDialogOnBackdrop(e) {
    if (e.target.id === 'globalAppDialog') {
      this.closeDialog();
    }
  },

  insertFeedback(subId, text) {
    const el = document.getElementById('feedback_' + subId);
    if (el) {
      el.value = text;
      el.focus();
      this.showToast('Preset feedback template inserted.', 'info', 'Feedback Template');
    }
  },

  getInitials(name) {
    if (!name) return 'GN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },

  escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

// Initialize App on DOM Load
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

// Close dialogs and modals on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    app.closeDialog();
    app.closeModal('addStudentModal');
    app.closeModal('imagePreviewModal');
  }
});

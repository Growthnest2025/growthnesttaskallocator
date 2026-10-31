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
  currentView: 'home', // 'home', 'student-auth', 'intern-auth', 'employee-auth', 'admin-auth', 'student-portal', 'staff-portal', 'admin-portal'
  authTab: 'login', // 'login' or 'register'
  authRole: 'student', // 'student', 'intern', 'employee', 'admin'

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
  adminActiveBlock: 'students', // 'students', 'interns', 'employees', 'reviews', 'finance'
  adminCategoryFilter: 'all', // 'all', 'student', 'intern', 'employee'
  sidebarFilter: 'all', // 'all', 'pending', 'completed'
  sidebarSearch: '',
  adminMobileTab: 'students', // 'students' or 'workspace' (responsive mobile tabs)
  pendingReviewsList: [],

  // Staff Attendance State
  staffAttendanceSummary: null,
  adminAttendanceDate: '',
  adminAttendanceLedger: null,
  selectedStaffAttendanceHistory: {},

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
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-primary btn-sm" onclick="app.showRoleAuth('student')">🎓 Student Login</button>
          <button class="btn btn-outline btn-sm" style="border-color:#f59e0b; color:#b45309;" onclick="app.showRoleAuth('intern')">💼 Intern Login</button>
          <button class="btn btn-outline btn-sm" style="border-color:#3b82f6; color:#1d4ed8;" onclick="app.showRoleAuth('employee')">👔 Staff Login</button>
          <button class="btn btn-outline btn-sm nav-admin-btn" onclick="app.showRoleAuth('admin')">🛡️ Admin</button>
        </div>
      `;
      return;
    }

    const u = this.currentUser;
    const isAdm = u.role === 'admin';
    const isEmp = u.user_type === 'employee';
    const isInt = u.user_type === 'intern';
    const pendingTotal = this.allStudents ? this.allStudents.filter(s => s.pending_count > 0).length : 0;

    let roleTag = '🎓 Student';
    if (isAdm) roleTag = '🛡️ Admin';
    else if (isEmp) roleTag = '👔 Staff';
    else if (isInt) roleTag = '💼 Intern';

    nav.innerHTML = `
      ${isAdm && pendingTotal > 0 ? `
        <button class="nav-notif-btn has-pending" onclick="app.setAdminActiveBlock('reviews')" title="${pendingTotal} submission(s) awaiting review! Click to review now.">
          🔔 <span class="notif-badge-pill">${pendingTotal} New</span>
        </button>
      ` : ''}
      <div class="user-pill ${isAdm ? 'admin-pill' : (isEmp ? 'badge-employee' : 'student-pill')}">
        ${!isAdm && u.avatar_url ? `<img src="${u.avatar_url}" alt="" class="nav-avatar-img">` : ''}
        ${isAdm ? '🛡️ Admin Hub' : `${roleTag}: ${this.escape(u.full_name || u.username)}`}
      </div>
      <button class="nav-logout-btn" onclick="app.logout()">Sign Out</button>
    `;
  },

  // --------------------------------------------------------------------------
  // 1. HOME SCREEN (Clean Landing with 4 Distinct Portals)
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
        <h1>GrowthNest Tech Solutions <span>Task & Operations Portal</span></h1>
        <p>
          Integrated platform for <strong>Course Students, Interns, Staff & Mentors</strong>. Track progressive 23-task engineering curriculums, evaluate live submissions, and manage course fees & staff payroll.
        </p>
      </section>

      <!-- 4 Distinct Portals Grid: Students, Interns, Staff, Admin -->
      <div class="portal-choices-grid">
        <!-- 1. Course Student Portal -->
        <div class="portal-choice-card student-theme" onclick="app.showRoleAuth('student')">
          <div>
            <div class="portal-card-icon student-bg">🎓</div>
            <span class="badge-role badge-student" style="margin-bottom:8px;">23-Task Curriculum</span>
            <h3>Course Student Portal</h3>
            <p>Access your sequential curriculum roadmap, write & submit code, upload output screenshots, and view tuition fee details.</p>
          </div>
          <button class="btn btn-primary" style="width: 100%; padding: 12px;">
            Access Student Portal &rarr;
          </button>
        </div>

        <!-- 2. Intern Portal -->
        <div class="portal-choice-card intern-theme" onclick="app.showRoleAuth('intern')">
          <div>
            <div class="portal-card-icon intern-bg">💼</div>
            <span class="badge-role badge-intern" style="margin-bottom:8px;">Internship Track</span>
            <h3>Internship Portal</h3>
            <p>Access assigned internship tasks, submit project milestones, receive mentor feedback, and track your fee/stipend status.</p>
          </div>
          <button class="btn btn-primary" style="width: 100%; padding: 12px; background:#f59e0b; border-color:#d97706;">
            Access Intern Portal &rarr;
          </button>
        </div>

        <!-- 3. Employee / Staff Portal -->
        <div class="portal-choice-card employee-theme" onclick="app.showRoleAuth('employee')">
          <div>
            <div class="portal-card-icon employee-bg">👔</div>
            <span class="badge-role badge-employee" style="margin-bottom:8px;">GrowthNest Team</span>
            <h3>Staff & Mentor Portal</h3>
            <p>Access instructor dashboard, mentor credentials, department profile, and view your monthly salary disbursement records.</p>
          </div>
          <button class="btn btn-primary" style="width: 100%; padding: 12px; background:#2563eb; border-color:#1d4ed8;">
            Access Staff Portal &rarr;
          </button>
        </div>

        <!-- 4. Admin Portal -->
        <div class="portal-choice-card admin-theme" onclick="app.showRoleAuth('admin')">
          <div>
            <div class="portal-card-icon admin-bg">🛡️</div>
            <span class="badge-role" style="background:#f1f5f9; color:#0f172a; border:1px solid #cbd5e1; margin-bottom:8px;">Executive Hub</span>
            <h3>Admin & Mentor Hub</h3>
            <p>Manage separate blocks for Students, Interns & Staff, evaluate code submissions, and oversee fee collection & staff payroll.</p>
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
  // 2. DISTINCT AUTHENTICATION SCREENS (Student, Intern, Staff, Admin)
  // --------------------------------------------------------------------------
  showRoleAuth(role = 'student', errorMsg = '', successMsg = '') {
    this.authRole = role;
    this.currentView = `${role}-auth`;
    const main = document.getElementById('appRoot');
    const today = new Date().toISOString().split('T')[0];

    let icon = '🎓';
    let title = 'Course Student Portal';
    let subtitle = 'Sign in to access your 23-task curriculum roadmap, submit code & track fees';
    let btnClass = 'btn-primary';
    let btnText = 'Sign In to Student Portal &rarr;';
    let userPlaceholder = 'Enter student username (e.g. Berlin2005)';

    if (role === 'intern') {
      icon = '💼';
      title = 'Internship Training Portal';
      subtitle = 'Sign in to access assigned internship projects, task reviews & stipend details';
      btnClass = 'btn-primary" style="background:#f59e0b; border-color:#d97706;';
      btnText = 'Sign In to Intern Portal &rarr;';
      userPlaceholder = 'Enter intern username (e.g. intern_suresh)';
    } else if (role === 'employee') {
      icon = '👔';
      title = 'Staff & Mentor Portal';
      subtitle = 'Sign in to access staff profile, instructor credentials & salary records';
      btnClass = 'btn-primary" style="background:#2563eb; border-color:#1d4ed8;';
      btnText = 'Sign In to Staff Portal &rarr;';
      userPlaceholder = 'Enter staff username (e.g. trainer_praveen)';
    } else if (role === 'admin') {
      icon = '🛡️';
      title = 'Admin & Executive Hub';
      subtitle = 'Sign in to evaluate submissions, manage students, interns, staff & financials';
      btnClass = 'btn-gold';
      btnText = 'Sign In as Admin / Mentor &rarr;';
      userPlaceholder = 'Enter admin username (e.g. admin)';
    }

    main.innerHTML = `
      <div class="auth-box">
        <button class="back-role-btn" onclick="app.showHome()">&larr; Back to Home</button>

        <div style="text-align: center; margin-bottom: 20px;">
          <img src="logo.png" alt="GrowthNest Logo" style="height:52px; width:auto; border-radius:8px; margin-bottom:10px;">
          <div style="font-size:28px; margin-bottom:6px;">${icon}</div>
          <h2 style="font-size: 20px; font-weight: 800; color: var(--dark-navy);">${title}</h2>
          <p style="font-size: 13px; color: var(--text-muted);">${subtitle}</p>
        </div>

        ${errorMsg ? `<div class="alert-box alert-danger">⚠️ ${this.escape(errorMsg)}</div>` : ''}
        ${successMsg ? `<div class="alert-box alert-success">✓ ${this.escape(successMsg)}</div>` : ''}

        <form onsubmit="app.handleLogin(event, '${role}')">
          <div class="form-group">
            <label>Username / Login ID</label>
            <input type="text" id="loginUsername" class="form-input" required placeholder="${userPlaceholder}" autocomplete="username">
          </div>
          <div class="form-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label style="margin-bottom:0;">Password</label>
              <button type="button" onclick="app.togglePasswordVisibility('loginPassword', this)" style="background:none; border:none; color:var(--emerald-dark); font-size:12px; font-weight:700; cursor:pointer;">👁️ Show Password</button>
            </div>
            <input type="password" id="loginPassword" class="form-input" required placeholder="Enter your password" autocomplete="current-password">
          </div>
          <button type="submit" class="btn ${btnClass}" style="width: 100%; padding: 12px;">${btnText}</button>
        </form>

        <div style="text-align:center; margin-top:16px; font-size:12.5px; color:#64748b; line-height:1.5;">
          ${role === 'student' ? 'Enrolled by GrowthNest Admin? Sign in with your registered username & password.<br><span style="font-size:11.5px; color:#94a3b8;">New student enrollment & tuition fee setup is managed directly by Admin.</span>' : ''}
          ${role === 'intern' ? 'GrowthNest Internship Program &bull; Tasks & stipend/fees are allocated by Admin.' : ''}
          ${role === 'employee' ? 'GrowthNest Staff & Mentor Portal &bull; Salaries & profiles are managed by Admin.' : ''}
          ${role === 'admin' ? 'Authorized Management & Mentors Only &bull; Tirunelveli Center' : ''}
        </div>
      </div>
    `;
  },

  showStudentAuth(errorMsg = '', successMsg = '') {
    this.showRoleAuth('student', errorMsg, successMsg);
  },

  showAdminAuth(errorMsg = '') {
    this.showRoleAuth('admin', errorMsg);
  },

  setStudentAuthTab(tab) {
    this.authTab = tab;
    this.showRoleAuth('student');
  },

  async handleLogin(e, role = 'student') {
    e.preventDefault();
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value.trim();
    await this.quickLogin(u, p, role);
  },

  async quickLogin(username, password, expectedRole = null) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (expectedRole === 'admin' && data.user.role !== 'admin') {
        throw new Error('Access denied. This login is reserved for GrowthNest Administrators only.');
      }

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('gn_token', this.token);
      localStorage.setItem('gn_user', JSON.stringify(this.currentUser));

      this.renderNav();
      await this.loadPortal();
    } catch (err) {
      this.showRoleAuth(expectedRole || this.authRole || 'student', err.message);
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
    } else if (this.currentUser.user_type === 'employee') {
      await this.loadStaffPortal();
    } else {
      await this.loadStudentPortal();
    }
  },

  // --------------------------------------------------------------------------
  // STAFF / EMPLOYEE PORTAL
  // --------------------------------------------------------------------------
  async loadStaffPortal() {
    this.currentView = 'staff-portal';
    await this.loadStaffAttendance();
    this.renderStaffPortal();
  },

  async loadStaffAttendance() {
    try {
      const res = await fetch(`${API_BASE}/api/staff/attendance/my-summary`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        this.staffAttendanceSummary = await res.json();
      }
    } catch (err) {
      console.error('Failed to load staff attendance:', err);
    }
  },

  async handleStaffPunchIn(status = 'PRESENT') {
    let notes = '';
    if (status !== 'PRESENT') {
      notes = prompt(status === 'LEAVE' ? 'Reason for leave (Optional):' : 'Notes for half-day:');
      if (notes === null) return;
    } else {
      notes = prompt('Check-in note (Optional, e.g. Tirunelveli Office / Work from Home):', 'Office');
      if (notes === null) return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/staff/attendance/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ status, notes: notes || '' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record attendance');
      this.showToast(data.message, 'success', 'Attendance Recorded');
      await this.loadStaffPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Error');
    }
  },

  async handleStaffPunchOut() {
    if (!confirm('Confirm Punch-Out for today?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/staff/attendance/check-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to punch out');
      this.showToast(data.message, 'success', 'Punched Out');
      await this.loadStaffPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Error');
    }
  },

  renderStaffPortal() {
    const main = document.getElementById('appRoot');
    const u = this.currentUser;
    const salaryStatus = u.salary_status || 'PENDING';
    const att = this.staffAttendanceSummary || {
      today: null,
      today_date: new Date().toISOString().slice(0, 10),
      month_stats: { present_days: 0, half_days: 0, leave_days: 0, total_recorded: 0 },
      history: []
    };

    const todayRec = att.today;
    const isMarked = !!todayRec;
    const attStatus = todayRec ? todayRec.status : 'NOT_MARKED';
    const checkIn = todayRec ? todayRec.check_in_time : null;
    const checkOut = todayRec ? todayRec.check_out_time : null;

    let statusBadge = '<span class="attendance-badge-pending">⏳ Not Marked Yet for Today</span>';
    if (attStatus === 'PRESENT') {
      statusBadge = `<span class="attendance-badge-present">🟢 PRESENT ${checkIn ? `(${checkIn})` : ''}</span>`;
    } else if (attStatus === 'LEAVE') {
      statusBadge = '<span class="attendance-badge-leave">🏖️ ON LEAVE</span>';
    } else if (attStatus === 'HALF_DAY') {
      statusBadge = `<span class="attendance-badge-half">🌓 HALF DAY ${checkIn ? `(${checkIn})` : ''}</span>`;
    }

    const todayDateFormatted = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    main.innerHTML = `
      <!-- Staff Profile Hero -->
      <div class="student-hero-banner">
        <div style="display:flex; align-items:center; gap:14px;">
          <div class="student-avatar-wrapper" onclick="document.getElementById('avatarFileInput').click()" title="Click to upload profile photo">
            ${u.avatar_url ? `
              <img src="${u.avatar_url}" alt="Profile" class="student-avatar-img">
            ` : `
              <div class="student-avatar" style="width:52px; height:52px; font-size:18px; background:#eff6ff; color:#1e40af; border-color:#bfdbfe;">
                ${this.getInitials(u.full_name)}
              </div>
            `}
            <div class="avatar-camera-pill" title="Upload Photo">📷</div>
            <input type="file" id="avatarFileInput" accept="image/*" style="display:none;" onchange="app.handleAvatarUpload(event)">
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size:20px; font-weight:800; color:var(--dark-navy);">${this.escape(u.full_name)}</h2>
              <span class="badge-role badge-employee">👔 Staff / Employee</span>
            </div>
            <div style="font-size:13px; color:var(--text-muted); display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;">
              <span>@${this.escape(u.username)}</span>
              <span>&bull;</span>
              <span>💼 ${this.escape(u.designation || 'Staff')}</span>
              <span>&bull;</span>
              <span>🏢 ${this.escape(u.department || 'GrowthNest')}</span>
              <span>&bull;</span>
              <span style="color:#2563eb; font-weight:700;">⏱️ Service: ${u.days_enrolled} Days</span>
              <span>&bull;</span>
              <button type="button" class="btn btn-outline" style="padding:1px 8px; font-size:11px; height:auto; line-height:1.4; border-radius:12px;" onclick="document.getElementById('avatarFileInput').click()">📷 Change Photo</button>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:12px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">Designation</div>
          <div style="font-size:18px; font-weight:800; color:#1e40af;">${this.escape(u.designation || 'Staff')}</div>
        </div>
      </div>

      <!-- DAILY ATTENDANCE & PUNCH-IN CARD -->
      <div class="card attendance-hero-card">
        <div class="attendance-card-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:24px;">📅</span>
            <div>
              <h3 style="font-size:17px; font-weight:800; color:var(--dark-navy);">Daily Staff Attendance & Punch Register</h3>
              <p style="font-size:12.5px; color:var(--text-muted); margin:0;">
                Today: <strong>${todayDateFormatted}</strong> &bull; Indian Standard Time (IST)
              </p>
            </div>
          </div>
          <div>
            ${statusBadge}
          </div>
        </div>

        <!-- Punch-In / Action Strip -->
        <div class="attendance-action-strip">
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--dark-navy);">
              ${isMarked ? (checkOut ? `✓ Day Completed (Punch-out: ${checkOut})` : (attStatus === 'PRESENT' ? `🟢 Currently Checked-In since ${checkIn}` : `Today's Status: ${attStatus}`)) : 'Mark your daily attendance for today:'}
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
              ${todayRec && todayRec.notes ? `📝 Note: <em>"${this.escape(todayRec.notes)}"</em>` : 'Daily check-in maintains your active working hours and monthly payroll attendance.'}
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            ${!isMarked ? `
              <button class="btn btn-primary" style="background:#16a34a; border-color:#15803d;" onclick="app.handleStaffPunchIn('PRESENT')">
                ✅ Punch In / Mark Present
              </button>
              <button class="btn btn-outline" style="border-color:#f59e0b; color:#b45309;" onclick="app.handleStaffPunchIn('HALF_DAY')">
                🌓 Half Day
              </button>
              <button class="btn btn-outline" style="border-color:#ef4444; color:#dc2626;" onclick="app.handleStaffPunchIn('LEAVE')">
                🏖️ Mark Leave
              </button>
            ` : (attStatus === 'PRESENT' && !checkOut ? `
              <button class="btn btn-secondary" onclick="app.handleStaffPunchOut()">
                🚪 Punch Out / End Day
              </button>
              <button class="btn btn-outline btn-sm" onclick="app.handleStaffPunchIn('PRESENT')">
                ✏️ Edit Note
              </button>
            ` : `
              <span style="font-size:12px; color:#15803d; font-weight:700;">✓ Recorded</span>
              <button class="btn btn-outline btn-sm" onclick="app.handleStaffPunchIn('${attStatus}')">
                ✏️ Update
              </button>
            `)}
          </div>
        </div>

        <!-- Monthly Attendance Metrics -->
        <div class="attendance-metric-grid">
          <div class="attendance-metric-box">
            <div class="metric-val" style="color:#15803d;">${att.month_stats.present_days || 0}</div>
            <div class="metric-lbl">Days Present This Month</div>
          </div>
          <div class="attendance-metric-box">
            <div class="metric-val" style="color:#b45309;">${att.month_stats.half_days || 0}</div>
            <div class="metric-lbl">Half Days</div>
          </div>
          <div class="attendance-metric-box">
            <div class="metric-val" style="color:#b91c1c;">${att.month_stats.leave_days || 0}</div>
            <div class="metric-lbl">Leaves Taken</div>
          </div>
          <div class="attendance-metric-box">
            <div class="metric-val" style="color:#2563eb;">${att.history.length || 0}</div>
            <div class="metric-lbl">Total Days Logged</div>
          </div>
        </div>

        <!-- Attendance History Table -->
        ${att.history && att.history.length > 0 ? `
          <div style="margin-top:10px;">
            <div style="font-size:13px; font-weight:700; color:var(--dark-navy); margin-bottom:8px;">
              📋 My Recent Attendance History (Last ${Math.min(att.history.length, 15)} Logged Days)
            </div>
            <div class="table-wrapper" style="max-height:220px; overflow-y:auto;">
              <table class="staff-att-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check-In</th>
                    <th>Check-Out</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${att.history.slice(0, 15).map(h => `
                    <tr>
                      <td><strong>${h.attendance_date}</strong></td>
                      <td>
                        <span class="status-pill status-${h.status === 'PRESENT' ? 'paid' : (h.status === 'LEAVE' ? 'pending' : 'partial')}" style="font-size:10px; padding:2px 8px;">
                          ${h.status}
                        </span>
                      </td>
                      <td>${h.check_in_time || '—'}</td>
                      <td>${h.check_out_time || '—'}</td>
                      <td style="color:#64748b;">${this.escape(h.notes || '—')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Salary & Compensation Card -->
      <div class="salary-summary-card accent-indigo">
        <div class="summary-card-header">
          <div class="summary-card-title">
            <span>💰</span>
            <span>My Compensation & Salary Record</span>
            <span class="status-pill status-${salaryStatus.toLowerCase()}">${salaryStatus}</span>
          </div>
          <div style="font-size:12.5px; color:#64748b;">
            Last Updated: <strong>${u.salary_date || 'Current Month'}</strong>
          </div>
        </div>

        <div class="financial-grid-4">
          <div class="financial-box">
            <span class="financial-lbl">Monthly Salary</span>
            <span class="financial-val" style="color:#1e40af;">₹${Number(u.salary_amount || 0).toLocaleString()}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Payout Status</span>
            <span class="financial-val ${salaryStatus === 'PAID' ? 'val-green' : 'val-amber'}">${salaryStatus}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Payout Date</span>
            <span class="financial-val" style="font-size:15px;">${u.salary_date || '—'}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Payment Mode</span>
            <span class="financial-val" style="font-size:15px;">${this.escape(u.payment_mode || 'Bank Transfer')}</span>
          </div>
        </div>

        ${u.salary_notes ? `
          <div class="financial-notes-bar">
            <strong>Salary Remarks:</strong> <span>${this.escape(u.salary_notes)}</span>
          </div>
        ` : ''}
      </div>

      <!-- Staff Hub / Guidelines -->
      <div class="card" style="margin-top:20px;">
        <h3 style="font-size:16px; font-weight:800; color:var(--dark-navy); margin-bottom:12px;">
          🏢 GrowthNest Tech Solutions Employee Dashboard
        </h3>
        <p style="font-size:13.5px; color:#475569; line-height:1.6;">
          Welcome to your GrowthNest staff portal. Your daily attendance, monthly salary disbursements, and company profile are managed here. For questions regarding payroll, advances, or training batch allocations, please reach out directly to the administrator.
        </p>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // 3. STUDENT PORTAL (Progressive 23-Task Workflow)
  // --------------------------------------------------------------------------
  async loadStudentPortal() {
    this.currentView = 'student-portal';
    const main = document.getElementById('appRoot');
    main.innerHTML = `<p style="text-align:center; padding:40px; color:var(--text-muted);">Loading your curriculum & tasks...</p>`;

    try {
      const [roadmapRes, feeRes] = await Promise.all([
        fetch(`${API_BASE}/api/student/roadmap?student_id=${this.currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        }),
        fetch(`${API_BASE}/api/student/fee-installments?student_id=${this.currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        })
      ]);

      if (!roadmapRes.ok) throw new Error('Failed to load student roadmap');
      const data = await roadmapRes.json();

      if (feeRes.ok) {
        this.studentFeeData = await feeRes.json();
        if (this.studentFeeData) {
          this.currentUser.total_fees = this.studentFeeData.total_fees;
          this.currentUser.fees_paid = this.studentFeeData.fees_paid;
          this.currentUser.pending_fees = this.studentFeeData.pending_fees;
          this.currentUser.fees_status = this.studentFeeData.fees_status;
          this.currentUser.course_duration = this.studentFeeData.course_duration;
          this.currentUser.monthly_fee = this.studentFeeData.monthly_fee;
          this.currentUser.duration_months = this.studentFeeData.duration_months;
        }
      }

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
    const isIntern = u.user_type === 'intern';

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
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="font-size:20px; font-weight:800; color:var(--dark-navy);">${this.escape(u.full_name)}</h2>
              ${isIntern ? '<span class="badge-role badge-intern">💼 Intern</span>' : '<span class="badge-role badge-student">🎓 Student</span>'}
            </div>
            <div style="font-size:13px; color:var(--text-muted); display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;">
              <span>@${this.escape(u.username)}</span>
              <span>&bull;</span>
              <span style="color:var(--emerald-dark); font-weight:700;">⏱️ Day ${u.days_enrolled}</span>
              <span>&bull;</span>
              <span>${this.escape(u.course_track || (isIntern ? 'Frontend Internship' : 'Frontend Development'))}</span>
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

      <!-- Month-End / Overdue Fee Reminder Banner -->
      ${this.studentFeeData && this.studentFeeData.reminder_message ? `
        <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1.5px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 28px;">🔔</div>
            <div>
              <div style="font-weight: 800; font-size: 14.5px; color: #92400e;">
                Monthly Fee Due Reminder
              </div>
              <div style="font-size: 13px; color: #78350f; margin-top: 2px;">
                ${this.escape(this.studentFeeData.reminder_message)}
              </div>
            </div>
          </div>
          ${this.studentFeeData.next_due_installment ? `
            <button class="btn btn-primary btn-sm" onclick="app.openSubmitPaymentModal(${this.studentFeeData.next_due_installment.id}, '${this.escape(this.studentFeeData.next_due_installment.month_label)}', ${this.studentFeeData.next_due_installment.amount_due})">
              💳 Pay & Submit Reference
            </button>
          ` : ''}
        </div>
      ` : ''}

      <!-- Student's Own Fees Status Card -->
      <div class="fees-summary-card accent-emerald" style="margin-bottom:16px;">
        <div class="summary-card-header">
          <div class="summary-card-title">
            <span>💳</span>
            <span>Fee & Payment Status (${isIntern ? 'Internship Track' : 'Course Training'})</span>
            <span class="status-pill status-${(u.fees_status || 'PENDING').toLowerCase()}">${u.fees_status || 'PENDING'}</span>
          </div>
          ${u.pending_fees > 0 ? `
            <span style="font-size:12px; color:#b91c1c; font-weight:700;">
              ⚠️ ₹${Number(u.pending_fees || 0).toLocaleString()} Pending ${u.fees_due_date ? `(Due: ${u.fees_due_date})` : ''}
            </span>
          ` : `
            <span style="font-size:12px; color:#15803d; font-weight:700;">
              ✓ All fees fully cleared
            </span>
          `}
        </div>

        <div class="financial-grid-4">
          <div class="financial-box">
            <span class="financial-lbl">Total Fees</span>
            <span class="financial-val">₹${Number(u.total_fees || 0).toLocaleString()}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Amount Paid</span>
            <span class="financial-val val-green">₹${Number(u.fees_paid || 0).toLocaleString()}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Balance Due</span>
            <span class="financial-val ${u.pending_fees > 0 ? 'val-red' : 'val-green'}">
              ₹${Number(u.pending_fees || 0).toLocaleString()}
            </span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Payment Status</span>
            <span class="financial-val" style="font-size:15px; color:${u.fees_status === 'PAID' ? '#15803d' : '#b45309'};">
              ${u.fees_status || 'PENDING'}
            </span>
          </div>
        </div>

        ${u.payment_notes ? `
          <div class="financial-notes-bar">
            <strong>Payment Info:</strong> <span>${this.escape(u.payment_notes)}</span>
          </div>
        ` : ''}

        <!-- Monthly Installment Schedule for Student -->
        ${this.renderStudentInstallmentsSchedule()}
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
        <div class="revision-alert-box">
          <div class="revision-alert-header">
            <span class="revision-alert-badge">⚠️ Action Required &bull; Revisions Needed</span>
            <span class="revision-alert-time">${sub && sub.reviewed_at ? 'Reviewed on ' + sub.reviewed_at.split(' ')[0] : 'Needs Update'}</span>
          </div>
          <div class="revision-problem-card">
            <div class="revision-problem-title">
              <span>🔍</span>
              <strong>Mentor Feedback & Code Issues to Fix:</strong>
            </div>
            <div class="revision-problem-text">"${this.escape(sub ? sub.admin_feedback : 'Please review task requirements, fix code issues and resubmit.')}"</div>
          </div>
          <div class="revision-alert-footer">
            💡 <strong>How to resolve:</strong> Correct the issues mentioned above in the code submission box below and click <strong>Submit Task</strong>.
          </div>
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
              <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px;">Output Screenshot: <span style="color:#ef4444; font-size:12px;">* Required</span></label>
              <div class="compact-dropzone" onclick="document.getElementById('taskFilePicker').click()">
                📸 <span id="filePickedText">Attach Output Screenshot (.png/.jpg)</span>
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

    if (!file.type.startsWith('image/')) {
      return this.showToast('Please select a valid image file (.png, .jpg, .webp)', 'error', 'Invalid File');
    }

    const filePickedText = document.getElementById('filePickedText');
    if (filePickedText) filePickedText.innerText = `⏳ Processing ${file.name}...`;

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        this.currentOutputBase64 = canvas.toDataURL('image/jpeg', 0.85);
        this.currentOutputName = file.name;

        if (filePickedText) {
          filePickedText.innerHTML = `✓ Attached: <strong>${this.escape(file.name)}</strong>`;
        }
        this.showToast('Output screenshot attached successfully!', 'success', 'Screenshot Ready');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  },

  async submitActiveTask(taskId) {
    const code = document.getElementById('taskCodeInput').value;
    const notes = document.getElementById('taskNotesInput').value;

    if (!code.trim()) {
      this.showToast('Source code is required! Please paste or write your code before submitting.', 'warning', 'Code Required');
      const codeEl = document.getElementById('taskCodeInput');
      if (codeEl) codeEl.focus();
      return;
    }

    if (!this.currentOutputBase64) {
      this.showToast('Output screenshot is mandatory! Please upload a screenshot of your output page.', 'warning', 'Screenshot Required');
      const dropzone = document.querySelector('.compact-dropzone');
      if (dropzone) {
        dropzone.style.borderColor = '#ef4444';
        dropzone.style.background = '#fef2f2';
        setTimeout(() => {
          dropzone.style.borderColor = '';
          dropzone.style.background = '';
        }, 3500);
      }
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
          file_name: this.currentOutputName || 'screenshot.jpg'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      this.currentOutputBase64 = null;
      this.currentOutputName = null;

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

      // Load today's staff attendance ledger for admin
      if (!this.adminAttendanceDate) {
        this.adminAttendanceDate = new Date().toISOString().slice(0, 10);
      }
      await this.loadAdminAttendanceLedger(this.adminAttendanceDate);

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
      const [portRes, feeRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/student-portfolio?student_id=${studentId}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        }),
        fetch(`${API_BASE}/api/student/fee-installments?student_id=${studentId}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        })
      ]);

      if (portRes.ok) {
        this.selectedStudentPortfolio = await portRes.json();
        if (feeRes.ok) {
          const feeData = await feeRes.json();
          this.selectedStudentPortfolio.fee_installments = feeData.installments || [];
          this.selectedStudentPortfolio.fee_summary = feeData;
          if (this.selectedStudentPortfolio.student) {
            this.selectedStudentPortfolio.student.course_duration = feeData.course_duration;
            this.selectedStudentPortfolio.student.monthly_fee = feeData.monthly_fee;
            this.selectedStudentPortfolio.student.duration_months = feeData.duration_months;
            this.selectedStudentPortfolio.student.total_fees = feeData.total_fees;
            this.selectedStudentPortfolio.student.fees_paid = feeData.fees_paid;
            this.selectedStudentPortfolio.student.pending_fees = feeData.pending_fees;
            this.selectedStudentPortfolio.student.fees_status = feeData.fees_status;
          }
        }
        if (this.selectedStudentPortfolio && this.selectedStudentPortfolio.student && this.selectedStudentPortfolio.student.user_type === 'employee') {
          await this.fetchStaffAttendanceHistory(studentId);
        }
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

  setAdminActiveBlock(block) {
    this.adminActiveBlock = block;
    this.sidebarSearch = '';
    this.sidebarFilter = 'all';

    // Auto-select first member in this category if switching to directory blocks
    if (block === 'students') {
      const first = this.allStudents.find(s => (s.user_type || 'student') === 'student');
      if (first) {
        this.selectedStudentId = first.id;
        this.fetchStudentPortfolio(first.id).then(() => this.renderAdminPortal());
        return;
      }
    } else if (block === 'interns') {
      const first = this.allStudents.find(s => s.user_type === 'intern');
      if (first) {
        this.selectedStudentId = first.id;
        this.fetchStudentPortfolio(first.id).then(() => this.renderAdminPortal());
        return;
      }
    } else if (block === 'employees') {
      const first = this.allStudents.find(s => s.user_type === 'employee');
      if (first) {
        this.selectedStudentId = first.id;
        this.fetchStudentPortfolio(first.id).then(() => this.renderAdminPortal());
        return;
      }
    } else if (block === 'reviews') {
      this.fetchPendingReviews().then(() => this.renderAdminPortal());
      return;
    }
    this.renderAdminPortal();
  },

  async fetchPendingReviews() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/pending-reviews`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.pendingReviewsList = data.pending_reviews || [];
      }
    } catch (e) {
      console.error('Failed to fetch pending reviews', e);
    }
  },

  openAddMemberModal(type = 'student') {
    this.switchMemberTab(type);
    this.openModal('addStudentModal');
  },

  renderAdminPortal() {
    const main = document.getElementById('appRoot');
    const stats = this.adminStats || { total_students: 0, pending_reviews: 0, approved_tasks: 0, rejected_tasks: 0 };

    const courseStudents = this.allStudents.filter(s => (s.user_type || 'student') === 'student');
    const interns = this.allStudents.filter(s => s.user_type === 'intern');
    const employees = this.allStudents.filter(s => s.user_type === 'employee');

    const courseStudentsCount = courseStudents.length;
    const internsCount = interns.length;
    const employeesCount = employees.length;
    const pendingTotal = this.allStudents.filter(s => s.pending_count > 0).length;

    // Fees & Payroll totals
    const courseTotalFees = courseStudents.reduce((sum, s) => sum + Number(s.total_fees || 0), 0);
    const coursePaidFees = courseStudents.reduce((sum, s) => sum + Number(s.fees_paid || 0), 0);
    const coursePendingFees = Math.max(0, courseTotalFees - coursePaidFees);

    const internTotalFees = interns.reduce((sum, s) => sum + Number(s.total_fees || 0), 0);
    const internPaidFees = interns.reduce((sum, s) => sum + Number(s.fees_paid || 0), 0);
    const internPendingFees = Math.max(0, internTotalFees - internPaidFees);

    const staffTotalSalary = employees.reduce((sum, s) => sum + Number(s.salary_amount || 0), 0);
    const staffPaidSalary = employees.filter(s => s.salary_status === 'PAID').reduce((sum, s) => sum + Number(s.salary_amount || 0), 0);
    const staffPendingSalary = employees.filter(s => s.salary_status !== 'PAID').reduce((sum, s) => sum + Number(s.salary_amount || 0), 0);

    main.innerHTML = `
      <!-- Top Branding Strip -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap:wrap; gap:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <img src="logo.png" alt="GrowthNest Logo" style="height:44px; width:auto; border-radius:6px;">
          <div>
            <h2 style="font-size:22px; font-weight:800; color:var(--dark-navy);">GrowthNest Admin & Management Console</h2>
            <p style="font-size:13px; color:var(--text-muted);">Dedicated Management Blocks for Students, Interns, Staff & Finance</p>
          </div>
        </div>
      </div>

      <!-- MASTER BLOCK NAVIGATION (Separate Blocks) -->
      <nav class="admin-blocks-nav">
        <button class="admin-block-btn ${this.adminActiveBlock === 'students' ? 'active' : ''}" onclick="app.setAdminActiveBlock('students')">
          <span class="block-btn-icon">🎓</span>
          <span class="block-btn-text">Course Students</span>
          <span class="block-btn-count">${courseStudentsCount}</span>
        </button>
        <button class="admin-block-btn ${this.adminActiveBlock === 'interns' ? 'active' : ''}" onclick="app.setAdminActiveBlock('interns')">
          <span class="block-btn-icon">💼</span>
          <span class="block-btn-text">Interns</span>
          <span class="block-btn-count">${internsCount}</span>
        </button>
        <button class="admin-block-btn ${this.adminActiveBlock === 'employees' ? 'active' : ''}" onclick="app.setAdminActiveBlock('employees')">
          <span class="block-btn-icon">👔</span>
          <span class="block-btn-text">Staff & Mentors</span>
          <span class="block-btn-count">${employeesCount}</span>
        </button>
        <button class="admin-block-btn ${this.adminActiveBlock === 'reviews' ? 'active' : ''}" onclick="app.setAdminActiveBlock('reviews')">
          <span class="block-btn-icon">🔔</span>
          <span class="block-btn-text">Task Reviews</span>
          <span class="block-btn-count notif-count">${pendingTotal}</span>
        </button>
        <button class="admin-block-btn ${this.adminActiveBlock === 'finance' ? 'active' : ''}" onclick="app.setAdminActiveBlock('finance')">
          <span class="block-btn-icon">💰</span>
          <span class="block-btn-text">Fees & Payroll</span>
        </button>
      </nav>

      <!-- ACTIVE BLOCK CONTENT CONTAINER -->
      <div id="adminBlockContainer">
        ${(() => {
          if (this.adminActiveBlock === 'interns') {
            return this.renderInternsBlock(interns, internPaidFees, internPendingFees, stats);
          } else if (this.adminActiveBlock === 'employees') {
            return this.renderEmployeesBlock(employees, staffTotalSalary, staffPaidSalary, staffPendingSalary);
          } else if (this.adminActiveBlock === 'reviews') {
            return this.renderReviewsBlock(pendingTotal);
          } else if (this.adminActiveBlock === 'finance') {
            return this.renderFinanceBlock(courseTotalFees, coursePaidFees, coursePendingFees, internTotalFees, internPaidFees, internPendingFees, staffTotalSalary, staffPaidSalary, staffPendingSalary);
          } else {
            return this.renderStudentsBlock(courseStudents, coursePaidFees, coursePendingFees, stats);
          }
        })()}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // BLOCK 1: COURSE STUDENTS BLOCK
  // --------------------------------------------------------------------------
  renderStudentsBlock(students, feesPaid, feesPending, stats) {
    const filtered = students.filter(s => {
      const matchSearch = !this.sidebarSearch
        || s.full_name.toLowerCase().includes(this.sidebarSearch)
        || s.username.toLowerCase().includes(this.sidebarSearch);
      if (!matchSearch) return false;
      if (this.sidebarFilter === 'pending') return s.pending_count > 0;
      if (this.sidebarFilter === 'completed') return s.pending_count === 0;
      return true;
    });

    const pendingCount = students.filter(s => s.pending_count > 0).length;

    return `
      <!-- Block Header Card -->
      <div class="block-header-card">
        <div class="block-header-title">
          <h2><span>🎓</span> Course Students Training Block</h2>
          <p>Curriculum progression, 23 hands-on tasks, code submissions & tuition fee records</p>
        </div>
        <button class="btn btn-primary" onclick="app.openAddMemberModal('student')">
          ➕ Enroll Course Student
        </button>
      </div>

      <!-- Block KPI Bar -->
      <div class="admin-stats-strip">
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:var(--emerald-light); color:var(--emerald-deep);">🎓</div>
          <div>
            <div class="stat-metric-val">${students.length}</div>
            <div class="stat-metric-lbl">Total Course Students</div>
          </div>
        </div>
        <div class="stat-metric-card clickable" onclick="app.setSidebarFilter('pending')" style="border-color:${pendingCount > 0 ? 'var(--gold)' : 'var(--border)'};">
          <div class="stat-metric-icon" style="background:var(--gold-light); color:var(--gold-deep);">🔔</div>
          <div>
            <div class="stat-metric-val" style="color:${pendingCount > 0 ? 'var(--gold-deep)' : 'var(--text-main)'};">${pendingCount}</div>
            <div class="stat-metric-lbl">Submissions Awaiting Review &rarr;</div>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#dcfce7; color:#15803d;">💰</div>
          <div>
            <div class="stat-metric-val" style="color:#15803d;">₹${feesPaid.toLocaleString()}</div>
            <div class="stat-metric-lbl">Tuition Fees Collected</div>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#fee2e2; color:#b91c1c;">⚠️</div>
          <div>
            <div class="stat-metric-val" style="color:#b91c1c;">₹${feesPending.toLocaleString()}</div>
            <div class="stat-metric-lbl">Fees Balance Due</div>
          </div>
        </div>
      </div>

      <!-- Mobile View Switcher -->
      <div class="admin-mobile-nav-bar">
        <button class="mobile-nav-btn ${this.adminMobileTab === 'students' ? 'active' : ''}" onclick="app.setAdminMobileTab('students')">
          👥 Students (${students.length})
        </button>
        <button class="mobile-nav-btn ${this.adminMobileTab === 'workspace' ? 'active' : ''}" onclick="app.setAdminMobileTab('workspace')">
          📁 ${this.selectedStudentPortfolio && this.selectedStudentPortfolio.student ? this.escape(this.selectedStudentPortfolio.student.full_name) : 'Student Workspace'}
        </button>
      </div>

      <div class="admin-workspace-grid">
        <!-- LEFT: Students Directory -->
        <aside class="admin-sidebar-panel ${this.adminMobileTab === 'workspace' ? 'mobile-tab-hidden' : ''}">
          <div class="sidebar-header-row">
            <h3>🎓 Students Directory</h3>
            <span style="font-size:12px; font-weight:700; color:var(--text-muted);">${students.length} Enrolled</span>
          </div>

          <input type="text" class="sidebar-search-box" placeholder="🔍 Search student name..." value="${this.escape(this.sidebarSearch)}" oninput="app.handleSidebarSearch(event)">

          <div class="sidebar-filter-tabs">
            <button class="filter-tab-pill ${this.sidebarFilter === 'all' ? 'active' : ''}" onclick="app.setSidebarFilter('all')">
              All (${students.length})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'pending' ? 'active' : ''}" onclick="app.setSidebarFilter('pending')" style="${pendingCount > 0 ? 'color:var(--gold-deep); font-weight:800;' : ''}">
              🔔 Needs Review (${pendingCount})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'completed' ? 'active' : ''}" onclick="app.setSidebarFilter('completed')">
              ✓ Up to date
            </button>
          </div>

          <div class="admin-students-list">
            ${filtered.length === 0 ? `
              <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">
                No students match your search.
              </div>
            ` : filtered.map(s => {
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
                      <span class="student-notif-pill" onclick="event.stopPropagation(); app.selectStudentAndReview(${s.id})" title="Click to jump to review!">
                        <span class="pulse-dot"></span> 🔔 ${s.pending_count} New
                      </span>
                    ` : ''}
                  </div>
                  <div class="student-meta-strip">
                    <span>🗓️ Day ${s.days_enrolled} (${s.joining_date})</span>
                    <span style="font-weight:700; color:var(--emerald-dark);">${s.completed_count}/23 Tasks</span>
                  </div>
                  <div style="font-size:11px; color:#475569; display:flex; justify-content:space-between; align-items:center;">
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:60%;">📌 ${this.escape(s.current_task_title || 'Task 1')}</span>
                    <span class="status-pill status-${(s.fees_status || 'PENDING').toLowerCase()}" style="font-size:9.5px; padding:1px 6px;">Fees: ${s.fees_status || 'PENDING'}</span>
                  </div>
                  <div style="margin-top:7px; padding-top:6px; border-top:1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; color:#64748b;">
                      ${(s.total_fees || 0) > 0 ? `💰 Due: <b style="color:${((s.total_fees || 0) - (s.fees_paid || 0)) > 0 ? '#b91c1c' : '#15803d'};">₹${Math.max(0, (s.total_fees || 0) - (s.fees_paid || 0)).toLocaleString()}</b>` : '<span style="color:#d97706; font-weight:600;">⚠️ Fees not set</span>'}
                    </span>
                    <button type="button" class="btn btn-outline" style="font-size:11px; padding:2px 8px; height:auto; line-height:1.4;" onclick="event.stopPropagation(); app.openUpdateFeesModal(${s.id})">✏️ Fees</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </aside>

        <!-- RIGHT: Dedicated Student Workspace -->
        <section id="studentWorkspace" class="admin-detail-panel ${this.adminMobileTab === 'students' ? 'mobile-tab-hidden' : ''}">
          <button class="mobile-back-to-list-btn" onclick="app.setAdminMobileTab('students')">
            &larr; Back to Students Directory
          </button>
          ${this.renderStudentWorkspace()}
        </section>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // BLOCK 2: INTERNS MANAGEMENT BLOCK
  // --------------------------------------------------------------------------
  renderInternsBlock(interns, feesPaid, feesPending, stats) {
    const filtered = interns.filter(s => {
      const matchSearch = !this.sidebarSearch
        || s.full_name.toLowerCase().includes(this.sidebarSearch)
        || s.username.toLowerCase().includes(this.sidebarSearch);
      if (!matchSearch) return false;
      if (this.sidebarFilter === 'pending') return s.pending_count > 0;
      if (this.sidebarFilter === 'completed') return s.pending_count === 0;
      return true;
    });

    const pendingCount = interns.filter(s => s.pending_count > 0).length;

    return `
      <!-- Block Header Card -->
      <div class="block-header-card">
        <div class="block-header-title">
          <h2><span>💼</span> Industry Interns Management Block</h2>
          <p>Internship batches, real-time tasks, evaluation feedback & stipend/fees tracking</p>
        </div>
        <button class="btn btn-primary" style="background:#f59e0b; border-color:#d97706;" onclick="app.openAddMemberModal('intern')">
          ➕ Enroll New Intern
        </button>
      </div>

      <!-- Block KPI Bar -->
      <div class="admin-stats-strip">
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#fef3c7; color:#b45309;">💼</div>
          <div>
            <div class="stat-metric-val">${interns.length}</div>
            <div class="stat-metric-lbl">Total Interns Enrolled</div>
          </div>
        </div>
        <div class="stat-metric-card clickable" onclick="app.setSidebarFilter('pending')" style="border-color:${pendingCount > 0 ? 'var(--gold)' : 'var(--border)'};">
          <div class="stat-metric-icon" style="background:var(--gold-light); color:var(--gold-deep);">🔔</div>
          <div>
            <div class="stat-metric-val" style="color:${pendingCount > 0 ? 'var(--gold-deep)' : 'var(--text-main)'};">${pendingCount}</div>
            <div class="stat-metric-lbl">Intern Submissions Awaiting Review &rarr;</div>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#dcfce7; color:#15803d;">💰</div>
          <div>
            <div class="stat-metric-val" style="color:#15803d;">₹${feesPaid.toLocaleString()}</div>
            <div class="stat-metric-lbl">Fees / Stipend Collected</div>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#fee2e2; color:#b91c1c;">⚠️</div>
          <div>
            <div class="stat-metric-val" style="color:#b91c1c;">₹${feesPending.toLocaleString()}</div>
            <div class="stat-metric-lbl">Balance Pending</div>
          </div>
        </div>
      </div>

      <!-- Mobile View Switcher -->
      <div class="admin-mobile-nav-bar">
        <button class="mobile-nav-btn ${this.adminMobileTab === 'students' ? 'active' : ''}" onclick="app.setAdminMobileTab('students')">
          👥 Interns (${interns.length})
        </button>
        <button class="mobile-nav-btn ${this.adminMobileTab === 'workspace' ? 'active' : ''}" onclick="app.setAdminMobileTab('workspace')">
          📁 ${this.selectedStudentPortfolio && this.selectedStudentPortfolio.student ? this.escape(this.selectedStudentPortfolio.student.full_name) : 'Intern Workspace'}
        </button>
      </div>

      <div class="admin-workspace-grid">
        <!-- LEFT: Interns Directory -->
        <aside class="admin-sidebar-panel ${this.adminMobileTab === 'workspace' ? 'mobile-tab-hidden' : ''}">
          <div class="sidebar-header-row">
            <h3>💼 Interns Directory</h3>
            <span style="font-size:12px; font-weight:700; color:var(--text-muted);">${interns.length} Enrolled</span>
          </div>

          <input type="text" class="sidebar-search-box" placeholder="🔍 Search intern name..." value="${this.escape(this.sidebarSearch)}" oninput="app.handleSidebarSearch(event)">

          <div class="sidebar-filter-tabs">
            <button class="filter-tab-pill ${this.sidebarFilter === 'all' ? 'active' : ''}" onclick="app.setSidebarFilter('all')">
              All (${interns.length})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'pending' ? 'active' : ''}" onclick="app.setSidebarFilter('pending')" style="${pendingCount > 0 ? 'color:var(--gold-deep); font-weight:800;' : ''}">
              🔔 Needs Review (${pendingCount})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'completed' ? 'active' : ''}" onclick="app.setSidebarFilter('completed')">
              ✓ Up to date
            </button>
          </div>

          <div class="admin-students-list">
            ${filtered.length === 0 ? `
              <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">
                No interns enrolled yet. Click "+ Enroll New Intern" to add.
              </div>
            ` : filtered.map(s => {
              const isSelected = s.id === this.selectedStudentId;
              const hasPending = s.pending_count > 0;
              return `
                <div class="student-card-item ${isSelected ? 'selected' : ''}" onclick="app.selectStudentAndReview(${s.id})">
                  <div class="student-card-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                      ${s.avatar_url ? `
                        <img src="${s.avatar_url}" alt="" class="student-avatar-img" style="width:38px; height:38px;">
                      ` : `
                        <div class="student-avatar" style="background:#fef3c7; color:#b45309; border-color:#fde68a;">
                          ${this.getInitials(s.full_name)}
                        </div>
                      `}
                      <div>
                        <div class="student-name-text" style="display:flex; align-items:center; gap:6px;">
                          <span>${this.escape(s.full_name)}</span>
                          <span class="badge-role badge-intern" style="font-size:9.5px; padding:1px 5px;">Intern</span>
                        </div>
                        <div class="student-username-text">@${this.escape(s.username)}</div>
                      </div>
                    </div>
                    ${hasPending ? `
                      <span class="student-notif-pill" onclick="event.stopPropagation(); app.selectStudentAndReview(${s.id})" title="Click to jump to review!">
                        <span class="pulse-dot"></span> 🔔 ${s.pending_count} New
                      </span>
                    ` : ''}
                  </div>
                  <div class="student-meta-strip">
                    <span>🗓️ Day ${s.days_enrolled} (${s.joining_date})</span>
                    <span style="font-weight:700; color:var(--emerald-dark);">${s.completed_count}/23 Tasks</span>
                  </div>
                  <div style="font-size:11px; color:#475569; display:flex; justify-content:space-between; align-items:center;">
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:60%;">📌 ${this.escape(s.current_task_title || 'Task 1')}</span>
                    <span class="status-pill status-${(s.fees_status || 'PENDING').toLowerCase()}" style="font-size:9.5px; padding:1px 6px;">Fees: ${s.fees_status || 'PENDING'}</span>
                  </div>
                  <div style="margin-top:7px; padding-top:6px; border-top:1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:11px; color:#64748b;">
                      ${(s.total_fees || 0) > 0 ? `💰 Due: <b style="color:${((s.total_fees || 0) - (s.fees_paid || 0)) > 0 ? '#b91c1c' : '#15803d'};">₹${Math.max(0, (s.total_fees || 0) - (s.fees_paid || 0)).toLocaleString()}</b>` : '<span style="color:#d97706; font-weight:600;">⚠️ Fees not set</span>'}
                    </span>
                    <button type="button" class="btn btn-outline" style="font-size:11px; padding:2px 8px; height:auto; line-height:1.4;" onclick="event.stopPropagation(); app.openUpdateFeesModal(${s.id})">✏️ Fees</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </aside>

        <!-- RIGHT: Dedicated Intern Workspace -->
        <section id="studentWorkspace" class="admin-detail-panel ${this.adminMobileTab === 'students' ? 'mobile-tab-hidden' : ''}">
          <button class="mobile-back-to-list-btn" onclick="app.setAdminMobileTab('students')">
            &larr; Back to Interns Directory
          </button>
          ${this.renderStudentWorkspace()}
        </section>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // BLOCK 3: STAFF & MENTORS BLOCK
  // --------------------------------------------------------------------------
  renderEmployeesBlock(employees, totalSalary, paidSalary, pendingSalary) {
    const attLedger = this.adminAttendanceLedger || {
      date: this.adminAttendanceDate || new Date().toISOString().slice(0, 10),
      total_staff: employees.length,
      present_count: 0,
      leave_count: 0,
      half_day_count: 0,
      pending_count: employees.length,
      records: []
    };

    const filtered = employees.filter(s => {
      const matchSearch = !this.sidebarSearch
        || s.full_name.toLowerCase().includes(this.sidebarSearch)
        || s.username.toLowerCase().includes(this.sidebarSearch);
      if (!matchSearch) return false;
      if (this.sidebarFilter === 'pending') return s.salary_status !== 'PAID';
      if (this.sidebarFilter === 'completed') return s.salary_status === 'PAID';
      return true;
    });

    const pendingSalaryCount = employees.filter(s => s.salary_status !== 'PAID').length;

    return `
      <!-- Block Header Card -->
      <div class="block-header-card">
        <div class="block-header-title">
          <h2><span>👔</span> Staff & Mentors Management Block</h2>
          <p>GrowthNest Instructors, Technical Mentors, Daily Attendance & Monthly Salary Disbursements</p>
        </div>
        <button class="btn btn-primary" style="background:#2563eb; border-color:#1d4ed8;" onclick="app.openAddMemberModal('employee')">
          ➕ Register Staff Member
        </button>
      </div>

      <!-- Block KPI Bar -->
      <div class="admin-stats-strip">
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#eff6ff; color:#1d4ed8;">👔</div>
          <div>
            <div class="stat-metric-val">${employees.length}</div>
            <div class="stat-metric-lbl">Total Staff & Mentors</div>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#e0e7ff; color:#4338ca;">💳</div>
          <div>
            <div class="stat-metric-val" style="color:#4338ca;">₹${totalSalary.toLocaleString()}</div>
            <div class="stat-metric-lbl">Monthly Committed Payroll</div>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#dcfce7; color:#15803d;">✓</div>
          <div>
            <div class="stat-metric-val" style="color:#15803d;">₹${paidSalary.toLocaleString()}</div>
            <div class="stat-metric-lbl">Salaries Disbursed</div>
          </div>
        </div>
        <div class="stat-metric-card clickable" onclick="app.setSidebarFilter('pending')" style="border-color:${pendingSalaryCount > 0 ? 'var(--gold)' : 'var(--border)'};">
          <div class="stat-metric-icon" style="background:#fef3c7; color:#b45309;">⏳</div>
          <div>
            <div class="stat-metric-val" style="color:#b45309;">₹${pendingSalary.toLocaleString()}</div>
            <div class="stat-metric-lbl">Pending Disbursals (${pendingSalaryCount})</div>
          </div>
        </div>
      </div>

      <!-- Daily Attendance Control Strip -->
      <div class="card" style="margin-bottom:16px; padding:14px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; border-left:4px solid #2563eb;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size:24px;">📅</span>
          <div>
            <h3 style="font-size:15px; font-weight:800; color:var(--dark-navy); margin:0;">Daily Staff Attendance Register</h3>
            <div style="font-size:12.5px; color:var(--text-muted); margin-top:3px;">
              Date: <strong>${this.adminAttendanceDate || 'Today'}</strong> &bull;
              <span style="color:#15803d; font-weight:700;">🟢 ${attLedger.present_count || 0} Present</span> &bull;
              <span style="color:#b45309; font-weight:700;">🌓 ${attLedger.half_day_count || 0} Half Day</span> &bull;
              <span style="color:#b91c1c; font-weight:700;">🏖️ ${attLedger.leave_count || 0} Leave</span> &bull;
              <span style="color:#64748b;">⚪ ${attLedger.pending_count || 0} Unmarked</span>
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:12px; font-weight:700; color:#475569; margin:0;">Register Date:</label>
          <input type="date" value="${this.adminAttendanceDate || ''}" onchange="app.changeAdminAttendanceDate(this.value)" class="form-input" style="padding:4px 8px; font-size:12px; width:auto;">
          <button type="button" class="btn btn-outline btn-sm" onclick="app.changeAdminAttendanceDate(new Date().toISOString().slice(0, 10))">Today</button>
        </div>
      </div>

      <!-- Mobile View Switcher -->
      <div class="admin-mobile-nav-bar">
        <button class="mobile-nav-btn ${this.adminMobileTab === 'students' ? 'active' : ''}" onclick="app.setAdminMobileTab('students')">
          👥 Staff (${employees.length})
        </button>
        <button class="mobile-nav-btn ${this.adminMobileTab === 'workspace' ? 'active' : ''}" onclick="app.setAdminMobileTab('workspace')">
          📁 ${this.selectedStudentPortfolio && this.selectedStudentPortfolio.student ? this.escape(this.selectedStudentPortfolio.student.full_name) : 'Staff Workspace'}
        </button>
      </div>

      <div class="admin-workspace-grid">
        <!-- LEFT: Staff Directory -->
        <aside class="admin-sidebar-panel ${this.adminMobileTab === 'workspace' ? 'mobile-tab-hidden' : ''}">
          <div class="sidebar-header-row">
            <h3>👔 Staff Directory</h3>
            <span style="font-size:12px; font-weight:700; color:var(--text-muted);">${employees.length} Staff</span>
          </div>

          <input type="text" class="sidebar-search-box" placeholder="🔍 Search staff name..." value="${this.escape(this.sidebarSearch)}" oninput="app.handleSidebarSearch(event)">

          <div class="sidebar-filter-tabs">
            <button class="filter-tab-pill ${this.sidebarFilter === 'all' ? 'active' : ''}" onclick="app.setSidebarFilter('all')">
              All (${employees.length})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'pending' ? 'active' : ''}" onclick="app.setSidebarFilter('pending')">
              ⏳ Pending (${pendingSalaryCount})
            </button>
            <button class="filter-tab-pill ${this.sidebarFilter === 'completed' ? 'active' : ''}" onclick="app.setSidebarFilter('completed')">
              ✓ Disbursed
            </button>
          </div>

          <div class="admin-students-list">
            ${filtered.length === 0 ? `
              <div style="text-align:center; padding:24px; color:var(--text-muted); font-size:13px;">
                No staff members registered. Click "+ Register Staff Member" to add.
              </div>
            ` : filtered.map(s => {
              const isSelected = s.id === this.selectedStudentId;
              return `
                <div class="student-card-item ${isSelected ? 'selected' : ''}" onclick="app.selectStudentAndReview(${s.id})">
                  <div class="student-card-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                      ${s.avatar_url ? `
                        <img src="${s.avatar_url}" alt="" class="student-avatar-img" style="width:38px; height:38px;">
                      ` : `
                        <div class="student-avatar" style="background:#eff6ff; color:#1e40af; border-color:#bfdbfe;">
                          ${this.getInitials(s.full_name)}
                        </div>
                      `}
                      <div>
                        <div class="student-name-text" style="display:flex; align-items:center; gap:6px;">
                          <span>${this.escape(s.full_name)}</span>
                          <span class="badge-role badge-employee" style="font-size:9.5px; padding:1px 5px;">Staff</span>
                        </div>
                        <div class="student-username-text">@${this.escape(s.username)}</div>
                      </div>
                    </div>
                  </div>
                  <div class="student-meta-strip">
                    <span>💼 ${this.escape(s.designation || 'Staff')}</span>
                    <span style="font-weight:700; color:#1d4ed8;">${this.escape(s.department || 'GrowthNest')}</span>
                  </div>
                  <div style="font-size:11px; color:#475569; display:flex; justify-content:space-between; align-items:center;">
                    <span>💰 ₹${Number(s.salary_amount || 0).toLocaleString()} /mo</span>
                    <span>${this.getEmpTodayAttendanceBadge(s.id)}</span>
                  </div>
                  <div style="margin-top:7px; padding-top:6px; border-top:1px dashed #e2e8f0; display:flex; justify-content:space-between; align-items:center; gap:6px;">
                    <button type="button" class="btn btn-outline" style="font-size:10.5px; padding:2px 7px; height:auto; line-height:1.4;" onclick="event.stopPropagation(); app.openUpdateSalaryModal(${s.id})">✏️ Salary</button>
                    <button type="button" class="btn btn-outline" style="font-size:10.5px; padding:2px 7px; height:auto; line-height:1.4; border-color:#93c5fd; color:#1d4ed8; background:#eff6ff;" onclick="event.stopPropagation(); app.openMarkAttendanceModal(${s.id}, '${this.escape(s.full_name)}')">📋 Attendance</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </aside>

        <!-- RIGHT: Dedicated Staff Workspace -->
        <section id="studentWorkspace" class="admin-detail-panel ${this.adminMobileTab === 'students' ? 'mobile-tab-hidden' : ''}">
          <button class="mobile-back-to-list-btn" onclick="app.setAdminMobileTab('students')">
            &larr; Back to Staff Directory
          </button>
          ${this.renderStudentWorkspace()}
        </section>
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // BLOCK 4: TASK REVIEWS QUEUE BLOCK
  // --------------------------------------------------------------------------
  renderReviewsBlock(pendingCount) {
    const list = this.pendingReviewsList || [];

    return `
      <!-- Block Header Card -->
      <div class="block-header-card">
        <div class="block-header-title">
          <h2><span>🔔</span> Task Evaluations & Code Reviews Block</h2>
          <p>Live queue of submissions awaiting mentor inspection across students & interns</p>
        </div>
        <button class="btn btn-outline" onclick="app.setAdminActiveBlock('reviews')">
          🔄 Refresh Reviews Queue
        </button>
      </div>

      ${list.length === 0 ? `
        <div class="card" style="text-align:center; padding:54px 20px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:16px;">
          <div style="font-size:46px; margin-bottom:12px;">🎉</div>
          <h3 style="color:#14532d; font-size:20px; font-weight:800;">Review Queue is Clear!</h3>
          <p style="color:#166534; font-size:14px; margin-top:6px; max-width:540px; margin-left:auto; margin-right:auto; line-height:1.6;">
            All submitted tasks have been inspected and evaluated. As soon as any course student or intern submits an assignment, it will immediately appear in this queue.
          </p>
        </div>
      ` : `
        <div style="display:flex; flex-direction:column; gap:20px;">
          ${list.map(sub => {
            const scan = this.inspectCode(sub.code_html || sub.sample_code_text);
            const isIntern = sub.user_type === 'intern';
            return `
              <div class="review-hero-card review-pulse-focus" style="margin-bottom:0;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
                  <div>
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                      <span class="badge-role ${isIntern ? 'badge-intern' : 'badge-student'}">
                        ${isIntern ? '💼 Intern' : '🎓 Course Student'}
                      </span>
                      <strong style="color:var(--dark-navy); font-size:14.5px;">${this.escape(sub.student_name)} (@${this.escape(sub.student_username)})</strong>
                      <span>&bull;</span>
                      <span class="step-badge step-badge-${sub.task_module.toLowerCase()}">${sub.task_module} Module</span>
                    </div>
                    <h3 style="font-size:18px; font-weight:800; color:var(--dark-navy);">
                      Task ${sub.sequence_order}: ${this.escape(sub.task_title)}
                    </h3>
                  </div>
                  <div style="font-size:12px; color:var(--text-muted);">
                    Submitted: <strong>${new Date(sub.submitted_at).toLocaleString()}</strong>
                  </div>
                </div>

                ${sub.status === 'CHANGES_REQUESTED' ? `
                  <div style="background:#fffbeb; border:1px solid #fde68a; color:#92400e; padding:10px 14px; border-radius:6px; font-size:12.5px; margin-bottom:14px;">
                    ⚠️ <strong>Current Status: In Revisions.</strong> Mentor previous feedback: <em>"${this.escape(sub.admin_feedback)}"</em>.
                  </div>
                ` : ''}

                ${sub.student_notes ? `
                  <div style="background:#f8fafc; border-left:3px solid var(--emerald); padding:10px 14px; font-size:13px; margin-bottom:14px; border-radius:4px; color:#334155;">
                    <strong>Student Note:</strong> "${this.escape(sub.student_notes)}"
                  </div>
                ` : ''}

                <!-- Automated Code Inspector -->
                <div class="code-inspector-banner">
                  <div class="code-inspector-title">
                    <span>🤖</span>
                    <span>Automated Code Inspector:</span>
                  </div>
                  <div class="code-inspector-msg ${scan.hasIssue ? 'has-issue' : 'looks-good'}">
                    ${scan.hasIssue ? '⚠️ ' + scan.message : '✓ ' + scan.message}
                  </div>
                </div>

                <!-- Source Code Box with Copy -->
                <div style="margin-bottom:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <label style="font-size:13px; font-weight:700; color:var(--dark-navy);">Submitted Source Code:</label>
                    <button class="btn btn-outline btn-sm" onclick="app.copyCodeToClipboard('queueCode_${sub.id}')">📋 Copy Code</button>
                  </div>
                  <textarea id="queueCode_${sub.id}" class="code-box" readonly style="height:170px;">${this.escape(sub.code_html || sub.sample_code_text || 'No code submitted')}</textarea>
                </div>

                <!-- Screenshot with Click to Zoom -->
                ${sub.output_url ? `
                  <div style="margin-bottom:16px;">
                    <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:var(--dark-navy);">
                      Output Screenshot:
                    </label>
                    <div style="cursor:pointer; display:inline-block;" onclick="app.previewImage('${sub.output_url}')">
                      <img src="${sub.output_url}" alt="Output Screenshot" style="max-width:100%; max-height:220px; border-radius:8px; border:1px solid var(--border); box-shadow:var(--shadow-sm);">
                      <div style="font-size:11px; color:var(--emerald-dark); margin-top:3px; font-weight:700;">🔍 Click image to enlarge</div>
                    </div>
                  </div>
                ` : ''}

                <!-- Mentor Feedback with Problem Chips -->
                <div style="margin-bottom:18px; border-top:1px solid var(--gold-border); padding-top:16px;">
                  <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:var(--dark-navy);">
                    Feedback / Problem Note for ${this.escape(sub.student_name)}:
                  </label>
                  <input type="text" id="feedback_${sub.id}" class="form-input" placeholder="Click problem tag below or type custom note..." value="">

                  <div style="margin-top:10px;">
                    <div style="font-size:11.5px; font-weight:800; color:#b91c1c; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">
                      <span>⚠️</span> Code Problems (Click to specify exact issue to student):
                    </div>
                    <div class="feedback-chips-strip" style="margin-bottom:10px;">
                      <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${sub.id}, 'Problem in Code: No valid HTML tags found. Please write actual HTML5 code instead of placeholder text.')">❌ Dummy / Invalid Code</span>
                      <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${sub.id}, 'Problem in Code: Missing <!DOCTYPE html>, <html>, <head>, or <body> root tags.')">❌ Missing HTML Structure</span>
                      <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${sub.id}, 'Problem in Code: Some HTML tags are unclosed or have syntax errors. Please fix tag nesting.')">❌ Unclosed Tags</span>
                      <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${sub.id}, 'Problem in Code: Required semantic tags (<header>, <nav>, <main>, <section>, <footer>) are missing.')">❌ Missing Semantics</span>
                      <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${sub.id}, 'Problem in Code: Task requirements are incomplete. Please review instructions and checklist.')">❌ Incomplete Requirements</span>
                    </div>

                    <div style="font-size:11.5px; font-weight:800; color:#15803d; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px;">
                      <span>✓</span> Approval Remarks:
                    </div>
                    <div class="feedback-chips-strip">
                      <span class="feedback-chip chip-success" onclick="app.insertFeedback(${sub.id}, '✓ Excellent clean HTML5 semantic structure! All requirements satisfied.')">✓ Clean Semantics</span>
                      <span class="feedback-chip chip-success" onclick="app.insertFeedback(${sub.id}, '✓ Well formatted code with proper nesting and structure. Approved!')">✓ Well Formatted</span>
                      <span class="feedback-chip chip-success" onclick="app.insertFeedback(${sub.id}, '✓ Great work! All requirements verified and approved by GrowthNest Mentor.')">✓ Fully Approved</span>
                    </div>
                  </div>
                </div>

                <div style="display:flex; justify-content:flex-end; gap:12px; flex-wrap:wrap;">
                  <button class="btn btn-danger" onclick="app.adminDecide(${sub.id}, 'REJECT').then(() => app.setAdminActiveBlock('reviews'))">
                    ✕ Request Changes
                  </button>
                  <button class="btn btn-success" onclick="app.adminDecide(${sub.id}, 'APPROVE').then(() => app.setAdminActiveBlock('reviews'))">
                    ✓ Approve & Unlock Next Task
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  // --------------------------------------------------------------------------
  // BLOCK 5: FINANCIAL LEDGER & PAYROLL BLOCK
  // --------------------------------------------------------------------------
  renderFinanceBlock(cTotal, cPaid, cPending, iTotal, iPaid, iPending, sSalary, sPaid, sPending) {
    const netOperating = (cPaid + iPaid) - sPaid;

    return `
      <!-- Block Header Card -->
      <div class="block-header-card">
        <div class="block-header-title">
          <h2><span>💰</span> Financial Ledger & Operations Block</h2>
          <p>Consolidated summary of Course Fees Inflow, Intern Payments & Staff Salary Disbursements</p>
        </div>
      </div>

      <!-- Financial KPI Ledger Strip -->
      <div class="admin-stats-strip">
        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#ecfdf5; color:#059669;">🎓</div>
          <div>
            <div class="stat-metric-val" style="color:#059669;">₹${cPaid.toLocaleString()}</div>
            <div class="stat-metric-lbl">Course Fees Collected (₹${cPending.toLocaleString()} Due)</div>
          </div>
        </div>

        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#fef3c7; color:#b45309;">💼</div>
          <div>
            <div class="stat-metric-val" style="color:#b45309;">₹${iPaid.toLocaleString()}</div>
            <div class="stat-metric-lbl">Intern Fees Collected (₹${iPending.toLocaleString()} Due)</div>
          </div>
        </div>

        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:#eff6ff; color:#2563eb;">👔</div>
          <div>
            <div class="stat-metric-val" style="color:#2563eb;">₹${sSalary.toLocaleString()}</div>
            <div class="stat-metric-lbl">Monthly Staff Payroll (₹${sPaid.toLocaleString()} Paid)</div>
          </div>
        </div>

        <div class="stat-metric-card">
          <div class="stat-metric-icon" style="background:${netOperating >= 0 ? '#dcfce7' : '#fee2e2'}; color:${netOperating >= 0 ? '#15803d' : '#b91c1c'};">📊</div>
          <div>
            <div class="stat-metric-val" style="color:${netOperating >= 0 ? '#15803d' : '#b91c1c'};">₹${netOperating.toLocaleString()}</div>
            <div class="stat-metric-lbl">Net Operating Flow (Inflow - Payroll)</div>
          </div>
        </div>
      </div>

      <!-- Comprehensive Financial Ledger Table -->
      <div class="card" style="margin-top:20px;">
        <h3 style="font-size:16px; font-weight:800; color:var(--dark-navy); margin-bottom:14px;">
          📋 Member Financial Accounts & Payout Ledger (${this.allStudents.length} Records)
        </h3>

        <div class="table-wrapper">
          <table class="clean-table">
            <thead>
              <tr>
                <th>Member Name & Login</th>
                <th>Role Category</th>
                <th>Track / Designation</th>
                <th>Total Fee / Salary</th>
                <th>Paid Amount</th>
                <th>Balance Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${this.allStudents.map(s => {
                const isEmp = s.user_type === 'employee';
                const isInt = s.user_type === 'intern';
                const roleBadge = isEmp ? '<span class="badge-role badge-employee">👔 Staff</span>' : (isInt ? '<span class="badge-role badge-intern">💼 Intern</span>' : '<span class="badge-role badge-student">🎓 Student</span>');

                if (isEmp) {
                  return `
                    <tr>
                      <td><strong>${this.escape(s.full_name)}</strong><br><span style="font-size:11.5px; color:#64748b;">@${this.escape(s.username)}</span></td>
                      <td>${roleBadge}</td>
                      <td>${this.escape(s.designation || 'Staff')} (${this.escape(s.department || 'Training')})</td>
                      <td><strong>₹${Number(s.salary_amount || 0).toLocaleString()} /mo</strong></td>
                      <td style="color:#15803d; font-weight:700;">${s.salary_status === 'PAID' ? '₹' + Number(s.salary_amount || 0).toLocaleString() : '₹0'}</td>
                      <td style="color:#b45309; font-weight:700;">${s.salary_status === 'PAID' ? '₹0' : '₹' + Number(s.salary_amount || 0).toLocaleString()}</td>
                      <td><span class="status-pill status-${(s.salary_status || 'PENDING').toLowerCase()}">${s.salary_status || 'PENDING'}</span></td>
                      <td>
                        <button class="btn btn-outline btn-sm" onclick="app.openUpdateSalaryModal(${s.id})">✏️ Edit Salary</button>
                      </td>
                    </tr>
                  `;
                }

                return `
                  <tr>
                    <td><strong>${this.escape(s.full_name)}</strong><br><span style="font-size:11.5px; color:#64748b;">@${this.escape(s.username)}</span></td>
                    <td>${roleBadge}</td>
                    <td>${this.escape(s.course_track || 'Web Development')}</td>
                    <td><strong>₹${Number(s.total_fees || 0).toLocaleString()}</strong></td>
                    <td style="color:#15803d; font-weight:700;">₹${Number(s.fees_paid || 0).toLocaleString()}</td>
                    <td style="color:${s.pending_fees > 0 ? '#b91c1c' : '#15803d'}; font-weight:700;">₹${Number(s.pending_fees || 0).toLocaleString()}</td>
                    <td><span class="status-pill status-${(s.fees_status || 'PENDING').toLowerCase()}">${s.fees_status || 'PENDING'}</span></td>
                    <td>
                      <button class="btn btn-outline btn-sm" onclick="app.openUpdateFeesModal(${s.id})">✏️ Edit Fees</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderEmployeeWorkspace(emp) {
    const salaryStatus = emp.salary_status || 'PENDING';
    return `
      <!-- Employee Banner Card -->
      <div class="student-profile-hero">
        <div class="profile-top-bar">
          <div style="display:flex; align-items:center; gap:14px;">
            ${emp.avatar_url ? `
              <img src="${emp.avatar_url}" alt="" class="student-avatar-img" style="width:48px; height:48px;">
            ` : `
              <div class="student-avatar" style="width:48px; height:48px; font-size:17px; background:#eff6ff; color:#1e40af; border-color:#bfdbfe;">
                ${this.getInitials(emp.full_name)}
              </div>
            `}
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <h2 style="font-size:20px; font-weight:800; color:var(--dark-navy);">${this.escape(emp.full_name)}</h2>
                <span class="badge-role badge-employee">👔 Staff / Employee</span>
                <span class="user-tag" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;">@${this.escape(emp.username)}</span>
              </div>
              <div style="font-size:12.5px; color:var(--text-muted); display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:3px;">
                <span>💼 Designation: <strong>${this.escape(emp.designation || 'Staff')}</strong></span>
                <span>&bull;</span>
                <span>🏢 Dept: <strong>${this.escape(emp.department || 'GrowthNest')}</strong></span>
                <span>&bull;</span>
                <span>📅 Joined: <strong>${emp.joining_date}</strong></span>
                <span>&bull;</span>
                <span style="color:#2563eb; font-weight:700;">⏱️ Service: ${emp.days_enrolled} Days</span>
                <span>&bull;</span>
                <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:11px; height:auto; line-height:1.4; border-color:#cbd5e1; color:#334155;" onclick="app.promptResetPassword(${emp.id}, '${this.escape(emp.username)}')">🔑 Reset Password</button>
                <span>&bull;</span>
                <button type="button" class="btn btn-danger" style="padding:2px 8px; font-size:11px; height:auto; line-height:1.4; background:#fef2f2; border:1px solid #fecaca; color:#dc2626;" onclick="app.confirmRemoveStudent(${emp.id}, '${this.escape(emp.full_name)}')">🗑️ Remove Staff</button>
              </div>
            </div>
          </div>

          <div style="text-align:right;">
            <div style="font-size:12px; color:var(--text-muted); font-weight:600;">Monthly Compensation</div>
            <div style="font-size:22px; font-weight:800; color:#1e40af;">₹${Number(emp.salary_amount || 0).toLocaleString()}</div>
            <div style="font-size:11px; color:var(--text-muted);">${this.escape(emp.payment_mode || 'Bank Transfer')}</div>
          </div>
        </div>
      </div>

      ${(!emp.salary_amount || Number(emp.salary_amount) === 0) ? `
        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">⚠️</span>
            <div>
              <strong style="color:#92400e; font-size:13px;">Salary details not yet configured for this staff member</strong>
              <div style="font-size:12px; color:#b45309;">Enter monthly salary, designation, and payment mode now.</div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.openUpdateSalaryModal(${emp.id})">
            ➕ Enter Salary Details Now
          </button>
        </div>
      ` : ''}

      <!-- Employee Salary & Compensation Details Card -->
      <div class="salary-summary-card accent-indigo">
        <div class="summary-card-header">
          <div class="summary-card-title">
            <span>💰</span>
            <span>Monthly Salary & Payout Management</span>
            <span class="status-pill status-${salaryStatus.toLowerCase()}">${salaryStatus}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.openUpdateSalaryModal(${emp.id})">
            ✏️ Update Salary / Mark Paid
          </button>
        </div>

        <div class="financial-grid-4">
          <div class="financial-box">
            <span class="financial-lbl">Monthly Salary</span>
            <span class="financial-val" style="color:#1e40af;">₹${Number(emp.salary_amount || 0).toLocaleString()}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Salary Status</span>
            <span class="financial-val ${salaryStatus === 'PAID' ? 'val-green' : 'val-amber'}">${salaryStatus}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Last Payout Date</span>
            <span class="financial-val" style="font-size:15px;">${emp.salary_date || '—'}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Payment Mode</span>
            <span class="financial-val" style="font-size:15px;">${this.escape(emp.payment_mode || 'Bank Transfer')}</span>
          </div>
        </div>

        ${emp.salary_notes ? `
          <div class="financial-notes-bar">
            <strong>📝 Notes / Bank Account:</strong>
            <span>${this.escape(emp.salary_notes)}</span>
          </div>
        ` : ''}
      </div>

      <!-- Staff Daily Attendance & Time Tracking Card -->
      <div class="card attendance-hero-card">
        <div class="attendance-card-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:22px;">📅</span>
            <div>
              <h3 style="font-size:16px; font-weight:800; color:var(--dark-navy);">Staff Attendance & Daily Time Register</h3>
              <p style="font-size:12px; color:var(--text-muted); margin:0;">Daily presence, punch records and leave management for ${this.escape(emp.full_name)}</p>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.openMarkAttendanceModal(${emp.id}, '${this.escape(emp.full_name)}')">
            ➕ Mark / Edit Attendance
          </button>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:12px 14px; background:#f8fafc; border-radius:8px; margin-bottom:14px; border:1px solid #e2e8f0;">
          <div>
            <span style="font-size:13px; font-weight:700; color:var(--dark-navy);">Today's Status (${this.adminAttendanceDate || 'Today'}):</span>
            <span style="margin-left:6px;">
              ${this.getEmpTodayAttendanceBadge(emp.id)}
            </span>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 8px; color:#15803d; border-color:#86efac; background:#f0fdf4;" onclick="app.quickMarkStaffAttendance(${emp.id}, 'PRESENT')">🟢 Mark Present</button>
            <button type="button" class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 8px; color:#b45309; border-color:#fde68a; background:#fffbeb;" onclick="app.quickMarkStaffAttendance(${emp.id}, 'HALF_DAY')">🌓 Half Day</button>
            <button type="button" class="btn btn-outline btn-sm" style="font-size:11px; padding:3px 8px; color:#b91c1c; border-color:#fca5a5; background:#fef2f2;" onclick="app.quickMarkStaffAttendance(${emp.id}, 'LEAVE')">🏖️ Leave</button>
          </div>
        </div>

        ${this.renderStaffAttendanceHistoryTable(emp.id)}
      </div>

      <!-- Staff Information Note -->
      <div class="card" style="background:#f8fafc; border-left:4px solid #3b82f6;">
        <h3 style="font-size:15px; font-weight:800; color:var(--dark-navy); margin-bottom:6px;">
          ℹ️ GrowthNest Team Member
        </h3>
        <p style="font-size:13px; color:#475569; line-height:1.6; margin:0;">
          ${this.escape(emp.full_name)} is registered as <strong>${this.escape(emp.designation || 'Staff')}</strong> in the <strong>${this.escape(emp.department || 'GrowthNest')}</strong> department. Staff members have portal access to view their monthly compensation, company announcements, and mentor credentials.
        </p>
      </div>
    `;
  },

  renderStudentWorkspace() {
    if (!this.selectedStudentPortfolio || !this.selectedStudentPortfolio.student) {
      return `
        <div class="card" style="text-align:center; padding:48px 20px;">
          <div style="font-size:36px; margin-bottom:12px;">👈</div>
          <h3 style="color:var(--dark-navy);">Select a Member from the Directory</h3>
          <p style="color:var(--text-muted); font-size:13.5px; margin-top:4px;">
            Click any student, intern, or staff member in the directory to inspect their details, tasks, fees, or salary.
          </p>
        </div>
      `;
    }

    const { student, submissions, pending_submission, roadmap, total_tasks, completed_tasks, pending_count } = this.selectedStudentPortfolio;

    if (student.user_type === 'employee') {
      return this.renderEmployeeWorkspace(student);
    }

    const isIntern = student.user_type === 'intern';
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
                ${isIntern ? '<span class="badge-role badge-intern">💼 Intern</span>' : '<span class="badge-role badge-student">🎓 Student</span>'}
                <span class="user-tag" style="background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe;">@${this.escape(student.username)}</span>
              </div>
              <div style="font-size:12.5px; color:var(--text-muted); display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:3px;">
                <span>📅 Joined: <strong>${student.joining_date}</strong></span>
                <span>&bull;</span>
                <span style="color:var(--emerald-dark); font-weight:700;">⏱️ Time Elapsed: ${student.days_enrolled} Days</span>
                <span>&bull;</span>
                <span>${this.escape(student.course_track || (isIntern ? 'Frontend Internship' : 'Frontend Development'))}</span>
                <span>&bull;</span>
                <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:11px; height:auto; line-height:1.4; border-color:#cbd5e1; color:#334155;" onclick="app.promptResetPassword(${student.id}, '${this.escape(student.username)}')">🔑 Reset Password</button>
                <span>&bull;</span>
                <button type="button" class="btn btn-danger" style="padding:2px 8px; font-size:11px; height:auto; line-height:1.4; background:#fef2f2; border:1px solid #fecaca; color:#dc2626;" onclick="app.confirmRemoveStudent(${student.id}, '${this.escape(student.full_name)}')">🗑️ Remove ${isIntern ? 'Intern' : 'Student'}</button>
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

      ${(!student.total_fees || Number(student.total_fees) === 0) ? `
        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">⚠️</span>
            <div>
              <strong style="color:#92400e; font-size:13px;">Fee record not yet configured for this ${isIntern ? 'intern' : 'student'}</strong>
              <div style="font-size:12px; color:#b45309;">Enter total course fee, paid amount, and due date.</div>
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.openUpdateFeesModal(${student.id})">
            ➕ Enter Fees Details Now
          </button>
        </div>
      ` : ''}

      <!-- Fees & Payment Details Card -->
      <div class="fees-summary-card accent-emerald">
        <div class="summary-card-header">
          <div class="summary-card-title">
            <span>💳</span>
            <span>Fee & Payment Details (${isIntern ? 'Internship Track' : 'Course Training'})</span>
            <span class="status-pill status-${(student.fees_status || 'PENDING').toLowerCase()}">${student.fees_status || 'PENDING'}</span>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.openUpdateFeesModal(${student.id})">
            ✏️ Update Fee Record
          </button>
        </div>

        <div class="financial-grid-4">
          <div class="financial-box">
            <span class="financial-lbl">Total Fees</span>
            <span class="financial-val">₹${Number(student.total_fees || 0).toLocaleString()}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Amount Paid</span>
            <span class="financial-val val-green">₹${Number(student.fees_paid || 0).toLocaleString()}</span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Balance Pending</span>
            <span class="financial-val ${student.pending_fees > 0 ? 'val-red' : 'val-green'}">
              ₹${Number(student.pending_fees || 0).toLocaleString()}
            </span>
          </div>
          <div class="financial-box">
            <span class="financial-lbl">Next Due Date</span>
            <span class="financial-val" style="font-size:15px;">${student.fees_due_date || '—'}</span>
          </div>
        </div>

        ${student.payment_notes ? `
          <div class="financial-notes-bar">
            <strong>📝 Payment Notes / Ref:</strong>
            <span>${this.escape(student.payment_notes)}</span>
          </div>
        ` : ''}
      </div>

      <!-- Monthly Fee Installments Verification Ledger -->
      ${this.renderAdminInstallmentsLedger(student)}

      <!-- ACTIVE SUBMISSION AWAITING REVIEW (If student has a pending task) -->
      ${pending_submission ? `
        <div id="pendingReviewBox" class="review-hero-card review-pulse-focus">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                ${pending_submission.status === 'CHANGES_REQUESTED' ? `
                  <span class="student-notif-pill" style="background:#fee2e2; color:#991b1b; border-color:#fca5a5;">
                    ⚠️ In Revisions Needed &bull; Ready to Approve
                  </span>
                ` : `
                  <span class="student-notif-pill">
                    <span class="pulse-dot"></span> 🔔 Awaiting Mentor Review
                  </span>
                `}
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

          ${pending_submission.status === 'CHANGES_REQUESTED' ? `
            <div style="background:#fffbeb; border:1px solid #fde68a; color:#92400e; padding:10px 14px; border-radius:6px; font-size:12.5px; margin-bottom:14px; line-height:1.5;">
              ⚠️ <strong>Current Status: Changes Requested.</strong> Mentor noted: <em>"${this.escape(pending_submission.admin_feedback)}"</em>. If student completed changes or code is satisfactory, click <strong>"✓ Approve & Unlock Next Task"</strong> below to change status to Approved.
            </div>
          ` : ''}

          ${pending_submission.student_notes ? `
            <div style="background:#f8fafc; border-left:3px solid var(--emerald); padding:10px 14px; font-size:13px; margin-bottom:16px; border-radius:4px; color:#334155;">
              <strong>Student's Note:</strong> "${this.escape(pending_submission.student_notes)}"
            </div>
          ` : ''}

          <!-- Automated Code Inspection Quick-Bar -->
          ${(() => {
            const scan = this.inspectCode(pending_submission.code_html || pending_submission.sample_code_text);
            return `
              <div class="code-inspector-banner">
                <div class="code-inspector-title">
                  <span>🤖</span>
                  <span>Automated Code Check:</span>
                </div>
                <div class="code-inspector-msg ${scan.hasIssue ? 'has-issue' : 'looks-good'}">
                  ${scan.hasIssue ? '⚠️ ' + scan.message : '✓ ' + scan.message}
                </div>
              </div>
            `;
          })()}

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

          <!-- Mentor Evaluation Form with Problem Category Selector -->
          <div style="margin-bottom:18px; border-top:1px solid var(--gold-border); padding-top:16px;">
            <label style="font-size:13px; font-weight:700; display:block; margin-bottom:6px; color:var(--dark-navy);">
              Feedback / Problem Note for ${this.escape(student.full_name)}:
            </label>
            <input type="text" id="feedback_${pending_submission.id}" class="form-input" placeholder="Click a problem tag below or type what is wrong with the code..." value="">

            <div style="margin-top:10px;">
              <div style="font-size:11.5px; font-weight:800; color:#b91c1c; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px;">
                <span>⚠️</span> Code Problems (Click to specify exact issue to student):
              </div>
              <div class="feedback-chips-strip" style="margin-bottom:10px;">
                <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${pending_submission.id}, 'Problem in Code: No valid HTML tags found. Please write actual HTML5 code instead of placeholder text.')">❌ Dummy / Invalid Code</span>
                <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${pending_submission.id}, 'Problem in Code: Missing <!DOCTYPE html>, <html>, <head>, or <body> root tags.')">❌ Missing HTML Structure</span>
                <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${pending_submission.id}, 'Problem in Code: Some HTML tags are unclosed or have syntax errors. Please fix tag nesting.')">❌ Unclosed Tags</span>
                <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${pending_submission.id}, 'Problem in Code: Required semantic tags (<header>, <nav>, <main>, <section>, <footer>) are missing.')">❌ Missing Semantics</span>
                <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${pending_submission.id}, 'Problem in Code: Required section headings (h1-h3) or text content are missing.')">❌ Missing Headings / Content</span>
                <span class="feedback-chip chip-problem" onclick="app.insertFeedback(${pending_submission.id}, 'Problem in Code: Task requirements are incomplete. Please review instructions and checklist.')">❌ Incomplete Requirements</span>
              </div>

              <div style="font-size:11.5px; font-weight:800; color:#15803d; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:4px;">
                <span>✓</span> Approval Remarks:
              </div>
              <div class="feedback-chips-strip">
                <span class="feedback-chip chip-success" onclick="app.insertFeedback(${pending_submission.id}, '✓ Excellent clean HTML5 semantic structure! All requirements satisfied.')">✓ Clean Semantics</span>
                <span class="feedback-chip chip-success" onclick="app.insertFeedback(${pending_submission.id}, '✓ Well formatted code with proper nesting and structure. Approved!')">✓ Well Formatted</span>
                <span class="feedback-chip chip-success" onclick="app.insertFeedback(${pending_submission.id}, '✓ Great work! All requirements verified and approved by GrowthNest Mentor.')">✓ Fully Approved</span>
              </div>
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
                        <div style="display:flex; gap:6px; align-items:center;">
                          <button class="btn btn-outline btn-sm" onclick="app.viewCodeModal('${this.escape(sub.task_title)}', ${sub.id})">
                            Inspect Code
                          </button>
                          ${sub.status !== 'APPROVED' ? `
                            <button class="btn btn-success btn-sm" style="padding:4px 10px; font-size:11.5px; white-space:nowrap;" onclick="app.quickApproveSubmission(${sub.id}, '${this.escape(sub.task_title)}')">
                              ✓ Approve
                            </button>
                          ` : ''}
                        </div>
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
    let feedback = feedbackInput ? feedbackInput.value.trim() : '';

    const isApprove = action === 'APPROVE';
    if (!isApprove) {
      if (!feedback || feedback.toLowerCase().includes('great work') || feedback.toLowerCase().includes('approved')) {
        feedback = 'Please review task requirements, update your code and resubmit.';
      }
    } else {
      if (!feedback) {
        feedback = 'Great work! Requirements satisfied. Approved by GrowthNest Mentor.';
      }
    }

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
        <div style="margin-top:16px; display:flex; justify-content:flex-end; align-items:center; gap:10px; border-top:1px solid var(--border); padding-top:12px;">
          <button class="btn btn-outline btn-sm" onclick="app.closeModal('imagePreviewModal')">Close</button>
          ${sub.status !== 'APPROVED' ? `
            <button class="btn btn-success btn-sm" onclick="app.closeModal('imagePreviewModal'); app.quickApproveSubmission(${sub.id}, '${this.escape(title)}')">
              ✓ Approve Submission & Unlock Next Task
            </button>
          ` : '<span style="color:var(--emerald); font-weight:700; font-size:13px;">✓ Already Approved</span>'}
        </div>
      </div>
    `;
  },

  async quickApproveSubmission(subId, taskTitle) {
    this.showDialog({
      type: 'confirm',
      title: 'Approve Submission?',
      message: `Do you want to approve <strong>${this.escape(taskTitle || 'this task')}</strong> and unlock the next milestone for this student?`,
      confirmText: '✓ Yes, Approve',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const feedbackInput = document.getElementById(`feedback_${subId}`);
        if (feedbackInput && !feedbackInput.value) {
          feedbackInput.value = 'Great work! Requirements satisfied. Approved by GrowthNest Mentor.';
        }
        await this.adminDecide(subId, 'APPROVE');
      }
    });
  },

  switchMemberTab(type) {
    const typeInput = document.getElementById('addMemberType');
    if (typeInput) typeInput.value = type;

    // Toggle button active classes
    const tabStudent = document.getElementById('tabTypeStudent');
    const tabIntern = document.getElementById('tabTypeIntern');
    const tabEmployee = document.getElementById('tabTypeEmployee');
    if (tabStudent) tabStudent.classList.toggle('active', type === 'student');
    if (tabIntern) tabIntern.classList.toggle('active', type === 'intern');
    if (tabEmployee) tabEmployee.classList.toggle('active', type === 'employee');

    // Toggle form sections
    const secStudent = document.getElementById('studentFieldsSection');
    const secIntern = document.getElementById('internFieldsSection');
    const secEmployee = document.getElementById('employeeFieldsSection');
    if (secStudent) secStudent.style.display = type === 'student' ? 'block' : 'none';
    if (secIntern) secIntern.style.display = type === 'intern' ? 'block' : 'none';
    if (secEmployee) secEmployee.style.display = type === 'employee' ? 'block' : 'none';

    // Update title, subtitle, icon, and button text
    const title = document.getElementById('addMemberModalTitle');
    const sub = document.getElementById('addMemberModalSubtitle');
    const icon = document.getElementById('addMemberHeaderIcon');
    const btn = document.getElementById('addMemberSubmitBtn');
    const dateLabel = document.getElementById('addJoiningDateLabel');

    if (type === 'student') {
      if (title) title.innerText = 'Enroll Course Student';
      if (sub) sub.innerText = 'Allocates Task 1 • Begins 23-task daily training track';
      if (icon) icon.innerText = '🎓';
      if (btn) btn.innerText = '➕ Enroll Student & Allocate Task 1';
      if (dateLabel) dateLabel.innerText = 'Joining Date *';
    } else if (type === 'intern') {
      if (title) title.innerText = 'Enroll Intern';
      if (sub) sub.innerText = 'Allocates Task 1 • Begins internship curriculum';
      if (icon) icon.innerText = '💼';
      if (btn) btn.innerText = '➕ Enroll Intern & Allocate Task 1';
      if (dateLabel) dateLabel.innerText = 'Internship Start Date *';
    } else if (type === 'employee') {
      if (title) title.innerText = 'Register Employee / Staff';
      if (sub) sub.innerText = 'Creates staff account with designation & salary';
      if (icon) icon.innerText = '👔';
      if (btn) btn.innerText = '➕ Register Staff Member';
      if (dateLabel) dateLabel.innerText = 'Date of Joining *';
    }
  },

  handleCoursePlanChange() {
    const plan = document.getElementById('addCourseDuration').value;
    const mFeeEl = document.getElementById('addMonthlyFee');
    const dMonthsEl = document.getElementById('addDurationMonths');
    const totalEl = document.getElementById('addStudentTotalFees');

    if (plan === '3_MONTHS') {
      if (mFeeEl) mFeeEl.value = 2500;
      if (dMonthsEl) dMonthsEl.value = 3;
      if (totalEl) totalEl.value = 7500;
    } else if (plan === '6_MONTHS') {
      if (mFeeEl) mFeeEl.value = 2500;
      if (dMonthsEl) dMonthsEl.value = 6;
      if (totalEl) totalEl.value = 15000;
    } else if (plan === '1_YEAR') {
      if (mFeeEl) mFeeEl.value = 1200;
      if (dMonthsEl) dMonthsEl.value = 12;
      if (totalEl) totalEl.value = 14400;
    }
    this.calcAddStudentBalance();
  },

  calcAddStudentMonthlyTotal() {
    const mFee = Number(document.getElementById('addMonthlyFee')?.value || 0);
    const dMonths = Number(document.getElementById('addDurationMonths')?.value || 0);
    const totalEl = document.getElementById('addStudentTotalFees');
    if (totalEl && mFee && dMonths) {
      totalEl.value = mFee * dMonths;
    }
    this.calcAddStudentBalance();
  },

  handleInternPlanChange() {
    const plan = document.getElementById('addInternDuration').value;
    const mFeeEl = document.getElementById('addInternMonthlyFee');
    const dMonthsEl = document.getElementById('addInternDurationMonths');
    const totalEl = document.getElementById('addInternTotalFees');

    if (plan === 'INTERNSHIP_3') {
      if (mFeeEl) mFeeEl.value = 1000;
      if (dMonthsEl) dMonthsEl.value = 3;
      if (totalEl) totalEl.value = 3000;
    } else if (plan === 'INTERNSHIP_6') {
      if (mFeeEl) mFeeEl.value = 1000;
      if (dMonthsEl) dMonthsEl.value = 6;
      if (totalEl) totalEl.value = 6000;
    } else if (plan === 'INTERNSHIP_1') {
      if (mFeeEl) mFeeEl.value = 1000;
      if (dMonthsEl) dMonthsEl.value = 1;
      if (totalEl) totalEl.value = 1000;
    }
    this.calcAddInternBalance();
  },

  calcAddInternMonthlyTotal() {
    const mFee = Number(document.getElementById('addInternMonthlyFee')?.value || 0);
    const dMonths = Number(document.getElementById('addInternDurationMonths')?.value || 0);
    const totalEl = document.getElementById('addInternTotalFees');
    if (totalEl && mFee && dMonths) {
      totalEl.value = mFee * dMonths;
    }
    this.calcAddInternBalance();
  },

  handleEditCoursePlanChange() {
    const plan = document.getElementById('editCourseDuration').value;
    const mFeeEl = document.getElementById('editMonthlyFee');
    const dMonthsEl = document.getElementById('editDurationMonths');
    const totalEl = document.getElementById('editFeeTotal');

    if (plan === '3_MONTHS') {
      if (mFeeEl) mFeeEl.value = 2500;
      if (dMonthsEl) dMonthsEl.value = 3;
      if (totalEl) totalEl.value = 7500;
    } else if (plan === '6_MONTHS') {
      if (mFeeEl) mFeeEl.value = 2500;
      if (dMonthsEl) dMonthsEl.value = 6;
      if (totalEl) totalEl.value = 15000;
    } else if (plan === '1_YEAR') {
      if (mFeeEl) mFeeEl.value = 1200;
      if (dMonthsEl) dMonthsEl.value = 12;
      if (totalEl) totalEl.value = 14400;
    } else if (plan === 'INTERNSHIP') {
      if (mFeeEl) mFeeEl.value = 1000;
      if (dMonthsEl) dMonthsEl.value = 3;
      if (totalEl) totalEl.value = 3000;
    }
    this.calcEditFeeBalance();
  },

  calcEditMonthlyTotal() {
    const mFee = Number(document.getElementById('editMonthlyFee')?.value || 0);
    const dMonths = Number(document.getElementById('editDurationMonths')?.value || 0);
    const totalEl = document.getElementById('editFeeTotal');
    if (totalEl && mFee && dMonths) {
      totalEl.value = mFee * dMonths;
    }
    this.calcEditFeeBalance();
  },

  calcAddStudentBalance() {
    const total = Number(document.getElementById('addStudentTotalFees').value || 0);
    const paid = Number(document.getElementById('addStudentPaidFees').value || 0);
    const statusSelect = document.getElementById('addStudentFeesStatus');
    if (statusSelect) {
      if (total > 0 && paid >= total) statusSelect.value = 'PAID';
      else if (paid > 0) statusSelect.value = 'PARTIAL';
      else statusSelect.value = 'PENDING';
    }
  },

  calcAddInternBalance() {
    const total = Number(document.getElementById('addInternTotalFees').value || 0);
    const paid = Number(document.getElementById('addInternPaidFees').value || 0);
    const statusSelect = document.getElementById('addInternFeesStatus');
    if (statusSelect) {
      if (total > 0 && paid >= total) statusSelect.value = 'PAID';
      else if (paid > 0) statusSelect.value = 'PARTIAL';
      else statusSelect.value = 'PENDING';
    }
  },

  calcEditFeeBalance() {
    const total = Number(document.getElementById('editFeeTotal').value || 0);
    const paid = Number(document.getElementById('editFeePaid').value || 0);
    const balance = Math.max(0, total - paid);
    const balEl = document.getElementById('editFeeBalance');
    if (balEl) balEl.value = `₹${balance.toLocaleString()}`;

    const statusEl = document.getElementById('editFeeStatus');
    if (statusEl) {
      if (total > 0 && paid >= total) statusEl.value = 'PAID';
      else if (paid > 0) statusEl.value = 'PARTIAL';
      else statusEl.value = 'PENDING';
    }
  },

  openUpdateFeesModal(studentId) {
    const target = (this.selectedStudentPortfolio && this.selectedStudentPortfolio.student && this.selectedStudentPortfolio.student.id === studentId)
      ? this.selectedStudentPortfolio.student
      : this.allStudents.find(s => s.id === studentId);

    if (!target) return;

    document.getElementById('editFeeStudentId').value = target.id;
    document.getElementById('updateFeesTargetName').innerText = `${target.full_name} (@${target.username})`;

    const isIntern = target.user_type === 'intern';
    const courseDuration = target.course_duration || (isIntern ? 'INTERNSHIP' : '6_MONTHS');
    const monthlyFee = Number(target.monthly_fee || (isIntern ? 1000 : (courseDuration === '1_YEAR' ? 1200 : 2500)));
    let durMonths = Number(target.duration_months || 0);
    if (!durMonths) {
      if (courseDuration === '3_MONTHS') durMonths = 3;
      else if (courseDuration === '1_YEAR') durMonths = 12;
      else if (courseDuration === 'INTERNSHIP') durMonths = 3;
      else durMonths = 6;
    }

    const durSelect = document.getElementById('editCourseDuration');
    if (durSelect) durSelect.value = courseDuration;

    const mFeeEl = document.getElementById('editMonthlyFee');
    if (mFeeEl) mFeeEl.value = monthlyFee;

    const dMonthsEl = document.getElementById('editDurationMonths');
    if (dMonthsEl) dMonthsEl.value = durMonths;

    document.getElementById('editFeeTotal').value = target.total_fees || (monthlyFee * durMonths);
    document.getElementById('editFeePaid').value = target.fees_paid || 0;
    document.getElementById('editFeeStatus').value = target.fees_status || 'PENDING';
    document.getElementById('editFeeDueDate').value = target.fees_due_date || '';
    document.getElementById('editFeeNotes').value = target.payment_notes || '';
    this.calcEditFeeBalance();

    this.openModal('updateFeesModal');
  },

  async handleUpdateFeesSubmit(e) {
    e.preventDefault();
    const student_id = Number(document.getElementById('editFeeStudentId').value);
    const total_fees = Number(document.getElementById('editFeeTotal').value || 0);
    const fees_paid = Number(document.getElementById('editFeePaid').value || 0);
    const fees_status = document.getElementById('editFeeStatus').value;
    const fees_due_date = document.getElementById('editFeeDueDate').value;
    const payment_notes = document.getElementById('editFeeNotes').value.trim();
    const course_duration = document.getElementById('editCourseDuration') ? document.getElementById('editCourseDuration').value : '6_MONTHS';
    const monthly_fee = document.getElementById('editMonthlyFee') ? Number(document.getElementById('editMonthlyFee').value || 0) : 0;
    const duration_months = document.getElementById('editDurationMonths') ? Number(document.getElementById('editDurationMonths').value || 0) : 0;

    try {
      const res = await fetch(`${API_BASE}/api/admin/update-fees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          student_id,
          total_fees,
          fees_paid,
          fees_status,
          fees_due_date,
          payment_notes,
          course_duration,
          monthly_fee,
          duration_months
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update fees');

      this.closeModal('updateFeesModal');
      this.showToast('✓ Fee record updated successfully!', 'success', 'Fees Updated');

      await this.loadAdminPortal();
      if (this.selectedStudentId === student_id) {
        await this.selectStudent(student_id);
      }
    } catch (err) {
      this.showToast(err.message, 'error', 'Update Failed');
    }
  },

  renderAdminInstallmentsLedger(student) {
    const installments = (this.selectedStudentPortfolio && this.selectedStudentPortfolio.fee_installments) || [];
    const planName = student.course_duration === '3_MONTHS' ? '3 Months Course (₹2,500/mo)'
      : (student.course_duration === '1_YEAR' ? '1 Year Course (₹1,200/mo)'
      : (student.course_duration === 'INTERNSHIP' || student.user_type === 'intern' ? 'Internship (₹1,000/mo)'
      : '6 Months Course (₹2,500/mo)'));

    return `
      <div class="card" style="margin-top:16px; margin-bottom:16px; padding:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
          <div>
            <h4 style="font-size:15px; font-weight:800; color:var(--dark-navy); display:flex; align-items:center; gap:8px;">
              <span>📅</span> Monthly Fee Installments Verification Ledger
            </h4>
            <div style="font-size:12.5px; color:var(--text-muted); margin-top:2px;">
              Plan: <strong style="color:var(--emerald-dark);">${planName}</strong> &bull; Monthly Fee: <strong>₹${Number(student.monthly_fee || 2500).toLocaleString()}</strong> &bull; Installments: <strong>${installments.length} Months</strong>
            </div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="app.refreshInstallments(${student.id})" title="Refresh installment records">
            🔄 Refresh Installments
          </button>
        </div>

        ${installments.length === 0 ? `
          <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px; background:#f8fafc; border-radius:8px;">
            No monthly installments initialized yet. Click "✏️ Update Fee Record" above to generate monthly installments.
          </div>
        ` : `
          <div class="table-responsive" style="overflow-x:auto;">
            <table class="data-table" style="width:100%; font-size:13px;">
              <thead>
                <tr style="background:#f8fafc; border-bottom:1.5px solid #e2e8f0; text-align:left;">
                  <th style="padding:10px 12px;">Month</th>
                  <th style="padding:10px 12px;">Due Date</th>
                  <th style="padding:10px 12px;">Amount Due</th>
                  <th style="padding:10px 12px;">Payment Ref / Mode</th>
                  <th style="padding:10px 12px;">Status</th>
                  <th style="padding:10px 12px; text-align:right;">Admin Action</th>
                </tr>
              </thead>
              <tbody>
                ${installments.map(inst => {
                  const isVerified = inst.status === 'VERIFIED';
                  const isPendingVerif = inst.status === 'PENDING_VERIFICATION';
                  const isOverdue = inst.is_overdue;

                  return `
                    <tr style="border-bottom:1px solid #f1f5f9; ${isPendingVerif ? 'background:#fffdf5;' : (isVerified ? 'background:#f0fdf4;' : '')}">
                      <td style="padding:12px; font-weight:700; color:var(--dark-navy);">
                        ${this.escape(inst.month_label)}
                        <span style="font-size:11px; color:#64748b; font-weight:500; display:block;">Installment #${inst.installment_number}</span>
                      </td>
                      <td style="padding:12px;">
                        <span style="font-weight:600; ${isOverdue ? 'color:#dc2626;' : 'color:#334155;'}">
                          ${inst.due_date}
                        </span>
                        ${isOverdue ? '<span style="font-size:10px; color:#dc2626; font-weight:700; display:block;">⚠️ OVERDUE</span>' : ''}
                      </td>
                      <td style="padding:12px; font-weight:800; color:var(--dark-navy);">
                        ₹${Number(inst.amount_due).toLocaleString()}
                      </td>
                      <td style="padding:12px;">
                        ${inst.transaction_ref ? `
                          <div style="font-weight:700; color:#1e293b; font-size:12.5px;">
                            ${this.escape(inst.transaction_ref)}
                          </div>
                          <div style="font-size:11px; color:#64748b;">
                            ${this.escape(inst.payment_mode || 'UPI')} ${inst.payment_date ? `&bull; ${inst.payment_date}` : ''}
                          </div>
                          ${inst.notes ? `<div style="font-size:11px; color:#64748b; font-style:italic;">"${this.escape(inst.notes)}"</div>` : ''}
                        ` : `
                          <span style="color:#94a3b8; font-size:12px;">—</span>
                        `}
                      </td>
                      <td style="padding:12px;">
                        ${isVerified ? `
                          <span class="status-pill status-paid" style="background:#dcfce7; color:#15803d; border-color:#86efac; font-weight:700;">
                            ✓ Verified (Paid)
                          </span>
                        ` : isPendingVerif ? `
                          <span class="status-pill" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700;">
                            ⏳ Submitted: Needs Verification
                          </span>
                        ` : `
                          <span class="status-pill status-pending" style="background:#fef2f2; color:#dc2626; border-color:#fecaca; font-weight:700;">
                            ⚠️ Due
                          </span>
                        `}
                      </td>
                      <td style="padding:12px; text-align:right;">
                        ${isVerified ? `
                          <div style="display:inline-flex; align-items:center; gap:6px;">
                            <span style="font-size:12px; color:#15803d; font-weight:700;">✓ Verified</span>
                            <button class="btn btn-outline" style="font-size:11px; padding:3px 8px; color:#64748b; border-color:#cbd5e1;" onclick="app.unverifyInstallment(${inst.id}, '${this.escape(inst.month_label)}')">
                              Revert
                            </button>
                          </div>
                        ` : `
                          <button class="btn btn-primary btn-sm" style="font-size:12px; padding:5px 12px; font-weight:700;" onclick="app.verifyInstallment(${inst.id}, '${this.escape(inst.month_label)}', ${inst.amount_due})">
                            ${isPendingVerif ? '✓ Verify & Approve' : '✓ Mark Verified'}
                          </button>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  },

  renderStudentInstallmentsSchedule() {
    if (!this.studentFeeData || !this.studentFeeData.installments || this.studentFeeData.installments.length === 0) {
      return '';
    }

    const installments = this.studentFeeData.installments;
    const planName = this.studentFeeData.course_duration === '3_MONTHS' ? '3 Months Course (₹2,500/mo)'
      : (this.studentFeeData.course_duration === '1_YEAR' ? '1 Year Course (₹1,200/mo)'
      : (this.studentFeeData.course_duration === 'INTERNSHIP' ? 'Internship (₹1,000/mo)'
      : '6 Months Course (₹2,500/mo)'));

    return `
      <div style="margin-top:16px; border-top:1px dashed #cbd5e1; padding-top:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
          <div>
            <span style="font-size:13px; font-weight:800; color:var(--dark-navy);">
              🗓️ Monthly Fee Installments & Verification Schedule
            </span>
            <span style="font-size:11.5px; color:var(--text-muted); margin-left:8px;">
              Plan: <strong style="color:var(--emerald-dark);">${planName}</strong>
            </span>
          </div>
          <span style="font-size:11.5px; color:#64748b;">
            Admin verifies each monthly payment upon receipt
          </span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
          ${installments.map(inst => {
            const isVerified = inst.status === 'VERIFIED';
            const isPendingVerif = inst.status === 'PENDING_VERIFICATION';
            const isOverdue = inst.is_overdue;

            let cardBg = '#f8fafc';
            let borderColor = '#e2e8f0';
            if (isVerified) {
              cardBg = '#f0fdf4';
              borderColor = '#bbf7d0';
            } else if (isPendingVerif) {
              cardBg = '#fffdf5';
              borderColor = '#fde68a';
            } else if (isOverdue) {
              cardBg = '#fef2f2';
              borderColor = '#fecaca';
            }

            return `
              <div style="background:${cardBg}; border:1.5px solid ${borderColor}; border-radius:10px; padding:12px; position:relative;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                  <div>
                    <span style="font-size:13.5px; font-weight:800; color:var(--dark-navy); display:block;">
                      ${this.escape(inst.month_label)}
                    </span>
                    <span style="font-size:11px; ${isOverdue ? 'color:#dc2626; font-weight:700;' : 'color:#64748b;'}">
                      Due: ${inst.due_date} ${isOverdue ? '⚠️ Overdue' : ''}
                    </span>
                  </div>
                  <div style="text-align:right;">
                    <span style="font-size:14px; font-weight:800; color:${isVerified ? '#15803d' : '#0f172a'};">
                      ₹${Number(inst.amount_due).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                  ${isVerified ? `
                    <span class="status-pill status-paid" style="background:#dcfce7; color:#15803d; border-color:#86efac; font-size:11px; padding:2px 8px;">
                      ✓ Verified by Admin
                    </span>
                    <span style="font-size:10.5px; color:#15803d; font-weight:600;">
                      ${inst.payment_date || 'Paid'}
                    </span>
                  ` : isPendingVerif ? `
                    <div>
                      <span class="status-pill" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:11px; padding:2px 8px;">
                        ⏳ Verification Pending
                      </span>
                      <div style="font-size:10.5px; color:#92400e; margin-top:3px;">
                        Ref: ${this.escape(inst.transaction_ref || 'Submitted')}
                      </div>
                    </div>
                    <button class="btn btn-outline" style="font-size:11px; padding:3px 8px; height:auto; line-height:1.2;" onclick="app.openSubmitPaymentModal(${inst.id}, '${this.escape(inst.month_label)}', ${inst.amount_due})">
                      ✏️ Edit Ref
                    </button>
                  ` : `
                    <span class="status-pill status-pending" style="background:#fef2f2; color:#dc2626; border-color:#fecaca; font-size:11px; padding:2px 8px;">
                      ⚠️ Payment Due
                    </span>
                    <button class="btn btn-primary" style="font-size:11.5px; padding:3px 10px; height:auto; line-height:1.3; font-weight:700;" onclick="app.openSubmitPaymentModal(${inst.id}, '${this.escape(inst.month_label)}', ${inst.amount_due})">
                      💳 Pay & Submit Ref
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  openSubmitPaymentModal(installmentId, monthLabel, amountDue) {
    document.getElementById('payModalInstallmentId').value = installmentId;
    document.getElementById('payModalMonthLabel').innerText = monthLabel;
    document.getElementById('payModalAmount').innerText = `₹${Number(amountDue).toLocaleString()}`;
    document.getElementById('payModalTxnRef').value = '';
    document.getElementById('payModalNotes').value = '';
    this.openModal('submitPaymentModal');
  },

  async handleSubmitPaymentRef(e) {
    e.preventDefault();
    const installment_id = Number(document.getElementById('payModalInstallmentId').value);
    const payment_mode = document.getElementById('payModalMode').value;
    const transaction_ref = document.getElementById('payModalTxnRef').value.trim();
    const notes = document.getElementById('payModalNotes').value.trim();

    if (!transaction_ref) {
      this.showToast('Please enter the transaction reference / UTR number', 'error', 'Missing Ref');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/student/submit-payment-ref`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          installment_id,
          transaction_ref,
          payment_mode,
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit payment reference');

      this.closeModal('submitPaymentModal');
      this.showToast('✓ Payment reference submitted! Admin will verify shortly.', 'success', 'Submitted');
      await this.loadStudentPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Submission Failed');
    }
  },

  async verifyInstallment(installmentId, monthLabel, amountDue) {
    if (!confirm(`Verify and approve ${monthLabel} payment of ₹${Number(amountDue).toLocaleString()}?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-installment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          installment_id: installmentId,
          status: 'VERIFIED',
          admin_id: this.currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify installment');

      this.showToast(`✓ ${monthLabel} verified successfully!`, 'success', 'Payment Verified');
      if (this.selectedStudentId) {
        await this.fetchStudentPortfolio(this.selectedStudentId);
        this.renderAdminPortal();
      }
      await this.loadAdminPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Verification Failed');
    }
  },

  async unverifyInstallment(installmentId, monthLabel) {
    if (!confirm(`Are you sure you want to revert ${monthLabel} to DUE?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-installment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          installment_id: installmentId,
          status: 'DUE',
          admin_id: this.currentUser.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update installment');

      this.showToast(`Installment ${monthLabel} status reverted to DUE`, 'info', 'Status Updated');
      if (this.selectedStudentId) {
        await this.fetchStudentPortfolio(this.selectedStudentId);
        this.renderAdminPortal();
      }
      await this.loadAdminPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Revert Failed');
    }
  },

  async refreshInstallments(studentId) {
    await this.fetchStudentPortfolio(studentId);
    this.renderAdminPortal();
    this.showToast('Installments refreshed', 'info');
  },

  openUpdateSalaryModal(employeeId) {
    const target = (this.selectedStudentPortfolio && this.selectedStudentPortfolio.student && this.selectedStudentPortfolio.student.id === employeeId)
      ? this.selectedStudentPortfolio.student
      : this.allStudents.find(s => s.id === employeeId);

    if (!target) return;

    document.getElementById('editSalaryEmployeeId').value = target.id;
    document.getElementById('updateSalaryTargetName').innerText = `${target.full_name} (@${target.username})`;
    document.getElementById('editSalaryDesignation').value = target.designation || '';
    document.getElementById('editSalaryDepartment').value = target.department || '';
    document.getElementById('editSalaryAmount').value = target.salary_amount || 0;
    document.getElementById('editSalaryStatus').value = target.salary_status || 'PENDING';
    document.getElementById('editSalaryDate').value = target.salary_date || '';
    document.getElementById('editSalaryMode').value = target.payment_mode || 'Bank Transfer';
    document.getElementById('editSalaryNotes').value = target.salary_notes || '';

    this.openModal('updateSalaryModal');
  },

  async handleUpdateSalarySubmit(e) {
    e.preventDefault();
    const employee_id = Number(document.getElementById('editSalaryEmployeeId').value);
    const designation = document.getElementById('editSalaryDesignation').value.trim();
    const department = document.getElementById('editSalaryDepartment').value.trim();
    const salary_amount = Number(document.getElementById('editSalaryAmount').value || 0);
    const salary_status = document.getElementById('editSalaryStatus').value;
    const salary_date = document.getElementById('editSalaryDate').value;
    const payment_mode = document.getElementById('editSalaryMode').value;
    const salary_notes = document.getElementById('editSalaryNotes').value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/admin/update-salary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          employee_id,
          designation,
          department,
          salary_amount,
          salary_status,
          salary_date,
          payment_mode,
          salary_notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update salary');

      this.closeModal('updateSalaryModal');
      this.showToast('✓ Staff salary & details updated successfully!', 'success', 'Salary Updated');

      await this.loadAdminPortal();
      if (this.selectedStudentId === employee_id) {
        await this.selectStudent(employee_id);
      }
    } catch (err) {
      this.showToast(err.message, 'error', 'Update Failed');
    }
  },

  async loadAdminAttendanceLedger(date) {
    const targetDate = date || this.adminAttendanceDate || new Date().toISOString().slice(0, 10);
    this.adminAttendanceDate = targetDate;
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff-attendance?date=${targetDate}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        this.adminAttendanceLedger = await res.json();
      }
    } catch (err) {
      console.error('Failed to load admin attendance ledger:', err);
    }
  },

  async changeAdminAttendanceDate(newDate) {
    if (!newDate) return;
    this.adminAttendanceDate = newDate;
    await this.loadAdminAttendanceLedger(newDate);
    this.renderAdminPortal();
  },

  getEmpTodayAttendanceBadge(empId) {
    if (!this.adminAttendanceLedger || !this.adminAttendanceLedger.records) {
      return '<span class="status-pill" style="font-size:9.5px; padding:1px 6px; background:#f1f5f9; color:#64748b;">⚪ Att: Unmarked</span>';
    }
    const rec = this.adminAttendanceLedger.records.find(r => r.id === empId);
    if (!rec || !rec.status) {
      return '<span class="status-pill" style="font-size:9.5px; padding:1px 6px; background:#f1f5f9; color:#64748b;">⚪ Att: Unmarked</span>';
    }
    if (rec.status === 'PRESENT') {
      return `<span class="status-pill" style="font-size:9.5px; padding:1px 6px; background:#dcfce7; color:#15803d; border-color:#86efac;">🟢 ${rec.check_in_time ? rec.check_in_time : 'Present'}</span>`;
    }
    if (rec.status === 'LEAVE') {
      return '<span class="status-pill" style="font-size:9.5px; padding:1px 6px; background:#fee2e2; color:#b91c1c; border-color:#fca5a5;">🏖️ Leave</span>';
    }
    if (rec.status === 'HALF_DAY') {
      return `<span class="status-pill" style="font-size:9.5px; padding:1px 6px; background:#fef3c7; color:#b45309; border-color:#fde68a;">🌓 Half-Day</span>`;
    }
    return `<span class="status-pill" style="font-size:9.5px; padding:1px 6px;">${rec.status}</span>`;
  },

  openMarkAttendanceModal(userId, fullName, date) {
    const target = this.allStudents.find(s => s.id === userId);
    const name = fullName || (target ? target.full_name : 'Staff');
    const existingRec = (this.adminAttendanceLedger && this.adminAttendanceLedger.records)
      ? this.adminAttendanceLedger.records.find(r => r.id === userId)
      : null;

    document.getElementById('attStaffUserId').value = userId;
    document.getElementById('attTargetStaffName').innerText = `${name} (@${target ? target.username : ''})`;
    document.getElementById('attDate').value = date || this.adminAttendanceDate || new Date().toISOString().slice(0, 10);
    document.getElementById('attStatus').value = (existingRec && existingRec.status) ? existingRec.status : 'PRESENT';
    document.getElementById('attCheckIn').value = (existingRec && existingRec.check_in_time) ? existingRec.check_in_time : '09:30 AM';
    document.getElementById('attCheckOut').value = (existingRec && existingRec.check_out_time) ? existingRec.check_out_time : '';
    document.getElementById('attNotes').value = (existingRec && existingRec.notes) ? existingRec.notes : '';

    this.openModal('markAttendanceModal');
  },

  async handleAdminAttendanceSubmit(e) {
    e.preventDefault();
    const user_id = Number(document.getElementById('attStaffUserId').value);
    const attendance_date = document.getElementById('attDate').value;
    const status = document.getElementById('attStatus').value;
    const check_in_time = document.getElementById('attCheckIn').value.trim();
    const check_out_time = document.getElementById('attCheckOut').value.trim();
    const notes = document.getElementById('attNotes').value.trim();

    try {
      const res = await fetch(`${API_BASE}/api/admin/staff-attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ user_id, attendance_date, status, check_in_time, check_out_time, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update attendance');

      this.closeModal('markAttendanceModal');
      this.showToast('✓ Attendance record saved successfully!', 'success', 'Attendance Saved');

      await this.loadAdminAttendanceLedger(attendance_date);
      if (this.selectedStudentId === user_id) {
        await this.fetchStaffAttendanceHistory(user_id);
      }
      this.renderAdminPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Error');
    }
  },

  async quickMarkStaffAttendance(userId, status) {
    const today = this.adminAttendanceDate || new Date().toISOString().slice(0, 10);
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff-attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          user_id: userId,
          attendance_date: today,
          status,
          check_in_time: status === 'PRESENT' || status === 'HALF_DAY' ? '09:30 AM' : ''
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record attendance');
      this.showToast(`✓ Marked ${status} for ${today}`, 'success', 'Attendance Recorded');
      await this.loadAdminAttendanceLedger(today);
      await this.fetchStaffAttendanceHistory(userId);
      this.renderAdminPortal();
    } catch (err) {
      this.showToast(err.message, 'error', 'Error');
    }
  },

  async fetchStaffAttendanceHistory(userId) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/staff-attendance/history?user_id=${userId}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.selectedStaffAttendanceHistory[userId] = data.history || [];
      }
    } catch (err) {
      console.error('Failed to fetch staff history:', err);
    }
  },

  renderStaffAttendanceHistoryTable(empId) {
    const history = this.selectedStaffAttendanceHistory[empId] || [];
    if (history.length === 0) {
      return `
        <div style="text-align:center; padding:16px; color:#64748b; font-size:12.5px; background:#f8fafc; border-radius:8px;">
          No attendance records logged yet for this staff member. Click "+ Mark / Edit Attendance" above to record presence.
        </div>
      `;
    }

    return `
      <div style="margin-top:10px;">
        <div style="font-size:13px; font-weight:700; color:var(--dark-navy); margin-bottom:8px;">
          📋 Attendance Log (Last ${Math.min(history.length, 20)} Days)
        </div>
        <div class="table-wrapper" style="max-height:220px; overflow-y:auto;">
          <table class="staff-att-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Notes / Mode</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${history.slice(0, 20).map(h => `
                <tr>
                  <td><strong>${h.attendance_date}</strong></td>
                  <td>
                    <span class="status-pill status-${h.status === 'PRESENT' ? 'paid' : (h.status === 'LEAVE' ? 'pending' : 'partial')}" style="font-size:10px; padding:2px 8px;">
                      ${h.status}
                    </span>
                  </td>
                  <td>${h.check_in_time || '—'}</td>
                  <td>${h.check_out_time || '—'}</td>
                  <td style="color:#64748b;">${this.escape(h.notes || '—')}</td>
                  <td>
                    <button type="button" class="btn btn-outline btn-sm" style="font-size:10px; padding:2px 6px;" onclick="app.openMarkAttendanceModal(${empId}, '', '${h.attendance_date}')">✏️ Edit</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async handleAdminEnroll(e) {
    e.preventDefault();
    const memberType = document.getElementById('addMemberType') ? document.getElementById('addMemberType').value : 'student';
    const full_name = document.getElementById('addName').value.trim();
    const username = document.getElementById('addUsername').value.trim();
    const password = document.getElementById('addPassword').value.trim();
    const joining_date = document.getElementById('addJoiningDate').value;

    let payload = {
      full_name,
      username,
      password,
      joining_date,
      user_type: memberType
    };

    if (memberType === 'student') {
      const durEl = document.getElementById('addCourseDuration');
      const mFeeEl = document.getElementById('addMonthlyFee');
      const dMonthsEl = document.getElementById('addDurationMonths');
      const trackEl = document.getElementById('addCourseTrack');
      const totalEl = document.getElementById('addStudentTotalFees');
      const paidEl = document.getElementById('addStudentPaidFees');
      const statusEl = document.getElementById('addStudentFeesStatus');
      const dueEl = document.getElementById('addStudentDueDate');
      const notesEl = document.getElementById('addStudentPaymentNotes');

      payload.course_track = trackEl ? trackEl.value.trim() : '';
      payload.course_duration = durEl ? durEl.value : '6_MONTHS';
      payload.monthly_fee = mFeeEl ? Number(mFeeEl.value || 2500) : 2500;
      payload.duration_months = dMonthsEl ? Number(dMonthsEl.value || 6) : 6;
      payload.total_fees = totalEl ? Number(totalEl.value || (payload.monthly_fee * payload.duration_months)) : (payload.monthly_fee * payload.duration_months);
      payload.fees_paid = paidEl ? Number(paidEl.value || 0) : 0;
      payload.fees_status = statusEl ? statusEl.value : 'PENDING';
      payload.fees_due_date = dueEl ? dueEl.value : '';
      payload.payment_notes = notesEl ? notesEl.value.trim() : '';
    } else if (memberType === 'intern') {
      const durEl = document.getElementById('addInternDuration');
      const mFeeEl = document.getElementById('addInternMonthlyFee');
      const dMonthsEl = document.getElementById('addInternDurationMonths');
      const trackEl = document.getElementById('addInternTrack');
      const totalEl = document.getElementById('addInternTotalFees');
      const paidEl = document.getElementById('addInternPaidFees');
      const statusEl = document.getElementById('addInternFeesStatus');
      const dueEl = document.getElementById('addInternDueDate');
      const notesEl = document.getElementById('addInternPaymentNotes');

      payload.course_track = trackEl ? trackEl.value.trim() : 'Frontend Engineering Internship';
      payload.course_duration = 'INTERNSHIP';
      payload.monthly_fee = mFeeEl ? Number(mFeeEl.value || 1000) : 1000;
      payload.duration_months = dMonthsEl ? Number(dMonthsEl.value || 3) : 3;
      payload.total_fees = totalEl ? Number(totalEl.value || (payload.monthly_fee * payload.duration_months)) : (payload.monthly_fee * payload.duration_months);
      payload.fees_paid = paidEl ? Number(paidEl.value || 0) : 0;
      payload.fees_status = statusEl ? statusEl.value : 'PENDING';
      payload.fees_due_date = dueEl ? dueEl.value : '';
      payload.payment_notes = notesEl ? notesEl.value.trim() : '';
    } else if (memberType === 'employee') {
      const desigEl = document.getElementById('addEmployeeDesignation');
      const deptEl = document.getElementById('addEmployeeDepartment');
      const salaryEl = document.getElementById('addEmployeeSalary');
      const statusEl = document.getElementById('addEmployeeSalaryStatus');
      const dateEl = document.getElementById('addEmployeeSalaryDate');
      const modeEl = document.getElementById('addEmployeePaymentMode');
      const notesEl = document.getElementById('addEmployeeSalaryNotes');

      payload.designation = desigEl ? desigEl.value.trim() : 'Staff';
      payload.department = deptEl ? deptEl.value.trim() : 'GrowthNest';
      payload.salary_amount = salaryEl ? Number(salaryEl.value || 0) : 0;
      payload.salary_status = statusEl ? statusEl.value : 'PENDING';
      payload.salary_date = dateEl ? dateEl.value : '';
      payload.payment_mode = modeEl ? modeEl.value : 'Bank Transfer';
      payload.salary_notes = notesEl ? notesEl.value.trim() : '';
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
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

      // Reset sidebar filter so the new member is immediately visible in directory
      this.sidebarFilter = 'all';
      this.adminCategoryFilter = memberType;
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

      const roleLabel = memberType === 'employee' ? 'Staff Member' : (memberType === 'intern' ? 'Intern' : 'Student');
      this.showToast(
        `✓ ${full_name} (@${username}) registered successfully as ${roleLabel}!`,
        'success',
        'Member Added'
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

  confirmRemoveStudent(studentId, studentName) {
    this.showDialog({
      type: 'confirm',
      title: '⚠️ Remove Student Account?',
      message: `Are you sure you want to permanently remove student <strong>"${this.escape(studentName)}"</strong>?<br><br><span style="color:#dc2626; font-size:12px;">This will permanently delete their account, all enrolled task records, and submitted code.</span>`,
      confirmText: '🗑️ Yes, Delete Student',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE}/api/admin/students`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ student_id: studentId })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to remove student');

          this.showToast(data.message || `Student ${studentName} removed successfully`, 'success', 'Student Removed');
          this.selectedStudentId = null;
          await this.loadAdminPortal();
        } catch (err) {
          this.showToast(err.message, 'error', 'Action Failed');
        }
      }
    });
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
      this.showToast('Problem / feedback note inserted.', 'info', 'Feedback Template');
    }
  },

  inspectCode(code) {
    const raw = (code || '').trim();
    if (!raw || raw === 'No code provided') {
      return { hasIssue: true, message: 'Empty submission (no source code found)' };
    }
    if (raw.length < 25 && !raw.includes('<')) {
      return { hasIssue: true, message: 'Dummy / placeholder text detected (no HTML tags found)' };
    }
    if (!raw.includes('<') || !raw.includes('>')) {
      return { hasIssue: true, message: 'No valid HTML tags detected in submission' };
    }
    if (!raw.toLowerCase().includes('<!doctype') && !raw.toLowerCase().includes('<html')) {
      return { hasIssue: true, message: 'Missing <!DOCTYPE html> or <html> document root' };
    }
    return { hasIssue: false, message: 'Valid HTML structure detected' };
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

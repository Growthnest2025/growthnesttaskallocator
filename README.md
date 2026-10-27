# 🌿 GrowthNest Tech Solutions - Student Task Portal

A lightweight, automated task allocation, evaluation, and tracking system built for **GrowthNest Tech Solutions**.

---

## 🚀 Key Features

1. **Automated Sequential Task Gating:**
   - Starts with **HTML**, then **CSS**, then **JavaScript**.
   - Students cannot skip tasks: **The next task unlocks only after Admin reviews and approves the submission**.

2. **Joining Date & Time Elapsed Calculation:**
   - Tracks duration automatically from each student's `joining_date` (e.g., *Day 16 of Learning Track*).
   - Instant visibility for mentors on student pace.

3. **Cloudflare Architecture (Zero Maintenance & Ultra-Low File Size):**
   - **Cloudflare D1**: Serverless Cloud SQL Database for students, curriculum tasks, submissions, and status.
   - **Cloudflare R2**: Cloud Object Storage (S3-compatible) with **$0 egress fees** for student screenshots, output images, and code files.
   - **Cloudflare Workers**: Global serverless execution.

4. **Interactive Code Playground & Live Runner:**
   - Built-in HTML, CSS, JavaScript editor.
   - Live sandboxed preview so students and admins can test output directly inside the browser.
   - Direct screenshot upload to Cloudflare R2 bucket.

5. **Admin Evaluation Dashboard:**
   - One-click review queue.
   - Side-by-side inspection of student source code, live output sandbox, and R2 screenshot.
   - 1-click **Approve & Unlock Next Task** or **Request Changes** with mentor remarks.

---

## ⚡ Quick Start (Local Run - Zero Dependencies)

No heavy downloads or gigabytes of `node_modules` required!

```bash
cd growthnest-task-portal
npm start
```

Open your browser at: **`http://localhost:5000`**

### Pre-Configured Demo Accounts:
- **Admin / Mentor:** `admin` / `admin123`
- **Student 1 (Karthik Raja - Day 16):** `karthik` / `student123`
- **Student 2 (Ananya S - Day 4):** `ananya` / `student123`

---

## ☁️ Deploying to Cloudflare (D1 Database + R2 Storage)

### Step 1: Install Wrangler (if not already installed)
```bash
npm install -g wrangler
# or use npx wrangler
```

### Step 2: Log In to Cloudflare
```bash
npx wrangler login
```

### Step 3: Create Cloudflare D1 Database
```bash
npx wrangler d1 create growthnest-db
```
*(Copy the generated `database_id` into `wrangler.jsonc`)*

### Step 4: Initialize Database Schema
```bash
npx wrangler d1 execute growthnest-db --file=schema.sql
```

### Step 5: Create Cloudflare R2 Storage Bucket
```bash
npx wrangler r2 bucket create growthnest-submissions
```

### Step 6: Deploy to Cloudflare
```bash
npx wrangler deploy
```

---

## 📁 Project Structure (Ultra-Lightweight)

```text
growthnest-task-portal/
├── server.js          # Standalone local dev server (zero dependencies, native SQLite & R2 simulation)
├── worker.js          # Cloudflare Worker API for Cloudflare D1 & R2
├── wrangler.jsonc     # Cloudflare bindings configuration
├── schema.sql         # Cloudflare D1 / SQLite database schema with seeded curriculum
├── package.json       # Project scripts (< 1 KB)
├── public/            # Frontend SPA (< 50 KB total)
│   ├── index.html     # Responsive layout & modals
│   ├── styles.css     # Clean GrowthNest design system
│   └── app.js         # State manager, live preview iframe, R2 uploader
└── uploads/           # Local storage folder for screenshots when running offline
```

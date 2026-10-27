/**
 * GrowthNest Tech Solutions - Cloudflare Worker API
 * Runs serverlessly on Cloudflare Global Network
 * Uses Cloudflare D1 (SQL Database) & Cloudflare R2 (Object Storage)
 */

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function calculateDaysEnrolled(joiningDateStr) {
  if (!joiningDateStr) return 1;
  const join = new Date(joiningDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - join.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays + 1;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    const db = env.DB;
    const r2 = env.STORAGE;

    try {
      // ----------------------------------------------------------------------
      // AUTH: Login
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        const { username, password } = await request.json();
        if (!username || !password) {
          return jsonResponse({ error: "Username and password required" }, 400);
        }

        const hashed = await sha256(password);
        const user = await db
          .prepare("SELECT * FROM users WHERE username = ? AND (password_hash = ? OR password_hash = ?)")
          .bind(username, hashed, password)
          .first();

        if (!user) {
          return jsonResponse({ error: "Invalid username or password" }, 401);
        }

        // Generate simple bearer token
        const token = btoa(JSON.stringify({ id: user.id, username: user.username, role: user.role }));

        return jsonResponse({
          token,
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            joining_date: user.joining_date,
            course_track: user.course_track,
            days_enrolled: calculateDaysEnrolled(user.joining_date)
          }
        });
      }

      // ----------------------------------------------------------------------
      // AUTH: Register (Account Creation)
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        const { full_name, username, password, email, phone, role, joining_date, course_track } = await request.json();

        if (!full_name || !username || !password) {
          return jsonResponse({ error: "Full name, username, and password are required" }, 400);
        }

        const existing = await db.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
        if (existing) {
          return jsonResponse({ error: "Username already exists. Please choose another." }, 400);
        }

        const passHash = await sha256(password);
        const assignedRole = role === "admin" ? "admin" : "student";
        const joinDate = joining_date || new Date().toISOString().split("T")[0];
        const track = course_track || "Frontend Web Development (HTML/CSS/JS)";

        const res = await db
          .prepare(
            `INSERT INTO users (username, password_hash, role, full_name, email, phone, joining_date, course_track)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(username, passHash, assignedRole, full_name, email || "", phone || "", joinDate, track)
          .run();

        const userId = res.meta.last_row_id;

        if (assignedRole === "student") {
          await db
            .prepare("INSERT INTO student_progress (student_id, current_task_id, status) VALUES (?, 1, 'IN_PROGRESS')")
            .bind(userId)
            .run();
        }

        const token = btoa(JSON.stringify({ id: userId, username, role: assignedRole }));

        return jsonResponse({
          token,
          user: {
            id: userId,
            username,
            full_name,
            role: assignedRole,
            joining_date: joinDate,
            course_track: track,
            days_enrolled: 1
          },
          message: "Account registered successfully!"
        });
      }

      // ----------------------------------------------------------------------
      // AUTH: Current User Info
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/auth/me" && request.method === "GET") {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

        const token = authHeader.replace("Bearer ", "");
        const decoded = JSON.parse(atob(token));
        const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(decoded.id).first();
        if (!user) return jsonResponse({ error: "User not found" }, 404);

        return jsonResponse({
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            joining_date: user.joining_date,
            course_track: user.course_track,
            days_enrolled: calculateDaysEnrolled(user.joining_date)
          }
        });
      }

      // ----------------------------------------------------------------------
      // TASKS: Get Student Learning Path & Roadmap
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/student/roadmap" && request.method === "GET") {
        const studentId = url.searchParams.get("student_id");
        if (!studentId) return jsonResponse({ error: "Student ID required" }, 400);

        const tasksResult = await db.prepare("SELECT * FROM tasks ORDER BY sequence_order ASC").all();
        const tasks = tasksResult.results || [];

        const progressResult = await db
          .prepare("SELECT * FROM student_progress WHERE student_id = ?")
          .bind(studentId)
          .all();
        const progressMap = new Map();
        (progressResult.results || []).forEach(p => progressMap.set(p.current_task_id, p.status));

        // Get latest submissions
        const submissionsResult = await db
          .prepare("SELECT * FROM submissions WHERE student_id = ? ORDER BY id DESC")
          .bind(studentId)
          .all();
        const submissionsMap = new Map();
        (submissionsResult.results || []).forEach(s => {
          if (!submissionsMap.has(s.task_id)) submissionsMap.set(s.task_id, s);
        });

        // Determine unlocked status based on strict progression rule
        let previousTaskApproved = true;
        const roadmap = tasks.map(task => {
          const status = progressMap.get(task.id) || "NOT_STARTED";
          const submission = submissionsMap.get(task.id) || null;

          let isUnlocked = previousTaskApproved;
          let taskState = "LOCKED";

          if (status === "APPROVED") {
            taskState = "COMPLETED";
            previousTaskApproved = true;
          } else if (isUnlocked) {
            if (status === "SUBMITTED") {
              taskState = "UNDER_REVIEW";
            } else if (status === "REVISION_REQUESTED") {
              taskState = "CHANGES_REQUESTED";
            } else {
              taskState = "ACTIVE";
            }
            previousTaskApproved = false; // Next tasks remain locked!
          } else {
            taskState = "LOCKED";
            previousTaskApproved = false;
          }

          return {
            ...task,
            requirements: JSON.parse(task.requirements_json || "[]"),
            state: taskState,
            status,
            submission
          };
        });

        const completedCount = roadmap.filter(t => t.state === "COMPLETED").length;
        const progressPercent = Math.round((completedCount / tasks.length) * 100);

        return jsonResponse({
          roadmap,
          total_tasks: tasks.length,
          completed_tasks: completedCount,
          progress_percent: progressPercent
        });
      }

      // ----------------------------------------------------------------------
      // SUBMISSIONS: Submit Code & Output
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/submissions" && request.method === "POST") {
        const body = await request.json();
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
          return jsonResponse({ error: "Missing student_id or task_id" }, 400);
        }

        let outputUrl = "";
        let screenshotKey = "";

        // If file or screenshot is submitted, save to Cloudflare R2
        if (output_base64 && r2) {
          screenshotKey = `submissions/student_${student_id}_task_${task_id}_${Date.now()}_${file_name || "output.png"}`;
          const cleanBase64 = output_base64.replace(/^data:[^;]+;base64,/, "");
          const binary = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
          await r2.put(screenshotKey, binary, {
            httpMetadata: { contentType: "image/png" }
          });
          outputUrl = `/api/storage/${encodeURIComponent(screenshotKey)}`;
        } else if (output_base64) {
          outputUrl = output_base64; // local fallback
        }

        // Insert into submissions table
        const insertSub = await db
          .prepare(
            `INSERT INTO submissions (student_id, task_id, code_html, code_css, code_js, sample_code_text, output_url, output_screenshot_key, student_notes, status, submitted_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)`
          )
          .bind(
            student_id,
            task_id,
            code_html || "",
            code_css || "",
            code_js || "",
            sample_code_text || "",
            outputUrl,
            screenshotKey,
            student_notes || ""
          )
          .run();

        // Update progress table to SUBMITTED
        await db
          .prepare(
            `INSERT INTO student_progress (student_id, current_task_id, status)
             VALUES (?, ?, 'SUBMITTED')
             ON CONFLICT(student_id, current_task_id) DO UPDATE SET status = 'SUBMITTED'`
          )
          .bind(student_id, task_id)
          .run();

        return jsonResponse({
          success: true,
          message: "Task submitted successfully! Awaiting Admin review.",
          submission_id: insertSub.meta.last_row_id
        });
      }

      // ----------------------------------------------------------------------
      // ADMIN: KPI Stats (Real Database Counts)
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/admin/stats" && request.method === "GET") {
        const totalStudents = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").first()).count;
        const pendingReviews = (await db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'PENDING'").first()).count;
        const approvedTasks = (await db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'APPROVED'").first()).count;
        const rejectedTasks = (await db.prepare("SELECT COUNT(*) as count FROM submissions WHERE status = 'CHANGES_REQUESTED'").first()).count;

        return jsonResponse({
          total_students: totalStudents,
          pending_reviews: pendingReviews,
          approved_tasks: approvedTasks,
          rejected_tasks: rejectedTasks
        });
      }

      // ----------------------------------------------------------------------
      // ADMIN: Get All Students with Joining Dates & Days Count
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/admin/students" && request.method === "GET") {
        const studentsResult = await db
          .prepare("SELECT id, username, full_name, email, phone, joining_date, course_track, created_at FROM users WHERE role = 'student' ORDER BY id DESC")
          .all();

        const students = await Promise.all(
          (studentsResult.results || []).map(async student => {
            const daysEnrolled = calculateDaysEnrolled(student.joining_date);

            // Get current active progress
            const progress = await db
              .prepare(
                `SELECT sp.*, t.title as task_title, t.sequence_order
                 FROM student_progress sp
                 JOIN tasks t ON sp.current_task_id = t.id
                 WHERE sp.student_id = ?
                 ORDER BY t.sequence_order DESC LIMIT 1`
              )
              .bind(student.id)
              .first();

            // Total completed tasks count
            const completedCount = await db
              .prepare("SELECT COUNT(*) as count FROM student_progress WHERE student_id = ? AND status = 'APPROVED'")
              .bind(student.id)
              .first();

            // Total pending reviews count for this student
            const pendingCount = await db
              .prepare("SELECT COUNT(*) as count FROM submissions WHERE student_id = ? AND status = 'PENDING'")
              .bind(student.id)
              .first();

            return {
              ...student,
              days_enrolled: daysEnrolled,
              current_task_title: progress ? progress.task_title : "Task 1: HTML Semantic Resume",
              current_task_status: progress ? progress.status : "IN_PROGRESS",
              completed_count: completedCount ? completedCount.count : 0,
              pending_count: pendingCount ? pendingCount.count : 0
            };
          })
        );

        return jsonResponse({ students });
      }

      // ----------------------------------------------------------------------
      // ADMIN: Dedicated Student Portfolio & History (Per-Student Workspace)
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/admin/student-portfolio" && request.method === "GET") {
        const studentId = Number(url.searchParams.get("student_id"));
        if (!studentId) return jsonResponse({ error: "student_id is required" }, 400);

        const student = await db
          .prepare("SELECT id, username, full_name, email, phone, joining_date, course_track FROM users WHERE id = ?")
          .bind(studentId)
          .first();
        if (!student) return jsonResponse({ error: "Student not found" }, 404);

        student.days_enrolled = calculateDaysEnrolled(student.joining_date);

        const subsRes = await db
          .prepare(
            `SELECT s.*, t.title as task_title, t.module as task_module, t.sequence_order, t.description as task_desc, t.instructions as task_inst, t.requirements_json
             FROM submissions s
             JOIN tasks t ON s.task_id = t.id
             WHERE s.student_id = ?
             ORDER BY s.id DESC`
          )
          .bind(studentId)
          .all();

        const submissions = (subsRes.results || []).map(sub => ({
          ...sub,
          days_enrolled: student.days_enrolled,
          requirements: JSON.parse(sub.requirements_json || "[]")
        }));

        const pendingSubmission = submissions.find(s => s.status === "PENDING") || null;

        const allTasksRes = await db
          .prepare("SELECT id, sequence_order, module, title, difficulty, requirements_json FROM tasks ORDER BY sequence_order ASC")
          .all();
        const allTasks = allTasksRes.results || [];

        const progRes = await db
          .prepare("SELECT current_task_id, status FROM student_progress WHERE student_id = ?")
          .bind(studentId)
          .all();
        const progMap = {};
        (progRes.results || []).forEach(p => { progMap[p.current_task_id] = p.status; });

        const roadmap = allTasks.map(task => ({
          ...task,
          requirements: JSON.parse(task.requirements_json || "[]"),
          status: progMap[task.id] || "LOCKED"
        }));

        const completedCount = roadmap.filter(t => t.status === "APPROVED").length;
        const pendingCount = submissions.filter(s => s.status === "PENDING").length;

        return jsonResponse({
          student,
          submissions,
          pending_submission: pendingSubmission,
          roadmap,
          total_tasks: allTasks.length,
          completed_tasks: completedCount,
          pending_count: pendingCount
        });
      }

      // ----------------------------------------------------------------------
      // ADMIN: Add New Student
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/admin/students" && request.method === "POST") {
        const { username, password, full_name, email, phone, joining_date, course_track } = await request.json();

        if (!username || !password || !full_name || !joining_date) {
          return jsonResponse({ error: "Username, password, full name, and joining date are required" }, 400);
        }

        const passHash = await sha256(password);

        try {
          const res = await db
            .prepare(
              `INSERT INTO users (username, password_hash, role, full_name, email, phone, joining_date, course_track)
               VALUES (?, ?, 'student', ?, ?, ?, ?, ?)`
            )
            .bind(
              username,
              passHash,
              full_name,
              email || "",
              phone || "",
              joining_date,
              course_track || "Frontend Web Development (HTML/CSS/JS)"
            )
            .run();

          const newStudentId = res.meta.last_row_id;

          // Unlock first task (Task 1: HTML)
          await db
            .prepare("INSERT INTO student_progress (student_id, current_task_id, status) VALUES (?, 1, 'IN_PROGRESS')")
            .bind(newStudentId)
            .run();

          return jsonResponse({ success: true, student_id: newStudentId, message: "Student enrolled successfully!" });
        } catch (err) {
          return jsonResponse({ error: "Username already exists or database error: " + err.message }, 400);
        }
      }

      // ----------------------------------------------------------------------
      // ADMIN: Get Pending Submissions for Review
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/admin/submissions" && request.method === "GET") {
        const statusFilter = url.searchParams.get("status") || "PENDING";
        const submissionsResult = await db
          .prepare(
            `SELECT s.*, u.full_name as student_name, u.username as student_username, u.joining_date,
                    t.title as task_title, t.module as task_module, t.sequence_order
             FROM submissions s
             JOIN users u ON s.student_id = u.id
             JOIN tasks t ON s.task_id = t.id
             WHERE s.status = ?
             ORDER BY s.id DESC`
          )
          .bind(statusFilter)
          .all();

        const submissions = (submissionsResult.results || []).map(sub => ({
          ...sub,
          days_enrolled: calculateDaysEnrolled(sub.joining_date)
        }));

        return jsonResponse({ submissions });
      }

      // ----------------------------------------------------------------------
      // ADMIN: Review & Approve or Request Changes (Unlocks Next Task)
      // ----------------------------------------------------------------------
      if (url.pathname === "/api/admin/review" && request.method === "POST") {
        const { submission_id, action, feedback, admin_id } = await request.json();

        if (!submission_id || !["APPROVE", "REJECT"].includes(action)) {
          return jsonResponse({ error: "Valid submission_id and action (APPROVE/REJECT) required" }, 400);
        }

        const sub = await db.prepare("SELECT * FROM submissions WHERE id = ?").bind(submission_id).first();
        if (!sub) return jsonResponse({ error: "Submission not found" }, 404);

        if (action === "APPROVE") {
          // 1. Mark submission approved
          await db
            .prepare(
              `UPDATE submissions 
               SET status = 'APPROVED', admin_feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
               WHERE id = ?`
            )
            .bind(feedback || "Great job! Approved by GrowthNest Mentor.", admin_id || 1, submission_id)
            .run();

          // 2. Mark task progress as APPROVED
          await db
            .prepare(
              `UPDATE student_progress 
               SET status = 'APPROVED', completed_at = CURRENT_TIMESTAMP 
               WHERE student_id = ? AND current_task_id = ?`
            )
            .bind(sub.student_id, sub.task_id)
            .run();

          // 3. Find next task in sequence and unlock it!
          const currentTask = await db.prepare("SELECT sequence_order FROM tasks WHERE id = ?").bind(sub.task_id).first();
          const nextTask = await db
            .prepare("SELECT id FROM tasks WHERE sequence_order > ? ORDER BY sequence_order ASC LIMIT 1")
            .bind(currentTask.sequence_order)
            .first();

          if (nextTask) {
            await db
              .prepare(
                `INSERT INTO student_progress (student_id, current_task_id, status)
                 VALUES (?, ?, 'IN_PROGRESS')
                 ON CONFLICT(student_id, current_task_id) DO UPDATE SET status = 'IN_PROGRESS'`
              )
              .bind(sub.student_id, nextTask.id)
              .run();
          }

          return jsonResponse({
            success: true,
            action: "APPROVED",
            next_task_unlocked: !!nextTask,
            message: nextTask
              ? "Task approved! Next task has been automatically unlocked for the student."
              : "Final task approved! Student has completed the track."
          });
        } else {
          // Action is REJECT (Changes Requested)
          await db
            .prepare(
              `UPDATE submissions 
               SET status = 'CHANGES_REQUESTED', admin_feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
               WHERE id = ?`
            )
            .bind(feedback || "Please review the requirements and resubmit.", admin_id || 1, submission_id)
            .run();

          await db
            .prepare(
              `UPDATE student_progress 
               SET status = 'REVISION_REQUESTED' 
               WHERE student_id = ? AND current_task_id = ?`
            )
            .bind(sub.student_id, sub.task_id)
            .run();

          return jsonResponse({
            success: true,
            action: "CHANGES_REQUESTED",
            message: "Feedback sent. Student must submit revisions before proceeding."
          });
        }
      }

      // ----------------------------------------------------------------------
      // R2 STORAGE: Retrieve stored output images / files
      // ----------------------------------------------------------------------
      if (url.pathname.startsWith("/api/storage/")) {
        const key = decodeURIComponent(url.pathname.replace("/api/storage/", ""));
        if (!r2) {
          return new Response("R2 storage not configured", { status: 404 });
        }
        const object = await r2.get(key);
        if (!object) return new Response("File not found", { status: 404 });

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        return new Response(object.body, { headers });
      }

      // Fallback for static assets or 404
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return jsonResponse({ error: "Endpoint not found" }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message, stack: err.stack }, 500);
    }
  }
};

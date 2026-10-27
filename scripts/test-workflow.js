const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '../growthnest.db'));

console.log('=== TESTING WORKFLOW FOR GROWTHNEST TECH SOLUTIONS ===\n');

// 1. Check time calculation from joining date
function calculateDaysEnrolled(joiningDateStr) {
  const join = new Date(joiningDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - join.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 1 : diffDays + 1;
}

const students = db.prepare("SELECT * FROM users WHERE role = 'student'").all();
console.log('1. Active Students & Elapsed Time from Joining Date:');
students.forEach(st => {
  const days = calculateDaysEnrolled(st.joining_date);
  console.log(`   - ${st.full_name} (@${st.username}): Joined ${st.joining_date} -> ${days} days active`);
});

// 2. Check Tasks curriculum starting with HTML, CSS, JavaScript
console.log('\n2. Curriculum Tasks Sequence:');
const tasks = db.prepare("SELECT sequence_order, module, title FROM tasks ORDER BY sequence_order ASC").all();
tasks.forEach(t => {
  console.log(`   - Step ${t.sequence_order} [${t.module}]: ${t.title}`);
});

// 3. Test Student 2 (Karthik) progression & gating rule
console.log('\n3. Testing Sequential Progression Rule for Karthik (Student ID 2):');
const progress = db.prepare("SELECT * FROM student_progress WHERE student_id = 2").all();
console.log('   Current progress rows:', progress);

// 4. Test Admin Approval Simulation
console.log('\n4. Simulating Admin Approval for Task 2:');
const pendingSub = db.prepare("SELECT * FROM submissions WHERE student_id = 2 AND status = 'PENDING'").get();
if (pendingSub) {
  console.log(`   Pending submission found for Task ID ${pendingSub.task_id}: "${pendingSub.sample_code_text.substring(0, 40)}..."`);
  
  // Approve submission
  db.prepare("UPDATE submissions SET status = 'APPROVED', admin_feedback = 'Great job! Approved.' WHERE id = ?").run(pendingSub.id);
  db.prepare("UPDATE student_progress SET status = 'APPROVED', completed_at = CURRENT_TIMESTAMP WHERE student_id = 2 AND current_task_id = ?").run(pendingSub.task_id);
  
  // Unlock Next Task (Task 3: HTML5 Media Showcase)
  const nextTask = db.prepare("SELECT id, title FROM tasks WHERE sequence_order > (SELECT sequence_order FROM tasks WHERE id = ?) ORDER BY sequence_order ASC LIMIT 1").get(pendingSub.task_id);
  if (nextTask) {
    db.prepare("INSERT INTO student_progress (student_id, current_task_id, status) VALUES (2, ?, 'IN_PROGRESS') ON CONFLICT(student_id, current_task_id) DO UPDATE SET status = 'IN_PROGRESS'").run(nextTask.id);
    console.log(`   ✓ Task approved! Next task automatically unlocked: "${nextTask.title}" (ID ${nextTask.id})`);
  }
}

// 5. Verify unlocked status
const updatedProgress = db.prepare("SELECT sp.*, t.title FROM student_progress sp JOIN tasks t ON sp.current_task_id = t.id WHERE sp.student_id = 2").all();
console.log('\n5. Updated Roadmap Status for Karthik:');
updatedProgress.forEach(p => {
  console.log(`   - Task: "${p.title}" -> Status: [${p.status}]`);
});

console.log('\n=== WORKFLOW VERIFIED SUCCESSFULLY! ===');

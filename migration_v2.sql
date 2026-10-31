-- Migration: Add user_type, designation, department, fees details and salary details
ALTER TABLE users ADD COLUMN user_type TEXT DEFAULT 'student';
ALTER TABLE users ADD COLUMN designation TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN department TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN total_fees REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN fees_paid REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN fees_status TEXT DEFAULT 'PENDING';
ALTER TABLE users ADD COLUMN fees_due_date TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN payment_notes TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN salary_amount REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN salary_status TEXT DEFAULT 'PENDING';
ALTER TABLE users ADD COLUMN salary_date TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN payment_mode TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN salary_notes TEXT DEFAULT '';

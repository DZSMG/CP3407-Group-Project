/**
 * Prompt 3 - Load demo users into the project's SQLite database.
 *
 * Run: node backend/database/seed-demo-users.js
 */

const Database = require('better-sqlite3');
const fs       = require('fs');
const path     = require('path');

const DB_PATH        = path.join(__dirname, 'campus_booking.db');
const PASSWORDS_PATH = path.join(__dirname, 'demo_passwords.json');
const CSV_PATH       = path.join(__dirname, 'demo_users_credentials.csv');

if (!fs.existsSync(CSV_PATH)) {
  console.error('ERROR: demo_users_credentials.csv not found.');
  console.error('Run: python backend/database/generate_demo_users.py first.');
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');   // disabled during bulk seed

// Ensure extra columns exist (added by the Python generator)
const existingCols = db.prepare("PRAGMA table_info(users)").all().map(r => r.name);
if (!existingCols.includes('full_name')) {
  db.exec("ALTER TABLE users ADD COLUMN full_name TEXT");
}
if (!existingCols.includes('program')) {
  db.exec("ALTER TABLE users ADD COLUMN program TEXT");
}
if (!existingCols.includes('year_of_study')) {
  db.exec("ALTER TABLE users ADD COLUMN year_of_study INTEGER");
}

// Read CSV (header on line 1)
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const lines = csvContent.trim().split('\n').slice(1);  // Skip header

console.log(`Loading ${lines.length} demo users into database...`);

// Clear existing data
db.exec('DELETE FROM bookings');
db.exec('DELETE FROM users');

const insert = db.prepare(`
  INSERT INTO users (student_id, full_name, email, password_hash, role, status, program, year_of_study)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  let count = 0;
  for (const line of rows) {
    // CSV columns: student_id, full_name, email, password (plaintext), role, status, program, year_of_study
    // Programs can contain commas, so split on first 7 commas only
    const parts = line.split(',');
    const studentId    = parts[0].trim();
    const fullName     = parts[1].trim();
    const email        = parts[2].trim();
    const passwordHash = parts[3].trim();
    const role         = parts[4].trim();
    const status       = parts[5].trim();
    // program may contain commas — rejoin remaining parts except the last (year)
    const year         = parts[parts.length - 1].trim();
    const program      = parts.slice(6, parts.length - 1).join(',').trim() || null;
    const yearInt      = year ? (parseInt(year) || null) : null;

    insert.run(studentId, fullName, email, passwordHash, role, status, program, yearInt);
    count++;
    if (count % 500 === 0) console.log(`  [${count}/${rows.length}] inserted...`);
  }
  return count;
});

const total = insertMany(lines);

// Verify
const counts = db.prepare(
  "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role"
).all();

console.log(`\nDone! Inserted ${total} demo users.`);
console.log('Breakdown:');
counts.forEach(r => console.log(`  ${r.role}: ${r.count}`));

// Sample users
const sample = db.prepare('SELECT student_id, full_name, role FROM users LIMIT 5').all();
console.log('\nSample users:');
sample.forEach(u => console.log(`  ${u.student_id} | ${u.full_name} | ${u.role}`));

// Demo login test
const passwords = JSON.parse(fs.readFileSync(PASSWORDS_PATH, 'utf-8'));
const sampleId  = sample[0].student_id;
console.log('\nDemo login test:');
console.log(`  Student ID: ${sampleId}`);
console.log(`  Password:   ${passwords[sampleId]}`);

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDatabase ready for demo!');

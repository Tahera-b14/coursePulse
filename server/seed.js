import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  throw new Error("The Bangladesh demo dataset can only be seeded outside production.");
}

process.env.COURSEFLOW_SEED_SCRIPT = "1";
const [{ db, uploadsDirectory }, bcryptModule] = await Promise.all([
  import("./database.js"),
  import("bcryptjs"),
]);

const bcrypt = bcryptModule.default;
const databaseDirectory = path.dirname(db.name);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(databaseDirectory, `courseflow-before-seed-${timestamp}.sqlite`);

try {
  const attachmentKeys = db.prepare("SELECT DISTINCT file_key FROM submissions WHERE file_key IS NOT NULL")
    .all().map((row) => row.file_key);
  await db.backup(backupPath);
  let backupAttachmentsDirectory = null;
  let backedUpAttachments = 0;
  for (const key of attachmentKeys) {
    if (path.basename(key) !== key) throw new Error("A stored homework filename is invalid; demo reset was not started.");
    const sourcePath = path.join(uploadsDirectory, key);
    if (!fs.existsSync(sourcePath)) throw new Error("A stored homework file is missing; demo reset was not started.");
    if (!backupAttachmentsDirectory) {
      backupAttachmentsDirectory = path.join(databaseDirectory, `courseflow-before-seed-${timestamp}-uploads`);
    }
    fs.mkdirSync(backupAttachmentsDirectory, { recursive: true });
    fs.copyFileSync(sourcePath, path.join(backupAttachmentsDirectory, key), fs.constants.COPYFILE_EXCL);
    backedUpAttachments++;
  }
  const { seedDemoData } = await import("./seed-data.js");
  const summary = seedDemoData(db, bcrypt, uploadsDirectory);
  console.log(`Database backup: ${backupPath}`);
  if (backupAttachmentsDirectory) console.log(`Homework attachment backup: ${backupAttachmentsDirectory} (${backedUpAttachments} files)`);
  console.log(`Seeded admin account, ${summary.teachers} teachers, ${summary.students} students, ${summary.courses} courses, ${summary.enrollments} enrollments, assignments, submissions, announcements, and notifications.`);
  console.log("All seeded accounts use password: 12345678");
  console.log("Administrator: admin@mail.com | Teachers: teacher1@mail.com through teacher5@mail.com | Students: student1@mail.com through student50@mail.com");
} finally {
  db.close();
}

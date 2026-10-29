import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { db, uploadsDirectory } from "./database.js";

const app = express();
const port = Number(process.env.PORT || 5000);
const jwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === "production" && !jwtSecret) {
  throw new Error("JWT_SECRET must be set in production.");
}
const signingSecret = jwtSecret || "local-only-courseflow-secret";
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const maxHomeworkSize = 10 * 1024 * 1024;
const homeworkExtensions = new Set([".pdf", ".doc", ".docx", ".odt", ".rtf", ".txt", ".md", ".csv", ".png", ".jpg", ".jpeg", ".webp"]);
const homeworkUpload = multer({
  dest: uploadsDirectory,
  limits: { fileSize: maxHomeworkSize, files: 1, fields: 1, fieldSize: 10000 },
});

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, signingSecret, { expiresIn: "7d" });
}

function setSession(res, user) {
  res.cookie("courseflow_session", createToken(user), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies.courseflow_session;
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try {
    const payload = jwt.verify(token, signingSecret);
    const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(payload.sub);
    if (!user) return res.status(401).json({ error: "Your session is no longer valid." });
    req.user = user;
    next();
  } catch (error) {
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") return next(error);
    res.clearCookie("courseflow_session");
    return res.status(401).json({ error: "Your session has expired. Please sign in again." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "You do not have permission to do that." });
    next();
  };
}

function canManageCourse(req, course) {
  return req.user.role === "admin" || course.instructor_id === req.user.id;
}

function readCourse(id) {
  return db.prepare(`
    SELECT c.*, u.name AS instructor_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS enrolled_count
    FROM courses c JOIN users u ON u.id = c.instructor_id
    WHERE c.id = ?
  `).get(id);
}

function removeHomeworkFiles(fileKeys) {
  for (const key of fileKeys) {
    if (!key) continue;
    const filePath = path.join(uploadsDirectory, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readProfile(userId) {
  const profile = db.prepare("SELECT id, name, email, role, bio, phone, created_at FROM users WHERE id = ?").get(userId);
  if (!profile) return null;
  let stats;
  if (profile.role === "student") {
    const graded = db.prepare(`
      SELECT s.grade, a.max_points FROM submissions s JOIN assignments a ON a.id = s.assignment_id
      WHERE s.student_id = ? AND s.grade IS NOT NULL
    `).all(userId);
    const earned = graded.reduce((sum, row) => sum + row.grade, 0);
    const possible = graded.reduce((sum, row) => sum + row.max_points, 0);
    stats = {
      courses: db.prepare("SELECT COUNT(*) AS total FROM enrollments WHERE student_id = ? AND status = 'active'").get(userId).total,
      credits: db.prepare("SELECT COALESCE(SUM(c.credits), 0) AS total FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ? AND e.status = 'active'").get(userId).total,
      completedCourses: db.prepare("SELECT COUNT(*) AS total FROM enrollments WHERE student_id = ? AND status = 'completed'").get(userId).total,
      earnedCredits: db.prepare("SELECT COALESCE(SUM(c.credits), 0) AS total FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.student_id = ? AND e.status = 'completed'").get(userId).total,
      submissions: db.prepare("SELECT COUNT(*) AS total FROM submissions WHERE student_id = ?").get(userId).total,
      average: possible ? Math.round((earned / possible) * 1000) / 10 : null,
    };
    profile.learning = {
      courses: db.prepare(`
        SELECT c.id, c.code, c.title, c.category, c.credits, e.status, e.enrolled_at
        FROM enrollments e JOIN courses c ON c.id = e.course_id
        WHERE e.student_id = ? ORDER BY e.status = 'active' DESC, e.enrolled_at DESC LIMIT 6
      `).all(userId),
      upcoming: db.prepare(`
        SELECT a.id, a.title, a.due_date, a.max_points, c.code, c.title AS course_title
        FROM assignments a JOIN courses c ON c.id = a.course_id
        JOIN enrollments e ON e.course_id = c.id AND e.student_id = ? AND e.status = 'active'
        LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
        WHERE s.id IS NULL AND a.due_date >= datetime('now')
        ORDER BY a.due_date ASC LIMIT 5
      `).all(userId),
    };
  } else if (profile.role === "instructor") {
    stats = {
      courses: db.prepare("SELECT COUNT(*) AS total FROM courses WHERE instructor_id = ?").get(userId).total,
      learners: db.prepare("SELECT COUNT(DISTINCT e.student_id) AS total FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE c.instructor_id = ? AND e.status = 'active'").get(userId).total,
      assignments: db.prepare("SELECT COUNT(*) AS total FROM assignments a JOIN courses c ON c.id = a.course_id WHERE c.instructor_id = ?").get(userId).total,
    };
    profile.teaching = db.prepare(`
      SELECT c.id, c.code, c.title, c.category, c.credits, c.capacity,
        (SELECT COUNT(DISTINCT e.student_id) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS learners,
        (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) AS assignments
      FROM courses c WHERE c.instructor_id = ? ORDER BY c.title LIMIT 8
    `).all(userId);
  } else {
    stats = {
      users: db.prepare("SELECT COUNT(*) AS total FROM users").get().total,
      courses: db.prepare("SELECT COUNT(*) AS total FROM courses").get().total,
      students: db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'student'").get().total,
      instructors: db.prepare("SELECT COUNT(*) AS total FROM users WHERE role = 'instructor'").get().total,
      enrollments: db.prepare("SELECT COUNT(*) AS total FROM enrollments WHERE status = 'active'").get().total,
    };
  }
  return { ...profile, stats };
}

function readPublicProfile(userId) {
  const profile = readProfile(userId);
  if (!profile) return null;
  const { id, name, role, bio, created_at, stats } = profile;
  return {
    id, name, role, bio, created_at, stats,
    ...(role === "student" ? { courses: profile.learning.courses } : {}),
    ...(role === "instructor" ? { courses: profile.teaching } : {}),
  };
}

function readProfileComments(profileId) {
  return db.prepare(`
    SELECT comments.id, comments.profile_id, comments.author_id, comments.body, comments.created_at,
      users.name AS author_name, users.role AS author_role
    FROM profile_comments comments JOIN users ON users.id = comments.author_id
    WHERE comments.profile_id = ? ORDER BY comments.created_at DESC, comments.id DESC
  `).all(profileId);
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: "Password must be between 8 and 128 characters." });
  }
  try {
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')
    `).run(name.trim(), email.trim().toLowerCase(), bcrypt.hashSync(password, 12));
    const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(result.lastInsertRowid);
    setSession(res, user);
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "An account with that email already exists." });
    next(error);
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Enter your email and password." });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email.trim());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  setSession(res, user);
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (_req, res) => {
  res.clearCookie("courseflow_session", { httpOnly: true, secure: isProduction, sameSite: "lax" });
  res.status(204).end();
});

app.get("/api/auth/me", (req, res, next) => {
  const token = req.cookies.courseflow_session;
  if (!token) return res.json({ user: null });
  try {
    const payload = jwt.verify(token, signingSecret);
    const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ?").get(payload.sub);
    if (!user) res.clearCookie("courseflow_session");
    return res.json({ user: user ? publicUser(user) : null });
  } catch (error) {
    if (error.name !== "JsonWebTokenError" && error.name !== "TokenExpiredError") return next(error);
    res.clearCookie("courseflow_session");
    return res.json({ user: null });
  }
});

app.get("/api/courses", (req, res) => {
  const search = typeof req.query.search === "string" ? `%${req.query.search.trim()}%` : "%";
  const category = typeof req.query.category === "string" && req.query.category !== "All" ? req.query.category : null;
  const courses = db.prepare(`
    SELECT c.id, c.code, c.title, c.description, c.category, c.level, c.credits, c.capacity,
      u.name AS instructor_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS enrolled_count
    FROM courses c JOIN users u ON u.id = c.instructor_id
    WHERE (c.title LIKE ? OR c.code LIKE ? OR c.description LIKE ?)
      AND (? IS NULL OR c.category = ?)
    ORDER BY c.created_at DESC, c.id DESC
  `).all(search, search, search, category, category);
  res.json({ courses });
});

app.get("/api/courses/:id", (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  res.json({ course });
});

app.post("/api/courses/:id/enroll", requireAuth, requireRole("student"), (req, res) => {
  const courseId = Number(req.params.id);
  const enrollTx = db.transaction(() => {
    const course = readCourse(courseId);
    if (!course) {
      const err = new Error("Course not found.");
      err.status = 404;
      throw err;
    }
    if (course.enrolled_count >= course.capacity) {
      const err = new Error("This course is full.");
      err.status = 409;
      throw err;
    }
    db.prepare("INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)").run(req.user.id, course.id);
    return course;
  });
  try {
    const course = enrollTx();
    res.status(201).json({ message: `You are enrolled in ${course.title}.` });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "You are already enrolled in this course." });
    if (error.status) return res.status(error.status).json({ error: error.message });
    throw error;
  }
});

app.delete("/api/courses/:id/enroll", requireAuth, requireRole("student"), (req, res) => {
  const result = db.prepare("DELETE FROM enrollments WHERE student_id = ? AND course_id = ?").run(req.user.id, Number(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: "You are not enrolled in this course." });
  res.status(204).end();
});

app.get("/api/dashboard", requireAuth, (req, res) => {
  if (req.user.role === "student") {
    const courses = db.prepare(`
      SELECT c.id, c.code, c.title, c.category, c.level, c.credits, u.name AS instructor_name,
        e.enrolled_at, (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) AS assignment_count
      FROM enrollments e JOIN courses c ON c.id = e.course_id JOIN users u ON u.id = c.instructor_id
      WHERE e.student_id = ? ORDER BY e.enrolled_at DESC
    `).all(req.user.id);
    
    const assignments = db.prepare(`
      SELECT a.id, a.title, a.due_date, a.max_points, c.title AS course_title, s.grade, s.submitted_at
      FROM assignments a JOIN courses c ON c.id = a.course_id
      JOIN enrollments e ON e.course_id = c.id AND e.student_id = ?
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
      ORDER BY a.due_date ASC LIMIT 8
    `).all(req.user.id, req.user.id);
    return res.json({ courses, assignments });
    
  }
  
  const learnerCount = db.prepare(`
    SELECT COUNT(DISTINCT e.student_id) AS total
    FROM enrollments e JOIN courses c ON c.id = e.course_id
    WHERE c.instructor_id = ? AND e.status = 'active'
  `).get(req.user.id).total;
  const courses = db.prepare(`
    SELECT c.id, c.code, c.title, c.description, c.category, c.level, c.credits, c.capacity, c.instructor_id,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS enrolled_count
    FROM courses c WHERE c.instructor_id = ? ORDER BY c.title
  `).all(req.user.id);
  
  const assignments = db.prepare(`
    SELECT a.id, a.course_id, a.title, a.due_date, a.max_points, c.code, c.title AS course_title,
      (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count
    FROM assignments a JOIN courses c ON c.id = a.course_id
    WHERE c.instructor_id = ? ORDER BY a.due_date LIMIT 8
  `).all(req.user.id);
  res.json({ courses, assignments, learner_count: learnerCount });
  });

app.get("/api/courses/:id/assignments", requireAuth, (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  const enrolled = db.prepare("SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?").get(req.user.id, course.id);
  if (req.user.role === "student" && !enrolled) return res.status(403).json({ error: "Enroll in this course to view its assignments." });
  if (req.user.role === "instructor" && !canManageCourse(req, course)) return res.status(403).json({ error: "You cannot view assignments for this course." });
  const assignments = db.prepare(`
    SELECT a.*, s.content AS submission_content, s.grade, s.feedback, s.submitted_at
    FROM assignments a LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
    WHERE a.course_id = ? ORDER BY a.due_date
  `).all(req.user.id, course.id);
  res.json({ assignments });
});

app.post("/api/courses/:id/assignments", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  if (!canManageCourse(req, course)) return res.status(403).json({ error: "You can only manage assignments for courses you teach." });
  const { title, description, dueDate, maxPoints = 100 } = req.body || {};
  if ([title, description, dueDate].some((value) => typeof value !== "string" || !value.trim()) || Number.isNaN(Date.parse(dueDate))) {
    return res.status(400).json({ error: "A title, description, and valid due date are required." });
  }
  if (!Number.isInteger(Number(maxPoints)) || Number(maxPoints) < 1 || Number(maxPoints) > 1000) {
    return res.status(400).json({ error: "Maximum points must be a whole number from 1 to 1000." });
  }
  const result = db.prepare(`
    INSERT INTO assignments (course_id, title, description, due_date, max_points) VALUES (?, ?, ?, ?, ?)
  `).run(course.id, title.trim(), description.trim(), new Date(dueDate).toISOString(), Number(maxPoints));
  res.status(201).json({ assignment: db.prepare("SELECT * FROM assignments WHERE id = ?").get(result.lastInsertRowid) });
});

app.delete("/api/assignments/:id", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const assignment = db.prepare(`
    SELECT a.id, c.instructor_id FROM assignments a JOIN courses c ON c.id = a.course_id WHERE a.id = ?
  `).get(Number(req.params.id));
  if (!assignment) return res.status(404).json({ error: "Assignment not found." });
  if (req.user.role !== "admin" && assignment.instructor_id !== req.user.id) return res.status(403).json({ error: "You cannot remove this assignment." });
  
  const fileKeys = db.prepare("SELECT file_key FROM submissions WHERE assignment_id = ? AND file_key IS NOT NULL")
    .all(assignment.id).map((submission) => submission.file_key);
  db.prepare("DELETE FROM assignments WHERE id = ?").run(assignment.id);
  removeHomeworkFiles(fileKeys);
  
  res.status(204).end();
});

app.post("/api/courses", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const { code, title, description, category, level = "Beginner", credits = 3, capacity = 40 } = req.body || {};
  if ([code, title, description, category].some((value) => typeof value !== "string" || !value.trim())) {
    return res.status(400).json({ error: "Course code, title, description, and category are required." });
  }
  if (!Number.isInteger(Number(credits)) || Number(credits) < 1 || Number(credits) > 12) {
    return res.status(400).json({ error: "Credits must be a whole number from 1 to 12." });
  }
  if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 500) {
    return res.status(400).json({ error: "Capacity must be a whole number from 1 to 500." });
  }
  try {
    const result = db.prepare(`
      INSERT INTO courses (code, title, description, category, level, credits, capacity, instructor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(code.trim().toUpperCase(), title.trim(), description.trim(), category.trim(), String(level).trim(), Number(credits), Number(capacity), req.user.id);
    res.status(201).json({ course: readCourse(result.lastInsertRowid) });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "That course code is already in use." });
    throw error;
  }
});

app.put("/api/courses/:id", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  if (!canManageCourse(req, course)) return res.status(403).json({ error: "You can only edit courses you teach." });
  const { title, description, category, level, credits, capacity } = req.body || {};
  if ([title, description, category, level].some((value) => typeof value !== "string" || !value.trim())) {
    return res.status(400).json({ error: "Title, description, category, and level are required." });
  }
  const update = db.prepare(`
    UPDATE courses SET title = ?, description = ?, category = ?, level = ?, credits = ?, capacity = ?
    WHERE id = ?
  `);
  try {
    update.run(title.trim(), description.trim(), category.trim(), level.trim(), Number(credits), Number(capacity), course.id);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_CHECK") return res.status(400).json({ error: "Credits or capacity are outside the allowed range." });
    throw error;
  }
  res.json({ course: readCourse(course.id) });
});

app.delete("/api/courses/:id", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  if (!canManageCourse(req, course)) return res.status(403).json({ error: "You can only delete courses you teach." });
  
  const fileKeys = db.prepare(`
    SELECT s.file_key FROM submissions s JOIN assignments a ON a.id = s.assignment_id
    WHERE a.course_id = ? AND s.file_key IS NOT NULL
  `).all(course.id).map((submission) => submission.file_key);
  db.prepare("DELETE FROM courses WHERE id = ?").run(course.id);
  removeHomeworkFiles(fileKeys);
  
  res.status(204).end();
});

function checkAssignmentSubmission(req, res, next) {
  const assignment = db.prepare(`
    SELECT a.*, c.title AS course_title, c.id AS course_id
    FROM assignments a JOIN courses c ON c.id = a.course_id
    WHERE a.id = ?
  `).get(Number(req.params.id));
  if (!assignment) return res.status(404).json({ error: "Assignment not found." });
  const enrolled = db.prepare("SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?")
    .get(req.user.id, assignment.course_id);
  if (!enrolled) return res.status(403).json({ error: "Enroll in this course before submitting work." });
  req.assignment = assignment;
  next();
}

function receiveHomework(req, res, next) {
  homeworkUpload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Homework files must be 10 MB or smaller."
        : "Only one homework file can be uploaded at a time.";
      return res.status(status).json({ error: message });
    }
    return next(error);
  });
}

app.post("/api/assignments/:id/submissions", requireAuth, requireRole("student"), checkAssignmentSubmission, receiveHomework, (req, res, next) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (content.length > 10000 || (!req.file && content.length < 5)) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Add work between 5 and 10,000 characters or attach a homework file." });
  }
  let extension = "";
  if (req.file) {
    extension = path.extname(req.file.originalname).toLowerCase();
    if (!homeworkExtensions.has(extension)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Choose a PDF, Office document, text, CSV, or image file." });
    }
  }

  const previous = db.prepare("SELECT file_key FROM submissions WHERE assignment_id = ? AND student_id = ?")
    .get(req.assignment.id, req.user.id);
  const fileKey = req.file ? `${randomUUID()}${extension}` : null;
  const finalPath = fileKey ? path.join(uploadsDirectory, fileKey) : null;
  try {
    if (req.file) fs.renameSync(req.file.path, finalPath);
    db.prepare(`
      INSERT INTO submissions (assignment_id, student_id, content, file_key, file_name, file_size)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (assignment_id, student_id) DO UPDATE SET
        content = excluded.content, file_key = excluded.file_key,
        file_name = excluded.file_name, file_size = excluded.file_size,
        submitted_at = CURRENT_TIMESTAMP
    `).run(
      req.assignment.id, req.user.id, content, fileKey,
      req.file?.originalname || null, req.file?.size || null,
    );
  } catch (error) {
    if (req.file && fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    return next(error);
  }
  if (previous?.file_key && previous.file_key !== fileKey) {
    const previousPath = path.join(uploadsDirectory, previous.file_key);
    if (fs.existsSync(previousPath)) fs.unlinkSync(previousPath);
  }
  res.status(201).json({ message: "Your work has been submitted." });
});

app.delete("/api/assignments/:id/submissions", requireAuth, requireRole("student"), checkAssignmentSubmission, (req, res) => {
  const submission = db.prepare("SELECT id, grade, file_key FROM submissions WHERE assignment_id = ? AND student_id = ?")
    .get(req.assignment.id, req.user.id);
  if (!submission) return res.status(404).json({ error: "There is no submission to unsubmit." });
  if (submission.grade !== null) return res.status(409).json({ error: "A graded submission cannot be withdrawn." });
  db.prepare("DELETE FROM submissions WHERE id = ?").run(submission.id);
  removeHomeworkFiles([submission.file_key]);
  res.json({ message: "Your submission has been withdrawn." });
});

app.get("/api/courses/:id/submissions", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  if (!canManageCourse(req, course)) return res.status(403).json({ error: "You can only review work for courses you teach." });
  const submissions = db.prepare(`
    SELECT s.id, s.assignment_id, s.content, s.file_name, s.file_size, s.grade, s.feedback, s.submitted_at, u.name AS student_name, u.email AS student_email,
      a.title AS assignment_title, a.max_points
    FROM submissions s JOIN users u ON u.id = s.student_id
    JOIN assignments a ON a.id = s.assignment_id
    WHERE a.course_id = ? ORDER BY s.submitted_at DESC
  `).all(course.id);
  res.json({ submissions });
});

app.get("/api/submissions/:id/file", requireAuth, (req, res, next) => {
  const submission = db.prepare(`
    SELECT s.file_key, s.file_name, c.instructor_id
    FROM submissions s JOIN assignments a ON a.id = s.assignment_id
    JOIN courses c ON c.id = a.course_id WHERE s.id = ?
  `).get(Number(req.params.id));
  if (!submission?.file_key) return res.status(404).json({ error: "Homework file not found." });
  const isOwner = db.prepare("SELECT 1 FROM submissions WHERE id = ? AND student_id = ?")
    .get(Number(req.params.id), req.user.id);
  if (!isOwner && req.user.id !== submission.instructor_id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You do not have permission to access this homework file." });
  }
  const filePath = path.join(uploadsDirectory, submission.file_key);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "The stored homework file is no longer available." });
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.download(filePath, path.basename((submission.file_name || "homework-file").replace(/\\/g, "/")), (error) => {
    if (error && !res.headersSent) next(error);
  });
});

app.patch("/api/submissions/:id/grade", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const submission = db.prepare(`
    SELECT s.*, a.max_points, c.instructor_id
    FROM submissions s JOIN assignments a ON a.id = s.assignment_id
    JOIN courses c ON c.id = a.course_id WHERE s.id = ?
  `).get(Number(req.params.id));
  if (!submission) return res.status(404).json({ error: "Submission not found." });
  if (req.user.role !== "admin" && submission.instructor_id !== req.user.id) return res.status(403).json({ error: "You cannot grade this submission." });
  const grade = Number(req.body?.grade);
  const feedback = typeof req.body?.feedback === "string" ? req.body.feedback.trim() : "";
  if (!Number.isFinite(grade) || grade < 0 || grade > submission.max_points || feedback.length > 2000) {
    return res.status(400).json({ error: `Grade must be between 0 and ${submission.max_points}; feedback must be under 2,000 characters.` });
  }
  db.prepare("UPDATE submissions SET grade = ?, feedback = ? WHERE id = ?").run(grade, feedback, submission.id);
  res.json({ message: "Submission graded." });
});

app.get("/api/grades", requireAuth, requireRole("student"), (req, res) => {
  const rows = db.prepare(`
    SELECT c.id AS course_id, c.code, c.title AS course_title, c.credits,
      a.id AS assignment_id, a.title AS assignment_title, a.due_date, a.max_points,
      s.grade, s.feedback, s.submitted_at
    FROM enrollments e JOIN courses c ON c.id = e.course_id
    LEFT JOIN assignments a ON a.course_id = c.id
    LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
    WHERE e.student_id = ? ORDER BY c.title, a.due_date
  `).all(req.user.id);
  const byCourse = new Map();
  for (const row of rows) {
    if (!byCourse.has(row.course_id)) {
      byCourse.set(row.course_id, { id: row.course_id, code: row.code, title: row.course_title, credits: row.credits, assignments: [] });
    }
    if (row.assignment_id) {
      byCourse.get(row.course_id).assignments.push({
        id: row.assignment_id, title: row.assignment_title, due_date: row.due_date, max_points: row.max_points,
        grade: row.grade, feedback: row.feedback, submitted_at: row.submitted_at,
      });
    }
  }
  const courses = [...byCourse.values()].map((course) => {
    const graded = course.assignments.filter((item) => item.grade !== null);
    const possible = graded.reduce((sum, item) => sum + item.max_points, 0);
    const earned = graded.reduce((sum, item) => sum + item.grade, 0);
    return { ...course, percentage: possible ? Math.round((earned / possible) * 1000) / 10 : null };
  });
  res.json({ courses });
});

app.get("/api/announcements", requireAuth, (req, res) => {
  const base = `
    SELECT n.id, n.title, n.body, n.created_at, n.course_id, c.code, c.title AS course_title, u.name AS author_name
    FROM announcements n JOIN courses c ON c.id = n.course_id JOIN users u ON u.id = n.author_id
  `;
  let announcements;
  if (req.user.role === "student") {
    announcements = db.prepare(`${base} JOIN enrollments e ON e.course_id = c.id AND e.student_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 20`).all(req.user.id);
  } else if (req.user.role === "instructor") {
    announcements = db.prepare(`${base} WHERE c.instructor_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT 20`).all(req.user.id);
  } else {
    announcements = db.prepare(`${base} ORDER BY n.created_at DESC, n.id DESC LIMIT 20`).all();
  }
  res.json({ announcements });
});

app.get("/api/courses/:id/announcements", requireAuth, (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  const announcements = db.prepare(`
    SELECT n.id, n.title, n.body, n.created_at, u.name AS author_name
    FROM announcements n JOIN users u ON u.id = n.author_id
    WHERE n.course_id = ? ORDER BY n.created_at DESC, n.id DESC
  `).all(course.id);
  res.json({ announcements });
});

app.post("/api/courses/:id/announcements", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  if (!canManageCourse(req, course)) return res.status(403).json({ error: "You can only post to courses you teach." });
  const { title, body } = req.body || {};
  if (typeof title !== "string" || !title.trim() || title.length > 120 || typeof body !== "string" || !body.trim() || body.length > 4000) {
    return res.status(400).json({ error: "Announcements need a title (up to 120 characters) and a message (up to 4,000)." });
  }
  
  const postAnnouncement = db.transaction(() => {
    const result = db.prepare("INSERT INTO announcements (course_id, author_id, title, body) VALUES (?, ?, ?, ?)")
      .run(course.id, req.user.id, title.trim(), body.trim());
    const recipients = db.prepare("SELECT student_id FROM enrollments WHERE course_id = ? AND status = 'active'").all(course.id);
    const insertNotification = db.prepare(`
      INSERT INTO notifications (user_id, course_id, title, message) VALUES (?, ?, ?, ?)
    `);
    for (const recipient of recipients) {
      insertNotification.run(recipient.student_id, course.id, title.trim(), `${course.code} · ${body.trim()}`);
    }
    return result;
  });
  const result = postAnnouncement();
  
  res.status(201).json({ announcement: db.prepare("SELECT * FROM announcements WHERE id = ?").get(result.lastInsertRowid) });
});

app.delete("/api/announcements/:id", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const announcement = db.prepare(`
    SELECT n.id, c.instructor_id FROM announcements n JOIN courses c ON c.id = n.course_id WHERE n.id = ?
  `).get(Number(req.params.id));
  if (!announcement) return res.status(404).json({ error: "Announcement not found." });
  if (req.user.role !== "admin" && announcement.instructor_id !== req.user.id) return res.status(403).json({ error: "You cannot remove this announcement." });
  db.prepare("DELETE FROM announcements WHERE id = ?").run(announcement.id);
  res.status(204).end();
});

app.get("/api/notifications", requireAuth, (req, res) => {
  const notifications = db.prepare(`
    SELECT id, course_id, title, message, created_at, read_at
    FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30
  `).all(req.user.id);
  const unreadCount = db.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND read_at IS NULL")
    .get(req.user.id).total;
  res.json({ notifications, unread_count: unreadCount });
});

app.patch("/api/notifications/read-all", requireAuth, (req, res) => {
  db.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND read_at IS NULL").run(req.user.id);
  res.json({ message: "Notifications marked as read." });
});

app.patch("/api/notifications/:id/read", requireAuth, (req, res) => {
  const result = db.prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?")
    .run(Number(req.params.id), req.user.id);
  if (!result.changes) return res.status(404).json({ error: "Notification not found." });
  res.json({ message: "Notification marked as read." });
});

app.get("/api/saved-courses", requireAuth, (req, res) => {
  const courses = db.prepare(`
    SELECT c.id, c.code, c.title, c.description, c.category, c.level, c.credits, c.capacity,
      u.name AS instructor_name,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS enrolled_count
    FROM saved_courses saved
    JOIN courses c ON c.id = saved.course_id
    JOIN users u ON u.id = c.instructor_id
    WHERE saved.user_id = ?
    ORDER BY saved.saved_at DESC, saved.course_id DESC
  `).all(req.user.id);
  res.json({ courses });
});

app.post("/api/saved-courses/:id", requireAuth, (req, res, next) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  try {
    db.prepare("INSERT INTO saved_courses (user_id, course_id) VALUES (?, ?)").run(req.user.id, course.id);
    res.status(201).json({ message: `${course.title} saved for later.` });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY" || error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "This course is already saved." });
    }
    return next(error);
  }
});

app.delete("/api/saved-courses/:id", requireAuth, (req, res) => {
  const result = db.prepare("DELETE FROM saved_courses WHERE user_id = ? AND course_id = ?")
    .run(req.user.id, Number(req.params.id));
  if (!result.changes) return res.status(404).json({ error: "This course is not in your saved list." });
  res.status(204).end();
});

app.get("/api/profile", requireAuth, (req, res) => {
  res.json({ profile: readProfile(req.user.id) });
});

app.get("/api/people", requireAuth, (_req, res) => {
  const people = db.prepare("SELECT id, name, role, bio, created_at FROM users ORDER BY name COLLATE NOCASE").all();
  res.json({ people });
});

app.get("/api/people/:id", requireAuth, (req, res) => {
  const profile = readPublicProfile(Number(req.params.id));
  if (!profile) return res.status(404).json({ error: "Profile not found." });
  res.json({ profile });
});

app.put("/api/profile", requireAuth, (req, res, next) => {
  const { name, email, bio = "", phone = "" } = req.body || {};
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return res.status(400).json({ error: "Name must be between 2 and 80 characters." });
  }
  if (typeof email !== "string" || !emailPattern.test(email.trim()) || email.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (typeof bio !== "string" || bio.length > 500) return res.status(400).json({ error: "Bio must be 500 characters or fewer." });
  if (typeof phone !== "string" || !/^[0-9+()\-\s]{0,30}$/.test(phone)) return res.status(400).json({ error: "Enter a valid phone number." });
  try {
    db.prepare("UPDATE users SET name = ?, email = ?, bio = ?, phone = ? WHERE id = ?")
      .run(name.trim(), email.trim().toLowerCase(), bio.trim(), phone.trim(), req.user.id);
    const profile = readProfile(req.user.id);
    res.json({ profile, user: publicUser(profile) });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "Another account already uses that email." });
    next(error);
  }
});

app.put("/api/profile/password", requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return res.status(400).json({ error: "Enter your current and new password." });
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ error: "New password must be between 8 and 128 characters." });
  }
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) {
    return res.status(400).json({ error: "Your current password is incorrect." });
  }
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(newPassword, 12), req.user.id);
  res.json({ message: "Password updated." });
});

app.get("/api/people/:id/comments", requireAuth, (req, res) => {
  const profileId = Number(req.params.id);
  if (!db.prepare("SELECT 1 FROM users WHERE id = ?").get(profileId)) return res.status(404).json({ error: "Profile not found." });
  res.json({ comments: readProfileComments(profileId) });
});

app.post("/api/people/:id/comments", requireAuth, (req, res) => {
  const profileId = Number(req.params.id);
  if (!db.prepare("SELECT 1 FROM users WHERE id = ?").get(profileId)) return res.status(404).json({ error: "Profile not found." });
  const body = req.body?.body;
  if (typeof body !== "string" || body.trim().length < 1 || body.trim().length > 1000) {
    return res.status(400).json({ error: "Comments must be between 1 and 1,000 characters." });
  }
  const result = db.prepare("INSERT INTO profile_comments (profile_id, author_id, body) VALUES (?, ?, ?)")
    .run(profileId, req.user.id, body.trim());
  res.status(201).json({ comments: readProfileComments(profileId), comment_id: result.lastInsertRowid });
});

app.delete("/api/people/:id/comments/:commentId", requireAuth, (req, res) => {
  const comment = db.prepare("SELECT id, profile_id, author_id FROM profile_comments WHERE id = ? AND profile_id = ?")
    .get(Number(req.params.commentId), Number(req.params.id));
  if (!comment) return res.status(404).json({ error: "Comment not found." });
  if (comment.author_id !== req.user.id && comment.profile_id !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Only the comment author, profile owner, or an administrator can remove this comment." });
  }
  db.prepare("DELETE FROM profile_comments WHERE id = ?").run(comment.id);
  res.status(204).end();
});

app.get("/api/courses/:id/roster", requireAuth, requireRole("instructor", "admin"), (req, res) => {
  const course = readCourse(Number(req.params.id));
  if (!course) return res.status(404).json({ error: "Course not found." });
  if (!canManageCourse(req, course)) return res.status(403).json({ error: "You can only view rosters for courses you teach." });
  const students = db.prepare(`
    SELECT u.id, u.name, u.email, e.enrolled_at
    FROM enrollments e JOIN users u ON u.id = e.student_id
    WHERE e.course_id = ? AND e.status = 'active' AND u.role = 'student' ORDER BY u.name
  `).all(course.id);
  res.json({ students });
});

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error);
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Request body must contain valid JSON." });
  res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(port, () => {
  console.log(`coursePulse API listening on http://localhost:${port}`);
});

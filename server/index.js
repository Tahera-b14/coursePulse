import "dotenv/config";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { db } from "./database.js";

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
  
  db.prepare("DELETE FROM assignments WHERE id = ?").run(assignment.id);
  
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
  
  db.prepare("DELETE FROM courses WHERE id = ?").run(course.id);
  
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

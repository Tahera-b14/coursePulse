# coursePulse

<div align="center">

![coursePulse Logo](/public/coursepulse-logo.png)

### **Learn with direction.**
*A calmer, clearer course and learning management system built for modern education.*

[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%207-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js%20v18+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Backend-Express%205-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-better--sqlite3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://github.com/WiseLibs/better-sqlite3)
[![Auth](https://img.shields.io/badge/Auth-JWT%20in%20HttpOnly%20Cookies-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![Styling](https://img.shields.io/badge/Styling-Custom%20CSS%20Design%20System-E87516?style=flat-square)](src/styles.css)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features by Role](#-key-features-by-role)
  - [Student Experience](#1-student-experience)
  - [Instructor Experience](#2-instructor-experience)
  - [Platform Administrator Experience](#3-platform-administrator-experience)
- [System Architecture](#-system-architecture)
- [Application Workflows](#-application-workflows)
  - [Student Journey](#1-student-learning-lifecycle)
  - [Instructor Lifecycle](#2-instructor-management--grading-lifecycle)
  - [Administrator Governance](#3-administrator-governance-lifecycle)
- [Repository Folder Tree](#-repository-folder-tree)
- [Database Schema & Entity Relationship](#-database-schema--entity-relationship)
- [REST API Reference](#-rest-api-reference)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Seeding & Demo Accounts](#database-seeding--demo-accounts)
- [Production Deployment](#-production-deployment)
- [Security & Architecture Decisions](#-security--architecture-decisions)
- [Credits & Easter Eggs](#-credits--easter-eggs)

---

## 🌟 Overview

**coursePulse** is a full-stack JavaScript course management system (LMS) created to provide a structured, distraction-free environment for students, educators, and institutions. 

Unlike heavy, bloated legacy platforms, coursePulse is engineered for **clarity, speed, and focus**:
- **Zero Heavy UI Libraries:** Engineered with pure, semantic Vanilla CSS design tokens (`src/styles.css`) featuring modern typography (*DM Sans* & *Manrope*), micro-interactions, responsive sidebars, modals, and accessible focus outlines.
- **Robust Persistence & Reliability:** Powered by SQLite through `better-sqlite3` running in **WAL (Write-Ahead Logging)** mode with strict foreign key integrity and transaction isolation.
- **Stateless & Secure Sessions:** Uses JSON Web Tokens (JWT) stored in tamper-proof `httpOnly`, `sameSite=lax` session cookies with `bcryptjs` password hashing (cost factor 12).
- **Curated Context:** Seeded with courses, instructors, and learners tailored for practical technical and business education.

---

## 👥 Key Features by Role

### 1. Student Experience
- **Course Catalog & Search:** Real-time search across course codes, titles, and descriptions, paired with instant category filtering (`Development`, `Data & AI`, `Design`, `Business`).
- **Wishlist / Saved Courses:** Bookmark interesting courses to a private saved collection with a single click.
- **Seat-Aware Enrollment:** Instant one-click enrollment with atomic seat capacity checks (`enrolled_count < capacity`) and unenrollment capability.
- **Dynamic Student Dashboard:** Centralized view of enrolled courses, upcoming assignment deadlines, and personal completion status.
- **Homework Submission Engine:** Submit work with rich text notes (up to 10,000 characters) and/or file attachments up to 10 MB (`.pdf`, `.docx`, `.txt`, `.md`, images, etc.). Students can withdraw/unsubmit work prior to grading.
- **Grade Book & GPA Tracker:** Transparent grade breakdown per course, earned vs. possible point totals, live weighted percentages, and instructor feedback notes.
- **Real-Time Notification Center:** Notification bell with an unread badge indicator, dropdown panel, and instant mark-as-read controls for class updates and unenrollment notices.
- **People Directory & Profiles:** Explore fellow classmates and teachers, view bio and contact details, and write community comments on profiles.

### 2. Instructor Experience
- **Teaching Command Center:** Real-time metrics displaying total active students, managed courses, and assignments needing attention.
- **Course Authoring & Management:** Full CRUD lifecycle for courses (course codes, titles, descriptions, categories, academic levels, credit values, and seat capacities).
- **Assignment Authoring:** Schedule assignments with strict due dates, rich descriptions, and customized maximum point values (1–1,000 points).
- **Class Roster Management:** Inspect actively enrolled learners per course with the ability to unenroll students if necessary.
- **Interactive Grading Interface:** Review student submissions side-by-side, securely download submitted homework files with `nosniff` headers, submit grades, and issue structured feedback.
- **Broadcast Announcements:** Publish rich course announcements that automatically trigger personal in-app notifications for all enrolled students.

### 3. Platform Administrator Experience
- **Executive Analytics:** High-level platform telemetry tracking total registered students, active instructors, courses offered, and total platform enrollments.
- **User Account Provisioning:** Direct onboarding form to create students, instructors, or administrators with instant credential hashing and validation.
- **Role Elevation & Demotion:** Promote or reassign roles across accounts with built-in dependency safeguards (e.g., an instructor with active courses cannot have their role changed until courses are reassigned).
- **Account Deletion Safeguards:** Comprehensive protection preventing self-deletion, preventing deletion of instructors who own active courses, and automatically purging associated homework upload files on disk.

---

## 🏗️ System Architecture

coursePulse follows a decoupled client-server architecture with an integrated static production runtime.

```text
+-----------------------------------------------------------------------------------+
|                              CLIENT (WEB BROWSER)                                 |
|   React 19 SPA (src/main.jsx)  •  Vanilla CSS Design System (src/styles.css)      |
|   Hash Router (#page)  •  Context Providers  •  HttpOnly Session Cookie           |
+-----------------------------------------------------------------------------------+
                                  ▲                   ▲
                  Dev API Proxy   │                   │ Direct API Fetch
             (http://localhost:5173)                  │ (Production)
                                  ▼                   ▼
+-----------------------------------------------------------------------------------+
|                             EXPRESS 5 API SERVER                                  |
|   Port 5000  •  JWT Cookie Auth  •  Bcrypt Password Hash  •  Multer Uploads       |
|   REST Endpoints: /api/auth, /api/courses, /api/assignments, /api/admin, etc.     |
+-----------------------------------------------------------------------------------+
                                  │                   │
                     SQL Queries  │                   │ File Storage
             (Transactions / WAL) │                   │
                                  ▼                   ▼
+------------------------------------------+   +------------------------------------+
|            SQLITE DATABASE               |   |        ATTACHMENTS STORAGE         |
|         data/courseflow.sqlite           |   |           data/uploads/            |
|       (better-sqlite3 WAL Mode)          |   |      (UUID-Named Homework)         |
+------------------------------------------+   +------------------------------------+
```

---

## 🔄 Application Workflows

### 1. Student Learning Lifecycle

```text
[ 1. Explore Catalog ] ──▶ [ 2. Wishlist / Enroll ] ──▶ [ 3. Student Dashboard ]
                                                                │
                                                                ▼
[ 6. GPA & Grade Report ] ◀── [ 5. Graded by Teacher ] ◀── [ 4. Submit Homework ]
```

| Step | Action | Endpoint / Mechanism | Description |
|:---|:---|:---|:---|
| **1. Browse Catalog** | Search & Filter | `GET /api/courses?search=&category=` | Real-time query across codes, titles, and descriptions with category filtering (`Development`, `Data & AI`, etc.). |
| **2. Save or Enroll** | One-Click Enrollment | `POST /api/courses/:id/enroll` | Executes atomic seat capacity check (`enrolled < capacity`) and registers student into `enrollments`. |
| **3. Track Deadlines** | Student Dashboard | `GET /api/dashboard` | Displays active course cards, upcoming assignment due dates, and pending submission statuses. |
| **4. Submit Homework** | Text & Attachment | `POST /api/assignments/:id/submissions` | Supports text response (up to 10k chars) and file attachment (up to 10MB; stored with UUID filename). |
| **5. Teacher Review** | Graded by Instructor | *Instructor Action* | Teacher reviews content and attachments, assigning points and written feedback notes. |
| **6. Review Grades** | Grade Book & GPA | `GET /api/grades` | Displays earned vs. possible point totals, live weighted percentages, GPA, and instructor feedback. |

---

### 2. Instructor Management & Grading Lifecycle

```text
[ 1. Author Course ] ──▶ [ 2. Schedule Assignments ] ──▶ [ 3. Post Announcement ]
                                                                   │
                                                                   ▼
[ 6. Complete Grading ] ◀── [ 5. Score & Feedback ] ◀── [ 4. Review Submissions ]
```

| Step | Action | Endpoint / Mechanism | Description |
|:---|:---|:---|:---|
| **1. Create Course** | Author Course Modal | `POST /api/courses` | Define course code, title, credits (1–12), category, level, capacity, and syllabus description. |
| **2. Set Assignments** | Assignment Authoring | `POST /api/courses/:id/assignments` | Schedule assignments with deadlines and maximum point scales (1–1,000 points). |
| **3. Broadcast Updates** | Post Announcement | `POST /api/courses/:id/announcements` | Saves course announcement and dispatches instant in-app notifications to all enrolled students. |
| **4. Manage Roster** | Class Roster Modal | `GET /api/courses/:id/roster` | Review enrolled learners; supports unregistering individual students if necessary. |
| **5. Review Homework** | Submission Review | `GET /api/courses/:id/submissions` | Inspect student text submissions and securely download attachments with `nosniff` headers. |
| **6. Grade & Feedback** | Submit Score | `PATCH /api/submissions/:id/grade` | Record numerical score and construct constructive written feedback for the student. |

---

### 3. Administrator Governance Lifecycle

```text
[ 1. Monitor Telemetry ] ──▶ [ 2. Provision Users ] ──▶ [ 3. Role Governance ]
                                                                   │
                                                                   ▼
                                                      [ 4. Safe Account Purge ]
```

| Step | Action | Endpoint / Mechanism | Description |
|:---|:---|:---|:---|
| **1. Platform Audit** | Executive Analytics | `GET /api/dashboard` | Review high-level platform telemetry: student headcount, active teachers, courses, and enrollments. |
| **2. Provision Users** | Account Onboarding | `POST /api/admin/users` | Onboard students, instructors, or admins directly with instant `bcryptjs` password hashing. |
| **3. Adjust Roles** | Role Management | `PATCH /api/admin/users/:id` | Elevate or reassign user roles; safeguarded to prevent demoting instructors who own active courses. |
| **4. Account Deletion** | Safe Account Removal | `DELETE /api/admin/users/:id` | Blocks self-deletion and instructors with active courses; cascades deletion and removes homework files. |

---

## 📂 Repository Folder Tree

The repository is organized for clean separation of concerns between client, server, static assets, and data persistence:

```text
coursePulse/
├── 📁 data/                               # Persistent runtime storage (git-ignored)
│   ├── courseflow.sqlite                 # SQLite database file (WAL mode)
│   └── 📁 uploads/                        # Uploaded homework assignment files
│
├── 📁 public/                             # Public static assets served by Vite / Express
│   ├── coursepulse-logo.png              # Primary application brand logo
│   └── 📁 stickers/                       # Easter egg sticker gallery assets
│       ├── portrait-sticker-two.png
│       ├── portrait-sticker.png
│       ├── tahera-singing.png
│       └── tanvir-standing.png
│
├── 📁 server/                             # Backend application layer (Node.js + Express)
│   ├── database.js                       # SQLite initialization, schema definition, migrations
│   ├── index.js                          # Express server, REST endpoints, auth, file uploads
│   ├── seed-data.js                      # Curated Bangladesh academic dataset & initial mock data
│   └── seed.js                           # Standalone database reset/seed runner with auto-backup
│
├── 📁 src/                                # Frontend application layer (React 19)
│   ├── main.jsx                          # Main React SPA, components, views, context providers
│   └── styles.css                        # Complete custom design system, tokens, and animations
│
├── .env.example                          # Environment variable configuration template
├── .gitignore                            # Git ignore specifications (builds, db, logs, envs)
├── index.html                            # HTML entry point with metadata and root mount
├── package.json                          # Project dependencies, metadata, and npm scripts
├── package-lock.json                     # Locked dependency tree
├── README.md                             # Comprehensive project documentation
└── vite.config.js                        # Vite build configuration and dev server API proxy
```

### Deep Dive into Key Files

| File / Folder | Role & Description |
|:---|:---|
| [`server/database.js`](server/database.js) | Initializes `better-sqlite3`, enforces `WAL` journal mode and foreign key constraints, sets up all 9 SQL tables, runs incremental migrations for bio/phone/file columns, and seeds default data when starting a clean environment. |
| [`server/index.js`](server/index.js) | Express 5 application setup, HTTP-only cookie authentication (`jsonwebtoken`), password hashing (`bcryptjs`), Multer file upload pipelines with security sanitization, and 30+ REST endpoints. |
| [`server/seed.js`](server/seed.js) | Database management CLI script. Backs up existing database and uploaded attachments with ISO timestamps before restoring demo datasets. |
| [`server/seed-data.js`](server/seed-data.js) | Curated dataset comprising 1 administrator, 5 instructors, 50 students, 19 academic courses across 4 departments, real assignments, submissions, announcements, and peer comments. |
| [`src/main.jsx`](src/main.jsx) | Single-file React SPA architecture including global state, confirmation dialog provider, custom SVG icons, client-side hash router, and all page views (`HomePage`, `CoursesPage`, `SavedCoursesPage`, `Dashboard`, `PeoplePage`, `ProfilePage`, `GradesPage`, `AdminDashboard`, `SubmissionReview`). |
| [`src/styles.css`](src/styles.css) | Custom styling engine defining typography (*DM Sans* & *Manrope*), color palette (`--brand`, `--ink`, `--paper`), responsive grid systems, pill badges, and accessible focus outlines. |
| [`vite.config.js`](vite.config.js) | Vite configuration proxying `/api` requests to `http://localhost:5000` during development, enabling seamless CORS-free local workflows. |

---

## 🗄️ Database Schema & Entity Relationship

The database schema is designed with foreign key constraints, check constraints, and cascading rules to maintain referential integrity.

```text
+-----------------------+              +-----------------------+
|         USERS         | 1          * |        COURSES        |
|-----------------------|--------------|-----------------------|
| id (PK)               |              | id (PK)               |
| name, email, role     |              | code, title, credits  |
| password_hash         |              | capacity, level       |
| bio, phone            |              | instructor_id (FK)    |
+-----------------------+              +-----------------------+
     │ 1            │ 1                    │ 1             │ 1
     │              │                      │               │
     │ *            │ *                    │ *             │ *
+-----------------------+              +-----------------------+
|      ENROLLMENTS      |              |      ASSIGNMENTS      |
|-----------------------|              |-----------------------|
| id (PK)               |              | id (PK)               |
| student_id (FK)       |              | course_id (FK)        |
| course_id (FK)        |              | title, description    |
| status, enrolled_at   |              | due_date, max_points  |
+-----------------------+              +-----------------------+
                                                   │ 1
                                                   │
                                                   │ *
                                       +-----------------------+
                                       |      SUBMISSIONS      |
                                       |-----------------------|
                                       | id (PK)               |
                                       | assignment_id (FK)    |
                                       | student_id (FK)       |
                                       | content, file_key     |
                                       | grade, feedback       |
                                       +-----------------------+
```

### Table Definitions & Constraints

| Table | Primary Key | Foreign Keys | Key Columns & Constraints |
|:---|:---|:---|:---|
| `users` | `id` (Auto) | — | `name`, `email` (UNIQUE, NOCASE), `password_hash`, `role` (`student`, `instructor`, `admin`), `bio`, `phone`, `created_at` |
| `courses` | `id` (Auto) | `instructor_id` $\rightarrow$ `users(id)` | `code` (UNIQUE, NOCASE), `title`, `credits` (1–12), `capacity` (1–500), `category`, `level`, `created_at` |
| `enrollments` | `id` (Auto) | `student_id` $\rightarrow$ `users(id)`, `course_id` $\rightarrow$ `courses(id)` | `status` (`active`, `completed`), `enrolled_at`, UNIQUE(`student_id`, `course_id`) |
| `assignments` | `id` (Auto) | `course_id` $\rightarrow$ `courses(id)` | `title`, `description`, `due_date`, `max_points` (1–1,000), `created_at` |
| `submissions` | `id` (Auto) | `assignment_id` $\rightarrow$ `assignments(id)`, `student_id` $\rightarrow$ `users(id)` | `content`, `file_key`, `file_name`, `file_size`, `grade`, `feedback`, `submitted_at`, UNIQUE(`assignment_id`, `student_id`) |
| `announcements` | `id` (Auto) | `course_id` $\rightarrow$ `courses(id)`, `author_id` $\rightarrow$ `users(id)` | `title`, `body`, `created_at` |
| `notifications` | `id` (Auto) | `user_id` $\rightarrow$ `users(id)`, `course_id` $\rightarrow$ `courses(id)` | `title`, `message`, `created_at`, `read_at` (Indexed by `user_id`, `created_at DESC`) |
| `saved_courses` | Composite (`user_id`, `course_id`) | `user_id` $\rightarrow$ `users(id)`, `course_id` $\rightarrow$ `courses(id)` | `saved_at` (User wishlist bookmarks) |
| `profile_comments` | `id` (Auto) | `profile_id` $\rightarrow$ `users(id)`, `author_id` $\rightarrow$ `users(id)` | `body` (1–1,000 chars), `created_at` |

---

## 📡 REST API Reference

All API routes are served under `/api` and consume/produce `application/json` (except file uploads/downloads).

### Authentication & Current Session

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/auth/register` | Public | Register a new student account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials & set `httpOnly` session cookie |
| `POST` | `/api/auth/logout` | Public | Clear session cookie |
| `GET` | `/api/auth/me` | Public | Fetch current authenticated user profile (or `null`) |

### Courses & Catalog

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/courses` | Public | Query courses with optional `?search=` and `?category=` filters |
| `GET` | `/api/courses/:id` | Public | Get detailed course information, instructor name, and enrollment counts |
| `POST` | `/api/courses` | Instructor / Admin | Create a new course (code, title, credits, category, level, capacity) |
| `PUT` | `/api/courses/:id` | Instructor / Admin | Update course metadata |
| `DELETE` | `/api/courses/:id` | Instructor / Admin | Delete course (and clean up associated homework upload files) |
| `POST` | `/api/courses/:id/enroll` | Student | Enroll current student into course (enforcing capacity check) |
| `DELETE` | `/api/courses/:id/enroll` | Student | Drop / unenroll from course |
| `GET` | `/api/courses/:id/roster` | Instructor / Admin | View list of active learners in course |
| `DELETE` | `/api/courses/:id/roster/:studentId` | Instructor / Admin | Remove/unenroll a specific student from class roster |

### Assignments & Submissions

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/courses/:id/assignments` | Authenticated | List all assignments for a course with student submission state |
| `POST` | `/api/courses/:id/assignments` | Instructor / Admin | Create a new assignment (`title`, `description`, `dueDate`, `maxPoints`) |
| `DELETE` | `/api/assignments/:id` | Instructor / Admin | Delete assignment and remove submitted homework files from disk |
| `POST` | `/api/assignments/:id/submissions` | Student | Submit assignment (supports multipart text and/or file upload) |
| `DELETE` | `/api/assignments/:id/submissions` | Student | Withdraw/unsubmit homework before grading |
| `GET` | `/api/courses/:id/submissions` | Instructor / Admin | List all student submissions for a course |
| `GET` | `/api/submissions/:id/file` | Owner / Teacher / Admin | Securely download submitted homework attachment |
| `PATCH` | `/api/submissions/:id/grade` | Instructor / Admin | Grade submission (`grade`, `feedback`) |

### Dashboard & Grades

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/dashboard` | Authenticated | Role-aware dashboard payload (Student, Instructor, or Admin) |
| `GET` | `/api/grades` | Student | Complete student grade book with GPA calculations and course percentages |

### Announcements & Notifications

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/announcements` | Authenticated | Recent announcements feed relevant to user's enrolled or taught courses |
| `GET` | `/api/courses/:id/announcements` | Authenticated | Course-specific announcements |
| `POST` | `/api/courses/:id/announcements` | Instructor / Admin | Post announcement & dispatch notifications to all enrolled students |
| `DELETE` | `/api/announcements/:id` | Instructor / Admin | Delete an announcement |
| `GET` | `/api/notifications` | Authenticated | List user notifications with `unread_count` |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Mark a single notification as read |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |

### Wishlist (Saved Courses)

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/saved-courses` | Authenticated | Retrieve user's bookmarked / saved courses |
| `POST` | `/api/saved-courses/:id` | Authenticated | Bookmark course for later |
| `DELETE` | `/api/saved-courses/:id` | Authenticated | Remove course from saved collection |

### Profiles, People & Social Comments

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/profile` | Authenticated | Retrieve self profile with statistics and course history |
| `PUT` | `/api/profile` | Authenticated | Update bio, phone, email, and display name |
| `PUT` | `/api/profile/password` | Authenticated | Update password with current password verification |
| `GET` | `/api/people` | Authenticated | Public community directory of all students, instructors, and admins |
| `GET` | `/api/people/:id` | Authenticated | View public profile of a user |
| `GET` | `/api/people/:id/comments` | Authenticated | View community guestbook comments on a profile |
| `POST` | `/api/people/:id/comments` | Authenticated | Post a comment on another user's profile |
| `DELETE` | `/api/people/:id/comments/:commentId` | Author / Profile Owner / Admin | Delete a profile comment |

### Admin Oversight

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `POST` | `/api/admin/users` | Admin | Provision a new user account with specified role |
| `PATCH` | `/api/admin/users/:id` | Admin | Elevate or reassign user role (with integrity checks) |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete a user account (with safeguard checks and file cleanup) |

---

## 🚀 Getting Started & Local Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation

1. Clone or navigate to the repository directory:
   ```bash
   cd "coursePulse"
   ```

2. Install project dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

Copy `.env.example` to create your local `.env`:
```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|:---|:---|:---|
| `PORT` | `5000` | Port for the Express backend API server |
| `JWT_SECRET` | `local-only-courseflow-secret` | Signing secret for JSON Web Tokens |
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `DATABASE_PATH` | `data/courseflow.sqlite` | SQLite database file path |
| `BOOTSTRAP_ADMIN_EMAIL` | *(optional in dev)* | Initial admin email on clean production database |
| `BOOTSTRAP_ADMIN_PASSWORD` | *(optional in dev)* | Initial admin password (min 12 chars) |

### Database Seeding & Demo Accounts

To populate or reset the database with the demo dataset:
```bash
npm run seed
```

> **Note:** The seed script automatically creates a timestamped backup of the current SQLite database and any stored assignment files in the `data/` folder before applying the fresh seed.

#### 🔑 Pre-Configured Demo Credentials

All seeded accounts use password: **`12345678`**

| Role | Account Email | Purpose |
|:---|:---|:---|
| **Administrator** | `admin@mail.com` | Access system analytics, user provisioning, and role governance |
| **Instructor** | `teacher1@mail.com` | Teach software engineering courses, grade submissions, post updates |
| **Instructor** | `teacher2@mail.com` | Teach data science and AI courses |
| **Instructor** | `teacher3@mail.com` | Teach design systems and human-centered design |
| **Instructor** | `teacher4@mail.com` | Teach cloud systems and network security |
| **Instructor** | `teacher5@mail.com` | Teach entrepreneurship and business operations |
| **Student** | `student1@mail.com` | Test enrollment, homework submissions, wishlist, and grade tracking |
| **Students** | `student2@mail.com` – `student50@mail.com` | Peer learners in the student directory |

### Running the Development Environment

Launch both the Express API server and the Vite frontend dev server concurrently:
```bash
npm run dev
```

- **Frontend Client:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## 🚢 Production Deployment

1. **Build the Frontend Bundle:**
   ```bash
   npm run build
   ```
   This generates optimized, minified production assets into the `dist/` folder.

2. **Configure Production Environment:**
   Set environment variables:
   ```env
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=use-a-strong-random-64-character-string
   DATABASE_PATH=data/courseflow.sqlite
   BOOTSTRAP_ADMIN_EMAIL=admin@yourinstitution.edu
   BOOTSTRAP_ADMIN_PASSWORD=SecurePassword123!
   ```

3. **Start the Production Server:**
   ```bash
   npm start
   ```
   In production mode, the Express server handles all API endpoints and serves the static frontend from `dist/` with SPA fallback routing.

---

## 🔒 Security & Architecture Decisions

1. **SQL Injection Immunity:** All database queries are executed using `better-sqlite3` prepared statements (`db.prepare(...)`), ensuring query inputs are always parameterized.
2. **Strict Session Security:** JWTs are stored in `httpOnly`, `sameSite=lax` cookies, preventing cross-site scripting (XSS) token exfiltration.
3. **Password Security:** All passwords are salted and hashed using `bcryptjs` with a cost factor of 12.
4. **File Upload Hardening:**
   - Maximum upload size strictly capped at 10 MB.
   - Allowed extension whitelist (`.pdf`, `.docx`, `.doc`, `.odt`, `.rtf`, `.txt`, `.md`, `.csv`, `.png`, `.jpg`, `.jpeg`, `.webp`).
   - Stored with randomly generated UUIDs to prevent directory traversal or name collisions.
   - Served with `X-Content-Type-Options: nosniff` to prevent browser MIME-type sniffing attacks.
   - Orphaned homework files are automatically deleted from disk whenever an assignment, submission, or student account is deleted.
5. **Zero Component Library Bloat:** No external CSS framework dependencies (no Tailwind, Bootstrap, or Material-UI). The design system is 100% custom, lightweight, and performant.

---

## 🎨 Credits & Easter Eggs

### Developed By
- **Tanvir Rahman Rahi** (ID: 242-112-011)
- **Mst Tahera Begum Tahi** (ID: 242-112-019)

### 🥚 Hidden Easter Eggs
- **Credits Shortcut:** Click the **coursePulse** brand logo in the footer **3 times** within 1.2 seconds to jump directly to the Credits page.
- **Secret Sticker Gallery:** On the Credits page (`#credits`), click on **Tahera's name** **5 times** to unlock the interactive sticker gallery modal!

---

<div align="center">
  <strong>coursePulse</strong> — Built with care for learners and teachers.
</div>

import fs from "node:fs";
import path from "node:path";

const teachers = [
  { name: "Nusrat Jahan", bio: "Teaching software engineering and practical web development." },
  { name: "Farhan Ahmed", bio: "Exploring data, statistics, and responsible artificial intelligence." },
  { name: "Sadia Rahman", bio: "Helping learners build thoughtful, accessible digital products." },
  { name: "Imran Hossain", bio: "Interested in cloud systems, security, and reliable infrastructure." },
  { name: "Maliha Chowdhury", bio: "Teaching business, product strategy, and entrepreneurship." },
];

const studentNames = [
  "Ayesha Akter", "Tanvir Hasan", "Nusrat Sultana", "Rakib Hossain", "Faria Islam",
  "Sabbir Ahmed", "Jannatul Ferdous", "Mehedi Hasan", "Samia Rahman", "Rafiul Karim",
  "Tasnim Jahan", "Mahmudul Hasan", "Sumaiya Akter", "Nayeem Chowdhury", "Mim Khatun",
  "Arif Hossain", "Sanjida Islam", "Shakib Mahmud", "Rumana Yasmin", "Tawhidul Islam",
  "Ishrat Jahan", "Fahim Ahmed", "Sharmin Akter", "Abdullah Al Mamun", "Anika Tabassum",
  "Sakibul Hasan", "Nabila Sultana", "Rashedul Islam", "Lamia Rahman", "Saif Uddin",
  "Sohana Parvin", "Muntasir Rahman", "Afia Sarker", "Zubair Ahmed", "Nafisa Tasnim",
  "Mahin Islam", "Sadia Afrin", "Foysal Ahmed", "Raisa Karim", "Omar Faruk",
  "Tanjila Akter", "Ashikur Rahman", "Maliha Noor", "Rifat Hasan", "Priya Das",
  "Anwar Hossain", "Sharmeen Sultana", "Tahmid Hasan", "Sumaia Islam", "Adnan Kabir",
];

const courses = [
  ["CSE101", "Web Development for Local Businesses", "Build accessible websites and practical services for businesses across Bangladesh.", "Development", "Beginner", 3],
  ["CSE112", "Programming with JavaScript", "Learn programming fundamentals by building useful browser-based projects.", "Development", "Beginner", 3],
  ["CSE204", "Database Systems in Practice", "Model information and build reliable SQL applications for real-world use.", "Development", "Intermediate", 4],
  ["CSE221", "Cloud Platforms and Deployment", "Deploy and monitor resilient web applications using modern cloud practices.", "Development", "Intermediate", 3],
  ["DAT110", "Data Analysis with Public Statistics", "Explore datasets about population, transport, and development using practical analytical methods.", "Data & AI", "Beginner", 3],
  ["DAT206", "Machine Learning Fundamentals", "Build and evaluate machine-learning models with an emphasis on responsible use.", "Data & AI", "Intermediate", 4],
  ["DAT215", "Bangla Language Technologies", "Explore text processing and language technology for Bengali and multilingual data.", "Data & AI", "Intermediate", 3],
  ["DAT230", "Geospatial Data for Climate Studies", "Use maps and environmental datasets to study flooding, rivers, and climate resilience.", "Data & AI", "Advanced", 4],
  ["DES101", "Human-Centered Interface Design", "Research user needs and create useful, accessible digital experiences.", "Design", "Beginner", 3],
  ["DES118", "Design Systems and Accessibility", "Create consistent, inclusive interfaces with reusable design systems.", "Design", "Intermediate", 3],
  ["DES204", "Mobile Product Prototyping", "Turn early product ideas into testable mobile prototypes.", "Design", "Intermediate", 3],
  ["DES220", "Visual Storytelling for the Web", "Communicate information clearly through layout, typography, and visual narrative.", "Design", "Beginner", 2],
  ["BUS101", "Entrepreneurship in Bangladesh", "Shape an early-stage business idea around local needs, customers, and resources.", "Business", "Beginner", 3],
  ["BUS114", "Product Thinking and Strategy", "Connect customer problems to focused product decisions and measurable outcomes.", "Business", "Intermediate", 3],
  ["BUS206", "Digital Commerce Operations", "Plan and improve online retail, payments, customer service, and logistics.", "Business", "Intermediate", 4],
  ["BUS222", "Project Management Foundations", "Plan collaborative projects, manage risks, and communicate progress.", "Business", "Beginner", 3],
  ["CSE242", "Network Security Essentials", "Understand common network risks and practical defensive security controls.", "Development", "Intermediate", 4],
  ["CSE250", "API Design and Integration", "Design dependable APIs and connect web applications to external services.", "Development", "Intermediate", 3],
  ["DAT245", "Applied Statistics for Decision Making", "Use statistical reasoning to make and explain evidence-based decisions.", "Data & AI", "Intermediate", 3],
  ["BUS240", "Social Impact and Sustainable Growth", "Explore sustainable business models and social-impact measurement.", "Business", "Advanced", 3],
];

const assignmentTitles = [
  "Foundations reflection",
  "Local case study",
  "Research and analysis",
  "Practical skills exercise",
  "Mid-course project",
  "Peer review and revision",
  "Applied project",
  "Final portfolio submission",
];

const assignmentDescriptions = [
  "Summarize the key ideas from this part of the course and explain how you would apply them.",
  "Choose a relevant organization or community in Bangladesh and analyze a problem related to this course.",
  "Use credible sources or data to support your analysis, and clearly explain your reasoning.",
  "Complete the practical exercise and include enough detail for another learner to follow your process.",
  "Develop a small project that applies the course concepts to a realistic local use case.",
  "Review your earlier work, incorporate useful feedback, and explain what you changed.",
  "Present a complete solution, including your approach, important decisions, and limitations.",
  "Submit a polished portfolio that demonstrates your learning throughout the course.",
];

const feedbackNotes = [
  "Clear reasoning and a useful local example. Keep developing the evidence behind your recommendation.",
  "Good progress. The main idea is strong; add a little more detail to the analysis next time.",
  "A thoughtful submission with a well-organized explanation.",
  "Nice work connecting the course concepts to a practical problem.",
  "Strong improvement from the earlier exercise. Check the final details before your next submission.",
];

const profileComments = [
  "Your project notes helped me understand the assignment. Thank you!",
  "Great work this term, and best of luck with the next project.",
  "I enjoyed learning alongside you in this course.",
  "Thanks for sharing such a helpful perspective in class.",
  "Your research example gave me a new way to think about the topic.",
];

function shiftedDate(daysFromNow) {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
    .toISOString().replace("T", " ").slice(0, 19);
}

function removeStoredFiles(uploadDirectory, keys) {
  if (!uploadDirectory) return;
  for (const key of keys) {
    if (!key || path.basename(key) !== key) continue;
    const filePath = path.join(uploadDirectory, key);
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function tableExists(db, tableName) {
  const row = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName);
  return !!row;
}

export function seedDemoData(db, bcrypt, uploadDirectory) {
  const hasSubmissions = tableExists(db, "submissions");
  const previousFileKeys = hasSubmissions
    ? db.prepare("SELECT file_key FROM submissions WHERE file_key IS NOT NULL").all().map((row) => row.file_key)
    : [];
  const passwordHash = bcrypt.hashSync("12345678", 10);

  const resetAndSeed = db.transaction(() => {
    if (tableExists(db, "courses")) db.prepare("DELETE FROM courses").run();
    if (tableExists(db, "saved_courses")) db.prepare("DELETE FROM saved_courses").run();
    if (tableExists(db, "profile_comments")) db.prepare("DELETE FROM profile_comments").run();
    if (tableExists(db, "notifications")) db.prepare("DELETE FROM notifications").run();
    if (tableExists(db, "announcements")) db.prepare("DELETE FROM announcements").run();
    if (tableExists(db, "submissions")) db.prepare("DELETE FROM submissions").run();
    if (tableExists(db, "assignments")) db.prepare("DELETE FROM assignments").run();
    if (tableExists(db, "enrollments")) db.prepare("DELETE FROM enrollments").run();

    const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
    const hasBio = userColumns.includes("bio");

    const existingAdmin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").get();
    if (existingAdmin) {
      db.prepare("DELETE FROM users WHERE id != ?").run(existingAdmin.id);
      if (hasBio) {
        db.prepare(`
          UPDATE users SET name = ?, email = ?, password_hash = ?, bio = ?, phone = ?, created_at = ?
          WHERE id = ?
        `).run("coursePulse Administrator", "admin@mail.com", passwordHash,
          "Administrator for the coursePulse learning community.", "", shiftedDate(-190), existingAdmin.id);
      } else {
        db.prepare(`
          UPDATE users SET name = ?, email = ?, password_hash = ?, created_at = ?
          WHERE id = ?
        `).run("coursePulse Administrator", "admin@mail.com", passwordHash, shiftedDate(-190), existingAdmin.id);
      }
    } else {
      db.prepare("DELETE FROM users").run();
      if (hasBio) {
        db.prepare(`
          INSERT INTO users (name, email, password_hash, role, bio, phone, created_at)
          VALUES (?, ?, ?, 'admin', ?, '', ?)
        `).run("coursePulse Administrator", "admin@mail.com", passwordHash,
          "Administrator for the coursePulse learning community.", shiftedDate(-190));
      } else {
        db.prepare(`
          INSERT INTO users (name, email, password_hash, role, created_at)
          VALUES (?, ?, ?, 'admin', ?)
        `).run("coursePulse Administrator", "admin@mail.com", passwordHash, shiftedDate(-190));
      }
    }
    const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@mail.com");

    const insertUser = hasBio
      ? db.prepare(`
          INSERT INTO users (name, email, password_hash, role, bio, phone, created_at)
          VALUES (?, ?, ?, ?, ?, '', ?)
        `)
      : db.prepare(`
          INSERT INTO users (name, email, password_hash, role, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);

    const teacherIds = teachers.map((teacher, index) => {
      const args = hasBio
        ? [teacher.name, `teacher${index + 1}@mail.com`, passwordHash, "instructor", teacher.bio, shiftedDate(-185 + index * 3)]
        : [teacher.name, `teacher${index + 1}@mail.com`, passwordHash, "instructor", shiftedDate(-185 + index * 3)];
      return insertUser.run(...args).lastInsertRowid;
    });

    const studentIds = studentNames.map((name, index) => {
      const args = hasBio
        ? [name, `student${index + 1}@mail.com`, passwordHash, "student", "Learner interested in technology, community projects, and practical skills.", shiftedDate(-175 + (index % 35))]
        : [name, `student${index + 1}@mail.com`, passwordHash, "student", shiftedDate(-175 + (index % 35))];
      return insertUser.run(...args).lastInsertRowid;
    });

    if (!tableExists(db, "courses")) {
      return { adminId: admin.id, teachers: teacherIds.length, students: studentIds.length, courses: 0, enrollments: 0 };
    }

    const insertCourse = db.prepare(`
      INSERT INTO courses (code, title, description, category, level, credits, capacity, instructor_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const courseIds = courses.map((course, index) => insertCourse.run(
      ...course, 36 + (index % 5) * 4, teacherIds[Math.floor(index / 4)], shiftedDate(-165 + (index % 4) * 5),
    ).lastInsertRowid);

    if (!tableExists(db, "enrollments")) {
      return { adminId: admin.id, teachers: teacherIds.length, students: studentIds.length, courses: courseIds.length, enrollments: 0 };
    }

    const insertEnrollment = db.prepare(`
      INSERT INTO enrollments (student_id, course_id, status, enrolled_at) VALUES (?, ?, ?, ?)
    `);
    const enrollments = [];
    for (let studentIndex = 0; studentIndex < studentIds.length; studentIndex++) {
      const courseCount = 4 + (studentIndex % 4);
      for (let offset = 0; offset < courseCount; offset++) {
        const courseIndex = (studentIndex * 7 + offset * 3) % courses.length;
        const enrollment = {
          studentId: studentIds[studentIndex],
          studentIndex,
          courseId: courseIds[courseIndex],
          courseIndex,
          status: offset === 0 && studentIndex % 5 === 0 ? "completed" : "active",
          enrolledAt: shiftedDate(-145 + ((studentIndex + offset) % 100)),
        };
        insertEnrollment.run(enrollment.studentId, enrollment.courseId, enrollment.status, enrollment.enrolledAt);
        enrollments.push(enrollment);
      }
    }

    if (!tableExists(db, "assignments")) {
      return { adminId: admin.id, teachers: teacherIds.length, students: studentIds.length, courses: courseIds.length, enrollments: enrollments.length };
    }

    const insertAssignment = db.prepare(`
      INSERT INTO assignments (course_id, title, description, due_date, max_points, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const dueOffsets = [132, 112, 92, 72, 52, 32, 12, -14];
    const assignmentsByCourse = courseIds.map((courseId, courseIndex) =>
      assignmentTitles.map((title, assignmentIndex) => {
        const dueDate = shiftedDate(-dueOffsets[assignmentIndex]);
        const assignmentId = insertAssignment.run(
          courseId, title, assignmentDescriptions[assignmentIndex], dueDate,
          assignmentIndex === 4 || assignmentIndex === 7 ? 100 : 50,
          shiftedDate(-dueOffsets[assignmentIndex] - 14),
        ).lastInsertRowid;
        return { id: assignmentId, courseIndex, assignmentIndex, dueDate };
      }),
    );

    const hasSavedCourses = tableExists(db, "saved_courses");
    const insertSavedCourse = hasSavedCourses
      ? db.prepare("INSERT INTO saved_courses (user_id, course_id, saved_at) VALUES (?, ?, ?)")
      : null;
    const insertSubmission = hasSubmissions
      ? db.prepare(`INSERT INTO submissions (assignment_id, student_id, content, grade, feedback, submitted_at) VALUES (?, ?, ?, ?, ?, ?)`)
      : null;

    if (insertSavedCourse || insertSubmission) {
      for (const enrollment of enrollments) {
        if (insertSavedCourse && (enrollment.studentIndex + enrollment.courseIndex) % 4 === 0) {
          insertSavedCourse.run(enrollment.studentId, courseIds[(enrollment.courseIndex + 7) % courses.length], shiftedDate(-20));
        }
        if (insertSubmission) {
          for (const assignment of assignmentsByCourse[enrollment.courseIndex]) {
            const pattern = enrollment.studentIndex * 11 + enrollment.courseIndex * 5 + assignment.assignmentIndex * 3;
            if (pattern % 10 === 0) continue;
            const dueTime = new Date(assignment.dueDate.replace(" ", "T") + "Z").getTime();
            const submittedAt = new Date(Math.min(Date.now() - 60 * 60 * 1000, dueTime - (1 + (pattern % 5)) * 24 * 60 * 60 * 1000))
              .toISOString().replace("T", " ").slice(0, 19);
            const graded = assignment.assignmentIndex < 6 && pattern % 6 !== 0;
            const maxPoints = assignment.assignmentIndex === 4 ? 100 : assignment.assignmentIndex === 7 ? 100 : 50;
            const grade = graded ? Math.min(maxPoints, Math.max(30, 34 + ((pattern * 13) % 66))) : null;
            insertSubmission.run(
              assignment.id, enrollment.studentId,
              `I applied the ${courses[enrollment.courseIndex][1]} concepts to a practical Bangladesh-focused example. My approach was to research the problem, compare possible solutions, and explain the trade-offs.`,
              grade, graded ? feedbackNotes[pattern % feedbackNotes.length] : null, submittedAt,
            );
          }
        }
      }
    }

    if (tableExists(db, "announcements")) {
      const insertAnnouncement = db.prepare(`
        INSERT INTO announcements (course_id, author_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)
      `);
      const hasNotifications = tableExists(db, "notifications");
      const insertNotification = hasNotifications
        ? db.prepare(`INSERT INTO notifications (user_id, course_id, title, message, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?)`)
        : null;

      for (let courseIndex = 0; courseIndex < courseIds.length; courseIndex++) {
        for (const announcementIndex of [0, 1]) {
          const createdAt = shiftedDate(-100 + announcementIndex * 65);
          const title = announcementIndex === 0 ? "Welcome and semester kickoff" : "A note for the next milestone";
          const body = announcementIndex === 0
            ? "Welcome to the course. Please review the course outline and introduce yourself to your learning group."
            : "Keep an eye on the next assignment deadline, ask questions early, and share useful resources with your classmates.";
          insertAnnouncement.run(courseIds[courseIndex], teacherIds[Math.floor(courseIndex / 4)], title, body, createdAt);
          if (insertNotification) {
            for (const enrollment of enrollments.filter((item) => item.courseIndex === courseIndex && item.status === "active")) {
              insertNotification.run(
                enrollment.studentId, courseIds[courseIndex], title, `${courses[courseIndex][0]} · ${body}`,
                createdAt, announcementIndex === 0 || (enrollment.studentIndex + courseIndex) % 5 !== 0 ? shiftedDate(-Math.max(1, 65 - announcementIndex * 10)) : null,
              );
            }
          }
        }
      }
    }

    if (tableExists(db, "profile_comments")) {
      const insertComment = db.prepare(`
        INSERT INTO profile_comments (profile_id, author_id, body, created_at) VALUES (?, ?, ?, ?)
      `);
      for (let index = 0; index < 55; index++) {
        const authorId = studentIds[index % studentIds.length];
        const profileId = index % 7 === 0 ? teacherIds[(index / 7) % teacherIds.length] : studentIds[(index * 13 + 9) % studentIds.length];
        if (authorId === profileId) continue;
        insertComment.run(profileId, authorId, profileComments[index % profileComments.length], shiftedDate(-130 + index * 2));
      }
    }

    return { adminId: admin.id, teachers: teacherIds.length, students: studentIds.length, courses: courseIds.length, enrollments: enrollments.length };
  });

  const summary = resetAndSeed();
  if (uploadDirectory && previousFileKeys.length) {
    removeStoredFiles(uploadDirectory, previousFileKeys);
  }
  return summary;
}

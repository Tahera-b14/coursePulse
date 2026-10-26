import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const categories = ["All", "Development", "Data & AI", "Design", "Business"];
const pages = ["home", "courses", "login", "register", "dashboard", "grades"];

const ConfirmContext = createContext(null);
function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmProvider({ children }) {
  const confirm = useCallback((message, title = "Are you sure?") => {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }, []);
  return <ConfirmContext.Provider value={confirm}>{children}</ConfirmContext.Provider>;
}

function formatDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en", options);
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function parseRoute(hash = window.location.hash) {
  const [route, id] = hash.replace(/^#/, "").split("/");
  return {
    page: pages.includes(route) ? route : "home",
    profileId: route === "profile" && /^\d+$/.test(id || "") ? Number(id) : null,
  };
}

async function api(url, options = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`/api${url}`, {
    credentials: "same-origin",
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...options.headers },
    ...options,
  });
  if (response.status === 204) return null;
  const payload = await response.json();
  if (!response.ok) {
    if (response.status === 401 && url !== "/auth/me") {
      window.dispatchEvent(new CustomEvent("courseflow:unauthorized"));
    }
    throw new Error(payload.error || "Something went wrong.");
  }
  return payload;
}

function Icon({ name, size = 19 }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    cap: <><path d="m2 10 10-5 10 5-10 5-10-5Z" /><path d="M6 12v5c3.5 3 8.5 3 12 0v-5" /><path d="M22 10v6" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
    chart: <><path d="M3 3v18h18" /><path d="M7 15v2M12 10v7M17 6v11" /></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}


function App() {
  const confirm = useConfirm();
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [savedCourses, setSavedCourses] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [page, setPage] = useState(() => {
    return parseRoute().page;
  });
  const [profileId, setProfileId] = useState(() => parseRoute().profileId);
  const [detailCourse, setDetailCourse] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const footerBrandClicks = useRef([]);

  const notify = useCallback((message) => {
    setNotice(message);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadCourses = useCallback(async () => {
    try {
      const data = await api("/courses");
      setCourses(data.courses);
    } catch (error) {
      notify(error.message);
    }
  }, [notify]);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    try {
      setDashboard(await api("/dashboard"));
    } catch (error) {
      notify(error.message);
    }
  }, [user, notify]);

  const loadSavedCourses = useCallback(async () => {
    if (!user) {
      setSavedCourses([]);
      return;
    }
    try {
      const data = await api("/saved-courses");
      setSavedCourses(data.courses);
    } catch (error) {
      notify(error.message);
    }
  }, [user, notify]);

  useEffect(() => {
    loadCourses();
    api("/auth/me").then(({ user: currentUser }) => setUser(currentUser)).catch(() => {});
  }, [loadCourses]);

  useEffect(() => {
    const syncPage = () => {
      const route = parseRoute();
      setPage(route.page);
      setProfileId(route.profileId);
    };
    window.addEventListener("hashchange", syncPage);
    window.addEventListener("popstate", syncPage);
    return () => {
      window.removeEventListener("hashchange", syncPage);
      window.removeEventListener("popstate", syncPage);
    };
  }, []);

  useEffect(() => {
    if (user) loadDashboard();
    else setDashboard(null);
  }, [user, loadDashboard]);

  useEffect(() => {
    loadSavedCourses();
  }, [loadSavedCourses]);

  const go = (nextPage, nextProfileId = null) => {
    const hash = nextPage === "profile" && nextProfileId ? `#profile/${nextProfileId}` : `#${nextPage}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    setPage(nextPage);
    setProfileId(nextPage === "profile" ? nextProfileId : null);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredCourses = useMemo(() => courses.filter((course) => {
    const matchesQuery = `${course.title} ${course.code} ${course.description} ${course.instructor_name}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (category === "All" || course.category === category);
  }), [courses, query, category]);

  async function handleAuth(form, mode) {
    setBusy(true);
    try {
      const result = await api(`/auth/${mode}`, { method: "POST", body: JSON.stringify(form) });
      setUser(result.user);
      notify(mode === "login" ? `Welcome back, ${result.user.name.split(" ")[0]}.` : "Your account is ready. Welcome to coursePulse!");
      go("dashboard");
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function enroll(courseId) {
    if (!user) return go("login");
    setBusy(true);
    try {
      const result = await api(`/courses/${courseId}/enroll`, { method: "POST", body: "{}" });
      notify(result.message);
      await Promise.all([loadCourses(), loadDashboard()]);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function drop(courseId) {
    if (!await confirm("Your submissions for this course will stay on record.", "Drop this course?")) return;
    setBusy(true);
    try {
      await api(`/courses/${courseId}/enroll`, { method: "DELETE" });
      notify("You have dropped the course.");
      await Promise.all([loadCourses(), loadDashboard()]);
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleSavedCourse(courseId) {
    if (!user) return go("login");
    const isSaved = savedCourses.some((course) => course.id === courseId);
    try {
      if (isSaved) {
        await api(`/saved-courses/${courseId}`, { method: "DELETE" });
        setSavedCourses((current) => current.filter((course) => course.id !== courseId));
        notify("Course removed from your saved list.");
      } else {
        await api(`/saved-courses/${courseId}`, { method: "POST", body: "{}" });
        const course = courses.find((item) => item.id === courseId);
        if (course) setSavedCourses((current) => [course, ...current.filter((item) => item.id !== courseId)]);
        notify("Course saved for later.");
      }
    } catch (error) {
      notify(error.message);
    }
  }

  const enrolledIds = useMemo(
    () => new Set(user?.role === "student" && dashboard?.courses ? dashboard.courses.map((course) => course.id) : []),
    [user, dashboard],
  );

  async function signOut() {
    try {
      await api("/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
      setDashboard(null);
      notify("You have been signed out.");
      go("home");
    } catch (error) {
      notify(error.message);
    }
  }

  function handleFooterBrandClick() {
    const now = Date.now();
    footerBrandClicks.current = footerBrandClicks.current.filter((timestamp) => now - timestamp < 900);
    footerBrandClicks.current.push(now);
    if (footerBrandClicks.current.length >= 3) {
      footerBrandClicks.current = [];
      go("credits");
    }
  }

  const isCatalog = page === "courses";

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => go("home")} aria-label="coursePulse home">
          <span className="brand-mark"><img src="/coursepulse-logo.png" alt="" /></span>
          <span>course<span>Pulse</span></span>
        </button>
        <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">
          <Icon name={mobileOpen ? "close" : "menu"} />
        </button>
        <nav className={`top-nav ${mobileOpen ? "is-open" : ""}`}>
          <button className={page === "home" ? "nav-link active" : "nav-link"} onClick={() => go("home")}>Home</button>
          <button className={isCatalog ? "nav-link active" : "nav-link"} onClick={() => go("courses")}>Explore courses</button>
          
          {user && <button className={page === "dashboard" ? "nav-link active" : "nav-link"} onClick={() => go("dashboard")}>My workspace</button>}
          
          
          {user?.role === "student" && <button className={page === "grades" ? "nav-link active" : "nav-link"} onClick={() => go("grades")}>Grades</button>}
          <div className="nav-actions">
            {user ? (
              <>
                
                <span className="nav-user"><span className="avatar">{initials(user.name)}</span>{user.name.split(" ")[0]}</span>
                <button className="button button-quiet button-small" onClick={signOut}><Icon name="logout" size={16} /> Sign out</button>
              </>
            ) : (
              <>
                <button className="button button-quiet button-small" onClick={() => go("login")}>Sign in</button>
                <button className="button button-primary button-small" onClick={() => go("register")}>Get started <Icon name="arrow" size={15} /></button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {page === "home" && <HomePage go={go} courses={courses} user={user} />}
        
        
        {page === "courses" && (
          <CoursesPage courses={filteredCourses} allCourses={courses} query={query} setQuery={setQuery}
            category={category} setCategory={setCategory} onEnroll={enroll} busy={busy} user={user} go={go}
            enrolledIds={enrolledIds} onDetails={setDetailCourse} savedCourses={savedCourses}
            onToggleSaved={toggleSavedCourse} />
        )}
        
        
        
        
        
        {page === "grades" && user?.role === "student" && <GradesPage notify={notify} go={go} />}
        
        {page === "login" && <AuthPage mode="login" onSubmit={handleAuth} busy={busy} go={go} />}
        {page === "register" && <AuthPage mode="register" onSubmit={handleAuth} busy={busy} go={go} />}
        {page === "dashboard" && user && (
          <Dashboard user={user} data={dashboard} onRefresh={async () => { await Promise.all([loadDashboard(), loadCourses()]); }}
            notify={notify} go={go} onDrop={drop} onDetails={setDetailCourse} />
        )}
        {page === "dashboard" && !user && <AuthPage mode="login" onSubmit={handleAuth} busy={busy} go={go} />}
      </main>

      <footer className="footer">
        <button type="button" className="footer-brand" onClick={handleFooterBrandClick} aria-label="coursePulse">
          <span className="brand-mark"><img src="/coursepulse-logo.png" alt="" /></span>
          <strong>course<span>Pulse</span></strong>
        </button>
        <span>Learning, with a little more direction.</span>
        <span>© {new Date().getFullYear()} coursePulse</span>
      </footer>
      {detailCourse && (
        <CourseDetailModal course={detailCourse} user={user} enrolled={enrolledIds.has(detailCourse.id)} busy={busy}
          onClose={() => setDetailCourse(null)} go={go}
          onEnroll={async (id) => { await enroll(id); }} onDrop={async (id) => { await drop(id); }} />
      )}
      {notice && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={15} /></span>{notice}</div>}
    </div>
  );
}

function HomePage({ go, courses, user }) {
  return (
    <>
      <section className="hero page-width">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> FOR UNIVERSITIES & LEARNING COMMUNITIES</div>
          <h1>University courses,<br /><span>all in one place.</span></h1>
          <p className="hero-description">A shared space for universities to organize courses, support instructors, and help students stay on track.</p>
          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={() => go("courses")}>Explore courses <Icon name="arrow" size={18} /></button>
            {user
              ? <button className="button button-outline button-large" onClick={() => go("dashboard")}>Open my workspace <Icon name="arrow" size={17} /></button>
              : <button className="button button-outline button-large" onClick={() => go("register")}>Create free account</button>}
          </div>
          <div className="hero-social">
            <div className="avatar-stack"><span>J</span><span>M</span><span>A</span><span>+</span></div>
            <span><strong>Good things start here.</strong><br />Your next chapter is one course away.</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-glow" />
          <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
          <div className="art-card">
            <div className="art-card-top"><span className="art-label">YOUR LEARNING SPACE</span><span className="art-online"><i /> LIVE</span></div>
            <div className="art-heading">A little progress<br />adds up.</div>
            <div className="progress-info"><span>Semester progress</span><strong>68%</strong></div>
            <div className="progress-track"><span /></div>
            <div className="art-course"><span className="mini-course-icon icon-lilac"><Icon name="book" size={17} /></span><span><strong>Web Development</strong><small>Week 06 · 3 lessons left</small></span><span className="art-course-arrow">↗</span></div>
            <div className="art-course"><span className="mini-course-icon icon-green"><Icon name="spark" size={17} /></span><span><strong>Design Thinking</strong><small>Week 03 · on track</small></span><span className="art-course-arrow">↗</span></div>
          </div>
          <div className="floating-note"><span className="floating-note-icon"><Icon name="check" size={17} /></span><span><strong>Nice work!</strong><small>One step closer.</small></span></div>
          <div className="hero-stamp"><span>GROW</span><span>AT YOUR</span><span>OWN PACE</span></div>
        </div>
      </section>
      <section className="trust-row page-width"><span>LEARNING THAT FITS REAL LIFE</span><div className="trust-line" /><span>Curious minds welcome <b>✳</b> Always</span></section>
      <section className="features-section page-width">
        <div className="section-heading">
          <div><div className="eyebrow">A simpler way to study</div><h2>All your learning.<br /><span>One clear path.</span></h2></div>
          <p>Less hunting for what matters. More time doing the work that helps you grow.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-lilac"><span className="feature-icon"><Icon name="grid" size={20} /></span><span className="feature-number">01 / FIND YOUR FIT</span><h3>Courses with<br />your name on them.</h3><p>Explore thoughtful courses across technology, design, data, and business.</p><button onClick={() => go("courses")}>Browse the catalog <Icon name="arrow" size={15} /></button></article>
          <article className="feature-card feature-peach"><span className="feature-icon"><Icon name="clock" size={20} /></span><span className="feature-number">02 / STAY IN FLOW</span><h3>Your progress,<br />beautifully in view.</h3><p>Keep classes, deadlines, and learning milestones together in one calm space.</p><div className="feature-bars"><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
          <article className="feature-card feature-mint"><span className="feature-icon"><Icon name="users" size={20} /></span><span className="feature-number">03 / LEARN TOGETHER</span><h3>Good people.<br />Good momentum.</h3><p>Stay connected with your instructors and the classmates learning alongside you.</p><div className="feature-people"><span>J</span><span>M</span><span>A</span><span>+ 24</span></div></article>
        </div>
      </section>
      <section className="cta-band page-width"><div><span className="eyebrow">A good place to begin</span><h2>Curiosity looks good on you.</h2><p>Find your next course and see where it takes you.</p></div><button className="button button-dark button-large" onClick={() => go("courses")}>Find your next course <Icon name="arrow" size={18} /></button></section>
      <section className="popular-section page-width">
        <div className="section-heading compact"><div><div className="eyebrow">A few good places to start</div><h2>Popular right now</h2></div><button className="text-link" onClick={() => go("courses")}>See all courses <Icon name="arrow" size={16} /></button></div>
        <div className="course-grid home-course-grid">{courses.slice(0, 3).map((course) => <CourseCard key={course.id} course={course} compact onEnroll={() => go("courses")} user={null} />)}</div>
      </section>
    </>
  );
}

function CoursesPage({ courses, allCourses, query, setQuery, category, setCategory, onEnroll, busy, user, go, enrolledIds, onDetails, savedCourses, onToggleSaved }) {
  return (
    <section className="catalog-page page-width">
      <div className="catalog-intro">
        <div className="eyebrow">Your next chapter starts here</div>
        <h1>A course for<br /><span>your kind of curious.</span></h1>
        <p>Big idea, new skill, fresh direction. Find a class that meets you where you are and takes you somewhere new.</p>
        <div className="catalog-stats"><span><strong>{allCourses.length.toString().padStart(2, "0")}</strong> thoughtfully made courses</span><i /><span><strong>04</strong> areas to explore</span></div>
      </div>
      <div className="catalog-toolbar">
        <div className="search-wrap"><Icon name="search" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses, skills, or topics..." aria-label="Search courses" /><kbd>⌘ K</kbd></div>
        <span className="result-count">{courses.length} {courses.length === 1 ? "course" : "courses"}</span>
      </div>
      <div className="category-pills" role="group" aria-label="Filter courses by category">
        {categories.map((item) => <button key={item} className={category === item ? "category-pill selected" : "category-pill"} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      {courses.length > 0 ? (
        <div className="course-grid">{courses.map((course) => <CourseCard key={course.id} course={course} onEnroll={onEnroll} busy={busy} user={user} go={go} enrolled={enrolledIds?.has(course.id)} onDetails={onDetails} saved={savedCourses.some((saved) => saved.id === course.id)} onToggleSaved={onToggleSaved} />)}</div>
      ) : <div className="empty-state"><span className="empty-icon"><Icon name="search" size={24} /></span><h3>No courses found</h3><p>Try a different search or choose another category.</p><button className="button button-outline" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
      <div className="catalog-bottom">A good course does more than teach. It opens something up.</div>
    </section>
  );
}

function CourseCard({ course, onEnroll, busy, user, go, compact = false, enrolled = false, onDetails, saved = false, onToggleSaved }) {
  const full = course.enrolled_count >= course.capacity;
  let label = "Get started";
  if (user?.role === "student") label = enrolled ? "Enrolled · open workspace" : full ? "Course is full" : "Enroll in course";
  else if (user) label = "Open workspace";
  const handleClick = () => {
    if (!user) return onEnroll(course.id);
    if (user.role !== "student" || enrolled) return go?.("dashboard");
    onEnroll(course.id);
  };
  const palettes = { "Development": "card-lilac", "Data & AI": "card-blue", "Design": "card-peach", "Business": "card-green" };
  return (
    <article className={`course-card ${palettes[course.category] || "card-lilac"} ${compact ? "course-card-compact" : ""}`}>
      <div className="course-card-top"><span className="course-category">{course.category}</span><span className="course-card-tools">
        <span className="course-code">{course.code}</span>
        {!compact && user && onToggleSaved && <button type="button" className={`saved-toggle ${saved ? "is-saved" : ""}`} aria-pressed={saved}
          aria-label={saved ? `Remove ${course.title} from saved courses` : `Save ${course.title}`}
          onClick={() => onToggleSaved(course.id)}><Icon name="heart" size={14} />{saved ? "Saved" : "Save"}</button>}
      </span></div>
      <div className="course-art-mark"><Icon name={course.category === "Design" ? "spark" : course.category === "Business" ? "users" : course.category === "Data & AI" ? "grid" : "book"} size={25} /></div>
      <h3>{course.title}</h3>
      <p className="course-description">{course.description}</p>
      <div className="course-meta"><span><Icon name="cap" size={15} /> {course.instructor_name}</span><span>{course.credits} credits</span></div>
      {!compact && <div className="course-meta secondary"><span>{course.level}</span><span>{course.enrolled_count}/{course.capacity} enrolled</span></div>}
      {!compact && onDetails && <button className="text-link course-details-link" onClick={() => onDetails(course)}>View details</button>}
      <button className="course-enroll" onClick={handleClick} disabled={busy || (user?.role === "student" && !enrolled && full)}>
        {label} <Icon name={enrolled ? "check" : "arrow"} size={16} />
      </button>
    </article>
  );
}

function AuthPage({ mode, onSubmit, busy, go }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = mode === "register";
  function submit(event) {
    event.preventDefault();
    onSubmit(register ? { name, email, password } : { email, password }, register ? "register" : "login");
  }
  return (
    <section className="auth-page page-width">
      <div className="auth-art">
        <div className="auth-orbit" />
        <span className="auth-spark"><Icon name="spark" size={27} /></span>
        <div className="auth-art-copy"><span className="eyebrow">A little room to grow</span><h2>Small steps.<br /><i>New directions.</i></h2><p>Learning isn't a straight line. It's yours to make.</p></div>
        <div className="auth-art-bottom"><span>COURSEPULSE / LEARN AT YOUR PACE</span><span>✳</span></div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <span className="eyebrow">{register ? "A fresh start" : "Good to see you again"}</span>
          <h1>{register ? "Come on in." : "Welcome back."}</h1>
          <p className="auth-subtitle">{register ? "Make a little space for what's next." : "Pick up right where you left off."}</p>
          <form onSubmit={submit} className="auth-form">
            {register && <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength="2" maxLength="80" required placeholder="Alex Morgan" /></label>}
            <label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={register ? "new-password" : "current-password"} minLength="8" required placeholder="At least 8 characters" /></label>
            <button className="button button-primary button-large auth-submit" disabled={busy}>{busy ? "One moment..." : register ? "Create your account" : "Sign in"} <Icon name="arrow" size={17} /></button>
          </form>
          <div className="auth-switch">{register ? "Already have an account?" : "New to coursePulse?"} <button onClick={() => go(register ? "login" : "register")}>{register ? "Sign in" : "Create an account"}</button></div>
          {!register && <div className="demo-note"><strong>Want to look around?</strong><span>Demo student: student1@mail.com</span><span>Demo teacher: teacher1@mail.com</span><span>Administrator: admin@mail.com</span><span>Password: 12345678</span></div>}
          <p className="auth-terms">By continuing, you agree to learn with curiosity and treat each other kindly.</p>
        </div>
      </div>
    </section>
  );
}

function CourseDetailModal({ course: initialCourse, user, enrolled, busy, onClose, onEnroll, onDrop, go }) {
  const [course, setCourse] = useState(initialCourse);
  const [announcements, setAnnouncements] = useState([]);
  useEffect(() => {
    api(`/courses/${initialCourse.id}`).then((data) => setCourse(data.course)).catch(() => {});
    if (user && (enrolled || user.role !== "student")) {
      api(`/courses/${initialCourse.id}/announcements`).then((data) => setAnnouncements(data.announcements)).catch(() => setAnnouncements([]));
    }
  }, [initialCourse.id, user, enrolled]);
  const full = course.enrolled_count >= course.capacity;
  const seatsLeft = Math.max(0, course.capacity - course.enrolled_count);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wide" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <span className="eyebrow">{course.code} · {course.category}</span>
        <h2>{course.title}</h2>
        <p className="detail-description">{course.description}</p>
        <div className="detail-facts">
          <span><small>Instructor</small>{course.instructor_name}</span>
          <span><small>Level</small>{course.level}</span>
          <span><small>Credits</small>{course.credits}</span>
          <span><small>Seats left</small>{seatsLeft} of {course.capacity}</span>
        </div>
        <div className="progress-track detail-capacity"><span style={{ width: `${Math.min(100, (course.enrolled_count / course.capacity) * 100)}%` }} /></div>
        
        <div className="detail-actions">
          {!user && <button className="button button-primary" onClick={() => { onClose(); go("login"); }}>Sign in to enroll <Icon name="arrow" size={16} /></button>}
          {user?.role === "student" && !enrolled && <button className="button button-primary" disabled={busy || full} onClick={async () => { await onEnroll(course.id); onClose(); }}>{full ? "Course is full" : "Enroll in course"} <Icon name="arrow" size={16} /></button>}
          {user?.role === "student" && enrolled && <button className="button button-outline danger-button" disabled={busy} onClick={async () => { await onDrop(course.id); onClose(); }}>Drop course</button>}
          <button className="button button-quiet" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ user, data, onRefresh, notify, go, onDrop, onDetails }) {
  if (!data) return <section className="dashboard-page page-width"><div className="loading-card">Getting your learning space ready…</div></section>;
  const firstName = user.name.split(" ")[0];
  if (user.role === "student") return <StudentDashboard user={user} firstName={firstName} data={data} onRefresh={onRefresh} notify={notify} go={go} onDrop={onDrop} onDetails={onDetails} />;
  if (user.role === "admin") return <AdminDashboard user={user} firstName={firstName} data={data} go={go} notify={notify} onRefresh={onRefresh} />;
  return <InstructorDashboard user={user} firstName={firstName} data={data} onRefresh={onRefresh} notify={notify} go={go} />;
}

function StudentDashboard({ user, firstName, data, onRefresh, notify, go, onDrop, onDetails }) {
  const confirm = useConfirm();
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submission, setSubmission] = useState("");
  const [submissionFile, setSubmissionFile] = useState(null);
  const [busy, setBusy] = useState(false);
  async function withdrawSubmission(item) {
    if (!await confirm("Your ungraded work and any attached file will be removed.", "Unsubmit this assignment?")) return;
    setBusy(true);
    try {
      const result = await api(`/assignments/${item.id}/submissions`, { method: "DELETE" });
      notify(result.message);
      await onRefresh();
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  async function submitWork(event) {
    event.preventDefault();
    if (submission.trim().length < 5 && !submissionFile) {
      notify("Write at least 5 characters or choose a file to submit.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("content", submission);
      if (submissionFile) body.append("file", submissionFile);
      await api(`/assignments/${selectedAssignment.id}/submissions`, { method: "POST", body });
      notify("Your work has been submitted.");
      setSelectedAssignment(null);
      setSubmission("");
      setSubmissionFile(null);
      await onRefresh();
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  return (
    <section className="dashboard-page page-width">
      <div className="dashboard-welcome"><div><div className="eyebrow">Your learning space</div><h1>Good things grow,<br /><span>{firstName}.</span></h1><p>Keep going. You're doing better than you think.</p></div><button className="button button-primary" onClick={() => go("courses")}>Find a course <Icon name="arrow" size={16} /></button></div>
      <div className="dashboard-stats">
        <StatCard label="My courses" value={data.courses.length} icon="book" tint="stat-lilac" />
        <StatCard label="Upcoming work" value={data.assignments.filter((item) => item.grade === null && !item.submitted_at).length} icon="clock" tint="stat-peach" />
        <StatCard label="Work reviewed" value={data.assignments.filter((item) => item.grade !== null).length} icon="check" tint="stat-green" />
      </div>
      <div className="dashboard-columns">
        <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">Your current semester</span><h2>My courses</h2></div><button className="text-link" onClick={() => go("courses")}>Explore more <Icon name="arrow" size={15} /></button></div>
          {data.courses.length ? <div className="my-course-list">{data.courses.map((course, index) => <div className="my-course-row" key={course.id}><div className={`my-course-index index-${index % 3}`}><Icon name="book" size={18} /></div><div className="my-course-info"><strong>{course.title}</strong><span>{course.code} · {course.instructor_name} · {course.credits} credits</span></div><span className="row-badge">{course.assignment_count} tasks</span><div className="row-actions"><button className="text-link" onClick={() => onDetails(course)}>Details</button><button className="text-link danger-link" onClick={() => onDrop(course.id)}>Drop</button></div></div>)}</div> : <EmptyPanel title="Your first course is waiting." action="Explore courses" onClick={() => go("courses")} />}
        </section>
        <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">Keep an eye on these</span><h2>Upcoming work</h2></div><Icon name="clock" size={18} /></div>
          {data.assignments.length ? <div className="assignment-list">{data.assignments.map((item) => <div className="assignment-row" key={item.id}><span className="assignment-date"><strong>{new Date(item.due_date).toLocaleDateString("en", { day: "2-digit" })}</strong><small>{new Date(item.due_date).toLocaleDateString("en", { month: "short" })}</small></span><div className="assignment-info"><strong>{item.title}</strong><span>{item.course_title} · {item.max_points} points</span></div><div className="assignment-action">{item.grade !== null ? <span className="status-pill status-done">Graded · {item.grade}</span> : item.submitted_at ? <div className="submission-status"><span className="status-pill status-done">Submitted</span><button type="button" className="text-link danger-link" disabled={busy} onClick={() => withdrawSubmission(item)}>Unsubmit</button></div> : <button className="text-link" onClick={() => setSelectedAssignment(item)}>Submit <Icon name="arrow" size={14} /></button>}</div></div>)}</div> : <EmptyPanel title="A little breathing room." description="New assignments will show up here." />}
        </section>
      </div>
      <AnnouncementFeed />
      {selectedAssignment && <div className="modal-backdrop" onClick={() => setSelectedAssignment(null)}><form className="modal-card" onSubmit={submitWork} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setSelectedAssignment(null)}><Icon name="close" /></button><span className="eyebrow">Turn in your work</span><h2>{selectedAssignment.title}</h2><p>{selectedAssignment.course_title} · Due {new Date(selectedAssignment.due_date).toLocaleDateString()}</p><label>Your submission<textarea value={submission} onChange={(event) => setSubmission(event.target.value)} maxLength="10000" placeholder="Share your work or paste a link (optional if you attach a file)..." /></label><label className="upload-field">Attach a file<input type="file" accept=".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp" onChange={(event) => setSubmissionFile(event.target.files?.[0] || null)} /><small>PDF, Word, text, CSV, or image · up to 10 MB</small></label>{submissionFile && <div className="selected-file"><Icon name="check" size={15} /><span>{submissionFile.name}</span><small>{(submissionFile.size / (1024 * 1024)).toFixed(2)} MB</small><button type="button" className="text-link" onClick={() => setSubmissionFile(null)}>Remove</button></div>}<button className="button button-primary button-large" disabled={busy}>{busy ? "Submitting…" : "Submit assignment"} <Icon name="arrow" size={16} /></button></form></div>}
    </section>
  );
}

function InstructorDashboard({ user, firstName, data, onRefresh, notify, go }) {
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [assignmentCourse, setAssignmentCourse] = useState(null);
  const [reviewCourse, setReviewCourse] = useState(null);
  const [reviewAssignment, setReviewAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [manageCourse, setManageCourse] = useState(null);
  const [busy, setBusy] = useState(false);
  const [courseForm, setCourseForm] = useState({ code: "", title: "", description: "", category: "Development", level: "Beginner", credits: 3, capacity: 40 });
  const [assignmentForm, setAssignmentForm] = useState({ title: "", description: "", dueDate: "", maxPoints: 100 });
  async function createCourse(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/courses", { method: "POST", body: JSON.stringify(courseForm) });
      notify("Your course is live.");
      setShowCourseForm(false);
      setCourseForm({ code: "", title: "", description: "", category: "Development", level: "Beginner", credits: 3, capacity: 40 });
      await onRefresh();
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  async function createAssignment(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/courses/${assignmentCourse.id}/assignments`, { method: "POST", body: JSON.stringify(assignmentForm) });
      notify("Assignment published.");
      setAssignmentCourse(null);
      setAssignmentForm({ title: "", description: "", dueDate: "", maxPoints: 100 });
      await onRefresh();
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  async function reviewWork(course, assignment = null) {
    setBusy(true);
    try {
      const result = await api(`/courses/${course.id}/submissions`);
      setSubmissions(result.submissions);
      setReviewCourse(course);
      setReviewAssignment(assignment);
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  async function gradeWork(submissionId, grade, feedback) {
    try {
      await api(`/submissions/${submissionId}/grade`, { method: "PATCH", body: JSON.stringify({ grade, feedback }) });
      notify("Grade saved.");
      await reviewWork(reviewCourse, reviewAssignment);
    } catch (error) { notify(error.message); }
  }
  return (
    <section className="dashboard-page page-width">
      <div className="dashboard-welcome"><div><div className="eyebrow">Instructor workspace</div><h1>Make an impact,<br /><span>{firstName}.</span></h1><p>Your classes are taking shape. Here's what's happening.</p></div><button className="button button-primary" onClick={() => setShowCourseForm(true)}><Icon name="plus" size={17} /> Create a course</button></div>
      <div className="dashboard-stats"><StatCard label="Courses you teach" value={data.courses.length} icon="book" tint="stat-lilac" /><StatCard label="Unique learners" value={data.learner_count} icon="users" tint="stat-green" /><StatCard label="Active assignments" value={data.assignments.length} icon="clock" tint="stat-peach" /></div>
      <div className="dashboard-columns instructor-columns">
        <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">Your teaching space</span><h2>Courses</h2></div><span className="row-badge">{data.courses.length} total</span></div>
          {data.courses.length ? <div className="my-course-list">{data.courses.map((course, index) => <div className="my-course-row instructor-row" key={course.id}><div className={`my-course-index index-${index % 3}`}><Icon name="book" size={18} /></div><div className="my-course-info"><strong>{course.title}</strong><span>{course.code} · {course.enrolled_count} learners</span></div><div className="row-actions"><button className="text-link" onClick={() => setManageCourse(course)}>Manage</button><button className="text-link" onClick={() => reviewWork(course)}>Review work</button><button className="text-link" onClick={() => setAssignmentCourse(course)}>New assignment <Icon name="plus" size={14} /></button></div></div>)}</div> : <EmptyPanel title="Ready to teach something?" action="Create a course" onClick={() => setShowCourseForm(true)} />}
        </section>
        <section className="dashboard-panel"><div className="panel-heading"><div><span className="eyebrow">What's on the horizon</span><h2>Assignments</h2></div><Icon name="clock" size={18} /></div>
          {data.assignments.length ? <div className="assignment-list">{data.assignments.map((item) => <button type="button" className="assignment-row assignment-review-row" key={item.id} onClick={() => reviewWork({ id: item.course_id, code: item.code, title: item.course_title }, item)} disabled={busy} aria-label={`Review ${item.title}, ${item.submission_count} turned in`}><span className="assignment-date"><strong>{new Date(item.due_date).toLocaleDateString("en", { day: "2-digit" })}</strong><small>{new Date(item.due_date).toLocaleDateString("en", { month: "short" })}</small></span><span className="assignment-info"><strong>{item.title}</strong><span>{item.course_title}</span></span><span className="assignment-review-action"><span className="status-pill">{item.submission_count} turned in</span><span className="assignment-review-link">Review <Icon name="arrow" size={13} /></span></span></button>)}</div> : <EmptyPanel title="No assignments just yet." description="Create one from any of your courses." />}
        </section>
      </div>
      {showCourseForm && <div className="modal-backdrop" onClick={() => setShowCourseForm(false)}><form className="modal-card modal-wide" onSubmit={createCourse} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setShowCourseForm(false)}><Icon name="close" /></button><span className="eyebrow">Add to the catalog</span><h2>Create a course</h2><div className="form-grid"><label>Course code<input value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} required maxLength="12" placeholder="CS240" /></label><label>Course title<input value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} required maxLength="100" placeholder="Creative coding" /></label><label>Category<select value={courseForm.category} onChange={(event) => setCourseForm({ ...courseForm, category: event.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label><label>Level<select value={courseForm.level} onChange={(event) => setCourseForm({ ...courseForm, level: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label><label>Credits<input type="number" min="1" max="12" value={courseForm.credits} onChange={(event) => setCourseForm({ ...courseForm, credits: event.target.value })} required /></label><label>Capacity<input type="number" min="1" max="500" value={courseForm.capacity} onChange={(event) => setCourseForm({ ...courseForm, capacity: event.target.value })} required /></label><label className="full-field">Description<textarea value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} required maxLength="1200" placeholder="What will learners explore?" /></label></div><button className="button button-primary button-large" disabled={busy}>{busy ? "Creating…" : "Create course"} <Icon name="arrow" size={16} /></button></form></div>}
      {assignmentCourse && <div className="modal-backdrop" onClick={() => setAssignmentCourse(null)}><form className="modal-card" onSubmit={createAssignment} onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setAssignmentCourse(null)}><Icon name="close" /></button><span className="eyebrow">{assignmentCourse.code} · {assignmentCourse.title}</span><h2>New assignment</h2><label>Assignment title<input value={assignmentForm.title} onChange={(event) => setAssignmentForm({ ...assignmentForm, title: event.target.value })} required /></label><label>Instructions<textarea value={assignmentForm.description} onChange={(event) => setAssignmentForm({ ...assignmentForm, description: event.target.value })} required /></label><div className="form-grid"><label>Due date<input type="datetime-local" value={assignmentForm.dueDate} onChange={(event) => setAssignmentForm({ ...assignmentForm, dueDate: event.target.value })} required /></label><label>Max points<input type="number" min="1" max="1000" value={assignmentForm.maxPoints} onChange={(event) => setAssignmentForm({ ...assignmentForm, maxPoints: event.target.value })} required /></label></div><button className="button button-primary button-large" disabled={busy}>{busy ? "Publishing…" : "Publish assignment"} <Icon name="arrow" size={16} /></button></form></div>}
      <AnnouncementFeed />
      {manageCourse && <ManageCourseModal course={manageCourse} notify={notify} onClose={() => setManageCourse(null)} onChanged={onRefresh} />}
      {reviewCourse && <div className="modal-backdrop" onClick={() => setReviewCourse(null)}><div className="modal-card modal-wide review-modal" onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setReviewCourse(null)}><Icon name="close" /></button><span className="eyebrow">{reviewCourse.code} · Instructor workspace</span><h2>Review learner work</h2><p>{reviewAssignment ? reviewAssignment.title : reviewCourse.title}</p>{submissions.filter((item) => !reviewAssignment || item.assignment_id === reviewAssignment.id).length ? <div className="submission-list">{submissions.filter((item) => !reviewAssignment || item.assignment_id === reviewAssignment.id).map((item) => <SubmissionReview key={item.id} item={item} onGrade={gradeWork} />)}</div> : <EmptyPanel title="Nothing to review yet." description="Submissions from your learners will appear here." />}</div></div>}
    </section>
  );
}

function ManageCourseModal({ course: summary, notify, onClose, onChanged }) {
  const confirm = useConfirm();
  const [tab, setTab] = useState("details");
  const [form, setForm] = useState(null);
  const [roster, setRoster] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [post, setPost] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [courseData, rosterData, assignmentData, announcementData] = await Promise.all([
        api(`/courses/${summary.id}`), api(`/courses/${summary.id}/roster`),
        api(`/courses/${summary.id}/assignments`), api(`/courses/${summary.id}/announcements`),
      ]);
      const c = courseData.course;
      setForm((current) => current || { title: c.title, description: c.description, category: c.category, level: c.level, credits: c.credits, capacity: c.capacity });
      setRoster(rosterData.students);
      setAssignments(assignmentData.assignments);
      setAnnouncements(announcementData.announcements);
    } catch (error) { notify(error.message); }
  }, [summary.id, notify]);
  useEffect(() => { load(); }, [load]);

  async function run(action, message) {
    setBusy(true);
    try {
      await action();
      if (message) notify(message);
      await Promise.all([load(), onChanged()]);
      return true;
    } catch (error) { notify(error.message); return false; }
    finally { setBusy(false); }
  }
  const saveCourse = (event) => { event.preventDefault(); run(() => api(`/courses/${summary.id}`, { method: "PUT", body: JSON.stringify(form) }), "Course updated."); };
  async function deleteCourse() {
    if (!await confirm(`Enrollments, assignments, and submissions for ${summary.title} will also be removed.`, "Delete this course?")) return;
    setBusy(true);
    try {
      await api(`/courses/${summary.id}`, { method: "DELETE" });
      notify("Course deleted.");
      onClose();
      await onChanged();
    } catch (error) { notify(error.message); }
    finally { setBusy(false); }
  }
  async function postAnnouncement(event) {
    event.preventDefault();
    if (await run(() => api(`/courses/${summary.id}/announcements`, { method: "POST", body: JSON.stringify(post) }), "Announcement posted.")) setPost({ title: "", body: "" });
  }
  const removeAnnouncement = async (id) => {
    if (await confirm("Learners will no longer see this course announcement.", "Remove this announcement?")) {
      await run(() => api(`/announcements/${id}`, { method: "DELETE" }), "Announcement removed.");
    }
  };
  const removeAssignment = async (id) => {
    if (await confirm("Submissions and grades for this assignment will also be deleted.", "Delete this assignment?")) {
      await run(() => api(`/assignments/${id}`, { method: "DELETE" }), "Assignment deleted.");
    }
  };
  const removeLearner = async (student) => {
    if (!await confirm(`${student.name} will lose access to this course. A notification will be sent to them.`, "Unenroll this learner?")) return;
    await run(() => api(`/courses/${summary.id}/roster/${student.id}`, { method: "DELETE" }), `${student.name} was unenrolled and notified.`);
  };

  const tabs = [["details", "Details"], ["roster", `Roster (${roster.length})`], ["assignments", `Assignments (${assignments.length})`], ["announcements", "Announcements"]];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-wide review-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <span className="eyebrow">{summary.code} · Manage course</span>
        <h2>{summary.title}</h2>
        <div className="tab-row" role="tablist">{tabs.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "category-pill selected" : "category-pill"} onClick={() => setTab(key)}>{label}</button>)}</div>
        <div className="manage-course-content">
        {tab === "details" && (form ? (
          <form onSubmit={saveCourse}>
            <div className="form-grid">
              <label className="full-field">Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength="100" /></label>
              <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.slice(1).map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Level<select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></label>
              <label>Credits<input type="number" min="1" max="12" value={form.credits} onChange={(event) => setForm({ ...form, credits: event.target.value })} required /></label>
              <label>Capacity<input type="number" min="1" max="500" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} required /></label>
              <label className="full-field">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required maxLength="1200" /></label>
            </div>
            <div className="detail-actions"><button className="button button-primary" disabled={busy}>Save changes</button><button type="button" className="button button-outline danger-button" disabled={busy} onClick={deleteCourse}><Icon name="trash" size={15} /> Delete course</button></div>
          </form>
        ) : <div className="loading-card">Loading…</div>)}
        {tab === "roster" && (roster.length ? <div className="table-scroll"><table><thead><tr><th>Learner</th><th>Email</th><th>Enrolled</th><th /></tr></thead><tbody>{roster.map((student) => <tr key={student.id}><td><strong>{student.name}</strong></td><td><a href={`mailto:${student.email}`}>{student.email}</a></td><td>{formatDate(student.enrolled_at)}</td><td><button type="button" className="text-link danger-link" disabled={busy} onClick={() => removeLearner(student)}>Unenroll</button></td></tr>)}</tbody></table></div> : <EmptyPanel title="No learners yet." description="Students who enroll will appear here." />)}
        {tab === "assignments" && (assignments.length ? <div className="assignment-list">{assignments.map((item) => <div className="assignment-row" key={item.id}><span className="assignment-date"><strong>{new Date(item.due_date).toLocaleDateString("en", { day: "2-digit" })}</strong><small>{new Date(item.due_date).toLocaleDateString("en", { month: "short" })}</small></span><div className="assignment-info"><strong>{item.title}</strong><span>{item.max_points} points · {item.description}</span></div><button className="icon-button" onClick={() => removeAssignment(item.id)} aria-label={`Delete ${item.title}`}><Icon name="trash" size={15} /></button></div>)}</div> : <EmptyPanel title="No assignments yet." description="Use “New assignment” on your dashboard to add one." />)}
        {tab === "announcements" && (
          <>
            <form className="announcement-form" onSubmit={postAnnouncement}>
              <label>Title<input value={post.title} onChange={(event) => setPost({ ...post, title: event.target.value })} required maxLength="120" placeholder="Class moved to Thursday" /></label>
              <label>Message<textarea value={post.body} onChange={(event) => setPost({ ...post, body: event.target.value })} required maxLength="4000" placeholder="Share an update with your learners…" /></label>
              <button className="button button-primary" disabled={busy}><Icon name="bell" size={15} /> Post announcement</button>
            </form>
            <div className="announcement-list">{announcements.map((item) => <div className="announcement-item" key={item.id}><div className="announcement-top"><strong>{item.title}</strong><button className="icon-button" onClick={() => removeAnnouncement(item.id)} aria-label="Remove announcement"><Icon name="trash" size={14} /></button></div><p>{item.body}</p><small>{item.author_name} · {formatDate(item.created_at)}</small></div>)}</div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}

function SubmissionReview({ item, onGrade }) {
  const [grade, setGrade] = useState(item.grade ?? "");
  const [feedback, setFeedback] = useState(item.feedback ?? "");
  return (
    <form className="submission-card" onSubmit={(event) => { event.preventDefault(); onGrade(item.id, grade, feedback); }}>
      <div className="submission-heading"><div><strong>{item.student_name}</strong><span>{item.student_email} · {item.assignment_title}</span></div><span className="row-badge">{new Date(item.submitted_at).toLocaleDateString()}</span></div>
      {item.content && <p className="submission-content">{item.content}</p>}
      {item.file_name && <a className="submission-file" href={`/api/submissions/${item.id}/file`} download><Icon name="edit" size={16} /><span><strong>{item.file_name}</strong><small>{item.file_size ? `${(item.file_size / (1024 * 1024)).toFixed(2)} MB` : "Homework attachment"} · Download file</small></span><Icon name="arrow" size={15} /></a>}
      {!item.content && !item.file_name && <p className="submission-content">No submission content.</p>}
      <div className="submission-grade"><label><span>Grade</span><input type="number" min="0" max={item.max_points} step="0.5" value={grade} onChange={(event) => setGrade(event.target.value)} required /><small>out of {item.max_points}</small></label><label><span>Feedback</span><input value={feedback} onChange={(event) => setFeedback(event.target.value)} maxLength="2000" placeholder="A note for your learner" /></label><button className="button button-primary button-small">{item.grade === null ? "Save grade" : "Update grade"}</button></div>
    </form>
  );
}

function GradesPage({ notify, go }) {
  const [courses, setCourses] = useState(null);
  useEffect(() => {
    api("/grades").then((data) => setCourses(data.courses)).catch((error) => notify(error.message));
  }, [notify]);
  if (!courses) return <section className="dashboard-page page-width"><div className="loading-card">Gathering your grades…</div></section>;
  const graded = courses.filter((course) => course.percentage !== null);
  const overall = graded.length ? Math.round((graded.reduce((sum, course) => sum + course.percentage, 0) / graded.length) * 10) / 10 : null;
  return (
    <section className="dashboard-page page-width">
      <div className="dashboard-welcome"><div><div className="eyebrow">Progress report</div><h1>Your grades,<br /><span>at a glance.</span></h1><p>Percentages include graded work only.</p></div><button className="button button-outline" onClick={() => window.print()}>Print report</button></div>
      <div className="dashboard-stats">
        <StatCard label="Courses" value={courses.length} icon="book" tint="stat-lilac" />
        <StatCard label="Total credits" value={courses.reduce((sum, course) => sum + course.credits, 0)} icon="cap" tint="stat-green" />
        <StatCard label="Overall average" value={overall === null ? "—" : `${overall}%`} icon="chart" tint="stat-blue" />
      </div>
      {courses.length === 0 && <div className="dashboard-panel"><EmptyPanel title="No courses yet." action="Explore courses" onClick={() => go("courses")} /></div>}
      {courses.map((course) => (
        <section className="dashboard-panel grades-panel" key={course.id}>
          <div className="grades-course-heading"><div><span className="eyebrow">{course.code} · {course.credits} credits</span><h2>{course.title}</h2></div><span className={`grade-chip ${course.percentage === null ? "" : course.percentage >= 70 ? "grade-good" : "grade-low"}`}>{course.percentage === null ? "Not graded" : `${course.percentage}%`}</span></div>
          {course.percentage !== null && <div className="grades-progress" aria-label={`${course.percentage}% graded average`}><span style={{ width: `${Math.min(100, Math.max(0, course.percentage))}%` }} /></div>}
          {course.assignments.length ? (
            <div className="grade-assignment-list">{course.assignments.map((item) => {
              const status = item.grade !== null ? "Graded" : item.submitted_at ? "Submitted" : new Date(item.due_date) < new Date() ? "Missing" : "Pending";
              return <article className="grade-assignment" key={item.id}>
                <div className="grade-assignment-heading"><div><strong>{item.title}</strong><small>Due {formatDate(item.due_date)}</small></div><span className={`status-pill ${status === "Graded" || status === "Submitted" ? "status-done" : ""}`}>{status}</span></div>
                <div className="grade-assignment-details"><div><small>Score</small><strong>{item.grade !== null ? `${item.grade} / ${item.max_points}` : `— / ${item.max_points}`}</strong></div><div className="grade-feedback"><small>Instructor feedback</small><p>{item.feedback || "No feedback yet."}</p></div></div>
              </article>;
            })}</div>
          ) : <p className="muted-note">No assignments have been posted yet.</p>}
        </section>
      ))}
    </section>
  );
}

function StatCard({ label, value, icon, tint }) {
  return <div className="stat-card"><span className={`stat-icon ${tint}`}><Icon name={icon} size={19} /></span><span className="stat-value">{value}</span><span className="stat-label">{label}</span></div>;
}

function EmptyPanel({ title, description, action, onClick }) {
  return <div className="empty-panel"><span className="empty-icon"><Icon name="spark" size={20} /></span><strong>{title}</strong>{description && <p>{description}</p>}{action && <button className="text-link" onClick={onClick}>{action} <Icon name="arrow" size={14} /></button>}</div>;
}

createRoot(document.getElementById("root")).render(<React.StrictMode><ConfirmProvider><App /></ConfirmProvider></React.StrictMode>);


const root = createRoot(document.getElementById("root"));
root.render(
  <ConfirmProvider>
    <App />
  </ConfirmProvider>
);

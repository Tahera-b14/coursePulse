import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const categories = ["All", "Development", "Data & AI", "Design", "Business"];
const pages = ["home", "login", "register"];

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

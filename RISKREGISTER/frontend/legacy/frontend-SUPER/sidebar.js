// sidebar.js
// Renders the sidebar into #sidebarMount on every page and marks the
// current page's nav link active. Also drives the time-aware,
// language-cycling greeting used in each page's header.

const NAV_ITEMS = [
  { href: "dashboard.html", label: "Dashboard" },
  { href: "register.html", label: "Register risk" },
  { href: "history.html", label: "Risk history" }
];
const EXEC_NAV_ITEMS = [
  { href: "org-overview.html", label: "Overview" },
  { href: "archived.html", label: "Archived" }
];

// Set on each page before this script runs, e.g. window.CURRENT_PAGE = "dashboard.html"
// Set window.IS_VIEWER = true on pages meant for the 3 full-visibility viewers,
// this only controls sidebar visibility in this prototype, not real access,
// real enforcement happens server-side once Cognito and API Gateway are wired in.

function renderSidebar(){
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const current = window.CURRENT_PAGE || "";
  const deptLabel = window.DEPT_LABEL || "Corporate resources";
  const isViewer = window.IS_VIEWER === true;

  const navLinks = NAV_ITEMS.map(item =>
    `<a href="${item.href}" class="${item.href === current ? "active" : ""}"><span>${item.label}</span></a>`
  ).join("");

  const execLinks = isViewer
    ? `<div class="nav-section-label">All departments</div>` +
      EXEC_NAV_ITEMS.map(item =>
        `<a href="${item.href}" class="${item.href === current ? "active" : ""}"><span>${item.label}</span></a>`
      ).join("")
    : "";

  mount.innerHTML = `
    <button class="sidebar-toggle" id="sidebarToggle" aria-label="Collapse sidebar">&#9776;</button>
    <span class="dept-badge">${deptLabel}</span>
    <nav>${navLinks}${execLinks}</nav>
  `;

  const toggleBtn = document.getElementById("sidebarToggle");
  const collapsed = localStorage.getItem("mswg_rr_sidebar_collapsed") === "true";
  if (collapsed) mount.classList.add("collapsed");

  toggleBtn.addEventListener("click", () => {
    mount.classList.toggle("collapsed");
    localStorage.setItem("mswg_rr_sidebar_collapsed", mount.classList.contains("collapsed"));
  });
}

const DEPT_HEADS = {
  "CEO office": null,
  "Corporate monitoring": "Rita Foo / Elaine Choo",
  "Corporate governance": "Noraida Maria",
  "Corporate resources": "Lini Hazlinda",
  "Finance and admin": "Emily Lim",
  "IT and training": "Padma Devi",
  "Creative communications": "Zulfiwa Zuehir",
  "Professional development": "Iman Lai"
};

function renderTopbar(){
  if (document.getElementById("topbar")) return;

  const name = window.USER_NAME || "User";
  const initial = name.charAt(0).toUpperCase();

  const topbar = document.createElement("div");
  topbar.className = "topbar";
  topbar.id = "topbar";
  topbar.innerHTML = `
    <div>
      <div class="topbar-eyebrow">MSWG - Enterprise Risk Management</div>
      <div class="topbar-greeting" id="topbarGreeting">Good afternoon, ${name}</div>
    </div>
    <div class="profile-wrap">
      <button class="profile-btn" id="profileBtn">${initial}</button>
      <div class="profile-dropdown" id="profileDropdown">
        <a href="profile.html">View profile</a>
        <button id="signOutBtn">Sign out</button>
      </div>
    </div>
  `;
  document.body.insertBefore(topbar, document.body.firstChild);

  const btn = document.getElementById("profileBtn");
  const dropdown = document.getElementById("profileDropdown");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });
  document.addEventListener("click", () => dropdown.classList.remove("open"));

  document.getElementById("signOutBtn").addEventListener("click", () => {
    alert("Signed out (placeholder, real sign-out arrives with Cognito).");
  });
}

const GREETINGS = {
  en: ["Good morning", "Good afternoon", "Good evening"],
  ms: ["Selamat pagi", "Selamat tengah hari", "Selamat petang"],
  zh: ["早上好", "下午好", "晚上好"],
  ta: ["காலை வணக்கம்", "மதிய வணக்கம்", "மாலை வணக்கம்"]
};
const LANG_ORDER = ["en", "ms", "zh", "ta"];
let langIndex = 0;

function periodIndex(){
  const hour = new Date().getHours();
  if (hour < 12) return 0;
  if (hour < 18) return 1;
  return 2;
}

function updateGreeting(){
  const name = window.USER_NAME || "there";
  const lang = LANG_ORDER[langIndex];
  const phrase = GREETINGS[lang][periodIndex()];
  const text = `${phrase}, ${name}`;

  const el = document.getElementById("greeting");
  if (el) el.textContent = text;

  const topbarEl = document.getElementById("topbarGreeting");
  if (topbarEl) topbarEl.textContent = text;

  langIndex = (langIndex + 1) % LANG_ORDER.length;
}

function initSidebarAndGreeting(){
  renderTopbar();
  renderSidebar();
  updateGreeting();
  setInterval(updateGreeting, 120000);
}


document.addEventListener("DOMContentLoaded", initSidebarAndGreeting);

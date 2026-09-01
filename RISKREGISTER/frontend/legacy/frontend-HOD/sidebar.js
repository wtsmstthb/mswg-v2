"use strict";

const NAV_ITEMS = [
  { href: "dashboard.html", label: "Dashboard", icon: "⌂" },
  { href: "register.html", label: "Register risk", icon: "+" },
  { href: "history.html", label: "Risk history", icon: "↗" }
];

const OTHER_PLATFORM_ITEMS = [
  { href: "../../../pre-voting/", label: "Pre-Voting", icon: "◎", available: false },
  { href: "../../../../AGM/frontend/landingpage.html", label: "AGM", icon: "✓", available: true }
];

const PAGE_LABELS = {
  "dashboard.html": "Dashboard",
  "register.html": "Register risk",
  "history.html": "Risk history",
  "profile.html": "Profile"
};

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

function renderSidebar(){
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const current = window.CURRENT_PAGE || "";
  const name = window.USER_NAME || "User";
  const department = window.DEPT_LABEL || "Department";
  const initial = name.charAt(0).toUpperCase();
  const renderLinks = items => items.map(item =>
    `<a href="${item.href}" class="${item.href === current ? "active" : ""}"><span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-text">${item.label}</span></a>`
  ).join("");
  const platformLinks = OTHER_PLATFORM_ITEMS.map(item => item.available
    ? `<a href="${item.href}"><span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-text">${item.label}</span></a>`
    : `<span class="platform-nav-item is-disabled" aria-disabled="true" title="This platform is not available yet"><span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-text">${item.label}</span><span class="platform-state">Soon</span></span>`
  ).join("");

  mount.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-brand-mark">M</span>
      <span class="sidebar-brand-copy"><strong>MSWG</strong><small>Risk Register</small></span>
    </div>
    <div class="sidebar-tools">
      <button class="sidebar-toggle" id="sidebarToggle" aria-label="Collapse sidebar" title="Collapse sidebar"><span aria-hidden="true">☰</span><span class="toggle-label">Collapse menu</span></button>
      <span class="dept-badge" title="${department}">${department}</span>
    </div>
    <nav>
      <div class="nav-section-label nav-section-first">Workspace</div>
      <a href="../../../../shared/portal/index.html"><span class="nav-icon" aria-hidden="true">⌂</span><span class="nav-text">Portal home</span></a>
      ${renderLinks(NAV_ITEMS)}
      <div class="nav-section-label">Other platforms</div>
      ${platformLinks}
    </nav>
    <div class="sidebar-user-card" title="${name} · Head of Department">
      <span class="sidebar-user-avatar" aria-hidden="true">${initial}</span>
      <span class="sidebar-user-copy"><strong>${name}</strong><small>Head of Department</small></span>
    </div>
  `;

  const collapsed = localStorage.getItem("mswg_rr_hod_sidebar_collapsed") === "true";
  if (collapsed) mount.classList.add("collapsed");
  const toggle = document.getElementById("sidebarToggle");
  toggle.addEventListener("click", () => {
    mount.classList.toggle("collapsed");
    const isCollapsed = mount.classList.contains("collapsed");
    localStorage.setItem("mswg_rr_hod_sidebar_collapsed", String(isCollapsed));
    toggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    toggle.setAttribute("title", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
  });
}

function renderTopbar(){
  if (document.getElementById("topbar")) return;

  const name = window.USER_NAME || "User";
  const department = window.DEPT_LABEL || "Department";
  const pageLabel = PAGE_LABELS[window.CURRENT_PAGE] || "Risk workspace";
  const initial = name.charAt(0).toUpperCase();
  const topbar = document.createElement("div");
  topbar.className = "topbar";
  topbar.id = "topbar";
  topbar.innerHTML = `
    <div>
      <div class="topbar-eyebrow">MSWG / Risk Register</div>
      <div class="topbar-greeting">${department}</div>
      <div class="topbar-subtitle">${pageLabel} · Head of Department access</div>
    </div>
    <div class="profile-wrap">
      <button class="profile-btn" id="profileBtn" aria-label="Open profile menu">${initial}</button>
      <div class="profile-dropdown" id="profileDropdown">
        <a href="profile.html">View profile</a>
        <button id="signOutBtn">Sign out</button>
      </div>
    </div>
  `;

  const main = document.querySelector(".shell > .main");
  if (main) {
    const pageContent = document.createElement("div");
    pageContent.className = "page-content";
    const constrainedWidth = main.style.maxWidth;
    if (constrainedWidth) {
      pageContent.style.maxWidth = constrainedWidth;
      main.style.maxWidth = "";
    }
    while (main.firstChild) pageContent.appendChild(main.firstChild);
    main.appendChild(topbar);
    main.appendChild(pageContent);
  }

  const dropdown = document.getElementById("profileDropdown");
  document.getElementById("profileBtn").addEventListener("click", event => {
    event.stopPropagation();
    dropdown.classList.toggle("open");
  });
  document.addEventListener("click", () => dropdown.classList.remove("open"));
  document.getElementById("signOutBtn").addEventListener("click", () => {
    alert("Signed out (placeholder, real sign-out arrives with Cognito).");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderTopbar();
  renderSidebar();
});

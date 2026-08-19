"use strict";

const NAV_ITEMS = [
  { href: "dashboard.html", label: "Dashboard", icon: "⌂", permission: "hasAppAccess" },
  { href: "register.html", label: "Register risk", icon: "+", permission: "canCreate" },
  { href: "history.html", label: "Risk history", icon: "↗", permission: "hasAppAccess" }
];
const EXEC_NAV_ITEMS = [
  { href: "org-overview.html", label: "Overview", icon: "▦", permission: "canViewAll" },
  { href: "archived.html", label: "Archived", icon: "□", permission: "canViewAll" }
];
const OTHER_PLATFORM_ITEMS = [
  { href: "../pre-voting/", label: "Pre-Voting", icon: "◎", available: false },
  { href: "../agm-conduct/landingpage.html", label: "AGM", icon: "✓", available: true }
];

const PAGE_LABELS = {
  "dashboard.html": "Dashboard",
  "register.html": "Register risk",
  "history.html": "Risk history",
  "org-overview.html": "Organisation overview",
  "archived.html": "Archived risks",
  "profile.html": "Profile"
};

function allowed(item){
  return window.APP_CONTEXT?.[item.permission] === true;
}

function renderSidebar(){
  const mount = document.getElementById("sidebarMount");
  if (!mount) return;

  const current = window.CURRENT_PAGE || "";
  const context = window.APP_CONTEXT;
  const initial = context.userName.charAt(0).toUpperCase();
  const positionLabel = context.canViewAll
    ? "Full-visibility viewer"
    : context.isDepartmentHead
      ? "Head of Department"
      : "Risk Register user";
  const renderLinks = items => items.filter(allowed).map(item =>
    `<a href="${item.href}" class="${item.href === current ? "active" : ""}"><span class="nav-icon" aria-hidden="true">${item.icon}</span><span class="nav-text">${item.label}</span></a>`
  ).join("");

  const execLinks = context.canViewAll
    ? `<div class="nav-section-label">All departments</div>${renderLinks(EXEC_NAV_ITEMS)}`
    : "";

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
      <span class="dept-badge" title="${context.departmentLabel}">${context.departmentLabel}</span>
    </div>
    <nav>
      <div class="nav-section-label nav-section-first">Workspace</div>
      <a href="../portal/index.html"><span class="nav-icon" aria-hidden="true">⌂</span><span class="nav-text">Portal home</span></a>
      ${renderLinks(NAV_ITEMS)}${execLinks}<div class="nav-section-label">Other platforms</div>${platformLinks}
    </nav>
    <div class="sidebar-user-card" title="${context.userName} · ${positionLabel}">
      <span class="sidebar-user-avatar" aria-hidden="true">${initial}</span>
      <span class="sidebar-user-copy"><strong>${context.userName}</strong><small>${positionLabel}</small></span>
    </div>
  `;

  const collapsed = localStorage.getItem("mswg_rr_sidebar_collapsed") === "true";
  if (collapsed) mount.classList.add("collapsed");
  document.getElementById("sidebarToggle").addEventListener("click", () => {
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
  "Creative communications": "Zulfina",
  "Professional development": "Imen Lai"
};

function renderTopbar(){
  if (document.getElementById("topbar")) return;
  const context = window.APP_CONTEXT;
  const initial = context.userName.charAt(0).toUpperCase();
  const pageLabel = PAGE_LABELS[window.CURRENT_PAGE] || "Risk workspace";
  const workspaceLabel = context.canViewAll ? "Organisation-wide workspace" : context.departmentLabel;
  const accessLabel = context.canViewAll ? "Full visibility" : "Department access";

  const topbar = document.createElement("div");
  topbar.className = `topbar${context.canViewAll ? " viewer" : ""}`;
  topbar.id = "topbar";
  topbar.innerHTML = `
    <div>
      <div class="topbar-eyebrow">MSWG / Risk Register</div>
      <div class="topbar-greeting">${workspaceLabel}</div>
      <div class="topbar-subtitle">${pageLabel} · ${accessLabel}</div>
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
  } else {
    document.body.insertBefore(topbar, document.body.firstChild);
  }

  const dropdown = document.getElementById("profileDropdown");
  document.getElementById("profileBtn").addEventListener("click", event => {
    event.stopPropagation();
    dropdown.classList.toggle("open");
  });
  document.addEventListener("click", () => dropdown.classList.remove("open"));
  document.getElementById("signOutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("mswg_rr_id_token");
    sessionStorage.removeItem("mswg_rr_access_token");
    localStorage.removeItem("mswg_rr_id_token");
    localStorage.removeItem("mswg_rr_access_token");
    const cognito = window.APP_CONFIG?.cognito;
    if (cognito?.hostedUiDomain && cognito?.clientId && cognito?.logoutUri) {
      const url = new URL("/logout", cognito.hostedUiDomain);
      url.searchParams.set("client_id", cognito.clientId);
      url.searchParams.set("logout_uri", cognito.logoutUri);
      window.location.replace(url.toString());
      return;
    }
    window.location.replace("access-denied.html");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!window.APP_CONTEXT?.hasAppAccess) return;
  renderTopbar();
  renderSidebar();
  document.body.classList.toggle("viewer-mode", window.APP_CONTEXT.canViewAll);
});

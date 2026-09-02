"use strict";

const WORKSPACE_ITEMS = [
  {
    href: "../../shared/portal/index.html",
    label: "Portal home",
    icon: "⌂",
    key: "portal"
  },
  {
    href: "./index.html",
    label: "Pre-Voting",
    icon: "◎",
    key: "pre-voting"
  },
  {
    href: "./history.html",
    label: "Pre-Voting History",
    icon: "⧉",
    key: "pre-voting-history"
  }
];

const OTHER_PLATFORM_ITEMS = [
  {
    href: "../../AGM/frontend/landingpage.html",
    label: "AGM",
    icon: "✓",
    key: "agm"
  },
  {
    href: "../../RISKREGISTER/frontend/dashboard.html",
    label: "Risk Register",
    icon: "◇",
    key: "risk-register"
  }
];


function renderNavItem(item, currentPage) {

  const active =
    item.key === currentPage
      ? "active"
      : "";

  return `
    <a
      href="${item.href}"
      class="nav-item ${active}"
    >
      <span
        class="nav-icon"
        aria-hidden="true"
      >
        ${item.icon}
      </span>

      <span class="nav-text">
        ${item.label}
      </span>
    </a>
  `;
}

function getTopbarContext() {
  const context = window.APP_CONTEXT || {};
  const userName = context.userName || "MSWG Analyst";

  let positionLabel = "MSWG User";

  if (context.canViewAll) {
    positionLabel = "Full-visibility viewer";
  } else if (context.isDepartmentHead) {
    positionLabel = "Head of Department";
  } else if (context.role) {
    positionLabel = context.role;
  }

  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "M";

  return { userName, positionLabel, initials };
}


function firstName(userName) {
  return userName.split(/\s+/)[0] || userName;
}


function initTopbar() {
  const greeting = document.getElementById("topbarGreeting");
  const profileBtn = document.getElementById("profileBtn");
  const dropdown = document.getElementById("profileDropdown");
  const { userName, initials } = getTopbarContext();

  if (greeting) {
    greeting.textContent = `Hi, ${firstName(userName)}`;
  }

  if (profileBtn) {
    profileBtn.textContent = initials;
    profileBtn.setAttribute("aria-label", `${userName} profile menu`);
  }

  if (!profileBtn || !dropdown) {
    return;
  }

  profileBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = dropdown.classList.toggle("open");
    profileBtn.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
    profileBtn.setAttribute("aria-expanded", "false");
  });

  dropdown.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}


if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTopbar);
} else {
  initTopbar();
}


function renderSidebar() {

  const mount =
    document.getElementById(
      "sidebarMount"
    );

  if (!mount) {
    console.error(
      "sidebarMount was not found."
    );
    return;
  }


  const currentPage =
    window.CURRENT_PAGE ||
    "pre-voting";


  const context =
    window.APP_CONTEXT || {};


  const userName =
    context.userName ||
    "User";


  let positionLabel =
    "MSWG User";


  if (context.canViewAll) {
    positionLabel =
      "Full-visibility viewer";
  }

  else if (context.isDepartmentHead) {
    positionLabel =
      "Head of Department";
  }

  else if (context.role) {
    positionLabel =
      context.role;
  }


  const workspaceLinks =
    WORKSPACE_ITEMS
      .map(item =>
        renderNavItem(
          item,
          currentPage
        )
      )
      .join("");


  const platformLinks =
    OTHER_PLATFORM_ITEMS
      .map(item =>
        renderNavItem(
          item,
          currentPage
        )
      )
      .join("");


  mount.innerHTML = `

    <div class="brand">

      <span class="brand-mark">
        M
      </span>

      <span class="brand-copy">
        <strong>MSWG</strong>
        <span>Pre-Voting</span>
      </span>

    </div>


    <button
      type="button"
      class="sidebar-toggle"
      id="sidebarToggle"
    >

      <span
        class="toggle-icon"
        aria-hidden="true"
      >
        ☰
      </span>

      <span class="toggle-text">
        Collapse menu
      </span>

    </button>


    <nav>

      <div class="nav-label">
        Workspace
      </div>

      ${workspaceLinks}


      <div class="nav-label">
        Other platforms
      </div>

      ${platformLinks}

    </nav>


    <div class="user-card">

      <strong>
        ${userName}
      </strong>

      <span>
        ${positionLabel}
      </span>

    </div>

  `;


  const app =
    document.querySelector(".app");


  const collapsed =
    localStorage.getItem(
      "mswg_sidebar_collapsed"
    ) === "true";


  if (collapsed) {

    mount.classList.add(
      "collapsed"
    );

    if (app) {
      app.classList.add(
        "sidebar-collapsed"
      );
    }
  }


  const toggle =
    document.getElementById(
      "sidebarToggle"
    );


  if (toggle) {

    toggle.addEventListener(
      "click",
      () => {

        mount.classList.toggle(
          "collapsed"
        );

        if (app) {
          app.classList.toggle(
            "sidebar-collapsed"
          );
        }


        localStorage.setItem(
          "mswg_sidebar_collapsed",
          mount.classList.contains(
            "collapsed"
          )
        );

      }
    );

  }
}


if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    renderSidebar
  );

}

else {

  renderSidebar();

}

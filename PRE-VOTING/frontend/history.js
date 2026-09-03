/* =========================================================
   PRE-VOTING HISTORY
========================================================= */

const API_BASE = "http://127.0.0.1:8000";

const historyView = document.getElementById("historyView");
const historyDetail = document.getElementById("historyDetail");
const historyTableBody = document.getElementById("historyTableBody");

let historyRecords = [];


/* Demo fallback when the FastAPI backend is not running */
const MOCK_SUBMISSIONS = [
  {
    id: "demo-1",
    company_name: "Example Holdings Berhad",
    meeting_description:
      "Notice of 48th Annual General Meeting of Example Holdings Berhad",
    meeting_type: "48th Annual General Meeting",
    meeting_date: "15 May 2026",
    meeting_time: "10:00 a.m.",
    meeting_venue:
      "Ballroom 1, Level 3\nExample Convention Centre\nKuala Lumpur",
    overall_remarks:
      "Support resolutions aligned with minority shareholder interests.",
    created_at: "2026-04-02T09:15:00+08:00",
    votes: [
      {
        number: 1,
        description:
          "To receive the Audited Financial Statements for the financial year ended 31 December 2025 together with the Reports of the Directors and Auditors thereon.",
        vote: "for",
        remarks: ""
      },
      {
        number: 2,
        description:
          "To approve the payment of Directors' fees amounting to RM450,000 for the financial year ending 31 December 2026.",
        vote: "against",
        remarks: "Fees appear elevated relative to peer companies of similar size."
      },
      {
        number: 3,
        description:
          "To re-elect Datuk A. Rahman who retires by rotation in accordance with the Constitution of the Company.",
        vote: "abstain",
        remarks: "Insufficient disclosure on board evaluation outcomes."
      }
    ]
  },
  {
    id: "demo-2",
    company_name: "Northern Palm Industries Berhad",
    meeting_description:
      "Notice of Extraordinary General Meeting of Northern Palm Industries Berhad",
    meeting_type: "Extraordinary General Meeting",
    meeting_date: "28 Apr 2026",
    meeting_time: "2:30 p.m.",
    meeting_venue: "Virtual meeting via TIIH Online",
    overall_remarks: "",
    created_at: "2026-03-18T14:40:00+08:00",
    votes: [
      {
        number: 1,
        description:
          "Proposed acquisition of plantation assets for a cash consideration of RM120 million.",
        vote: "for",
        remarks: ""
      }
    ]
  }
];


document.addEventListener("DOMContentLoaded", async () => {
  await loadHistory();

  const params = new URLSearchParams(window.location.search);
  const openId = params.get("id");
  if (openId) {
    await openSubmission(openId);
  }
});


async function loadHistory() {
  try {
    const response = await fetch(`${API_BASE}/api/pre-voting/history`);

    if (!response.ok) {
      throw new Error("Unable to load pre-voting history.");
    }

    const submissions = await response.json();
    historyRecords = submissions;
    updateSummary(submissions);
    renderHistory(submissions);
  } catch (error) {
    console.warn("History API unavailable — using demo records.", error);
    historyRecords = MOCK_SUBMISSIONS;
    updateSummary(MOCK_SUBMISSIONS);
    renderHistory(MOCK_SUBMISSIONS);
  }
}


function updateSummary(submissions) {
  const total = document.getElementById("totalSubmissions");
  if (total) {
    total.textContent = submissions.length;
  }
}


function renderHistory(submissions) {
  if (!submissions.length) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="history-empty">
          No pre-voting submissions found.
        </td>
      </tr>
    `;
    return;
  }

  historyTableBody.innerHTML = submissions
    .map((submission) => {
      return `
        <tr>
          <td>
            <div class="history-company">
              ${escapeHtml(submission.company_name || "-")}
            </div>
          </td>
          <td>
            <div class="history-meeting-description">
              ${escapeHtml(
                submission.meeting_description ||
                  submission.meeting_type ||
                  "-"
              )}
            </div>
          </td>
          <td>${escapeHtml(submission.meeting_date || "-")}</td>
          <td>${formatCreatedDate(submission.created_at)}</td>
          <td class="history-action-cell">
            <button
              type="button"
              class="history-view-btn"
              data-id="${escapeHtml(submission.id)}"
            >
              View
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  attachViewEvents();
}


function attachViewEvents() {
  document.querySelectorAll(".history-view-btn").forEach((button) => {
    button.addEventListener("click", () => {
      openSubmission(button.dataset.id);
    });
  });
}


async function openSubmission(id) {
  try {
    const response = await fetch(
      `${API_BASE}/api/pre-voting/history/${id}`
    );

    if (!response.ok) {
      throw new Error("Unable to load submission.");
    }

    const submission = await response.json();
    showDetail(submission);
  } catch (error) {
    const local = historyRecords.find(
      (item) => String(item.id) === String(id)
    );

    if (local) {
      showDetail(local);
      return;
    }

    console.error("Submission error:", error);
    alert("Unable to open this pre-voting record.");
  }
}


function showDetail(submission) {
  renderSubmission(submission);
  historyView.hidden = true;
  historyDetail.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}


function renderSubmission(data) {
  setText("detailCompany", data.company_name);
  setText("detailDescription", data.meeting_description);
  setText("detailType", data.meeting_type);
  setText("detailDate", data.meeting_date);
  setText("detailTime", data.meeting_time);
  setText("detailVenue", data.meeting_venue);
  setText("detailOverall", data.overall_remarks);
  renderVotes(data.votes || []);

  const generated = document.getElementById("printGeneratedAt");
  if (generated) {
    generated.textContent = new Date().toLocaleString("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}


function renderVotes(votes) {
  const voteBody = document.getElementById("detailVotes");

  if (!votes.length) {
    voteBody.innerHTML = `
      <tr>
        <td colspan="4" class="history-empty">
          No voting decisions found.
        </td>
      </tr>
    `;
    return;
  }

  voteBody.innerHTML = votes
    .map((vote) => {
      const voteValue = String(vote.vote || "").toLowerCase();

      return `
        <tr>
          <td class="history-resolution-number">
            <span>Ordinary</span>
            <span>Resolution ${escapeHtml(vote.number)}</span>
          </td>
          <td class="history-resolution-description">
            ${escapeHtml(vote.description || "-")}
          </td>
          <td class="history-vote-cell">
            <span class="history-vote history-vote-${voteValue}">
              ${escapeHtml(voteValue.toUpperCase() || "-")}
            </span>
          </td>
          <td class="history-remarks-cell">
            ${escapeHtml(vote.remarks || "-")}
          </td>
        </tr>
      `;
    })
    .join("");
}


const historySearch = document.getElementById("historySearch");

if (historySearch) {
  historySearch.addEventListener("input", () => {
    const searchValue = historySearch.value.trim().toLowerCase();

    const filtered = historyRecords.filter((submission) => {
      const company = String(submission.company_name || "").toLowerCase();
      const meeting = String(
        submission.meeting_description || ""
      ).toLowerCase();
      const meetingType = String(
        submission.meeting_type || ""
      ).toLowerCase();

      return (
        company.includes(searchValue) ||
        meeting.includes(searchValue) ||
        meetingType.includes(searchValue)
      );
    });

    renderHistory(filtered);
  });
}


const backBtn = document.getElementById("backBtn");

if (backBtn) {
  backBtn.addEventListener("click", () => {
    historyDetail.hidden = true;
    historyView.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}


const printHistoryBtn = document.getElementById("printHistoryBtn");

if (printHistoryBtn) {
  printHistoryBtn.addEventListener("click", () => {
    const company =
      document.getElementById("detailCompany")?.textContent?.trim() ||
      "Pre-Voting Record";
    const previousTitle = document.title;
    document.title = `${company} — Pre-Voting Record`;
    window.print();
    document.title = previousTitle;
  });
}


function setText(id, value) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = value || "—";
}


function formatCreatedDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return date.toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

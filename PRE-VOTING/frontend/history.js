/* =========================================================
   PRE-VOTING HISTORY
========================================================= */


const API_BASE =
  "http://127.0.0.1:8000";


const historyView =
  document.getElementById(
    "historyView"
  );


const historyDetail =
  document.getElementById(
    "historyDetail"
  );


const historyTableBody =
  document.getElementById(
    "historyTableBody"
  );


let historyRecords = [];



/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadHistory();

  }
);



/* =========================================================
   LOAD HISTORY
========================================================= */

async function loadHistory() {

  try {

    const response = await fetch(
      `${API_BASE}/api/pre-voting/history`
    );


    if (!response.ok) {

      throw new Error(
        "Unable to load pre-voting history."
      );

    }


    const submissions =
      await response.json();


    historyRecords = submissions;


    updateSummary(submissions);

    renderHistory(submissions);

  }

  catch (error) {

    console.error(
      "History error:",
      error
    );


    historyTableBody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="history-empty"
        >
          Unable to load
          pre-voting history.
        </td>
      </tr>
    `;

  }

}



/* =========================================================
   SUMMARY
========================================================= */

function updateSummary(submissions) {

  const total =
    document.getElementById(
      "totalSubmissions"
    );


  if (total) {

    total.textContent =
      submissions.length;

  }

}



/* =========================================================
   RENDER HISTORY TABLE
========================================================= */

function renderHistory(submissions) {

  if (!submissions.length) {

    historyTableBody.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="history-empty"
        >
          No pre-voting submissions found.
        </td>
      </tr>
    `;

    return;

  }


  historyTableBody.innerHTML =
    submissions
      .map(submission => {

        return `

          <tr>

            <td>

              <div class="history-company">

                ${escapeHtml(
                  submission.company_name
                  || "-"
                )}

              </div>

            </td>


            <td>

              <div
                class="history-meeting-description"
              >

                ${escapeHtml(
                  submission.meeting_description
                  || submission.meeting_type
                  || "-"
                )}

              </div>

            </td>


            <td>

              ${escapeHtml(
                submission.meeting_date
                || "-"
              )}

            </td>


            <td>

              ${formatCreatedDate(
                submission.created_at
              )}

            </td>


            <td class="history-action-cell">

              <button
                type="button"
                class="history-view-btn"
                data-id="${submission.id}"
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



/* =========================================================
   VIEW BUTTON EVENTS
========================================================= */

function attachViewEvents() {

  const buttons =
    document.querySelectorAll(
      ".history-view-btn"
    );


  buttons.forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const submissionId =
          button.dataset.id;


        openSubmission(
          submissionId
        );

      }
    );

  });

}



/* =========================================================
   OPEN SUBMISSION
========================================================= */

async function openSubmission(id) {

  try {

    const response = await fetch(
      `${API_BASE}/api/pre-voting/history/${id}`
    );


    if (!response.ok) {

      throw new Error(
        "Unable to load submission."
      );

    }


    const submission =
      await response.json();


    renderSubmission(
      submission
    );


    historyView.hidden = true;

    historyDetail.hidden = false;


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }

  catch (error) {

    console.error(
      "Submission error:",
      error
    );


    alert(
      "Unable to open this pre-voting record."
    );

  }

}



/* =========================================================
   RENDER SUBMISSION DETAILS
========================================================= */

function renderSubmission(data) {

  setText(
    "detailCompany",
    data.company_name
  );


  setText(
    "detailDescription",
    data.meeting_description
  );


  setText(
    "detailType",
    data.meeting_type
  );


  setText(
    "detailDate",
    data.meeting_date
  );


  setText(
    "detailTime",
    data.meeting_time
  );


  setText(
    "detailVenue",
    data.meeting_venue
  );


  setText(
    "detailOverall",
    data.overall_remarks
  );


  renderVotes(
    data.votes || []
  );

}



/* =========================================================
   RENDER VOTES
========================================================= */

function renderVotes(votes) {

  const voteBody =
    document.getElementById(
      "detailVotes"
    );


  if (!votes.length) {

    voteBody.innerHTML = `

      <tr>

        <td
          colspan="4"
          class="history-empty"
        >
          No voting decisions found.
        </td>

      </tr>

    `;

    return;

  }


  voteBody.innerHTML =
    votes
      .map(vote => {

        const voteValue =
          String(
            vote.vote || ""
          ).toLowerCase();


        return `

          <tr>

            <!-- RESOLUTION NUMBER -->

            <td class="history-resolution-number">

              <span>
                Ordinary
              </span>

              <span>
                Resolution ${escapeHtml(
                  vote.number
                )}
              </span>

            </td>


            <!-- RESOLUTION DESCRIPTION -->

            <td class="history-resolution-description">

              ${escapeHtml(
                vote.description
                || "-"
              )}

            </td>


            <!-- VOTE -->

            <td class="history-vote-cell">

              <span
                class="
                  history-vote
                  history-vote-${voteValue}
                "
              >

                ${escapeHtml(
                  voteValue.toUpperCase()
                  || "-"
                )}

              </span>

            </td>


            <!-- REMARKS -->

            <td class="history-remarks-cell">

              ${escapeHtml(
                vote.remarks
                || "-"
              )}

            </td>

          </tr>

        `;

      })
      .join("");

}



/* =========================================================
   SEARCH HISTORY
========================================================= */

const historySearch =
  document.getElementById(
    "historySearch"
  );


if (historySearch) {

  historySearch.addEventListener(
    "input",
    () => {

      const searchValue =
        historySearch
          .value
          .trim()
          .toLowerCase();


      const filtered =
        historyRecords.filter(
          submission => {

            const company =
              String(
                submission.company_name
                || ""
              ).toLowerCase();


            const meeting =
              String(
                submission.meeting_description
                || ""
              ).toLowerCase();


            const meetingType =
              String(
                submission.meeting_type
                || ""
              ).toLowerCase();


            return (
              company.includes(searchValue)
              ||
              meeting.includes(searchValue)
              ||
              meetingType.includes(searchValue)
            );

          }
        );


      renderHistory(filtered);

    }
  );

}



/* =========================================================
   BACK TO HISTORY
========================================================= */

const backBtn =
  document.getElementById(
    "backBtn"
  );


if (backBtn) {

  backBtn.addEventListener(
    "click",
    () => {

      historyDetail.hidden = true;

      historyView.hidden = false;


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );

}



/* =========================================================
   PRINT / PDF
========================================================= */

const printHistoryBtn =
  document.getElementById(
    "printHistoryBtn"
  );


if (printHistoryBtn) {

  printHistoryBtn.addEventListener(
    "click",
    () => {

      window.print();

    }
  );

}



/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value) {

  const element =
    document.getElementById(id);


  if (!element) {
    return;
  }


  element.textContent =
    value || "—";

}



/* =========================================================
   FORMAT SUBMITTED DATE
========================================================= */

function formatCreatedDate(value) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return escapeHtml(value);

  }


  return date.toLocaleString(
    "en-MY",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

}



/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}
"use strict";

let currentMeeting = null;


/*
=========================================================
DERIVE USER-FRIENDLY MEETING TYPE

Example Bursa description:

"Notice of 112th Annual General Meeting of
Company XYZ Berhad"

becomes:

"112th Annual General Meeting"
=========================================================
*/

console.log("prevoting.js loaded");

function deriveMeetingType(
  description,
  rawType
) {

  if (!description) {
    return rawType || "—";
  }


  /*
    Example:
    112th Annual General Meeting
  */
  const numberedAgm =
    description.match(
      /(\d+(?:st|nd|rd|th)\s+Annual General Meeting)/i
    );


  if (numberedAgm) {
    return numberedAgm[1];
  }


  /*
    AGM without number
  */
  if (
    /Annual General Meeting/i
      .test(description)
  ) {

    return "Annual General Meeting";

  }


  /*
    EGM
  */
  if (
    /Extraordinary General Meeting/i
      .test(description)
  ) {

    return "Extraordinary General Meeting";

  }


  /*
    Special General Meeting
  */
  if (
    /Special General Meeting/i
      .test(description)
  ) {

    return "Special General Meeting";

  }


  return rawType || description;

}



/*
=========================================================
ESCAPE HTML

Bursa descriptions are external data.

We escape them before inserting them with innerHTML.
=========================================================
*/

function escapeHtml(value) {

  return String(value ?? "")

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}



/*
=========================================================
RENDER MEETING INFORMATION
=========================================================
*/

function renderMeeting(data) {

  const fields = {
    companyName:
      data.company_name,

    meetingDisplayType:
      deriveMeetingType(
        data.meeting_description,
        data.meeting_type
      ),

    meetingDate:
      data.meeting_date,

    meetingTime:
      data.meeting_time,

    meetingVenue:
      data.meeting_venue
  };


  Object.entries(fields).forEach(
    ([id, value]) => {

      const element =
        document.getElementById(id);

      if (!element) {
        return;
      }


      element.textContent =
        value || "Not available";


      element.classList.remove(
        "empty-value"
      );

    }
  );
}


/*
=========================================================
RENDER RESOLUTIONS
=========================================================
*/

function renderResolutions(
  resolutions = []
) {

  const body =
    document.getElementById(
      "resolutionBody"
    );


  const count =
    document.getElementById(
      "resolutionCount"
    );



  /*
  ---------------------------------------------------------
  RESOLUTION COUNTER
  ---------------------------------------------------------
  */

  count.textContent =
    `${resolutions.length} ${
      resolutions.length === 1
        ? "RESOLUTION"
        : "RESOLUTIONS"
    }`;



  /*
  ---------------------------------------------------------
  EMPTY STATE
  ---------------------------------------------------------
  */

  if (!resolutions.length) {

    body.innerHTML = `

      <tr class="empty-row">

        <td colspan="6">

          <div class="empty-state">

            <div class="empty-state-title">
              No Ordinary Resolutions found
            </div>

            <div class="empty-state-text">
              This announcement did not contain
              any Ordinary Resolution records.
            </div>

          </div>

        </td>

      </tr>

    `;


    return;

  }



  /*
  ---------------------------------------------------------
  CREATE RESOLUTION ROWS
  ---------------------------------------------------------
  */

  body.innerHTML =
    resolutions

      .map(
        (
          resolution,
          index
        ) => {

          const number =
            resolution.number ??
            index + 1;


          return `

            <tr
              data-resolution="${number}"
            >


              <!-- NUMBER -->
              <td
                class="resolution-number"
              >

                ${escapeHtml(number)}

              </td>



              <!-- RESOLUTION -->
              <td
                class="resolution-description"
              >

                <div
                  class="resolution-title"
                >
                  Ordinary Resolution
                  ${escapeHtml(number)}
                </div>


                <div
                  class="resolution-text"
                >
                  ${
                    escapeHtml(
                      resolution.description
                    )
                  }
                </div>


                ${
                  resolution.shareholder_action

                    ? `

                      <div
                        class="shareholder-action"
                      >

                        ${
                          escapeHtml(
                            resolution
                              .shareholder_action
                          )
                        }

                      </div>

                    `

                    : ""
                }

              </td>



              <!-- FOR -->
              <td class="vote-cell">

                <input
                  type="radio"
                  name="vote_${index}"
                  value="for"
                  data-index="${index}"
                  aria-label="
                    Vote For Resolution ${number}
                  "
                >

              </td>



              <!-- AGAINST -->
              <td class="vote-cell">

                <input
                  type="radio"
                  name="vote_${index}"
                  value="against"
                  data-index="${index}"
                  aria-label="
                    Vote Against Resolution ${number}
                  "
                >

              </td>



              <!-- ABSTAIN -->
              <td class="vote-cell">

                <input
                  type="radio"
                  name="vote_${index}"
                  value="abstain"
                  data-index="${index}"
                  aria-label="
                    Abstain Resolution ${number}
                  "
                >

              </td>



              <!-- REMARKS -->
              <td class="remarks-cell">

                <div
                  class="remarks-wrapper"
                  data-remarks-index="${index}"
                  hidden
                >

                  <div class="remarks-label">
                    Remarks <span class="required-mark">*</span>
                  </div>

                  <textarea
                    class="resolution-remarks"
                    data-index="${index}"
                    placeholder="Please provide a reason..."
                    disabled
                  ></textarea>

                  <div
                    class="remarks-error"
                    data-error-index="${index}"
                  ></div>

                </div>

              </td>

            </tr>

          `;

        }
      )

      .join("");



  attachVoteEvents();

}



/*
=========================================================
VOTE BEHAVIOUR

For:
  Remarks disabled

Against:
  Remarks required

Abstain:
  Remarks required
=========================================================
*/

function attachVoteEvents() {

  const radios =
    document.querySelectorAll(
      'input[type="radio"][data-index]'
    );

  radios.forEach(radio => {

    radio.addEventListener(
      "change",
      function () {

        const index =
          this.dataset.index;

        const remarksWrapper =
          document.querySelector(
            `[data-remarks-index="${index}"]`
          );

        const remarks =
          document.querySelector(
            `.resolution-remarks[data-index="${index}"]`
          );

        const error =
          document.querySelector(
            `[data-error-index="${index}"]`
          );


        // AGAINST
        if (this.value === "against") {

          remarksWrapper.hidden = false;

          remarks.disabled = false;
          remarks.required = true;

          remarks.placeholder =
            "Please provide a reason for voting Against.";

          error.textContent = "";

          remarks.focus();
        }


        // ABSTAIN
        else if (this.value === "abstain") {

          remarksWrapper.hidden = false;

          remarks.disabled = false;
          remarks.required = true;

          remarks.placeholder =
            "Please provide a reason for Abstaining.";

          error.textContent = "";

          remarks.focus();
        }


        // FOR
        else {

          remarksWrapper.hidden = true;

          remarks.disabled = true;
          remarks.required = false;

          remarks.value = "";

          error.textContent = "";
        }

      }
    );

  });

}


/*
=========================================================
VALIDATE BURSA URL
=========================================================
*/

function isValidBursaUrl(url) {

  try {

    const parsed =
      new URL(url);


    return (
      parsed.protocol === "https:" &&
      (
        parsed.hostname ===
          "www.bursamalaysia.com" ||

        parsed.hostname.endsWith(
          ".bursamalaysia.com"
        )
      )
    );

  }

  catch {

    return false;

  }

}



/*
=========================================================
RETRIEVE BURSA ANNOUNCEMENT NOTICE
=========================================================
*/

async function retrieveAnnouncement() {

  const input =
    document.getElementById("bursaUrl");

  const button =
    document.getElementById("retrieveBtn");

  const status =
    document.getElementById("statusMessage");

  const url =
    input.value.trim();


  if (!url) {

    status.textContent =
      "Please enter a Bursa Malaysia URL.";

    status.className =
      "status-message error";

    return;
  }


  button.disabled = true;

  button.textContent =
    "Retrieving...";

  status.textContent =
    "Retrieving Bursa announcement...";

  status.className =
    "status-message";


  try {

    const response = await fetch(
      "http://127.0.0.1:8000/api/pre-voting/extract",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          url: url
        })
      }
    );


    if (!response.ok) {

      const errorData =
        await response.json();

      throw new Error(
        errorData.detail ||
        "Unable to retrieve announcement."
      );
    }


    const data =
      await response.json();


    currentMeeting = data;


    renderMeeting(
      data
    );


    renderResolutions(
      data.resolutions || []
    );


    status.textContent =
      "Meeting information retrieved successfully.";

    status.className =
      "status-message success";

  }

  catch (error) {

    console.error(
      error
    );


    status.textContent =
      error.message;

    status.className =
      "status-message error";

  }

  finally {

    button.disabled = false;

    button.textContent =
      "Retrieve";

  }
}


/*
=========================================================
CLEAR FORM
=========================================================
*/

function clearForm() {

  currentMeeting =
    null;



  /*
  ---------------------------------------------------------
  CLEAR URL
  ---------------------------------------------------------
  */

  document
    .getElementById(
      "bursaUrl"
    )
    .value =
      "";



  /*
  ---------------------------------------------------------
  CLEAR OVERALL REMARKS
  ---------------------------------------------------------
  */

  document
    .getElementById(
      "overallRemarks"
    )
    .value =
      "";



  /*
  ---------------------------------------------------------
  RESET MEETING INFORMATION
  ---------------------------------------------------------
  */

  const fields = [

    "companyName",

    "meetingDisplayType",

    "meetingDate",

    "meetingTime",

    "meetingVenue",

  ];


  fields.forEach(id => {

    const element =
      document.getElementById(id);

    if (element) {
      element.textContent = "";
    }

  });


  /*
  ---------------------------------------------------------
  RESET RESOLUTION TABLE
  ---------------------------------------------------------
  */

  renderResolutions(
    []
  );



  /*
  ---------------------------------------------------------
  CLEAR STATUS
  ---------------------------------------------------------
  */

  const status =
    document.getElementById(
      "statusMessage"
    );


  status.textContent =
    "";


  status.className =
    "status-message";

}



/*
=========================================================
COLLECT VOTES
=========================================================
*/

function collectVotes() {

  /*
  ---------------------------------------------------------
  REQUIRE A MEETING
  ---------------------------------------------------------
  */

  if (!currentMeeting) {

    alert(
      "Please retrieve a Bursa meeting first."
    );

    return null;

  }



  let valid =
    true;


  const votes =
    currentMeeting
      .resolutions
      .map(
        (
          resolution,
          index
        ) => {


          const selected =
            document.querySelector(
              `input[name="vote_${index}"]:checked`
            );


          const remarks =
            document.querySelector(
              `.resolution-remarks[data-index="${index}"]`
            );


          const error =
            document.querySelector(
              `[data-error-index="${index}"]`
            );


          error.textContent =
            "";



          /*
          -----------------------------------------------
          NO VOTE SELECTED
          -----------------------------------------------
          */

          if (!selected) {

            valid =
              false;


            error.textContent =
              "Please select a vote.";


            return null;

          }



          /*
          -----------------------------------------------
          AGAINST / ABSTAIN REQUIRE REMARKS
          -----------------------------------------------
          */

          if (
            (
              selected.value ===
                "against" ||

              selected.value ===
                "abstain"
            )

            &&

            !remarks.value.trim()
          ) {

            valid =
              false;


            error.textContent =
              "Remarks are required.";

          }



          /*
          -----------------------------------------------
          VOTE OBJECT
          -----------------------------------------------
          */

          return {

            number:
              resolution.number,


            description:
              resolution.description,


            shareholder_action:
              resolution
                .shareholder_action,


            vote:
              selected.value,


            remarks:
              remarks.value.trim()

          };

        }
      );



  if (!valid) {

    return null;

  }



  /*
  ---------------------------------------------------------
  FINAL PRE-VOTING OBJECT
  ---------------------------------------------------------
  */

  return {

    company_name:
      currentMeeting.company_name,


    meeting_type:
      currentMeeting.meeting_type,


    meeting_description:
      currentMeeting.meeting_description,


    meeting_date:
      currentMeeting.meeting_date,


    meeting_time:
      currentMeeting.meeting_time,


    meeting_venue:
      currentMeeting.meeting_venue,


    record_of_depositors:
      currentMeeting.record_of_depositors,


    votes:
      votes,


    overall_remarks:
      document
        .getElementById(
          "overallRemarks"
        )
        .value
        .trim()

  };

}



/*
=========================================================
SAVE DRAFT
=========================================================
*/

function saveDraft() {

  const draft =
    collectVotes();


  if (!draft) {

    return;

  }


  console.log(
    "Pre-Voting Draft:",
    draft
  );


  /*
    Later this can call:

    POST /api/pre-voting/draft
  */

  alert(
    "Draft is ready. Database saving will be connected later."
  );

}



/*
=========================================================
SUBMIT VOTES
=========================================================
*/

function submitVotes() {

  const result =
    collectVotes();


  if (!result) {

    return;

  }


  console.log(
    "Pre-Voting Submission:",
    result
  );


  /*
    Later this can call:

    POST /api/pre-voting/submit
  */

  alert(
    "Votes validated successfully. Submission API will be connected later."
  );

}


document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log("DOM loaded");

    const retrieveBtn =
      document.getElementById("retrieveBtn");

    console.log(
      "Retrieve button:",
      retrieveBtn
    );

    if (retrieveBtn) {

      retrieveBtn.addEventListener(
        "click",
        () => {

          console.log(
            "Retrieve button clicked"
          );

          retrieveAnnouncement();

        }
      );

    } else {

      console.error(
        "retrieveBtn not found"
      );

    }


    /*
    -------------------------------------------------------
    ENTER KEY IN URL BAR
    -------------------------------------------------------
    */

    document
      .getElementById(
        "bursaUrl"
      )
      .addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            retrieveAnnouncement();

          }

        }
      );



    /*
    -------------------------------------------------------
    CLEAR
    -------------------------------------------------------
    */

    document
      .getElementById(
        "clearBtn"
      )
      .addEventListener(
        "click",
        clearForm
      );



    /*
    -------------------------------------------------------
    SAVE DRAFT
    -------------------------------------------------------
    */

    document
      .getElementById(
        "draftBtn"
      )
      .addEventListener(
        "click",
        saveDraft
      );



    /*
    -------------------------------------------------------
    SUBMIT
    -------------------------------------------------------
    */

    document
      .getElementById(
        "submitBtn"
      )
      .addEventListener(
        "click",
        submitVotes
      );


  }
);
/* Form rendering, navigation, field capture, and live scoring. */
function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function key(sectionId, question, index) { return `${sectionId}-${question.id || index}`; }
function questionsFor(section) { return section.questionsByMode?.[state.fields.mode] || section.questions || []; }
function getTotalQuestions() { return scoredSections.reduce((sum, section) => sum + questionsFor(section).length, 0); }

function renderNav() {
  document.getElementById("sectionNavList").innerHTML = sections.map((s, i) => {
    const questions = questionsFor(s);
    const complete = questions.length && questions.every((question, q) => state.answers[key(s.id, question, q)] !== undefined);
    return `<button class="section-btn ${i === state.current ? "active" : ""}" data-index="${i}"><span class="section-letter">${s.letter}</span><span>${s.short}</span><span class="section-check">${complete ? "✓" : ""}</span></button>`;
  }).join("");
  document.getElementById("sectionNavCurrent").textContent = sections[state.current].short;
  document.querySelectorAll(".section-btn").forEach(btn => btn.addEventListener("click", () => { captureFields(); state.current = Number(btn.dataset.index); render(); }));
}

function detailsTemplate() {
  const f = state.fields;
  return `<div class="meeting-grid">
    ${field("company", "Company name", f.company, "text", true)}
    ${field("fye", "Financial year end", f.fye, "date", true)}
    ${selectField("type", "Type of meeting", ["AGM","EGM"], f.type)}
    ${field("date", "Date of meeting", f.date, "date", true)}
    ${field("time", "Start time", f.time, "time", true)}
    ${selectField("mode", "Mode of meeting", ["Physical","Virtual"], f.mode)}
    ${selectField("hybrid", "Is it a hybrid meeting?", ["No","Yes"], f.hybrid)}
    ${field("venue", "Meeting / broadcast venue", f.venue, "text", true, true)}
    ${field("notice", "Date of notice", f.notice, "date", true)}
    ${field("attendees", "Shareholders attended / viewers", f.attendees, "number", true)}
    ${field("ended", "Meeting ended at", f.ended, "time", false)}
    ${field("analyst", "Analyst / Assessor", f.analyst, "text", true)}
  </div><div class="mode-guidance" id="modeGuidance">${modeGuidanceText(f.mode)}</div>`;
}

function modeGuidanceText(mode) { return `${mode} meeting selected. Section B will show the ${mode.toLowerCase()} questionnaire.`; }

function field(id, label, value, type="text", required=false, full=false) { return `<div class="field ${full ? "full" : ""}"><label class="field-label" for="${id}">${label}${required ? ' <span class="required">*</span>' : ""}</label><input id="${id}" data-field="${id}" type="${type}" value="${esc(value)}" ${required ? "required" : ""}></div>`; }
function selectField(id, label, options, value) { return `<div class="field"><label class="field-label" for="${id}">${label} <span class="required">*</span></label><select id="${id}" data-field="${id}">${options.map(o => `<option ${o === value ? "selected" : ""}>${o}</option>`).join("")}</select></div>`; }

function textSectionTemplate(section) {
  const labels = { g: "Voting method and S.75 / S.76 resolution details", h: "Questions or comments raised by MSWG", i: "Corporate governance questions raised by shareholders", j: "Overall remarks, non-compliance and important observations" };
  const ids = { g: "voting", h: "mswg", i: "governance", j: "remarks" };
  const id = ids[section.id];
  return `<div class="field"><label class="field-label" for="${id}">${labels[section.id]}</label><textarea id="${id}" data-field="${id}" placeholder="Enter details here...">${esc(state.fields[id] || "")}</textarea></div>`;
}

function questionsTemplate(section, questions) {
  return questions.map((q, i) => {
    const k = key(section.id, q, i), selected = state.answers[k] ?? "";
    const requiresComment = selected === "N" || (q.type === "points" && selected === "0");
    const choices = q.type === "points"
      ? `<div class="point-choices">${q.options.map(option => pointChoice(k, option, selected)).join("")}</div>`
      : `<div class="choices">${choice(k,"Y",selected)}${choice(k,"N",selected)}${q.na ? choice(k,"NA",selected) : ""}</div>`;
    return `<div class="question ${q.type === "points" ? "point-question" : ""} ${requiresComment ? "has-no" : ""}" data-question="${k}"><div class="question-main"><div class="q-number">${i+1}</div><div class="q-text">${q.text}${q.note ? `<span class="q-note">${q.note}</span>` : ""}</div>${choices}</div><div class="question-comment"><label class="field-label" for="comment-${k}">${q.commentLabel || "Reason / comment for No"}</label><textarea id="comment-${k}" data-comment="${k}" placeholder="Explain the observation...">${esc(state.comments[k] || "")}</textarea></div></div>`;
  }).join("") + `<div class="field" style="margin-top:18px"><label class="field-label" for="sectionComment">Section comments</label><textarea id="sectionComment" data-field="comment_${section.id}" placeholder="Record complaints, supporting details or observations...">${esc(state.fields[`comment_${section.id}`] || "")}</textarea></div>`;
}

function choice(k, value, selected) { return `<label class="choice"><input type="radio" name="${k}" value="${value}" ${selected === value ? "checked" : ""}><span>${value}</span></label>`; }
function pointChoice(k, option, selected) { return `<label class="choice point-choice"><input type="radio" name="${k}" value="${option.value}" data-requires-comment="${option.requiresComment ? "true" : "false"}" ${selected === option.value ? "checked" : ""}><span><em>${option.label}</em><b>${option.points} ${option.points === 1 ? "point" : "points"}</b></span></label>`; }

function renderForm() {
  const section = sections[state.current];
  const questions = questionsFor(section);
  document.getElementById("sectionTitle").textContent = section.title;
  document.getElementById("sectionDescription").textContent = section.questionsByMode ? `${section.description} Showing ${state.fields.mode.toLowerCase()} meeting questions.` : section.description;
  document.getElementById("sectionCount").textContent = questions.length ? `${questions.length} ${section.questionsByMode ? state.fields.mode.toUpperCase() + " " : ""}QUESTIONS` : (section.id === "details" ? "DETAILS" : "NOTES");
  document.getElementById("formBody").innerHTML = section.id === "details" ? detailsTemplate() : (questions.length ? questionsTemplate(section, questions) : textSectionTemplate(section));
  const previousButton = document.getElementById("previousBtn");
  previousButton.hidden = state.current === 0;
  previousButton.disabled = state.current === 0;
  document.getElementById("nextBtn").textContent = state.current === sections.length - 1 ? "Submit for review" : "Next section";
  const modeSelect = document.getElementById("mode");
  if (modeSelect) modeSelect.addEventListener("change", e => {
    state.fields.mode = e.target.value;
    document.getElementById("modeGuidance").textContent = modeGuidanceText(e.target.value);
    updateScores();
    renderNav();
  });
  document.querySelectorAll('input[type="radio"]').forEach(input => input.addEventListener("change", e => {
    state.answers[e.target.name] = e.target.value;
    const question = e.target.closest(".question");
    question.classList.toggle("has-no", e.target.value === "N" || e.target.dataset.requiresComment === "true");
    updateScores(); renderNav();
  }));
}

function captureFields() {
  document.querySelectorAll("[data-field]").forEach(el => state.fields[el.dataset.field] = el.value);
  document.querySelectorAll("[data-comment]").forEach(el => state.comments[el.dataset.comment] = el.value);
}

function sectionStats(section) {
  const questions = questionsFor(section);
  let yes = 0, no = 0, na = 0, answered = 0, applicable = 0, earned = 0, possible = 0;
  questions.forEach((question, index) => {
    const value = state.answers[key(section.id, question, index)];
    if (value === undefined || value === "") return;
    answered++;
    if (value === "NA") { na++; return; }
    applicable++;
    if (question.type === "points") {
      earned += Number(value);
      possible += question.maxPoints;
      return;
    }
    possible++;
    if (value === "Y") { yes++; earned++; }
    if (value === "N") no++;
  });
  return { yes, no, na, answered, applicable, earned, possible, score: possible ? Math.round(earned / possible * 100) : null };
}

function updateScores() {
  const all = scoredSections.map(sectionStats);
  const earned = all.reduce((n,s) => n+s.earned,0), possible = all.reduce((n,s) => n+s.possible,0), na = all.reduce((n,s) => n+s.na,0), answered = all.reduce((n,s) => n+s.answered,0), applicable = all.reduce((n,s) => n+s.applicable,0);
  const score = possible ? Math.round(earned/possible*100) : null;
  const totalQuestions = getTotalQuestions();
  const display = score === null ? "—" : `${score}%`;
  document.getElementById("summaryScore").textContent = display;
  document.getElementById("liveScore").textContent = score === null ? "—" : score;
  document.getElementById("scoreSuffix").textContent = score === null ? "" : "%";
  document.getElementById("answeredCount").textContent = answered;
  document.getElementById("totalCount").textContent = totalQuestions;
  document.getElementById("applicableCount").textContent = applicable;
  document.getElementById("naCount").textContent = na;
  document.getElementById("progressFill").style.width = `${totalQuestions ? answered/totalQuestions*100 : 0}%`;
  document.getElementById("scoreBreakdown").innerHTML = scoredSections.map(s => { const x=sectionStats(s); return `<div class="score-row"><span>${s.letter}. ${s.short}</span><strong>${x.score === null ? "—" : x.score+"%"}</strong></div>`; }).join("");
}

function render() { renderNav(); renderForm(); updateScores(); }
function toast(message) { const el=document.getElementById("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(window.toastTimer); window.toastTimer=setTimeout(()=>el.classList.remove("show"),2200); }

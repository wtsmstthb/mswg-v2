"use strict";

const { HttpError } = require("./http");

const COMMON_QUESTIONS = Object.freeze([
  { key: "a-agm_timing", section: "a", type: "points", maxPoints: 3 },
  { key: "a-notice_28_days", section: "a" },
  { key: "c-chairman_chair", section: "c", na: true },
  { key: "c-chairman_board_intro", section: "c" },
  { key: "c-chairman_management_intro", section: "c" },
  { key: "c-chairman_auditor_intro", section: "c" },
  { key: "c-chairman_registered", section: "c" },
  { key: "c-chairman_voting", section: "c" },
  { key: "c-chairman_questions", section: "c" },
  { key: "c-chairman_answers", section: "c", na: true },
  { key: "c-chairman_order", section: "c" },
  { key: "c-chairman_reelection", section: "c", na: true },
  { key: "c-chairman_interest", section: "c", na: true },
  { key: "d-0", section: "d" },
  { key: "d-1", section: "d", na: true },
  { key: "d-2", section: "d", na: true },
  { key: "d-3", section: "d" },
  { key: "e-all_directors_present", section: "e" },
  { key: "f-0", section: "f", na: true },
  { key: "f-1", section: "f" },
  { key: "f-2", section: "f" }
]);

const MODE_QUESTIONS = Object.freeze({
  Physical: Object.freeze([
    { key: "b-physical_venue", section: "b" },
    { key: "b-physical_counters", section: "b" },
    { key: "b-physical_helpdesk", section: "b", na: true },
    { key: "b-physical_admin", section: "b" },
    { key: "b-physical_early_entry", section: "b" },
    { key: "b-physical_mingle", section: "b" }
  ]),
  Virtual: Object.freeze([
    { key: "b-virtual_guide", section: "b" },
    { key: "b-virtual_questions", section: "b", na: true }
  ])
});

function questionsFor(mode) {
  const modeQuestions = MODE_QUESTIONS[mode];
  if (!modeQuestions) throw new HttpError(400, "Meeting mode must be Physical or Virtual", "VALIDATION_ERROR");
  return [...COMMON_QUESTIONS.slice(0, 2), ...modeQuestions, ...COMMON_QUESTIONS.slice(2)];
}

function calculateScores(mode, answers = {}) {
  const questions = questionsFor(mode);
  const sections = {};
  for (const letter of ["a", "b", "c", "d", "e", "f"]) {
    sections[letter] = { earned: 0, possible: 0, answered: 0, applicable: 0, na: 0, score: null };
  }

  for (const question of questions) {
    const value = answers[question.key];
    if (value === undefined || value === "") continue;
    const section = sections[question.section];
    section.answered += 1;
    if (value === "NA") {
      if (!question.na) throw new HttpError(400, `${question.key} does not allow N/A`, "VALIDATION_ERROR");
      section.na += 1;
      continue;
    }
    section.applicable += 1;
    if (question.type === "points") {
      if (!new Set(["0", "1", "2", "3"]).has(String(value))) {
        throw new HttpError(400, `${question.key} has an invalid point value`, "VALIDATION_ERROR");
      }
      section.earned += Number(value);
      section.possible += question.maxPoints;
    } else {
      if (value !== "Y" && value !== "N") {
        throw new HttpError(400, `${question.key} must be Y, N or an allowed N/A`, "VALIDATION_ERROR");
      }
      section.possible += 1;
      if (value === "Y") section.earned += 1;
    }
  }

  for (const section of Object.values(sections)) {
    section.score = section.possible ? Math.round(section.earned / section.possible * 100) : null;
  }
  const totals = Object.values(sections).reduce((sum, section) => ({
    earned: sum.earned + section.earned,
    possible: sum.possible + section.possible,
    answered: sum.answered + section.answered,
    applicable: sum.applicable + section.applicable,
    na: sum.na + section.na
  }), { earned: 0, possible: 0, answered: 0, applicable: 0, na: 0 });

  return {
    sections,
    ...totals,
    total_questions: questions.length,
    percentage: totals.possible ? Math.round(totals.earned / totals.possible * 100) : null
  };
}

module.exports = { COMMON_QUESTIONS, MODE_QUESTIONS, calculateScores, questionsFor };

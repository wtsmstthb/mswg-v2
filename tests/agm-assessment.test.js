const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const agmDir = path.join(__dirname, "..", "Frontend", "agm-conduct");

function loadAssessment() {
  const context = vm.createContext({
    console,
    window: {},
    document: {
      getElementById: () => ({ textContent: "", style: {}, classList: { add() {}, remove() {}, toggle() {} } }),
      querySelectorAll: () => []
    }
  });
  vm.runInContext(fs.readFileSync(path.join(agmDir, "assessment-data.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(agmDir, "assessment-ui.js"), "utf8"), context);
  return expression => vm.runInContext(expression, context);
}

test("Section B switches between the physical and virtual questionnaires", () => {
  const evaluate = loadAssessment();
  const physical = evaluate('state.fields.mode="Physical"; questionsFor(sections.find(section => section.id === "b")).map(question => question.id)');
  const virtual = evaluate('state.fields.mode="Virtual"; questionsFor(sections.find(section => section.id === "b")).map(question => question.id)');

  assert.deepEqual([...physical], ["physical_venue", "physical_counters", "physical_helpdesk", "physical_admin", "physical_early_entry", "physical_mingle"]);
  assert.deepEqual([...virtual], ["virtual_guide", "virtual_questions"]);
});

test("Section A awards weighted timing points plus one notice point", () => {
  const evaluate = loadAssessment();
  const result = evaluate(`
    const sectionA = sections.find(section => section.id === "a");
    state.answers[key(sectionA.id, sectionA.questions[0], 0)] = "2";
    state.answers[key(sectionA.id, sectionA.questions[1], 1)] = "Y";
    sectionStats(sectionA);
  `);

  assert.equal(result.earned, 3);
  assert.equal(result.possible, 4);
  assert.equal(result.score, 75);
});

test("Chairman and Board attendance sections match the approved question counts", () => {
  const evaluate = loadAssessment();
  assert.equal(evaluate('sections.find(section => section.id === "c").questions.length'), 11);
  assert.equal(evaluate('sections.find(section => section.id === "e").questions.length'), 1);
});

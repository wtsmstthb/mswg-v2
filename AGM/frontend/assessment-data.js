/* Assessment structure and prototype data. */
const sections = [
  { id: "details", letter: "—", short: "Meeting details", title: "Meeting details", description: "Enter the company and meeting information.", questions: [] },
  { id: "a", letter: "A", short: "Timeliness", title: "Timeliness of AGM and notice", description: "Assess whether the meeting and notice were conducted within the expected timeframe.", questions: [
    { id: "agm_timing", type: "points", text: "After the company's financial year end (FYE), the AGM was held:", maxPoints: 3, commentLabel: "Reason the AGM was held after 6 months", options: [
      { value: "3", label: "Within 2 months", points: 3 },
      { value: "2", label: "Within 2 to 4 months", points: 2 },
      { value: "1", label: "Within 4 to 6 months", points: 1 },
      { value: "0", label: "After 6 months", points: 0, requiresComment: true }
    ]},
    { id: "notice_28_days", text: "Notice of AGM was sent at least 28 days before the meeting.", note: "Record the actual number of days in the section comments.", na: false }
  ]},
  { id: "b", letter: "B", short: "Venue & logistics", title: "Meeting venue, registration and logistics", description: "The questions shown here follow the meeting mode selected in Meeting details.", questionsByMode: {
    Physical: [
      { id: "physical_venue", text: "The meeting venue was within the vicinity of the company's registered or business address, or another venue with an acceptable reason.", na: false },
      { id: "physical_counters", text: "There were sufficient registration counters and registration was smooth.", na: false },
      { id: "physical_helpdesk", text: "A special helpdesk was provided.", note: "N/A may be selected when the expected crowd was small.", na: true },
      { id: "physical_admin", text: "Administrative information, including the opening time of registration counters, was provided before the meeting.", na: false },
      { id: "physical_early_entry", text: "Shareholders were allowed to enter the meeting room at least half an hour before the AGM started.", na: false },
      { id: "physical_mingle", text: "Directors mingled with shareholders at the AGM.", na: false }
    ],
    Virtual: [
      { id: "virtual_guide", text: "The administrative guide for registration, including its opening date and time, was clearly stated in the Notice of AGM.", note: "A link or reference provided in the Notice of Meeting is acceptable.", na: false },
      { id: "virtual_questions", text: "Shareholders' questions were displayed on screen for all participants during the meeting.", note: "N/A applies if no questions were raised.", na: true }
    ]
  }},
  { id: "c", letter: "C", short: "Chairman", title: "Assessment of Chairman", description: "Assess how the Chairman opened, managed and concluded the meeting.", questions: [
    { id: "chairman_chair", text: "The AGM was chaired by the Chairman of the company.", note: "N/A applies when no Chairman is appointed at Board level.", na: true },
    { id: "chairman_board_intro", text: "Board members were introduced.", na: false },
    { id: "chairman_management_intro", text: "Senior Management was introduced.", na: false },
    { id: "chairman_auditor_intro", text: "The external auditors were introduced.", na: false },
    { id: "chairman_registered", text: "The number and proportion of registered shareholders and proxies were announced.", na: false },
    { id: "chairman_voting", text: "The voting procedures were explained.", na: false },
    { id: "chairman_questions", text: "Shareholders were given adequate opportunities and time to ask questions.", na: false },
    { id: "chairman_answers", text: "The Board sufficiently answered all relevant questions.", note: "N/A applies if no questions were raised.", na: true },
    { id: "chairman_order", text: "The Chairman managed the time and meeting in an orderly manner to the satisfaction of shareholders.", na: false },
    { id: "chairman_reelection", text: "The Chairman did not propose their own re-election or re-appointment.", note: "N/A applies when no such resolution was tabled.", na: true },
    { id: "chairman_interest", text: "The Chairman did not propose any resolution in which they had an interest.", note: "N/A applies when no resolution of interest to the Chairman was tabled.", na: true }
  ]},
  { id: "d", letter: "D", short: "Q&A", title: "Overall assessment of Question and Answer", description: "Assess the presentation, responses and facilities supporting the Q&A session.", questions: [
    { text: "A multimedia presentation on annual business performance was provided.", na: false },
    { text: "Responses to MSWG or other written questions were provided.", na: true },
    { text: "Written responses to MSWG questions were available at least one day before the meeting.", na: true },
    { text: "The audio equipment was in good working condition.", na: false }
  ]},
  { id: "e", letter: "E", short: "Board attendance", title: "Board attendance", description: "Record Board participation and explanations for any absence.", questions: [
    { id: "all_directors_present", text: "All directors were present.", na: false }
  ]},
  { id: "f", letter: "F", short: "Poll voting", title: "Poll voting", description: "Assess the voting process and disclosure of voting outcomes.", questions: [
    { text: "Two-tier voting was conducted for independent directors who served more than nine years, where applicable.", na: true },
    { text: "Voting results disclosed the number and percentage of shares voted for and against each resolution.", na: false },
    { text: "The independent scrutineer for poll voting was disclosed.", na: false }
  ]},
  { id: "g", letter: "G", short: "Additional info", title: "Additional information", description: "Record resolutions and the voting method used.", questions: [] },
  { id: "h", letter: "H", short: "MSWG questions", title: "Questions raised by MSWG", description: "Record questions and comments raised by the MSWG representative.", questions: [] },
  { id: "i", letter: "I", short: "Governance", title: "Corporate governance questions", description: "Record governance questions or comments raised by shareholders.", questions: [] },
  { id: "j", letter: "J", short: "Remarks", title: "Overall remarks and observations", description: "Record exceptional matters, regulatory non-compliance or other important observations.", questions: [] }
];

const state = {
  current: 0,
  assessmentId: null,
  recordVersion: null,
  revision: 1,
  status: "DRAFT",
  permissions: { can_edit: true, can_submit: true, can_review: false, can_reopen: false },
  answers: {},
  comments: {},
  fields: {
    company: "",
    fye: "",
    type: "AGM",
    date: "",
    time: "",
    mode: "Physical",
    hybrid: "No",
    venue: "",
    notice: "",
    attendees: "",
    ended: "",
    analyst: "",
    voting: "",
    mswg: "",
    governance: "",
    remarks: ""
  }
};

const scoredSections = sections.filter(section => section.questions?.length || section.questionsByMode);

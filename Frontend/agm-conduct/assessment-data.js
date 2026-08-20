/* Assessment structure and prototype data. */
const sections = [
  { id: "details", letter: "—", short: "Meeting details", title: "Meeting details", description: "Enter the company and meeting information.", questions: [] },
  { id: "a", letter: "A", short: "Timeliness", title: "Timeliness of AGM and notice", description: "Assess whether the meeting and notice were conducted within the expected timeframe.", questions: [
    { text: "The AGM was held within six months after the company's financial year end.", na: false },
    { text: "Notice of AGM was sent at least 28 days before the meeting.", note: "Record the actual number of days in the comments when necessary.", na: false }
  ]},
  { id: "b", letter: "B", short: "Venue & logistics", title: "Meeting venue, registration and logistics", description: "Assess accessibility, registration arrangements and meeting logistics.", questions: [
    { text: "The meeting venue was within the vicinity of the registered or business address, or another acceptable venue.", na: false },
    { text: "The registration process was smooth and had sufficient arrangements.", na: true },
    { text: "Administrative information for registration was provided before the meeting.", na: false },
    { text: "Shareholders' questions were displayed for participants during a virtual meeting.", note: "N/A if the meeting was physical or no questions were raised.", na: true }
  ]},
  { id: "c", letter: "C", short: "Chairman", title: "Assessment of Chairman", description: "Assess how the Chairman opened, managed and concluded the meeting.", questions: [
    { text: "The AGM was chaired by the Chairman of the company.", na: true },
    { text: "Board members, senior management and external auditors were introduced.", na: false },
    { text: "The voting procedures were clearly explained.", na: false },
    { text: "Shareholders were given adequate opportunity and time to ask questions.", na: false },
    { text: "The Board sufficiently answered all relevant questions.", na: true },
    { text: "The Chairman managed the time and meeting in an orderly manner.", na: false },
    { text: "The Chairman did not propose a resolution in which they had an interest.", na: true }
  ]},
  { id: "d", letter: "D", short: "Q&A", title: "Overall assessment of Question and Answer", description: "Assess the presentation, responses and facilities supporting the Q&A session.", questions: [
    { text: "A multimedia presentation on annual business performance was provided.", na: false },
    { text: "Responses to MSWG or other written questions were provided.", na: true },
    { text: "Written responses to MSWG questions were available at least one day before the meeting.", na: true },
    { text: "The audio equipment was in good working condition.", na: false }
  ]},
  { id: "e", letter: "E", short: "Board attendance", title: "Board attendance", description: "Record Board participation and explanations for any absence.", questions: [
    { text: "All directors were present at the meeting.", na: false },
    { text: "Any director's absence was supported by an acceptable explanation from the Chairman.", na: true }
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

const state = { current: 0, status: "Draft", answers: {}, comments: {}, fields: { company: "Seri Maju Berhad", fye: "2025-12-31", type: "AGM", date: "2026-05-21", time: "10:00", mode: "Virtual", venue: "Broadcast from Kuala Lumpur", notice: "2026-04-17", attendees: "184", ended: "12:15", analyst: "Nur Amirah Amirudin", voting: "Virtual poll", remarks: "The meeting proceeded in an orderly manner. Shareholder questions were addressed during the Q&A session." } };

const scoredSections = sections.filter(s => s.questions.length);
const totalQuestions = scoredSections.reduce((sum, s) => sum + s.questions.length, 0);
document.getElementById("totalCount").textContent = totalQuestions;

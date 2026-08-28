/* PDF preview population and report-only behavior. */
function showReport() {
  captureFields();
  document.getElementById("appView").style.display="none";
  document.getElementById("reportView").style.display="block";
  const all = scoredSections.map(sectionStats), earned=all.reduce((n,s)=>n+s.earned,0), possible=all.reduce((n,s)=>n+s.possible,0);
  const score = possible ? Math.round(earned/possible*100)+"%" : "—";
  document.getElementById("reportCompany").textContent=state.fields.company || "Company name";
  document.getElementById("reportScore").textContent=score;
  document.getElementById("reportDate").textContent=state.fields.date || "—";
  document.getElementById("reportType").textContent=state.fields.type || "—";
  document.getElementById("reportMode").textContent=state.fields.mode || "—";
  document.getElementById("reportStatus").textContent=formatAssessmentStatus(state.status);
  document.getElementById("reportBreakdown").innerHTML=scoredSections.map((s,i)=>{const x=all[i];return `<tr><td>${s.letter}. ${s.title}</td><td>${x.earned}</td><td>${x.possible}</td><td>${x.na}</td><td><strong>${x.score===null?"—":x.score+"%"}</strong></td></tr>`}).join("");
  const details = [["Financial year end",state.fields.fye],["Hybrid meeting",state.fields.hybrid],["Venue",state.fields.venue],["Attendees / viewers",state.fields.attendees],["Analyst / Assessor",state.fields.analyst],["Voting information",state.fields.voting]];
  document.getElementById("reportDetails").innerHTML=details.map(d=>`<tr><td style="color:var(--muted);width:30%">${d[0]}</td><td style="text-align:left">${esc(d[1]||"—")}</td></tr>`).join("");
  document.getElementById("reportRemarks").textContent=state.fields.remarks || "No remarks entered.";
  const prepared = document.getElementById("reportPreparedBy");
  const approved = document.getElementById("reportApprovedBy");
  const approvalDate = document.getElementById("reportApprovalDate");
  if (prepared) prepared.textContent = state.createdByName || state.fields.analyst || "—";
  if (approved) approved.textContent = state.approvedByName || "Pending approval";
  if (approvalDate) approvalDate.textContent = state.approvedAt ? new Date(state.approvedAt).toLocaleDateString("en-MY") : "—";
  window.scrollTo(0,0);
}

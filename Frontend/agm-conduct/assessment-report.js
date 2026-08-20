/* PDF preview population and report-only behavior. */
function showReport() {
  captureFields();
  document.getElementById("appView").style.display="none";
  document.getElementById("reportView").style.display="block";
  const all = scoredSections.map(sectionStats), yes=all.reduce((n,s)=>n+s.yes,0), no=all.reduce((n,s)=>n+s.no,0);
  const score = yes+no ? Math.round(yes/(yes+no)*100)+"%" : "—";
  document.getElementById("reportCompany").textContent=state.fields.company || "Company name";
  document.getElementById("reportScore").textContent=score;
  document.getElementById("reportDate").textContent=state.fields.date || "—";
  document.getElementById("reportType").textContent=state.fields.type || "—";
  document.getElementById("reportMode").textContent=state.fields.mode || "—";
  document.getElementById("reportStatus").textContent=state.status;
  document.getElementById("reportBreakdown").innerHTML=scoredSections.map((s,i)=>{const x=all[i];return `<tr><td>${s.letter}. ${s.title}</td><td>${x.yes}</td><td>${x.no}</td><td>${x.na}</td><td><strong>${x.score===null?"—":x.score+"%"}</strong></td></tr>`}).join("");
  const details = [["Financial year end",state.fields.fye],["Venue",state.fields.venue],["Attendees / viewers",state.fields.attendees],["Analyst / Assessor",state.fields.analyst],["Voting information",state.fields.voting]];
  document.getElementById("reportDetails").innerHTML=details.map(d=>`<tr><td style="color:var(--muted);width:30%">${d[0]}</td><td style="text-align:left">${esc(d[1]||"—")}</td></tr>`).join("");
  document.getElementById("reportRemarks").textContent=state.fields.remarks || "No remarks entered.";
  window.scrollTo(0,0);
}

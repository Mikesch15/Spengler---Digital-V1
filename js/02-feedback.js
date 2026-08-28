"use strict";
// Die Modul-Auswahl im Feedback-Formular wird aus der App selbst
// zusammengestellt. Neue Massaufnahme- oder Ausmass-Arten tauchen dadurch
// automatisch auf – es genügt, den Knopf im Auswahlfenster anzulegen.
const FEEDBACK_MODULE_FEST=["Allgemein","Regierapport","Projekte","Einstellungen","Sonstiges"];

function feedbackModulListe(){
 const liste=["Allgemein","Regierapport"];
 const auslesen=(auswahl,praefix)=>{
  document.querySelectorAll(auswahl).forEach(btn=>{
   const spans=btn.querySelectorAll("span");
   const text=(spans.length?spans[spans.length-1].textContent:btn.textContent).trim();
   if(text)liste.push(praefix+" – "+text);
  });
 };
 auslesen("[data-choose-meas-type]","Massaufnahme");
 auslesen("[data-choose-am-type]","Ausmass");
 liste.push("Projekte","Einstellungen","Rechte / Mitarbeiter","Sonstiges");
 // Falls die Auswahlfenster einmal fehlen sollten, bleibt wenigstens das Feste übrig.
 return [...new Set(liste.length>2?liste:FEEDBACK_MODULE_FEST)];
}

function fuelleFeedbackModule(){
 const sel=$("feedbackModul");
 if(!sel)return;
 sel.innerHTML=feedbackModulListe().map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join("");
 sel.value="Allgemein";
}

$("openFeedback").onclick=()=>{
 fuelleFeedbackModule();
 $("feedbackMessage").value="";
 $("feedbackModal").hidden=false;
};
$("cancelFeedback").onclick=()=>{$("feedbackModal").hidden=true};
$("feedbackList").addEventListener("click",async e=>{
 const toggle=e.target.closest("[data-feedback-toggle]");
 if(toggle){
  const id=Number(toggle.dataset.feedbackToggle);
  const neuerStatus=toggle.dataset.resolved!=="1";
  const {error}=await sb.from("feedback").update({resolved:neuerStatus}).eq("id",id);
  if(error){alert("Fehler: "+error.message);return}
  renderFeedbackList();
  return;
 }
 const del=e.target.closest("[data-feedback-del]");
 if(del){
  if(!confirm("Dieses Feedback wirklich löschen?"))return;
  const {error}=await sb.from("feedback").delete().eq("id",Number(del.dataset.feedbackDel));
  if(error){alert("Fehler: "+error.message);return}
  renderFeedbackList();
 }
});
$("saveFeedback").onclick=async()=>{
 const message=$("feedbackMessage").value.trim();
 if(!message){alert("Bitte ein Feedback eingeben.");return}
 $("saveFeedback").disabled=true;
 const {error}=await sb.from("feedback").insert({
  module:$("feedbackModul").value,
  message,
  created_by:currentProfile?currentProfile.id:null
 });
 $("saveFeedback").disabled=false;
 if(error){alert("Fehler beim Senden: "+error.message);return}
 $("feedbackModal").hidden=true;
 alert("Danke für dein Feedback!");
};

"use strict";
$("openFeedback").onclick=()=>{
 $("feedbackModul").value="Allgemein";
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

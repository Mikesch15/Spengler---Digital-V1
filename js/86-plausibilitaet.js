"use strict";
// ============================================================
// Plausibilität der Masse (v3.363)
//
// Wenn ein eingetragenes Mass stark vom Üblichen abweicht (z. B. "seitlich unter
// Deckmaterial" 60 statt der üblichen 50), erscheint neben dem Feld ein kleines
// rotes Ausrufezeichen. Antippen zeigt, was auffällt. Es ist KEIN Fehler und
// blockiert nichts - die Eingabe bleibt, wie sie ist.
//
// WOHER DAS "ÜBLICHE" KOMMT: aus dem Zählwerk (js/71), also aus dem, was dieser
// Betrieb bisher TATSÄCHLICH gemessen hat (Sicht messwert_nutzung). Es gibt keine
// zweite Datenquelle und keine festen Annahmen im Code.
//
// WANN DAS ZEICHEN ERSCHEINT (alle vier Bedingungen):
//   - es gibt mindestens 5 bisherige Messungen dieses Feldes
//   - EIN Wert macht mindestens 70 % davon aus (das Mass ist also "üblich")
//   - der eingetragene Wert ist ein anderer
//   - und er kam selbst bisher in weniger als 20 % der Fälle vor
// Variable Masse (Längen, Breiten, die jedes Mal anders sind) haben keinen
// dominanten Wert und lösen deshalb nie etwas aus.
// ============================================================

const PLAUSI_MINDESTENS=5;      // Messungen insgesamt
const PLAUSI_ANTEIL_UEBLICH=0.7;
const PLAUSI_ANTEIL_SELTEN=0.2;

// Zu welcher Art und welchem Feld gehört ein Eingabefeld? Quelle sind die
// Tabellen der Module selbst (DFA_LERNFELDER, KAM_LERNFELDER); dazu kommen die
// seitlichen Masse des Dachfensters, die dort bewusst keinen Richtwert-Chip haben.
function plausiFeldZuordnung(id){
 id=String(id||"");
 if(id.indexOf("dfa_")===0){
  const m=/^dfa_([fg])_[lr]$/.exec(id);
  if(m)return {art:"dachfenstereinfassung",feld:m[1]};
  const t=(typeof DFA_LERNFELDER==="object"&&DFA_LERNFELDER)||{};
  // a/d (links/rechts) wechseln von Fenster zu Fenster - dort gibt es kein "Übliches"
  if(t[id]&&!/^dfa_[ad]_[lr]$/.test(id))return {art:"dachfenstereinfassung",feld:t[id]};
 }
 if(id.indexOf("kam_")===0){
  const t=(typeof KAM_LERNFELDER==="object"&&KAM_LERNFELDER)||{};
  if(t[id]&&!/^kam_[ad]_[lr]$/.test(id))return {art:"kamineinfassung",feld:t[id]};
 }
 return null;
}

// Rein: gibt null zurück (unauffällig) oder {ueblich, anzahlUeblich, gesamt, anzahlEingabe, eingabe, text}.
function plausiPruefe(art,feld,eingabe){
 if(typeof zwAn==="function"&&!zwAn())return null;
 if(typeof zwMesswertKarte==="undefined"||typeof zwMesswertSchluessel!=="function")return null;
 const n=Number(String(eingabe==null?"":eingabe).replace(",","."));
 if(!(Number.isFinite(n)&&n>0))return null;
 const liste=zwMesswertKarte[zwMesswertSchluessel(art,feld)];
 if(!liste||!liste.length)return null;
 let gesamt=0;
 liste.forEach(x=>{gesamt+=x.anzahl});
 if(gesamt<PLAUSI_MINDESTENS)return null;
 const beste=liste.slice().sort((a,b)=>b.anzahl-a.anzahl)[0];
 if(beste.anzahl/gesamt<PLAUSI_ANTEIL_UEBLICH)return null;
 if(Number(beste.wert)===n)return null;
 const hier=liste.filter(x=>Number(x.wert)===n).reduce((s,x)=>s+x.anzahl,0);
 if(hier/gesamt>=PLAUSI_ANTEIL_SELTEN)return null;
 const mal=k=>k===0?"noch nie":(k===1?"1×":k+"×");
 return {ueblich:Number(beste.wert),anzahlUeblich:beste.anzahl,gesamt:gesamt,anzahlEingabe:hier,eingabe:n,
  text:"Ungewöhnlicher Wert: "+n+". Üblich ist "+Number(beste.wert)+" (bei "+beste.anzahl+" von "+gesamt
   +" bisherigen Aufnahmen); "+n+" kam bisher "+mal(hier)+" vor. Bitte kurz prüfen – kein Fehler, wenn der Wert stimmt."};
}

// ---- Anzeige -------------------------------------------------------------
function plausiHuelle(eingabe){
 let h=eingabe.parentElement;
 if(h&&h.classList&&h.classList.contains("plausi-feld"))return h;
 h=document.createElement("span");
 h.className="plausi-feld";
 eingabe.parentNode.insertBefore(h,eingabe);
 h.appendChild(eingabe);
 const b=document.createElement("button");
 b.type="button";b.className="plausi-marke";b.hidden=true;
 b.setAttribute("aria-label","Hinweis: ungewöhnlicher Wert");b.setAttribute("aria-expanded","false");
 b.textContent="!";
 h.appendChild(b);
 return h;
}
function plausiAktualisiere(eingabe){
 const z=plausiFeldZuordnung(eingabe.id);
 if(!z)return;
 const h=plausiHuelle(eingabe);
 const b=h.querySelector(".plausi-marke");
 const r=plausiPruefe(z.art,z.feld,eingabe.value);
 b.hidden=!r;
 b.dataset.plausiText=r?r.text:"";
 const t=h.parentElement&&h.parentElement.querySelector(":scope > .plausi-text");
 if(!r){ if(t)t.remove(); b.setAttribute("aria-expanded","false") }
 else if(t)t.textContent=r.text;
}
function plausiAlleAktualisieren(){
 document.querySelectorAll('input[id^="dfa_"],input[id^="kam_"]').forEach(plausiAktualisiere);
}
let plausiGeplant=false;
function plausiPlanen(){
 if(plausiGeplant)return;
 plausiGeplant=true;
 requestAnimationFrame(()=>{plausiGeplant=false;try{plausiAlleAktualisieren()}catch(e){}});
}
document.addEventListener("input",e=>{
 const t=e.target;
 if(t&&t.tagName==="INPUT"&&t.id&&plausiFeldZuordnung(t.id))plausiAktualisiere(t);
});
document.addEventListener("click",e=>{
 const b=e.target&&e.target.closest?e.target.closest(".plausi-marke"):null;
 if(!b)return;
 const h=b.parentElement, host=h&&h.parentElement;
 if(!host)return;
 let t=host.querySelector(":scope > .plausi-text");
 if(t){ t.remove(); b.setAttribute("aria-expanded","false"); return }
 t=document.createElement("div");
 t.className="plausi-text";t.setAttribute("role","status");
 t.textContent=b.dataset.plausiText||"";
 host.appendChild(t);
 b.setAttribute("aria-expanded","true");
});
// Die Formulare zeichnen sich bei jeder Änderung neu - das Zeichen wird danach wieder gesetzt.
if(typeof MutationObserver==="function"){
 const beob=new MutationObserver(plausiPlanen);
 const start=()=>beob.observe(document.body,{childList:true,subtree:true});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
}

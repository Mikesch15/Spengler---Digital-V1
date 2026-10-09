// ---- Eigene Dialoge statt Browser-Dialoge (v3.286) ----------------------
// Gewuenscht (9.10.2026, mit Bildschirmfoto): Der Dialog des Browsers beginnt
// mit "Auf mikesch15.github.io wird Folgendes angezeigt:". Dieser Kopf gehoert
// dem Browser - mit alert()/confirm()/prompt() laesst er sich nicht weglassen.
// Deshalb gibt es hier die drei Dialoge in der App selbst:
//   appAlert(text)             Hinweis mit "OK"          -> Promise<void>
//   appConfirm(text, optionen) Rueckfrage OK/Abbrechen   -> Promise<boolean>
//   appPrompt(text, vorgabe)   Eingabe, OK/Abbrechen      -> Promise<string|null>
// Anders als die Browser-Dialoge BLOCKIEREN sie nicht: wer eine Antwort braucht,
// schreibt `await`. Mehrere Dialoge gleichzeitig stehen in einer Reihe und
// kommen nacheinander - in der Reihenfolge, in der sie verlangt wurden.
//
// Die Zurueck-Taste des Handys (js/54) zaehlt den Dialog als Schirm: sie
// bricht ab (Rueckfrage -> false, Eingabe -> null, Hinweis -> OK).
//
// Pruefstaende: Automatisierte Browser (navigator.webdriver) behalten die
// NATIVEN Dialoge - die bestehenden Pruefstaende fangen sie per
// page.on("dialog") bzw. ersetzte window.confirm ab. window.__appDialogEcht=true
// schaltet auch dort auf die App-Dialoge um (pruefstand-app-dialoge-v3-286).
const appDialogReihe=[];
let appDialogLaeuft=false;

function appDialogNativ(){
 return typeof navigator!=="undefined"&&navigator.webdriver===true&&!window.__appDialogEcht;
}

function appDialogEinreihen(art,text,zweiter,optionen){
 return new Promise(fertig=>{
  appDialogReihe.push({art,text:String(text===undefined||text===null?"":text),zweiter,optionen:optionen||{},fertig});
  if(!appDialogLaeuft)appDialogNaechster();
 });
}

function appAlert(text){
 if(appDialogNativ()){window.alert(text);return Promise.resolve();}
 return appDialogEinreihen("alert",text);
}
function appConfirm(text,optionen){
 if(appDialogNativ())return Promise.resolve(!!window.confirm(text));
 return appDialogEinreihen("confirm",text,undefined,optionen);
}
function appPrompt(text,vorgabe){
 if(appDialogNativ())return Promise.resolve(window.prompt(text,vorgabe===undefined?"":vorgabe));
 return appDialogEinreihen("prompt",text,vorgabe===undefined?"":String(vorgabe));
}

let appDialogAktuell=null;
function appDialogNaechster(){
 const el=$("appDialogModal");
 const n=appDialogReihe.shift();
 if(!n||!el){appDialogLaeuft=false;appDialogAktuell=null;if(el)el.hidden=true;return;}
 appDialogLaeuft=true;
 appDialogAktuell=n;
 $("appDialogText").textContent=n.text;
 const eingabe=$("appDialogEingabe"), ok=$("appDialogOk"), ab=$("appDialogAbbruch");
 eingabe.hidden=(n.art!=="prompt");
 eingabe.value=(n.art==="prompt")?n.zweiter:"";
 ab.hidden=(n.art==="alert");
 ok.textContent=n.optionen.ok||"OK";
 ab.textContent=n.optionen.abbrechen||"Abbrechen";
 ok.className=n.optionen.gefahr?"red":"blue";
 el.hidden=false;
 setTimeout(()=>{ (n.art==="prompt"?eingabe:ok).focus(); if(n.art==="prompt")eingabe.select(); },0);
}

// ok=true: bestaetigt; false: abgebrochen (Escape, Zurueck-Taste, "Abbrechen").
function appDialogBeenden(ok){
 const n=appDialogAktuell;
 if(!n)return;
 appDialogAktuell=null;
 const antwort=(n.art==="alert")?undefined
  :(n.art==="confirm")?!!ok
  :(ok?$("appDialogEingabe").value:null);
 // Erst das naechste anzeigen, dann antworten: wer auf die Antwort wartet und
 // sofort einen weiteren Dialog verlangt, reiht sich hinten ein.
 appDialogNaechster();
 n.fertig(antwort);
}

(function appDialogBinden(){
 const el=$("appDialogModal");
 if(!el)return;
 $("appDialogOk").addEventListener("click",()=>appDialogBeenden(true));
 $("appDialogAbbruch").addEventListener("click",()=>appDialogBeenden(false));
 el.addEventListener("keydown",e=>{
  if(e.key==="Escape"){e.preventDefault();appDialogBeenden(false);}
  else if(e.key==="Enter"&&e.target&&e.target.id==="appDialogEingabe"){e.preventDefault();appDialogBeenden(true);}
 });
})();

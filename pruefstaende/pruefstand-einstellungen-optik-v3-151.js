// Prueft das neue Aussehen der EINSTELLUNGEN (v3.151).
//
// WAS HIER GEPRUEFT WIRD
//   A  Mit eingeschalteter neuer Ansicht sehen die Einstellungen aus wie
//      diese: Register als Pillen, Felder mindestens 48px hoch und 16px
//      gross (darunter zoomt iOS beim Hineintippen), Knoepfe 48px.
//      A5-A7 sind die wichtigen: der runde Info-Knopf bleibt klein (er ist
//      ein Zeichen, kein Bedienknopf), und Auf-/Zuklappen sowie
//      Registerwechsel sind UNBERUEHRT - es wurde nur die Form geaendert,
//      nicht die Bedienung.
//   B  Gegenprobe: in der klassischen Ansicht ist alles unveraendert.
//      Waere auch nur eine Regel nicht am Schalter gekapselt, faellt es
//      hier auf.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-einstellungen-optik-v3-151.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const STUB=`window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:()=>{const f={};['select','order','limit','range','eq','in','not'].forEach(k=>f[k]=()=>f);
  f.maybeSingle=async()=>({data:null,error:null});
  f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:null})})}
})};`;
const anmelden=page=>page.evaluate(()=>{
 currentProfile={id:"u1",first_name:"Mike",last_name:"Ledermann",role:"admin"};
 meineRechte={admin:true};
 companyName="Peter Künzi AG"; appSettingsId=1;
 allProjects=[]; allProfiles=[currentProfile]; aufgabenListe=[];
 settings={employees:["Mike Ledermann"],rates:[["Meister",98]],materials:[["101.10","Titanzink","0.7 mm","m2",38.5]]};
 $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
 showStart();
});
// Die gemessenen Groessen eines Einstellungs-Bildschirms.
const messen=page=>page.evaluate(()=>{
 const g=(sel,eig)=>{const e=document.querySelector(sel);
  if(!e)return null; const s=getComputedStyle(e);
  return eig.reduce((o,k)=>(o[k]=s[k],o),{});};
 const abschnitt=document.querySelector("#settingsModal .settings-section");
 return {
  tab:g("#settingsModal .settings-tab.active",["borderRadius","backgroundColor","color"]),
  feld:g("#settingsModal input:not([type=checkbox]):not([type=radio])",["minHeight","borderRadius","fontSize"]),
  knopf:g("#settingsModal .bar > button",["minHeight","borderRadius"]),
  info:g("#settingsModal .hilfe-knopf",["minHeight"]),
  abschnittOffen:abschnitt?abschnitt.classList.contains("open"):null,
  koerperDisplay:(()=>{const b=document.querySelector("#settingsModal .settings-section-body");
   return b?getComputedStyle(b).display:null})()
 };
});
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad()});
 const page=await b.newPage({viewport:{width:390,height:844}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 // v3.205: Der Stub muss ausdruecklich geschuetzt werden.
 //
 // Bis v3.204 lag supabase-js auf cdn.jsdelivr.net und war aus der
 // Pruefumgebung nicht erreichbar - deshalb blieb der ueber addInitScript
 // eingespielte Stub stehen, ohne dass es hier jemand absichern musste.
 // Das war Zufall, kein Vertrag: auf dem GitHub-Runner mit Internet wurde
 // der Stub schon vorher ueberschrieben (siehe stub-schutz.js). Seit v3.205
 // liegt die Bibliothek im Projekt und laedt IMMER - der Zufall faellt weg,
 // die Absicherung wird Pflicht.
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 await anmelden(page);

 // --- Neue Ansicht ---
 await page.evaluate(()=>openSettingsTo("general"));
 await page.waitForTimeout(120);
 const neu=await messen(page);
 // Der Massstab war bis v3.217 dieselbe Messung in der klassischen Ansicht.
 // Die gibt es nicht mehr (v3.218). Was es weiterhin gibt, ist die Marke
 // a2-an am <html>-Element: an ihr haengt das ganze Aussehen (css/05). Wird
 // sie kurz abgenommen, steht der blanke Grundstil da - derselbe Massstab
 // wie frueher die klassische Ansicht, und der Beweis, dass die gemessenen
 // Werte wirklich aus den Regeln der Ansicht kommen und nicht zufaellig
 // ohnehin gelten. Sie wird danach sofort wieder gesetzt.
 //
 // Der Inhalt der Messung bleibt unveraendert: seit v3.156 aendert die
 // Ansicht die GROESSE nicht - v3.151 hatte Felder und Knoepfe auf
 // 48px/16px vergroessert, der Anwender hat das am fertigen Bildschirm als
 // unuebersichtlich zurueckgewiesen.
 const ohneMarke=async()=>{
  await page.evaluate(()=>document.documentElement.classList.remove("a2-an"));
  await page.waitForTimeout(150);
  const m=await messen(page);
  await page.evaluate(()=>document.documentElement.classList.add("a2-an"));
  await page.waitForTimeout(150);
  return m;
 };
 const klassisch=await ohneMarke();
 await page.evaluate(()=>openSettingsTo("general"));
 await page.waitForTimeout(250);
 const gleich=(a,b,k)=>!!a&&!!b&&k.every(x=>a[x]===b[x]);

 p(neu.tab&&neu.tab.borderRadius.startsWith("999"),"A1 die Register sind Pillen wie in der neuen Ansicht",neu.tab);
 p(gleich(neu.feld,klassisch.feld,["minHeight","fontSize"])&&parseInt(neu.feld.minHeight)>0,
   "A2 Eingabefelder behalten die Groesse des Grundstils - die Ansicht vergroessert sie nicht",
   {neu:neu.feld,ohneMarke:klassisch.feld});
 p(klassisch.tab&&neu.tab.borderRadius!==klassisch.tab.borderRadius,
   "A3 Gegenprobe: ohne die Marke a2-an sind die Register KEINE Pillen - die Form kommt wirklich von dort",
   {neu:neu.tab,ohneMarke:klassisch.tab});
 p(gleich(neu.knopf,klassisch.knopf,["minHeight","fontSize"]),
   "A4 Knoepfe in den Leisten ebenso",{neu:neu.knopf,ohneMarke:klassisch.knopf});
 p(neu.info&&parseInt(neu.info.minHeight)<48,"A5 der runde Info-Knopf bleibt klein - er ist ein Zeichen",neu.info);

 // Auf- und Zuklappen muss unveraendert funktionieren
 const zuVorher=await page.evaluate(()=>getComputedStyle(document.querySelector("#settingsModal .settings-section-body")).display);
 await page.click("#settingsModal .settings-section-head");
 await page.waitForTimeout(80);
 const zuNachher=await page.evaluate(()=>({
  display:getComputedStyle(document.querySelector("#settingsModal .settings-section-body")).display,
  offen:document.querySelector("#settingsModal .settings-section").classList.contains("open")
 }));
 p(zuVorher==="none"&&zuNachher.display==="block"&&zuNachher.offen,
   "A6 das Auf- und Zuklappen ist unberuehrt",{zuVorher,zuNachher});

 // Registerwechsel muss unveraendert funktionieren
 await page.click('#settingsModal [data-settings-tab="measurements"]');
 await page.waitForTimeout(80);
 const wechsel=await page.evaluate(()=>({
  aktiv:document.querySelector("#settingsModal .settings-tab.active").dataset.settingsTab,
  sichtbar:[...document.querySelectorAll("#settingsModal .settings-tab-panel")]
    .filter(x=>!x.hidden).map(x=>x.dataset.settingsPanel)
 }));
 p(wechsel.aktiv==="measurements"&&JSON.stringify(wechsel.sichtbar)===JSON.stringify(["measurements"]),
   "A7 der Registerwechsel ist unberuehrt",wechsel);

 // --- Gegenprobe: der Grundstil darunter ist unveraendert ---
 // v3.218: Bis v3.217 wurde dafuer in die klassische Ansicht geschaltet.
 // Gemessen wird jetzt derselbe Grundstil, indem die Marke a2-an kurz
 // abgenommen wird. Wer die Regeln der Ansicht versehentlich in den
 // Grundstil schreibt, faellt hier auf.
 await page.evaluate(()=>{$("settingsModal").hidden=true;openSettingsTo("general")});
 await page.waitForTimeout(120);
 const alt=await ohneMarke();
 p(alt.tab&&!alt.tab.borderRadius.startsWith("999"),"B1 im Grundstil sind die Register keine Pillen",alt.tab);
 p(alt.feld&&parseInt(alt.feld.minHeight)<48,"B2 im Grundstil ist die Feldhoehe unveraendert",alt.feld);
 p(alt.knopf&&parseInt(alt.knopf.minHeight)<48,"B3 im Grundstil ist die Knopfhoehe unveraendert",alt.knopf);
 // Und: die Marke ist danach wieder da - es gibt keinen Zustand ohne sie.
 const markeDa=await page.evaluate(()=>document.documentElement.classList.contains("a2-an"));
 p(markeDa,"B4 die Marke a2-an steht danach wieder - es gibt keine zweite Ansicht",markeDa);

 p(fehler.length===0,"C1 keine Javascript-Fehler",fehler.slice(0,3));
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

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
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 await anmelden(page);

 // --- Neue Ansicht ---
 await page.evaluate(()=>openSettingsTo("general"));
 await page.waitForTimeout(120);
 const neu=await messen(page);
 // Der Massstab ist dieselbe Messung in der klassischen Ansicht. Seit
 // v3.156 aendert die neue Ansicht die GROESSE nicht mehr - v3.151 hatte
 // Felder und Knoepfe auf 48px/16px vergroessert, der Anwender hat das am
 // fertigen Bildschirm als unuebersichtlich zurueckgewiesen.
 await page.evaluate(()=>a2Setzen(false));
 await page.waitForTimeout(250);
 const klassisch=await messen(page);
 await page.evaluate(()=>a2Setzen(true));
 await page.evaluate(()=>openSettingsTo("general"));
 await page.waitForTimeout(250);
 const gleich=(a,b,k)=>!!a&&!!b&&k.every(x=>a[x]===b[x]);

 p(neu.tab&&neu.tab.borderRadius.startsWith("999"),"A1 die Register sind Pillen wie in der neuen Ansicht",neu.tab);
 p(gleich(neu.feld,klassisch.feld,["minHeight","fontSize"])&&parseInt(neu.feld.minHeight)>0,
   "A2 Eingabefelder haben dieselbe Groesse wie in der klassischen Ansicht",
   {neu:neu.feld,klassisch:klassisch.feld});
 p(klassisch.tab&&neu.tab.borderRadius!==klassisch.tab.borderRadius,
   "A3 Gegenprobe: am Aussehen aendert sich trotzdem etwas",
   {neu:neu.tab,klassisch:klassisch.tab});
 p(gleich(neu.knopf,klassisch.knopf,["minHeight","fontSize"]),
   "A4 Knoepfe in den Leisten ebenso",{neu:neu.knopf,klassisch:klassisch.knopf});
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

 // --- Gegenprobe: klassische Ansicht unveraendert ---
 await page.evaluate(()=>{$("settingsModal").hidden=true;a2Setzen(false);openSettingsTo("general")});
 await page.waitForTimeout(120);
 const alt=await messen(page);
 p(alt.tab&&!alt.tab.borderRadius.startsWith("999"),"B1 klassisch: die Register sind wie vorher",alt.tab);
 p(alt.feld&&parseInt(alt.feld.minHeight)<48,"B2 klassisch: die Feldhoehe ist unveraendert",alt.feld);
 p(alt.knopf&&parseInt(alt.knopf.minHeight)<48,"B3 klassisch: die Knopfhoehe ist unveraendert",alt.knopf);

 p(fehler.length===0,"C1 keine Javascript-Fehler",fehler.slice(0,3));
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

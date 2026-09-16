// v3.133: Die EDV-Nr. des Materials muss im gedruckten Regierapport stehen.
//
// Gemeldet: "Edv nummer wird im regierapport nicht mitgedruckt".
// Ursache: die EDV-Nr. steht in der Tabellenzelle in einem
// <div class="search"> (Feld + Vorschlagsliste). css/03-druck.css hatte die
// Regel .search{display:none!important} - gemeint war damit die Suche ueber
// der Seite (Projektsuche, Materialsuche), sie loeschte aber auch die
// EDV-Nr. aus dem Ausdruck. Die Spalte selbst war die ganze Zeit da:
// Ueberschrift "EDV-Nr." und 23 mm Breite (.mat-table col.m-edv).
//
// Geprueft wird der gedruckte Zustand ueber emulateMedia({media:"print"}) -
// also das, was wirklich auf dem Papier landet, nicht die Bildschirmansicht.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-edv-im-druck-v3-133.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const ATTRAPPE="window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),"
 +"onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);"
 +"q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};";

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1100,height:900}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);

 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  meineRechte={admin:true};
  // Zwei echte Positionen aus dem 800er-Block des Regiematerials.
  settings.materials=[["801.01","Lötzinn Stangen à","260g","St",7.95],
                      ["802.04","Nieten Stahl 4.8","St >","St",0.25]];
  mats=[{date:"2026-09-16",no:"801.01",qty:2},{date:"2026-09-16",no:"802.04",qty:50}];
  works=[];
  $("authScreen").hidden=true; $("appRoot").hidden=false;
  // Der Rapport-Schirm muss offen sein, sonst ist die Tabelle 0 mm breit und
  // jede Messung liefert 0 (CLAUDE.md 113.5).
  $("startScreen").hidden=true; $("reportScreen").hidden=false;
  renderMain();
 });
 await page.waitForTimeout(250);

 console.log("\nA · Die Spalte ist im Ausdruck ueberhaupt vorgesehen");
 const kopf=await page.evaluate(()=>{
  const tab=document.getElementById("matBody").closest("table");
  return {ueberschriften:[...tab.querySelectorAll("thead th")].map(t=>t.textContent.trim()),
    spalten:[...tab.querySelectorAll("colgroup col")].map(c=>c.className)};
 });
 p(kopf.ueberschriften[1]==="EDV-Nr.","die zweite Spalte heisst 'EDV-Nr.'",kopf.ueberschriften);
 p(kopf.spalten.indexOf("m-edv")===1,"und hat eine eigene Spaltenbreite",kopf.spalten);

 console.log("\nB · Im DRUCK steht die Nummer wirklich da");
 await page.emulateMedia({media:"print"});
 await page.waitForTimeout(200);
 const druck=await page.evaluate(()=>{
  return [...document.querySelectorAll("#matBody tr")].map(tr=>{
   const feld=tr.querySelector("[data-mat-search]");
   const sug=tr.querySelector(".suggest");
   const gross=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
   return {wert:feld?feld.value:null,
     sichtbar:!!(feld&&gross(feld)),
     anzeige:feld?getComputedStyle(feld.closest(".search")).display:null,
     vorschlagSichtbar:!!(sug&&gross(sug))};
  });
 });
 p(druck.length===2,"beide Materialzeilen sind da",druck.length);
 p(druck.every(z=>z.sichtbar),"die EDV-Nr. ist im Ausdruck sichtbar",druck);
 p(druck[0].wert==="801.01"&&druck[1].wert==="802.04",
   "und es steht die richtige Nummer drin",druck.map(z=>z.wert));
 p(druck.every(z=>z.anzeige!=="none"),
   "der .search-Wrapper der Zelle ist nicht auf display:none",druck.map(z=>z.anzeige));

 console.log("\nC · Gegenproben - was im Druck WEG bleiben muss");
 // Die Vorschlagsliste gehoert auf den Bildschirm, nicht aufs Papier.
 p(druck.every(z=>z.vorschlagSichtbar===false),
   "die Vorschlagsliste der Suche bleibt im Ausdruck weg",druck);
 // Die Suche UEBER der Seite (Projektsuche u. a.) war und bleibt im Druck weg -
 // genau dafuer war die Regel .search{display:none} gedacht. Faellt durch,
 // wenn jemand sie pauschal aufhebt, statt nur in der Tabellenzelle.
 const oben=await page.evaluate(()=>{
  const gross=e=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0};
  const ps=document.getElementById("projectSearch");
  return {projektsuche:gross(ps?ps.closest(".search"):null),
    materialsuche:gross((document.getElementById("sheetSearch")||{closest:()=>null}).closest?
      document.getElementById("sheetSearch").closest(".search"):null)};
 });
 p(oben.projektsuche===false,"die Projektsuche ueber der Seite bleibt im Ausdruck weg",oben);
 p(oben.materialsuche===false,"die Materialsuche in den Einstellungen ebenso",oben);

 await page.emulateMedia({media:"screen"});
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));
 console.log("\n== edv-im-druck v3.133:  ok="+ok+"  fails="+fail+" ==");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

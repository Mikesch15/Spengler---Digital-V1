// Prueft v3.211: Das Ruestblatt - eine Quelle, vier Stellen, zwei Groessen.
//
// GEWUENSCHT
// "in allen werkstatt / ruestansichten sollen die einzelnen massaufnahmen
//  alle zuklappbar sein. Und ich will eine ansicht, die nicht die komplette
//  massaufnahme oeffnet. Ich will nur das wichtigste sehen wie das vermasste
//  profil mit den entprechenden laengen"
// Nach Rueckfrage gewaehlt: in der Liste aufklappen PLUS "gross ansehen",
// auf der Projektseite zeigt der Tipp das Blatt (Formular per Knopf darin),
// und auf dem Blatt stehen Skizze, Laengen, Material und die abhakbare Liste.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ruestblatt-v3-211.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

// Derselbe Stub wie in den uebrigen Werkstatt-Pruefstaenden - eine zweite
// Attrappe waere eine zweite Wahrheit.
const QP=lies("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

const ICH="aaaa1111-1111-1111-1111-111111111111";
const MODULE={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
const gm=(id,type,title,data)=>({id,project_id:7,type,title,date:"2026-09-01",
 workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
 geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,
 staerke_mm:0.7,data});
const MESS=[
 gm(11,"einlaufblech_gerade","Dach Nord",{material:2,abwicklung:250,massA:120,winkel:30,
  montage:"links",restBreite:130,note:"GEHEIMNOTIZ EINLAUFBLECH",
  pieces:[{laenge:1200,stossStoss:1200,gehrungLinks:false,gehrungRechts:false,winkel:0},
          {laenge:700,stossStoss:700,gehrungLinks:false,gehrungRechts:false,winkel:0}],
  rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],
   abwicklung:250,abschnittLaenge:1200,optimal:true}}),
 gm(12,"kehle","Kehle West",{material:3,abwicklung:500,nh:42.5,nl:23.5,gl:100,
  rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}})
];

const vorbereiten=async page=>{
 await page.evaluate(([mess,mod,ich])=>{
  currentProfile={id:ich,role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true; reststuecke=[];
  window.__db.mess=JSON.parse(JSON.stringify(mess));
  window.__db.res=[]; window.__db.ze=[]; window.__db.fehler=null;
  pmUebernehmen(mod);
  if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  $("werkstattModal").hidden=true;$("measurementEditModal").hidden=true;
  $("ruestblattModal").hidden=true;
  werkOffen=null; werkGrundlage=null; werkFilter="alle"; werkOffenKarte.clear();
  werkSichtSetzen("projekt");
  werkstattKnopfAktualisieren();
 },[MESS,MODULE,ICH]);
};
const tipp=async(page,sel,was)=>{
 const da=await page.evaluate(s=>{
  const e=document.querySelector(s); if(!e)return "fehlt";
  const r=e.getBoundingClientRect();
  if(!(r.width>0&&r.height>0))return "unsichtbar";
  e.click(); return "ok";
 },sel);
 if(da!=="ok"){p(false,(was||"Element")+" antippbar ("+sel+")",da);return false}
 await page.waitForTimeout(350); return true;
};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForFunction(()=>typeof rbBlattHtml==="function"&&typeof renderWerkstatt==="function",
   null,{timeout:15000});
 // Die klassische Ansicht: in der neuen liegt der Werkstatt-Knopf in der
 // unteren Leiste, und darum geht es hier nicht. Genau so macht es auch
 // pruefstand-werkstatt-liste-v3-30.
 await page.evaluate(()=>{if(typeof a2Setzen==="function")a2Setzen(false)});
 await vorbereiten(page);
 await tipp(page,"#navWerkstatt","Werkstatt-Knopf");
 await page.waitForTimeout(600);

 // ---- A  Das Blatt selbst --------------------------------------------------
 console.log("\nA · Was auf dem Blatt steht");
 const A=await page.evaluate(()=>{
  const m=werkZeilen.find(z=>z.id===11);
  const h=rbBlattHtml(m,{kopf:true});
  const d=document.createElement("div"); d.innerHTML=h;
  return {skizzen:[...d.querySelectorAll(".werk-skizze figcaption")].map(x=>x.textContent.trim().toLowerCase()),
          svg:d.querySelectorAll("svg").length,
          stuecke:d.querySelectorAll("[data-ze-nr]").length,
          kopf:(d.querySelector(".rb-kopf")||{}).textContent||"",
          text:d.textContent.replace(/\s+/g," ")};
 });
 p(A.svg===2&&A.skizzen.length===2,"das vermasste Profil UND der Grundriss",A.skizzen);
 p(A.stuecke===2,"die Laengen stehen als abhakbare Stuecke da",A.stuecke);
 p(/1'?200|1’200/.test(A.text),"und zwar mit den echten Massen",A.text.slice(0,160));
 p(/Einlaufblech/.test(A.kopf)&&/Dach Nord/.test(A.kopf),"der Kopf nennt Art und Bezeichnung",A.kopf);
 p(/Titanzink/.test(A.kopf),"dazu das Material",A.kopf);
 // Und NICHTS aus dem Formular: keine Notiz, keine Eingabefelder, keine Fotos.
 p(!/GEHEIMNOTIZ/.test(A.text),"die Notiz der Massaufnahme steht NICHT darauf");
 const A2=await page.evaluate(()=>{
  const m=werkZeilen.find(z=>z.id===12);      // Kehle: rechnet nur, keine Zeichnung
  const d=document.createElement("div"); d.innerHTML=rbBlattHtml(m);
  return {leer:/keine Skizze/.test(d.textContent),svg:d.querySelectorAll("svg").length};
 });
 p(A2.leer&&A2.svg===0,"eine Art ohne Zeichnung sagt das ausdruecklich",A2);

 // ---- B  EINE Quelle -------------------------------------------------------
 console.log("\nB · Eine Quelle für vier Stellen");
 const q51=lies("js/51-werkstatt.js");
 p(q51.indexOf("function werkSkizzenHtml")<0,
   "js/51 baut die Skizzen NICHT mehr selbst zusammen");
 p(q51.indexOf("rbBlattHtml(a)")>=0,"sondern nimmt das gemeinsame Blatt");
 p(lies("js/56-material-zuschnitt.js").indexOf("rbBlattHtml(m)")>=0,
   "die Seite Material & Zuschnitt ebenso");
 p(lies("js/70-ansicht2.js").indexOf("rbBlattHtml(m)")>=0,"und die Projektseite auch");
 const q80=lies("js/80-ruestblatt.js");
 p(/rsSkizzen\(/.test(q80)&&/zuListeHtml\(/.test(q80)&&/pmatPlanFuer/.test(q80),
   "js/80 nimmt Zeichner, Liste und Plan aus den bestehenden Quellen");
 p(!/\.from\(/.test(q80),"und fragt selbst keine Tabelle - es wird nichts nachgeladen");

 // ---- C  Werkstatt nach Projekt --------------------------------------------
 console.log("\nC · Werkstatt nach Projekt");
 const C0=await page.evaluate(()=>({blatt:document.querySelectorAll("#werkstattBody .rb-blatt").length}));
 p(C0.blatt===0,"zugeklappt steht kein Blatt da",C0);
 await tipp(page,'#werkstattBody [data-werk-karte="11"]',"Kartenkopf 11");
 const C1=await page.evaluate(()=>({
  blatt:document.querySelectorAll("#werkstattBody .rb-blatt").length,
  gross:!!document.querySelector('#werkstattBody [data-rb-gross="11"]'),
  svg:document.querySelectorAll("#werkstattBody .werk-skizze svg").length
 }));
 p(C1.blatt===1&&C1.svg===2,"ein Tipp bringt das Blatt mit beiden Zeichnungen",C1);
 p(C1.gross,"und den Knopf, der es gross zeigt",C1);

 // ---- D  Der grosse Schirm -------------------------------------------------
 console.log("\nD · Gross ansehen");
 await tipp(page,'#werkstattBody [data-rb-gross="11"]',"Gross ansehen");
 const D=await page.evaluate(()=>({
  offen:!$("ruestblattModal").hidden,
  svg:$("ruestblattBody").querySelectorAll("svg").length,
  stuecke:$("ruestblattBody").querySelectorAll("[data-ze-nr]").length,
  kopf:($("ruestblattBody").querySelector(".rb-kopf")||{}).textContent||"",
  eingaben:$("ruestblattBody").querySelectorAll("input:not([data-ze-nr]),textarea,select").length
 }));
 p(D.offen,"der Schirm geht auf",D);
 p(D.svg===2&&D.stuecke===2,"und zeigt DASSELBE - Zeichnungen und Stuecke",D);
 p(/Dach Nord/.test(D.kopf),"mit Art und Bezeichnung im Kopf",D.kopf);
 p(D.eingaben===0,"kein einziges Eingabefeld - es ist kein zweites Formular",D.eingaben);
 // Der Weg ins Formular: der Schirm geht zu, das Formular auf, mit Rueckziel.
 await tipp(page,"#ruestblattFormular","Im Formular öffnen");
 await page.waitForTimeout(400);
 const D2=await page.evaluate(()=>({
  blattZu:$("ruestblattModal").hidden,
  formular:!$("measurementEditModal").hidden,
  id:(typeof currentMeasurementId!=="undefined")?currentMeasurementId:null,
  ziel:(typeof measEditReturnTo!=="undefined")?measEditReturnTo:""
 }));
 p(D2.blattZu&&D2.formular&&D2.id===11,"der Knopf darin fuehrt ins richtige Formular",D2);
 p(D2.ziel==="werkstatt","und merkt sich den Rueckweg in die Werkstatt",D2.ziel);

 // ---- E  Werkstatt nach Material -------------------------------------------
 console.log("\nE · Werkstatt nach Material");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=true; $("werkstattModal").hidden=false;
  werkOffenKarte.clear(); werkSichtSetzen("material");
 });
 await page.waitForTimeout(300);
 const E0=await page.evaluate(()=>({
  koepfe:document.querySelectorAll("#werkstattBody [data-werk-karte]").length,
  blatt:document.querySelectorAll("#werkstattBody .rb-blatt").length,
  altSprung:document.querySelectorAll("#werkstattBody .werk-mat-quellen").length
 }));
 p(E0.koepfe>=1,"jede Massaufnahme hat einen eigenen Kopf zum Zuklappen",E0);
 p(E0.blatt===0,"zugeklappt steht auch hier kein Blatt da",E0);
 p(E0.altSprung===0,"der blosse Sprungknopf von v3.210 ist weg",E0);
 await tipp(page,'#werkstattBody [data-werk-karte="11"]',"Materialsicht-Kopf 11");
 const E1=await page.evaluate(()=>({
  blatt:document.querySelectorAll("#werkstattBody .rb-blatt").length,
  formular:!$("measurementEditModal").hidden,
  gross:!!document.querySelector('#werkstattBody [data-rb-gross="11"]')
 }));
 p(E1.blatt===1&&!E1.formular,
   "ein Tipp zeigt das Blatt - und oeffnet NICHT das ganze Formular",E1);
 p(E1.gross,"auch hier steht 'Gross ansehen' bereit",E1);

 // ---- F  Alle zuklappen ----------------------------------------------------
 console.log("\nF · Alle auf einmal");
 const F=await page.evaluate(async()=>{
  werkSichtSetzen("projekt");
  await new Promise(r=>setTimeout(r,60));
  const schalter=()=>document.querySelector("#werkstattBody [data-werk-allezu]");
  werkOffenKarte.clear(); renderWerkstatt();
  const vorher=!!schalter();
  if(!vorher)return {vorher,nachAuf:-1,nachZu:-1,karten:werkSichtbareKartenIds().length};
  schalter().click();
  const nachAuf=document.querySelectorAll("#werkstattBody .rb-blatt").length;
  schalter().click();
  const nachZu=document.querySelectorAll("#werkstattBody .rb-blatt").length;
  return {vorher,nachAuf,nachZu,karten:werkSichtbareKartenIds().length};
 });
 p(F.vorher,"der Schalter steht ueber der Liste",F);
 p(F.nachAuf===F.karten&&F.karten>=2,"ein Tipp klappt ALLE auf",F);
 p(F.nachZu===0,"der naechste klappt alle wieder zu",F);
 // ---- H  Zugeklappt so klein wie auf der Projektseite ---------------------
 // v3.212, Ansage des Anwenders: "jetzt sollte in der werkstatt die
 // zugeklappten massaufnahmen auch noch so klein sein wie im projekt ->
 // massaufnahme". Gemessen wird, nicht behauptet: die Vergleichszeile wird
 // mit den ECHTEN Klassen der Projektseite (a2-rb > a2-zeile, js/70) in
 // dieselbe Liste gestellt - gleiche Breite, gleiche Schrift, dasselbe
 // Stylesheet. Eine feste Pixelzahl im Pruefstand waere eine zweite Wahrheit
 // und stuende beim naechsten Feinschliff an .a2-zeile falsch da.
 // Die Toleranz von 8 Pixeln ist kein Schlupfloch: eine zusaetzliche
 // Textzeile waere rund 18 Pixel. Es bleibt also bei zwei Zeilen.
 console.log("\nH · Zugeklappt so klein wie im Projekt");
 const messen=async()=>await page.evaluate(()=>{
  const karte=document.querySelector("#werkstattBody .werk-karte");
  if(!karte)return {fehlt:true};
  const v=document.createElement("div");
  v.innerHTML='<div class="a2-rb"><button type="button" class="a2-zeile">'+
   '<span class="a2-zeile-text"><b>Einlaufblech gerade</b>'+
   '<span>01.09.2026 · zu rüsten</span></span>'+
   '<span class="a2-zeile-pfeil">▸</span></button></div>';
  const ref=v.firstChild;
  karte.parentNode.appendChild(ref);
  const platz=el=>{const c=getComputedStyle(el);
   return Math.round(el.getBoundingClientRect().height
     +parseFloat(c.marginTop)+parseFloat(c.marginBottom));};
  const erg={zu:platz(karte),zeile:platz(ref.querySelector(".a2-zeile")),
   knopf:!!karte.querySelector(".werk-karte-akt button"),
   knopfImKopf:!!karte.querySelector(".werk-karte-kopf .werk-karte-akt button"),
   titel:(karte.querySelector(".werk-karte-z1 b")||{}).textContent||"",
   zeilen:karte.querySelectorAll(".werk-karte-z1,.werk-karte-z2").length,
   schrift:Math.round(parseFloat(getComputedStyle(karte.querySelector(".werk-karte-info b")).fontSize)),
   refSchrift:Math.round(parseFloat(getComputedStyle(ref.querySelector("b")).fontSize))};
  ref.remove();
  return erg;
 });
 await page.evaluate(()=>{werkSichtSetzen("projekt");werkOffenKarte.clear();renderWerkstatt()});
 const H=await messen();
 p(!H.fehlt,"eine Karte steht da zum Messen",H);
 p(H.knopf,"und zwar eine MIT Aktionsknopf - der schwerste Fall",H);
 p(H.zu<=H.zeile+8,"zugeklappt braucht sie nicht mehr Platz als die Zeile im Projekt",H);
 p(H.schrift===H.refSchrift,"dieselbe Schriftgroesse im Kopf",H);
 p(H.zeilen===2,"zwei Zeilen, nicht drei",H);
 // Klein werden darf die Karte nur ueber die Gestaltung, nicht indem sie
 // weglaesst, wonach der Ruester auswaehlt: Art UND Bezeichnung stehen
 // vollstaendig im Text, auch wenn die Anzeige sie bei Platzmangel mit "…"
 // abschneidet. Sonst waere die Zeile klein und nutzlos.
 p(/Einlaufblech/.test(H.titel)&&/Dach Nord/.test(H.titel),
   "Art UND Bezeichnung stehen in der Zeile",H.titel);
 p(H.knopfImKopf,"der Knopf zum Bestaetigen bleibt in der zugeklappten Zeile",H);
 // Gegenprobe 1: klein geworden ist nur der ZUGEKLAPPTE Zustand.
 const H2=await page.evaluate(()=>{
  const k=document.querySelector("#werkstattBody .werk-karte");
  const vorher=Math.round(k.getBoundingClientRect().height);
  k.querySelector("[data-werk-karte]").click();
  const nachher=Math.round(document.querySelector("#werkstattBody .werk-karte").getBoundingClientRect().height);
  werkOffenKarte.clear(); renderWerkstatt();
  return {vorher,nachher};
 });
 p(H2.nachher>H2.vorher+100,"aufgeklappt steht weiterhin das ganze Blatt da",H2);
 // Gegenprobe 2: dieselbe Groesse in der Materialsicht - eine Karte, ein Mass.
 await page.evaluate(()=>{werkSichtSetzen("material");werkOffenKarte.clear();renderWerkstatt()});
 await page.waitForTimeout(150);
 const H3=await messen();
 p(!H3.fehlt&&H3.zu<=H3.zeile+8,"nach Material ist sie genauso klein",H3);
 // Gegenprobe 3: eine verfallene Freigabe bleibt sichtbar - sie darf dem
 // Sparen an Hoehe nie zum Opfer fallen (CLAUDE.md 111).
 const H4=await page.evaluate(()=>{
  werkSichtSetzen("projekt");
  werkZeilen=werkZeilen.map(z=>z.id===11?{...z,freigabe_verfallen:true}:z);
  werkOffenKarte.clear(); renderWerkstatt();
  const w=document.querySelector("#werkstattBody .werk-karte-warn");
  const r=w&&w.getBoundingClientRect();
  const da=!!(r&&r.height>0&&r.width>0);
  werkZeilen=werkZeilen.map(z=>z.id===11?{...z,freigabe_verfallen:false}:z);
  renderWerkstatt();
  return {da,text:w?w.textContent.trim().slice(0,80):""};
 });
 p(H4.da&&/nach der Freigabe/.test(H4.text),"die verfallene Freigabe steht weiterhin da",H4);

 // ---- G  Verdrahtung -------------------------------------------------------
 console.log("\nG · Verdrahtung");
 const html=lies("index.html");
 p(html.indexOf('<script src="js/80-ruestblatt.js">')>=0,"js/80 ist eingebunden");
 p(lies("sw.js").indexOf('"./js/80-ruestblatt.js"')>=0,"und steht im Offline-Vorrat");
 p(html.indexOf('id="ruestblattModal"')>=0&&html.indexOf('id="ruestblattBody"')>=0,
   "der grosse Schirm steht in index.html");
 p(html.indexOf('data-hilfe="ruestblatt"')>=0&&lies("js/41-hilfe.js").indexOf('"ruestblatt":')>=0,
   "mit Info-Knopf und Hilfetext");
 p(lies("css/01-basis.css").indexOf(".rb-blatt")>=0,"die Gestaltung steht im gemeinsamen CSS");
 p(lies("css/05-ansicht2.css").indexOf(".a2-rb-blatt")>=0,"und der Teil der neuen Ansicht bei ihr");
 p(lies("js/56-material-zuschnitt.js").indexOf("rbStandAuffrischen()")>=0,
   "nach dem Abhaken wird der Stand im offenen Blatt nachgezogen");

 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler.slice(0,3));
 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

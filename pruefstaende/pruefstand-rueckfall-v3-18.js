// Prueft den Rueckfall fuer Datensaetze aus der Zeit vor v3.17 (v3.18).
//
// Rueckmeldung des Betriebs (7.9.2026, mit Bildschirmfoto): "die
// reservierungsliste hat immernoch zu viele positionen". Zutreffend - v3.17
// filtert am Feld "teil", das die Module beim Rechnen setzen. Die real
// vorhandenen Massaufnahmen wurden aber VOR v3.17 gespeichert und tragen es
// nicht; sie fielen in den unbekannt-Zweig und kamen weiterhin alle mit.
//
// Geprueft wird deshalb:
//   - der Rueckfall beantwortet die Frage fuer alle zwoelf Typen,
//   - er kann NICHT still auseinanderlaufen: fuer jede Zeile, die ein Modul
//     heute erzeugt, muss er dieselbe Antwort geben wie das teil-Feld -
//     einmal live an den echten Ausmass-Funktionen gemessen, einmal am
//     Quelltext aller elf Module,
//   - die Wahrheit bleibt das Feld am Datensatz: ein ausdrueckliches
//     teil schlaegt den Rueckfall in beide Richtungen,
//   - ein unbekannter Typ wird NICHT geraten,
//   - bestehende Zeilen (die 11 realen aus dem Screenshot) werden erkannt
//     und lassen sich ueber den bestehenden Loeschweg wegraeumen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rueckfall-v3-18.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"), fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

const STUB=`window.__ruf=[];
window.__db={reservierungen:[],reste:[],naechste:100};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range','eq','is','in'].forEach(k=>f[k]=(a,b)=>{if(k==='eq'||k==='is'||k==='in')st.filter.push([a,k,b]);return f});
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.delete=()=>{st.op='delete';return f};
 const quelle=()=>name==='material_reservierungen'?window.__db.reservierungen:
               (name==='reststuecke'?window.__db.reste:[]);
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',werte:st.werte,filter:st.filter});
  if(st.op==='insert'){
   const rows=(Array.isArray(st.werte)?st.werte:[st.werte]).map(w=>({
     id:window.__db.naechste++,company_id:'FIRMA-AUS-DER-DB',
     status:'benoetigt',reserviert_von:null,reserviert_am:null,...w}));
   quelle().push(...rows); return {data:rows,error:null};
  }
  if(st.op==='delete'){
   const ids=(st.filter.find(x=>x[0]==='id'&&x[1]==='in')||[])[2]||[];
   const weg=quelle().filter(r=>ids.indexOf(r.id)>=0);
   window.__db.reservierungen=quelle().filter(r=>ids.indexOf(r.id)<0);
   return {data:weg,error:null};
  }
  if(st.op==='update')return {data:[],error:null};
  return {data:quelle().map(r=>({...r})),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});return {data:null,error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};
window.confirm=()=>true;`;

// Genau die Massaufnahme 87 des Betriebs: vier abgeleitete Masse, KEIN
// teil-Feld (gespeichert am 06.09., also vor v3.17).
const WIE_87=[
 {id:87,project_id:3,type:"einlaufblech_gerade",title:"Test",
  data:{material:3,abwicklung:250,
   rollen:{abwicklung:250,streifen:[{stuecke:[{nr:1,laenge:2070},{nr:2,laenge:1950}]}]},
   ausmass:[
    {pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"21,45",einheit:"m",herkunft:"Summe der Zuschnittlängen"},
    {pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:11,einheit:"Stk.",herkunft:"Stückliste"},
    {pos:3,bezeichnung:"Blechstösse",menge:10,einheit:"Stk.",herkunft:"je Übergang zwischen zwei Stücken"},
    {pos:4,bezeichnung:"Blechfläche",menge:"5,36",einheit:"m²",herkunft:"Gesamtlänge × Abwicklung"}]}}
];
// Massaufnahme 50: dieselbe Fassung, aber MIT einem echten Teil.
const WIE_50=[
 {id:50,project_id:3,type:"einlaufblech_gerade",title:"Alt mit Teil",
  data:{material:3,abwicklung:250,
   ausmass:[
    {pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"1,00",einheit:"m"},
    {pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:1,einheit:"Stk."},
    {pos:3,bezeichnung:"Blechfläche",menge:"0,25",einheit:"m²"},
    {pos:4,bezeichnung:"Haltebleche (GAVA Blech)",menge:3,einheit:"Stk."}]}}
];
// Eine alte Rinne halbrund - dort ist JEDE Komponente ein Teil.
const ALTE_RINNE=[
 {id:60,project_id:3,type:"rinne_halbrund",title:"Alte Rinne",
  data:{material:3,groesse:333,
   ausmass:[
    {pos:1,bezeichnung:"Rinne halbrund 333, Länge",menge:"18,40",einheit:"m"},
    {pos:2,bezeichnung:"Rinnenhalter",menge:24,einheit:"Stk."},
    {pos:3,bezeichnung:"Rinnenboden links",menge:1,einheit:"Stk."},
    {pos:4,bezeichnung:"Dehnungsstück",menge:2,einheit:"Stk."}]}}
];
const MOD={haupt:true,material:true,reservierung:true,zuschnitt:true,werkstatt:true};

const vorbereiten=async(page,aufnahmen,resv)=>{
 await page.evaluate(([auf,mod,vorhanden])=>{
  currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:"admin",first_name:"P",last_name:"T"};
  allProfiles=[{id:"aaaa1111-1111-1111-1111-111111111111",first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:3,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true;
  reststuecke=[];
  window.__db.reservierungen=(vorhanden||[]).map(r=>({...r}));
  window.__db.naechste=200;
  projectMeasurementsCache=JSON.parse(JSON.stringify(auf));
  cockpitProjectId=3;
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
  $("projectCockpitModal").hidden=false; $("matZuModal").hidden=false;
  ["matZuDetailsMaterial","matZuDetailsZuschnitt","matZuDetailsReservierung"]
   .forEach(id=>{const d=$(id); if(d){d.hidden=false; d.open=true}});
  window.__ruf=[];
 },[aufnahmen,MOD,resv||[]]);
 await page.evaluate(()=>resvCockpitLaden(3));
 await page.waitForTimeout(120);
};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1100,height:1400}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 console.log("\nA · Genau der Fall aus dem Bildschirmfoto (Massaufnahme 87)");
 await vorbereiten(page,WIE_87);
 const z87=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(!z87.some(x=>/Abwicklung 250 mm/.test(x)),"die Abwicklung kommt NICHT mehr mit",z87);
 p(!z87.some(x=>/Stücke \(Zuschnitte\)/.test(x)),"die Stueckzahl kommt NICHT mehr mit",z87);
 p(!z87.some(x=>/Blechstösse/.test(x)),"die Blechstoesse kommen NICHT mehr mit",z87);
 p(!z87.some(x=>/Blechfläche/.test(x)),"die Blechflaeche kommt NICHT mehr mit",z87);
 p(z87.filter(x=>/^Zuschnitt/.test(x)).length>0,"die Zuschnitte kommen mit",z87);
 const st87=await page.evaluate(()=>resvBedarfStand());
 p(st87.abgeleitet===4&&st87.unbekannt===0,"alle vier als abgeleitet gezaehlt, nichts unbekannt",st87);

 console.log("\nB · Ein echtes Teil geht auch aus einer alten Aufnahme nicht verloren");
 await vorbereiten(page,WIE_50);
 const z50=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(z50.some(x=>/Haltebleche/.test(x)),"das GAVA-Blech ist dabei",z50);
 p(!z50.some(x=>/Blechfläche/.test(x)),"die Blechflaeche nicht",z50);
 await vorbereiten(page,ALTE_RINNE);
 const zR=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(zR.length>=4&&["Rinnenhalter","Rinnenboden links","Dehnungsstück"].every(n=>zR.some(x=>x===n)),
   "bei einer alten Rinne bleibt jede Komponente",zR);

 console.log("\nC · Das Feld am Datensatz schlaegt den Rueckfall");
 await vorbereiten(page,[{id:70,project_id:3,type:"einlaufblech_gerade",title:"X",
   data:{material:3,ausmass:[
    {pos:1,bezeichnung:"Blechfläche",menge:"1,00",einheit:"m²",teil:true},
    {pos:2,bezeichnung:"Haltebleche (GAVA Blech)",menge:3,einheit:"Stk.",teil:false}]}}]);
 const zW=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(zW.some(x=>/Blechfläche/.test(x)),"ausdruecklich als Teil markiert kommt mit",zW);
 p(!zW.some(x=>/Haltebleche/.test(x)),"ausdruecklich als Mass markiert kommt nicht",zW);

 console.log("\nD · Ein unbekannter Typ wird nicht geraten");
 await vorbereiten(page,[{id:80,project_id:3,type:"neue_art_v4",title:"Y",
   data:{material:3,ausmass:[{pos:1,bezeichnung:"Irgendwas",menge:2,einheit:"Stk."}]}}]);
 const stU=await page.evaluate(()=>resvBedarfStand());
 p(stU.unbekannt===1&&stU.abgeleitet===0,"bleibt unbekannt",stU);
 const zU=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(zU.some(x=>/Irgendwas/.test(x)),"und kommt vorsichtshalber mit",zU);
 const zsU=await page.evaluate(()=>resvBedarfZusatz());
 p(/ältere/.test(zsU),"der Text sagt warum",zsU);

 console.log("\nE · Der Rueckfall deckt alle zwoelf Typen ab");
 const tab=await page.evaluate(()=>Object.keys(PMAT_TEIL_RUECKFALL));
 const ARTEN=await page.evaluate(()=>Object.keys(MEAS_TYPE_LABELS));
 p(ARTEN.length===12,"die App kennt zwoelf Arten",ARTEN.length);
 const fehlend=ARTEN.filter(a=>tab.indexOf(a)<0);
 p(fehlend.length===0,"jede Art hat eine Regel",fehlend);
 const zuviel=tab.filter(a=>ARTEN.indexOf(a)<0);
 p(zuviel.length===0,"und keine Regel ohne Art",zuviel);

 console.log("\nF · Live gemessen: der Rueckfall stimmt mit dem Modul ueberein");
 // Rinne halbrund nimmt ihre Daten als Parameter - direkt messbar.
 const rinne=await page.evaluate(()=>{
  if(typeof raAusmassZeilen!=="function"||typeof raLeer!=="function")return null;
  const a=raLeer(); a.material=2; a.groesse=333;
  a.verlauf=[{art:"abschnitt",laenge:"8000"}];
  a.rinnenboden={links:true,rechts:false};
  return raAusmassZeilen(a).map(z=>({bez:z.bezeichnung,teil:z.teil,
    rueck:pmatTeilRueckfall("rinne_halbrund",z.bezeichnung)}));
 });
 p(rinne&&rinne.length>0,"Rinne halbrund liefert Zeilen",rinne&&rinne.length);
 p(rinne&&rinne.every(x=>x.teil===x.rueck),
   "jede Zeile: Rueckfall === teil",(rinne||[]).filter(x=>x.teil!==x.rueck));

 // Einlaufblech gerade ueber seinen Modulzustand.
 const eb=await page.evaluate(()=>{
  if(typeof ebaAusmassZeilen!=="function"||typeof ebaLeer!=="function")return null;
  ebA=ebaLeer(); ebA.material=2; ebA.abwicklung=250; ebA.winkel=30; ebA.massA=100;
  ebA.stuecke=[{laenge:2000,gehrungStart:true,endzugabeStart:20},{laenge:1500}];
  ebA.gava={aktiv:true,abstand_mm:500,anzahl:""};
  return ebaAusmassZeilen().map(z=>({bez:z.bezeichnung,teil:z.teil,
    rueck:pmatTeilRueckfall("einlaufblech_gerade",z.bezeichnung)}));
 });
 p(eb&&eb.length>=4,"Einlaufblech gerade liefert Zeilen",eb&&eb.length);
 p(eb&&eb.some(x=>/Haltebleche/.test(x.bez)&&x.teil===true),"mit dem GAVA-Blech als Teil",eb);
 p(eb&&eb.every(x=>x.teil===x.rueck),
   "jede Zeile: Rueckfall === teil",(eb||[]).filter(x=>x.teil!==x.rueck));

 // Mauerabdeckung ueber ihren Modulzustand. Die beiden Teile (Schieber und
 // Boden) muessen dabei WIRKLICH entstehen - eine Messung, die den Fall gar
 // nicht erreicht, prueft nichts.
 const mad=await page.evaluate(()=>{
  if(typeof madaAusmassZeilen!=="function"||typeof madaLeer!=="function")return null;
  madA=madaLeer(); madA.material=2; madA.schieberManuell=true;
  madA.schieber=[{posAbStart:4000},{posAbStart:9000}];
  madA.segmente=[{laenge:"7000",winkel:0,bodenLinks:true},
                 {laenge:"6000",winkel:90,bodenRechts:true}];
  return madaAusmassZeilen().map(z=>({bez:z.bezeichnung,teil:z.teil,
    rueck:pmatTeilRueckfall("mauerabdeckung",z.bezeichnung)}));
 });
 p(mad&&mad.length>0,"Mauerabdeckung liefert Zeilen",mad&&mad.length);
 p(mad&&mad.some(x=>x.bez==="Schieber"&&x.teil===true),"mit dem Schieber als Teil",mad);
 p(mad&&mad.some(x=>x.bez==="Boden"&&x.teil===true),"mit dem Boden als Teil",mad);
 p(mad&&mad.every(x=>x.teil===x.rueck),
   "jede Zeile: Rueckfall === teil",(mad||[]).filter(x=>x.teil!==x.rueck));

 // Ort-/Seitenbleche ueber ihre Formularfelder (kein eigener Zustand).
 const anbL=await page.evaluate(()=>{
  if(typeof anbaAusmassZeilen!=="function"||typeof anbaZuruecksetzen!=="function")return null;
  anbaZuruecksetzen();
  const setz=(id,v)=>{const f=$(id); if(f){f.value=String(v); f.dispatchEvent(new Event("change",{bubbles:true}))}};
  if(typeof anbFormularZuruecksetzen==="function")anbFormularZuruecksetzen();
  $("anb_material").value="2";
  $("anb_ausfuehrung").value="bleilappen";
  if($("anb_ausfuehrung").onchange)$("anb_ausfuehrung").onchange();
  $("anb_lattenabstand").value="330";
  anbSegmente=[{laenge:3000,knick:false},{laenge:900,knick:false}];
  if(typeof renderAnbResult==="function")renderAnbResult();
  return anbaAusmassZeilen().map(z=>({bez:z.bezeichnung,teil:z.teil,
    rueck:pmatTeilRueckfall("anschlussblech",z.bezeichnung)}));
 });
 p(anbL&&anbL.length>=5,"Ort-/Seitenbleche liefern Zeilen",anbL&&anbL.length);
 p(anbL&&anbL.some(x=>x.bez==="Bleilappen"&&x.teil===true),"mit den Bleilappen als Teil",anbL);
 p(anbL&&anbL.every(x=>x.teil===x.rueck),
   "jede Zeile: Rueckfall === teil",(anbL||[]).filter(x=>x.teil!==x.rueck));

 console.log("\nG · Am Quelltext: keine stille Divergenz");
 // Jeder zeile()-Aufruf mit einem festen Text: der Rueckfall muss dieselbe
 // Antwort geben wie das ",true)" dahinter. Wird eine Bezeichnung
 // umformuliert oder ein true gesetzt/entfernt, faellt es hier auf.
 const MODULE={"js/29-einlaufblech-aufnahme.js":"einlaufblech_gerade",
  "js/30-einlaufblech-konisch-aufnahme.js":"einlaufblech_konisch",
  "js/31-freies-profil-aufnahme.js":"freies_profil",
  "js/32-mauerabdeckung-aufnahme.js":"mauerabdeckung",
  "js/34-kehle-aufnahme.js":"kehle","js/36-lukarne-aufnahme.js":"lukarne",
  "js/37-kamin-aufnahme.js":"kamineinfassung",
  "js/38-einfassung-aufnahme.js":"einfassung_rund",
  "js/39-rinne-aufnahme.js":"rinne","js/40-anschlussblech-aufnahme.js":"anschlussblech"};
 const funde=[];
 Object.keys(MODULE).forEach(f=>{
  const txt=fs.readFileSync(f,"utf8");
  // Nur der Ausmass-Abschnitt: ab der Ausmass-Funktion bis zum naechsten
  // "function " auf Spaltenanfang.
  const i=txt.search(/function [a-z]+AusmassZeilen\(/);
  if(i<0)return;
  const rest=txt.slice(i);
  const j=rest.search(/\n\/\/ ---|\nfunction [a-z]/);
  const block=j>0?rest.slice(0,j):rest;
  const ruf=/(?:zeile|dazu)\(\s*"((?:[^"\\]|\\.)*)"\s*,([^;]*?)\);/g;
  let m;
  while((m=ruf.exec(block))){
   funde.push({datei:f,typ:MODULE[f],bez:m[1],true_:/,\s*true\s*\)?\s*$/.test(m[2].trim())});
  }
 });
 p(funde.length>=25,"genug feste Bezeichnungen gefunden",funde.length);
 const abw=[];
 for(const f of funde){
  const r=await page.evaluate(([t,b])=>pmatTeilRueckfall(t,b),[f.typ,f.bez]);
  if(r!==f.true_)abw.push({...f,rueckfall:r});
 }
 p(abw.length===0,"jede feste Bezeichnung: Rueckfall === das true im Quelltext",abw);
 // Die eine dynamische Teil-Bezeichnung (js/40) ist gesondert abgedeckt.
 const anb=fs.readFileSync("js/40-anschlussblech-aufnahme.js","utf8");
 p(/\(eigenes Material\)"[^;]*,true\)/.test(anb),"js/40 markiert sein eigenes Material");
 const eigen=await page.evaluate(()=>pmatTeilRueckfall("anschlussblech","Bleiblech (eigenes Material)"));
 p(eigen===true,"und der Rueckfall kennt es",eigen);
 // Nur die Rinne halbrund darf "alles ist Teil" sein.
 const alles=await page.evaluate(()=>Object.keys(PMAT_TEIL_RUECKFALL)
   .filter(k=>PMAT_TEIL_RUECKFALL[k]("Irgendein erfundener Text 12345")===true));
 p(alles.length===1&&alles[0]==="rinne_halbrund","nur die Rinne halbrund sagt zu allem Teil",alles);

 console.log("\nH · Bestehende Zeilen aus der Zeit vor v3.17");
 // Die elf realen Zeilen des Betriebs, verkuerzt auf die Massaufnahme 87.
 const VORHANDEN=[
  {id:66,project_id:3,measurement_id:87,material_name:"Kupfer",bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:21.45,einheit:"m",status:"benoetigt",laenge_mm:null,breite_mm:null},
  {id:67,project_id:3,measurement_id:87,material_name:"Kupfer",bezeichnung:"Stücke (Zuschnitte)",menge:11,einheit:"Stk.",status:"benoetigt",laenge_mm:null,breite_mm:null},
  {id:68,project_id:3,measurement_id:87,material_name:"Kupfer",bezeichnung:"Blechstösse",menge:10,einheit:"Stk.",status:"benoetigt",laenge_mm:null,breite_mm:null},
  {id:69,project_id:3,measurement_id:87,material_name:"Kupfer",bezeichnung:"Blechfläche",menge:5.36,einheit:"m²",status:"benoetigt",laenge_mm:null,breite_mm:null},
  {id:70,project_id:3,measurement_id:87,material_name:"Kupfer",bezeichnung:"Zuschnitt",menge:10,einheit:"Stk",status:"benoetigt",laenge_mm:2070,breite_mm:250},
  {id:71,project_id:3,measurement_id:87,material_name:"Kupfer",bezeichnung:"Zuschnitt",menge:1,einheit:"Stk",status:"benoetigt",laenge_mm:1950,breite_mm:250}
 ];
 await vorbereiten(page,WIE_87,VORHANDEN);
 const erkannt=await page.evaluate(()=>resvAbgeleiteteZeilen().map(r=>({id:r.id,b:r.bezeichnung})));
 p(erkannt.length===4,"die vier abgeleiteten Zeilen sind erkannt",erkannt);
 p(erkannt.every(x=>x.id>=66&&x.id<=69),"und zwar genau sie",erkannt);
 const zusch=await page.evaluate(()=>[70,71].map(id=>resvAbgeleitet((resvListe||[]).find(r=>r.id===id))));
 p(zusch.every(x=>x===false),"ein Zuschnitt gilt nie als abgeleitet",zusch);
 // Und zwar auch dann nicht, wenn die Massaufnahme eine gleichnamige
 // abgeleitete Ausmass-Zeile hat (die Mauerabdeckung hat "Zuschnitte").
 const gleichnamig=await page.evaluate(()=>{
  projectMeasurementsCache=[{id:90,project_id:3,type:"mauerabdeckung",title:"M",
    data:{material:3,ausmass:[{pos:1,bezeichnung:"Zuschnitt",menge:4,einheit:"Stk."}]}}];
  const zeile={id:99,measurement_id:90,bezeichnung:"Zuschnitt",menge:4,
    einheit:"Stk",laenge_mm:2070,breite_mm:250};
  const ohneMasse={...zeile,laenge_mm:null,breite_mm:null};
  return {mitMasse:resvAbgeleitet(zeile),ohneMasse:resvAbgeleitet(ohneMasse)};
 });
 p(gleichnamig.mitMasse===false,"auch bei gleichnamiger abgeleiteter Zeile bleibt der Zuschnitt",gleichnamig);
 p(gleichnamig.ohneMasse===true,"die gleichnamige Ausmass-Zeile selbst gilt als abgeleitet",gleichnamig);
 await vorbereiten(page,WIE_87,VORHANDEN);
 const markiert=await page.evaluate(()=>Array.from(
   document.querySelectorAll('#cockpitReservierungBody tr[data-resv-zeile]'))
   .filter(tr=>tr.querySelector(".resv-abgeleitet"))
   .map(tr=>Number(tr.dataset.resvZeile)));
 p(markiert.length===4&&markiert.every(i=>i>=66&&i<=69),
   "genau die vier Zeilen sind in der Liste gekennzeichnet",markiert);
 const html=await page.evaluate(()=>$("cockpitReservierungBody").innerHTML);
 p(/Abgeleitete Masse entfernen \(4\)/.test(html),"der Aufraeum-Knopf nennt die Zahl");
 p(/4 Zeilen in dieser Liste sind ein abgeleitetes Mass/.test(html),"und ein Satz erklaert es");

 console.log("\nI · Aufraeumen geht ueber den bestehenden Loeschweg");
 await page.evaluate(()=>{window.__ruf=[]});
 const kn=await page.$("[data-resv-aufraeumen]");
 p(!!kn,"der Knopf ist da");
 if(kn){
  await kn.click(); await page.waitForTimeout(300);
  const del=await page.evaluate(()=>window.__ruf.filter(r=>r.op==="delete"));
  p(del.length===1,"EIN Loeschaufruf fuer alle vier",del.length);
  const ids=del.length?((del[0].filter||[]).find(x=>x[0]==="id")||[])[2]:null;
  p(Array.isArray(ids)&&ids.length===4&&ids.every(i=>i>=66&&i<=69),
    "und zwar genau die vier abgeleiteten",ids);
  const rest=await page.evaluate(()=>(resvListe||[]).map(r=>r.id));
  p(rest.length===2&&rest.indexOf(70)>=0&&rest.indexOf(71)>=0,
    "die beiden Zuschnitte bleiben stehen",rest);
  const html2=await page.evaluate(()=>$("cockpitReservierungBody").innerHTML);
  p(!/Abgeleitete Masse entfernen/.test(html2),"der Knopf verschwindet danach");
 }

 console.log("\nJ · Ohne abgeleitete Zeilen kein Knopf");
 await vorbereiten(page,WIE_87,VORHANDEN.filter(r=>r.laenge_mm!==null));
 const html3=await page.evaluate(()=>$("cockpitReservierungBody").innerHTML);
 p(!/Abgeleitete Masse entfernen/.test(html3),"kein Aufraeum-Knopf");
 p(!/abgeleitetes Mass/.test(html3),"und keine Kennzeichnung");
 // Ohne Zuordnung zu einer Massaufnahme sagt die App nichts.
 const ohne=await page.evaluate(()=>resvAbgeleitet(
   {id:1,measurement_id:null,bezeichnung:"Blechfläche",laenge_mm:null}));
 p(ohne===false,"ohne measurement_id wird nicht geraten",ohne);

 console.log("\nK · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));

 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  "+fail+" FEHLGESCHLAGEN":"  alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH",e);process.exit(2)});

// Prueft v3.24: Blechzuschnitte und Halbfabrikate in den Regierapport
// uebernehmen, mit einem EDV-Nr.-Vorschlag der App.
//
//   A  DER VORSCHLAG  - rmatVorschlaege()/rmatIstSicher() gegen die ECHTEN
//      Katalognamen der Produktivdatenbank. Der Name ist Bedingung, nicht
//      Bonus; Einheit ist ein harter Filter; ein blosser Wortstamm reicht
//      nicht fuer "sicher".
//   B  DAS ANGEBOT    - drei Bloecke je Massaufnahme: erfasst, Blech,
//      Halbfabrikate. Quelle sind pmatStuecke()/pmatTeilVon() - es wird
//      nichts neu gerechnet, und abgeleitete Masse fallen weg.
//   C  DIE UEBERNAHME - Katalognummer oder freie Position 999.9x mit der
//      Bezeichnung. KEINE erfundene Katalognummer.
//   D  BEDIENUNG      - Auswahl aenderbar ohne Neuzeichnen, Basis beim
//      Blech (netto/brutto), Bildschirmbreiten.
//   E  WERKSTATT       - grosser Knopf neben Projekte, versteckt solange das
//      Modul aus ist (.start-nav-btn setzt display:flex und wuerde [hidden]
//      schlagen), Filtervorgabe "Nur meine".
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rapport-zuschnitt-v3-24.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"), fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const Q57=fs.readFileSync("js/57-rapport-material.js","utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,420):""))}};

const STUB=`window.__ruf=[];
window.__db={mess:[],fehler:null};
function __tab(name){
 const st={name,filter:[],op:null,werte:null,spalten:'*'};
 const f={};
 ['order','limit','range'].forEach(k=>f[k]=()=>f);
 // select() liefert NUR die genannten Spalten - genau wie PostgREST. Ohne
 // das wuerde eine vergessene Spalte im Test nie auffallen.
 f.select=(c)=>{st.spalten=(c===undefined||c===null||c==='')?'*':String(c);return f};
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 const passt=r=>st.filter.every(([k,art,v])=>art==='in'?v.map(String).indexOf(String(r[k]))>=0:String(r[k])===String(v));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice(),
   werte:st.werte?JSON.parse(JSON.stringify(st.werte)):null});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  const q=name==='measurements'?window.__db.mess:[];
  const sp=st.spalten==='*'?null:st.spalten.split(',').map(x=>x.trim()).filter(Boolean);
  const eng=r=>{const o={};sp.forEach(k=>{if(k in r)o[k]=r[k]});return o};
  return {data:q.filter(passt).map(r=>JSON.parse(JSON.stringify(sp?eng(r):r))),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};
window.alert=function(t){window.__alert=String(t)};`;

// ---- Der ECHTE Katalog (Auszug aus der Produktivdatenbank, 07.09.2026) ----
// [edv_nr,name,dim,unit,price]
const KAT=[
 ["100.02","Stahlblech svz / evz / dek","0.75","m²",42],
 ["102.02","Kupferblech","0.80","m²",95],
 ["103.01","Titanzinkblech blank","0.70","m²",58],
 ["103.02","Titanzinkblech blank","0.80","m²",64],
 ["103.51","Titanzink vorbewittert blaugrau","0.70","m²",71],
 ["201.01","Dachrinnen halbrund Kupfer","250","m1",39],
 ["201.02","Dachrinnen halbrund Kupfer","330","m1",47],
 ["201.11","Dachrinnen halbrund Titanzink","250","m1",26],
 ["201.12","Dachrinnen halbrund Titanzink","330","m1",31],
 ["202.01","Rinnenhalter Kupfer","250","St",9],
 ["202.02","Rinnenhalter Kupfer","330","St",11],
 ["202.11","Rinnenhalter Titanzink","250","St",7],
 ["202.12","Rinnenhalter Titanzink","330","St",8],
 ["203.01","Rinnenwinkel, alle Materialien","250","St",22],
 ["203.02","Rinnenwinkel, alle Materialien","330","St",26],
 ["203.21","Rinnenboden gerade, alle Materialien","250","St",18],
 ["203.22","Rinnenboden gerade, alle Materialien","330","St",21],
 ["203.31","Rinnen-Dehnungselement alle Materialien","250","St",34],
 ["203.32","Rinnen-Dehnungselement alle Materialien","330","St",38],
 ["203.41","Einhängestutzen gerade, alle Materialien","250","St",29],
 ["203.42","Einhängestutzen gerade, alle Materialien","330","St",33],
 ["222.13","Einkopf-Dehnungselemente Dilastar Kupfer","L830","St",88],
 ["241.11","Flachdachrinne rostfrei, B 125, Höhen in mm","40 / 60","m1",55],
 ["501.10","Nieten Alu 4x10","4x10","St",0.4]];

// Projekt 7: eine Rinne halbrund (Halbfabrikate) und ein Einlaufblech
// (Zuschnitte + ein Halteblech + vier abgeleitete Masse).
const MESS=[
 {id:11,project_id:7,type:"rinne_halbrund",title:"Nordseite",date:"2026-09-01",
  rapport_material:[{no:"501.10",qty:40}],
  data:{material:3,
   ausmass:[
    {pos:1,bezeichnung:"Rinne halbrund 330 mm Kupfer",menge:"18.40",einheit:"m",herkunft:"Verlauf",teil:true},
    {pos:2,bezeichnung:"Rinnenhalter 330 mm",menge:25,einheit:"Stk.",herkunft:"Vorschlag",teil:true},
    {pos:3,bezeichnung:"Innenwinkel 330 mm",menge:2,einheit:"Stk.",herkunft:"Verlauf",teil:true},
    {pos:4,bezeichnung:"Schiebestutzen 330 mm Ø 100",menge:1,einheit:"Stk.",herkunft:"Eingabe",teil:true},
    {pos:5,bezeichnung:"Rinnenboden links 330 mm",menge:1,einheit:"Stk.",herkunft:"Eingabe",teil:true}]}},
 {id:12,project_id:7,type:"einlaufblech_gerade",title:"Dach Süd",date:"2026-09-02",
  rapport_material:[],
  data:{material:2,abwicklung:250,
   ausmass:[
    {pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"5.10",einheit:"m",herkunft:"Summe der Zuschnittlängen",teil:false},
    {pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:3,einheit:"Stk.",herkunft:"Stückliste",teil:false},
    {pos:3,bezeichnung:"Blechfläche",menge:"1,28",einheit:"m²",herkunft:"Gesamtlänge × Abwicklung",teil:false},
    {pos:4,bezeichnung:"Haltebleche (GAVA Blech)",menge:11,einheit:"Stk.",herkunft:"Eingabe",teil:true}],
   rollen:{abwicklung:250,abschnittLaenge:2000,abschnitte:1,jeAbschnitt:4,
    bestes:{breite:1000,flaeche:2.0,verschnitt:0.725,jeAbschnitt:4,abschnitte:1,rollenLaenge:2000},
    moeglich:[{breite:1000,flaeche:2.0,verschnitt:0.725,jeAbschnitt:4,abschnitte:1,rollenLaenge:2000}],
    streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]},{rest:0,stuecke:[{nr:2,laenge:1900}]},
              {rest:0,stuecke:[{nr:3,laenge:1200}]}],optimal:true}}},
 // Freies Profil: ZWEI Gruppen mit VERSCHIEDENEN Breiten. Genau das
 // unterscheidet "aus dem gespeicherten Plan gelesen" von "selbst gerechnet":
 // wer eine einzige Breite annimmt, bekommt hier eine andere Zahl heraus.
 {id:13,project_id:7,type:"freies_profil",title:"Attika",date:"2026-09-03",
  rapport_material:[],
  data:{material:3,
   ausmass:[{pos:1,bezeichnung:"Blechfläche",menge:"1,17",einheit:"m²",herkunft:"Zuschnitt",teil:false}],
   zuschnitt:{gruppen:[
    {breite:300,abschnittLaenge:2000,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]},
                                               {rest:0,stuecke:[{nr:2,laenge:1000}]}]},
    {breite:180,abschnittLaenge:1500,streifen:[{rest:0,stuecke:[{nr:3,laenge:1500}]}]}],
    bestes:{breite:1000,flaeche:1.8},moeglich:[{breite:1000,flaeche:1.8}]}}}
];

const vorbereiten=async(page,mess)=>{
 await page.evaluate(([m,kat])=>{
  currentProfile={id:"a1",role:"admin",first_name:"Peter",last_name:"Test",company_id:"c1"};
  allProfiles=[{id:"a1",first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink",legacy_key:"titanzink"},
                        {id:3,name:"Kupfer",legacy_key:"kupfer"},
                        {id:6,name:"Stahl, verzinkt",legacy_key:"stahl_verzinkt"}];
  settings.materials=JSON.parse(JSON.stringify(kat));
  settings.employees=["Peter Test"]; settings.rates=[["Polier","88"]];
  currentProjectId=7; currentReportId=null;
  mats=[]; works=[];
  window.__db.mess=JSON.parse(JSON.stringify(m));
  window.__db.fehler=null; window.__ruf=[]; window.__alert="";
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  $("startScreen").hidden=true;$("reportScreen").hidden=false;
  $("rmatModal").hidden=true;
  renderMain();
 },[mess||MESS,KAT]);
};
const sichtbar=(page,sel)=>page.evaluate(s=>{
 const e=document.querySelector(s); if(!e)return false;
 const r=e.getBoundingClientRect();
 return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden";
},sel);
const klick=async(page,sel,was)=>{
 if(!await sichtbar(page,sel)){p(false,(was||"Element")+" sichtbar und anklickbar ("+sel+")");return false}
 try{await page.click(sel,{timeout:4000});return true}
 catch(e){p(false,(was||"Element")+" anklickbar ("+sel+")",String(e).slice(0,140));return false}
};
async function dialogAuf(page){
 await page.evaluate(async()=>{await rmatOeffnen()});
 await page.waitForTimeout(250);
 return await sichtbar(page,"#rmatModal");
}

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e).slice(0,200)));
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(700);

 // ---------------------------------------------------------------- A
 console.log("\nA  Der Vorschlag - gegen die ECHTEN Katalognamen");
 await vorbereiten(page);
 const v=await page.evaluate(()=>{
  const f=(b,e,m)=>{const l=rmatVorschlaege(b,e,m);
    return {top:l.length?l[0].no:null,zahl:l.length,sicher:rmatIstSicher(l),
            alle:l.map(x=>x.no)}};
  return {
   rinne:  f("Rinne halbrund 330 mm Kupfer","m","Kupfer"),
   halter: f("Rinnenhalter 330 mm","Stk.","Kupfer"),
   halterT:f("Rinnenhalter 250 mm","Stk.","Titanzink"),
   winkel: f("Innenwinkel 330 mm","Stk.","Kupfer"),
   stutzen:f("Schiebestutzen 330 mm Ø 100","Stk.","Kupfer"),
   boden:  f("Rinnenboden links 330 mm","Stk.","Kupfer"),
   blech:  f("Blech Titanzink","m²","Titanzink"),
   nichts: f("Haltebleche (GAVA Blech)","Stk.","Titanzink"),
   einheit:f("Rinnenhalter 330 mm","m","Kupfer"),
   leerBez:f("","Stk.","Kupfer"),
   // Punkte reichen (30 Groesse + 25 Material + 8 Stamm = 63), aber
   // "Aufschraubhalter" und "Rinnenhalter" teilen nur die Endung "halter".
   // Genau daran haengt die Regel "ein ganzes langes Wort muss stimmen".
   stamm:  f("Aufschraubhalter 330 mm","Stk.","Kupfer")
  };
 });
 p(v.rinne.top==="201.02"&&v.rinne.sicher,"Rinne halbrund 330 Kupfer -> 201.02, sicher",v.rinne);
 p(v.halter.top==="202.02"&&v.halter.sicher,"Rinnenhalter 330 Kupfer -> 202.02, sicher",v.halter);
 p(v.halterT.top==="202.11"&&v.halterT.sicher,"Rinnenhalter 250 Titanzink -> 202.11 (Material entscheidet)",v.halterT);
 p(v.boden.top==="203.22","Rinnenboden -> 203.22, NICHT der Rinnenhalter (Name entscheidet vor Material)",v.boden);
 p(v.stutzen.top==="203.42"&&!v.stutzen.sicher,
   "Schiebestutzen -> Einhängestutzen nur als Vorschlag, nicht sicher (Wortstamm reicht nicht)",v.stutzen);
 p(v.blech.zahl>=2&&!v.blech.sicher,
   "Blech Titanzink -> mehrere Dicken, NICHT sicher (die Dicke steht nicht in der Massaufnahme)",v.blech);
 p(v.nichts.zahl===0,"Ohne passende Katalogzeile gibt es KEINEN Vorschlag statt eines falschen",v.nichts);
 p(v.einheit.zahl===0,"Die Einheit ist ein harter Filter: Stk.-Position, m gesucht -> nichts",v.einheit);
 p(v.leerBez.zahl===0,"Leere Bezeichnung ergibt keinen Vorschlag",v.leerBez);
 p(v.winkel.alle.indexOf("202.02")<0,"Ein Rinnenhalter wird nie fuer einen Winkel vorgeschlagen",v.winkel);
 p(v.stamm.top==="202.02"&&!v.stamm.sicher,
   "Punkte allein reichen nicht: ein blosser Wortstamm wird vorgeschlagen, nicht behauptet",v.stamm);

 // ---------------------------------------------------------------- B
 console.log("\nB  Das Angebot - drei Bloecke, nichts neu gerechnet");
 await vorbereiten(page);
 const auf=await dialogAuf(page);
 p(auf,"Der Dialog geht auf");
 const ang=await page.evaluate(()=>rmatAngebot.map(a=>({id:a.id,art:a.art,mid:a.mid,
   bez:a.bez,menge:a.menge,einheit:a.einheit,no:a.no,sicher:a.sicher})));
 const arten=a=>ang.filter(x=>x.art===a);
 p(arten("erfasst").length===1&&arten("erfasst")[0].no==="501.10",
   "Von Hand erfasste Zeile ist unveraendert dabei",arten("erfasst"));
 p(arten("teil").length===6,"Sechs Halbfabrikate: fuenf der Rinne und das Halteblech",
   arten("teil").map(x=>x.bez));
 p(!ang.some(x=>/Blechfläche|Stücke \(Zuschnitte\)|Abwicklung 250/.test(x.bez)&&x.art==="teil"),
   "Abgeleitete Masse (Abwicklung, Blechflaeche, Stueckzahl) sind NICHT dabei",
   ang.filter(x=>x.art==="teil").map(x=>x.bez));
 const blech=arten("blech");
 // Je Massaufnahme mit gespeichertem Zuschnittplan genau EINE Blechzeile.
 // Einlaufblech: 2000x250 + 1900x250 + 1200x250 = 5100x250 mm = 1,275 m².
 const bl12=blech.find(x=>x.mid===12);
 p(blech.length===2&&bl12&&Math.abs(bl12.menge-1.275)<0.002&&bl12.einheit==="m²",
   "Blechzuschnitte: 1,275 m² aus den drei gespeicherten Stuecken",blech);
 const anz=await page.evaluate(()=>{
  const e=rmatAngebot.find(a=>a.art==="blech");
  return {stueck:e&&e.stueck,netto:e&&e.netto,brutto:e&&e.brutto,basis:e&&e.basis};
 });
 p(anz.stueck===3&&anz.netto===1.275&&anz.brutto===2&&anz.basis==="netto",
   "Netto und Brutto stehen beide bereit, Vorgabe ist netto",anz);
 // Zweite Blechzeile: Freies Profil mit zwei Gruppen zu 300 und 180 mm.
 // 2000x300 + 1000x300 + 1500x180 = 0,9 + 0,27 = 1,17 m² - jede Gruppe mit
 // IHRER Breite. Eine einzige angenommene Breite ergaebe 1,35 bzw. 0,81.
 const bl2=await page.evaluate(()=>{
  const e=rmatAngebot.find(a=>a.art==="blech"&&a.mid===13);
  return e?{menge:e.menge,stueck:e.stueck,netto:e.netto}:null;
 });
 p(bl2&&bl2.stueck===3&&Math.abs(bl2.netto-1.17)<0.002,
   "Jede Zuschnittgruppe zaehlt mit IHRER Breite (1,17 m², nicht 1,35)",bl2);
 const rufe=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="measurements"));
 p(rufe.length===1,"Genau EINE Abfrage fuer den ganzen Dialog",rufe.length);
 p(JSON.stringify(rufe[0].filter)==='[["project_id","eq",7]]',
   "Nur nach project_id gefiltert - KEIN company_id im Client",rufe[0].filter);

 // ---------------------------------------------------------------- C
 console.log("\nC  Vorwahl und Uebernahme");
 const vor=await page.evaluate(()=>({
  gewaehlt:[...rmatAuswahl],
  sicher:rmatAngebot.filter(a=>a.sicher).map(a=>a.id),
  unsicherGewaehlt:rmatAngebot.filter(a=>!a.sicher&&rmatAuswahl.has(a.id)).map(a=>a.bez)
 }));
 p(vor.unsicherGewaehlt.length===0,
   "Nichts Unsicheres ist vorgewaehlt - die App behauptet nicht, sie schlaegt vor",vor.unsicherGewaehlt);
 p(vor.gewaehlt.length>=3,"Die sicheren Zeilen sind vorgewaehlt",vor.gewaehlt.length);

 const knopf=await page.evaluate(()=>({text:$("rmatUebernehmenBtn").textContent.trim(),
   gesperrt:$("rmatUebernehmenBtn").disabled}));
 p(/\((\d+)\)/.test(knopf.text)&&!knopf.gesperrt,"Der Knopf traegt die Zahl der Zeilen",knopf);

 // Eine unsichere Zeile dazunehmen und eine auf "freie Position" stellen
 const uebernommen=await page.evaluate(async()=>{
  // Schiebestutzen: unsicher, Vorschlag 203.42 -> annehmen
  const st=rmatAngebot.find(a=>/Schiebestutzen/.test(a.bez));
  if(!st)return {fehlt:"Schiebestutzen"};
  rmatAuswahl.add(st.id);
  // Halteblech: kein Vorschlag -> freie Position
  const hb=rmatAngebot.find(a=>/Haltebleche/.test(a.bez));
  if(!hb)return {fehlt:"Halteblech"};
  hb.no="__frei"; rmatAuswahl.add(hb.id);
  // Blech: auf brutto stellen
  const bl=rmatAngebot.find(a=>a.art==="blech");
  if(!bl)return {fehlt:"Blechzeile"};
  bl.basis="brutto"; bl.menge=bl.brutto; rmatAuswahl.add(bl.id);
  $("rmatUebernehmenBtn").click();
  await new Promise(r=>setTimeout(r,150));
  return {mats:JSON.parse(JSON.stringify(mats)),alert:window.__alert,
          zu:$("rmatModal").hidden};
 });
 if(uebernommen.fehlt){p(false,"Uebernahme nicht pruefbar: "+uebernommen.fehlt+" fehlt im Angebot");}
 const m=uebernommen.mats||[];
 const nr=x=>m.find(z=>z.no===x);
 p(uebernommen.zu,"Der Dialog schliesst nach der Uebernahme");
 p(!!nr("501.10")&&nr("501.10").qty===40,"Die erfasste Zeile ist uebernommen",nr("501.10"));
 p(!!nr("201.02")&&Math.abs(nr("201.02").qty-18.4)<0.01,
   "Die Rinne steht mit 18,40 m unter 201.02",nr("201.02"));
 p(!!nr("202.02")&&nr("202.02").qty===25,"25 Rinnenhalter unter 202.02",nr("202.02"));
 p(!!nr("203.42")&&nr("203.42").qty===1,"Der angenommene Vorschlag steht unter 203.42",nr("203.42"));
 const frei=m.filter(z=>typeof istFreiePosition==="function"&&false)||[];
 const freieZ=m.filter(z=>/^999\./.test(String(z.no)));
 p(freieZ.length===1&&freieZ[0].qty===11&&/Haltebleche/.test(freieZ[0].desc||""),
   "Ohne Katalogtreffer: freie Position 999.9x MIT der Bezeichnung",freieZ);
 p(freieZ.length===1&&freieZ[0].unit==="Stk.","Die freie Position traegt die Einheit mit",freieZ[0]);
 p(!m.some(z=>z.no&&!/^999\./.test(String(z.no))&&!KAT.some(k=>k[0]===z.no)),
   "KEINE erfundene Katalognummer im Rapport",m.map(z=>z.no));
 const bl=m.find(z=>z.no==="103.01"||z.no==="103.02"||z.no==="103.51");
 p(!!bl&&bl.qty===2,"Das Blech steht mit der gewaehlten Brutto-Flaeche (2 m²)",bl);
 p(/freie Position/.test(uebernommen.alert||""),
   "Die Meldung nennt die freie Position, statt sie zu verschweigen",uebernommen.alert);
 const daten=m.map(z=>z.date);
 p(daten.every(d=>d==="2026-09-01"||d==="2026-09-02"),
   "Jede Zeile traegt das Datum ihrer Massaufnahme",daten);

 // ---------------------------------------------------------------- D
 console.log("\nD  Bedienung");
 await vorbereiten(page); await dialogAuf(page);
 const wechsel=await page.evaluate(async()=>{
  const sel=document.querySelector('[data-rmat-pos]');
  if(!sel)return {kein:true};
  const id=sel.dataset.rmatPos;
  sel.setAttribute("data-merker","1");
  const opt=[...sel.options].map(o=>o.value);
  sel.value="__frei";
  sel.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,120));
  const jetzt=document.querySelector('[data-rmat-pos="'+id+'"]');
  return {opt,gesetzt:(rmatAngebot.find(a=>a.id===id)||{}).no,
   nichtErsetzt:!!(jetzt&&jetzt.getAttribute("data-merker")==="1")};
 });
 p(!wechsel.kein&&wechsel.opt[wechsel.opt.length-1]==="__frei",
   "Die freie Position steht IMMER als letzte Wahl bereit",wechsel.opt);
 p(wechsel.gesetzt==="__frei","Die gewaehlte Position landet im Angebot",wechsel.gesetzt);
 p(wechsel.nichtErsetzt,
   "Die Liste wird beim Waehlen NICHT neu gezeichnet (sonst springt die Auswahl)");

 const basis=await page.evaluate(async()=>{
  const r=document.querySelector('[data-rmat-basis][value="brutto"]');
  if(!r)return {kein:true};
  r.checked=true; r.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(x=>setTimeout(x,100));
  const e=rmatAngebot.find(a=>a.art==="blech");
  if(!e)return {kein:true};
  return {basis:e.basis,menge:e.menge,brutto:e.brutto};
 });
 p(!basis.kein&&basis.basis==="brutto"&&basis.menge===basis.brutto,
   "Der Wechsel netto -> brutto setzt die Menge",basis);

 const hilfe=await page.evaluate(()=>{
  const t=(typeof HILFE_TEXTE==="object"&&HILFE_TEXTE["rmat-uebernehmen"])||null;
  return t?t.text:"";
 });
 // Erst die Auszeichnung weg: "freie <b>Position</b>" darf nicht daran
 // scheitern, dass ein Tag mitten im Wort steht.
 const hText=hilfe.replace(/<[^>]*>/g," ").replace(/\s+/g," ");
 p(/Blechzuschnitte/.test(hText)&&/Halbfabrikate/.test(hText)
   &&/freie Position/i.test(hText)&&/schlägt die App vor|Vorschlag/i.test(hText),
   "Der Hilfetext beschreibt den neuen Weg",hText.slice(0,160));
 p(!/erfundene wäre schlimmer als keine/.test(hilfe),
   "Der ueberholte Satz 'erscheint hier bewusst nicht' steht nicht mehr im Hilfetext");

 for(const b of [320,390,768,1280]){
  await page.setViewportSize({width:b,height:900});
  await page.waitForTimeout(150);
  const ue=await page.evaluate(()=>{
   const raus=[];
   document.querySelectorAll("#rmatModal *").forEach(e=>{
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>window.innerWidth+1)raus.push((e.id||e.className||e.tagName)+" "+Math.round(r.right));
   });
   return {ue:raus.slice(0,4),scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(ue.ue.length===0&&!ue.scroll,"Bei "+b+" px laeuft nichts aus dem Bild",ue);
 }
 await page.setViewportSize({width:412,height:900});

 // ---------------------------------------------------------------- E
 console.log("\nE  Werkstatt: grosser Knopf, Vorgabe nur meine");
 await page.setViewportSize({width:412,height:900});
 const werk=await page.evaluate(()=>{
  $("rmatModal").hidden=true;
  $("reportScreen").hidden=true; $("startScreen").hidden=false;
  const m=s=>{const e=document.querySelector(s); if(!e)return null;
   const r=e.getBoundingClientRect();
   return {b:Math.round(r.width),h:Math.round(r.height),d:getComputedStyle(e).display}};
  pmUebernehmen({}); werkstattKnopfAktualisieren();
  const aus=m("#navWerkstatt");
  pmUebernehmen({haupt:true,werkstatt:true}); werkstattKnopfAktualisieren();
  const an=m("#navWerkstatt");
  const proj=m("#startOpenProjects");
  const k=document.querySelector("#navWerkstatt");
  return {aus,an,proj,
   imNav:!!(k&&k.closest("#startNav")),
   gross:!!(k&&k.classList.contains("start-nav-btn")),
   klein:document.querySelectorAll("#navWerkstatt.gray").length};
 });
 p(werk.imNav&&werk.gross,"Die Werkstatt ist ein grosser Knopf im Startraster",werk);
 p(werk.klein===0,"Der kleine graue Werkstatt-Knopf ist weg - es gibt nur einen",werk.klein);
 p(werk.an&&werk.an.h>=90&&werk.an.b>=140,"Er ist so gross wie der Projekte-Knopf",{werk:werk.an,proj:werk.proj});
 p(werk.aus&&werk.aus.d==="none"&&werk.aus.h===0,
   "Ohne das Modul ist er wirklich versteckt (display:flex schlaegt sonst [hidden])",werk.aus);

 const filt=await page.evaluate(()=>{
  const vorher=localStorage.getItem("sd_werkFilter");
  localStorage.removeItem("sd_werkFilter");
  const vorgabe=werkFilterGemerkt();
  localStorage.setItem("sd_werkFilter","alle");
  const gemerkt=werkFilterGemerkt();
  if(vorher===null)localStorage.removeItem("sd_werkFilter"); else localStorage.setItem("sd_werkFilter",vorher);
  return {vorgabe,gemerkt};
 });
 p(filt.vorgabe==="meine","Ohne eigene Wahl zeigt die Werkstatt nur die eigenen Massaufnahmen",filt);
 p(filt.gemerkt==="alle","Eine bereits getroffene Wahl bleibt bestehen",filt);
 const leer=await page.evaluate(()=>{
  const f=(typeof renderWerkstatt==="function");
  werkZeilen=[]; werkFilter="meine"; werkFehler=null;
  pmUebernehmen({haupt:true,werkstatt:true});
  $("werkstattModal").hidden=false;
  if(f)renderWerkstatt();
  const t=$("werkstattBody").innerText;
  $("werkstattModal").hidden=true;
  return t;
 });
 p(/zugeteilt/i.test(leer)&&/Alle/.test(leer),
   "Der Leerzustand sagt, dass nur die eigenen gezeigt werden und wo alle stehen",leer.slice(0,180));

 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n"+(fail?"FEHLGESCHLAGEN":"BESTANDEN")+"  "+ok+" von "+(ok+fail));
 await browser.close();
 process.exit(fail?1:0);
})().catch(e=>{console.log("ABBRUCH: "+e);process.exit(1)});

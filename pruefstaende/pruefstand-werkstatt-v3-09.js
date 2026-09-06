// Prueft die Werkstatt- und Ruestansicht (v3.09):
//   - bei AUS ist der Startknopf weg und die Ansicht unerreichbar,
//   - sie ersetzt den bestehenden Ablauf NICHT: bestaetigt wird ueber
//     dieselbe Stelle (aufgabeAusfuehren -> measurement_geruestet),
//   - die Statuskette bleibt unveraendert,
//   - der Ruester sieht die echte Ruestgrundlage - Material, Zuschnitt,
//     Reservierungen, Reststuecke - aus DENSELBEN Funktionen wie das
//     Projekt-Cockpit, nicht aus einer zweiten Rechnung,
//   - ein VERALTETER Freigabestand ist gekennzeichnet und NICHT
//     bestaetigbar (Auftrag Abschnitt 15),
//   - nur aktivierte Untermodule erscheinen in der Ruestgrundlage,
//   - kein company_id-Filter im Client.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-werkstatt-v3-09.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,360):""))}};

const STUB=`window.__ruf=[];
window.__db={mess:[],res:[],fehler:null};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.delete=()=>{st.op='delete';return f};
 const quelle=()=>name==='measurements'?window.__db.mess:
               (name==='material_reservierungen'?window.__db.res:[]);
 const passt=r=>st.filter.every(([k,art,v])=>art==='is'?(r[k]===null||r[k]===undefined)
   :(art==='in'?v.indexOf(r[k])>=0:r[k]===v));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice()});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  return {data:quelle().filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});return {data:{id:(a&&a.p_id)||0,workflow_status:'geruestet'},error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const ICH="aaaa1111-1111-1111-1111-111111111111";
const ANDERER="bbbb2222-2222-2222-2222-222222222222";

// Projekt 7: zwei Massaufnahmen zum Ruesten (eine davon meine), eine mit
// verfallener Freigabe. Projekt 8: eine zu montieren.
const MESS=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",date:"2026-09-01",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,
  data:{material:2,abwicklung:250,
   ausmass:[{pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"1,90",einheit:"m"}],
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],optimal:true}}},
 {id:12,project_id:7,type:"kehle",title:"Kehle West",date:"2026-09-02",
  workflow_status:"zu_ruesten",freigabe_verfallen:true,ruester_id:ANDERER,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T11:00:00Z",created_by:ICH,
  data:{material:3,abwicklung:500,
   ausmass:[{pos:1,bezeichnung:"Blechfläche",menge:"1,00",einheit:"m²"}],
   rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}}},
 {id:13,project_id:8,type:"lukarne",title:"Lukarne Ost",date:"2026-09-03",
  workflow_status:"zu_montieren",freigabe_verfallen:false,ruester_id:ANDERER,monteur_id:ICH,
  geruestet_am:"2026-09-04T08:00:00Z",montiert_am:null,updated_at:"2026-09-05T09:00:00Z",created_by:ICH,
  data:{material:2,ausmass:[{pos:1,bezeichnung:"Fläche",menge:"3,00",einheit:"m²"}]}},
 {id:16,project_id:7,type:"mauerabdeckung",title:"Mauer Süd",date:"2026-09-03",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ANDERER,monteur_id:null,
  geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T08:00:00Z",created_by:ICH,
  data:{material:2,ausmass:[{pos:1,bezeichnung:"Länge",menge:"4,00",einheit:"m"}]}},
 // Nicht in der Werkstatt: noch in Bearbeitung bzw. schon abgeschlossen.
 {id:14,project_id:7,type:"rinne",title:"Rinne",workflow_status:"in_bearbeitung",
  freigabe_verfallen:false,ruester_id:null,monteur_id:null,updated_at:"2026-09-01T09:00:00Z",created_by:ICH,data:{}},
 {id:15,project_id:8,type:"rinne",title:"Fertig",workflow_status:"abgeschlossen",
  freigabe_verfallen:false,ruester_id:null,monteur_id:null,updated_at:"2026-09-01T09:00:00Z",created_by:ICH,data:{}}
];
const RES=[
 {id:301,project_id:7,material_name:"Titanzink",bezeichnung:"Zuschnitt 1200 × 250 mm",
  menge:1,einheit:"Stk",status:"reserviert",breite_mm:250,laenge_mm:1200}
];
const RESTE=[
 {id:501,material_name:"Titanzink",breite_mm:250,laenge_mm:1400,anzahl:1,verbraucht:false,
  reserviert_fuer_project_id:7},
 {id:502,material_name:"Kupfer",breite_mm:500,laenge_mm:900,anzahl:1,verbraucht:false,
  reserviert_fuer_project_id:null}
];

const vorbereiten=async(page,module,alsAdmin)=>{
 await page.evaluate(([mess,res,reste,mod,ich,admin])=>{
  currentProfile={id:ich,role:admin?"admin":"employee",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"},
               {id:"bbbb2222-2222-2222-2222-222222222222",first_name:"Anna",last_name:"Muster"}];
  meineRechte={admin:!!admin}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"},
               {id:8,name:"Neubau",object:"Feldweg 3, 3011 Bern"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true;
  reststuecke=JSON.parse(JSON.stringify(reste));
  window.__db.mess=JSON.parse(JSON.stringify(mess));
  window.__db.res=JSON.parse(JSON.stringify(res));
  window.__db.fehler=null;
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
  $("projectCockpitModal").hidden=true;$("werkstattModal").hidden=true;
  werkOffen=null; werkGrundlage=null; werkFilter="alle";
  werkstattKnopfAktualisieren();
  window.__ruf=[];
 },[MESS,RES,RESTE,module,ICH,!!alsAdmin]);
};

const sichtbar=(page,sel)=>page.evaluate(s=>{
 const e=document.querySelector(s); if(!e)return false;
 const r=e.getBoundingClientRect();
 return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden";
},sel);
const klick=async(page,sel,was)=>{
 if(!await sichtbar(page,sel)){p(false,(was||"Element")+" sichtbar und anklickbar ("+sel+")");return false}
 try{await page.click(sel,{timeout:4000});return true}
 catch(e){p(false,(was||"Element")+" anklickbar ("+sel+")",String(e).slice(0,120));return false}
};

const stand=page=>page.evaluate(()=>{
 const b=$("werkstattBody"), m=$("werkstattModal"), k=$("navWerkstatt");
 const kr=k?k.getBoundingClientRect():{width:0,height:0};
 return {
  knopfHidden:k?k.hidden:null, knopfHoehe:Math.round(kr.height),
  modalHidden:m?m.hidden:null,
  zahl:($("werkstattCount").textContent||"").trim(),
  text:b.textContent.replace(/\s+/g," ").trim(),
  projekte:[...b.querySelectorAll(".werk-projekt")].map(x=>
    (x.querySelector(".werk-kopf-titel b")||{}).textContent||""),
  zeilen:[...b.querySelectorAll(".werk-zeile")].map(x=>x.textContent.replace(/\s+/g," ").trim()),
  ruesten:[...b.querySelectorAll('[data-aufgabe="ruesten"]')].map(x=>x.dataset.aufgabeId),
  montieren:[...b.querySelectorAll('[data-aufgabe="montieren"]')].map(x=>x.dataset.aufgabeId),
  auf:[...b.querySelectorAll("[data-werk-auf]")].map(x=>x.dataset.werkAuf),
  projektknopf:[...b.querySelectorAll("[data-werk-projekt]")].map(x=>x.dataset.werkProjekt),
  messknopf:[...b.querySelectorAll("[data-werk-mess]")].map(x=>x.dataset.werkMess),
  grundlage:(b.querySelector(".werk-grundlage")||{}).textContent||"",
  // Nur die Ueberschrift des Blocks - im Zuschnitt stehen weitere <b>.
  bloecke:[...b.querySelectorAll(".werk-block-titel b")].map(x=>x.textContent),
  reservierteReste:(b.querySelector(".werk-block:last-of-type")||{textContent:""})
    .textContent.split("Reservierte Reststücke:")[1]||""
 };
});

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,160)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 const ALLES={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};

 console.log("\nA · bei AUS ist die Werkstatt unerreichbar");
 await vorbereiten(page,{});
 let s=await stand(page);
 p(s.knopfHidden===true&&s.knopfHoehe===0,"Startknopf weg",{h:s.knopfHidden,y:s.knopfHoehe});
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(60);
 s=await stand(page);
 p(s.modalHidden===true,"und die Ansicht laesst sich nicht oeffnen",{m:s.modalHidden});
 let ruf=await page.evaluate(()=>window.__ruf.length);
 p(ruf===0,"es wird nichts geladen",{n:ruf});

 await vorbereiten(page,{haupt:false,werkstatt:true});
 s=await stand(page);
 p(s.knopfHidden===true,"Untermodul an, Hauptschalter aus: weiterhin weg");

 console.log("\nB · eingeschaltet");
 await vorbereiten(page,ALLES);
 s=await stand(page);
 p(s.knopfHidden===false&&s.knopfHoehe>20,"Startknopf da",{h:s.knopfHidden,y:s.knopfHoehe});
 await klick(page,"#navWerkstatt","Werkstatt-Knopf");
 await page.waitForTimeout(120);
 s=await stand(page);
 p(s.modalHidden===false,"Ansicht offen");
 p(s.projekte.length===2,"nach Projekt gruppiert",{n:s.projekte.length,pr:s.projekte});
 p(s.projekte.some(t=>/Musterstrasse 12/.test(t))&&s.projekte.some(t=>/Feldweg 3/.test(t)),
   "mit der Adresse als Titel",s.projekte);
 p(s.zeilen.length===4,"nur die vier Massaufnahmen in der Werkstatt",{n:s.zeilen.length});
 p(!/Rinne/.test(s.text),"in Bearbeitung und abgeschlossen erscheinen nicht");
 p(s.zahl==="4","Zaehler zeigt 4",{z:s.zahl});

 const abfragen=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle));
 p(abfragen.length===2,"zwei Abfragen fuer die ganze Liste",{n:abfragen.length,a:abfragen.map(x=>x.tabelle)});
 p(abfragen.every(a=>JSON.stringify(a.filter).indexOf("company_id")<0),
   "kein company_id-Filter im Client - das erzwingt die Datenbank");
 const messabfrage=abfragen.find(a=>a.tabelle==="measurements");
 p(messabfrage&&JSON.stringify(messabfrage.filter).indexOf('"zu_ruesten"')>=0,
   "gefiltert auf die Werkstatt-Status",messabfrage&&messabfrage.filter);

 console.log("\nC · die Statuskette bleibt unveraendert");
 const kette=await page.evaluate(()=>MW_REIHENFOLGE.join(">"));
 p(kette==="in_bearbeitung>freigegeben>zu_ruesten>geruestet>zu_montieren>montiert>abgeschlossen",
   "dieselbe Kette wie in v3.05",{k:kette});
 const status=await page.evaluate(()=>WERK_STATUS.every(s=>MW_REIHENFOLGE.indexOf(s)>=0));
 p(status===true,"und die Werkstatt zeigt nur Zustaende daraus");

 console.log("\nD · veralteter Freigabestand");
 s=await stand(page);
 p(/Freigabe verfallen/.test(s.text),"wird gekennzeichnet");
 p(/erneut freigegeben/.test(s.text),"mit dem Grund");
 p(s.ruesten.indexOf("12")<0,"und ist NICHT bestaetigbar",s.ruesten);
 p(s.ruesten.indexOf("11")>=0,"die gueltige schon",s.ruesten);

 console.log("\nE · nur die eigene Zuweisung darf bestaetigen");
 // 11 = mir zugewiesen, 16 = einem anderen zugewiesen (beide gueltig),
 // 12 = verfallen. Der Mitarbeiter darf nur 11.
 p(s.ruesten.join(",")==="11","als Mitarbeiter nur die eigene",s.ruesten);
 p(s.ruesten.indexOf("16")<0,"die fremde Zuweisung NICHT",s.ruesten);
 p(s.montieren.join(",")==="13","und die eigene Montage",s.montieren);
 await vorbereiten(page,ALLES,true);
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(120);
 let sa=await stand(page);
 p(sa.ruesten.slice().sort().join(",")==="11,16",
   "als Admin beide gueltigen, aber nicht die verfallene",sa.ruesten);

 console.log("\nF · bestaetigen laeuft ueber den bestehenden Weg");
 await vorbereiten(page,ALLES);
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(120);
 await klick(page,'[data-aufgabe="ruesten"][data-aufgabe-id="11"]',"Ruesten bestaetigen");
 await page.waitForTimeout(120);
 const rpcs=await page.evaluate(()=>window.__ruf.filter(r=>r.rpc));
 p(rpcs.length===1&&rpcs[0].rpc==="measurement_geruestet"&&rpcs[0].args.p_id===11,
   "genau die bestehende Datenbankfunktion",rpcs);
 const eigene=await page.evaluate(()=>{
  const s=document.querySelector('script[src="js/51-werkstatt.js"]');return !!s;
 });
 p(eigene,"das Werkstattmodul ist geladen");
 // Unter file:// verweigert der Browser fetch auf eine lokale Datei -
 // deshalb hier in Node lesen statt im Browser.
 const quelltext=require("fs").readFileSync("js/51-werkstatt.js","utf8");
 const kein2={rpc:/\bsb\.rpc\(/.test(quelltext), aufgabe:/data-aufgabe=/.test(quelltext)};
 p(kein2.rpc===false&&kein2.aufgabe===true,
   "und ruft KEINE eigene rpc - es benutzt data-aufgabe aus js/45",kein2);

 console.log("\nG · Ruestgrundlage");
 await vorbereiten(page,ALLES);
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(120);
 s=await stand(page);
 p(s.auf.length===2,"je Projekt ein Knopf",{n:s.auf.length});
 p(s.grundlage==="","zuerst zugeklappt");
 await klick(page,'[data-werk-auf="7"]');
 await page.waitForTimeout(160);
 s=await stand(page);
 p(s.bloecke.join("|")==="Material|Zuschnitt|Reservierungen",
   "Material, Zuschnitt und Reservierungen",s.bloecke);
 p(/Titanzink/.test(s.grundlage)&&/Kupfer/.test(s.grundlage),"beide Materialien",{g:s.grundlage.slice(0,160)});
 p(/1'200 × 250 mm|1200 × 250/.test(s.grundlage),"mit den Zuschnitten",{g:s.grundlage.slice(0,400)});
 p(/Zuschnitt 1200 × 250 mm/.test(s.grundlage),"die Reservierung",{g:s.grundlage.slice(0,600)});
 p(/1400 × 250 mm/.test(s.grundlage),"und das reservierte Reststueck",{g:s.grundlage.slice(0,900)});
 p(/1400 × 250/.test(s.reservierteReste)&&!/900/.test(s.reservierteReste),
   "und zwar nur das fuer DIESES Projekt reservierte",{r:s.reservierteReste.slice(0,120)});

 // Dieselbe Rechnung wie im Cockpit - nicht eine zweite. Verglichen wird
 // nicht die Existenz der Funktion, sondern der GEZEIGTE Inhalt gegen das,
 // was pmatSammeln/pzuSammeln fuer dieselbe Liste liefern.
 const gleich=await page.evaluate(()=>{
  const liste=window.__db.mess.filter(m=>m.project_id===7);
  const soll=[];
  pmatSammeln(liste).forEach(g=>g.positionen.forEach(pos=>
    soll.push(g.material+"|"+pos.bezeichnung)));
  const block=[...$("werkstattBody").querySelectorAll(".werk-block")]
    .find(x=>/^Material/.test(x.textContent));
  const ist=block?[...block.querySelectorAll("tbody tr")].map(tr=>{
    const td=tr.querySelectorAll("td");
    return (td[0]?td[0].textContent:"")+"|"+(td[1]?td[1].textContent:"");
  }):[];
  const zsoll=pzuSammeln(liste).materialien.map(M=>M.material).sort().join(",");
  const zblock=[...$("werkstattBody").querySelectorAll(".werk-block")]
    .find(x=>/^Zuschnitt/.test(x.textContent));
  const zist=zblock?[...zblock.querySelectorAll(".pmat-kopf b")].map(x=>x.textContent).sort().join(","):"";
  return {soll:soll.sort(),ist:ist.sort(),zsoll,zist};
 });
 p(gleich.soll.length>0&&JSON.stringify(gleich.soll)===JSON.stringify(gleich.ist),
   "die gezeigten Materialzeilen sind genau die von pmatSammeln",gleich);
 p(gleich.zsoll.length>0&&gleich.zsoll===gleich.zist,
   "und der Zuschnitt genau der von pzuSammeln",{s:gleich.zsoll,i:gleich.zist});

 await klick(page,'[data-werk-auf="7"]');
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.grundlage==="","laesst sich wieder zuklappen");

 console.log("\nH · nur aktivierte Untermodule");
 await vorbereiten(page,{haupt:true,werkstatt:true});
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(120);
 await klick(page,'[data-werk-auf="7"]');
 await page.waitForTimeout(160);
 s=await stand(page);
 p(s.bloecke.length===0,"ohne Material/Zuschnitt/Reservierung kein Block",s.bloecke);
 p(/alle drei sind ausgeschaltet/.test(s.grundlage),"und es wird gesagt warum",{g:s.grundlage.slice(0,160)});

 await vorbereiten(page,{haupt:true,material:true,werkstatt:true});
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(120);
 await klick(page,'[data-werk-auf="7"]');
 await page.waitForTimeout(160);
 s=await stand(page);
 p(s.bloecke.join("|")==="Material","nur Material, wenn nur Material an ist",s.bloecke);

 console.log("\nI · Filter und Navigation");
 await vorbereiten(page,ALLES);
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(120);
 await klick(page,'[data-werk-filter="montieren"]');
 await page.waitForTimeout(60);
 s=await stand(page);
 p(s.zeilen.length===1&&/Lukarne/.test(s.zeilen[0]),"Filter Zu montieren",s.zeilen);
 await klick(page,'[data-werk-filter="meine"]');
 await page.waitForTimeout(60);
 s=await stand(page);
 p(s.zeilen.length===2,"Filter Nur meine zeigt beide eigenen",{n:s.zeilen.length});
 await klick(page,'[data-werk-filter="alle"]');
 await page.waitForTimeout(60);
 s=await stand(page);
 p(s.zeilen.length===4,"und zurueck auf alle");
 p(s.projektknopf.length===2&&s.messknopf.length===4,
   "kein Sackgasse: Projekt und Massaufnahme sind erreichbar",
   {pr:s.projektknopf.length,me:s.messknopf.length});

 console.log("\nJ · Fehler und Hilfe");
 await page.evaluate(()=>{window.__db.fehler="permission denied"});
 await page.evaluate(()=>werkstattNeuLaden());
 await page.waitForTimeout(120);
 s=await stand(page);
 p(/konnte nicht geladen werden/.test(s.text),"Ladefehler wird gesagt",{t:s.text.slice(0,120)});
 p(s.zeilen.length===0,"und nichts vorgetaeuscht");
 await page.evaluate(()=>{window.__db.fehler=null});

 const hilfe=await page.evaluate(()=>{
  const b=$("werkstattModal").querySelector("[data-hilfe]");
  return {key:b?b.dataset.hilfe:null,
          hatText:!!(typeof HILFE_TEXTE==="object"&&HILFE_TEXTE["werkstatt"]),
          beschriftet:!!(b&&b.getAttribute("aria-label"))};
 });
 p(hilfe.key==="werkstatt"&&hilfe.hatText&&hilfe.beschriftet,"Info-Knopf mit Text",hilfe);

 console.log("\nK · Breiten");
 await vorbereiten(page,ALLES);
 await page.evaluate(()=>werkstattOeffnen());
 await page.waitForTimeout(120);
 await klick(page,'[data-werk-auf="7"]');
 await page.waitForTimeout(160);
 for(const w of [320,390,768,1200]){
  await page.setViewportSize({width:w,height:900});
  await page.waitForTimeout(40);
  const ueber=await page.evaluate(()=>{
   const b=$("werkstattBody"); const raus=[];
   b.querySelectorAll("*").forEach(e=>{
    if(e.closest(".scroll"))return;             // darf seitlich scrollen
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>document.documentElement.clientWidth+1)
     raus.push((e.className||e.tagName)+" "+Math.round(r.right));
   });
   return {raus:raus.slice(0,4),seite:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(ueber.raus.length===0&&!ueber.seite,w+" px: nichts laeuft seitlich hinaus",ueber);
 }

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await browser.close();
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

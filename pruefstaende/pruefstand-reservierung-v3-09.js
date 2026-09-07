// Prueft die Materialreservierung und die Reststueckreservierung (v3.09):
//   - bei AUS ist die Karte unsichtbar und es wird nicht einmal geladen,
//   - "Bedarf uebernehmen" nimmt genau das, was die Materialuebersicht
//     ohnehin zeigt - es wird nichts neu gerechnet und nichts erfunden,
//   - zweimal uebernehmen legt nichts doppelt an,
//   - der Client schickt NIE eine company_id mit,
//   - jeder Statuswechsel geht an die Datenbank; ein still blockiertes
//     UPDATE (0 Zeilen) gilt NICHT als Erfolg,
//   - ein Reststueck wird nie automatisch eingeplant: erst der Klick
//     reserviert es, danach ist es fuer andere Projekte gesperrt,
//   - Freigeben macht es wieder frei, Verbrauchen behaelt die Projektspur,
//   - der Verlauf zeigt deutsche Bezeichnungen statt der Rohwerte.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-reservierung-v3-09.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,360):""))}};

// Der Stub bildet material_reservierungen und reststuecke im Speicher nach.
// window.__db.blockiert schaltet das nach, was RLS bei fehlendem Recht tut:
// kein Fehler, aber 0 betroffene Zeilen.
const STUB=`window.__ruf=[];
window.__db={reservierungen:[],reste:[],naechste:100,blockiert:false,fehler:null};
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
 const quelle=()=>name==='material_reservierungen'?window.__db.reservierungen:
               (name==='reststuecke'?window.__db.reste:[]);
 const passt=r=>st.filter.every(([k,art,v])=>art==='is'?(r[k]===null||r[k]===undefined)
   :(art==='in'?v.indexOf(r[k])>=0:r[k]===v));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice(),werte:st.werte});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  if(st.op==='insert'){
   if(window.__db.blockiert)return {data:[],error:null};
   const rows=(Array.isArray(st.werte)?st.werte:[st.werte]).map(w=>({
     id:window.__db.naechste++,company_id:'FIRMA-AUS-DER-DB',
     status:'benoetigt',reserviert_von:null,reserviert_am:null,...w}));
   quelle().push(...rows); return {data:rows,error:null};
  }
  if(st.op==='update'){
   if(window.__db.blockiert)return {data:[],error:null};
   const treffer=quelle().filter(passt);
   treffer.forEach(r=>Object.assign(r,st.werte));
   return {data:treffer.map(r=>({...r})),error:null};
  }
  if(st.op==='delete'){
   if(window.__db.blockiert)return {data:[],error:null};
   const treffer=quelle().filter(passt);
   window.__db[name==='material_reservierungen'?'reservierungen':'reste']=quelle().filter(r=>!passt(r));
   return {data:treffer,error:null};
  }
  return {data:quelle().filter(passt).map(r=>({...r})),error:null};
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
})};`;

// Zwei Massaufnahmen mit gespeichertem Ausmass und Zuschnitt, ein drittes
// Material - genau wie im Materialpruefstand, damit beide dieselbe Quelle
// benutzen und nicht auseinanderlaufen koennen.
// Seit v3.18 nimmt die Reservierung nur Teile und Zuschnitte (Abschnitt 123).
// Die Ausmass-Zeilen tragen hier bewusst KEIN teil-Feld - das ist der echte
// Zustand eines vor v3.17 gespeicherten Datensatzes, und genau dann greift
// der Rueckfall nach Typ. Jede Aufnahme hat deshalb mindestens ein echtes
// Teil, damit die Mechanik (ein Insert, Quelle, Statuswechsel) weiterhin an
// Ausmass-Zeilen UND Zuschnitten geprueft wird.
const AUFNAHMEN=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",
  data:{material:2,abwicklung:250,
   ausmass:[{pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"1,90",einheit:"m"},
            {pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:2,einheit:"Stk."},
            {pos:3,bezeichnung:"Enge Seite",menge:"–",einheit:""},
            {pos:4,bezeichnung:"Haltebleche (GAVA Blech)",menge:5,einheit:"Stk."}],
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],optimal:true}}},
 {id:12,project_id:7,type:"anschlussblech",title:"Ortblech Süd",
  data:{material:3,abwicklung:500,
   ausmass:[{pos:1,bezeichnung:"Bleilappen",menge:8,einheit:"Stk."},
            {pos:2,bezeichnung:"Blechfläche",menge:"1,00",einheit:"m²"},
            // Ein echtes TEIL mit einer Textmenge - js/20 weist den Bleilappen
            // als eigenes Material ohne erfundene Menge aus (CLAUDE.md 105.3).
            // Damit prueft die Textsperre unten wirklich die Textsperre und
            // nicht nur den Teile-Filter.
            {pos:3,bezeichnung:"Bleilappen (eigenes Material)",menge:"–",einheit:""}],
   rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}}}
];

const RESTE=[
 {id:501,material_name:"Titanzink",breite_mm:250,laenge_mm:1400,anzahl:1,verbraucht:false,
  reserviert_fuer_project_id:null,reserviert_von:null,reserviert_am:null},
 {id:502,material_name:"Titanzink",breite_mm:250,laenge_mm:900,anzahl:1,verbraucht:false,
  reserviert_fuer_project_id:99,reserviert_von:null,reserviert_am:null},
 {id:503,material_name:"Kupfer",breite_mm:500,laenge_mm:2100,anzahl:1,verbraucht:false,
  reserviert_fuer_project_id:null,reserviert_von:null,reserviert_am:null}
];

const vorbereiten=async(page,module)=>{
 await page.evaluate(([auf,mod,reste])=>{
  currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:"aaaa1111-1111-1111-1111-111111111111",first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern"},
               {id:99,name:"Anderes",object:"Andere Gasse 3"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true;
  reststuecke=JSON.parse(JSON.stringify(reste));
  window.__db.reste=JSON.parse(JSON.stringify(reste));
  window.__db.reservierungen=[]; window.__db.naechste=100;
  window.__db.blockiert=false; window.__db.fehler=null;
  projectMeasurementsCache=JSON.parse(JSON.stringify(auf));
  cockpitProjectId=7;
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
  $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
  // v3.15: die drei ausfuehrlichen Ansichten liegen jetzt auf der Seite
 // MATERIAL & ZUSCHNITT, zugeklappt. Fuer diesen Pruefstand wird die
 // Seite geoeffnet und alles aufgeklappt - eine ueberholte Erwartung,
 // kein Codefehler; geprueft wird weiterhin dasselbe.
 $("projectCockpitModal").hidden=false;
 $("matZuModal").hidden=false;
 ["matZuDetailsMaterial","matZuDetailsZuschnitt","matZuDetailsReservierung"]
  .forEach(id=>{const d=$(id); if(d){d.hidden=false; d.open=true}});
  window.__ruf=[];
 },[AUFNAHMEN,module,RESTE]);
 await page.evaluate(()=>resvCockpitLaden(7));
 // v3.11: die Cockpit-Abschnitte sind klappbar und starten zugeklappt.
 // Fuer diesen Pruefstand wird alles aufgeklappt - eine ueberholte
 // Erwartung, kein Codefehler; geprueft wird weiterhin dasselbe.
 await page.evaluate(()=>{document.querySelectorAll("#projectCockpitModal .klapp:not(.open) .klapp-kopf[data-klapp]").forEach(k=>k.click())});
 await page.waitForTimeout(120);
};

const stand=page=>page.evaluate(()=>{
 const k=$("cockpitReservierungCard"), b=$("cockpitReservierungBody");
 const r=k.getBoundingClientRect();
 return {
  hidden:k.hidden, hoehe:Math.round(r.height),
  zahl:(($("cockpitReservierungCount")||{}).textContent||"").trim(),
  text:b.textContent.replace(/\s+/g," ").trim(),
  // Seit v3.13 traegt jede Zeile ein Auswahl-Kaestchen als erste Spalte.
  // Die Spalte wird hier weggelassen, damit die Indizes dieselben bleiben -
  // eine ueberholte Erwartung, kein Codefehler.
  zeilen:[...b.querySelectorAll("tbody tr")].map(tr=>
    [...tr.querySelectorAll("td")].filter(td=>!td.classList.contains("resv-pick-td"))
      .map(td=>td.textContent.replace(/\s+/g," ").trim())),
  status:[...b.querySelectorAll("[data-resv-status]")].map(s=>({id:s.dataset.resvStatus,wert:s.value})),
  nehmen:[...b.querySelectorAll("[data-resv-rest-nehmen]")].map(x=>x.dataset.resvRestNehmen),
  frei:[...b.querySelectorAll("[data-resv-rest-frei]")].map(x=>x.dataset.resvRestFrei),
  verbraucht:[...b.querySelectorAll("[data-resv-rest-verbraucht]")].map(x=>x.dataset.resvRestVerbraucht),
  quellen:[...b.querySelectorAll("[data-resv-quelle]")].map(x=>x.dataset.resvQuelle),
  hinweis:(b.querySelector(".resv-hinweis")||{}).textContent||"",
  hinweisAn:!(b.querySelector(".resv-hinweis")||{hidden:true}).hidden
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

 console.log("\nA · bei AUS ist die Karte unsichtbar");
 await vorbereiten(page,{});
 let s=await stand(page);
 p(s.hidden===true&&s.hoehe===0,"Karte unsichtbar",{h:s.hidden,y:s.hoehe});
 p(s.text==="","und leer",{t:s.text.slice(0,80)});
 let ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="material_reservierungen"));
 p(ruf.length===0,"bei AUS wird gar nicht erst geladen",{n:ruf.length});

 await vorbereiten(page,{haupt:false,material:true,reservierung:true});
 s=await stand(page);
 p(s.hidden===true,"Untermodul an, Hauptschalter aus: weiterhin unsichtbar");
 // Abhaengigkeit: Reservierung ohne Materialuebersicht wird abgeraeumt
 const abh=await page.evaluate(()=>{pmUebernehmen({haupt:true,reservierung:true});return {m:pmAktiv("material"),r:pmAktiv("reservierung")}});
 p(abh.r===false,"Reservierung ohne Materialuebersicht bleibt aus",abh);

 console.log("\nB · eingeschaltet, noch kein Bedarf");
 await vorbereiten(page,{haupt:true,material:true,reservierung:true});
 s=await stand(page);
 p(s.hidden===false&&s.hoehe>40,"Karte sichtbar",{h:s.hidden,y:s.hoehe});
 p(s.zeilen.length===0,"noch keine Zeile",{n:s.zeilen.length});
 p(/Noch kein Bedarf erfasst/.test(s.text),"Leerzustand benannt");
 p(s.zeilen.length===0,"keine Zeile");
 ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="material_reservierungen"));
 p(ruf.length===1&&ruf[0].op==="select"&&JSON.stringify(ruf[0].filter)==='[["project_id","eq",7]]',
   "genau eine Abfrage, nur nach project_id gefiltert",ruf);
 p(ruf.every(r=>JSON.stringify(r.filter).indexOf("company_id")<0),
   "kein company_id-Filter im Client - das erzwingt die Datenbank");

 console.log("\nC · Bedarf aus der Materialuebersicht uebernehmen");
 // Von Hand nachgerechnet aus AUFNAHMEN, mit der Regel aus v3.17/v3.18
 // (nur Teile und Zuschnitte, Abschnitt 122/123):
 //  Titanzink: Teil "Haltebleche (GAVA Blech)" (5 Stk.). Die drei uebrigen
 //             Zeilen sind abgeleitete Masse und fallen weg. Zuschnitte:
 //             1200x250 und 700x250.            -> 1 + 2 = 3
 //  Kupfer:    Teil "Bleilappen" (8 Stk.). "Blechfläche" ist abgeleitet,
 //             "Bleilappen (eigenes Material)" ist zwar ein Teil, hat aber
 //             eine Textmenge und wird deshalb NICHT reserviert.
 //             Zuschnitt 2000x500.               -> 1 + 1 = 2
 //  Summe: 3 + 2 = 5 Zeilen.
 await page.click("#resvBedarfBtn");
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.zeilen.length===5,"5 Positionen uebernommen",{n:s.zeilen.length,z:s.zeilen});
 p(s.text.indexOf("Noch kein Bedarf erfasst")<0,"der Leerzustand ist weg",{t:s.text.slice(0,60)});
 const alleText=s.zeilen.map(z=>z.join(" | ")).join(" ~ ");
 p(/eigenes Material/.test(alleText)===false,"reiner Text wird nicht reserviert - auch bei einem Teil");
 p(/Bleilappen/.test(alleText),"das Teil mit Zahl kommt dagegen mit");
 p(/Abwicklung 250/.test(alleText)===false&&/Blechfläche/.test(alleText)===false,
   "abgeleitete Masse fallen weg",{t:alleText.slice(0,300)});
 p(/1200 × 250 mm/.test(alleText)&&/700 × 250 mm/.test(alleText),"Zuschnitte mit Abmessung",{t:alleText.slice(0,300)});
 p(/Titanzink/.test(alleText)&&/Kupfer/.test(alleText),"beide Materialien getrennt");
 p(s.zeilen.every(z=>/Benötigt/.test(z[4])),"alle starten bei Benötigt");

 const gesendet=await page.evaluate(()=>window.__ruf.filter(r=>r.op==="insert"));
 p(gesendet.length===1,"ein einziger Insert",{n:gesendet.length});
 const zeilenGesendet=gesendet.length?[].concat(gesendet[0].werte):[];
 p(zeilenGesendet.length===5,"5 Zeilen im Insert",{n:zeilenGesendet.length});
 p(zeilenGesendet.every(z=>!("company_id" in z)),"der Client schickt keine company_id mit",zeilenGesendet[0]);
 p(zeilenGesendet.every(z=>z.project_id===7),"jede Zeile traegt das Projekt");
 p(zeilenGesendet.every(z=>z.status==="benoetigt"),"jede Zeile startet bei benoetigt");
 const mitQuelle=zeilenGesendet.filter(z=>z.measurement_id);
 p(mitQuelle.length===5&&mitQuelle.every(z=>[11,12].indexOf(z.measurement_id)>=0),
   "jede Position fuehrt auf ihre Massaufnahme zurueck",zeilenGesendet.map(z=>z.measurement_id));
 p(s.quellen.length===5,"und die Quelle ist anklickbar",{n:s.quellen.length});

 console.log("\nD · zweimal uebernehmen legt nichts doppelt an");
 await page.click("#resvBedarfBtn");
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.zeilen.length===5,"weiterhin 5 Zeilen",{n:s.zeilen.length});
 p(/Es gab nichts Neues/.test(s.hinweis),"und es wird gesagt, dass nichts neu war",{h:s.hinweis});
 const inserts=await page.evaluate(()=>window.__ruf.filter(r=>r.op==="insert").length);
 p(inserts===1,"kein zweiter Insert",{n:inserts});

 console.log("\nE · Statuswechsel");
 const ersteId=(await page.evaluate(()=>resvListe[0].id));
 await page.selectOption(`[data-resv-status="${ersteId}"]`,"reserviert");
 await page.waitForTimeout(80);
 s=await stand(page);
 p(/Reserviert/.test(s.zeilen[0][4]),"Status steht auf Reserviert",{z:s.zeilen[0]});
 p(/Peter Test/.test(s.zeilen[0][4]),"mit Person",{z:s.zeilen[0][4]});
 let upd=await page.evaluate(()=>window.__ruf.filter(r=>r.op==="update"&&r.tabelle==="material_reservierungen"));
 p(upd.length===1&&upd[0].werte.status==="reserviert","ein Update an die Datenbank",upd[0]&&upd[0].werte);
 p(upd.length===1&&!!upd[0].werte.reserviert_am&&!!upd[0].werte.reserviert_von,
   "wer und wann wird festgehalten",upd[0]&&upd[0].werte);
 await page.selectOption(`[data-resv-status="${ersteId}"]`,"benoetigt");
 await page.waitForTimeout(80);
 upd=await page.evaluate(()=>window.__ruf.filter(r=>r.op==="update"&&r.tabelle==="material_reservierungen"));
 p(upd.length===2&&upd[1].werte.reserviert_von===null,"Zuruecknehmen loescht wer/wann",upd[1]&&upd[1].werte);

 console.log("\nF · still blockiertes UPDATE gilt NICHT als Erfolg");
 await page.evaluate(()=>{window.__db.blockiert=true});
 await page.selectOption(`[data-resv-status="${ersteId}"]`,"geruestet");
 await page.waitForTimeout(80);
 s=await stand(page);
 p(/Benötigt/.test(s.zeilen[0][4]),"Status bleibt auf dem echten Wert",{z:s.zeilen[0][4]});
 p(s.status.find(x=>x.id===String(ersteId)).wert==="benoetigt","die Auswahl springt zurueck",s.status[0]);
 p(/Fehlt die nötige Berechtigung/.test(s.hinweis),"und der Grund steht daneben",{h:s.hinweis});
 await page.evaluate(()=>{window.__db.blockiert=false});

 console.log("\nG · Reststuecke: nichts wird automatisch eingeplant");
 s=await stand(page);
 p(s.nehmen.length===2&&s.nehmen.indexOf("501")>=0&&s.nehmen.indexOf("503")>=0,
   "nur die zwei freien Reste sind reservierbar",s.nehmen);
 p(s.nehmen.indexOf("502")<0,"das fremd reservierte nicht");
 p(/für ein anderes Projekt reserviert und hier nicht verfügbar/.test(s.text),
   "und das wird gesagt");
 p(s.frei.length===0&&s.verbraucht.length===0,"noch nichts fuer dieses Projekt reserviert");
 p(/nie automatisch eingeplant/.test(s.text),"der Hinweis steht da");
 const resteVorher=await page.evaluate(()=>window.__db.reste.filter(r=>r.reserviert_fuer_project_id===7).length);
 p(resteVorher===0,"und es wurde tatsaechlich nichts eingeplant",{n:resteVorher});

 console.log("\nH · Reststueck reservieren, freigeben, verbrauchen");
 await page.click('[data-resv-rest-nehmen="501"]');
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.frei.indexOf("501")>=0&&s.verbraucht.indexOf("501")>=0,"501 ist jetzt diesem Projekt zugeordnet",s.frei);
 p(s.nehmen.indexOf("501")<0,"und nicht mehr frei waehlbar",s.nehmen);
 let ru=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="reststuecke"&&r.op==="update"));
 p(ru.length===1,"ein Update auf reststuecke",{n:ru.length});
 const bed=ru.length?JSON.stringify(ru[0].filter):"";
 p(/\["reserviert_fuer_project_id","is",null\]/.test(bed)&&/\["verbraucht","eq",false\]/.test(bed),
   "wettlaufsicher: nur wenn es noch frei und unverbraucht ist",bed);
 p(ru.length&&ru[0].werte.reserviert_fuer_project_id===7,"auf dieses Projekt",ru[0]&&ru[0].werte);

 // Zweiter Versuch auf dasselbe Stueck: die Datenbank findet nichts mehr.
 const zweit=await page.evaluate(async()=>{const e=await resvRestNehmen(501);return e});
 p(zweit&&/inzwischen vergeben|verbraucht/.test(zweit.fehler||""),
   "ein zweiter Zugriff wird abgewiesen",zweit);

 await page.click('[data-resv-rest-frei="501"]');
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.nehmen.indexOf("501")>=0,"nach dem Freigeben wieder frei",s.nehmen);
 p(/wieder freigegeben/.test(s.hinweis),"und es wird gesagt",{h:s.hinweis});

 await page.click('[data-resv-rest-nehmen="501"]');
 await page.waitForTimeout(80);
 await page.click('[data-resv-rest-verbraucht="501"]');
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.nehmen.indexOf("501")<0&&s.frei.indexOf("501")<0,"nach dem Verbrauchen aus dem Lager",s.nehmen);
 const nachher=await page.evaluate(()=>window.__db.reste.find(r=>r.id===501));
 p(nachher&&nachher.verbraucht===true&&nachher.reserviert_fuer_project_id===7,
   "verbraucht, aber die Projektspur bleibt",nachher);

 console.log("\nI · Bedarfszeile entfernen");
 const vorher=(await page.evaluate(()=>resvListe.length));
 await page.click(`[data-resv-loeschen="${ersteId}"]`);
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.zeilen.length===vorher-1,"eine Zeile weniger",{v:vorher,n:s.zeilen.length});
 const del=await page.evaluate(()=>window.__ruf.filter(r=>r.op==="delete"));
 p(del.length===1&&JSON.stringify(del[0].filter)===`[["id","eq",${ersteId}]]`,"genau diese Zeile",del[0]);

 console.log("\nJ · Verlauf zeigt deutsche Bezeichnungen");
 const verlauf=await page.evaluate(()=>{
  const zeile=(t,c)=>verlaufChangesHtml({entity_type:t,action:"status_changed",changes:c});
  return {
   res:zeile("reservierung",[{field:"status",old:"benoetigt",new:"reserviert"}]),
   rest:zeile("reststueck",[{field:"reserviert_fuer",old:null,new:7}]),
   verb:zeile("reststueck",[{field:"verbraucht",old:false,new:true}]),
   label:VERLAUF_ENTITY_LABELS.reservierung+"/"+VERLAUF_ENTITY_LABELS.reststueck
  };
 });

 p(/Benötigt/.test(verlauf.res)&&/Reserviert/.test(verlauf.res)&&!/benoetigt/.test(verlauf.res),
   "Reservierungsstatus auf Deutsch",{h:verlauf.res.slice(0,180)});
 p(/niemand/.test(verlauf.rest)&&/Musterstrasse 12/.test(verlauf.rest),
   "Reststueck: niemand -> Projektadresse",{h:verlauf.rest.slice(0,200)});
 p(/im Lager/.test(verlauf.verb)&&/verbraucht/.test(verlauf.verb),
   "verbraucht statt Ja/Nein",{h:verlauf.verb.slice(0,160)});
 p(verlauf.label==="Reservierung/Reststück","beide Arten benannt",{l:verlauf.label});

 console.log("\nK · Hilfe und Ausschalten");
 const hilfe=await page.evaluate(()=>{
  const b=$("matZuDetailsReservierung").querySelector("[data-hilfe]");
  return {key:b?b.dataset.hilfe:null,
          hatText:!!(typeof HILFE_TEXTE==="object"&&HILFE_TEXTE["cockpit-reservierung"]),
          beschriftet:!!(b&&b.getAttribute("aria-label"))};
 });
 p(hilfe.key==="cockpit-reservierung"&&hilfe.hatText,"Info-Knopf mit Text",hilfe);
 p(hilfe.beschriftet,"und beschriftet");

 await page.evaluate(()=>{pmUebernehmen({haupt:false});pmSichtbarkeitAuffrischen()});
 await page.waitForTimeout(60);
 s=await stand(page);
 p(s.hidden===true&&s.hoehe===0,"nach dem Ausschalten wieder unsichtbar",{h:s.hidden,y:s.hoehe});
 const nochDa=await page.evaluate(()=>window.__db.reservierungen.length);
 p(nochDa>0,"die Daten bleiben aber erhalten",{n:nochDa});
 await page.evaluate(()=>{pmUebernehmen({haupt:true,material:true,reservierung:true})});
 await page.evaluate(()=>resvCockpitLaden(7));
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.zeilen.length===nochDa,"und sind nach dem Wiedereinschalten wieder da",{n:s.zeilen.length,d:nochDa});

 console.log("\nL · Breiten");
 for(const w of [320,390,768,1200]){
  await page.setViewportSize({width:w,height:900});
  await page.waitForTimeout(40);
  const ueber=await page.evaluate(()=>{
   const b=$("cockpitReservierungBody");
   const raus=[];
   b.querySelectorAll("*").forEach(e=>{
    if(e.closest(".scroll"))return;                 // darf seitlich scrollen
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

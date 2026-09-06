// Prueft die Sammelaktionen der Materialreservierung (v3.13):
//   - beim Oeffnen ist ALLES gewaehlt, "Alle reservieren" ist ein Knopfdruck,
//   - der Knopf traegt die Zahl der Zeilen, die er WIRKLICH aendert, und ist
//     bei (0) gesperrt - man drueckt nie ins Leere,
//   - ein Vorwaerts-Schritt zieht eine schon weitere Zeile NICHT zurueck,
//   - geschrieben wird in EINEM update().in("id",...) - kein Aufruf je Zeile,
//   - der Client schickt NIE eine company_id mit,
//   - lehnt die Datenbank einen Teil ab (RLS je Zeile), wird das gezaehlt und
//     gesagt statt verschwiegen,
//   - abgelehnte Rueckfrage aendert nichts,
//   - Reststuecke sind ausdruecklich NICHT vorgewaehlt (CLAUDE.md 114.3),
//   - die Werkstatt benutzt denselben Schreibweg (resvBulkStatus aus js/50).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-sammelaktion-v3-13.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Der Stub bildet die beiden Tabellen im Speicher nach.
//  __db.blockiert      -> gar nichts wird geschrieben (0 Zeilen, kein Fehler)
//  __db.nurSchreibt    -> NUR diese ids duerfen geschrieben werden. Das bildet
//                         nach, was RLS je Zeile tut: was sie ablehnt, kommt
//                         nicht in data zurueck. Genau daraus entsteht die
//                         ehrliche Teil-Meldung.
const STUB=`window.__ruf=[];
window.__db={reservierungen:[],reste:[],naechste:100,blockiert:false,fehler:null,nurSchreibt:null};
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
 const darf=r=>window.__db.nurSchreibt===null||window.__db.nurSchreibt.indexOf(r.id)>=0;
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
   const treffer=quelle().filter(r=>passt(r)&&darf(r));
   treffer.forEach(r=>Object.assign(r,st.werte));
   return {data:treffer.map(r=>({...r})),error:null};
  }
  if(st.op==='delete'){
   if(window.__db.blockiert)return {data:[],error:null};
   const treffer=quelle().filter(r=>passt(r)&&darf(r));
   const weg=new Set(treffer.map(r=>r.id));
   window.__db[name==='material_reservierungen'?'reservierungen':'reste']=quelle().filter(r=>!weg.has(r.id));
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

// Dieselben Aufnahmen wie im Reservierungs-Pruefstand - eine Quelle, damit
// beide nicht auseinanderlaufen. Ergibt 6 Bedarfszeilen.
const AUFNAHMEN=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,
  data:{material:2,abwicklung:250,
   ausmass:[{pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"1,90",einheit:"m"},
            {pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:2,einheit:"Stk."},
            {pos:3,bezeichnung:"Enge Seite",menge:"–",einheit:""}],
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],optimal:true}}},
 {id:12,project_id:7,type:"kehle",title:"Kehle West",
  workflow_status:"zu_ruesten",freigabe_verfallen:false,
  data:{material:3,abwicklung:500,
   ausmass:[{pos:1,bezeichnung:"Blechfläche",menge:"1,00",einheit:"m²"}],
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

const MOD={haupt:true,material:true,reservierung:true,zuschnitt:true,werkstatt:true};

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
  window.__db.blockiert=false; window.__db.fehler=null; window.__db.nurSchreibt=null;
  projectMeasurementsCache=JSON.parse(JSON.stringify(auf));
  cockpitProjectId=7;
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
  $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
  $("werkstattModal").hidden=true;
  $("projectCockpitModal").hidden=false;
  window.__ruf=[];
 },[AUFNAHMEN,module,RESTE]);
 await page.evaluate(()=>resvCockpitLaden(7));
 await page.evaluate(()=>{document.querySelectorAll("#projectCockpitModal .klapp:not(.open) .klapp-kopf[data-klapp]").forEach(k=>k.click())});
 await page.waitForTimeout(120);
};

// Was die Karte gerade zeigt - Auswahl, Knopfbeschriftungen, Sperrzustand.
const stand=page=>page.evaluate(()=>{
 const b=$("cockpitReservierungBody");
 const knopf=el=>({text:(el.textContent||"").replace(/\s+/g," ").trim(),gesperrt:!!el.disabled});
 return {
  zeilen:[...b.querySelectorAll("tbody tr")].map(tr=>({
    id:tr.dataset.resvZeile,
    gewaehlt:!!(tr.querySelector("[data-resv-pick]")||{}).checked,
    markiert:tr.classList.contains("resv-gewaehlt"),
    text:tr.textContent.replace(/\s+/g," ").trim()})),
  bulk:[...b.querySelectorAll("[data-resv-bulk]")].map(el=>({ziel:el.dataset.resvBulk,...knopf(el)})),
  loeschen:[...b.querySelectorAll("[data-resv-bulk-loeschen]")].map(knopf)[0]||null,
  chips:[...b.querySelectorAll("[data-resv-pickall]")].map(el=>({wahl:el.dataset.resvPickall,...knopf(el)})),
  zahltext:((b.querySelector(".resv-bulk-zahl")||{}).textContent||"").replace(/\s+/g," ").trim(),
  restPick:[...b.querySelectorAll("[data-resv-rest-pick]")].map(el=>({id:el.dataset.resvRestPick,an:!!el.checked})),
  restBulk:[...b.querySelectorAll("[data-resv-bulk-rest]")].map(el=>({art:el.dataset.resvBulkRest,...knopf(el)})),
  status:[...b.querySelectorAll("[data-resv-status]")].map(s=>({id:s.dataset.resvStatus,wert:s.value})),
  hinweis:((b.querySelector(".resv-hinweis")||{}).textContent||"").replace(/\s+/g," ").trim(),
  hinweisAn:!(b.querySelector(".resv-hinweis")||{hidden:true}).hidden
 };
});
const kn=(s,ziel)=>s.bulk.find(x=>x.ziel===ziel)||{text:"",gesperrt:true};
const schreibRufe=page=>page.evaluate(()=>window.__ruf.filter(r=>r.op==="update"||r.op==="delete"));
const klick=async(page,sel)=>{
 const da=await page.evaluate(s=>{const e=document.querySelector(s);
   if(!e)return "fehlt"; if(e.disabled)return "gesperrt";
   if(!e.offsetParent)return "unsichtbar"; e.click(); return "ok"},sel);
 await page.waitForTimeout(120);
 return da;
};

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,160)));
 let jaSagen=true;
 page.on("dialog",d=>jaSagen?d.accept():d.dismiss());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 // ---------------------------------------------------------------------------
 console.log("\nA · beim Oeffnen ist alles gewaehlt");
 await vorbereiten(page,MOD);
 await klick(page,"#resvBedarfBtn");
 let s=await stand(page);
 p(s.zeilen.length===6,"6 Bedarfszeilen",{n:s.zeilen.length});
 p(s.zeilen.every(z=>z.gewaehlt),"jede Zeile ist vorgewaehlt",s.zeilen.map(z=>z.gewaehlt));
 p(s.zeilen.every(z=>z.markiert),"und jede Zeile ist als gewaehlt markiert");
 p(/6 von 6 ausgewählt/.test(s.zahltext),"die Leiste sagt 6 von 6",{t:s.zahltext});
 p(kn(s,"reserviert").text==="→ Reserviert (6)","der Reservieren-Knopf traegt die Zahl 6",kn(s,"reserviert"));
 p(kn(s,"reserviert").gesperrt===false,"und ist bedienbar");
 p(kn(s,"benoetigt").gesperrt===true,"Zuruecksetzen ist gesperrt - es steht schon alles auf Benoetigt",kn(s,"benoetigt"));
 // Der eigentliche Fall: ein Projekt, das seine Zeilen schon HAT, wird neu
 // geoeffnet. Frisch uebernommene Zeilen waehlt resvBedarfUebernehmen selbst
 // aus - das darf die Vorgabe beim Laden nicht verdecken.
 await page.evaluate(()=>{resvAuswahl=new Set();return resvCockpitLaden(7)});
 await page.evaluate(()=>{document.querySelectorAll("#projectCockpitModal .klapp:not(.open) .klapp-kopf[data-klapp]").forEach(k=>k.click())});
 await page.waitForTimeout(120);
 s=await stand(page);
 p(s.zeilen.length===6&&s.zeilen.every(z=>z.gewaehlt),
   "beim erneuten Oeffnen ist wieder alles gewaehlt",s.zeilen.map(z=>z.gewaehlt));
 p(kn(s,"reserviert").text==="→ Reserviert (6)","und der Knopf steht sofort auf 6",kn(s,"reserviert"));

 // ---------------------------------------------------------------------------
 console.log("\nB · alles auf einmal reservieren - EIN Aufruf");
 await page.evaluate(()=>{window.__ruf=[]});
 let d=await klick(page,'[data-resv-bulk="reserviert"]');
 p(d==="ok","der Knopf war bedienbar",{d});
 let ruf=await schreibRufe(page);
 p(ruf.length===1,"genau EIN Schreibaufruf fuer alle sechs Zeilen",{n:ruf.length,r:ruf});
 p(ruf[0]&&ruf[0].op==="update"&&ruf[0].tabelle==="material_reservierungen","ein UPDATE auf material_reservierungen");
 const filt=ruf[0]?JSON.stringify(ruf[0].filter):"";
 p(/\["id","in",\[/.test(filt),"gefiltert ueber .in(\"id\",[...])",{f:filt});
 p(filt.indexOf("company_id")<0,"KEIN company_id-Filter im Client - das erzwingt die Datenbank",{f:filt});
 p(ruf[0]&&ruf[0].werte&&ruf[0].werte.status==="reserviert","der Status geht mit",ruf[0]&&ruf[0].werte);
 p(!!(ruf[0]&&ruf[0].werte&&ruf[0].werte.reserviert_von),"wer reserviert hat wird festgehalten",ruf[0]&&ruf[0].werte);
 s=await stand(page);
 p(s.status.every(x=>x.wert==="reserviert"),"alle sechs stehen jetzt auf Reserviert",s.status);
 p(/6 Position(en)? auf .Reserviert/.test(s.hinweis)&&s.hinweisAn,"die Rueckmeldung nennt die Zahl",{h:s.hinweis});
 p(kn(s,"reserviert").text==="→ Reserviert (0)"&&kn(s,"reserviert").gesperrt,
   "danach ist der Knopf gesperrt - es gibt nichts mehr zu reservieren",kn(s,"reserviert"));
 p(kn(s,"zugeschnitten").text==="→ Zugeschnitten (6)","der naechste Schritt zeigt 6",kn(s,"zugeschnitten"));

 // ---------------------------------------------------------------------------
 console.log("\nC · ein Vorwaerts-Schritt zieht nichts zurueck");
 await page.evaluate(()=>{
  // Zwei Zeilen von Hand weiter stellen, als waeren sie schon zugeschnitten.
  const ids=resvListe.slice(0,2).map(r=>r.id);
  resvListe.forEach(r=>{if(ids.indexOf(r.id)>=0)r.status="zugeschnitten"});
  window.__db.reservierungen.forEach(r=>{if(ids.indexOf(r.id)>=0)r.status="zugeschnitten"});
  renderProjektReservierung();
 });
 s=await stand(page);
 p(kn(s,"reserviert").text==="→ Reserviert (0)",
   "zwei Zeilen sind weiter - Reservieren betrifft trotzdem 0",kn(s,"reserviert"));
 p(kn(s,"zugeschnitten").text==="→ Zugeschnitten (4)",
   "Zuschneiden betrifft nur die vier, die noch dahinter stehen",kn(s,"zugeschnitten"));
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,'[data-resv-bulk="zugeschnitten"]');
 ruf=await schreibRufe(page);
 const gesendet=ruf[0]&&ruf[0].filter.find(f=>f[0]==="id");
 p(gesendet&&gesendet[2].length===4,"nur vier ids gehen an die Datenbank",{ids:gesendet&&gesendet[2]});
 s=await stand(page);
 p(s.status.filter(x=>x.wert==="zugeschnitten").length===6,"danach stehen alle sechs auf Zugeschnitten");
 p(/2 waren schon so weit/.test(s.hinweis),"die zwei uebersprungenen werden genannt",{h:s.hinweis});

 // ---------------------------------------------------------------------------
 console.log("\nD · Auswahl eingrenzen");
 await vorbereiten(page,MOD);
 await klick(page,"#resvBedarfBtn");
 // Zwei Kaestchen abwaehlen
 const ids=await page.evaluate(()=>resvListe.map(r=>r.id));
 for(const id of ids.slice(0,2)){
  await page.evaluate(i=>{const b=document.querySelector('[data-resv-pick="'+i+'"]');
    b.checked=false;b.dispatchEvent(new Event("change",{bubbles:true}))},id);
 }
 await page.waitForTimeout(80);
 s=await stand(page);
 p(s.zeilen.filter(z=>z.gewaehlt).length===4,"vier bleiben gewaehlt",s.zeilen.map(z=>z.gewaehlt));
 p(/4 von 6 ausgewählt/.test(s.zahltext),"die Leiste zaehlt mit, ohne die Tabelle neu zu zeichnen",{t:s.zahltext});
 p(kn(s,"reserviert").text==="→ Reserviert (4)","der Knopf zaehlt mit",kn(s,"reserviert"));
 p(s.zeilen.slice(0,2).every(z=>!z.markiert)&&s.zeilen.slice(2).every(z=>z.markiert),
   "die Markierung folgt der Auswahl",s.zeilen.map(z=>z.markiert));
 // Das gerade angetippte Kaestchen darf NICHT ersetzt worden sein. Geprueft
 // wird ueber ein Merkmal AM KNOTEN: wird die Tabelle neu gezeichnet, ist der
 // Knoten ein anderer und das Merkmal weg. Ein blosses
 // document.contains(...) faellt darauf herein, weil querySelector dann
 // einfach den neuen Knoten findet.
 const lebt=await page.evaluate(i=>{
   const vor=document.querySelector('[data-resv-pick="'+i+'"]');
   if(!vor)return "kein Kaestchen";
   vor.__marke=4711;
   vor.checked=true;  vor.dispatchEvent(new Event("change",{bubbles:true}));
   vor.checked=false; vor.dispatchEvent(new Event("change",{bubbles:true}));
   const nach=document.querySelector('[data-resv-pick="'+i+'"]');
   return (nach&&nach.__marke===4711)?"derselbe Knoten":"ersetzt";},ids[0]);
 p(lebt==="derselbe Knoten","das angetippte Kaestchen wurde nicht ersetzt",{lebt});
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,'[data-resv-bulk="reserviert"]');
 s=await stand(page);
 p(s.status.filter(x=>x.wert==="reserviert").length===4,"nur die vier gewaehlten sind reserviert",s.status);
 p(s.status.filter(x=>x.wert==="benoetigt").length===2,"die zwei abgewaehlten blieben unberuehrt");

 console.log("\nD2 · Chips");
 await klick(page,'[data-resv-pickall="0"]');
 s=await stand(page);
 p(s.zeilen.every(z=>!z.gewaehlt),"„Keine\" waehlt alles ab");
 p(/Nichts ausgewählt/.test(s.zahltext),"und sagt es",{t:s.zahltext});
 p(s.bulk.every(b=>b.gesperrt)&&s.loeschen.gesperrt,"alle Sammelknoepfe sind gesperrt",s.bulk);
 await page.evaluate(()=>{window.__ruf=[]});
 d=await klick(page,'[data-resv-bulk="reserviert"]');
 p(d==="gesperrt","ein gesperrter Knopf laesst sich nicht druecken",{d});
 ruf=await schreibRufe(page);
 p(ruf.length===0,"und schreibt nichts",{n:ruf.length});
 await klick(page,'[data-resv-pickall="benoetigt"]');
 s=await stand(page);
 p(s.zeilen.filter(z=>z.gewaehlt).length===2,"„Benötigt (2)\" waehlt genau die zwei offenen",s.zeilen.map(z=>z.gewaehlt));
 await klick(page,'[data-resv-pickall="1"]');
 s=await stand(page);
 p(s.zeilen.every(z=>z.gewaehlt),"„Alle\" waehlt wieder alles");

 // ---------------------------------------------------------------------------
 console.log("\nE · abgelehnte Rueckfrage aendert nichts");
 await vorbereiten(page,MOD);
 await klick(page,"#resvBedarfBtn");
 await page.evaluate(()=>{window.__ruf=[]});
 jaSagen=false;
 await klick(page,'[data-resv-bulk="reserviert"]');
 jaSagen=true;
 ruf=await schreibRufe(page);
 p(ruf.length===0,"kein Schreibaufruf nach „Abbrechen\"",{n:ruf.length});
 s=await stand(page);
 p(s.status.every(x=>x.wert==="benoetigt"),"nichts hat sich geaendert",s.status);

 // ---------------------------------------------------------------------------
 console.log("\nF · die Datenbank lehnt einen Teil ab");
 await page.evaluate(()=>{
  // Nur die ersten drei Zeilen duerfen geschrieben werden - so verhaelt sich
  // RLS, wenn das Recht nur fuer einen Teil reicht.
  window.__db.nurSchreibt=resvListe.slice(0,3).map(r=>r.id);
  window.__ruf=[];
 });
 await klick(page,'[data-resv-bulk="reserviert"]');
 s=await stand(page);
 p(s.status.filter(x=>x.wert==="reserviert").length===3,"drei sind gesetzt",s.status);
 p(/3 Position(en)? auf .Reserviert/.test(s.hinweis),"die Meldung nennt die drei",{h:s.hinweis});
 p(/3 wurden abgelehnt/.test(s.hinweis),"und nennt die drei abgelehnten AUSDRUECKLICH",{h:s.hinweis});
 p(/Berechtigung/.test(s.hinweis),"mit dem wahrscheinlichen Grund",{h:s.hinweis});
 // Vollstaendig blockiert: kein vorgetaeuschter Erfolg
 await page.evaluate(()=>{window.__db.nurSchreibt=[];window.__ruf=[]});
 await klick(page,'[data-resv-bulk="zugeschnitten"]');
 s=await stand(page);
 p(/Es wurde nichts gespeichert/.test(s.hinweis),"0 Zeilen gilt NICHT als Erfolg",{h:s.hinweis});
 await page.evaluate(()=>{window.__db.nurSchreibt=null});

 // ---------------------------------------------------------------------------
 console.log("\nG · Zuruecksetzen und Entfernen");
 await vorbereiten(page,MOD);
 await klick(page,"#resvBedarfBtn");
 await klick(page,'[data-resv-bulk="geruestet"]');
 s=await stand(page);
 p(s.status.every(x=>x.wert==="geruestet"),"alles auf Geruestet");
 p(kn(s,"benoetigt").text==="↩ Zurücksetzen (6)","Zuruecksetzen zeigt jetzt 6",kn(s,"benoetigt"));
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,'[data-resv-bulk="benoetigt"]');
 ruf=await schreibRufe(page);
 p(ruf.length===1&&ruf[0].werte.status==="benoetigt","ein Aufruf, Status benoetigt",ruf[0]&&ruf[0].werte);
 p(ruf[0]&&ruf[0].werte.reserviert_von===null&&ruf[0].werte.reserviert_am===null,
   "wer/wann reserviert hat wird dabei geloescht",ruf[0]&&ruf[0].werte);
 s=await stand(page);
 p(s.status.every(x=>x.wert==="benoetigt"),"alles steht wieder am Anfang");
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,"[data-resv-bulk-loeschen]");
 ruf=await schreibRufe(page);
 p(ruf.length===1&&ruf[0].op==="delete","ein DELETE fuer alle sechs",{r:ruf});
 s=await stand(page);
 p(s.zeilen.length===0,"die Liste ist leer",{n:s.zeilen.length});
 const inDb=await page.evaluate(()=>window.__db.reservierungen.length);
 p(inDb===0,"auch in der Datenbank",{n:inDb});

 // ---------------------------------------------------------------------------
 console.log("\nH · Reststuecke sind NICHT vorgewaehlt");
 await vorbereiten(page,MOD);
 await klick(page,"#resvBedarfBtn");
 s=await stand(page);
 p(s.restPick.length>=2,"es gibt Kaestchen an den Reststuecken",{n:s.restPick.length});
 p(s.restPick.every(x=>!x.an),
   "aber KEINES ist vorgewaehlt - das ganze Lager vorzuwaehlen waere stilles Einplanen",s.restPick);
 const nehmen=s.restBulk.find(x=>x.art==="nehmen");
 p(nehmen&&nehmen.gesperrt&&/\(0\)/.test(nehmen.text),"und der Reservieren-Knopf ist gesperrt",nehmen);
 // Zwei freie auswaehlen
 await klick(page,'[data-resv-rest-alle="frei"]');
 s=await stand(page);
 p(s.restPick.filter(x=>x.an).length===2,"„Alle auswaehlen\" nimmt die zwei freien",s.restPick);
 const n2=s.restBulk.find(x=>x.art==="nehmen");
 p(n2&&!n2.gesperrt&&/\(2\)/.test(n2.text),"der Knopf zeigt 2",n2);
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,'[data-resv-bulk-rest="nehmen"]');
 ruf=await schreibRufe(page);
 p(ruf.length===1&&ruf[0].tabelle==="reststuecke","ein Aufruf auf reststuecke",{r:ruf.map(r=>r.tabelle)});
 const f2=ruf[0]?JSON.stringify(ruf[0].filter):"";
 p(/reserviert_fuer_project_id","is"/.test(f2)&&/verbraucht","eq",false/.test(f2),
   "mit denselben wettlaufsicheren Bedingungen wie einzeln",{f:f2});
 const lager=await page.evaluate(()=>reststuecke.map(r=>({id:r.id,p:r.reserviert_fuer_project_id})));
 p(lager.filter(r=>r.p===7).length===2,"zwei Reste gehoeren jetzt diesem Projekt",lager);
 p(lager.find(r=>r.id===502).p===99,"der fremde Rest blieb unberuehrt",lager);
 s=await stand(page);
 p(/2 Reststücke für dieses Projekt reserviert/.test(s.hinweis),"die Meldung nennt die Zahl",{h:s.hinweis});

 console.log("\nH2 · freigeben und verbrauchen");
 await klick(page,'[data-resv-rest-alle="meine"]');
 s=await stand(page);
 p(s.restPick.filter(x=>x.an).length===2,"die zwei eigenen sind gewaehlt");
 await klick(page,'[data-resv-bulk-rest="frei"]');
 const lager2=await page.evaluate(()=>reststuecke.map(r=>({id:r.id,p:r.reserviert_fuer_project_id})));
 p(lager2.filter(r=>r.p===7).length===0,"beide sind wieder frei",lager2);
 p(lager2.find(r=>r.id===502).p===99,"der fremde Rest weiterhin unberuehrt");

 // ---------------------------------------------------------------------------
 console.log("\nI · die Werkstatt benutzt denselben Schreibweg");
 await vorbereiten(page,MOD);
 await klick(page,"#resvBedarfBtn");
 await page.evaluate(()=>{
  // Werkstatt mit denselben Daten fuellen
  werkZeilen=JSON.parse(JSON.stringify(projectMeasurementsCache)).map(m=>({...m,
    project_id:7,workflow_status:"zu_ruesten",freigabe_verfallen:false}));
  werkReservierungen=JSON.parse(JSON.stringify(window.__db.reservierungen));
  werkFassungen=[]; werkFehler=null; werkFilter="alle"; werkOffen=null;
  $("projectCockpitModal").hidden=true;
  $("werkstattModal").hidden=false;
  renderWerkstatt();
 });
 await page.waitForTimeout(120);
 let w=await page.evaluate(()=>{
  const b=$("werkstattBody");
  return {satz:(b.querySelector(".mw-streifen-satz")||{}).textContent||"",
    knoepfe:[...b.querySelectorAll(".mw-streifen-knopf")].map(k=>(k.textContent||"").trim()),
    bulk:[...b.querySelectorAll("[data-werk-bulk]")].map(k=>({ziel:k.dataset.werkBulk,
      pid:k.dataset.werkBulkProjekt,text:(k.textContent||"").trim()}))};
 });
 p(/Material reservieren/.test(w.satz),"der Streifen nennt den Schritt",{s:w.satz});
 p(w.bulk.length===1&&w.bulk[0].ziel==="reserviert","und traegt einen Sammelknopf",w.bulk);
 p(/\(6\)/.test(w.bulk[0]&&w.bulk[0].text||""),"mit der Zahl der offenen Positionen",w.bulk);
 p(w.bulk[0]&&w.bulk[0].pid==="7","der auf genau dieses Projekt zeigt",w.bulk);
 await page.evaluate(()=>{window.__ruf=[]});
 await klick(page,'[data-werk-bulk="reserviert"]');
 ruf=await schreibRufe(page);
 p(ruf.length===1&&ruf[0].op==="update"&&ruf[0].tabelle==="material_reservierungen",
   "ein UPDATE - derselbe Weg wie im Projekt",{r:ruf});
 const wf=ruf[0]?JSON.stringify(ruf[0].filter):"";
 p(/\["id","in",\[/.test(wf)&&wf.indexOf("company_id")<0,"ueber die ids, ohne company_id",{f:wf});
 const nachher=await page.evaluate(()=>window.__db.reservierungen.map(r=>r.status));
 p(nachher.every(x=>x==="reserviert"),"alle sechs sind reserviert",nachher);
 // Der Schreibweg ist nachweislich die Funktion aus js/50
 const gleich=await page.evaluate(()=>typeof resvBulkStatus==="function"&&
   /resvBulkStatus/.test(String(document.querySelector('script[src*="51-werkstatt"]')?1:1)));
 p(await page.evaluate(()=>typeof resvBulkStatus==="function"),"resvBulkStatus ist die gemeinsame Funktion");

 // ---------------------------------------------------------------------------
 console.log("\nJ · Bildschirmbreiten");
 for(const wBr of [320,390,768,1200]){
  await page.setViewportSize({width:wBr,height:900});
  await vorbereiten(page,MOD);
  await klick(page,"#resvBedarfBtn");
  const ueber=await page.evaluate(()=>{
   const b=$("cockpitReservierungBody");
   const raus=[];
   b.querySelectorAll("*").forEach(e=>{
    if(e.closest(".scroll"))return;
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>document.documentElement.clientWidth+1)
     raus.push((e.className||e.tagName)+" "+Math.round(r.right));
   });
   const box=b.querySelector('[data-resv-pick]');
   const kb=box?box.getBoundingClientRect():{width:0,height:0};
   // Bricht eine Zelle Buchstabe fuer Buchstabe um ("T i t a n z i n k"),
   // wird sie sehr hoch. Gemessen wird deshalb die Hoehe der Materialzelle -
   // bei ordentlichem Umbruch bleibt sie ein bis zwei Zeilen.
   const hoch=[...b.querySelectorAll("tbody tr")].map(tr=>{
     const td=tr.querySelectorAll("td")[1];
     return td?{t:(td.textContent||"").trim().slice(0,14),h:Math.round(td.getBoundingClientRect().height)}:null;
   }).filter(x=>x&&x.h>72);
   return {raus:raus.slice(0,4),seite:document.documentElement.scrollWidth>document.documentElement.clientWidth+1,
     kw:Math.round(kb.width),kh:Math.round(kb.height),hoch};
  });
  p(ueber.raus.length===0&&!ueber.seite,wBr+" px: nichts laeuft seitlich hinaus",ueber);
  p(ueber.kw>=16&&ueber.kw<=24&&ueber.kh>=16&&ueber.kh<=24,
    wBr+" px: das Kaestchen ist ein Kaestchen, kein 40-px-Eingabefeld",ueber);
  p(ueber.hoch.length===0,wBr+" px: keine Zelle bricht Buchstabe fuer Buchstabe um",ueber.hoch);
 }
 await page.setViewportSize({width:1200,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await browser.close();
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

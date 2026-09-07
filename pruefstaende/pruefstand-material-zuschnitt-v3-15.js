// Prueft die zentrale Seite MATERIAL & ZUSCHNITT (v3.15).
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche gegen die echte index.html - was
// im Cockpit steht, was auf der Seite steht, was ein Tap auf eine
// Positionsnummer wirklich an die Datenbank schickt, und dass nichts neu
// gerechnet wird.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Regeln durchsetzt. Das
// ist serverseitig und wurde per SQL gegen das echte Produktivschema
// geprueft (9 Faelle, siehe CLAUDE.md 120).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-material-zuschnitt-v3-15.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
// Ein Klick auf etwas Verdecktes wuerde 30 s haengen und den Lauf abbrechen -
// das saehe aus wie "keine Fehler" (CLAUDE.md 78). Deshalb kurz warten und
// sauber fehlschlagen.
const tipp=async(page,sel)=>{
 try{ await page.click(sel,{timeout:3000}); return true }
 catch(e){ fail++; console.log("  FEHLGESCHLAGEN: nicht antippbar: "+sel+"  "+String(e.message).split("\n")[0]); return false }
};
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};

// Der Stub protokolliert jeden Aufruf und haelt die Haken im Speicher.
const STUB=`window.__ruf=[];window.__ze=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({art:"rpc",name:n,args:a});return {data:null,error:null}},
 from:(t)=>{
   const f={_t:t,_in:null,_eq:{}};
   ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
   f.eq=(s,v)=>{f._eq[s]=v;return f};
   f.in=(s,v)=>{f._in={s,v};return f};
   f.maybeSingle=async()=>({data:null,error:null});
   f.upsert=(rows)=>{window.__ruf.push({art:"upsert",tabelle:t,rows:JSON.parse(JSON.stringify(rows))});
     const raus=[];
     rows.forEach(r=>{
       let z=window.__ze.find(x=>x.measurement_id===r.measurement_id&&x.stueck_nr===r.stueck_nr);
       if(!z){z={id:window.__ze.length+1};window.__ze.push(z)}
       Object.assign(z,r); raus.push(Object.assign({},z));
     });
     const g={select:()=>Promise.resolve({data:window.__fehlerBeimSchreiben?[]:raus,error:null})};
     g.then=(cb)=>g.select().then(cb);
     return g};
   f.then=(cb)=>{
     window.__ruf.push({art:"select",tabelle:t,inn:f._in,eq:f._eq});
     let d=[];
     if(t==="zuschnitt_erledigt"){
       d=window.__ze.filter(z=>!f._in||f._in.v.indexOf(z.measurement_id)>=0);
     }else if(t==="material_reservierungen"){ d=window.__resv||[] }
     else if(t==="reststuecke"){ d=window.__reste||[] }
     return Promise.resolve({data:JSON.parse(JSON.stringify(d)),error:null}).then(cb)};
   return f},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:'x'},error:null})})}
})};`;

// Ein gespeicherter Zuschnittplan, wie ihn eine Massaufnahme wirklich ablegt
// (flache Form, Einlaufblech).
const plan=(nrs)=>({streifen:[{rest:0,stuecke:nrs.map(n=>({nr:n.nr,laenge:n.l,hinweis:"",merkmal:n.m||""}))}],
  abwicklung:250,moeglich:[{breite:1000,jeTafel:4,abschnitte:1,abschnittLaenge:2070,rollenLaenge:2070,flaeche:2.07,verschnitt:0.5,anteil:24}],
  gruppen:[],netto:1.5,zuSchmal:[],zuLang:[],optimal:true});

const MESSUNGEN=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",date:"2026-09-01",
  workflow_status:"freigegeben",freigabe_verfallen:false,created_by:"u1",created_at:"2026-09-01T08:00:00Z",
  sketch_paths:[],photo_paths:[],
  data:{material:2,abwicklung:250,ausmass:[{bezeichnung:"Blech Abwicklung 250 mm",menge:12,einheit:"Stück"}],
        rollen:plan([{nr:1,l:2070},{nr:2,l:2070},{nr:3,l:1850},{nr:4,l:1850,m:"Gehrung links"}])}},
 {id:12,project_id:7,type:"mauerabdeckung",title:"Garage",date:"2026-09-02",
  workflow_status:"zu_ruesten",freigabe_verfallen:true,created_by:"u1",created_at:"2026-09-02T08:00:00Z",
  sketch_paths:[],photo_paths:[],
  data:{material:3,abwicklung:460,ausmass:[{bezeichnung:"Abdeckung",menge:6,einheit:"Stück"}],
        rollen:Object.assign(plan([{nr:1,l:3020},{nr:2,l:2010}]),{abwicklung:460})}},
 {id:13,project_id:7,type:"skizze_foto",title:"Foto",date:"2026-09-03",
  workflow_status:"in_bearbeitung",created_by:"u1",created_at:"2026-09-03T08:00:00Z",
  sketch_paths:[],photo_paths:[],data:{material:2}}
];

const anmelden=(page,module)=>page.evaluate(([mods,mess])=>{
 currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
 allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
 meineRechte={admin:true};
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
 measurementMaterials=[{id:2,name:"Titanzink 0.7 mm"},{id:3,name:"Kupfer 0.6 mm"}];
 projektModule=mods; blechRollenbreiten=[1000,670];
 projectMeasurementsCache=mess;
 cockpitProjectId=7;
 window.__reste=[{id:1,laenge_mm:900,breite_mm:250,material_name:"Titanzink 0.7 mm",anzahl:1,verbraucht:false,reserviert_fuer_project_id:null},
                 {id:2,laenge_mm:700,breite_mm:250,material_name:"Titanzink 0.7 mm",anzahl:1,verbraucht:false,reserviert_fuer_project_id:null}];
 if(typeof reststuecke!=="undefined")reststuecke=window.__reste;
 $("appRoot").hidden=false;$("authScreen").hidden=true;
},[module,MESSUNGEN]);

const seite=(page)=>page.evaluate(()=>{
 const m=$("matZuModal");
 return {offen:!m.hidden,
   text:(m.innerText||"").replace(/\s+/g," ").trim(),
   kennzahlen:[...$("matZuKennzahlen").querySelectorAll("label")].map(l=>l.textContent.trim()),
   karten:[...$("matZuBody").querySelectorAll(".mz-karte")].map(k=>({
     titel:(k.querySelector(".mz-karte-titel")||{}).textContent,
     text:(k.innerText||"").replace(/\s+/g," ").trim(),
     knopf:(k.querySelector("button")||{}).textContent})),
   tabellenImHaupt:$("matZuBody").querySelectorAll("table").length,
   details:[...m.querySelectorAll("details.mz-details")].map(d=>({id:d.id,hidden:d.hidden,offen:d.open}))};
});

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let letzteMeldung=""; page.on("dialog",d=>{letzteMeldung=d.message();d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const ALLE={haupt:true,material:true,zuschnitt:true,reservierung:true};

 // ---- A · Modul aus: es gibt nichts -------------------------------------
 console.log("\nA · Modul aus");
 await anmelden(page,{});
 await page.evaluate(()=>{cockpitMatZuStand()});
 let z=await page.evaluate(()=>({karte:$("cockpitMatZuCard").hidden,zeile:$("cockpitStandMatZuZeile").hidden,
   alteKarten:["cockpitMaterialCard","cockpitZuschnittCard","cockpitReservierungCard"]
     .filter(id=>$(id)&&$(id).closest("#projectCockpitModal"))}));
 p(z.karte&&z.zeile,"ohne eingeschaltetes Modul gibt es weder Karte noch Zeile",z);
 p(z.alteKarten.length===0,"die drei alten Karten stehen nicht mehr im Cockpit",z.alteKarten);
 await page.evaluate(()=>openMaterialZuschnitt(7));
 p(await page.evaluate(()=>$("matZuModal").hidden),"und die Seite laesst sich nicht oeffnen");

 // ---- A2 · Nur das Zuschnittmodul aus -------------------------------------
 // v3.22: Bis v3.21 verschwand der ganze Zuschnittteil kommentarlos, sobald
 // das Untermodul aus war - obwohl es sehr wohl etwas zuzuschneiden gibt.
 // Jetzt steht dort der Grund und, fuer Administratoren, der Schalter.
 console.log("\nA2 · Nur Zuschnitt aus: Grund statt stiller Leere");
 await anmelden(page,{haupt:true,material:true,reservierung:true});
 await page.evaluate(()=>openMaterialZuschnitt(7));
 await page.waitForTimeout(400);
 const a2=await page.evaluate(()=>{
  const b=$("matZuBody");
  const h=b.querySelector(".ze-aus-hinweis");
  return {offen:!$("matZuModal").hidden,
    text:b.innerText,
    hinweis:h?h.innerText.trim():"",
    einKnopf:!!b.querySelector("[data-ze-ein]")};
 });
 p(a2.offen,"die Seite laesst sich oeffnen (Material ist an)",a2.offen);
 p(/Zuschnitt nach Massaufnahme/.test(a2.text),"die Ueberschrift steht da",a2.text.slice(0,200));
 p(/Zuschnitt/.test(a2.text)&&/\d/.test(a2.text),"und sagt, wie viele Zuschnitte es gibt");
 p(/abhaken/i.test(a2.hinweis)&&/eingeschaltet/i.test(a2.hinweis),
   "der Grund steht dabei",a2.hinweis);
 p(a2.einKnopf,"ein Administrator kann es dort einschalten",a2.einKnopf);
 await page.evaluate(()=>{$("matZuModal").hidden=true});

 // ---- B · Cockpit: eine kompakte Karte -----------------------------------
 console.log("\nB · Cockpit");
 await anmelden(page,ALLE);
 await page.evaluate(async()=>{
  // Das Cockpit muss offen sein, sonst ist jede gemessene Hoehe 0 (CLAUDE.md 113.5).
  $("startScreen").hidden=true; $("projectCockpitModal").hidden=false;
  await zeLaden([11,12,13],true); cockpitMatZuStand();
 });
 z=await page.evaluate(()=>({hidden:$("cockpitMatZuCard").hidden,
   text:($("cockpitMatZuText").innerText||"").replace(/\s+/g," ").trim(),
   zeile:($("cockpitStandMatZuZeile").innerText||"").replace(/\s+/g," ").trim(),
   knopf:($("cockpitMatZuOeffnen").innerText||"").trim(),
   hoehe:Math.round($("cockpitMatZuOeffnen").getBoundingClientRect().height)}));
 p(!z.hidden,"mit eingeschaltetem Modul steht die Karte da",z);
 p(/Material: 2 Positionen/.test(z.text),"sie nennt die Materialpositionen",z.text);
 p(/Zuschnitt: 0 von 6 erledigt/.test(z.text),"und den Zuschnittfortschritt",z.text);
 p(/6 Zuschnitte offen/.test(z.text),"und wie viele offen sind",z.text);
 p(/Material & Zuschnitt öffnen/i.test(z.knopf)&&z.hoehe>=44,"ein grosser Knopf fuehrt auf die Seite",z);

 // ---- C · Die Seite -------------------------------------------------------
 console.log("\nC · Die zentrale Seite");
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(250);
 let s=await seite(page);
 p(s.offen,"die Seite geht auf");
 p(JSON.stringify(s.kennzahlen)===JSON.stringify(["Materialpositionen","Zuschnitt offen","Zuschnitt erledigt","Massaufnahmen"]),
   "oben stehen genau die vier Kennzahlen",s.kennzahlen);
 p(/MATERIAL/i.test(s.text)&&/ZUSCHNITT NACH MASSAUFNAHME/i.test(s.text),"beide Bereiche mit klarer Ueberschrift",s.text.slice(0,200));
 p(s.tabellenImHaupt===0,"die Hauptansicht ist eine Kartenliste, KEINE Tabelle",s.tabellenImHaupt);
 const matK=s.karten.filter(k=>/Titanzink|Kupfer/.test(k.titel));
 p(matK.length===2,"je Material eine Karte",matK.map(k=>k.titel));
 p(!!matK[0]&&/Material reservieren/.test(matK[0].knopf||""),"ohne Reservierung: [Material reservieren]",matK[0]);
 const zuK=s.karten.filter(k=>/Einlaufblech|Mauerabdeckung/.test(k.titel));
 p(zuK.length===2,"je Massaufnahme mit Zuschnitt eine Karte",zuK.map(k=>k.titel));
 p(!s.karten.some(k=>/Skizze/.test(k.titel)),"eine Massaufnahme ohne Zuschnitt erscheint dort nicht");
 p(!!zuK[0]&&/4 Zuschnitte/.test(zuK[0].text)&&/0 von 4 erledigt/.test(zuK[0].text),"Anzahl und Fortschritt je Karte",zuK[0]);
 p(!!zuK[0]&&/Titanzink/.test(zuK[0].text),"das Material der Massaufnahme steht dabei",zuK[0]);
 p(!!zuK[0]&&/Zuschnitt öffnen/.test(zuK[0].knopf||""),"und ein Knopf fuehrt in die Zuschnittansicht",zuK[0]);
 p(/Freigabe verfallen/.test(zuK.map(k=>k.text).join(" ")),"eine verfallene Freigabe ist deutlich gekennzeichnet");
 p(/Reststücke verfügbar: 2/.test(s.text),"Reststuecke nur als eine Zeile",s.text.slice(0,600));
 p(s.details.length===3&&s.details.every(d=>!d.hidden&&!d.offen),
   "die ausfuehrlichen Ansichten stehen zugeklappt darunter",s.details);
 // Der Info-Knopf sitzt auf der Aufklapp-Zeile. Ein Klick darauf darf die
 // Einzelheiten NICHT mit aufklappen (CLAUDE.md 107.4) - gemessen, nicht
 // angenommen.
 await tipp(page,'#matZuDetailsMaterial summary [data-hilfe]'); await page.waitForTimeout(150);
 z=await page.evaluate(()=>({hilfe:!$("hilfeModal").hidden,auf:$("matZuDetailsMaterial").open}));
 p(z.hilfe&&!z.auf,"der Info-Knopf oeffnet die Hilfe und klappt nichts mit auf",z);
 await page.evaluate(()=>{$("hilfeModal").hidden=true});
 z=await page.evaluate(()=>["cockpit-material","cockpit-zuschnitt","cockpit-reservierung"]
   .filter(k=>!document.querySelector('[data-hilfe="'+k+'"]')));
 p(z.length===0,"jede der drei Ansichten hat ihre Erklaerung behalten",z);
 // Eine Massaufnahme ganz ohne Material darf keine Karte mit einem Knopf
 // erzeugen, der nichts zu reservieren hat.
 await page.evaluate(()=>{
  projectMeasurementsCache=projectMeasurementsCache.concat([{id:14,project_id:7,
   type:"skizze_foto",title:"Ohne",date:"2026-09-04",workflow_status:"in_bearbeitung",
   created_by:"u1",created_at:"2026-09-04T08:00:00Z",sketch_paths:[],photo_paths:[],data:{}}]);
  mzAuffrischen();
 });
 await page.waitForTimeout(150);
 s=await seite(page);
 p(!s.karten.some(k=>/Ohne Material/.test(k.titel||"")),
   "eine Massaufnahme ohne Material erzeugt keine leere Karte",s.karten.map(k=>k.titel));
 await page.evaluate(()=>{projectMeasurementsCache=projectMeasurementsCache.filter(m=>m.id!==14);mzAuffrischen()});
 await page.waitForTimeout(120);

 // ---- D · Abhaken ---------------------------------------------------------
 console.log("\nD · Ein Tap = erledigt");
 await page.evaluate(()=>{measEditReturnTo="";window.__ruf=[]});
 await page.evaluate(()=>{
  // Die Zuschnittansicht der Massaufnahme, wie ein Register-Modul sie zeichnet.
  // Bewusst in einen eigenen Behaelter und NICHT in #matZuBody: die zentrale
  // Seite schreibt ihren Koerper neu, ein Modul zeichnet dagegen in seinen
  // eigenen Bereich.
  // Die Seite und das Cockpit sind dabei zu - so wie im Betrieb, wenn man in
  // der Massaufnahme steht (mzZuschnittOeffnen schliesst beides).
  $("matZuModal").hidden=true; $("projectCockpitModal").hidden=true;
  zeFormularAuf(11);
  let d=document.getElementById("probe");
  if(!d){d=document.createElement("div");d.id="probe";document.body.appendChild(d)}
  d.innerHTML=zuschnittHtml(Object.assign({art:"rolle",einheit:"Stück"},
     zuPlanAusGespeichert(projectMeasurementsCache[0].data.rollen,250,"Stück")));
 });
 await page.waitForTimeout(200);
 let k=await page.evaluate(()=>({knoepfe:[...document.querySelectorAll("#probe [data-ze-nr]")].map(x=>({
    nr:x.dataset.zeNr,meas:x.dataset.zeMeas,h:Math.round(x.getBoundingClientRect().height),
    w:Math.round(x.getBoundingClientRect().width),an:x.classList.contains("ze-ok")})),
   stand:[...document.querySelectorAll("#probe [data-ze-stand]")].map(x=>x.textContent),
   alle:document.querySelectorAll("#probe [data-ze-alle]").length}));
 p(k.knoepfe.length===4,"jedes Stueck ist einzeln abhakbar",k.knoepfe.length);
 p(k.knoepfe.length>0&&k.knoepfe.every(x=>x.meas==="11"),"jeder Haken kennt seine Massaufnahme",k.knoepfe[0]);
 p(k.knoepfe.length>0&&k.knoepfe.every(x=>x.h>=34&&x.w>=34),"grosse Trefferflaeche",k.knoepfe[0]);
 p(k.stand.some(t=>/0\/2 erledigt/.test(t)),"gruppierte gleiche Zuschnitte zeigen den Stand",k.stand);
 p(k.alle>0,"und lassen sich in einem Tap ganz abhaken",k.alle);

 await tipp(page,'#probe [data-ze-nr="1"]'); await page.waitForTimeout(200);
 let r=await page.evaluate(()=>window.__ruf.filter(x=>x.art==="upsert"));
 p(r.length===1&&r[0]&&r[0].tabelle==="zuschnitt_erledigt","ein Tap schreibt genau einmal",r);
 p(!!r[0]&&r[0].rows.length===1&&r[0].rows[0].measurement_id===11&&r[0].rows[0].stueck_nr===1&&r[0].rows[0].erledigt===true,
   "mit Massaufnahme, Stuecknummer und erledigt",r[0]&&r[0].rows);
 const z0=(r[0]&&r[0].rows&&r[0].rows[0])||null;   // §78: kein Zugriff ins Leere
 p(!!z0&&z0.company_id===undefined,"und OHNE company_id vom Client",z0);
 p(!!z0&&z0.laenge_mm===2070&&z0.breite_mm===250,"die Masse werden als Beleg mitgeschrieben",z0);
 k=await page.evaluate(()=>({an:[...document.querySelectorAll("#probe [data-ze-nr]")].map(x=>x.classList.contains("ze-ok")),
   stand:[...document.querySelectorAll("#probe [data-ze-stand]")].map(x=>x.textContent)}));
 p(k.an[0]===true&&k.an.filter(Boolean).length===1,"genau dieses Stueck ist markiert",k.an);
 p(k.stand.some(t=>/1\/2 erledigt/.test(t)),"der Gruppenstand folgt sofort",k.stand);

 await tipp(page,'#probe [data-ze-nr="1"]'); await page.waitForTimeout(200);
 k=await page.evaluate(()=>[...document.querySelectorAll("#probe [data-ze-nr]")].map(x=>x.classList.contains("ze-ok")));
 p(k[0]===false,"nochmals tippen nimmt den Haken zurueck",k);

 await page.evaluate(()=>{window.__ruf=[]});
 await tipp(page,'#probe [data-ze-alle]'); await page.waitForTimeout(250);
 r=await page.evaluate(()=>window.__ruf.filter(x=>x.art==="upsert"));
 p(r.length===1&&!!r[0]&&r[0].rows.length===2,'"alle" schreibt die ganze Gruppe in einem Aufruf',r);
 k=await page.evaluate(()=>[...document.querySelectorAll("#probe [data-ze-stand]")].map(x=>x.textContent));
 p(k.some(t=>/2\/2 erledigt/.test(t)),"und die Gruppe ist danach vollstaendig",k);

 // ---- E · Der Fortschritt schlaegt bis in die Seite und die Karte durch ---
 console.log("\nE · Fortschritt");
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(250);
 s=await seite(page);
 const zk=s.karten.find(k=>/Einlaufblech/.test(k.titel));
 p(!!zk&&/2 von 4 erledigt/.test(zk.text),"die Karte zeigt den Teilfortschritt",zk);
 p(/Zuschnitt erledigt 2 von 6/i.test(s.text.replace(/\s+/g," ")),"die Kennzahl auch",s.text.slice(0,400));
 await page.evaluate(()=>cockpitMatZuStand());
 z=await page.evaluate(()=>($("cockpitMatZuText").innerText||"").replace(/\s+/g," ").trim());
 p(/Zuschnitt: 2 von 6 erledigt/.test(z)&&/4 Zuschnitte offen/.test(z),"und die Cockpit-Karte",z);

 // ---- F · Keine zweite Rechnung ------------------------------------------
 console.log("\nF · keine zweite Rechnung");
 const t56=require("fs").readFileSync("js/56-material-zuschnitt.js","utf8");
 const quelle={eigenePack:/function\s+mz\w*Pack|function\s+ze\w*Pack/.test(t56),
               nutztPmat:/pmatStuecke|pmatSammeln/.test(t56),
               nutztZu:/zuschnittHtml/.test(t56)};
 p(!quelle.eigenePack,"js/56 baut keine eigene Packrechnung",quelle);
 p(quelle.nutztPmat,"es liest den gespeicherten Plan ueber js/48",quelle);

 // Der projektweite Plan traegt sammel:true -> dort wird NICHT abgehakt.
 const sammel=await page.evaluate(()=>{
  const g=pzuSammeln(projectMeasurementsCache);
  if(!g.materialien.length)return {sammel:false,html:true,leer:true};
  const pl=pzuPlan(g.materialien[0]);
  return {sammel:!!pl.sammel,html:/data-ze-nr/.test(zuschnittHtml(pl))};
 });
 p(sammel.sammel&&!sammel.html,"in der projektweiten Zusammenfassung wird nicht abgehakt",sammel);

 // ---- G · Zuschnitt oeffnen ----------------------------------------------
 console.log("\nG · Zuschnitt öffnen");
 for(const [id,art,soll] of [[11,"einlaufblech_gerade",4],[12,"mauerabdeckung",6]]){
  const reg=await page.evaluate(a=>{const r=mzZuschnittRegister(a);return r?r.nr:null},art);
  p(reg===soll,"das Zuschnitt-Register von "+art+" wird gefunden ("+reg+")",reg);
 }
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(200);
 await tipp(page,'[data-mz-zuschnitt="11"]'); await page.waitForTimeout(300);
 z=await page.evaluate(()=>({seiteZu:$("matZuModal").hidden,formular:!$("measurementEditModal").hidden,
   zurueck:typeof measEditReturnTo!=="undefined"?measEditReturnTo:null,
   register:typeof ebaSchritt!=="undefined"?ebaSchritt:null}));
 p(z.seiteZu&&z.formular,"der Knopf oeffnet die Massaufnahme",z);
 p(z.register===4,"und stellt auf ihr Zuschnitt-Register",z);
 p(z.zurueck==="projectCockpit","der Rueckweg fuehrt ins Projekt",z);
 await page.evaluate(()=>{$("measurementEditModal").hidden=true});

 // ---- H · Fehler der Datenbank -------------------------------------------
 console.log("\nH · Fehlerfall");
 await page.evaluate(()=>{
  window.__fehlerBeimSchreiben=true; zeFormularAuf(11);
  $("matZuModal").hidden=true; $("projectCockpitModal").hidden=true;
  let d=document.getElementById("probe");
  if(!d){d=document.createElement("div");d.id="probe";document.body.appendChild(d)}
  d.innerHTML=zuschnittHtml(Object.assign({art:"rolle",einheit:"Stück"},
    zuPlanAusGespeichert(projectMeasurementsCache[0].data.rollen,250,"Stück")));
 });
 await page.waitForTimeout(200);
 await page.evaluate(()=>{}); letzteMeldung="";
 await tipp(page,'#probe [data-ze-nr="3"]'); await page.waitForTimeout(250);
 p(/Berechtigung/.test(letzteMeldung),"0 geschriebene Zeilen gelten NICHT als Erfolg",letzteMeldung);
 await page.evaluate(()=>{window.__fehlerBeimSchreiben=false});

 // ---- I · Mobil -----------------------------------------------------------
 console.log("\nI · Mobil");
 await page.evaluate(()=>openMaterialZuschnitt(7)); await page.waitForTimeout(250);
 for(const br of [320,360,390]){
  await page.setViewportSize({width:br,height:1600});
  await page.waitForTimeout(120);
  const m=await page.evaluate(()=>{
   const box=$("matZuModal");
   let raus=0;
   box.querySelectorAll(".mz-karte,.mz-kennzahl,.mz-knopf").forEach(e=>{
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>document.documentElement.clientWidth+1)raus++;
   });
   const kn=[...box.querySelectorAll(".mz-knopf")].map(e=>Math.round(e.getBoundingClientRect().height));
   return {raus,klein:kn.filter(h=>h<40).length,
           scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(m.raus===0&&!m.scroll&&m.klein===0,"passt bei "+br+" px, Knoepfe gross genug",m);
 }
 await page.setViewportSize({width:412,height:1800});

 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close(); process.exit(fail?1:0);
})();

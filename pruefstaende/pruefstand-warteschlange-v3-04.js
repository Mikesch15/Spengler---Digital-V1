// Prueft die Offline-Warteschlange aus v3.04 (js/43-warteschlange.js).
//
// Geladen wird die echte index.html mit echten Skripten. Supabase wird durch
// eine Attrappe ersetzt, die jeden Aufruf protokolliert - so laesst sich
// pruefen, WAS gesendet wuerde, ohne die Sandbox-Netzsperre zu umgehen.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-warteschlange-v3-04.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

// Eine Supabase-Attrappe, die sich merken laesst, was sie bekommt.
const STUB=`window.__db={log:[],zeilen:{},naechsteId:100,fehler:null,konflikt:null};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({
   upload:async(pfad)=>{window.__db.log.push({op:"upload",pfad});return {data:{path:pfad},error:null}},
   createSignedUrl:async(pfad)=>({data:{signedUrl:"https://test.example/"+pfad},error:null})})},
 from:(t)=>{
  const zustand={tabelle:t,op:null,daten:null,filter:null};
  const q={};
  q.insert=d=>{zustand.op="insert";zustand.daten=d;return q};
  q.update=d=>{zustand.op="update";zustand.daten=d;return q};
  q.delete=()=>{zustand.op="delete";return q};
  q.select=()=>{if(!zustand.op)zustand.op="select";return q};
  q.eq=(f,v)=>{zustand.filter={f,v};return q};
  q.order=()=>q; q.limit=()=>q; q.range=()=>q;
  const ausfuehren=()=>{
   window.__db.log.push({tabelle:t,op:zustand.op,daten:zustand.daten,filter:zustand.filter});
   if(window.__db.fehler&&window.__db.fehler.tabelle===t&&window.__db.fehler.op===zustand.op)
     return {data:null,error:{message:window.__db.fehler.text}};
   if(zustand.op==="insert"){
    const id=window.__db.naechsteId++;
    const zeile=Object.assign({id},zustand.daten);
    window.__db.zeilen[t]=(window.__db.zeilen[t]||[]).concat([zeile]);
    return {data:zeile,error:null};
   }
   if(zustand.op==="update"){
    const liste=(window.__db.zeilen[t]||[]).filter(z=>!zustand.filter||String(z.id)===String(zustand.filter.v));
    liste.forEach(z=>Object.assign(z,zustand.daten));
    return {data:liste,error:null};
   }
   if(zustand.op==="select"){
    let liste=window.__db.zeilen[t]||[];
    if(zustand.filter)liste=liste.filter(z=>String(z.id)===String(zustand.filter.v));
    return {data:liste,error:null};
   }
   return {data:[],error:null};
  };
  q.maybeSingle=()=>{const r=ausfuehren();
    return Promise.resolve({data:Array.isArray(r.data)?(r.data[0]||null):r.data,error:r.error})};
  q.single=q.maybeSingle;
  q.then=(f,g)=>Promise.resolve(ausfuehren()).then(f,g);
  return q;
 },
 rpc:async()=>({data:true,error:null})
})};`;

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"firma-A"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12",order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  companyName="Peter Künzi AG";
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  // "offline" simulieren
  Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>window.__offline!==true?true:false});
  window.__offline=false;
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const offline=async an=>{await page.evaluate(a=>{window.__offline=a},an)};
 const leeren=async()=>{await page.evaluate(async()=>{await wsLeeren();
   window.__db.log=[];window.__db.zeilen={};window.__db.naechsteId=100;window.__db.fehler=null})};
 const liste=()=>page.evaluate(async()=>(await wsAlle()).map(e=>({tabelle:e.tabelle,art:e.art,
   zielId:e.zielId,tmpId:e.tmpId,payload:e.payload,titel:e.titel,fehler:e.fehler,
   konflikt:!!e.konflikt,bilder:e.bilder?Object.keys(e.bilder).map(k=>k+":"+e.bilder[k].length):null})));
 const log=()=>page.evaluate(()=>window.__db.log.map(x=>({t:x.tabelle,op:x.op,daten:x.daten,filter:x.filter,pfad:x.pfad})));

 // ==========================================================================
 // A · Grundlage
 // ==========================================================================
 console.log("\nA · Grundlage");
 const da=await page.evaluate(()=>({modul:typeof wsEinreihen==="function",
   sync:typeof wsSynchronisieren==="function", knopf:!!$("wsKnopf"), modal:!!$("wsModal"),
   idb:typeof indexedDB!=="undefined"}));
 p(da.modul&&da.sync,"das Warteschlangen-Modul ist geladen",da);
 p(da.knopf&&da.modal,"Knopf und Dialog sind vorhanden",da);
 p(da.idb,"IndexedDB steht zur Verfügung (Fotos passen nicht in localStorage)");
 const knopfLeer=await page.evaluate(async()=>{await wsAnzeigeAuffrischen();
   return {hidden:$("wsKnopf").hidden}});
 p(knopfLeer.hidden===true,"ohne wartende Einträge ist der Knopf unsichtbar",knopfLeer);

 // ==========================================================================
 // B · Einreihen ohne Verbindung
 // ==========================================================================
 console.log("\nB · Ohne Verbindung wird erfasst statt abgelehnt");
 await leeren(); await offline(true);
 const einAus=await page.evaluate(async()=>{
   const vorher=window.__db.log.length;
   const r=await wsEinreihen({tabelle:"measurements",titel:"Kehle Nord",
     payload:{project_id:7,type:"kehle",title:"Kehle Nord",data:{material:2}},
     bilder:{photo_paths:["data:image/png;base64,AAA"],sketch_paths:[]}});
   return {r,dbAufrufe:window.__db.log.length-vorher};});
 p(einAus.r.ok===true,"eine Massaufnahme lässt sich ohne Verbindung einreihen",einAus.r);
 p(einAus.dbAufrufe===0,"dabei wird KEIN Datenbank-Aufruf abgesetzt",einAus);
 const l1=await liste();
 p(l1.length===1&&l1[0].tabelle==="measurements","sie liegt in der Warteschlange",l1);
 p(l1[0].art==="insert"&&!!l1[0].tmpId,"ein neuer Datensatz bekommt eine temporäre ID",l1[0]);
 p(l1[0].bilder&&l1[0].bilder.indexOf("photo_paths:1")>=0,
   "das Foto reist als data:-URL mit, es wird nichts hochgeladen",l1[0].bilder);
 const knopfVoll=await page.evaluate(async()=>{await wsAnzeigeAuffrischen();
   return {hidden:$("wsKnopf").hidden,text:$("wsKnopf").textContent}});
 p(knopfVoll.hidden===false&&/1 Eintrag wartet/.test(knopfVoll.text),
   "der Knopf zeigt an, dass etwas wartet",knopfVoll);
 p(l1[0].payload.company_id===undefined,
   "der Eintrag trägt KEINE company_id – die setzt die Datenbank",l1[0].payload);

 // ==========================================================================
 // C · Uebertragen, sobald wieder Verbindung besteht
 // ==========================================================================
 console.log("\nC · Übertragen");
 await offline(false);
 const b1=await page.evaluate(()=>wsSynchronisieren());
 p(b1.gesendet===1,"der wartende Eintrag wird übertragen",b1);
 p((await liste()).length===0,"danach ist die Warteschlange leer");
 const lg=await log();
 const ins=lg.filter(x=>x.t==="measurements"&&x.op==="insert");
 p(ins.length===1,"genau EIN Insert – nichts doppelt",lg.map(x=>x.t+"/"+x.op));
 p(ins.length===1&&ins[0].daten.title==="Kehle Nord","mit den erfassten Werten",ins[0]&&ins[0].daten);
 p(ins.length===1&&ins[0].daten.photo_paths===undefined,
   "das Bild ist NICHT im Insert – es braucht erst die Zeilen-ID",ins[0]&&ins[0].daten);
 const up=lg.filter(x=>x.pfad);
 p(up.length===1&&/^measurements\/7\/100\/photo\//.test(up[0].pfad),
   "das Foto wird danach unter measurements/<projekt>/<id>/photo abgelegt",up.map(x=>x.pfad));
 const nach=lg.filter(x=>x.t==="measurements"&&x.op==="update");
 p(nach.length===1&&Array.isArray(nach[0].daten.photo_paths)&&nach[0].daten.photo_paths.length===1,
   "und danach mit der Zeile verknüpft",nach[0]&&nach[0].daten);
 p(nach.length===1&&nach[0].daten.photo_path===nach[0].daten.photo_paths[0],
   "photo_path trägt weiterhin das erste Foto",nach[0]&&nach[0].daten);

 // ==========================================================================
 // D · Temporaere Projekt-ID
 // ==========================================================================
 console.log("\nD · Offline angelegtes Projekt und was darauf zeigt");
 await leeren(); await offline(true);
 const tmp=await page.evaluate(async()=>{
   const pr=await wsEinreihen({tabelle:"projects",titel:"Neue Baustelle",
     payload:{name:"Neubau",order_no:"2026-999",customer:"X AG",object:"Feldweg 1"}});
   await wsEinreihen({tabelle:"measurements",titel:"Rinne",
     payload:{project_id:pr.tmpId,type:"rinne_halbrund",title:"Rinne",data:{}}});
   await wsEinreihen({tabelle:"reports",titel:"Rapport",
     payload:{project_id:pr.tmpId,date:"2026-09-05",work_entries:[],material_entries:[]}});
   return pr.tmpId;});
 const l2=await liste();
 p(l2.length===3,"Projekt, Massaufnahme und Rapport warten",l2.length);
 p(l2[1].payload.project_id===tmp&&l2[2].payload.project_id===tmp,
   "beide zeigen auf die temporäre Projekt-ID",{tmp,m:l2[1].payload.project_id});
 await offline(false);
 const b2=await page.evaluate(()=>wsSynchronisieren());
 p(b2.gesendet===3,"alle drei werden übertragen",b2);
 const lg2=await log();
 const prIns=lg2.find(x=>x.t==="projects"&&x.op==="insert");
 const mIns=lg2.find(x=>x.t==="measurements"&&x.op==="insert");
 const rIns=lg2.find(x=>x.t==="reports"&&x.op==="insert");
 p(!!prIns&&!!mIns&&!!rIns,"jede Tabelle bekommt ihren Insert");
 const echteId=await page.evaluate(()=>window.__db.zeilen.projects[0].id);
 p(mIns&&String(mIns.daten.project_id)===String(echteId),
   "die Massaufnahme trägt jetzt die ECHTE Projekt-ID",{soll:echteId,ist:mIns&&mIns.daten.project_id});
 p(rIns&&String(rIns.daten.project_id)===String(echteId),
   "der Rapport ebenso",{soll:echteId,ist:rIns&&rIns.daten.project_id});
 p(String(mIns&&mIns.daten.project_id).indexOf("tmp-")<0,
   "keine temporäre ID landet in der Datenbank",mIns&&mIns.daten.project_id);

 // Scheitert das Projekt, duerfen die abhaengigen NICHT gesendet werden
 console.log("\nD2 · Scheitert das Projekt, warten die abhängigen mit");
 await leeren(); await offline(true);
 await page.evaluate(async()=>{
   const pr=await wsEinreihen({tabelle:"projects",titel:"Kaputt",
     payload:{name:"Kaputt",order_no:"1",customer:"",object:"Weg 2"}});
   await wsEinreihen({tabelle:"measurements",titel:"Haengt dran",
     payload:{project_id:pr.tmpId,type:"kehle",title:"Haengt dran",data:{}}});});
 await offline(false);
 const b3=await page.evaluate(async()=>{
   window.__db.fehler={tabelle:"projects",op:"insert",text:"absichtlich"};
   return wsSynchronisieren();});
 p(b3.fehler===1&&b3.wartet===1,"das Projekt scheitert, die Massaufnahme wartet",b3);
 const lg3=await log();
 p(!lg3.some(x=>x.t==="measurements"&&x.op==="insert"),
   "die abhängige Massaufnahme wird NICHT gesendet",lg3.map(x=>x.t+"/"+x.op));
 const l3=await liste();
 p(l3.length===2,"beide bleiben in der Warteschlange",l3.length);
 // Und beim naechsten Lauf, wenn es klappt, gehen beide durch
 const b4=await page.evaluate(async()=>{window.__db.fehler=null;return wsSynchronisieren()});
 p(b4.gesendet===2,"beim nächsten Versuch gehen beide durch",b4);
 p((await liste()).length===0,"die Warteschlange ist danach leer");

 // ==========================================================================
 // E · Konflikt bei einer Aenderung
 // ==========================================================================
 console.log("\nE · Konflikt: jemand anderes war schneller");
 await leeren();
 await page.evaluate(()=>{window.__db.zeilen.measurements=[
   {id:55,title:"Original",updated_at:"2026-09-05T08:00:00Z"}]});
 await offline(true);
 await page.evaluate(()=>wsEinreihen({tabelle:"measurements",zielId:55,
   standVorher:"2026-09-05T08:00:00Z",titel:"Meine Änderung",
   payload:{title:"Meine Änderung",data:{}}}));
 await offline(false);
 // Jemand anderes aendert die Zeile in der Zwischenzeit
 await page.evaluate(()=>{window.__db.zeilen.measurements[0].updated_at="2026-09-05T09:30:00Z";
   window.__db.zeilen.measurements[0].title="Fremde Änderung";window.__db.log=[]});
 const b5=await page.evaluate(()=>wsSynchronisieren());
 p(b5.konflikt===1&&!b5.gesendet,"der Konflikt wird erkannt, nichts wird gesendet",b5);
 const nachKonflikt=await page.evaluate(()=>window.__db.zeilen.measurements[0].title);
 p(nachKonflikt==="Fremde Änderung","die fremde Fassung wurde NICHT überschrieben",nachKonflikt);
 const l5=await liste();
 p(l5.length===1&&l5[0].konflikt===true,"der Eintrag bleibt als Konflikt stehen",l5[0]);
 const dlg=await page.evaluate(async()=>{await wsListeZeichnen();
   return {text:$("wsListe").innerText.replace(/\s+/g," "),
     nehmen:$("wsListe").querySelectorAll("[data-ws-nehmen]").length,
     weg:$("wsListe").querySelectorAll("[data-ws-weg]").length}});
 p(/zwischenzeitlich geändert/.test(dlg.text),"der Dialog erklärt den Konflikt",dlg.text.slice(0,120));
 p(dlg.nehmen===1&&dlg.weg===1,"und bietet beide Entscheidungen an",dlg);
 // "Meine Fassung nehmen"
 await page.evaluate(async()=>{
   const l=await wsAlle();
   if(l[0]){l[0].konfliktEntschieden=true; await wsLegen(l[0])}
   await wsSynchronisieren();});
 const nachNehmen=await page.evaluate(()=>window.__db.zeilen.measurements[0].title);
 p(nachNehmen==="Meine Änderung","nach \"meine Fassung nehmen\" wird sie geschrieben",nachNehmen);
 p((await liste()).length===0,"und der Eintrag verschwindet");

 // Ohne Konflikt geht eine Aenderung glatt durch
 await leeren();
 await page.evaluate(()=>{window.__db.zeilen.measurements=[
   {id:56,title:"Original",updated_at:"2026-09-05T08:00:00Z"}];window.__db.log=[]});
 await offline(true);
 await page.evaluate(()=>wsEinreihen({tabelle:"measurements",zielId:56,
   standVorher:"2026-09-05T08:00:00Z",titel:"Meine",payload:{title:"Meine",data:{}}}));
 await offline(false);
 const b6=await page.evaluate(()=>wsSynchronisieren());
 p(b6.gesendet===1&&!b6.konflikt,"ohne fremde Änderung geht sie glatt durch",b6);

 // ==========================================================================
 // E2 · Zweimal speichern ergibt EINEN Eintrag
 // ==========================================================================
 console.log("\nE2 · Zweimal speichern ohne Verbindung");
 await leeren(); await offline(true);
 const zwei=await page.evaluate(async()=>{
   // Ein NEUER Datensatz, zweimal gespeichert (dieselbe Formular-Marke)
   const a=await wsEinreihen({tabelle:"measurements",titel:"Erst so",schluessel:"meas-XYZ",
     payload:{project_id:7,type:"kehle",title:"Erst so",data:{nh:40}}});
   const b=await wsEinreihen({tabelle:"measurements",titel:"Dann so",schluessel:"meas-XYZ",
     payload:{project_id:7,type:"kehle",title:"Dann so",data:{nh:42}}});
   const l=await wsAlle();
   return {a,b,anzahl:l.length,titel:l[0]&&l[0].payload.title,
     nh:l[0]&&l[0].payload.data.nh};});
 p(zwei.anzahl===1,"zweimal speichern ergibt EINEN Eintrag, keinen doppelten Datensatz",zwei);
 p(zwei.titel==="Dann so"&&zwei.nh===42,"und zwar den zuletzt gespeicherten Stand",zwei);
 p(zwei.b.ersetzt===true,"der zweite Aufruf ersetzt den ersten",zwei.b);
 p(zwei.a.tmpId===zwei.b.tmpId,
   "die temporäre ID bleibt gleich – bereits Eingereihtes zeigt weiter darauf",zwei);
 await offline(false);
 const bZwei=await page.evaluate(()=>wsSynchronisieren());
 const lgZwei=await log();
 p(bZwei.gesendet===1&&lgZwei.filter(x=>x.op==="insert"&&x.t==="measurements").length===1,
   "gesendet wird genau ein Insert",{bZwei,inserts:lgZwei.filter(x=>x.op==="insert").length});
 // Und bei einer AENDERUNG: der Vergleichsstand bleibt der vor der ersten
 await leeren();
 await page.evaluate(()=>{window.__db.zeilen.measurements=[
   {id:77,title:"Original",updated_at:"2026-09-05T08:00:00Z"}];window.__db.log=[]});
 await offline(true);
 const zweiU=await page.evaluate(async()=>{
   await wsEinreihen({tabelle:"measurements",zielId:77,standVorher:"2026-09-05T08:00:00Z",
     titel:"A",payload:{title:"A",data:{}}});
   await wsEinreihen({tabelle:"measurements",zielId:77,standVorher:"2026-09-05T09:00:00Z",
     titel:"B",payload:{title:"B",data:{}}});
   const l=await wsAlle();
   return {anzahl:l.length,titel:l[0]&&l[0].payload.title,stand:l[0]&&l[0].standVorher};});
 p(zweiU.anzahl===1,"eine zweimal geänderte Zeile ergibt EINEN Eintrag",zweiU);
 p(zweiU.titel==="B","mit dem zuletzt gespeicherten Stand",zweiU);
 p(zweiU.stand==="2026-09-05T08:00:00Z",
   "der Vergleichsstand bleibt der VOR der ersten eigenen Änderung",zweiU);
 await offline(false);
 const bU=await page.evaluate(()=>wsSynchronisieren());
 p(bU.gesendet===1&&!bU.konflikt,
   "die eigene zweite Änderung erzeugt KEINEN Konflikt gegen die eigene erste",bU);

 // ==========================================================================
 // F · Firmentrennung
 // ==========================================================================
 console.log("\nF · Die Warteschlange gehört genau einer Firma");
 await leeren(); await offline(true);
 await page.evaluate(()=>wsEinreihen({tabelle:"feedback",titel:"A",
   payload:{module:"allgemein",message:"von Firma A"}}));
 const fremd=await page.evaluate(async()=>{
   const eigen=(await wsAlle()).length;
   currentProfile.company_id="firma-B";        // andere Firma meldet sich an
   const gesehen=(await wsAlle()).length;
   currentProfile.company_id="firma-A";        // zurueck
   const danach=(await wsAlle()).length;
   return {eigen,gesehen,danach};});
 p(fremd.eigen===1,"Firma A sieht ihren eigenen Eintrag",fremd);
 p(fremd.gesehen===0,"Firma B sieht davon NICHTS",fremd);
 p(fremd.danach===0,"und der Rest wird dabei sofort entfernt",fremd);

 // ==========================================================================
 // G · Was NICHT in die Warteschlange darf
 // ==========================================================================
 console.log("\nG · Löschen und Verwaltung brauchen weiterhin eine Verbindung");
 const sperre=await page.evaluate(()=>({
   funktion:typeof offlineSperrtSpeichern==="function",
   // Die Speicherwege, die jetzt einreihen, rufen die Sperre NICHT mehr.
   quellen:[["reste",typeof restEinlagern==="function"]]}));
 p(sperre.funktion,"die klare Absage aus js/27 gibt es weiterhin");
 // Quelltext in Node lesen - fetch() geht auf file:// nicht.
 const fs=require("fs");
 const lies=d=>fs.readFileSync(path.join(process.cwd(),d),"utf8");
 const src=(()=>{
   const m=lies("js/16-massaufnahme-formular.js");
   const a=lies("js/17-ausmass.js");
   const pr=lies("js/09-projekte.js");
   const rap=lies("js/08-katalog-blitzschutz.js");
   const fb=lies("js/02-feedback.js");
   const re=lies("js/42-reste.js");
   return {mess:m.indexOf("wsEinreihen")>=0, ausmass:a.indexOf("wsEinreihen")>=0,
     projekt:pr.indexOf("wsEinreihen")>=0, rapport:rap.indexOf("wsEinreihen")>=0,
     feedback:fb.indexOf("wsEinreihen")>=0,
     resteSperrt:re.indexOf("offlineSperrtSpeichern")>=0&&re.indexOf("wsEinreihen")<0,
     messSperrt:m.indexOf('offlineSperrtSpeichern("Diese Massaufnahme")')>=0};})();
 p(src.mess&&src.ausmass&&src.projekt&&src.rapport&&src.feedback,
   "alle fünf Erfassungswege reihen ein statt abzulehnen",src);
 p(!src.messSperrt,"die alte harte Absage steht nicht mehr im Massaufnahme-Weg",src);
 p(src.resteSperrt,"das Reststück-Lager lehnt weiterhin ab (kein Baustellen-Schritt)",src);
 // Ohne Marke wuerde zweimaliges Speichern in einem Formular zwei Eintraege
 // ergeben (siehe E2) - jeder Erfassungsweg muss also eine mitgeben.
 const marken=(()=>{
   const m=lies("js/16-massaufnahme-formular.js"), a=lies("js/17-ausmass.js"),
     pr=lies("js/09-projekte.js"), rap=lies("js/08-katalog-blitzschutz.js"),
     fb=lies("js/02-feedback.js");
   const hat=(q,t)=>{const i=q.indexOf('tabelle:"'+t+'"'); if(i<0)return false;
     return q.slice(i,i+700).indexOf("schluessel:")>=0;};
   return {mess:hat(m,"measurements"), ausmass:hat(a,"ausmass"),
     rapport:hat(rap,"reports"), feedback:hat(fb,"feedback"),
     // Ein Projekt legt man nicht zweimal mit demselben Formular an - dort
     // ist eine Marke nicht noetig und bewusst nicht gesetzt.
     projekt:hat(pr,"projects")};})();
 p(marken.mess&&marken.ausmass&&marken.rapport&&marken.feedback,
   "Massaufnahme, Ausmass, Rapport und Feedback geben eine Marke mit",marken);
 // Der Tabellenname steht im Eintrag AUF DEM GERAET - jemand mit Zugriff auf
 // den Browserspeicher koennte ihn aendern. Die Warteschlange schreibt
 // deshalb nur in die fuenf Tabellen, fuer die sie gedacht ist.
 const fremdeTabelle=await page.evaluate(async()=>{
   const r=await wsEinreihen({tabelle:"profiles",titel:"X",payload:{role:"admin"}});
   const l=await wsAlle();
   return {abgelehnt:r.ok===false,grund:r.grund,inListe:l.length};});
 p(fremdeTabelle.abgelehnt,"eine fremde Tabelle wird gar nicht erst eingereiht",fremdeTabelle);
 p(fremdeTabelle.inListe===0,"und landet nicht in der Warteschlange",fremdeTabelle);
 // Und wenn doch einer dort liegt (von Hand hineingeschrieben), wird er nicht gesendet
 const geschmuggelt=await page.evaluate(async()=>{
   await wsLegen({id:"schmuggel",firma:wsFirma(),tabelle:"profiles",art:"insert",
     payload:{role:"admin"},erstellt:new Date().toISOString(),versuche:0});
   window.__db.log=[];
   const b=await wsSynchronisieren();
   const l=await wsAlle();
   await wsWeg("schmuggel");
   return {b,profileAufrufe:window.__db.log.filter(x=>x.t==="profiles").length,rest:l.length};});
 p(geschmuggelt.profileAufrufe===0,
   "ein von Hand eingeschmuggelter Eintrag wird NICHT gesendet",geschmuggelt);

 // ==========================================================================
 // H · Dialog und Fehlerfall
 // ==========================================================================
 console.log("\nH · Dialog, Fehler, Verwerfen");
 await leeren(); await offline(true);
 await page.evaluate(()=>wsEinreihen({tabelle:"ausmass",titel:"Offerte Nord",
   payload:{project_id:7,type:"offerte_erfassen",title:"Offerte Nord",positions:[]}}));
 await offline(false);
 const b7=await page.evaluate(async()=>{
   window.__db.fehler={tabelle:"ausmass",op:"insert",text:"Berechtigung fehlt"};
   return wsSynchronisieren();});
 p(b7.fehler===1,"ein Fehler beim Senden hält den Eintrag",b7);
 const l7=await liste();
 p(l7.length===1&&/Berechtigung fehlt/.test(l7[0].fehler||""),
   "der Grund wird beim Eintrag vermerkt",l7[0]&&l7[0].fehler);
 const dlg2=await page.evaluate(async()=>{await wsListeZeichnen();
   return {text:$("wsListe").innerText.replace(/\s+/g," "),
     weg:$("wsListe").querySelectorAll("[data-ws-weg]").length}});
 p(/Berechtigung fehlt/.test(dlg2.text),"und im Dialog genannt",dlg2.text.slice(0,140));
 p(dlg2.weg===1,"der Eintrag lässt sich verwerfen",dlg2);
 await page.evaluate(async()=>{const l=await wsAlle();if(l[0])await wsWeg(l[0].id)});
 p((await liste()).length===0,"verwerfen entfernt ihn wirklich");
 // Der Eintrag darf nach einem Fehler NICHT doppelt entstanden sein
 const zeilen=await page.evaluate(()=>(window.__db.zeilen.ausmass||[]).length);
 p(zeilen===0,"nach einem gescheiterten Insert steht keine halbe Zeile da",zeilen);

 // ==========================================================================
 // I · Wartendes Projekt in der Liste
 // ==========================================================================
 console.log("\nI · Ein wartendes Projekt ist als solches erkennbar");
 const pl=await page.evaluate(()=>{
   allProjects=allProjects.concat([{id:"tmp-x",name:"Neubau",object:"Feldweg 1",
     order_no:"9",customer:"",archived:false,status:"offen",wartet:true}]);
   showArchivedProjects=false; projectStatusFilter="alle"; projectSucheText="";
   renderProjectList();
   const box=$("projectList");
   const zeilen=Array.from(box.querySelectorAll(".project-row"));
   const w=zeilen.find(z=>z.innerText.indexOf("Feldweg 1")>=0);
   return {gefunden:!!w, text:w?w.innerText.replace(/\s+/g," "):"",
     oeffnen:w?w.querySelectorAll("[data-open-cockpit]").length:-1,
     loeschen:w?w.querySelectorAll("[data-del-project]").length:-1,
     andere:zeilen.length};});
 p(pl.gefunden,"das wartende Projekt steht in der Liste",pl);
 p(/Wartet auf die Übertragung/.test(pl.text),"und ist als wartend gekennzeichnet",pl.text.slice(0,140));
 p(pl.oeffnen===0&&pl.loeschen===0,
   "Öffnen und Löschen sind dort nicht angeboten – die Zeile gibt es serverseitig noch nicht",pl);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();

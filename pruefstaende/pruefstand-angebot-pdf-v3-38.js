"use strict";
// ---- Pruefstand: PDF der Offerte hochladen (v3.38) ------------------------
//
// Auftrag (Wunsch des Betriebs, woertlich): "ich komme nach wie vor nur zu
// meiner fotogalerie, der wunsch war aber das ich ein pdf der offerte
// hochladen kann". Die Fotogalerie (angPhotos/recognizePhoto) dient
// AUSSCHLIESSLICH der KI-Positionserkennung und ist bereits vollstaendig in
// pruefstand-angebote-v3-34.js geprueft - hier geht es ausschliesslich um
// das NEUE, davon getrennte Feld fuer das eigentliche Offert-DOKUMENT als
// PDF (angPdfExisting/angPdfNewFile, uploadAngebotPdf(), renderAngPdfBereich(),
// #angPdfInput/#angPdfBereich, [data-ang-pdf-oeffnen]/[data-ang-pdf-entfernen]).
//
// Geprueft:
//  1  Leerer Zustand ohne PDF
//  2  Gueltiges PDF auswaehlen (Vorschau, Groesse, "wird beim Speichern
//     hochgeladen")
//  3  Falsches Dateiformat wird abgewiesen (kein Upload, keine Auswahl)
//  4  Zu grosse Datei (>50 MB) wird abgewiesen, mit der exakten Meldung aus
//     formatFileSize()/MAX_DATEI_TEXT (js/09-projekte.js, unveraendert
//     wiederverwendet - keine zweite Groessenpruefung)
//  5  Auswahl verwerfen, bevor gespeichert wurde
//  6  Speichern: genau EIN storage.upload()-Aufruf, richtiger Pfad
//     (project-files/<projectId>/…, IM Bucket "measurements" - keine neue
//     Storage-/RLS-Migration noetig, siehe Kopfkommentar js/63-angebote.js),
//     richtiger contentType, richtige Insert-Payload (pdf_path/pdf_name)
//  7  company_id NIE im Pfad oder in der Payload
//  8  Bestehende Offerte mit PDF oeffnen: Vorschau zeigt "Oeffnen"+"Entfernen"
//  9  "Oeffnen": window.open() bleibt SYNCHRON im Klick (Popup-Blocker-
//     sicheres Muster wie beim Oeffnen einer Projektdatei), danach
//     storageSignedUrl() mit dem exakt gespeicherten Pfad
// 10  "Oeffnen" bei fehlgeschlagener Signierung: Fenster wird geschlossen,
//     verstaendliche Meldung statt eines leeren/kaputten Fensters
// 11  Bestehendes PDF entfernen + speichern -> pdf_path/pdf_name werden null
// 12  Neues PDF ersetzt ein bestehendes beim Speichern (neuer Pfad, nicht
//     der alte)
// 13  0-Zeilen-Fall (CLAUDE.md 24.1): die Auswahl bleibt erhalten, kein
//     vorgetaeuschter Erfolg
// 14  Struktur: Info-Knopf/Hilfetext vorhanden, Version 3.38, keine der
//     geschuetzten Fachdateien beruehrt
//
// Gegenproben (siehe Begleitprotokoll im Scratchpad dieser Sitzung): jede
// baut einen echten Fehler in js/63-angebote.js ein und bringt genau die
// dafuer zustaendige Pruefung zum Scheitern. Ausgefuehrt als separater
// Vorgang (Baum sichern, Fehler einbauen, diesen Pruefstand erneut laufen
// lassen, Fehlschlag bestaetigen, wiederherstellen) - siehe CLAUDE.md
// Abschnitt 88.8. In dieser Datei selbst steckt kein Umschalter dafuer.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-angebot-pdf-v3-38.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const fs=require("fs");
const {execSync}=require("child_process");

let ok=0,fail=0;
const p=(b,t,z)=>{
 if(b){ok++;console.log("  ok  "+t)}
 else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}
};

// ---- Attrappe fuer window.supabase.createClient() -------------------------
// Uebernommen (nicht neu erfunden) aus pruefstand-angebote-v3-34.js, um
// exakt dasselbe, bereits bewaehrte Verhalten von select/insert/update/
// delete zu haben. Ergaenzt gegenueber v3.34 nur um:
// - storage.createSignedUrl(): traegt den aufgerufenen Pfad in
//   window.__signedUrlAufrufe ein (fuer Test 9) und kann ueber
//   window.__signedUrlFehler gezielt fehlschlagen (fuer Test 10).
// - storage.upload(): unveraendert, traegt bereits den Pfad in
//   window.__uploads ein.
const ATTRAPPE=`window.supabase={createClient:()=>{
 window.__from=window.__from||[];
 window.__schreib=window.__schreib||[];
 const passt=(z,eqs)=>eqs.every(([f,v])=>z[f]===v);
 const tabelle=t=>{
  const kette={__eq:[],__order:null};
  Object.assign(kette,{
   select:()=>kette,
   eq:(f,v)=>{kette.__eq.push([f,v]);return kette},
   order:(f,o)=>{kette.__order=[f,o];return kette},
   in:()=>kette,
   not:()=>kette,
   limit:()=>kette,
   maybeSingle:()=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    if(window.__lesenFehler&&window.__lesenFehler[t])
     return Promise.resolve({data:null,error:{message:"kaputt"}});
    const liste=(window.__lese&&window.__lese[t])||[];
    const treffer=liste.find(z=>passt(z,kette.__eq));
    return Promise.resolve({data:treffer||null,error:null});
   },
   then:(res,rej)=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    if(window.__lesenFehler&&window.__lesenFehler[t])
     return Promise.resolve({data:null,error:{message:"kaputt"}}).then(res,rej);
    let liste=((window.__lese&&window.__lese[t])||[]).filter(z=>passt(z,kette.__eq));
    if(kette.__order){
     const[f,o]=kette.__order;
     liste=liste.slice().sort((a,b)=>{
      const av=a[f],bv=b[f];
      const c=av<bv?-1:(av>bv?1:0);
      return o&&o.ascending===false?-c:c;
     });
    }
    return Promise.resolve({data:liste,error:null}).then(res,rej);
   },
   insert:d=>{
    const zeilen=Array.isArray(d)?d:[d];
    window.__schreib.push({t,op:"insert",d:zeilen});
    return {select:()=>{
     if(window.__insertLeer&&window.__insertLeer[t])return Promise.resolve({data:[],error:null});
     if(window.__insertFehler&&window.__insertFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
     const neu=zeilen.map((x,i)=>Object.assign({
      id:900+(window.__naechsteId=(window.__naechsteId||0)+1),
      created_by:"u1",created_at:"2026-09-08T08:00:00Z",
      updated_by:"u1",updated_at:"2026-09-08T08:00:00Z"
     },x));
     if(window.__lese&&window.__lese[t])window.__lese[t]=window.__lese[t].concat(neu);
     else if(window.__lese)window.__lese[t]=neu;
     return Promise.resolve({data:neu,error:null});
    }};
   },
   upsert:(d,o)=>{
    const zeilen=Array.isArray(d)?d:[d];
    window.__schreib.push({t,op:"upsert",d:zeilen,o});
    return {select:()=>{
     if(window.__upsertLeer&&window.__upsertLeer[t])return Promise.resolve({data:[],error:null});
     if(window.__upsertFehler&&window.__upsertFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
     const antwort=zeilen.map((x,i)=>Object.assign({id:800+i},x));
     return Promise.resolve({data:antwort,error:null});
    }};
   },
   update:d=>{
    const eintrag={t,op:"update",d,eq:[]};
    window.__schreib.push(eintrag);
    const k2={eq:(f,v)=>{eintrag.eq.push([f,v]);return k2},
     select:()=>{
      if(window.__updateLeer&&window.__updateLeer[t])return Promise.resolve({data:[],error:null});
      if(window.__updateFehler&&window.__updateFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
      const id=(eintrag.eq.find(e=>e[0]==="id")||[])[1];
      const basis=(window.__zeileFuer&&window.__zeileFuer(t,id))||{};
      return Promise.resolve({data:[Object.assign({},basis,d,{
       id:id!==undefined?id:1,updated_by:"u1",updated_at:"2026-09-08T09:00:00Z"
      })],error:null});
     }};
    return k2;
   },
   delete:()=>{
    const eintrag={t,op:"delete",eq:[]};
    window.__schreib.push(eintrag);
    const obj={eq:(f,v)=>{
     eintrag.eq.push([f,v]);
     const antwort=()=>(window.__deleteFehler&&window.__deleteFehler[t])
      ?{error:{message:"kaputt"}}:{error:null};
     const res={
      then:(res2,rej2)=>Promise.resolve(antwort()).then(res2,rej2),
      select:()=>{
       const a=antwort();
       if(a.error)return Promise.resolve({data:[],error:a.error});
       if(window.__lese&&window.__lese[t])
        window.__lese[t]=window.__lese[t].filter(z=>!eintrag.eq.every(([f2,v2])=>z[f2]===v2));
       return Promise.resolve({data:[{id:v}],error:null});
      }
     };
     if(!antwort().error&&window.__lese&&window.__lese[t])
      window.__lese[t]=window.__lese[t].filter(z=>!eintrag.eq.every(([f2,v2])=>z[f2]===v2));
     return res;
    }};
    return obj;
   }
  });
  return kette;
 };
 return {
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle,
  storage:{from:()=>({
   upload:(pfad,datei,opt)=>{
    (window.__uploads=window.__uploads||[]).push({pfad,opt});
    if(window.__uploadFehler)return Promise.resolve({error:{message:"Upload fehlgeschlagen"}});
    return Promise.resolve({error:null});
   },
   createSignedUrl:(pfad)=>{
    (window.__signedUrlAufrufe=window.__signedUrlAufrufe||[]).push(pfad);
    if(window.__signedUrlFehler)return Promise.resolve({data:null,error:{message:"kaputt"}});
    return Promise.resolve({data:{signedUrl:"blob:x"},error:null});
   }
  })},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}
 };
}};`;

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>{(page.__dialoge=page.__dialoge||[]).push(d.message());d.accept()});

 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 const repo="/home/user/Spengler---Digital-V1";
 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof checkOfferteZugriff==="function"
  &&typeof newAngebot==="function"&&typeof openAngebot==="function"
  &&typeof renderAngPdfBereich==="function"&&typeof uploadAngebotPdf==="function",
  null,{timeout:15000});
 await page.waitForTimeout(200);

 // ---- Grundzustand: freigeschalteter Benutzer, ein Projekt ----------------
 await page.evaluate(()=>{
  window.__lese={angebote:[],feature_access:[{profile_id:"u1",feature:"angebote",granted:true}],audit_log:[]};
  window.__zeileFuer=(t,id)=>{
   const liste=(window.__lese&&window.__lese[t])||[];
   return liste.find(z=>z.id===id)||null;
  };
  window.__windowOpens=[];
  window.__fensterGeschlossen=0;
  window.open=(url,target)=>{
   window.__windowOpens.push({url,target});
   const fenster={location:{href:""},closed:false,close(){this.closed=true;window.__fensterGeschlossen++;}};
   window.__letztesFenster=fenster;
   return fenster;
  };
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"};
  allProfiles=[currentProfile];
  meineRechte={admin:true};
  allProjects=[
   {id:7,name:"Testbau",object:"Musterweg 1, 3000 Bern",order_no:"2026-045",customer:"Muster AG",archived:false,status:"offen"}
  ];
  settings={employees:["Mike Ledermann"],rates:[],materials:[]};
  employeeIds=["u1"];
  cockpitProjectId=7;
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });
 await page.evaluate(async()=>{await checkOfferteZugriff()});

 console.log("\n0 · Anwendung startet, Offerten-Zugriff freigeschaltet");
 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler beim Laden",jsFehler);
 p(await page.evaluate(()=>offerteZugriff===true),"offerteZugriff ist true (Grundlage fuer alles Folgende)");

 // ---- 1 · Leerer Zustand ---------------------------------------------------
 console.log("\n1 · Leerer Zustand: noch kein PDF");
 await page.evaluate(()=>{ $("projectCockpitModal").hidden=false; newAngebot(); });
 const leer=await page.evaluate(()=>({
  angPdfExisting,angPdfNewFile,
  bereichText:$("angPdfBereich").textContent.trim(),
  oeffnenKnopf:!!document.querySelector("[data-ang-pdf-oeffnen]"),
  entfernenKnopf:!!document.querySelector("[data-ang-pdf-entfernen]")
 }));
 p(leer.angPdfExisting===null&&leer.angPdfNewFile===null,"eine neue Offerte hat weder ein bestehendes noch ein neu ausgewaehltes PDF",leer);
 p(/Noch kein PDF hochgeladen/.test(leer.bereichText),"der Bereich zeigt 'Noch kein PDF hochgeladen.'",leer);
 p(leer.oeffnenKnopf===false&&leer.entfernenKnopf===false,"und es gibt weder einen 'Oeffnen'- noch einen 'Entfernen'-Knopf (kein funktionsloses Element)",leer);

 // ---- 2 · Gueltiges PDF auswaehlen -----------------------------------------
 console.log("\n2 · Gueltiges PDF ueber #angPdfInput auswaehlen");
 await page.locator("#angPdfInput").setInputFiles({
  name:"Offerte-Muster.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\n%%EOF")
 });
 await page.waitForTimeout(50);
 const ausgewaehlt=await page.evaluate(()=>({
  hatNewFile:!!angPdfNewFile,dateiname:angPdfNewFile&&angPdfNewFile.name,
  bereichHtml:$("angPdfBereich").innerHTML,
  eingabeGeleert:$("angPdfInput").value
 }));
 p(ausgewaehlt.hatNewFile===true&&ausgewaehlt.dateiname==="Offerte-Muster.pdf","die Auswahl wird in angPdfNewFile uebernommen",ausgewaehlt);
 p(/Offerte-Muster\.pdf/.test(ausgewaehlt.bereichHtml),"der Dateiname erscheint in der Vorschau",ausgewaehlt);
 p(/wird beim Speichern hochgeladen/.test(ausgewaehlt.bereichHtml),"mit dem Hinweis 'wird beim Speichern hochgeladen' - es ist noch NICHTS im Storage",ausgewaehlt);
 p(ausgewaehlt.eingabeGeleert==="","das Dateifeld selbst wird sofort geleert (dieselbe Auswahl liesse sich sonst kein zweites Mal ausloesen)",ausgewaehlt);
 p((await page.evaluate(()=>(window.__uploads||[]).length))===0,"und es ist noch KEIN storage.upload()-Aufruf erfolgt - erst beim Speichern");

 // ---- 3 · Falsches Dateiformat wird abgewiesen -----------------------------
 console.log("\n3 · Falsches Dateiformat (.txt) wird abgewiesen");
 await page.evaluate(()=>{angPdfNewFile=null;renderAngPdfBereich()});
 page.__dialoge=[];
 await page.locator("#angPdfInput").setInputFiles({
  name:"notizen.txt",mimeType:"text/plain",buffer:Buffer.from("kein PDF")
 });
 await page.waitForTimeout(50);
 const falschesFormat=await page.evaluate(()=>({angPdfNewFile,bereichText:$("angPdfBereich").textContent.trim()}));
 p(falschesFormat.angPdfNewFile===null,"eine .txt-Datei wird NICHT als angPdfNewFile uebernommen",falschesFormat);
 p((page.__dialoge||[]).includes("Bitte nur eine PDF-Datei auswählen."),"und die App meldet genau diesen Text",page.__dialoge);
 p(/Noch kein PDF hochgeladen/.test(falschesFormat.bereichText),"der Bereich bleibt beim Leerzustand",falschesFormat);

 // ---- 4 · Zu grosse Datei (>50 MB) wird abgewiesen -------------------------
 // Playwrights setInputFiles({buffer:...}) verweigert Puffer > 50 MB von sich
 // aus ("Cannot set buffer larger than 50Mb") - fuer diese beiden Faelle wird
 // deshalb, wie von Playwright selbst empfohlen, eine echte Datei auf die
 // Platte geschrieben und ueber ihren Pfad ausgewaehlt statt ueber einen
 // Speicherpuffer.
 const grosseDateiPfad=(bytes)=>{
  const pfad=repo+"/pruefstaende/.tmp-grosse-pdf-"+bytes+".pdf";
  if(!fs.existsSync(pfad))fs.writeFileSync(pfad,Buffer.alloc(bytes));
  return pfad;
 };
 console.log("\n4 · Zu grosse PDF-Datei (>50 MB) wird abgewiesen, mit der exakten Meldung");
 page.__dialoge=[];
 await page.locator("#angPdfInput").setInputFiles(grosseDateiPfad(52428801));
 await page.waitForTimeout(200);
 const zuGross=await page.evaluate(()=>({angPdfNewFile}));
 p(zuGross.angPdfNewFile===null,"eine 50 MB + 1 Byte grosse PDF-Datei wird NICHT uebernommen",zuGross);
 p((page.__dialoge||[]).includes("Die Datei ist zu gross (50.0 MB). Erlaubt sind höchstens 50 MB pro Datei."),
  "und die App zeigt exakt diese Meldung (formatFileSize()/MAX_DATEI_TEXT aus js/09-projekte.js, keine zweite Groessenpruefung)",page.__dialoge);

 page.__dialoge=[];
 await page.locator("#angPdfInput").setInputFiles(grosseDateiPfad(52428800));
 await page.waitForTimeout(200);
 const genauGrenze=await page.evaluate(()=>({angPdfNewFile:!!angPdfNewFile,name:angPdfNewFile&&angPdfNewFile.name}));
 // Der Dateiname kommt hier vom echten Dateipfad auf der Platte
 // (setInputFiles mit Pfad statt Buffer-Objekt, siehe grosseDateiPfad()) -
 // geprueft wird deshalb nur die eigentliche Grenzentscheidung, nicht ein
 // frei erfundener Anzeigename.
 p(genauGrenze.angPdfNewFile===true,
  "eine Datei mit GENAU 50 MB wird noch akzeptiert (dateiZuGross prueft > nicht >=)",genauGrenze);
 p((page.__dialoge||[]).length===0,"dabei erscheint keine Fehlermeldung",page.__dialoge);

 // ---- 5 · Auswahl verwerfen -------------------------------------------------
 console.log("\n5 · Auswahl verwerfen, bevor gespeichert wurde");
 await page.evaluate(()=>document.querySelector("[data-ang-pdf-entfernen]").click());
 const verworfen=await page.evaluate(()=>({angPdfNewFile,bereichText:$("angPdfBereich").textContent.trim()}));
 p(verworfen.angPdfNewFile===null,"die noch nicht gespeicherte Auswahl laesst sich wieder verwerfen",verworfen);
 p(/Noch kein PDF hochgeladen/.test(verworfen.bereichText),"der Bereich zeigt wieder den Leerzustand",verworfen);

 // ---- 6 · Speichern mit neuem PDF: Upload, Pfad, Payload -------------------
 console.log("\n6 · Speichern mit neuem PDF");
 await page.evaluate(()=>{$("angTitle").value="Offerte mit PDF";$("angDate").value="2026-09-09";});
 await page.locator("#angPdfInput").setInputFiles({
  name:"Offerte-Endgueltig.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\ninhalt\n%%EOF")
 });
 await page.waitForTimeout(50);
 await page.evaluate(()=>{window.__uploads=[];window.__schreib=[]});
 const gespeichert=await page.evaluate(async()=>{
  await $("saveAngebot").onclick();
  return {
   modalZu:$("angebotEditModal").hidden,
   uploads:window.__uploads.slice(),
   insert:(window.__schreib||[]).find(x=>x.op==="insert"&&x.t==="angebote"),
   angPdfExistingNachDemSpeichern:angPdfExisting
  };
 });
 p(gespeichert.modalZu===true,"nach erfolgreichem Speichern schliesst sich das Formular",gespeichert);
 p(gespeichert.uploads.length===1,"es gibt GENAU EINEN storage.upload()-Aufruf fuer das PDF",gespeichert.uploads);
 const hochgeladenerPfad=gespeichert.uploads[0]&&gespeichert.uploads[0].pfad;
 p(!!hochgeladenerPfad&&hochgeladenerPfad.startsWith("project-files/7/")&&hochgeladenerPfad.endsWith(".pdf"),
  "der Pfad folgt dem Schema project-files/<projectId>/…pdf (IM Bucket 'measurements', keine neue Storage-/RLS-Migration noetig)",hochgeladenerPfad);
 const uploadOpt=gespeichert.uploads[0]&&gespeichert.uploads[0].opt;
 p(!!uploadOpt&&uploadOpt.contentType==="application/pdf"&&uploadOpt.upsert===false,
  "hochgeladen mit contentType 'application/pdf' und upsert:false",uploadOpt);
 const insertPayload=gespeichert.insert&&gespeichert.insert.d&&gespeichert.insert.d[0];
 p(!!insertPayload&&insertPayload.pdf_path===hochgeladenerPfad,"die Insert-Payload traegt genau diesen Pfad als pdf_path",insertPayload);
 p(!!insertPayload&&insertPayload.pdf_name==="Offerte-Endgueltig.pdf","und den echten Dateinamen als pdf_name",insertPayload);
 p(!!gespeichert.angPdfExistingNachDemSpeichern&&gespeichert.angPdfExistingNachDemSpeichern.path===hochgeladenerPfad,
  "nach dem Speichern gilt das PDF als 'bestehend' (angPdfExisting), nicht mehr als 'neu ausgewaehlt'",gespeichert.angPdfExistingNachDemSpeichern);

 // ---- 7 · company_id NIE im Pfad oder in der Payload -----------------------
 console.log("\n7 · company_id wird NIE vom Client mitgeschickt (Firmenzuordnung ausschliesslich serverseitig)");
 p(!hochgeladenerPfad||!/f1|company/i.test(hochgeladenerPfad),"der Storage-Pfad enthaelt keine Firmenkennung - nur project-files/<id>/…",hochgeladenerPfad);
 p(!insertPayload||insertPayload.company_id===undefined,"und die Insert-Payload traegt kein company_id-Feld",insertPayload);
 const quelltext=fs.readFileSync(repo+"/js/63-angebote.js","utf8");
 const codeZeilenMitCompanyId=quelltext.split("\n").filter(z=>!z.trim().startsWith("//")&&/company_id/.test(z));
 p(codeZeilenMitCompanyId.length===0,
  "js/63-angebote.js schreibt/liest company_id an KEINER Code-Stelle (nur in erklaerenden Kommentaren) - die Firmengrenze kommt ausschliesslich aus der Datenbank (DEFAULT my_company_id() + RLS)",
  {treffer:codeZeilenMitCompanyId});

 // ---- 8 · Bestehende Offerte mit PDF oeffnen --------------------------------
 console.log("\n8 · Bestehende Offerte mit gespeichertem PDF oeffnen");
 const bestehendeZeile={
  id:501,project_id:7,title:"Offerte Bestand",note:"",date:"2026-09-01",
  photo_path:null,photo_paths:[],positions:[],
  pdf_path:"project-files/7/1000000000000_bestand.pdf",pdf_name:"Offerte-Bestand.pdf",
  created_by:"u1",created_at:"2026-09-01T08:00:00Z",updated_by:"u1",updated_at:"2026-09-01T08:00:00Z"
 };
 const geoeffnet=await page.evaluate(z=>{
  openAngebot(z);
  return {
   angPdfExisting,angPdfNewFile,
   bereichHtml:$("angPdfBereich").innerHTML,
   oeffnenVorhanden:!!document.querySelector("[data-ang-pdf-oeffnen]"),
   entfernenVorhanden:!!document.querySelector("[data-ang-pdf-entfernen]")
  };
 },bestehendeZeile);
 p(!!geoeffnet.angPdfExisting&&geoeffnet.angPdfExisting.path===bestehendeZeile.pdf_path&&geoeffnet.angPdfExisting.name===bestehendeZeile.pdf_name,
  "openAngebot() uebernimmt pdf_path/pdf_name korrekt in angPdfExisting",geoeffnet);
 p(geoeffnet.angPdfNewFile===null,"angPdfNewFile bleibt beim Oeffnen leer",geoeffnet);
 p(/Offerte-Bestand\.pdf/.test(geoeffnet.bereichHtml),"der Dateiname erscheint in der Vorschau",geoeffnet);
 p(geoeffnet.oeffnenVorhanden===true&&geoeffnet.entfernenVorhanden===true,
  "und es gibt sowohl einen 'Oeffnen'- als auch einen 'Entfernen'-Knopf",geoeffnet);

 // ---- 9 · "Oeffnen": window.open() synchron, dann storageSignedUrl --------
 console.log("\n9 · 'Oeffnen' - window.open() bleibt synchron im Klick, dann storageSignedUrl()");
 await page.evaluate(()=>{window.__windowOpens=[];window.__signedUrlAufrufe=[]});
 const sofortNachKlick=await page.evaluate(()=>{
  document.querySelector("[data-ang-pdf-oeffnen]").click();
  return {anzahlSofort:window.__windowOpens.length,zielSofort:window.__windowOpens[0]&&window.__windowOpens[0].target};
 });
 p(sofortNachKlick.anzahlSofort===1,"window.open() wurde SOFORT (noch im selben Tick wie der Klick) genau einmal aufgerufen - Popup-Blocker-sicher",sofortNachKlick);
 p(sofortNachKlick.zielSofort==="_blank","mit target '_blank'",sofortNachKlick);
 await page.waitForTimeout(100);
 const nachOeffnen=await page.evaluate(()=>({
  signedUrlAufrufe:window.__signedUrlAufrufe.slice(),
  fensterUrl:window.__letztesFenster&&window.__letztesFenster.location.href,
  fensterGeschlossen:window.__fensterGeschlossen
 }));
 p(nachOeffnen.signedUrlAufrufe.length===1&&nachOeffnen.signedUrlAufrufe[0]===bestehendeZeile.pdf_path,
  "danach wird storageSignedUrl() aufgerufen, mit EXAKT dem gespeicherten Pfad (ueber measStoragePathFromValue() unveraendert durchgereicht)",nachOeffnen);
 p(nachOeffnen.fensterUrl==="blob:x","und das (gemockte) Fenster wird auf die signierte URL umgeleitet",nachOeffnen);
 p(nachOeffnen.fensterGeschlossen===0,"das Fenster bleibt bei Erfolg offen (wird NICHT geschlossen)",nachOeffnen);

 // ---- 10 · "Oeffnen" bei fehlgeschlagener Signierung ------------------------
 console.log("\n10 · 'Oeffnen' bei fehlgeschlagener Signierung: Fenster schliesst sich, klare Meldung");
 await page.evaluate(()=>{window.__signedUrlFehler=true;window.__windowOpens=[];window.__fensterGeschlossen=0});
 page.__dialoge=[];
 await page.evaluate(()=>document.querySelector("[data-ang-pdf-oeffnen]").click());
 await page.waitForTimeout(100);
 const fehlgeschlagen=await page.evaluate(()=>({fensterGeschlossen:window.__fensterGeschlossen}));
 p(fehlgeschlagen.fensterGeschlossen===1,"das (gemockte) Fenster wird bei einer fehlgeschlagenen Signierung wieder geschlossen",fehlgeschlagen);
 p((page.__dialoge||[]).includes("PDF konnte nicht geöffnet werden."),"und die App meldet genau diesen Text, statt ein leeres/kaputtes Fenster stehen zu lassen",page.__dialoge);
 await page.evaluate(()=>{window.__signedUrlFehler=false});

 // ---- 11 · Bestehendes PDF entfernen + speichern ---------------------------
 console.log("\n11 · Bestehendes PDF entfernen und speichern -> pdf_path/pdf_name werden null");
 await page.evaluate(()=>document.querySelector("[data-ang-pdf-entfernen]").click());
 const nachEntfernen=await page.evaluate(()=>({angPdfExisting,bereichText:$("angPdfBereich").textContent.trim()}));
 p(nachEntfernen.angPdfExisting===null,"das Entfernen setzt angPdfExisting auf null",nachEntfernen);
 p(/Noch kein PDF hochgeladen/.test(nachEntfernen.bereichText),"und die Vorschau zeigt wieder den Leerzustand",nachEntfernen);
 await page.evaluate(()=>{window.__schreib=[];window.__uploads=[]});
 const entferntGespeichert=await page.evaluate(async()=>{
  await $("saveAngebot").onclick();
  return {
   update:(window.__schreib||[]).find(x=>x.op==="update"&&x.t==="angebote"),
   uploads:window.__uploads.length,
   angPdfExistingNachher:angPdfExisting
  };
 });
 p(entferntGespeichert.uploads===0,"kein neuer storage.upload()-Aufruf, wenn nur entfernt (nicht ersetzt) wurde",entferntGespeichert);
 const updatePayload1=entferntGespeichert.update&&entferntGespeichert.update.d;
 p(!!updatePayload1&&updatePayload1.pdf_path===null&&updatePayload1.pdf_name===null,
  "die Update-Payload setzt pdf_path UND pdf_name explizit auf null",updatePayload1);
 p(entferntGespeichert.angPdfExistingNachher===null,"und angPdfExisting bleibt danach null",entferntGespeichert);

 // ---- 12 · Neues PDF ersetzt ein bestehendes --------------------------------
 console.log("\n12 · Ein neues PDF ersetzt beim Speichern ein bestehendes (nicht nur ergaenzt)");
 const zeileMitAltemPdf={
  id:502,project_id:7,title:"Offerte mit altem PDF",note:"",date:"2026-09-01",
  photo_path:null,photo_paths:[],positions:[],
  pdf_path:"project-files/7/alt_bestand.pdf",pdf_name:"Alt-Bestand.pdf",
  created_by:"u1",created_at:"2026-09-01T08:00:00Z",updated_by:"u1",updated_at:"2026-09-01T08:00:00Z"
 };
 await page.evaluate(z=>{window.__lese.angebote=[z];openAngebot(z)},zeileMitAltemPdf);
 await page.locator("#angPdfInput").setInputFiles({
  name:"Neue-Fassung.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\nneu\n%%EOF")
 });
 await page.waitForTimeout(50);
 await page.evaluate(()=>{window.__schreib=[];window.__uploads=[]});
 const ersetzt=await page.evaluate(async()=>{
  await $("saveAngebot").onclick();
  return {
   uploads:window.__uploads.slice(),
   update:(window.__schreib||[]).find(x=>x.op==="update"&&x.t==="angebote")
  };
 });
 p(ersetzt.uploads.length===1,"genau ein neuer Upload beim Ersetzen",ersetzt.uploads);
 const neuerPfad=ersetzt.uploads[0]&&ersetzt.uploads[0].pfad;
 p(!!neuerPfad&&neuerPfad!==zeileMitAltemPdf.pdf_path,"der neue Pfad unterscheidet sich vom alten (kein Ueberschreiben derselben Datei)",{neu:neuerPfad,alt:zeileMitAltemPdf.pdf_path});
 const updatePayload2=ersetzt.update&&ersetzt.update.d;
 p(!!updatePayload2&&updatePayload2.pdf_path===neuerPfad&&updatePayload2.pdf_path!==zeileMitAltemPdf.pdf_path,
  "die Update-Payload traegt den NEUEN Pfad, nicht mehr den alten",updatePayload2);
 p(!!updatePayload2&&updatePayload2.pdf_name==="Neue-Fassung.pdf","und den neuen Dateinamen",updatePayload2);

 // ---- 13 · 0-Zeilen-Fall: Auswahl bleibt erhalten (CLAUDE.md 24.1) ---------
 console.log("\n13 · 0-Zeilen-Fall: die PDF-Auswahl geht dabei NICHT verloren");
 await page.evaluate(()=>{$("angebotEditModal").hidden=true});
 await page.evaluate(()=>{$("projectCockpitModal").hidden=false;newAngebot();$("angTitle").value="Offerte 0-Zeilen-Test";});
 await page.locator("#angPdfInput").setInputFiles({
  name:"wird-nicht-gespeichert.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\n%%EOF")
 });
 await page.waitForTimeout(50);
 page.__dialoge=[];
 await page.evaluate(()=>{window.__insertLeer={angebote:true};window.__uploads=[]});
 const nullZeilen=await page.evaluate(async()=>{
  await $("saveAngebot").onclick();
  return {
   modalNochOffen:!$("angebotEditModal").hidden,
   angPdfNewFileBleibt:angPdfNewFile&&angPdfNewFile.name,
   uploadDennochErfolgt:window.__uploads.length
  };
 });
 p(nullZeilen.modalNochOffen===true,"0 betroffene Zeilen gelten NICHT als Erfolg - das Formular bleibt offen",nullZeilen);
 p(nullZeilen.angPdfNewFileBleibt==="wird-nicht-gespeichert.pdf",
  "und die getroffene PDF-Auswahl bleibt erhalten - beim naechsten Versuch muss nicht neu ausgewaehlt werden",nullZeilen);
 p(nullZeilen.uploadDennochErfolgt===1,
  "hinweis: der Upload selbst lief bereits (er passiert VOR dem Datenbank-Schreiben) - erst der DB-Schreibvorgang scheiterte; die Datei liegt also schon im Storage, ohne verknuepfte Zeile (bekannte, dokumentierte Grenze wie bei jedem anderen Foto-Upload-Fehlerfall dieser App)",nullZeilen);
 p((page.__dialoge||[]).includes("Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?"),
  "die App zeigt die dafuer vorgesehene, klare Meldung",page.__dialoge);
 await page.evaluate(()=>{window.__insertLeer={}});

 // ---- 14 · Struktur ----------------------------------------------------------
 console.log("\n14 · Struktur: Info-Knopf/Hilfetext, Version, geschuetzte Fachdateien unangetastet");
 const idxHtml=fs.readFileSync(repo+"/index.html","utf8");
 const swJs=fs.readFileSync(repo+"/sw.js","utf8");
 const hilfeJs=fs.readFileSync(repo+"/js/41-hilfe.js","utf8");
 p(idxHtml.includes('data-hilfe="ang-pdf"'),"index.html traegt den Info-Knopf data-hilfe='ang-pdf' beim PDF-Bereich");
 p(hilfeJs.includes('"ang-pdf"'),"js/41-hilfe.js hat eine passende Erklaerung dafuer (HILFE_TEXTE)");
 p(idxHtml.includes('id="angPdfInput"')&&idxHtml.includes('id="angPdfBereich"'),"index.html enthaelt beide neuen Elemente (#angPdfInput, #angPdfBereich)");
 p(!!(idxHtml.match(/Version\s+3\.38/)||[])[0],"index.html nennt Version 3.38");
 p(!!(swJs.match(/spengler-digital-3\.38/)||[])[0],"sw.js traegt die Cache-Version 3.38");
 p(quelltext.includes("function uploadAngebotPdf(")&&quelltext.includes("function renderAngPdfBereich("),
  "js/63-angebote.js enthaelt uploadAngebotPdf()/renderAngPdfBereich() (kein Nachbau in einer anderen Datei)");
 p(!quelltext.includes("function dateiEndung(")&&!quelltext.includes("function dateiZuGross(")&&!quelltext.includes("function formatFileSize("),
  "und definiert dateiEndung()/dateiZuGross()/formatFileSize() NICHT selbst neu - wiederverwendet aus js/09-projekte.js");

 let geaenderteDateien=[];
 try{
  geaenderteDateien=execSync("git diff --name-only HEAD -- . && git ls-files --others --exclude-standard",
   {cwd:repo,encoding:"utf8"}).trim().split("\n").filter(Boolean);
 }catch(e){geaenderteDateien=null;}
 const mussUnberuehrtSein=[
  "js/17-ausmass.js","js/24-projekt-cockpit.js","js/05a-rechte.js",
  "js/06-rapport.js","js/08-katalog-blitzschutz.js","css/03-druck.css","css/04-rechte.css",
  "js/09-projekte.js","js/10-massaufnahme.js",
  "js/44-workflow.js","js/45-aufgaben.js","js/48-projekt-material.js",
  "js/49-projekt-zuschnitt.js","js/50-reservierung.js","js/51-werkstatt.js",
  "js/56-material-zuschnitt.js","js/58-ruestliste.js","js/60-ruestskizzen.js",
  "js/11-einlaufblech-gerade.js","js/12-rinne-halbrund.js","js/13-einlaufblech-konisch.js",
  "js/14-freies-profil.js","js/19-lukarne.js","js/20-anschlussblech.js",
  "js/21-einfassung-rund.js","js/25-kehle.js","js/26-rinne.js","js/29-einlaufblech-aufnahme.js",
  "js/34-kehle-aufnahme.js","js/37-kamin-aufnahme.js","js/38-einfassung-aufnahme.js",
  "js/39-rinne-aufnahme.js","js/40-anschlussblech-aufnahme.js","js/61-materialstaerke.js",
  "js/64-ausfuehrung.js","js/65-leistungen.js"
 ];
 if(geaenderteDateien===null){
  p(false,"git diff konnte nicht ausgefuehrt werden - Struktur-Beweis nicht moeglich",{});
 }else{
  const verletzt=mussUnberuehrtSein.filter(f=>geaenderteDateien.includes(f));
  p(verletzt.length===0,
   "keine der 'nicht anzufassenden' Dateien (Massaufnahme-Fachmodule, Ausmass, Cockpit-Kern, Regierapport, Produktionsworkflow) wurde fuer diese Erweiterung veraendert",
   {geaendert:geaenderteDateien,verletzt});
  p(geaenderteDateien.includes("js/63-angebote.js"),"js/63-angebote.js selbst ist geaendert (traegt die neue PDF-Funktion)",geaenderteDateien);
  p(geaenderteDateien.includes("index.html")&&geaenderteDateien.includes("sw.js")&&geaenderteDateien.includes("js/41-hilfe.js"),
   "index.html, sw.js und js/41-hilfe.js wurden fuer Markup/Version/Hilfetext ergaenzt - sonst nichts",geaenderteDateien);
 }

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

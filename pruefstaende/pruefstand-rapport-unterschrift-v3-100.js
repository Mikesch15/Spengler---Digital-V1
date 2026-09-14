// Prueft die digitale Unterschrift im Regierapport (v3.100).
//
// WAS HIER GEPRUEFT WIRD: die Verdrahtung in der echten index.html/js/06 -
// Klick auf "Unterschreiben" ruft die bestehende Skizzenflaeche
// (openSketchFullscreen aus js/10, Callback-Modus wie js/14) korrekt auf,
// das Ergebnis landet in Vorschau UND im print-only Bild, "Loeschen" nimmt
// es wieder weg, Speichern/Laden/"Alles loeschen"/"Neuer Rapport" behandeln
// die beiden Unterschriften symmetrisch zu den bereits bestehenden
// Rapport-Fotos. Das echte Zeichnen mit dem Finger auf dem Canvas wird NICHT
// simuliert (fragile Pointer-Choreografie) - stattdessen wird
// openSketchFullscreen fuer diesen Lauf durch einen Stub ersetzt, der sofort
// mit einer festen data:-URL "fertig" meldet. Damit wird genau die Kette
// geprueft, die diese Aenderung tatsaechlich neu einfuehrt.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die neuen Spalten wirklich
// speichert (per SQL gegen das echte Schema verifiziert, siehe CHANGELOG).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rapport-unterschrift-v3-100.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,340):""))}};
const tipp=async(page,sel)=>{
 try{ await page.click(sel,{timeout:3000}); return true }
 catch(e){ fail++; console.log("  FEHLGESCHLAGEN: nicht antippbar: "+sel+"  "+String(e.message).split("\n")[0]); return false }
};

const STUB=`window.__ruf=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({art:"rpc",name:n,args:a});return {data:null,error:null}},
 from:(t)=>{
   const f={_t:t,_eq:{}};
   ['select','order','limit','range','in'].forEach(k=>f[k]=()=>f);
   f.eq=(s,v)=>{f._eq[s]=v;return f};
   f.maybeSingle=async()=>({data:null,error:null});
   f.insert=(row)=>{window.__ruf.push({art:"insert",tabelle:t,row:JSON.parse(JSON.stringify(row))});
     const data=Object.assign({id:99},row);
     const g={};g.select=()=>g;
     g.maybeSingle=async()=>({data,error:null});
     g.then=(res,rej)=>Promise.resolve({data,error:null}).then(res,rej);
     return g};
   f.update=(patch)=>{window.__ruf.push({art:"update",tabelle:t,patch:JSON.parse(JSON.stringify(patch))});
     const data=Object.assign({id:99},patch);
     const g={_eq:{}};g.eq=(s,v)=>{g._eq[s]=v;return g};
     g.select=()=>g;
     g.maybeSingle=async()=>({data,error:null});
     g.then=(res,rej)=>Promise.resolve({data,error:null}).then(res,rej);
     return g};
   f.then=(cb)=>Promise.resolve({data:[],error:null}).then(cb);
   return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'x'},error:null})})}
})};`;

const RATES=[["Meister",145],["Spe1",110]];
const RATE_IDS=[1,2];

const anmelden=(page)=>page.evaluate(([rates,ids])=>{
 settings.rates=rates; rateIds.length=0; rateIds.push(...ids);
 settings.materials=[];
 settings.employees=["Mike Ledermann"];
 employeeIds.length=0; employeeIds.push("u1");
 allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann",role:"admin",rate_id:1,company_id:"firma-a"}];
 currentProfile=allProfiles[0];
 meineRechte={admin:true,rapport:{sehen:"alle",bearbeiten:"alle"}};
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
 currentProjectId=7; currentReportId=null;
 mats.length=0; works.length=0;
 $("appRoot").hidden=false;$("authScreen").hidden=true;
 $("reportScreen").hidden=false;
 window.__ruf.length=0;
},[RATES,RATE_IDS]);

// Ersetzt die echte Zeichenflaeche durch einen Stub, der sofort mit einer
// festen data:-URL "fertig" meldet - siehe Kopfkommentar.
const STUB_UNTERSCHRIFT="data:image/png;base64,AAAATESTUNTERSCHRIFT";
const sketchStubben=(page)=>page.evaluate((fixDataUrl)=>{
 window.__sketchAufrufe=[];
 window.openSketchFullscreen=(bg,idx,cb)=>{
  window.__sketchAufrufe.push({bg,idx,hatCallback:typeof cb==="function"});
  if(cb)cb(fixDataUrl);
 };
},STUB_UNTERSCHRIFT);

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1800}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 let letzteMeldung=""; page.on("dialog",d=>{letzteMeldung=d.message();d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // =========================================================================
 // A · Ausgangszustand: ohne Unterschrift bleibt alles wie zuvor
 // =========================================================================
 console.log("\nA · Ausgangszustand ohne Unterschrift");
 await anmelden(page);
 let z=await page.evaluate(()=>({
  client:signatureClient,mitarbeiter:signatureEmployee,
  thumbClientSichtbar:$("sigThumbClient").style.display!=="none",
  clearClientVersteckt:$("sigClearClient").hidden,
  printClientVersteckt:$("sigPrintClient").hidden,
  blockHatKlasse:$("sigPrintClient").closest(".sig-block").classList.contains("hat-unterschrift"),
  statusText:$("sigStatusClient").textContent
 }));
 p(z.client===null&&z.mitarbeiter===null,"ohne Unterschrift sind beide Felder leer",z);
 p(!z.thumbClientSichtbar,"keine Vorschau ohne Unterschrift",z);
 p(z.clearClientVersteckt,"kein Loeschen-Knopf ohne Unterschrift",z);
 p(z.printClientVersteckt&&!z.blockHatKlasse,"der Druck-Block bleibt unveraendert (Leerzeile, keine hat-unterschrift-Klasse)",z);
 p(z.statusText==="Noch keine Unterschrift.","der Status-Text sagt das auch",z);

 // =========================================================================
 // B · Unterschreiben: Klick oeffnet die (gestubbte) Skizzenflaeche im
 //     Callback-Modus, das Ergebnis erscheint ueberall
 // =========================================================================
 console.log("\nB · Unterschreiben (Auftraggeber)");
 await sketchStubben(page);
 p(await tipp(page,"#sigBtnClient"),"der Unterschreiben-Knopf ist antippbar");
 z=await page.evaluate(()=>({
  aufrufe:window.__sketchAufrufe,
  client:signatureClient,
  thumbSrc:$("sigThumbClient").src,
  thumbSichtbar:$("sigThumbClient").style.display!=="none",
  clearSichtbar:!$("sigClearClient").hidden,
  printSrc:$("sigPrintClient").src,
  printSichtbar:!$("sigPrintClient").hidden,
  blockHatKlasse:$("sigPrintClient").closest(".sig-block").classList.contains("hat-unterschrift"),
  status:$("sigStatusClient").textContent,
  isDirty:isDirty
 }));
 p(z.aufrufe.length===1&&z.aufrufe[0].hatCallback,"openSketchFullscreen wurde im Callback-Modus aufgerufen",z.aufrufe);
 p(z.client===STUB_UNTERSCHRIFT,"die Unterschrift landet im State",z.client);
 p(z.thumbSichtbar&&z.thumbSrc===STUB_UNTERSCHRIFT,"die Vorschau zeigt sie",z);
 p(z.clearSichtbar,"der Loeschen-Knopf erscheint",z);
 p(z.printSichtbar&&z.printSrc===STUB_UNTERSCHRIFT&&z.blockHatKlasse,"das Druck-Bild wird gesetzt und der Block markiert",z);
 p(z.status==="✓ Unterschrieben.","der Status-Text aendert sich",z);
 p(z.isDirty===true,"das Formular gilt als geaendert",z);

 // Zweite Unterschrift (Mitarbeiter) unabhaengig von der ersten.
 await tipp(page,"#sigBtnEmployee");
 z=await page.evaluate(()=>({mitarbeiter:signatureEmployee,client:signatureClient}));
 p(z.mitarbeiter===STUB_UNTERSCHRIFT&&z.client===STUB_UNTERSCHRIFT,"beide Unterschriften bestehen unabhaengig nebeneinander",z);

 // =========================================================================
 // C · Loeschen
 // =========================================================================
 console.log("\nC · Loeschen einer Unterschrift");
 await tipp(page,"#sigClearClient");
 z=await page.evaluate(()=>({
  client:signatureClient,mitarbeiter:signatureEmployee,
  printClientVersteckt:$("sigPrintClient").hidden,
  printMitarbeiterSichtbar:!$("sigPrintEmployee").hidden
 }));
 p(z.client===null,"die Auftraggeber-Unterschrift ist wieder leer",z);
 p(z.mitarbeiter===STUB_UNTERSCHRIFT,"die Mitarbeiter-Unterschrift bleibt unberuehrt",z);
 p(z.printClientVersteckt,"ihr Druck-Bild verschwindet wieder",z);
 p(z.printMitarbeiterSichtbar,"das des Mitarbeiters bleibt sichtbar",z);

 // =========================================================================
 // D · Speichern: beide Felder landen im Payload
 // =========================================================================
 console.log("\nD · Speichern schreibt beide Felder in den Payload");
 await tipp(page,"#sigBtnClient"); // Auftraggeber erneut unterschreiben
 await page.evaluate(()=>{window.__ruf.length=0});
 await tipp(page,"#save");
 await page.waitForTimeout(150);
 z=await page.evaluate(()=>{
  const einfuegen=window.__ruf.find(r=>r.art==="insert"&&r.tabelle==="reports");
  return {row:einfuegen?einfuegen.row:null};
 });
 p(!!z.row,"ein reports-Insert wurde ausgeloest",z);
 p(z.row&&z.row.signature_client===STUB_UNTERSCHRIFT,"signature_client steht im Payload",z.row);
 p(z.row&&z.row.signature_employee===STUB_UNTERSCHRIFT,"signature_employee steht im Payload",z.row);

 // =========================================================================
 // E · Laden: openReport() stellt beide Felder aus der Datenbank wieder her
 // =========================================================================
 console.log("\nE · Laden eines gespeicherten Rapports stellt die Unterschriften wieder her");
 z=await page.evaluate(()=>{
  openReport({id:42,project_id:7,work_entries:[],material_entries:[],
    signature_client:"data:image/png;base64,AAAKUNDE",signature_employee:null});
  return {client:signatureClient,mitarbeiter:signatureEmployee,
    thumbClientSichtbar:$("sigThumbClient").style.display!=="none",
    thumbMitarbeiterSichtbar:$("sigThumbEmployee").style.display!=="none"};
 });
 p(z.client==="data:image/png;base64,AAAKUNDE","die gespeicherte Auftraggeber-Unterschrift wird geladen",z);
 p(z.mitarbeiter===null,"eine fehlende Mitarbeiter-Unterschrift wird NICHT angedichtet",z);
 p(z.thumbClientSichtbar&&!z.thumbMitarbeiterSichtbar,"die Vorschauen zeigen genau das",z);

 // =========================================================================
 // F · "Alles loeschen" und "Neuer Rapport" setzen beide Felder zurueck
 // =========================================================================
 console.log("\nF · Zuruecksetzen bei \"Alles loeschen\" und \"Neuer Rapport\"");
 await tipp(page,"#clear"); // bestaetigt den confirm()-Dialog automatisch (siehe oben)
 z=await page.evaluate(()=>({client:signatureClient,mitarbeiter:signatureEmployee}));
 p(z.client===null&&z.mitarbeiter===null,"\"Alles loeschen\" nimmt auch die Unterschriften weg",z);

 z=await page.evaluate(()=>{
  signatureClient="data:image/png;base64,X"; renderSignatures();
  $("newReport").click();
  return {client:signatureClient,mitarbeiter:signatureEmployee};
 });
 p(z.client===null&&z.mitarbeiter===null,"\"Neuer Rapport\" nimmt eine stehengebliebene Unterschrift ebenfalls weg",z);

 p(fehler.length===0,"keine JavaScript-Fehler im ganzen Lauf",fehler.slice(0,3));
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

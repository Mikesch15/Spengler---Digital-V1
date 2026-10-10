// Prueft v3.292 (Auftrag "Ruesten und Montage als durchgaengige Arbeitsschritte"):
// Aus der persoenlichen Aufgabe "Zu ruesten"/"Zu montieren" gelangt man direkt zu den
// Ausfuehrungsinformationen (grosses Ruestblatt, js/80) - mit dem Bestaetigen-Knopf nur fuer
// Berechtigte. Kein neuer Schirm, keine neue Statuslogik. Jede Probe hat eine Gegenprobe.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[],dialoge=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>{dialoge.push(d.type()+":"+d.message());d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  const R="rrrr-ruester",M="mmmm-monteur",A="aaaa-aufnehmer",X="xxxx-fremder",D="dddd-admin";
  window.__ID={R,M,A,X,D};
  profileName=id=>({[R]:"Rita Rüster",[M]:"Max Monteur",[A]:"Anna Aufnehmer",[X]:"Fritz Fremd",[D]:"Dora Admin"}[id]||"");
  workflowAktiv=true;
  allProjects=[{id:1,name:"Steildach",object:"Alpeneggstrasse 22, Bern",order_no:"18191",hinweis:"Schluessel beim Hauswart."}];
  window.__ZEILEN={
   10:{id:10,project_id:1,type:"einlaufblech_gerade",title:"Traufe Nord",workflow_status:"zu_ruesten",created_by:A,ruester_id:R,monteur_id:M,note:"Gerüst ab Dienstag",photo_paths:["p/foto1.jpg"],sketch_paths:["p/skizze1.jpg"],data:{},freigabe_verfallen:false},
   11:{id:11,project_id:1,type:"kamineinfassung",title:"Kamin Ost",workflow_status:"zu_montieren",created_by:A,ruester_id:R,monteur_id:M,data:{},photo_paths:[],sketch_paths:[]},
   12:{id:12,project_id:1,type:"dachfenstereinfassung",title:"DF alt",workflow_status:"zu_ruesten",created_by:A,ruester_id:R,monteur_id:M,data:{},photo_paths:[],sketch_paths:[]},
   13:{id:13,project_id:1,type:"rinne",title:"Schon gerüstet",workflow_status:"geruestet",created_by:A,ruester_id:R,monteur_id:null,data:{},photo_paths:[],sketch_paths:[]}};
  window.__rpc=[]; window.__rpcFehler=false; window.__q=0;
  sb.from=(tab)=>{const op={};const pr={};
   pr.select=()=>pr;pr.order=()=>pr;pr.limit=()=>pr;pr.in=()=>pr;pr.is=()=>pr;
   pr.eq=(c,v)=>{op[c]=v;return pr};
   pr.maybeSingle=async()=>({data:tab==="measurements"?(window.__ZEILEN[op.id]||null):null,error:null});
   pr.then=(res)=>{window.__q++;return res({data:[],error:null})};
   return pr};
  sb.rpc=async(n,a)=>{window.__rpc.push([n,a&&a.p_id]);return window.__rpcFehler?{data:null,error:{message:"Nur der zugewiesene Ruester kann das Ruesten bestaetigen."}}:{data:{},error:null}};
  window.__als=(id,rolle)=>{currentProfile={id,role:rolle,company_id:"c1"};meineRechte={admin:rolle==="admin"}};
 });
 const sicht=()=>page.evaluate(()=>({auf:!$("ruestblattModal").hidden,text:$("ruestblattBody").textContent.replace(/\s+/g," "),
   html:$("ruestblattBody").innerHTML,knopf:[...document.querySelectorAll("#ruestblattAktion [data-aufgabe]")].map(k=>k.dataset.aufgabe+":"+k.textContent.trim()),
   aktion:$("ruestblattAktion").textContent.replace(/\s+/g," ").trim()}));
 const oeffne=(id,art)=>page.evaluate(([i,a])=>aufgabeAusfuehren("ausfuehrung_"+a,i),[id,art]);
 const zu=()=>page.evaluate(()=>{rbZu()});

 // Aufgabenzeile fuehrt in die Ausfuehrungsansicht - nur bei Ruesten/Montieren
 const z=await page.evaluate(()=>{__als(__ID.R,"employee");
  const mk=(art,id)=>({art,m:__ZEILEN[id]});
  return {ruesten:a2AufgabeHtml(mk("ruesten",10)),montieren:a2AufgabeHtml(mk("montieren",11)),freigeben:a2AufgabeHtml(mk("freigeben",10))}});
 p(/data-a2-aufgabe="ausfuehrung_ruesten"/.test(z.ruesten)&&/data-a2-aufgabe="ausfuehrung_montieren"/.test(z.montieren),"Aufgabenzeile 'Zu rüsten'/'Zu montieren' führt in die Ausführungsansicht");
 p(/data-a2-aufgabe="oeffnen"/.test(z.freigeben)&&!/ausfuehrung_/.test(z.freigeben),"Gegenprobe: 'Freigeben' öffnet weiter das Formular");

 // Ruester
 await page.evaluate(()=>__als(__ID.R,"employee"));
 await oeffne(10,"ruesten"); await page.waitForTimeout(200);
 let s=await sicht();
 p(s.auf,"Rüster: die Ansicht geht auf (grosses Rüstblatt)");
 p(/Alpeneggstrasse 22, Bern/.test(s.text)&&/Auftrag 18191/.test(s.text),"Projekt/Baustelle steht da",s.text.slice(0,200));
 p(/Schluessel beim Hauswart/.test(s.text)&&/Gerüst ab Dienstag/.test(s.text),"Hinweis zum Projekt und Notiz zur Massaufnahme stehen da");
 p(/Zu rüsten/i.test(s.text)&&/Rita Rüster/.test(s.text)&&/Max Monteur/.test(s.text)&&/Anna Aufnehmer/.test(s.text),"Status und alle drei Zuständigen stehen da",s.text.slice(0,260));
 const kacheln=await page.evaluate(()=>[...document.querySelectorAll("#ruestblattBody .medien-kachel")].map(k=>k.dataset.label));
 p(JSON.stringify(kacheln)==='["Foto","Skizze"]',"Foto und Skizze der Aufnahme sind als Kacheln da",kacheln);
 p(/kein Zuschnitt gespeichert/.test(s.text),"fehlende Zuschnittdaten sind klar gekennzeichnet (nichts erfunden)");
 p(JSON.stringify(s.knopf)==='["ruesten:✓ Rüsten bestätigen"]',"der zugewiesene Rüster sieht 'Rüsten bestätigen'",s.knopf);

 // Bestaetigen: Erfolg
 await page.evaluate(()=>{window.__rpc.length=0}); dialoge.length=0;
 await page.evaluate(()=>document.querySelector('#ruestblattAktion [data-aufgabe="ruesten"]').click()); await page.waitForTimeout(300);
 p(JSON.stringify(await page.evaluate(()=>window.__rpc))==='[["measurement_geruestet",10]]',"Bestätigen ruft measurement_geruestet für genau diese Massaufnahme",await page.evaluate(()=>window.__rpc));
 p(dialoge.some(d=>/Rüsten bestätigen\?/.test(d)),"mit der bekannten Rückfrage");
 p((await sicht()).auf===false,"nach Erfolg geht die Ansicht zu (Aufgabenliste lädt neu)");
 // Fehler
 await page.evaluate(()=>{window.__rpcFehler=true}); dialoge.length=0;
 await oeffne(10,"ruesten"); await page.waitForTimeout(150);
 await page.evaluate(()=>document.querySelector('#ruestblattAktion [data-aufgabe="ruesten"]').click()); await page.waitForTimeout(300);
 p((await sicht()).auf===true&&dialoge.some(d=>/alert:.*zugewiesene Ruester/.test(d)),"Gegenprobe: scheitert der Server, steht die Meldung da und die Ansicht bleibt - kein falscher Erfolg",dialoge);
 await page.evaluate(()=>{window.__rpcFehler=false}); await zu();

 // Fremder Mitarbeiter / Admin
 await page.evaluate(()=>__als(__ID.X,"employee")); await oeffne(10,"ruesten"); await page.waitForTimeout(150);
 s=await sicht();
 p(s.knopf.length===0&&/Bestätigen kann Rita Rüster/.test(s.aktion),"ein nicht zuständiger Mitarbeiter sieht KEINEN Bestätigen-Knopf, nur wer es kann",s.aktion);
 await zu();
 await page.evaluate(()=>__als(__ID.D,"admin")); await oeffne(10,"ruesten"); await page.waitForTimeout(150);
 p((await sicht()).knopf.length===1,"ein Administrator sieht den Knopf (wie die Datenbank es erlaubt)");
 await zu();

 // Status passt nicht
 await page.evaluate(()=>__als(__ID.R,"employee")); await oeffne(13,"ruesten"); await page.waitForTimeout(150);
 s=await sicht();
 p(s.knopf.length===0&&/nicht \(mehr\) an/.test(s.aktion),"Gegenprobe: ist der Schritt nicht (mehr) dran, gibt es keinen Knopf",s.aktion);
 await zu();

 // alter Dachfenster-Zuschnitt
 await oeffne(12,"ruesten"); await page.waitForTimeout(150);
 p(/Alter Zuschnitt/.test((await sicht()).text),"alter Dachfenster-Zuschnitt wird beim Rüsten gekennzeichnet");
 await zu();

 // Monteur
 await page.evaluate(()=>__als(__ID.M,"employee")); await oeffne(11,"montieren"); await page.waitForTimeout(200);
 s=await sicht();
 p(s.auf&&/Zu montieren/i.test(s.text)&&/Max Monteur/.test(s.text)&&/Alpeneggstrasse/.test(s.text),"Monteur: Baustelle, Status und Zuständige stehen da",s.text.slice(0,200));
 p(!/Zuschnitt/.test(s.text),"Gegenprobe: der Monteur bekommt keine Zuschnittliste vorgesetzt");
 p(JSON.stringify(s.knopf)==='["montieren:🏠 Montage bestätigen"]',"der zugewiesene Monteur sieht 'Montage bestätigen'",s.knopf);
 await page.evaluate(()=>{window.__rpc.length=0});
 await page.evaluate(()=>document.querySelector('#ruestblattAktion [data-aufgabe="montieren"]').click()); await page.waitForTimeout(300);
 p(JSON.stringify(await page.evaluate(()=>window.__rpc))==='[["measurement_montiert",11]]',"Montage bestätigen ruft measurement_montiert",await page.evaluate(()=>window.__rpc));
 await page.evaluate(()=>__als(__ID.R,"employee")); await oeffne(11,"montieren"); await page.waitForTimeout(150);
 p((await sicht()).knopf.length===0,"Gegenprobe: der Rüster (nicht der Monteur) kann die Montage nicht bestätigen");
 await zu();
 // nicht auffindbar
 const nf=await page.evaluate(async()=>{const r=await aufgabeAusfuehrungOeffnen(999,"ruesten");return {r,auf:!$("ruestblattModal").hidden}});
 p(nf.r===false&&nf.auf===false,"Gegenprobe: eine nicht (mehr) vorhandene Massaufnahme öffnet nichts");
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();

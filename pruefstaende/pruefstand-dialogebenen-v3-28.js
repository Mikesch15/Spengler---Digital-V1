// v3.28: Ein Dialog, der ueber einem anderen geoeffnet wird, muss auch
// wirklich oben liegen.
//
// Gemeldet: "material erfassen die karte oeffnet im hintergrund".
// Ursache war zum vierten Mal dieselbe Falle (CLAUDE.md 110.6, 115.8, 117.3):
// alle .modal teilen z-index 500, dann entscheidet die Reihenfolge im
// Dokument - und #lagerFormModal (Zeile 565) steht vor #settingsModal (1563).
//
// Geprueft wird deshalb NICHT die z-index-Zahl (die kann stimmen und der
// Dialog trotzdem verdeckt sein, sobald ein Dritter dazwischenkommt),
// sondern die tatsaechliche Ueberdeckung ueber elementFromPoint - und zwar
// auf der KARTE und auf den BEDIENELEMENTEN. Ein verdeckter Knopf laesst
// page.click haengen, und ein haengender Lauf sieht aus wie "keine Fehler"
// (CLAUDE.md 78), deshalb wird gemessen statt geklickt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-dialogebenen-v3-28.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const ATTRAPPE=`window.supabase={createClient:()=>{
 const t=n=>({select:()=>t(n),eq:()=>t(n),order:()=>t(n),in:()=>t(n),range:()=>t(n),
  limit:()=>Promise.resolve({data:[],error:null}),
  maybeSingle:()=>Promise.resolve({data:null,error:null}),
  then:f=>Promise.resolve({data:[],error:null}).then(f),
  insert:d=>({select:()=>Promise.resolve({data:[d],error:null})}),
  upsert:d=>({select:()=>Promise.resolve({data:[d],error:null})}),
  update:()=>({eq:()=>({select:()=>Promise.resolve({data:[{id:1}],error:null})})}),
  delete:()=>({eq:()=>({select:()=>Promise.resolve({data:[{id:1}],error:null})})})});
 return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:t,storage:{from:()=>({upload:()=>Promise.resolve({error:null}),
   createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})})},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}};}};`;

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);

 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"f1"};
  allProfiles=[{id:"u1",first_name:"M",last_name:"L"}]; meineRechte={admin:true};
  allProjects=[{id:7,name:"Testbau",object:"Musterweg 1"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  settings.materials=[["103.01","Titanzinkblech blank","0.70","m²",30]];
  materialIds=[11]; lagerbestand=[]; reststuecke=[]; appSettingsId=1;
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0;
  restMindestlaenge=1000; restMindestbreite=100; resteImZuschnitt=false;
  document.getElementById("authScreen").hidden=true;
  document.getElementById("appRoot").hidden=false;
 });

 // Misst, was am Mittelpunkt eines Elements TATSAECHLICH obenauf liegt.
 const obenAuf=(sel)=>page.evaluate(s=>{
  const el=document.querySelector(s);
  if(!el)return {da:false};
  const r=el.getBoundingClientRect();
  if(r.width<4||r.height<4)return {da:true,sichtbar:false,w:Math.round(r.width),h:Math.round(r.height)};
  const x=Math.round(r.left+r.width/2);
  const y=Math.round(Math.max(2,Math.min(window.innerHeight-2,r.top+Math.min(r.height/2,250))));
  const t=document.elementFromPoint(x,y);
  const mo=t?t.closest(".modal,.sketch-fullscreen,.medien-viewer"):null;
  return {da:true,sichtbar:true,w:Math.round(r.width),h:Math.round(r.height),
    obenIn:mo?(mo.id||mo.className):null,
    trifftSelbst:!!(t&&(t===el||el.contains(t)))};
 },sel);

 console.log("\nA · Der gemeldete Weg: Einstellungen -> Lager -> Material erfassen");
 await page.evaluate(()=>{if(typeof openSettingsTo==="function")openSettingsTo("lager")});
 await page.waitForTimeout(250);
 const knopfDa=await page.evaluate(()=>{
  const k=document.getElementById("lagerNeu");
  const r=k?k.getBoundingClientRect():null;
  return !!(r&&r.width>0&&r.height>0);
 });
 p(knopfDa,"Der Knopf «＋ Material erfassen» ist im Register Lager sichtbar");
 // Ueber evaluate ausloesen: ein verdeckter Knopf laesst page.click haengen.
 await page.evaluate(()=>{const k=document.getElementById("lagerNeu");if(k)k.click()});
 await page.waitForTimeout(250);
 const offen=await page.evaluate(()=>{
  const l=document.getElementById("lagerFormModal"), s=document.getElementById("settingsModal");
  return {lagerOffen:l&&!l.hidden, settingsNochOffen:s&&!s.hidden};
 });
 p(offen.lagerOffen,"Der Dialog ist geoeffnet",offen);
 p(offen.settingsNochOffen,"Die Einstellungen bleiben dahinter offen (Dialog auf Dialog)",offen);

 const karte=await obenAuf("#lagerFormModal .card");
 p(karte.sichtbar&&karte.obenIn==="lagerFormModal",
   "Die Karte liegt WIRKLICH oben - nicht hinter den Einstellungen",karte);
 for(const [sel,name] of [["#lagerFormSpeichern","Speichern"],["#lagerFormAbbrechen","Abbrechen"],
                          ["#lagerFormModal .hilfe-knopf","Info-Knopf"]]){
  const m=await obenAuf(sel);
  p(m.sichtbar&&m.trifftSelbst,"Der Knopf «"+name+"» ist wirklich bedienbar (nicht verdeckt)",m);
 }
 const felder=await page.evaluate(()=>{
  const f=[...document.querySelectorAll("#lagerFormBody input,#lagerFormBody select")];
  if(!f.length)return {anzahl:0};
  let verdeckt=0;
  for(const el of f){
   const r=el.getBoundingClientRect();
   if(r.width<4||r.height<4)continue;
   const t=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+r.height/2));
   if(!(t===el||el.contains(t)))verdeckt++;
  }
  return {anzahl:f.length,verdeckt};
 });
 p(felder.anzahl>0&&felder.verdeckt===0,
   "Jedes Eingabefeld des Dialogs ist erreichbar",felder);

 console.log("\nB · Der Dialog laesst sich auch wieder schliessen");
 await page.evaluate(()=>{const k=document.getElementById("lagerFormAbbrechen");if(k)k.click()});
 await page.waitForTimeout(200);
 const zu=await page.evaluate(()=>{
  const l=document.getElementById("lagerFormModal"), s=document.getElementById("settingsModal");
  return {lagerZu:l&&l.hidden, settingsOffen:s&&!s.hidden};
 });
 p(zu.lagerZu,"Abbrechen schliesst den Dialog",zu);
 p(zu.settingsOffen,"Die Einstellungen stehen danach wieder da",zu);

 console.log("\nC · Das Hilfefenster liegt ueber JEDEM Schirm");
 // Es ist von ueberall aufrufbar - auch aus den hochgesetzten Dialogen und
 // aus der Skizzen-Vollbildansicht (z-index 2000).
 const schirme=[["settingsModal","Einstellungen"],["lagerFormModal","Material erfassen"],
                ["mwZuweisenModal","Ruester/Monteur zuweisen"],["mwKorrigierenModal","Status korrigieren"],
                ["winkelModal","Winkel im Meter"],["measurementEditModal","Massaufnahme-Formular"]];
 for(const [id,name] of schirme){
  const auf=await page.evaluate(i=>{
   const d=document.getElementById(i); if(!d)return false;
   d.hidden=false;
   const k=d.querySelector(".hilfe-knopf[data-hilfe]");
   if(k){k.click();return true}
   const h=document.getElementById("hilfeModal"); if(h)h.hidden=false;
   return "ohneKnopf";
  },id);
  const m=await obenAuf("#hilfeModal .card, #hilfeModal .hilfe-box");
  p(m.sichtbar&&m.obenIn==="hilfeModal",
    "Die Hilfe liegt ueber «"+name+"»"+(auf==="ohneKnopf"?" (ohne eigenen Info-Knopf)":""),
    {schirm:id,...m});
  await page.evaluate(i=>{
   const h=document.getElementById("hilfeModal"); if(h)h.hidden=true;
   const d=document.getElementById(i); if(d)d.hidden=true;
  },id);
 }
 // Die Skizzen-Vollbildansicht ist kein .modal, sondern die hoechste
 // Zeichenflaeche der App (z-index 2000). Sie traegt heute KEINEN Info-Knopf;
 // geprueft wird trotzdem, dass die Hilfe darueber laege - sonst waere die
 // Ebenenordnung nur zufaellig richtig, und ein spaeter ergaenzter Knopf
 // wuerde ins Leere oeffnen.
 const skizze=await page.evaluate(()=>{
  const fs=document.querySelector(".sketch-fullscreen");
  if(!fs)return {da:false};
  fs.hidden=false;
  const k=fs.querySelector(".hilfe-knopf[data-hilfe]");
  if(k)k.click(); else {const hh=document.getElementById("hilfeModal"); if(hh)hh.hidden=false}
  const h=document.getElementById("hilfeModal");
  const karte=h?(h.querySelector(".card")||h.querySelector(".hilfe-box")):null;
  const r=karte?karte.getBoundingClientRect():null;
  let obenIn=null;
  if(r&&r.width>4&&r.height>4){
   const t=document.elementFromPoint(Math.round(r.left+r.width/2),Math.round(r.top+Math.min(r.height/2,200)));
   const mo=t?t.closest(".modal,.sketch-fullscreen"):null;
   obenIn=mo?(mo.id||mo.className.split(" ")[0]):null;
  }
  const zi={fs:getComputedStyle(fs).zIndex,hilfe:h?getComputedStyle(h).zIndex:null};
  if(h)h.hidden=true; fs.hidden=true;
  return {da:true,hatKnopf:!!k,obenIn,zi};
 });
 p(skizze.da&&skizze.obenIn==="hilfeModal",
   "Die Hilfe liegt auch ueber der Skizzen-Vollbildansicht",skizze);

 console.log("\nD · Kein Dialog verdeckt einen, der ueber ihm geoeffnet wird");
 // Die Flows, die es in der App wirklich gibt: ein Dialog bleibt offen,
 // ein zweiter kommt darueber. Alles andere schliesst den ersten vorher.
 const flows=[["settingsModal","lagerFormModal","Material erfassen ueber den Einstellungen"],
              ["measurementEditModal","mwZuweisenModal","Zuweisen ueber dem Massaufnahme-Formular"],
              ["measurementEditModal","mwKorrigierenModal","Status korrigieren ueber dem Formular"],
              ["measurementEditModal","winkelModal","Winkel im Meter ueber dem Formular"],
              ["measurementEditModal","pdfListenModal","PDF-Auswahl ueber dem Formular"]];
 for(const [unten,oben,name] of flows){
  const m=await page.evaluate(([u,o])=>{
   const a=document.getElementById(u), c=document.getElementById(o);
   if(!a||!c)return {da:false};
   a.hidden=false; c.hidden=false;
   const karte=c.querySelector(".card");
   const r=karte?karte.getBoundingClientRect():null;
   let obenIn=null;
   if(r&&r.width>4&&r.height>4){
    const t=document.elementFromPoint(Math.round(r.left+r.width/2),
      Math.round(Math.max(2,Math.min(window.innerHeight-2,r.top+Math.min(r.height/2,250)))));
    const mo=t?t.closest(".modal"):null; obenIn=mo?mo.id:null;
   }
   a.hidden=true; c.hidden=true;
   return {da:true,obenIn};
  },[unten,oben]);
  p(m.da&&m.obenIn===oben,"Oben liegt der obere Dialog: "+name,{...m,erwartet:oben});
 }

 console.log("\nE · Bildschirmbreiten");
 for(const w of [320,390,412,768,1280]){
  await page.setViewportSize({width:w,height:900});
  await page.evaluate(()=>{
   if(typeof openSettingsTo==="function")openSettingsTo("lager");
   const k=document.getElementById("lagerNeu"); if(k)k.click();
  });
  await page.waitForTimeout(200);
  const m=await obenAuf("#lagerFormModal .card");
  const sp=await obenAuf("#lagerFormSpeichern");
  const ueber=await page.evaluate(()=>{
   let n=0;
   for(const el of document.querySelectorAll("#lagerFormModal *")){
    const r=el.getBoundingClientRect();
    if(r.width>0&&r.right>window.innerWidth+1)n++;
   }
   return n;
  });
  p(m.sichtbar&&m.obenIn==="lagerFormModal"&&sp.trifftSelbst&&ueber===0,
    "Bei "+w+" px: Karte oben, Speichern bedienbar, nichts laeuft seitlich hinaus",
    {...m,speichern:sp.trifftSelbst,ueber});
  await page.evaluate(()=>{const k=document.getElementById("lagerFormAbbrechen");if(k)k.click()});
 }

 p(jsFehler.length===0,"Keine JavaScript-Fehler",jsFehler.slice(0,3));
 console.log("\n== dialogebenen v3.28:  ok="+ok+"  fails="+fail+" ==");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

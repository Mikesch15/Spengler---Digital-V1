// Prueft v3.287: Massaufnahme und Regierapport lassen sich im FORMULAR loeschen
// (gefragt: "Wo habe ich die Moeglichkeit ... zu loeschen? Wenns das an keinem
// offensichtlichen Ort gibt bitte anpassen"). Jede Probe hat eine Gegenprobe.
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
 let antwort=true; page.on("dialog",d=>{dialoge.push(d.type()+":"+d.message());antwort?d.accept():d.dismiss()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  window.__del=[]; window.__zeilen=1;
  const kette=(tab,op)=>{const k={eq:()=>k,select:()=>k,order:()=>k,limit:()=>k,is:()=>k,in:()=>k,
    delete:()=>{op.art="delete";return k},
    then:(res)=>res({data:op.art==="delete"?(window.__zeilen?[{id:1}]:[]):[],error:null})};
   return k};
  sb.from=(tab)=>{const op={tab};const k=kette(tab,op);
   const orig=k.eq; k.eq=(c,v)=>{op.id=v;return k};
   const pr=Object.assign({},k,{then:(res)=>{ if(op.art==="delete")window.__del.push([tab,op.id]); return k.then(res)}});
   pr.eq=(c,v)=>{op.id=v;return pr}; pr.select=()=>pr; pr.delete=()=>{op.art="delete";return pr}; pr.order=()=>pr;
   return pr};
 });
 const knopf=(id)=>page.evaluate(i=>({da:!!$(i),hidden:$(i)?$(i).hidden:null}),id);

 // ---- Massaufnahme ----
 await page.evaluate(()=>{currentMeasurementId=null;$("measurementEditModal").hidden=true;});
 await page.evaluate(()=>{$("measurementEditModal").hidden=false});
 await page.waitForTimeout(100);
 let k=await knopf("measDelete");
 p(k.da&&k.hidden===true,"Massaufnahme: neue (noch nicht gespeicherte) hat keinen Loeschen-Knopf",k);
 await page.evaluate(()=>{$("measurementEditModal").hidden=true;currentMeasurementId=42;$("measurementEditModal").hidden=false});
 await page.waitForTimeout(100);
 k=await knopf("measDelete");
 p(k.hidden===false,"Massaufnahme: eine gespeicherte hat den Knopf im Formular",k);
 // Nein
 antwort=false; dialoge.length=0;
 await page.evaluate(()=>$("measDelete").click()); await page.waitForTimeout(150);
 p(await page.evaluate(()=>window.__del.length)===0&&await page.evaluate(()=>!$("measurementEditModal").hidden)&&dialoge.some(d=>/Massaufnahme wirklich löschen/.test(d)),"Rueckfrage verneint: nichts geloescht, Formular bleibt",dialoge);
 // RLS-Fall: 0 Zeilen
 antwort=true; dialoge.length=0; await page.evaluate(()=>{window.__zeilen=0});
 await page.evaluate(()=>$("measDelete").click()); await page.waitForTimeout(200);
 p(await page.evaluate(()=>!$("measurementEditModal").hidden)&&dialoge.some(d=>/alert:.*nicht gelöscht/.test(d)),"Gegenprobe: trifft die Datenbank 0 Zeilen, wird KEIN Erfolg gemeldet und das Formular bleibt",dialoge);
 // Ja
 await page.evaluate(()=>{window.__zeilen=1;window.__del.length=0});
 await page.evaluate(()=>$("measDelete").click()); await page.waitForTimeout(250);
 const del=await page.evaluate(()=>window.__del);
 p(JSON.stringify(del)==='[["measurements",42]]'&&await page.evaluate(()=>$("measurementEditModal").hidden),"bestaetigt: genau diese Massaufnahme geloescht, Formular zu",del);

 // ---- Rapport ----
 await page.evaluate(()=>{$("reportScreen").hidden=true;currentReportId=null;$("reportScreen").hidden=false});
 await page.waitForTimeout(100);
 k=await knopf("reportDelete");
 p(k.da&&k.hidden===true,"Rapport: ein neuer hat keinen Loeschen-Knopf",k);
 await page.evaluate(()=>{$("reportScreen").hidden=true;currentReportId=7;$("reportScreen").hidden=false});
 await page.waitForTimeout(100);
 k=await knopf("reportDelete");
 p(k.hidden===false,"Rapport: ein gespeicherter hat den Knopf",k);
 antwort=false; dialoge.length=0; await page.evaluate(()=>{window.__del.length=0});
 await page.evaluate(()=>$("reportDelete").click()); await page.waitForTimeout(150);
 p(await page.evaluate(()=>window.__del.length)===0&&dialoge.some(d=>/Regierapport wirklich löschen/.test(d)),"Rapport: Rueckfrage verneint -> nichts geloescht",dialoge);
 antwort=true;
 await page.evaluate(()=>$("reportDelete").click()); await page.waitForTimeout(250);
 p(JSON.stringify(await page.evaluate(()=>window.__del))==='[["reports",7]]'&&await page.evaluate(()=>currentReportId)===null,"Rapport: bestaetigt -> genau dieser geloescht",await page.evaluate(()=>window.__del));
 // Unterscheidung
 const txt=await page.evaluate(()=>[$("clear").textContent.trim(),$("reportDelete").textContent.trim()]);
 p(/leeren/.test(txt[0])&&!/löschen/i.test(txt[0])&&/Rapport löschen/.test(txt[1]),"'Eingaben leeren' und 'Rapport löschen' sind nicht mehr zu verwechseln",txt);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();

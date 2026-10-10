// Prueft v3.288: Ausmass, beide Offerten-Arten (selbst erstellt / importiert) und
// Dateien lassen sich ohne Umweg loeschen - wie Massaufnahme und Regierapport in
// v3.287. Jede Probe hat eine Gegenprobe (neu = kein Knopf, "Nein" = nichts weg,
// 0 Zeilen von RLS = kein Erfolg).
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
  window.__del=[];window.__zeilen=1;window.__storage=[];
  sb.from=(tab)=>{const op={tab};const pr={};
   pr.eq=(c,v)=>{op.id=v;return pr}; pr.select=()=>pr; pr.order=()=>pr; pr.limit=()=>pr; pr.is=()=>pr; pr.in=()=>pr;
   pr.delete=()=>{op.art="delete";return pr};
   pr.then=(res)=>{ if(op.art==="delete")window.__del.push([tab,op.id]);
    return res({data:op.art==="delete"?(window.__zeilen?[{id:op.id}]:[]):[],error:null})};
   return pr};
  sb.storage={from:()=>({remove:async(l)=>{window.__storage.push(l);return {data:[],error:null}},
    createSignedUrl:async()=>({data:{signedUrl:"x"},error:null})})};
 });
 const sicht=id=>page.evaluate(i=>$(i).hidden,id);
 const dels=()=>page.evaluate(()=>window.__del);
 async function pruefe(name,modal,knopf,setzeId,tabelle,frageRe){
  await page.evaluate(([m,s])=>{$(m).hidden=true;eval(s+"=null");$(m).hidden=false},[modal,setzeId]);
  await page.waitForTimeout(100);
  p(await sicht(knopf)===true,name+": ein neuer (ungespeicherter) hat keinen Loeschen-Knopf");
  await page.evaluate(([m,s])=>{$(m).hidden=true;eval(s+"=77");$(m).hidden=false},[modal,setzeId]);
  await page.waitForTimeout(100);
  p(await sicht(knopf)===false,name+": ein gespeicherter hat den Knopf");
  antwort=false; dialoge.length=0; await page.evaluate(()=>{window.__del.length=0;window.__zeilen=1});
  await page.evaluate(k=>$(k).click(),knopf); await page.waitForTimeout(150);
  p((await dels()).length===0&&dialoge.some(d=>frageRe.test(d)),name+": Rueckfrage verneint -> nichts geloescht",dialoge);
  antwort=true; dialoge.length=0; await page.evaluate(()=>{window.__zeilen=0});
  await page.evaluate(k=>$(k).click(),knopf); await page.waitForTimeout(200);
  p(await page.evaluate(m=>!$(m).hidden,modal)&&dialoge.some(d=>/alert:.*nicht gelöscht/.test(d)),name+": Gegenprobe - 0 Zeilen von der Datenbank: kein Erfolg, Formular bleibt",dialoge);
  await page.evaluate(()=>{window.__zeilen=1;window.__del.length=0});
  await page.evaluate(k=>$(k).click(),knopf); await page.waitForTimeout(250);
  p(JSON.stringify(await dels())===JSON.stringify([[tabelle,77]])&&await sicht(modal),name+": bestaetigt -> genau dieser Eintrag geloescht, Formular zu",await dels());
 }
 await pruefe("Ausmass","ausmassEditModal","amDelete","currentAusmassId","ausmass",/Ausmass wirklich löschen/);
 await pruefe("Offerte (selbst erstellt)","offerteEditModal","offDelete","currentOfferteId","offerten",/Offerte wirklich löschen/);
 await pruefe("Offerte (importiert)","angebotEditModal","angDelete","currentAngebotId","angebote",/Offerte wirklich löschen/);

 // Dateien in der neuen Ansicht
 const dat=await page.evaluate(()=>{
  projectFilesCache=[{id:5,name:"Plan.pdf",file_path:"p/Plan.pdf",mime_type:"application/pdf",size_bytes:1000,created_at:"2026-10-01"},
   {id:6,name:"Foto.jpg",file_path:"p/Foto.jpg",mime_type:"image/jpeg",size_bytes:2000,created_at:"2026-10-02"}];
  const h=a2RegDateien({});
  return {knoepfe:[...h.matchAll(/data-a2-datei-weg="(\d+)"/g)].map(x=>+x[1])};
 });
 p(JSON.stringify(dat.knoepfe)==="[5,6]","Dateien: jede Datei hat in der neuen Ansicht einen Loeschen-Knopf",dat);
 antwort=false; dialoge.length=0; await page.evaluate(()=>{window.__del.length=0;window.__storage.length=0});
 let r=await page.evaluate(()=>projektDateiLoeschen(5));
 p(r===false&&(await dels()).length===0&&dialoge.some(d=>/Datei „Plan.pdf" wirklich löschen/.test(d)),"Dateien: Rueckfrage verneint -> nichts geloescht",dialoge);
 antwort=true; await page.evaluate(()=>{window.__zeilen=0});
 r=await page.evaluate(()=>projektDateiLoeschen(5));
 p(r===false&&(await page.evaluate(()=>window.__storage.length))===0,"Dateien: Gegenprobe - 0 Zeilen: nicht geloescht und die Datei im Speicher bleibt");
 await page.evaluate(()=>{window.__zeilen=1;window.__del.length=0});
 r=await page.evaluate(()=>projektDateiLoeschen(5));
 p(r===true&&JSON.stringify(await dels())==='[["project_files",5]]'&&JSON.stringify(await page.evaluate(()=>window.__storage))==='[[ "p/Plan.pdf" ]]'.replace(/ /g,""),"Dateien: bestaetigt -> Eintrag und Datei im Speicher weg",{r,del:await dels(),st:await page.evaluate(()=>window.__storage)});
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();

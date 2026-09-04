// Prueft, dass die Massaufnahme "Skizze / Foto" zum Rest der App passt:
// erklaerender Block wie bei den uebrigen Arten ohne Register, eine ehrliche
// Statuszeile, und ein Foto-Knopf, der aussieht und sich anfuehlt wie jeder
// andere Datei-Knopf der App.
//
// Bewusst OHNE Register: die Art hat genau ein Eingabefeld, der Rest ist der
// gemeinsame Foto-/Skizzenbereich. Register waeren nur zusaetzliche Klicks.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-skizze-foto-v2-82.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,200):""))}};
const zeige=async(page,typ)=>{
 await page.evaluate(t=>{$("measType").value=t;showMeasTypeSection(t)},typ);
 await page.waitForTimeout(150);
};
const sicht=(page,id)=>page.evaluate(i=>{
 const e=document.getElementById(i);
 if(!e)return null;
 const s=getComputedStyle(e), r=e.getBoundingClientRect();
 return {da:true,hidden:e.hidden,display:s.display,hoehe:Math.round(r.height),
         breite:Math.round(r.width),text:(e.innerText||"").replace(/\s+/g," ").trim()};
},id);

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1600}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;},storage:{from:()=>({createSignedUrl:async(pf)=>({data:{signedUrl:'https://beispiel.test/'+pf},error:null})})}})};"}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung",object:"Bahnhofstrasse 12, 3011 Bern",order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink",legacy_key:"titanzink"},
                        {id:6,name:"Stahl, verzinkt",legacy_key:"stahl_verzinkt"}];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // ---- A · Bewusst KEINE Register ------------------------------------------
 console.log("\nA · bewusst ohne Register");
 await zeige(page,"skizze_foto");
 const reg=await page.evaluate(()=>({
  knoepfe:document.querySelectorAll("#measTypeFoto .ra-register-knopf").length,
  leiste:!!document.querySelector("#measTypeFoto .ra-register"),
  weiter:!!document.querySelector("#measTypeFoto [id$=_weiter]")
 }));
 p(reg.knoepfe===0&&!reg.leiste&&!reg.weiter,
   "Skizze/Foto hat keine Registerleiste - sie braucht keine",reg);
 // Und die fuenf Arten MIT Registern haben weiterhin ihre.
 for(const t of ["rinne_halbrund","einlaufblech_gerade","einlaufblech_konisch",
                 "freies_profil","mauerabdeckung"]){
  await zeige(page,t);
  const n=await page.evaluate(()=>document.querySelectorAll("#measurementEditModal .ra-register-knopf").length);
  p(n>=6,t+": hat weiterhin seine Register ("+n+")",n);
 }

 // ---- B · Erklaerender Block wie bei den uebrigen Arten ohne Register -----
 console.log("\nB · erklaerender Block wie bei Kehle, Lukarne, Einfassung Rund");
 await zeige(page,"skizze_foto");
 const info=await page.evaluate(()=>{
  const e=document.querySelector("#measTypeFoto .info");
  return e?{text:e.innerText.replace(/\s+/g," ").trim(),hoehe:Math.round(e.getBoundingClientRect().height)}:null;
 });
 p(!!info&&info.hoehe>20,"Skizze/Foto hat einen erklaerenden Block",info);
 p(!!info&&/nicht rechnen|nichts berechnet/i.test(info.text),
   "er sagt, dass hier nichts gerechnet wird",info&&info.text.slice(0,90));
 p(!!info&&/keine Schritte/i.test(info.text),
   "und begruendet, warum es keine Schritte gibt",info&&info.text.slice(0,120));
 // Dieselbe Bauform wie bei den uebrigen Arten ohne Register.
 for(const [typ,id] of [["kehle","measTypeKehle"],["lukarne","measTypeLukarne"],
                        ["anschlussblech","measTypeAnschlussblech"],
                        ["einfassung_rund","measTypeEinfassungRund"]]){
  await zeige(page,typ);
  const hat=await page.evaluate(i=>!!document.querySelector("#"+i+" .info"),id);
  p(hat,typ+": hat ebenfalls einen erklaerenden Block (Vergleich)",hat);
 }

 // ---- C · Statuszeile: was ist wirklich erfasst ---------------------------
 console.log("\nC · Statuszeile sagt, was erfasst ist");
 await zeige(page,"skizze_foto");
 await page.evaluate(()=>{measPhotos=[];measSketches=[];
   renderSketchGallery();measMedienStatus()});
 await page.waitForTimeout(120);
 let st=await sicht(page,"fotoStatus");
 p(!!st&&/Noch kein Foto und keine Skizze/i.test(st.text),
   "ohne alles: sagt sie, dass mindestens eines noetig ist",st&&st.text);
 p(!!st&&!/NaN|undefined/.test(st.text),"kein NaN/undefined",st&&st.text);
 await page.evaluate(()=>{measSketches=["data:image/png;base64,AA"];renderSketchGallery()});
 await page.waitForTimeout(120);
 st=await sicht(page,"fotoStatus");
 p(!!st&&/1 Skizze/.test(st.text)&&!/Skizzen/.test(st.text),
   "eine Skizze: Einzahl",st&&st.text);
 await page.evaluate(()=>{measSketches=["data:image/png;base64,AA","data:image/png;base64,AB","data:image/png;base64,AC"];renderSketchGallery()});
 await page.waitForTimeout(120);
 st=await sicht(page,"fotoStatus");
 p(!!st&&/3 Skizzen/.test(st.text),"drei Skizzen: Mehrzahl",st&&st.text);
 await page.evaluate(()=>{measPhotos=["data:image/png;base64,AA"];renderMeasPhotoGallery()});
 await page.waitForTimeout(120);
 st=await sicht(page,"fotoStatus");
 p(!!st&&/1 Foto/.test(st.text)&&/3 Skizzen/.test(st.text),
   "Foto und Skizzen zusammen",st&&st.text);
 // Foto entfernen wirkt sofort - ohne dass die Galerie neu gezeichnet wird.
 await page.evaluate(()=>{document.querySelector("[data-remove-photo]").click()});
 await page.waitForTimeout(150);
 st=await sicht(page,"fotoStatus");
 p(!!st&&!/1 Foto/.test(st.text)&&/3 Skizzen/.test(st.text),
   "Foto entfernen aendert die Zeile sofort",st&&st.text);
 // Beim Umschalten der Art wird sie ebenfalls gesetzt.
 await page.evaluate(()=>{measPhotos=[];measSketches=[]});
 await zeige(page,"kehle"); await zeige(page,"skizze_foto");
 st=await sicht(page,"fotoStatus");
 p(!!st&&/Noch kein Foto/i.test(st.text),
   "nach dem Umschalten der Art stimmt sie auch",st&&st.text);

 // ---- D · Der Foto-Knopf sieht aus wie jeder andere Knopf ----------------
 console.log("\nD · Foto-Knopf wie jeder andere Datei-Knopf");
 const knopf=await page.evaluate(()=>{
  const l=document.querySelector("#measMedienBereich label.cockpit-upload");
  if(!l)return null;
  const s=getComputedStyle(l), r=l.getBoundingClientRect();
  const inp=l.querySelector('input[type=file]');
  return {text:l.innerText.replace(/\s+/g," ").trim(),
   hoehe:Math.round(r.height),breite:Math.round(r.width),
   transform:s.textTransform,zeiger:s.cursor,
   feldDrin:!!inp,feldId:inp?inp.id:null,feldVersteckt:inp?inp.hidden:null,
   capture:inp?inp.getAttribute("capture"):null,
   accept:inp?inp.getAttribute("accept"):null};
 });
 p(!!knopf,"der Foto-Knopf ist da",knopf);
 p(!!knopf&&knopf.hoehe>=44,"er ist mindestens 44 px hoch (Baustelle, Handschuhe)",knopf&&knopf.hoehe);
 p(!!knopf&&knopf.breite>300,"und ueber die volle Breite",knopf&&knopf.breite);
 p(!!knopf&&/foto/i.test(knopf.text)&&!/choose file|no file/i.test(knopf.text),
   "er ist deutsch beschriftet, nicht das nackte Browser-Feld",knopf&&knopf.text);
 p(!!knopf&&knopf.transform==="none",
   "kein GROSSBUCHSTABEN-Text - wie die uebrigen Knoepfe",knopf&&knopf.transform);
 p(!!knopf&&knopf.zeiger==="pointer","der Zeiger zeigt, dass er anklickbar ist",knopf&&knopf.zeiger);
 p(!!knopf&&knopf.feldDrin&&knopf.feldId==="measPhotoInput"&&knopf.feldVersteckt===true,
   "das Dateifeld steckt darin und ist versteckt",knopf);
 p(!!knopf&&knopf.capture==="environment"&&/image/.test(knopf.accept||""),
   "Kamera und Bildfilter bleiben erhalten",knopf);
 // Ein Klick auf den Knopf loest wirklich das Dateifeld aus.
 const loest=await page.evaluate(()=>new Promise(res=>{
  // Ohne Knopf sauber "nein" melden statt den Lauf abzubrechen - ein
  // abgebrochener Pruefstand sieht aus wie "keine Fehler".
  const inp=document.getElementById("measPhotoInput");
  const l=inp&&inp.closest("label.cockpit-upload");
  if(!l){res(false);return}
  let ausgeloest=false;
  inp.addEventListener("click",()=>{ausgeloest=true},{once:true});
  l.click();
  setTimeout(()=>res(ausgeloest),120);
 }));
 p(loest,"ein Klick auf den Knopf oeffnet die Dateiauswahl",loest);
 // Derselbe Knopf im Ausmass - sonst waere die App an einer Stelle neu und
 // an der anderen alt.
 const am=await page.evaluate(()=>{
  const l=document.querySelector("#amMedienBereich label.cockpit-upload");
  if(!l)return null;
  const inp=l.querySelector('input[type=file]');
  return {text:l.innerText.replace(/\s+/g," ").trim(),
    transform:getComputedStyle(l).textTransform,
    feldId:inp?inp.id:null,versteckt:inp?inp.hidden:null,mehrere:inp?inp.multiple:null};
 });
 p(!!am&&am.feldId==="amPhotoInput"&&am.versteckt===true&&am.mehrere===true,
   "Ausmass: derselbe Knopf, Mehrfachauswahl bleibt",am);
 // Kein nacktes Dateifeld mehr sichtbar in der App.
 const nackt=await page.evaluate(()=>Array.from(document.querySelectorAll('input[type=file]'))
   .filter(e=>!e.hidden&&e.offsetParent!==null).map(e=>e.id||"(ohne id)"));
 p(nackt.length===0||nackt.join()==="logoInput",
   "kein nacktes Dateifeld mehr im Massaufnahme-/Ausmass-Formular",nackt);

 // ---- E · Foto und Skizze arbeiten unveraendert --------------------------
 console.log("\nE · Foto und Skizze arbeiten unveraendert");
 const arbeit=await page.evaluate(()=>{
  measPhotos=["data:image/png;base64,AA","data:image/png;base64,AB"];
  renderMeasPhotoGallery();
  const g=document.getElementById("measPhotoGallery");
  return {vorschau:g.querySelectorAll("img.sketch-thumb").length===2,
    entfernen:g.querySelectorAll("[data-remove-photo]").length===2,
    zeichnen:g.querySelectorAll("[data-draw-photo]").length===2,
    skizzeKnopf:!!document.getElementById("addSketch"),
    galerie:!!document.getElementById("measSketchGallery")};
 });
 p(arbeit.vorschau&&arbeit.entfernen&&arbeit.zeichnen,
   "jedes Foto hat Vorschau, Entfernen und 'Auf Foto zeichnen'",arbeit);
 p(arbeit.skizzeKnopf&&arbeit.galerie,"Skizzen-Knopf und Galerie unveraendert",arbeit);
 // Der Speicher-Payload bleibt derselbe.
 const payload=await page.evaluate(()=>{
  measPhotos=["data:image/png;base64,AA"]; measSketches=["data:image/png;base64,AA","data:image/png;base64,AB"];
  $("measType").value="skizze_foto"; showMeasTypeSection("skizze_foto");
  $("measTitle").value="Dach Nord"; $("measDate").value="2026-09-04";
  $("foto_material").value="2";
  const d=buildMeasurementFromForm();
  return {typ:d.type,titel:d.title,material:d.data.material,
    felder:Object.keys(d.data),skizzen:(d.sketch_paths||[]).length,
    foto:!!d.photo_path,fotos:(d.photo_paths||[]).length};
 });
 p(payload.typ==="skizze_foto"&&payload.material==="2",
   "Speichern liefert unveraendert Typ und Material",payload);
 p(JSON.stringify(payload.felder)===JSON.stringify(["material"]),
   "und weiterhin GENAU das eine Feld material",payload.felder);

 // ---- G · Mehrere Fotos ---------------------------------------------------
 console.log("\nG · mehrere Fotos je Massaufnahme");
 await zeige(page,"skizze_foto");
 const mehr=await page.evaluate(()=>{
  measPhotos=["data:image/png;base64,AA","data:image/png;base64,AB","data:image/png;base64,AC"];
  measSketches=[]; renderMeasPhotoGallery();
  const g=document.getElementById("measPhotoGallery");
  return {kacheln:g.querySelectorAll(".sketch-thumb-wrap").length,
    zeichnen:g.querySelectorAll("[data-draw-photo]").length,
    entfernen:g.querySelectorAll("[data-remove-photo]").length,
    status:document.getElementById("fotoStatus").innerText,
    mehrfach:document.getElementById("measPhotoInput").multiple};
 });
 p(mehr.kacheln===3,"drei Fotos, drei Kacheln",mehr);
 p(mehr.zeichnen===3&&mehr.entfernen===3,"jedes Foto hat seine beiden Knoepfe",mehr);
 p(/3 Fotos/.test(mehr.status),"die Statuszeile zaehlt sie",mehr.status);
 p(mehr.mehrfach===true,"das Dateifeld erlaubt Mehrfachauswahl",mehr.mehrfach);
 // Genau das mittlere entfernen - nicht irgendeines.
 const weg=await page.evaluate(()=>{
  document.querySelectorAll("[data-remove-photo]")[1].click();
  return {rest:measPhotos.slice(),status:document.getElementById("fotoStatus").innerText};
 });
 p(weg.rest.length===2&&weg.rest[0].endsWith("AA")&&weg.rest[1].endsWith("AC"),
   "das mittlere Foto wird entfernt, nicht ein anderes",weg.rest);
 p(/2 Fotos/.test(weg.status),"die Statuszeile folgt sofort",weg.status);
 // Speichern: alle Fotos, photo_path bleibt das erste.
 const pay=await page.evaluate(()=>{
  measPhotos=["data:1","data:2"]; measSketches=[];
  $("measType").value="skizze_foto"; $("measTitle").value="T"; $("measDate").value="2026-09-04";
  const d=buildMeasurementFromForm();
  return {pfad:d.photo_path,liste:d.photo_paths};
 });
 p(Array.isArray(pay.liste)&&pay.liste.length===2,"gespeichert werden alle Fotos",pay);
 p(pay.pfad===pay.liste[0],
   "photo_path traegt weiterhin das erste Foto (aeltere Ansichten bleiben heil)",pay);
 // Eine Aufnahme aus der Zeit vor v2.83 hat nur photo_path.
 const alt=await page.evaluate(()=>{
  measPhotos=(function(m){return (m.photo_paths&&m.photo_paths.length)?[...m.photo_paths]
    :(m.photo_path?[m.photo_path]:[])})({photo_path:"altes/foto.jpg"});
  renderMeasPhotoGallery();
  return {n:measPhotos.length,erstes:measPhotos[0]};
 });
 p(alt.n===1&&alt.erstes==="altes/foto.jpg",
   "eine aeltere Aufnahme oeffnet mit genau ihrem einen Foto",alt);
 // Und die Medienansicht im Cockpit zaehlt mehrere Fotos.
 const cockpit=await page.evaluate(()=>{
  const a1=measMedienPfade({photo_paths:["a","b"],sketch_paths:["s"]});
  const a2=measMedienPfade({photo_path:"alt.jpg"});
  const a3=measMedienPfade({});
  return {neu:a1.fotos.length,text:measMedienText({photo_paths:["a","b"],sketch_paths:["s"]}),
          alt:a2.fotos,leer:a3.fotos.length,hat:measHatMedien({photo_paths:["a"]})};
 });
 p(cockpit.neu===2&&/2 Fotos/.test(cockpit.text),"Cockpit: mehrere Fotos gezaehlt",cockpit);
 p(cockpit.alt.length===1&&cockpit.alt[0]==="alt.jpg","Cockpit: aeltere Aufnahme unveraendert",cockpit);
 p(cockpit.leer===0&&cockpit.hat===true,"Cockpit: leer bleibt leer",cockpit);
 await page.evaluate(()=>{measPhotos=[];measSketches=[];renderMeasPhotoGallery()});

 // ---- F · Breiten ---------------------------------------------------------
 console.log("\nF · passt auf jedes Geraet");
 for(const breite of [320,360,412,768,1280]){
  await page.setViewportSize({width:breite,height:1400});
  await zeige(page,"skizze_foto");
  const ueber=await page.evaluate(()=>{
   const wurzel=document.getElementById("measurementEditModal");
   const br=document.documentElement.clientWidth;
   let n=0;
   wurzel.querySelectorAll("*").forEach(e=>{
    let par=e.parentElement,scroll=false;
    while(par){const o=getComputedStyle(par).overflowX;if(o==="auto"||o==="scroll"){scroll=true;break}par=par.parentElement}
    if(scroll)return;
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>br+1)n++;
   });
   return n;
  });
  p(ueber===0,breite+" px: nichts laeuft seitlich hinaus",ueber);
 }
 await page.setViewportSize({width:412,height:1600});

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log("\npruefstand-skizze-foto: "+ok+"/"+(ok+fail)+
   (fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

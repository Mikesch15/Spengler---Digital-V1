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

 // ---- D · Zwei Wege zum Foto: Kamera ODER Galerie (v3.122) --------------
 // Vorgeschichte, damit sie nicht ein drittes Mal im Kreis laeuft:
 //  v2.82  ein Knopf mit capture="environment" -> zwang mobile Browser
 //         direkt in die Kamera-App, die Galerie war nicht erreichbar.
 //  v3.35  capture entfernt -> der Browser SOLLTE nun beides anbieten. Auf
 //         einem Teil der Geraete (und in der installierten PWA) fuehrt
 //         derselbe Knopf aber stumm in die Galerie, ohne die Kamera auch
 //         nur zu nennen. Dieselbe Geraeteabhaengigkeit kostete beim
 //         Barcode-Scan die Versionsreihe v3.107-v3.115.
 //  v3.122 gar keine Geraetewahl mehr: ZWEI beschriftete Knoepfe, je ein
 //         eigenes Feld. Der eine traegt capture, der andere nicht. Damit
 //         ist beides erreichbar, egal was das Geraet von sich aus anbietet.
 console.log("\nD · Foto aufnehmen ODER aus der Galerie waehlen");
 const quellen=await page.evaluate(()=>{
  const lies=bereich=>{
   const box=document.querySelector(bereich+" .foto-quellen");
   if(!box)return null;
   return Array.from(box.querySelectorAll("label")).map(l=>{
    const inp=l.querySelector('input[type=file]')
      ||(l.getAttribute("for")?document.getElementById(l.getAttribute("for")):null);
    const s=getComputedStyle(l), r=l.getBoundingClientRect();
    return {text:l.innerText.replace(/\s+/g," ").trim(),
     hoehe:Math.round(r.height),transform:s.textTransform,zeiger:s.cursor,
     feldId:inp?inp.id:null,versteckt:inp?inp.hidden:null,
     capture:inp?inp.getAttribute("capture"):null,
     accept:inp?inp.getAttribute("accept"):null,
     mehrere:inp?inp.multiple:null};
   });
  };
  return {meas:lies("#measMedienBereich"),am:lies("#amMedienBereich"),
          ang:lies("#angMedienBereich"),rapport:lies("#reportFotoBereich")};
 });
 const bereiche=[["Massaufnahme",quellen.meas,"measPhotoInput"],
                 ["Ausmass",quellen.am,"amPhotoInput"],
                 ["Offerte",quellen.ang,"angPhotoInput"],
                 ["Regierapport",quellen.rapport,"reportPhotoInput"]];
 bereiche.forEach(([name,liste,feldId])=>{
  p(!!liste&&liste.length===2,name+": zwei Knoepfe statt einem",liste);
  if(!liste||liste.length!==2)return;
  const kamera=liste.find(x=>x.feldId===feldId+"Kamera");
  const galerie=liste.find(x=>x.feldId===feldId);
  p(!!kamera&&kamera.capture==="environment"&&/image/.test(kamera.accept||""),
    name+": der Kamera-Knopf traegt capture=environment und oeffnet damit die Kamera-App",kamera);
  p(!!kamera&&/aufnehmen/i.test(kamera.text),
    name+": er sagt auch, dass er ein Foto AUFNIMMT",kamera&&kamera.text);
  p(!!galerie&&galerie.capture===null&&galerie.mehrere===true,
    name+": der Galerie-Knopf traegt KEIN capture und erlaubt weiterhin mehrere Fotos",galerie);
  p(!!galerie&&/galerie/i.test(galerie.text),
    name+": und er sagt, dass er in die Galerie fuehrt",galerie&&galerie.text);
  p(liste.every(x=>x.versteckt===true),
    name+": beide Dateifelder bleiben versteckt - sichtbar sind nur die Knoepfe",liste);
  // Hoehe nur dort, wo der Bereich gerade wirklich auf dem Bildschirm ist -
  // ein Knopf in einem versteckten Bildschirm meldet 0 und wuerde sonst
  // einen Fehler vortaeuschen. Die Massaufnahme ist hier sichtbar, sie
  // traegt die Messung stellvertretend fuer alle vier (gleiche Klassen).
  p(liste.every(x=>x.hoehe===0||x.hoehe>=44),
    name+": kein Knopf ist zu flach zum Treffen (Baustelle, Handschuhe)",liste.map(x=>x.hoehe));
  p(liste.every(x=>x.transform==="none"&&x.zeiger==="pointer"),
    name+": beide sehen aus und verhalten sich wie jeder andere Knopf",liste);
 });

 p(!!quellen.meas&&quellen.meas.length===2&&quellen.meas.every(x=>x.hoehe>=44),
   "auf dem sichtbaren Bildschirm sind beide Knoepfe tatsaechlich mindestens 44 px hoch",
   quellen.meas&&quellen.meas.map(x=>x.hoehe));

 // Ein Klick auf JEDEN der beiden Knoepfe loest auch wirklich SEIN Feld aus.
 const loest=await page.evaluate(()=>new Promise(res=>{
  const treffer={};
  const pruefe=(id)=>{
   const inp=document.getElementById(id);
   const l=inp&&(inp.closest("label.cockpit-upload")
     ||document.querySelector('label[for="'+id+'"]'));
   if(!l){treffer[id]=false;return}
   treffer[id]=false;
   inp.addEventListener("click",()=>{treffer[id]=true},{once:true});
   l.click();
  };
  pruefe("measPhotoInput"); pruefe("measPhotoInputKamera");
  setTimeout(()=>res(treffer),150);
 }));
 p(loest.measPhotoInput===true&&loest.measPhotoInputKamera===true,
   "beide Knoepfe oeffnen die zu IHNEN gehoerende Auswahl",loest);

 // Und beide landen im selben Handler - sonst waere der Kamera-Knopf eine
 // huebsche Attrappe. Geprueft mit einer echten Bilddatei ueber DataTransfer.
 const uebernommen=await page.evaluate(async()=>{
  const bild=async()=>{
   const c=document.createElement("canvas"); c.width=4; c.height=4;
   c.getContext("2d").fillRect(0,0,4,4);
   const b=await new Promise(r=>c.toBlob(r,"image/png"));
   return new File([b],"probe.png",{type:"image/png"});
  };
  const schick=async id=>{
   const dt=new DataTransfer(); dt.items.add(await bild());
   const f=document.getElementById(id);
   f.files=dt.files;
   f.dispatchEvent(new Event("change",{bubbles:true}));
   await new Promise(r=>setTimeout(r,400));
  };
  measPhotos=[];
  await schick("measPhotoInputKamera");
  const nachKamera=measPhotos.length;
  await schick("measPhotoInput");
  return {nachKamera,nachGalerie:measPhotos.length,
    feldGeleert:document.getElementById("measPhotoInputKamera").value===""};
 });
 p(uebernommen.nachKamera===1,
   "ein ueber den Kamera-Knopf gewaehltes Foto wird uebernommen - beide Felder teilen sich EINEN Handler",uebernommen);
 p(uebernommen.nachGalerie===2,
   "und der Galerie-Knopf arbeitet unveraendert weiter",uebernommen);
 p(uebernommen.feldGeleert===true,
   "das benutzte Feld wird geleert, damit dieselbe Datei erneut gewaehlt werden kann",uebernommen);
 p(await page.evaluate(()=>typeof fotoFelderVerdrahten==="function"&&typeof fotoFelderLeeren==="function"),
   "die Verdrahtung liegt an EINER zentralen Stelle (js/01-basis.js), nicht viermal kopiert");

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

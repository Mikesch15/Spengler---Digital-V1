// Prueft die vier PDF-Ergaenzungen aus v3.04:
//   A  Materialliste  (Kategorie 7, bis v3.03 dauerhaft ausgegraut)
//   B  Kontrolle      (Kategorie 8, bis v3.03 nur die Notiz)
//   C  Fotos im Ausmass-PDF   (bis v3.03 nie gedruckt, CLAUDE.md 61.11)
//   D  Fotos im Regierapport  (neu, vom Betrieb ausdruecklich freigegeben)
//
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-pdf-v3-04.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},storage:{from:()=>({createSignedUrl:async(pfad)=>({data:{signedUrl:'https://test.example/'+pfad},error:null})})},from:()=>{const q={};['select','eq','order','limit','update','insert','delete','maybeSingle','single'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};"}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12, 3011 Bern",
                order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  companyName="Peter Künzi AG"; companyAddress="Industriestrasse 8, 3006 Bern"; logoUrl=null;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  // Das Druckfenster abfangen: statt zu drucken wird der erzeugte HTML-Text
  // gesammelt, damit er geprueft werden kann.
  window.__druck=[];
  window.open=()=>({document:{write:h=>{window.__druck.push(h)},close(){}},focus(){},print(){},close(){}});
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const druck=async fn=>{
  await page.evaluate(()=>{window.__druck=[]});
  await page.evaluate(fn);
  await page.waitForTimeout(400);
  const h=await page.evaluate(()=>window.__druck.join("\n"));
  return h;
 };
 // Abschnitte eines gedruckten Dokuments: Ueberschrift -> Text danach
 const abschnitte=h=>{
  const teile=String(h).split(/<div class="(?:eb|am)-section-head">/).slice(1);
  return teile.map(t=>{
   const i=t.indexOf("</div>");
   return {titel:t.slice(0,i).replace(/<[^>]*>/g,"").trim(),rumpf:t.slice(i+6)};
  });
 };

 // ==========================================================================
 // A · Materialliste (Kategorie 7)
 // ==========================================================================
 console.log("\nA · Materialliste im PDF jeder Massaufnahme");
 const MESS={id:11,type:"kehle",title:"Kehle Nord",date:"2026-09-05",project_id:7,
   note:"Bitte vor Ort nachmessen",
   created_by:"u1",created_at:"2026-09-05T08:00:00Z",updated_by:"u1",updated_at:"2026-09-05T09:00:00Z",
   photo_paths:[],sketch_paths:[],
   data:{material:2,flaeche_m2:2.8,abwicklung:500,
     firstgehrung:true,nh:42.5,nl:23.5,gl:100,
     segmente:[{laenge:2000,ueberlappung:70,rolle:""},{laenge:1453,ueberlappung:0,rolle:""}],
     zuschnittSumme:3523,
     ausmass:[{bezeichnung:"Kehlblech Länge",menge:"3.52",einheit:"m"},
              {bezeichnung:"Blechfläche Zuschnitt",menge:"2.80",einheit:"m²"},
              {bezeichnung:"Anzahl Segmente",menge:"2",einheit:"Stk."}],
     kontrolle:[{art:"hinweis",text:"Summe der Segmente weicht von der Kehllänge A ab."},
                {art:"fehler",text:"Kein Material gewählt."}]}};
 await page.evaluate(m=>{window.__MESS=m},MESS);
 const h1=await druck(()=>printMeasurement(JSON.parse(JSON.stringify(window.__MESS)),{listen:"alle"}));
 const a1=abschnitte(h1);
 const mat=a1.find(x=>x.titel==="Materialliste");
 p(!!mat,"das PDF hat einen eigenen Abschnitt \"Materialliste\"",a1.map(x=>x.titel));
 p(!!mat&&mat.rumpf.indexOf("Titanzink")>=0,"die Materialsorte steht darin");
 p(!!mat&&mat.rumpf.indexOf("2,80")>=0,"die Blechfläche steht darin (2,80 m²)");
 p(!!mat&&mat.rumpf.indexOf("500")>=0,"die Abwicklung als Streifenbreite steht darin");
 p(!!mat&&mat.rumpf.indexOf("Anzahl Segmente")>=0,"eine Ausmass-Zeile mit Stückzahl steht darin");
 p(!!mat&&mat.rumpf.indexOf("Kehlblech Länge")<0,
   "eine reine Längenangabe steht NICHT in der Materialliste (die gehört ins Ausmass)");
 p(!!mat&&mat.rumpf.indexOf("Fr.")<0&&!/\bPreis\b/.test(mat.rumpf)&&!/Artikel-?Nr/i.test(mat.rumpf),
   "die Materialliste enthält keine Preise und keine Artikelnummern");
 // Ohne Material und ohne Ausmass darf KEIN leerer Abschnitt entstehen
 const hLeer=await druck(()=>printMeasurement({id:12,type:"skizze_foto",title:"Nur Foto",
   project_id:7,data:{},photo_paths:[],sketch_paths:[]},{listen:"alle"}));
 p(abschnitte(hLeer).every(x=>x.titel!=="Materialliste"),
   "ohne Material und ohne Ausmass entsteht KEIN leerer Materiallisten-Abschnitt");

 // ==========================================================================
 // B · Kontrolle (Kategorie 8)
 // ==========================================================================
 console.log("\nB · Kontrollstand im PDF");
 const kon=a1.find(x=>x.titel==="Kontrolle");
 p(!!kon,"das PDF hat einen eigenen Abschnitt \"Kontrolle\"",a1.map(x=>x.titel));
 p(!!kon&&kon.rumpf.indexOf("Kein Material gewählt")>=0,"ein Fehler steht darin");
 p(!!kon&&kon.rumpf.indexOf("weicht von der Kehllänge")>=0,"ein Hinweis steht darin");
 p(!!kon&&kon.rumpf.indexOf("Fehler")>=0&&kon.rumpf.indexOf("Hinweis")>=0,
   "Fehler und Hinweis sind als solche gekennzeichnet");
 // Die Notiz darf NICHT doppelt erscheinen - die Modulzweige drucken sie schon
 const notizAnzahl=a1.filter(x=>x.titel==="Notiz").length;
 p(notizAnzahl===1,"die Notiz erscheint genau einmal, nicht doppelt",{notizAnzahl});
 p(!!kon&&kon.rumpf.indexOf("Bitte vor Ort nachmessen")<0,
   "der Kontroll-Abschnitt wiederholt die Notiz nicht");
 // Ohne gespeicherten Kontrollstand kein Abschnitt
 const hOhneK=await druck(()=>{const m=JSON.parse(JSON.stringify(window.__MESS));
   delete m.data.kontrolle; return printMeasurement(m,{listen:"alle"})});
 p(abschnitte(hOhneK).every(x=>x.titel!=="Kontrolle"),
   "ohne gespeicherten Kontrollstand entsteht KEINE leere Kontroll-Tabelle");
 // Es wird NICHT neu gerechnet: ein erfundener Kontrolltext muss unverändert
 // durchkommen, auch wenn er fachlich gar nicht mehr zuträfe.
 const hAlt=await druck(()=>{const m=JSON.parse(JSON.stringify(window.__MESS));
   m.data.kontrolle=[{art:"hinweis",text:"STAND-VOM-SPEICHERN-XYZ"}];
   return printMeasurement(m,{listen:"alle"})});
 p(hAlt.indexOf("STAND-VOM-SPEICHERN-XYZ")>=0,
   "der Kontrollstand wird aus dem Datensatz gedruckt und nicht neu gerechnet");

 // Beide Kategorien sind im Auswahldialog jetzt vorhanden statt ausgegraut
 const kat=await page.evaluate(h=>{
   const z=pdfAbschnitteZerlegen(h,"eb-section-head");
   const keys={}; Array.from(pdfVerfuegbareListen(z)).forEach(k=>{keys[k]=true});
   return keys;
 },h1);
 p(kat.material===true,"die Kategorie \"Materialliste\" ist im Dialog vorhanden");
 p(kat.kontrolle===true,"die Kategorie \"Kontrolle / Hinweise\" ist im Dialog vorhanden");
 // Und die Auswahl wirkt: nur Materialliste gewählt -> Kontrolle fehlt
 const hNurMat=await druck(()=>printMeasurement(JSON.parse(JSON.stringify(window.__MESS)),
   {listen:["material"]}));
 const aNurMat=abschnitte(hNurMat);
 p(aNurMat.some(x=>x.titel==="Materialliste"),"Auswahl \"nur Materialliste\": sie ist drin");
 p(!aNurMat.some(x=>x.titel==="Kontrolle"),"Auswahl \"nur Materialliste\": die Kontrolle fehlt");

 // ==========================================================================
 // C · Fotos im Ausmass-PDF
 // ==========================================================================
 console.log("\nC · Fotos im Ausmass-PDF");
 await page.evaluate(()=>{window.__AM={id:5,type:"offerte_erfassen",title:"Offerte Nord",
   date:"2026-09-05",project_id:7,note:"Notiz zum Ausmass",
   created_by:"u1",created_at:"2026-09-05T08:00:00Z",
   photo_paths:["ausmass-photo/a.jpg","ausmass-photo/b.jpg"],
   positions:[{pos:"1",description:"Dachrinne",quantity:"12",unit:"m"}]}});
 const hAm=await druck(()=>printAusmass(JSON.parse(JSON.stringify(window.__AM)),{listen:"alle"}));
 const aAm=abschnitte(hAm);
 const fotos=aAm.filter(x=>/^Foto/.test(x.titel));
 p(fotos.length===2,"beide Ausmass-Fotos werden gedruckt",{titel:aAm.map(x=>x.titel)});
 p(fotos.length===2&&fotos[0].titel==="Foto 1 von 2"&&fotos[1].titel==="Foto 2 von 2",
   "die Fotos sind durchnummeriert",fotos.map(x=>x.titel));
 p(hAm.indexOf("https://test.example/ausmass-photo/a.jpg")>=0,
   "das Foto wird über eine signierte URL geladen (privater Bucket)");
 p(hAm.indexOf("getPublicUrl")<0,"es wird keine öffentliche URL erzeugt");
 // Ein Ausmass ohne Fotos druckt unveraendert ohne Foto-Abschnitt
 const hAmOhne=await druck(()=>{const a=JSON.parse(JSON.stringify(window.__AM));
   a.photo_paths=[]; delete a.photo_path; return printAusmass(a,{listen:"alle"})});
 p(abschnitte(hAmOhne).every(x=>!/^Foto/.test(x.titel)),
   "ein Ausmass ohne Fotos druckt unverändert ohne Foto-Abschnitt");
 // Aelteres Ausmass mit nur photo_path: genau dieses eine Foto
 const hAmAlt=await druck(()=>{const a=JSON.parse(JSON.stringify(window.__AM));
   delete a.photo_paths; a.photo_path="ausmass-photo/alt.jpg";
   return printAusmass(a,{listen:"alle"})});
 const fAlt=abschnitte(hAmAlt).filter(x=>/^Foto/.test(x.titel));
 p(fAlt.length===1&&fAlt[0].titel==="Foto","ein älteres Ausmass druckt genau sein eines Foto",
   fAlt.map(x=>x.titel));
 p(hAmAlt.indexOf("ausmass-photo/alt.jpg")>=0,"und zwar genau das gespeicherte");
 // Die Auswahl wirkt auch hier
 const hAmOhneF=await druck(()=>printAusmass(JSON.parse(JSON.stringify(window.__AM)),
   {listen:["positionen","masse","stueckliste"]}));
 p(abschnitte(hAmOhneF).every(x=>!/^Foto/.test(x.titel)),
   "wird \"Fotos\" abgewählt, druckt das Ausmass keine");

 // ==========================================================================
 // D · Fotos im Regierapport
 // ==========================================================================
 console.log("\nD · Fotos im Regierapport");
 const rap=await page.evaluate(()=>({
   bereich:!!$("reportFotoBereich"), galerie:!!$("reportFotoGalerie"),
   eingabe:!!$("reportPhotoInput"), status:!!$("reportFotoStatus"),
   knopf:!!document.querySelector('label[for="reportPhotoInput"]'),
   inScreen:!!($("reportFotoBereich")&&$("reportScreen")&&$("reportScreen").contains($("reportFotoBereich"))),
   variable:typeof reportPhotos!=="undefined"&&Array.isArray(reportPhotos),
   render:typeof renderReportFotos==="function"}));
 p(rap.bereich&&rap.galerie&&rap.eingabe&&rap.status,"der Rapport hat einen Foto-Bereich",rap);
 p(rap.inScreen,"er liegt im Regierapport-Bildschirm");
 p(rap.variable&&rap.render,"reportPhotos und renderReportFotos sind vorhanden");
 p(rap.knopf,"es gibt einen beschrifteten Knopf statt eines nackten Dateifelds");
 // Zwei Fotos setzen und die Galerie messen
 const gal=await page.evaluate(()=>{
   reportPhotos=["data:image/png;base64,iVBORw0KGgo=","reports/7/9/photo/x.jpg"];
   renderReportFotos();
   return {kacheln:$("reportFotoGalerie").querySelectorAll(".sketch-thumb-wrap").length,
     weg:$("reportFotoGalerie").querySelectorAll("[data-report-foto-weg]").length,
     status:$("reportFotoStatus").textContent};});
 p(gal.kacheln===2,"zwei Fotos ergeben zwei Kacheln",gal);
 p(gal.weg===2,"jede Kachel hat einen eigenen Entfernen-Knopf",gal);
 p(/2 Fotos/.test(gal.status),"die Statuszeile nennt die Anzahl",gal.status);
 const gal1=await page.evaluate(()=>{
   const b=$("reportFotoGalerie").querySelector("[data-report-foto-weg='0']");
   if(b)b.click();
   return {n:reportPhotos.length,rest:reportPhotos[0],
     kacheln:$("reportFotoGalerie").querySelectorAll(".sketch-thumb-wrap").length};});
 p(gal1.n===1&&gal1.rest==="reports/7/9/photo/x.jpg","ein Foto lässt sich einzeln entfernen",gal1);
 p(gal1.kacheln===1,"die Galerie zeichnet danach nur noch eine Kachel",gal1);
 const gal0=await page.evaluate(()=>{reportPhotos=[];renderReportFotos();
   return $("reportFotoStatus").textContent;});
 p(/[Kk]ein/.test(gal0),"ohne Foto sagt die Statuszeile das ehrlich",gal0);
 // Im Druck sichtbar, die Werkzeugleiste nicht
 const sicht=await page.evaluate(async()=>{
   reportPhotos=["data:image/png;base64,iVBORw0KGgo="]; renderReportFotos();
   $("reportScreen").hidden=false; $("startScreen").hidden=true;
   const bild=$("reportFotoGalerie").querySelector("img");
   const eing=$("reportFotoInput");
   const knopf=$("reportFotoBereich").querySelector("label");
   const s=e=>e?getComputedStyle(e).display:"weg";
   return {bild:s(bild),eingabe:s(eing),knopf:s(knopf),
     galerieDisplay:s($("reportFotoGalerie"))};});
 await page.emulateMedia({media:"print"});
 const sichtDruck=await page.evaluate(()=>{
   const bild=$("reportFotoGalerie").querySelector("img");
   const wrap=$("reportFotoGalerie").querySelector(".sketch-thumb-wrap");
   const knopf=document.querySelector('label[for="reportPhotoInput"]');
   // Gerendert oder nicht - ein Element in einem versteckten Vorfahren hat
   // weiterhin display:block, ist aber nicht auf dem Blatt.
   const da=e=>!!(e&&e.getClientRects().length);
   const cs=e=>e?getComputedStyle(e):null;
   const w=cs(wrap),bi=cs(bild);
   return {bild:da(bild),knopf:da(knopf),
     wrapBreite:w?w.width:"", wrapHoehe:w?w.height:"",
     maxBreite:bi?bi.maxWidth:"", maxHoehe:bi?bi.maxHeight:""};});
 await page.emulateMedia({media:"screen"});
 p(sichtDruck.bild,"das Foto ist im Ausdruck sichtbar",sichtDruck);
 p(!sichtDruck.knopf,"der Hinzufügen-Knopf ist im Ausdruck ausgeblendet",sichtDruck);
 p(sichtDruck.wrapBreite!=="84px"&&sichtDruck.wrapHoehe!=="118px",
   "der Rahmen ist im Ausdruck nicht mehr auf 84x118 px festgenagelt",sichtDruck);
 p(/mm$/.test(sichtDruck.maxBreite)||parseFloat(sichtDruck.maxBreite)>200,
   "das Bild darf im Ausdruck bis zur Blattbreite wachsen",sichtDruck);
 // Ein Rapport OHNE Fotos darf im Ausdruck gar nichts hinterlassen
 await page.evaluate(()=>{reportPhotos=[];renderReportFotos()});
 await page.emulateMedia({media:"print"});
 const leerDruck=await page.evaluate(()=>{
   const box=$("reportFotoBereich");
   const r=box.getBoundingClientRect();
   return {display:getComputedStyle(box).display,hoehe:Math.round(r.height),
     text:box.innerText.replace(/\s+/g," ").trim()};});
 await page.emulateMedia({media:"screen"});
 p(leerDruck.display==="none"||leerDruck.hoehe===0,
   "ein Rapport ohne Fotos hinterlässt im Ausdruck keine Fläche",leerDruck);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();

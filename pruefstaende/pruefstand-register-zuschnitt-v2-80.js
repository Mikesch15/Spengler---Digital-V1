// Prueft, dass die fuenf umgebauten Massaufnahme-Arten dieselben Register in
// derselben Reihenfolge haben und dass ihre Zuschnitt-Optimierung ueberall
// gleich aussieht - mit der Streifenbreite als erster Kennzahl.
//
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-register-zuschnitt-v2-80.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

// Die fuenf Arten. "zu" ist die Nummer des Zuschnitt-Registers, "kontrolle"
// die des letzten - beide werden unten gegen die Register selbst geprueft und
// nicht nur behauptet.
const ARTEN=[
 {typ:"rinne_halbrund",       name:"Rinne Halbrund",       wurzel:"rinneAufnahme",
  setz:"raSetzeSchritt", reg:"RA_REGISTER",   art:"stange"},
 {typ:"einlaufblech_gerade",  name:"Einlaufblech gerade",  wurzel:"einlaufblechAufnahme",
  setz:"ebaSetzeSchritt",reg:"EBA_REGISTER",  art:"rolle"},
 {typ:"einlaufblech_konisch", name:"Einlaufblech konisch", wurzel:"einlaufblechKonischAufnahme",
  setz:"ebkaSetzeSchritt",reg:"EBKA_REGISTER",art:"rolle"},
 {typ:"freies_profil",        name:"Freies Profil",        wurzel:"freiesProfilAufnahme",
  setz:"fpaSetzeSchritt",reg:"FPA_REGISTER",  art:"rolle"},
 {typ:"mauerabdeckung",       name:"Mauerabdeckung",       wurzel:"mauerabdeckungAufnahme",
  setz:"madaSetzeSchritt",reg:"MADA_REGISTER",art:"rolle"},
 {typ:"kehle",                name:"Kehle",                wurzel:"kehleAufnahme"
  ,setz:"keaSetzeSchritt", reg:"KEA_REGISTER",  art:"rolle"},
 {typ:"kamineinfassung",     name:"Kamineinfassung",     wurzel:"kaminAufnahme",
  setz:"kamaSetzeSchritt",reg:"KAM_REGISTER", art:"rolle"},
 {typ:"einfassung_rund",     name:"Einfassung Rund",     wurzel:"einfassungAufnahme",
  setz:"einfaSetzeSchritt",reg:"EINFA_REGISTER",art:"rolle"}
];

const zeige=async(page,typ)=>{
 await page.evaluate(t=>{$("measType").value=t;showMeasTypeSection(t)},typ);
 await page.waitForTimeout(150);
};
const reg=async(page,a,n)=>{
 await page.evaluate(([f,k])=>new Function("n","return "+f+"(n)")(k),[a.setz,n]);
 await page.waitForTimeout(150);
};
const txt=(page,a)=>page.evaluate(w=>{const e=$(w);return e?e.innerText:""},a.wurzel);
const html=(page,a)=>page.evaluate(w=>{const e=$(w);return e?e.innerHTML:""},a.wurzel);
// Seit v2.85 ist die Hauptansicht die Liste STUECKZAHL x LAENGE x ABWICKLUNG;
// alles Technische steht darunter in <details>. Fuer die Pruefungen der
// Einzelheiten wird aufgeklappt - der Inhalt muss vorhanden und erreichbar
// sein, er soll nur nicht die Hauptansicht ueberladen.
const auf=async(page,a)=>{
 await page.evaluate(w=>{const e=$(w);if(!e)return;
  e.querySelectorAll("details.zu-details").forEach(d=>d.open=true)},a.wurzel);
 await page.waitForTimeout(60);
};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1600}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};"}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[];
  measurementMaterials=[
   {id:1,name:"Aluminium (Aluman)",legacy_key:"aluminium",max_abstand_mm:4000,ab_fixpunkt_mm:2000},
   {id:2,name:"Titanzink",legacy_key:"titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500},
   {id:3,name:"Kupfer",legacy_key:"kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
   {id:6,name:"Stahl, verzinkt",legacy_key:"stahl_verzinkt",max_abstand_mm:8000,ab_fixpunkt_mm:4000}];
  blechRollenbreiten=[];
  madBodenMass=0; madSchieberMass=10;
  rinneDilaMass=-165;
  rinneNormlaengen={"6|200":[6000],"6|250":[6000],"6|330":[6000]};
  rinneFittingTypes=[
   {id:1,symbol:"AE90",name:"Aussenecke 90°",angle_deg:-90,is_fixpunkt:true,is_schiebestutzen:false},
   {id:2,symbol:"IE90",name:"Innenecke 90°",angle_deg:90,is_fixpunkt:true,is_schiebestutzen:false},
   {id:3,symbol:"ABL",name:"Einhängestutzen",angle_deg:0,is_fixpunkt:true,is_schiebestutzen:false},
   {id:4,symbol:"SS",name:"Schiebestutzen",angle_deg:0,is_fixpunkt:false,is_schiebestutzen:true},
   {id:5,symbol:"BD",name:"Rinnenboden",angle_deg:0,is_fixpunkt:false,is_schiebestutzen:false}];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){
  console.log("\n=== "+ok+" von "+(ok+fail)+" bestanden (Abbruch) ===");
  await b.close(); process.exit(1);
 }
 // Ohne die gemeinsame Darstellung ist der Rest sinnlos - sauber abbrechen,
 // statt in Folgefehler zu laufen.
 if(await page.evaluate(()=>typeof zuschnittHtml!=="function")){
  p(false,"js/33-zuschnitt.js ist geladen");
  console.log("\n=== "+ok+" von "+(ok+fail)+" bestanden (Abbruch) ===");
  await b.close(); process.exit(1);
 }
 p(true,"js/33-zuschnitt.js ist geladen");

 // ---- A · Register: gleiche Namen, gleiche Reihenfolge -------------------
 console.log("\nA · Register in allen fuenf Arten gleich benannt und geordnet");
 const listen={};
 for(const a of ARTEN){
  // Die Registerlisten sind const auf Skriptebene und stehen deshalb NICHT
  // an window - ueber new Function ist die globale Lexikalumgebung erreichbar.
  listen[a.typ]=await page.evaluate(r=>new Function("return "+r)().map(x=>x.kurz),a.reg);
 }
 // Der gemeinsame Abschluss: ... -> Zuschnitt -> Ausmass -> Kontrolle.
 const SCHWANZ=["Zuschnitt","Ausmass","Kontrolle"];
 ARTEN.forEach(a=>{
  const L=listen[a.typ];
  p(JSON.stringify(L.slice(-3))===JSON.stringify(SCHWANZ),
    a.name+": die letzten drei Register sind Zuschnitt · Ausmass · Kontrolle",L);
  p(L[0]==="Grunddaten",a.name+": das erste Register heisst Grunddaten",L);
  p(L.indexOf("Kontrolle")===L.length-1,a.name+": die Kontrolle ist das letzte Register",L);
  p(L.filter(x=>x==="Zuschnitt").length===1,a.name+": genau ein Register heisst Zuschnitt",L);
  p(L.filter(x=>x==="Ausmass").length===1,a.name+": genau ein Register heisst Ausmass",L);
 });
 // Keine Art darf ein Register "Fotos & Speichern" haben - dorthin fuehrt in
 // allen Arten der letzte Weiter-Knopf.
 ARTEN.forEach(a=>p(!listen[a.typ].some(x=>/Foto/i.test(x)),
   a.name+": kein eigenes Register fuer Fotos",listen[a.typ]));

 // ---- B · Registerleiste zeigt genau diese Namen -------------------------
 console.log("\nB · die Registerleiste zeigt genau diese Namen");
 for(const a of ARTEN){
  await zeige(page,a.typ);
  const knoepfe=await page.evaluate(w=>Array.from($(w).querySelectorAll(".ra-register-knopf"))
    .map(b=>b.innerText.replace(/\s+/g," ").trim()),a.wurzel);
  p(knoepfe.length===listen[a.typ].length,
    a.name+": "+listen[a.typ].length+" Registerknoepfe",knoepfe.length);
  // innerText liefert die CSS-Grossschreibung - deshalb ohne Ruecksicht auf
  // Gross-/Kleinschreibung vergleichen.
  const passt=listen[a.typ].every((k,i)=>(knoepfe[i]||"").toLowerCase().indexOf(k.toLowerCase())>=0);
  p(passt,a.name+": die Knoepfe tragen die Registernamen in dieser Reihenfolge",knoepfe);
 }

 // ---- C · Der letzte Weiter-Knopf fuehrt zu Fotos und Speichern ----------
 console.log("\nC · der letzte Knopf heisst ueberall gleich");
 for(const a of ARTEN){
  await zeige(page,a.typ);
  await reg(page,a,listen[a.typ].length);
  const t=await page.evaluate(w=>{
   const b=Array.from($(w).querySelectorAll("button")).filter(x=>/fertig/i.test(x.innerText));
   return b.length?{text:b[0].innerText.replace(/\s+/g," ").trim(),gesperrt:!!b[0].disabled}:null;
  },a.wurzel);
  p(!!t&&/fotos/i.test(t.text)&&/speichern/i.test(t.text),
    a.name+": der letzte Knopf heisst \"Fertig › Fotos und Speichern\"",t);
  p(!!t&&!t.gesperrt,a.name+": dieser Knopf ist bedienbar",t);
 }

 // ---- D · Das Zuschnitt-Register nutzt die gemeinsame Darstellung --------
 console.log("\nD · alle Arten zeichnen den Zuschnitt mit derselben Funktion");
 const quellen=await page.evaluate(()=>({
  ra:String(raZuschnittHtml), eba:String(ebaZuschnittHtml),
  ebka:String(ebkaZuschnittHtml), fpa:String(fpaZuschnittHtml),
  mada:String(madaZuschnittHtml), kea:String(keaKopfInhalt)
 }));
 Object.keys(quellen).forEach(k=>p(quellen[k].indexOf("zuschnittHtml(")>=0,
   k+"ZuschnittHtml() ruft die gemeinsame Darstellung auf",quellen[k].slice(0,90)));
 // Es darf keine zweite Darstellung mehr geben: die alten, eigenen Tabellen-
 // Koepfe duerfen in keinem Modul mehr stehen.
 const alt=await page.evaluate(()=>({
  ra:/Streifen je Tafel|Rollenbreite<\/th>/.test(String(raZuschnittHtml)),
  eba:/Streifen je Tafel|Rollenbreite<\/th>/.test(String(ebaZuschnittHtml)),
  ebka:/Streifen je Tafel|Rollenbreite<\/th>/.test(String(ebkaZuschnittHtml)),
  fpa:/Streifen je Tafel|Rollenbreite<\/th>/.test(String(fpaZuschnittHtml)),
  mada:/Streifen je Tafel|Rollenbreite<\/th>/.test(String(madaZuschnittHtml)),
  kea:/Streifen je Tafel|Rollenbreite<\/th>/.test(String(keaKopfInhalt))
 }));
 Object.keys(alt).forEach(k=>p(alt[k]===false,k+": keine eigene Zuschnitt-Tabelle mehr",alt));

 // ---- E · Echte Daten: der Zuschnitt sieht ueberall gleich aus ----------
 console.log("\nE · mit echten Daten: gleicher Aufbau, Streifenbreite zuerst");
 // Jede Art bekommt eine Aufnahme, die tatsaechlich etwas zuzuschneiden hat.
 await page.evaluate(()=>{
  // Rinne: 18 m in drei Abschnitten, Kupfer 250
  rinneA=raLeer();
  rinneA.material="6"; rinneA.groesse="250";
  rinneA.segmente=[{laenge:6000,winkel:0,stutzen:null},{laenge:6000,winkel:0,stutzen:null},
                   {laenge:6000,winkel:0,stutzen:null}];
  // Einlaufblech gerade
  ebA=ebaLeer(); ebA.material="2"; ebA.abwicklung=250; ebA.massA=120; ebA.winkel=30;
  ebA.stuecke=[{laenge:3000},{laenge:2000},{laenge:2500}];
  // Einlaufblech konisch
  ebkA=ebkaLeer(); ebkA.material="2"; ebkA.abwicklung=250; ebkA.dachneigung=30;
  ebkA.stuecke=[{laenge:3000,massLinks:120,massRechts:150},{laenge:2000,massLinks:150,massRechts:180}];
  // Freies Profil
  fpA=fpaLeer(); fpA.material="2";
  fpA.schenkel=[{laenge:50,winkel:0},{laenge:200,winkel:-90},{laenge:50,winkel:-90}];
  fpA.segmente=[{laenge:3000,massen:[]},{laenge:2000,massen:[]}];
  // Mauerabdeckung
  madA=madaLeer(); madA.material="2";
  madA.segmente=[{laenge:8000,winkel:90,bodenLinks:true,bodenRechts:false},
                 {laenge:4000,winkel:0,bodenLinks:false,bodenRechts:true}];
  madA.schieberManuell=false; madaSchieberNeu();
  // Kehle
  kehleA=keaLeer(); kehleA.material="2"; kehleA.abwicklung=500;
  kehleA.nh="42.5"; kehleA.nl="23.5"; kehleA.gl="5000";
  kehleA.segmente=[{laenge:2000,ueberlappung:70},{laenge:2000,ueberlappung:70},
                   {laenge:1453,ueberlappung:0}];
  // Kamineinfassung
  kamA=kamaLeer(); kamA.material="2"; kamA.lattenabstand=330;
  kamA.a=300; kamA.d=250; kamA.e=60; kamA.keil=80;
  kamA.winkelVorne=25; kamA.winkelHinten=25;
  kamA.breiteVorne=900; kamA.breiteHinten=900; kamA.ueberlappung=120;
  kamA.b={l:500,r:500}; kamA.c={l:400,r:400};
  kamA.f={l:150,r:150}; kamA.g={l:100,r:100}; kamA.hoehe={l:400,r:400};
  // Einfassung Rund
  einfA=einfaLeer(); einfA.material="2"; einfA.deckung="biber_doppel"; einfA.lattenabstand=330;
  einfA.einfassungen=[{bez:"",durchmesser:110,winkel:30,a:20,b:100,c:100,anzahl:1},
                      {bez:"Küche",durchmesser:160,winkel:30,a:20,b:100,c:100,anzahl:2}];
 });
 for(const a of ARTEN){
  await zeige(page,a.typ);
  const zuNr=listen[a.typ].indexOf("Zuschnitt")+1;
  await reg(page,a,zuNr);
  // --- Hauptansicht: die Liste STUECKZAHL x LAENGE x ABWICKLUNG ----------
  const liste=await page.evaluate(w=>{
   const e=$(w); if(!e)return null;
   const box=e.querySelector(".zu-liste"); if(!box)return null;
   const det=e.querySelector("details.zu-details");
   const zeilen=Array.from(box.querySelectorAll(".zu-zeile")).map(z=>({
     anzahl:(z.querySelector(".zu-anzahl")||{}).innerText||"",
     mass:(z.querySelector(".zu-mass")||{}).innerText||"",
     anzahlPx:parseFloat(getComputedStyle(z.querySelector(".zu-anzahl")||z).fontSize)||0,
     massPx:parseFloat(getComputedStyle(z.querySelector(".zu-mass")||z).fontSize)||0}));
   return {kopf:(box.querySelector(".zu-liste-kopf")||{}).innerText||"",
     fuss:(box.querySelector(".zu-liste-fuss")||{}).innerText||"",
     zeilen, detailsZu:det?!det.open:null,
     detailsUnten:det?det.compareDocumentPosition(box)===Node.DOCUMENT_POSITION_PRECEDING:null};
  },a.wurzel);
  p(!!liste&&liste.zeilen.length>0,a.name+": die Zuschnittliste ist die Hauptansicht",liste);
  if(liste&&liste.zeilen.length){
   p(liste.zeilen.every(z=>/^\d+\s*×$/.test(z.anzahl.trim())),
     a.name+": jede Zeile beginnt mit der Stueckzahl",liste.zeilen.map(z=>z.anzahl));
   p(liste.zeilen.every(z=>/^\d[\d'’.]*\s*×\s*\d[\d'’.]*\s*mm$/.test(z.mass.replace(/\s+/g," ").trim())),
     a.name+": danach LAENGE × ABWICKLUNG mm",liste.zeilen.map(z=>z.mass));
   p(liste.zeilen[0].anzahlPx>=17&&liste.zeilen[0].massPx>=17,
     a.name+": Stueckzahl und Mass sind gross genug fuers Handy",
     {anzahl:liste.zeilen[0].anzahlPx,mass:liste.zeilen[0].massPx});
   const laengen=liste.zeilen.map(z=>parseInt(z.mass.replace(/[^\d]/g,"").slice(0,6),10));
   p(liste.zeilen.length===new Set(liste.zeilen.map(z=>z.mass)).size,
     a.name+": gleiche Zuschnitte stehen nur EINMAL",liste.zeilen.map(z=>z.mass));
  }
  p(liste&&liste.detailsZu===true,a.name+": die Einzelheiten sind zugeklappt",liste&&liste.detailsZu);
  p(liste&&liste.detailsUnten===true,a.name+": und stehen UNTER der Liste",liste&&liste.detailsUnten);
  await auf(page,a);
  const t=await txt(page,a);
  const h=await html(page,a);
  // 1) Die Streifenbreite steht ueberall und zwar als ERSTE Kennzahl.
  const labels=await page.evaluate(w=>Array.from($(w).querySelectorAll(".zu-kennzahlen label"))
    .map(x=>x.innerText.replace(/\s+/g," ").trim()),a.wurzel);
  p(labels.length===4,a.name+": vier Kennzahlen",labels);
  p(/streifenbreite/i.test(labels[0]||""),
    a.name+": die STREIFENBREITE ist die erste Kennzahl",labels);
  // 2) Der Wert daneben ist gefuellt - bei der Rinne ehrlich "entfaellt".
  const wert=await page.evaluate(w=>{
   const e=$(w).querySelector(".zu-kennzahlen .ra-wert");
   return e?e.innerText.replace(/\s+/g," ").trim():null;
  },a.wurzel);
  if(a.art==="stange"){
   p(wert==="entfällt",a.name+": Streifenbreite \"entfaellt\" - eine Rinne kommt in Normlaengen",wert);
   p(/kein Streifen von der Rolle/i.test(t),a.name+": und das steht auch als Satz da",wert);
  }else{
   p(/^\d[\d'’.]*\s*mm/.test(wert||""),a.name+": die Streifenbreite ist ein Mass in mm",wert);
   p(t.indexOf("muss der Streifen")>=0,a.name+": der Satz nennt die zu schneidende Breite",wert);
  }
  // 3) kein NaN, kein undefined
  p(!/NaN|undefined|Infinity/.test(h),a.name+": kein NaN/undefined im Zuschnitt");
  // 4) Belegung: welches Stueck liegt wo
  p(/so liegen die/i.test(t),a.name+": die Belegung steht da",t.slice(0,60));
  // 5) Fusszeile: woher die Breiten/Laengen kommen
  p(/Einstellungen . (Allgemein|Massaufnahmen)/.test(t),a.name+": die Fusszeile nennt die Quelle",(t.match(/[^\n]*Einstellungen[^\n]*/)||[""])[0].slice(0,90));
 }

 // ---- E2 · Jedes Zuschnittstueck steht als Laenge x Breite --------------
 console.log("\nE2 · Laenge × Breite in jeder Zuschnittliste");
 // Wieder mit Daten fuellen (Abschnitt E hat sie stehen lassen).
 const LXB=/\d[\d'’.]*\s*mm\s*×\s*\d[\d'’.]*\s*mm/;
 for(const a of ARTEN){
  await zeige(page,a.typ);
  await reg(page,a,listen[a.typ].indexOf("Zuschnitt")+1);
  await auf(page,a);
  const t=await txt(page,a);
  // Seit v2.88 ist die Belegung eine Karte je Streifen: jedes Stueck steht mit
  // seiner Nummer und seinem Mass "Laenge × Breite" auf einer eigenen Zeile.
  const bel=await page.evaluate(id=>{
   const w=document.getElementById(id);
   return {karten:w.querySelectorAll(".zu-platz").length,
     masse:Array.from(w.querySelectorAll(".zu-platz-mass")).map(x=>x.textContent.replace(/\s+/g," ").trim()),
     nummern:Array.from(w.querySelectorAll(".zu-platz-stueck .zu-nr")).map(x=>x.textContent.trim())};
  },a.wurzel);
  p(bel.karten>0&&bel.masse.length>0&&bel.masse.every(m=>LXB.test(m)),
    a.name+": die Belegung nennt je Stueck Laenge × Breite",
    {karten:bel.karten,erstes:bel.masse[0]});
  p(bel.nummern.length===bel.masse.length&&bel.nummern.every(n=>/^\d+$/.test(n)),
    a.name+": und dazu seine Positionsnummer",bel.nummern.slice(0,6));
  p(LXB.test(t),a.name+": jedes Stueck steht als Laenge × Breite",
    (t.match(/[^\n]*×[^\n]*/)||[""])[0].slice(0,80));
 }
 // Und in der Stueckliste bzw. Stuecke-Liste der einzelnen Arten.
 const listenNamen={rinne_halbrund:"Stückliste",mauerabdeckung:"Stückliste",
   einlaufblech_gerade:"Stücke",einlaufblech_konisch:"Stücke",freies_profil:"Segmente",
   kehle:"Segmente",kamineinfassung:"Stückliste",einfassung_rund:"Stückliste"};
 for(const a of ARTEN){
  const name=listenNamen[a.typ];
  const nr=listen[a.typ].indexOf(name)+1;
  if(!nr){p(false,a.name+": Register \""+name+"\" gefunden");continue}
  await zeige(page,a.typ);
  await reg(page,a,nr);
  // Bei Einlaufblech steht die Laenge in einem Eingabefeld - innerText
  // enthaelt sie nicht. Deshalb den Feldwert einsetzen und dann pruefen.
  const t=await page.evaluate(w=>{
   const wurzel=$(w); if(!wurzel)return "";
   const kopie=wurzel.cloneNode(true);
   const echt=wurzel.querySelectorAll("input"), kop=kopie.querySelectorAll("input");
   for(let i=0;i<kop.length;i++){
    const sp=document.createElement("span"); sp.textContent=echt[i].value;
    kop[i].replaceWith(sp);
   }
   return kopie.innerText;
  },a.wurzel);
  p(LXB.test(t),a.name+" · "+name+": Laenge × Breite steht auch dort",
    (t.match(/[^\n]*×[^\n]*/)||[""])[0].slice(0,90));
 }

 // ---- F · Rechnung unveraendert ------------------------------------------
 console.log("\nF · die Rechnung selbst hat sich nicht geaendert");
 const z=await page.evaluate(()=>{
  const r=raZuschnittPlan(), e=ebaZuschnittPlan(), m=madaZuschnittPlan();
  return {
   // Rinne: 3 x 6000 minus Ansetzen -> aus 6-m-Stangen
   rinneStangen:r.stangen.length, rinneNormen:r.normen,
   rinneSumme:r.summeStuecke, rinneGesamt:r.gesamt,
   // Einlaufblech: 3 Stuecke, laengstes 3000
   ebTafel:e.gruppen.length?e.gruppen[0].rollenLaenge:null,
   ebBreite:e.streifenbreiten[0],
   ebNetto:Math.round(e.netto*100)/100,
   ebBeste:e.moeglich.length?e.moeglich[0].breite:null,
   // Mauerabdeckung
   madBreite:m.streifenbreiten[0],
   madNetto:Math.round(m.netto*100)/100
  };
 });
 // Rolle 1000 ÷ Abwicklung 250 = 4 Streifen; die Stuecke passen einzeln
 // nebeneinander -> Rollenlaenge = laengstes Stueck.
 p(z.ebTafel===3000,"Einlaufblech: 3'000 mm ab Rolle",z);
 p(z.ebBreite===250,"Einlaufblech: die Streifenbreite ist die Abwicklung",z);
 p(Math.abs(z.ebNetto-((3000+2000+2500)*250/1e6))<0.01,
   "Einlaufblech: Blech netto = Laenge x Abwicklung",z);
 p(z.ebBeste===1000||z.ebBeste===670,"Einlaufblech: eine Standardrolle ist die beste",z);
 p(z.rinneStangen>=3,"Rinne: mindestens drei Stangen fuer 3 x 6 m",z);
 p(z.rinneGesamt>=z.rinneSumme,"Rinne: die Normlaenge deckt den Zuschnitt",z);
 p(z.madBreite>0,"Mauerabdeckung: die Streifenbreite ist die Abwicklung des Profils",z);

 // ---- G · Leerer Zustand --------------------------------------------------
 console.log("\nG · ohne Daten sagt jede Art dasselbe, ohne zu rechnen");
 await page.evaluate(()=>{
  ebA=ebaLeer(); ebkA=ebkaLeer(); fpA=fpaLeer(); madA=madaLeer();
  kehleA=keaLeer(); kamA=kamaLeer();
  // Einfassung Rund ist wie im bestehenden Modul (js/21) mit der Vorgabe
  // Ø110 vorbelegt - der wirklich leere Zustand ist ein leerer Durchmesser.
  einfA=einfaLeer(); einfA.einfassungen.forEach(e=>{e.durchmesser="";});
 });
 for(const a of ARTEN){
  if(a.art==="stange")continue;      // die Rinne meldet die fehlende Normlaenge
  await zeige(page,a.typ);
  await reg(page,a,listen[a.typ].indexOf("Zuschnitt")+1);
  const t=await txt(page,a), h=await html(page,a);
  p(/Noch nichts zuzuschneiden|Noch kein Zuschnittst/i.test(t),
    a.name+": leerer Zustand sagt \"noch nichts zuzuschneiden\"",t.slice(0,140));
  p(!/NaN|undefined/.test(h),a.name+": auch leer kein NaN/undefined");
  p(!/so liegen die/i.test(t),a.name+": leer gibt es auch keine Belegung");
 }

 // ---- H · Breiten ---------------------------------------------------------
 console.log("\nH · das Zuschnitt-Register passt auf jedes Geraet");
 await page.evaluate(()=>{
  ebA=ebaLeer(); ebA.material="2"; ebA.abwicklung=250; ebA.massA=120; ebA.winkel=30;
  ebA.stuecke=[{laenge:3000},{laenge:2000},{laenge:2500}];
  madA=madaLeer(); madA.material="2";
  madA.segmente=[{laenge:8000,winkel:90,bodenLinks:true,bodenRechts:false},
                 {laenge:4000,winkel:0,bodenLinks:false,bodenRechts:true}];
  madA.schieberManuell=false; madaSchieberNeu();
  // Kehle
  kehleA=keaLeer(); kehleA.material="2"; kehleA.abwicklung=500;
  kehleA.nh="42.5"; kehleA.nl="23.5"; kehleA.gl="5000";
  kehleA.segmente=[{laenge:2000,ueberlappung:70},{laenge:2000,ueberlappung:70},
                   {laenge:1453,ueberlappung:0}];
  // Kamineinfassung
  kamA=kamaLeer(); kamA.material="2"; kamA.lattenabstand=330;
  kamA.a=300; kamA.d=250; kamA.e=60; kamA.keil=80;
  kamA.winkelVorne=25; kamA.winkelHinten=25;
  kamA.breiteVorne=900; kamA.breiteHinten=900; kamA.ueberlappung=120;
  kamA.b={l:500,r:500}; kamA.c={l:400,r:400};
  kamA.f={l:150,r:150}; kamA.g={l:100,r:100}; kamA.hoehe={l:400,r:400};
  // Einfassung Rund
  einfA=einfaLeer(); einfA.material="2"; einfA.deckung="biber_doppel"; einfA.lattenabstand=330;
  einfA.einfassungen=[{bez:"",durchmesser:110,winkel:30,a:20,b:100,c:100,anzahl:1},
                      {bez:"Küche",durchmesser:160,winkel:30,a:20,b:100,c:100,anzahl:2}];
 });
 for(const breite of [320,390,768,1280]){
  await page.setViewportSize({width:breite,height:1400});
  // Nicht nur das Zuschnitt-Register: auch die Stueck-/Stuecklisten, in denen
  // seit v2.81 die Breite mitsteht. Genau dort war das Eingabefeld zuerst auf
  // wenige Pixel zusammengedrueckt.
  const messen=[[ARTEN[1],"Zuschnitt"],[ARTEN[4],"Zuschnitt"],
                [ARTEN[1],"Stücke"],[ARTEN[0],"Stückliste"],[ARTEN[4],"Stückliste"]];
  for(const [a,regName] of messen){
   await zeige(page,a.typ);
   await reg(page,a,listen[a.typ].indexOf(regName)+1);
   const ueber=await page.evaluate(w=>{
    const wurzel=$(w); if(!wurzel)return -1;
    // Elemente in einem seitwaerts scrollenden Kasten (.scroll, Registerleiste)
    // duerfen breiter sein - dort ist das Absicht.
    const scrollt=e=>{
     for(let x=e;x&&x!==document.body;x=x.parentElement){
      const s=getComputedStyle(x);
      if(s.overflowX==="auto"||s.overflowX==="scroll")return true;
     }
     return false;
    };
    let n=0;
    wurzel.querySelectorAll("*").forEach(e=>{
     if(scrollt(e))return;
     const r=e.getBoundingClientRect();
     if(r.width>0&&r.right>document.documentElement.clientWidth+1)n++;
    });
    return n;
   },a.wurzel);
   p(ueber===0,a.name+" · "+regName+" bei "+breite+" px: nichts laeuft seitlich hinaus",ueber);
   // Ein Eingabefeld, das auf wenige Pixel zusammengedrueckt ist, ist
   // unbedienbar - die Zahl darin waere nicht mehr lesbar.
   const eng=await page.evaluate(w=>{
    const wurzel=$(w); if(!wurzel)return -1;
    let n=0;
    wurzel.querySelectorAll("input[type=number]").forEach(e=>{
     const r=e.getBoundingClientRect();
     if(r.width>0&&r.width<70)n++;
    });
    return n;
   },a.wurzel);
   p(eng===0,a.name+" · "+regName+" bei "+breite+" px: kein zusammengedruecktes Eingabefeld",eng);
  }
 }
 await page.setViewportSize({width:412,height:1600});

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",fehler.slice(0,3));
 console.log("\npruefstand-register-zuschnitt: "+ok+"/"+(ok+fail)+
   (fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

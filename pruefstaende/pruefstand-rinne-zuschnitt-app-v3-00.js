// Prueft die umgebaute Massaufnahme "Rinne" (Zuschnittliste, js/26 + js/39)
// in der laufenden App. Geladen wird die echte index.html mit echten
// Skripten; Supabase wird nicht angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rinne-zuschnitt-app-v3-00.js
//
// ALLE ERWARTUNGEN SIND VON HAND NACHGERECHNET und stehen als Kommentar dabei -
// sie werden nicht aus dem geprueften Code abgeschrieben.
//
// Standardprofil (Vorlage des Betreibers): Fixmasse 15+150+40+40+200+15 = 460,
// drei variable Masse A/B/C. Ansetztypen aus der Excel: Dila -165, Boden 0,
// Ablauf -230, Gehrung +250, Naht +15, Nichts 0.
//
//   Stueck 1  links 127/192/202  rechts 130/195/205  L 3000  Dila / Gehrung
//     Abw. L    = 127+192+202+460 =  981
//     Abw. R    = 130+195+205+460 =  990
//     Zuschnitt = 3000 - 165 + 250 = 3085     Streifenbreite max(981,990) = 990
//   Stueck 2  beide 130/195/205  L 2000  Dila / Dila
//     Abw. L = Abw. R = 990        Zuschnitt = 2000 - 165 - 165 = 1670
//   Stueck 3  identisch zu Stueck 2  ->  gleicher Zuschnitt, eine Zeile "2 x"
//
//   Blechflaeche = 990 * (3085+1670+1670) / 1e6 = 990*6425/1e6 = 6,36075 m2
//   Rolle 1000: floor(1000/990) = 1 Streifen je Abschnitt, Abschnitt 3085 mm,
//               3 Streifen -> 3 Abschnitte -> 9255 mm ab Rolle -> 9,255 m2
//   Rolle  670: floor(670/990) = 0  ->  zu schmal
//   Verschnitt bei 1000: 9,255 - 6,36075 = 2,89425 m2
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};
// Klick ueber evaluate mit Pruefung: ein fehlendes oder gesperrtes Element soll
// sauber fehlschlagen und nicht in einen Timeout laufen - ein abgebrochener
// Pruefstand sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(180); return r;
}
async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; f.dispatchEvent(new Event("input",{bubbles:true})); return true},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(90);
 return true;
}
const reg=async(page,n)=>{await page.evaluate(k=>rpaSetzeSchritt(k),n);await page.waitForTimeout(200)};

const FALL={material:"2",
 stuecke:[
  {links:[127,192,202],rechts:[130,195,205],laenge:3000,ansetzL:"dila",ansetzR:"gehrung"},
  {links:[130,195,205],rechts:[130,195,205],laenge:2000,ansetzL:"dila",ansetzR:"dila"},
  {links:[130,195,205],rechts:[130,195,205],laenge:2000,ansetzL:"dila",ansetzR:"dila"}
 ]};
const laden=async(page,d)=>{await page.evaluate(x=>{rinneFormularFuellen(x);rpaFuellen(x)},d);
  await page.waitForTimeout(220)};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
   args:["--no-sandbox"]});
 const page=await b.newPage();
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,
   contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12, 3011 Bern",
                order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670];
  companyName="Peter Künzi AG"; companyAddress="Industriestrasse 8"; logoUrl=null;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
  $("measType").value="rinne"; showMeasTypeSection("rinne");
 });
 await page.waitForTimeout(400);

 console.log("\nA · Modul geladen, Fachdatei unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderRinneAufnahmeRegister==="function",
  zurueck:typeof rpaZuruecksetzen==="function",
  fuellen:typeof rpaFuellen==="function",
  zusatz:typeof rpaZusatzDaten==="function",
  fach:typeof rinneStueckRechnen==="function"&&typeof rinneFixSumme==="function"
    &&typeof rinneVariable==="function"&&typeof rinneWerte==="function",
  packen:typeof ebaPackeInStreifen==="function",
  zeigen:typeof zuschnittHtml==="function"&&typeof zuDruckHtml==="function",
  auswahl:typeof zuRollenAuswahlHtml==="function"
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/39 ist geladen",da);
 p(da.fach,"die Fachrechnung aus js/26 ist da und wird nicht nachgebaut",da);
 p(da.packen,"die gemeinsame Packrechnung aus js/29 ist da",da);
 p(da.zeigen&&da.auswahl,"die gemeinsame Zuschnitt-Darstellung aus js/33 ist da",da);
 // KEIN Nachbau: das Ergebnis kommt Zeichen fuer Zeichen aus der Fachdatei.
 const gleich=await page.evaluate(()=>{
  const st={links:[127,192,202],rechts:[130,195,205],laenge:3000,ansetzL:"dila",ansetzR:"gehrung"};
  return {modul:JSON.stringify(rpaRechnen(st)),
          fach:JSON.stringify(rinneStueckRechnen(st,rinneAktiveWerte()))};
 });
 p(gleich.modul===gleich.fach,"rpaRechnen() ist die Fachrechnung, kein Nachbau",gleich);

 console.log("\nB · Sechs Register, nur eines sichtbar");
 const rr=await page.evaluate(()=>({
  namen:Array.from(document.querySelectorAll("#rpa_register .ra-register-knopf"))
        .map(b=>b.querySelector(".ra-register-text").textContent.trim()),
  nummern:Array.from(document.querySelectorAll("#rpa_register .ra-register-knopf"))
        .map(b=>b.querySelector(".ra-register-nr").textContent.trim())
 }));
 p(JSON.stringify(rr.namen)===JSON.stringify(["Grunddaten","Profil","Stücke","Zuschnitt","Ausmass","Kontrolle"]),
   "die Registernamen und ihre Reihenfolge",rr.namen);
 p(JSON.stringify(rr.nummern)===JSON.stringify(["1","2","3","4","5","6"]),"durchnummeriert",rr.nummern);
 for(let n=1;n<=6;n++){
  await reg(page,n);
  const sicht=await page.evaluate(()=>[1,2,3,4,5,6].map(k=>{
   const e=$("rpa_seite"+k); const cs=getComputedStyle(e);
   return !e.hidden&&cs.display!=="none"&&e.getBoundingClientRect().height>2;
  }));
  p(sicht.filter(Boolean).length===1&&sicht[n-1],"Register "+n+": nur die eigene Seite ist sichtbar",sicht);
 }
 await reg(page,1);
 const bl=await page.evaluate(()=>({z:!!$("rpa_zurueck"),w:!!$("rpa_weiter"),
   zGesperrt:$("rpa_zurueck")?$("rpa_zurueck").disabled:null,
   text:$("rpa_weiter")?$("rpa_weiter").textContent.trim():""}));
 p(bl.z&&bl.w&&bl.zGesperrt===true,"auf Register 1 ist 'Zurück' gesperrt",bl);
 p(/^Weiter › Profil$/.test(bl.text),"der Weiter-Knopf nennt das nächste Register",bl.text);
 await reg(page,6);
 const fer=await page.evaluate(()=>({text:$("rpa_weiter").textContent.trim(),
   gesperrt:$("rpa_weiter").disabled}));
 p(fer.text==="Fertig › Fotos und Speichern"&&!fer.gesperrt,
   "auf dem letzten Register heisst er 'Fertig' und ist bedienbar",fer);

 console.log("\nC · Profil und Stückliste kommen weiterhin von js/26");
 await reg(page,2);
 const pr=await page.evaluate(()=>({
  zeilen:document.querySelectorAll("#rp_profilBody tr").length,
  fix:rpaFixSumme(), varM:rpaVarListe().map(v=>v.buchstabe),
  info:($("rp_profilInfo")||{}).textContent||"",
  svg:($("rp_diagram")||{}).innerHTML.indexOf("<svg")>=0
 }));
 p(pr.zeilen===9,"neun Profilsegmente (Standardprofil)",pr.zeilen);
 p(pr.fix===460,"Fixmasse gesamt 460 mm",pr.fix);
 p(JSON.stringify(pr.varM)===JSON.stringify(["A","B","C"]),"drei variable Masse A/B/C",pr.varM);
 p(/460/.test(pr.info),"die Info-Zeile nennt die Fixmasse",pr.info.slice(0,80));
 p(pr.svg,"die Profilskizze wird gezeichnet");
 // Die direkt gebundenen Handler von js/26 muessen die Register ueberleben.
 await reg(page,3);
 await reg(page,2);
 const lebt=await page.evaluate(()=>{
  const vor=rinneProfil.length;
  $("rp_addSegment").click();
  const nach=rinneProfil.length;
  rinneProfil.pop(); rinneStueckeAnpassen(); renderRinneResult();
  return {vor,nach,zeilen:document.querySelectorAll("#rp_profilBody tr").length};
 });
 p(lebt.nach===lebt.vor+1,"'＋ Segment hinzufügen' wirkt auch nach einem Registerwechsel",lebt);

 console.log("\nD · Rinnenstücke eintippen, Rechnung unverändert (Excel)");
 await laden(page,FALL);
 await reg(page,3);
 const erg=await page.evaluate(()=>rinneStuecke.map(st=>{
  const g=rinneStueckRechnen(st,rinneAktiveWerte());
  return {l:g.abwicklungLinks,r:g.abwicklungRechts,z:g.zuschnitt};
 }));
 p(erg.length===3,"drei Stücke geladen",erg.length);
 p(erg[0].l===981&&erg[0].r===990&&erg[0].z===3085,
   "Stück 1: Abw. 981 / 990, Zuschnitt 3085 (von Hand nachgerechnet)",erg[0]);
 p(erg[1].l===990&&erg[1].r===990&&erg[1].z===1670,
   "Stück 2: Abw. 990 / 990, Zuschnitt 1670",erg[1]);
 p(JSON.stringify(erg[1])===JSON.stringify(erg[2]),"Stück 3 ist rechnerisch identisch zu Stück 2",erg[2]);
 // Echt tippen: das Feld darf den Fokus nicht verlieren.
 const feldOk=await tippe(page,'#rp_stueckeBody input[data-rp-feld="laenge"][data-rp-i="1"]',"2500");
 const nachTippen=await page.evaluate(()=>({
  wert:document.querySelector('#rp_stueckeBody input[data-rp-feld="laenge"][data-rp-i="1"]').value,
  fokus:document.activeElement.getAttribute("data-rp-feld"),
  z:rinneStueckRechnen(rinneStuecke[1],rinneAktiveWerte()).zuschnitt
 }));
 p(feldOk&&nachTippen.wert==="2500","die Länge wird vollständig getippt",nachTippen);
 p(nachTippen.fokus==="laenge","das Feld behält den Fokus",nachTippen);
 p(nachTippen.z===2170,"und rechnet mit: 2500 - 165 - 165 = 2170",nachTippen.z);
 await laden(page,FALL);

 console.log("\nE · Zuschnitt aus Rollenblech (gemeinsame Packrechnung)");
 const bleche=await page.evaluate(()=>rpaBleche());
 p(bleche.length===3,"drei Zuschnitte",bleche.length);
 p(bleche[0].laenge===3085&&bleche[0].breite===990,
   "Stück 1: 3085 × 990 – die GRÖSSERE Abwicklung ist die Streifenbreite",bleche[0]);
 p(/konisch/.test(bleche[0].merkmal),"das konische Stück ist als solches gekennzeichnet",bleche[0].merkmal);
 p(bleche[1].merkmal===bleche[2].merkmal&&bleche[1].laenge===bleche[2].laenge,
   "Stück 2 und 3 sind derselbe Zuschnitt",[bleche[1],bleche[2]]);
 const plan=await page.evaluate(()=>rpaRollenPlan());
 // Von Hand: netto 990*6425/1e6 = 6,36075 m2
 p(Math.abs(plan.netto-6.36075)<1e-6,"Blechfläche 6,36075 m² (990 × 6425 mm)",plan.netto);
 p(plan.gruppen.length===1&&plan.gruppen[0].breite===990,"eine Streifenbreite: 990 mm",
   plan.gruppen.map(g=>g.breite));
 p(plan.gruppen[0].abschnittLaenge===3085,"der Abschnitt ist so lang wie das längste Stück",
   plan.gruppen[0].abschnittLaenge);
 p(plan.gruppen[0].streifen.length===3,"drei Streifen (1670+1670 = 3340 > 3085)",
   plan.gruppen[0].streifen.map(s=>s.stuecke.map(x=>x.laenge)));
 p(plan.zuSchmal.length===1&&plan.zuSchmal[0]===670,"die 670er Rolle ist zu schmal",plan.zuSchmal);
 p(plan.bestes&&plan.bestes.breite===1000&&Math.abs(plan.bestes.flaeche-9.255)<1e-6,
   "beste Rolle 1000 mm mit 9,255 m² (3 Abschnitte à 3085 mm)",plan.bestes);
 p(plan.bestes&&Math.abs(plan.bestes.verschnitt-2.89425)<1e-6,
   "Verschnitt 2,89425 m² (9,255 − 6,36075)",plan.bestes&&plan.bestes.verschnitt);
 // Nachweis, dass wirklich die GEMEINSAME Packrechnung gerufen wird.
 const gerufen=await page.evaluate(()=>{
  const echt=window.ebaPackeInStreifen; let n=0;
  window.ebaPackeInStreifen=function(){n++;return echt.apply(null,arguments)};
  rpaRollenPlan();
  window.ebaPackeInStreifen=echt;
  return n;
 });
 p(gerufen>0,"ebaPackeInStreifen aus js/29 wird tatsächlich gerufen",gerufen);
 // Zwei kurze Stuecke muessen in EINEN Streifen passen, wenn der Abschnitt
 // reicht. Von Hand: laengstes Stueck 3000 -> Abschnitt 3000; 1000+1000 = 2000
 // passt darin, also zwei Streifen [3000] und [1000,1000].
 const zwei=await page.evaluate(()=>{
  const m=[130,195,205];
  rinneStuecke=[3000,1000,1000].map(l=>({links:m.slice(),rechts:m.slice(),
    laenge:l,ansetzL:"boden",ansetzR:"boden"}));
  renderRinneResult();
  const pl=rpaRollenPlan();
  return {streifen:pl.gruppen[0].streifen.length,
          belegung:pl.gruppen[0].streifen.map(s=>s.stuecke.map(x=>x.laenge))};
 });
 p(zwei.streifen===2&&zwei.belegung.some(s=>s.length===2),
   "zwei kurze Stücke liegen im selben Streifen (Abschnitt 3000)",zwei);
 await laden(page,FALL);
 await reg(page,4);
 const zt=await page.evaluate(()=>{
  const d=$("rpa_seite4");
  d.querySelectorAll("details").forEach(x=>x.open=true);
  return {text:d.textContent, nan:/NaN|undefined/.test(d.textContent)};
 });
 p(/990/.test(zt.text)&&/Streifenbreite/i.test(zt.text),"das Register nennt die Streifenbreite zuerst",
   zt.text.slice(0,140));
 p(/2 ×/.test(zt.text)||/2×/.test(zt.text),"gleiche Zuschnitte werden zusammengefasst",zt.text.slice(0,400));
 p(!zt.nan,"kein NaN im Zuschnitt-Register");
 p(/Rollenauswahl|Rollen für diese/i.test(zt.text),"die Rollenauswahl für diese Aufnahme ist da",zt.text.slice(0,200));

 console.log("\nF · Ausmass");
 const am=await page.evaluate(()=>rpaAusmassZeilen());
 const bez=am.map(x=>x.bezeichnung);
 p(am.length>=6,"das Ausmass hat Positionen",am.length);
 p(bez[0]==="Rinnenstücke"&&am[0].menge==="3","Position 1: 3 Rinnenstücke",am[0]);
 // Von Hand: 3000+2000+2000 = 7000 mm = 7,00 m
 p(am[1].menge==="7,00","Länge M/M gesamt 7,00 m",am[1]);
 // Von Hand: 3085+1670+1670 = 6425 mm = 6,425 m. JavaScript zeigt dafuer
 // "6,42": 6.425 ist als Gleitkommazahl minimal kleiner, und toFixed(2)
 // rundet ab. Dieselbe Schreibweise wie in allen uebrigen Modulen - der
 // Unterschied ist ein Zentimeter auf 6,4 Meter.
 p(am[2].menge==="6,42","Zuschnittlänge gesamt 6,42 m (6425 mm)",am[2]);
 p(am[3].menge==="6,36","Blechfläche 6,36 m²",am[3]);
 p(bez.indexOf("Fixmasse des Profils")>=0,"die Fixmasse steht im Ausmass",bez);
 const dila=am.find(x=>/Dila/.test(x.bezeichnung));
 const gehr=am.find(x=>/Gehrung/.test(x.bezeichnung));
 p(dila&&dila.menge==="5","fünf Stückenden mit Dila",dila);
 p(gehr&&gehr.menge==="1","ein Stückende mit Gehrung",gehr);
 p(!am.some(x=>/Preis|Fr\.|Artikel/i.test(x.bezeichnung)),"keine Preise, keine Artikelnummern",bez);
 await reg(page,5);
 const at=await page.evaluate(()=>$("rpa_seite5").textContent);
 p(/Titanzink/.test(at),"das gewählte Material steht im Register",at.slice(0,200));

 console.log("\nG · Kontrolle");
 const k1=await page.evaluate(()=>rpaPruefungen());
 p(k1.filter(x=>x.art==="fehler").length===0,"vollständige Aufnahme: kein Fehler",k1.map(x=>x.text));
 const k2=await page.evaluate(()=>{
  const alt=$("rp_material").value; $("rp_material").value="";
  const m=rpaPruefungen(); $("rp_material").value=alt; return m;
 });
 p(k2.some(x=>x.art==="warnung"&&/Material/.test(x.text)),"fehlendes Material ist eine Warnung",
   k2.map(x=>x.text));
 const k3=await page.evaluate(()=>{
  const alt=rinneStuecke[0].laenge; rinneStuecke[0].laenge="";
  const m=rpaPruefungen(); rinneStuecke[0].laenge=alt; return m;
 });
 p(k3.some(x=>x.art==="fehler"&&/Länge M\/M/.test(x.text)),"fehlende Länge M/M ist ein Fehler",
   k3.map(x=>x.text));
 const k4=await page.evaluate(()=>{
  // 100 - 165 - 165 = -230  ->  das Ansetzen zieht mehr ab als das Stueck lang ist
  const alt=rinneStuecke[1].laenge; rinneStuecke[1].laenge=100;
  const m=rpaPruefungen(); rinneStuecke[1].laenge=alt; return m;
 });
 p(k4.some(x=>x.art==="fehler"&&/Zuschnittlänge/.test(x.text)),
   "ein negativer Zuschnitt ist ein Fehler",k4.map(x=>x.text));
 const k5=await page.evaluate(()=>{
  const alt=rinneStuecke[0].links.slice(); rinneStuecke[0].links[1]="";
  const m=rpaPruefungen(); rinneStuecke[0].links=alt; return m;
 });
 p(k5.some(x=>x.art==="warnung"&&/B links/.test(x.text)),"ein leeres variables Mass ist eine Warnung",
   k5.map(x=>x.text));
 const k6=await page.evaluate(()=>{
  const alt=rinneProfil.slice(); rinneProfil.length=0;
  const m=rpaPruefungen(); rinneProfil.push.apply(rinneProfil,alt); return m;
 });
 p(k6.some(x=>x.art==="fehler"&&/leer/.test(x.text)),"ein leeres Profil ist ein Fehler",k6.map(x=>x.text));
 await laden(page,FALL);
 const marke=await page.evaluate(()=>{
  const alt=rinneStuecke[0].laenge; rinneStuecke[0].laenge="";
  rpaMarkeNachfuehren();
  const el=document.querySelector('#rpa_register [data-rpa-schritt="'+RPA_KONTROLLE+'"] .ra-register-punkt');
  const rot=el?el.className.indexOf("fehler")>=0:false;
  rinneStuecke[0].laenge=alt; rpaMarkeNachfuehren();
  return {da:!!el,rot};
 });
 p(marke.da&&marke.rot,"das Kontroll-Register bekommt bei einem Fehler eine rote Marke",marke);

 console.log("\nH · Speichern und Wiederöffnen");
 await laden(page,FALL);
 const sp=await page.evaluate(()=>{
  $("measTitle").value="Rinne Nordseite"; $("measDate").value="2026-09-05";
  setMeasProjectField(7);
  const m=buildMeasurementFromForm();
  return {typ:m.type,d:m.data};
 });
 p(sp.typ==="rinne","Typ im Payload",sp.typ);
 // SUPERSET: die Felder bis v2.99 bleiben Zeichen fuer Zeichen erhalten.
 p(Array.isArray(sp.d.profil)&&sp.d.profil.length===9&&sp.d.ansetz&&sp.d.fixSumme===460
   &&Array.isArray(sp.d.varMasse)&&sp.d.varMasse.length===3
   &&Array.isArray(sp.d.stuecke)&&sp.d.stuecke.length===3&&sp.d.material==="2",
   "die Felder bis v2.99 stehen weiterhin im Payload",Object.keys(sp.d));
 p(sp.d.stuecke[0].abwicklungLinks===981&&sp.d.stuecke[0].abwicklungRechts===990
   &&sp.d.stuecke[0].zuschnitt===3085,"die gespeicherten Ergebnisse stimmen",sp.d.stuecke[0]);
 p(Math.abs(sp.d.flaeche_m2-6.361)<0.002,"neu: Blechfläche gespeichert",sp.d.flaeche_m2);
 p(Array.isArray(sp.d.ausmass)&&sp.d.ausmass.length>0,"neu: Ausmass gespeichert",
   (sp.d.ausmass||[]).length);
 p(sp.d.zuschnitt&&Array.isArray(sp.d.zuschnitt.gruppen)&&sp.d.zuschnitt.bestes,
   "neu: Rollenblech-Plan gespeichert",sp.d.zuschnitt&&Object.keys(sp.d.zuschnitt));
 const wieder=await page.evaluate(d=>{
  rinneFormularFuellen(d); rpaFuellen(d);
  return {n:rinneStuecke.length,fix:rpaFixSumme(),schritt:rpaSchritt,
    teile:rpaBleche().map(x=>x.laenge+"x"+x.breite)};
 },sp.d);
 p(wieder.n===3&&wieder.fix===460,"Wiederöffnen stellt den Stand her",wieder);
 p(JSON.stringify(wieder.teile)===JSON.stringify(["3085x990","1670x990","1670x990"]),
   "dieselben Zuschnitte nach dem Wiederöffnen",wieder.teile);
 p(wieder.schritt===1,"nach dem Öffnen beginnt es bei Register 1");
 // Rollenauswahl je Aufnahme
 // Abgesichert: fehlt das Feld, soll die Pruefung sauber fehlschlagen und den
 // Pruefstand nicht abbrechen - ein Abbruch sieht aus wie "keine Fehler".
 const aus=await page.evaluate(()=>{
  rpaRollenAuswahl=[1000];
  const z=buildMeasurementFromForm().data.zuschnitt||{};
  return {gespeichert:z.auswahl||null,breiten:z.breiten||null};
 });
 p(JSON.stringify(aus.gespeichert)===JSON.stringify([1000])
   &&JSON.stringify(aus.breiten)===JSON.stringify([1000]),
   "die Rollenauswahl dieser Aufnahme wird gespeichert und wirkt",aus);
 await page.evaluate(()=>{rpaRollenAuswahl=[];renderRinneAufnahmeRegister()});

 console.log("\nI · Ein Datensatz bis v2.99 öffnet unverändert");
 // Das alte Format hat weder flaeche_m2 noch ausmass noch zuschnitt.
 const alt=await page.evaluate(()=>{
  rinneFormularFuellen({material:"3",
    profil:[{name:"Umschlag",art:"fix",laenge:15,winkel:0},
            {name:"Boden",art:"fix",laenge:150,winkel:180},
            {name:"",art:"var",laenge:0,winkel:90}],
    ansetz:{dila:-165,boden:0,ablauf:-230,gehrung:250,naht:15,nichts:0},
    stuecke:[{links:[300],rechts:[300],laenge:4000,ansetzL:"boden",ansetzR:"boden"}]});
  rpaFuellen({material:"3"});
  const g=rinneStueckRechnen(rinneStuecke[0],rinneAktiveWerte());
  return {n:rinneStuecke.length,fix:rpaFixSumme(),abw:g.abwicklungLinks,z:g.zuschnitt,
    auswahl:rpaRollenAuswahl.slice(),segmente:rinneProfil.length};
 });
 // Von Hand: Fixmasse 15+150 = 165; Abw. = 300+165 = 465; Zuschnitt = 4000+0+0
 p(alt.segmente===3&&alt.fix===165,"das gespeicherte Profil wird übernommen, nicht das Standardprofil",alt);
 p(alt.abw===465&&alt.z===4000,"und rechnet unverändert: Abw. 465, Zuschnitt 4000",alt);
 p(JSON.stringify(alt.auswahl)==="[]","ohne gespeicherte Rollenauswahl gilt das ganze Lager",alt.auswahl);
 await laden(page,FALL);

 console.log("\nJ · Fotos erst nach 'Fertig'");
 await reg(page,1);
 const m1=await page.evaluate(()=>{const e=$("measMedienBereich");
   const cs=getComputedStyle(e);return {hidden:e.hidden,display:cs.display,h:e.getBoundingClientRect().height}});
 p(m1.hidden||m1.display==="none"||m1.h<2,"während der Register ist der Fotobereich zu",m1);
 await reg(page,6);
 const rk=await klick(page,"#rpa_weiter");
 await page.waitForTimeout(400);
 const m2=await page.evaluate(()=>{const e=$("measMedienBereich");
   const cs=getComputedStyle(e);return {hidden:e.hidden,display:cs.display,h:e.getBoundingClientRect().height}});
 p(rk==="ok","der Fertig-Knopf ist bedienbar",rk);
 p(!m2.hidden&&m2.display!=="none"&&m2.h>2,"nach 'Fertig' ist der Fotobereich offen",m2);

 console.log("\nK · Druck");
 await laden(page,FALL);
 const dr=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  const m=buildMeasurementFromForm();
  await printMeasurement(Object.assign({},m,{title:"Rinne Nordseite",date:"2026-09-05",
    project_id:7,created_by:"u1",created_at:"2026-09-05T08:00:00Z"}),{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(dr.length>500,"das PDF wird erzeugt",dr.length);
 p(/Bahnhofstrasse 12/.test(dr),"Objektadresse als Haupttitel");
 p(/Rinnenst/.test(dr)&&/3.085/.test(dr.replace(/&#\d+;/g,"'")),"die Stückliste steht im PDF");
 p(/Ausmass/.test(dr),"das Ausmass steht im PDF");
 p(/Rollenblech|Zuschnitt aus/.test(dr),"das Rollenblech steht im PDF");
 p(/Blechfl/.test(dr),"die Blechfläche steht im PDF");
 p(!/NaN|undefined/.test(dr),"kein NaN im PDF");
 // Ein Datensatz bis v2.99 hat die neuen Felder nicht - er druckt ohne sie.
 const drAlt=await page.evaluate(async()=>{
  window.__html=null;
  const alt=window.open;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){},closed:false});
  await printMeasurement({type:"rinne",title:"Alt",date:"2026-09-01",project_id:7,
    data:{profil:[{name:"Umschlag",art:"fix",laenge:15,winkel:0},
                  {name:"Boden",art:"fix",laenge:150,winkel:180},
                  {name:"",art:"var",laenge:0,winkel:90}],
      ansetz:{dila:-165,boden:0,ablauf:-230,gehrung:250,naht:15,nichts:0},
      fixSumme:165,varMasse:[{buchstabe:"A",name:""}],
      stuecke:[{links:[300],rechts:[300],laenge:4000,ansetzL:"boden",ansetzR:"boden",
        abwicklungLinks:465,abwicklungRechts:465,zuschnitt:4000}],
      material:"3"}},{listen:"alle"});
  window.open=alt;
  return window.__html||"";
 });
 p(drAlt.length>500&&!/NaN|undefined/.test(drAlt),"ein Datensatz bis v2.99 druckt ohne Fehler",drAlt.length);
 p(/4.000/.test(drAlt.replace(/&#\d+;/g,"'")),"und zeigt seine eigenen Werte");
 p(!/Ausmass/.test(drAlt),"ohne Ausmass im Datensatz steht auch keines im PDF");

 console.log("\nL · Mobil: nichts läuft seitlich hinaus");
 await laden(page,FALL);
 for(const br of [320,360,390,412,768]){
  await page.setViewportSize({width:br,height:800});
  let schlimm=null;
  for(let n=1;n<=6;n++){
   await reg(page,n);
   const r=await page.evaluate(()=>{
    const w=$("measTypeRinneProfil");
    const raus=[];
    w.querySelectorAll("*").forEach(e=>{
     if(e.closest(".scroll")||e.closest(".ra-register"))return;
     const b=e.getBoundingClientRect();
     if(b.width>0&&b.right>document.documentElement.clientWidth+1)raus.push(e.className||e.tagName);
    });
    return {raus:raus.slice(0,3),scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
   });
   if(r.raus.length||r.scroll)schlimm={register:n,...r};
  }
  p(!schlimm,"Breite "+br+" px: kein seitlicher Überlauf",schlimm);
 }
 await page.setViewportSize({width:1280,height:900});

 p(fehler.length===0,"keine JavaScript-Fehler während des ganzen Laufs",fehler.slice(0,3));
 console.log("\npruefstand-rinne-zuschnitt-app: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();

// Prueft die beiden ab v2.85 verbindlichen gemeinsamen Standards:
//   A  Rollenblech-Zuschnitt: STUECKZAHL x LAENGE x ABWICKLUNG, gruppiert
//   B  PDF-Listenauswahl: EIN Dialog, gleiche Namen, gleiche Reihenfolge
//
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rollenblech-pdf-v2-85.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};
// Klick ueber evaluate mit Pruefung: ein fehlendes oder gesperrtes Element
// soll sauber fehlschlagen und nicht in einen Timeout laufen - ein
// abgebrochener Pruefstand sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(120);
 return r;
}

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
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
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12, 3011 Bern",
                order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[];
  einlaufblechSettings={stoss_laenge:2000,ueberlappung:70,gehrungszugabe:100,
    umschlag_oben:12,umschlag_unten:12,rest_schwelle:500,end_zugabe:10,gava_abstand:500};
  companyName="Peter Künzi AG"; companyAddress="Industriestrasse 8, 3006 Bern"; logoUrl=null;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // ==========================================================================
 // A · Gemeinsame Rollenblech-Komponente (Auftrag 10, Tests 1-16)
 // ==========================================================================
 console.log("\nA · Zuschnittliste: STUECKZAHL × LAENGE × ABWICKLUNG");
 // Ein Plan wird von Hand gestellt - so haengt der Test nicht daran, was ein
 // einzelnes Modul gerade rechnet, sondern prueft die Darstellung selbst.
 const plan=(streifen,moeglich,breite,extra)=>Object.assign({
   art:"rolle",einheit:"Stück",streifenbreiten:[breite],
   gruppen:[{breite,tafelLaenge:2000,streifen}],
   moeglich:moeglich||[{breite,jeTafel:4,tafeln:2,flaeche:4,verschnitt:1,anteil:25}],
   netto:3,optimal:true},extra||{});
 const liste=async pl=>page.evaluate(x=>{
   const d=document.createElement("div"); d.innerHTML=zuschnittHtml(x);
   const box=d.querySelector(".zu-liste");
   return {kopf:box?(box.querySelector(".zu-liste-kopf")||{}).textContent||"":null,
     fuss:box?(box.querySelector(".zu-liste-fuss")||{}).textContent||"":null,
     zeilen:box?Array.from(box.querySelectorAll(".zu-zeile")).map(z=>({
       anzahl:(z.querySelector(".zu-anzahl")||{}).textContent.trim(),
       mass:(z.querySelector(".zu-mass")||{}).textContent.replace(/\s+/g," ").trim(),
       zusatz:(z.querySelector(".zu-zusatz")||{textContent:""}).textContent.replace(/\s+/g," ").trim()})):[],
     html:d.innerHTML};
  },pl);

 // 1 · ein Stueck
 let r=await liste(plan([{stuecke:[{nr:1,laenge:1850}],rest:150}],null,250));
 p(r.zeilen.length===1&&(r.zeilen[0]||{}).anzahl==="1 ×"&&/^1['’]850 × 250 mm$/.test((r.zeilen[0]||{}).mass),
   "1 · ein Stueck: \"1 × 1'850 × 250 mm\"",r.zeilen);
 // 2 · mehrere gleiche Stuecke -> EINE Zeile mit Stueckzahl
 r=await liste(plan([{stuecke:[{nr:1,laenge:1850},{nr:2,laenge:1850}],rest:0},
                     {stuecke:[{nr:3,laenge:1850}],rest:150}],null,250));
 p(r.zeilen.length===1&&(r.zeilen[0]||{}).anzahl==="3 ×",
   "2 · drei gleiche Stuecke stehen als EINE Zeile mit \"3 ×\"",r.zeilen);
 p(r.zeilen.length===1&&/Stück 1, 2, 3/.test((r.zeilen[0]||{}).zusatz),
   "12 · und die urspruenglichen Stuecknummern bleiben erhalten",(r.zeilen[0]||{}).zusatz);
 // 3 · unterschiedliche Stuecke -> laengstes zuerst
 r=await liste(plan([{stuecke:[{nr:1,laenge:980},{nr:2,laenge:1420}],rest:0},
                     {stuecke:[{nr:3,laenge:1850}],rest:150}],null,250));
 p(r.zeilen.length===3&&/1['’]850/.test((r.zeilen[0]||{}).mass)&&/980/.test((r.zeilen[2]||{}).mass||""),
   "3 · unterschiedliche Stuecke, laengstes zuerst",r.zeilen.map(z=>z.mass));
 // 4 · gleiche Laenge, unterschiedliche Abwicklung -> NICHT gruppieren
 r=await liste({art:"rolle",einheit:"Segment",streifenbreiten:[250,300],
   gruppen:[{breite:250,tafelLaenge:2000,streifen:[{stuecke:[{nr:1,laenge:1850}],rest:150}]},
            {breite:300,tafelLaenge:2000,streifen:[{stuecke:[{nr:2,laenge:1850}],rest:150}]}],
   moeglich:[{breite:1000,jeTafel:3,tafeln:2,flaeche:4,verschnitt:1,anteil:25}],netto:3,optimal:true});
 p(r.zeilen.length===2&&r.zeilen.every(z=>z.anzahl==="1 ×")
   &&/× 250/.test(r.zeilen.map(z=>z.mass).join())&&/× 300/.test(r.zeilen.map(z=>z.mass).join()),
   "4 · gleiche Laenge + andere Abwicklung wird NICHT gruppiert",r.zeilen.map(z=>z.mass));
 // 5/6 · gleiche Laenge + gleiche Abwicklung -> gruppieren, Stueckzahl stimmt
 r=await liste(plan([{stuecke:[{nr:1,laenge:1420},{nr:2,laenge:1420}],rest:0}],null,250));
 p(r.zeilen.length===1&&(r.zeilen[0]||{}).anzahl==="2 ×",
   "5/6 · gleiche Laenge + gleiche Abwicklung: eine Zeile, Stueckzahl 2",r.zeilen);
 // 13 · Gehrungen trennen die Gruppe und bleiben lesbar
 r=await liste(plan([{stuecke:[{nr:1,laenge:1850,merkmal:"Gehrung links"},
                               {nr:2,laenge:1850}],rest:0}],null,250));
 p(r.zeilen.length===2&&/Gehrung links/.test(r.zeilen.map(z=>z.zusatz).join(" ")),
   "13 · gleiche Laenge, aber Gehrung: getrennte Zeilen, Gehrung steht da",r.zeilen);
 // 14 · konische Stuecke: gleiche Laenge, aber andere Masse -> zwei Zeilen
 r=await liste(plan([{stuecke:[{nr:1,laenge:2000,merkmal:"Mass 120 / 150 mm"},
                               {nr:2,laenge:2000,merkmal:"Mass 150 / 180 mm"}],rest:0}],null,250));
 p(r.zeilen.length===2&&r.zeilen.every(z=>z.anzahl==="1 ×"),
   "14 · konische Stuecke mit anderen Massen werden NICHT zusammengefasst",r.zeilen);
 p(r.zeilen.length===2&&/Mass 120 \/ 150 mm/.test((r.zeilen[0]||{}).zusatz)&&/Mass 150 \/ 180 mm/.test((r.zeilen[1]||{}).zusatz),
   "   und beide Masse stehen dabei",r.zeilen.map(z=>z.zusatz));
 // 7 · keine Rolle breit genug -> laut sagen, nicht still rechnen
 r=await liste(plan([{stuecke:[{nr:1,laenge:1850}],rest:150}],[],250,{zuSchmal:[200]}));
 p(/Keine hinterlegte Rollenbreite/.test(r.html)&&/Zu schmal/.test(r.html),
   "7 · keine Rolle breit genug wird in der HAUPTansicht gesagt");
 p(!/details[^>]*open/.test(r.html),"   und zwar ausserhalb der Einzelheiten");
 // 8 · mehrere Rollenbreiten -> Vergleichstabelle, beste Zeile zuerst
 r=await liste(plan([{stuecke:[{nr:1,laenge:1850}],rest:150}],
   [{breite:1000,jeTafel:4,tafeln:2,flaeche:4,verschnitt:1,anteil:25},
    {breite:670,jeTafel:2,tafeln:4,flaeche:5.4,verschnitt:2.4,anteil:44}],250));
 p(/Rollenblech 1['’]000 mm/.test(r.kopf),"8 · der Kopf nennt die beste Rollenbreite",r.kopf);
 p(/ra-dila-zeile/.test(r.html),"   und die Vergleichstabelle hebt die beste Zeile hervor");
 // 9/10 · Tafellaenge und Anzahl Tafeln stehen in der Fusszeile
 p(/2 Tafeln à 2['’]000 mm/.test(r.fuss),"9/10 · Fusszeile: Anzahl Tafeln à Tafellaenge",r.fuss);
 // 11 · Verschnitt
 p(/Verschnitt/.test(r.html),"11 · Verschnitt wird ausgewiesen");
 // 9b · Der Rollenvergleich nennt die TAFELLAENGE, nicht die Tafelflaeche.
 const spalten=await page.evaluate(()=>{
  const pl={art:"rolle",einheit:"Stück",streifenbreiten:[250],
   gruppen:[{breite:250,tafelLaenge:2070,streifen:[{stuecke:[{nr:1,laenge:2070}],rest:0}]}],
   moeglich:[{breite:1000,jeTafel:4,tafeln:1,flaeche:2.07,verschnitt:0.78,anteil:38},
             {breite:670,jeTafel:2,tafeln:2,flaeche:2.77,verschnitt:1.48,anteil:53}],
   netto:1.29,tafelLaenge:2070,optimal:true};
  const d=document.createElement("div"); d.innerHTML=zuschnittHtml(pl);
  d.querySelectorAll("details").forEach(x=>x.open=true);
  const tab=Array.from(d.querySelectorAll("table")).find(t=>/Rolle/.test(t.textContent));
  // Und dasselbe im Ausdruck.
  const dr=document.createElement("div");
  dr.innerHTML=zuDruckHtml({tafelLaenge:2070,moeglich:pl.moeglich,
    streifen:[{stuecke:[{nr:1,laenge:2070}],rest:0}],optimal:true},250,"Stück");
  const tabDr=Array.from(dr.querySelectorAll("table")).find(t=>/Rollenbreite/.test(t.textContent));
  // Freies Profil: zwei verschiedene Tafellaengen in einer Zeile
  const mehr=zuTafelLaenge({zeilen:[{tafelLaenge:3000},{tafelLaenge:2000}]},null);
  return {kopf:tab?Array.from(tab.querySelectorAll("th")).map(x=>x.textContent.trim()):null,
    zeile:tab?Array.from(tab.querySelectorAll("tbody tr")[0].querySelectorAll("td")).map(x=>x.textContent.trim()):null,
    kopfDr:tabDr?Array.from(tabDr.querySelectorAll("th")).map(x=>x.textContent.trim()):null,
    zeileDr:tabDr?Array.from(tabDr.querySelectorAll("tbody tr")[0].querySelectorAll("td")).map(x=>x.textContent.trim()):null,
    mehr};
 });
 p(spalten.kopf&&spalten.kopf.indexOf("Tafellänge")===3&&spalten.kopf.indexOf("Fläche")<0,
   "9b · der Rollenvergleich nennt die Tafellaenge statt der Tafelflaeche",spalten.kopf);
 p(spalten.zeile&&/^2[’'´]?070\s*mm$/.test(spalten.zeile[3]||""),
   "   und zwar als Mass in mm",spalten.zeile);
 p(spalten.kopfDr&&spalten.kopfDr[3]==="Tafellänge (mm)"&&spalten.kopfDr.every(x=>!/Tafelfläche/.test(x)),
   "   im Ausdruck genauso",spalten.kopfDr);
 p(spalten.zeileDr&&/^2[’'´]?070$/.test(spalten.zeileDr[3]||""),
   "   mit demselben Wert",spalten.zeileDr);
 p(/3[’'´]?000/.test(spalten.mehr)&&/2[’'´]?000/.test(spalten.mehr),
   "   mehrere Tafellaengen (Freies Profil) stehen alle da",spalten.mehr);

 // 16 · leere Liste
 r=await liste({art:"rolle",einheit:"Stück",streifenbreiten:[250],gruppen:[],moeglich:[],
   leer:"Noch nichts zuzuschneiden.",netto:0,optimal:true});
 p(r.zeilen.length===0&&/Noch nichts zuzuschneiden/.test(r.html),
   "16 · leere Liste sagt das und erfindet nichts");
 // 15 · Rinne bleibt eigene Logik (Normlaengen, keine Streifenbreite)
 const rinne=await page.evaluate(()=>{
  const pl={art:"stange",einheit:"Stück",breite:330,normen:[6000],
    stangen:[{laenge:6000,stuecke:[{nr:1,laenge:3835},{nr:2,laenge:2000}],rest:165}],
    gesamt:6000,summeStuecke:5835,verschnitt:165,optimal:true};
  const d=document.createElement("div"); d.innerHTML=zuschnittHtml(pl);
  d.querySelectorAll("details").forEach(x=>x.open=true);
  return {kennzahl:(d.querySelector(".zu-kennzahlen .ra-wert")||{}).textContent,
    fuss:(d.querySelector(".zu-liste-fuss")||{}).textContent,
    html:d.innerHTML};
 });
 p(rinne.kennzahl==="entfällt"&&/kein Streifen von der Rolle/.test(rinne.html),
   "15 · Rinne Halbrund: Streifenbreite \"entfaellt\", eigene Normlaengenlogik",rinne.kennzahl);
 p(/1 Stange/.test(rinne.fuss),"   und die Fusszeile zaehlt Stangen, keine Tafeln",rinne.fuss);

 // ==========================================================================
 // A2 · Blechlager firmenweit, Auswahl je Massaufnahme
 // ==========================================================================
 console.log("\nA2 · Rollen fuer diese Massaufnahme");
 // Das Lager steht in den ALLGEMEINEN Einstellungen, nicht mehr unter
 // "Massaufnahmen -> Einlaufblech gerade".
 await page.evaluate(()=>{blechRollenbreiten=[1000,670];
  if(typeof renderBlechRollenbreiten==="function")renderBlechRollenbreiten()});
 const ort=await page.evaluate(()=>{
  const box=$("eb_rollenbreiten");
  const panel=box?box.closest("[data-settings-panel]"):null;
  return {panel:panel?panel.dataset.settingsPanel:null,
    kaestchen:box?box.querySelectorAll("input").length:0};
 });
 p(ort.panel==="general","der Blechlager-Kasten steht in Einstellungen -> Allgemein",ort);
 p(ort.kaestchen===7,"mit allen sieben waehlbaren Rollenbreiten",ort.kaestchen);

 await page.evaluate(()=>{
  blechRollenbreiten=[1000,670,500];
  $("measurementEditModal").hidden=false;
  $("measType").value="einlaufblech_gerade"; showMeasTypeSection("einlaufblech_gerade");
  ebA=ebaLeer(); ebA.material="2"; ebA.abwicklung=250; ebA.massA=120; ebA.winkel=30;
  ebA.stuecke=[{laenge:1850},{laenge:1850},{laenge:1420}];
  ebaSetzeSchritt(4);
 });
 await page.waitForTimeout(200);
 const lager=await page.evaluate(()=>({
   kasten:!!document.querySelector("#einlaufblechAufnahme details.zu-rollen"),
   kaestchen:document.querySelectorAll("#einlaufblechAufnahme [data-eba-rolle]").length,
   an:Array.from(document.querySelectorAll("#einlaufblechAufnahme [data-eba-rolle]"))
      .filter(e=>e.checked).map(e=>Number(e.getAttribute("data-eba-rolle"))),
   aktiv:ebaRollenAktiv(),
   moeglich:ebaRollenPlan().moeglich.map(x=>x.breite)}));
 p(lager.kasten,"im Register Zuschnitt steht der aufklappbare Auswahlkasten");
 p(lager.kaestchen===3&&lager.an.join()==="1000,670,500",
   "er zeigt genau das Blechlager und alles ist angehakt",lager);
 p(lager.moeglich.length===3,"und es wird mit allen drei Rollen verglichen",lager.moeglich);
 // Eine Rolle abwaehlen -> sie kommt im Vergleich nicht mehr vor
 await page.evaluate(()=>{
  const e=document.querySelector('[data-eba-rolle="1000"]');
  e.checked=false; e.dispatchEvent(new Event("change",{bubbles:true}));
 });
 await page.waitForTimeout(200);
 const abgew=await page.evaluate(()=>({auswahl:ebA.rollenAuswahl,
   moeglich:ebaRollenPlan().moeglich.map(x=>x.breite),
   offen:!!document.querySelector("#einlaufblechAufnahme details.zu-rollen[open]"),
   lagerUnveraendert:blechRollenbreiten.slice()}));
 p(abgew.auswahl.join()==="670,500"&&abgew.moeglich.indexOf(1000)<0,
   "eine abgewaehlte Rolle kommt im Vergleich nicht mehr vor",abgew);
 p(abgew.offen,"der Kasten bleibt nach dem Anhaken offen",abgew.offen);
 p(abgew.lagerUnveraendert.join()==="1000,670,500",
   "das Blechlager der Firma bleibt dabei unveraendert",abgew.lagerUnveraendert);
 // Speichern und wieder oeffnen
 const rund=await page.evaluate(()=>{
  const z=ebaZusatzDaten();
  ebA=ebaLeer(); ebaFuellen(Object.assign({material:"2",abwicklung:250},z));
  return {gespeichert:(z.rollen&&z.rollen.auswahl)||null,geladen:ebA.rollenAuswahl||null,aktiv:ebaRollenAktiv()};
 });
 p(Array.isArray(rund.gespeichert)&&rund.gespeichert.join()==="670,500"
   &&Array.isArray(rund.geladen)&&rund.geladen.join()==="670,500",
   "die Auswahl wird gespeichert und beim Oeffnen wieder gesetzt",rund);
 // Eine Aufnahme von vor v2.85 kennt das Feld nicht -> ganzes Lager
 const alt=await page.evaluate(()=>{
  ebA=ebaLeer(); ebaFuellen({material:"2",abwicklung:250,pieces:[{laenge:1850}]});
  return {auswahl:ebA.rollenAuswahl,aktiv:ebaRollenAktiv()};
 });
 p(Array.isArray(alt.auswahl)&&alt.auswahl.length===0&&alt.aktiv.join()==="1000,670,500",
   "eine Aufnahme vor v2.85 rechnet unveraendert mit dem ganzen Lager",alt);
 // Alles abwaehlen darf nicht in eine leere Rechnung laufen
 const keine=await page.evaluate(()=>zuRollenGefiltert([]));
 p(keine.join()==="1000,670,500","ohne Haken wird wieder das ganze Lager gerechnet",keine);
 await page.evaluate(()=>{blechRollenbreiten=[]});

 // ==========================================================================
 // B · Gemeinsame PDF-Listenauswahl (Auftrag 10, Tests 17-28)
 // ==========================================================================
 console.log("\nB · PDF-Listenauswahl");
 // Reihenfolge und Namen sind fuer alle Module dieselben.
 const listen=await page.evaluate(()=>PDF_LISTEN.map(x=>x.nr+" "+x.name));
 p(listen.join("|")===["1 Kopf / Projekt / Adresse","2 Zusammenfassung","3 Massaufnahme / Masse",
   "4 Stückliste","5 Rollenblech-Zuschnitt","6 Ausmass","7 Materialliste",
   "8 Kontrolle / Hinweise","9 Fotos","10 Skizze"].join("|"),
   "25a · die zehn Kategorien heissen und stehen wie vereinbart",listen);

 // Jede Ueberschrift, die in einem Druck wirklich vorkommt, ist zugeordnet -
 // keine faellt in den Notnagel "masse".
 const titel=await page.evaluate(()=>{
  const raus=[];
  const quellen=[printMeasurement.toString(),printAusmass.toString(),zuDruckHtml.toString()];
  quellen.forEach(q=>{
   const re=/(?:eb|am)-section-head[^>]*">([^<$]*)</g; let m;
   while((m=re.exec(q))!==null){
    // Im Quelltext stehen Umlaute teils als \u00fc - hier wird der Text
    // geprueft, den der Browser spaeter wirklich schreibt.
    const t=m[1].replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16))).trim();
    if(t&&raus.indexOf(t)<0)raus.push(t)}
  });
  return raus.map(t=>({t,key:PDF_LISTE_FUER[pdfTitelSchluessel(t)]||null}));
 });
 p(titel.length>15,"25b · alle Abschnitts-Ueberschriften eingesammelt",titel.length);
 p(titel.every(x=>x.key),"25c · jede Ueberschrift ist ausdruecklich zugeordnet",
   titel.filter(x=>!x.key).map(x=>x.t));

 // Ein Dokument zerlegen und wieder zusammensetzen.
 const zer=await page.evaluate(()=>{
  const h=`<div class="pdf-kopf">KOPF</div>
<div class="eb-section-head">Angaben</div><table><tr><td>A</td></tr></table>
<div class="eb-section-head">Stückliste</div><table><tr><td>S</td></tr></table>
<div class="eb-section-head">Zuschnitt aus Rollenblech</div><table><tr><td>R</td></tr></table>
<div class="eb-section-head">Ausmass</div><table><tr><td>M</td></tr></table>
<div class="eb-section-head">Foto</div><div class="pdf-bild">F</div>
<div class="sketch-page"><div class="eb-section-head">Skizze</div><div class="pdf-bild">Z</div></div>`;
  const z=pdfAbschnitteZerlegen(h,"eb-section-head");
  return {kopf:z.kopf,teile:z.teile.map(t=>({titel:t.titel,key:t.key})),
   alle:pdfListenZusammenbauen(z,new Set(PDF_LISTEN_REIHENFOLGE)),
   nurRolle:pdfListenZusammenbauen(z,new Set(["kopf","rollenblech"])),
   nurAusmass:pdfListenZusammenbauen(z,new Set(["kopf","ausmass"])),
   mehrere:pdfListenZusammenbauen(z,new Set(["kopf","stueckliste","ausmass"])),
   keine:pdfListenZusammenbauen(z,new Set(["kopf"])),
   nurSkizze:pdfListenZusammenbauen(z,new Set(["kopf","skizze"])),
   verfuegbar:Array.from(pdfVerfuegbareListen(z))};
 });
 p(/KOPF/.test(zer.kopf)&&zer.teile.length===6,"26 · der Kopf steht vor der ersten Liste",zer.teile.length);
 p(zer.teile.map(t=>t.key).join(",")==="masse,stueckliste,rollenblech,ausmass,fotos,skizze",
   "die sechs Abschnitte sind richtig zugeordnet",zer.teile);
 p(/KOPF/.test(zer.nurRolle)&&/>R</.test(zer.nurRolle)&&!/>S</.test(zer.nurRolle)&&!/>M</.test(zer.nurRolle),
   "18 · nur Rollenblech: kein anderer Abschnitt wird erzeugt");
 p(/>M</.test(zer.nurAusmass)&&!/>R</.test(zer.nurAusmass),"19 · nur Ausmass");
 p(/>S</.test(zer.mehrere)&&/>M</.test(zer.mehrere)&&!/>R</.test(zer.mehrere),"20 · mehrere Listen");
 p(/KOPF/.test(zer.keine)&&!/section-head/.test(zer.keine),
   "17 · keine Liste ausgewaehlt: nur der Kopf, kein leerer Abschnitt",zer.keine.slice(0,80));
 const ausgeglichen=x=>(String(x).match(/<div\b/g)||[]).length===(String(x).match(/<\/div>/g)||[]).length;
 p(ausgeglichen(zer.nurRolle)&&ausgeglichen(zer.nurSkizze)&&ausgeglichen(zer.mehrere)&&ausgeglichen(zer.keine),
   "24 · kein Abschnitt hinterlaesst offene <div> - auch die Skizze nicht",
   {rolle:ausgeglichen(zer.nurRolle),skizze:ausgeglichen(zer.nurSkizze)});
 p(/sketch-page/.test(zer.nurSkizze)&&/>Z</.test(zer.nurSkizze)&&!/>F</.test(zer.nurSkizze),
   "   die Skizze bringt ihre eigene Umrandung mit, das Foto bleibt draussen",
   zer.nurSkizze.slice(0,120));
 // Reihenfolge: der Rollenblech-Abschnitt steht IMMER nach der Stueckliste
 const reihe=await page.evaluate(()=>{
  const h=`<div class="pdf-kopf">K</div>
<div class="eb-section-head">Ausmass</div><p>M</p>
<div class="eb-section-head">Zuschnitt aus Rollenblech</div><p>R</p>
<div class="eb-section-head">Stückliste</div><p>S</p>`;
  const z=pdfAbschnitteZerlegen(h,"eb-section-head");
  const g=pdfListenZusammenbauen(z,new Set(PDF_LISTEN_REIHENFOLGE));
  return [g.indexOf(">S<"),g.indexOf(">R<"),g.indexOf(">M<")];
 });
 p(reihe[0]<reihe[1]&&reihe[1]<reihe[2],
   "25 · Stueckliste vor Rollenblech vor Ausmass - unabhaengig davon, wie das Modul sie baut",reihe);

 // --- Der Dialog in der echten App ----------------------------------------
 console.log("\nB2 · Der Dialog");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  $("measType").value="einlaufblech_gerade";
  showMeasTypeSection("einlaufblech_gerade");
  ebA=ebaLeer(); ebA.material="2"; ebA.abwicklung=250; ebA.massA=120; ebA.winkel=30;
  ebA.stuecke=[{laenge:1850},{laenge:1850},{laenge:1420}];
  renderEinlaufblechAufnahme();
  $("measTitle").value="Halle Nord"; $("measDate").value="2026-09-04";
  setMeasProjectField(7);           // Projekt -> Objektadresse im PDF-Kopf
  window.__pdf=[]; window.__fenster=0;
  window.open=()=>{window.__fenster++;return {document:{write(h){window.__pdf.push(h)},close(){}},
    focus(){},print(){},set onload(f){}}};
  storageSignedUrl=async()=>null;
 });
 await klick(page,"#printMeasurementBtn");
 await page.waitForTimeout(250);
 const dlg=await page.evaluate(()=>({
  offen:!$("pdfListenModal").hidden,
  fenster:window.__fenster,
  eintraege:Array.from(document.querySelectorAll("#pdfListenBox [data-pdf-liste]")).map(e=>
    ({key:e.dataset.pdfListe,an:e.checked,aus:e.disabled})),
  namen:Array.from(document.querySelectorAll("#pdfListenBox .pdf-liste-name")).map(e=>e.textContent)
 }));
 p(dlg.offen,"der Dialog erscheint VOR der PDF-Erzeugung");
 p(dlg.fenster===0,"und es wird noch kein Druckfenster geoeffnet",dlg.fenster);
 p(dlg.eintraege.length===9,"neun waehlbare Listen (der Kopf ist keine)",dlg.eintraege.length);
 p(dlg.namen.join("|")==="Zusammenfassung|Massaufnahme / Masse|Stückliste|Rollenblech-Zuschnitt|Ausmass|Materialliste|Kontrolle / Hinweise|Fotos|Skizze",
   "die Namen sind die gemeinsamen",dlg.namen);
 const nichtDa=dlg.eintraege.filter(x=>x.aus).map(x=>x.key);
 p(nichtDa.indexOf("material")>=0&&nichtDa.indexOf("fotos")>=0&&nichtDa.indexOf("skizze")>=0,
   "23 · nicht vorhandene Listen sind ausgegraut",nichtDa);
 p(dlg.eintraege.filter(x=>!x.aus).every(x=>x.an),"vorhandene Listen sind vorangehakt");

 // 22 · Keine auswaehlen
 await klick(page,"#pdfListenKeine");
 let z2=await page.evaluate(()=>Array.from(document.querySelectorAll("#pdfListenBox [data-pdf-liste]")).filter(e=>e.checked).length);
 p(z2===0,"22 · \"Keine auswaehlen\" nimmt alle Haken weg",z2);
 // 21 · Alle auswaehlen (nur die vorhandenen)
 await klick(page,"#pdfListenAlle");
 z2=await page.evaluate(()=>Array.from(document.querySelectorAll("#pdfListenBox [data-pdf-liste]"))
   .filter(e=>e.checked).map(e=>e.dataset.pdfListe));
 const daKeys=dlg.eintraege.filter(x=>!x.aus).map(x=>x.key);
 p(z2.length===daKeys.length&&daKeys.every(k=>z2.indexOf(k)>=0),
   "21 · \"Alle auswaehlen\" hakt genau die vorhandenen an - keine weitere",{nach:z2,vorhanden:daKeys});

 // 18 · nur Rollenblech drucken
 await page.evaluate(()=>{document.querySelectorAll("#pdfListenBox [data-pdf-liste]").forEach(e=>{
   e.checked=e.dataset.pdfListe==="rollenblech"})});
 await klick(page,"#pdfListenOk");
 await page.waitForTimeout(250);
 const nurR=await page.evaluate(()=>({zu:$("pdfListenModal").hidden,pdf:window.__pdf[0]||"",fenster:window.__fenster}));
 p(nurR.zu,"der Dialog schliesst nach \"PDF erstellen\"");
 p(nurR.fenster===1,"und JETZT wird genau ein Druckfenster geoeffnet",nurR.fenster);
 p(/Zuschnitt aus Rollenblech/.test(nurR.pdf),"18 · der Rollenblech-Abschnitt ist im PDF");
 const koepfe=x=>{const re=/<div class="eb-section-head">([^<]*)</g,o=[];let m;
   while((m=re.exec(x))!==null)o.push(m[1]);return o};
 p(koepfe(nurR.pdf).join(",")==="Zuschnitt aus Rollenblech",
   "   und die abgewaehlten Abschnitte wurden gar nicht erzeugt",koepfe(nurR.pdf));
 p(/Bahnhofstrasse 12/.test(nurR.pdf),"26 · Kopf mit Objektadresse ist trotzdem da");
 p(!/display\s*:\s*none/.test(nurR.pdf),"   nichts wird nur per CSS versteckt");
 p(!/NaN|undefined/.test(nurR.pdf),"24 · kein NaN/undefined im PDF");

 // 17 · gar nichts auswaehlen -> nur der Kopf, kein leerer Abschnitt
 await page.evaluate(()=>{window.__pdf=[]});
 await klick(page,"#printMeasurementBtn");
 await page.waitForTimeout(200);
 await klick(page,"#pdfListenKeine");
 await klick(page,"#pdfListenOk");
 await page.waitForTimeout(200);
 const leer=await page.evaluate(()=>window.__pdf[0]||"");
 // Nicht auf "eb-section-head" pruefen: der Name steht auch im Stylesheet.
 p(/Bahnhofstrasse 12/.test(leer)&&koepfe(leer).length===0,
   "17 · ohne Auswahl bleibt nur der Kopf - kein leerer Abschnitt",
   {laenge:leer.length,koepfe:koepfe(leer),adresse:/Bahnhofstrasse/.test(leer)});

 // Abbrechen
 await page.evaluate(()=>{window.__pdf=[];window.__fenster=0});
 await klick(page,"#printMeasurementBtn");
 await page.waitForTimeout(200);
 await klick(page,"#pdfListenAbbrechen");
 await page.waitForTimeout(200);
 const ab=await page.evaluate(()=>({zu:$("pdfListenModal").hidden,pdf:window.__pdf.length,fenster:window.__fenster}));
 p(ab.zu&&ab.pdf===0&&ab.fenster===0,"Abbrechen erzeugt kein PDF und kein Fenster",ab);

 // 25 · derselbe Dialog beim Ausmass
 await page.evaluate(()=>{
  window.__pdf=[];window.__fenster=0;
  $("measurementEditModal").hidden=true;
  $("ausmassEditModal").hidden=false;
  $("amType").value="offerte_erfassen";
  if(typeof showAmTypeSection==="function")showAmTypeSection("offerte_erfassen");
 });
 // NICHT abwarten: printAusmass haelt an, bis der Dialog beantwortet ist.
 await page.evaluate(()=>{
  printAusmass({id:5,type:"offerte_erfassen",title:"Offerte",date:"2026-09-04",
    project_id:7,note:"Bemerkung",
    positions:[{pos:"1",description:"Rinne",quantity:12,unit:"m"}]});
 });
 await page.waitForTimeout(300);
 const amDlg=await page.evaluate(()=>({
  offen:!$("pdfListenModal").hidden,
  namen:Array.from(document.querySelectorAll("#pdfListenBox .pdf-liste-name")).map(e=>e.textContent),
  da:Array.from(document.querySelectorAll("#pdfListenBox [data-pdf-liste]")).filter(e=>!e.disabled).map(e=>e.dataset.pdfListe)
 }));
 p(amDlg.offen,"25 · das Ausmass benutzt denselben Dialog");
 p(amDlg.namen.length===9&&amDlg.namen[3]==="Rollenblech-Zuschnitt",
   "   mit denselben Namen in derselben Reihenfolge",amDlg.namen);
 p(amDlg.da.join(",")==="stueckliste,kontrolle",
   "   und nur den Listen, die ein Ausmass wirklich hat",amDlg.da);
 await klick(page,"#pdfListenOk");
 await page.waitForTimeout(200);
 const amFertig=await page.evaluate(()=>window.__pdf[0]||"");
 p(/Positionen/.test(amFertig)&&/Bahnhofstrasse 12/.test(amFertig),
   "   das Ausmass-PDF entsteht mit Kopf und Positionen");

 // 27 · Seitenumbrueche bleiben erhalten
 p(/break-inside|page-break/.test(await page.evaluate(()=>PDF_LAYOUT_CSS)),
   "27 · die Umbruchregeln stehen unveraendert im Druck-Stylesheet");

 // 28 · keine JavaScript-Fehler
 p(fehler.length===0,"28 · kein einziger JavaScript-Fehler in der ganzen Sitzung",fehler.slice(0,3));

 console.log("\npruefstand-rollenblech-pdf: "+ok+"/"+(ok+fail)+
   (fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();

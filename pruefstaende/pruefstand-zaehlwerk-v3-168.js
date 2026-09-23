// Prueft v3.168 und v3.169: Das Zaehlwerk - die App ordnet nach der eigenen
// Benutzung und sagt dazu, worauf sie sich stuetzt.
//
// WORUM ES GEHT
// Der Materialkatalog hat mehrere hundert Positionen, die EDV-Nr.-Suche
// zeigt davon fuenfzehn - bisher in Katalogreihenfolge. Welche fuenfzehn,
// hatte mit dem Betrieb nichts zu tun.
//
// DIE VIER REGELN, DIE DAS UNGEFAEHRLICH MACHEN - UND WO SIE GEPRUEFT SIND
//   1. Nie verstecken, nur sortieren   -> C1, C2, C4
//   2. Immer die Zahl dazu             -> D1 bis D3
//   3. Nie eine Zahl selbst setzen     -> C5 (der Katalog bleibt unberuehrt)
//   4. Je Firma                        -> Sache der RLS; E3 haelt fest, dass
//      die Sicht mit security_invoker laeuft und der Client nicht selbst
//      nach company_id filtert.
//
// WAS HIER GEPRUEFT WIRD
//   A  Die Zaehlung einlesen: Normalisierung, kaputte Zeilen, Doppelte.
//   B  zwNachNutzung: stabile Ordnung, Kopie statt Umbau.
//   C  searchMaterials: dieselben Treffer, dieselbe Obergrenze, andere
//      Reihenfolge - und OHNE Zaehlwerk exakt das Verhalten von vorher.
//   D  Der Hinweis am Vorschlag.
//   E  Gegenproben zur Reichweite und zum Ausfall.
//   G  v3.169: Material je Massaufnahme-Art - die Art zaehlt zuerst, die
//      Gesamtzaehlung danach, die Katalogreihenfolge zuletzt.
//   H  v3.169: Ausmass-Positionen. Hier gilt ZUSAETZLICH eine Schwelle:
//      dies ist eine Behauptung ueber ein Muster, nicht blosse
//      Reihenfolge - aus einem einzigen Ausmass etwas zu folgern, waere
//      geraten. Und es wird NICHTS ausgeblendet (H5).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-zaehlwerk-v3-168.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 // Ein ueberschaubarer Katalog, dessen Reihenfolge man von Hand nachrechnen
 // kann. Die EDV-Nr. traegt absichtlich denselben Anfang - so greift die
 // Trefferbedingung bei allen, und gemessen wird wirklich die Ordnung.
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  meineRechte={admin:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  settings.materials=[
   ["101.10","Blech A","1.0","m2",10],
   ["101.20","Blech B","1.0","m2",20],
   ["101.30","Blech C","1.0","m2",30],
   ["101.40","Blech D","1.0","m2",40]
  ];
 });

 // ---- A  Die Zaehlung einlesen -------------------------------------------
 const A=await page.evaluate(()=>{
  zwMaterialUebernehmen([
   {edv_nr:"101.30",anzahl:5,zuletzt:"2026-09-01"},
   {edv_nr:" 101.20 ",anzahl:2,zuletzt:"2026-08-01"},   // Rand-Leerzeichen
   {edv_nr:"101.20",anzahl:1,zuletzt:"2026-09-20"},     // dieselbe noch einmal
   {edv_nr:"",anzahl:9},                                 // ohne Nummer
   {edv_nr:"101.40",anzahl:0},                           // gezaehlt, aber null
   null                                                  // kaputte Zeile
  ]);
  return {
   c30:zwMaterialAnzahl("101.30"),
   c20:zwMaterialAnzahl("101.20"),
   c20gross:zwMaterialAnzahl(" 101.20"),
   c40:zwMaterialAnzahl("101.40"),
   c10:zwMaterialAnzahl("101.10"),
   unbekannt:zwMaterialAnzahl("999.99"),
   leer:zwMaterialAnzahl(""),
   nichts:zwMaterialAnzahl(null),
   zuletzt20:zwMaterialZuletzt("101.20"),
   zuletztUnbekannt:zwMaterialZuletzt("999.99")
  };
 });
 p(A.c30===5,"A1 die Zahl wird uebernommen",A);
 p(A.c20===3,"A2 dieselbe Nummer mit Rand-Leerzeichen wird ADDIERT, nicht ueberschrieben",A);
 p(A.c20gross===3,"A3 und beim Nachfragen ebenso normalisiert",A);
 p(A.c40===0&&A.c10===0&&A.unbekannt===0,
   "A4 ohne Benutzung ist die Zahl 0 - auch bei einer Zeile, die 0 meldet",A);
 p(A.leer===0&&A.nichts===0,"A5 leere und fehlende Nummern stuerzen nicht ab",A);
 p(A.zuletzt20==="2026-09-20","A6 'zuletzt' ist der SPAETERE der beiden Eintraege",A);
 p(A.zuletztUnbekannt==="","A7 ohne Wissen wird kein Datum erfunden",A);
 const A8=await page.evaluate(()=>{
  zwMaterialUebernehmen(null);
  const a=zwMaterialAnzahl("101.30");
  zwMaterialUebernehmen("quatsch");
  return {a,b:zwMaterialAnzahl("101.30")};
 });
 p(A8.a===0&&A8.b===0,"A8 eine kaputte oder fehlende Antwort ergibt eine leere Zaehlung",A8);

 // ---- B  Die Ordnung ------------------------------------------------------
 const B=await page.evaluate(()=>{
  zwMaterialUebernehmen([{edv_nr:"101.30",anzahl:5},{edv_nr:"101.20",anzahl:3}]);
  const katalogVorher=settings.materials.map(x=>x[0]);
  const geordnet=zwNachNutzung(settings.materials,x=>x[0]).map(x=>x[0]);
  return {geordnet, katalogNachher:settings.materials.map(x=>x[0]), katalogVorher};
 });
 p(B.geordnet.join(",")==="101.30,101.20,101.10,101.40",
   "B1 benutzte zuerst, danach in Katalogreihenfolge (stabil)",B);
 p(B.katalogNachher.join(",")===B.katalogVorher.join(","),
   "B2 der Katalog selbst wird NICHT umgestellt - es wird auf einer Kopie sortiert",B);
 const B3=await page.evaluate(()=>{
  zwMaterialUebernehmen([]);
  return zwNachNutzung(settings.materials,x=>x[0]).map(x=>x[0]);
 });
 p(B3.join(",")==="101.10,101.20,101.30,101.40",
   "B3 ohne jede Benutzung bleibt die Katalogreihenfolge unveraendert",B3);
 const B4=await page.evaluate(()=>({
  leer:zwNachNutzung([],x=>x[0]).length,
  kaputt:zwNachNutzung(null,x=>x[0]).length,
  ohneWahl:zwNachNutzung([["101.30"],["101.10"]]).map(x=>x[0])
 }));
 p(B4.leer===0&&B4.kaputt===0,"B4 leere und kaputte Listen ergeben eine leere Liste",B4);
 p(B4.ohneWahl.join(",")==="101.30,101.10",
   "B5 ohne eigene Auswahlfunktion wird die erste Spalte als Nummer gelesen",B4);

 // ---- C  Die Suche selbst -------------------------------------------------
 const C=await page.evaluate(()=>{
  zwMaterialUebernehmen([{edv_nr:"101.30",anzahl:5},{edv_nr:"101.20",anzahl:3}]);
  const mit=searchMaterials("101").map(x=>x[0]);
  // Gegenprobe: ohne Zaehlwerk muss exakt die alte Reihenfolge stehen.
  zwMaterialUebernehmen([]);
  const ohne=searchMaterials("101").map(x=>x[0]);
  // Die Trefferbedingung darf sich nicht aendern.
  zwMaterialUebernehmen([{edv_nr:"101.30",anzahl:5}]);
  const nachName=searchMaterials("Blech C").map(x=>x[0]);
  const daneben=searchMaterials("gibtsnicht").length;
  // Und die Obergrenze bleibt die bestehende.
  const gross=[]; for(let i=0;i<40;i++)gross.push(["2"+String(i).padStart(3,"0"),"X"+i,"","",0]);
  const alterKatalog=settings.materials;
  settings.materials=gross;
  const gekappt=searchMaterials("2").length;
  settings.materials=alterKatalog;
  return {mit,ohne,nachName,daneben,gekappt,katalog:settings.materials.map(x=>x[0])};
 });
 p(C.mit.join(",")==="101.30,101.20,101.10,101.40",
   "C1 mit Zaehlwerk stehen die benutzten oben",C);
 p(C.ohne.join(",")==="101.10,101.20,101.30,101.40",
   "C2 ohne Zaehlwerk exakt die Reihenfolge von vor v3.168",C);
 p(C.mit.length===C.ohne.length&&C.ohne.every(x=>C.mit.indexOf(x)>=0),
   "C3 es verschwindet NICHTS - dieselben Treffer, nur anders geordnet",C);
 p(C.nachName.join(",")==="101.30"&&C.daneben===0,
   "C4 die Trefferbedingung ist unveraendert (Nummer-Anfang bzw. Name)",C);
 p(C.gekappt===15,"C5 die bestehende Obergrenze von fuenfzehn gilt unveraendert",C);
 p(C.katalog.join(",")==="101.10,101.20,101.30,101.40",
   "C6 der Katalog steht danach unveraendert da - es wird keine Zahl gesetzt",C);

 // SORTIEREN VOR DEM KAPPEN - das ist der ganze Sinn der Sache.
 // Wuerde erst gekappt und dann sortiert, kaeme eine haeufig benutzte
 // Position, die im Katalog weit hinten steht, NIE in die Vorschlaege. Sie
 // waere dann nicht nur schlecht sortiert, sondern faktisch versteckt -
 // genau das, was Regel 1 verbietet. Ohne diese Pruefung sieht man den
 // Unterschied nicht: beide Fassungen liefern fuenfzehn Zeilen.
 const C7=await page.evaluate(()=>{
  const alterKatalog=settings.materials;
  const gross=[]; for(let i=0;i<40;i++)gross.push(["3"+String(i).padStart(3,"0"),"X"+i,"","",0]);
  settings.materials=gross;
  // Die dreissigste Position - weit ausserhalb der ersten fuenfzehn.
  const weitHinten=gross[29][0];
  zwMaterialUebernehmen([{edv_nr:weitHinten,anzahl:9}]);
  const treffer=searchMaterials("3").map(x=>x[0]);
  settings.materials=alterKatalog;
  return {weitHinten,treffer,anzahl:treffer.length};
 });
 p(C7.anzahl===15&&C7.treffer[0]===C7.weitHinten,
   "C7 eine haeufig benutzte Position weit hinten im Katalog kommt nach VORNE - "
   +"sortiert wird vor dem Kappen, sonst waere sie versteckt",C7);

 // ---- D  Der Hinweis am Vorschlag ----------------------------------------
 const D=await page.evaluate(()=>{
  zwMaterialUebernehmen([{edv_nr:"101.30",anzahl:5},{edv_nr:"101.20",anzahl:1}]);
  return {
   fuenf:zwMaterialText("101.30"),
   eins: zwMaterialText("101.20"),
   keine:zwMaterialText("101.10"),
   htmlMit:materialNutzungHinweis("101.30"),
   htmlOhne:materialNutzungHinweis("101.10")
  };
 });
 p(D.fuenf==="5× benutzt"&&D.eins==="1× benutzt","D1 der Hinweis nennt die Zahl",D);
 p(D.keine===""&&D.htmlOhne==="",
   "D2 ohne Benutzung steht KEIN '0× benutzt' da - das waere eine Aussage ueber nichts",D);
 p(/5× benutzt/.test(D.htmlMit)&&/zw-zahl/.test(D.htmlMit),
   "D3 und er ist im Vorschlag als solcher gekennzeichnet",D);

 // Er steht wirklich in der Vorschlagsliste des Regierapports.
 const D4=await page.evaluate(async()=>{
  mats=[{date:"",no:"",qty:0}];
  renderMain();
  const feld=document.querySelector('[data-mat-search="0"]');
  feld.value="101";
  feld.dispatchEvent(new Event("input",{bubbles:true}));
  await new Promise(f=>setTimeout(f,250));
  const box=$("matSug0");
  const zeilen=[...box.querySelectorAll(".item[data-no]")];
  return {nummern:zeilen.map(z=>z.getAttribute("data-no")),
          ersterText:zeilen[0]?zeilen[0].textContent:""};
 });
 p(D4.nummern[0]==="101.30"&&D4.nummern[1]==="101.20",
   "D4 im echten Suchfeld des Rapports stehen die benutzten oben",D4);
 p(/5× benutzt/.test(D4.ersterText),"D5 samt der Zahl, auf die sich das stuetzt",D4);

 // ---- E  Reichweite und Ausfall ------------------------------------------
 const E=await page.evaluate(async()=>{
  // Das Zaehlwerk faengt seinen Fehler selbst ab: schlaegt die Abfrage
  // fehl, kommt null zurueck - und NICHT eine geworfene Ausnahme, die das
  // ganze Laden der App mitreissen wuerde.
  const alt=sb.from.bind(sb);
  sb.from=()=>({select(){return Promise.resolve({data:null,error:{message:"kaputt"}})}});
  const beiFehler=await zaehlwerkLaden();
  sb.from=()=>({select(){throw new Error("weg")}});
  const beiAusnahme=await zaehlwerkLaden();
  sb.from=alt;
  return {beiFehler,beiAusnahme};
 });
 p(E.beiFehler===null&&E.beiAusnahme===null,
   "E1 faellt das Zaehlwerk aus, kommt null - und die App laedt weiter",E);
 const E2=await page.evaluate(()=>{
  zwMaterialUebernehmen([]);
  return searchMaterials("101").map(x=>x[0]).join(",");
 });
 p(E2==="101.10,101.20,101.30,101.40",
   "E2 und die Suche verhaelt sich dann exakt wie vor v3.168",E2);

 // Strukturpruefungen: die Mandantengrenze bleibt, wo sie hingehoert.
 const quellen={
  zaehlwerk: fs.readFileSync(path.join(process.cwd(),"js/71-zaehlwerk.js"),"utf8"),
  laden:     fs.readFileSync(path.join(process.cwd(),"js/05-daten-laden.js"),"utf8"),
  sw:        fs.readFileSync(path.join(process.cwd(),"sw.js"),"utf8"),
  html:      fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8")
 };
 p(!/company_id/.test(quellen.zaehlwerk),
   "E3 der Client filtert NICHT selbst nach Firma - das macht die RLS der Sicht");
 p(/zaehlwerkLaden\(\)/.test(quellen.laden)&&/zaehlwerk:zaehlwerkRes/.test(quellen.laden),
   "E4 das Zaehlwerk wird beim Anmelden geladen und in den Offline-Speicher gelegt");
 p(/"\.\/js\/71-zaehlwerk\.js"/.test(quellen.sw),
   "E5 die neue Datei steht in der App-Shell des Service Workers - sonst fehlt sie offline");
 p(/js\/71-zaehlwerk\.js/.test(quellen.html),
   "E6 und ist in index.html eingebunden");

 // ---- G  Material je Massaufnahme-Art (v3.169) ---------------------------
 const G=await page.evaluate(()=>{
  // Der Katalog steht in der Reihenfolge 101.10, .20, .30, .40.
  // Die Gesamtzaehlung ist ABSICHTLICH gegen die Katalogreihenfolge
  // gesetzt: 101.30 steht weiter hinten, wird aber oefter benutzt. Nur so
  // ist die zweite Stufe ueberhaupt unterscheidbar - waere die haeufigste
  // Position ohnehin die erste im Katalog, koennte man nicht sehen, ob die
  // Gesamtzaehlung mitzaehlt oder nur die stabile Ordnung durchschlaegt.
  zwMaterialUebernehmen([{edv_nr:"101.30",anzahl:50},{edv_nr:"101.10",anzahl:2}]);
  zwMaterialArtUebernehmen([
   {art:"kamineinfassung",edv_nr:"101.40",anzahl:7},
   {art:"kamineinfassung",edv_nr:"101.20",anzahl:1},
   {art:"kehle",          edv_nr:"101.10",anzahl:9},
   // Eine Zeile ohne Art. Sie kann keiner Art zugeordnet werden und wird
   // deshalb gar nicht erst aufgenommen; gefragt werden kann nach ihr
   // ohnehin nicht, weil zwMaterialAnzahlArt eine leere Art abweist.
   {art:"",               edv_nr:"101.40",anzahl:99},
   null
  ]);
  return {
   // Bei der Kamineinfassung schlaegt 101.40 (7x bei dieser Art) die
   // 101.10, obwohl die im ganzen Betrieb 50x vorkommt.
   kamin: searchMaterials("101","kamineinfassung").map(x=>x[0]),
   kehle: searchMaterials("101","kehle").map(x=>x[0]),
   // Ohne Art bleibt es bei der Gesamtzaehlung.
   ohneArt: searchMaterials("101").map(x=>x[0]),
   // Eine Art, zu der noch gar nichts bekannt ist: Rueckfall auf gesamt.
   unbekannteArt: searchMaterials("101","lukarne").map(x=>x[0]),
   zahlArt: zwMaterialAnzahlArt("kamineinfassung","101.40"),
   zahlFremd: zwMaterialAnzahlArt("kehle","101.40"),
   zahlOhneArt: zwMaterialAnzahlArt("","101.40"),
   textArt: zwMaterialTextArt("kamineinfassung","101.40"),
   textRueckfall: zwMaterialTextArt("kamineinfassung","101.30"),
   textNichts: zwMaterialTextArt("kehle","101.20")
  };
 });
 p(G.kamin[0]==="101.40"&&G.kamin[1]==="101.20",
   "G1 bei der Kamineinfassung steht vorne, was BEI DIESER ART erfasst wurde",G);
 // Die beiden uebrigen haben zu dieser Art BEIDE keine Zahl. Jetzt muss die
 // zweite Stufe entscheiden: 101.30 (50x im Betrieb) vor 101.10 (2x),
 // obwohl 101.10 im Katalog vorne steht. Ohne zweite Stufe stuenden sie in
 // Katalogreihenfolge - daran ist der Unterschied messbar.
 p(G.kamin[2]==="101.30"&&G.kamin[3]==="101.10",
   "G2 danach entscheidet die Gesamtzaehlung, nicht die Katalogreihenfolge",G);
 p(G.kehle[0]==="101.10","G3 bei einer anderen Art eine andere Reihenfolge",G);
 p(G.ohneArt[0]==="101.30"&&G.unbekannteArt[0]==="101.30",
   "G4 ohne Art und bei unbekannter Art gilt die Gesamtzaehlung",G);
 p(G.kamin.length===4&&["101.10","101.20","101.30","101.40"].every(x=>G.kamin.indexOf(x)>=0),
   "G5 es verschwindet auch hier NICHTS",G);
 p(G.zahlArt===7&&G.zahlFremd===0&&G.zahlOhneArt===0,
   "G6 die Zahl gilt je Art; eine Zeile ohne Art zaehlt gar nicht",G);
 p(G.textArt==="7× bei dieser Art","G7 der Hinweis sagt, WORAUF er sich bezieht",G);
 p(G.textRueckfall==="50× benutzt",
   "G8 ohne Zahl zur Art faellt er auf die Gesamtzaehlung zurueck",G);
 p(G.textNichts==="","G9 und ohne jede Zahl steht nichts da",G);

 // ---- H  Ausmass-Positionen (v3.169) -------------------------------------
 const H=await page.evaluate(()=>{
  zwAusmassUebernehmen([
   {text:"rinne halbrund",      vorgekommen:6,gebraucht:0},  // nie gebraucht
   {text:"  RINNE HALBRUND  ",  vorgekommen:2,gebraucht:1},  // dieselbe Position
   {text:"bleiabdeckung",       vorgekommen:5,gebraucht:1},  // selten
   {text:"einlaufblech",        vorgekommen:5,gebraucht:4},  // oft gebraucht
   {text:"geruest",             vorgekommen:2,gebraucht:0},  // zu wenige Faelle
   {text:"",                    vorgekommen:9,gebraucht:0},
   null
  ]);
  return {
   // 6+2 Vorkommen, 0+1 gebraucht -> 1*3 <= 8, also Hinweis
   zusammengefasst:zwAusmassHinweis("Rinne halbrund"),
   selten:  zwAusmassHinweis("Bleiabdeckung"),
   oft:     zwAusmassHinweis("Einlaufblech"),
   zuWenig: zwAusmassHinweis("Geruest"),
   unbekannt:zwAusmassHinweis("Gibt es nicht"),
   leer:    zwAusmassHinweis(""),
   nichts:  zwAusmassHinweis(null),
   zahlen:  zwAusmassZahlen("rinne halbrund")
  };
 });
 p(H.zahlen&&H.zahlen.vorgekommen===8&&H.zahlen.gebraucht===1,
   "H1 derselbe Text in anderer Schreibweise wird zusammengezaehlt",H);
 p(/in 7 von 8 Ausmassen nicht gebraucht/.test(H.zusammengefasst),
   "H2 der Hinweis nennt beide Zahlen - er ist nachpruefbar, nicht nur behauptet",H);
 p(H.selten!==""&&H.oft==="",
   "H3 selten gebraucht bekommt den Hinweis, oft gebraucht nicht",H);
 p(H.zuWenig==="",
   "H4 unter drei Vorkommen sagt die App NICHTS - alles andere waere geraten",H);
 p(H.unbekannt===""&&H.leer===""&&H.nichts==="",
   "H5 unbekannte, leere und kaputte Texte ergeben keinen Hinweis",H);

 // Und in der echten Ausmass-Tabelle: der Hinweis steht da, die Zeile
 // bleibt vollstaendig sichtbar und bedienbar.
 const H6=await page.evaluate(()=>{
  amPositions=[{pos:"1",description:"Rinne halbrund",quantity:0,unit:"m"},
               {pos:"2",description:"Einlaufblech",  quantity:0,unit:"m"}];
  renderAmPositionsTable();
  const zeilen=[...$("amPositionsBody").querySelectorAll("tr")];
  const eingabe=$("amPositionsBody").querySelector('[data-am-qty="0"]');
  return {
   zeilen:zeilen.length,
   hinweise:zeilen.map(z=>{const h=z.querySelector(".zw-selten");return h?h.textContent.trim():null}),
   // Die Zeile mit dem Hinweis ist NICHT versteckt und NICHT gesperrt.
   sichtbar:zeilen[0]?zeilen[0].style.display!=="none":false,
   bedienbar:!!(eingabe&&!eingabe.disabled&&!eingabe.readOnly)
  };
 });
 p(H6.zeilen===2&&/nicht gebraucht/.test(H6.hinweise[0]||""),
   "H6 in der echten Tabelle steht der Hinweis an der richtigen Zeile",H6);
 p(H6.hinweise[1]===null,
   "H7 an der oft gebrauchten Position steht keiner",H6);
 p(H6.sichtbar&&H6.bedienbar,
   "H8 die Zeile bleibt sichtbar UND bedienbar - es wird nichts ausgeblendet "
   +"und nichts gesperrt",H6);

 // Ohne Zaehlwerk verhaelt sich die Tabelle wie vor v3.169.
 const H9=await page.evaluate(()=>{
  zwAusmassUebernehmen([]);
  renderAmPositionsTable();
  return $("amPositionsBody").querySelectorAll(".zw-selten").length;
 });
 p(H9===0,"H9 ohne Zaehlwerk steht kein einziger Hinweis da",H9);

 // Strukturpruefung: die beiden neuen Zaehlungen werden ebenfalls geladen.
 const laden2=fs.readFileSync(path.join(process.cwd(),"js/05-daten-laden.js"),"utf8");
 p(/zaehlwerkArtLaden\(\)/.test(laden2)&&/zaehlwerkAusmassLaden\(\)/.test(laden2)
   &&/zaehlwerkArt:zwArtRes/.test(laden2)&&/zaehlwerkAusmass:zwAmRes/.test(laden2),
   "H10 beide neuen Zaehlungen werden geladen und offline gesichert");

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

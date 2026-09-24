// Prueft v3.174: "Was die App gelernt hat" - die Uebersicht und der
// Schalter, mit dem sich der Zaehlung widersprechen laesst.
//
// WORUM ES GEHT
// Bis v3.173 war die Zaehlung nur an ihren Wirkungen zu erkennen: eine
// andere Reihenfolge in der Suche, ein Chip am Feld. Wer wissen wollte,
// WORAUF sich das stuetzt, musste die Hinweise einzeln aufsuchen.
//
// ZWEI DINGE, DIE HIER AUSEINANDERGEHALTEN WERDEN MUESSEN
//   1. Der Schalter sperrt die HINWEISE, nicht die Zaehlung. Die
//      Uebersicht muss auch bei abgeschaltetem Zaehlwerk zeigen, was
//      gezaehlt wurde - sonst koennte niemand nachsehen, worauf er gerade
//      verzichtet. Deshalb liest js/72 die rohen Bestaende und NICHT die
//      gesperrten Abfragefunktionen.
//   2. Abgeschaltet muss sich die App wie vor v3.168 verhalten - in ALLEN
//      sechs Wirkungen, nicht nur in der, an die man gerade denkt.
//
// WAS HIER GEPRUEFT WIRD
//   A  Der Schalter sperrt alle sechs Wirkungen.
//   B  ... und die Uebersicht zeigt trotzdem alles.
//   C  Die fuenf Abschnitte: Inhalt, Obergrenze, ehrlicher Leertext.
//   D  Erreichbarkeit aus beiden Ansichten, Struktur.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-zaehlwerk-uebersicht-v3-174.js
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

 // Ein ueberschaubarer, von Hand nachrechenbarer Bestand in allen fuenf
 // Zaehlungen.
 const fuellen=async()=>await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"c1"};
  meineRechte={admin:true};
  settings.materials=[["101.10","Spenglerschraube"],["101.30","Nietmutter"],
                      ["205.00","Dichtband"]];
  measurementMaterials=[{id:"3",name:"Prefa 0.7 braun"}];
  allProjects=[{id:1,customer:"Muster AG",zugeteilt_an:["u2"]},
               {id:2,customer:"Muster AG",zugeteilt_an:["u2"]}];
  zwMaterialUebernehmen([
   {edv_nr:"101.30",anzahl:9,zuletzt:"2026-09-20"},
   {edv_nr:"101.10",anzahl:2,zuletzt:"2026-09-01"}]);
  zwMaterialArtUebernehmen([{art:"kehle",edv_nr:"205.00",anzahl:4}]);
  zwAusmassUebernehmen([{text:"Blitzschutz demontieren",vorgekommen:6,gebraucht:1},
                        {text:"Rinne reinigen",vorgekommen:6,gebraucht:6}]);
  zwMesswertUebernehmen([{art:"kehle",feld:"ueberlappung",wert:120,anzahl:5,zuletzt:"2026-09-01"}]);
  zwAuswahlUebernehmen([{art:"freies_profil",feld:"material",wert:"3",anzahl:3,zuletzt:"2026-09-01"}]);
 });
 await fuellen();

 // ---- A  Der Schalter sperrt alle sechs Wirkungen -------------------------
 const wirkungen=async()=>await page.evaluate(()=>({
  sortierung:zwMaterialAnzahl("101.30"),
  jeArt:zwMaterialAnzahlArt("kehle","205.00"),
  ausmass:zwAusmassHinweis("Blitzschutz demontieren"),
  messwert:zwMesswertRichtwert("kehle","ueberlappung"),
  auswahl:zwAuswahlHaeufigste("freies_profil","material"),
  zuteilung:zwZuteilungVorschlag({id:9,customer:"Muster AG"}).length,
  text:zwMaterialText("101.30")
 }));
 const An=await wirkungen();
 p(An.sortierung===9&&An.jeArt===4&&/6 von 6|5 von 6/.test(An.ausmass)
   &&An.messwert&&An.messwert.wert===120&&An.auswahl&&An.auswahl.wert==="3"
   &&An.zuteilung===1&&/9×/.test(An.text),
   "A1 eingeschaltet wirken alle sechs Zaehlungen",An);

 await page.evaluate(()=>{ zaehlwerkAktiv=false });
 const Aus=await wirkungen();
 p(Aus.sortierung===0,"A2 aus: die Materialsuche ordnet nicht mehr nach Benutzung",Aus);
 p(Aus.jeArt===0,"A3 aus: auch nicht nach Massaufnahme-Art",Aus);
 p(Aus.ausmass==="","A4 aus: kein Ausmass-Hinweis",Aus);
 p(Aus.messwert===null,"A5 aus: kein Richtwert aus eigenen Messungen",Aus);
 p(Aus.auswahl===null,"A6 aus: kein Auswahl-Vorschlag",Aus);
 p(Aus.zuteilung===0,"A7 aus: kein Zuteilungs-Vorschlag",Aus);
 p(Aus.text==="","A8 aus: und kein Hinweistext - das ist genau das "
   +"Verhalten von vor v3.168",Aus);

 // ---- B  Die Uebersicht zeigt trotzdem alles ------------------------------
 const B=await page.evaluate(()=>{
  openZaehlwerk();
  const t=$("zaehlwerkBody").textContent;
  return {offen:!$("zaehlwerkModal").hidden,
          text:t,
          hakenAn:$("zwuAktiv")?$("zwuAktiv").checked:null};
 });
 p(B.offen,"B1 die Uebersicht oeffnet sich",B.offen);
 p(/101\.30/.test(B.text)&&/Nietmutter/.test(B.text)&&/9×/.test(B.text),
   "B2 sie zeigt die Materialzaehlung, OBWOHL der Schalter aus ist - sonst "
   +"koennte niemand nachsehen, worauf er gerade verzichtet",B.text.slice(0,300));
 p(/205\.00/.test(B.text)&&/120/.test(B.text)&&/Prefa 0\.7 braun/.test(B.text)
   &&/Blitzschutz demontieren/.test(B.text),
   "B3 ebenso die vier uebrigen Zaehlungen",B.text.slice(0,400));
 p(B.hakenAn===false,"B4 der Schalter steht auf aus",B);

 // ---- C  Die Abschnitte ---------------------------------------------------
 const C=await page.evaluate(()=>{
  zaehlwerkAktiv=true;
  const roh={
   ausmassNurMitMenge:(()=>{ zwuZeichnen();
     return $("zaehlwerkBody").textContent })()
  };
  // Leerer Bestand: der Text muss ehrlich sagen, dass nichts da ist.
  zwMaterialUebernehmen([]); zwMaterialArtUebernehmen([]);
  zwAusmassUebernehmen([]); zwMesswertUebernehmen([]); zwAuswahlUebernehmen([]);
  zwuZeichnen();
  const leer=$("zaehlwerkBody").textContent;
  // Obergrenze: mehr Zeilen als ZWU_ZEILEN
  const viele=[];
  for(let i=0;i<ZWU_ZEILEN+5;i++)viele.push({edv_nr:"9"+i,anzahl:100-i,zuletzt:"2026-09-01"});
  zwMaterialUebernehmen(viele);
  zwuZeichnen();
  const gekappt=$("zaehlwerkBody");
  return {mitMenge:roh.ausmassNurMitMenge, leer:leer,
          zeilen:gekappt.querySelectorAll(".zwu-tab tbody tr").length,
          mehrText:gekappt.querySelector(".zwu-mehr")
            ?gekappt.querySelector(".zwu-mehr").textContent:"",
          obenSteht:gekappt.querySelector(".zwu-tab tbody tr td").textContent};
 });
 p(/Blitzschutz demontieren/.test(C.mitMenge)&&!/Rinne reinigen/.test(C.mitMenge),
   "C1 beim Ausmass steht nur, was regelmaessig LEER bleibt - eine Position, "
   +"die immer eine Menge bekommt, ist keine Meldung wert",C.mitMenge.slice(0,300));
 p(/Noch nichts gezählt/.test(C.leer),
   "C2 ohne Bestand steht da, dass nichts gezaehlt ist - es wird nichts erfunden",
   C.leer.slice(0,300));
 p(C.zeilen===12,
   "C3 lange Listen werden auf "+12+" Zeilen gekappt",C);
 p(/und \d+ weitere/.test(C.mehrText),
   "C4 und der Rest wird BEZIFFERT statt verschwiegen (Regel 1)",C.mehrText);
 p(/^90/.test(C.obenSteht.trim()),
   "C5 oben steht das meistbenutzte",C.obenSteht);

 // ---- D  Erreichbarkeit und Struktur -------------------------------------
 const D=await page.evaluate(()=>{
  const mehr=(typeof a2SeiteMehr==="function")?a2SeiteMehr():"";
  return {ausMehr:/data-a2-tu="zaehlwerk"/.test(mehr),
          knopfKlassisch:!!document.getElementById("navZaehlwerk"),
          modal:!!document.getElementById("zaehlwerkModal"),
          hilfe:!!document.querySelector('#zaehlwerkModal [data-hilfe="zaehlwerk"]')};
 });
 p(D.ausMehr,"D1 in der neuen Ansicht steht der Eintrag unter Mehr",D);
 p(D.knopfKlassisch,"D2 in der klassischen Ansicht steht ein eigener Knopf",D);
 p(D.modal&&D.hilfe,"D3 das Fenster hat einen Info-Knopf",D);

 const quelle=fs.readFileSync(path.join(process.cwd(),"js/72-zaehlwerk-uebersicht.js"),"utf8");
 p(!/zwMaterialAnzahl\(|zwMesswertRichtwert\(|zwAuswahlHaeufigste\(|zwAusmassHinweis\(/.test(quelle),
   "D4 die Uebersicht liest die ROHEN Bestaende, nie die gesperrten "
   +"Abfragefunktionen - sonst waere sie bei abgeschaltetem Zaehlwerk leer");
 const sw=fs.readFileSync(path.join(process.cwd(),"sw.js"),"utf8");
 p(/js\/72-zaehlwerk-uebersicht\.js/.test(sw),
   "D5 die neue Datei steht in der App-Shell des Service Workers - sonst "
   +"fehlt sie ohne Verbindung");
 const idx=fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8");
 p(/<script src="js\/72-zaehlwerk-uebersicht\.js"><\/script>/.test(idx),
   "D6 und ist in index.html eingebunden");
 const hilfe=fs.readFileSync(path.join(process.cwd(),"js/41-hilfe.js"),"utf8");
 p(/"zaehlwerk":\{titel:"Was die App gelernt hat"/.test(hilfe)
   &&/zweite Wahrheit/.test(hilfe),
   "D7 der Hilfetext erklaert, warum sich hier nichts korrigieren laesst");

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

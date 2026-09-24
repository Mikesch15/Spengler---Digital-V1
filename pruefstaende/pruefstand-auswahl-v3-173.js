// Prueft v3.173: das Zaehlwerk lernt auch die AUSWAHLFELDER.
//
// WORUM ES GEHT
// v3.172 zaehlt gemessene Zahlen. Drei Module haben davon nichts, was ein
// Firmen-Richtwert waere - Einlaufblech konisch, Freies Profil und Rinne
// (Profil) rechnen ihre Standardwerte direkt aus den Einstellungen und
// fragen sie im Formular gar nicht ab. Was sie sehr wohl haben, wie alle
// anderen auch, sind Auswahlen, die im Betrieb fast immer gleich
// ausfallen: das Material vor allem, dazu Abwicklung und Montageseite.
//
// DER HEIKLE PUNKT
// Bei den Zahlenfeldern hat v3.65 das stille Vorausfuellen abgeschafft.
// Bei den Auswahlen steht bis heute eine FEST EINPROGRAMMIERTE Vorgabe da
// (ebaLeer: Abwicklung 250, Montage "links"; keaLeer: Abwicklung 500).
// Der Chip darf deshalb genau dann etwas sagen, wenn das Feld leer ist
// oder noch auf dieser Vorgabe steht - und sonst NIE. Eine eigene
// Entscheidung wird nicht kommentiert.
//
// WAS HIER GEPRUEFT WIRD
//   A  zwAuswahlHaeufigste: Schwelle, Haeufigkeit, Gleichstand, kaputte
//      Zeilen.
//   B  auswahlChip: die vier Gruende zu schweigen und der eine, etwas zu
//      sagen.
//   C  Uebernehmen: der Wert landet im <select>, der Chip verschwindet.
//   D  Die Verdrahtung an den echten Modulen - dreizehn Auswahlfelder in
//      zwoelf Arten.
//   E  Struktur und Ausfall.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-auswahl-v3-173.js
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

 // ---- A  Die Zaehlung -----------------------------------------------------
 const A=await page.evaluate(()=>{
  zwAuswahlUebernehmen([
   null, {}, {art:"kehle"}, {art:"kehle",feld:"abwicklung"},
   {art:"kehle",feld:"abwicklung",wert:"",anzahl:9},
   {art:"kehle",feld:"abwicklung",wert:"670",anzahl:0},
   // einmal gewaehlt - unter der Schwelle
   {art:"lukarne",feld:"material",wert:"7",anzahl:1,zuletzt:"2026-09-01"},
   // klare Mehrheit
   {art:"kehle",feld:"abwicklung",wert:"670",anzahl:4,zuletzt:"2026-09-01"},
   {art:"kehle",feld:"abwicklung",wert:"500",anzahl:1,zuletzt:"2026-09-20"},
   // Gleichstand: der zuletzt gewaehlte gewinnt
   {art:"freies_profil",feld:"material",wert:"3",anzahl:2,zuletzt:"2026-01-05"},
   {art:"freies_profil",feld:"material",wert:"4",anzahl:2,zuletzt:"2026-09-18"}
  ]);
  return {unbekannt:zwAuswahlHaeufigste("kehle","gibtsnicht"),
          unterSchwelle:zwAuswahlHaeufigste("lukarne","material"),
          mehrheit:zwAuswahlHaeufigste("kehle","abwicklung"),
          gleichstand:zwAuswahlHaeufigste("freies_profil","material")};
 });
 p(A.unbekannt===null,"A1 ein unbekanntes Feld liefert null",A);
 p(A.unterSchwelle===null,"A2 eine einzelne Wahl ist noch keine Gewohnheit",A);
 p(A.mehrheit&&A.mehrheit.wert==="670"&&A.mehrheit.anzahl===4&&A.mehrheit.gesamt===5,
   "A3 die haeufigste Wahl gewinnt, gesamt zaehlt alle",A);
 p(A.gleichstand&&A.gleichstand.wert==="4",
   "A4 bei Gleichstand gewinnt die zuletzt getroffene Wahl - wer das "
   +"Material gewechselt hat, bekommt nicht das alte zurueck",A);

 // ---- B  Der Chip ---------------------------------------------------------
 const B=await page.evaluate(()=>{
  measurementMaterials=[{id:"3",name:"Prefa 0.7 braun"},{id:"4",name:"Kupfer 0.6"}];
  zwAuswahlUebernehmen([
   {art:"freies_profil",feld:"material",wert:"3",anzahl:3,zuletzt:"2026-09-01"},
   {art:"einlaufblech_gerade",feld:"abwicklung",wert:"330",anzahl:4,zuletzt:"2026-09-01"},
   {art:"kehle",feld:"material",wert:"99",anzahl:5,zuletzt:"2026-09-01"},
   {art:"einlaufblech_konisch",feld:"abwicklung",wert:"250",anzahl:3,zuletzt:"2026-09-01"}
  ]);
  const zerleg=h=>{
   const d=document.createElement("div"); d.innerHTML=h;
   return [...d.querySelectorAll(".vorschlag-chip")].map(k=>({
    wert:k.dataset.vorschlagWert, fuer:k.dataset.vorschlagFuer,
    zw:k.classList.contains("zw-chip"), text:k.textContent,
    zahl:!!k.querySelector(".zw-zahl")}));
  };
  return {
   leer:zerleg(zwMaterialChip("f1","freies_profil","")),
   aufVorgabe:zerleg(zwWahlChip("f2","einlaufblech_gerade","abwicklung",250,250,w=>w+" mm",[200,250,330])),
   eigeneWahl:zerleg(zwWahlChip("f3","einlaufblech_gerade","abwicklung",200,250,w=>w+" mm",[200,250,330])),
   stehtSchonDa:zerleg(zwWahlChip("f4","einlaufblech_konisch","abwicklung",250,250,w=>w+" mm",[200,250,330])),
   nichtInListe:zerleg(zwWahlChip("f5","einlaufblech_gerade","abwicklung",250,250,w=>w+" mm",[200,250])),
   materialWeg:zerleg(zwMaterialChip("f6","kehle","")),
   nichtsGelernt:zerleg(zwMaterialChip("f7","lukarne",""))
  };
 });
 p(B.leer.length===1&&B.leer[0].wert==="3"&&B.leer[0].zw
   &&/Prefa 0\.7 braun/.test(B.leer[0].text)&&/3×/.test(B.leer[0].text),
   "B1 leeres Feld: der Chip nennt den Materialnamen und die Zahl dazu",B.leer);
 p(B.aufVorgabe.length===1&&B.aufVorgabe[0].wert==="330"
   &&/330 mm/.test(B.aufVorgabe[0].text),
   "B2 steht das Feld noch auf der einprogrammierten Vorgabe, wird die "
   +"eigene Gewohnheit angeboten",B.aufVorgabe);
 p(B.eigeneWahl.length===0,
   "B3 hat die Person selbst etwas anderes gewaehlt, schweigt die App - "
   +"eine eigene Entscheidung wird nicht kommentiert",B.eigeneWahl);
 p(B.stehtSchonDa.length===0,
   "B4 deckt sich die Gewohnheit mit der einprogrammierten Vorgabe, bleibt "
   +"es still - der Chip haette nichts zu sagen",B.stehtSchonDa);
 p(B.nichtInListe.length===0,
   "B5 kennt die Auswahlliste den gelernten Wert nicht, entfaellt der Chip - "
   +"er waere ein Knopf ohne Wirkung",B.nichtInListe);
 p(B.materialWeg.length===0,
   "B6 dasselbe, wenn die Materialposition geloescht wurde",B.materialWeg);
 p(B.nichtsGelernt.length===0,"B7 ohne Zaehlung bleibt es leer",B.nichtsGelernt);
 p(B.leer[0].zahl,"B8 Regel 2: die Zahl steht am Chip, nachpruefbar",B.leer);

 // ---- C  Uebernehmen ------------------------------------------------------
 const C=await page.evaluate(async()=>{
  const wrap=document.createElement("div");
  wrap.innerHTML='<select id="pruefWahl"><option value=""></option>'
   +'<option value="3">Prefa 0.7 braun</option></select>'
   +zwMaterialChip("pruefWahl","freies_profil","");
  document.body.appendChild(wrap);
  const vorher=document.getElementById("pruefWahl").value;
  wrap.querySelector(".vorschlag-chip").click();
  await new Promise(f=>setTimeout(f,120));
  const nachher={wert:document.getElementById("pruefWahl").value,
                 chips:document.querySelectorAll('.vorschlag-chip[data-vorschlag-fuer="pruefWahl"]').length};
  wrap.remove();
  return {vorher,nachher};
 });
 p(C.vorher==="","C1 ohne Antippen bleibt die Auswahl leer - Regel 3",C);
 p(C.nachher.wert==="3","C2 ein Tipp waehlt genau dieses Material",C);
 p(C.nachher.chips===0,"C3 danach verschwindet der Chip",C);

 // ---- D  Die Verdrahtung an den echten Modulen ---------------------------
 const D=await page.evaluate(()=>{
  const protokoll=[];
  const echt=auswahlChip;
  auswahlChip=function(o){ protokoll.push({feldId:o&&o.feldId,art:o&&o.art,
    feld:o&&o.feld,vorgabe:o&&o.vorgabe}); return "" };
  const versuch=f=>{ try{ f() }catch(e){ protokoll.push({fehler:String(e)}) } };
  versuch(()=>raGrunddatenHtml&&raGrunddatenHtml());
  versuch(()=>ebaGrunddatenHtml&&ebaGrunddatenHtml());
  versuch(()=>ebkaGrunddatenHtml&&ebkaGrunddatenHtml());
  versuch(()=>fpaGrunddatenHtml&&fpaGrunddatenHtml());
  versuch(()=>madaGrunddatenHtml&&madaGrunddatenHtml());
  versuch(()=>keaGrunddatenHtml&&keaGrunddatenHtml());
  versuch(()=>lukaGrunddatenHtml&&lukaGrunddatenHtml());
  versuch(()=>kamaGrunddatenHtml&&kamaGrunddatenHtml());
  versuch(()=>einfaGrunddatenHtml&&einfaGrunddatenHtml());
  versuch(()=>dfaGrunddatenHtml&&dfaGrunddatenHtml());
  versuch(()=>zwMaterialChipSetzen("anb_material","anschlussblech"));
  versuch(()=>zwMaterialChipSetzen("rp_material","rinne"));
  auswahlChip=echt;
  return protokoll;
 });
 const fand=id=>D.find(x=>x.feldId===id)||null;
 p(!D.some(x=>x.fehler),"D0 alle Grunddaten-Bauer laufen durch",D.filter(x=>x.fehler));
 const materialFelder=[
  ["ra_material","rinne_halbrund"],["eba_material","einlaufblech_gerade"],
  ["ebka_material","einlaufblech_konisch"],["fpa_material","freies_profil"],
  ["mada_material","mauerabdeckung"],["kea_material","kehle"],
  ["luka_material","lukarne"],["kam_material","kamineinfassung"],
  ["einfa_material","einfassung_rund"],["dfa_material","dachfenstereinfassung"],
  ["anb_material","anschlussblech"],["rp_material","rinne"]];
 const fehlend=materialFelder.filter(([id,art])=>{
  const x=fand(id); return !x||x.art!==art||x.feld!=="material";
 });
 p(fehlend.length===0,
   "D1 alle zwoelf Materialfelder lernen unter ihrer eigenen Art",
   {fehlend:fehlend,gefunden:D.map(x=>x.feldId)});
 p(materialFelder.some(([id])=>id==="ebka_material"&&fand(id))
   &&!!fand("fpa_material")&&!!fand("rp_material"),
   "D2 die drei Module ohne Richtwerte sind dabei: Einlaufblech konisch, "
   +"Freies Profil, Rinne (Profil)",
   [fand("ebka_material"),fand("fpa_material"),fand("rp_material")]);
 p(fand("eba_abwicklung")&&fand("eba_abwicklung").art==="einlaufblech_gerade"
   &&fand("eba_abwicklung").feld==="abwicklung"
   &&String(fand("eba_abwicklung").vorgabe)==="250",
   "D3 Einlaufblech gerade: Abwicklung mit der einprogrammierten Vorgabe 250 "
   +"(ebaLeer) - nur so kann der Chip sie ueberhaupt in Frage stellen",
   fand("eba_abwicklung"));
 p(fand("eba_montage")&&String(fand("eba_montage").vorgabe)==="links",
   "D4 Einlaufblech gerade: Montageseite mit der Vorgabe links",fand("eba_montage"));
 p(fand("ebka_abwicklung")&&String(fand("ebka_abwicklung").vorgabe)==="250"
   &&fand("ebka_montage")&&String(fand("ebka_montage").vorgabe)==="links",
   "D5 Einlaufblech konisch: dieselben zwei Felder",
   [fand("ebka_abwicklung"),fand("ebka_montage")]);
 p(fand("kea_abwicklung")&&fand("kea_abwicklung").art==="kehle"
   &&String(fand("kea_abwicklung").vorgabe)==="500",
   "D6 Kehle: die Abwicklung ist gewaehlt, nicht gerechnet - Vorgabe 500 "
   +"aus keaLeer",fand("kea_abwicklung"));
 p(!fand("mada_abwicklung")&&!fand("einfa_abwicklung")&&!fand("anb_abwicklung"),
   "D7 Gegenprobe: wo die Abwicklung GERECHNET wird (Mauerabdeckung, "
   +"Einfassung rund, Anschlussblech), lernt die App sie NICHT - sie "
   +"stuende sonst als Wahl da, die niemand getroffen hat",
   D.map(x=>x.feldId));
 p(!fand("kam_deckung")&&!fand("dfa_deckung")&&!fand("luka_seite"),
   "D8 Gegenprobe: Dachdeckung und Gebaeudeseite gehoeren zum Bau, nicht "
   +"zur Gewohnheit - sie werden nicht gelernt",D.map(x=>x.feldId));

 // ---- E  Struktur ---------------------------------------------------------
 const quelle=fs.readFileSync(path.join(process.cwd(),"js/71-zaehlwerk.js"),"utf8");
 p(/from\("auswahl_nutzung"\)/.test(quelle),"E1 geladen wird die Sicht auswahl_nutzung");
 const laden=fs.readFileSync(path.join(process.cwd(),"js/05-daten-laden.js"),"utf8");
 p(/zaehlwerkAuswahlLaden\(\)/.test(laden)&&/zaehlwerkAuswahl:zwAuswRes/.test(laden),
   "E2 sie wird mitgeladen und wandert in den Offline-Zwischenspeicher");
 p(!/fehlgeschlagen=\[[^\]]*zwAuswRes/.test(laden),
   "E3 und entscheidet NICHT ueber 'Laden fehlgeschlagen'");
 const E4=await page.evaluate(()=>{
  zwAuswahlUebernehmen(null);
  return {karte:zwAuswahlHaeufigste("freies_profil","material"),
          chip:zwMaterialChip("x","freies_profil","")};
 });
 p(E4.karte===null&&E4.chip==="",
   "E4 faellt die Zaehlung aus, verhaelt sich jedes Auswahlfeld wie vor v3.173",E4);

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

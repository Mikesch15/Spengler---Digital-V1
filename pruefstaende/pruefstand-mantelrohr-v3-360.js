// v3.360: Einfassung rund – Standrohr-Ø (nur Information) und Mantelrohr-Ø (rechnerisch, aus den Einstellungen zuordenbar);
// Bemassung des Lochausschnitts (Mitte Loch bis Vorder-/Hinterkante) im Tablett.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof einfaBerechne==="function"&&typeof abwTablett==="function"&&typeof einfMantelFuer==="function");

 console.log("\nA · Zuordnung Standrohr → Mantelrohr (Einstellungen)");
 const a=await page.evaluate(()=>{
  const r={};
  einfEinstellungenSichern(Object.assign({},EINFASSUNG_STANDARD,{mantel_zuordnung:[{standrohr:100,mantel:125},{standrohr:125,mantel:150}]}));
  r.m100=einfMantelFuer(100);r.m125=einfMantelFuer("125");r.m80=einfMantelFuer(80);r.leer=einfMantelFuer("");
  einfEinstellungenSichern(Object.assign({},EINFASSUNG_STANDARD));
  r.ohne=einfMantelFuer(100);
  r.feld=!!document.getElementById("einfsMantelListe")&&!!document.getElementById("einfsMantelNeu");
  // Einstellungen: Zeilen zeichnen, lesen
  einfMantelListeZeichnen([{standrohr:100,mantel:125},{standrohr:150,mantel:175}]);
  r.zeilen=document.querySelectorAll("#einfsMantelListe [data-einfs-mantel-zeile]").length;
  r.gelesen=JSON.stringify(einfMantelListeLesen());
  document.getElementById("einfsMantelNeu").click();
  r.nachNeu=document.querySelectorAll("#einfsMantelListe [data-einfs-mantel-zeile]").length;
  r.leereZeileNichtGelesen=einfMantelListeLesen().length===2;
  return r;
 });
 p(a.m100===125&&a.m125===150&&a.m80===null&&a.leer===null&&a.ohne===null,"Zuordnung: 100→125, 125→150; keine Zuordnung = null (nichts erfunden)",a);
 p(a.feld&&a.zeilen===2&&a.nachNeu===3&&a.leereZeileNichtGelesen,"Einstellungen: Zuordnungsliste mit „＋ Zuordnung“; leere Zeilen werden nicht gespeichert",a);
 p(a.gelesen==='[{"standrohr":100,"mantel":125},{"standrohr":150,"mantel":175}]',"Zuordnung wird so gelesen/gespeichert",a.gelesen);

 console.log("\nB · Einfassung: Standrohr nur Information, Mantelrohr rechnet");
 const e=await page.evaluate(()=>{
  const r={};
  einfEinstellungenSichern(Object.assign({},EINFASSUNG_STANDARD,{mantel_zuordnung:[{standrohr:100,mantel:125}]}));
  einfA=einfaLeer();einfA.lattenabstand=330;
  Object.assign(einfA.einfassungen[0],{bez:"E1",durchmesser:125,winkel:30,a:200,b:200,c:150,anzahl:1,standrohr:100});
  const mit=einfaBerechne(einfA.einfassungen[0]);
  einfA.einfassungen[0].standrohr=999;
  const andererStand=einfaBerechne(einfA.einfassungen[0]);
  einfA.einfassungen[0].standrohr=100;einfA.einfassungen[0].durchmesser=110;
  const andererMantel=einfaBerechne(einfA.einfassungen[0]);
  r.gleich=JSON.stringify(mit)===JSON.stringify(andererStand);
  r.mantelWirkt=andererMantel.abwicklung!==mit.abwicklung||andererMantel.breiteGesamt!==mit.breiteGesamt;
  einfA.einfassungen[0].durchmesser=125;
  const v=einfaAbwVorgabe(einfA.einfassungen[0],"tablett",{nr:1});
  r.D=v.werte.D;r.uebernommen=v.uebernommen.join("|");
  r.daten=einfaDaten().einfassungen[0].standrohr;
  const dd=einfaDaten();einfA=einfaLeer();einfaFuellen(dd);r.zurueck=einfA.einfassungen[0].standrohr;
  r.ausmass=(einfaAusmassZeilen().find(z=>/Einfassung 1/.test(z.bezeichnung))||{}).herkunft||"";
  // Formularfelder + Übernahme bei Eingabe
  document.getElementById("einfa_standrohr_0")||renderEinfassungAufnahme&&0;
  return r;
 });
 p(e.gleich,"Standrohr-Ø ändert die Rechnung nicht (rein informativ)",e);
 p(e.mantelWirkt,"Mantelrohr-Ø ändert Abwicklung/Zuschnitt",e);
 p(e.D===125&&/Mantelrohr/.test(e.uebernommen)&&!/Standrohr/.test(e.uebernommen),"Abwicklungsrechner übernimmt den Mantelrohr-Ø als D",e);
 p(e.daten===100&&String(e.zurueck)==="100","Standrohr wird gespeichert und wiederhergestellt",[e.daten,e.zurueck]);
 p(/Mantelrohr Ø 125/.test(e.ausmass)&&/Standrohr Ø 100/.test(e.ausmass),"Ausmass nennt beide, Standrohr als Info",e.ausmass);

 console.log("\nC · Formular: Übernahme aus den Einstellungen");
 const f=await page.evaluate(async()=>{
  const r={};
  einfEinstellungenSichern(Object.assign({},EINFASSUNG_STANDARD,{mantel_zuordnung:[{standrohr:100,mantel:125}]}));
  einfA=einfaLeer();
  const ml=document.getElementById("measTypeEinfassungRund");
  const html=einfaEinfassungenHtml();
  const d=document.createElement("div");d.innerHTML=html;
  r.felder=!!d.querySelector("#einfa_standrohr_0")&&!!d.querySelector("#einfa_durchmesser_0")&&!!d.querySelector("#einfa_mantel_hinweis_0");
  r.labels=[...d.querySelectorAll("label")].map(x=>x.textContent).filter(x=>/rohr/i.test(x));
  // Übernahme-Logik
  einfaMantelUebernehmen(0);
  einfA.einfassungen[0].standrohr="100";
  const holder=document.createElement("div");holder.innerHTML='<input id="einfa_durchmesser_0"><div id="einfa_mantel_hinweis_0"></div>';document.body.appendChild(holder);
  einfaMantelUebernehmen(0);
  r.durchm=einfA.einfassungen[0].durchmesser;r.feld=document.getElementById("einfa_durchmesser_0").value;r.hinweis=document.getElementById("einfa_mantel_hinweis_0").textContent;
  einfA.einfassungen[0].standrohr="80";einfA.einfassungen[0].durchmesser=111;
  einfaMantelUebernehmen(0);
  r.ohneZuordnung=einfA.einfassungen[0].durchmesser;r.hinweis2=document.getElementById("einfa_mantel_hinweis_0").textContent;
  holder.remove();
  return r;
 });
 p(f.felder&&f.labels.some(x=>/Standrohr.*Information/.test(x))&&f.labels.some(x=>/Mantelrohr/.test(x)),"Formular: Feld Standrohr (Information) und Mantelrohr",f.labels);
 p(f.durchm===125&&f.feld==="125"&&/125/.test(f.hinweis),"Standrohr 100 → Mantelrohr 125 wird übernommen, mit Hinweis",f);
 p(f.ohneZuordnung===111&&/Keine Zuordnung/.test(f.hinweis2),"ohne Zuordnung bleibt der Mantelrohr-Wert, Hinweis nennt es",f);

 console.log("\nE · Umschläge einzeln, Anreiff in Mass a (v3.361)");
 const u=await page.evaluate(()=>{
  const r={};
  einfEinstellungenSichern(Object.assign({},EINFASSUNG_STANDARD,{umschlag:20,umschlag_hinten:30,umschlag_seitlich:25,anreiss:18,mass_seitlich:100,mantel_zuordnung:[]}));
  const t=abwTablett({D:110,alpha:25,a:250,b:200,c:35,umschlag:20,umschlagHinten:30,umschlagSeitlich:25,anreiss:18,massSeitlich:100,lochZugabe:0});
  const e={bez:"",durchmesser:110,winkel:25,a:250,b:200,c:35,lattenabstand:330};
  const erg=einfBerechnen({deckung:"biber_einfach",durchmesser:110,winkel:25,a:250,b:200,c:35,lattenabstand:330});
  r.laenge=t.laenge;r.breite=t.breite;r.mitteY=t.mitteY;r.quer=t.biegeLinien.filter(l=>l[0][0]===0&&l[1][0]===t.breite).map(l=>l[0][1]);
  r.laengs=t.biegeLinien.filter(l=>l[0][1]===0&&l[1][1]===t.laenge).map(l=>l[0][0]);
  r.abw=Math.round(erg.abwicklung);r.breiteGesamt=erg.breiteGesamt;
  // Anreiff ändert die Länge nicht (in a enthalten)
  const t0=abwTablett({D:110,alpha:25,a:250,b:200,c:35,umschlag:20,umschlagHinten:30,umschlagSeitlich:25,anreiss:0,massSeitlich:100,lochZugabe:0});
  r.ohneAnreiss=t0.laenge;
  // Warnung: Loch reicht in den Anreiff, wenn a - anreiss zu klein
  const w=abwTablett({D:110,alpha:25,a:70,b:200,c:35,umschlag:20,umschlagHinten:20,umschlagSeitlich:20,anreiss:18,massSeitlich:100,lochZugabe:0});
  r.warnung=w.warnungen.some(x=>/Anreiff vorne/.test(x));
  // Brücke aus den Einstellungen
  const v=einfaAbwVorgabe({bez:"",durchmesser:110,winkel:25,a:250,b:200,c:35},"tablett",{nr:1});
  r.vorgabe=[v.werte.umschlag,v.werte.umschlagHinten,v.werte.umschlagSeitlich,v.werte.anreiss];
  return r;
 });
 p(u.laenge===535&&u.breite===360&&u.mitteY===270,"Tablett: Länge 20+250+200+35+30 = 535, Breite 110+2×25+200 = 360, Mitte Rohr bei 270 (a inkl. Anreiff)",u);
 p(u.abw===u.laenge&&u.breiteGesamt===u.breite,"Abwicklung der Einfassung = Tablett (Länge und Breite)",u);
 p(JSON.stringify(u.quer.sort((x,y)=>x-y))==="[20,38,470,505]"&&JSON.stringify(u.laengs.sort((x,y)=>x-y))==="[25,335]","Biegelinien: vorne 20, Anreiff 38, Aufbug 470, hinten 505; seitlich 25 und 335",[u.quer,u.laengs]);
 p(u.ohneAnreiss===u.laenge,"Der Anreiff ändert die Länge nicht (in a enthalten)",u.ohneAnreiss);
 p(u.warnung,"Warnung, wenn das Loch in den Anreiff reicht (a abzüglich Anreiff)",u.warnung);
 p(JSON.stringify(u.vorgabe)==="[20,30,25,18]","Abwicklungsrechner übernimmt die einzelnen Masse aus den Einstellungen",u.vorgabe);

 console.log("\nF · Einstellungen einzeln, Altbestand, firmenweite Zuordnung");
 const g=await page.evaluate(async()=>{
  const r={};
  r.felder=["einfsUmschlag","einfsUmschlagHinten","einfsUmschlagSeitlich","einfsAnreiss","einfsMantelSpeichern"].every(i=>!!document.getElementById(i));
  // Altbestand: nur "umschlag" gespeichert
  localStorage.setItem(EINF_EINSTELLUNGEN,JSON.stringify({umschlag:25,deckung:"biber_einfach"}));
  const alt=einfEinstellungenLaden();
  r.alt=[alt.umschlag,alt.umschlag_hinten,alt.umschlag_seitlich,alt.anreiss];
  localStorage.removeItem(EINF_EINSTELLUNGEN);
  // Firmenweit
  einfMantelFirma=[{standrohr:100,mantel:125}];
  einfEinstellungenSichern(Object.assign({},EINFASSUNG_STANDARD,{mantel_zuordnung:[{standrohr:100,mantel:999}]}));
  r.firma=einfMantelFuer(100);
  einfMantelFirma=[];
  r.ersatz=einfMantelFuer(100);   // Altbestand vom Gerät gilt nur ersatzweise
  einfEinstellungenSichern(Object.assign({},EINFASSUNG_STANDARD));
  // Speichern ruft den Firmen-Weg mit dem richtigen Feld
  let gesendet=null;const orig=window.speichereAppSettings;
  window.speichereAppSettings=async f=>{gesendet=f;return {fehler:null}};
  einfMantelListeZeichnen([{standrohr:110,mantel:130}]);
  document.getElementById("einfsMantelSpeichern").click();
  await new Promise(x=>setTimeout(x,200));
  r.gesendet=JSON.stringify(gesendet);r.nachher=einfMantelFuer(110);
  window.speichereAppSettings=orig;
  return r;
 });
 p(g.felder,"Einstellungen: Umschlag vorne, hinten, seitlich, Anreiff und Zuordnung speichern",g);
 p(JSON.stringify(g.alt)==="[25,25,25,18]","Altbestand: hinten und seitlich übernehmen den bisherigen Umschlag, Anreiff 18",g.alt);
 p(g.firma===125&&g.ersatz===999,"Zuordnung: firmenweite Liste gilt zuerst, Altbestand vom Gerät nur ersatzweise",[g.firma,g.ersatz]);
 p(g.gesendet==='{"einfassung_mantel_zuordnung":[{"standrohr":110,"mantel":130}]}'&&g.nachher===130,"Zuordnung speichern schreibt in die Firmeneinstellungen (einfassung_mantel_zuordnung)",[g.gesendet,g.nachher]);

 console.log("\nD · Lochausschnitt bemasst");
 const d=await page.evaluate(()=>{
  const r0=abwTablett({D:125,alpha:25,a:250,b:200,c:35,umschlag:20,massSeitlich:100,lochZugabe:2});
  const svg=abwSvg(r0);
  const w=document.createElement("div");w.innerHTML=svg;
  const dxf=abwDxfText(r0);
  const rohr=abwRechne?null:null;
  return {ok:r0.ok,vorne:r0.massVorne,hinten:r0.massHinten,mitteY:r0.mitteY,laenge:r0.laenge,
   gruppe:!!w.querySelector('[data-abw-mass="loch"]'),
   tv:(w.querySelector(".abw-mass-vorne")||{}).textContent,th:(w.querySelector(".abw-mass-hinten")||{}).textContent,
   erwV:abwMm(r0.mitteY),erwH:abwMm(r0.laenge-r0.mitteY),
   dxf:/BEMASSUNG/.test(dxf)&&/TEXT/.test(dxf),
   summe:Math.abs(r0.massVorne+r0.massHinten-r0.laenge)<1e-9};
 });
 p(d.ok&&d.summe&&d.vorne===d.mitteY,"Masse: vorne = Mitte Loch bis Vorderkante, hinten = Rest; zusammen = Länge",d);
 p(d.gruppe&&d.tv===d.erwV&&d.th===d.erwH,"Zeichnung zeigt beide Masse (Zahlen = gerechnete Werte)",[d.tv,d.th,d.erwV,d.erwH]);
 p(d.dxf,"DXF enthält die Bemassung auf eigenem Layer",d.dxf);
 const rohr=await page.evaluate(()=>{const r=abwRechne({});return {bauteil:r&&r.bauteil}});
 p(true,"(Rohr-Zeichnung bleibt ohne Bemassung)",rohr);
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

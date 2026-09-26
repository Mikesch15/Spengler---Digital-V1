// v3.194: Das Bauteil hiess in v3.192 und v3.193 "Hablett". Der Betrieb nennt
// es TABLETT - umbenannt in Code, Oberflaeche, Hilfe, Anleitung und Datenbank.
// Abschnitt K prueft, dass ein in der Zwischenzeit gespeicherter Datensatz
// mit dem alten Namen trotzdem als Tablett aufgeht, und dass "Hablett"
// nirgends mehr steht.
//
// Prueft v3.192: Das Tablett der Einfassung rund wird abgewickelt, inklusive
// Lochausschnitt - und der Weg zwischen Massaufnahme und Abwicklungsrechner
// geht in BEIDE Richtungen.
//
// GEWUENSCHT
// "Man soll aus der massaufnahme eine abwicklung erstellen können, man soll
//  aber auch in der abwicklung eine massaufnahme laden können ... das tablett
//  der einfassung soll ebenfalls abgewickelt werden, inkl. Lochausschnitt"
// Dazu zwei Entscheide des Anwenders: das Loch bekommt LUFT mit einstellbarer
// Zugabe, und das Tablett sitzt IM Abwicklungsrechner als zweites Bauteil.
//
// DIE ZENTRALE GEOMETRIE, die dieser Pruefstand absichert
// Das Tablett liegt in der DACHFLAECHE, das Rohr steht im LOT. Ein
// senkrechter Zylinder durch eine geneigte Ebene ergibt eine ELLIPSE:
// quer zum Gefaelle D, in Gefaellerichtung D/cos(alpha). Ein rundes Loch
// waere bei Oe110 und 30 Grad in Gefaellerichtung 17 mm zu kurz - das ist
// der teuerste Fehler, den dieses Bauteil machen koennte, und Abschnitt A
// rechnet ihn von Hand nach.
//
// UND DIE ZWEITE WAHRHEIT, die es NICHT geben darf
// Die Zuschnittlaenge des Tabletts ist dieselbe Zahl, die die Massaufnahme
// Einfassung rund als "Zuschnittbreite (Querschnitt)" ausgibt. Abschnitt B
// rechnet abwTablett().laenge gegen einfBerechnen().abwicklung - zwei
// Laengen fuer dasselbe Blech waere eine zu viel.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-abwicklung-tablett-v3-192.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
const nurCode=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")
                  .replace(/"(\\.|[^"\\])*"/g,'""').replace(/'(\\.|[^'\\])*'/g,"''")
                  .replace(/`(\\.|[^`\\])*`/g,"``");
const nah=(a,b,e)=>Math.abs(Number(a)-Number(b))<(e===undefined?0.005:e);

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1600},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 await page.evaluate(()=>{if(typeof a2Setzen==="function")a2Setzen(false)});
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1",first_name:"Mike",last_name:"L"};
  meineRechte={admin:true,kataloge:true,lager:true};
  allProjects=[{id:7,name:"Musterstrasse 1"}];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  if(typeof showStart==="function")showStart();
  // Eine GESPEICHERTE Massaufnahme "Einfassung rund" - fuer die Gegenrichtung.
  window.__mess=[{id:99,title:"Dach Nord",date:"2026-01-02",project_id:7,staerke_mm:0.55,
   data:{einfassungen:[
     {bez:"Dunstrohr Nord",durchmesser:110,winkel:25,a:250,b:200,c:35,anzahl:1},
     {bez:"Kaminrohr",durchmesser:150,winkel:25,a:300,b:220,c:40,anzahl:1}]}}];
  window.__abw=[];
  window.__insert=null;
  sb.from=(t)=>({
   select:()=>({
    eq:()=>({order:()=>({limit:async()=>({data:window.__mess,error:null})})}),
    order:()=>({limit:async()=>({data:window.__abw,error:null})})}),
   insert:(satz)=>{window.__insert=satz;
     return {select:async()=>({data:[Object.assign({id:1},satz)],error:null})}},
   delete:()=>({eq:()=>({select:async()=>({data:[],error:null})})})});
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD);
 });

 // ---- A  Die Rechnung: das Loch ist eine Ellipse --------------------------
 console.log("\nA · Der Lochausschnitt");
 const A=await page.evaluate(()=>{
  const g=(al,z)=>abwTablett({D:110,alpha:al,a:250,b:200,c:35,
                              umschlag:20,massSeitlich:100,lochZugabe:z});
  return {a25z0:g(25,0), a25z2:g(25,2), a30z2:g(30,2), a0z2:g(0,2)};
 });
 // Von Hand: quer = D + 2z, lang = (D+2z)/cos(alpha).
 // 110/cos25 = 110/0,906308 = 121,372
 p(nah(A.a25z0.lochQuer,110)&&nah(A.a25z0.lochLang,121.372,0.002),
   "Ø110 auf 25°-Dach: Loch 110,00 quer × 121,37 in Gefällerichtung",
   [A.a25z0.lochQuer,A.a25z0.lochLang]);
 // 114/cos25 = 125,785
 p(nah(A.a25z2.lochQuer,114)&&nah(A.a25z2.lochLang,125.785,0.002),
   "mit 2 mm Luft: 114,00 × 125,79",[A.a25z2.lochQuer,A.a25z2.lochLang]);
 // 114/cos30 = 131,636
 p(nah(A.a30z2.lochQuer,114)&&nah(A.a30z2.lochLang,131.636,0.002),
   "auf 30° wird es laenger: 114,00 × 131,64",[A.a30z2.lochQuer,A.a30z2.lochLang]);

 // GEGENPROBE 1: auf dem Flachdach MUSS das Loch rund sein. Waere die Ellipse
 // vertauscht oder cos(alpha) vergessen, faellt genau das hier auf.
 p(nah(A.a0z2.lochQuer,A.a0z2.lochLang,1e-9)&&nah(A.a0z2.lochQuer,114),
   "Flachdach (0°): das Loch ist rund - 114,00 in beiden Richtungen",
   [A.a0z2.lochQuer,A.a0z2.lochLang]);
 // GEGENPROBE 2: das Loch ist bei 25 Grad NICHT rund. Ohne diese Probe wuerde
 // ein schlicht kreisrundes Loch Gegenprobe 1 ebenfalls bestehen.
 p(A.a25z2.lochLang-A.a25z2.lochQuer>11,
   "bei 25° ist es KEIN Kreis - in Gefällerichtung ueber 11 mm laenger",
   A.a25z2.lochLang-A.a25z2.lochQuer);

 // GEGENPROBE 3: der Entscheid des Anwenders war "Luft ueber ein gedachtes
 // Rohr mit Oe + 2 x Zugabe", NICHT "Ellipse plus z rundum". Der Unterschied
 // ist genau hier sichtbar: in Gefaellerichtung waechst die Luft mit
 // 1/cos(alpha) mit. 2 x 2 / cos25 = 4,413 - nicht 4.
 p(nah(A.a25z2.lochLang-A.a25z0.lochLang,4.413,0.002),
   "die Luft waechst in Gefällerichtung mit 1/cos α mit (4,41 statt 4,00 mm)",
   A.a25z2.lochLang-A.a25z0.lochLang);
 p(nah(A.a25z2.lochQuer-A.a25z0.lochQuer,4),
   "quer zum Gefälle bleibt sie 2 × 2 mm",A.a25z2.lochQuer-A.a25z0.lochQuer);
 p(A.a25z2.loch.length===360&&A.a25z2.loch.length===A.a25z2.punkte,
   "das Loch hat so viele Stuetzpunkte wie angesagt",A.a25z2.punkte);
 // Der Mittelpunkt des Lochs liegt wirklich in der Mitte der Breite und bei
 // Mitte Rohr - eine Ellipse an der falschen Stelle nuetzt nichts.
 const A2=await page.evaluate(()=>{
  const h=abwTablett({D:110,alpha:25,a:250,b:200,c:35,umschlag:20,massSeitlich:100,lochZugabe:2});
  const xs=h.loch.map(q=>q[0]), ys=h.loch.map(q=>q[1]);
  return {xMin:Math.min.apply(null,xs),xMax:Math.max.apply(null,xs),
          yMin:Math.min.apply(null,ys),yMax:Math.max.apply(null,ys),
          mitteX:h.mitteX,mitteY:h.mitteY,breite:h.breite,laenge:h.laenge};
 });
 p(nah((A2.xMin+A2.xMax)/2,A2.mitteX)&&nah(A2.mitteX,175),
   "das Loch liegt quer genau in der Mitte (175 mm von jeder Kante)",A2);
 p(nah((A2.yMin+A2.yMax)/2,A2.mitteY)&&nah(A2.mitteY,288),
   "und in der Laenge bei Mitte Rohr: 20 Umschlag + 18 Anreiss + 250 = 288 mm",A2);
 p(A2.yMin>0&&A2.yMax<A2.laenge&&A2.xMin>0&&A2.xMax<A2.breite,
   "das Loch liegt vollstaendig im Blech",A2);

 // ---- B  Keine zweite Wahrheit zur Laenge ---------------------------------
 console.log("\nB · Die Zuschnittlänge ist dieselbe Zahl wie in der Massaufnahme");
 const B=await page.evaluate(()=>{
  const faelle=[[110,25,250,200,35],[150,30,300,220,40],[80,0,180,150,25],
                [110,45,250,200,0],[125,12.5,222,198,33]];
  return faelle.map(f=>{
   const [D,al,a,bb,c]=f;
   const h=abwTablett({D,alpha:al,a,b:bb,c,
     umschlag:einfassungSettings.umschlag,massSeitlich:einfassungSettings.mass_seitlich,
     lochZugabe:einfassungSettings.loch_zugabe});
   const e=einfBerechnen({durchmesser:D,winkel:al,a,b:bb,c,lattenabstand:330});
   return {f,laenge:h.laenge,abwicklung:e.abwicklung,
           breite:h.breite,breiteGesamt:e.breiteGesamt};
  });
 });
 p(B.every(x=>Math.round(x.laenge)===x.abwicklung),
   "abwTablett().laenge = einfBerechnen().abwicklung in allen fuenf Faellen",B);
 p(B.every(x=>Math.round(x.breite)===x.breiteGesamt),
   "und die Breite = breiteGesamt der Massaufnahme",B);
 // Von Hand nachgerechnet: 20 + 18 + 250 + 200 + 35 + 20 = 543.
 p(nah(B[0].laenge,543)&&nah(B[0].breite,350),
   "erster Fall von Hand: 350 × 543 mm",B[0]);
 // Der Anreiss wird NICHT kopiert, sondern aus js/21 geholt.
 const B2=await page.evaluate(()=>({
  ausJs21:EINF_ANREISS_LAENGE, ausJs77:abwTablettAnreiss(),
  ohneAnreiss:abwTablett({D:110,alpha:25,a:250,b:200,c:35,
    umschlag:20,massSeitlich:100,lochZugabe:0,anreiss:0}).laenge}));
 p(B2.ausJs21===B2.ausJs77,"der Anreiss kommt aus js/21, er ist nicht kopiert",B2);
 p(nah(B2.ohneAnreiss,525),"ohne Anreiss werden es 18 mm weniger",B2.ohneAnreiss);

 // ---- C  Fehler und Warnungen ---------------------------------------------
 console.log("\nC · Was die Rechnung verweigert und wovor sie warnt");
 const C=await page.evaluate(()=>{
  const g=o=>abwTablett(Object.assign({D:110,alpha:25,a:250,b:200,c:35,
    umschlag:20,massSeitlich:100,lochZugabe:2},o));
  return {ohneD:g({D:0}), ohneA:g({a:0}), steil:g({alpha:80}),
          negativeLuft:g({lochZugabe:-1}),
          inAnreiss:g({a:50}), inAufbug:g({b:50}), anDenRand:g({massSeitlich:1}),
          gut:g({})};
 });
 p(C.ohneD.ok===false&&C.ohneD.fehler.length>0,"ohne Durchmesser wird NICHT gerechnet",C.ohneD.fehler);
 p(C.ohneA.ok===false,"ohne Mass a auch nicht",C.ohneA.fehler);
 p(C.steil.ok===false,"ueber 75 Grad Dachneigung auch nicht",C.steil.fehler);
 p(C.negativeLuft.ok===false,"negative Luft am Loch auch nicht",C.negativeLuft.fehler);
 p(C.gut.ok===true&&C.gut.fehler.length===0,"die Standardmasse gehen durch",C.gut.fehler);
 // Warnungen heissen: die Zahlen stimmen, aber so laesst es sich nicht bauen.
 p(C.inAnreiss.ok===true&&C.inAnreiss.warnungen.some(w=>w.indexOf("Anreiss")>=0),
   "Loch bis in den Anreiss: gerechnet wird, aber es wird gewarnt",C.inAnreiss.warnungen);
 p(C.inAufbug.ok===true&&C.inAufbug.warnungen.some(w=>w.indexOf("Aufbug")>=0),
   "Loch bis in den Aufbug: ebenso",C.inAufbug.warnungen);
 p(C.anDenRand.warnungen.some(w=>w.indexOf("seitlichen Umschlag")>=0),
   "Loch bis an den seitlichen Umschlag: ebenso",C.anDenRand.warnungen);
 // GEGENPROBE: beim guten Fall darf KEINE dieser drei Warnungen kommen. Eine
 // Warnung, die immer erscheint, ist keine.
 p(C.gut.warnungen.length===0,"und beim guten Fall kommt gar keine Warnung",C.gut.warnungen);

 // ---- D  Kontur und Biegelinien -------------------------------------------
 console.log("\nD · Kontur und Biegelinien");
 const D=await page.evaluate(()=>{
  const mit=abwTablett({D:110,alpha:25,a:250,b:200,c:35,umschlag:20,massSeitlich:100,lochZugabe:2});
  const ohne=abwTablett({D:110,alpha:25,a:250,b:200,c:35,umschlag:0,massSeitlich:100,lochZugabe:2});
  const ohneC=abwTablett({D:110,alpha:25,a:250,b:200,c:0,umschlag:20,massSeitlich:100,lochZugabe:2});
  const y=r=>r.biegeLinien.filter(l=>l[0][1]===l[1][1]).map(l=>l[0][1]);
  const x=r=>r.biegeLinien.filter(l=>l[0][0]===l[1][0]).map(l=>l[0][0]);
  return {konturLen:mit.kontur.length, quer:y(mit), laengs:x(mit),
          ohneQuer:y(ohne), ohneLaengs:x(ohne), ohneCQuer:y(ohneC)};
 });
 p(D.konturLen===4,"der Zuschnitt ist ein Rechteck - vier Eckpunkte",D.konturLen);
 // 20 (Umschlag vorne), 38 (Anreiss-Knick), 488 (Aufbug), 523 (Umschlag oben)
 p(JSON.stringify(D.quer)===JSON.stringify([20,38,488,523]),
   "vier Biegelinien quer: Umschlag vorne, Anreiss, Aufbug, Umschlag oben",D.quer);
 p(JSON.stringify(D.laengs)===JSON.stringify([20,330]),
   "zwei laengs: der seitliche Umschlag an beiden Kanten",D.laengs);
 // GEGENPROBE: ohne Umschlag verschwinden genau die Linien, die es dann nicht
 // gibt - eine Biegelinie ohne Biegung waere eine Behauptung.
 p(D.ohneLaengs.length===0,"ohne Umschlag gibt es keine seitliche Biegelinie",D.ohneLaengs);
 p(JSON.stringify(D.ohneQuer)===JSON.stringify([18,468]),
   "und quer nur noch Anreiss und Aufbug",D.ohneQuer);
 p(JSON.stringify(D.ohneCQuer)===JSON.stringify([20,38,488]),
   "ohne Aufbug faellt auch der obere Umschlag weg",D.ohneCQuer);

 // ---- E  Die Oberflaeche: zwei Bauteile, ein Rechner ----------------------
 console.log("\nE · Der Umschalter im Abwicklungsrechner");
 const E=await page.evaluate(async()=>{
  await abwOeffnen();
  const rohr={bauteil:abwLetztes.bauteil, rohrSichtbar:!$("abwMasseRohr").hidden,
              tablettSichtbar:!$("abwMasseTablett").hidden,
              dxf:abwDxfText(abwLetztes)};
  $("abw_bauteil").value="tablett";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  const hab={bauteil:abwLetztes.bauteil, rohrSichtbar:!$("abwMasseRohr").hidden,
             tablettSichtbar:!$("abwMasseTablett").hidden,
             dxf:abwDxfText(abwLetztes), svg:abwSvg(abwLetztes),
             ergebnis:$("abwErgebnis").innerText,
             vorschau:$("abwVorschau").innerText,
             felder:{D:$("abw_D").value,alpha:$("abw_alpha").value,
                     a:$("abw_tab_a").value,umschlag:$("abw_tab_umschlag").value,
                     luft:$("abw_tab_lochZugabe").value}};
  return {rohr,hab};
 });
 p(E.rohr.bauteil==="rohr"&&E.rohr.rohrSichtbar&&!E.rohr.tablettSichtbar,
   "der Rechner startet beim Rohr",E.rohr);
 p(E.hab.bauteil==="tablett"&&!E.hab.rohrSichtbar&&E.hab.tablettSichtbar,
   "der Umschalter tauscht die Masse-Felder",E.hab);
 p(E.hab.felder.a==="250"&&E.hab.felder.umschlag==="20"&&E.hab.felder.luft==="2",
   "die Vorgabemasse stehen im Formular",E.hab.felder);
 // GEGENPROBE: die Vorgaben kommen wirklich aus der Einfassung rund und sind
 // nicht in js/78 kopiert. Mit veraenderten Einstellungen muessen sie
 // mitwandern - eine Kopie bliebe auf 250/20/2 stehen.
 const E3=await page.evaluate(async()=>{
  const alt=einfassungSettings;
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD,
    {mass_a:277,umschlag:15,loch_zugabe:4.5});
  // v3.196: ueber abwTablettEl(), weil der Winkel ein GETEILTES Feld ist und
  // nicht mehr "abw_tab_alpha" heisst.
  ABW_TABLETT_FELDER.forEach(k=>{ const el=abwTablettEl(k); if(el)el.value="" });
  abwTablettFelderSetzen(null);
  const r={a:$("abw_tab_a").value,umschlag:$("abw_tab_umschlag").value,
           luft:$("abw_tab_lochZugabe").value};
  einfassungSettings=alt;
  abwTablettFelderSetzen(null);
  return r;
 });
 p(E3.a==="277"&&E3.umschlag==="15"&&E3.luft==="4.5",
   "geaenderte Richtwerte der Einfassung wandern mit - sie sind nicht kopiert",E3);
 p(E.hab.ergebnis.indexOf("Zuschnittlänge")>=0
   &&E.hab.ergebnis.indexOf("Loch in Gefällerichtung")>=0,
   "die Ergebnistabelle nennt Laenge und Loch",E.hab.ergebnis);
 p(E.hab.ergebnis.indexOf("Streckung")<0&&E.hab.ergebnis.indexOf("Schweifbord")<0,
   "und NICHT die Kennzahlen des Rohrs - die gibt es hier nicht",E.hab.ergebnis);
 p(E.hab.vorschau.indexOf("Lochausschnitt")>=0,
   "die Legende nennt den Lochausschnitt",E.hab.vorschau);
 p(E.hab.vorschau.indexOf("ausgeklinkt")>=0,
   "und der feste Hinweis auf die doppelt belegten Ecken steht da",E.hab.vorschau);

 console.log("\nE2 · DXF-Layer je Bauteil");
 const hatH=l=>E.hab.dxf.indexOf(l)>=0, hatR=l=>E.rohr.dxf.indexOf(l)>=0;
 p(hatH("ZUSCHNITT")&&hatH("BIEGELINIE")&&hatH("LOCHAUSSCHNITT"),
   "das Tablett-DXF hat ZUSCHNITT, BIEGELINIE und LOCHAUSSCHNITT");
 p(!hatH("BIEGELINIE_SCHWEIFBORD")&&!hatH("EINSCHNITT"),
   "und keine Layer des Rohrs");
 // GEGENPROBE: das Rohr hat seine Layer unveraendert behalten. Der Umbau auf
 // eine gemeinsame Zeichenfunktion darf dort nichts weggenommen haben.
 p(hatR("ZUSCHNITT")&&hatR("BIEGELINIE_SCHWEIFBORD")&&hatR("BIEGELINIE_FALZ"),
   "das Rohr-DXF hat weiterhin seine drei Layer");
 p(!hatR("LOCHAUSSCHNITT"),"und kein Loch");
 // Das Loch ist ein GESCHLOSSENER Umriss - ein offener liesse sich nicht
 // schneiden. Gezaehlt wird, nicht nur gesucht: die Kontur ist ebenfalls
 // geschlossen, ein blosses "irgendwo steht ein Z" bewiese also nichts.
 const zuSvg=t=>(t.match(/Z"/g)||[]).length;
 p(zuSvg(E.hab.svg)===2,
   "im Tablett-SVG sind GENAU zwei Umrisse geschlossen: Zuschnitt und Loch",zuSvg(E.hab.svg));
 const ESvg=await page.evaluate(()=>{
  $("abw_bauteil").value="rohr";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  const r=abwSvg(abwLetztes);
  $("abw_bauteil").value="tablett";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  return r;
 });
 p(zuSvg(ESvg)===1,"im Rohr-SVG nur einer - dort gibt es kein Loch",zuSvg(ESvg));
 // Und im DXF traegt die Lochpolylinie wirklich das Flag "geschlossen" (70=1).
 p(/POLYLINE\n8\nLOCHAUSSCHNITT\n66\n1\n70\n1\n/.test(E.hab.dxf),
   "die Lochpolylinie im DXF ist als geschlossen gekennzeichnet (70 = 1)");
 p(/POLYLINE\n8\nBIEGELINIE\n66\n1\n70\n0\n/.test(E.hab.dxf),
   "die Biegelinien dagegen als offen (70 = 0)");

 // ---- F  Die Gegenrichtung: Massaufnahme im Rechner laden ------------------
 console.log("\nF · Massaufnahme im Rechner laden");
 const F=await page.evaluate(async()=>{
  // Eine ABWEICHENDE Staerke im offenen Formular - sie darf NICHT gewinnen.
  if(typeof measStaerkeSetzen==="function")measStaerkeSetzen(1.5);
  $("abwAusAufnahme").click();
  await new Promise(r=>setTimeout(r,150));
  const liste=$("abwAufnahmen").innerHTML;
  const knoepfe=document.querySelectorAll("[data-abw-aus-aufnahme]").length;
  document.querySelectorAll("[data-abw-aus-aufnahme]")[0].click();
  await new Promise(r=>setTimeout(r,150));
  return {liste,knoepfe,
   bauteil:abwLetztes.bauteil, ein:abwLetztes.eingaben,
   bez:$("abw_bezeichnung").value, projekt:$("abw_projekt").value,
   herkunft:$("abwHerkunft").innerText,
   zu:$("abwAufnahmen").innerHTML};
 });
 p(F.knoepfe===2,"beide Einfassungen der Aufnahme stehen zur Wahl",F.knoepfe);
 p(F.liste.indexOf("Dunstrohr Nord")>=0&&F.liste.indexOf("Kaminrohr")>=0,
   "mit ihren Bezeichnungen",F.liste.slice(0,300));
 p(F.bauteil==="tablett","uebernommen wird in das gewaehlte Bauteil",F.bauteil);
 p(F.ein.D===110&&F.ein.alpha===25&&F.ein.a===250&&F.ein.b===200&&F.ein.c===35,
   "alle fuenf Masse der Einfassung stehen im Formular",F.ein);
 p(F.projekt==="7","das Projekt der Massaufnahme ist gewaehlt",F.projekt);
 p(F.bez.indexOf("Dunstrohr Nord")>=0&&F.bez.indexOf("Tablett")>=0,
   "die Bezeichnung nennt Rohr UND Bauteil - sonst heissen beide gleich",F.bez);
 p(F.herkunft.indexOf("Dach Nord")>=0,"die Herkunft nennt die Massaufnahme",F.herkunft);
 p(F.zu==="","die Auswahl schliesst sich nach der Uebernahme",F.zu);

 // Die Materialstaerke: beim ROHR muss sie aus dem gespeicherten Datensatz
 // kommen (0,55), nicht aus dem zufaellig offenen Formular (1,5).
 const F2=await page.evaluate(async()=>{
  $("abw_bauteil").value="rohr";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  $("abwAusAufnahme").click();
  await new Promise(r=>setTimeout(r,150));
  document.querySelectorAll("[data-abw-aus-aufnahme]")[1].click();   // Kaminrohr
  await new Promise(r=>setTimeout(r,150));
  return {t:$("abw_t").value, D:$("abw_D").value, alpha:$("abw_alpha").value,
          imFormular:(typeof measStaerkeGet==="function")?measStaerkeGet():null,
          bez:$("abw_bezeichnung").value};
 });
 p(F2.t==="0.55","die Staerke kommt aus dem gespeicherten Datensatz (0,55)",F2);
 p(F2.imFormular===1.5&&F2.t!=="1.5",
   "und NICHT aus dem offenen Formular, wo 1,5 steht",F2);
 p(F2.D==="150"&&F2.alpha==="25","die zweite Einfassung ist es auch wirklich",F2);
 p(F2.bez.indexOf("Rohr")>=0,"beim Rohr heisst das Bauteil auch so",F2.bez);

 // Der Bauteilwechsel loest die Herkunft - sie galt fuer das andere Blech.
 const F3=await page.evaluate(async()=>{
  const vorher=$("abwHerkunft").innerHTML;
  $("abw_bauteil").value="tablett";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  return {vorher,nachher:$("abwHerkunft").innerHTML};
 });
 p(F3.vorher!==""&&F3.nachher==="",
   "beim Wechsel des Bauteils faellt die Herkunft weg - sie galt fuer das andere Blech",F3);

 // ---- G  Speichern und Laden ----------------------------------------------
 console.log("\nG · Speichern und Laden");
 const G=await page.evaluate(async()=>{
  await abwAusMassaufnahme(einfaAbwVorgabe(
    {bez:"Testrohr",durchmesser:110,winkel:25,a:250,b:200,c:35},"tablett",
    {nr:1,projectId:7,measurementId:99}));
  window.__insert=null;
  const r=await abwSpeichern();
  return {r,satz:window.__insert};
 });
 p(G.r&&G.r.ok===true,"gespeichert",G.r);
 p(G.satz&&G.satz.bauteil==="tablett","das Bauteil wird mitgeschrieben",G.satz&&G.satz.bauteil);
 p(G.satz&&G.satz.measurement_id===99,"und die Massaufnahme",G.satz&&G.satz.measurement_id);
 p(G.satz&&nah(G.satz.ergebnis.laenge,543)&&nah(G.satz.ergebnis.lochLang,125.785,0.002),
   "die Kennzahlen des Tabletts stehen im Datensatz",G.satz&&G.satz.ergebnis);
 p(G.satz&&G.satz.ergebnis.streckung===undefined,
   "und NICHT die des Rohrs",G.satz&&G.satz.ergebnis);

 const G2=await page.evaluate(async()=>{
  // Ein gespeichertes Tablett und ein Datensatz BIS v3.191 ganz ohne Spalte.
  abwGespeichert=[
   {id:5,bezeichnung:"Tablett Nord",bauteil:"tablett",project_id:7,measurement_id:99,
    parameter:{D:150,alpha:30,a:300,b:220,c:40,umschlag:20,massSeitlich:100,lochZugabe:3},
    ergebnis:{breite:390,laenge:618,lochQuer:156,lochLang:180.1}},
   {id:6,bezeichnung:"Altes Rohr",project_id:7,
    parameter:{D:110,t:0.7,H:300,alpha:30,b:40,r:2,nahtLang:true,f:6,
               faktorA:1,faktorB:2,zugabeOben:0,lappen:0},
    ergebnis:{breite:361.38}}];
  abwListeZeichnen();
  const liste=$("abwListe").innerText;
  abwLaden(5,false);
  const hab={bauteil:abwBauteil(), D:$("abw_D").value, luft:$("abw_tab_lochZugabe").value,
             rechnet:abwLetztes&&abwLetztes.bauteil};
  abwLaden(6,false);
  const rohr={bauteil:abwBauteil(), D:$("abw_D").value, H:$("abw_H").value,
              rechnet:abwLetztes&&abwLetztes.bauteil};
  return {liste,hab,rohr};
 });
 p(G2.liste.indexOf("Tablett")>=0&&G2.liste.indexOf("Rohr")>=0,
   "die Liste sagt bei jedem Eintrag, welches Bauteil es ist",G2.liste);
 p(G2.hab.bauteil==="tablett"&&G2.hab.D==="150"&&G2.hab.luft==="3"
   &&G2.hab.rechnet==="tablett",
   "ein gespeichertes Tablett laedt als Tablett",G2.hab);
 // GEGENPROBE: ein Datensatz aus der Zeit VOR dem zweiten Bauteil hat keine
 // Spalte "bauteil". Er ist ein Rohr und muss unveraendert oeffnen.
 p(G2.rohr.bauteil==="rohr"&&G2.rohr.D==="110"&&G2.rohr.H==="300"
   &&G2.rohr.rechnet==="rohr",
   "ein Datensatz bis v3.191 ohne Spalte 'bauteil' oeffnet unveraendert als Rohr",G2.rohr);

 // ---- H  Die Bruecke in der Massaufnahme ----------------------------------
 console.log("\nH · Die beiden Knöpfe in der Massaufnahme");
 const H=await page.evaluate(()=>{
  einfA={material:"",deckung:"biber_einfach",lattenabstand:330,aktiv:0,rollenAuswahl:[],
         einfassungen:[{bez:"Dunstrohr Nord",durchmesser:110,winkel:25,a:250,b:200,c:35,anzahl:1}]};
  if(typeof measStaerkeSetzen==="function")measStaerkeSetzen(0.6);
  measSelectedProjectId=7; currentMeasurementId=4242;
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD,{rohrhoehe:0,schweifbord:0});
  return {rohr:einfaAbwicklungVorgabe(0,"rohr"),
          tablett:einfaAbwicklungVorgabe(0,"tablett"),
          ohneArgument:einfaAbwicklungVorgabe(0)};
 });
 p(H.rohr.bauteil==="rohr"&&H.tablett.bauteil==="tablett","beide Bauteile lassen sich holen");
 p(H.ohneArgument.bauteil==="rohr",
   "ohne Angabe bleibt es das Rohr - so war es bis v3.191",H.ohneArgument.bauteil);
 p(H.tablett.werte.a===250&&H.tablett.werte.b===200&&H.tablett.werte.c===35
   &&H.tablett.werte.umschlag===20&&H.tablett.werte.massSeitlich===100,
   "das Tablett bekommt a, b, c und die beiden Richtwerte",H.tablett.werte);
 p(H.tablett.werte.t===undefined&&H.tablett.werte.H===undefined,
   "und NICHT die Felder des Rohrs",H.tablett.werte);
 p(H.rohr.werte.t===0.6&&H.rohr.werte.a===undefined,
   "das Rohr umgekehrt genauso",H.rohr.werte);
 // 0 Luft ist ein gueltiger Wert und darf nicht als "fehlt" durchfallen -
 // anders als bei Rohrhoehe und Schweifbord-Breite.
 const H2=await page.evaluate(()=>{
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD,{loch_zugabe:0});
  const v=einfaAbwicklungVorgabe(0,"tablett");
  einfassungSettings=Object.assign({},EINFASSUNG_STANDARD);
  return v;
 });
 p(H2.werte.lochZugabe===0&&H2.fehlt.indexOf("Luft am Lochausschnitt (Richtwert)")<0,
   "Luft 0 heisst 'Loch exakt auf Rohrmass' und gilt als uebernommen",H2);
 // Gegenprobe: bei der Rohrhoehe heisst 0 weiterhin "nicht gesetzt".
 p(H.rohr.werte.H===undefined&&H.rohr.fehlt.indexOf("Rohrhöhe (Richtwert)")>=0,
   "bei der Rohrhoehe heisst 0 weiterhin 'nicht gesetzt'",H.rohr.fehlt);

 // ---- I  Verdrahtung ------------------------------------------------------
 console.log("\nI · Verdrahtung");
 const q38=lies("js/38-einfassung-aufnahme.js");
 const q77=lies("js/77-abwicklung.js");
 const q78=lies("js/78-abwicklung-ui.js");
 p(q38.indexOf('data-einfa-bauteil="tablett"')>=0,"der Tablett-Knopf steht bei jeder Einfassung");
 p(q38.indexOf('data-einfa-bauteil="rohr"')>=0,"der Rohr-Knopf ebenso");
 // Die Bruecke rechnet weiterhin KEINE Geometrie - das macht js/77.
 const n38=nurCode(q38);
 p(!/einfaAbwVorgabe[\s\S]{0,2000}Math\.(PI|tan|cos|sin)/.test(n38),
   "die Bruecke rechnet keine Geometrie");
 // Und js/78 rechnet die Ellipse auch nicht selbst.
 p(!/cos|Math\.PI/.test(nurCode(q78)),"die Oberflaeche rechnet die Ellipse nicht selbst");
 p(/Math\.cos/.test(nurCode(q77)),"gerechnet wird sie in js/77");
 p(lies("index.html").indexOf('id="abw_bauteil"')>=0,"der Umschalter steht im HTML");
 p(lies("index.html").indexOf('id="abw_tab_lochZugabe"')>=0,"das Feld fuer die Luft auch");
 p(lies("index.html").indexOf('id="einfsLochZugabe"')>=0,
   "und der Richtwert in den Einstellungen der Einfassung rund");
 p(lies("index.html").indexOf('id="abwAusAufnahme"')>=0,"der Knopf fuer die Gegenrichtung");
 p(lies("js/21-einfassung-rund.js").indexOf("loch_zugabe")>=0,
   "loch_zugabe steht in EINFASSUNG_STANDARD");
 p(lies("js/41-hilfe.js").indexOf("Tablett")>=0,"die Hilfe erklaert das Tablett");
 p(lies("js/67-was-ist-neu.js").indexOf('"3.192"')>=0,'"Was ist neu" nennt v3.192');
 p(lies("sw.js").indexOf("js/77-abwicklung.js")>=0&&lies("sw.js").indexOf("js/78-abwicklung-ui.js")>=0,
   "beide Dateien stehen in der App-Shell des Service Workers");
 // Die Farben stehen nur noch an EINER Stelle.
 p(q78.indexOf("ABW_LINIENART")>=0&&lies("css/01-basis.css").indexOf(".abw-l-schweifbord")<0,
   "Farbe und Strichbild je Linienart stehen nur noch in ABW_LINIENART");

 // Der Richtwert laesst sich wirklich speichern.
 console.log("\nI2 · Der Richtwert lässt sich speichern");
 const I2=await page.evaluate(()=>{
  $("einfsLochZugabe").value="3.5";
  $("saveEinfassungSettings").click();
  const s=einfEinstellungenLaden();
  $("einfsLochZugabe").value="0";
  $("saveEinfassungSettings").click();
  const s0=einfEinstellungenLaden();
  return {gesetzt:s.loch_zugabe, null_:s0.loch_zugabe};
 });
 p(I2.gesetzt===3.5,"3,5 mm gespeichert und wieder gelesen",I2);
 p(I2.null_===0,"und 0 bleibt 0 - es ist hier ein gueltiger Wert, kein 'leer'",I2);

 // ---- K  Der alte Name (v3.194) -------------------------------------------
 console.log("\nK · Aus Hablett wurde Tablett");
 const K=await page.evaluate(()=>{
  abwGespeichert=[
   {id:9,bezeichnung:"Altes Hablett",bauteil:"hablett",project_id:null,
    parameter:{D:110,alpha:25,a:250,b:200,c:35,umschlag:20,massSeitlich:100,lochZugabe:2},
    ergebnis:{breite:350,laenge:543}},
   {id:10,bezeichnung:"Neues Tablett",bauteil:"tablett",project_id:null,
    parameter:{D:150,alpha:30,a:300,b:220,c:40,umschlag:20,massSeitlich:100,lochZugabe:2},
    ergebnis:{breite:390,laenge:618}}];
  abwListeZeichnen();
  const liste=$("abwListe").innerText;
  abwLaden(9,false);
  const alt={bauteil:abwBauteil(), D:$("abw_D").value, rechnet:abwLetztes&&abwLetztes.bauteil};
  abwLaden(10,false);
  const neu={bauteil:abwBauteil(), D:$("abw_D").value, rechnet:abwLetztes&&abwLetztes.bauteil};
  return {liste,alt,neu};
 });
 // Ein Datensatz aus v3.192/v3.193 traegt noch 'hablett'. Ihn als ROHR zu
 // oeffnen waere das Schlimmste, was hier passieren koennte - die Zahlen
 // bedeuten bei den beiden Bauteilen etwas voellig anderes.
 p(K.alt.bauteil==="tablett"&&K.alt.D==="110"&&K.alt.rechnet==="tablett",
   "ein Datensatz mit dem alten Namen 'hablett' oeffnet als Tablett",K.alt);
 p(K.neu.bauteil==="tablett"&&K.neu.D==="150"&&K.neu.rechnet==="tablett",
   "und einer mit dem neuen Namen genauso",K.neu);
 p(K.liste.indexOf("Tablett · ")>=0&&K.liste.indexOf("Hablett · ")<0,
   "in der Liste steht bei beiden 'Tablett'",K.liste);
 // In Oberflaeche, Rechnung und Bruecke hat der alte Name nichts mehr zu
 // suchen. "Was ist neu" und die Anleitung duerfen ihn nennen - sie ERKLAEREN
 // die Umbenennung, das ist kein Rueckstand.
 const ohne=["index.html","js/77-abwicklung.js","js/38-einfassung-aufnahme.js",
             "js/21-einfassung-rund.js"];
 const drin=ohne.filter(f=>/hablett/i.test(lies(f)));
 p(drin.length===0,"in Oberfläche, Rechnung und Brücke steht er nirgends mehr",drin);
 p(!/Abwicklung Hablett/.test(lies("js/38-einfassung-aufnahme.js"))
   &&/Abwicklung Tablett/.test(lies("js/38-einfassung-aufnahme.js")),
   "der Knopf in der Massaufnahme heisst „▭ Abwicklung Tablett“");
 // Gelesen wird der alte Wert an GENAU EINER benannten Stelle. Verstreute
 // Vergleiche waeren die Art Rueckstand, die man beim naechsten Umbau
 // uebersieht.
 const qUi=lies("js/78-abwicklung-ui.js");
 p((qUi.match(/"hablett"/g)||[]).length===1&&/abwBauteilAusDaten/.test(nurCode(qUi)),
   "der alte Wert steht genau einmal im Code, in abwBauteilAusDaten",
   (qUi.match(/"hablett"/g)||[]).length);

 // ---- L  Geteilte Masse (v3.196/v3.197) -----------------------------------
 console.log("\nL · Ein Mass, ein Feld");
 const L=await page.evaluate(async()=>{
  $("abw_bauteil").value="rohr";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(x=>setTimeout(x,60));
  abwFelderSetzen(ABW_STANDARD);
  $("abw_D").value="150"; $("abw_alpha").value="22";
  $("abw_b").value="18";                      // Schweifbord-Breite!
  $("abw_D").dispatchEvent(new Event("input",{bubbles:true}));
  await new Promise(x=>setTimeout(x,60));
  const rohr={D:abwLetztes.eingaben.D, alpha:abwLetztes.eingaben.alpha,
              b:abwLetztes.eingaben.b};
  $("abw_bauteil").value="tablett";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(x=>setTimeout(x,80));
  const tab={D:abwLetztes.eingaben.D, alpha:abwLetztes.eingaben.alpha,
             b:abwLetztes.eingaben.b, bFeld:$("abw_tab_b").value};
  // Und zurueck: das Tablett-b darf das Rohr-b nicht angefasst haben.
  $("abw_tab_b").value="333";
  $("abw_tab_b").dispatchEvent(new Event("input",{bubbles:true}));
  await new Promise(x=>setTimeout(x,60));
  const tab333=abwLetztes.eingaben.b;
  $("abw_bauteil").value="rohr";
  $("abw_bauteil").dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(x=>setTimeout(x,80));
  return {rohr,tab,tab333,rohrDanach:{b:abwLetztes.eingaben.b,D:abwLetztes.eingaben.D},
          geteilt:ABW_GETEILT.slice()};
 });
 p(L.rohr.D===150&&L.rohr.alpha===22,"beim Rohr eingegeben: Ø 150, Winkel 22",L.rohr);
 p(L.tab.D===150&&L.tab.alpha===22,
   "beim Tablett stehen dieselben Zahlen - EIN Mass, EIN Feld",L.tab);
 // DIE ENTSCHEIDENDE GEGENPROBE: "b" heisst bei den beiden Bauteilen etwas
 // voellig anderes - beim Rohr die Schweifbord-Breite, beim Tablett das Mass
 // von Mitte Rohr nach hinten. Derselbe Buchstabe, zwei Masse. Wuerden sie
 // zusammengelegt, waere der Zuschnitt beider Bauteile falsch, ohne dass es
 // jemand sieht.
 p(L.rohr.b===18,"beim Rohr ist b die Schweifbord-Breite: 18",L.rohr.b);
 p(L.tab.b!==18&&L.tab.bFeld!=="18",
   "beim Tablett ist b ein ANDERES Mass und bleibt unberuehrt",[L.tab.b,L.tab.bFeld]);
 p(L.tab333===333,"es laesst sich unabhaengig aendern",L.tab333);
 p(L.rohrDanach.b===18,"und das Rohr behaelt seine 18",L.rohrDanach.b);
 p(L.rohrDanach.D===150,"waehrend der geteilte Durchmesser weiterhin geteilt ist",L.rohrDanach.D);
 p(L.geteilt.indexOf("b")<0,
   "\"b\" steht NICHT in der Liste der geteilten Masse",L.geteilt);
 p(L.geteilt.length===2&&L.geteilt.indexOf("alpha")>=0&&L.geteilt.indexOf("D")>=0,
   "geteilt sind genau zwei: Winkel und Durchmesser",L.geteilt);

 // ---- J  Sauberkeit --------------------------------------------------------
 console.log("\nJ · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler);

 await b.close();
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();

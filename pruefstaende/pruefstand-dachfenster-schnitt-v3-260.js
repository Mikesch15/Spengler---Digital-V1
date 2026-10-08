// Prueft die Schnittzeichnung der Dachfenstereinfassung aus v3.260.
//
// Der Auftrag des Anwenders, an einem Foto des Ruestblatts:
//   "das ganze muss uebersichtlicher werden, mann sieht nicht sofort welches
//    mass fuer welche laenge steht. Die masslinien/masse ueberschneiden sich
//    teilweise und stehen in der zeichnung drin. Es darf keine
//    ueberschneidungen geben und keine masse direkt in dem schnitt."
//   "ausserdem sollte ausgewaehlt werden koennen, ob man die einfassung mit
//    separaten seitenteilen (so wie jetzt gezeichnet) machen will oder mit
//    einem knick im seitenteil. Wenn mit knick, dann ist die ueberlappung
//    und mass I hinfaellig."
//   "ausserdem ist der gestrichelte teil der linie von mass I zu weit vorne,
//    der sollte da enden, wo die schraege linie vom trapez diese linie
//    kreuzt."
//
// Die Ueberschneidung von Beschriftung GEGEN Beschriftung prueft bereits
// pruefstand-vermassung-v3-32 ueber alle Arten; die Dachfenstereinfassung
// fehlte dort nur in den Faellen (siehe Kopf von faelle-druck.js) und ist
// jetzt drin. Hier steht das, was dort NICHT geprueft wird:
//   A  keine Beschriftung IM Schnitt (das war H und O/P)
//   B  die Bauart des Seitenteils und was sie weglaesst
//   C  die Zuschnitte folgen der Bauart
//   D  die Laenge folgt der Bauart
//   E  die verdeckte Oberkante beginnt an der KREUZUNG mit der Schraege
//   F  die Kontrolle verlangt nur Masse, die es in der Bauart gibt
//
// Jede Probe hat eine Gegenprobe: ein Pruefstand, der nur das neue Verhalten
// bestaetigt, wuerde auch gruen bleiben, wenn die Zeichnung gar nichts mehr
// zeichnet.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const FAELLE=require(path.join(process.cwd(),"pruefstaende/faelle-druck.js"));
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
const SEP=FAELLE.find(f=>f[0]==="Dachfenstereinfassung (zwei Seitenteile)")[2];
const KNI=FAELLE.find(f=>f[0]==="Dachfenstereinfassung (durchgehend mit Knick)")[2];

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof dfaSkizze==="function");

 // ---- A · Keine Beschriftung IM Schnitt -----------------------------------
 // Gemessen, nicht am Quelltext gelesen: die Zeichnung kommt in ein echtes
 // Chromium, der Rumpf des Schnitts ist der Huellkasten der BLECHLINIEN
 // (stroke-width >= 1.5; die Hilfslinien der Bemassung sind 1 und zaehlen
 // nicht mit), und jede Beschriftung wird mit getBoundingClientRect dagegen
 // gehalten. getBBox waere falsch - es liefert den Kasten vor der eigenen
 // Drehung, und die hochkanten Zahlen sind gedreht.
 console.log("\nA · Keine Beschriftung im Schnitt");
 const imSchnitt=await page.evaluate(([sep,kni])=>{
  const box=document.createElement("div");
  box.style.cssText="width:340px;position:fixed;left:0;top:0;background:#fff;z-index:99999";
  document.body.appendChild(box);
  const aus=[];
  for(const [name,d] of [["separat",sep],["knick",kni]]){
   box.innerHTML=dfaSkizze(Object.assign({},d,{skizzeSeite:"l"}));
   const svg=box.querySelector("svg");
   let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,n=0;
   svg.querySelectorAll("line").forEach(l=>{
    if(parseFloat(l.getAttribute("stroke-width")||"0")<1.5)return;
    const r=l.getBoundingClientRect(); n++;
    x0=Math.min(x0,r.left);x1=Math.max(x1,r.right);
    y0=Math.min(y0,r.top); y1=Math.max(y1,r.bottom);
   });
   const drin=[];
   svg.querySelectorAll("text").forEach(t=>{
    const txt=(t.textContent||"").trim();
    if(/^Dachfenstereinfassung/.test(txt))return;      // Fusszeile
    const r=t.getBoundingClientRect();
    const ux=Math.min(r.right,x1)-Math.max(r.left,x0);
    const uy=Math.min(r.bottom,y1)-Math.max(r.top,y0);
    if(ux>0&&uy>0)drin.push({txt,px:Math.round(ux*uy)});
   });
   // Gegenprobe: ein Text MITTEN im Rumpf muss von derselben Messung
   // gefunden werden - sonst misst sie nur nichts.
   //
   // Der Probetext haengt am Mittelpunkt einer echten Blechlinie, nicht an der
   // Mitte des Bildausschnitts. Die Bildmitte lag beim ersten Anlauf bequem im
   // Rumpf und rutschte heraus, sobald die Baender aussen herum wuchsen - die
   // Gegenprobe haette dann ab da nur noch sich selbst geprueft.
   const dick=[...svg.querySelectorAll("line")]
     .filter(l=>parseFloat(l.getAttribute("stroke-width")||"0")>=1.5)[0];
   const probe=document.createElementNS("http://www.w3.org/2000/svg","text");
   probe.setAttribute("x",(+dick.getAttribute("x1")+ +dick.getAttribute("x2"))/2);
   probe.setAttribute("y",(+dick.getAttribute("y1")+ +dick.getAttribute("y2"))/2);
   probe.setAttribute("font-size","15");
   probe.textContent="PROBE";
   svg.appendChild(probe);
   const pr=probe.getBoundingClientRect();
   const findet=Math.min(pr.right,x1)-Math.max(pr.left,x0)>0
             && Math.min(pr.bottom,y1)-Math.max(pr.top,y0)>0;
   aus.push({name,linien:n,drin,findet});
  }
  box.remove();
  return aus;
 },[SEP,KNI]);
 imSchnitt.forEach(z=>{
  p(z.linien>=10,z.name+": der Schnitt ist ueberhaupt gezeichnet ("+z.linien+" Blechlinien)",z.linien);
  p(z.drin.length===0,z.name+": keine Beschriftung steht im Schnitt",z.drin);
  p(z.findet===true,z.name+": Gegenprobe - ein Text mitten im Rumpf WIRD gefunden");
 });

 // ---- A2 · Keine Fuehrungslinie kreuzt eine andere ------------------------
 // Die Bandzuteilung vergleicht nur WAAGERECHTE Ausdehnungen. Zwei Fahnen
 // koennen daran vorbei trotzdem uebereinander laufen: zeigt die linke Fahne
 // nach rechts und die rechte nach links, kreuzen sich ihre Fuehrungslinien,
 // obwohl ihre Texte sauber nebeneinander liegen.
 // Ehrlichkeitshalber: beim Bauen sah es im Bild so aus, als kreuzten sich
 // die Fahnen von Aufbug und Abdeckkappe - gemessen taten sie es nie, ihre
 // x-Bereiche ueberschneiden sich nicht einmal (494..548 gegen 603..613).
 // Diese Probe ist deshalb kein Nachweis einer behobenen Stelle, sondern ein
 // Netz unter einer Luecke, die die Bandzuteilung bauartbedingt nicht sehen
 // kann.
 console.log("\nA2 · Keine Fuehrungslinie kreuzt eine andere");
 const kreuzen=await page.evaluate(([sep,kni])=>{
  const box=document.createElement("div");
  box.style.cssText="width:340px;position:fixed;left:0;top:0;z-index:99999";
  document.body.appendChild(box);
  // Schnitt zweier Strecken, echte Ueberkreuzung (keine blosse Beruehrung).
  const seite=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const kreuzt=(p1,p2,p3,p4)=>{
   const d1=seite(p3,p4,p1),d2=seite(p3,p4,p2),d3=seite(p1,p2,p3),d4=seite(p1,p2,p4);
   return ((d1>0&&d2<0)||(d1<0&&d2>0))&&((d3>0&&d4<0)||(d3<0&&d4>0));
  };
  const aus=[];
  for(const [name,d] of [["separat",sep],["knick",kni]]){
   box.innerHTML=dfaSkizze(Object.assign({},d,{skizzeSeite:"l"}));
   // Fuehrungslinien: stroke-width 1, und am Punkt sitzt ein Kreis (anbFahne).
   const kreise=[...box.querySelectorAll("circle")].map(c=>[+c.getAttribute("cx"),+c.getAttribute("cy")]);
   // Nur die echten Fahnenlinien: anbFahne setzt stroke-width direkt an die
   // Linie, anbMassWaag vererbt es von der Gruppe. Ohne diese Unterscheidung
   // landeten auch Hilfslinien in der Pruefung (sechs statt drei).
   const fahnen=[...box.querySelectorAll("line[stroke-width='1']")]
    .map(l=>[[+l.getAttribute("x1"),+l.getAttribute("y1")],
             [+l.getAttribute("x2"),+l.getAttribute("y2")]])
    .filter(([a])=>kreise.some(k=>Math.abs(k[0]-a[0])<0.6&&Math.abs(k[1]-a[1])<0.6));
   const paare=[];
   for(let i=0;i<fahnen.length;i++)for(let j=i+1;j<fahnen.length;j++)
    if(kreuzt(fahnen[i][0],fahnen[i][1],fahnen[j][0],fahnen[j][1]))paare.push([i,j]);
   // Gegenprobe: zwei absichtlich gekreuzte Strecken MUESSEN erkannt werden.
   const probe=kreuzt([0,0],[10,10],[0,10],[10,0]);
   aus.push({name,fahnen:fahnen.length,kreise:kreise.length,paare,probe});
  }
  box.remove();
  return aus;
 },[SEP,KNI]);
 kreuzen.forEach(z=>{
  p(z.fahnen===z.kreise&&z.fahnen>=3,
    z.name+": genau die Fahnen sind erfasst, keine Hilfslinie ("+z.fahnen+" zu "+z.kreise+" Punkten)",z);
  p(z.paare.length===0,z.name+": keine zwei Fuehrungslinien kreuzen sich",z.paare);
  p(z.probe===true,z.name+": Gegenprobe - ein echtes Kreuz WIRD erkannt");
 });

 // ---- A3 · Keine Zahl liegt auf einer Linie -------------------------------
 // A prueft Zahl gegen Schnitt, A2 Linie gegen Linie. Dazwischen blieb eine
 // Luecke: eine Zahl auf einer FUEHRUNGS- oder MASSLINIE. Genau da landete
 // "M = 120", als kurze Masse anfingen, seitlich auszuweichen - es wich nach
 // aussen aus, mitten in die Fuehrungslinie der Abdeckkappe.
 console.log("\nA3 · Keine Zahl liegt auf einer Linie");
 const aufLinie=await page.evaluate(([sep,kni])=>{
  const box=document.createElement("div");
  box.style.cssText="width:340px;position:fixed;left:0;top:0;background:#fff;z-index:99999";
  document.body.appendChild(box);
  // Schneidet die Strecke den Kasten? (Clipping nach Liang-Barsky, kurz)
  const trifft=(p1,p2,k)=>{
   let t0=0,t1=1; const dx=p2[0]-p1[0], dy=p2[1]-p1[1];
   const pr=[-dx,dx,-dy,dy], qr=[p1[0]-k.l,k.r-p1[0],p1[1]-k.o,k.u-p1[1]];
   for(let i=0;i<4;i++){
    if(pr[i]===0){ if(qr[i]<0)return false; continue }
    const t=qr[i]/pr[i];
    if(pr[i]<0){ if(t>t1)return false; if(t>t0)t0=t } else { if(t<t0)return false; if(t<t1)t1=t }
   }
   return t0<t1;
  };
  const aus=[];
  for(const [name,d] of [["separat",sep],["knick",kni]]){
   box.innerHTML=dfaSkizze(Object.assign({},d,{skizzeSeite:"l"}));
   const svg=box.querySelector("svg");
   const sr=svg.getBoundingClientRect();
   const vb=svg.viewBox.baseVal, f=sr.width/vb.width;
   const nach=(x,y)=>[(x-vb.x)*f+sr.left,(y-vb.y)*f+sr.top];
   const linien=[...svg.querySelectorAll("line")].map(l=>[
     nach(+l.getAttribute("x1"),+l.getAttribute("y1")),
     nach(+l.getAttribute("x2"),+l.getAttribute("y2"))]);
   const schnitt=[];
   svg.querySelectorAll("text").forEach(t=>{
    const txt=(t.textContent||"").trim();
    if(/^Dachfenstereinfassung/.test(txt))return;
    const r=t.getBoundingClientRect();
    // 1,5 Punkt Toleranz: die eigene Masslinie endet an der Zahl, ein
    // Pixel Beruehrung ist kein Durchstrich.
    const k={l:r.left+1.5,r:r.right-1.5,o:r.top+1.5,u:r.bottom-1.5};
    if(k.r<=k.l||k.u<=k.o)return;
    if(linien.some(([a,b])=>trifft(a,b,k)))schnitt.push(txt);
   });
   // Gegenprobe: eine Strecke quer durch den ersten Text MUSS auffallen.
   const ers=[...svg.querySelectorAll("text")][0].getBoundingClientRect();
   const probe=trifft([ers.left-20,(ers.top+ers.bottom)/2],[ers.right+20,(ers.top+ers.bottom)/2],
     {l:ers.left+1.5,r:ers.right-1.5,o:ers.top+1.5,u:ers.bottom-1.5});
   aus.push({name,linien:linien.length,schnitt,probe});
  }
  box.remove();
  return aus;
 },[SEP,KNI]);
 aufLinie.forEach(z=>{
  p(z.schnitt.length===0,z.name+": keine Zahl wird von einer Linie durchschnitten",z.schnitt);
  p(z.probe===true,z.name+": Gegenprobe - eine Linie quer durch eine Zahl WIRD erkannt");
 });

 // ---- B · Bauart des Seitenteils -------------------------------------------
 console.log("\nB · Die Bauart bestimmt, welche Masse es gibt");
 const masse=await page.evaluate(([sep,kni])=>{
  const box=document.createElement("div");
  box.style.cssText="width:340px;position:fixed;left:0;top:0;z-index:99999";
  document.body.appendChild(box);
  const lies=d=>{
   box.innerHTML=dfaSkizze(Object.assign({},d,{skizzeSeite:"l"}));
   return [...box.querySelectorAll("text")].map(t=>(t.textContent||"").trim());
  };
  const a={separat:lies(sep),knick:lies(kni)};
  box.remove();
  return {a,bH:dfaBuchstabe("ueberlappung"),bI:dfaBuchstabe("c"),bG:dfaBuchstabe("b")};
 },[SEP,KNI]);
 const hat=(liste,bu)=>liste.some(t=>new RegExp("^"+bu+"\\s*=").test(t));
 p(hat(masse.a.separat,masse.bH),"separat: die Ueberlappung "+masse.bH+" ist bemasst",masse.a.separat);
 p(hat(masse.a.separat,masse.bI),"separat: Mass "+masse.bI+" ist bemasst",masse.a.separat);
 p(!hat(masse.a.knick,masse.bH),"knick: die Ueberlappung "+masse.bH+" ist WEG",masse.a.knick);
 p(!hat(masse.a.knick,masse.bI),"knick: Mass "+masse.bI+" ist WEG",masse.a.knick);
 p(hat(masse.a.knick,masse.bG),"knick: Mass "+masse.bG+" ist weiterhin da",masse.a.knick);
 const gWert=(masse.a.knick.find(t=>new RegExp("^"+masse.bG+"\\s*=").test(t))||"");
 p(/1[’'´’\s.]?005/.test(gWert),"knick: "+masse.bG+" zeigt die GANZE Laenge (1005), nicht 380",gWert);
 p(/durchgehend mit Knick/.test(masse.a.knick.join(" ")),"knick: die Fusszeile nennt die Bauart");
 p(/zwei separate Seitenteile/.test(masse.a.separat.join(" ")),"separat: die Fusszeile nennt die Bauart");

 // ---- C/D · Zuschnitte und Laenge folgen der Bauart ------------------------
 console.log("\nC · Zuschnitte und Laenge folgen der Bauart");
 const rechnung=await page.evaluate(([sep,kni])=>{
  const mit=d=>{dfaA=Object.assign(dfaLeer(),d);
   return {z:dfaZuschnitte().filter(x=>x.rolle==="seite").map(x=>x.name+" "+x.laenge),
           alle:dfaZuschnitte().length, L:dfaLaenge("l")}};
  return {separat:mit(sep),knick:mit(kni)};
 },[SEP,KNI]);
 // v3.270: auf den neuen Vertrag umgestellt (Ansage des Anwenders, 8.10.2026):
 // BEIDE Bauarten rechnen jetzt mit Vorderteil, Hinterteil und je Seite einem
 // Seitenteil plus einem Seitenteil hinten - sechs Zuschnitte. Die Teilung am
 // Knick (vorne / Mitte / hinten) und die letzten 10 mm gibt es nicht mehr.
 // Die alten Erwartungen (acht bzw. 995 + 10) bleiben als GEGENPROBE stehen:
 // sie duerfen nicht zurueckkommen.
 p(rechnung.separat.alle===6,"separat: sechs Zuschnitte (nicht mehr acht)",rechnung.separat.alle);
 p(rechnung.knick.alle===6,"knick: sechs Zuschnitte",rechnung.knick.alle);
 p(rechnung.separat.alle!==8,"Gegenprobe: die alte Teilung in acht Zuschnitte kommt nicht zurueck",rechnung.separat.alle);
 p(rechnung.separat.L===1005,"separat: Laenge = B + I - H = 1005",rechnung.separat.L);
 p(rechnung.knick.L===1005,"knick: Laenge = B = 1005",rechnung.knick.L);
 p(rechnung.separat.z.filter(t=>t==="Seitenteil 1005").length===2,"separat: je Seite EIN Seitenteil ueber die ganze Laenge (B + I - H = 1005)",rechnung.separat.z);
 p(!rechnung.separat.z.some(t=>/^Seitenteil (vorne|Mitte) /.test(t)),"Gegenprobe separat: kein Seitenteil vorne/Mitte mehr",rechnung.separat.z);
 p(!rechnung.knick.z.some(t=>/^Seitenteil (vorne|Mitte) /.test(t)),"knick: kein Seitenteil vorne/Mitte mehr",rechnung.knick.z);
 p(rechnung.knick.z.filter(t=>t==="Seitenteil 1005").length===2,"knick: je Seite EIN durchgehendes Seitenteil ueber die ganze Laenge 1005",rechnung.knick.z);
 p(!rechnung.knick.z.some(t=>t==="Seitenteil 995"),"Gegenprobe knick: nicht mehr 995 plus 10 mm Ruecklauf",rechnung.knick.z);

 // ---- E · Die verdeckte Oberkante beginnt an der Kreuzung ------------------
 // av = 100, ah = 100, bu = 385, bo = 120, L = 1005.
 // Fuss der Schraege:   L - bu                      =  620   (war es bisher)
 // Kreuzung bei y = av: (L-bu) + (av/ah)*(bu-bo)    =  885
 // Die beiden liegen 265 mm auseinander - die Probe kann also nicht zufaellig
 // auf beides passen.
 console.log("\nE · Die verdeckte Oberkante beginnt an der Kreuzung mit der Schraege");
 const kante=await page.evaluate(sep=>{
  const box=document.createElement("div");
  box.style.cssText="width:340px;position:fixed;left:0;top:0;z-index:99999";
  document.body.appendChild(box);
  box.innerHTML=dfaSkizze(Object.assign({},sep,{skizzeSeite:"l"}));
  const svg=box.querySelector("svg");
  // Die Oberkante liegt auf Hoehe av: die durchgezogene endet dort, wo die
  // gestrichelte beginnt. Beide waagerecht (y1 == y2) auf derselben Hoehe.
  const waag=[...svg.querySelectorAll("line")].map(l=>({
    x1:+l.getAttribute("x1"),y1:+l.getAttribute("y1"),
    x2:+l.getAttribute("x2"),y2:+l.getAttribute("y2"),
    strich:l.getAttribute("stroke-dasharray")||"",
    dick:parseFloat(l.getAttribute("stroke-width")||"0")}))
   .filter(l=>Math.abs(l.y1-l.y2)<0.3&&l.dick>=1.5);
  box.remove();
  const hoehen={};
  waag.forEach(l=>{(hoehen[l.y1.toFixed(1)]=hoehen[l.y1.toFixed(1)]||[]).push(l)});
  // die Oberkante ist die Hoehe, auf der eine volle UND eine gestrichelte liegt
  const treffer=Object.values(hoehen).find(g=>g.some(l=>!l.strich)&&g.some(l=>l.strich));
  if(!treffer)return null;
  const voll=treffer.find(l=>!l.strich), gestrichelt=treffer.find(l=>l.strich);
  return {vollBis:Math.max(voll.x1,voll.x2),strichAb:Math.min(gestrichelt.x1,gestrichelt.x2)};
 },SEP);
 p(kante!==null,"die Oberkante ist voll UND gestrichelt gezeichnet",kante);
 if(kante){
  p(Math.abs(kante.vollBis-kante.strichAb)<0.6,
    "die gestrichelte beginnt genau dort, wo die volle endet - keine Luecke",kante);
  // Umgerechnet in Millimeter ueber die beiden bekannten Punkte waere
  // aufwendig; die Probe nutzt stattdessen das Verhaeltnis: die Kreuzung
  // liegt bei 885 von 1005, der Fuss der Schraege bei 620. Gemessen wird
  // gegen die Trapez-Schraege selbst.
  const lage=await page.evaluate(sep=>{
   const box=document.createElement("div");
   box.style.cssText="width:340px;position:fixed;left:0;top:0;z-index:99999";
   document.body.appendChild(box);
   box.innerHTML=dfaSkizze(Object.assign({},sep,{skizzeSeite:"l"}));
   const svg=box.querySelector("svg");
   const linien=[...svg.querySelectorAll("line")].map(l=>({
     x1:+l.getAttribute("x1"),y1:+l.getAttribute("y1"),
     x2:+l.getAttribute("x2"),y2:+l.getAttribute("y2"),
     strich:l.getAttribute("stroke-dasharray")||"",
     dick:parseFloat(l.getAttribute("stroke-width")||"0")}));
   box.remove();
   // Die Schraege des Trapezes: die einzige schiefe dicke Linie, die nach
   // oben rechts laeuft.
   const schraege=linien.filter(l=>l.dick>=2.5&&Math.abs(l.y1-l.y2)>2&&Math.abs(l.x1-l.x2)>2)
     .sort((a,b)=>Math.abs(b.x1-b.x2)-Math.abs(a.x1-a.x2))[0];
   const oben=linien.filter(l=>Math.abs(l.y1-l.y2)<0.3&&l.dick>=1.5);
   const hoehen={};
   oben.forEach(l=>{(hoehen[l.y1.toFixed(1)]=hoehen[l.y1.toFixed(1)]||[]).push(l)});
   const g=Object.values(hoehen).find(z=>z.some(l=>!l.strich)&&z.some(l=>l.strich));
   const voll=g.find(l=>!l.strich);
   const yKante=voll.y1, xEnde=Math.max(voll.x1,voll.x2);
   // x der Schraege auf Hoehe yKante
   const t=(yKante-schraege.y1)/(schraege.y2-schraege.y1);
   return {xEnde,xSchraege:schraege.x1+t*(schraege.x2-schraege.x1),
           xFuss:Math.max(schraege.x1,schraege.x2)===schraege.x2?schraege.x1:schraege.x2};
  },SEP);
  p(Math.abs(lage.xEnde-lage.xSchraege)<2,
    "die volle Oberkante endet GENAU auf der Schraege, nicht am Fuss",lage);
  p(Math.abs(lage.xEnde-lage.xFuss)>20,
    "Gegenprobe: der Fuss der Schraege ist deutlich weiter vorne - die Probe ist nicht beliebig",lage);
 }

 // ---- F · Die Kontrolle verlangt nur Masse, die es gibt --------------------
 console.log("\nF · Die Kontrolle verlangt nur Masse, die es in der Bauart gibt");
 const kontrolle=await page.evaluate(([sep,kni])=>{
  const leerMachen=d=>Object.assign({},d,{ueberlappung:"",c:{l:"",r:""}});
  const texte=d=>{dfaA=Object.assign(dfaLeer(),d);
   return dfaPruefungen().filter(x=>x.art==="fehler").map(x=>x.text)};
  return {separat:texte(leerMachen(sep)),knick:texte(leerMachen(kni)),
          bH:dfaBuchstabe("ueberlappung"),bI:dfaBuchstabe("c")};
 },[SEP,KNI]);
 const nennt=(liste,bu)=>liste.some(t=>new RegExp("(^|[^A-Za-z])"+bu+"([^A-Za-z]|$)").test(t));
 p(nennt(kontrolle.separat,kontrolle.bH),"separat: ohne Ueberlappung beanstandet die Kontrolle "+kontrolle.bH,kontrolle.separat);
 p(nennt(kontrolle.separat,kontrolle.bI),"separat: ohne Mass "+kontrolle.bI+" beanstandet sie es",kontrolle.separat);
 p(!nennt(kontrolle.knick,kontrolle.bH),"knick: die Ueberlappung wird NICHT verlangt",kontrolle.knick);
 p(!nennt(kontrolle.knick,kontrolle.bI),"knick: Mass "+kontrolle.bI+" wird NICHT verlangt",kontrolle.knick);

 // ---- G · Altbestand ------------------------------------------------------
 // Eine vor v3.260 gespeicherte Aufnahme hat kein Feld seitenteilArt. Sie
 // muss sich unveraendert verhalten - sonst waere jede alte Dachfenster-
 // aufnahme im Bestand ploetzlich eine andere Einfassung.
 console.log("\nG · Aufnahmen von vor v3.260 bleiben, wie sie waren");
 const alt=await page.evaluate(sep=>{
  const ohne=Object.assign({},sep); delete ohne.seitenteilArt;
  dfaA=Object.assign(dfaLeer(),ohne); delete dfaA.seitenteilArt;
  return {knick:dfaMitKnick(),L:dfaLaenge("l"),zuschnitte:dfaZuschnitte().length};
 },SEP);
 p(alt.knick===false,"ohne Feld seitenteilArt gilt: zwei separate Seitenteile",alt);
 p(alt.L===1005,"ohne Feld rechnet sie wie bisher die Laenge 1005 mm",alt);
 // v3.270: die Zuschnitte selbst sind neu gefasst (sechs, nicht acht) - das gilt
 // auch fuer eine Aufnahme ohne das Feld: sie rechnet beim naechsten Oeffnen neu.
 p(alt.zuschnitte===6,"und rechnet beim Oeffnen mit den neuen sechs Zuschnitten",alt);

 // ---- I · Die Wahl der Bauart ist zu sehen und zu bedienen ----------------
 // Meldung des Anwenders: "wo kann jetzt mit oder ohne knick ausgewaehlt
 // werden? Ich sehe es nirgends." Die Knoepfe standen da - nur sah man dem
 // aktiven nichts an: class="gray blue" ergibt GRAU, weil .gray in
 // css/01-basis.css nach .blue steht und beide gleich stark sind. Zwei
 // gleich aussehende graue Knoepfe liest niemand als Wahl.
 // v3.271: aus den zwei Knoepfen der Bauart wurden mit den Knoepfen der
 // Ausfuehrung zusammen ZWEI PFLICHT-DROPDOWNS (Ansage des Anwenders). Die
 // Frage von v3.261 - ist die Wahl zu erkennen? - gilt weiter: ein leeres
 // Dropdown muss als offene Pflicht auffallen, ein gewaehltes den Wert zeigen.
 console.log("\nI · Die Bauart ist als Wahl zu erkennen (Pflicht-Dropdown)");
 const wahl=await page.evaluate(()=>{
  measurementMaterials=[{id:2,name:"Titanzink"}];
  dfaA=dfaLeer();
  const box=document.createElement("div");
  box.style.cssText="width:400px;position:fixed;left:0;top:0;background:#fff;z-index:99999";
  document.body.appendChild(box);
  const lies=()=>{
   box.innerHTML=dfaMasseHtml();
   markierePflichtfelder(box);
   const sel=box.querySelector("#dfa_seitenteilArt");
   return {da:!!sel, pflicht:!!(sel&&sel.hasAttribute("data-pflicht")&&sel.required),
    wert:sel?sel.value:null, gueltig:sel?sel.checkValidity():null,
    optionen:sel?[...sel.options].map(o=>o.value+"|"+o.textContent.trim()):[],
    alteKnoepfe:box.querySelectorAll("[data-dfa-seitenteil],[data-dfa-ausfuehrung]").length};
  };
  const vorher=lies();
  dfaA.seitenteilArt="knick";
  const nachher=lies();
  box.remove();
  return {vorher,nachher};
 });
 p(wahl.vorher.da&&wahl.vorher.pflicht,"die Bauart ist ein Dropdown und Pflichtfeld",wahl.vorher);
 p(wahl.vorher.wert===""&&wahl.vorher.gueltig===false,"neu: nichts vorgewaehlt, das Feld ist ungueltig (die Weiter-Sperre greift)",wahl.vorher);
 p(wahl.vorher.optionen.length===3&&/^\|– bitte wählen –/.test(wahl.vorher.optionen[0]),
   "erste Option ist \"bitte waehlen\", dann die zwei Bauarten",wahl.vorher.optionen);
 p(wahl.nachher.wert==="knick"&&wahl.nachher.gueltig===true,"knick gewaehlt: der Wert steht da, das Feld ist gueltig",wahl.nachher);
 p(wahl.vorher.alteKnoepfe===0,"Gegenprobe: die vier alten Auswahlknoepfe gibt es nicht mehr",wahl.vorher);
 // Dieselbe Falle steckt ueberall, wo ein Knopf beide Klassen traegt -
 // deshalb hier eine Probe ueber ALLE Dateien, nicht nur ueber diese eine.
 const beides=fs.readdirSync("js").filter(f=>/\.js$/.test(f))
  .map(f=>({f,t:fs.readFileSync("js/"+f,"utf8")}))
  .filter(x=>/class="[^"]*\bgray\b[^"]*\bblue\b|class="[^"]*\bblue\b[^"]*\bgray\b/.test(x.t))
  .map(x=>x.f);
 p(beides.length===0,"kein Knopf traegt gray und blue zugleich - .gray wuerde gewinnen",beides);

 // ---- J · N steht auf der Hoehe von R ------------------------------------------
 // Ansage des Anwenders am 8.10.2026: "setze in der schnittskizze das mass N
 // auf die selbe hoehe wie mass R". N endet dort, wo R beginnt; sie grenzen
 // aneinander. Der Bandverteiler sah die Randzugabe der beiden Kaesten als
 // Ueberlappung und stellte N in ein eigenes, tieferes Band. Gemessen wird an
 // der gezeichneten Zahl: gleiche y-Lage von "N = ..." und "R = ...".
 // Gegenprobe: ist N so breit, dass die Zahl von R in seinen Bereich rutschen
 // wuerde, bleibt es bei eigenen Baendern - es wird nicht auf Verdacht gestapelt.
 console.log("\nJ · N steht auf der Hoehe von R");
 const hoehe=await page.evaluate(()=>{
  const nord={getrennt:false,lattenabstand:355,seitenteilArt:"knick",ueberlappung:"",
   breiteVorne:554,breiteHinten:570,umschlagVorne:10,umschlagSeite:10,saumVorne:35,
   breiteOben:120,breiteUnten:160,randAbstand:15,randStrich:12,
   a:{l:225,r:225},b:{l:990,r:990},c:{l:"",r:""},d:{l:295,r:295},f:{l:50,r:50},g:{l:50,r:50},
   aufVorne:80,aufHinten:95,e:35,eUmschlag:15,anreiff:15,anreiffUmschlag:10,skizzeSeite:"l"};
  const box=document.createElement("div");
  box.style.cssText="width:740px;position:fixed;left:0;top:0;background:#fff;z-index:99999";
  document.body.appendChild(box);
  const lage=d=>{
   box.innerHTML=dfaSkizze(d);
   const t=[...box.querySelectorAll("svg text")];
   const y=pre=>{const e=t.find(x=>x.textContent.trim().indexOf(pre)===0);return e?+e.getAttribute("y"):null};
   return {N:y("N = "),R:y("R = "),C:y("C = ")};
  };
  const r={nord:lage(nord),
   breit:lage(Object.assign({},nord,{breiteUnten:400,d:{l:120,r:120}})),
   anders:lage(Object.assign({},nord,{breiteUnten:200,d:{l:200,r:200},a:{l:300,r:300}}))};
  box.remove();
  return r;
 });
 p(hoehe.nord.N!==null&&hoehe.nord.N===hoehe.nord.R,"Nord Nr.1: N und R stehen auf derselben Hoehe",hoehe.nord);
 p(hoehe.nord.C===hoehe.nord.R,"und auf der von C - alle drei unten in einer Reihe",hoehe.nord);
 p(hoehe.anders.N!==null&&hoehe.anders.N===hoehe.anders.R,"auch mit anderen Massen (N 200, R 200): gleiche Hoehe",hoehe.anders);
 p(hoehe.breit.N!==null&&hoehe.breit.N!==hoehe.breit.R,
   "Gegenprobe: ist N so breit, dass die Zahl von R in sein Mass reichen wuerde, bleibt N tiefer",hoehe.breit);

 console.log("\nH · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler);

 await b.close();
 console.log("\n"+(ok+fail>0?ok+"/"+(ok+fail):"0/0")+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 process.exit(fail?1:0);
})();

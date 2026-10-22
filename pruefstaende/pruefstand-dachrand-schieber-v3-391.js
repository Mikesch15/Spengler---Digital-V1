// v3.391: Dachrandblech mit Schieber (wie Mauerabdeckung, SIA 271) und Eckschieber als Gehrung mit eigenem Abzug.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,600):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{window.appAlert=async()=>{};
  window.madMaterialTabelle=()=>({label:"Titanzink",maxAbstand:5000,abEcke:2500});   // feste SIA-Werte fuer den Test
  window.K=(l,e,x,w)=>({laenge:l,ecke:e||"aussen",winkel:w===undefined?90:w,eckschieber:!!x});
  window.D=(kanten,o)=>Object.assign({detail:"1.5",kanten,geschlossen:false,stoss:"schieber",schieber:{zugabe:"",abzug:""},stueck:{laenge:3000,ueberlappung:40,gleich:false},streifen:{aktiv:false}},o||{});
  window.L=r=>r.stuecke.map(s=>s.kante+":"+s.laenge).join(" ");
 });
 const ev=(f,...a)=>page.evaluate(f,...a);

 console.log("\nA · Überlappung bleibt unverändert");
 let r=await ev(()=>{const d=D([K(7000,"aussen"),K(5000,"ende")],{stoss:"ueberlappung"});return {neu:drbStueckeFuer(d,null).stuecke,alt:drbStueckeBerechnen(d.kanten,3000,40,false).stuecke}});
 p(JSON.stringify(r.neu)===JSON.stringify(r.alt)&&r.neu.length===5,"Stossart «Überlappung»: genau dieselben Stücke wie vor v3.391",{n:r.neu.length});
 r=await ev(()=>{const d=D([K(7000,"aussen")]);delete d.stoss;return drbStueckeFuer(d,null).modus});
 p(r===undefined,"Alte gespeicherte Daten ohne «stoss» rechnen wie bisher (Überlappung)");

 console.log("\nB · Schieber nach SIA 271 (Titanzink: 5.00 m, ab Ecke 2.50 m)");
 r=await ev(()=>{const d=D([K(12000,"ende")],{schieber:{zugabe:30,abzug:""}});const x=drbStueckeFuer(d,null);return {l:x.stuecke.map(s=>s.laenge),n:x.schieberAnzahl,mat:x.materialLaenge,ok:x.ok}});
 p(r.ok&&r.n===2&&r.l.join(",")==="4030,4060,4030","12 m ohne Ecke: 2 Schieber, 3 Stücke, Zugabe 30 mm je Stückende am Schieber (4030 + 4060 + 4030)",r);
 p(r.mat===12000+4*30,"Material = Länge + 4 Schieber-Stückenden × 30 mm",r.mat);
 r=await ev(()=>{const d=D([K(12000,"ende")],{schieber:{zugabe:50,abzug:""}});const x=drbStueckeFuer(d,null);return x.stuecke.map(s=>s.laenge).join(",")});
 p(r==="4050,4100,4050","Die Zugabe in der Massaufnahme gilt (50)",r);
 r=await ev(()=>{const d=D([K(4000,"ende")],{schieber:{zugabe:30,abzug:""}});return drbStueckeFuer(d,null).stuecke.map(s=>s.laenge+":"+s.von+"-"+s.bis).join(" ")});
 p(r==="4000:0-4000","Eine Kante unter 5 m braucht keinen Schieber: ein Stück ohne Zugabe",r);
 r=await ev(()=>{const d=D([K(8000,"aussen"),K(6000,"ende")],{schieber:{zugabe:30,abzug:""}});return L(drbStueckeFuer(d,null))});
 p(r==="0:2780 0:2810 0:2530 1:2530 1:3530","Mit Ecke gilt ab Ecke der halbe Abstand (2.50 m) – Zugaben nur am Schieber, nicht an der Ecke",r);

 console.log("\nC · Eckschieber (Gehrung) mit eigenem Abzug");
 r=await ev(()=>{const d=D([K(8000,"aussen",true),K(6000,"ende")],{schieber:{zugabe:30,abzug:20}});const x=drbStueckeFuer(d,null);return {s:L(x),e:x.eckschieber,n:x.schieberAnzahl,ar:x.stuecke.map(s=>s.links+"/"+s.rechts)}});
 p(r.s==="0:4030 0:4010 1:3010 1:3030"&&JSON.stringify(r.e)==="[0]","Eckschieber in der Ecke: beide Stücke an der Ecke −20 mm (4030−20+… = 4010 / 3010), die Ecke ist kein Fixpunkt mehr (nur 1 Schieber je Kante)",r);
 p(r.ar.join(" ")==="ende/schieber schieber/eckschieber eckschieber/schieber schieber/ende","Die Stückenden sind richtig benannt (Eckschieber ≠ Schieber)",r.ar);
 r=await ev(()=>{const d=D([K(8000,"aussen",true),K(6000,"ende")],{schieber:{zugabe:30,abzug:""}});return L(drbStueckeFuer(d,null))});
 p(r==="0:4030 0:4030 1:3030 1:3030","Ohne eigenen Abzug (leer) wird an der Ecke nichts abgezogen und NICHT die Gehrungszugabe benutzt",r);
 r=await ev(()=>{const d=D([K(8000,"aussen",true),K(6000,"ende")],{schieber:{zugabe:30,abzug:100000}});const x=drbStueckeFuer(d,null);return {ok:x.ok,f:x.fehler}});
 p(r.ok===false&&/Abzug des Eckschiebers ist zu gross/.test(r.f),"Ein zu grosser Abzug gibt eine verständliche Fehlermeldung",r);
 r=await ev(()=>{const d=D([K(8000,"ende",true),K(6000,"ende")]);const x=drbStueckeFuer(d,null);return x.eckschieber.length});
 p(r===0,"An einer «Ende»-Kante gibt es keine Ecke – ein gesetzter Haken wird ignoriert");
 r=await ev(()=>{const d=D([K(8000,"winkel",true,0),K(6000,"ende")]);return drbStueckeFuer(d,null).eckschieber.length});
 p(r===0,"Winkel 0° ist keine Ecke – kein Eckschieber");
 r=await ev(()=>{const d=D([K(9000,"aussen",true),K(6000,"aussen"),K(9000,"aussen"),K(6000,"aussen",true)],{geschlossen:true,schieber:{zugabe:30,abzug:20}});const x=drbStueckeFuer(d,null);
  return {e:x.eckschieber,erste:x.stuecke.filter(s=>s.kante===0)[0],letzte:x.stuecke.filter(s=>s.kante===3).slice(-1)[0],mitte:x.stuecke.filter(s=>s.kante===0).slice(-1)[0]}});
 p(JSON.stringify(r.e)==="[0,3]","Umlaufend: die Schluss-Ecke (Kante 4 → 1) zählt genau einmal, zusammen mit Kante 1 → 2: [0,3]",r.e);
 p(r.erste.links==="eckschieber"&&r.letzte.rechts==="eckschieber","Umlaufend: das erste Stück von Kante 1 und das letzte von Kante 4 enden am Eckschieber (Abzug auf beiden Seiten der Schluss-Ecke)",{a:r.erste.links,b:r.letzte.rechts});

 console.log("\nD · Speichern, Laden, Druck und Zeichnung");
 r=await ev(()=>{
  fpA=fpaLeer();fpA.material="";fpA.dachrand=D([K(8000,"aussen",true),K(6000,"ende")],{schieber:{zugabe:30,abzug:20}});fpA.variante="dachrand";drbDetailLaden();fpA.dachrand.stoss="schieber";fpA.dachrand.schieber={zugabe:30,abzug:20};fpA.dachrand.kanten[0].eckschieber=true;
  drbSync();const dat=drbDaten();const zur=drbAusData(JSON.parse(JSON.stringify(dat)));
  const o=drbSvgOptionenAusDaten(dat);const svg=drbGrundrissSvg(dat.kanten,false,o);
  const svgOhne=drbGrundrissSvg(dat.kanten,false,drbSvgOptionenAusDaten({...dat,ergebnis:{...dat.ergebnis,eckschieber:[]}}));
  const old=JSON.parse(JSON.stringify(dat));old.stoss="ueberlappung";
  const alt=drbSvgOptionenAusDaten(old),altOhneVon=drbSvgOptionenAusDaten({...dat,ergebnis:{...dat.ergebnis,stuecke:dat.ergebnis.stuecke.map(x=>({kante:x.kante,nr:x.nr,laenge:x.laenge}))}});
  return {dat:{stoss:dat.stoss,sch:dat.schieber,ek:dat.kanten.map(k=>k.eckschieber),st:dat.ergebnis.stuecke.map(s=>s.laenge+"/"+s.von),eck:dat.ergebnis.eckschieber,info:dat.ergebnis.schieber},
   zur:{stoss:zur.stoss,sch:zur.schieber,ek:zur.kanten.map(k=>k.eckschieber)},modus:o.modus,raute:/Z" fill="#1565a8" stroke="#fff"/.test(svg),rauteOhne:/Z" fill="#1565a8" stroke="#fff"/.test(svgOhne),alt:alt.modus,altOhneVon:altOhneVon.modus}});
 p(r.dat.stoss==="schieber"&&r.dat.sch.zugabe===30&&r.dat.sch.abzug===20&&JSON.stringify(r.dat.ek)==="[true,false]","Gespeichert werden Stossart, Zugabe, Abzug und der Eckschieber-Haken",r.dat);
 p(r.dat.st.length===4&&r.dat.st[0].includes("/")&&JSON.stringify(r.dat.eck)==="[0]"&&r.dat.info.material==="Titanzink","Die Ergebnisse (Stücke mit Lage, Eckschieber, SIA-Werte) werden mitgespeichert – ein gedrucktes Blatt bleibt gleich",r.dat);
 p(r.zur.stoss==="schieber"&&r.zur.sch.abzug===20&&JSON.stringify(r.zur.ek)==="[true,false]","Laden gibt dieselben Eingaben zurück (Rundlauf)",r.zur);
 p(r.modus==="schieber"&&r.raute===true&&r.rauteOhne===false,"Die Zeichnung zeigt die Eckschieber als blaue Raute – und nur dort, wo einer gewählt ist",{m:r.modus,a:r.raute,b:r.rauteOhne});
 const orange=await ev(()=>{const dat=drbDaten();const svg=drbGrundrissSvg(dat.kanten,false,drbSvgOptionenAusDaten(dat));return {n:(svg.match(/stroke="#d9480f"/g)||[]).length,sl:dat.ergebnis.schieber.anzahl}});
 p(orange.n===orange.sl&&orange.n===2,"Die Zeichnung setzt genau so viele orange Schieber-Striche wie es Schieber gibt (2)",orange);
 p(r.alt===undefined&&r.altOhneVon===undefined,"Alte oder unvollständige Speicherstände zeichnen wie bisher (Überlappung)",{a:r.alt,b:r.altOhneVon});
 r=await ev(()=>{const dat=drbDaten();const cell=(t,v)=>`<td>${t}</td><td>${v}</td>`;const h=drbDruckHtml({dachrand:dat},cell);dat.stoss="ueberlappung";dat.schieber={zugabe:"",abzug:""};delete dat.ergebnis.schieber;const h2=drbDruckHtml({dachrand:dat},cell);return {schieber:/Schieber \(SIA 271, Titanzink\)/.test(h),eck:/Eckschieber \(Gehrung\)/.test(h),abzug:/Abzug Eckschieber/.test(h),zeile:/Aussenecke 90° · Eckschieber \(Gehrung\)/.test(h),ueb:/Überlappung/.test(h2)&&!/SIA 271/.test(h2)}});
 p(r.schieber&&r.eck&&r.abzug&&r.zeile,"Das Blatt nennt Stossart, Schieberzahl, Eckschieber, Abzug und markiert die Ecke",r);
 p(r.ueb,"Das Blatt einer Überlappungs-Massaufnahme bleibt wie bisher");
 p(/drbSvgOptionenAusDaten/.test(fs.readFileSync(path.join(__dirname,"..","js/60-ruestskizzen.js"),"utf8")),"Die Rüstskizze zeichnet den Grundriss ebenfalls mit den gespeicherten Schiebern");

 console.log("\nE · Ausmass, Kontrolle, Oberfläche");
 r=await ev(()=>{fpA.dachrand.stoss="schieber";drbSync();const z=drbAusmassZeilen().map(x=>x.bezeichnung+"="+x.menge);return z});
 p(r.some(x=>/^Schieber=/.test(x))&&r.some(x=>/^Eckschieber \(Gehrung\)=1/.test(x))&&r.some(x=>/inkl\. Zugaben\/Abzüge/.test(x)),"Das Ausmass führt Schieber und Eckschieber auf und nennt Zugaben/Abzüge",r);
 r=await ev(()=>{fpA.dachrand.schieber={zugabe:"",abzug:""};drbSync();return drbPruefungen().map(x=>x.text)});
 p(r.some(x=>/Eckschieber gewählt, aber das Mass ist 0 mm/.test(x))&&r.some(x=>/Kein Werkstoff gewählt/.test(x)),"Die Kontrolle warnt: Eckschieber ohne Abzug und fehlender Werkstoff",r);
 r=await ev(()=>{fpA.dachrand.stoss="schieber";return drbStueckeHtml().replace(/\s+/g," ")});
 p(/data-drb-stoss/.test(r)&&/Schieber \(wie Mauerabdeckung\)/.test(r)&&/data-drb-sz/.test(r)&&/data-drb-sa/.test(r)&&/data-drb-eck="0"/.test(r)&&!/data-drb-u\b/.test(r),"Register «Stücke» bei Schieber: Stossart, Zugabe, Abzug und Eckschieber-Haken je Ecke – ohne Überlappungsfeld",r.slice(0,300));
 p(!/data-drb-eck="1"/.test(r),"Die letzte Kante (Ende) bietet keinen Eckschieber an");
 r=await ev(()=>{fpA.dachrand.stoss="ueberlappung";return drbStueckeHtml().replace(/\s+/g," ")});
 p(/data-drb-u\b/.test(r)&&/data-drb-p\b/.test(r)&&!/data-drb-sz/.test(r)&&/drb_gleich/.test(r),"Bei Überlappung bleibt das Register wie bisher (Länge, Überlappung, gleich lang)");
 r=await ev(async()=>{
  fpA.dachrand=D([K(8000,"aussen"),K(6000,"ende")],{stoss:"ueberlappung"});window.renderFreiesProfilAufnahme=()=>{};
  const w=document.createElement("div");document.body.appendChild(w);window.fpaIstDachrand=()=>true;window.fpaZeichnet=false;drbVerdrahten(w);
  const mk=(h)=>{w.innerHTML=h;return w.firstElementChild};
  const sel=mk('<select data-drb-stoss><option value="ueberlappung">u</option><option value="schieber">s</option></select>');sel.value="schieber";sel.dispatchEvent(new Event("change",{bubbles:true}));
  const a1=fpA.dachrand.stoss;
  const cb=mk('<input type="checkbox" data-drb-eck="0">');cb.checked=true;cb.dispatchEvent(new Event("change",{bubbles:true}));
  const a2=fpA.dachrand.kanten[0].eckschieber;
  const sz=mk('<input data-drb-sz>');sz.value="45";sz.dispatchEvent(new Event("input",{bubbles:true}));
  const sa=mk('<input data-drb-sa>');sa.value="12";sa.dispatchEvent(new Event("input",{bubbles:true}));
  const sm=mk('<select data-drb-sm><option value="abzug">a</option><option value="zugabe">z</option></select>');sm.value="zugabe";sm.dispatchEvent(new Event("change",{bubbles:true}));
  return {a1,a2,sch:fpA.dachrand.schieber}});
 p(r.a1==="schieber"&&r.a2===true&&r.sch.zugabe===45&&r.sch.abzug===12&&r.sch.eckModus==="zugabe","Bedienung: Stossart, Eckschieber-Haken, Zugabe, Eckschieber-Mass und seine Wahl Zugabe/Abzug landen im Modell",r);
 console.log("\nZ · v3.405: Eckschieber mit Zugabe ODER Abzug");
 r=await ev(()=>{const mk=m=>D([K(8000,"aussen",true),K(6000,"ende")],{schieber:{zugabe:30,abzug:20,eckModus:m}});return {ab:L(drbStueckeFuer(mk("abzug"),null)),zu:L(drbStueckeFuer(mk("zugabe"),null)),std:L(drbStueckeFuer(D([K(8000,"aussen",true),K(6000,"ende")],{schieber:{zugabe:30,abzug:20}}),null))}});
 p(r.ab==="0:4030 0:4010 1:3010 1:3030","Abzug (wie bisher): beide Stücke an der Ecke 20 mm kürzer",r.ab);
 p(r.zu==="0:4030 0:4050 1:3050 1:3030","Zugabe: beide Stücke an der Ecke 20 mm länger",r.zu);
 p(r.std===r.ab,"Ohne Angabe (ältere Massaufnahmen) gilt weiter der Abzug",r.std);
 r=await ev(()=>{fpA.dachrand=drbAusData({stoss:"schieber",schieber:{zugabe:30,abzug:20,eckModus:"zugabe"},kanten:[{laenge:8000,ecke:"aussen",winkel:90,eckschieber:true},{laenge:6000,ecke:"ende"}]});
  const d=drbDaten();const html=drbStueckeHtml();const alt=drbAusData({stoss:"schieber",kanten:[{laenge:1000,ecke:"ende"}]});
  return {m:d.schieber.eckModus,e:d.ergebnis.schieber.eckModus,sel:/data-drb-sm/.test(html)&&/Zugabe Eckschieber je Stückende/.test(html),alt:alt.schieber.eckModus}});
 p(r.m==="zugabe"&&r.e==="zugabe"&&r.sel&&r.alt==="abzug","Wahl wird gespeichert und geladen; Auswahlfeld und Beschriftung folgen; alte Daten = Abzug",r);
 r=await ev(()=>{fpA.dachrand=drbAusData({stoss:"schieber",kanten:[{laenge:8000,ecke:"aussen",winkel:90,eckschieber:true},{laenge:6000,ecke:"ende"}],schieber:{zugabe:30,abzug:0}});
  const m=drbPruefungen().map(x=>x.text).join("|");fpA.dachrand.schieber.eckModus="zugabe";const m2=drbPruefungen().map(x=>x.text).join("|");return {m,m2}});
 p(/gekürzt/.test(r.m)&&/verlängert/.test(r.m2),"Warnung bei Mass 0 nennt je nach Wahl «gekürzt» oder «verlängert»",r);
 p(!page.__f.length,"Keine Skriptfehler",page.__f);

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

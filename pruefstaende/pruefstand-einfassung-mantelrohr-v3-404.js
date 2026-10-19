// v3.404: Einfassung rund – die Abwicklung des Mantelrohrs steht im Zuschnittplan und im Ausmass.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(500);
 await page.evaluate(()=>{window.appAlert=async()=>{};
  einfassungSettings={...einfassungSettings,rohrhoehe:300,schweifbord:12,umschlag:10,umschlag_hinten:10,umschlag_seitlich:20,mass_seitlich:90};
  measStaerkeGet=()=>0.7;
  einfA.deckung="schiebeziegel";einfA.lattenabstand=330;einfA.material="";
  einfA.einfassungen=[{durchmesser:110,winkel:30,a:150,b:200,c:100,anzahl:2,bez:"Nr1",standrohr:""}];
  window.soll=abwRechne({D:110,t:0.7,H:300,alpha:30,b:12});
 });
 const ev=(f,...a)=>page.evaluate(f,...a);

 console.log("\nA · Zuschnitt");
 let r=await ev(()=>{const z=einfaZuschnitte();return {n:z.length,namen:z.map(x=>x.name),nr:z.map(x=>x.nr).join(),rohr:z.filter(x=>x.rohr).map(x=>[x.laenge,x.breite,x.merkmal,x.hinweis,x.bleilappen]),tab:z.filter(x=>!x.rohr).map(x=>[x.laenge,x.breite]),sollL:Math.round(soll.breite),sollB:Math.round(soll.hoeheMax)}});
 p(r.n===4&&r.namen.join()==="Einfassung 1,Einfassung 1,Mantelrohr 1,Mantelrohr 1"&&r.nr==="1,2,3,4","2 Einfassungen (Stückzahl 2): zuerst die Tabletts, dann die zwei Mantelrohre – die Nummern der Tabletts bleiben 1 und 2",r);
 p(r.rohr.length===2&&r.rohr[0][0]===r.sollL&&r.rohr[0][1]===r.sollB&&r.sollL===358&&r.sollB===342,"Mantelrohr-Zuschnitt = Abwicklung aus dem Rechner: 358 × 342 mm (Umfang 343,38 + Falz, grösste Höhe 342)",r);
 p(r.rohr[0][2]==="Mantelrohr"&&/Mantelrohr Ø 110/.test(r.rohr[0][3])&&r.rohr[0][4]===null,"Das Mantelrohr trägt Merkmal und Hinweis und keine Bleilappen",r.rohr[0]);
 r=await ev(()=>{const plan=einfaRollenPlan();const g=plan.gruppen.map(x=>x.breite);const z=einfaZuschnitte();
  return {g,flaeche:einfaFlaecheM2(),soll:z.reduce((s,x)=>s+x.laenge*x.breite,0)/1e6,tab:z.filter(x=>!x.rohr).reduce((s,x)=>s+x.laenge*x.breite,0)/1e6}});
 p(r.g.includes(342),"Der Rollenplan hat eine Streifengruppe für das Mantelrohr (Breite 342)",r.g);
 p(Math.abs(r.flaeche-r.soll)<1e-9&&r.flaeche>r.tab,"Die Blechfläche enthält das Mantelrohr",r);

 console.log("\nB · Ausmass, Speichern, Kontrolle");
 r=await ev(()=>{const z=einfaAusmassZeilen();const m=z.find(x=>/^Mantelrohr 1/.test(x.bezeichnung));const bf=z.find(x=>x.bezeichnung==="Blechfläche Zuschnitt");return {m,bf:bf&&bf.menge}});
 p(r.m&&r.m.menge===2&&r.m.einheit==="Stk"&&/Abwicklung 358 × 342 mm/.test(r.m.herkunft)&&/Rohrhöhe 300/.test(r.m.herkunft)&&/Schweifbord 12/.test(r.m.herkunft),"Ausmass: «Mantelrohr 1 · Nr1», 2 Stk, mit Abwicklung und den verwendeten Standardwerten",r.m);
 r=await ev(()=>{const d=einfaDaten();return {rohr:d.zuschnitte.filter(x=>x.rohr).length,staerke:d.staerkeMm,tab:d.zuschnitte.filter(x=>!x.rohr).length}});
 p(r.rohr===2&&r.tab===2&&r.staerke===0.7,"Speicherstand: Zuschnitte mit Mantelrohr und die Blechstärke",r);
 r=await ev(()=>{const alt=einfassungSettings;einfassungSettings={...alt,rohrhoehe:0,schweifbord:0};const k=einfaPruefungen().map(x=>x.text).join("|");
  const z=einfaZuschnitte().filter(x=>x.rohr).length;einfassungSettings=alt;return {k,z}});
 p(/mit Standardwerten gerechnet \(nicht gesetzt: Rohrhöhe \(Richtwert\), Schweifbord-Breite \(Richtwert\)\)/.test(r.k)&&r.z===2,"Ohne Rohrhöhe/Schweifbord in den Einstellungen: Standard des Rechners + Warnung in der Kontrolle (nichts wird verschwiegen)",r.k.slice(0,200));
 r=await ev(()=>{einfA.einfassungen[0].winkel=80;const z=einfaZuschnitte().filter(x=>x.rohr).length;const k=einfaPruefungen().map(x=>x.text).join("|");einfA.einfassungen[0].winkel=30;return {z,k}});
 p(r.z===0&&/Mantelrohr-Abwicklung nicht berechenbar/.test(r.k),"Winkel ausserhalb des Rechners (80°): kein Mantelrohr-Zuschnitt, Warnung statt erfundener Zahl",r);

 console.log("\nC · Rüstblatt: keine falsche Warnung");
 r=await ev(()=>{const d=einfaDaten();const m={id:3,type:"einfassung_rund",data:JSON.parse(JSON.stringify(d))};const gleich=rbAbweichungText(m);
  const alt=JSON.parse(JSON.stringify(d));alt.zuschnitte=alt.zuschnitte.filter(x=>!x.rohr);const ohne=rbAbweichungText({id:4,type:"einfassung_rund",data:alt});
  measStaerkeGet=()=>1.5;const nachAnderem=rbAbweichungText(m);measStaerkeGet=()=>0.7;
  return {gleich,ohne,nachAnderem}});
 p(r.gleich===""&&r.ohne==="","Gespeicherter Stand mit und ohne Mantelrohr (ältere Massaufnahme): keine Warnung",r);
 p(r.nachAnderem==="","Die Blechstärke einer anderen offenen Aufnahme verfälscht die Rüstblatt-Prüfung nicht (gespeicherte Stärke zählt)",r.nachAnderem);
 r=await ev(()=>{const d=einfaDaten();const q=JSON.parse(JSON.stringify(d));q.staerkeMm=2.0;measStaerkeGet=()=>0.7;
  const z=einfaZuschnitte(q).filter(x=>x.rohr)[0];const s2=abwRechne({D:110,t:2.0,H:300,alpha:30,b:12}),s07=abwRechne({D:110,t:0.7,H:300,alpha:30,b:12});
  return {l:z.laenge,b:z.breite,l2:Math.round(s2.breite),b2:Math.round(s2.hoeheMax),l07:Math.round(s07.breite),b07:Math.round(s07.hoeheMax)}});
 p(r.l===r.l2&&r.b===r.b2&&(r.l2!==r.l07||r.b2!==r.b07),"Mit gespeicherter Stärke gerechnet (2,0 mm), nicht mit der des offenen Formulars (0,7 mm)",r);
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();

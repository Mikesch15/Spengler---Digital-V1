// Prueft, dass der Kopf einer Einfassungskarte beim Tippen mitlaeuft (v3.264).
//
// Gemeldet vom Anwender am 6.10.2026, mit Foto:
//   "Wiso wird beim einfassung rund die einfassung 1 oben rechts der
//    zuschnitt berechnet und bei einfassung 2 nicht?"
//
// Gerechnet wurde richtig - nur der Kopf der Karte (Bezeichnung und das
// L x B oben rechts) wurde beim Tippen nie erneuert. einfaLive() fuehrte
// Kennzahlen, Zeichnung und den Punkt am Kontroll-Register nach, die
// Kartenkoepfe nicht. Eine Karte, die beim Anlegen leer war, zeigte deshalb
// dauerhaft "Einfassung 2 - 0 x .. mm"; die erste Karte sah nur deshalb
// richtig aus, weil sie zuletzt mit ihren Werten gezeichnet worden war.
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
 const page=await b.newPage({viewport:{width:900,height:1200}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof einfaVerdrahten==="function");

 console.log("\nA · Der Kopf der zweiten Karte laeuft beim Tippen mit");
 const r=await page.evaluate(()=>{
  measurementMaterials=[{id:2,name:"Titanzink"}];
  document.getElementById("measTypeEinfassungRund").hidden=false;
  // Genau der Hergang des Anwenders: die erste Einfassung ist ausgefuellt,
  // die zweite wird LEER dazugenommen und danach erst erfasst.
  const voll=Object.assign(einfaNeue(),
    {bez:"Nord Nr.1",durchmesser:"64",winkel:28,a:"420",b:"410",c:"35"});
  einfA.einfassungen=[voll,einfaNeue()];
  einfA.aktiv=0; einfaSchritt=2;
  renderEinfassungAufnahme(); einfaVerdrahten();
  const kopf=i=>{const k=document.getElementById("einfa_kopf_"+i);
   return k?k.textContent.replace(/\s+/g," ").trim():null};
  const vorher=kopf(1);
  const tippe=(id,v)=>{const el=document.getElementById(id); if(!el)return false;
   el.value=v; el.dispatchEvent(new Event("input",{bubbles:true})); return true};
  const alleDa=["bez","durchmesser","winkel","a","b","c"].every(f=>document.getElementById("einfa_"+f+"_1"));
  tippe("einfa_bez_1","Nord Nr.2"); tippe("einfa_durchmesser_1","110");
  tippe("einfa_winkel_1","118"); tippe("einfa_a_1","425");
  tippe("einfa_b_1","415"); tippe("einfa_c_1","35");
  const g=einfaBerechne(einfaListe()[1]);
  return {alleDa,vorher,nachher:kopf(1),kopf0:kopf(0),
   soll:g?(einfaMm(g.breiteGesamt)+" × "+einfaMm(g.abwicklung)+" mm"):null,
   zustand:JSON.stringify(einfaListe()[1])};
 });
 p(r.alleDa,"die Felder der zweiten Einfassung sind da");
 p(r.vorher!==null&&r.nachher!==null,"beide Karten haben einen Kopf mit eigener Kennung",r);
 p(/Einfassung 2/.test(r.vorher),"vor dem Tippen heisst die zweite Karte noch \"Einfassung 2\"",r.vorher);
 p(/Nord Nr\.2/.test(r.nachher),"nach dem Tippen traegt sie die eingegebene Bezeichnung",r.nachher);
 p(r.soll!==null&&r.nachher.indexOf(r.soll)>=0,
   "und oben rechts steht das gerechnete L × B ("+r.soll+")",r);
 p(r.nachher!==r.vorher,"Gegenprobe: der Kopf hat sich ueberhaupt geaendert",r);
 p(!/ 0 ×/.test(r.nachher),"Gegenprobe: nicht mehr die Null der leeren Karte",r.nachher);
 p(/Nord Nr\.1/.test(r.kopf0),"die erste Karte bleibt unveraendert richtig",r.kopf0);

 console.log("\nB · Die Werte selbst waren nie falsch");
 // Wichtig fuer die Einordnung: der Fehler war reine Anzeige. Haette die
 // Rechnung danebengelegen, waere auch die Stueckliste falsch gewesen.
 p(/"durchmesser":"110"/.test(r.zustand)&&/"a":"425"/.test(r.zustand),
   "der Datensatz der zweiten Einfassung traegt die eingegebenen Masse",r.zustand);

 console.log("\nC · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 process.exit(fail?1:0);
})();

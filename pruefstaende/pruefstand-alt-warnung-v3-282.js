// Prueft v3.282: (1) Warnung bei Dachfenster-Aufnahmen mit altem Zuschnitt
// (ohne gespeicherte Ausfuehrung) in Massaufnahme-Liste und Ruestliste,
// (2) Wahl bleibt bei alten Aufnahmen offen (Pflicht), (3) "Was ist neu"
// zeigt hoechstens die neuesten 5 Versionen.
// Jede Probe hat eine Gegenprobe (neue Aufnahme / wenige Versionen).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof dfaZuschnittVeraltet==="function"&&typeof winPruefen==="function"&&typeof rlBlockHtml==="function");
 const r=await page.evaluate(()=>{
  const o={};
  const alt={id:1,type:"dachfenstereinfassung",workflow_status:"in_bearbeitung",data:{}};
  const neu={id:2,type:"dachfenstereinfassung",workflow_status:"in_bearbeitung",data:{ausfuehrung:"gefalzt"}};
  const kamin={id:3,type:"kamineinfassung",workflow_status:"in_bearbeitung",data:{}};
  o.alt=dfaZuschnittVeraltet(alt); o.neu=dfaZuschnittVeraltet(neu); o.kamin=dfaZuschnittVeraltet(kamin);
  o.badgeAlt=mwBadgeFuerListe(alt); o.badgeNeu=mwBadgeFuerListe(neu);
  const plan={moeglich:[{breite:500}],stuecke:[]};
  o.rlAlt=(()=>{try{return rlBlockHtml(alt,plan)}catch(e){return "ERR"+e.message}})();
  // Ausfuehrung beim Laden eines alten Datensatzes
  dfaFuellen({}); o.laden=dfaA.ausfuehrung;
  dfaFuellen({ausfuehrung:"gefalzt"}); o.ladenNeu=dfaA.ausfuehrung;
  return o;
 });
 p(r.alt===true,"Dachfenster ohne Ausfuehrung gilt als alter Zuschnitt",r);
 p(r.neu===false&&r.kamin===false,"Gegenprobe: mit Ausfuehrung bzw. andere Art: keine Warnung",r);
 p(/Alter Zuschnitt/.test(r.badgeAlt)&&!/Alter Zuschnitt/.test(r.badgeNeu),"Listen-Badge nur bei der alten Aufnahme",r);
 p(r.laden===""&&r.ladenNeu==="gefalzt","alter Datensatz oeffnet ohne Vorwahl, gespeicherter bleibt",r);
 // Ruestliste/Werkstatt: Quelltext enthaelt den Hinweis
 const q58=fs.readFileSync("js/58-ruestliste.js","utf8"),q51=fs.readFileSync("js/51-werkstatt.js","utf8");
 p(/dfaVeraltetHinweis\(m\)/.test(q58),"Ruestliste fragt den Hinweis ab");
 p(/dfaVeraltetHinweis\(a\)/.test(q51),"Werkstatt-Karte fragt den Hinweis ab");
 // Was ist neu: nur die letzten 5
 const w=await page.evaluate(()=>{
  const ks=Object.keys(WIN_CHANGELOG).sort(winVersionVergleich);
  const aktuell=winAktuelleVersion();
  const zeigen=(gesehen)=>{
   localStorage.setItem(WIN_LETZTE_VERSION,gesehen);
   $("wasIstNeuModal").hidden=true; $("wasIstNeuBody").innerHTML="";
   winPruefen();
   return $("wasIstNeuBody").querySelectorAll("li").length?$("wasIstNeuBody").children.length:0;
  };
  const alle=ks.filter(v=>winVersionVergleich(v,aktuell)<=0);
  return {n:alle.length,viele:zeigen("3.0"),wenige:zeigen(alle[alle.length-3]),aktuell,
   titel:(()=>{localStorage.setItem(WIN_LETZTE_VERSION,"3.0");$("wasIstNeuBody").innerHTML="";winPruefen();
     return [...$("wasIstNeuBody").children].map(x=>x.firstElementChild.textContent.trim())})(),
   neuste:alle.slice(-5).map(v=>"Version "+v)};
 });
 p(w.n>5&&w.viele===5,"nach langer Pause hoechstens 5 Versionen",w);
 p(w.wenige===2,"Gegenprobe: nur 2 neue Versionen -> 2 angezeigt",w);
 p(JSON.stringify(w.titel)===JSON.stringify(w.neuste),"es sind die NEUESTEN 5",w);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();

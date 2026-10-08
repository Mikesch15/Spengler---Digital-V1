// Prueft, dass auf dem Ruestblatt jedes gespeicherte Mass auch WIRKLICH steht.
//
// Anlass (Anwender, 6.10.2026): "Bei der dachfenstereinfassung fehlt im pdf
// das mass des lattenabstandes stimmt das? Wenn ja bitte ergaenzen und pruefen
// ob das sonst noch irgendwo fehlt."
//
// Es stimmte. Der Lattenabstand stand bei der Dachfenster- UND bei der
// Kamineinfassung nur als Fussnote unter der Bleilappen-Tabelle - und die
// faellt ganz weg, sobald die Bleilappen nicht berechenbar sind (kein
// Lattenabstand, keine Laenge). Dann stand er nirgends.
//
// Statt nur diese eine Stelle zu flicken, misst dieser Pruefstand die REGEL:
// das fertige Blatt wird erzeugt (indem er sich an pdfDruckVorbereiten
// haengt) und jeder gespeicherte Zahlenwert dagegen gehalten. Was fehlt,
// faellt auf - bei allen Arten, nicht nur bei der gemeldeten.
//
// Zwei Dinge, die beim Bauen beinahe zu erfundenen Fehlern gefuehrt haetten
// und deshalb hier ausdruecklich stehen:
//   - Zahlen stehen im Blatt in Schweizer Schreibweise: 1'005 mit Hochkomma,
//     42,5 mit Komma. Ohne Entfernen der Trennzeichen "fehlen" Werte, die
//     in Wahrheit dastehen.
//   - Manche Werte werden BEWUSST umgerechnet gedruckt (Winkel) oder
//     gehoeren gar nicht aufs Blatt (Einstellwerte). Die stehen unten in
//     AUSNAHMEN, jede mit Grund - und jede wird selbst geprueft: ist eine
//     Ausnahme nicht mehr noetig, faellt das auf, statt stillschweigend
//     eine Luecke zu decken.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const FAELLE=require(path.join(process.cwd(),"pruefstaende/faelle-druck.js"));
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

// Werte, die bewusst NICHT in ihrer gespeicherten Form auf dem Blatt stehen.
const AUSNAHMEN=[
 {type:"kamineinfassung",pfad:"winkelVorne",
  grund:"wird umgerechnet gedruckt: Datensaetze bis v2.94 trugen die Neigung vom Senkrechten, das Blatt zeigt den Innenwinkel Dach/Wand (90 + Wert)"},
 {type:"kamineinfassung",pfad:"winkelHinten",
  grund:"dasselbe, hinten (90 - Wert)"},
 {type:"einfassung_rund",pfad:"winkel",
  grund:"gespeichert ist die Dachneigung, gedruckt der Innenwinkel Dach/Rohr (Wert + 90)"},
 {type:"anschlussblech",pfad:"lattenabstand",
  grund:"Bleilappen gibt es nur bei der Art 'bleilappen' (js/20); bei jeder anderen Art waere ein Lattenabstand auf dem Blatt Rauschen"},
 {type:"anschlussblech",pfad:"restSchwelle",
  grund:"Einstellwert (ab welcher Laenge ein Rest aufgehoben wird), kein Mass dieser Aufnahme"},
 {type:"rinne",pfad:"ansetz.gehrung",
  grund:"Einstellwert (Zugabe bei Gehrung), geht in die Zuschnittlaenge ein - die steht auf dem Blatt"}
];
// Zweige, die als Tabelle/Zeichnung aufs Blatt kommen und nicht Wert fuer
// Wert durchsucht werden.
const NICHT_FLACH=["zuschnitte","bleilappen","ausmass","kontrolle","rollen","pieces",
 "stuecke","segmente","profil","varMasse","material"];

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof printMeasurement==="function");

 console.log("\nA · Jedes gespeicherte Mass steht auf dem Blatt");
 const aus=await page.evaluate(async ([faelle,nichtFlach])=>{
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  // Abgriff statt Druck: das fertige Blatt festhalten, danach abbrechen.
  pdfDruckVorbereiten=async(html)=>{window.__blatt=html; return null};
  const ergebnis=[];
  for(const [name,type,data] of faelle){
   window.__blatt=null;
   try{ await printMeasurement({id:1,type,data,title:name,note:""},{}); }catch(e){}
   const html=window.__blatt||"";
   const text=html.replace(/<[^>]*>/g," ").replace(/&[a-z]+;/g," ")
     .replace(/[’'  ](?=\d)/g,"").replace(/,(?=\d)/g,".").replace(/\s+/g," ");
   const werte=[];
   const sammle=(o,pfad)=>{
    if(o===null||o===undefined)return;
    if(typeof o==="number"||(typeof o==="string"&&o!==""&&!isNaN(Number(o)))){
     const roh=Number(o);
     if(roh>0)werte.push({pfad,z:Math.round(roh),roh});
     return;
    }
    if(Array.isArray(o))return;
    if(typeof o==="object")Object.keys(o).forEach(k=>sammle(o[k],pfad?pfad+"."+k:k));
   };
   Object.keys(data).forEach(k=>{ if(!nichtFlach.includes(k))sammle(data[k],k) });
   const da=w=>[String(w.z),String(w.roh)].some(t=>
     new RegExp("(^|[^0-9.])"+t.replace(".","\\.")+"([^0-9]|$)").test(text));
   ergebnis.push({name,type,blatt:!!html,geprueft:werte.length,
     fehlt:werte.filter(w=>!da(w)).map(w=>w.pfad)});
  }
  return ergebnis;
 },[FAELLE,NICHT_FLACH]);

 const erlaubt=(type,pfad)=>AUSNAHMEN.some(a=>a.type===type&&a.pfad===pfad);
 aus.forEach(z=>{
  p(z.blatt,z.name+": es wird ueberhaupt ein Blatt erzeugt");
  const echt=[...new Set(z.fehlt.filter(f=>!erlaubt(z.type,f)))];
  p(echt.length===0,z.name+": jedes gespeicherte Mass steht auf dem Blatt ("+z.geprueft+" geprueft)",echt);
 });

 // ---- B · Die Ausnahmen sind noch noetig ---------------------------------
 // Eine Ausnahme, die nichts mehr deckt, ist gefaehrlich: sie wuerde eine
 // spaeter entstehende Luecke stillschweigend durchlassen.
 console.log("\nB · Jede Ausnahme deckt noch einen echten Fall");
 AUSNAHMEN.forEach(a=>{
  const faelle=aus.filter(z=>z.type===a.type);
  const greift=faelle.some(z=>z.fehlt.includes(a.pfad));
  p(faelle.length>0,"es gibt einen Druckfall fuer "+a.type,a);
  if(faelle.length)p(greift,a.type+"."+a.pfad+" steht tatsaechlich nicht roh auf dem Blatt - Ausnahme noch noetig",a.grund);
 });

 // ---- C · Der gemeldete Fall, ausdruecklich -------------------------------
 console.log("\nC · Der Lattenabstand, wie gemeldet");
 const lattenFaelle=[["dachfenstereinfassung","Dachfenstereinfassung"],
                     ["kamineinfassung","Kamineinfassung"],
                     ["einfassung_rund","Einfassung Rund"]];
 const beschriftung=await page.evaluate(async faelle=>{
  const raus=[];
  for(const [name,type,data] of faelle){
   window.__blatt=null;
   try{ await printMeasurement({id:1,type,data,title:name,note:""},{}); }catch(e){}
   const t=(window.__blatt||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ");
   raus.push({type,hatWort:/Lattenabstand/.test(t)});
  }
  return raus;
 },FAELLE);
 lattenFaelle.forEach(([typ,name])=>{
  const z=beschriftung.filter(x=>x.type===typ);
  p(z.length>0&&z.every(x=>x.hatWort),
    name+": das Wort \"Lattenabstand\" steht auf dem Blatt",z);
 });

 console.log("\nD2 · Aufbordungshoehe und Bleilappen-Fussnote beim Dachfenster (v3.269)");
 // Gemeldet am echten Blatt "Nord Nr.1" (8.10.2026): in den Angaben stand
 // "Aufbordungshoehe vorne 0 mm / hinten 0 mm", obwohl die Zeichnung F = 80 und
 // Q = 95 zeigte. Der Ausdruck las die Zahl als {l,r}-Objekt. Dass es
 // durchrutschte: die "Jedes Mass steht auf dem Blatt"-Pruefung A sucht den
 // Wert irgendwo auf dem Blatt - und "100" steht dort auch in der Zeichnung.
 // Hier wird deshalb die ZELLE mit ihrer Beschriftung gelesen.
 const dfa=await page.evaluate(async faelle=>{
  const raus=[];
  const lies=async(data)=>{
   window.__blatt=null;
   try{ await printMeasurement({id:1,type:"dachfenstereinfassung",data,title:"x",note:""},{}); }catch(e){}
   const box=document.createElement("div"); box.innerHTML=window.__blatt||"";
   const wert=name=>{
    const l=[...box.querySelectorAll("label")].find(x=>x.textContent.trim()===name);
    return l?l.parentElement.querySelector(".val").textContent.trim():null;
   };
   return {vorne:wert("Aufbordungshöhe vorne"),hinten:wert("Aufbordungshöhe hinten"),
     text:box.textContent.replace(/\s+/g," ")};
  };
  for(const [name,type,data] of faelle){
   if(type!=="dachfenstereinfassung")continue;
   const d=JSON.parse(JSON.stringify(data)); d.aufVorne=80; d.aufHinten=95;
   // Die Fussnote erscheint nur, wenn Bleilappen im Datensatz stehen.
   d.bleilappen={gesamt:8,lattenabstand:355,zeilen:[
     {name:"Vorderteil links",laenge:1215,anzahl:3},{name:"Hinterteil links",laenge:455,anzahl:1},
     {name:"Vorderteil rechts",laenge:1215,anzahl:3},{name:"Hinterteil rechts",laenge:455,anzahl:1}]};
   raus.push(Object.assign({name,art:"zahl"},await lies(d)));
   // Gegenprobe: ein alter Datensatz mit {l,r} - das groessere Mass gilt.
   const alt=JSON.parse(JSON.stringify(data)); alt.aufVorne={l:70,r:90}; alt.aufHinten={l:60,r:55};
   raus.push(Object.assign({name,art:"alt"},await lies(alt)));
  }
  return raus;
 },FAELLE);
 const zahl=dfa.filter(x=>x.art==="zahl"), alte=dfa.filter(x=>x.art==="alt");
 p(zahl.length>0&&zahl.every(x=>x.vorne==="80 mm"&&x.hinten==="95 mm"),
   "die Angaben nennen die gespeicherten Aufbordungshoehen (80 / 95), nicht 0",
   zahl.map(x=>[x.name,x.vorne,x.hinten]));
 p(alte.length>0&&alte.every(x=>x.vorne==="90 mm"&&x.hinten==="60 mm"),
   "Gegenprobe: ein alter Datensatz mit {l,r} zeigt das groessere Mass",
   alte.map(x=>[x.name,x.vorne,x.hinten]));
 p(dfa.every(x=>!/aufgerundet/.test(x.text)),
   "die Fussnote zu den Bleilappen sagt nicht mehr \"aufgerundet\" (es wird abgerundet)",
   dfa.filter(x=>/aufgerundet/.test(x.text)).map(x=>x.name));
 p(dfa.some(x=>/abgerundet aus Länge ÷ Lattenabstand/.test(x.text)),
   "und nennt stattdessen \"abgerundet\"",dfa.map(x=>x.text.slice(-120)));

 console.log("\nD · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 process.exit(fail?1:0);
})();

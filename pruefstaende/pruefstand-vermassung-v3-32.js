// Prueft die Vermassung der Skizzen aus v3.32.
//
// Der Auftrag: "die schnittskizzen in der ruestansicht sind immernoch nicht
// vermasst und bei der kamineinfassung muss dort auch die breite hinten und
// vorne stehen und schau darauf das sich nirgends zwei masse verdecken"
//
// Geprueft wird GEMESSEN, nicht am Quelltext gelesen:
//   - jede Zeichnung wird in ein echtes Chromium gelegt und jeder <text>
//     ueber getBoundingClientRect vermessen. getBBox waere falsch: es liefert
//     den Kasten VOR der eigenen Transformation und vergleicht damit einen
//     gedrehten und einen ungedrehten Text in zwei Koordinatensystemen.
//   - "verdecken" heisst Ueberschneidung der tatsaechlich gezeichneten
//     Kaesten - ueber ALLE zwoelf Arten, nicht nur die drei gemeldeten.
//   - "vermasst" heisst: die Zeichnung traegt Zahlen, und zwar die aus dem
//     Datensatz. Eine erfundene Zahl waere schlechter als keine, deshalb
//     wird auch geprueft, dass ohne Wert nur die Bezeichnung dasteht.
//
// Gemessener Ausgangsstand (v3.31, derselbe Weg):
//   Rinne Halbrund · Grundriss   "6000" ueber "1"   41 px2
//                                "6000" ueber "2"   41 px2
//   Mauerabdeckung · Grundriss   "8000" ueber "1"   41 px2
//                                "4000" ueber "2"   50 px2
//   Einlaufblech gerade/konisch · Schnittskizze  nur "A", keine Zahl
//   Einlaufblech gerade/konisch · Grundriss      keine Laenge
//   Rinne (Zuschnittliste)                       nur "A", "B", "C"
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-vermassung-v3-32.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const FAELLE=require(path.join(process.cwd(),"pruefstaende/faelle-druck.js"));
const Q60=fs.readFileSync("js/60-ruestskizzen.js","utf8");
const Q62=fs.readFileSync("js/62-masse.js","utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

// Dieselbe Attrappe wie der Werkstatt-Pruefstand - eine zweite waere eine
// zweite Wahrheit.
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

// Zusatzfaelle, die die gemeinsamen Druckfaelle nicht abdecken:
//   - Einlaufblech gerade MIT Restbreite (die Druckfaelle haben keine),
//   - dieselbe Art OHNE Mass A und ohne Restbreite (nichts erfinden),
//   - Rinne (Zuschnittliste) OHNE erfasstes Stueck (nur Buchstaben),
//   - Kamineinfassung OHNE Breite vorne/hinten (die zwei Fahnen fehlen dann).
const EB=FAELLE.find(f=>f[0]==="Einlaufblech gerade")[2];
const RI=FAELLE.find(f=>f[0]==="Rinne (Zuschnittliste)")[2];
const KA=FAELLE.find(f=>f[0]==="Kamineinfassung")[2];
const ZUSATZ=[
 ["EB mit Restbreite","einlaufblech_gerade",Object.assign({},EB,{restBreite:90})],
 ["EB ohne Masse","einlaufblech_gerade",Object.assign({},EB,{massA:0,restBreite:0,winkel:0})],
 ["Rinne ohne Stueck","rinne",Object.assign({},RI,{stuecke:[]})],
 ["Kamin ohne Breiten","kamineinfassung",Object.assign({},KA,{breiteVorne:"",breiteHinten:""})],
 // Ein Profil mit vielen kurzen, gleich gerichteten Segmenten: die
 // Beschriftungen liegen dort nur wenige Pixel auseinander und decken sich
 // ohne Ausweichen. Ohne diesen Fall waere die Ausweichlogik in js/26 durch
 // nichts geprueft (gemessen: der Standardfall allein geht auch ohne durch).
 ["Rinne enge Segmente","rinne",Object.assign({},RI,{
  profil:[{name:"Kante",art:"fix",laenge:20,winkel:0},
          {name:"Kante",art:"fix",laenge:20,winkel:0},
          {name:"Kante",art:"fix",laenge:20,winkel:0},
          {name:"Kante",art:"fix",laenge:20,winkel:0},
          {name:"Kante",art:"fix",laenge:20,winkel:0},
          {name:"",art:"var",winkel:-90}],
  fixSumme:100, varMasse:[{buchstabe:"A"}],
  stuecke:[{links:[300],rechts:[300],laenge:2000,ansetzL:"boden",ansetzR:"boden",
            abwicklungLinks:400,abwicklungRechts:400,zuschnitt:2000}]})]
];

(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROME||"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await page.addInitScript(STUB);
 await page.goto(APP);
 await page.waitForFunction(()=>typeof rsSkizzen==="function");

 // Alles in EINEM Durchgang messen: je Zeichnung die Texte mit ihren echten
 // Rechtecken und die paarweisen Ueberschneidungen.
 const mess=async faelle=>page.evaluate(f=>{
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  const box=document.createElement("div");
  box.style.cssText="width:340px;position:fixed;left:0;top:0;background:#fff;z-index:99999";
  document.body.appendChild(box);
  const out=[];
  for(const [name,type,data] of f){
   const sk=rsSkizzen({type,data});
   if(!sk.length){out.push({name,titel:"(keine Zeichnung)",texte:[],kollisionen:[]});continue}
   for(const s of sk){
    box.innerHTML=s.svg;
    const svg=box.querySelector("svg");
    if(!svg){out.push({name,titel:s.titel,texte:[],kollisionen:[],keinSvg:true});continue}
    if(typeof rsZuschneiden==="function")rsZuschneiden(box);
    const T=[...svg.querySelectorAll("text")].map(t=>{
     const r=t.getBoundingClientRect();
     return {s:t.textContent.trim(),x:r.left,y:r.top,w:r.width,h:r.height};
    }).filter(t=>t.w>0&&t.h>0);
    const koll=[];
    for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++){
     const a=T[i],c=T[j];
     const bx=Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x);
     const by=Math.min(a.y+a.h,c.y+c.h)-Math.max(a.y,c.y);
     if(bx>0.5&&by>0.5)koll.push({a:a.s,b:c.s,px:Math.round(bx*by)});
    }
    out.push({name,titel:s.titel,texte:T.map(t=>t.s),kollisionen:koll});
   }
  }
  box.remove();
  return out;
 },faelle);

 const alle=await mess(FAELLE);
 const zus=await mess(ZUSATZ);
 const finde=(liste,name,titel)=>liste.find(x=>x.name===name&&(!titel||x.titel===titel));
 // Eine Positionsnummer ist keine Vermassung. Geprueft wird deshalb auf eine
 // Zahl, die nicht bloss eine ein- oder zweistellige Nummer ist - sonst
 // haette der Grundriss mit "1" und "2" allein schon als vermasst gegolten.
 const hatZahl=t=>/\d/.test(t)&&!/^\d{1,2}$/.test(String(t).trim());

 console.log("\nA · Nirgends verdecken sich zwei Masse (alle zwoelf Arten)");
 const kollAlle=alle.concat(zus).filter(x=>x.kollisionen.length);
 p(kollAlle.length===0,"keine einzige Ueberschneidung ueber alle Zeichnungen",
   kollAlle.map(x=>({z:x.name+" · "+x.titel,k:x.kollisionen})));
 // Die vier gemeldeten Stellen ausdruecklich, damit ein Rueckfall auffaellt.
 const rh=finde(alle,"Rinne Halbrund","Grundriss");
 const ma=finde(alle,"Mauerabdeckung","Grundriss");
 p(rh&&rh.kollisionen.length===0,"Rinne Halbrund · Grundriss: Masszahl und Positionsnummer trennen sich",rh&&rh.kollisionen);
 p(ma&&ma.kollisionen.length===0,"Mauerabdeckung · Grundriss: dasselbe",ma&&ma.kollisionen);

 console.log("\nB · Jede Zeichnung ist vermasst");
 // Ohne Zeichnung gibt es nichts zu vermassen - Kehle und Skizze/Foto.
 const ohne=["Kehle","Skizze / Foto"];
 const zeichnungen=alle.filter(x=>!ohne.includes(x.name)&&x.titel!=="(keine Zeichnung)");
 p(zeichnungen.length>=14,"es werden genuegend Zeichnungen geprueft",zeichnungen.length);
 const leer=zeichnungen.filter(x=>!x.texte.some(hatZahl));
 p(leer.length===0,"jede Zeichnung traegt mindestens eine Zahl",leer.map(x=>x.name+" · "+x.titel));

 console.log("\nC · Einlaufblech gerade · Schnittskizze");
 const ebs=finde(alle,"Einlaufblech gerade","Schnittskizze");
 p(!!ebs,"die Schnittskizze entsteht");
 p(ebs&&ebs.texte.some(t=>t==="A = 120"),"Mass A steht mit seinem Wert da (v3.31: nur \"A\")",ebs&&ebs.texte);
 p(ebs&&ebs.texte.some(t=>t==="30°"),"der Winkel steht weiterhin da",ebs&&ebs.texte);
 p(ebs&&ebs.texte.filter(t=>/^Umschlag/.test(t)).length===2,"beide Umschlaege sind angeschrieben",ebs&&ebs.texte);
 p(ebs&&ebs.texte.some(t=>/^Restbreite/.test(t)),"die Restbreite ist angeschrieben",ebs&&ebs.texte);
 const ebr=finde(zus,"EB mit Restbreite","Schnittskizze");
 p(ebr&&ebr.texte.some(t=>t==="Restbreite 90"),"mit erfasster Restbreite steht ihr Wert da",ebr&&ebr.texte);
 p(ebs&&!ebs.texte.some(t=>t==="Restbreite 90"),"ohne erfasste Restbreite wird KEINE erfunden",ebs&&ebs.texte);

 console.log("\nD · Ohne Wert nur die Bezeichnung - nie ein Platzhalter");
 const eb0=finde(zus,"EB ohne Masse","Schnittskizze");
 // Die Zeichnung rechnet intern mit 120/90/15 als Platzhalter, damit sie
 // ueberhaupt eine Form hat. Angeschrieben werden duerfen die NIE.
 p(eb0&&eb0.texte.includes("A"),"ohne Mass A steht nur \"A\" da",eb0&&eb0.texte);
 p(eb0&&!eb0.texte.some(t=>/^A = /.test(t)),"der Platzhalter 120 wird nicht angeschrieben",eb0&&eb0.texte);
 p(eb0&&eb0.texte.includes("Restbreite"),"ohne Restbreite steht nur \"Restbreite\" da",eb0&&eb0.texte);
 p(eb0&&eb0.texte.includes("Winkel"),"ohne Winkel steht nur \"Winkel\" da",eb0&&eb0.texte);

 console.log("\nE · Einlaufblech konisch");
 const eks=finde(alle,"Einlaufblech konisch","Schnittskizze");
 p(eks&&eks.texte.some(t=>/^A = /.test(t)),"Mass A mit Wert",eks&&eks.texte);
 p(eks&&eks.texte.some(t=>/^Restbreite \d/.test(t)),"Restbreite mit Wert",eks&&eks.texte);
 const ekg=finde(alle,"Einlaufblech konisch","Grundriss");
 p(ekg&&ekg.texte.includes("2070"),"der Grundriss traegt die Stuecklaenge (v3.31: nur die Nummer)",ekg&&ekg.texte);

 console.log("\nF · Einlaufblech gerade · Grundriss");
 const ebg=finde(alle,"Einlaufblech gerade","Grundriss");
 p(ebg&&ebg.texte.includes("2070")&&ebg&&ebg.texte.includes("1560"),"beide Stuecklaengen stehen da",ebg&&ebg.texte);
 p(ebg&&ebg.texte.includes("1")&&ebg.texte.includes("2"),"die Positionsnummern bleiben",ebg&&ebg.texte);

 console.log("\nG · Rinne (Zuschnittliste) · Profilskizze");
 const rz=finde(alle,"Rinne (Zuschnittliste)","Profilskizze");
 p(rz&&rz.texte.includes("A 127"),"das variable Mass A steht mit seinem Wert da (v3.31: nur \"A\")",rz&&rz.texte);
 p(rz&&rz.texte.includes("B 192")&&rz.texte.includes("C 202"),"B und C ebenso",rz&&rz.texte);
 p(rz&&rz.texte.includes("Umschlag 15"),"die Fixmasse bleiben unveraendert angeschrieben",rz&&rz.texte);
 const rz0=finde(zus,"Rinne ohne Stueck","Profilskizze");
 p(rz0&&rz0.texte.includes("A"),"ohne erfasstes Stueck steht nur der Buchstabe da",rz0&&rz0.texte);
 p(rz0&&!rz0.texte.some(t=>/^A 200$/.test(t)),"das Beispielmass der Zeichnung wird nie angeschrieben",rz0&&rz0.texte);

 console.log("\nH · Kamineinfassung: Breite vorne und hinten");
 const ks=finde(alle,"Kamineinfassung","Schnitt");
 p(ks&&ks.texte.includes("Breite vorne = 900"),"die Breite vorne steht in der Skizze",ks&&ks.texte);
 p(ks&&ks.texte.includes("Breite hinten = 900"),"die Breite hinten steht in der Skizze",ks&&ks.texte);
 ["A = 300","D = 250","B = 500","C = 400","Höhe = 400","Keil = 80"].forEach(t=>
  p(ks&&ks.texte.includes(t),"das bestehende Mass bleibt: "+t,ks&&ks.texte));
 p(ks&&ks.kollisionen.length===0,"die zwei neuen Fahnen verdecken nichts",ks&&ks.kollisionen);
 const k0=finde(zus,"Kamin ohne Breiten","Schnitt");
 p(k0&&!k0.texte.some(t=>/^Breite /.test(t)),"ohne erfasste Breite steht keine Fahne da",k0&&k0.texte);

 console.log("\nG2 · Enge Segmente weichen aus");
 const re=finde(zus,"Rinne enge Segmente","Profilskizze");
 p(re&&re.texte.filter(t=>t==="Kante 20").length===5,"alle fuenf kurzen Segmente sind angeschrieben",re&&re.texte);
 p(re&&re.kollisionen.length===0,"und keine zwei Beschriftungen decken sich",re&&re.kollisionen);

 console.log("\nI · Eine Quelle fuer die Platzierung");
 p(/function massPlatz\(/.test(Q62)&&/function massKollidiert\(/.test(Q62),"js/62-masse.js haelt die Platzwahl");
 const wo=fs.readdirSync("js").filter(f=>/\.js$/.test(f)&&f!=="62-masse.js")
   .filter(f=>/function\s+massPlatz\s*\(|function\s+massKollidiert\s*\(/.test(fs.readFileSync("js/"+f,"utf8")));
 p(wo.length===0,"kein zweiter Platzrechner in einer anderen Datei",wo);
 p(/js\/62-masse\.js/.test(fs.readFileSync("index.html","utf8")),"js/62-masse.js ist in index.html eingebunden");
 p(/js\/62-masse\.js/.test(fs.readFileSync("sw.js","utf8")),"js/62-masse.js steht in der Service-Worker-Liste");

 console.log("\nJ · Dieselben Zeichnungen im Ausdruck");
 // Die Ruestansicht und das PDF gehen seit v3.30 durch rsSvg (js/60). Wird
 // die Vermassung in den Zeichnern gemacht, traegt der Ausdruck sie mit.
 p(/function rsSvg\(/.test(Q60),"js/60 stellt rsSvg bereit");
 const Q16=fs.readFileSync("js/16-massaufnahme-formular.js","utf8");
 p((Q16.match(/rsSvg\(/g)||[]).length>=10,"der Druck holt seine Zeichnungen dort",
   (Q16.match(/rsSvg\(/g)||[]).length);
 const druck=await page.evaluate(f=>{
  measurementMaterials=[{id:2,name:"Titanzink"}];
  const [name,type,data]=f;
  return rsSkizzen({type,data}).map(s=>s.svg).join("");
 },FAELLE.find(x=>x[0]==="Rinne (Zuschnittliste)"));
 p(/A 127/.test(druck),"die Zahl steht auch in dem SVG, das ins PDF geht");

 console.log("\nK · Vier Bildschirmbreiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:900});
  const m=await page.evaluate(f=>{
   measurementMaterials=[{id:2,name:"Titanzink"}];
   const box=document.createElement("div");
   box.id="ZBOX";
   box.style.cssText="width:100%;position:fixed;left:0;top:0;background:#fff;z-index:99999";
   document.body.appendChild(box);
   let h="";
   for(const [name,type,data] of f)for(const s of rsSkizzen({type,data}))h+=s.svg;
   box.innerHTML=h;
   if(typeof rsZuschneiden==="function")rsZuschneiden(box);
   const breit=[...box.querySelectorAll("svg")].map(s=>Math.round(s.getBoundingClientRect().width));
   const ueber=[...box.querySelectorAll("text")]
     .filter(t=>t.getBoundingClientRect().right>innerWidth+1).length;
   box.remove();
   return {breit,ueber};
  },FAELLE);
  p(m.breit.every(x=>x<=w+1),w+" px: jede Zeichnung passt in die Breite",m.breit);
  p(m.ueber===0,w+" px: keine Beschriftung laeuft aus dem Bild",m.ueber);
 }
 await page.setViewportSize({width:412,height:900});

 console.log("\nL · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler);

 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();

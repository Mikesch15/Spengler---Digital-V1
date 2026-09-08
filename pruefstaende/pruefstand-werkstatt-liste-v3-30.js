// Prueft die Werkstatt aus v3.30: sie ist zuerst eine LISTE, und genau EIN
// Tipp auf eine Massaufnahme oeffnet, was zum Ruesten gebraucht wird.
//
// Der Auftrag: "in der werkstattansicht nur die projekte mit den
// entsprechenden massaufnahmen ... wenn man dan auf eine klickt koennte sich
// die zuschnittliste oeffnen ... die vermasste profilskizze und den Grundriss
// (wenn vorhanden) ... aber ohne zu viele zusaetzliche infos aus der
// massaufnahme. wirklich nur das was man zum ruesten braucht"
//
// Geprueft wird deshalb GEMESSEN, nicht am Quelltext gelesen:
//   - zugeklappt steht weder Zuschnittliste noch Skizze da,
//   - GENAU EIN Tipp bringt beides (nicht zwei, wie vor v3.21 die
//     Ruestgrundlage; und nicht null, wie in v3.21 bis v3.29),
//   - die Skizzen kommen aus rsSkizzen() in js/60 - derselben Stelle wie im
//     Ausdruck, keine zweite Zusammenstellung,
//   - "wenn vorhanden" wird beantwortet, nicht behauptet: Kehle und
//     Skizze / Foto haben keine Zeichnung, und das steht ausdruecklich da,
//   - nichts sonst aus der Massaufnahme (keine Notiz, keine Eingabemasse,
//     keine Fotos),
//   - der Leerraum der festen viewBox ist weggeschnitten (gemessen: der
//     Grundriss fuellte 10 Prozent),
//   - Tastatur, Trefferflaechen, vier Bildschirmbreiten.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-werkstatt-liste-v3-30.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const Q51=fs.readFileSync("js/51-werkstatt.js","utf8");
const Q60=fs.readFileSync("js/60-ruestskizzen.js","utf8");
const Q16=fs.readFileSync("js/16-massaufnahme-formular.js","utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Denselben Stub wie der Werkstatt-Pruefstand aus v3.20 - eine zweite
// Attrappe waere eine zweite Wahrheit.
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));

const ICH="aaaa1111-1111-1111-1111-111111111111";
const MODULE={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
const gm=(id,type,title,data)=>({id,project_id:7,type,title,date:"2026-09-01",
 workflow_status:"zu_ruesten",freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,
 geruestet_am:null,montiert_am:null,updated_at:"2026-09-05T10:00:00Z",created_by:ICH,data});

// Fuenf Arten, damit "wenn vorhanden" wirklich geprueft wird:
//   11 Einlaufblech gerade  -> Schnittskizze UND Grundriss
//   12 Kehle                -> KEINE Zeichnung (rechnet nur)
//   13 Mauerabdeckung       -> Profil (Querschnitt) UND Grundriss
//   15 Freies Profil        -> Profil, kein Grundriss
//   17 Skizze / Foto        -> KEINE Zeichnung, kein Zuschnitt
const MESS=[
 gm(11,"einlaufblech_gerade","Dach Nord",{material:2,abwicklung:250,massA:120,winkel:30,
  montage:"links",restBreite:130,note:"GEHEIMNOTIZ EINLAUFBLECH",
  pieces:[{laenge:1200,stossStoss:1200,gehrungLinks:false,gehrungRechts:false,winkel:0},
          {laenge:700,stossStoss:700,gehrungLinks:false,gehrungRechts:false,winkel:0}],
  rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],
   abwicklung:250,abschnittLaenge:1200,optimal:true}}),
 gm(12,"kehle","Kehle West",{material:3,abwicklung:500,nh:42.5,nl:23.5,gl:100,
  rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}}),
 gm(13,"mauerabdeckung","Mauer Süd",{material:2,abwicklung:460,
  profil:{breite:400,hL:120,hR:120,umL:15,umR:15,gef:5,dy:0},
  segments:[{laenge:3000,winkel:0},{laenge:2000,winkel:90}],schieber:[],boundaries:[],
  rollen:{abwicklung:460,streifen:[{rest:0,stuecke:[{nr:1,laenge:3000}]}],optimal:true}}),
 gm(15,"freies_profil","Profil Ost",{material:2,konisch:false,ansicht:"vorne",
  schenkel:[{laenge:50,winkel:0},{laenge:200,winkel:90},{laenge:50,winkel:90}],
  segmente:[{laenge:2000,massen:[[50,200,50]]}],
  rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],abwicklung:300,optimal:true}}),
 gm(17,"skizze_foto","Foto Halle",{material:2})
];

const vorbereiten=async(page,module)=>{
 await page.evaluate(([mess,mod,ich])=>{
  currentProfile={id:ich,role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true; reststuecke=[];
  window.__db.mess=JSON.parse(JSON.stringify(mess));
  window.__db.res=[]; window.__db.ze=[]; window.__db.fehler=null;
  pmUebernehmen(mod);
  if(typeof zeCache!=="undefined"){zeCache.clear();zeGeladen.clear()}
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
  $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
  $("projectCockpitModal").hidden=true;$("werkstattModal").hidden=true;
  werkOffen=null; werkGrundlage=null; werkFilter="alle";
  werkstattKnopfAktualisieren(); window.__ruf=[];
 },[MESS,module,ICH]);
};
// Nicht page.click: ein verdecktes oder fehlendes Element laesst den Lauf
// haengen, und ein abgebrochener Lauf sieht aus wie "keine Fehler".
const tipp=async(page,sel,was)=>{
 const da=await page.evaluate(s=>{
  const e=document.querySelector(s); if(!e)return "fehlt";
  const r=e.getBoundingClientRect();
  if(!(r.width>0&&r.height>0))return "unsichtbar";
  const o=document.elementFromPoint(r.left+r.width/2,Math.min(r.top+8,r.bottom-2));
  if(o&&!e.contains(o)&&!o.contains(e))return "verdeckt von "+o.tagName+"."+(o.className||"");
  e.click(); return "ok";
 },sel);
 if(da!=="ok"){p(false,(was||"Element")+" antippbar ("+sel+")",da);return false}
 await page.waitForTimeout(400); return true;
};
const werkstattAuf=async page=>{
 if(!await tipp(page,"#navWerkstatt","Werkstatt-Knopf"))return false;
 await page.waitForTimeout(500); return true;
};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 console.log("\nA · Zugeklappt: eine Liste, sonst nichts");
 await vorbereiten(page,MODULE);
 if(await werkstattAuf(page)){
  const a=await page.evaluate(()=>{
   const box=$("werkstattBody");
   const k=[...box.querySelectorAll(".werk-karte")];
   return {karten:k.length,
    koepfe:box.querySelectorAll("[data-werk-karte]").length,
    listen:box.querySelectorAll("[data-ze-nr]").length,
    zuschnittBoxen:box.querySelectorAll(".zu-liste,.zu-gruppe").length,
    skizzen:box.querySelectorAll(".werk-skizze").length,
    svg:box.querySelectorAll(".werk-karte svg").length,
    koerper:box.querySelectorAll(".werk-karte-body").length,
    kopfHoehen:[...box.querySelectorAll("[data-werk-karte]")]
      .map(e=>Math.round(e.getBoundingClientRect().height)),
    aria:[...box.querySelectorAll("[data-werk-karte]")].map(e=>e.getAttribute("aria-expanded")),
    pfeile:[...box.querySelectorAll(".werk-karte-pfeil")].map(e=>e.textContent.trim()),
    text:box.innerText};
  });
  p(a.karten===5,"je Massaufnahme eine Karte - fuenf Arten",a.karten);
  p(a.koerper===0,"zugeklappt gibt es keinen Kartenkoerper",a.koerper);
  p(a.listen===0&&a.zuschnittBoxen===0,"zugeklappt steht KEINE Zuschnittliste da",
    {listen:a.listen,boxen:a.zuschnittBoxen});
  p(a.skizzen===0&&a.svg===0,"zugeklappt steht KEINE Skizze da",{skizzen:a.skizzen,svg:a.svg});
  p(a.aria.every(x=>x==="false"),"jeder Kopf meldet aria-expanded=false",a.aria);
  p(a.pfeile.every(x=>x==="▸"),"jeder Pfeil zeigt zu",a.pfeile);
  p(a.kopfHoehen.every(h=>h>=34),"jeder Kartenkopf ist mindestens 34 px hoch",a.kopfHoehen);
  // Der Kopf nennt genau das, was zum Auswaehlen noetig ist.
  p(/Einlaufblech gerade/.test(a.text)&&/Dach Nord/.test(a.text)&&/Kehle West/.test(a.text),
    "der Kopf nennt Art und Bezeichnung",a.text.slice(0,200));
  p(!/GEHEIMNOTIZ/.test(a.text),"zugeklappt steht nichts aus der Massaufnahme da");
 }

 console.log("\nB · Genau EIN Tipp oeffnet Skizze und Zuschnittliste");
 if(await tipp(page,'#werkstattBody [data-werk-karte="11"]',"Kartenkopf 11")){
  const b1=await page.evaluate(()=>{
   const k=document.querySelector('#werkstattBody [data-werk-karte="11"]').closest(".werk-karte");
   const box=$("werkstattBody");
   return {ze:k.querySelectorAll("[data-ze-nr]").length,
    skizzen:[...k.querySelectorAll(".werk-skizze figcaption")].map(f=>f.innerText.trim().toLowerCase()),
    svg:k.querySelectorAll(".werk-skizze svg").length,
    aria:k.querySelector("[data-werk-karte]").getAttribute("aria-expanded"),
    pfeil:k.querySelector(".werk-karte-pfeil").textContent.trim(),
    // Die uebrigen vier bleiben zu - ein Tipp oeffnet genau eine.
    andereKoerper:box.querySelectorAll(".werk-karte-body").length,
    fuss:[...k.querySelectorAll(".werk-karte-fuss button")].map(x=>x.innerText.trim())};
  });
  p(b1.ze===2,"nach EINEM Tipp sind die Zuschnitt-Positionen da",b1.ze);
  p(b1.svg===2&&b1.skizzen.length===2,"nach EINEM Tipp sind die Zeichnungen da",b1.skizzen);
  p(b1.skizzen.join("|").includes("schnittskizze")&&b1.skizzen.join("|").includes("grundriss"),
    "Schnittskizze UND Grundriss - beide beschriftet",b1.skizzen);
  p(b1.aria==="true"&&b1.pfeil==="▾","der Kopf meldet aufgeklappt",{aria:b1.aria,pfeil:b1.pfeil});
  p(b1.andereKoerper===1,"ein Tipp oeffnet genau EINE Karte",b1.andereKoerper);
  p(b1.fuss.length===2&&b1.fuss.some(t=>/Rüstliste/.test(t))&&b1.fuss.some(t=>/Formular/.test(t)),
    "im Fuss stehen Ruestliste und der Weg ins Formular",b1.fuss);
 }

 console.log("\nC · Nur was zum Ruesten gebraucht wird - sonst nichts");
 {
  const c=await page.evaluate(()=>{
   const k=document.querySelector('#werkstattBody [data-werk-karte="11"]').closest(".werk-karte");
   return {txt:k.innerText.replace(/\s+/g," ").trim(),
    eingaben:k.querySelectorAll("input:not([data-ze-nr]),textarea,select").length,
    bilder:k.querySelectorAll("img").length};
  });
  p(!/GEHEIMNOTIZ/.test(c.txt),"die Notiz der Massaufnahme steht NICHT da");
  p(!/Mass A|Dachneigung|Montage/i.test(c.txt),"die Eingabemasse stehen NICHT da",c.txt.slice(0,300));
  p(c.bilder===0,"keine Fotos",c.bilder);
  p(/Zuschnittliste|1'200|1’200/.test(c.txt),"die Zuschnittliste steht da",c.txt.slice(0,300));
 }

 console.log("\nD · Ein zweiter Tipp klappt wieder zu");
 if(await tipp(page,'#werkstattBody [data-werk-karte="11"]',"Kartenkopf 11 erneut")){
  const d=await page.evaluate(()=>{
   const k=document.querySelector('#werkstattBody [data-werk-karte="11"]').closest(".werk-karte");
   return {koerper:k.querySelectorAll(".werk-karte-body").length,
     aria:k.querySelector("[data-werk-karte]").getAttribute("aria-expanded")};
  });
  p(d.koerper===0&&d.aria==="false","der zweite Tipp klappt zu",d);
 }

 console.log("\nE · Wenn vorhanden - und ehrlich, wenn nicht");
 for(const [id,art,erwartet] of [
   ["12","Kehle",[]],
   ["13","Mauerabdeckung",["profil","grundriss"]],
   ["15","Freies Profil",["profil"]],
   ["17","Skizze / Foto",[]]]){
  if(!await tipp(page,'#werkstattBody [data-werk-karte="'+id+'"]',"Kartenkopf "+id))continue;
  const e=await page.evaluate(i=>{
   const k=document.querySelector('#werkstattBody [data-werk-karte="'+i+'"]').closest(".werk-karte");
   return {skizzen:[...k.querySelectorAll(".werk-skizze figcaption")].map(f=>f.innerText.trim().toLowerCase()),
     leer:!!k.querySelector(".werk-skizze-leer"),
     leerTxt:k.querySelector(".werk-skizze-leer")?k.querySelector(".werk-skizze-leer").innerText.trim():"",
     ze:k.querySelectorAll("[data-ze-nr]").length};
  },id);
  if(erwartet.length){
   p(e.skizzen.length===erwartet.length&&erwartet.every(w=>e.skizzen.some(s=>s.includes(w))),
     art+": genau die Zeichnungen, die es gibt",{ist:e.skizzen,soll:erwartet});
   p(!e.leer,art+": kein Hinweis auf eine fehlende Zeichnung");
  }else{
   p(e.skizzen.length===0,art+": KEINE Zeichnung erfunden",e.skizzen);
   p(e.leer&&/keine Skizze/i.test(e.leerTxt),art+": das Fehlen steht ausdruecklich da",e.leerTxt);
  }
 }

 console.log("\nF · Die Zeichnungen kommen aus js/60 - eine Quelle");
 {
  p(/function\s+rsSkizzen\s*\(/.test(Q60),"rsSkizzen steht in js/60");
  const anders=(Q51.match(/rsSkizzen\s*\(/g)||[]).length;
  p(anders>0,"js/51 fragt rsSkizzen",anders);
  // js/51 baut keine Zeichnung selbst zusammen.
  const eigen=["einlaufblechDiagramSvg","generateEbkGrundriss","generateRinneGrundriss",
    "madProfilSvgAus","generateProfilDiagramSvg","lukPlanSvg","anbZeichnung",
    "einfZeichnung","kamaSkizze","rinneSvg"].filter(f=>new RegExp(f+"\\s*\\(").test(Q51));
  p(eigen.length===0,"js/51 ruft KEINEN Zeichner selbst - kein zweiter Zusammenbau",eigen);
  // Und der Ausdruck geht denselben Weg.
  const imDruck=(Q16.match(/rsSvg\s*\(/g)||[]).length;
  p(imDruck>=10,"der Ausdruck nimmt dieselbe Quelle (rsSvg)",imDruck);
  const eigenDruck=eigen.concat(["einlaufblechDiagramSvg"]).filter(f=>new RegExp(f+"\\s*\\(").test(Q16));
  p(eigenDruck.length===0,"auch der Ausdruck ruft keinen Zeichner mehr selbst",eigenDruck);
 }

 console.log("\nG · Der Leerraum der festen viewBox ist weggeschnitten");
 {
  const g=await page.evaluate(()=>[...document.querySelectorAll("#werkstattBody .werk-skizze svg")].map(s=>{
   const vb=String(s.getAttribute("viewBox")||"").trim().split(/\s+/).map(Number);
   let bb=null; try{ bb=s.getBBox() }catch(e){}
   const r=s.getBoundingClientRect();
   return (bb&&vb.length===4&&vb[2]>0&&vb[3]>0&&bb.height>0&&r.height>0)
     ? {f:Math.round(100*(bb.width*bb.height)/(vb[2]*vb[3])),
        // Das dargestellte Seitenverhaeltnis gegen das des Inhalts: ein
        // Grundriss von 280 zu 47 darf nicht als Quadrat erscheinen.
        vInhalt:+(bb.width/bb.height).toFixed(2),
        vBild:+(r.width/r.height).toFixed(2),
        h:Math.round(r.height)} : null;
  }).filter(Boolean));
  p(g.length>0,"es gibt Zeichnungen zu messen",g.length);
  // Vor v3.30 fuellte der Grundriss 10 Prozent seiner viewBox.
  p(g.every(x=>x.f>=50),"jede Zeichnung fuellt mindestens die Haelfte ihrer viewBox",g);
  p(g.every(x=>Math.abs(x.vBild-x.vInhalt)<=x.vInhalt*0.25),
    "jede Zeichnung wird in ihrem eigenen Seitenverhaeltnis dargestellt",g);
 }

 console.log("\nH · Tastatur");
 {
  const h=await page.evaluate(()=>{
   const k=document.querySelector('#werkstattBody [data-werk-karte="11"]');
   return {rolle:k.getAttribute("role"),tab:k.getAttribute("tabindex")};
  });
  p(h.rolle==="button"&&h.tab==="0","der Kartenkopf ist mit der Tastatur erreichbar",h);
  await page.evaluate(()=>document.querySelector('#werkstattBody [data-werk-karte="11"]').focus());
  await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  const auf=await page.evaluate(()=>!!document.querySelector('#werkstattBody [data-werk-karte="11"]')
    .closest(".werk-karte").querySelector(".werk-karte-body"));
  p(auf,"Enter oeffnet die Karte");
  await page.evaluate(()=>document.querySelector('#werkstattBody [data-werk-karte="11"]').focus());
  await page.keyboard.press(" "); await page.waitForTimeout(400);
  const zu=await page.evaluate(()=>!!document.querySelector('#werkstattBody [data-werk-karte="11"]')
    .closest(".werk-karte").querySelector(".werk-karte-body"));
  p(!zu,"die Leertaste schliesst sie wieder");
 }

 console.log("\nI · Ein Knopf im Kopf klappt NICHT mit auf");
 {
  await vorbereiten(page,MODULE);
  if(await werkstattAuf(page)){
   const vorher=await page.evaluate(()=>$("werkstattBody").querySelectorAll(".werk-karte-body").length);
   const geklickt=await page.evaluate(()=>{
    const k=document.querySelector('#werkstattBody [data-werk-karte="11"]');
    const b=k.querySelector("button[data-aufgabe]");
    if(!b)return "kein Knopf";
    b.click(); return "ok";
   });
   await page.waitForTimeout(500);
   const nachher=await page.evaluate(()=>$("werkstattBody").querySelectorAll(".werk-karte-body").length);
   p(geklickt==="ok","im Kopf steht der Aktionsknopf",geklickt);
   p(vorher===0&&nachher===0,"der Aktionsknopf klappt die Karte NICHT auf",{vorher,nachher});
  }
 }

 console.log("\nJ · Vier Bildschirmbreiten");
 {
  await vorbereiten(page,MODULE);
  if(await werkstattAuf(page)){
   for(const id of ["11","13","15"])await tipp(page,'#werkstattBody [data-werk-karte="'+id+'"]',"Karte "+id);
   for(const w of [320,390,768,1280]){
    await page.setViewportSize({width:w,height:900});
    await page.waitForTimeout(350);
    const m=await page.evaluate(()=>{
     const W=document.documentElement.clientWidth;
     // Die Fortschrittsleiste scrollt seit v3.10 bewusst seitwaerts.
     const ueber=[...document.querySelectorAll("#werkstattBody *")].filter(e=>{
      if(e.closest(".mw-leiste"))return false;
      const r=e.getBoundingClientRect(); return r.width>0&&r.right>W+1;
     }).map(e=>e.tagName+"."+(typeof e.className==="string"?e.className:""));
     return {ueber,scrollX:document.documentElement.scrollWidth>W+1,
      svgBreit:[...document.querySelectorAll(".werk-skizze svg")]
        .map(s=>Math.round(s.getBoundingClientRect().width)),
      koepfe:[...document.querySelectorAll("[data-werk-karte]")]
        .map(e=>Math.round(e.getBoundingClientRect().height))};
    });
    p(m.ueber.length===0,w+" px: nichts laeuft seitlich hinaus",m.ueber);
    p(!m.scrollX,w+" px: die Seite scrollt nicht seitwaerts");
    p(m.svgBreit.every(x=>x<=w),w+" px: jede Zeichnung passt in die Breite",m.svgBreit);
    p(m.koepfe.every(h=>h>=34),w+" px: jeder Kartenkopf bleibt gross genug",m.koepfe);
   }
   await page.setViewportSize({width:412,height:900});
  }
 }

 console.log("\nK · Keine JavaScript-Fehler");
 p(fehler.length===0,"keine Fehler auf der Seite",fehler);

 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  FEHLGESCHLAGEN: "+fail:"  alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();

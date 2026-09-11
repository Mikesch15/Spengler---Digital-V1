// v3.33: Rollen- oder Tafelmaterial - vom Materialbestand bis in den Zuschnitt
//
// Der Betrieb hat gemeldet: "beim material erfassen mjss auch ausgewaehlt
// werden koennen, ob es rollen oder tafelmaterial ist. dies muss dan in den
// massaufnahmen im gesamten zuschnitt auch beruecksichtigt werden und
// angegeben werden, ob von der rolle oder aus der tafel geschnitten werden
// soll".
//
// Geprueft wird nicht "es sieht plausibel aus", sondern:
//   - der Materialbestand kennt die Form, und die Tafelmasse erscheinen nur
//     bei Tafel (gemessen ueber getComputedStyle - die [hidden]-Falle,
//     CLAUDE.md 59/71.5/115.9/120.9/129.4)
//   - ebaFormate() entscheidet in allen vier Lagen richtig, und "Tafel ohne
//     Format" faellt MIT GRUND auf die Rolle zurueck statt ein Format zu
//     erfinden
//   - das Feld steht bei zehn Arten, aber ausdruecklich NICHT bei
//     Skizze/Foto (rechnet nichts) und Rinne Halbrund (Normlaengen)
//   - die RECHNUNG unterscheidet sich wirklich: bei der Tafel ist der
//     Abschnitt so lang wie die Tafel, von der Rolle so lang wie das
//     laengste Stueck. Von Hand nachgerechnet.
//   - ein Stueck, das nicht in die Tafel passt, wird GEMELDET, nicht
//     weggelassen
//   - Registername, Einleitung, Wortwahl und Rollenauswahl haengen an der
//     Form
//   - die Wahl ueberlebt Speichern (base + BEIDE Payloads) und Oeffnen
//   - Werkstatt, Ruestliste und PDF-Kopf sagen, woraus geschnitten wird
//   - es entsteht keine zweite Packrechnung und kein zweiter Registername
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rolle-tafel-v3-33.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// Nachgerechnete Erwartungen (von Hand, nicht aus dem Code abgeschrieben):
//
// Tafel 2000 x 1000 mm, Abwicklung 250, Stuecke 1200/1200/900/800:
//   Streifen je Tafel = 1000 / 250            = 4
//   Abschnittlaenge   = Tafellaenge           = 2000   (NICHT 1200)
//   Belegung: 1200+800 = 2000 (exakt), 1200 allein, 900 allein -> 3 Streifen
//   1 Tafel, Flaeche = 1,000 x 2,000 m        = 2,00 m2
//   netto = 0,250 x (1200+1200+900+800) mm    = 1,025 m2
//   Verschnitt = 2,00 - 1,025                 = 0,975 m2
//
// Rolle 1000 mm, dieselben Stuecke:
//   Abschnittlaenge   = laengstes Stueck      = 1200
//   4 Streifen nebeneinander, 1 Abschnitt     -> 1,20 m2
//   Verschnitt = 1,20 - 1,025                 = 0,175 m2
const ERW={tafel:{abschnitt:2000,flaeche:2.0,verschnitt:0.975,streifen:3,jeAbschnitt:4},
           rolle:{abschnitt:1200,flaeche:1.2,verschnitt:0.175,jeAbschnitt:4}};

const ATTRAPPE=`window.supabase={createClient:()=>{
 const tabelle=t=>{
  const kette={
   select:()=>kette, eq:(f,v)=>{(kette.__eq=kette.__eq||[]).push([f,v]);return kette},
   order:()=>kette, in:()=>kette, not:()=>kette,
   limit:()=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}),
   maybeSingle:()=>Promise.resolve({data:(window.__einzeln&&window.__einzeln[t])||null,error:null}),
   then:(f)=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}).then(f),
   insert:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"insert",d});
     return {select:()=>Promise.resolve({data:(Array.isArray(d)?d:[d]).map((x,i)=>Object.assign({id:900+i},x)),error:null})}},
   upsert:(d,o)=>{(window.__schreib=window.__schreib||[]).push({t,op:"upsert",d,o});
     return {select:()=>Promise.resolve({data:(Array.isArray(d)?d:[d]),error:null})}},
   update:d=>{const eintrag={t,op:"update",d,eq:[]};
     (window.__schreib=window.__schreib||[]).push(eintrag);
     const k2={eq:(f,v)=>{eintrag.eq.push([f,v]);return k2},
       select:()=>{const id=(eintrag.eq.find(e=>e[0]==="id")||[])[1];
         return Promise.resolve({data:[Object.assign({},d,{id:id!==undefined?id:1})],error:null})}};
     return k2},
   delete:()=>({eq:()=>({select:()=>Promise.resolve({data:[{id:1}],error:null})})})
  };
  return kette};
 return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle, storage:{from:()=>({upload:()=>Promise.resolve({error:null}),
    createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})})},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}};
}};`;

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto(APP,{waitUntil:"load"});
 // Ein zu frueher Zugriff bricht den Lauf ab, und ein abgebrochener Lauf
 // sieht aus wie "keine Fehler" (CLAUDE.md 78).
 await page.waitForFunction(()=>typeof ebaFormate==="function"&&typeof zuTitel==="function"
   &&typeof measZuschnittFormGet==="function"&&typeof lagFormularHtml==="function"
   &&typeof showMeasTypeSection==="function"&&typeof buildMeasurementFromForm==="function",
   null,{timeout:15000});

 const ARTEN=["skizze_foto","einlaufblech_gerade","rinne_halbrund","einlaufblech_konisch",
  "freies_profil","mauerabdeckung","lukarne","anschlussblech","einfassung_rund",
  "kehle","rinne","kamineinfassung"];
 // Zehn Arten schneiden aus Rolle oder Tafel. Skizze/Foto rechnet nichts,
 // Rinne Halbrund bezieht ein fertiges Profil in Normlaengen (raNormPlan).
 const OHNE_FORM=["skizze_foto","rinne_halbrund"];

 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"f1"};
  allProfiles=[{id:"u1",first_name:"M",last_name:"L"}]; meineRechte={admin:true};
  allProjects=[{id:7,name:"Testbau",object:"Musterweg 1",order_no:"1",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  settings={materials:[],rates:[],company:"Muster Spenglerei"};
  materialIds=[36];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0;
  restMindestlaenge=1000; restMindestbreite=100;
  appSettingsId=1; window.__schreib=[]; window.__lese={};
  projektModule={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
  reststuecke=[]; restVerwendet=[]; resteImZuschnitt=false;
  workflowAktiv=false;
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  // Ohne geoeffnetes Formular ist offsetParent null - dann waere jede
  // Sichtbarkeitsmessung trivial "nicht da".
  $("measurementEditModal").hidden=false;
  // Titanzink fuehrt die Firma als ROLLE, Kupfer als TAFEL 2000 x 1000.
  lagerbestand=[
   {id:1,material_id:2,staerke_mm:0.7,ausfuehrung:"blank",form:"rolle",bezeichnung:"Titanzink 0.7"},
   {id:2,material_id:3,staerke_mm:0.6,ausfuehrung:"blank",form:"tafel",
    laenge_mm:2000,breite_mm:1000,bezeichnung:"Kupfer 0.6"}
  ];
  window.__sicht=s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent!==null);
 });

 // =========================================================== A
 console.log("A · Materialbestand: Rolle oder Tafel");
 const a=await page.evaluate(()=>{
  const leer=lagFormularHtml({});
  const mitTafel=lagFormularHtml({form:"tafel",laenge_mm:2000,breite_mm:1000});
  return {formFeld:/id="lag_form"/.test(leer),
   optionen:(leer.match(/<option value="(rolle|tafel)"/g)||[]).length,
   tafelFelder:(leer.match(/data-lag-tafelmass/g)||[]).length,
   leerVersteckt:(leer.match(/data-lag-tafelmass="1" hidden/g)||[]).length,
   tafelSichtbar:!/data-lag-tafelmass="1" hidden/.test(mitTafel),
   laenge:/id="lag_laenge"/.test(leer), breite:/id="lag_breite"/.test(leer),
   erklaert:/Rolle<\/b> wird ein Abschnitt abgezogen/.test(leer)};
 });
 p(a.formFeld,"der Materialbestand hat ein Feld Form",a);
 p(a.optionen===2,"genau zwei Formen zur Wahl (Rolle, Tafel)",a);
 p(a.tafelFelder===2,"Tafellaenge und Tafelbreite sind vorhanden",a);
 p(a.leerVersteckt===2,"ohne Tafel sind beide Tafelmasse versteckt",a);
 p(a.tafelSichtbar,"mit Tafel sind sie sichtbar",a);
 p(a.erklaert,"das Formular erklaert den Unterschied",a);

 // Die [hidden]-Falle GEMESSEN, nicht aus dem Attribut geschlossen:
 // eine eigene display-Regel wuerde [hidden] schlagen (CLAUDE.md 59).
 const aMess=await page.evaluate(()=>{
  const w=document.createElement("div");
  w.innerHTML=lagFormularHtml({});
  document.body.appendChild(w);
  const el=w.querySelector("[data-lag-tafelmass]");
  const d=getComputedStyle(el).display, h=el.getBoundingClientRect().height;
  w.remove();
  return {display:d,hoehe:Math.round(h)};
 });
 p(aMess.display==="none"&&aMess.hoehe===0,"versteckte Tafelmasse sind wirklich unsichtbar (gemessen)",aMess);

 // =========================================================== B
 console.log("B · Woher die Form kommt - alle vier Lagen");
 const bb=await page.evaluate(()=>{
  const out={};
  measZuschnittFormZuruecksetzen();
  measStaerkeSetzen(0.7); out.bestandRolle=ebaFormate({material:2,staerke:0.7});
  measStaerkeSetzen(0.6); out.bestandTafel=ebaFormate({material:3,staerke:0.6});
  measZuschnittFormSetzen("rolle"); out.wahlRolle=ebaFormate({material:3,staerke:0.6});
  measZuschnittFormSetzen("tafel"); out.wahlTafelOhneFormat=ebaFormate({material:2,staerke:0.7});
  measZuschnittFormZuruecksetzen();
  measStaerkeSetzen(null); out.ohneStaerke=ebaFormate({material:3});
  return out;
 });
 p(bb.bestandRolle.form==="rolle"&&bb.bestandRolle.quelle==="bestand",
   "Bestand sagt Rolle -> Rolle",bb.bestandRolle);
 p(bb.bestandTafel.form==="tafel"&&bb.bestandTafel.quelle==="bestand"
   &&(bb.bestandTafel.formate||[]).length===1
   &&bb.bestandTafel.formate[0].laenge===2000&&bb.bestandTafel.formate[0].breite===1000,
   "Bestand sagt Tafel -> Tafel, mit dem hinterlegten Format",bb.bestandTafel);
 p(bb.wahlRolle.form==="rolle"&&bb.wahlRolle.quelle==="wahl",
   "die ausdrueckliche Wahl schlaegt den Bestand",bb.wahlRolle);
 p(bb.wahlTafelOhneFormat.form==="rolle"&&bb.wahlTafelOhneFormat.quelle==="rueckfall"
   &&bb.wahlTafelOhneFormat.grund==="tafel-ohne-format",
   "Tafel gewaehlt, aber kein Format -> Rueckfall auf die Rolle MIT Grund",bb.wahlTafelOhneFormat);
 p((bb.wahlTafelOhneFormat.formate||[]).every(f=>f.laenge===null||f.laenge===undefined),
   "dabei wird KEIN Tafelformat erfunden",bb.wahlTafelOhneFormat.formate);
 p(bb.bestandRolle.formate.length===2&&bb.bestandRolle.formate[0].breite===1000,
   "bei der Rolle sind es die hinterlegten Rollenbreiten",bb.bestandRolle.formate);

 // =========================================================== C
 console.log("C · Das Feld an der Massaufnahme - zehn Arten, zwei ohne");
 const c=[];
 for(const art of ARTEN){
  await page.evaluate(a=>{
   measZuschnittFormZuruecksetzen(); measStaerkeSetzen(0.6);
   $("measType").value=a; showMeasTypeSection(a);
  },art);
  await page.waitForTimeout(120);
  const r=await page.evaluate(()=>{
   const f=window.__sicht("[data-meas-zform]");
   const s=window.__sicht("[data-meas-staerke]");
   return {form:f.length,staerke:s.length,
    label:f.length?(f[0].closest("[data-meas-zform-block]")||{textContent:""}).textContent.replace(/\s+/g," ").trim().slice(0,60):""};
  });
  c.push({art,...r});
 }
 const mitForm=c.filter(x=>OHNE_FORM.indexOf(x.art)<0);
 const ohneForm=c.filter(x=>OHNE_FORM.indexOf(x.art)>=0);
 p(mitForm.every(x=>x.form===1),"alle zehn schneidenden Arten haben GENAU EIN Feld Rolle/Tafel",
   mitForm.filter(x=>x.form!==1));
 p(ohneForm.every(x=>x.form===0),
   "Skizze/Foto und Rinne Halbrund haben ausdruecklich KEINS",ohneForm);
 p(ohneForm.every(x=>x.staerke===1),
   "ihr Staerkefeld bleibt trotzdem (das gilt fuer alle zwoelf)",ohneForm);
 p(mitForm.every(x=>/Zuschnitt aus/.test(x.label)),
   "das Feld heisst ueberall gleich",mitForm.map(x=>x.art+":"+x.label).slice(0,3));

 // =========================================================== D
 console.log("D · Das Feld selbst: Auswahl, Hinweis, Info-Knopf");
 await page.evaluate(()=>{
  measZuschnittFormZuruecksetzen(); measStaerkeSetzen(0.6);
  $("measType").value="einlaufblech_gerade"; showMeasTypeSection("einlaufblech_gerade");
  ebA.material=3; ebA.abwicklung=250;
  ebA.stuecke=[{laenge:1200},{laenge:1200},{laenge:900},{laenge:800}];
  ebaSetzeSchritt(1);
 });
 await page.waitForTimeout(250);
 const d=await page.evaluate(()=>{
  // Jeder Zugriff abgesichert: ein Absturz saehe aus wie "keine Fehler"
  // (CLAUDE.md 78).
  const f=window.__sicht("[data-meas-zform]")[0];
  if(!f)return {fehlt:true,wert:null,werte:[],texte:[],hinweis:"",info:false,
                gross:"",hoehe:0};
  const blk=f.closest("[data-meas-zform-block]")||{textContent:"",querySelector:()=>null};
  const r=f.getBoundingClientRect();
  return {fehlt:false, wert:f.value, werte:[...f.options].map(o=>o.value),
   texte:[...f.options].map(o=>o.textContent),
   hinweis:blk.textContent.replace(/\s+/g," ").trim(),
   info:!!blk.querySelector(".hilfe-knopf[data-hilfe='meas-zuschnitt-form']"),
   gross:getComputedStyle(f).textTransform,
   hoehe:Math.round(r.height)};
 });
 p(!d.fehlt,"das Feld ist ueberhaupt da",d);
 p(d.wert==="","die Vorgabe ist automatisch",d);
 p(d.werte.join("|")==="|rolle|tafel","drei Moeglichkeiten: automatisch, Rolle, Tafel",d.werte);
 p(/automatisch \(Materialbestand\)/.test(d.texte[0]),"die Vorgabe sagt, woher sie kommt",d.texte);
 p(/Laut Materialbestand: Tafelmaterial/.test(d.hinweis),
   "der Hinweis nennt, was der Bestand sagt",d.hinweis);
 p(/2.000 . 1.000 mm/.test(d.hinweis),"und nennt das hinterlegte Format",d.hinweis);
 p(d.info,"das Feld hat einen Info-Knopf",d);
 p(d.gross==="none","der Wert steht nicht in GROSSBUCHSTABEN",d);
 p(d.hoehe>=34,"das Feld ist gut treffbar (>= 34 px)",d);

 // Der Info-Knopf braucht einen hinterlegten Text, sonst entstuende gar
 // keiner (hilfeKnopf, js/41 - CLAUDE.md 107.2).
 const dHilfe=await page.evaluate(()=>({
   text:!!(typeof HILFE_TEXTE==="object"&&HILFE_TEXTE["meas-zuschnitt-form"]),
   laenge:(HILFE_TEXTE["meas-zuschnitt-form"]||{text:""}).text.length,
   nenntBeides:/Rolle/.test((HILFE_TEXTE["meas-zuschnitt-form"]||{text:""}).text)
     &&/Tafel/.test((HILFE_TEXTE["meas-zuschnitt-form"]||{text:""}).text)}));
 p(dHilfe.text&&dHilfe.laenge>200,"der Hilfetext ist hinterlegt",dHilfe);
 p(dHilfe.nenntBeides,"und erklaert beide Formen",dHilfe);

 // =========================================================== E
 console.log("E · Die Rechnung unterscheidet sich wirklich");
 const e=await page.evaluate(()=>{
  const nimm=pl=>{const g=(pl.gruppen||[])[0]||{},bst=(pl.moeglich||[])[0]||{};
   return {form:pl.form,abschnitt:g.abschnittLaenge,
     flaeche:bst.flaeche,verschnitt:bst.verschnitt,
     jeAbschnitt:bst.jeAbschnitt,streifen:bst.streifen,
     laenge:bst.laenge,breite:bst.breite};};
  measZuschnittFormZuruecksetzen();          // Bestand sagt Tafel
  const t=nimm(ebaZuschnittPlan());
  measZuschnittFormSetzen("rolle");
  const r=nimm(ebaZuschnittPlan());
  measZuschnittFormZuruecksetzen();
  return {t,r};
 });
 const rund=(v,n)=>Math.round(v*Math.pow(10,n))/Math.pow(10,n);
 p(e.t.form==="tafel"&&e.t.abschnitt===ERW.tafel.abschnitt,
   "Tafel: der Abschnitt ist so lang wie die TAFEL (2000), nicht wie das laengste Stueck",e.t);
 p(e.r.form==="rolle"&&e.r.abschnitt===ERW.rolle.abschnitt,
   "Rolle: der Abschnitt ist so lang wie das laengste Stueck (1200)",e.r);
 p(e.t.jeAbschnitt===ERW.tafel.jeAbschnitt&&e.t.streifen===ERW.tafel.streifen,
   "Tafel: 4 Streifen nebeneinander, 3 davon belegt",e.t);
 p(rund(e.t.flaeche,3)===ERW.tafel.flaeche&&rund(e.t.verschnitt,3)===ERW.tafel.verschnitt,
   "Tafel: 2,00 m2 Blech, 0,975 m2 Verschnitt (von Hand nachgerechnet)",e.t);
 p(rund(e.r.flaeche,3)===ERW.rolle.flaeche&&rund(e.r.verschnitt,3)===ERW.rolle.verschnitt,
   "Rolle: 1,20 m2 Blech, 0,175 m2 Verschnitt (von Hand nachgerechnet)",e.r);
 p(e.t.laenge===2000&&e.t.breite===1000&&e.r.laenge===null,
   "das Tafelformat traegt Laenge UND Breite, die Rollenbreite nur die Breite",e);

 // =========================================================== F
 // v3.80: ein zu langes Stueck wird nicht mehr abgelehnt (zuLang), sondern
 // automatisch in gleich lange, tafelgerechte Teilstuecke geteilt - Feedback
 // vom 11.09.2026 ("wenn ein Profil zu lang fuer eine Tafel ist, soll es
 // automatisch in gleich lange Stuecke geteilt werden").
 console.log("F · Ein zu langes Stueck wird automatisch geteilt, nicht mehr abgelehnt");
 const f=await page.evaluate(()=>{
  const out={};
  measZuschnittFormSetzen("tafel");
  ebA.stuecke=[{laenge:2500},{laenge:1200},{laenge:800}];   // 2500 > Tafel 2000
  const p1=ebaZuschnittPlan();
  out.zuLang={liste:p1.zuLang,leer:p1.leer,moeglich:(p1.moeglich||[]).length};
  const streifen=(p1.gruppen&&p1.gruppen[0]&&p1.gruppen[0].streifen)||[];
  const geteilt=[]; streifen.forEach(s=>(s.stuecke||[]).forEach(x=>{if(x.tafelTeil&&x.tafelTeil.von===1)geteilt.push(x)}));
  out.geteilt={anzahl:geteilt.length,laengen:geteilt.map(x=>x.laenge),
   summe:geteilt.reduce((a,x)=>a+x.laenge,0),alleUnterTafel:geteilt.every(x=>x.laenge<=2000)};
  out.htmlZeigtTeil=/Teil 1\/2/.test(zuschnittHtml(p1))&&/Teil 2\/2/.test(zuschnittHtml(p1));
  ebA.abwicklung=1200; ebA.stuecke=[{laenge:800}];          // breiter als die Tafel
  const p2=ebaZuschnittPlan();
  out.zuSchmal={liste:p2.zuSchmal,moeglich:(p2.moeglich||[]).length};
  out.zuSchmalImHtml=/breit/i.test(zuschnittHtml(p2));
  ebA.abwicklung=250; ebA.stuecke=[{laenge:1200},{laenge:1200},{laenge:900},{laenge:800}];
  measZuschnittFormZuruecksetzen();
  return out;
 });
 p((f.zuLang.liste||[]).length===0,
   "ein zu langes Stueck steht seit v3.80 NICHT mehr in zuLang",f.zuLang);
 p(f.zuLang.moeglich>0,"stattdessen entsteht ein brauchbarer Plan (automatisch geteilt)",f.zuLang);
 p(f.geteilt.anzahl===2&&f.geteilt.summe===2500&&f.geteilt.alleUnterTafel,
   "das 2500mm-Stueck wird in zwei gleich lange, tafelgerechte Teilstuecke (je 1250mm) geteilt",f.geteilt);
 p(f.htmlZeigtTeil,"die Teilung steht sichtbar in der Darstellung (Teil 1/2, Teil 2/2)",f);
 p((f.zuSchmal.liste||[]).length===1&&f.zuSchmal.moeglich===0,
   "eine zu schmale Tafel wird weiterhin gemeldet (Breite laesst sich nicht teilen)",f.zuSchmal);
 p(f.zuSchmalImHtml,"und das steht in der Darstellung",f);

 // =========================================================== G
 console.log("G · Die Darstellung haengt an der Form");
 const g=await page.evaluate(()=>{
  const lies=()=>{const pl=ebaZuschnittPlan();
   return {form:pl.form,html:zuschnittHtml(pl),
     auswahl:zuAuswahlHtml(ebA.rollenAuswahl,"data-eba-rolle",pl.art),
     titel:zuTitel(4,pl.art),einleitung:pl.einleitung,quelle:pl.quelle};};
  measZuschnittFormZuruecksetzen(); const t=lies();
  measZuschnittFormSetzen("rolle");  const r=lies();
  measZuschnittFormZuruecksetzen();
  return {t,r};
 });
 p(g.t.titel==="4 · Zuschnitt aus Tafelmaterial"&&g.r.titel==="4 · Zuschnitt aus Rollenblech",
   "der Registername nennt, woraus geschnitten wird",{t:g.t.titel,r:g.r.titel});
 p(/Tafel/.test(g.t.einleitung)&&/feste Länge/.test(g.t.einleitung),
   "die Einleitung erklaert die feste Tafellaenge",g.t.einleitung);
 p(/Rolle/.test(g.r.einleitung)&&!/feste Länge/.test(g.r.einleitung),
   "bei der Rolle steht das nicht da",g.r.einleitung);
 p(g.t.auswahl===""&&/data-eba-rolle/.test(g.r.auswahl),
   "bei der Tafel gibt es keine Rollenbreite zu waehlen",{t:g.t.auswahl.length,r:g.r.auswahl.length});
 p(/Tafel/.test(g.t.html)&&!/Rollenblech/.test(g.t.html),
   "die Tafel-Darstellung spricht nirgends von der Rolle",{tafel:(g.t.html.match(/Rollenblech/g)||[]).length});
 p(/Rollenblech/.test(g.r.html)||/Rolle/.test(g.r.html),
   "die Rollen-Darstellung nennt die Rolle",{});

 // =========================================================== H
 console.log("H · Speichern, Oeffnen, Zuruecksetzen");
 const h=await page.evaluate(()=>{
  const out={};
  measZuschnittFormSetzen("tafel");
  // Jeder Zugriff abgesichert: ein Absturz saehe aus wie "keine Fehler"
  // (CLAUDE.md 78).
  if($("measTitle"))$("measTitle").value="Formprobe";
  measSelectedProjectId=7;
  const form=buildMeasurementFromForm();
  out.base=form?form.zuschnitt_form:"KEIN FORMULAR";
  out.rollenForm=form&&form.data&&form.data.rollen?form.data.rollen.form:null;
  out.rollenLaenge=form&&form.data&&form.data.rollen?form.data.rollen.formLaenge:null;
  // Oeffnen
  measZuschnittFormZuruecksetzen();
  out.nachZuruecksetzen=measZuschnittFormGet();
  measZuschnittFormSetzen("rolle");
  out.nachSetzen=measZuschnittFormGet();
  measZuschnittFormSetzen(null);
  out.nullIstAutomatisch=measZuschnittFormGet();
  measZuschnittFormSetzen("quatsch");
  out.unsinnIstAutomatisch=measZuschnittFormGet();
  measZuschnittFormZuruecksetzen();
  return out;
 });
 p(h.base==="tafel","die Wahl steht im Speicher-Payload (base)",h);
 p(h.rollenForm==="tafel","der gespeicherte Plan traegt die Form mit",h);
 p(h.rollenLaenge===2000,"und bei der Tafel auch ihre Laenge",h);
 p(h.nachZuruecksetzen===null&&h.nachSetzen==="rolle","Setzen und Zuruecksetzen wirken",h);
 p(h.nullIstAutomatisch===null&&h.unsinnIstAutomatisch===null,
   "null und ein unbekannter Wert heissen beide automatisch",h);

 // Die drei Stellen in js/16 - eine vergessene Stelle waere ein Feld, das
 // angezeigt, aber nie gespeichert wird (CLAUDE.md 121.4).
 const hQ=fs.readFileSync("js/16-massaufnahme-formular.js","utf8");
 // Gezaehlt werden ZEILEN, nicht Vorkommen: die beiden Payload-Zeilen nennen
 // den Namen dreimal (Feld, Bedingung, Wert).
 const hZeilen=hQ.split("\n").filter(z=>/zuschnitt_form/.test(z));
 p(hZeilen.length===3,
   "js/16 fuehrt zuschnitt_form an genau drei Stellen (base + beide Payloads)",
   hZeilen.map(z=>z.trim().slice(0,60)));
 const hQ10=fs.readFileSync("js/10-massaufnahme.js","utf8");
 p(/measZuschnittFormZuruecksetzen/.test(hQ10)&&/measZuschnittFormSetzen/.test(hQ10),
   "js/10 setzt sie beim Anlegen zurueck und beim Oeffnen",{});

 // =========================================================== I
 console.log("I · Werkstatt, Ruestliste und PDF sagen es auch");
 const i=await page.evaluate(()=>{
  const m={id:501,type:"einlaufblech_gerade",title:"Formprobe",project_id:7,
   staerke_mm:0.6,
   data:{material:3,abwicklung:250,
     rollen:{form:"tafel",abschnittLaenge:2000,
       bestes:{breite:1000,laenge:2000,flaeche:2,verschnitt:0.975,abschnitte:1,
         abschnittLaenge:2000,jeAbschnitt:4},
       moeglich:[{breite:1000,laenge:2000,flaeche:2,verschnitt:0.975,abschnitte:1,
         abschnittLaenge:2000,jeAbschnitt:4}],
       gruppen:[{breite:250,abschnittLaenge:2000,streifen:[[{nr:1,laenge:1200}]]}]}}};
  const pl=pmatPlanFuer(m);
  return {materialText:pl?pl.materialText:null, form:pl?pl.form:null,
   wort:(typeof zuWort==="function")?zuWort({form:"tafel"}).kopf:null,
   wortRolle:(typeof zuWort==="function")?zuWort({form:"rolle"}).kopf:null};
 });
 p(i.form==="tafel","der gespeicherte Plan wird als Tafel gelesen",i);
 p(/Tafel/.test(i.materialText||""),
   "die Werkstatt-Zeile nennt Material, Staerke UND Tafel",i.materialText);
 p(/Kupfer/.test(i.materialText||"")&&/0,6/.test(i.materialText||""),
   "und verliert dabei Material und Staerke nicht",i.materialText);
 p(i.wort==="Tafel"&&i.wortRolle==="Rollenblech","die Woerter kommen aus ZU_WORT",i);
 // Ein Plan traegt die Form unter zwei Namen. Der PDF-Kopf (js/16) hat nur
 // den gespeicherten Wert und reicht {form:...} herein - las zuIstTafel nur
 // "art", stand dort bei Tafelmaterial "Rollenblech".
 const iBeide=await page.evaluate(()=>({
   nurForm:zuWort({form:"tafel"}).kopf, nurArt:zuWort({art:"tafel"}).kopf,
   beide:zuWort({art:"tafel",form:"tafel"}).kopf, leer:zuWort({}).kopf}));
 p(iBeide.nurForm==="Tafel"&&iBeide.nurArt==="Tafel"&&iBeide.beide==="Tafel",
   "zuWort liest die Form unter BEIDEN Namen",iBeide);
 p(iBeide.leer==="Rollenblech","ohne Angabe bleibt es bei der Rolle",iBeide);

 // Ruestliste und PDF werden WIRKLICH erzeugt und im Ergebnis gemessen -
 // eine Quelltextsuche wuerde nur bestaetigen, dass ein Funktionsname
 // irgendwo steht (dieselbe Lehre wie CLAUDE.md 128.4/135.3).
 await page.evaluate(()=>{
  window.__druck=[];
  window.open=function(){
   const nr=window.__druck.length; window.__druck.push("");
   const d={geschrieben:"",write(h){this.geschrieben+=h;window.__druck[nr]=this.geschrieben},
     close(){window.__druck[nr]=this.geschrieben}};
   return {document:d,focus(){},print(){},close(){},location:{href:""}};
  };
 });
 const druck=async fn=>{
  await page.evaluate(f=>{window.__druck=[];eval(f)},fn);
  await page.waitForTimeout(400);
  return page.evaluate(()=>(window.__druck||[]).filter(x=>x&&x.length).slice(-1)[0]||"");
 };
 const iMess=await page.evaluate(()=>({
  m:JSON.stringify({id:501,type:"einlaufblech_gerade",title:"Formprobe",project_id:7,
   date:"2026-09-08",staerke_mm:0.6,
   data:{material:3,abwicklung:250,
     rollen:{form:"tafel",abschnittLaenge:2000,abwicklung:250,
       bestes:{breite:1000,laenge:2000,flaeche:2,verschnitt:0.975,abschnitte:1,
         abschnittLaenge:2000,jeAbschnitt:4,rollenLaenge:2000},
       moeglich:[{breite:1000,laenge:2000,flaeche:2,verschnitt:0.975,abschnitte:1,
         abschnittLaenge:2000,jeAbschnitt:4,rollenLaenge:2000}],
       gruppen:[{breite:250,abschnittLaenge:2000,jeAbschnitt:4,abschnitte:1,
         streifen:[{stuecke:[{nr:1,laenge:1200}],rest:800}]}]}}})}));
 const rlHtml=await druck("window.__m=JSON.parse("+JSON.stringify(iMess.m)+");"
   +"if(typeof ruestlisteMassaufnahme===\"function\")ruestlisteMassaufnahme(window.__m);");
 p(/Tafel/.test(rlHtml)&&!/Rollenblech/.test(rlHtml),
   "die gedruckte Ruestliste nennt die Tafel und nicht die Rolle",
   (rlHtml.match(/(Tafel|Rollenblech)[^<]{0,24}/g)||[]).slice(0,4));
 const pdfHtml=await druck("if(typeof printMeasurement===\"function\")"
   +"printMeasurement(JSON.parse("+JSON.stringify(iMess.m)+"),{listen:\"alle\"});");
 // Gemessen wird die KOPFZEILE, nicht das ganze Dokument: das Wort "Tafel"
 // steht auch im Zuschnitt-Abschnitt, ein blosses /Tafel/ waere also blind.
 const pdfKopf=(pdfHtml.match(/Material:<\/span>([^<]*)/)||[])[1]||"";
 p(/Tafel/.test(pdfKopf),"der gedruckte PDF-Kopf nennt die Tafel",pdfKopf);
 p(/Kupfer/.test(pdfKopf)&&/0,6/.test(pdfKopf)&&!/Rollenblech/.test(pdfKopf),
   "und verliert dabei Material und Staerke nicht",pdfKopf);

 // =========================================================== J
 console.log("J · Sauberkeit: eine Packrechnung, ein Titel, ein Formatplan");
 const MOD=["js/29-einlaufblech-aufnahme.js","js/30-einlaufblech-konisch-aufnahme.js",
  "js/31-freies-profil-aufnahme.js","js/32-mauerabdeckung-aufnahme.js",
  "js/34-kehle-aufnahme.js","js/36-lukarne-aufnahme.js","js/37-kamin-aufnahme.js",
  "js/38-einfassung-aufnahme.js","js/39-rinne-aufnahme.js","js/40-anschlussblech-aufnahme.js"];
 const quelle={}; MOD.forEach(f=>quelle[f]=fs.readFileSync(f,"utf8"));
 const j29=quelle["js/29-einlaufblech-aufnahme.js"];
 p((j29.match(/function ebaFormatPlan/g)||[]).length===1,
   "ebaFormatPlan steht genau einmal im Repo",{});
 p((j29.match(/function ebaVerteile/g)||[]).length===1
   &&(j29.match(/function ebaPackeInStreifen/g)||[]).length===1,
   "die eine Packrechnung ist unveraendert die aus js/29",{});
 const ohneFormatPlan=MOD.filter(f=>f!=="js/29-einlaufblech-aufnahme.js"&&!/ebaFormatPlan/.test(quelle[f]));
 p(ohneFormatPlan.length===0,
   "alle zehn Rollen-/Tafel-Module rechnen ueber ebaFormatPlan",ohneFormatPlan);
 const j33=fs.readFileSync("js/33-zuschnitt.js","utf8");
 p((j33.match(/function zuTitel/g)||[]).length===1,
   "zuTitel steht genau einmal im Repo",{});
 const ohneTitel=MOD.filter(f=>!/zuTitel\(/.test(quelle[f]));
 p(ohneTitel.length===0,"alle zehn Module benutzen ihn fuer den Registernamen",ohneTitel);
 // js/29 DEFINIERT den Rueckfall (in ebaFormLeer) - dort gehoert er hin.
 // Kein anderes Modul darf ihn selbst noch einmal schreiben.
 const eigeneForm=MOD.filter(f=>f!=="js/29-einlaufblech-aufnahme.js"
   &&/form:"rolle",formGrund:""/.test(quelle[f]));
 p(eigeneForm.length===0,
   "kein Modul meldet in seinem leeren Pfad noch pauschal die Rolle",eigeneForm);
 // Wer einen Rueckgabepfad OHNE Packrechnung hat (leeres Profil, kein Stueck),
 // braucht die Form trotzdem fuer den Registernamen - er holt sie aus
 // ebaFormLeer und baut sie NICHT selbst. Geprueft wird deshalb die
 // Eigenschaft (kein eigenes Formobjekt), nicht der blosse Funktionsname:
 // js/34 hat gar keinen solchen Pfad und braucht ebaFormLeer folglich nicht.
 // Das '.form:"rolle"' in js/38 ist ein typeof-Ternaer, kein eigenes Objekt.
 const eigenesLeer=MOD.filter(f=>f!=="js/29-einlaufblech-aufnahme.js"
   &&/[,{]\s*form:"rolle"/.test(quelle[f]));
 p(eigenesLeer.length===0,
   "kein Modul baut sein leeres Formobjekt selbst",eigenesLeer);
 // Der projektweite Sammelplan gehoert zu mehreren Massaufnahmen - eine Form
 // von einer davon abzuleiten waere geraten.
 const j49=fs.readFileSync("js/49-projekt-zuschnitt.js","utf8");
 p(/form:null|staerke:null/.test(j49),
   "der projektweite Sammelplan bekommt ausdruecklich keine Form angedichtet",{});

 // =========================================================== K
 console.log("K · Bildschirmbreiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:900});
  await page.evaluate(()=>{
   measZuschnittFormZuruecksetzen(); measStaerkeSetzen(0.6);
   $("measType").value="einlaufblech_gerade"; showMeasTypeSection("einlaufblech_gerade");
   ebaSetzeSchritt(1);
  });
  await page.waitForTimeout(200);
  const k=await page.evaluate(()=>{
   const f=window.__sicht("[data-meas-zform]")[0];
   if(!f)return {fehlt:true};
   const r=f.getBoundingClientRect();
   return {ueber:r.right>document.documentElement.clientWidth+1,
     hoehe:Math.round(r.height),
     scroll:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(!k.fehlt&&!k.ueber&&!k.scroll&&k.hoehe>=34,"bei "+w+" px: sichtbar, treffbar, kein Ueberlauf",k);
 }
 await page.setViewportSize({width:1280,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 console.log("\n"+ok+" von "+(ok+fail)+" bestanden"+(fail?"  ("+fail+" FEHLGESCHLAGEN)":""));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(1)});

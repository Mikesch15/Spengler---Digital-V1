// Prueft das Ableiten von Massaufnahmen aus den Offertpositionen (v3.149).
//
// Der Ablauf des Betriebs ist PROJEKT -> OFFERTE -> MASSAUFNAHME. Bis hierher
// endete die Offerte bei sich selbst: was in ihr als Position stand, musste
// danach als Massaufnahme von Hand noch einmal angelegt und benannt werden.
//
// Geprueft wird:
//   A  die Worterkennung: welche Art schlaegt die App zu welcher Bezeichnung
//      vor - samt der Faelle, in denen ein laengeres Stichwort ein kuerzeres
//      schlagen MUSS ("einlaufblech konisch" gegen "einlaufblech"),
//   B  der Sammel-Dialog: eine Zeile je Position, Vorschlag und Begruendung,
//      schon vorhandene Massaufnahmen nicht angehakt, die Zaehlzeile,
//   C  das Anlegen: EIN Schreibvorgang, die richtigen Felder, keine
//      company_id vom Client, die Herkunft in der Notiz,
//   D  die Absagen: ohne Projekt, ohne Positionen, und 0 geschriebene Zeilen
//      gelten NICHT als Erfolg,
//   E  der Einzelweg je Position: er oeffnet das gewohnte Formular vorbelegt
//      und schreibt dabei NICHTS.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-offerte-massaufnahmen-v3-149.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__db={vorhanden:[],log:[],insertLeer:false,insertFehler:null};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:"https://t/"+x},error:null})})},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const z={t,eqs:[]};const q={};
  q.insert=d=>{z.op="insert";z.daten=d;return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  q.eq=(f,v)=>{z.eqs.push([f,v]);return q};
  ["order","limit","not","delete","update","upsert","in","is","range","ilike"].forEach(k=>{if(!q[k])q[k]=()=>q});
  const lauf=()=>{
   if(z.op==="insert"){
    window.__db.log.push({t,d:z.daten});
    if(window.__db.insertFehler)return {data:null,error:{message:window.__db.insertFehler}};
    if(window.__db.insertLeer)return {data:[],error:null};
    const reihen=(Array.isArray(z.daten)?z.daten:[z.daten]).map((d,i)=>Object.assign({id:900+i},d));
    return {data:reihen,error:null};}
   if(t==="measurements"){window.__db.gelesen=z.eqs.slice();
    return {data:window.__db.vorhanden.slice(),error:null};}
   return {data:[],error:null}};
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1200,height:1400}});
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.__dialoge=[];
 page.on("dialog",d=>{page.__dialoge.push(d.message());d.accept()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 const POSITIONEN=[
  {pos:"1.1",description:"Dachrinne halbrund 333mm verzinkt",quantity:24,unit:"m",preis:48,abschnitt:"Dach"},
  {pos:"1.2",description:"Einlaufblech konisch 0.6mm",quantity:6,unit:"Stk.",preis:90,abschnitt:"Dach"},
  {pos:"1.3",description:"Kamineinfassung Ost",quantity:1,unit:"Stk.",preis:640,abschnitt:"Dach"},
  {pos:"2.1",description:"Diverse Anpassungsarbeiten",quantity:0,unit:"",preis:0,abschnitt:""}
 ];
 const grund=async(mitProjekt)=>{
  await page.evaluate(([POS,mitProjekt])=>{
   currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"A"};
   allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
   meineRechte={admin:true}; offerteZugriff=true;
   allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12",archived:false}];
   $("appRoot").hidden=false;$("authScreen").hidden=true;
   window.__db.log=[];window.__db.vorhanden=[];
   window.__db.insertLeer=false;window.__db.insertFehler=null;
   angPositions=JSON.parse(JSON.stringify(POS));
   $("angTitle").value="Offerte Muster AG";
   setAngProjectField(mitProjekt?7:null);
   renderAngPositionsTable();
   $("angebotEditModal").hidden=false;
   $("angMeasModal").hidden=true;
  },[POSITIONEN,mitProjekt]);
  await page.waitForTimeout(150);
 };

 console.log("\nA · die Worterkennung");
 const raten=async liste=>page.evaluate(l=>l.map(t=>{
   const r=angMeasArtRaten(t);return [t,r.type,r.erkannt,r.wort];}),liste);
 let a=await raten([
  "Dachrinne halbrund 333mm verzinkt","Einlaufblech konisch 0.6mm","Einlaufblech gerade",
  "Kamineinfassung Ost","Kamin einfassen und abdichten","Dachfenster Velux einfassen",
  "Kehlblech 2-teilig","Mauerabdeckung Attika 40cm","Ortblech inkl. Windbrett",
  "Lukarne Seitenverkleidung links","Entlüftungsrohr einfassen","Kastenrinne Werkstattseite",
  "Sonderprofil nach Muster"]);
 const artVon=t=>(a.find(x=>x[0]===t)||[])[1];
 p(artVon("Dachrinne halbrund 333mm verzinkt")==="rinne_halbrund","Dachrinne -> Dachrinne",a[0]);
 p(artVon("Einlaufblech konisch 0.6mm")==="einlaufblech_konisch",
   "das laengere Stichwort schlaegt das kuerzere: konisch, nicht gerade",a[1]);
 p(artVon("Einlaufblech gerade")==="einlaufblech_gerade","und umgekehrt bleibt gerade auch gerade",a[2]);
 p(artVon("Kamineinfassung Ost")==="kamineinfassung","Kamineinfassung",a[3]);
 p(artVon("Kamin einfassen und abdichten")==="kamineinfassung","auch in freier Formulierung",a[4]);
 p(artVon("Dachfenster Velux einfassen")==="dachfenstereinfassung","Dachfenster",a[5]);
 p(artVon("Kehlblech 2-teilig")==="kehle","Kehlblech -> Kehle",a[6]);
 p(artVon("Mauerabdeckung Attika 40cm")==="mauerabdeckung","Mauerabdeckung",a[7]);
 p(artVon("Ortblech inkl. Windbrett")==="anschlussblech","Ortblech -> Ort- und Seitenbleche",a[8]);
 p(artVon("Lukarne Seitenverkleidung links")==="lukarne","Lukarne",a[9]);
 p(artVon("Entlüftungsrohr einfassen")==="einfassung_rund","Entlueftungsrohr -> Einfassung Rund",a[10]);
 p(artVon("Kastenrinne Werkstattseite")==="rinne","Kastenrinne -> Rinne (Profil), nicht Dachrinne",a[11]);
 p(artVon("Sonderprofil nach Muster")==="freies_profil","Sonderprofil -> Freies Profil",a[12]);
 // Auffangart: es faellt nichts unter den Tisch
 a=await raten(["Diverse Anpassungsarbeiten","Regiearbeiten nach Aufwand",""]);
 p(a.every(x=>x[1]==="skizze_foto"&&x[2]===false),
   "was sich nicht einordnen laesst, wird Skizze/Foto - und sagt das auch",a);
 // Gegenprobe: jede vorgeschlagene Art gibt es wirklich
 const echteArten=await page.evaluate(()=>Object.keys(MEAS_TYPE_LABELS));
 const alleVorschlaege=await page.evaluate(()=>Object.keys(ANG_MEAS_WOERTER));
 p(alleVorschlaege.every(t=>echteArten.indexOf(t)>=0),
   "jede Art der Wortliste gibt es wirklich (keine erfundene)",
   alleVorschlaege.filter(t=>echteArten.indexOf(t)<0));

 console.log("\nB · der Sammel-Dialog");
 await grund(true);
 await page.evaluate(()=>$("angMassaufnahmenAbleiten").click());
 await page.waitForTimeout(350);
 let d=await page.evaluate(()=>({
  offen:!$("angMeasModal").hidden,
  zeilen:[...$("angMeasBody").querySelectorAll("tr")].map(tr=>({
   haken:tr.querySelector("[data-ang-meas-haken]").checked,
   text:tr.children[2].innerText.replace(/\s+/g," ").trim(),
   art:tr.querySelector("[data-ang-meas-art]").value,
   grund:tr.children[3].innerText.replace(/\s+/g," ").trim()
  })),
  hinweis:$("angMeasHinweis").textContent,
  gelesen:window.__db.gelesen
 }));
 p(d.offen,"er geht auf",d.offen);
 p(d.zeilen.length===4,"eine Zeile je Offertposition",d.zeilen.length);
 p(d.zeilen.map(z=>z.art).join()==="rinne_halbrund,einlaufblech_konisch,kamineinfassung,skizze_foto",
   "mit der vorgeschlagenen Art je Position",d.zeilen.map(z=>z.art));
 p(d.zeilen[0].text==="Dachrinne halbrund 333mm verzinkt",
   "der Titel ist die Bezeichnung der Position",d.zeilen[0].text);
 p(/erkannt an/.test(d.zeilen[0].grund),"und es steht dabei, WORAN es erkannt wurde",d.zeilen[0].grund);
 p(/nichts erkannt/.test(d.zeilen[3].grund),
   "bei der unklaren Position sagt die App das ausdruecklich",d.zeilen[3].grund);
 p(d.zeilen.every(z=>z.haken),"zu Beginn ist alles angehakt",d.zeilen.map(z=>z.haken));
 p(/4 von 4/.test(d.hinweis)&&/1 davon/.test(d.hinweis),
   "die Zaehlzeile nennt beides: angehakt und unklar",d.hinweis);
 p(JSON.stringify(d.gelesen)===JSON.stringify([["project_id",7]]),
   "gefragt wird nach den Massaufnahmen GENAU dieses Projekts",d.gelesen);

 console.log("\nB2 · was es schon gibt, wird nicht noch einmal angehakt");
 await grund(true);
 await page.evaluate(()=>{window.__db.vorhanden=[{title:"Kamineinfassung Ost"}]});
 await page.evaluate(()=>$("angMassaufnahmenAbleiten").click());
 await page.waitForTimeout(350);
 d=await page.evaluate(()=>({
  zeilen:[...$("angMeasBody").querySelectorAll("tr")].map(tr=>({
   haken:tr.querySelector("[data-ang-meas-haken]").checked,
   text:tr.children[2].innerText.replace(/\s+/g," ").trim()})),
  hinweis:$("angMeasHinweis").textContent}));
 p(d.zeilen[2].haken===false,"die schon vorhandene Massaufnahme ist NICHT angehakt",d.zeilen[2]);
 p(/gibt es im Projekt schon/.test(d.zeilen[2].text),"und es steht dabei, warum",d.zeilen[2].text);
 p(d.zeilen.filter(z=>z.haken).length===3,"die uebrigen drei bleiben angehakt",d.zeilen.map(z=>z.haken));
 p(/3 von 4/.test(d.hinweis),"die Zaehlzeile stimmt damit ueberein",d.hinweis);

 console.log("\nC · Anlegen: ein Schreibvorgang, die richtigen Felder");
 await grund(true);
 await page.evaluate(()=>$("angMassaufnahmenAbleiten").click());
 await page.waitForTimeout(350);
 // die unklare Position abwaehlen, bei einer anderen die Art von Hand aendern
 await page.evaluate(()=>{
  const h=$("angMeasBody").querySelector('[data-ang-meas-haken="3"]');
  h.checked=false;h.dispatchEvent(new Event("change",{bubbles:true}));
  const s=$("angMeasBody").querySelector('[data-ang-meas-art="0"]');
  s.value="rinne";s.dispatchEvent(new Event("change",{bubbles:true}));
 });
 await page.waitForTimeout(200);
 page.__dialoge=[];
 await page.evaluate(()=>$("angMeasAnlegen").click());
 await page.waitForTimeout(500);
 const c=await page.evaluate(()=>({log:window.__db.log.slice(),zu:$("angMeasModal").hidden}));
 p(c.log.length===1,"genau EIN Schreibvorgang fuer alle drei",c.log.map(x=>x.t));
 p(c.log[0]&&c.log[0].t==="measurements","und zwar auf measurements",c.log[0]&&c.log[0].t);
 const reihen=(c.log[0]||{}).d||[];
 p(Array.isArray(reihen)&&reihen.length===3,"drei Zeilen - die abgewaehlte fehlt",reihen.length);
 p(reihen.every(r=>r.project_id===7),"alle im richtigen Projekt",reihen.map(r=>r.project_id));
 p(reihen.map(r=>r.type).join()==="rinne,einlaufblech_konisch,kamineinfassung",
   "die von Hand geaenderte Art gilt, nicht der Vorschlag",reihen.map(r=>r.type));
 p(reihen[2].title==="Kamineinfassung Ost","der Titel kommt aus der Position",reihen[2].title);
 p(reihen.every(r=>JSON.stringify(r.data)==="{}"),
   "die Massaufnahme entsteht LEER - es wird nichts gerechnet",reihen.map(r=>r.data));
 p(reihen.every(r=>r.company_id===undefined),
   "keine company_id vom Client - die haengt am Projekt",Object.keys(reihen[0]));
 p(/Aus Offerte .Offerte Muster AG./.test(reihen[0].note)&&/Position 1\.1/.test(reihen[0].note),
   "die Notiz nennt Offerte und Positionsnummer",reihen[0].note);
 p(/24 m/.test(reihen[0].note)&&/Sch(ä|ae)tzung/.test(reihen[0].note),
   "und die Offerte-Menge ausdruecklich als Schaetzung",reihen[0].note);
 p(!/Menge/.test(reihen[2].note)||/1 Stk/.test(reihen[2].note),
   "bei Menge 1 steht sie schlicht dabei",reihen[2].note);
 p(c.zu,"der Dialog schliesst sich",c.zu);
 p((page.__dialoge||[]).some(t=>/3 Massaufnahmen/.test(t)&&/ohne Masse/.test(t)),
   "die Rueckmeldung sagt, wie viele - und dass sie noch leer sind",page.__dialoge);

 console.log("\nD · die Absagen");
 await grund(false);
 page.__dialoge=[];
 await page.evaluate(()=>$("angMassaufnahmenAbleiten").click());
 await page.waitForTimeout(250);
 p(await page.evaluate(()=>$("angMeasModal").hidden)===true,
   "ohne Projekt geht der Dialog gar nicht erst auf");
 p((page.__dialoge||[]).some(t=>/Projekt/.test(t)),"sondern sagt, was fehlt",page.__dialoge);
 await grund(true);
 await page.evaluate(()=>{angPositions=[];renderAngPositionsTable()});
 page.__dialoge=[];
 await page.evaluate(()=>$("angMassaufnahmenAbleiten").click());
 await page.waitForTimeout(250);
 p(await page.evaluate(()=>$("angMeasModal").hidden)===true,"ohne Positionen ebenfalls nicht");
 p((page.__dialoge||[]).some(t=>/keine Positionen/.test(t)),"mit demselben klaren Satz",page.__dialoge);
 // 0 geschriebene Zeilen sind KEIN Erfolg
 await grund(true);
 await page.evaluate(()=>{window.__db.insertLeer=true});
 await page.evaluate(()=>$("angMassaufnahmenAbleiten").click());
 await page.waitForTimeout(350);
 page.__dialoge=[];
 await page.evaluate(()=>$("angMeasAnlegen").click());
 await page.waitForTimeout(400);
 let f=await page.evaluate(()=>({zu:$("angMeasModal").hidden,
   fehler:$("angMeasFehler").hidden?"":$("angMeasFehler").textContent}));
 p(f.zu===false,"schreibt die Datenbank NICHTS, bleibt der Dialog offen",f);
 p(/nichts angelegt/i.test(f.fehler),"und sagt es - kein stiller Erfolg",f.fehler);
 p((page.__dialoge||[]).length===0,"und keine Erfolgsmeldung",page.__dialoge);
 // ein echter Fehler wird woertlich gezeigt
 await grund(true);
 await page.evaluate(()=>{window.__db.insertFehler="new row violates row-level security policy"});
 await page.evaluate(()=>$("angMassaufnahmenAbleiten").click());
 await page.waitForTimeout(350);
 await page.evaluate(()=>$("angMeasAnlegen").click());
 await page.waitForTimeout(400);
 f=await page.evaluate(()=>$("angMeasFehler").textContent);
 p(/row-level security/.test(f)&&/Berechtigung/.test(f),
   "ein Rechtefehler wird woertlich UND verstaendlich gezeigt",f);

 console.log("\nE · der Einzelweg je Position");
 await grund(true);
 const knoepfe=await page.evaluate(()=>
   $("angPositionsBody").querySelectorAll("[data-ang-meas]").length);
 p(knoepfe===4,"neben jeder Position steht der Knopf",knoepfe);
 await page.evaluate(()=>{window.__db.log=[];
   $("angPositionsBody").querySelector('[data-ang-meas="2"]').click()});
 await page.waitForTimeout(400);
 const e=await page.evaluate(()=>({
  formular:!$("measurementEditModal").hidden,
  offerteVerdeckt:$("angebotEditModal").hidden,
  typ:$("measType").value,
  titel:$("measTitle").value,
  notiz:$("measNote").value,
  projekt:measSelectedProjectId,
  zurueck:measEditReturnTo,
  geschrieben:window.__db.log.length
 }));
 p(e.formular,"das gewohnte Massaufnahme-Formular geht auf",e.formular);
 p(e.typ==="kamineinfassung","mit der vorgeschlagenen Art",e.typ);
 p(e.titel==="Kamineinfassung Ost","der Bezeichnung der Position",e.titel);
 p(/Aus Offerte/.test(e.notiz),"und der Herkunft in der Notiz",e.notiz);
 p(e.projekt===7,"im richtigen Projekt",e.projekt);
 p(e.geschrieben===0,"dabei wird NICHTS geschrieben - erst das Speichern legt an",e.geschrieben);
 p(e.offerteVerdeckt,"die Offerte ist verdeckt, nicht zurueckgesetzt",e.offerteVerdeckt);
 p(e.zurueck==="angebotEdit","und der Rueckweg fuehrt in dieselbe Offerte",e.zurueck);
 // Gegenprobe: der Rueckweg bringt die Offerte samt Positionen zurueck
 await page.evaluate(async()=>{$("measurementEditModal").hidden=true;await measEditZurueck()});
 await page.waitForTimeout(300);
 const zurueck=await page.evaluate(()=>({
   offen:!$("angebotEditModal").hidden,
   positionen:$("angPositionsBody").querySelectorAll("[data-ang-desc]").length,
   titel:$("angTitle").value}));
 p(zurueck.offen&&zurueck.positionen===4&&zurueck.titel==="Offerte Muster AG",
   "danach steht die Offerte unveraendert wieder da",zurueck);

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();

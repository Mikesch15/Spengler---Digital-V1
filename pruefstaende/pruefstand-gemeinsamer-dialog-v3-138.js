// Prueft den gemeinsamen Anlege-Dialog (v3.138).
//
// Gemeldet vom Anwender: "ich wuerde auch gerne in der materialverwaltung ein
// neues produkt anlegen koennen. Soll beides die gleiche funktion sein."
//
// Vorher waren es zwei Wege:
//   - Einstellungen -> Material: "＋ Material hinzufuegen" legte STUMM eine
//     leere Zeile an, die man danach in der Liste ausfuellen musste.
//   - Lagerverwaltung: ein vollstaendiger Dialog mit Bezeichnung, Einheit,
//     Preis und begruendetem Nummernvorschlag.
//
// Jetzt ist es EIN Dialog. Ein Schalter entscheidet, ob zur Katalogposition
// gleich ein Lager-Produkt (mit Barcode) entsteht: aus der Lagerverwaltung
// gesetzt, aus dem Katalog nicht - beides jederzeit umstellbar.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-gemeinsamer-dialog-v3-138.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1600}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:`window.__db={materials:[{id:1,edv_nr:"100.55",name:"CNS 1.4301",dim:"",unit:"Stk.",price:0}],log:[]};
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:(t)=>{const z={t};const q={};
  q.insert=d=>{z.op="insert";z.daten=d;return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  ["eq","order","limit","not","delete","update","upsert"].forEach(k=>{if(!q[k])q[k]=()=>q});
  const lauf=()=>{
   if(z.op==="insert"){window.__db.log.push({t,d:z.daten});
    if(t==="materials"){
     // Die ECHTE Eindeutigkeitsregel - sonst beweist der Lauf nichts.
     if(window.__db.materials.some(m=>m.edv_nr===z.daten.edv_nr))
      return {data:null,error:{message:'duplicate key value violates unique constraint "materials_edv_nr_key"'}};
     const m=Object.assign({id:window.__db.materials.length+1},z.daten);
     window.__db.materials.push(m); return {data:[m],error:null};}
    return {data:[Object.assign({id:99},z.daten)],error:null};}
   if(t==="materials")return {data:window.__db.materials,error:null};
   return {data:[],error:null}};
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g); return q}})};`}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 // Jeder Abschnitt startet mit demselben Stand - AUCH die Attrappen-
 // Datenbank. Ohne das schleppt ein Abschnitt die Nummern des vorigen mit,
 // die naechste freie Nummer kollidiert, und der Fehlschlag sieht aus wie
 // ein Fehler der App.
 const grund=()=>page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"A"};
  meineRechte={admin:true,kataloge:true,lager:true}; allProjects=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  settings.materials=[["100.55","CNS 1.4301","","Stk.",0]]; materialIds=[1];
  lagerVarianten=[]; window.__db.log=[];
  window.__db.materials=[{id:1,edv_nr:"100.55",name:"CNS 1.4301",dim:"",unit:"Stk.",price:0}];
 });
 await grund();
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const zustand=()=>page.evaluate(()=>({
   offen:!$("lagerNeuesProduktModal").hidden,
   titel:$("lagerNeuesProduktTitel").innerText.trim(),
   knopf:$("lagerNeuesProduktSpeichern").textContent.trim(),
   mitProdukt:$("lagerNeuesProduktMitProdukt").checked,
   bezeichnung:!$("lagerNeuesProduktBezeichnungFeld").hidden,
   positionSuche:!$("lagerNeuesProduktPositionFeld").hidden,
   barcode:!$("lagerNeuesProduktBarcodeFeld").hidden,
   neuePosition:!$("lagerNeuePositionBlock").hidden,
   nr:$("lagerNeuePositionNr").value}));
 const schalter=an=>page.evaluate(a=>{
   const c=$("lagerNeuesProduktMitProdukt"); c.checked=a; c.dispatchEvent(new Event("change"));
 },an);

 console.log("\nA · Es ist wirklich EIN Dialog");
 const eins=await page.evaluate(()=>({
   modal:!!$("lagerNeuesProduktModal"), schalter:!!$("lagerNeuesProduktMitProdukt"),
   fn:typeof lagerNeuesProduktOeffnen==="function"}));
 p(eins.modal&&eins.schalter&&eins.fn,"Dialog, Schalter und Oeffnen-Funktion sind da",eins);
 // Die eigentliche Zusicherung des Auftrags ("soll beides die gleiche
 // Funktion sein"): beide Wege oeffnen DASSELBE Fenster. Sie faellt durch,
 // sobald jemand daneben einen zweiten Anlege-Dialog baut.
 const ausKatalog=await page.evaluate(()=>{
   $("settingsModal").hidden=false; $("newMaterial").click();
   return Array.from(document.querySelectorAll(".modal")).filter(m=>!m.hidden).map(m=>m.id);
 });
 await page.waitForTimeout(300);
 const ausLager=await page.evaluate(()=>{
   lagerNeuesProduktSchliessen(); $("settingsModal").hidden=true;
   lagerNeuesProduktOeffnen(null,"");
   return Array.from(document.querySelectorAll(".modal")).filter(m=>!m.hidden).map(m=>m.id);
 });
 await page.waitForTimeout(300);
 p(ausKatalog.includes("lagerNeuesProduktModal")&&ausLager.includes("lagerNeuesProduktModal"),
   "beide Wege oeffnen DASSELBE Fenster",{ausKatalog,ausLager});
 await page.evaluate(()=>{lagerNeuesProduktSchliessen();window.__db.log=[]});

 console.log("\nB · Aus dem Material-Katalog: nur die Position");
 await page.evaluate(()=>{$("settingsModal").hidden=false;$("newMaterial").click()});
 await page.waitForTimeout(400);
 const a=await zustand();
 p(a.offen,"der Knopf oeffnet den gemeinsamen Dialog",a);
 // Gegenprobe auf v3.137 und frueher: dort legte der Knopf STUMM eine Zeile
 // an, ohne dass je ein Dialog erschien.
 const stumm=await page.evaluate(()=>window.__db.log.slice());
 p(stumm.length===0,
   "GEGENPROBE: es wird NICHTS stumm angelegt, bevor der Anwender bestaetigt",stumm);
 p(a.mitProdukt===false,"der Produkt-Schalter ist aus",a);
 p(!a.bezeichnung&&!a.barcode,"Produktfelder und Barcode bleiben weg",a);
 p(!a.positionSuche,"und die Positions-Suche auch - die Position entsteht ja gerade",a);
 p(a.neuePosition,"der Block fuer die neue Position steht offen",a);
 p(/^\d+\.\d\d$/.test(a.nr),"mit einer berechneten, freien Nummer",a.nr);
 p(/materialposition/i.test(a.titel),"der Titel sagt, worum es geht",a.titel);
 p(/position anlegen/i.test(a.knopf),"der Knopf ebenso",a.knopf);

 console.log("\nC · Derselbe Dialog, Schalter an: das volle Produkt-Formular");
 await schalter(true);
 const c=await zustand();
 p(c.bezeichnung&&c.barcode&&c.positionSuche,
   "Bezeichnung, Barcode und Positions-Suche kommen zurueck",c);
 p(/produkt/i.test(c.titel),"und der Titel wechselt mit",c.titel);
 p(c.nr===a.nr,"die schon gerechnete Nummer bleibt stehen",{vorher:a.nr,jetzt:c.nr});

 console.log("\nD · Nur Position speichern - ein Schreibvorgang, kein Produkt");
 await schalter(false);
 await page.evaluate(()=>{
  $("lagerNeuePositionName").value="Spezialschraube 6x60";
  $("lagerNeuePositionPreis").value="1.25";
 });
 await page.evaluate(()=>$("lagerNeuesProduktSpeichern").click());
 await page.waitForTimeout(600);
 const d=await page.evaluate(()=>({log:window.__db.log,
   offen:!$("lagerNeuesProduktModal").hidden,
   katalog:settings.materials.map(m=>String(m[0])+" "+String(m[1]))}));
 p(d.log.length===1&&d.log[0].t==="materials","genau EIN Schreibvorgang, auf materials",d.log);
 // Gegenprobe: ohne Schalter darf KEIN Lager-Produkt entstehen.
 p(!d.log.some(x=>x.t==="lager_varianten"),
   "GEGENPROBE: es entsteht KEIN Lager-Produkt",d.log.map(x=>x.t));
 p(d.log[0]&&d.log[0].d.name==="Spezialschraube 6x60"&&d.log[0].d.price===1.25,
   "Bezeichnung und Preis kommen aus dem Formular",d.log[0]&&d.log[0].d);
 p(d.log[0]&&d.log[0].d.company_id===undefined,
   "ohne company_id - die setzt die Datenbank",d.log[0]&&d.log[0].d);
 p(!d.offen,"der Dialog schliesst sich",d);
 p(d.katalog.some(x=>/Spezialschraube/.test(x)),
   "und die Position steht sofort im Katalog",d.katalog);

 console.log("\nE · Aus der Lagerverwaltung bleibt alles wie bisher");
 await page.evaluate(()=>{$("settingsModal").hidden=true;window.__db.log=[];
   lagerNeuesProduktOeffnen(null,"7612345678901")});
 await page.waitForTimeout(400);
 const e=await zustand();
 p(e.mitProdukt===true,"dort ist der Schalter gesetzt",e);
 p(e.bezeichnung&&e.barcode&&e.positionSuche,"das Produkt-Formular steht vollstaendig da",e);
 // Gegenprobe: der Weg der Lagerverwaltung darf sich NICHT in einen
 // reinen Positions-Dialog verwandelt haben.
 p(!e.neuePosition,
   "GEGENPROBE: der Neue-Position-Block ist zu - es wird zuerst gesucht",e);
 const bc=await page.evaluate(()=>$("lagerNeuesProduktBarcode").value);
 p(bc==="7612345678901","der gescannte Barcode steht im Feld",bc);

 console.log("\nF · Ohne Bezeichnung wird nichts angelegt");
 await page.evaluate(()=>{$("settingsModal").hidden=false;window.__db.log=[];$("newMaterial").click()});
 await page.waitForTimeout(400);
 await page.evaluate(()=>$("lagerNeuesProduktSpeichern").click());
 await page.waitForTimeout(400);
 const f=await page.evaluate(()=>({log:window.__db.log,
   fehler:$("lagerNeuesProduktFehler").textContent.trim(),
   fehlerSichtbar:!$("lagerNeuesProduktFehler").hidden,
   offen:!$("lagerNeuesProduktModal").hidden}));
 p(f.log.length===0,"GEGENPROBE: ohne Bezeichnung wird nichts geschrieben",f.log);
 p(f.fehlerSichtbar&&/Bezeichnung/.test(f.fehler),"und es steht da, was fehlt",f.fehler);
 p(f.offen,"der Dialog bleibt offen, damit man es nachtragen kann",f);

 console.log("\nG · v3.139: die Bezeichnung gibt es genau EINMAL");
 // Gemeldet: "Wenn auch Lagerprodukt angelegt wird braucht es nicht nochmal
 // eine zusaetzliche Bezeichnung." Bis v3.138 standen zwei Felder da - eines
 // fuers Produkt, eines fuer die Position - und die Position bekam ihren
 // Wert aus dem Produkt kopiert. Zweimal dasselbe zu tippen ist unnoetig.
 await grund();
 await page.evaluate(()=>{$("settingsModal").hidden=true;lagerNeuesProduktOeffnen(null,"");
   lagerNeuesProduktArtikel=null;lagerNeuesProduktNeuePosition=true;
   lagerNeuesProduktMaterialRendern();lagerNeuesProduktModusRendern();});
 await page.waitForTimeout(300);
 const g1=await page.evaluate(()=>({
   produktBez:!$("lagerNeuesProduktBezeichnungFeld").hidden,
   positionBez:!$("lagerNeuePositionNameFeld").hidden,
   hinweis:!$("lagerNeuePositionNameHinweis").hidden}));
 p(g1.produktBez,"mit Produkt steht die Bezeichnung des Produkts da",g1);
 p(!g1.positionBez,
   "GEGENPROBE: das zweite Bezeichnungsfeld der Position ist WEG",g1);
 p(g1.hinweis,"und es steht da, dass sie auch fuer die Position gilt",g1);
 // Sie muss auch wirklich ankommen: gespeichert wird EINE Bezeichnung.
 await page.evaluate(()=>{window.__db.log=[];
   $("lagerNeuesProduktBezeichnung").value="Rinnenstutzen 120mm";
   $("lagerNeuesProduktBezeichnung").dispatchEvent(new Event("input"));});
 await page.waitForTimeout(300);
 const nr=await page.evaluate(()=>$("lagerNeuePositionNr").value);
 await page.evaluate(()=>$("lagerNeuesProduktSpeichern").click());
 await page.waitForTimeout(600);
 const g2=await page.evaluate(()=>window.__db.log.slice());
 const pos=g2.find(x=>x.t==="materials"), prod=g2.find(x=>x.t==="lager_varianten");
 p(g2.length===2,
   "es entstehen zwei Datensaetze - Position und Produkt",g2.map(x=>x.t));
 p(pos&&pos.d.name==="Rinnenstutzen 120mm",
   "die Position bekommt die Bezeichnung des Produkts",pos&&pos.d);
 p(prod&&prod.d.bezeichnung==="Rinnenstutzen 120mm",
   "und das Produkt dieselbe - EINE Eingabe, zwei Datensaetze",prod&&prod.d);
 // Gegenprobe: ohne Produkt muss das Feld wieder da sein, sonst koennte man
 // eine reine Position gar nicht benennen.
 await page.evaluate(()=>{const c=$("lagerNeuesProduktMitProdukt");
   if(!$("lagerNeuesProduktModal").hidden===false)lagerNeuesProduktOeffnen(null,"",{nurPosition:true});
   c.checked=false;c.dispatchEvent(new Event("change"));});
 await page.waitForTimeout(300);
 const g3=await page.evaluate(()=>({positionBez:!$("lagerNeuePositionNameFeld").hidden}));
 p(g3.positionBez,
   "GEGENPROBE: ohne Produkt ist das Feld der Position wieder da",g3);

 console.log("\nH · v3.139: die Nummer folgt der Bezeichnung in die richtige Gruppe");
 // Das ist die Stelle, nach der der Anwender gefragt hat ("wo wird die
 // intelligente edv nummer vergabe gemacht?"). Sie sitzt NICHT im
 // Katalog-Knopf, sondern haengt an der Bezeichnung: jedes getippte Zeichen
 // bewertet die Katalogruppen neu (v3.126).
 await grund();
 await page.evaluate(()=>{
  settings.materials=[["203.12","Rinnenstutzen 100mm","","Stk",11.0],
    ["826.10","Spenglerschraube 4.5x35","","Stk",0.45]];
  materialIds=[1,2];
  $("settingsModal").hidden=true; lagerNeuesProduktOeffnen(null,"");
  lagerNeuesProduktArtikel=null; lagerNeuesProduktNeuePosition=true;
  lagerNeuesProduktMaterialRendern(); lagerNeuesProduktModusRendern();
 });
 await page.waitForTimeout(300);
 const nummerFuer=async w=>{
  await page.evaluate(v=>{const f=$("lagerNeuesProduktBezeichnung");
    f.value=v; f.dispatchEvent(new Event("input"));},w);
  await page.waitForTimeout(250);
  return page.evaluate(()=>({nr:$("lagerNeuePositionNr").value,
    hinweis:$("lagerNeuePositionHinweis").innerText.replace(/\s+/g," ").trim()}));
 };
 const h1=await nummerFuer("Rinnenstutzen 120mm");
 p(/^203\./.test(h1.nr),"„Rinnenstutzen\" landet in der Rinnen-Gruppe 203",h1);
 p(/203/.test(h1.hinweis)&&/Rinnenstutzen 100mm/.test(h1.hinweis),
   "und die App sagt, WARUM",h1.hinweis);
 const h2=await nummerFuer("Spenglerschrauben 5x50");
 p(/^826\./.test(h2.nr),"„Spenglerschrauben\" in die Schrauben-Gruppe 826",h2);
 // Gegenprobe: ohne die Bewertung waere die Nummer immer dieselbe.
 p(h1.nr!==h2.nr,
   "GEGENPROBE: die Nummer haengt wirklich an der Bezeichnung",{h1:h1.nr,h2:h2.nr});
 const h3=await nummerFuer("Gartenschlauch 20m");
 p(/^999\./.test(h3.nr),
   "was in keine Gruppe passt, bekommt den eigenen Lager-Kreis 999",h3);
 p(/[Kk]eine passende Gruppe/.test(h3.hinweis),
   "GEGENPROBE: und die App behauptet dann KEINE Gruppe",h3.hinweis);

 console.log("\nI · v3.141: die getroffene Wahl und der Rueckweg sind benannt");
 // Gemeldet als Frage: "Fuer was ist der button unter der liste 'neue
 // materialposition anlegen' und fuer was ist der button aendern?" - dass
 // sie gestellt werden musste, war der Befund. "ändern" klang nach "diese
 // Position bearbeiten", gemeint war "eine andere waehlen"; und der blosse
 // Name sagte nicht, dass er die getroffene Wahl anzeigt.
 await grund();
 await page.evaluate(()=>{
  settings.materials=[["100.06","Stahlblech svz","1.50","m2",1]]; materialIds=[1];
  $("settingsModal").hidden=true; lagerNeuesProduktOeffnen(null,"");
 });
 await page.waitForTimeout(300);
 const wahl=()=>page.evaluate(()=>({
   text:$("lagerNeuesProduktGewaehlt").innerText.replace(/\s+/g," ").trim(),
   zu:$("lagerNeuesProduktGewaehlt").hidden,
   listeAuf:!$("lagerNeuesProduktTreffer").hidden}));
 // a) bestehende Position
 await page.evaluate(()=>$("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-artikel]").click());
 await page.waitForTimeout(300);
 const i1=await wahl();
 p(/^Gewählt:/.test(i1.text),"die Zeile sagt, dass es die getroffene Wahl ist",i1.text);
 p(/100\.06/.test(i1.text),"und welche",i1.text);
 p(/andere wählen/.test(i1.text),"der Knopf sagt, was er tut",i1.text);
 // Gegenprobe auf den gemeldeten Wortlaut.
 p(!/ändern/.test(i1.text),
   'GEGENPROBE: er heisst NICHT mehr „aendern“ - das klang nach bearbeiten',i1.text);
 p(i1.listeAuf===false,
   'GEGENPROBE: nach der Wahl ist die Trefferliste zu - nicht beides gleichzeitig',i1);
 // b) der Rueckweg fuehrt wirklich zurueck
 await page.evaluate(()=>$("lagerNeuesProduktGewaehlt").querySelector("[data-lager-produkt-aendern]").click());
 await page.waitForTimeout(300);
 const i2=await wahl();
 p(i2.zu===true&&i2.listeAuf===true,
   '„andere waehlen“ oeffnet die Liste wieder und nimmt die Wahl zurueck',i2);
 // c) dasselbe fuer "neue Position"
 await page.evaluate(()=>$("lagerNeuesProduktTreffer").querySelector("[data-lager-produkt-neu]").click());
 await page.waitForTimeout(300);
 const i3=await wahl();
 p(/^Gewählt:/.test(i3.text)&&/neue Position anlegen/.test(i3.text),
   'auch „neue Position anlegen“ steht als Wahl da, nicht als blosser Name',i3.text);
 p(i3.listeAuf===false,
   'GEGENPROBE: und auch hier ist die Liste zu',i3);

 console.log("\nJ · v3.148: die Position darf anders heissen als das Produkt");
 // Seit v3.139 gibt es EINE Bezeichnung fuer beide (Abschnitt G) - richtig
 // fuer den haeufigen Fall, aber bis hierher die einzige Moeglichkeit. Wer
 // die Katalogposition allgemein halten will und das Produkt genau
 // bezeichnen, konnte das beim Anlegen nicht.
 await grund();
 const jOeffnen=async()=>{
  await page.evaluate(()=>{$("settingsModal").hidden=true;lagerNeuesProduktOeffnen(null,"");
    lagerNeuesProduktArtikel=null;lagerNeuesProduktNeuePosition=true;
    lagerNeuesProduktMaterialRendern();lagerNeuesProduktModusRendern();});
  await page.waitForTimeout(300);
 };
 const jStand=()=>page.evaluate(()=>({
   positionFeld:!$("lagerNeuePositionNameFeld").hidden,
   gleichHinweis:!$("lagerNeuePositionNameHinweis").hidden,
   eigenHinweis:!$("lagerNeuePositionNameEigenHinweis").hidden,
   knopfTrennen:!!$("lagerPositionNameEigen"),
   knopfZurueck:!!$("lagerPositionNameGleich"),
   wert:$("lagerNeuePositionName").value}));
 await jOeffnen();
 let j=await jStand();
 p(j.positionFeld===false&&j.gleichHinweis===true&&j.eigenHinweis===false,
   "voreingestellt bleibt es bei EINER Bezeichnung - wie seit v3.139",j);
 p(j.knopfTrennen,"aber es steht ein Knopf da, um die Position anders zu benennen",j);
 // Bezeichnung des Produkts eingeben, dann trennen
 await page.evaluate(()=>{
   $("lagerNeuesProduktBezeichnung").value="Stahlblech svz 0.6 x 670 Rolle";
   $("lagerNeuesProduktBezeichnung").dispatchEvent(new Event("input"));});
 await page.waitForTimeout(250);
 await page.evaluate(()=>$("lagerPositionNameEigen").click());
 await page.waitForTimeout(250);
 j=await jStand();
 p(j.positionFeld===true,"nach dem Tippen ist das Feld der Position da",j);
 p(j.wert==="Stahlblech svz 0.6 x 670 Rolle",
   "vorbelegt mit der Bezeichnung des Produkts - kein leeres Feld",j.wert);
 p(j.eigenHinweis===true&&j.gleichHinweis===false,
   "und es steht da, dass die Position jetzt eigen benannt ist",j);
 p(j.knopfZurueck,"samt Rueckweg",j);
 // Jetzt wirklich unterschiedlich benennen und speichern
 await page.evaluate(()=>{window.__db.log=[];
   $("lagerNeuePositionName").value="Stahlblech svz";
   $("lagerNeuePositionName").dispatchEvent(new Event("input"));});
 await page.waitForTimeout(250);
 await page.evaluate(()=>$("lagerNeuesProduktSpeichern").click());
 await page.waitForTimeout(600);
 let jlog=await page.evaluate(()=>window.__db.log.slice());
 let jpos=jlog.find(x=>x.t==="materials"), jprod=jlog.find(x=>x.t==="lager_varianten");
 p(jlog.length===2,"es entstehen weiterhin genau zwei Datensaetze",jlog.map(x=>x.t));
 p(jpos&&jpos.d.name==="Stahlblech svz",
   "die Position traegt ihren EIGENEN Namen",jpos&&jpos.d);
 p(jprod&&jprod.d.bezeichnung==="Stahlblech svz 0.6 x 670 Rolle",
   "das Produkt seinen genauen - die beiden sind getrennt",jprod&&jprod.d);

 // GEGENPROBE 1: der Rueckweg legt sie wieder zusammen
 await grund();
 await jOeffnen();
 await page.evaluate(()=>{
   $("lagerNeuesProduktBezeichnung").value="Rinnenhaken verzinkt";
   $("lagerNeuesProduktBezeichnung").dispatchEvent(new Event("input"));});
 await page.waitForTimeout(250);
 await page.evaluate(()=>$("lagerPositionNameEigen").click());
 await page.waitForTimeout(200);
 await page.evaluate(()=>{$("lagerNeuePositionName").value="Etwas ganz anderes"});
 await page.evaluate(()=>$("lagerPositionNameGleich").click());
 await page.waitForTimeout(250);
 j=await jStand();
 p(j.positionFeld===false&&j.gleichHinweis===true,
   "GEGENPROBE: der Rueckweg blendet das Feld wieder aus",j);
 p(j.wert==="","und leert es - sonst wuerde der verworfene Name still gespeichert",j.wert);
 await page.evaluate(()=>{window.__db.log=[];$("lagerNeuesProduktSpeichern").click()});
 await page.waitForTimeout(600);
 jlog=await page.evaluate(()=>window.__db.log.slice());
 jpos=jlog.find(x=>x.t==="materials");
 p(jpos&&jpos.d.name==="Rinnenhaken verzinkt",
   "GEGENPROBE: gespeichert wird dann wieder die Bezeichnung des Produkts",jpos&&jpos.d);

 // GEGENPROBE 2: der Zustand haelt nicht ueber den Dialog hinaus
 await grund();
 await jOeffnen();
 await page.evaluate(()=>$("lagerPositionNameEigen").click());
 await page.waitForTimeout(200);
 await jOeffnen();
 j=await jStand();
 p(j.positionFeld===false&&j.gleichHinweis===true,
   "GEGENPROBE: der naechste Dialog faengt wieder mit EINER Bezeichnung an",j);

 // GEGENPROBE 3: ohne Produkt aendert sich gar nichts - dort gibt es nur die
 // Position, und ein Knopf zum Trennen waere sinnlos.
 await schalter(false);
 j=await jStand();
 p(j.positionFeld===true&&j.gleichHinweis===false&&j.eigenHinweis===false,
   "GEGENPROBE: ohne Produkt steht schlicht das Feld der Position da",j);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();

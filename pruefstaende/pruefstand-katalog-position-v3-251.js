// Prueft den Dialog "Neue Materialposition anlegen" (v3.251).
//
// HERKUNFT - und warum das kein Neuanfang ist:
// Dieser Pruefstand ist der Nachfolger von zwei Pruefstaenden, die mit der
// abgeschafften Lagerverwaltung gegangen sind:
//
//   pruefstand-gemeinsamer-dialog-v3-138.js (68 Pruefungen)
//     Hielt einen Dialog fest, der ZWEI Dinge anlegte: eine Katalogposition
//     UND ein Lager-Produkt mit Barcode. Ein Schalter entschied, welches.
//     Das Produkt gibt es nicht mehr. Die Zusicherungen zur POSITION sind
//     hierher uebernommen - Abschnitt fuer Abschnitt, nicht abgeschwaecht:
//       A/B -> hier A   (der Knopf oeffnet einen Dialog, legt nichts stumm an)
//       D   -> hier C   (genau EIN Schreibvorgang, auf materials)
//       F   -> hier D   (ohne Bezeichnung wird nichts angelegt)
//       H   -> hier B   (die Nummer folgt der Bezeichnung in ihre Gruppe)
//     Weggefallen sind C, E, G, I, J - sie pruefen den Schalter, das
//     Barcode-Feld, die Positions-Suche und das Trennen der beiden
//     Bezeichnungen. Alles Zusagen ueber das Produkt-Formular.
//
//   pruefstand-position-vorschlag-v3-136.js
//     Hielt fest, dass die Bezeichnung passende BESTEHENDE Positionen
//     zuoberst in die Trefferliste des Produkt-Dialogs fuehrt. Die Liste ist
//     mit dem Dialog gegangen; die BEWERTUNG dahinter ist geblieben und
//     treibt weiterhin den Nummernvorschlag. Sie wird hier in Abschnitt E
//     auf der Ebene geprueft, auf der sie jetzt lebt - an der Funktion
//     selbst, mit derselben Rangfolge-Zusicherung.
//
// Abschnitt F ist neu und haelt fest, was NICHT zurueckkommen darf: das
// stumme Anlegen einer leeren Zeile (der gemeldete Fehler vor v3.138) und
// ein zweiter Anlege-Dialog daneben.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-katalog-position-v3-251.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1600}});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",
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
  window.__db.log=[];
  window.__db.materials=[{id:1,edv_nr:"100.55",name:"CNS 1.4301",dim:"",unit:"Stk.",price:0}];
 });
 await grund();
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 const zustand=()=>page.evaluate(()=>({
   offen:!$("katalogPositionModal").hidden,
   titel:$("lagerNeuesProduktTitel").innerText.trim(),
   knopf:$("lagerNeuesProduktSpeichern").textContent.trim(),
   nr:$("lagerNeuePositionNr").value,
   name:$("lagerNeuePositionName").value,
   einheit:$("lagerNeuePositionEinheit").value}));

 console.log("\nA · Der Knopf im Material-Katalog oeffnet den Dialog");
 const da=await page.evaluate(()=>({
   modal:!!$("katalogPositionModal"),
   fn:typeof katalogPositionOeffnen==="function",
   zu:typeof katalogPositionSchliessen==="function"}));
 p(da.modal&&da.fn&&da.zu,"Dialog, Oeffnen- und Schliessen-Funktion sind da",da);
 await page.evaluate(()=>{$("settingsModal").hidden=false;$("newMaterial").click()});
 await page.waitForTimeout(400);
 const a=await zustand();
 p(a.offen,"der Knopf oeffnet ihn",a);
 // Gegenprobe auf v3.137 und frueher: dort legte der Knopf STUMM eine Zeile
 // an, ohne dass je ein Dialog erschien.
 const stumm=await page.evaluate(()=>window.__db.log.slice());
 p(stumm.length===0,
   "GEGENPROBE: es wird NICHTS stumm angelegt, bevor der Anwender bestaetigt",stumm);
 p(/^\d+\.\d\d$/.test(a.nr),"mit einer berechneten, freien Nummer",a.nr);
 p(a.einheit==="Stk.","die Einheit ist vorbelegt",a.einheit);
 p(a.name==="","die Bezeichnung nicht - die gehoert dem Anwender",a.name);
 p(/materialposition/i.test(a.titel),"der Titel sagt, worum es geht",a.titel);
 p(/position anlegen/i.test(a.knopf),"der Knopf ebenso",a.knopf);
 // Gegenprobe: der Titel darf nicht mehr von einem Produkt sprechen - das
 // waere eine Zusage, die die App nicht mehr einhaelt.
 p(!/produkt/i.test(a.titel)&&!/produkt/i.test(a.knopf),
   "GEGENPROBE: und keines von beiden spricht noch von einem Produkt",
   {titel:a.titel,knopf:a.knopf});

 console.log("\nB · Die Nummer folgt der Bezeichnung in die richtige Gruppe");
 // Das ist die Stelle, nach der der Anwender gefragt hat ("wo wird die
 // intelligente edv nummer vergabe gemacht?"). Sie sitzt NICHT im
 // Katalog-Knopf, sondern haengt an der Bezeichnung: jedes getippte Zeichen
 // bewertet die Katalogruppen neu (v3.126).
 await grund();
 await page.evaluate(()=>{
  settings.materials=[["203.12","Rinnenstutzen 100mm","","Stk",11.0],
    ["826.10","Spenglerschraube 4.5x35","","Stk",0.45]];
  materialIds=[1,2];
  $("settingsModal").hidden=true; katalogPositionOeffnen();
 });
 await page.waitForTimeout(300);
 const nummerFuer=async w=>{
  await page.evaluate(v=>{const f=$("lagerNeuePositionName");
    f.value=v; f.dispatchEvent(new Event("input"));},w);
  await page.waitForTimeout(250);
  return page.evaluate(()=>({nr:$("lagerNeuePositionNr").value,
    hinweis:$("lagerNeuePositionHinweis").innerText.replace(/\s+/g," ").trim()}));
 };
 const h1=await nummerFuer("Rinnenstutzen 120mm");
 p(/^203\./.test(h1.nr),"„Rinnenstutzen“ landet in der Rinnen-Gruppe 203",h1);
 p(/203/.test(h1.hinweis)&&/Rinnenstutzen 100mm/.test(h1.hinweis),
   "und die App sagt, WARUM",h1.hinweis);
 const h2=await nummerFuer("Spenglerschrauben 5x50");
 p(/^826\./.test(h2.nr),"„Spenglerschrauben“ in die Schrauben-Gruppe 826",h2);
 // Gegenprobe: ohne die Bewertung waere die Nummer immer dieselbe.
 p(h1.nr!==h2.nr,
   "GEGENPROBE: die Nummer haengt wirklich an der Bezeichnung",{h1:h1.nr,h2:h2.nr});
 const h3=await nummerFuer("Gartenschlauch 20m");
 p(/^999\./.test(h3.nr),
   "was in keine Gruppe passt, bekommt den eigenen Nummernkreis 999",h3);
 p(/[Kk]eine passende Gruppe/.test(h3.hinweis),
   "GEGENPROBE: und die App behauptet dann KEINE Gruppe",h3.hinweis);
 // v3.126: eine von Hand gesetzte Nummer gehoert dem Anwender. Ohne das
 // wuerde jedes weitere Zeichen in der Bezeichnung seine Eingabe
 // ueberschreiben.
 await page.evaluate(()=>{const f=$("lagerNeuePositionNr");
   f.value="555.01"; f.dispatchEvent(new Event("input"));});
 const h4=await nummerFuer("Rinnenstutzen 140mm");
 p(h4.nr==="555.01",
   "eine von Hand getippte Nummer bleibt stehen",h4.nr);

 console.log("\nC · Speichern - genau EIN Schreibvorgang, auf materials");
 await grund();
 await page.evaluate(()=>{$("settingsModal").hidden=false;$("newMaterial").click()});
 await page.waitForTimeout(400);
 await page.evaluate(()=>{
  $("lagerNeuePositionName").value="Spezialschraube 6x60";
  $("lagerNeuePositionPreis").value="1.25";
 });
 await page.evaluate(()=>$("lagerNeuesProduktSpeichern").click());
 await page.waitForTimeout(600);
 const c=await page.evaluate(()=>({log:window.__db.log,
   offen:!$("katalogPositionModal").hidden,
   katalog:settings.materials.map(m=>String(m[0])+" "+String(m[1]))}));
 p(c.log.length===1&&c.log[0].t==="materials","genau EIN Schreibvorgang, auf materials",c.log);
 // Gegenprobe auf v3.250: dort konnte derselbe Knopf zusaetzlich ein
 // Lager-Produkt anlegen. Die Tabellen der alten Lagerverwaltung werden
 // nicht mehr angefasst - auch nicht versehentlich.
 p(!c.log.some(x=>x.t==="lager_varianten"||x.t==="lagerbestand"
                 ||x.t==="lagerbestand_bewegungen"),
   "GEGENPROBE: keine Tabelle der alten Lagerverwaltung wird beschrieben",
   c.log.map(x=>x.t));
 p(c.log[0]&&c.log[0].d.name==="Spezialschraube 6x60"&&c.log[0].d.price===1.25,
   "Bezeichnung und Preis kommen aus dem Formular",c.log[0]&&c.log[0].d);
 p(c.log[0]&&c.log[0].d.company_id===undefined,
   "ohne company_id - die setzt die Datenbank",c.log[0]&&c.log[0].d);
 p(!c.offen,"der Dialog schliesst sich",c);
 p(c.katalog.some(x=>/Spezialschraube/.test(x)),
   "und die Position steht sofort im Katalog",c.katalog);

 console.log("\nD · Ohne Bezeichnung wird nichts angelegt");
 await grund();
 await page.evaluate(()=>{$("settingsModal").hidden=false;window.__db.log=[];$("newMaterial").click()});
 await page.waitForTimeout(400);
 await page.evaluate(()=>{$("lagerNeuePositionName").value="";
   $("lagerNeuesProduktSpeichern").click()});
 await page.waitForTimeout(400);
 const d=await page.evaluate(()=>({log:window.__db.log,
   fehler:$("lagerNeuesProduktFehler").textContent.trim(),
   fehlerSichtbar:!$("lagerNeuesProduktFehler").hidden,
   offen:!$("katalogPositionModal").hidden}));
 p(d.log.length===0,"GEGENPROBE: ohne Bezeichnung wird nichts geschrieben",d.log);
 p(d.fehlerSichtbar&&/Bezeichnung/.test(d.fehler),"und es steht da, was fehlt",d.fehler);
 p(d.offen,"der Dialog bleibt offen, damit man es nachtragen kann",d);
 // Und eine schon vergebene Nummer wird abgewiesen, BEVOR geschrieben wird.
 await page.evaluate(()=>{window.__db.log=[];
   $("lagerNeuePositionName").value="Noch eine CNS";
   const f=$("lagerNeuePositionNr"); f.value="100.55"; f.dispatchEvent(new Event("input"));
   $("lagerNeuesProduktSpeichern").click()});
 await page.waitForTimeout(500);
 const d2=await page.evaluate(()=>({log:window.__db.log,
   fehler:$("lagerNeuesProduktFehler").textContent.trim()}));
 p(d2.log.length===0,
   "eine schon vergebene EDV-Nr. wird abgewiesen, bevor etwas geschrieben wird",d2.log);
 p(/100\.55/.test(d2.fehler)&&/gibt es bereits/.test(d2.fehler),
   "und die Meldung nennt die Nummer",d2.fehler);
 p(!/duplicate key value violates/.test(d2.fehler),
   "GEGENPROBE: NICHT als rohen Datenbanktext",d2.fehler);

 console.log("\nE · Die Bewertung dahinter (aus pruefstand-position-vorschlag-v3-136)");
 // Der gemeldete Fehler damals: eine passende BESTEHENDE Position wurde nie
 // vorgeschlagen, die Liste war der ungeordnete Katalog. Die Liste ist mit
 // dem Produkt-Dialog gegangen - die Bewertung, die sie geordnet hat, nicht.
 // Sie wird hier an der Funktion selbst gemessen, mit derselben Rangfolge.
 await grund();
 await page.evaluate(()=>{
  // Zwei sehr aehnliche Positionen (712.40/712.41), damit der "unsicher"-Fall
  // wirklich vorkommt und nicht nur behauptet wird.
  settings.materials=[
   ["712.40","Spenglerschraube 4.5x35 Chromnickelstahl","","Stk",0.45],
   ["712.41","Spenglerschraube 4.5x45 Chromnickelstahl","","Stk",0.52],
   ["252.10","Rohrbogen 72° Kupfer","","Stk",12.0],
   ["101.10","Titanzink Band 0.7","","m2",42.5],
   ["333.20","Rinnenhalter verzinkt","","Stk",3.2],
   ["444.10","Dichtungsband EPDM","","m",2.1]];
  materialIds=[1,2,3,4,5,6];
 });
 const e0=await page.evaluate(()=>({
   fn:typeof lagerPositionenVorschlag==="function",
   punkte:typeof lagerZeilePunkte==="function",
   schwelle:typeof LAGER_GRUPPE_MIN!=="undefined"?LAGER_GRUPPE_MIN:null}));
 p(e0.fn,"lagerPositionenVorschlag ist vorhanden",e0);
 // Eine Quelle: dieselbe Bewertung und dieselbe Schwelle wie der
 // Nummernvorschlag - kein zweites, parallel gepflegtes Mass.
 p(e0.punkte&&e0.schwelle===2.5,"sie nutzt die bestehende Bewertung und Schwelle",e0);
 const rang=w=>page.evaluate(v=>lagerPositionenVorschlag(v)
   .map(x=>String(x.artikel.edv_nr)),w);
 const e1=await rang("Spenglerschrauben 4.5x35 CrNi");
 p(e1[0]==="712.40"&&e1[1]==="712.41",
   "die beiden Schrauben-Positionen stehen an erster und zweiter Stelle",e1);
 // Gegenprobe auf den Zustand vor v3.136: dort stand 712.40 vorne, WEIL es
 // die erste Katalogzeile ist - nicht weil es passt. Der Beweis ist deshalb
 // eine Bezeichnung, bei der eine SPAETERE Zeile gewinnt.
 const e2=await rang("Rinnenhalter verzinkt gross");
 p(e2[0]==="333.20",
   "GEGENPROBE: bei „Rinnenhalter“ gewinnt die fuenfte Katalogzeile, nicht die erste",e2);
 const e3=await rang("Kaffeemaschine Vollautomat");
 p(e3.length===0,
   "was nicht im Katalog steht, bringt KEINEN Vorschlag - nicht einen schlechten",e3);
 // Und die Bewertung entscheidet nichts von selbst: sie liefert eine
 // Rangfolge, kein Ergebnis. Hoechstens drei, damit niemand eine Liste
 // durchsucht, die nichts mehr aussagt.
 const e4=await rang("Spenglerschraube");
 p(e4.length<=3,"es werden hoechstens drei vorgeschlagen",e4);

 console.log("\nF · Was nicht zurueckkommen darf");
 // (1) Kein zweiter Anlege-Dialog daneben. Die Zusicherung des Auftrags von
 // v3.138 ("soll beides die gleiche funktion sein") gilt weiter - sie faellt
 // durch, sobald jemand neben diesem Dialog einen zweiten baut.
 await grund();
 const offene=await page.evaluate(()=>{
   $("settingsModal").hidden=false; $("newMaterial").click();
   return Array.from(document.querySelectorAll(".modal")).filter(m=>!m.hidden).map(m=>m.id);
 });
 await page.waitForTimeout(300);
 p(offene.filter(id=>/position|produkt/i.test(id)).length===1
   &&offene.includes("katalogPositionModal"),
   "genau EIN Anlege-Dialog geht auf",offene);
 // (2) Die Felder und Funktionen des Produkt-Formulars sind wirklich weg -
 // ein stehengelassenes Feld waere ein Versprechen, das nichts mehr haelt.
 const weg=await page.evaluate(()=>({
   schalter:!!$("lagerNeuesProduktMitProdukt"),
   barcode:!!$("lagerNeuesProduktBarcodeFeld"),
   suche:!!$("lagerNeuesProduktMaterialSuche"),
   treffer:!!$("lagerNeuesProduktTreffer"),
   altesModal:!!$("lagerNeuesProduktModal"),
   altFn:typeof lagerNeuesProduktOeffnen==="function",
   altRender:typeof renderLagerverwaltung==="function"}));
 p(!weg.schalter&&!weg.barcode&&!weg.suche&&!weg.treffer,
   "GEGENPROBE: Schalter, Barcode-Feld, Positions-Suche und Trefferliste sind weg",weg);
 p(!weg.altesModal&&!weg.altFn&&!weg.altRender,
   "GEGENPROBE: und das alte Fenster samt seinen Funktionen ebenso",weg);
 // (3) Der Nummernvorschlag haengt nicht mehr an der alten Lagerverwaltung.
 const quelle=await page.evaluate(()=>String(lagerNaechsteFreieEdvNr));
 p(/lagArtikelListe/.test(quelle),
   "die Nummer wird aus dem Katalog gerechnet (lagArtikelListe, js/59)",
   quelle.slice(0,120));

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();

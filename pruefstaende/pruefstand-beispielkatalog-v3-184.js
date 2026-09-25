// Prueft v3.184: Beispiel-Katalog fuer neue Firmen und seine Selbstaufloesung.
//
// GEWUENSCHT (nach Rueckfrage entschieden)
// "Aber mit einem kleinen beispiel materialkatalog (dieser soll aber
//  geloescht werden sobald die erste eigene position oder excel erfasst wird"
// und zur benutzten Beispielposition:
// "Behalte sie und nimm nur den Beispiel-Stempel weg, frag aber den
//  firmenadmin in so einem fall, was damit geschehen soll... es soll die
//  moeglichkeit geben diese positionen zu loeschen, alles so zu behalten und
//  die positionen durch andere (neu erfasste) positionen zu ersetzen"
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-beispielkatalog-v3-184.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");
const nurCode=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"")
                  .replace(/"(\\.|[^"\\])*"/g,'""').replace(/'(\\.|[^'\\])*'/g,"''")
                  .replace(/`(\\.|[^`\\])*`/g,"``");

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:1400},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 // Eine frische Firma: NUR Beispiel-Positionen, sonst nichts Eigenes.
 await page.evaluate(()=>{
  window.__frisch=function(){
   currentProfile={id:"u1",role:"admin",company_id:"c1"};
   meineRechte={admin:true,kataloge:true,lager:true};
   companyName="Neue AG"; companyAddress="Weg 1"; logoUrl="";
   settings.rates=[["Spengler",95]];
   settings.materials=[
    ["101.01","Kupferblech blank (Beispiel)","0.6","m²",0],
    ["101.02","Titanzink vorbewittert (Beispiel)","0.7","m²",0],
    ["301.01","Rinnenhalter (Beispiel)","3x25","Stk.",0]];
   materialIds=[901,902,903];
   materialWerkstoffe=[3,2,null];
   materialFormate=[
    {staerke_mm:0.6,ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null},
    {staerke_mm:0.7,ausfuehrung:"vorbewittert",form:"rolle",laenge_mm:null,breite_mm:null},
    {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null}];
   materialDemo=[true,true,true];
   measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
   rinneFittingTypes=[{id:1,name:"Offenes Ende"}];
   blitzschutzMaterials=[];
   blechRollenbreiten=[1000,670,330,250];
   allProfiles=[{id:"u1",first_name:"A",last_name:"B",role:"admin"},
                {id:"u2",first_name:"C",last_name:"D",role:"employee"}];
  };
  // ---- Der sb-Ersatz -----------------------------------------------------
  // Er ANTWORTET nicht nur, er schreibt mit: welche Ids gestempelt, welche
  // geloescht und in WELCHER REIHENFOLGE das geschah. Die Reihenfolge ist
  // die eigentliche Zusicherung beim Ersetzen - erst umhaengen, dann
  // loeschen. Ein Ersatz, der nur "hat funktioniert" sagt, koennte das
  // nicht belegen.
  window.__NR={901:"101.01",902:"101.02",903:"301.01",500:"201.01"};
  window.__stubSb=function(spur,verwendung){
   spur.reihenfolge=spur.reihenfolge||[];
   spur.umgehaengt=spur.umgehaengt||[];
   spur.gestempelt=spur.gestempelt||[];
   spur.geloescht=spur.geloescht||[];
   window.loadAllData=async()=>{};
   window.renderSettings=()=>{};
   const v=id=>verwendung[id]||{};
   sb.from=function(t){
    const q={_t:t,_op:null,_pl:null,_ids:null,_eq:null};
    q.select=()=>q;
    q.in=(sp,ids)=>{q._ids=ids;return q};
    q.eq=(sp,w)=>{q._eq={sp,w};return q};
    q.update=pl=>{q._op="update";q._pl=pl;return q};
    q.delete=()=>{q._op="delete";return q};
    q.then=(f,g)=>Promise.resolve(antwort(q)).then(f,g);
    return q;
   };
   function antwort(q){
    const ids=q._ids||[];
    if(q._op===null){
     if(q._t==="lager_varianten")
      return {data:ids.filter(i=>v(i).produkte).map(i=>({material_id:i})),error:null};
     if(q._t==="lagerbestand")
      return {data:ids.filter(i=>v(i).bestand).map(i=>({artikel_id:i})),error:null};
     if(q._t==="reststuecke")
      return {data:ids.filter(i=>v(i).reste).map(i=>({artikel_id:i})),error:null};
     if(q._t==="reports"){
      const zeilen=Object.keys(verwendung).filter(i=>v(i).rapporte)
        .map(i=>({no:window.__NR[i],qty:1}));
      return {data:zeilen.length?[{id:1,material_entries:zeilen}]:[],error:null};
     }
     if(q._t==="measurements"){
      const zeilen=Object.keys(verwendung).filter(i=>v(i).aufnahmen)
        .map(i=>({no:window.__NR[i],qty:1}));
      return {data:zeilen.length?[{id:1,rapport_material:zeilen}]:[],error:null};
     }
     return {data:[],error:null};
    }
    if(q._op==="delete"&&q._t==="materials"){
     ids.forEach(i=>{spur.geloescht.push(i);spur.reihenfolge.push("loeschen"+i)});
     return {data:ids.map(i=>({id:i})),error:null};
    }
    if(q._op==="update"&&q._t==="materials"&&q._pl&&q._pl.demo===false){
     ids.forEach(i=>{spur.gestempelt.push(i);spur.reihenfolge.push("stempel"+i)});
     return {data:ids.map(i=>({id:i})),error:null};
    }
    if(q._op==="update"){
     spur.umgehaengt.push(q._t);
     spur.reihenfolge.push("umhaengen");
     return {data:[{id:1}],error:null};
    }
    return {data:[],error:null};
   }
  };
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // ---- A  Der Stempel wirkt ------------------------------------------------
 console.log("\nA · Der Beispiel-Stempel wirkt");
 const A=await page.evaluate(()=>{
  window.__frisch();
  return {
   alle:settings.materials.length,
   echt:katalogEchteAnzahl(),
   demoErkannt:[artikelIstDemo(901),artikelIstDemo(902),artikelIstDemo(903)],
   fremd:artikelIstDemo(99999),
   listeIds:bkDemoPositionen().map(d=>d.id),
   listeNr:bkDemoPositionen().map(d=>d.edv_nr)
  };
 });
 p(A.alle===3,"drei Positionen sind geladen",A.alle);
 p(A.echt===0,"katalogEchteAnzahl() zaehlt davon KEINE als eigene",A.echt);
 p(A.demoErkannt.every(x=>x===true),"artikelIstDemo() erkennt alle drei",A.demoErkannt);
 p(A.fremd===false,"Gegenprobe: eine unbekannte Id ist kein Beispiel");
 p(A.listeIds.length===3,"bkDemoPositionen() findet alle drei",A.listeIds);
 p(A.listeNr.indexOf("101.01")>=0,"und nennt sie bei ihrer EDV-Nr.",A.listeNr);

 // ---- B  Die Checkliste laesst sich davon NICHT taeuschen -----------------
 console.log("\nB · Die Einrichtungs-Checkliste zaehlt Beispiele nicht mit");
 const B=await page.evaluate(()=>{
  window.__frisch();
  const mitDemo=einrOffenePflicht().map(x=>x.schluessel);
  const standKatalog=einrStand().find(x=>x.schluessel==="katalog").stand;
  const standBleche=einrStand().find(x=>x.schluessel==="bleche").stand;
  // Gegenprobe: DIESELBEN Zeilen, nur ohne Stempel. Jetzt sind es eigene.
  materialDemo=[false,false,false];
  const ohneDemo=einrOffenePflicht().map(x=>x.schluessel);
  return {mitDemo,ohneDemo,standKatalog,standBleche};
 });
 p(B.mitDemo.indexOf("katalog")>=0,"'Material-Katalog' bleibt OFFEN, obwohl drei Positionen da sind",B.mitDemo);
 p(B.mitDemo.indexOf("bleche")>=0,"'Blech-Formate' bleibt OFFEN, obwohl zwei Bleche fertig konfiguriert sind",B.mitDemo);
 p(/0 eigene/.test(B.standKatalog)&&/3 Beispiele/.test(B.standKatalog),
   "die Zeile sagt ausdruecklich '0 eigene Positionen (dazu 3 Beispiele)'",B.standKatalog);
 p(B.standBleche==="0 geführt","und bei den Blechen steht 0 gefuehrt",B.standBleche);
 // Das ist die eigentliche Zusicherung: ohne den Stempel waeren beide erledigt.
 p(B.ohneDemo.indexOf("katalog")<0&&B.ohneDemo.indexOf("bleche")<0,
   "Gegenprobe: ohne Stempel gelten genau dieselben Zeilen als erledigt - der Unterschied kommt NUR vom Stempel",B.ohneDemo);

 // ---- C  Unbenutzte gehen ohne Rueckfrage ---------------------------------
 console.log("\nC · Unbenutzte Beispiele gehen ohne Rueckfrage");
 const C=await page.evaluate(async()=>{
  window.__frisch();
  const spur={geloescht:[],gestempelt:[],gefragt:false};
  window.__stubSb(spur,{});        // keine Verwendung
  await bkAufloesen();
  return {spur,dialogOffen:!$("beispielKatalogModal").hidden};
 });
 p(C.spur.geloescht.length===3,"alle drei werden geloescht",C.spur.geloescht);
 p(C.spur.gefragt===false,"und es wird NICHT gefragt - da ist nichts zu entscheiden");
 p(C.dialogOffen===false,"der Dialog bleibt zu");

 // ---- D  Benutzte werden NICHT stillschweigend geloescht ------------------
 console.log("\nD · Benutzte Beispiele: der Firmenadmin entscheidet");
 const D=await page.evaluate(async()=>{
  window.__frisch();
  const spur={geloescht:[],gestempelt:[],gefragt:false};
  // 901 haengt an einem Lagerprodukt und einem Rapport, 902/903 nicht.
  window.__stubSb(spur,{901:{produkte:1,rapporte:1}});
  bkAufloesen();                   // absichtlich ohne await: wartet auf den Dialog
  await new Promise(r=>setTimeout(r,300));
  const offen=!$("beispielKatalogModal").hidden;
  const text=$("bkListe").textContent;
  return {spur,offen,text,anzahl:$("bkAnzahl").textContent};
 });
 p(D.offen===true,"der Dialog erscheint");
 p(D.anzahl==="1","und nennt genau eine benutzte Position",D.anzahl);
 p(D.spur.geloescht.indexOf(901)<0,"die BENUTZTE Position wurde nicht angefasst",D.spur.geloescht);
 p(D.spur.geloescht.indexOf(902)>=0&&D.spur.geloescht.indexOf(903)>=0,
   "die beiden unbenutzten dagegen sind weg",D.spur.geloescht);
 p(/Lagerprodukt/.test(D.text)&&/Regierapport/.test(D.text),
   "die Zeile sagt, WORAN die Position haengt - nicht nur dass sie benutzt wird",D.text.slice(0,160));

 // ---- E  Die vier Wege ----------------------------------------------------
 console.log("\nE · Die vier Wege");
 const E=await page.evaluate(async()=>{
  const erg={};
  // behalten
  window.__frisch();
  let spur={geloescht:[],gestempelt:[],gefragt:false};
  window.__stubSb(spur,{901:{produkte:1}});
  bkAufloesen(); await new Promise(r=>setTimeout(r,300));
  document.querySelector('[data-bk-tu="behalten"]').click();
  await new Promise(r=>setTimeout(r,300));
  erg.behalten={gestempelt:spur.gestempelt.slice(),geloescht:spur.geloescht.indexOf(901)>=0};
  // spaeter
  window.__frisch();
  spur={geloescht:[],gestempelt:[],gefragt:false};
  window.__stubSb(spur,{901:{produkte:1}});
  bkAufloesen(); await new Promise(r=>setTimeout(r,300));
  document.querySelector('[data-bk-tu="spaeter"]').click();
  await new Promise(r=>setTimeout(r,200));
  erg.spaeter={gestempelt:spur.gestempelt.slice(),geloescht901:spur.geloescht.indexOf(901)>=0,
               zu:$("beispielKatalogModal").hidden};
  return erg;
 });
 p(E.behalten.gestempelt.indexOf(901)>=0,"'Behalten' nimmt der Position den Stempel",E.behalten.gestempelt);
 p(E.behalten.geloescht===false,"und loescht sie ausdruecklich NICHT");
 p(E.spaeter.gestempelt.length===0,"'Spaeter' aendert nichts am Stempel",E.spaeter.gestempelt);
 p(E.spaeter.geloescht901===false,"und loescht nichts");
 p(E.spaeter.zu===true,"der Dialog geht trotzdem zu");

 // ---- F  Ersetzen: zuerst umhaengen, DANN loeschen ------------------------
 console.log("\nF · Ersetzen haengt zuerst um und loescht erst danach");
 const F=await page.evaluate(async()=>{
  window.__frisch();
  // Eine echte Position, auf die ersetzt werden kann.
  settings.materials.push(["201.01","Kupferblech 0.6 eigen","0.6","m²",42]);
  materialIds.push(500); materialWerkstoffe.push(3);
  materialFormate.push({staerke_mm:0.6,ausfuehrung:"blank",form:"rolle",laenge_mm:null,breite_mm:null});
  materialDemo.push(false);
  const spur={geloescht:[],gestempelt:[],umgehaengt:[],reihenfolge:[]};
  window.__stubSb(spur,{901:{produkte:1,rapporte:1}});
  bkAufloesen(); await new Promise(r=>setTimeout(r,300));
  document.querySelector('[data-bk-ersatz="901"]').value="500";
  document.querySelector('[data-bk-tu="ersetzen"]').click();
  await new Promise(r=>setTimeout(r,500));
  return {spur,zu:$("beispielKatalogModal").hidden};
 });
 p(F.spur.umgehaengt.length>0,"es wird umgehaengt",F.spur.umgehaengt);
 p(F.spur.geloescht.indexOf(901)>=0,"und die Beispielposition danach geloescht");
 // ACHTUNG, hier stand zuerst eine zu schwache Bedingung:
 //   indexOf("umhaengen") < lastIndexOf("loeschen901")
 // Die verlangt nur, dass IRGENDEIN Umhaengen vor dem LETZTEN Loeschen
 // liegt. Eine Gegenprobe, die bkErsetzen zuerst loeschen liess, blieb
 // damit gruen - die Pruefung pruefte nicht, was sie behauptete.
 // Richtig ist die Umkehrung: KEIN Loeschen darf vor dem LETZTEN
 // Umhaengen liegen. Erst das sichert zu, dass bei einem Fehlschlag
 // mittendrin noch nichts weg ist.
 const letztesUm=F.spur.reihenfolge.lastIndexOf("umhaengen");
 // Und zwar bezogen auf die ERSETZTE Position (901). Die unbenutzten
 // Beispiele 902/903 verschwinden korrekt schon vorher, in bkAufloesen -
 // die duerfen hier nicht mitzaehlen.
 const erstesDel=F.spur.reihenfolge.indexOf("loeschen901");
 p(letztesUm>=0&&erstesDel>=0&&letztesUm<erstesDel,
   "in DIESER Reihenfolge: ALLES Umhaengen zuerst, DANN erst das Loeschen - scheitert das Umhaengen, ist noch nichts weg",
   F.spur.reihenfolge);

 // ---- G  Struktur ---------------------------------------------------------
 console.log("\nG · Struktur und Zusicherungen");
 const html=lies("index.html");
 p(html.indexOf('src="js/74-beispielkatalog.js"')>=0,"js/74 ist eingebunden");
 p(lies("sw.js").indexOf('"./js/74-beispielkatalog.js"')>=0,"und steht im Offline-Vorrat");
 p(html.indexOf('id="beispielKatalogModal"')>=0,"der Dialog steht in index.html");
 ["behalten","ersetzen","loeschen","spaeter"].forEach(w=>
  p(html.indexOf('data-bk-tu="'+w+'"')>=0,"der Weg '"+w+"' hat seinen Knopf"));
 // Die Preis-Zusicherung: KEIN erfundener Preis in den Beispielen.
 const start=lies("supabase/functions/register-company/_startwerte.ts");
 const preise=(start.match(/price:\s*([0-9.]+)/g)||[]);
 p(!/price:\s*[1-9]/.test(start),"kein Beispiel traegt einen erfundenen Preis",preise);
 p(/demo:\s*true/.test(lies("supabase/functions/register-company/index.ts")),
   "die Edge Function stempelt den Beispiel-Katalog als solchen");
 // Der Import entstempelt VOR dem Schreiben.
 const imp=lies("js/08-katalog-blitzschutz.js");
 const iStempel=imp.indexOf("bkStempelWeg"), iUpsert=imp.indexOf(".upsert(eintraege");
 p(iStempel>=0&&iUpsert>=0&&iStempel<iUpsert,
   "beim Import geht der Stempel VOR dem Schreiben weg - sonst verschwaende die frisch importierte Zeile spaeter wieder",
   {iStempel,iUpsert});

 p(fehler.length===0,"keine JavaScript-Fehler auf der Seite",fehler.slice(0,3));
 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

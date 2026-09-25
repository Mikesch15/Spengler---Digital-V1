// Prueft v3.177: Das Blech-Format gehoert zum Artikel (Stufe 4).
//
// GEMELDET (Fortsetzung von v3.176)
// "Material in Massaufnahme und Materialbestand in Lager sind fast dasselbe,
// das muesste man irgendwie vereinen koennen sonst wirds kompliziert."
//
// BEFUND
// Stufe 1-3 (v3.176) hatten den NAMEN, das WORT und den WERKSTOFF
// zusammengefuehrt. Uebrig blieb die eigentliche Doppelung: das FORMAT.
// Der Artikel trug seinen Namen, eine eigene lagerbestand-Zeile trug Staerke,
// Ausfuehrung und Rolle/Tafel. Zwei Datensaetze fuer EIN Blech.
//
// Sichtbar wurde das an den echten Daten des Betriebs: materials 36, 37 und
// 38 heissen ALLE DREI "Kupferblech" (EDV 102.01/.02/.03). Der Unterschied -
// 0,6 gegen 0,8 gegen 1,0 mm - stand in einer anderen Tabelle. In der
// Lagerverwaltung standen dadurch drei gleich benannte Produkte. Wer eines
// ausscannte, riet.
//
// NICHT der Befund war ein doppelter BESTAND: lagerbestand.menge ist seit
// v3.31 tot (nie geschrieben, nie angezeigt, ueberall 0) - die Liste sagte
// immer nur, WELCHE Bleche die Firma fuehrt, nie wie viele.
//
// WAS HIER GEPRUEFT WIRD
//   A  Ein Artikel traegt sein Format selbst - und nur Bleche haben eines.
//   B  Die drei Kupferbleche sind ueberall unterscheidbar.
//   C  Der Zuschnitt rechnet dieselben Zahlen wie vorher.
//   D  Es gibt nur noch EINE Quelle.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-blechformat-v3-177.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 // Die echten Daten des Betriebs, Stand der Migration
 // artikel_traegt_sein_blechformat.
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",company_id:"c1"};
  meineRechte={admin:true,lager:true};
  measurementMaterials=[{id:3,name:"Kupfer",max_abstand_mm:6000,ab_fixpunkt_mm:3000},
                        {id:2,name:"Titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500}];
  settings.materials=[["102.01","Kupferblech","0.60","m²",1],
                      ["102.02","Kupferblech","0.80","m²",1],
                      ["102.03","Kupferblech","1.00","m²",1],
                      ["103.01","Titanzinkblech blank","0.70","m²",1],
                      ["111.02","Cava-Band Kupfer","250mm","m1",28.9],
                      ["205.00","Dichtband","","m1",4.2]];
  materialIds=[36,37,38,40,62,205];
  materialWerkstoffe=[3,3,3,2,3,null];
  materialFormate=[
   {staerke_mm:0.6,ausfuehrung:"Blank",form:"rolle",laenge_mm:null,breite_mm:null},
   {staerke_mm:0.8,ausfuehrung:"Blank",form:"tafel",laenge_mm:2000,breite_mm:1000},
   {staerke_mm:1,  ausfuehrung:"Blank",form:"tafel",laenge_mm:2000,breite_mm:1000},
   {staerke_mm:0.7,ausfuehrung:"Blank",form:"rolle",laenge_mm:null,breite_mm:null},
   {staerke_mm:0.6,ausfuehrung:"Cava",form:"rolle",laenge_mm:null,breite_mm:null},
   {staerke_mm:null,ausfuehrung:null,form:null,laenge_mm:null,breite_mm:null}];
  lagerbestand=[];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // ---- A  Das Format gehoert zum Artikel -----------------------------------
 console.log("\nA · Ein Artikel traegt sein Format selbst");
 const A=await page.evaluate(()=>({
  blech:artikelFormat(36),
  dichtband:artikelFormat(205),
  unbekannt:artikelFormat(99999),
  ohneId:artikelFormat(null),
  liste:lagFormate().map(f=>({id:f.id,werkstoff:f.material_id,st:f.staerke_mm,form:f.form}))
 }));
 p(A.blech&&A.blech.form==="rolle"&&A.blech.staerke_mm===0.6,
   "A1 ein Blech-Artikel nennt sein Format",A.blech);
 p(A.dichtband===null,
   "A2 Dichtband hat weder Form noch Staerke und ist damit kein gefuehrtes "
   +"Blech - der Katalog hat 381 Positionen, nur die Bleche gehoeren in "
   +"diese Liste",A);
 p(A.unbekannt===null&&A.ohneId===null,
   "A3 unbekannte oder fehlende Id liefern null - es wird nichts geraten",A);
 p(A.liste.length===5&&A.liste.every(x=>x.werkstoff!==null),
   "A4 lagFormate() liefert genau die fuenf Bleche, jedes mit seinem "
   +"Werkstoff aus dem Artikel - das Dichtband ist nicht dabei",A.liste);

 // GEGENPROBE zum Kriterium: bis v3.176 zaehlte eine Bestandszeile MIT
 // Staerke, aber OHNE Form, fuer die Bedarfspruefung sehr wohl mit. Haette
 // v3.177 allein die Form verlangt, waere so ein Eintrag still aus der Liste
 // gefallen und der Bedarf ploetzlich "kein-lager" geworden.
 const A5=await page.evaluate(()=>{
  const sichern=materialFormate.map(x=>Object.assign({},x));
  materialFormate[3]={staerke_mm:0.7,ausfuehrung:"Blank",form:null,
                      laenge_mm:null,breite_mm:null};
  const drin=lagFormate().some(f=>Number(f.id)===40);
  const bedarf=restBedarfMerkmale(2,0.7);
  const form=restBedarfForm(2,0.7);
  materialFormate=sichern;
  return {drin,bedarfGrund:bedarf.grund,eindeutig:bedarf.eindeutig,formGrund:form.grund};
 });
 p(A5.drin===true&&A5.eindeutig===true,
   "A5 GEGENPROBE: ein Eintrag mit Staerke aber OHNE Form zaehlt weiterhin "
   +"mit - sonst haette v3.177 durch die Hintertuer Verhalten geaendert",A5);
 p(A5.formGrund==="ohne-form",
   "A6 und die Form-Frage bleibt dabei offen statt geraten - genau wie bis "
   +"v3.176",A5);

 // ---- B  Die drei Kupferbleche ---------------------------------------------
 console.log("\nB · Drei gleich benannte Kupferbleche - jetzt unterscheidbar");
 const B=await page.evaluate(()=>{
  const liste=lagArtikelListe();
  const kupfer=liste.filter(a=>[36,37,38].indexOf(Number(a.id))>=0);
  return {
   etiketten:kupfer.map(a=>lagArtikelText(a)),
   namen:kupfer.map(a=>a.name),
   dichtband:lagArtikelText(liste.find(a=>Number(a.id)===205))
  };
 });
 p(B.namen.length===3&&new Set(B.namen).size===1&&B.namen[0]==="Kupferblech",
   "B1 der AUSGANGSPUNKT: alle drei Positionen heissen wirklich gleich",B.namen);
 p(new Set(B.etiketten).size===3,
   "B2 die drei Etiketten sind trotzdem verschieden - genau der gemeldete "
   +"Fall ist damit behoben",B.etiketten);
 p(/0,6 mm/.test(B.etiketten[0])&&/0,8 mm/.test(B.etiketten[1])&&/1 mm/.test(B.etiketten[2]),
   "B3 jedes nennt seine Staerke",B.etiketten);
 p(/Rolle/.test(B.etiketten[0])&&!/Tafel/.test(B.etiketten[0])
   &&/Tafel/.test(B.etiketten[1])&&/2.000 × 1.000 mm/.test(B.etiketten[1].replace(/’/g,".")),
   "B4 die Rolle nennt keine Masse, die Tafel ihr Format - eine Rolle hat "
   +"keine feste Laenge",B.etiketten);
 p(B.dichtband==="205.00 Dichtband",
   "B5 eine Position ohne Format bleibt unveraendert schlicht",B.dichtband);

 // GEGENPROBE, und zugleich die Richtigstellung einer zu bequemen Annahme:
 // ohne Format faellt das Etikett auf die Spalte dim zurueck, und dim ist
 // NICHT leer. Bei den drei Kupferblechen steht dort zufaellig die Staerke
 // ("0.60"), sie waren also auch vorher schon zu unterscheiden.
 //
 // Der Schaden lag woanders: dim ist ein freies Textfeld ohne feste
 // Bedeutung. Beim Cava-Band steht dort "250mm" - eine BREITE. Wer dim fuer
 // die Staerke haelt, liest dieses Blech als 250 mm dick. Genau deshalb
 // tritt das strukturierte Format an dessen Stelle.
 const B6=await page.evaluate(()=>{
  const sichern=materialFormate.map(x=>Object.assign({},x));
  const cava=lagArtikelListe().find(a=>Number(a.id)===62);
  const mitFormat=lagArtikelText(cava);
  materialFormate=materialFormate.map(()=>({staerke_mm:null,ausfuehrung:null,
    form:null,laenge_mm:null,breite_mm:null}));
  const ohneFormat=lagArtikelText(cava);
  materialFormate=sichern;
  return {mitFormat,ohneFormat,dim:cava.dim};
 });
 p(B6.dim==="250mm"&&/250mm/.test(B6.ohneFormat)&&!/mm dick|0,6/.test(B6.ohneFormat),
   "B6 GEGENPROBE: ohne Format zeigt das Etikett die Spalte dim - beim "
   +"Cava-Band ist das eine BREITE (250mm), nicht die Staerke",B6);
 p(/0,6 mm/.test(B6.mitFormat)&&!/250mm/.test(B6.mitFormat),
   "B7 mit Format steht dort die echte Staerke (0,6 mm) statt des freien "
   +"Texts - dim ist raus, weil es nichts Festes bedeutet",B6);

 // ---- C  Der Zuschnitt rechnet gleich --------------------------------------
 console.log("\nC · Der Zuschnitt rechnet dieselben Zahlen");
 const C=await page.evaluate(()=>({
  titan07:restBedarfMerkmale(2,0.7),
  kupfer06:restBedarfMerkmale(3,0.6),
  kupferOhneStaerke:restBedarfMerkmale(3),
  form06:restBedarfForm(3,0.6),
  form08:restBedarfForm(3,0.8),
  formOhne:restBedarfForm(3),
  staerken:measStaerkenFuer(3),
  fremd:restBedarfMerkmale(3,0.5)
 }));
 p(C.titan07.eindeutig===true&&C.titan07.merkmale.staerke===0.7
   &&C.titan07.merkmale.ausfuehrung==="blank"&&C.titan07.merkmale.artikel===40,
   "C1 fuehrt die Firma fuer eine Staerke genau EIN Blech, ist der Bedarf "
   +"eindeutig - samt Artikel",C.titan07);
 // Kein konstruierter Fall: der Betrieb fuehrt Kupferblech blank 0,6 mm UND
 // Cava-Band Kupfer 0,6 mm. Dieselbe Staerke, verschiedene Ausfuehrung. Die
 // App darf hier nicht waehlen - sonst legte sie beim Zuschnitt ein Cava-Band
 // an, wo Blech gemeint war.
 p(C.kupfer06.eindeutig===false&&C.kupfer06.grund==="mehrdeutig"
   &&C.kupfer06.gefunden.length===2,
   "C1b zwei Bleche derselben Staerke mit verschiedener Ausfuehrung machen "
   +"den Bedarf NICHT eindeutig - genau so liegen die echten Daten",C.kupfer06);
 p(C.kupferOhneStaerke.eindeutig===false&&C.kupferOhneStaerke.grund==="mehrdeutig",
   "C2 ohne Staerke bleibt es mehrdeutig - drei Staerken, und die App raet "
   +"nicht, welche gemeint ist",C.kupferOhneStaerke);
 p(C.form06.form==="rolle"&&C.form08.form==="tafel"
   &&C.form08.formate.length===1&&C.form08.formate[0].laenge===2000,
   "C3 Rolle bleibt Rolle, Tafel nennt ihr Format",{a:C.form06,b:C.form08});
 p(C.formOhne.form===null&&C.formOhne.grund==="form-mehrdeutig",
   "C4 Rolle UND Tafel fuer denselben Werkstoff: es bleibt offen, statt "
   +"sich fuer eine zu entscheiden",C.formOhne);
 p(C.staerken.length===3&&C.staerken[0]===0.6&&C.staerken[2]===1,
   "C5 die Massaufnahme bietet genau die gefuehrten Staerken, aufsteigend",C.staerken);
 p(C.fremd.eindeutig===false&&C.fremd.grund==="staerke-nicht-im-lager"
   &&C.fremd.gefunden.length===4,
   "C6 GEGENPROBE: eine Staerke, die die Firma nicht fuehrt, weicht NICHT "
   +"auf eine andere aus - sie wird gemeldet, mit dem was es gibt",C.fremd);

 // ---- D  Eine Quelle -------------------------------------------------------
 console.log("\nD · Nur noch eine Quelle");
 const codeNur=t=>t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"")
   .replace(/"(?:[^"\\]|\\.)*"/g,'""').replace(/'(?:[^'\\]|\\.)*'/g,"''");
 [["js/42-reste.js","der Zuschnitt"],["js/61-materialstaerke.js","die Materialstaerke"]]
  .forEach(([datei,was])=>{
   p(!/\blagerbestand\b(?!_)/.test(codeNur(lies(datei)))&&/lagFormate\(\)/.test(lies(datei)),
     "D1 "+was+" ("+datei+") liest lagFormate() und greift nirgends mehr auf "
     +"das Array lagerbestand zu");
  });
 const js59=lies("js/59-lagerbestand.js");
 p(!/from\("lagerbestand"\)/.test(js59),
   "D2 der Materialbestand schreibt nicht mehr in die alte Tabelle");
 // v3.179: Der Materialbestand darf jetzt auch eine Position ANLEGEN - sonst
 // muesste ein neues Blech weiterhin zweimal erfasst werden. Der Vertrag ist
 // deshalb nicht weggefallen, sondern genauer geworden:
 //   das FORMAT wird immer per update geschrieben, nie per insert
 //   (ein insert erzeugte einen zweiten Artikel - genau die Doppelung, die
 //   Stufe 4 beseitigt hat),
 //   und das insert gibt es nur an EINER Stelle: in katalogPositionAnlegen().
 // Dass dabei keine vorhandene Position dupliziert wird, prueft F3 am
 // Verhalten (schon vergebene EDV-Nr. wird abgewiesen, bevor etwas
 // geschrieben wird).
 const formatSchreiben=js59.slice(js59.indexOf("async function lagSpeichern"));
 p(/from\("materials"\)\.update/.test(formatSchreiben)
   &&!/from\("materials"\)\.insert/.test(formatSchreiben),
   "D3 das Format wird AENDERND geschrieben - nie als zweiter Artikel");
 p((js59.match(/from\("materials"\)\.insert/g)||[]).length===1
   &&/function katalogPositionAnlegen/.test(js59),
   "D3b und ein insert steht an genau EINER Stelle: katalogPositionAnlegen()");
 p(!/from\("materials"\)\.delete/.test(js59),
   "D4 GEGENPROBE: er loescht keinen Katalogartikel - der traegt EDV-Nr., "
   +"Preis, Barcode und alle Buchungen");
 p(/materialFormate=materials\.map/.test(lies("js/05-daten-laden.js")),
   "D5 das Format wird beim Anmelden mitgeladen");

 // ---- E  Loeschen der Katalogposition --------------------------------------
 // Das Format ist seit v3.177 eine SPALTE auf der Katalogzeile. Wer die
 // Position loescht, loescht es mit - und genau davor muss gewarnt werden.
 // Die alte Warnung zaehlte Zeilen in der inzwischen ungenutzten Tabelle
 // lagerbestand und versicherte, sie "bleiben bestehen": sie verschwieg also
 // ausgerechnet die eine Folge, die endgueltig ist.
 console.log("\nE · Loeschen der Katalogposition warnt richtig");
 const E=await page.evaluate(async()=>{
  meineRechte={admin:true,lager:true,kataloge:true};
  lagerVarianten=[];                 // kein Produkt mehr an der Position
  const gefragt=[];
  const echt=window.confirm;
  window.confirm=t=>{gefragt.push(t);return false};   // abbrechen, nichts loeschen
  await lagerPositionAufraeumenAnbieten(36);          // Kupferblech 0,6 Rolle
  await lagerPositionAufraeumenAnbieten(205);         // Dichtband, kein Blech
  window.confirm=echt;
  return {blech:gefragt[0]||"",kein:gefragt[1]||""};
 });
 p(/als BLECH gef/.test(E.blech)&&/0,6 mm/.test(E.blech)&&/Rolle/.test(E.blech),
   "E1 bei einem Blech nennt die Warnung das Format, das mit verschwindet",E.blech);
 p(/mit ihr gelöscht|mit ihr geloescht/.test(E.blech),
   "E2 und sagt ausdruecklich, dass es geloescht wird",E.blech);
 p(!/Blech-Materialbestand verlieren dadurch/.test(E.blech),
   "E3 GEGENPROBE: die alte Zusicherung „sie bleiben bestehen\" steht nicht "
   +"mehr da - sie waere seit v3.177 falsch",E.blech);
 p(E.kein.length>0&&!/als BLECH gef/.test(E.kein),
   "E4 bei einer Position ohne Format wird kein Blech behauptet",E.kein);
 p(/Reststücke/.test(E.blech)&&/verlieren nur ihre Zuordnung/.test(E.blech),
   "E5 fuer Reststuecke gilt weiterhin SET NULL - sie bleiben, und das steht "
   +"auch so da",E.blech);

 // ---- F  Ein neues Blech in EINEM Dialog (v3.179) --------------------------
 // GEMELDET: "So wies jetzt ist muss ein neues Blech immer zweimal erfasst
 // werden, das finde ich doof." Zu Recht: die DATEN waren seit v3.177 nicht
 // mehr doppelt, der WEG aber schon - erst die Position im Katalog, dann hier
 // das Format. Zwei Karten, zwei Formulare.
 console.log("\nF · Ein neues Blech in einem Dialog");
 const F=await page.evaluate(async()=>{
  meineRechte={admin:true,lager:true,kataloge:true};
  const geschrieben=[];
  const echt=sb.from;
  sb.from=(t)=>{
   const q={};
   ["eq","order","limit","not"].forEach(k=>q[k]=()=>q);
   q.insert=d=>{geschrieben.push({t,op:"insert",d});
     return {select:()=>Promise.resolve({data:[Object.assign({id:777},d)],error:null})}};
   q.update=d=>{geschrieben.push({t,op:"update",d});
     return {eq:()=>({select:()=>Promise.resolve({data:[{id:777}],error:null})})}};
   q.select=()=>q; q.then=(f,g)=>Promise.resolve({data:[],error:null}).then(f,g);
   return q;
  };
  const setz=(id,v)=>{const el=$(id);if(el){el.value=v;el.dispatchEvent(new Event("change",{bubbles:true}))}};
  lagFormularOeffnen({});
  const wahlHat=[...$("lag_artikel").options].some(o=>o.value==="__neu");
  const vorher=[...document.querySelectorAll("[data-lag-neu]")].every(e=>e.hidden);
  setz("lag_artikel","__neu");
  await new Promise(f=>setTimeout(f,120));
  const nachher=[...document.querySelectorAll("[data-lag-neu]")].every(e=>!e.hidden);

  // (a) doppelte EDV-Nr. wird abgewiesen
  $("lag_neuNr").value="102.01"; $("lag_neuName").value="Kupferblech";
  setz("lag_material","3"); $("lag_staerke").value="1.2";
  $("lag_ausfuehrung").value="blank"; setz("lag_form","rolle");
  await lagSpeichern();
  const doppelt={meldung:($("lagerFormFehler")||{}).textContent||"",n:geschrieben.length};

  // (b) ohne Bezeichnung wird abgewiesen
  $("lag_neuNr").value="102.09"; $("lag_neuName").value="";
  await lagSpeichern();
  const ohneName={meldung:($("lagerFormFehler")||{}).textContent||"",n:geschrieben.length};

  // (c) der gute Fall
  $("lag_neuName").value="Kupferblech";
  await lagSpeichern();
  sb.from=echt;
  return {wahlHat,vorher,nachher,doppelt,ohneName,
          schritte:geschrieben.map(x=>x.t+"/"+x.op),
          eingefuegt:geschrieben.find(x=>x.op==="insert")||null,
          offen:!$("lagerFormModal").hidden,
          listen:{ids:materialIds.length,werk:materialWerkstoffe.length,
                  form:materialFormate.length,mat:settings.materials.length},
          drin:lagFormate().some(f=>Number(f.id)===777)};
 });
 p(F.wahlHat===true,"F1 die Artikel-Auswahl bietet „＋ neue Katalogposition\"",F.wahlHat);
 p(F.vorher===true&&F.nachher===true,
   "F2 ihre Felder erscheinen erst bei dieser Wahl - sonst fragte das "
   +"Formular nach einer EDV-Nr., die es schon gibt",F);
 p(F.doppelt.n===0&&/gibt es bereits/.test(F.doppelt.meldung),
   "F3 GEGENPROBE: eine schon vergebene EDV-Nr. wird abgewiesen, und zwar "
   +"BEVOR irgendetwas geschrieben wird",F.doppelt);
 p(F.ohneName.n===0&&/Bezeichnung/.test(F.ohneName.meldung),
   "F4 GEGENPROBE: ohne Bezeichnung wird nichts angelegt",F.ohneName);
 p(F.schritte.length===2&&F.schritte[0]==="materials/insert"
   &&F.schritte[1]==="materials/update",
   "F5 der gute Fall: erst die Position, dann ihr Format - in dieser "
   +"Reihenfolge, damit bei einem Fehler nichts halb passiert ist",F.schritte);
 p(F.eingefuegt&&F.eingefuegt.d.edv_nr==="102.09"&&F.eingefuegt.d.werkstoff_id===3,
   "F6 die neue Position traegt gleich ihren Werkstoff",F.eingefuegt&&F.eingefuegt.d);
 p(F.offen===false&&F.drin===true,
   "F7 danach ist der Dialog zu und das Blech steht in der Liste - ohne "
   +"Neuladen",F);
 p(F.listen.ids===F.listen.werk&&F.listen.ids===F.listen.form
   &&F.listen.ids===F.listen.mat,
   "F8 GEGENPROBE: alle vier parallelen Listen sind gleich lang. Bis v3.178 "
   +"zog das Anlegen nur settings.materials und materialIds nach - "
   +"materialWerkstoffe und materialFormate blieben zurueck",F.listen);

 p(fehler.length===0,"G1 keine Javascript-Fehler",fehler.slice(0,3));

 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 await b.close();
 process.exit(fail?1:0);
})();

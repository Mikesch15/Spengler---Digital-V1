// Prueft zwei Roadmap-Punkte aus v3.04:
//   A  "Als Vorlage" - eine bestehende Massaufnahme als Grundlage einer neuen
//   B  Zugangsdaten eines neuen Mitarbeiterkontos zum Kopieren/Weitergeben
// und seit v3.148:
//   C  die optionale E-Mail gleich im Anlege-Formular
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-vorlage-zugang-v3-04.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(250);
 return r;
}

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:`window.__fn=[];
window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:"https://t/"+x},error:null})})},
 functions:{invoke:async(name,o)=>{window.__fn.push({name,body:o&&o.body});
   // v3.148: Die Antwort ist steuerbar, damit der Pruefstand auch den
   // fehlgeschlagenen Mailversand und eine Absage des Servers nachstellen
   // kann. Ohne Vorgabe verhaelt sie sich wie bisher.
   if(window.__fnAntwort)return window.__fnAntwort;
   const b=(o&&o.body)||{};
   return {data:{ok:true,user:{username:"anna.beispiel"},password:"Start-1234",
     mailVersendet:!!b.email&&window.__mailGeht!==false},error:null}}},
 from:()=>{const q={};['select','eq','order','limit','update','insert','delete','maybeSingle','single'].forEach(k=>q[k]=()=>q);
   q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 rpc:async()=>({data:true,error:null})})};`}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>{page.__dialog=d.message();d.accept()});
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"A"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12",order_no:"1",customer:"X"},
               {id:9,name:"Andere Baustelle",object:"Feldweg 3",order_no:"2",customer:"Y"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  companyName="Peter Künzi AG";
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 // ==========================================================================
 // A · Als Vorlage
 // ==========================================================================
 console.log("\nA · Als Vorlage");
 const da=await page.evaluate(()=>({fn:typeof measurementAlsVorlage==="function",
   fuellen:typeof measFelderAusData==="function"}));
 p(da.fn,"measurementAlsVorlage ist vorhanden");
 p(da.fuellen,"das Fuellen der Felder ist herausgeloest – eine Wahrheit für Öffnen und Kopie");
 // openMeasurement MUSS dieselbe Funktion benutzen, sonst laufen beide auseinander
 const fs=require("fs");
 const q10=fs.readFileSync(path.join(process.cwd(),"js/10-massaufnahme.js"),"utf8");
 p((q10.match(/measFelderAusData\(/g)||[]).length>=3,
   "openMeasurement und die Kopie rufen dieselbe Fuell-Funktion",
   (q10.match(/measFelderAusData\(/g)||[]).length);

 const VORLAGE={id:41,type:"kehle",title:"Kehle Nord",note:"Achtung Kamin",
   date:"2026-08-01",project_id:7,
   photo_paths:["measurements/7/41/photo/a.jpg"],sketch_paths:["measurements/7/41/sketches/b.png"],
   created_by:"u1",created_at:"2026-08-01T08:00:00Z",updated_by:"u1",updated_at:"2026-08-02T08:00:00Z",
   data:{material:3,mitGehrung:true,nh:42.5,nl:23.5,gl:100,abwicklung:500,
     segmente:[{laenge:2000,ueberlappung:70,rolle:""}]}};
 const kop=await page.evaluate(v=>{
   // Die Kopie bekommt das Projekt, das der Aufrufer nennt (aus dem Cockpit
   // heraus das geoeffnete) - NICHT stillschweigend das der Vorlage (7).
   measurementAlsVorlage(v,9);
   // Die Fachfelder eines Register-Moduls entstehen erst, wenn ihr Register
   // gezeichnet wird - genau wie beim Oeffnen einer Aufnahme. Das Material
   // steht auf Register 1, die Winkel auf Register 2: also beides einzeln.
   const material=$("kea_material")?$("kea_material").value:null;
   if(typeof keaSetzeSchritt==="function")keaSetzeSchritt(2);
   return {material,id:currentMeasurementId, meta:JSON.stringify(currentMeasurementMeta||{}),
     typ:$("measType").value, titel:$("measTitle").value, notiz:$("measNote").value,
     datum:$("measDate").value, heute:new Date().toISOString().slice(0,10),
     fotos:measPhotos.length, skizzen:measSketches.length,
     projekt:measSelectedProjectId,
     offen:!$("measurementEditModal").hidden,
     // Die Fachwerte muessen wirklich in den Feldern stehen
     nh:$("kea_nh")?$("kea_nh").value:null, nl:$("kea_nl")?$("kea_nl").value:null};},VORLAGE);
 p(kop.id===null,"die Kopie ist ein NEUER Datensatz, nicht die Vorlage",kop.id);
 p(kop.meta==="{}","sie trägt keine Ersteller-/Zeitangaben der Vorlage",kop.meta);
 p(kop.typ==="kehle","der Typ wird übernommen",kop.typ);
 p(kop.nh==="42.5"&&kop.nl==="23.5","die Masse werden übernommen",kop);
 p(kop.material==="3","das Material wird übernommen",kop.material);
 p(kop.titel==="Kehle Nord (Kopie)","die Bezeichnung ist als Kopie erkennbar",kop.titel);
 p(kop.notiz==="","die Notiz der Vorlage wird NICHT übernommen",kop.notiz);
 p(kop.datum===kop.heute,"das Datum ist heute, nicht das der Vorlage",kop);
 p(kop.fotos===0&&kop.skizzen===0,"Fotos und Skizzen werden NICHT übernommen",kop);
 p(String(kop.projekt)==="9","die Kopie bekommt das genannte Projekt, nicht das der Vorlage (7)",kop.projekt);
 p(kop.offen,"das Formular ist geöffnet");
 // Die Vorlage selbst bleibt unberuehrt
 const unber=await page.evaluate(v=>({titel:v.title,fotos:v.photo_paths.length,
   notiz:v.note,datum:v.date}),VORLAGE);
 p(unber.titel==="Kehle Nord"&&unber.fotos===1&&unber.notiz==="Achtung Kamin",
   "die Vorlage selbst bleibt unverändert",unber);
 // Speichern legt einen NEUEN Datensatz an (kein Update auf 41)
 const pay=await page.evaluate(()=>{
   const f=buildMeasurementFromForm();
   return {hatId:currentMeasurementId!==null&&currentMeasurementId!==undefined,
     typ:f.type, nh:f.data.nh};});
 p(pay.hatId===false,"beim Speichern entsteht ein neuer Datensatz, kein Update der Vorlage",pay);
 p(pay.typ==="kehle"&&Number(pay.nh)===42.5,"mit den kopierten Werten",pay);
 // Knopf in der Cockpit-Liste
 const knopf=await page.evaluate(()=>{
   projectMeasurementsCache=[{id:41,type:"kehle",title:"Kehle Nord",date:"2026-08-01",
     project_id:7,photo_paths:[],sketch_paths:[],data:{}}];
   const box=document.createElement("div"); box.id="cockpitMeasBody";
   document.body.appendChild(box);
   return {vorhanden:!!document.querySelector("#cockpitMeasCard")};});
 const q09=fs.readFileSync(path.join(process.cwd(),"js/09-projekte.js"),"utf8");
 p(q09.indexOf("data-kopiere-measurement")>=0,"die Cockpit-Liste bietet den Vorlagen-Knopf an");
 p(q09.indexOf("measurementAlsVorlage")>=0,"und ruft die zentrale Funktion");

 // ==========================================================================
 // B · Zugangsdaten weitergeben
 // ==========================================================================
 console.log("\nB · Zugangsdaten weitergeben");
 const zbox=await page.evaluate(()=>({box:!!$("zugangBox"),text:!!$("zugangText"),
   kopieren:!!$("zugangKopieren"),teilen:!!$("zugangTeilen"),
   fn:typeof zugangsdatenZeigen==="function",
   versteckt:$("zugangBox")?$("zugangBox").hidden:null}));
 p(zbox.box&&zbox.text&&zbox.kopieren,"der Kasten für die Zugangsdaten ist vorhanden",zbox);
 p(zbox.versteckt===true,"und startet versteckt",zbox);
 p(zbox.fn,"zugangsdatenZeigen ist vorhanden");
 // Konto anlegen
 await page.evaluate(()=>{$("neuMitarbeiterVor").value="Anna";$("neuMitarbeiterNach").value="Beispiel"});
 page.__dialog="";
 const kr=await klick(page,"#mitarbeiterAnlegen");
 await page.waitForTimeout(400);
 p(kr==="ok","der Anlegen-Knopf laesst sich bedienen",kr);
 const nach=await page.evaluate(()=>({sichtbar:!$("zugangBox").hidden,
   text:$("zugangText").value, aufruf:window.__fn.length,
   body:JSON.stringify((window.__fn[0]||{}).body||{})}));
 p(nach.aufruf===1,"genau EIN Aufruf der Edge Function",nach.aufruf);
 p(nach.body.indexOf("company_id")<0,"ohne company_id – die kommt serverseitig",nach.body);
 p(nach.sichtbar,"die Zugangsdaten erscheinen im Kasten statt in einem alert",nach.sichtbar);
 p(nach.text.indexOf("anna.beispiel")>=0&&nach.text.indexOf("Start-1234")>=0,
   "Benutzername und Startpasswort stehen darin",nach.text);
 p(nach.text.indexOf("Anna Beispiel")>=0,"und für wen sie sind",nach.text.slice(0,60));
 p(/eigenes Passwort/.test(nach.text),"mit dem Hinweis auf das eigene Passwort");
 p(!/alert/.test(page.__dialog||"")&&(page.__dialog||"").indexOf("Start-1234")<0,
   "das Startpasswort steht NICHT mehr in einem alert",page.__dialog);
 const feld=await page.evaluate(()=>({
   readonly:$("zugangText").readOnly, zeilen:Number($("zugangText").rows),
   kopierbar:!!$("zugangKopieren")}));
 p(feld.readonly,"das Feld ist schreibgeschützt – der Text soll nur kopiert werden",feld);
 p(feld.zeilen>=4,"und gross genug, um alles zu sehen",feld);
 // Schliessen leert es - das Startpasswort soll nicht dauerhaft herumstehen
 await klick(page,"#zugangSchliessen");
 const zu=await page.evaluate(()=>({versteckt:$("zugangBox").hidden,text:$("zugangText").value}));
 p(zu.versteckt&&zu.text==="","nach dem Schliessen ist der Text weg",zu);

 // ==========================================================================
 // C · die optionale E-Mail gleich beim Anlegen (v3.148)
 // ==========================================================================
 console.log("\nC · E-Mail beim Anlegen (v3.148)");
 const feldInfo=await page.evaluate(()=>{
  const e=$("neuMitarbeiterEmail");
  return e?{da:true,typ:e.type,pflicht:e.hasAttribute("data-pflicht"),wert:e.value}:{da:false};
 });
 p(feldInfo.da,"das Feld steht im Anlege-Formular",feldInfo);
 p(feldInfo.typ==="email","und ist ein E-Mail-Feld",feldInfo.typ);
 p(feldInfo.pflicht===false,"es ist ausdruecklich KEIN Pflichtfeld",feldInfo);

 // Ein gemeinsamer Helfer, damit jeder Fall gleich anfaengt.
 const anlegen=async(vor,nach,mail)=>{
  await page.evaluate(([v,n,m])=>{
   window.__fn=[]; window.__dialogText="";
   $("neuMitarbeiterVor").value=v; $("neuMitarbeiterNach").value=n;
   $("neuMitarbeiterEmail").value=m;
   $("zugangBox").hidden=true; $("zugangText").value=""; $("zugangMeldung").textContent="";
  },[vor,nach,mail]);
  page.__dialog="";
  await klick(page,"#mitarbeiterAnlegen");
  await page.waitForTimeout(400);
  return page.evaluate(()=>({
   aufrufe:window.__fn.length,
   body:(window.__fn[0]||{}).body||null,
   sichtbar:!$("zugangBox").hidden,
   text:$("zugangText").value,
   meldung:$("zugangMeldung").textContent,
   farbe:$("zugangMeldung").style.color,
   feld:$("neuMitarbeiterEmail").value
  }));
 };

 // 1 · gueltige Adresse, Versand geklappt
 await page.evaluate(()=>{window.__mailGeht=true;window.__fnAntwort=null});
 let c=await anlegen("Anna","Beispiel","  Anna.Beispiel@Firma.CH  ");
 p(c.aufrufe===1&&c.body&&c.body.email==="anna.beispiel@firma.ch",
   "die Adresse geht getrimmt und klein geschrieben an den Server",c.body);
 p(c.body&&c.body.first_name==="Anna"&&c.body.last_name==="Beispiel",
   "zusammen mit Vor- und Nachnamen",c.body);
 p(c.sichtbar&&c.text.indexOf("anna.beispiel@firma.ch")>=0,
   "sie steht im Text zum Weitergeben",c.text);
 p(/Oder mit dieser E-Mail-Adresse/.test(c.text),
   "mit der Ansage, dass die Anmeldung auch damit geht",c.text);
 p(c.text.indexOf("Start-1234")>=0,"das Startpasswort steht weiterhin darin",c.text);
 p(/wurden zusätzlich an anna\.beispiel@firma\.ch gesendet/.test(c.meldung),
   "und darunter steht, dass die Zugangsdaten versendet wurden",c.meldung);
 p(c.feld==="","das Feld ist danach leer - der naechste faengt sauber an",c.feld);

 // 2 · der Versand ist fehlgeschlagen: das muss DRANSTEHEN
 await page.evaluate(()=>{window.__mailGeht=false});
 c=await anlegen("Beat","Muster","beat@firma.ch");
 p(c.sichtbar&&c.text.indexOf("Start-1234")>=0,
   "der Kasten steht trotzdem da - die Daten gehen nicht verloren",c.text.slice(0,80));
 p(/NICHT an beat@firma\.ch gesendet/.test(c.meldung),
   "es steht ausdruecklich da, dass NICHT versendet wurde",c.meldung);
 p(/bitte den Text oben weitergeben/i.test(c.meldung),
   "mit dem Hinweis, was stattdessen zu tun ist",c.meldung);
 p(/red/.test(c.farbe),"und zwar nicht in Gruen",c.farbe);

 // 3 · eine unsinnige Adresse wird gar nicht erst abgeschickt
 await page.evaluate(()=>{window.__mailGeht=true});
 c=await anlegen("Carla","Test","keine-adresse");
 p(c.aufrufe===0,"eine ungueltige Adresse loest KEINEN Aufruf aus",c.aufrufe);
 p(/gültige E-Mail-Adresse/.test(page.__dialog||""),"sondern eine Ansage",page.__dialog);
 p(c.feld==="keine-adresse","das Getippte bleibt stehen zum Verbessern",c.feld);
 p(!c.sichtbar,"und es wird kein Konto vorgegaukelt",c.sichtbar);

 // 4 · der Server sagt Nein (Adresse gehoert schon jemandem)
 await page.evaluate(()=>{window.__fnAntwort={data:{ok:false,
   error:"Diese E-Mail-Adresse ist bereits einem anderen Konto zugeordnet."},error:null}});
 c=await anlegen("Dora","Zweit","anna.beispiel@firma.ch");
 p(c.aufrufe===1,"der Server entscheidet ueber die Eindeutigkeit, nicht die App",c.aufrufe);
 p(/bereits einem anderen Konto/.test(page.__dialog||""),
   "seine Begruendung wird woertlich gezeigt",page.__dialog);
 p(!c.sichtbar,"und kein Kasten mit Zugangsdaten erscheint",c.sichtbar);

 // 5 · Gegenprobe: ohne Adresse ist alles wie vor v3.148
 await page.evaluate(()=>{window.__fnAntwort=null});
 c=await anlegen("Emil","Ohne","");
 p(c.aufrufe===1&&c.body&&c.body.email===undefined,
   "ohne Adresse wird auch keine mitgeschickt",c.body);
 p(c.sichtbar&&!/Oder mit dieser E-Mail-Adresse/.test(c.text),
   "im Text steht dann keine E-Mail-Zeile",c.text);
 p(c.meldung==="","und darunter steht nichts vom Versand",c.meldung);

 p(fehler.length===0,"keine JavaScript-Fehler waehrend des Laufs",fehler.slice(0,3));
 console.log(`\n=== ${ok} ok, ${fail} fehlgeschlagen ===`);
 await b.close(); process.exit(fail?1:0);
})();

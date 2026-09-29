// Prueft die Anmeldung per Fingerabdruck (v3.225).
//
// Wunsch des Anwenders: "Können wir eine anmeldung per fingerabdruck
// einrichten?" - entschieden: Entsperren auf dem Geraet, freiwillig pro
// Person.
//
// WAS HIER GEPRUEFT WIRD:
//   A  Ohne Sensor gibt es KEINEN Knopf und KEINEN Schalter - sondern den
//      Satz, dass das Geraet es nicht kann. Ein Schalter, der nichts tut,
//      waere schlimmer als keiner.
//   B  Einschalten fragt den Sensor richtig (eingebauter Sensor,
//      Finger/Gesicht zwingend) und merkt den Schluessel am BESTEHENDEN
//      Konto-Eintrag - kein zweites Datenmodell.
//   C  Anmelden fragt genau diesen Schluessel ab und stellt danach die
//      gespeicherte Sitzung her - ueber dieselbe Stelle wie der
//      Kontowechsel.
//   D  Der Weg ueber das Passwort steht IMMER da. Auch nach einem
//      Fehlschlag. Ein defekter Sensor darf niemanden aussperren.
//   E  Ausschalten nimmt den Schluessel weg - aber NICHT den Zugang: es
//      ist kein Abmelden.
//   F  Die neue Datei haengt in index.html UND in der App-Huelle in sw.js.
//      Fehlt sie dort, ist sie ohne Verbindung weg.
//
// Ein echter Sensor ist hier nicht zu haben (wie bei der Kamera, siehe
// CLAUDE.md). navigator.credentials und PublicKeyCredential werden deshalb
// nachgestellt - geprueft wird der ABLAUF und das, was die App dem Geraet
// sagt, nicht die Hardware.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-fingerabdruck-v3-225.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

// Der Sensor, nachgestellt. "antwortet" steuert, ob er Ja sagt.
//
// WICHTIG - beim ersten Anlauf genau hier gescheitert: navigator.credentials
// ist ein NUR LESBARER Zugriff auf dem Prototyp. Ein schlichtes
// "navigator.credentials={...}" laeuft still ins Leere, und dann antwortet
// die ECHTE Umsetzung von Chromium - die auf file:// grundsaetzlich ablehnt
// ("only available to HTTPS origins"). Der Ersatz muss deshalb ueber
// Object.defineProperty gesetzt werden, sonst prueft man an der App vorbei.
const SENSOR=`(antwortet)=>{
 window.__ruf={create:null,get:null,setSession:null};
 window.PublicKeyCredential=function(){};
 window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable=async()=>true;
 Object.defineProperty(navigator,"credentials",{configurable:true,writable:true,value:{
  create:async o=>{
   window.__ruf.create=JSON.parse(JSON.stringify(o.publicKey,(k,v)=>
     (v&&v.buffer!==undefined)?"<bytes>":v));
   if(!antwortet){const e=new Error("abgebrochen");e.name="NotAllowedError";throw e}
   return {rawId:new Uint8Array([1,2,3,4]).buffer};
  },
  get:async o=>{
   const a=o.publicKey.allowCredentials&&o.publicKey.allowCredentials[0];
   window.__ruf.get={userVerification:o.publicKey.userVerification,
     id:a?Array.from(new Uint8Array(a.id)):null};
   if(!antwortet){const e=new Error("abgebrochen");e.name="NotAllowedError";throw e}
   return {id:"x"};
  }
 }});
}`;

// Kein Sensor da.
const OHNE_SENSOR=`()=>{ delete window.PublicKeyCredential; }`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);
 let z;

 // Ein angemeldetes Konto und ein gemerkter Zugang - das ist der Boden,
 // auf dem der Fingerabdruck ueberhaupt Sinn hat.
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"L",company_id:"c1",email:"m@x.ch"};
  companyName="PETER KÜNZI AG";
  localStorage.setItem("sd_konten_v1",JSON.stringify([
   {id:"u1",name:"Mike L",firma:"PETER KÜNZI AG",email:"m@x.ch",
    access_token:"AT",refresh_token:"RT",zuletzt:"2026-09-29T06:00:00Z"}]));
  // setSession nachstellen und mitschreiben.
  sb.auth.setSession=async o=>{ window.__ruf&&(window.__ruf.setSession=o); return {error:null} };
  sb.auth.getSession=async()=>({data:{session:{access_token:"AT",refresh_token:"RT",user:{email:"m@x.ch"}}}});
 });

 // ---- A  Ohne Sensor ----------------------------------------------------
 console.log("A · Ohne Sensor gibt es keinen Knopf, der nichts tut");
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await faLoginZeichnen();
  await faEinstellungZeichnen();
  const ein=await faEinschalten();
  return {kastenZu:$("faLoginBox").hidden, einstellung:$("faBox").innerText,
   schalter:$("faBox").querySelectorAll("[data-fa-an]").length,
   einOk:ein.ok, einMeldung:ein.meldung,
   gespeichert:JSON.parse(localStorage.getItem("sd_konten_v1"))[0].webauthn||null};
 },OHNE_SENSOR);
 p(z.kastenZu===true,"A1 auf dem Anmeldebildschirm erscheint kein Fingerabdruck-Knopf",z);
 p(z.schalter===0&&/kein/i.test(z.einstellung),
   "A2 in den Einstellungen steht, dass das Gerät es nicht kann - statt eines Schalters",z);
 p(z.einOk===false&&/Sensor/i.test(z.einMeldung||""),
   "A3 GEGENPROBE: ein trotzdem erzwungenes Einschalten nennt den Grund, statt still zu scheitern",z);
 p(z.gespeichert===null,"A4 und es wird nichts gespeichert",z);

 // ---- B  Einschalten ----------------------------------------------------
 console.log("\nB · Einschalten");
 z=await page.evaluate(async(f)=>{
  eval("("+f+")(true)");
  const r=await faEinschalten();
  const liste=JSON.parse(localStorage.getItem("sd_konten_v1"));
  return {ok:r.ok, meldung:r.meldung, ruf:window.__ruf.create,
   eintraege:liste.length, schluessel:liste[0].webauthn||null,
   tokenNochDa:liste[0].refresh_token, an:faAn()};
 },SENSOR);
 p(z.ok===true,"B1 der Sensor wird gefragt und das Einschalten gelingt",z);
 p(z.ruf&&z.ruf.authenticatorSelection&&z.ruf.authenticatorSelection.authenticatorAttachment==="platform",
   "B2 verlangt wird der EINGEBAUTE Sensor des Geräts - kein angesteckter Stick",z);
 p(z.ruf&&z.ruf.authenticatorSelection&&z.ruf.authenticatorSelection.userVerification==="required",
   "B3 und zwingend Finger/Gesicht - blosses Wegtippen zählt nicht",z);
 p(!!z.schluessel,"B4 der Schlüssel wird gemerkt",z);
 p(z.eintraege===1&&z.tokenNochDa==="RT",
   "B5 und zwar am BESTEHENDEN Konto-Eintrag - kein zweiter Eintrag, kein zweites Datenmodell",z);
 p(z.an===true,"B6 danach gilt der Fingerabdruck für dieses Konto als eingeschaltet",z);

 // Gegenprobe: am Sensor abgebrochen -> nichts wird gemerkt.
 z=await page.evaluate(async(f)=>{
  const vorher=JSON.parse(localStorage.getItem("sd_konten_v1"))[0].webauthn;
  faAusschalten("u1");
  eval("("+f+")(false)");
  const r=await faEinschalten();
  const nachher=JSON.parse(localStorage.getItem("sd_konten_v1"))[0].webauthn||null;
  return {vorher:!!vorher, ok:r.ok, meldung:r.meldung, nachher};
 },SENSOR);
 p(z.ok===false&&/bgebrochen/.test(z.meldung||""),
   "B7 GEGENPROBE: wird am Sensor abgebrochen, sagt die App das",z);
 p(z.nachher===null,"B8 GEGENPROBE: und merkt sich KEINEN Schlüssel",z);

 // ---- C  Anmelden -------------------------------------------------------
 console.log("\nC · Anmelden");
 z=await page.evaluate(async(f)=>{
  eval("("+f+")(true)");
  await faEinschalten();                 // Schluessel wieder anlegen
  window.__ruf.setSession=null;
  await faLoginZeichnen();
  const knopf=$("faLoginKnopf");
  const r=await faAnmelden("u1");
  return {ok:r.ok, kastenDa:!$("faLoginBox").hidden, text:knopf.textContent,
   get:window.__ruf.get, setSession:window.__ruf.setSession};
 },SENSOR);
 p(z.kastenDa===true&&/Mike L/.test(z.text)&&/Fingerabdruck/.test(z.text),
   "C1 der Knopf steht mit dem Namen des gemerkten Kontos da",z);
 p(z.get&&z.get.userVerification==="required",
   "C2 beim Anmelden wird wieder zwingend Finger/Gesicht verlangt",z);
 p(z.get&&JSON.stringify(z.get.id)===JSON.stringify([1,2,3,4]),
   "C3 und GENAU der beim Einrichten gemerkte Schlüssel abgefragt - kein beliebiger",z);
 p(z.ok===true&&z.setSession&&z.setSession.refresh_token==="RT",
   "C4 danach wird die gespeicherte Sitzung gesetzt - über dieselbe Stelle wie der Kontowechsel",z);

 // Gegenprobe: Finger verweigert -> keine Sitzung, Meldung steht.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")(false)");
  window.__ruf.setSession=null;
  const r=await faAnmelden("u1");
  return {ok:r.ok, meldung:r.meldung, setSession:window.__ruf.setSession,
   schluesselNochDa:!!JSON.parse(localStorage.getItem("sd_konten_v1"))[0].webauthn};
 },SENSOR);
 p(z.ok===false&&z.setSession===null,
   "C5 GEGENPROBE: ohne bestätigten Finger wird KEINE Sitzung gesetzt",z);
 p(/bgebrochen|Passwort/.test(z.meldung||""),"C6 und es steht da, wie es weitergeht",z);
 p(z.schluesselNochDa===true,
   "C7 GEGENPROBE: ein verweigerter Finger wirft den Schlüssel nicht weg - beim nächsten Mal geht es wieder",z);

 // Gegenprobe: der gespeicherte Zugang gilt nicht mehr.
 z=await page.evaluate(async(f)=>{
  eval("("+f+")(true)");
  sb.auth.setSession=async()=>({error:{message:"Invalid Refresh Token"}});
  const r=await faAnmelden("u1");
  const liste=JSON.parse(localStorage.getItem("sd_konten_v1"));
  await faLoginZeichnen();
  sb.auth.setSession=async o=>{ window.__ruf.setSession=o; return {error:null} };
  return {ok:r.ok, meldung:r.meldung, eintraege:liste.length, kastenZu:$("faLoginBox").hidden};
 },SENSOR);
 p(z.ok===false&&/normal anmelden/.test(z.meldung||""),
   "C8 GEGENPROBE: gilt der gespeicherte Zugang nicht mehr, sagt die App das und verweist aufs Passwort",z);
 p(z.eintraege===0,"C9 der tote Zugang wird entfernt, statt morgen wieder zu scheitern",z);
 p(z.kastenZu===true,"C10 und der Knopf verschwindet mit ihm - kein Knopf ohne Zugang",z);

 // ---- D  Der Weg ueber das Passwort -------------------------------------
 console.log("\nD · Der Weg über das Passwort bleibt");
 z=await page.evaluate(async(f)=>{
  // Wieder einrichten, damit der Fingerabdruck-Kasten da ist.
  localStorage.setItem("sd_konten_v1",JSON.stringify([
   {id:"u1",name:"Mike L",firma:"X",access_token:"AT",refresh_token:"RT"}]));
  eval("("+f+")(true)");
  await faEinschalten();
  await faLoginZeichnen();
  const sicht=el=>!!(el&&!el.hidden&&el.getClientRects().length);
  const mit={user:sicht($("loginUser")),pass:sicht($("loginPass")),knopf:sicht($("loginBtn")),
             fa:sicht($("faLoginBox"))};
  eval("("+f+")(false)");
  await faAnmelden("u1");
  const nachFehler={user:sicht($("loginUser")),pass:sicht($("loginPass")),knopf:sicht($("loginBtn"))};
  return {mit,nachFehler};
 },SENSOR);
 p(z.mit.fa===true&&z.mit.user&&z.mit.pass&&z.mit.knopf,
   "D1 mit eingerichtetem Fingerabdruck stehen Benutzername, Passwort und Anmelden-Knopf trotzdem da",z);
 p(z.nachFehler.user&&z.nachFehler.pass&&z.nachFehler.knopf,
   "D2 GEGENPROBE: auch nach einem gescheiterten Fingerabdruck sind sie noch da - niemand wird ausgesperrt",z);

 // ---- E  Ausschalten ----------------------------------------------------
 console.log("\nE · Ausschalten");
 z=await page.evaluate(()=>{
  const r=faAusschalten("u1");
  const liste=JSON.parse(localStorage.getItem("sd_konten_v1"));
  return {ok:r.ok, schluessel:liste[0].webauthn||null, token:liste[0].refresh_token,
   eintraege:liste.length, an:faAn()};
 });
 p(z.ok===true&&z.schluessel===null&&z.an===false,"E1 der Schlüssel ist weg",z);
 p(z.eintraege===1&&z.token==="RT",
   "E2 GEGENPROBE: der gespeicherte Zugang bleibt - Ausschalten ist kein Abmelden",z);

 // ---- F  Die Datei haengt wirklich drin ---------------------------------
 console.log("\nF · Die neue Datei hängt in der App");
 const html=fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8");
 const sw=fs.readFileSync(path.join(process.cwd(),"sw.js"),"utf8");
 p(/<script src="js\/81-fingerabdruck\.js"><\/script>/.test(html),
   "F1 js/81-fingerabdruck.js ist in index.html eingehängt",null);
 p(/"\.\/js\/81-fingerabdruck\.js"/.test(sw),
   "F2 und in der App-Hülle in sw.js - ohne diesen Eintrag wäre sie ohne Verbindung weg",null);

 p(fehler.length===0,"G1 keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();

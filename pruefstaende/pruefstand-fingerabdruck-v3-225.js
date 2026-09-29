// Prueft den Fingerabdruck (v3.225, in v3.226 vom "Anmelden" zum SCHLOSS
// umgebaut).
//
// WARUM DIESER PRUEFSTAND UMGESCHRIEBEN WURDE, statt gelesen zu bleiben:
// v3.225 prueffte einen Ablauf, den der Anwender dann nicht benutzen konnte
// ("Ich kann den fingerabdruck zwar aktivieren, aber wenn ich mich das erste
// mal so anmelden will, passiert nichts und er ist wieder deaktiviert").
// Die alten Faelle C4/C8/C9/C10 verlangten genau das, was der Fehler war:
// dass der Fingerabdruck eine gespeicherte Sitzung SETZT und den Zugang
// wegraeumt, wenn das misslingt. Abmelden (sb.auth.signOut, js/03) macht
// diesen Zugang aber ungueltig - und weil die App eine vorhandene Sitzung
// beim Start selbst wiederherstellt (js/18), erscheint der
// Anmeldebildschirm ueberhaupt nur dann, wenn nichts mehr herzustellen ist.
// Der geprueffte Ablauf konnte also nie funktionieren.
//
// Sie sind deshalb nicht geloescht, sondern auf den heutigen Vertrag
// gedreht - jeweils mit einer GEGENPROBE, die das alte Verhalten von
// jetzt an rot macht (C6, C7, H1).
//
// WAS HIER GEPRUEFT WIRD:
//   A  Ohne Sensor gibt es KEINEN Schalter - sondern den Satz, dass das
//      Geraet es nicht kann. Und auf dem Anmeldebildschirm gibt es
//      ueberhaupt keinen Fingerabdruck-Knopf mehr (er konnte dort nie
//      funktionieren).
//   B  Einschalten fragt den Sensor richtig (eingebauter Sensor,
//      Finger/Gesicht zwingend) und merkt den Schluessel am BESTEHENDEN
//      Konto-Eintrag - kein zweites Datenmodell.
//   C  Das Schloss: bei laufender Sitzung kommt es VOR die App, fragt genau
//      den gemerkten Schluessel ab und oeffnet erst dann. Es setzt dabei
//      KEINE Sitzung - deshalb kann auch kein Token dabei veralten.
//   D  Der Weg ueber das Passwort steht IMMER da, auch nach einem
//      Fehlschlag, und die Meldung dazu ist sichtbar.
//   E  Ausschalten nimmt den Schluessel weg - aber NICHT den Zugang.
//   F  Die Datei haengt in index.html UND in der App-Huelle in sw.js, und
//      der Sperrbildschirm ist fuer die Zurueck-Taste kein Schirm.
//   G  kwMerken() (js/76) behaelt den Schluessel bei der naechsten
//      Anmeldung.
//   H  Abmelden vom Sperrbildschirm meldet wirklich ab - und laesst den
//      Fingerabdruck eingerichtet.
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

// Die laufende Sitzung, wie js/18 sie an faSperreZeigen() weitergibt.
const SITZUNG={access_token:"AT",refresh_token:"RT",user:{id:"u1",email:"m@x.ch"}};

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
 const BODEN=()=>page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"L",company_id:"c1",email:"m@x.ch"};
  companyName="PETER KÜNZI AG";
  localStorage.setItem("sd_konten_v1",JSON.stringify([
   {id:"u1",name:"Mike L",firma:"PETER KÜNZI AG",email:"m@x.ch",
    access_token:"AT",refresh_token:"RT",zuletzt:"2026-09-29T06:00:00Z"}]));
  // setSession nachstellen und mitschreiben: ob sie gerufen wird, ist
  // hier eine ECHTE Frage - sie darf es naemlich nicht mehr.
  sb.auth.setSession=async o=>{ window.__ruf&&(window.__ruf.setSession=o); return {error:null} };
  sb.auth.getSession=async()=>({data:{session:{access_token:"AT",refresh_token:"RT",user:{id:"u1",email:"m@x.ch"}}}});
  // afterLogin() baut die ganze App auf und redet mit der Datenbank - hier
  // zaehlen wir nur, OB das Schloss sie freigibt.
  window.__auf=0;
  window.afterLogin=async()=>{ window.__auf++; if($("appRoot"))$("appRoot").hidden=false; };
 });
 await BODEN();

 // ---- A  Ohne Sensor ----------------------------------------------------
 console.log("A · Ohne Sensor gibt es keinen Schalter, der nichts tut");
 z=await page.evaluate(async(f)=>{
  eval("("+f+")()");
  await faEinstellungZeichnen();
  const ein=await faEinschalten();
  return {einstellung:$("faBox").innerText,
   schalter:$("faBox").querySelectorAll("[data-fa-an]").length,
   einOk:ein.ok, einMeldung:ein.meldung,
   knoepfeAmLogin:document.querySelectorAll("#authScreen [data-fa-entsperren],#authScreen [data-fa-konto]").length,
   gespeichert:JSON.parse(localStorage.getItem("sd_konten_v1"))[0].webauthn||null};
 },OHNE_SENSOR);
 p(z.schalter===0&&/kein/i.test(z.einstellung),
   "A1 in den Einstellungen steht, dass das Gerät es nicht kann - statt eines Schalters",z);
 p(z.einOk===false&&/Sensor/i.test(z.einMeldung||""),
   "A2 GEGENPROBE: ein trotzdem erzwungenes Einschalten nennt den Grund, statt still zu scheitern",z);
 p(z.gespeichert===null,"A3 und es wird nichts gespeichert",z);
 p(z.knoepfeAmLogin===0,
   "A4 auf dem Anmeldebildschirm steht KEIN Fingerabdruck-Knopf - dort gibt es nach dem Abmelden nichts zu entsperren (v3.226)",z);

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

 // ---- C  Das Schloss ----------------------------------------------------
 console.log("\nC · Das Schloss vor der laufenden Sitzung");
 z=await page.evaluate(async([f,s])=>{
  eval("("+f+")(true)");
  await faEinschalten();                 // Schluessel wieder anlegen
  window.__ruf.setSession=null; window.__auf=0;
  $("appRoot").hidden=false;             // die App waere jetzt offen
  const genommen=await faSperreZeigen(s);
  const sicht=el=>!!(el&&!el.hidden&&el.getClientRects().length);
  return {genommen, sperreDa:sicht($("faSperrScreen")), appZu:$("appRoot").hidden,
   name:$("faSperrName").textContent, auf:window.__auf};
 },[SENSOR,SITZUNG]);
 p(z.genommen===true&&z.sperreDa===true,
   "C1 bei laufender Sitzung kommt das Schloss VOR die App",z);
 p(z.appZu===true&&z.auf===0,
   "C2 und die App bleibt zu, bis entsperrt wurde",z);
 p(/Mike L/.test(z.name)&&/PETER/.test(z.name),
   "C3 der Sperrbildschirm sagt, wessen Konto er festhält",z);

 z=await page.evaluate(async()=>{
  window.__ruf.get=null; window.__ruf.setSession=null; window.__auf=0;
  $("faSperrKnopf").click();
  await new Promise(r=>setTimeout(r,200));
  const sicht=el=>!!(el&&!el.hidden&&el.getClientRects().length);
  return {get:window.__ruf.get, setSession:window.__ruf.setSession, auf:window.__auf,
   sperreDa:sicht($("faSperrScreen")), appDa:sicht($("appRoot"))};
 });
 p(z.get&&z.get.userVerification==="required",
   "C4 beim Entsperren wird zwingend Finger/Gesicht verlangt",z);
 p(z.get&&JSON.stringify(z.get.id)===JSON.stringify([1,2,3,4]),
   "C5 und GENAU der beim Einrichten gemerkte Schlüssel abgefragt - kein beliebiger",z);
 p(z.auf===1&&z.sperreDa===false&&z.appDa===true,
   "C6 danach geht die App auf",z);
 p(z.setSession===null,
   "C7 GEGENPROBE (der gemeldete Fehler): dabei wird KEINE Sitzung gesetzt. "
  +"Genau das tat v3.225 - und weil Abmelden den gespeicherten Zugang ungültig macht, "
  +"scheiterte es und nahm den Schlüssel mit",z);

 // Gegenprobe zum Kern des gemeldeten Fehlers: selbst wenn der gespeicherte
 // Zugang tot ist, muss das Schloss aufgehen und der Schluessel bleiben.
 z=await page.evaluate(async([f,s])=>{
  eval("("+f+")(true)");
  sb.auth.setSession=async()=>({error:{message:"Invalid Refresh Token"}});
  window.__auf=0;
  await faSperreZeigen(s);
  $("faSperrKnopf").click();
  await new Promise(r=>setTimeout(r,200));
  const liste=JSON.parse(localStorage.getItem("sd_konten_v1"));
  sb.auth.setSession=async o=>{ window.__ruf.setSession=o; return {error:null} };
  return {auf:window.__auf, eintraege:liste.length, schluessel:liste[0]&&liste[0].webauthn||null};
 },[SENSOR,SITZUNG]);
 p(z.auf===1,
   "C8 GEGENPROBE: ein toter refresh_token hindert das Entsperren nicht mehr - das Schloss fragt nur den Sensor",z);
 p(z.eintraege===1&&!!z.schluessel,
   "C9 GEGENPROBE: und der Fingerabdruck bleibt eingerichtet, statt sich selbst abzuschalten",z);

 // Ohne Schluessel fuer dieses Konto: gar kein Schloss.
 z=await page.evaluate(async(s)=>{
  const liste=JSON.parse(localStorage.getItem("sd_konten_v1"));
  const merk=liste[0].webauthn; delete liste[0].webauthn;
  localStorage.setItem("sd_konten_v1",JSON.stringify(liste));
  $("faSperrScreen").hidden=true;
  const genommen=await faSperreZeigen(s);
  liste[0].webauthn=merk; localStorage.setItem("sd_konten_v1",JSON.stringify(liste));
  return {genommen, sperreDa:!$("faSperrScreen").hidden};
 },SITZUNG);
 p(z.genommen===false&&z.sperreDa===false,
   "C10 GEGENPROBE: ohne eingerichteten Fingerabdruck sperrt nichts - die App geht auf wie bisher",z);

 // ---- D  Fehlschlag und der Weg ueber das Passwort ----------------------
 console.log("\nD · Fehlschlag sagt warum, das Passwort bleibt");
 z=await page.evaluate(async([f,s])=>{
  eval("("+f+")(false)");
  window.__auf=0;
  await faSperreZeigen(s);
  $("faSperrKnopf").click();
  await new Promise(r=>setTimeout(r,200));
  const sicht=el=>!!(el&&!el.hidden&&el.getClientRects().length);
  return {meldung:$("faSperrMeldung").textContent,
   meldungSichtbar:sicht($("faSperrMeldung")),
   sperreDa:sicht($("faSperrScreen")), auf:window.__auf,
   passwortWeg:sicht($("faSperrPasswort")),
   schluessel:!!JSON.parse(localStorage.getItem("sd_konten_v1"))[0].webauthn};
 },[SENSOR,SITZUNG]);
 p(z.meldungSichtbar===true&&/bgebrochen|Passwort/.test(z.meldung||""),
   "D1 GEGENPROBE (der gemeldete Fehler): der Fehlschlag steht SICHTBAR da. "
  +"In v3.225 blendete das Neuzeichnen die Meldung mitsamt ihrem Kasten aus - "
  +"sichtbar blieb nichts, und das hiess \"es passiert nichts\"",z);
 p(z.sperreDa===true&&z.auf===0,
   "D2 ein verweigerter Finger öffnet die App NICHT",z);
 p(z.schluessel===true,
   "D3 wirft aber auch den Schlüssel nicht weg - beim nächsten Mal geht es wieder",z);
 p(z.passwortWeg===true,
   "D4 und der Weg über das Passwort steht daneben - ein toter Sensor sperrt niemanden aus seiner eigenen App",z);

 z=await page.evaluate(()=>{
  const sicht=el=>!!(el&&!el.hidden&&el.getClientRects().length);
  $("faSperrScreen").hidden=true; $("appRoot").hidden=true; $("authScreen").hidden=false;
  faLoginHinweisZeichnen();
  return {user:sicht($("loginUser")),pass:sicht($("loginPass")),knopf:sicht($("loginBtn")),
    hinweis:sicht($("faLoginHinweis")), hinweisText:$("faLoginHinweis").textContent};
 });
 p(z.user&&z.pass&&z.knopf,
   "D5 auf dem Anmeldebildschirm stehen Benutzername, Passwort und Anmelden-Knopf",z);
 p(z.hinweis===true&&/Passwort/.test(z.hinweisText),
   "D6 und der Satz, der die Frage beantwortet, die man sich sonst stellt: nach dem Abmelden braucht es einmal das Passwort",z);

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

 // ---- F  Verdrahtung ----------------------------------------------------
 console.log("\nF · Die Datei und der Bildschirm hängen richtig in der App");
 const html=fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8");
 const sw=fs.readFileSync(path.join(process.cwd(),"sw.js"),"utf8");
 const zur=fs.readFileSync(path.join(process.cwd(),"js/54-zurueck.js"),"utf8");
 p(/<script src="js\/81-fingerabdruck\.js"><\/script>/.test(html),
   "F1 js/81-fingerabdruck.js ist in index.html eingehängt",null);
 p(/"\.\/js\/81-fingerabdruck\.js"/.test(sw),
   "F2 und in der App-Hülle in sw.js - ohne diesen Eintrag wäre sie ohne Verbindung weg",null);
 p(/id="faSperrScreen"/.test(html),"F3 der Sperrbildschirm steht in index.html",null);
 p(/const ZURUECK_NICHT=\[[^\]]*"faSperrScreen"/.test(zur),
   "F4 GEGENPROBE: für die Zurück-Taste ist der Sperrbildschirm KEIN Schirm. "
  +"Er trägt .modal - ohne diesen Eintrag hätte ein Tippen auf Zurück das Schloss weggeschoben",null);
 // Und die Gegenprobe dazu im laufenden Browser.
 z=await page.evaluate(()=>({ kandidat:zurueckKandidaten().some(e=>e.id==="faSperrScreen") }));
 p(z.kandidat===false,"F5 und der Stapel der Zurück-Taste enthält ihn auch wirklich nicht",z);

 // ---- G  Der Schluessel überlebt die nächste Anmeldung ------------------
 console.log("\nG · kwMerken() behält den Schlüssel");
 z=await page.evaluate(async()=>{
  localStorage.setItem("sd_konten_v1",JSON.stringify([
   {id:"u1",name:"alt",firma:"alt",access_token:"alt",refresh_token:"alt",webauthn:"SCHLUESSEL"}]));
  sb.auth.getSession=async()=>({data:{session:{access_token:"NEU",refresh_token:"NEU",user:{id:"u1",email:"m@x.ch"}}}});
  await kwMerken();
  const e=JSON.parse(localStorage.getItem("sd_konten_v1"))[0];
  return {webauthn:e.webauthn||null, token:e.refresh_token, name:e.name};
 });
 p(z.webauthn==="SCHLUESSEL",
   "G1 GEGENPROBE: eine Anmeldung mit dem Passwort behält den Fingerabdruck. "
  +"Bis v3.225 ersetzte kwMerken() den ganzen Eintrag und warf ihn still weg",z);
 p(z.token==="NEU"&&z.name==="Mike L",
   "G2 die frischen Angaben gewinnen trotzdem - gemischt wird, nicht angehängt",z);

 // ---- J  Wo der Schalter steht (v3.227) ---------------------------------
 // Ansage des Anwenders: "Die funktion konto wechseln soll es nur fuer mich
 // als firmenadmin geben, daher muss die fingerabdruck einstellung einen
 // anderen platz haben." Bis v3.226 stand der Schalter im
 // Kontowechsel-Dialog - dort waere er fuer die Mitarbeitenden mit dieser
 // Einschraenkung verschwunden, obwohl er ausdruecklich jedem einzeln
 // offensteht.
 console.log("\nJ · Der Schalter steht jetzt an seinem eigenen Platz");
 const htmlJ=fs.readFileSync(path.join(process.cwd(),"index.html"),"utf8");
 p(/id="faModal"/.test(htmlJ),"J1 es gibt einen eigenen Dialog #faModal",null);
 z=await page.evaluate(()=>{
  const box=$("faBox");
  return {inFaModal:!!(box&&box.closest("#faModal")),
          inKonten:!!(box&&box.closest("#kontenModal"))};
 });
 p(z.inFaModal===true&&z.inKonten===false,
   "J2 GEGENPROBE: der Schalter haengt nicht mehr am Kontowechsel-Dialog",z);

 // Ein MITARBEITER (kein Firmenadministrator) - der entscheidende Fall.
 z=await page.evaluate(async()=>{
  const merk=currentProfile;
  currentProfile={id:"u1",role:"mitarbeiter",first_name:"Hans",last_name:"M",company_id:"c1"};
  const mehr=(typeof a2SeiteMehr==="function")?a2SeiteMehr():"";
  $("faModal").hidden=true; $("kontenModal").hidden=true;
  faDialogOeffnen();
  const faAuf=!$("faModal").hidden;
  kwOeffnen();                       // darf sich gar nicht oeffnen
  const kontenAuf=!$("kontenModal").hidden;
  currentProfile=merk;
  return {fa:/data-a2-tu="fingerabdruck"/.test(mehr),
          konten:/data-a2-tu="konten"/.test(mehr),
          faAuf, kontenAuf, box:$("faBox").innerHTML.length>0};
 });
 p(z.fa===true,"J3 ein Mitarbeiter findet den Fingerabdruck unter Mehr",z);
 p(z.faAuf===true&&z.box===true,"J4 und der Dialog geht auf und ist gezeichnet",z);
 p(z.konten===false,
   "J5 GEGENPROBE: 'Konto wechseln' steht fuer ihn NICHT da - genau deshalb musste der Fingerabdruck umziehen",z);
 p(z.kontenAuf===false,
   "J6 GEGENPROBE: und der Dialog geht auch dann nicht auf, wenn man kwOeffnen() direkt ruft - ein ausgeblendeter Eintrag allein waere keine Zustaendigkeit",z);

 // Und beim Firmenadministrator steht beides da.
 z=await page.evaluate(()=>{
  const merk=currentProfile;
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"L",company_id:"c1"};
  const mehr=(typeof a2SeiteMehr==="function")?a2SeiteMehr():"";
  $("kontenModal").hidden=true;
  kwOeffnen();
  const auf=!$("kontenModal").hidden;
  $("kontenModal").hidden=true;
  currentProfile=merk;
  return {fa:/data-a2-tu="fingerabdruck"/.test(mehr),
          konten:/data-a2-tu="konten"/.test(mehr), auf};
 });
 p(z.konten===true&&z.auf===true,
   "J7 GEGENPROBE: der Firmenadministrator hat 'Konto wechseln' unveraendert",z);
 p(z.fa===true,"J8 und den Fingerabdruck ebenso",z);

 // ---- H  Abmelden vom Sperrbildschirm -----------------------------------
 // Bewusst als LETZTES: location.reload() lässt sich nicht nachstellen, der
 // Test läuft hier also in ein echtes Neuladen der Seite hinein.
 console.log("\nH · Abmelden vom Sperrbildschirm");
 await page.evaluate(()=>{
  sb.auth.signOut=async()=>{ localStorage.setItem("__signout","1"); return {error:null} };
  const l=JSON.parse(localStorage.getItem("sd_konten_v1"));
  l[0].webauthn="SCHLUESSEL"; localStorage.setItem("sd_konten_v1",JSON.stringify(l));
  localStorage.removeItem("__signout");
  $("faSperrScreen").hidden=false;
  $("faSperrPasswort").click();
 });
 await page.waitForTimeout(900);
 z=await page.evaluate(()=>({
  abgemeldet:localStorage.getItem("__signout")==="1",
  schluessel:(JSON.parse(localStorage.getItem("sd_konten_v1")||"[]")[0]||{}).webauthn||null}));
 p(z.abgemeldet===true,"H1 der Knopf meldet wirklich ab - er blendet das Schloss nicht bloss weg",z);
 p(z.schluessel==="SCHLUESSEL",
   "H2 GEGENPROBE: der Fingerabdruck bleibt dabei eingerichtet und sperrt nach der nächsten Anmeldung wieder",z);

 p(fehler.length===0,"I1 keine JavaScript-Fehler",fehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();

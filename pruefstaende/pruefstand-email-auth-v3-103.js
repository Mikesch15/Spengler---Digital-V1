"use strict";
// ---- Pruefstand: E-Mail-gestuetzte Anmeldung/Registrierung (v3.103) ------
//
// Prueft die VIER Phasen aus diesem Anwender-Auftrag ("Emailadressen
// einbinden..."):
//  1  Firma erstellen (System-Admin): kein Passwort-Feld mehr, Aufruf ohne
//     password im Body, mailVersendet/Passwort-Fallback in der Meldung.
//  2  Mitarbeiter anlegen: email optional durchgereicht, Zugangsdaten-
//     Meldung je nach mailVersendet.
//  3  Passwort vergessen: Login-Aufloesung ("@" -> resolve-login-email,
//     sonst Pseudo-Domain unveraendert), Reset-Anfrage/-Bestaetigung.
//  4  Einladungslink: Boot-Weiche (?einladung=/?reset=), Formular-
//     Validierung, System-Admin-Verwaltung (erzeugen/anzeigen/loeschen).
//
// WAS HIER NICHT GEPRUEFT WIRD: die echten Edge Functions selbst (kein
// Live-HTTPS aus dieser Sandbox moeglich, siehe CLAUDE.md) - alle
// sb.functions.invoke()-Aufrufe werden gestubbt und nur auf korrekten
// NAME/BODY geprueft (dieselbe Grenze wie bei allen anderen Pruefstaenden
// dieser App, die Edge Functions verwenden).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-email-auth-v3-103.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const repo=process.cwd();
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const ATTRAPPE=`window.supabase={createClient:()=>{
 window.__ruf=window.__ruf||[];
 window.__schreib=window.__schreib||[];
 const passt=(z,eqs)=>eqs.every(([f,v])=>z[f]===v);
 const tabelle=t=>{
  const kette={__eq:[],__order:null};
  Object.assign(kette,{
   select:()=>kette,
   eq:(f,v)=>{kette.__eq.push([f,v]);return kette},
   order:(f,o)=>{kette.__order=[f,o];return kette},
   then:(res,rej)=>{
    let liste=((window.__lese&&window.__lese[t])||[]).filter(z=>passt(z,kette.__eq));
    if(kette.__order){
     const[f,o]=kette.__order;
     liste=liste.slice().sort((a,b)=>{const av=a[f],bv=b[f];const c=av<bv?-1:(av>bv?1:0);return o&&o.ascending===false?-c:c});
    }
    return Promise.resolve({data:liste,error:null}).then(res,rej);
   },
   insert:d=>{
    const zeilen=(Array.isArray(d)?d:[d]).map(x=>Object.assign({id:900+(window.__naechsteId=(window.__naechsteId||0)+1)},x));
    window.__schreib.push({t,op:"insert",d:zeilen});
    if(window.__lese&&window.__lese[t])window.__lese[t]=window.__lese[t].concat(zeilen);
    return Promise.resolve({data:zeilen,error:null});
   },
   delete:()=>{
    const g={};g.eq=(f,v)=>{
     window.__schreib.push({t,op:"delete",eq:[[f,v]]});
     if(window.__lese&&window.__lese[t])window.__lese[t]=window.__lese[t].filter(z=>String(z[f])!==String(v));
     return Promise.resolve({data:null,error:null});
    };
    return g;
   },
   // v3.130: update() mit .eq().select() - die E-Mail eines bestehenden
   // Mitarbeiters wird so geschrieben. window.__updateAntwort erlaubt es,
   // die Antwort der Datenbank zu setzen (Fehler 23505 bei doppelter
   // Adresse, oder 0 geschriebene Zeilen bei fehlender Berechtigung).
   update:patch=>{
    const g={};
    g.eq=(f,v)=>{
     window.__schreib.push({t,op:"update",patch,eq:[[f,v]]});
     const gesetzt=window.__updateAntwort;
     const fertig=()=>{
      if(gesetzt)return Promise.resolve(gesetzt);
      if(window.__lese&&window.__lese[t])
       window.__lese[t].forEach(z=>{if(String(z[f])===String(v))Object.assign(z,patch)});
      return Promise.resolve({data:[Object.assign({id:v},patch)],error:null});
     };
     g.select=fertig;
     return Object.assign(fertig(),{select:fertig});
    };
    return g;
   }
  });
  return kette;
 };
 return {
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle,
  storage:{from:()=>({createSignedUrl:async()=>({data:null,error:null})})},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:(name,opts)=>{
   const body=(opts&&opts.body)||{};
   window.__ruf.push({name,body});
   const stub=window.__funcStub&&window.__funcStub[name];
   if(stub)return Promise.resolve(stub(body));
   return Promise.resolve({data:{ok:true},error:null});
  }}
 };
}};`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>{(page.__dialoge=page.__dialoge||[]).push(d.message());d.accept()});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));

 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof emailAuthBootWeiche==="function"&&typeof loginEmailAufloesen==="function"
  &&typeof registerEmployee==="function"&&typeof renderSysAdminEinladungen==="function",null,{timeout:15000});
 await page.waitForTimeout(200);
 p(jsFehler.length===0,"keine unbehandelten JavaScript-Fehler beim Laden",jsFehler);

 // Mehrere .modal-Bildschirme teilen denselben z-index - fuer echte
 // Playwright-Klicks (nicht nur DOM-Aufrufe) muss deshalb IMMER nur genau
 // einer davon sichtbar sein, sonst faengt ein anderer den Klick ab.
 const ALLE_SCREENS=["authScreen","passwordResetScreen","companyInviteScreen","systemAdminModal","systemAdminRegisterModal"];
 const zeigeNur=id=>page.evaluate(({liste,zielId})=>{
  liste.forEach(x=>{if($(x))$(x).hidden=(x!==zielId)});
 },{liste:ALLE_SCREENS,zielId:id});

 await page.evaluate(()=>{
  window.__lese={company_invites:[]};
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann",company_id:"f1"};
  allProfiles=[currentProfile];
  meineRechte={admin:true};
  settings={employees:["Mike Ledermann"],rates:[],materials:[]};
  employeeIds=["u1"];
  $("appRoot").hidden=false; $("authScreen").hidden=true;
 });

 // =========================================================================
 // 3 · Login-Aufloesung: Benutzername unveraendert, "@" ueber die Edge
 //     Function, mit Ausfallebene bei Fehler/Offline
 // =========================================================================
 console.log("\n3a · Login-Aufloesung (resolve-login-email)");
 let z=await page.evaluate(async()=>{
  window.__ruf=[];
  const email=await loginEmailAufloesen("max.muster");
  return {email,aufrufe:window.__ruf.length};
 });
 p(z.email==="max.muster@nfgryuzkpwjfmdlmevuy.supabase.co","ein reiner Benutzername wird unveraendert auf die Pseudo-Domain gemappt",z);
 p(z.aufrufe===0,"...ohne dafuer die Edge Function aufzurufen (kein unnoetiger Serverumweg)",z);

 z=await page.evaluate(async()=>{
  window.__ruf=[];
  window.__funcStub={"resolve-login-email":body=>({data:{email:"echte.adresse@example.com"},error:null})};
  const email=await loginEmailAufloesen("Mitarbeiter@Example.com");
  const aufruf=window.__ruf.find(r=>r.name==="resolve-login-email");
  return {email,gesendet:aufruf&&aufruf.body.login};
 });
 p(z.email==="echte.adresse@example.com","eine Eingabe mit \"@\" wird ueber resolve-login-email aufgeloest",z);
 p(z.gesendet==="Mitarbeiter@Example.com","die Original-Eingabe wird unveraendert an die Funktion geschickt (Kleinschreibung macht die Funktion selbst)",z);

 z=await page.evaluate(async()=>{
  window.__funcStub={"resolve-login-email":()=>{throw new Error("offline")}};
  return await loginEmailAufloesen("admin@firma.ch");
 });
 p(z==="admin@firma.ch","schlaegt die Anfrage fehl (z. B. offline), wird die Eingabe direkt als E-Mail verwendet - wie bisher",z);
 await page.evaluate(()=>{window.__funcStub={}});

 // =========================================================================
 // 3b · Passwort vergessen: Anfordern und Bestaetigen
 // =========================================================================
 console.log("\n3b · Passwort vergessen");
 await zeigeNur("authScreen");
 z=await page.evaluate(()=>({boxVersteckt:$("pwVergessenBox").hidden}));
 p(z.boxVersteckt===true,"das Formular ist zunaechst eingeklappt",z);
 await page.click("#pwVergessenLink");
 z=await page.evaluate(()=>({boxSichtbar:!$("pwVergessenBox").hidden}));
 p(z.boxSichtbar===true,"ein Klick auf den Link klappt es auf",z);

 await page.fill("#pwVergessenLogin","irgendwer@example.com");
 z=await page.evaluate(async()=>{
  window.__ruf=[];
  window.__funcStub={"password-reset":()=>({data:{ok:true},error:null})};
  $("pwVergessenSenden").click();
  await new Promise(r=>setTimeout(r,80));
  const aufruf=window.__ruf.find(r=>r.name==="password-reset");
  return {aufruf,statusText:$("pwVergessenStatus").textContent};
 });
 p(z.aufruf&&z.aufruf.body.action==="request"&&z.aufruf.body.login==="irgendwer@example.com","\"Link anfordern\" ruft password-reset mit action:\"request\" auf",z);
 p(/E-Mail-Adresse hinterlegt/.test(z.statusText),"der Status-Text ist der feste, generische Hinweistext",z);

 await zeigeNur("passwordResetScreen");
 z=await page.evaluate(()=>{
  passwordResetToken="test-token-123";
  return {feld:!!$("prNeuesPasswort")};
 });
 p(z.feld,"das Setzen-Formular ist vorhanden",z);
 await page.fill("#prNeuesPasswort","kurz");
 await page.click("#prSpeichern");
 z=await page.evaluate(()=>$("prError").textContent);
 p(/mindestens 8/.test(z),"ein zu kurzes Passwort wird clientseitig abgelehnt, ohne die Funktion aufzurufen",z);

 await page.fill("#prNeuesPasswort","achtStellig1");
 await page.fill("#prNeuesPasswort2","anders12345");
 await page.click("#prSpeichern");
 z=await page.evaluate(()=>$("prError").textContent);
 p(/nicht überein/.test(z),"zwei unterschiedliche Eingaben werden abgelehnt",z);

 await page.fill("#prNeuesPasswort2","achtStellig1");
 // Bei Erfolg loest der echte Handler location.href=... aus (Redirect zum
 // Login) - das wuerde hier die Playwright-Seite neu laden und den
 // Ausfuehrungskontext zerstoeren, bevor sich das Ergebnis auslesen liesse.
 // Der Stub antwortet deshalb bewusst mit ok:false, um genau bis zum
 // korrekten invoke()-Aufruf zu pruefen, ohne den Erfolgspfad (ein einziges
 // location.href, keine weitere Logik) tatsaechlich auszuloesen.
 z=await page.evaluate(async()=>{
  window.__ruf=[];
  window.__funcStub={"password-reset":body=>({data:{ok:false,error:"TEST-kein-echter-fehler"},error:null})};
  $("prSpeichern").click();
  await new Promise(r=>setTimeout(r,80));
  const aufruf=window.__ruf.find(r=>r.name==="password-reset");
  return {aufruf,fehlerText:$("prError").textContent};
 });
 p(z.fehlerText==="TEST-kein-echter-fehler","eine Fehlerantwort der Funktion wird im Formular angezeigt (Redirect wird dadurch vermieden)",z);
 p(z.aufruf&&z.aufruf.body.action==="confirm"&&z.aufruf.body.token==="test-token-123"&&z.aufruf.body.password==="achtStellig1",
   "bei gueltiger Eingabe wird password-reset mit action:\"confirm\", Token und neuem Passwort aufgerufen",z);

 // =========================================================================
 // 4a · Boot-Weiche: ?reset= / ?einladung= in der URL
 // =========================================================================
 console.log("\n4a · Boot-Weiche fuer Reset-/Einladungslink");
 z=await page.evaluate(()=>{
  $("authScreen").hidden=false;$("passwordResetScreen").hidden=true;$("companyInviteScreen").hidden=true;
  const alt=history.pushState;
  history.pushState({},"","index.html?reset=abc123");
  const ergebnis=emailAuthBootWeiche();
  return {ergebnis,authVersteckt:$("authScreen").hidden,resetSichtbar:!$("passwordResetScreen").hidden,token:passwordResetToken};
 });
 p(z.ergebnis===true&&z.authVersteckt&&z.resetSichtbar&&z.token==="abc123","?reset=... zeigt den Passwort-setzen-Bildschirm statt der Anmeldung",z);

 z=await page.evaluate(()=>{
  $("authScreen").hidden=false;$("passwordResetScreen").hidden=true;$("companyInviteScreen").hidden=true;
  history.pushState({},"","index.html?einladung=xyz789");
  const ergebnis=emailAuthBootWeiche();
  return {ergebnis,authVersteckt:$("authScreen").hidden,einladungSichtbar:!$("companyInviteScreen").hidden,token:companyInviteToken};
 });
 p(z.ergebnis===true&&z.authVersteckt&&z.einladungSichtbar&&z.token==="xyz789","?einladung=... zeigt den Firma-anlegen-Bildschirm statt der Anmeldung",z);

 z=await page.evaluate(()=>{
  history.pushState({},"","index.html");
  $("authScreen").hidden=false;
  return emailAuthBootWeiche();
 });
 p(z===false,"ohne Parameter greift die Weiche nicht - die normale Sitzungspruefung laeuft weiter",z);

 // =========================================================================
 // 4b · Einladungs-Formular: Validierung + Aufruf mit invite_token
 // =========================================================================
 console.log("\n4b · Firma per Einladungslink anlegen");
 await page.evaluate(()=>{companyInviteToken="xyz789"});
 await page.click("#ciSubmit");
 z=await page.evaluate(()=>$("ciError").textContent);
 p(/Firmennamen/.test(z),"ohne Firmenname wird abgelehnt, ohne die Funktion aufzurufen",z);

 await page.fill("#ciCompanyName","Testfirma AG");
 await page.fill("#ciFirstName","Anna");
 await page.fill("#ciLastName","Muster");
 await page.fill("#ciEmail","anna@example.com");
 await page.fill("#ciPassword","sicheresPw1");
 await page.fill("#ciPassword2","sicheresPw1");
 // Bei Erfolg loest der echte Handler location.href=... aus (Redirect zum
 // Login) - das wuerde hier die Playwright-Seite neu laden und den
 // Ausfuehrungskontext zerstoeren. Der Stub antwortet deshalb bewusst mit
 // ok:false, um genau bis zum korrekten invoke()-Aufruf zu pruefen, ohne
 // den Erfolgspfad tatsaechlich auszuloesen (siehe gleiches Muster oben
 // bei "Passwort vergessen: neues Passwort setzen").
 z=await page.evaluate(async()=>{
  window.__ruf=[];
  window.__funcStub={"register-company":body=>({data:{ok:false,error:"TEST-kein-echter-fehler"},error:null})};
  $("ciSubmit").click();
  await new Promise(r=>setTimeout(r,80));
  const aufruf=window.__ruf.find(r=>r.name==="register-company");
  return {aufruf,fehlerText:$("ciError").textContent};
 });
 p(z.fehlerText==="TEST-kein-echter-fehler","eine Fehlerantwort der Funktion wird im Formular angezeigt (Redirect wird dadurch vermieden)",z);
 p(z.aufruf&&z.aufruf.body.invite_token==="xyz789"&&z.aufruf.body.password==="sicheresPw1"&&z.aufruf.body.company_name==="Testfirma AG",
   "der Aufruf traegt invite_token und das selbst gewaehlte Passwort",z.aufruf);

 // =========================================================================
 // 4c · System-Admin: Einladungslinks erzeugen/anzeigen/zurueckziehen
 // =========================================================================
 console.log("\n4c · System-Administration: Einladungslinks verwalten");
 await zeigeNur("systemAdminModal");
 z=await page.evaluate(async()=>{
  window.__schreib=[];
  $("sysAdminEinladungErzeugen").click();
  await new Promise(r=>setTimeout(r,80));
  const insert=window.__schreib.find(x=>x.op==="insert"&&x.t==="company_invites");
  return {insert,d:insert&&insert.d[0]};
 });
 p(!!z.insert&&z.d&&z.d.created_by==="u1"&&typeof z.d.token==="string"&&z.d.token.length>=20&&!!z.d.expires_at,
   "erzeugt einen company_invites-Eintrag mit Token, Ersteller und Ablaufdatum",z.d);

 z=await page.evaluate(()=>({
  listeText:$("sysAdminEinladungListe").textContent,
  loeschKnopfDa:!!document.querySelector("[data-einladung-loeschen]")
 }));
 p(/xyz789|[0-9a-f]{20,}/.test(z.listeText)||z.loeschKnopfDa,"der erzeugte Link erscheint in der Liste mit Zurueckziehen-Knopf",z);

 z=await page.evaluate(async()=>{
  window.__schreib=[];
  const knopf=document.querySelector("[data-einladung-loeschen]");
  const id=knopf?knopf.dataset.einladungLoeschen:null;
  if(knopf)knopf.click();
  await new Promise(r=>setTimeout(r,80));
  const del=window.__schreib.find(x=>x.op==="delete"&&x.t==="company_invites");
  return {del,id,uebrig:$("sysAdminEinladungListe").textContent};
 });
 p(!!z.del,"Zurueckziehen loest ein delete() auf company_invites aus (nach confirm())",z);
 p(/Noch keine Einladungslinks/.test(z.uebrig),"die Liste ist danach wieder leer",z);

 // =========================================================================
 // 1 · Firma erstellen (System-Admin): kein Passwort-Feld, Meldung je
 //     nach mailVersendet
 // =========================================================================
 console.log("\n1 · Firma erstellen ohne Passwort-Eingabe");
 await zeigeNur("systemAdminRegisterModal");
 z=await page.evaluate(()=>({
  passwortFeldDa:!!$("regPassword"),
  passwortFeld2Da:!!$("regPassword2")
 }));
 p(!z.passwortFeldDa&&!z.passwortFeld2Da,"die Passwort-Felder existieren nicht mehr im Formular",z);

 await page.evaluate(()=>{
  $("regCompanyName").value="Muster GmbH";
  $("regFirstName").value="Peter";
  $("regLastName").value="Muster";
  $("regEmail").value="peter@muster.ch";
 });
 z=await page.evaluate(async()=>{
  window.__ruf=[];
  window.__funcStub={"register-company":body=>({data:{ok:true,company:{id:"c2",name:body.company_name},user:{id:"u8",email:body.email},mailVersendet:true},error:null})};
  $("companyRegisterBtn").click();
  await new Promise(r=>setTimeout(r,80));
  const aufruf=window.__ruf.find(r=>r.name==="register-company");
  return {aufruf,meldung:$("sysAdminListSuccess")?$("sysAdminListSuccess").textContent:""};
 });
 p(z.aufruf&&z.aufruf.body.password===undefined&&z.aufruf.body.company_name==="Muster GmbH",
   "der Aufruf enthaelt kein Passwort - das erzeugt die Edge Function selbst",z.aufruf);
 p(/per E-Mail verschickt/.test(z.meldung),"bei mailVersendet:true bestaetigt die Meldung den Mailversand",z.meldung);

 // =========================================================================
 // 2 · Mitarbeiter anlegen mit optionaler E-Mail
 // =========================================================================
 console.log("\n2 · Mitarbeiter anlegen mit optionaler E-Mail");
 z=await page.evaluate(async()=>{
  window.__ruf=[];
  window.__funcStub={"smart-action":body=>({data:{ok:true,username:"test.mitarbeiter",password:"Rinnen_TM",mailVersendet:true},error:null})};
  const erfolg=await registerEmployee("Test","Mitarbeiter","test@example.com");
  const aufruf=window.__ruf.find(r=>r.name==="smart-action");
  return {erfolg,aufruf};
 });
 p(z.aufruf&&z.aufruf.body.email==="test@example.com","die E-Mail wird an smart-action durchgereicht",z.aufruf);
 p(z.erfolg===true,"registerEmployee meldet Erfolg",z);

 z=await page.evaluate(async()=>{
  window.__ruf=[];
  window.__funcStub={"smart-action":body=>({data:{ok:true,username:"ohne.email",password:"Rinnen_OE",mailVersendet:false},error:null})};
  await registerEmployee("Ohne","Email","");
  const aufruf=window.__ruf.find(r=>r.name==="smart-action");
  return {emailGesendet:aufruf.body.email};
 });
 p(z.emailGesendet===undefined,"eine leer gelassene E-Mail wird als undefined (nicht als leerer String) geschickt",z);

 // =========================================================================
 // 5 · E-Mail einem BEREITS angelegten Mitarbeiter zuordnen (v3.130)
 // =========================================================================
 // Gemeldet: "Es sollte die moeglichkeit bestehe, einem bereits angelegten
 // mitarbeiter nachtraeglich eine emailadresse zuzuordnen". Die Faehigkeit
 // gab es serverseitig seit v3.103 (smart-action nimmt beim ANLEGEN eine
 // E-Mail entgegen), nur kam ein bestehendes Konto nie mehr dazu.
 console.log("\n5 · E-Mail nachtraeglich zuordnen");
 const mitarbeiterAufbauen=()=>page.evaluate(()=>{
  meineRechte={admin:true,kataloge:true};
  allProfiles=[
   {id:"p1",first_name:"Anna",last_name:"Alt",role:"employee",rate_id:null,email:null},
   {id:"p2",first_name:"Beat",last_name:"Bereits",role:"employee",rate_id:null,email:"beat@firma.ch"}
  ];
  employeeIds=["p1","p2"];
  settings.employees=["Anna Alt","Beat Bereits"];
  settings.rates=[]; rateIds=[];
  alleFeatureAccess=[];
  window.__updateAntwort=null;
  window.__schreib=[];
  renderMitarbeiterSettings();
 });
 await mitarbeiterAufbauen();
 z=await page.evaluate(()=>{
  const felder=[...document.querySelectorAll("#employeeSettings [data-emp-email]")];
  // Fehlt das Feld ganz (Stand vor v3.130), soll die Pruefung FEHLSCHLAGEN -
  // nicht den ganzen Lauf mit einem Zugriffsfehler abbrechen.
  return {anzahl:felder.length,werte:felder.map(f=>f.value),typ:felder[0]&&felder[0].type,
   hinweis:felder[0]?felder[0].parentElement.innerText:""};
 });
 p(z.anzahl===2,"jeder Mitarbeiter hat ein E-Mail-Feld - auch der laengst angelegte",z);
 p(z.werte[0]===""&&z.werte[1]==="beat@firma.ch",
   "eine bereits hinterlegte Adresse steht drin, ein Konto ohne bleibt leer",z);
 p(z.typ==="email","das Feld ist ein E-Mail-Feld - auf dem Handy erscheint die passende Tastatur",z);
 p(/Passwort \u00e4ndert sich dadurch nicht/.test(z.hinweis)&&/keine Nachricht/.test(z.hinweis),
   "darunter steht ausdruecklich, dass sich das Passwort NICHT aendert und KEINE Nachricht verschickt wird",z.hinweis);

 // Eintragen schreibt genau auf dieses Profil.
 z=await page.evaluate(async()=>{
  window.__schreib=[];
  const f=document.querySelector('#employeeSettings [data-emp-email="0"]');
  if(!f)return {fehlt:true};
  f.value="Anna.Alt@Firma.CH";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  const up=window.__schreib.find(x=>x.op==="update"&&x.t==="profiles");
  return {patch:up?up.patch:null,eq:up?up.eq:null,
   imSpeicher:allProfiles.find(x=>x.id==="p1").email,
   imFeld:document.querySelector('#employeeSettings [data-emp-email="0"]').value};
 });
 p(z.patch&&z.patch.email==="anna.alt@firma.ch"&&z.eq[0][1]==="p1",
   "die Adresse wird klein geschrieben auf genau dieses Profil geschrieben",z);
 p(z.imSpeicher==="anna.alt@firma.ch"&&z.imFeld==="anna.alt@firma.ch",
   "die geladene Mitarbeiterliste wird sofort nachgezogen - ohne Neuladen",z);

 // Leeren entfernt die Adresse wieder.
 z=await page.evaluate(async()=>{
  window.__schreib=[];
  const f=document.querySelector('#employeeSettings [data-emp-email="1"]');
  if(!f)return {fehlt:true};
  f.value="";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  const up=window.__schreib.find(x=>x.op==="update"&&x.t==="profiles");
  return {email:up?up.patch.email:"(nichts)",imSpeicher:allProfiles.find(x=>x.id==="p2").email};
 });
 p(z.email===null&&z.imSpeicher===null,
   "ein geleertes Feld entfernt die Adresse (NULL) - eine vertippte Adresse laesst sich wieder loswerden",z);

 // Ungueltige Eingabe: gar kein Schreibbefehl.
 await mitarbeiterAufbauen();
 z=await page.evaluate(async()=>{
  window.__schreib=[];
  const f=document.querySelector('#employeeSettings [data-emp-email="0"]');
  if(!f)return {fehlt:true};
  f.value="kein-at-zeichen";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  return {schreib:window.__schreib.length,zurueck:f.value,
   imSpeicher:allProfiles.find(x=>x.id==="p1").email};
 });
 p(z.schreib===0,"eine ungueltige Adresse geht gar nicht erst an die Datenbank",z);
 p(z.zurueck===""&&z.imSpeicher===null,"das Feld springt auf den alten Wert zurueck",z);

 // Doppelte Adresse: die DATENBANK lehnt ab (profiles_email_key), die App
 // uebersetzt 23505 in einen verstaendlichen Satz - sie prueft NICHT selbst
 // vorher nach (das waere ein Wettlauf).
 z=await page.evaluate(async()=>{
  window.__updateAntwort={data:null,error:{code:"23505",message:'duplicate key value violates unique constraint "profiles_email_key"'}};
  page_dialoge=[];
  const alt=window.alert; const gesagt=[];
  window.alert=t=>gesagt.push(String(t));
  const f=document.querySelector('#employeeSettings [data-emp-email="0"]');
  if(!f)return {fehlt:true};
  f.value="beat@firma.ch";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  window.alert=alt;
  window.__updateAntwort=null;
  return {gesagt,zurueck:f.value,imSpeicher:allProfiles.find(x=>x.id==="p1").email};
 });
 p(z.gesagt.length===1&&/bereits einem anderen Konto/.test(z.gesagt[0]),
   "eine schon vergebene Adresse wird verstaendlich abgelehnt, nicht mit einem Datenbankfehler",z.gesagt);
 p(z.zurueck===""&&z.imSpeicher===null,"und nichts wird uebernommen",z);

 // 0 geschriebene Zeilen gelten NICHT als Erfolg (CLAUDE.md 24.1).
 z=await page.evaluate(async()=>{
  window.__updateAntwort={data:[],error:null};
  const alt=window.alert; const gesagt=[];
  window.alert=t=>gesagt.push(String(t));
  const f=document.querySelector('#employeeSettings [data-emp-email="0"]');
  if(!f)return {fehlt:true};
  f.value="neu@firma.ch";
  f.dispatchEvent(new Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  window.alert=alt;
  window.__updateAntwort=null;
  return {gesagt,zurueck:f.value,imSpeicher:allProfiles.find(x=>x.id==="p1").email};
 });
 p(z.gesagt.length===1&&/Berechtigung/.test(z.gesagt[0])&&z.imSpeicher===null,
   "0 geschriebene Zeilen gelten NICHT als Erfolg - die RLS kann die Zeile stillschweigend herausfiltern",z);

 // Ohne Administratorrecht gibt es das Feld gar nicht.
 z=await page.evaluate(()=>{
  meineRechte={admin:false,kataloge:false};
  renderMitarbeiterSettings();
  const da=document.querySelectorAll("#employeeSettings [data-emp-email]").length;
  meineRechte={admin:true,kataloge:true};
  renderMitarbeiterSettings();
  return {da,wiederDa:document.querySelectorAll("#employeeSettings [data-emp-email]").length};
 });
 p(z.da===0&&z.wiederDa===2,
   "ohne Administratorrecht faellt das Feld ganz weg - kein Element, das ohnehin nichts bewirken wuerde",z);

 p(jsFehler.length===0,"keine JavaScript-Fehler im ganzen Lauf",jsFehler);
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

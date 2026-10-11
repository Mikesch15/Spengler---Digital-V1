// Prueft v3.316 (Nachtauftrag, Paket A): register-company und smart-action.
//  register-company: Einladung nur EINMAL einloesbar (auch bei gleichzeitigen Aufrufen), Freigabe der Einladung bei
//    Fehlern, keine Rohtexte von Auth/PostgREST in Antworten, HTML-Escaping der Zugangsdaten-Mail, kein Doppelversand
//    (Gmail angenommen, aber close() scheitert -> KEIN zweiter Versand ueber Resend).
//  smart-action: Startpasswort zufaellig statt "Rinnen_"+Initialen, Rechte (admin, aktive Firma), Rollback.
// Geprueft werden die ECHTEN Dateien unter supabase/functions/ (Supabase/Gmail/Resend als Attrappe, ohne Deno).
// NICHT belegt: echte Mails, echte Konten/Firmen (es werden in Produktion keine angelegt), das Deployment.
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm"), nodeCrypto=require("crypto");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const strip=require("module").stripTypeScriptTypes;
if(typeof strip!=="function"){console.log("  FEHLGESCHLAGEN: Node >= 22.13 noetig (module.stripTypeScriptTypes) - in der CI ist Node 22 eingestellt");process.exit(1)}
const origWarn=process.emitWarning; process.emitWarning=()=>{};
function laden(datei){
 let t=fs.readFileSync(path.join(process.cwd(),datei),"utf8");
 t=t.replace(/^import \{[^}]*\} from "\.\/_startwerte\.ts";$/m,"");
 t=t.replace(/await import\("https:\/\/deno\.land\/x\/denomailer@1\.6\.0\/mod\.ts"\)/g,"await __smtpModul()");
 return strip(t);
}
const JS_REG=laden("supabase/functions/register-company/index.ts");
const JS_SMART=laden("supabase/functions/smart-action/index.ts");
const STARTWERTE={WERKSTOFFE:[],RINNE_TYPEN:[],BEISPIEL_KATALOG:[],ROLLENBREITEN:[1000],MWST:"8.1 %"};

// ---- gemeinsame Attrappen fuer Gmail/Resend -------------------------------------------------------------------
function mailWelt(o){
 const w={resend:[],gmail:[],smtpLog:[]};
 w.smtpModul=async()=>{
  if(o.smtpImportFehler)throw new Error("Modul nicht ladbar");
  return {SMTPClient:class{
   constructor(c){w.smtpLog.push({host:c.connection.hostname,user:c.connection.auth.username,passwortLaenge:c.connection.auth.password.length,leerzeichen:/\s/.test(c.connection.auth.password)})}
   async send(m){if(o.smtpSendFehler)throw new Error("SMTP abgelehnt "+o.geheim);w.gmail.push(m)}
   async close(){if(o.smtpCloseFehler)throw new Error("Verbindung abgebrochen")}
  }};
 };
 return w;
}
function envGet(o){return k=>({SUPABASE_URL:"https://t.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"SRV",RESEND_API_KEY:"RS",GMAIL_USER:o.gmail?"absender@gmail.com":undefined,GMAIL_APP_PASSWORD:o.gmail?"abcd efgh ijkl mnop":undefined})[k]}
const basis=(sb)=>Object.assign({crypto:nodeCrypto.webcrypto,URL,TextEncoder,Uint32Array,Uint8Array,Array,String,Number,Date,JSON,Math,Error,Response,Promise,Object,RegExp,encodeURIComponent,decodeURIComponent,setTimeout,clearTimeout},sb);

// ---- register-company -------------------------------------------------------------------------------------------
async function registrieren(o){
 o=Object.assign({token:"T",systemAdmin:false,firma:"Muster AG",email:"neu@firma.ch",vorname:"Anna",nachname:"Muster",passwort:"geheimes-pw-1",
  einladung:{id:1,token:"T",expires_at:new Date(Date.now()+86400000).toISOString(),used_at:null},profilFehler:false,authFehler:null,emailVorhanden:false,gmail:false,welt:null,inv:null,gleichzeitig:0},o||{});
 const inv=o.inv||{row:o.einladung};
 const w=o.welt||mailWelt(o); const log=[]; const aktionen={firmen:0,loeschungen:[],authAnlagen:0,freigaben:0,claimVersuche:0};
 const sb=basis({
  Deno:{serve:h=>{sb.__h=h},env:{get:envGet(o)}},
  __smtpModul:w.smtpModul,
  ...STARTWERTE,
  console:{log(){},error:(...a)=>log.push(a.join(" "))},
  fetch:async(url,opt)=>{
   url=String(url); const m=(opt&&opt.method)||"GET"; const rest=url.replace("https://t.supabase.co","");
   const ant=(status,data)=>({ok:status>=200&&status<300,status,text:async()=>typeof data==="string"?data:JSON.stringify(data),json:async()=>data});
   if(rest.startsWith("/auth/v1/user"))return o.systemAdmin?ant(200,{id:"sysadmin"}):ant(401,{});
   if(rest.startsWith("/rest/v1/system_admins"))return ant(200,o.systemAdmin?[{user_id:"sysadmin"}]:[]);
   if(rest.startsWith("/rest/v1/company_invites?token=eq.")){const r=inv.row;return ant(200,r&&decodeURIComponent(rest.split("token=eq.")[1].split("&")[0])===r.token?[{...r}]:[])}
   if(rest.startsWith("/rest/v1/company_invites?id=eq.")&&m==="PATCH"){
    const b=JSON.parse(opt.body); const nurLeere=rest.indexOf("used_at=is.null")>0;
    if(nurLeere){aktionen.claimVersuche++; if(inv.row.used_at)return ant(200,[]); inv.row.used_at=b.used_at; return ant(200,[{...inv.row}])}
    if(b.used_at===null)aktionen.freigaben++;
    Object.assign(inv.row,b); return ant(200,[{...inv.row}]);
   }
   if(rest==="/auth/v1/admin/users"&&m==="POST"){
    const b=JSON.parse(opt.body); aktionen.authAnlagen++;
    if(o.authFehler)return ant(500,o.authFehler);
    if(o.emailVorhanden)return ant(422,'{"msg":"A user with this email address has already been registered"}');
    return ant(200,{id:"u-"+b.email});
   }
   if(rest.startsWith("/auth/v1/admin/users/")&&m==="DELETE"){aktionen.loeschungen.push("auth");return ant(200,{})}
   if(rest==="/rest/v1/companies"&&m==="POST"){aktionen.firmen++; const b=JSON.parse(opt.body); return ant(201,[{id:"c-"+aktionen.firmen,slug:b.slug}])}
   if(rest==="/rest/v1/profiles"&&m==="POST")return o.profilFehler?ant(409,'{"message":"duplicate key value violates unique constraint \\"profiles_email_key\\" Detail: secret"}'):ant(201,[{}]);
   if(rest==="/rest/v1/app_settings"&&m==="POST")return ant(201,[{}]);
   if(m==="DELETE"){aktionen.loeschungen.push(rest.split("?")[0]);return ant(204,"")}
   if(url.indexOf("api.resend.com")>0){w.resend.push(JSON.parse(opt.body));return ant(200,{})}
   return ant(201,[]);
  }
 });
 vm.runInNewContext(JS_REG,sb);
 const aufruf=async(extra)=>{
  const b=Object.assign({company_name:o.firma,first_name:o.vorname,last_name:o.nachname,email:o.email,password:o.passwort,invite_token:o.token},extra||{});
  const kopf=o.systemAdmin?{authorization:"Bearer x"}:{};
  const res=await sb.__h({method:"POST",headers:{get:n=>kopf[String(n).toLowerCase()]||null},json:async()=>b});
  const text=await res.text(); return {status:res.status,text,body:JSON.parse(text)};
 };
 return {aufruf,aktionen,log,w,inv,sb};
}

// ---- smart-action -------------------------------------------------------------------------------------------------
async function mitarbeiter(o){
 o=Object.assign({auth:true,rolle:"admin",firma:{subscription_status:"active"},profilFehler:false,belegt:[],emailVergeben:false,gmail:false,body:{first_name:"Max",last_name:"Müller",email:"max@example.com"}},o||{});
 const w=o.welt||mailWelt(o); const log=[]; const a={authAnlagen:[],geloescht:0,profile:0};
 const sb=basis({
  Deno:{serve:h=>{sb.__h=h},env:{get:envGet(o)}},
  __smtpModul:w.smtpModul,
  console:{log(){},error:(...x)=>log.push(x.join(" "))},
  fetch:async(url,opt)=>{
   url=String(url); const m=(opt&&opt.method)||"GET"; const rest=url.replace("https://t.supabase.co","");
   const ant=(status,data)=>({ok:status>=200&&status<300,status,text:async()=>typeof data==="string"?data:JSON.stringify(data),json:async()=>data});
   if(rest.startsWith("/auth/v1/user"))return o.auth?ant(200,{id:"admin-1"}):ant(401,{});
   if(rest.startsWith("/rest/v1/profiles?id=eq.admin-1"))return ant(200,[{id:"admin-1",role:o.rolle,company_id:"firma-1"}]);
   if(rest.startsWith("/rest/v1/companies?id=eq."))return ant(200,[o.firma]);
   if(rest.startsWith("/rest/v1/profiles?email=eq."))return ant(200,o.emailVergeben?[{id:"x"}]:[]);
   if(rest==="/auth/v1/admin/users"&&m==="POST"){const b=JSON.parse(opt.body);if(o.belegt.indexOf(b.email)>=0)return ant(422,'{"msg":"already registered"}');a.authAnlagen.push(b);return ant(200,{id:"u-"+b.email})}
   if(rest.startsWith("/auth/v1/admin/users/")&&m==="DELETE"){a.geloescht++;return ant(200,{})}
   if(rest==="/rest/v1/profiles"&&m==="POST"){a.profile++;return o.profilFehler?ant(409,'{"message":"duplicate key ... interne details"}'):ant(201,[{id:"p"}])}
   if(url.indexOf("api.resend.com")>0){w.resend.push(JSON.parse(opt.body));return ant(200,{})}
   return ant(404,{});
  }
 });
 vm.runInNewContext(JS_SMART,sb);
 const kopf=o.auth?{authorization:"Bearer x"}:{};
 const res=await sb.__h({method:"POST",headers:{get:n=>kopf[String(n).toLowerCase()]||null},json:async()=>o.body});
 const text=await res.text();
 return {status:res.status,text,body:JSON.parse(text),a,w,log};
}

(async()=>{
 console.log("\nA · register-company: Einladung nur einmal einloesbar");
 let t=await registrieren(); let r=await t.aufruf();
 p(r.status===201&&r.body.ok===true&&t.aktionen.firmen===1,"gueltige Einladung: Firma angelegt (201)",r);
 p(t.inv.row.used_at&&t.inv.row.used_by_company_id==="c-1","Einladung ist verbraucht und der neuen Firma zugeordnet",t.inv.row);
 r=await t.aufruf({email:"zweite@firma.ch"});
 p(r.status===400&&/ung(ü|u)ltig oder abgelaufen/.test(r.body.error)&&t.aktionen.firmen===1,"zweiter Aufruf mit demselben Link: abgewiesen, keine zweite Firma",r);
 // gleichzeitig: beide bestehen die Pruefung "ist frei", nur EIN Anspruch gelingt
 t=await registrieren(); const [x,y]=await Promise.all([t.aufruf({email:"a@firma.ch"}),t.aufruf({email:"b@firma.ch"})]);
 p([x.status,y.status].sort().join()==="201,400"&&t.aktionen.firmen===1&&t.aktionen.authAnlagen===1,"zwei GLEICHZEITIGE Aufrufe mit demselben Link: genau eine Firma, genau ein Konto",{x:x.status,y:y.status,firmen:t.aktionen.firmen,konten:t.aktionen.authAnlagen});
 t=await registrieren({token:""}); r=await t.aufruf(); p(r.status===403,"ohne Link und ohne System-Admin: 403",r.status);
 t=await registrieren({token:"falsch"}); r=await t.aufruf(); p(r.status===400&&t.aktionen.firmen===0,"falscher Link: 400",r.status);
 t=await registrieren({einladung:{id:1,token:"T",expires_at:new Date(Date.now()-1000).toISOString(),used_at:null}}); r=await t.aufruf(); p(r.status===400&&t.aktionen.firmen===0,"abgelaufener Link: 400",r.status);
 t=await registrieren(); r=await t.aufruf({company_name:""});
 p(r.status===400&&t.inv.row.used_at===null&&t.aktionen.claimVersuche===0,"Tippfehler im Formular (Firmenname leer): Link bleibt unverbraucht",r);
 r=await t.aufruf({password:"kurz"}); p(r.status===400&&t.inv.row.used_at===null,"zu kurzes Passwort: Link bleibt unverbraucht",r.status);

 console.log("\nB · register-company: Fehler geben den Link frei und verraten nichts");
 t=await registrieren({profilFehler:true}); r=await t.aufruf();
 p(r.status===400&&t.inv.row.used_at===null&&t.aktionen.freigaben===1,"Profil kann nicht angelegt werden: Link wird wieder freigegeben",{s:r.status,inv:t.inv.row});
 p(r.text.indexOf("duplicate")<0&&r.text.indexOf("profiles")<0&&r.text.indexOf("secret")<0&&/konnte nicht angelegt werden/.test(r.body.error),"...und die Antwort enthaelt keine Rohtexte (Tabellen-/Constraint-Namen)",r.text);
 p(t.aktionen.loeschungen.indexOf("auth")>=0&&t.aktionen.loeschungen.some(x=>x.indexOf("companies")>=0),"Rollback: Konto und Firma wieder geloescht",t.aktionen.loeschungen);
 t=await registrieren({authFehler:'{"msg":"internal secret detail 12345"}'}); r=await t.aufruf();
 p(r.status===400&&r.text.indexOf("secret")<0&&r.text.indexOf("12345")<0&&t.inv.row.used_at===null,"Auth-Fehler: allgemeiner Satz, Link freigegeben",r.text);
 t=await registrieren({emailVorhanden:true}); r=await t.aufruf();
 p(r.status===400&&/bereits registriert/.test(r.body.error)&&t.inv.row.used_at===null,"E-Mail schon vergeben: verstaendlicher Satz bleibt, Link freigegeben",r);

 console.log("\nC · register-company: Zugangsdaten-Mail (System-Admin-Weg)");
 t=await registrieren({systemAdmin:true,token:"",firma:'<img src=x onerror=alert(1)> & Co "AG"'}); r=await t.aufruf();
 const html=(t.w.resend[0]||{}).html||"";
 p(r.status===201&&t.w.resend.length===1&&html.indexOf("<img")<0&&html.indexOf("&lt;img")>0,"Firmenname mit HTML wird in der Mail maskiert (Resend, Gmail nicht eingerichtet)",html.slice(0,200));
 t=await registrieren({systemAdmin:true,token:"",gmail:true}); r=await t.aufruf();
 p(r.body.mailVersendet===true&&t.w.gmail.length===1&&t.w.resend.length===0&&t.w.smtpLog[0].host==="smtp.gmail.com"&&t.w.smtpLog[0].leerzeichen===false,"Gmail eingerichtet: Versand ueber Gmail (Passwort ohne Leerzeichen), nichts ueber Resend",{g:t.w.gmail.length,r:t.w.resend.length,l:t.w.smtpLog});
 t=await registrieren({systemAdmin:true,token:"",gmail:true,smtpCloseFehler:true}); r=await t.aufruf();
 p(r.body.mailVersendet===true&&t.w.gmail.length===1&&t.w.resend.length===0,"Gmail hat angenommen, close() scheitert: KEIN zweiter Versand ueber Resend",{g:t.w.gmail.length,r:t.w.resend.length});
 t=await registrieren({systemAdmin:true,token:"",gmail:true,smtpSendFehler:true,geheim:"abcd efgh"}); r=await t.aufruf();
 p(r.body.mailVersendet===true&&t.w.gmail.length===0&&t.w.resend.length===1,"Gmail lehnt ab: Rueckfall auf Resend (genau eine Mail)",{g:t.w.gmail.length,r:t.w.resend.length});
 p(t.log.join(" ").indexOf("mnop")<0&&t.log.join(" ").indexOf("ijkl")<0,"das App-Passwort steht nicht im Log",t.log);
 t=await registrieren({systemAdmin:true,token:"",gmail:true,smtpImportFehler:true}); r=await t.aufruf();
 p(r.status===201&&t.w.resend.length===1,"SMTP-Baustein nicht ladbar: Registrierung gelingt trotzdem, Rueckfall auf Resend",r.status);

 console.log("\nD · smart-action: Mitarbeiter anlegen");
 let s=await mitarbeiter();
 p(s.status===201&&s.body.ok===true&&s.body.username==="max.mueller","Admin legt Mitarbeiter an: Benutzername aus dem Namen",s.body);
 p(/^Start-[A-Za-z0-9]{8}$/.test(s.body.password)&&s.body.password.indexOf("Rinnen")<0,"Startpasswort ist zufaellig (Start-xxxxxxxx), NICHT mehr Rinnen_+Initialen",s.body.password);
 const s2=await mitarbeiter(); p(s.body.password!==s2.body.password,"zwei neue Konten bekommen verschiedene Passwoerter",null);
 p(s.a.authAnlagen[0].password===s.body.password,"das gesetzte Passwort ist das, das dem Administrator angezeigt wird",null);
 s=await mitarbeiter({auth:false}); p(s.status===401&&s.a.authAnlagen.length===0,"ohne Anmeldung: 401",s.status);
 s=await mitarbeiter({rolle:"employee"}); p(s.status===403&&s.a.authAnlagen.length===0,"kein Administrator: 403",s.status);
 s=await mitarbeiter({firma:{subscription_status:"suspended"}}); p(s.status===403&&s.a.authAnlagen.length===0,"Firma gesperrt: 403",s.status);
 s=await mitarbeiter({belegt:["max.mueller@nfgryuzkpwjfmdlmevuy.supabase.co"]}); p(s.status===201&&s.body.username==="max.mueller2","Benutzername schon vergeben: naechster freier (max.mueller2)",s.body.username);
 s=await mitarbeiter({emailVergeben:true}); p(s.status===409&&s.a.authAnlagen.length===0,"E-Mail gehoert schon einem Konto: 409, nichts angelegt",s.status);
 s=await mitarbeiter({profilFehler:true}); p(s.status===400&&s.a.geloescht===1&&s.text.indexOf("duplicate")<0&&s.text.indexOf("interne")<0,"Profil scheitert: Auth-Konto wieder geloescht, Antwort ohne Rohtext",s.text);
 s=await mitarbeiter({body:{first_name:"",last_name:"X"}}); p(s.status===400&&s.a.authAnlagen.length===0,"fehlender Vorname: 400",s.status);

 console.log("\nE · smart-action: Zugangsdaten-Mail");
 s=await mitarbeiter(); p(s.body.mailVersendet===true&&s.w.resend.length===1,"ohne Gmail: ueber Resend wie bisher",s.w.resend.length);
 s=await mitarbeiter({gmail:true}); p(s.body.mailVersendet===true&&s.w.gmail.length===1&&s.w.resend.length===0&&s.w.gmail[0].html.indexOf(s.body.password)>0,"mit Gmail: ueber Gmail, die Mail enthaelt das Passwort",{g:s.w.gmail.length,r:s.w.resend.length});
 s=await mitarbeiter({gmail:true,smtpCloseFehler:true}); p(s.w.gmail.length===1&&s.w.resend.length===0,"Gmail angenommen, close() scheitert: KEIN Doppelversand",{g:s.w.gmail.length,r:s.w.resend.length});
 s=await mitarbeiter({gmail:true,smtpSendFehler:true,geheim:"abcd"}); p(s.w.gmail.length===0&&s.w.resend.length===1&&s.log.join(" ").indexOf("mnop")<0,"Gmail lehnt ab: genau eine Mail ueber Resend, Passwort nicht im Log",{g:s.w.gmail.length,r:s.w.resend.length});
 s=await mitarbeiter({body:{first_name:"Max",last_name:"Müller"}}); p(s.body.mailVersendet===false&&s.w.resend.length===0&&s.w.gmail.length===0,"ohne E-Mail-Adresse: keine Mail",s.body.mailVersendet);

 process.emitWarning=origWarn;
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();

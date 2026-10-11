// Prueft v3.310 (Audit oeffentliche Edge Functions): password-reset baut den Link nur noch aus EIGENEN Adressen und
// begrenzt Reset-Mails je Konto. Vorher: Link aus dem frei setzbaren Origin-Header der Anfrage (Token-Diebstahl per
// gefaelschtem Origin) und keine Begrenzung (Postfach-Flut).
// Geprueft wird die ECHTE Datei supabase/functions/password-reset/index.ts (Supabase/Resend als Attrappe, ohne Deno).
// NICHT belegt: ein echter Versand, das Deployment (siehe PROJECT_STATE).
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const quelle=fs.readFileSync(path.join(process.cwd(),"supabase/functions/password-reset/index.ts"),"utf8");
// Typen entfernen (Node 20 in GitHub Actions kennt module.stripTypeScriptTypes noch nicht): nur die in dieser Datei
// vorkommenden Muster, bewusst eng - eine neue Schreibweise macht den Prüfstand laut rot statt still falsch.
const JS=quelle
 .replace(/\): Promise<.*?> \{$/gm,") {")
 .replace(/\): (string|boolean) \{/g,") {")
 .replace(/(\(|, )(\w+): (string|Request|unknown)(?=[,)= ])/g,"$1$2")
 .replace(/let body: \{[^}]*\};/,"let body;")
 .replace(/(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)!/g,"$1");
async function lauf(o){
 o=Object.assign({login:"person@firma.ch",origin:"https://mikesch15.github.io",profil:true,bisher:0,bisherStatus:200,mail:true},o||{});
 let handler=null; const mails=[],tokens=[];
 const sb={
  Deno:{serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:"https://t.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"SRV",RESEND_API_KEY:"RS"})[k]}},
  fetch:async(url,opt)=>{
   url=String(url);
   if(url.indexOf("/rest/v1/profiles?email=")>0)return {ok:true,status:200,json:async()=>o.profil?[{id:"u1"}]:[]};
   if(url.indexOf("/rest/v1/password_reset_tokens?user_id=")>0)return {ok:o.bisherStatus===200,status:o.bisherStatus,json:async()=>Array.from({length:o.bisher},(_, i)=>({id:i}))};
   if(url.endsWith("/rest/v1/password_reset_tokens")&&opt&&opt.method==="POST"){tokens.push(JSON.parse(opt.body));return {ok:true,status:201,text:async()=>""}}
   if(url.indexOf("api.resend.com")>0){mails.push(JSON.parse(opt.body));return {ok:o.mail,status:o.mail?200:500,text:async()=>""}}
   return {ok:true,status:200,json:async()=>[],text:async()=>""};
  },
  crypto,Uint8Array,Array,String,Number,Date,JSON,Math,Error,Response,encodeURIComponent,console:{log(){},error(){}}
 };
 vm.runInNewContext(JS,sb);
 const kopf=o.origin===null?{}:{origin:o.origin};
 const res=await handler({method:"POST",headers:{get:n=>kopf[String(n).toLowerCase()]||null},json:async()=>({action:"request",login:o.login})});
 return {status:res.status,body:JSON.parse(await res.text()),mails,tokens};
}
const linkVon=r=>{const m=/href="([^"]+)"/.exec(r.mails[0].html);return m?m[1]:""};
(async()=>{
 console.log("\nA · Link nur aus eigenen Adressen");
 let r=await lauf();
 p(r.status===200&&r.body.ok===true&&r.mails.length===1,"normaler Aufruf der App: Mail geht raus, Antwort ok:true",r);
 p(linkVon(r)===`https://mikesch15.github.io/?reset=${r.tokens[0].token}`,"Link zeigt auf die eigene Adresse (unveraendert zu bisher)",linkVon(r));
 r=await lauf({origin:"https://fremd.example"});
 p(r.mails.length===1&&linkVon(r).startsWith("https://mikesch15.github.io/?reset=")&&linkVon(r).indexOf("fremd")<0,"gefaelschter Origin: Link bleibt eigen, KEIN fremder Link in der Mail",linkVon(r));
 r=await lauf({origin:"https://mikesch15.github.io.fremd.example"});
 p(linkVon(r).startsWith("https://mikesch15.github.io/?reset=")&&linkVon(r).indexOf("fremd")<0,"aehnlich aussehender Origin (Unterdomain-Trick): abgewiesen",linkVon(r));
 r=await lauf({origin:null});
 p(r.mails.length===1&&linkVon(r).startsWith("https://mikesch15.github.io/?reset="),"ohne Origin: Link eigen, Mail geht raus",linkVon(r));
 r=await lauf({origin:"https://fremd.example\"><script>"});
 p(linkVon(r).indexOf("script")<0&&linkVon(r).indexOf("fremd")<0,"Origin mit Anfuehrungszeichen/HTML: kein Einschleusen in die Mail",linkVon(r));

 console.log("\nB · Begrenzung je Konto");
 r=await lauf({bisher:2});
 p(r.mails.length===1,"2 Tokens im Fenster: noch erlaubt",r.mails.length);
 r=await lauf({bisher:3});
 p(r.status===200&&r.body.ok===true&&r.mails.length===0&&r.tokens.length===0,"3 Tokens im Fenster: keine weitere Mail, kein neues Token, Antwort bleibt ok:true",r);
 r=await lauf({bisherStatus:500});
 p(r.status===200&&r.body.ok===true&&r.mails.length===0&&r.tokens.length===0,"Zaehlung nicht moeglich: NICHT senden (fail closed), Antwort ok:true",r);

 console.log("\nC · Kein Leck, Verhalten unveraendert");
 const a=await lauf({profil:false}), b=await lauf();
 p(JSON.stringify(a.body)===JSON.stringify(b.body)&&a.status===b.status,"unbekannte und bekannte E-Mail: identische Antwort",[a.body,b.body]);
 r=await lauf({login:"nurname"});
 p(r.status===200&&r.body.ok&&r.mails.length===0,"reiner Benutzername ohne @: keine Mail, ok:true",r);
 r=await lauf({mail:false});
 p(r.status===200&&r.body.ok===true,"Resend-Fehler: Antwort bleibt ok:true",r);
 console.log("\nD · CORS (v3.311): Preflight von supabase-js");
 { let h=null; const sb={Deno:{serve:x=>{h=x},env:{get:k=>({SUPABASE_URL:"https://t",SUPABASE_SERVICE_ROLE_KEY:"S"})[k]}},fetch:async()=>({}),crypto,Uint8Array,Array,String,Number,Date,JSON,Math,Error,Response,encodeURIComponent,console};
  vm.runInNewContext(JS,sb); const res=await h({method:"OPTIONS",headers:{get:()=>null}});
  const ah=res.headers.get("access-control-allow-headers")||"";
  p(res.status===200&&/apikey/.test(ah)&&/x-client-info/.test(ah)&&/authorization/.test(ah)&&/content-type/.test(ah),"OPTIONS erlaubt apikey und x-client-info (sonst blockiert der Browser die POST-Anfrage, es kommt nie eine Mail)",ah); }
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();

// Prueft v3.310/v3.312 (Audit oeffentliche Edge Functions): password-reset baut den Link nur noch auf die EIGENE App (fester Host, Pfad vom Client) und
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
 .replace(/\(err as Error\)/g,"(err)")
 .replace(/let body: \{[^}]*\};/,"let body;")
 .replace(/(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)!/g,"$1");
async function lauf(o){
 o=Object.assign({gmail:false,login:"person@firma.ch",app_url:undefined,origin:"https://mikesch15.github.io",profil:true,bisher:0,bisherStatus:200,mail:true},o||{});
 let handler=null; const mails=[],tokens=[],logs=[];
 const sb={
  Deno:{serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:"https://t.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"SRV",RESEND_API_KEY:"RS",GMAIL_USER:o.gmail?"absender@gmail.com":undefined,GMAIL_APP_PASSWORD:o.gmail?"abcd efgh ijkl mnop":undefined})[k]}},
  fetch:async(url,opt)=>{
   url=String(url);
   if(url.indexOf("/rest/v1/profiles?email=")>0)return {ok:true,status:200,json:async()=>o.profil?[{id:"u1"}]:[]};
   if(url.indexOf("/rest/v1/password_reset_tokens?user_id=")>0)return {ok:o.bisherStatus===200,status:o.bisherStatus,json:async()=>Array.from({length:o.bisher},(_, i)=>({id:i}))};
   if(url.endsWith("/rest/v1/password_reset_tokens")&&opt&&opt.method==="POST"){tokens.push(JSON.parse(opt.body));return {ok:true,status:201,text:async()=>""}}
   if(url.indexOf("api.resend.com")>0){mails.push(JSON.parse(opt.body));return {ok:o.mail,status:o.mail?200:500,text:async()=>""}}
   return {ok:true,status:200,json:async()=>[],text:async()=>""};
  },
  crypto,Uint8Array,Array,String,Number,Date,JSON,Math,Error,Response,encodeURIComponent,console:{log(){},error(...a){logs.push(a.join(" "))}}
 };
 vm.runInNewContext(JS,sb);
 const kopf=o.origin===null?{}:{origin:o.origin};
 const res=await handler({method:"POST",headers:{get:n=>kopf[String(n).toLowerCase()]||null},json:async()=>({action:"request",login:o.login,app_url:o.app_url})});
 return {status:res.status,body:JSON.parse(await res.text()),mails,tokens,logs};
}
const linkVon=r=>{const m=/href="([^"]+)"/.exec(r.mails[0].html);return m?m[1]:""};
(async()=>{
 console.log("\nA · Link nur auf die eigene App (Host fest, Pfad vom Client)");
 const APP="https://mikesch15.github.io/Spengler---Digital-V1/";
 let r=await lauf({app_url:APP});
 p(r.status===200&&r.body.ok===true&&r.mails.length===1,"normaler Aufruf der App: Mail geht raus, Antwort ok:true",r);
 p(linkVon(r)===`${APP}?reset=${r.tokens[0].token}`,"Link zeigt auf die App MIT Projektpfad",linkVon(r));
 r=await lauf({app_url:APP+"index.html?x=1#y"});
 p(linkVon(r)===`${APP}?reset=${r.tokens[0].token}`,"index.html, Query und Anker der Seitenadresse werden entfernt",linkVon(r));
 r=await lauf({});
 p(linkVon(r)===`${APP}?reset=${r.tokens[0].token}`,"ohne app_url (alte App): Standardadresse MIT Pfad",linkVon(r));
 for(const [name,u] of [["fremder Host","https://fremd.example/Spengler---Digital-V1/"],["Unterdomain-Trick","https://mikesch15.github.io.fremd.example/x/"],["Benutzerinfo-Trick","https://mikesch15.github.io@fremd.example/"],["javascript:","javascript:alert(1)"],["Anfuehrungszeichen/HTML","https://mikesch15.github.io/a\"><script>"],["zu lang","https://mikesch15.github.io/"+"a".repeat(300)+"/"],["Doppel-Slash","https://mikesch15.github.io//fremd.example/"],["Zahl","12345"]]){
  r=await lauf({app_url:u});
  p(r.mails.length===1&&linkVon(r)===`${APP}?reset=${r.tokens[0].token}`,"app_url \u201E"+name+"\u201C: Standardadresse, nichts Fremdes in der Mail",linkVon(r));
 }
 r=await lauf({app_url:"https://mikesch15.github.io/anderer-pfad/",origin:"https://fremd.example"});
 p(linkVon(r)===`https://mikesch15.github.io/anderer-pfad/?reset=${r.tokens[0].token}`&&linkVon(r).indexOf("fremd")<0,"eigener Host mit anderem Pfad bleibt moeglich; ein gefaelschter Origin-Header spielt keine Rolle mehr",linkVon(r));

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
 console.log("\nE · Mailversand (v3.313): Gmail mit Rueckfall auf Resend");
 r=await lauf({});
 p(r.mails.length===1&&r.logs.length===0,"Gmail nicht eingerichtet: wie bisher ueber Resend",r.logs);
 r=await lauf({gmail:true,app_url:"https://mikesch15.github.io/Spengler---Digital-V1/"});
 p(r.status===200&&r.body.ok===true&&r.mails.length===1,"Gmail eingerichtet, aber der SMTP-Baustein laesst sich nicht laden/scheitert: Rueckfall auf Resend, Antwort ok:true",r);
 p(r.logs.some(l=>/Gmail-Versand fehlgeschlagen/.test(l)),"...und der Fehler steht im Log",r.logs);
 p(JSON.stringify(r.logs).indexOf("abcd")<0&&JSON.stringify(r.body).indexOf("abcd")<0&&JSON.stringify(r.mails).indexOf("abcd")<0,"das App-Passwort steht nirgends (Log, Antwort, Mail)",null);
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();

// Prueft v3.311 (Auftrag "Sicherer Login mit Benutzername UND E-Mail"): resolve-login-email gibt nie mehr eine Adresse
// heraus, sondern prueft das Passwort selbst und liefert die Sitzung; bekanntes und unbekanntes Konto sehen gleich aus;
// Limit je IP und je Eingabe; bei Ausfall des Limits wird nichts durchgelassen.
// Geprueft wird die ECHTE Datei supabase/functions/resolve-login-email/index.ts (Supabase als Attrappe, ohne Deno).
// BELEGT: Logik, Antwortform, Limit, CORS. NICHT belegt: echte Anmeldung am Live-System mit echten Zugangsdaten.
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm"), nodeCrypto=require("crypto");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const quelle=fs.readFileSync(path.join(process.cwd(),"supabase/functions/resolve-login-email/index.ts"),"utf8");
// Typen entfernen (Node 20 in GitHub Actions kennt module.stripTypeScriptTypes nicht): nur die hier vorkommenden Muster.
const JS=quelle
 .replace(/\): Promise<.*?> \{$/gm,") {")
 .replace(/\): (string|boolean) \{$/gm,") {")
 .replace(/(\(|, )(\w+): (string|Request|unknown)(?=[,)= ])/g,"$1$2")
 .replace(/let body: \{[^}]*\};/,"let body;")
 .replace(/let email: string;/,"let email;")
 .replace(/(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)!/g,"$1");
const PSEUDO="@nfgryuzkpwjfmdlmevuy.supabase.co";
// Welt: ein Mitarbeiter mit hinterlegter E-Mail, ein Mitarbeiter ohne, Passwort "richtig"
const WELT={profile:{"mitarbeiter@example.com":"u-1"},auth:{"u-1":"max.muster"+PSEUDO},passwoerter:{["max.muster"+PSEUDO]:"richtig"}};
async function lauf(o){
 o=Object.assign({login:"mitarbeiter@example.com",password:"richtig",ip:"1.2.3.4",zaehler:{},limitInsert:200,limitCount:200,ohneBody:false,rawBody:null,method:"POST"},o||{});
 let handler=null; const aufrufe=[],logs=[];
 const sb={
  Deno:{serve:h=>{handler=h},env:{get:k=>({SUPABASE_URL:"https://t.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"SRV",SUPABASE_ANON_KEY:"ANON"})[k]}},
  fetch:async(url,opt)=>{
   url=String(url); aufrufe.push(url.replace("https://t.supabase.co",""));
   if(url.indexOf("/rest/v1/login_aufloesung_versuche")>0){
    if(opt&&opt.method==="POST"){ if(o.limitInsert!==200)return {ok:false,status:o.limitInsert,text:async()=>""}; JSON.parse(opt.body).forEach(r=>{o.zaehler[r.schluessel]=(o.zaehler[r.schluessel]||0)+1}); return {ok:true,status:201}}
    if(opt&&opt.method==="DELETE")return {ok:true,status:204};
    if(o.limitCount!==200)return {ok:false,status:o.limitCount,json:async()=>[]};
    const k=decodeURIComponent(/schluessel=eq\.([^&]+)/.exec(url)[1]);
    return {ok:true,status:200,json:async()=>Array.from({length:o.zaehler[k]||0},(_,i)=>({id:i}))};
   }
   if(url.indexOf("/rest/v1/profiles?email=")>0){const e=decodeURIComponent(/email=eq\.([^&]+)/.exec(url)[1]);return {ok:true,status:200,json:async()=>WELT.profile[e]?[{id:WELT.profile[e]}]:[]}}
   if(url.indexOf("/auth/v1/admin/users/")>0){const id=decodeURIComponent(url.split("/auth/v1/admin/users/")[1]);return WELT.auth[id]?{ok:true,status:200,json:async()=>({email:WELT.auth[id]})}:{ok:false,status:404,json:async()=>({})}}
   if(url.indexOf("/auth/v1/token?grant_type=password")>0){
    const b=JSON.parse(opt.body); sb.__apikey=opt.headers.apikey;
    return WELT.passwoerter[b.email]===b.password?{ok:true,status:200,json:async()=>({access_token:"AT",refresh_token:"RT",user:{email:b.email}})}:{ok:false,status:400,json:async()=>({error_code:"invalid_credentials"})};
   }
   return {ok:false,status:500,json:async()=>({})};
  },
  crypto:nodeCrypto.webcrypto,TextEncoder,Uint8Array,Array,String,Number,Date,JSON,Math,Error,Response,Promise,encodeURIComponent,decodeURIComponent,
  console:{log(){},error:(...a)=>logs.push(a.join(" "))},setTimeout
 };
 vm.runInNewContext(JS,sb);
 const kopf={"cf-connecting-ip":o.ip};
 const req={method:o.method,headers:{get:n=>kopf[String(n).toLowerCase()]||null},
  json:async()=>{if(o.rawBody==="kaputt")throw new Error("json");return o.ohneBody?{}:{login:o.login,password:o.password}}};
 const res=await handler(req);
 const text=await res.text();
 return {status:res.status,text,body:(()=>{try{return JSON.parse(text)}catch{return null}})(),aufrufe,logs,zaehler:o.zaehler,headers:res.headers,apikey:sb.__apikey};
}
const auth=r=>r.aufrufe.filter(u=>u.indexOf("grant_type=password")>0).length;
(async()=>{
 console.log("\nA · Beide Anmeldewege bleiben");
 let r=await lauf({login:"mitarbeiter@example.com"});
 p(r.status===200&&r.body.ok===true&&r.body.access_token==="AT"&&r.body.refresh_token==="RT","Mitarbeiter mit hinterlegter E-Mail + richtiges Passwort: Sitzung zurueck",r.body);
 p(Object.keys(r.body).sort().join()==="access_token,ok,refresh_token"&&r.text.indexOf("supabase.co")<0&&r.text.indexOf("max.muster")<0,"...und KEINE Adresse/kein Benutzername in der Antwort",r.text);
 p(r.apikey==="ANON","die Passwortpruefung laeuft mit dem oeffentlichen Schluessel, nicht mit dem Service-Schluessel",r.apikey);
 r=await lauf({login:"Max.Muster",password:"richtig"});
 p(r.status===200&&r.body.ok===true&&r.body.access_token==="AT","Benutzername (falls der Client die Funktion doch ruft): funktioniert ebenfalls",r.body);
 r=await lauf({login:"  MITARBEITER@Example.COM  "});
 p(r.status===200&&r.body.ok===true,"Gross-/Kleinschreibung und Leerzeichen werden normalisiert",r.body);

 console.log("\nB · Bekannt und unbekannt sehen gleich aus");
 const falschesPw=await lauf({login:"mitarbeiter@example.com",password:"falsch"});
 const unbekannt=await lauf({login:"gibtes@nicht.example",password:"falsch"});
 const ohneMail=await lauf({login:"max.muster",password:"falsch"});
 p(falschesPw.status===401&&unbekannt.status===401&&ohneMail.status===401,"alle drei: HTTP 401",[falschesPw.status,unbekannt.status,ohneMail.status]);
 p(falschesPw.text===unbekannt.text&&unbekannt.text===ohneMail.text&&falschesPw.text==='{"ok":false}',"identischer Antworttext, keine Konto-Information",[falschesPw.text,unbekannt.text,ohneMail.text]);
 const form=r=>r.aufrufe.map(u=>u.replace(/\?.*/,"").replace(/\/users\/.*/,"/users/X")).filter(u=>u.indexOf("login_aufloesung")<0).join("|");
 p(form(falschesPw)===form(unbekannt)&&auth(falschesPw)===1&&auth(unbekannt)===1,"bei Bekanntem und Unbekanntem laufen dieselben Schritte (Profil, Auth-Nachschlagen, Passwortpruefung) - kein Zeitunterschied durch uebersprungene Arbeit",[form(falschesPw),form(unbekannt)]);
 p(falschesPw.logs.length===0&&unbekannt.logs.length===0,"nichts im Log fuer normale Absagen (kein Konto-/Passwortbezug)",falschesPw.logs);
 for(const x of [falschesPw,unbekannt,ohneMail,await lauf({login:"mitarbeiter@example.com"})])
  p(x.text.indexOf("max.muster")<0&&x.text.indexOf("nfgryuzkpwjfmdlmevuy")<0,"keine interne Pseudo-Adresse in einer Antwort ("+x.status+")",x.text);

 console.log("\nC · Limit");
 const z={}; let letzte=null;
 for(let i=0;i<10;i++){letzte=await lauf({login:"opfer@example.com",password:"x",ip:"9.9."+i+".1",zaehler:z});}
 p(letzte.status===429&&letzte.text==='{"ok":false}',"mehr als 8 Versuche auf dieselbe Eingabe (auch von wechselnden IPs): 429",letzte.status);
 p(auth(letzte)===0,"...und dann wird NICHTS mehr bei Supabase Auth geprueft",letzte.aufrufe);
 const z2={}; let l2=null;
 for(let i=0;i<32;i++){l2=await lauf({login:"person"+i+"@example.com",password:"x",ip:"7.7.7.7",zaehler:z2});}
 p(l2.status===429,"mehr als 30 Versuche von derselben IP (auf verschiedene Eingaben): 429",l2.status);
 const ges=await lauf({login:"opfer@example.com",password:"x",zaehler:z});
 const gesUnbekannt=await lauf({login:"niemand@example.com",password:"x",ip:"7.7.7.7",zaehler:z2});
 p(ges.status===429&&gesUnbekannt.status===429&&ges.text===gesUnbekannt.text,"gesperrt sieht fuer existierende und nicht existierende Konten gleich aus",[ges.status,gesUnbekannt.status]);
 const hashOk=Object.keys(z).every(k=>/^(ip|login):[0-9a-f]{64}$/.test(k));
 p(hashOk&&Object.keys(z).length>0,"im Zaehler stehen nur SHA-256-Hashes (keine E-Mail, keine IP im Klartext)",Object.keys(z).slice(0,2));
 r=await lauf({limitInsert:500});
 p(r.status===503&&r.text==='{"ok":false}'&&auth(r)===0,"Zaehler nicht beschreibbar: 503, es wird NICHT geprueft (fail closed)",r);
 r=await lauf({limitCount:500});
 p(r.status===503&&auth(r)===0,"Zaehler nicht lesbar: 503, es wird NICHT geprueft (fail closed)",r.status);

 console.log("\nD · Ungueltige Eingaben, CORS, Methoden");
 r=await lauf({login:"",password:"x"}); p(r.status===400&&auth(r)===0&&r.aufrufe.length===0,"leere Eingabe: 400, ohne jeden Aufruf",r.status);
 r=await lauf({login:"a@b.ch",password:""}); p(r.status===400&&r.aufrufe.length===0,"leeres Passwort: 400",r.status);
 r=await lauf({ohneBody:true}); p(r.status===400,"fehlende Felder: 400",r.status);
 r=await lauf({login:"a".repeat(300)+"@x.ch",password:"x"}); p(r.status===400&&r.aufrufe.length===0,"ungewoehnlich lange Eingabe: 400, ohne Aufruf",r.status);
 r=await lauf({login:"a@b.ch",password:"x".repeat(300)}); p(r.status===400&&r.aufrufe.length===0,"ungewoehnlich langes Passwort: 400, ohne Aufruf",r.status);
 r=await lauf({rawBody:"kaputt"}); p(r.status===400,"kein gueltiges JSON: 400",r.status);
 r=await lauf({method:"GET"}); p(r.status===405&&r.aufrufe.length===0,"GET: 405",r.status);
 r=await lauf({method:"OPTIONS"});
 const ah=r.headers.get("access-control-allow-headers")||"";
 p(r.status===200&&/authorization/.test(ah)&&/apikey/.test(ah)&&/x-client-info/.test(ah)&&/content-type/.test(ah),"OPTIONS: 200 und erlaubt genau die Header, die supabase-js schickt (apikey, x-client-info, ...)",ah);
 r=await lauf({login:"mitarbeiter@example.com"});
 p(/\*/.test(r.headers.get("access-control-allow-origin")||""),"Antworten tragen CORS-Header",null);

 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();

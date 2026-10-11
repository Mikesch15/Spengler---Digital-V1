// Prueft v3.316: system-admin-storage-cron kennt kein Geheimnis mehr im Code. Die Funktion fragt die Datenbank
// (public.system_cron_secret_ok); ohne Antwort/ohne Geheimnis/mit falschem Geheimnis wird abgelehnt (fail closed).
// Geprueft wird die ECHTE Datei (Supabase/Resend als Attrappe, ohne Deno). Das Repo darf kein Geheimnis enthalten.
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const strip=require("module").stripTypeScriptTypes;
if(typeof strip!=="function"){console.log("  FEHLGESCHLAGEN: Node >= 22.13 noetig");process.exit(1)}
process.emitWarning=()=>{};
const datei="supabase/functions/system-admin-storage-cron/index.ts";
const quelle=fs.readFileSync(path.join(process.cwd(),datei),"utf8");
const JS=strip(quelle);
async function lauf(o){
 o=Object.assign({header:"richtig",geheimnisRpc:true,rpcStatus:200,rpcWirft:false,zeilen:[],method:"POST",resendOk:true},o||{});
 let h=null; const aufrufe=[],logs=[],mails=[];
 const sb={Deno:{serve:x=>{h=x},env:{get:k=>({SUPABASE_URL:"https://t.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"SRV",RESEND_API_KEY:"RS"})[k]}},
  fetch:async(url,opt)=>{
   url=String(url); aufrufe.push(url.replace("https://t.supabase.co",""));
   if(url.indexOf("rpc/system_cron_secret_ok")>0){
    if(o.rpcWirft)throw new Error("Netz");
    const b=JSON.parse(opt.body);
    return {ok:o.rpcStatus===200,status:o.rpcStatus,json:async()=>o.geheimnisRpc&&b.p_secret==="richtig"};
   }
   if(url.indexOf("rpc/system_cron_verwaiste_storage")>0)return {ok:true,status:200,json:async()=>o.zeilen};
   if(url.indexOf("api.resend.com")>0){mails.push(JSON.parse(opt.body));return {ok:o.resendOk,status:o.resendOk?200:403,text:async()=>"Rohtext mit Details"}}
   return {ok:false,status:500};
  },
  AbortSignal,Response,JSON,Math,Array,Number,String,Error,Promise,encodeURIComponent,console:{log(){},error:(...a)=>logs.push(a.join(" "))}};
 vm.runInNewContext(JS,sb);
 const kopf=o.header===null?{}:{"x-cron-secret":o.header};
 const res=await h({method:o.method,headers:{get:n=>kopf[String(n).toLowerCase()]||null}});
 const text=await res.text();
 return {status:res.status,text,body:JSON.parse(text),aufrufe,logs,mails};
}
(async()=>{
 console.log("\nA · Zugang");
 let r=await lauf();
 p(r.status===200&&r.body.ok===true&&r.body.gefunden===0,"richtiges Geheimnis: Lauf, nichts gefunden -> keine Mail",r);
 r=await lauf({header:"falsch"}); p(r.status===401&&r.aufrufe.length===1&&r.aufrufe[0].indexOf("system_cron_secret_ok")>0,"falsches Geheimnis: 401, kein Zugriff auf die Storage-Liste",r);
 r=await lauf({header:null}); p(r.status===401&&r.aufrufe.length===0,"ohne Header: 401, nicht einmal eine Datenbankabfrage",r);
 r=await lauf({header:"x".repeat(500)}); p(r.status===401&&r.aufrufe.length===0,"absurd langer Wert: 401 ohne Abfrage",r.status);
 r=await lauf({rpcStatus:500}); p(r.status===401&&r.aufrufe.length===1,"Datenbank kann das Geheimnis nicht pruefen (500): abgelehnt (fail closed)",r);
 r=await lauf({rpcWirft:true}); p(r.status===401,"Datenbank nicht erreichbar: abgelehnt (fail closed)",r.status);
 r=await lauf({method:"GET"}); p(r.status===405&&r.aufrufe.length===0,"GET: 405",r.status);
 console.log("\nB · Lauf und Mail");
 const zeilen=[{pfad:'firma/<b>x</b>.jpg',groesse_bytes:2048,erstellt:"",kategorie:""},{pfad:"b.pdf",groesse_bytes:3*1048576,erstellt:"",kategorie:""}];
 r=await lauf({zeilen}); p(r.status===200&&r.body.gefunden===2&&r.body.mailVersendet===true&&r.mails.length===1,"Fund: genau eine Mail an den Betreiber",r.body);
 p(r.mails[0].html.indexOf("<b>x</b>")<0&&r.mails[0].html.indexOf("&lt;b&gt;x")>0,"Dateipfade werden in der Mail maskiert",r.mails[0].html.slice(0,160));
 r=await lauf({zeilen,resendOk:false}); p(r.status===200&&r.body.mailVersendet===false&&r.text.indexOf("Rohtext")<0,"Mail scheitert: Antwort ohne Rohtext von Resend",r.text);
 console.log("\nC · Kein Geheimnis im Repo");
 p(!/[0-9a-f]{64}/i.test(quelle),"im Funktionscode steht kein 64-stelliger Geheimniswert",null);
 console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
 process.exit(fail?1:0);
})();

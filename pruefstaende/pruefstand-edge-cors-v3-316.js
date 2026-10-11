// Prueft v3.316: Jede Edge Function, die die App mit supabase-js (functions.invoke) aufruft, muss im CORS-Preflight
// "apikey" und "x-client-info" erlauben. supabase-js schickt beide immer mit; fehlen sie, blockiert der Browser die
// Anfrage, BEVOR sie den Server erreicht (in den Logs: OPTIONS ohne POST). So war es bei password-reset und
// resolve-login-email seit v3.103 (Mail kam nie an, Login mit E-Mail ging nie) und bei reset-password (Admin setzt
// Mitarbeiter-Passwort zurueck). Der Prueftand liest den Code - er fragt nicht live.
"use strict";
const fs=require("fs"), path=require("path");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};
const wurzel=process.cwd();
const aufrufe=new Set();
for(const f of fs.readdirSync(path.join(wurzel,"js")).filter(f=>f.endsWith(".js"))){
 const t=fs.readFileSync(path.join(wurzel,"js",f),"utf8");
 for(const m of t.matchAll(/functions\.invoke\("([a-z0-9-]+)"/g))aufrufe.add(m[1]);
}
p(aufrufe.size>=6,"die App ruft mehrere Funktionen per functions.invoke auf ("+[...aufrufe].join(", ")+")",aufrufe.size);
for(const name of [...aufrufe].sort()){
 const dir=path.join(wurzel,"supabase/functions",name);
 const datei=["index.ts","Index.ts"].map(x=>path.join(dir,x)).find(x=>fs.existsSync(x));
 p(!!datei,name+": Code liegt im Repo",null);
 if(!datei)continue;
 const t=fs.readFileSync(datei,"utf8");
 const m=/"Access-Control-Allow-Headers":\s*"([^"]*)"/.exec(t);
 const h=(m&&m[1]||"").toLowerCase();
 p(/apikey/.test(h)&&/x-client-info/.test(h)&&/authorization/.test(h)&&/content-type/.test(h),name+": Preflight erlaubt authorization, apikey, x-client-info, content-type",h);
}
// die beiden Funktionen, die per fetch() aufgerufen werden, senden dieselben Kopfzeilen
for(const name of ["extract-offer-positions","extract-profile-shape"]){
 const dir=path.join(wurzel,"supabase/functions",name);
 const datei=["index.ts","Index.ts"].map(x=>path.join(dir,x)).find(x=>fs.existsSync(x));
 const h=((/"Access-Control-Allow-Headers":\s*"([^"]*)"/.exec(fs.readFileSync(datei,"utf8"))||[])[1]||"").toLowerCase();
 p(/apikey/.test(h)&&/authorization/.test(h)&&/content-type/.test(h),name+": Preflight erlaubt die vom Client gesendeten Kopfzeilen",h);
}
console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail?1:0);

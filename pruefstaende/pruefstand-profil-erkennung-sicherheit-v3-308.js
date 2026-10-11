// Prueft v3.308 (Auftrag "extract-profile-shape absichern"): die Profilskizzen-Erkennung (Freies Profil, js/14) ist
// nur fuer angemeldete Personen mit aktiver Firma nutzbar.
// Vorher: der Client schickte den OEFFENTLICHEN App-Schluessel als Bearer, die Funktion pruefte selbst nichts und der
// Gateway laesst diesen Schluessel durch (an extract-offer-positions live gemessen) - ohne Anmeldung aufrufbar, jeder
// Aufruf = Gemini-Kosten.
// Geprueft wird die ECHTE Datei supabase/functions/extract-profile-shape/Index.ts (Supabase/Gemini als Attrappe, ohne
// Deno) UND der Client (recognizeProfileSketch mit einer Attrappe der Sitzung).
// BELEGT: Zugangslogik, Token statt Schluessel, kein Schluessel in Antworten, unveraendertes Antwortformat.
// NICHT belegt: ein echter Aufruf mit echter Sitzung, die Erkennungsguete, das Deployment (siehe PROJECT_STATE).
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

// ---------- Teil 1: die Funktion ----------
const quelle=fs.readFileSync(path.join(process.cwd(),"supabase/functions/extract-profile-shape/Index.ts"),"utf8");
function ohneTypen(t){
 return t
  .replace(/\): Promise<\{ ok: true \} \| \{ ok: false; status: number; error: string \}> \{/g,") {")
  .replace(/\(e as \{ name\?: string \}\)/g,"(e)")
  .replace(/\(e as Record<string, unknown>\)/g,"(e)")
  .replace(/antwort as Record<string, unknown>/g,"antwort")
  .replace(/const gut: \{ laenge: number; winkel: number \}\[\] = \[\];/g,"const gut = [];")
  .replace(/(\(|, )(\w+): (unknown|string|number|Request)(?=[,)= ])/g,"$1$2")
  .replace(/let (res|raw|antwort): [A-Za-z]+( =|;)/g,"let $1$2");
}
const JS=ohneTypen(quelle);
const KEY="GEHEIMER-GEMINI-KEY";
const GUT='{"sicher":true,"schenkel":[{"laenge":40,"winkel":0},{"laenge":100,"winkel":90}]}';
async function lauf(gemini,zugang,bild){
 const z=Object.assign({auth:"Bearer user-token-123",rpc:{status:200,body:'"firma-1"'}},zugang||{});
 const aufrufe=[],rpc=[]; let handler=null;
 const sb={
  Deno:{serve:h=>{handler=h},env:{get:k=>({GEMINI_API_KEY:KEY,SUPABASE_URL:"https://t.supabase.co",SUPABASE_ANON_KEY:"ANON-OEFFENTLICH"})[k]}},
  fetch:async(url,opt)=>{
   if(String(url).indexOf("/rest/v1/rpc/my_company_id")>0){
    rpc.push({headers:opt.headers});
    if(z.rpc==="netz")throw new Error("Netz");
    return {ok:z.rpc.status>=200&&z.rpc.status<300,status:z.rpc.status,json:async()=>JSON.parse(z.rpc.body)};
   }
   aufrufe.push(String(url));
   if(gemini.wirf){const e=new Error("x");e.name="AbortError";throw e}
   return {ok:gemini.status===200,status:gemini.status,json:async()=>gemini.json};
  },
  setTimeout,clearTimeout,AbortController,AbortSignal,Response,JSON,Math,Array,String,Number,Error,RegExp,Promise,Object,console:{log(){},error(){}}
 };
 vm.runInNewContext(JS,sb);
 const kopf=z.auth?{authorization:z.auth}:{};
 const res=await handler({method:"POST",headers:{get:n=>kopf[String(n).toLowerCase()]||null},json:async()=>({image_base64:bild===undefined?"data:image/png;base64,AAAA":bild})});
 return {status:res.status,body:JSON.parse(await res.text()),aufrufe,rpc};
}
const gutAntwort={status:200,json:{candidates:[{content:{parts:[{text:GUT}]}}]}};
const hatEnglisch=s=>/UNAVAILABLE|INTERNAL|API key|\"code\"|high demand/.test(s||"");
(async()=>{
 console.log("\nA · Zugang zur Funktion");
 let r=await lauf(gutAntwort,{auth:null});
 p(r.status===401&&/angemeldet/.test(r.body.error)&&r.aufrufe.length===0,"ohne Authorization: 401, keine Anfrage an Google",r);
 r=await lauf(gutAntwort,{auth:"Basic x"});
 p(r.status===401&&r.aufrufe.length===0,"falsches Schema: 401",r.status);
 r=await lauf(gutAntwort,{rpc:{status:401,body:'{"message":"JWT expired"}'}});
 p(r.status===401&&r.aufrufe.length===0&&JSON.stringify(r.body).indexOf("JWT expired")<0,"abgelaufenes/ungültiges Token: 401, ohne englischen Rohtext",r);
 r=await lauf(gutAntwort,{rpc:{status:403,body:"{}"}});
 p(r.status===401&&r.aufrufe.length===0,"ÖFFENTLICHER App-Schlüssel statt Benutzer (PostgREST verweigert my_company_id): abgewiesen",r.status);
 r=await lauf(gutAntwort,{rpc:{status:200,body:"null"}});
 p(r.status===403&&/Firmenkonto/.test(r.body.error)&&r.aufrufe.length===0,"angemeldet, aber ohne aktive Firma: 403, keine Anfrage an Google",r);
 r=await lauf(gutAntwort,{rpc:"netz"});
 p(r.status===503&&r.aufrufe.length===0,"Anmeldeprüfung nicht erreichbar: NICHT durchlassen (fail closed)",r.status);
 r=await lauf(gutAntwort);
 p(r.status===200&&r.body.ok&&r.aufrufe.length===1,"Gegenprobe: angemeldet mit aktiver Firma → Erkennung läuft",r.body);
 p(r.rpc.length===1&&r.rpc[0].headers.Authorization==="Bearer user-token-123"&&r.rpc[0].headers.apikey==="ANON-OEFFENTLICH","die Prüfung benutzt GENAU das Token der Person; der öffentliche Schlüssel nur als apikey");

 console.log("\nB · Antwortformat und Erkennung unverändert");
 p(JSON.stringify(r.body.schenkel)===JSON.stringify([{laenge:40,winkel:0},{laenge:100,winkel:90}])&&r.body.verworfen===0&&/Schätzwerte/.test(r.body.hinweis),"Schenkel, verworfen und Hinweis wie bisher",r.body);
 r=await lauf({status:200,json:{candidates:[{content:{parts:[{text:'{"sicher":false,"schenkel":[]}'}]}}]}});
 p(r.status===200&&r.body.ok===false&&/Keine eindeutige Form/.test(r.body.error),"'unsicher' bleibt eine ehrliche Absage (200, ok:false)",r.body);
 r=await lauf({status:200,json:{candidates:[{content:{parts:[{text:'[{"laenge":-5,"winkel":0},{"laenge":30,"winkel":0},{"laenge":50,"winkel":400}]'}]}}]}});
 p(r.body.ok&&r.body.schenkel.length===2&&r.body.verworfen===1&&r.body.schenkel[1].winkel===180,"Prüfung der Schenkel (negativ verworfen, Winkel begrenzt) unverändert",r.body);
 r=await lauf({wirf:true});
 p(r.status===504&&/zu lange gedauert/.test(r.body.error),"Zeitgrenze: 504 mit dem bisherigen Satz",r.body);
 r=await lauf(gutAntwort,{},"data:image/png;base64,"+"A".repeat(12000001));
 p(r.status===413&&/zu gross/.test(r.body.error)&&r.aufrufe.length===0,"v3.316: Bild ueber der Obergrenze: 413 mit deutschem Satz, keine Anfrage an Google",{s:r.status,e:r.body.error});
 r=await lauf(gutAntwort,{},"data:image/png;base64,"+"A".repeat(1000));
 p(r.status===200&&r.aufrufe.length===1,"v3.316: Gegenprobe: normale Groesse wird erkannt",r.status);
 r=await lauf(gutAntwort,{},"");
 p(r.status===400&&/Kein Bild/.test(r.body.error)&&r.aufrufe.length===0,"kein Bild: 400 wie bisher, keine Anfrage an Google",r.body);

 console.log("\nC · Fehler von Google: deutscher Satz, kein Schlüssel");
 r=await lauf({status:503,json:{error:{message:"This model is overloaded. key="+KEY,status:"UNAVAILABLE"}}});
 p(r.status===503&&/überlastet/.test(r.body.error)&&!hatEnglisch(r.body.error)&&JSON.stringify(r.body).indexOf(KEY)<0,"503: deutscher Satz, kein rohes Englisch, Schlüssel geschwärzt",r.body);
 r=await lauf({status:400,json:{error:{message:"API key not valid: "+KEY}}});
 p(r.status===502&&/fehlgeschlagen/.test(r.body.error)&&!hatEnglisch(r.body.error)&&JSON.stringify(r.body).indexOf(KEY)<0&&/\*\*\*/.test(r.body.detail),"400: deutscher Satz; 'detail' ohne Schlüssel",r.body);
 p(JSON.stringify(r.body).indexOf("user-token-123")<0&&JSON.stringify(r.body).indexOf("ANON-OEFFENTLICH")<0,"weder Token noch öffentlicher Schlüssel stehen in der Antwort");

 console.log("\nD · CORS");
 {
  const sb2={Deno:{serve:h=>{globalThis.__h=h},env:{get:()=>undefined}},fetch:async()=>{throw new Error("kein Netz")},Response,AbortController,AbortSignal,setTimeout,clearTimeout,JSON,Math,Array,String,Number,Error,RegExp,Promise,Object,console:{log(){},error(){}}};
  vm.runInNewContext(JS,sb2);
  const o=await globalThis.__h({method:"OPTIONS",headers:{get:()=>null}});
  p(o.status===200&&/authorization/.test(o.headers.get("Access-Control-Allow-Headers")),"Preflight (OPTIONS) braucht keine Anmeldung und erlaubt den Authorization-Header",o.status);
 }

 // ---------- Teil 2: der Client ----------
 console.log("\nE · Client: Token der Person, nicht der öffentliche Schlüssel");
 const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
 const {chromePfad}=require(__dirname+"/chrome-pfad.js");
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 const ATTRAPPE="window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:window.__session||null}}),onAuthStateChange:()=>{}},from:()=>({select:()=>({then:r=>Promise.resolve({data:[],error:null}).then(r)})}),rpc:async()=>({data:null,error:null}),storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:'x'}})})}})};";
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 const kopf=[];
 await page.route("**/functions/v1/extract-profile-shape",async route=>{
  kopf.push(route.request().headers());
  await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,schenkel:[{laenge:40,winkel:0},{laenge:100,winkel:90}],verworfen:0})});
 });
 await page.goto("file://"+process.cwd()+"/index.html");
 await page.waitForFunction(()=>typeof recognizeProfileSketch==="function"&&typeof erkennungsToken==="function");
 await page.evaluate(()=>{window.__session={access_token:"test-benutzer-jwt"}});
 const erg=await page.evaluate(async()=>{try{return {r:await recognizeProfileSketch("data:image/png;base64,AAAA")}}catch(e){return {fehler:e.message}}});
 p(erg.r&&erg.r.schenkel.length===2,"mit Sitzung: die Erkennung liefert die Schenkel wie bisher",erg);
 p(kopf.length===1&&kopf[0].authorization==="Bearer test-benutzer-jwt"&&kopf[0].apikey&&!/sb_publishable/.test(kopf[0].authorization),"die Anfrage trägt das Token der Person als Bearer, NICHT den öffentlichen Schlüssel",kopf[0]&&kopf[0].authorization);
 kopf.length=0;
 await page.evaluate(()=>{window.__session=null});
 const ohne=await page.evaluate(async()=>{try{await recognizeProfileSketch("data:image/png;base64,AAAA");return {}}catch(e){return {fehler:e.message}}});
 p(kopf.length===0&&/nicht angemeldet|Anmeldung/.test(ohne.fehler||"")&&!/Verbindung/.test(ohne.fehler||""),"ohne Sitzung: KEINE Anfrage, der Anmelde-Satz (nicht 'Keine Verbindung')",{kopf:kopf.length,ohne});
 // 401 des Gateways (englisch, ohne "error")
 await page.unroute("**/functions/v1/extract-profile-shape");
 await page.route("**/functions/v1/extract-profile-shape",r=>r.fulfill({status:401,contentType:"application/json",body:JSON.stringify({code:"UNAUTHORIZED_INVALID_JWT_FORMAT",message:"Invalid JWT"})}));
 await page.evaluate(()=>{window.__session={access_token:"abgelaufen"}});
 const g401=await page.evaluate(async()=>{try{await recognizeProfileSketch("data:image/png;base64,AAAA");return {}}catch(e){return {fehler:e.message}}});
 p(/abgelaufen|ungültig/.test(g401.fehler||"")&&!/Invalid JWT|UNAUTHORIZED/.test(g401.fehler||""),"401 des Gateways: verständlicher Satz statt 'Invalid JWT'",g401);
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();

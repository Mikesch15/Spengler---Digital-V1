// Prueft v3.306 / Edge-Function-Fassung v25 (extract-offer-positions): die Fehlerwege der Erkennung.
// Auftrag: "Offertpositionen zuverlaessiger aus PDF und Foto importieren". Geprueft wird die ECHTE Datei
// supabase/functions/extract-offer-positions/index.ts - ohne Deno, mit einer Attrappe fuer Gemini (fetch).
// BELEGT damit: MIME-Typ und Inhalt werden unveraendert weitergereicht (PDF als application/pdf), welche
// Fehler wiederholt werden, dass jede Fehlerart einen deutschen Satz bekommt, dass der API-Key nie in der
// Antwort steht, und dass nur echte Objekte als Positionen gelten.
// NICHT belegt: ein echter Gemini-Aufruf (Netz/Key gibt es hier nicht), die Erkennungsguete, das Deployment.
const fs=require("fs"), path=require("path"), vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const quelle=fs.readFileSync(path.join(process.cwd(),"supabase/functions/extract-offer-positions/index.ts"),"utf8");
// Die Datei ist TypeScript; sie benutzt nur wenige, einfache Typangaben. Sie werden hier entfernt, damit
// derselbe Code unter Node (auch Version 20 in der CI) laeuft. Kommt eine neue Art Typangabe dazu, scheitert
// dieser Pruefstand laut - er wird dann angepasst, nicht uebergangen.
function ohneTypen(t){
 return t
  .replace(/\bas (Error|unknown\[\])/g,"")
  .replace(/(\w)!(?=[.;,)])/g,"$1")
  .replace(/\): Promise<.*?> \{$/gm,") {")
  .replace(/let gelesen: [^;=]+= null;/g,"let gelesen = null;")
  .replace(/\): Promise<\{ ok: true \} \| \{ ok: false; status: number; error: string \}> \{/g,") {")
  .replace(/(\(|, )(\w+): (unknown|string|number|Uint8Array|Request)(?=[,)= ])/g,"$1$2")
  .replace(/\): (string|boolean) (\{|=>)/g,") $2")
  .replace(/let (body|res|positions): [^;=]+;/g,"let $1;");
}
const JS=ohneTypen(quelle);
const KEY="GEHEIMER-KEY-123";
// zugang: Verhalten der Anmeldepruefung (Aufruf von my_company_id mit dem Benutzer-Token):
//   {auth:"Bearer user-token"|null, rpc:{status,body}|"netz"}; Standard = angemeldete Person mit aktiver Firma
async function lauf(ablauf,bild,zugang){
 const z=Object.assign({auth:"Bearer user-token-123",rpc:{status:200,body:'"firma-uuid-1"'}},zugang||{});
 const aufrufe=[], rpcAufrufe=[]; let i=0, handler=null;
 const sandbox={
  __abrufe:[],
  Deno:{serve:h=>{handler=h},env:{get:k=>({GEMINI_API_KEY:KEY,SUPABASE_URL:"https://test.supabase.co",SUPABASE_ANON_KEY:"ANON-OEFFENTLICH"})[k]}},
  fetch:async(url,opt)=>{
   if(String(url).indexOf("/rest/v1/rpc/my_company_id")>0){
    rpcAufrufe.push({url:String(url),headers:opt.headers});
    if(z.rpc==="netz")throw new Error("Netz weg");
    return {ok:z.rpc.status>=200&&z.rpc.status<300,status:z.rpc.status,text:async()=>z.rpc.body,json:async()=>JSON.parse(z.rpc.body)};
   }
   if(String(url).indexOf("https://test.supabase.co/storage/")===0||String(url).indexOf("http")===0&&String(url).indexOf("generativelanguage")<0){
    sandbox.__abrufe.push(String(url));
    const st=z.storage||{ok:true,ct:"image/jpeg",len:"3",bytes:3};
    return {ok:st.ok,status:st.ok?200:404,headers:{get:n=>String(n).toLowerCase()==="content-type"?st.ct:(String(n).toLowerCase()==="content-length"?st.len:null)},arrayBuffer:async()=>new Uint8Array(st.bytes).buffer};
   }
   aufrufe.push({url:String(url),body:opt&&opt.body?JSON.parse(opt.body):null});
   const a=ablauf[Math.min(i++,ablauf.length-1)];
   if(a.wirfUrl)throw new Error("error sending request for url ("+url+"): connection reset");
   if(a.wirf){const e=new Error("abgebrochen");e.name="AbortError";throw e}
   return {ok:a.status===200,status:a.status,text:async()=>a.text||"",json:async()=>a.json};
  },
  setTimeout:(f,ms)=>setTimeout(f,0), clearTimeout, AbortController, AbortSignal, Response, btoa, atob, JSON, Math, Array, String,
  Uint8Array, Error, RegExp, Promise, Object, URL, Number, console:{log(){},error(){}}
 };
 vm.runInNewContext(JS,sandbox);
 const kopf=z.auth?{authorization:z.auth}:{};
 const res=await handler({method:"POST",headers:{get:n=>kopf[String(n).toLowerCase()]||null},json:async()=>({image:bild})});
 const body=JSON.parse(await res.text());
 return {status:res.status,body,aufrufe,rpcAufrufe,abrufe:sandbox.__abrufe};
}
const PDF="data:application/pdf;base64,JVBERi0xLjQK";
const JPG="data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const gut=(txt)=>({status:200,json:{candidates:[{content:{parts:[{text:txt}]},finishReason:"STOP"}]}});
const POS='[{"pos":"1","description":"Rinne","quantity":3,"unit":"m","price":10,"abschnitt":""}]';
const leer={status:200,json:{candidates:[{content:{parts:[{text:""}]},finishReason:"STOP"}]}};
const hatEnglisch=s=>/UNAVAILABLE|INTERNAL|INVALID_ARGUMENT|high demand|\"code\"/.test(s||"");
(async()=>{
 console.log("\nA · Typ und Inhalt kommen unverändert bei Gemini an");
 let r=await lauf([gut(POS)],PDF);
 p(r.status===200&&r.body.ok&&r.body.positions.length===1,"PDF: Erfolg mit einer Position",r.body);
 p(r.aufrufe[0].body.contents[0].parts[1].inline_data.mime_type==="application/pdf"&&r.aufrufe[0].body.contents[0].parts[1].inline_data.data==="JVBERi0xLjQK","PDF geht als application/pdf mit dem Inhalt der Datei (nicht umgewandelt)",r.aufrufe[0].body.contents[0].parts[1].inline_data);
 r=await lauf([gut(POS)],JPG);
 p(r.aufrufe[0].body.contents[0].parts[1].inline_data.mime_type==="image/jpeg","Foto geht als image/jpeg",r.aufrufe.length);
 p(r.aufrufe[0].body.generationConfig.maxOutputTokens===65536&&r.aufrufe[0].url.indexOf("gemini-3.6-flash")>0,"Modell und Einstellungen unverändert");

 console.log("\nB · Nicht lesbare Dateien werden vor dem Aufruf abgelehnt");
 r=await lauf([gut(POS)],"data:text/plain;base64,aGFsbG8=");
 p(r.status===400&&/Dateityp/.test(r.body.error)&&r.aufrufe.length===0&&!hatEnglisch(r.body.error),"Text-Datei: deutscher Satz, kein Aufruf bei Google",r);
 r=await lauf([gut(POS)],"data:application/octet-stream;base64,AAAA");
 p(r.status===400&&r.aufrufe.length===0,"unbekannter Typ (octet-stream): abgelehnt",r.status);
 r=await lauf([gut(POS)],"");
 p(r.status===400&&r.aufrufe.length===0,"leere Eingabe: abgelehnt",r.status);

 console.log("\nC · Wiederholt wird nur bei 503/429 (Regel aus v3.254 bleibt); alles andere sofort und auf Deutsch");
 r=await lauf([{status:500,text:"{\"error\":{\"code\":500,\"status\":\"INTERNAL\"}}"}],JPG);
 p(r.status===502&&r.aufrufe.length===1&&/nochmals/.test(r.body.error)&&!hatEnglisch(r.body.error),"500: eine Anfrage (keine Wiederholung ohne Beleg), deutscher Satz mit nächster Handlung, kein rohes Englisch",{s:r.status,n:r.aufrufe.length,e:r.body.error});
 r=await lauf([{status:429,text:"x"},{status:429,text:"x"},{status:429,text:"x"},gut(POS)],JPG);
 p(r.status===200&&r.aufrufe.length===4,"429 und 503 werden weiter bis zu vierfach wiederholt (unverändert)",r.aufrufe.length);
 r=await lauf([{status:503,text:"x"}],JPG);
 p(r.status===503&&r.aufrufe.length===4&&/überlastet/.test(r.body.error),"503: vier Versuche wie bisher (unverändert)",r.aufrufe.length);
 r=await lauf([{status:400,text:"{\"error\":{\"status\":\"INVALID_ARGUMENT\"}}"}],PDF);
 p(r.status===400&&r.aufrufe.length===1&&!hatEnglisch(r.body.error)&&/Original-PDF|Foto/.test(r.body.error),"400: kein Wiederholen, deutscher Satz (Gegenprobe: dauerhafter Fehler wird sofort gemeldet)",r.body);
 r=await lauf([{status:403,text:"x"}],JPG);
 p(r.status===502&&/Administrator/.test(r.body.error)&&r.aufrufe.length===1,"403/401: Administrator informieren, kein Wiederholen",r.body.error);

 console.log("\nD · Der API-Schlüssel steht nie in der Antwort");
 r=await lauf([{status:400,text:"Fehler bei key="+KEY+" in der URL"}],JPG);
 p(JSON.stringify(r.body).indexOf(KEY)<0,"400 mit Schlüssel im Google-Text: in 'detail' geschwärzt",r.body.detail);
 r=await lauf([{status:503,text:"overloaded key="+KEY}],JPG);
 p(JSON.stringify(r.body).indexOf(KEY)<0,"503 (Überlast) mit Schlüssel im Google-Text: geschwärzt",r.body.detail);
 r=await lauf([{status:500,text:"key="+KEY}],JPG);
 p(JSON.stringify(r.body).indexOf(KEY)<0,"500 mit Schlüssel im Google-Text: geschwärzt",r.body.detail);

 console.log("\nE · Leere, unlesbare oder abgeschnittene Antworten");
 r=await lauf([leer,gut(POS)],JPG);
 p(r.status===200&&r.aufrufe.length===2,"leere Antwort, dann Erfolg: EINE automatische Wiederholung",r.aufrufe.length);
 r=await lauf([{status:200,json:{candidates:[{content:{parts:[{text:""}]},finishReason:"SAFETY"}]}}],JPG);
 p(r.status===502&&/abgelehnt/.test(r.body.error)&&r.aufrufe.length===2,"zweimal abgelehnt (SAFETY): klarer Satz, nicht 'konnte nicht gelesen werden'",r.body.error);
 r=await lauf([leer],JPG);
 p(r.status===502&&r.body.error==="Antwort der KI konnte nicht als Liste gelesen werden."&&/nochmals/.test(r.body.hinweis||"")&&r.aufrufe.length===2,"zweimal leer: der allgemeine Satz (unverändert) plus Hinweis 'nochmals tippen'",r.body);
 r=await lauf([{status:200,json:{candidates:[{content:{parts:[{text:'[{"pos":"1","desc'}]},finishReason:"MAX_TOKENS"}]}}],PDF);
 p(r.status===502&&/zu viele Positionen/.test(r.body.error)&&r.aufrufe.length===1,"abgeschnitten (MAX_TOKENS): ehrliche Meldung, KEINE Wiederholung, keine halbe Liste",r.body);
 r=await lauf([gut('{"a":1}')],JPG);
 p(r.status===502&&/Format/.test(r.body.error),"Objekt statt Liste: deutscher Satz",r.body.error);
 r=await lauf([gut('["text",1,null,{"description":"Rinne","quantity":2},[1]]')],JPG);
 p(r.status===200&&r.body.positions.length===1&&r.body.positions[0].description==="Rinne","nur echte Objekte sind Positionen (Text/Zahl/null/Liste fallen weg)",r.body);
 r=await lauf([gut("[]")],JPG);
 p(r.status===200&&r.body.ok&&r.body.positions.length===0,"leere Liste ist ein gültiges Ergebnis (der Client erklärt es)",r.body);

 console.log("\nG · Zugang: nur angemeldete Personen mit aktiver Firma");
 r=await lauf([gut(POS)],JPG,{auth:null});
 p(r.status===401&&/angemeldet/.test(r.body.error)&&r.aufrufe.length===0&&r.rpcAufrufe.length===0,"ohne Authorization: abgewiesen (401), keine Anfrage an Google",r);
 r=await lauf([gut(POS)],JPG,{auth:"Basic abc"});
 p(r.status===401&&r.aufrufe.length===0,"falsches Schema (nicht Bearer): abgewiesen",r.status);
 r=await lauf([gut(POS)],JPG,{rpc:{status:401,body:'{"message":"JWT expired"}'}});
 p(r.status===401&&/abgelaufen/.test(r.body.error)&&r.aufrufe.length===0&&JSON.stringify(r.body).indexOf("JWT expired")<0,"abgelaufenes/ungültiges Token (PostgREST 401): abgewiesen, ohne den englischen Rohtext",r);
 r=await lauf([gut(POS)],JPG,{rpc:{status:403,body:"{}"}});
 p(r.status===401&&r.aufrufe.length===0,"verbotene Funktion (Anon-Schlüssel statt Benutzer): abgewiesen",r.status);
 r=await lauf([gut(POS)],JPG,{rpc:{status:200,body:"null"}});
 p(r.status===403&&/Firmenkonto/.test(r.body.error)&&r.aufrufe.length===0,"angemeldet, aber ohne aktive Firma (my_company_id = null): 403, keine Anfrage an Google",r);
 r=await lauf([gut(POS)],JPG,{rpc:"netz"});
 p(r.status===503&&r.aufrufe.length===0,"Anmeldeprüfung selbst nicht erreichbar: NICHT durchlassen (fail closed)",r.status);
 r=await lauf([gut(POS)],JPG,{rpc:{status:500,body:"x"}});
 p(r.status===503&&r.aufrufe.length===0,"Anmeldeprüfung antwortet mit Serverfehler: nicht durchlassen",r.status);
 r=await lauf([gut(POS)],JPG);
 p(r.status===200&&r.body.ok&&r.aufrufe.length===1,"Gegenprobe: angemeldete Person mit aktiver Firma → Erkennung läuft wie bisher",r.body);
 p(r.rpcAufrufe.length===1&&r.rpcAufrufe[0].headers.Authorization==="Bearer user-token-123"&&r.rpcAufrufe[0].headers.apikey==="ANON-OEFFENTLICH","die Prüfung benutzt GENAU das Token der Person (Authorization) und den öffentlichen Schlüssel nur als apikey",r.rpcAufrufe);
 p(JSON.stringify(r.body).indexOf("user-token-123")<0&&JSON.stringify(r.body).indexOf("ANON-OEFFENTLICH")<0,"weder Token noch Schlüssel stehen in der Antwort");
 // OPTIONS (CORS-Preflight) braucht keine Anmeldung und bleibt unveraendert
 {
  const sb2={Deno:{serve:h=>{globalThis.__h=h},env:{get:()=>undefined}},fetch:async()=>{throw new Error("kein Netz")},Response,AbortController,AbortSignal,setTimeout,clearTimeout,btoa,JSON,Math,Array,String,Uint8Array,Error,RegExp,Promise,Object,console:{log(){},error(){}}};
  vm.runInNewContext(JS,sb2);
  const o=await globalThis.__h({method:"OPTIONS",headers:{get:()=>null}});
  p(o.status===200&&/authorization/.test(o.headers.get("Access-Control-Allow-Headers")),"CORS-Preflight (OPTIONS) funktioniert ohne Anmeldung und erlaubt den Authorization-Header",o.status);
  const g=await globalThis.__h({method:"GET",headers:{get:()=>null}});
  p(g.status===405,"GET wird weiter mit 405 abgelehnt");
 }

 console.log("\nF · Zeitüberschreitung");
 r=await lauf([{wirf:true}],JPG);
 p(r.status===504&&/Zeitüberschreitung/.test(r.body.error),"Abbruch durch das Zeitlimit: 504 mit deutschem Satz",r.body);


 console.log("\nH · Eingabegrenzen und Abruf-Ziele (v3.316)");
 const GROSS="data:application/pdf;base64,"+"A".repeat(28_000_001);
 r=await lauf([gut(POS)],GROSS);
 p(r.status===413&&/zu gross/.test(r.body.error)&&r.aufrufe.length===0,"Datei ueber der Obergrenze: 413 mit deutschem Satz, KEINE Anfrage an Google",{s:r.status,e:r.body.error});
 r=await lauf([gut(POS)],"data:application/pdf;base64,"+"A".repeat(1000));
 p(r.status===200&&r.aufrufe.length===1,"Gegenprobe: normale Groesse wird erkannt",r.status);
 r=await lauf([gut(POS)],"https://fremd.example/bild.jpg");
 p(r.status===400&&r.abrufe.length===0&&r.aufrufe.length===0,"Adresse eines fremden Hosts: kein Abruf, kein KI-Aufruf",r);
 r=await lauf([gut(POS)],"http://169.254.169.254/latest/meta-data/");
 p(r.status===400&&r.abrufe.length===0,"interne/Metadaten-Adresse: kein Abruf",r);
 r=await lauf([gut(POS)],"https://test.supabase.co/rest/v1/profiles?select=*");
 p(r.status===400&&r.abrufe.length===0,"eigener Host, aber nicht der Speicher (/rest/...): kein Abruf",r);
 r=await lauf([gut(POS)],"http://test.supabase.co/storage/v1/object/sign/x");
 p(r.status===400&&r.abrufe.length===0,"Speicher-Pfad, aber ohne https: kein Abruf",r);
 r=await lauf([gut(POS)],"https://test.supabase.co/storage/v1/object/sign/fotos/a.jpg?token=x");
 p(r.status===200&&r.abrufe.length===1&&r.aufrufe.length===1,"Gegenprobe: signierter Link aus dem eigenen Speicher wird weiter geladen und erkannt",r);
 r=await lauf([gut(POS)],"https://test.supabase.co/storage/v1/object/sign/fotos/a.pdf?token=x",{storage:{ok:true,ct:"application/pdf",len:"3",bytes:3}});
 p(r.status===200&&r.aufrufe.length===1,"Gegenprobe: PDF aus dem eigenen Speicher geht ebenfalls",r.status);
 r=await lauf([gut(POS)],"https://test.supabase.co/storage/v1/object/sign/fotos/a.jpg?token=x",{storage:{ok:true,ct:"image/jpeg",len:String(21*1024*1024),bytes:3}});
 p(r.status===413&&r.aufrufe.length===0,"Speicher-Datei ueber 20 MB (Content-Length): 413, keine KI-Anfrage",r.status);
 r=await lauf([gut(POS)],"https://test.supabase.co/storage/v1/object/sign/fotos/a.jpg?token=x",{storage:{ok:true,ct:"text/html",len:"3",bytes:3}});
 p(r.status===400&&r.aufrufe.length===0,"Speicher liefert HTML statt Bild/PDF: abgelehnt",r.status);
 r=await lauf([gut(POS)],"https://test.supabase.co/storage/v1/object/sign/fotos/a.jpg?token=x",{storage:{ok:false,ct:"image/jpeg",len:"3",bytes:3}});
 p(r.status===400&&r.aufrufe.length===0,"Speicher-Abruf scheitert (404): deutscher Satz statt Absturz",r);
 r=await lauf([{wirfUrl:true}],PDF);
 p(r.status===500&&JSON.stringify(r.body).indexOf(KEY)<0&&/unerwarteter Fehler/.test(r.body.error),"v3.316: Netzwerkfehler von fetch() (Meldung enthaelt die Adresse MIT API-Schluessel): Antwort ohne Schluessel, deutscher Satz",r.body);
 p(/\*\*\*/.test(r.body.detail||""),"...der Rohtext steht nur in detail und mit maskiertem Schluessel",r.body.detail);
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();

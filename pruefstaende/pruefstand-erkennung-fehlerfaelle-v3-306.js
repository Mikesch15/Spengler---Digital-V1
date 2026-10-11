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
  .replace(/\): Promise<\{[^}]*\} \| null> \{/g,") {")
  .replace(/(\(|, )(\w+): (unknown|string|number|Uint8Array|Request)(?=[,)= ])/g,"$1$2")
  .replace(/\): (string|boolean) (\{|=>)/g,") $2")
  .replace(/let (body|res|positions): [^;=]+;/g,"let $1;");
}
const JS=ohneTypen(quelle);
const KEY="GEHEIMER-KEY-123";
async function lauf(ablauf,bild){
 const aufrufe=[]; let i=0, handler=null;
 const sandbox={
  Deno:{serve:h=>{handler=h},env:{get:k=>k==="GEMINI_API_KEY"?KEY:undefined}},
  fetch:async(url,opt)=>{
   aufrufe.push({url:String(url),body:opt&&opt.body?JSON.parse(opt.body):null});
   const a=ablauf[Math.min(i++,ablauf.length-1)];
   if(a.wirf){const e=new Error("abgebrochen");e.name="AbortError";throw e}
   return {ok:a.status===200,status:a.status,text:async()=>a.text||"",json:async()=>a.json};
  },
  setTimeout:(f,ms)=>setTimeout(f,0), clearTimeout, AbortController, Response, btoa, atob, JSON, Math, Array, String,
  Uint8Array, Error, RegExp, Promise, Object, console:{log(){}}
 };
 vm.runInNewContext(JS,sandbox);
 const res=await handler({method:"POST",json:async()=>({image:bild})});
 const body=JSON.parse(await res.text());
 return {status:res.status,body,aufrufe};
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

 console.log("\nF · Zeitüberschreitung");
 r=await lauf([{wirf:true}],JPG);
 p(r.status===504&&/Zeitüberschreitung/.test(r.body.error),"Abbruch durch das Zeitlimit: 504 mit deutschem Satz",r.body);

 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();

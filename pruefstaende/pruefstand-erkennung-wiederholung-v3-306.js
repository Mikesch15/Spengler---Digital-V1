// Prueft v3.306 (Auftrag "Offertpositionen zuverlaessiger aus PDF und Foto importieren"): die Erkennung ist
// WIEDERHOLBAR, ohne dass Positionen doppelt oder halb in der Liste stehen.
// Vorher: scheiterte EIN Foto bei "Alle Fotos erkennen" und der Anwender tippte nochmals, wurden ALLE Fotos
// erneut gelesen - die schon erkannten standen doppelt in der Liste; jeder zweite Tipp auf ein Einzelfoto oder
// auf "Positionen aus dem PDF erkennen" verdoppelte ebenfalls; der Abschlusssatz sagte "aus N Foto(s) erkannt",
// auch wenn eines fehlschlug.
// Die Edge Function ist hier eine Attrappe (page.route): es gibt KEINEN echten Gemini-Aufruf.
"use strict";
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,420):""))}};

const ATTRAPPE=`window.supabase={createClient:()=>{
 window.__from=window.__from||[];
 window.__schreib=window.__schreib||[];
 const passt=(z,eqs)=>eqs.every(([f,v])=>z[f]===v);
 const tabelle=t=>{
  const kette={__eq:[],__order:null};
  Object.assign(kette,{
   select:()=>kette,
   eq:(f,v)=>{kette.__eq.push([f,v]);return kette},
   order:(f,o)=>{kette.__order=[f,o];return kette},
   in:()=>kette,
   not:()=>kette,
   limit:()=>kette,
   maybeSingle:()=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    if(window.__lesenFehler&&window.__lesenFehler[t])
     return Promise.resolve({data:null,error:{message:"kaputt"}});
    const liste=(window.__lese&&window.__lese[t])||[];
    const treffer=liste.find(z=>passt(z,kette.__eq));
    return Promise.resolve({data:treffer||null,error:null});
   },
   then:(res,rej)=>{
    window.__from.push({t,eq:kette.__eq.slice()});
    if(window.__lesenFehler&&window.__lesenFehler[t])
     return Promise.resolve({data:null,error:{message:"kaputt"}}).then(res,rej);
    let liste=((window.__lese&&window.__lese[t])||[]).filter(z=>passt(z,kette.__eq));
    if(kette.__order){
     const[f,o]=kette.__order;
     liste=liste.slice().sort((a,b)=>{
      const av=a[f],bv=b[f];
      const c=av<bv?-1:(av>bv?1:0);
      return o&&o.ascending===false?-c:c;
     });
    }
    return Promise.resolve({data:liste,error:null}).then(res,rej);
   },
   insert:d=>{
    const zeilen=Array.isArray(d)?d:[d];
    window.__schreib.push({t,op:"insert",d:zeilen});
    return {select:()=>{
     if(window.__insertLeer&&window.__insertLeer[t])return Promise.resolve({data:[],error:null});
     if(window.__insertFehler&&window.__insertFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
     const neu=zeilen.map((x,i)=>Object.assign({
      id:900+(window.__naechsteId=(window.__naechsteId||0)+1),
      created_by:"u1",created_at:"2026-09-08T08:00:00Z",
      updated_by:"u1",updated_at:"2026-09-08T08:00:00Z"
     },x));
     if(window.__lese&&window.__lese[t])window.__lese[t]=window.__lese[t].concat(neu);
     else if(window.__lese)window.__lese[t]=neu;
     return Promise.resolve({data:neu,error:null});
    }};
   },
   upsert:(d,o)=>{
    const zeilen=Array.isArray(d)?d:[d];
    window.__schreib.push({t,op:"upsert",d:zeilen,o});
    return {select:()=>{
     if(window.__upsertLeer&&window.__upsertLeer[t])return Promise.resolve({data:[],error:null});
     if(window.__upsertFehler&&window.__upsertFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
     const antwort=zeilen.map((x,i)=>Object.assign({id:800+i},x));
     return Promise.resolve({data:antwort,error:null});
    }};
   },
   update:d=>{
    const eintrag={t,op:"update",d,eq:[]};
    window.__schreib.push(eintrag);
    const k2={eq:(f,v)=>{eintrag.eq.push([f,v]);return k2},
     select:()=>{
      if(window.__updateLeer&&window.__updateLeer[t])return Promise.resolve({data:[],error:null});
      if(window.__updateFehler&&window.__updateFehler[t])return Promise.resolve({data:null,error:{message:"kaputt"}});
      const id=(eintrag.eq.find(e=>e[0]==="id")||[])[1];
      const basis=(window.__zeileFuer&&window.__zeileFuer(t,id))||{};
      return Promise.resolve({data:[Object.assign({},basis,d,{
       id:id!==undefined?id:1,updated_by:"u1",updated_at:"2026-09-08T09:00:00Z"
      })],error:null});
     }};
    return k2;
   },
   // Fix gegenueber dem v3.29-Muster: js/63-angebote.js verwendet
   // .delete().eq(id).then(({error})=>{...}) OHNE .select() dazwischen -
   // die Rueckgabe von .eq() muss deshalb selbst direkt thenbar sein UND
   // weiterhin .select() unterstuetzen (Kompatibilitaet zu anderen Modulen).
   delete:()=>{
    const eintrag={t,op:"delete",eq:[]};
    window.__schreib.push(eintrag);
    const obj={eq:(f,v)=>{
     eintrag.eq.push([f,v]);
     const antwort=()=>(window.__deleteFehler&&window.__deleteFehler[t])
      ?{error:{message:"kaputt"}}:{error:null};
     const res={
      then:(res2,rej2)=>Promise.resolve(antwort()).then(res2,rej2),
      select:()=>{
       const a=antwort();
       if(a.error)return Promise.resolve({data:[],error:a.error});
       if(window.__lese&&window.__lese[t])
        window.__lese[t]=window.__lese[t].filter(z=>!eintrag.eq.every(([f2,v2])=>z[f2]===v2));
       return Promise.resolve({data:[{id:v}],error:null});
      }
     };
     if(!antwort().error&&window.__lese&&window.__lese[t])
      window.__lese[t]=window.__lese[t].filter(z=>!eintrag.eq.every(([f2,v2])=>z[f2]===v2));
     return res;
    }};
    return obj;
   }
  });
  return kette;
 };
 return {
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle,
  storage:{from:()=>({
   upload:(pfad)=>{(window.__uploads=window.__uploads||[]).push(pfad);
    if(window.__uploadFehler)return Promise.resolve({error:{message:"Upload fehlgeschlagen"}});
    return Promise.resolve({error:null})},
   createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})
  })},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}
 };
}};`;

const FOTO=n=>"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="+"A".repeat(n);
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 let bestaetigen=true; const dialoge=[];
 page.on("dialog",d=>{dialoge.push(d.type()+": "+d.message());if(d.type()==="confirm"&&!bestaetigen)d.dismiss();else d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 const aufrufe=[]; let foto2Fehler=true;
 await page.route("**/functions/v1/extract-offer-positions",async route=>{
  const bild=route.request().postDataJSON().image;
  const nr=bild.length-FOTO(0).length;     // Foto 1, 2, 3 unterscheiden sich in der Laenge
  aufrufe.push(nr);
  if(nr===2&&foto2Fehler)return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({ok:false,error:"Die Texterkennung ist gerade überlastet."})});
  if(nr===0||nr>3)return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,positions:[]})});
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({ok:true,positions:[
   {pos:"1",description:"Foto"+nr+"-A",quantity:1,unit:"Stk"},{pos:"2",description:"Foto"+nr+"-B",quantity:2,unit:"m"}]})});
 });
 await page.goto("file://"+process.cwd()+"/index.html");
 await page.waitForFunction(()=>typeof recognizePhoto==="function"&&typeof erkenneAlleFotos==="function"&&$("angRecognizeAll"));
 const stand=()=>page.evaluate(()=>({n:angPositions.length,namen:angPositions.map(x=>x.description),status:$("angRecognizeStatus").textContent}));
 await page.evaluate(([f1,f2,f3])=>{angPhotos=[f1,f2,f3];angPositions=[];renderAngPhotoGallery();renderAngPositionsTable()},[FOTO(1),FOTO(2),FOTO(3)]);

 console.log("\nA · 'Alle Fotos erkennen', Foto 2 scheitert");
 await page.evaluate(()=>$("angRecognizeAll").onclick());
 let s=await stand();
 p(s.n===4&&s.namen.includes("Foto1-A")&&s.namen.includes("Foto3-B")&&!s.namen.some(x=>/^Foto2/.test(x)),"Foto 1 und 3 sind drin (4 Positionen), von Foto 2 nichts Halbes",s);
 p(/NICHT erkannt/.test(s.status)&&/Foto 2/.test(s.status)&&!/aus 3 Foto\(s\) erkannt/.test(s.status),"der Abschlusssatz nennt das fehlgeschlagene Foto und behauptet NICHT, alle seien erkannt",s.status);
 p(dialoge.some(t=>/Fehler bei Foto 2: Die Texterkennung ist gerade überlastet/.test(t)),"die Fehlermeldung des Servers wird gezeigt",dialoge);

 console.log("\nB · erneut tippen: nur das fehlgeschlagene Foto wird gelesen");
 foto2Fehler=false; aufrufe.length=0;
 await page.evaluate(()=>$("angRecognizeAll").onclick());
 s=await stand();
 p(JSON.stringify(aufrufe)==="[2]","nur Foto 2 geht an die Erkennung (Foto 1 und 3 werden nicht nochmals gelesen)",aufrufe);
 p(s.n===6&&new Set(s.namen).size===6,"sechs Positionen, KEINE doppelten",s.namen);
 p(/2 schon erkannte/.test(s.status)&&!/NICHT erkannt/.test(s.status)&&/prüfen/.test(s.status),"der Satz sagt, dass zwei Fotos schon erkannt waren; alles geschafft: 'bitte prüfen'",s.status);

 console.log("\nC · nochmals tippen, wenn alles erkannt ist");
 aufrufe.length=0;
 await page.evaluate(()=>$("angRecognizeAll").onclick());
 s=await stand();
 p(aufrufe.length===0&&s.n===6,"keine Anfrage, keine Verdoppelung",{aufrufe,n:s.n});

 console.log("\nD · Einzelfoto, das schon erkannt ist");
 bestaetigen=false; aufrufe.length=0; dialoge.length=0;
 await page.evaluate(()=>document.querySelector("[data-recognize-ang-photo=\"0\"]").click()); await page.waitForTimeout(400);
 s=await stand();
 p(dialoge.some(t=>/confirm: Foto 1 wurde schon erkannt/.test(t))&&aufrufe.length===0&&s.n===6,"es wird NACHGEFRAGT; bei 'Abbrechen' keine Anfrage und nichts verändert",{dialoge,aufrufe,n:s.n});
 bestaetigen=true;
 await page.evaluate(()=>{angPositions.find(x=>x.description==="Foto1-A").description="Foto1-A korrigiert"});
 await page.evaluate(()=>document.querySelector("[data-recognize-ang-photo=\"0\"]").click()); await page.waitForTimeout(500);
 s=await stand();
 p(aufrufe.length===1&&s.n===6&&s.namen.includes("Foto1-A")&&!s.namen.includes("Foto1-A korrigiert"),"bestätigt: die Positionen von Foto 1 werden ERSETZT (6 bleiben 6, keine zwei Kopien)",s);

 console.log("\nE · leeres Ergebnis wird erklärt");
 await page.evaluate(()=>{angPhotos=["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="];angPositions=[];renderAngPhotoGallery()});
 await page.evaluate(()=>$("angRecognizeAll").onclick());
 s=await stand();
 p(s.n===0&&/nichts erkannt/i.test(s.status)&&/Original-PDF/.test(s.status),"keine Position: der Satz sagt es und nennt das Original-PDF",s.status);

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen"); process.exit(fail?1:0);
})();

"use strict";
// ---- Pruefstand: Abschnittstitel im Ausmass "Offerte erfassen" (v3.129) --
//
// Gemeldet: "Im ausmass, offerte erfassen muss wie bei offerte die
// fettgeschriebenen titel einklapbar sein".
//
// Die Positionen tragen seit v3.44 das Feld "abschnitt" (der fett gedruckte
// Zwischentitel aus der Erkennung). Die Offerte (js/63-angebote.js)
// gruppiert danach seit v3.71 zu klappbaren Bloecken; das Ausmass
// (js/17-ausmass.js) zeigte trotz desselben Feldes eine flache Liste.
//
// Geprueft wird:
//  1  Aufeinanderfolgende Positionen mit gleichem Titel bilden EINEN Block
//     mit fett gedrucktem Kopf - und der Block ist zugeklappt, wie in der
//     Offerte.
//  2  Positionen OHNE Titel bleiben flach (alte Datensaetze, von Hand
//     hinzugefuegte Zeilen) - keine erfundene Ueberschrift.
//  3  Zwei Bloecke mit demselben Titel, aber durch einen anderen getrennt,
//     bleiben getrennt: gruppiert wird nach AUFEINANDERFOLGENDEN Zeilen,
//     nicht nach dem Titel allein.
//  4  Der Kopf klappt per Klick auf und zu - ohne die Tabelle neu zu
//     zeichnen (Fokus bleibt), und mit der Tastatur bedienbar.
//  5  Der Klapp-Zustand ueberlebt ein Neuzeichnen (z. B. "fertig" abhaken).
//  6  Der Kopf nennt den Stand (x/y fertig), damit zugeklappt sichtbar
//     bleibt, wo noch Arbeit liegt.
//  7  Ein anderes Ausmass startet wieder zugeklappt.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ausmass-abschnitte-v3-129.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const repo=process.cwd();
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

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
      created_by:"u1",created_at:"2026-09-14T08:00:00Z",
      updated_by:"u1",updated_at:"2026-09-14T08:00:00Z"
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
   update:patch=>{
    const g={};
    g.eq=(f,v)=>{
     window.__schreib.push({t,op:"update",patch,eq:[[f,v]]});
     if(window.__updateFehler&&window.__updateFehler[t])return Promise.resolve({error:{message:"kaputt"}});
     // v3.127: die Lesespur muss die Aenderung mitbekommen, sonst zeigt eine
     // spaetere Pruefung noch den alten Stand (archiviert bleibt sonst false).
     if(window.__lese&&window.__lese[t])
      window.__lese[t].forEach(z=>{if(z[f]===v)Object.assign(z,patch)});
     return Promise.resolve({error:null});
    };
    return g;
   },
   // v3.127: Loeschen gibt es erst, seit ein Produkt (und auf Nachfrage
   // seine Katalogposition) wirklich entfernt werden kann.
   delete:()=>{
    const g={};
    g.eq=(f,v)=>{
     window.__schreib.push({t,op:"delete",eq:[[f,v]]});
     if(window.__deleteFehler&&window.__deleteFehler[t])return Promise.resolve({error:{message:"kaputt"}});
     if(window.__lese&&window.__lese[t])
      window.__lese[t]=window.__lese[t].filter(z=>z[f]!==v);
     return Promise.resolve({error:null});
    };
    return g;
   }
  });
  return kette;
 };
 return {
  auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
  from:tabelle,
  storage:{from:()=>({createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})})},
  rpc:()=>Promise.resolve({data:null,error:null}),
  functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}
 };
}};`;

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto("file://"+repo+"/index.html");
 await page.waitForFunction(()=>typeof renderAmPositionsTable==="function"
  &&typeof amSektionenZuruecksetzen==="function",null,{timeout:15000});
 await page.waitForTimeout(200);

 let z;

 // ---- 1 · Gruppierung und Vorgabe ---------------------------------------
 console.log("\n1 · Abschnitte bilden zugeklappte Bloecke");
 z=await page.evaluate(()=>{
  amSektionenZuruecksetzen();
  amPositions=[
   {pos:"1.1",description:"Rinne Kupfer",quantity:12,unit:"m",abschnitt:"Dachrinnen"},
   {pos:"1.2",description:"Rinnenhalter",quantity:24,unit:"St",abschnitt:"Dachrinnen"},
   {pos:"2.1",description:"Ablaufrohr",quantity:8,unit:"m",abschnitt:"Ablaufrohre"},
   {pos:"9.9",description:"Diverses von Hand",quantity:1,unit:"St"}
  ];
  renderAmPositionsTable();
  const koepfe=[...document.querySelectorAll("#amPositionsBody [data-am-sek-toggle]")];
  const zeilen=[...document.querySelectorAll("#amPositionsBody tr")];
  return {
   titel:koepfe.map(k=>k.dataset.amSekToggle),
   fett:koepfe.map(k=>!!k.querySelector("b")),
   offen:koepfe.map(k=>k.classList.contains("open")),
   klasse:koepfe.map(k=>k.className),
   versteckt:zeilen.filter(t=>t.style.display==="none").length,
   ohneTitel:zeilen.filter(t=>t.querySelector("[data-am-pos]")&&!t.dataset.amSekRow).length,
   summary:$("amPositionsSummary").textContent
  };
 });
 p(JSON.stringify(z.titel)===JSON.stringify(["Dachrinnen","Ablaufrohre"]),
   "aufeinanderfolgende Positionen mit gleichem Titel bilden je EINEN Block",z.titel);
 p(z.fett.every(Boolean),"der Titel steht fett im Kopf - genau die gemeldeten 'fettgeschriebenen Titel'",z);
 p(z.klasse.every(c=>/klapp-kopf/.test(c)&&/ang-sek-kopf/.test(c)),
   "benutzt werden DIESELBEN Klassen wie in der Offerte, keine zweite Bauart",z.klasse);
 p(z.offen.every(o=>o===false)&&z.versteckt===3,
   "die Bloecke starten zugeklappt, ihre drei Zeilen sind ausgeblendet - wie in der Offerte",z);
 p(z.ohneTitel===1,
   "eine Position ohne Titel bleibt flach sichtbar - es wird keine Ueberschrift erfunden",z);
 p(/4 Positionen/.test(z.summary),"die Zusammenfassung zaehlt weiterhin alle Positionen",z.summary);

 // ---- 2 · Gleicher Titel, aber getrennt ---------------------------------
 console.log("\n2 · Gruppiert wird nach aufeinanderfolgenden Zeilen");
 z=await page.evaluate(()=>{
  amSektionenZuruecksetzen();
  amPositions=[
   {pos:"1",description:"A",abschnitt:"Dach"},
   {pos:"2",description:"B",abschnitt:"Fassade"},
   {pos:"3",description:"C",abschnitt:"Dach"}
  ];
  renderAmPositionsTable();
  return [...document.querySelectorAll("#amPositionsBody [data-am-sek-toggle]")]
    .map(k=>k.dataset.amSekToggle);
 });
 p(z.length===3&&z[0]==="Dach"&&z[2]==="Dach",
   "derselbe Titel an zwei getrennten Stellen ergibt ZWEI Koepfe - die Reihenfolge der Offerte bleibt erhalten",z);

 // ---- 3 · Auf- und Zuklappen --------------------------------------------
 console.log("\n3 · Der Kopf klappt auf und zu");
 z=await page.evaluate(()=>{
  amSektionenZuruecksetzen();
  amPositions=[
   {pos:"1.1",description:"Rinne",abschnitt:"Dachrinnen"},
   {pos:"1.2",description:"Halter",abschnitt:"Dachrinnen"},
   {pos:"2.1",description:"Rohr",abschnitt:"Ablaufrohre"}
  ];
  renderAmPositionsTable();
  const sicht=t=>[...document.querySelectorAll('#amPositionsBody [data-am-sek-row="'+t+'"]')]
    .filter(tr=>tr.style.display!=="none").length;
  const kopf=()=>document.querySelector('#amPositionsBody [data-am-sek-toggle="Dachrinnen"]');
  // Ein Feld fokussieren, um zu pruefen, dass NICHT neu gezeichnet wird.
  const vorher=sicht("Dachrinnen");
  kopf().click();
  const feld=document.querySelector('#amPositionsBody [data-am-pos="0"]');
  if(feld)feld.focus();
  const nachAuf={sicht:sicht("Dachrinnen"),andere:sicht("Ablaufrohre"),
   offen:kopf().classList.contains("open"),imZustand:amSektionOffen.has("Dachrinnen")};
  const fokusVorher=document.activeElement===feld;
  kopf().click();
  const nachZu={sicht:sicht("Dachrinnen"),offen:kopf().classList.contains("open"),
   imZustand:amSektionOffen.has("Dachrinnen"),
   feldNochDa:document.querySelector('#amPositionsBody [data-am-pos="0"]')===feld};
  return {vorher,nachAuf,fokusVorher,nachZu};
 });
 p(z.vorher===0&&z.nachAuf.sicht===2&&z.nachAuf.offen===true&&z.nachAuf.imZustand===true,
   "ein Klick klappt genau diesen Block auf",z);
 p(z.nachAuf.andere===0,"der andere Block bleibt dabei zu - geklappt wird einzeln",z);
 p(z.nachZu.sicht===0&&z.nachZu.offen===false&&z.nachZu.imZustand===false,
   "ein zweiter Klick klappt ihn wieder zu",z);
 p(z.nachZu.feldNochDa===true,
   "die Tabelle wird dabei NICHT neu gezeichnet - sonst verloere ein gerade bearbeitetes Feld den Fokus",z);

 // Tastatur - role="button" allein genuegt dafuer nicht.
 z=await page.evaluate(()=>{
  const kopf=document.querySelector('#amPositionsBody [data-am-sek-toggle="Dachrinnen"]');
  kopf.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));
  const nachEnter=kopf.classList.contains("open");
  kopf.dispatchEvent(new KeyboardEvent("keydown",{key:" ",bubbles:true}));
  const nachSpace=kopf.classList.contains("open");
  return {rolle:kopf.getAttribute("role"),tab:kopf.getAttribute("tabindex"),nachEnter,nachSpace};
 });
 p(z.rolle==="button"&&z.tab==="0","der Kopf ist als Knopf ausgezeichnet und anspringbar",z);
 p(z.nachEnter===true&&z.nachSpace===false,
   "Enter und Leertaste klappen ihn auf und wieder zu",z);

 // ---- 4 · Zustand ueberlebt ein Neuzeichnen -----------------------------
 console.log("\n4 · Abhaken wirft die Klapp-Zustaende nicht um");
 z=await page.evaluate(()=>{
  amSektionenZuruecksetzen();
  amPositions=[
   {pos:"1.1",description:"Rinne",abschnitt:"Dachrinnen"},
   {pos:"1.2",description:"Halter",abschnitt:"Dachrinnen"},
   {pos:"2.1",description:"Rohr",abschnitt:"Ablaufrohre"}
  ];
  renderAmPositionsTable();
  document.querySelector('#amPositionsBody [data-am-sek-toggle="Dachrinnen"]').click();
  // "fertig" abhaken zeichnet die ganze Tabelle neu (js/17, change-Handler).
  const box=document.querySelector('#amPositionsBody [data-am-fertig="0"]');
  box.checked=true;
  box.dispatchEvent(new Event("change",{bubbles:true}));
  const kopf=document.querySelector('#amPositionsBody [data-am-sek-toggle="Dachrinnen"]');
  return {offen:kopf.classList.contains("open"),
   sicht:[...document.querySelectorAll('#amPositionsBody [data-am-sek-row="Dachrinnen"]')]
     .filter(tr=>tr.style.display!=="none").length,
   kopfText:kopf.textContent,
   andererKopf:document.querySelector('#amPositionsBody [data-am-sek-toggle="Ablaufrohre"]').textContent};
 });
 p(z.offen===true&&z.sicht===2,
   "nach dem Abhaken ist der aufgeklappte Block immer noch offen",z);
 p(/1\/2 fertig/.test(z.kopfText)&&/0\/1 fertig/.test(z.andererKopf),
   "der Kopf nennt den Stand je Block - zugeklappt sieht man so, wo noch Arbeit liegt",z);

 // ---- 5 · Ein anderes Ausmass startet zugeklappt -------------------------
 console.log("\n5 · Ein anderes Ausmass startet wieder zugeklappt");
 z=await page.evaluate(()=>{
  // Zustand aus dem vorigen Fall ist noch gesetzt.
  const vorher=amSektionOffen.has("Dachrinnen");
  amSektionenZuruecksetzen();
  amPositions=[{pos:"1",description:"X",abschnitt:"Dachrinnen"}];
  renderAmPositionsTable();
  const kopf=document.querySelector('#amPositionsBody [data-am-sek-toggle="Dachrinnen"]');
  return {vorher,offen:kopf.classList.contains("open")};
 });
 p(z.vorher===true&&z.offen===false,
   "ein anderes Ausmass erbt den Klapp-Zustand nicht - sonst erschiene ein anderswo geoeffneter Block hier faelschlich offen",z);

 // ---- 6 · Gleiches Muster wie in der Offerte ----------------------------
 console.log("\n6 · Dasselbe Muster wie in der Offerte, nicht ein zweites");
 const quelle=require("fs").readFileSync(repo+"/js/17-ausmass.js","utf8");
 const offerte=require("fs").readFileSync(repo+"/js/63-angebote.js","utf8");
 p(/klapp-kopf ang-sek-kopf/.test(quelle)&&/klapp-kopf ang-sek-kopf/.test(offerte),
   "beide Module benutzen dieselbe Kopf-Klasse - die CSS steht nur einmal da");
 p(!/am-sek-kopf/.test(quelle),
   "es wurde KEINE zweite, parallele Klasse eingefuehrt");

 p(jsFehler.length===0,"keine JavaScript-Fehler im ganzen Lauf",jsFehler);
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

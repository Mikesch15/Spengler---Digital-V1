// Prueft v3.12 - zwei Rueckmeldungen des Betriebs:
//
//  TEIL A  "das ist eine tabelle zum umrechnen von winkeln wenn im meter
//          gemessen wird (Winkel i.M), mache ueberall wo man winkel eingeben
//          kann eine funktion um zwischen den beiden umzuschalten und nimm
//          die tabelle als grundlage zum umrechnen"
//
//  TEIL B  "auch im werkstatt workflow muss es eindeutiger sein und einen
//          roten faden geben der einem da durch fuehrt"
//
// FACHLICHE REFERENZ von Teil A ist die Umrechnungstabelle der GABS AG,
// Zeile fuer Zeile in js/55-winkel.js. Hier wird gegen die Werte aus der
// VORLAGE geprueft, nicht gegen eine Formel und nicht gegen die App-Tabelle
// selbst - sonst bestaetigte der Pruefstand nur sich selbst.
//
// GEMESSEN, NICHT BEHAUPTET: Sichtbarkeit ueber getComputedStyle und echte
// Rechtecke (eine Klassenregel mit display schlaegt [hidden], CLAUDE.md
// 59/71.5/115.9), Knopfgroessen ueber getBoundingClientRect.
//
// WAS HIER NICHT GEPRUEFT WIRD: die Datenbank. Diese Runde aendert keine
// Migration, keine Policy und keine Funktion - nur die Oberflaeche.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-winkel-werkstatt-v3-12.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,360):""))}};

// ---- Stichproben DIREKT aus dem Bild der Vorlage --------------------------
// cm A -> "Grad a / Nachbarkeil". Bewusst ueber alle drei Spalten verteilt,
// inklusive der Wiederholungen (50.5 und 50.75 tragen beide 33) und der
// Luecken (nach 98 folgt 100).
const VORLAGE=[
 [50,31],[50.25,32],[50.5,33],[50.75,33],[51,34],[51.75,36],[52,37],[53,40],
 [53.75,43],[54,43],[55,46],[56,50],[56.25,50],[57.75,55],[58.5,58],[58.75,58],
 [59.75,62],[60,63],[60.25,64],[60.5,64],[61.25,67],[61.5,67],[62.5,71],[63,73],
 [63.5,75],[63.75,75],[64,76],[64.5,78],[65,80],[65.75,83],[66,83],[67,87],
 [67.75,90],[68,91],[69.75,98],[70,100],[71,104],[72,108],[72.25,110],[73,113],
 [73.25,115],[74,119],[74.75,123],[75,124],[75.75,129],[76,130],[76.75,136],
 [77,137],[77.25,140],[78,146],[78.5,150],[78.75,154],[79,157],[79.5,164],[79.75,169]
];

const STUB=`window.__ruf=[];
window.__db={mess:[],res:[],fehler:null};
function __tab(name){
 const st={name,filter:[]};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 const quelle=()=>name==='measurements'?window.__db.mess:
               (name==='material_reservierungen'?window.__db.res:[]);
 const passt=r=>st.filter.every(([k,art,v])=>art==='in'?v.indexOf(r[k])>=0:r[k]===v);
 const lauf=()=>{
  window.__ruf.push({tabelle:name,filter:st.filter.slice()});
  if(window.__db.fehler)return {data:null,error:{message:window.__db.fehler}};
  return {data:quelle().filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null};
 };
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({rpc:n,args:a});return {data:null,error:null}},
 from:(n)=>__tab(n),
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const ICH="aaaa1111-1111-1111-1111-111111111111";
const ANDERER="bbbb2222-2222-2222-2222-222222222222";

const anmelden=(page)=>page.evaluate(([ich,and])=>{
 currentProfile={id:ich,role:"admin",first_name:"Peter",last_name:"Test"};
 allProfiles=[{id:ich,first_name:"Peter",last_name:"Test"},
              {id:and,first_name:"Anna",last_name:"Muster"}];
 meineRechte={admin:true}; appSettingsId=1; workflowAktiv=true;
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"},
              {id:8,name:"Neubau",object:"Feldweg 3, 3011 Bern"}];
 measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
 blechRollenbreiten=[1000,670]; blechSchnittfuge=0;
 $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=false;
},[ICH,ANDERER]);

// Ein Klick auf ein verstecktes Element laesst page.click() haengen und
// bricht den Lauf ab - das saehe aus wie "keine Fehler" (CLAUDE.md 78).
const klick=async(page,sel,name)=>{
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
   if(!e)return "fehlt";
   const b=e.getBoundingClientRect();
   if(getComputedStyle(e).display==="none"||b.height===0)return "unsichtbar";
   e.click(); return "ok"},sel);
 if(r!=="ok"){fail++;console.log("  FEHLGESCHLAGEN: Klick auf "+(name||sel)+" – "+r)}
 await page.waitForTimeout(200);
 return r==="ok";
};

const fuellen=async(page,sel,wert)=>{
 const r=await page.evaluate(([s,w])=>{const e=document.querySelector(s);
   if(!e)return "fehlt";
   if(!e.offsetParent&&getComputedStyle(e).display==="none")return "unsichtbar";
   e.value=w; e.dispatchEvent(new Event("input",{bubbles:true})); return "ok"},[sel,wert]);
 if(r!=="ok"){fail++;console.log("  FEHLGESCHLAGEN: "+sel+" ausfuellen – "+r)}
 await page.waitForTimeout(200);
 return r==="ok";
};

const typWaehlen=async(page,typ,register)=>{
 await page.evaluate(t=>newMeasurementWithType(t),typ);
 await page.waitForTimeout(200);
 if(register){
  await page.evaluate(([s,r])=>{if(typeof window[s]==="function")window[s](r)},[register[0],register[1]]);
  await page.waitForTimeout(200);
 }
};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});
 const jsfehler=[]; page.on("pageerror",e=>jsfehler.push(String(e)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP); await page.waitForTimeout(700);
 await anmelden(page);

 // =========================================================================
 console.log("\nA · die Tabelle ist die Vorlage, Zeile fuer Zeile");
 const tab=await page.evaluate(v=>({
   laenge:(typeof WINKEL_TAB!=="undefined")?WINKEL_TAB.length:-1,
   min:(typeof WINKEL_CM_MIN!=="undefined")?WINKEL_CM_MIN:null,
   max:(typeof WINKEL_CM_MAX!=="undefined")?WINKEL_CM_MAX:null,
   monoton:(typeof WINKEL_TAB!=="undefined")&&WINKEL_TAB.every((x,i)=>i===0||x>=WINKEL_TAB[i-1]),
   proben:v.map(([cm,g])=>{const r=winkelAusMeter(cm);
     return {cm,soll:g,ist:r.grad,gegen:r.gegen,genau:r.genau}})
 }),VORLAGE);
 p(tab.laenge===120,"120 Zeilen wie die Vorlage",{n:tab.laenge});
 p(tab.min===50&&tab.max===79.75,"von 50.00 bis 79.75 cm",{min:tab.min,max:tab.max});
 p(tab.monoton===true,"die Winkel steigen durchgehend");
 const falsch=tab.proben.filter(x=>x.ist!==x.soll||x.genau!==true);
 p(falsch.length===0,"alle "+VORLAGE.length+" Stichproben aus dem Bild stimmen",falsch.slice(0,6));
 const gegenFalsch=tab.proben.filter(x=>x.gegen!==180-x.soll);
 p(gegenFalsch.length===0,"und der Nachbarkeil ist immer der Rest auf 180°",gegenFalsch.slice(0,4));

 console.log("\nB · umrechnen in beide Richtungen");
 const r=await page.evaluate(()=>({
   zwischen:winkelAusMeter(64.6),
   mitte:winkelAusMeter(72.2),
   klein:winkelAusMeter(45),
   gross:winkelAusMeter(90),
   text:winkelAusMeter("abc"),
   g90:winkelZuMeter(90),
   g115:winkelZuMeter(115),
   g149:winkelZuMeter(149),
   g33:winkelZuMeter(33),
   g99:winkelZuMeter(99),
   g20:winkelZuMeter(20),
   g5:winkelZuMeter(5)
 }));
 p(r.zwischen.grad===78&&r.zwischen.genau===false
   &&r.zwischen.unten.cm===64.5&&r.zwischen.oben.cm===64.75,
   "zwischen zwei Zeilen wird interpoliert und das gesagt",r.zwischen);
 // 72.00 traegt 108, 72.25 traegt 110 - bei 72.2 muss 110 herauskommen,
 // nicht die untere Zeile. Sonst waere "Interpolation" nur behauptet.
 p(r.mitte.grad===110&&r.mitte.unten.grad===108&&r.mitte.oben.grad===110,
   "und wirklich gerechnet, nicht die untere Zeile genommen",r.mitte);
 p(!!r.klein.fehler&&!!r.gross.fehler&&!!r.text.fehler,
   "ausserhalb der Tabelle und bei Text gibt es keinen erfundenen Wert",
   {k:r.klein,g:r.gross,t:r.text});
 p(r.g90.cm===67.75&&r.g90.gemessen===90,"90° -> 67.75 cm (Zeile der Vorlage)",r.g90);
 p(r.g115.cm===73.25&&r.g115.gemessen===115,"115° -> 73.25 cm",r.g115);
 p(Math.abs(r.g149.cm-78.375)<0.001&&r.g149.gemessen===149,
   "149° -> zwischen 78.25 und 78.50 cm",r.g149);
 p(Math.abs(r.g33.cm-50.625)<0.001,"33° steht in zwei Zeilen - genommen wird die Mitte",r.g33);
 p(Math.abs(r.g99.cm-69.875)<0.001,"99° fehlt in der Vorlage - dazwischen interpoliert",r.g99);
 p(r.g20.cm===79.25&&r.g20.gemessen===160&&r.g20.gegen===20,
   "20° misst der Meter ueber den Nachbarkeil 160°",r.g20);
 p(!!r.g5.fehler,"5° liegt ausserhalb - kein erfundener Wert",r.g5);

 // =========================================================================
 console.log("\nC · ein Knopf an JEDEM Winkelfeld");
 // Fuer jede Art wird jedes Register durchgeblaettert und jedes sichtbare
 // Zahlenfeld gesucht, dessen Beschriftung nach einem WINKEL aussieht.
 // Millimeterfelder, deren Beschriftung nur ein Grad-Zeichen enthaelt
 // ("Umschlag links (mm, 135°)"), sind keine Winkelfelder.
 const ARTEN=[
  ["skizze_foto",null,0],["einlaufblech_gerade","ebaSetzeSchritt",0],
  ["rinne_halbrund","raSetzeSchritt",0],["einlaufblech_konisch","ebkaSetzeSchritt",0],
  ["freies_profil","fpaSetzeSchritt",0],["mauerabdeckung","madaSetzeSchritt",0],
  ["lukarne","lukaSetzeSchritt",0],["anschlussblech","anbaSetzeSchritt",0],
  ["einfassung_rund","einfaSetzeSchritt",0],["kehle","keaSetzeSchritt",0],
  ["rinne","rpaSetzeSchritt",0],["kamineinfassung","kamaSetzeSchritt",0]
 ];
 const REG={ebaSetzeSchritt:"EBA_REGISTER",raSetzeSchritt:"RA_REGISTER",
  ebkaSetzeSchritt:"EBKA_REGISTER",fpaSetzeSchritt:"FPA_REGISTER",
  madaSetzeSchritt:"MADA_REGISTER",lukaSetzeSchritt:"LUKA_REGISTER",
  anbaSetzeSchritt:"ANBA_REGISTER",einfaSetzeSchritt:"EINFA_REGISTER",
  keaSetzeSchritt:"KEA_REGISTER",rpaSetzeSchritt:"RPA_REGISTER",
  kamaSetzeSchritt:"KAMA_REGISTER"};
 let gefunden=0; const ohneKnopf=[], eng=[];
 // Zwei Breiten: der Knopf darf ein Winkelfeld nirgends zusammendruecken.
 // 320 px ist das schmalste Geraet, das die App bedient.
 for(const BR of [320,412]){
 await page.setViewportSize({width:BR,height:900});
 for(const [typ,setz] of ARTEN){
  await typWaehlen(page,typ);
  // Rinne Halbrund: der Uebergang muss eine Ecke sein, sonst gibt es kein Feld
  await page.evaluate(()=>{const s=document.querySelector("[data-ra-ueb-art]");
    if(s){s.value="aussen";s.dispatchEvent(new Event("change",{bubbles:true}))}});
  // Ort-/Seitenbleche: der Knick muss angehakt sein
  await page.evaluate(()=>{const c=document.querySelector("[data-anbseg-knick]");
    if(c&&!c.checked){c.checked=true;c.dispatchEvent(new Event("change",{bubbles:true}))}});
  await page.waitForTimeout(150);
  const n=setz?await page.evaluate(t=>{try{return eval(t).length}catch(e){return 1}},REG[setz]):1;
  for(let reg=1;reg<=n;reg++){
   if(setz){await page.evaluate(([s,r])=>window[s](r),[setz,reg]);await page.waitForTimeout(140)}
   // Stuecke/Segmente/Schenkel erst HIER anlegen - die Knoepfe dafuer stehen
   // in ihrem eigenen Register und sind vorher gar nicht bedienbar.
   for(const id of ["eba_stueckPlus","ebka_stueckPlus","fpa_plus","mada_segPlus","ra_addSeg"]){
    await page.evaluate(id=>{const e=document.getElementById(id);
      if(e&&e.offsetParent)e.click()},id);
    await page.waitForTimeout(60);
   }
   const x=await page.evaluate(()=>{
    const raus=[];
    document.querySelectorAll("#measurementEditModal input[type=number]").forEach(i=>{
     if(!i.offsetParent)return;
     let txt="";
     const zelle=i.closest("td");
     if(zelle){const tr=zelle.closest("tr"),tb=zelle.closest("table");
      if(tb&&tb.tHead&&tr){const k=[...tr.children].indexOf(zelle);
       const th=tb.tHead.rows[0]&&tb.tHead.rows[0].cells[k]; if(th)txt=th.textContent}}
     if(!txt){const c=i.closest("div"); if(c){const l=c.querySelector("label");if(l)txt=l.textContent}}
     if(!txt){const l=i.closest("label"); if(l)txt=l.textContent}
     txt=(txt||"").trim();
     // ein Winkelfeld nennt Winkel/Neigung/Gefaelle und ist KEIN mm-Feld
     if(/\(mm/i.test(txt))return;
     if(!/winkel|neigung|gefäll|gefaell/i.test(txt)&&!/\(°\)/.test(txt))return;
     const k=i.nextElementSibling;
     raus.push({txt:txt.slice(0,44),knopf:!!(k&&k.dataset&&k.dataset.winkelKnopf),
       breite:Math.round(i.getBoundingClientRect().width)});
    });
    return raus;
   });
   x.forEach(e=>{gefunden++; if(!e.knopf)ohneKnopf.push({typ,reg,br:BR,...e});
     // Ein auf wenige Pixel zusammengedruecktes Feld ist unbedienbar - die
     // Zahl darin waere nicht mehr lesbar (CLAUDE.md 88.5/89.5).
     if(e.breite>0&&e.breite<70)eng.push({typ,reg,br:BR,txt:e.txt,breite:e.breite})});
  }
 }
 }
 await page.setViewportSize({width:412,height:900});
 p(gefunden>=28,"in allen zwoelf Arten wurden Winkelfelder gefunden",{n:gefunden});
 p(ohneKnopf.length===0,"und JEDES davon traegt den Umrechnen-Knopf",ohneKnopf.slice(0,6));
 p(eng.length===0,"und kein Winkelfeld wird vom Knopf zusammengedrueckt",eng.slice(0,6));

 console.log("\nD · der Knopf und der Dialog");
 await typWaehlen(page,"einlaufblech_gerade",["ebaSetzeSchritt",2]);
 const kn=await page.evaluate(()=>{
  const k=document.querySelector("#eba_winkel + [data-winkel-knopf]");
  if(!k)return null;
  const r=k.getBoundingClientRect(), s=getComputedStyle(k);
  return {text:k.textContent.trim(),w:Math.round(r.width),h:Math.round(r.height),
    titel:k.getAttribute("title"),aria:k.getAttribute("aria-label"),
    gross:s.textTransform,druck:k.className.indexOf("no-print")>=0};
 });
 p(!!kn,"der Knopf steht direkt neben dem Feld");
 p(kn&&kn.h>=28&&kn.w>=30,"und ist gross genug zum Antippen",kn);
 p(kn&&/i\.M\./.test(kn.text),"er heisst i.M. - nicht nur ein Symbol",kn&&kn.text);
 p(kn&&!!kn.titel&&kn.titel===kn.aria,"mit Beschriftung fuer Tastatur und Screenreader",kn);
 p(kn&&kn.druck===true,"und wird nicht mitgedruckt",kn);

 await page.evaluate(()=>{$("eba_winkel").value="25"});
 await klick(page,"#eba_winkel + [data-winkel-knopf]","i.M.-Knopf");
 const d1=await page.evaluate(()=>{
  const m=$("winkelModal"), r=m.getBoundingClientRect(), s=getComputedStyle(m);
  const form=$("measurementEditModal");
  return {offen:!m.hidden&&s.display!=="none"&&r.height>0,
    z:Number(s.zIndex), zForm:Number(getComputedStyle(form).zIndex),
    hin:$("winkelZielHinweis").textContent};
 });
 p(d1.offen===true,"ein Tipp oeffnet den Dialog",d1);
 p(d1.z>d1.zForm,"und er liegt VOR dem Massaufnahme-Formular",d1);
 p(/25°/.test(d1.hin),"er sagt, worauf das Feld gerade steht",d1.hin);

 await fuellen(page,"#winkelEingabeAus","64.5");
 const d2=await page.evaluate(()=>({
   txt:$("winkelErgebnis").innerText.replace(/\s+/g," ").trim(),
   knoepfe:[...document.querySelectorAll("[data-winkel-nimm]")].map(x=>x.dataset.winkelNimm),
   hoehe:Math.round((document.querySelector(".winkel-uebernahme")||{getBoundingClientRect:()=>({height:0})}).getBoundingClientRect().height)
 }));
 p(d2.knoepfe.join(",")==="78,102","beide Winkel stehen zur Auswahl - der Keil und der Nachbar",d2.knoepfe);
 p(/64\.5 cm der Tabelle/.test(d2.txt),"mit der Zeile der Vorlage als Beleg",d2.txt);
 p(d2.hoehe>=40,"die Uebernahme-Knoepfe sind gross genug",d2);

 await klick(page,"[data-winkel-nimm='78']","78° uebernehmen");
 const d3=await page.evaluate(()=>({wert:$("eba_winkel").value,zu:$("winkelModal").hidden}));
 p(d3.wert==="78","der Wert landet in GRAD im Feld",d3);
 p(d3.zu===true,"und der Dialog schliesst sich",d3);

 // Die andere Richtung
 await klick(page,"#eba_winkel + [data-winkel-knopf]","i.M.-Knopf");
 await klick(page,"[data-winkel-richtung='zu']","Richtung Grad -> Meter");
 await fuellen(page,"#winkelEingabeZu","115");
 const d4=await page.evaluate(()=>({
   txt:$("winkelErgebnis").innerText.replace(/\s+/g," ").trim(),
   nimm:document.querySelectorAll("[data-winkel-nimm]").length}));
 p(/73\.25 cm/.test(d4.txt),"Grad -> Meter nennt das Mass, auf das der Meter zu stellen ist",d4.txt);
 p(d4.nimm===0,"und bietet nichts zum Uebernehmen an - das Feld haelt ja Grad",d4);
 await klick(page,"#winkelSchliessen","Schliessen");

 console.log("\nE · das Feld haelt IMMER Grad");
 const quelle=fs.readFileSync("js/55-winkel.js","utf8");
 p(/winkelZiel\.value=String\(g\)/.test(quelle),
   "uebernommen wird ausschliesslich der Gradwert");
 p(/dispatchEvent\(new Event\("input"/.test(quelle)&&/dispatchEvent\(new Event\("change"/.test(quelle),
   "und das Fachmodul wird ueber input UND change benachrichtigt");
 // Das Modul hat den Wert wirklich uebernommen - nicht nur das Feld.
 await typWaehlen(page,"einlaufblech_gerade",["ebaSetzeSchritt",2]);
 await page.evaluate(()=>{$("eba_winkel").value="";});
 await klick(page,"#eba_winkel + [data-winkel-knopf]","i.M.-Knopf");
 await fuellen(page,"#winkelEingabeAus","67.75");
 await klick(page,"[data-winkel-nimm='90']","90° uebernehmen");
 const uebernommen=await page.evaluate(()=>({feld:$("eba_winkel").value,
   modell:(typeof ebA!=="undefined")?String(ebA.winkel):"?"}));
 p(uebernommen.feld==="90"&&uebernommen.modell==="90",
   "das Fachmodul hat den Wert wirklich uebernommen",uebernommen);

 // =========================================================================
 console.log("\nF · Werkstatt: der rote Faden");
 const MESS=[
  {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",workflow_status:"zu_ruesten",
   freigabe_verfallen:false,ruester_id:ICH,monteur_id:null,geruestet_am:null,montiert_am:null,
   updated_at:"2026-09-05T10:00:00Z",created_by:ICH,data:{material:2}},
  {id:12,project_id:7,type:"kehle",title:"Kehle West",workflow_status:"freigegeben",
   freigabe_verfallen:false,ruester_id:null,monteur_id:null,geruestet_am:null,montiert_am:null,
   updated_at:"2026-09-05T11:00:00Z",created_by:ICH,data:{material:3}},
  {id:13,project_id:8,type:"lukarne",title:"Lukarne Ost",workflow_status:"zu_montieren",
   freigabe_verfallen:false,ruester_id:ANDERER,monteur_id:ICH,geruestet_am:"2026-09-04T08:00:00Z",
   montiert_am:null,updated_at:"2026-09-05T09:00:00Z",created_by:ICH,data:{material:2}}
 ];
 const ALLES={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true,
   vorlagen:true,serien:true,versionierung:true};
 const werkstatt=async(res)=>{
  await page.evaluate(([mess,r,mod])=>{
   window.__db.mess=JSON.parse(JSON.stringify(mess));
   window.__db.res=JSON.parse(JSON.stringify(r));
   window.__db.fehler=null; reststuecke=[];
   pmUebernehmen(mod);
   $("measurementEditModal").hidden=true;$("winkelModal").hidden=true;
   werkOffen=null; werkGrundlage=null; werkFilter="alle";
  },[MESS,res,ALLES]);
  await page.evaluate(()=>werkstattOeffnen());
  await page.waitForTimeout(250);
 };
 const wstand=page=>page.evaluate(()=>{
  const b=$("werkstattBody");
  return {
   jetzt:(b.querySelector(".werk-jetzt")||{textContent:""}).textContent.replace(/\s+/g," ").trim(),
   projekte:[...b.querySelectorAll(".werk-projekt")].map(x=>({
     titel:(x.querySelector(".werk-kopf-titel b")||{}).textContent||"",
     satz:(x.querySelector(".mw-streifen-satz")||{}).textContent||"",
     farbe:[...(x.querySelector(".mw-streifen")||{classList:[]}).classList].filter(c=>/^mw-streifen-/.test(c)).join(""),
     stationen:[...x.querySelectorAll(".mw-station")].map(s=>
       (s.querySelector(".mw-st-text")||{}).textContent+":"+[...s.classList].filter(c=>/^mw-st-/.test(c))[0]),
     knopf:(x.querySelector(".mw-streifen-knopf")||{}).textContent||"",
     zeilen:[...x.querySelectorAll(".werk-zeile")].map(z=>
       ((z.querySelector("b")||{}).textContent||"")+(z.classList.contains("werk-zeile-jetzt")?" *":""))
   }))
  };
 });

 const res1=(status)=>[{id:301,project_id:7,material_name:"Titanzink",bezeichnung:"Zuschnitt",
   menge:1,einheit:"Stk",status,laenge_mm:1200,breite_mm:250}];
 const stat=x=>x?x.stationen.join("|"):"";

 // Gar nichts reserviert: dazu sagen die Daten nichts. Die beiden Stationen
 // sind uebersprungen und werden NICHT als naechster Schritt gefordert -
 // sonst stuende bei einem Projekt, das schon montiert wird, "reservieren".
 await werkstatt([]);
 let w=await wstand(page);
 p(/Jetzt dran/.test(w.jetzt),"ganz oben steht, was insgesamt ansteht",w.jetzt);
 p(w.projekte.length===2,"beide Projekte",w.projekte.map(x=>x.titel));
 const p7=w.projekte.find(x=>/Musterstrasse/.test(x.titel));
 const p8=w.projekte.find(x=>/Feldweg/.test(x.titel));
 p(!!p7&&stat(p7)==="Reserviert:mw-st-uebersprungen|Zugeschnitten:mw-st-uebersprungen|Gerüstet:mw-st-jetzt|Montiert:mw-st-offen",
   "ohne jede Reservierung sind die zwei Stationen uebersprungen",stat(p7));
 p(!!p7&&/Rüsten/.test(p7.satz),
   "und der naechste Schritt ist das, was wirklich ansteht",p7&&p7.satz);
 p(!!p8&&/Montieren/.test(p8.satz),
   "ein Projekt, das schon geruestet ist, wird nicht zum Reservieren geschickt",p8&&p8.satz);

 // Bedarf erfasst, aber noch nicht reserviert
 await werkstatt(res1("benoetigt"));
 w=await wstand(page);
 const b7=w.projekte.find(x=>/Musterstrasse/.test(x.titel));
 p(!!b7&&/Material reservieren/.test(b7.satz)&&/1 Position/.test(b7.satz),
   "ist Bedarf erfasst, kommt das Reservieren - mit der Zahl",b7&&b7.satz);
 p(!!b7&&stat(b7)==="Reserviert:mw-st-jetzt|Zugeschnitten:mw-st-offen|Gerüstet:mw-st-offen|Montiert:mw-st-offen",
   "die Leiste zeigt vier Stationen, die erste ist dran",stat(b7));
 p(!!b7&&/Projekt öffnen/.test(b7.knopf),"mit einem Knopf, der dorthin fuehrt",b7&&b7.knopf);

 // Reserviert -> Zuschneiden ist dran
 await werkstatt(res1("reserviert"));
 w=await wstand(page);
 const q7=w.projekte.find(x=>/Musterstrasse/.test(x.titel));
 p(!!q7&&/Zuschneiden/.test(q7.satz),"ist reserviert, kommt das Zuschneiden",q7&&q7.satz);
 p(!!q7&&stat(q7)==="Reserviert:mw-st-fertig|Zugeschnitten:mw-st-jetzt|Gerüstet:mw-st-offen|Montiert:mw-st-offen",
   "die Leiste rueckt eine Station weiter",stat(q7));
 p(!!q7&&/Zuschnitt anzeigen/.test(q7.knopf),"und der Knopf fuehrt zum Zuschnitt",q7&&q7.knopf);

 // Zugeschnitten -> Ruesten ist dran, die Zeile ist markiert
 await werkstatt(res1("zugeschnitten"));
 w=await wstand(page);
 const s7=w.projekte.find(x=>/Musterstrasse/.test(x.titel));
 p(!!s7&&/Rüsten/.test(s7.satz)&&/1 Massaufnahme/.test(s7.satz),
   "ist zugeschnitten, kommt das Ruesten - mit der Zahl",s7&&s7.satz);
 p(!!s7&&stat(s7)==="Reserviert:mw-st-fertig|Zugeschnitten:mw-st-fertig|Gerüstet:mw-st-jetzt|Montiert:mw-st-offen",
   "und die Leiste steht auf Geruestet",stat(s7));
 p(!!s7&&s7.zeilen[0].indexOf("*")>0,
   "die Massaufnahme, um die es geht, steht oben und ist markiert",s7&&s7.zeilen);
 const s8=w.projekte.find(x=>/Feldweg/.test(x.titel));
 p(!!s8&&/Montieren/.test(s8.satz),"das andere Projekt ist beim Montieren",s8&&s8.satz);
 p(w.projekte[0].titel===s7.titel,
   "und das Projekt mit dem frueheren Schritt steht oben",w.projekte.map(x=>x.titel));

 console.log("\nG · nur echte Daten, nur eingeschaltete Module");
 await page.evaluate(()=>{pmUebernehmen({haupt:true,werkstatt:true});
   werkOffen=null;werkGrundlage=null;renderWerkstatt()});
 await page.waitForTimeout(160);
 w=await wstand(page);
 p(w.projekte.length&&w.projekte[0].stationen.join("|").indexOf("RESERVIERT")<0
   &&w.projekte[0].stationen.length===2,
   "ohne Reservierungs- und Zuschnittmodul bleiben zwei Stationen",
   w.projekte[0]&&w.projekte[0].stationen);
 const wq=fs.readFileSync("js/51-werkstatt.js","utf8");
 p(/WERK_RES_RANG/.test(wq)&&!/Math\.random/.test(wq),
   "die Zustaende kommen aus dem Status der Reservierungen, nicht aus einer Schaetzung");
 p(!/sb\.rpc\(/.test(wq),"und die Werkstatt schreibt weiterhin ueber keinen eigenen Weg");

 console.log("\nH · Breiten");
 await page.evaluate(()=>{pmUebernehmen({haupt:true,material:true,zuschnitt:true,
   reservierung:true,werkstatt:true});renderWerkstatt()});
 for(const br of [320,390,768,1200]){
  await page.setViewportSize({width:br,height:900});
  await page.waitForTimeout(120);
  const u=await page.evaluate(()=>{
   const b=$("werkstattBody"); const raus=[];
   b.querySelectorAll("*").forEach(e=>{
    // .scroll und die Fortschrittsleiste duerfen seitwaerts scrollen
    if(e.closest(".scroll")||e.closest(".mw-leiste"))return;
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>document.documentElement.clientWidth+1)raus.push(e.className);
   });
   return {raus:raus.slice(0,3),seite:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(u.raus.length===0&&!u.seite,br+" px: nichts laeuft seitlich hinaus",u);
 }
 await page.setViewportSize({width:412,height:900});

 // Der Dialog auf schmalem Bildschirm
 await page.evaluate(()=>{$("werkstattModal").hidden=true});
 await typWaehlen(page,"kehle",["keaSetzeSchritt",2]);
 await klick(page,"#kea_nh + [data-winkel-knopf]","i.M.-Knopf Kehle");
 await fuellen(page,"#winkelEingabeAus","55.5");
 for(const br of [320,390,768]){
  await page.setViewportSize({width:br,height:900});
  await page.waitForTimeout(120);
  const u=await page.evaluate(()=>{
   const b=$("winkelModal"); const raus=[];
   b.querySelectorAll("*").forEach(e=>{
    const r=e.getBoundingClientRect();
    if(r.width>0&&r.right>document.documentElement.clientWidth+1)raus.push(e.className);
   });
   return raus.slice(0,3);
  });
  p(u.length===0,"Dialog bei "+br+" px: nichts laeuft seitlich hinaus",u);
 }
 await page.setViewportSize({width:412,height:900});

 p(jsfehler.length===0,"keine JavaScript-Fehler",jsfehler.slice(0,3));
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await b.close();
 process.exit(fail?1:0);
})();

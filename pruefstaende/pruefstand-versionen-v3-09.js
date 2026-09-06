// Prueft die Versionierung und den Versionsvergleich (v3.09):
//   - bei AUS gibt es keine Karte und keine Abfrage,
//   - der Client schreibt NIE selbst eine Fassung (kein insert/update/delete),
//   - eine verfallene Freigabe wird als solche benannt: hier darf nichts
//     unbemerkt weiterlaufen (Auftrag Abschnitt 15),
//   - der Vergleich zeigt echte Feldwerte nur dort, wo es sie gibt; bei
//     Listen und verschachtelten Werten steht nur, DASS sich etwas
//     geaendert hat - keine Scheingenauigkeit (Abschnitt 14),
//   - die Werkstattansicht nennt die Fassung und warnt bei Verfall.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-versionen-v3-09.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__ruf=[];
window.__db={versionen:[],messungen:[],reservierungen:[]};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','limit','range'].forEach(k=>f[k]=()=>f);
 f.order=(sp,o)=>{st.sort=[sp,!(o&&o.ascending===false)];return f};
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.delete=()=>{st.op='delete';return f};
 const k=()=>name==='measurement_versionen'?'versionen':(name==='measurements'?'messungen':
        (name==='material_reservierungen'?'reservierungen':null));
 const quelle=()=>{const s=k();return s?window.__db[s]:[]};
 const passt=r=>st.filter.every(([kk,art,v])=>art==='is'?(r[kk]===null||r[kk]===undefined)
   :(art==='in'?v.indexOf(r[kk])>=0:String(r[kk])===String(v)));
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',filter:st.filter.slice()});
  if(st.op)return {data:[],error:{message:"nicht erlaubt"}};
  let raus=quelle().filter(passt).map(r=>JSON.parse(JSON.stringify(r)));
  if(st.sort){const [sp,auf]=st.sort;
   raus.sort((x,y)=>(x[sp]>y[sp]?1:x[sp]<y[sp]?-1:0)*(auf?1:-1));}
  return {data:raus,error:null};
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

// Zwei Fassungen derselben Massaufnahme: gl 100 -> 200, dazu eine Liste und
// ein verschachtelter Wert, damit der Vergleich beide Faelle sieht.
const FASSUNGEN=[
 {id:1,measurement_id:55,nummer:1,type:"kehle",title:"K1",project_id:7,
  freigegeben_von:"aaaa1111-1111-1111-1111-111111111111",freigegeben_am:"2026-09-01T07:00:00Z",
  data:{nh:42.5,nl:23.5,gl:100,material:2,abwicklung:500,
        segmente:[{laenge:2000},{laenge:1000}],
        rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}]}}},
 {id:2,measurement_id:55,nummer:2,type:"kehle",title:"K1",project_id:7,
  freigegeben_von:"bbbb2222-2222-2222-2222-222222222222",freigegeben_am:"2026-09-03T09:30:00Z",
  data:{nh:42.5,nl:30,gl:200,material:3,abwicklung:500,
        segmente:[{laenge:2000},{laenge:1000},{laenge:900}],
        rollen:{abwicklung:500,streifen:[{rest:120,stuecke:[{nr:1,laenge:2000}]}]}}}
];

const vorbereiten=async(page,module,fassungen,stand)=>{
 await page.evaluate(([mod,f,st])=>{
  currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:"admin",first_name:"P",last_name:"Test"};
  allProfiles=[{id:"aaaa1111-1111-1111-1111-111111111111",first_name:"Anna",last_name:"Auf"},
               {id:"bbbb2222-2222-2222-2222-222222222222",first_name:"Bruno",last_name:"Berg"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  workflowAktiv=true; moduleImTest={};
  window.__db.versionen=JSON.parse(JSON.stringify(f||[]));
  window.__db.messungen=[]; window.__ruf=[];
  currentMeasurementId=55;
  mwStand=st?JSON.parse(JSON.stringify(st)):null;
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
  ["settingsModal","projectCockpitModal","werkstattModal"].forEach(i=>{if($(i))$(i).hidden=true});
  $("measurementEditModal").hidden=false;
 },[module,fassungen,stand]);
 await page.evaluate(()=>verNeuLaden());
 await page.waitForTimeout(60);
};

const stand=page=>page.evaluate(()=>{
 const b=$("measVersionenBereich"), r=b.getBoundingClientRect(), st=getComputedStyle(b);
 return {hidden:b.hidden, hoehe:Math.round(r.height),
         sichtbar:st.display!=="none"&&r.height>0,
         text:b.textContent.replace(/\s+/g," ").trim(),
         jetzt:[...b.querySelectorAll("[data-ver-jetzt]")].map(x=>x.dataset.verJetzt),
         vorher:[...b.querySelectorAll("[data-ver-vorher]")].map(x=>x.dataset.verVorher),
         diff:[...b.querySelectorAll(".ver-diff-zeile")].map(z=>
           [z.querySelector(".ver-diff-label").textContent.trim(),
            z.querySelector(".ver-diff-wert").textContent.trim()]),
         ohne:(b.querySelector(".ver-diff .small[style]")||{}).textContent||"",
         warnung:((b.querySelector(".mw-warnung")||{}).textContent||"").replace(/\s+/g," ").trim()};
});

const klick=async(page,wahl)=>{
 const r=await page.evaluate(w=>{
  const e=document.querySelector(w);
  if(!e)return "fehlt";
  const b=e.getBoundingClientRect();
  if(getComputedStyle(e).display==="none"||b.height===0)return "unsichtbar";
  e.click(); return "ok";
 },wahl);
 await page.waitForTimeout(80);
 return r;
};

const FREI={id:55,workflow_status:"zu_ruesten",freigabe_verfallen:false,
 ruester_id:"bbbb2222-2222-2222-2222-222222222222",monteur_id:null,
 freigegeben_von:"aaaa1111-1111-1111-1111-111111111111",freigegeben_am:"2026-09-03T09:30:00Z",
 geruestet_von:null,geruestet_am:null,montiert_von:null,montiert_am:null};
const VERFALLEN={...FREI,workflow_status:"in_bearbeitung",freigabe_verfallen:true};

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 console.log("\nA · bei AUS gibt es nichts");
 await vorbereiten(page,{},FASSUNGEN,FREI);
 let s=await stand(page);
 p(s.hidden===true&&!s.sichtbar,"Karte unsichtbar",s);
 let ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="measurement_versionen"));
 p(ruf.length===0,"bei AUS wird gar nicht erst geladen",{n:ruf.length});
 await vorbereiten(page,{haupt:false,versionierung:true},FASSUNGEN,FREI);
 s=await stand(page);
 p(!s.sichtbar,"Untermodul an, Hauptschalter aus: weiterhin nichts");

 console.log("\nB · eingeschaltet");
 await vorbereiten(page,{haupt:true,versionierung:true},FASSUNGEN,FREI);
 s=await stand(page);
 p(s.sichtbar,"Karte sichtbar",{y:s.hoehe});
 p(/Fassung 2/.test(s.text)&&/Fassung 1/.test(s.text),"beide Fassungen gelistet",{t:s.text.slice(0,200)});
 p(/Verbindlich ist Fassung 2/.test(s.text),"die verbindliche Fassung ist benannt",{t:s.text.slice(0,160)});
 p(/Anna Auf/.test(s.text)&&/Bruno Berg/.test(s.text),"wer wann freigegeben hat",{t:s.text.slice(0,240)});
 p(s.jetzt.join()==="2,1","je Fassung ein Vergleich mit dem aktuellen Stand",s.jetzt);
 p(s.vorher.join()==="2","nur die zweite kann mit ihrer Vorgaengerin verglichen werden",s.vorher);
 p(s.warnung==="","keine Warnung, solange die Freigabe gilt",{w:s.warnung});
 ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="measurement_versionen"));
 p(ruf.length===1&&ruf[0].op==="select","genau eine lesende Abfrage",ruf);
 p(ruf[0].filter.some(f=>f[0]==="measurement_id"),"gefiltert nach der Massaufnahme",ruf[0].filter);
 p(!ruf[0].filter.some(f=>f[0]==="company_id"),"KEIN company_id-Filter im Client",ruf[0].filter);

 // Der Client hat kein Schreibrecht - er versucht es auch gar nicht
 const quelle=require("fs").readFileSync("js/53-versionen.js","utf8");
 p(!/measurement_versionen"\)[\s\S]{0,80}\.(insert|update|delete)\(/.test(quelle),
   "js/53 schreibt nie in measurement_versionen");
 p(!/sb\.rpc\(/.test(quelle),"js/53 ruft keine Datenbankfunktion auf - es liest nur");

 console.log("\nC · Auftrag Abschnitt 15: verfallene Freigabe");
 await vorbereiten(page,{haupt:true,versionierung:true},FASSUNGEN,VERFALLEN);
 s=await stand(page);
 p(/Fassung 2 ist nicht mehr aktuell/.test(s.warnung),"die letzte Fassung wird als veraltet benannt",{w:s.warnung.slice(0,120)});
 p(/Zuschnitt und Rüsten dürfen nicht/.test(s.warnung),"und ausdruecklich gesagt, was daraus folgt",{w:s.warnung.slice(0,200)});
 p(/Fassung 3/.test(s.warnung),"die naechste Nummer ist genannt",{w:s.warnung.slice(0,200)});
 p(!/Verbindlich ist/.test(s.text),"nichts gilt mehr als verbindlich");

 console.log("\nD · noch keine Fassung");
 await vorbereiten(page,{haupt:true,versionierung:true},[],
   {...FREI,workflow_status:"in_bearbeitung",freigabe_verfallen:false});
 s=await stand(page);
 p(/Noch keine Fassung/.test(s.text),"Leerzustand benannt",{t:s.text.slice(0,120)});
 p(s.jetzt.length===0&&s.vorher.length===0,"keine Vergleichsknoepfe");

 console.log("\nE · Vergleich zweier Fassungen (Abschnitt 14)");
 await vorbereiten(page,{haupt:true,versionierung:true},FASSUNGEN,FREI);
 p((await klick(page,'[data-ver-vorher="2"]'))==="ok","Vergleich bedienbar");
 s=await stand(page);
 const feld=n=>{const z=s.diff.find(x=>x[0]===n);return z?z[1]:null};
 p(/Fassung 1 → Fassung 2/.test(s.text),"Richtung benannt",{t:s.text.slice(0,200)});
 p(feld("Material")==="Titanzink → Kupfer","Material mit deutschem Namen",s.diff);
 p(!s.diff.some(z=>z[0]==="Abwicklung"),"unveraenderte Felder erscheinen nicht",s.diff);
 // gl und nl haben keine eigene Bezeichnung in der Tabelle - dann steht der
 // technische Name da, statt eine deutsche zu erfinden.
 p(/gl/.test(s.ohne)&&/nl/.test(s.ohne),"Werte ohne Bezeichnung mit technischem Namen",{o:s.ohne});
 p(/segmente \(2 → 3\)/.test(s.ohne),"Liste: nur die Anzahl, kein Feldvergleich",{o:s.ohne});
 p(/rollen/.test(s.ohne),"verschachtelter Wert genannt",{o:s.ohne});
 p(!/streifen|rest/.test(s.ohne),"KEINE Scheingenauigkeit im Zuschnittplan",{o:s.ohne});

 // Die Vergleichsfunktion selbst, unabhaengig von der Anzeige
 const v=await page.evaluate(()=>verVergleich(
   {massA:1200,winkel:30,pieces:[1,2],tief:{a:1},gleich:5},
   {massA:1350,winkel:30,pieces:[1,2,3],tief:{a:2},gleich:5}));
 p(v.length===3,"nur die drei geaenderten Werte",v.map(x=>x.feld));
 p(v.find(x=>x.feld==="massA").art==="wert","Zahl: echter Vergleich",v);
 p(/1.?200 mm → 1.?350 mm/.test(v.find(x=>x.feld==="massA").text),"mit Einheit aus dem Verlauf",v.find(x=>x.feld==="massA"));
 p(v.find(x=>x.feld==="pieces").art==="liste"&&/2 → 3/.test(v.find(x=>x.feld==="pieces").text),"Liste: Anzahl",v.find(x=>x.feld==="pieces"));
 p(v.find(x=>x.feld==="tief").art==="struktur"&&v.find(x=>x.feld==="tief").text==="geändert","verschachtelt: nur „geändert\"",v.find(x=>x.feld==="tief"));
 const leer=await page.evaluate(()=>verVergleich({a:1},{a:1}));
 p(leer.length===0,"gleiche Staende: kein Unterschied",leer);
 const nix=await page.evaluate(()=>({a:verVergleich(null,null).length,b:verVergleich(undefined,{x:1}).length}));
 p(nix.a===0&&nix.b===1,"fehlende Daten stuerzen nicht ab",nix);

 console.log("\nF · Vergleich mit dem aktuellen Stand");
 await vorbereiten(page,{haupt:true,versionierung:true},FASSUNGEN,FREI);
 await page.evaluate(async()=>{
  newMeasurementWithType("kehle");
  if(typeof keaSetzeSchritt==="function")keaSetzeSchritt(2);
  currentMeasurementId=55;
  await verNeuLaden();
  [["kea_nh","42.5"],["kea_nl","30"],["kea_gl","999"]].forEach(([i,val])=>{
   const e=$(i); e.value=val; e.dispatchEvent(new Event("input",{bubbles:true}));
  });
  renderMeasVersionen();
 });
 await klick(page,'[data-ver-jetzt="2"]');
 s=await stand(page);
 p(/Fassung 2 → aktueller Stand/.test(s.text),"Richtung benannt",{t:s.text.slice(0,200)});
 p(/gl/.test(s.ohne),"der geaenderte Wert taucht auf",{o:s.ohne});

 console.log("\nG · Werkstattansicht nennt die Fassung");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=true;
  window.__db.messungen=[{id:55,project_id:7,type:"kehle",title:"K1",date:"2026-09-01",
    workflow_status:"zu_ruesten",freigabe_verfallen:false,
    ruester_id:"aaaa1111-1111-1111-1111-111111111111",monteur_id:null,
    geruestet_am:null,montiert_am:null,updated_at:"2026-09-03T09:30:00Z",
    created_by:"aaaa1111-1111-1111-1111-111111111111"}];
  pmUebernehmen({haupt:true,versionierung:true,werkstatt:true});
  $("werkstattModal").hidden=false;
 });
 await page.evaluate(()=>werkstattNeuLaden());
 await page.waitForTimeout(120);
 let w=await page.evaluate(()=>$("werkstattBody").textContent.replace(/\s+/g," ").trim());
 p(/Fassung 2/.test(w),"die Fassung steht an der Zeile",{w:w.slice(0,240)});
 await page.evaluate(()=>{window.__db.messungen[0].freigabe_verfallen=true});
 await page.evaluate(()=>werkstattNeuLaden());
 await page.waitForTimeout(120);
 w=await page.evaluate(()=>$("werkstattBody").textContent.replace(/\s+/g," ").trim());
 p(/Fassung 2 nicht mehr aktuell/.test(w),"bei Verfall wird gewarnt",{w:w.slice(0,300)});
 // ohne das Modul keine zusaetzliche Abfrage
 await page.evaluate(()=>{pmUebernehmen({haupt:true,werkstatt:true});window.__ruf=[]});
 await page.evaluate(()=>werkstattNeuLaden());
 await page.waitForTimeout(120);
 let vruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle==="measurement_versionen").length);
 p(vruf===0,"Versionierung aus: die Werkstatt fragt nicht danach",{n:vruf});
 w=await page.evaluate(()=>$("werkstattBody").textContent.replace(/\s+/g," ").trim());
 p(!/Fassung/.test(w),"und nennt auch keine Fassung",{w:w.slice(0,200)});

 console.log("\nH · Bildschirmbreiten");
 for(const b of [360,412,768,1200]){
  await page.setViewportSize({width:b,height:900});
  await page.evaluate(()=>{$("werkstattModal").hidden=true;$("measurementEditModal").hidden=false});
  await vorbereiten(page,{haupt:true,versionierung:true},FASSUNGEN,FREI);
  await klick(page,'[data-ver-vorher="2"]');
  const ueb=await page.evaluate(()=>{
   const r=$("measVersionenBereich").getBoundingClientRect();
   return {raus:r.right>window.innerWidth+1,scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(!ueb.raus&&!ueb.scroll,b+" px: nichts laeuft seitlich hinaus",ueb);
 }
 await page.setViewportSize({width:1200,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await browser.close();
 process.exit(fail?1:0);
})();

// Prueft die projektweite Materialuebersicht und den projektweiten
// Zuschnitt (v3.09):
//   - bei AUS ist beides unsichtbar und die App verhaelt sich wie bisher,
//   - das Material wird aus den GESPEICHERTEN Daten zusammengefuehrt,
//     nicht neu gerechnet,
//   - zusammengefasst wird nur, was fachlich dasselbe ist,
//   - jede Position fuehrt zu ihrer Massaufnahme zurueck,
//   - der Zuschnitt benutzt die EINE Packrechnung (ebaPackeInStreifen) und
//     die EINE Darstellung (zuschnittHtml) - keine zweite Berechnung,
//   - Stuecke aus verschiedenen Massaufnahmen kommen in denselben Streifen,
//   - die Schnittfuge der Firma wird beruecksichtigt,
//   - verschiedene Materialien werden nie vermischt.
//
// Die Zahlen sind VON HAND nachgerechnet und stehen als Kommentar daneben.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-projekt-material-zuschnitt-v3-09.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,320):""))}};

const STUB=`window.__ruf=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(n,a)=>{window.__ruf.push({name:n,args:a});return {data:null,error:null}},
 from:()=>{const f={};['select','order','limit','range','eq','in','update','insert','delete'].forEach(k=>f[k]=()=>f);
   f.maybeSingle=async()=>({data:null,error:null});
   f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

const sichtbar=(page,sel)=>page.evaluate(s=>{
 const e=document.querySelector(s); if(!e)return false;
 const r=e.getBoundingClientRect();
 return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden";
},sel);
// v3.11: die Cockpit-Abschnitte sind klappbar und starten zugeklappt. Ein
// Element darin ist erst nach dem Aufklappen sichtbar - das ist eine
// ueberholte Erwartung dieses Pruefstands, kein Codefehler. Geprueft wird
// weiterhin, dass es DANACH wirklich sichtbar und anklickbar ist.
const aufklappen=(page,sel)=>page.evaluate(s=>{
 const e=document.querySelector(s); if(!e)return;
 const box=e.closest(".klapp"); if(!box)return;
 const kopf=box.querySelector(".klapp-kopf[data-klapp]");
 if(kopf&&!box.classList.contains("open"))kopf.click();
},sel);
const klick=async(page,sel,was)=>{
 await aufklappen(page,sel);
 if(!await sichtbar(page,sel)){p(false,(was||"Element")+" sichtbar und anklickbar ("+sel+")");return false}
 try{await page.click(sel,{timeout:4000});return true}
 catch(e){p(false,(was||"Element")+" anklickbar ("+sel+")",String(e).slice(0,120));return false}
};

// Zwei Massaufnahmen, Titanzink, mit GESPEICHERTEM Ausmass und Zuschnitt.
// A: Stuecke 1200 und 700, Abwicklung 250, flache Speicherform
// B: Stueck 400, Abwicklung 250, aeltere Form mit verteilung.streifen
// C: anderes Material (Kupfer), damit die Trennung geprueft wird
const AUFNAHMEN=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",
  workflow_status:"freigegeben",freigabe_verfallen:false,
  data:{material:2,abwicklung:250,
   ausmass:[{pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"1,90",einheit:"m",herkunft:"Summe"},
            {pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:2,einheit:"Stk.",herkunft:"Stückliste"},
            {pos:3,bezeichnung:"Blechfläche",menge:"0,48",einheit:"m²",herkunft:"Länge × Abwicklung"}],
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],optimal:true}}},
 {id:12,project_id:7,type:"einlaufblech_konisch",title:"Dach Süd",
  workflow_status:"zu_ruesten",freigabe_verfallen:true,
  data:{material:2,abwicklung:250,
   ausmass:[{pos:1,bezeichnung:"Stücke (Zuschnitte)",menge:1,einheit:"Stk.",herkunft:"Stückliste"},
            {pos:2,bezeichnung:"Blechfläche",menge:"0,10",einheit:"m²",herkunft:"Länge × Abwicklung"},
            {pos:3,bezeichnung:"Enge Seite",menge:"–",einheit:"",herkunft:"kein Wert"}],
   rollen:{verteilung:{streifen:[{rest:0,stuecke:[{nr:1,laenge:400}]}],optimal:true}}}},
 {id:13,project_id:7,type:"kehle",title:"Kehle West",
  workflow_status:"in_bearbeitung",freigabe_verfallen:false,
  data:{material:3,abwicklung:500,
   ausmass:[{pos:1,bezeichnung:"Blechfläche",menge:"1,00",einheit:"m²",herkunft:"x"}],
   rollen:{abwicklung:500,streifen:[{rest:0,stuecke:[{nr:1,laenge:2000}]}],optimal:true}}}
];

const vorbereiten=(page,module,schnittfuge)=>page.evaluate(([auf,mod,fuge])=>{
 currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:"admin",first_name:"P",last_name:"Test"};
 allProfiles=[]; meineRechte={admin:true}; appSettingsId=1;
 allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern",order_no:"2026-1",customer:"Muster AG"}];
 measurementMaterials=[{id:2,name:"Titanzink",legacy_key:"titanzink"},
                       {id:3,name:"Kupfer",legacy_key:"kupfer"}];
 blechRollenbreiten=[1000,670];
 blechSchnittfuge=fuge;
 workflowAktiv=true;
 projectMeasurementsCache=JSON.parse(JSON.stringify(auf));
 cockpitProjectId=7;
 pmUebernehmen(mod);
 $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
 $("settingsModal").hidden=true;$("measurementEditModal").hidden=true;
 // v3.15: die drei ausfuehrlichen Ansichten liegen jetzt auf der Seite
 // MATERIAL & ZUSCHNITT, zugeklappt. Fuer diesen Pruefstand wird die
 // Seite geoeffnet und alles aufgeklappt - eine ueberholte Erwartung,
 // kein Codefehler; geprueft wird weiterhin dasselbe.
 $("projectCockpitModal").hidden=false;
 $("matZuModal").hidden=false;
 ["matZuDetailsMaterial","matZuDetailsZuschnitt","matZuDetailsReservierung"]
  .forEach(id=>{const d=$(id); if(d){d.hidden=false; d.open=true}});
 pmSichtbarkeitAuffrischen();
},[AUFNAHMEN,module,schnittfuge]);

const stand=page=>page.evaluate(()=>{
 const mk=$("cockpitMaterialCard"), zk=$("cockpitZuschnittCard");
 const mr=mk.getBoundingClientRect(), zr=zk.getBoundingClientRect();
 const txt=e=>(e.innerText||"").replace(/\s+/g," ").trim();
 return {
  matHidden:mk.hidden, matHoehe:Math.round(mr.height),
  zuHidden:zk.hidden,  zuHoehe:Math.round(zr.height),
  matZahl:(($("cockpitMaterialCount")||{}).textContent||"").trim(),
  zuZahl:(($("cockpitZuschnittCount")||{}).textContent||"").trim(),
  // textContent, nicht innerText: die Einzelheiten stehen in <details>
  matText:$("cockpitMaterialBody").textContent.replace(/\s+/g," ").trim(),
  zuText:$("cockpitZuschnittBody").textContent.replace(/\s+/g," ").trim(),
  matSichtbar:txt($("cockpitMaterialBody")),
  matGruppen:[...$("cockpitMaterialBody").querySelectorAll(".pmat-gruppe")].map(g=>
    (g.querySelector(".pmat-kopf b")||{}).textContent||""),
  zuMaterialien:[...$("cockpitZuschnittBody").querySelectorAll(".pzu-material")].map(g=>
    (g.querySelector(".pmat-kopf b")||{}).textContent||""),
  quellen:[...$("cockpitMaterialBody").querySelectorAll("[data-pmat-open]")].map(b=>b.dataset.pmatOpen),
  herkunft:[...$("cockpitZuschnittBody").querySelectorAll("[data-pzu-open]")].map(b=>b.dataset.pzuOpen)
 };
});

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,160)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 console.log("\nA · bei AUS ist nichts sichtbar");
 await vorbereiten(page,{},0);
 let s=await stand(page);
 p(s.matHidden===true&&s.matHoehe===0,"Materialkarte unsichtbar",{h:s.matHidden,y:s.matHoehe});
 p(s.zuHidden===true&&s.zuHoehe===0,"Zuschnittkarte unsichtbar",{h:s.zuHidden,y:s.zuHoehe});
 p(s.matText===""&&s.zuText==="","und beide sind leer");

 await vorbereiten(page,{haupt:false,material:true,zuschnitt:true},0);
 s=await stand(page);
 p(s.matHidden===true&&s.zuHidden===true,
   "Untermodule an, Hauptschalter aus: weiterhin unsichtbar",{m:s.matHidden,z:s.zuHidden});

 console.log("\nB · Material einschalten");
 await vorbereiten(page,{haupt:true,material:true},0);
 s=await stand(page);
 p(s.matHidden===false&&s.matHoehe>0,"Materialkarte sichtbar",{h:s.matHidden,y:s.matHoehe});
 p(s.zuHidden===true,"Zuschnittkarte bleibt aus, solange ihr Modul aus ist",s.zuHidden);
 p(s.matGruppen.length===2&&s.matGruppen.indexOf("Kupfer")>=0&&s.matGruppen.indexOf("Titanzink")>=0,
   "zwei Materialgruppen, aus der bestehenden Materialverwaltung benannt",s.matGruppen);
 // Der Zaehler stand in der Klapp-Ueberschrift, die es seit v3.15 nicht
 // mehr gibt; die Zahl steht jetzt in den Kennzahlen der Seite.
 const kz=await page.evaluate(()=>($("matZuKennzahlen").innerText||"").replace(/\s+/g," ").trim());
 p(/Materialpositionen/i.test(kz),"die Kennzahl nennt die Materialpositionen",kz);

 console.log("\nC · Zusammenfassen nur, was fachlich dasselbe ist");
 // Titanzink: "Stücke (Zuschnitte)" kommt in 11 mit 2 und in 12 mit 1 vor -> 3
 p(/Stücke \(Zuschnitte\)/.test(s.matText),"die gemeinsame Position ist da");
 let z=await page.evaluate(()=>{
  const g=pmatSammeln(projectMeasurementsCache).find(x=>x.material==="Titanzink");
  const f=b=>g.positionen.find(p=>p.bezeichnung===b);
  return {stueck:f("Stücke (Zuschnitte)"),flaeche:f("Blechfläche"),
          eng:f("Enge Seite"),
          eb:f("Einlaufblech gerade, Abwicklung 250 mm"),
          anzahl:g.positionen.length};
 });
 p(z.stueck&&z.stueck.summe===3&&z.stueck.quellen.length===2,
   "gleiche Bezeichnung und Einheit werden summiert: 2 + 1 = 3",z.stueck);
 p(z.flaeche&&Math.abs(z.flaeche.summe-0.58)<1e-9,
   "auch mit Komma gespeicherte Mengen: 0,48 + 0,10 = 0,58",z.flaeche&&z.flaeche.summe);
 p(z.eng&&z.eng.summe===null&&z.eng.texte.join("")==="–",
   "was keine Zahl ist, wird NICHT summiert, sondern gezeigt",z.eng);
 const roh=await page.evaluate(()=>["–","",null,undefined,"abc","1,5",1.5,"2'000",NaN,Infinity]
   .map(v=>{const r=pmatZahl(v);return r===null?"null":String(r)}));
 p(JSON.stringify(roh)===JSON.stringify(["null","null","null","null","null","1.5","1.5","2000","null","null"]),
   "pmatZahl liest Zahlen und liefert fuer alles andere null - nicht 0",roh);
 p(z.eb&&z.eb.quellen.length===1,"eine Position nur einer Aufnahme bleibt einzeln",z.eb&&z.eb.quellen.length);

 console.log("\nD · Rueckverfolgung zur Massaufnahme");
 p(s.quellen.length===3,"jede Massaufnahme ist als Quelle anklickbar",s.quellen);
 if(await klick(page,'#cockpitMaterialBody [data-pmat-open="11"]',"Quelle")){
  await page.waitForTimeout(150);
  const auf=await page.evaluate(()=>({modal:$("measurementEditModal").hidden,
    zurueck:(typeof measEditReturnTo!=="undefined")?measEditReturnTo:null}));
  p(auf.modal===false,"die Massaufnahme geht auf",auf);
  p(auf.zurueck==="projectCockpit","und fuehrt zurueck ins Cockpit",auf);
  await page.evaluate(()=>{$("measurementEditModal").hidden=true});
 }

 console.log("\nE · Zuschnitt: dieselbe Packrechnung, dieselbe Darstellung");
 // Beweis, dass wirklich die gemeinsamen Funktionen gerufen werden.
 await page.evaluate(()=>{
  window.__pack=0; window.__zeig=0;
  const o=window.ebaPackeInStreifen, d=window.zuschnittHtml;
  window.ebaPackeInStreifen=function(){window.__pack++;return o.apply(this,arguments)};
  window.zuschnittHtml=function(){window.__zeig++;return d.apply(this,arguments)};
 });
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true},0);
 s=await stand(page);
 let ruf=await page.evaluate(()=>({pack:window.__pack,zeig:window.__zeig}));
 p(ruf.pack>0,"ebaPackeInStreifen() aus js/29 wird wirklich gerufen",ruf);
 p(ruf.zeig>0,"zuschnittHtml() aus js/33 wird wirklich gerufen",ruf);
 p(s.zuHidden===false&&s.zuHoehe>0,"die Zuschnittkarte ist sichtbar");
 p(s.zuMaterialien.length===2,"je Material ein eigener Plan - nie vermischt",s.zuMaterialien);

 // Von Hand nachgerechnet, Titanzink, Schnittfuge 0:
 //   Stuecke 1200 (Aufn. 11), 700 (Aufn. 11), 400 (Aufn. 12), Breite 250
 //   Abschnitt = laengstes Stueck = 1200
 //   Packung: [1200] und [700+400=1100 <= 1200]  -> 2 Streifen
 //   Rolle 1000: floor(1000/250)=4 Streifen je Abschnitt -> ceil(2/4)=1
 //     Abschnitt, Rollenlaenge 1200, Flaeche 1000*1200/1e6 = 1,200 m2
 //   Rolle  670: floor(670/250) =2 Streifen je Abschnitt -> ceil(2/2)=1
 //     Abschnitt, Rollenlaenge 1200, Flaeche  670*1200/1e6 = 0,804 m2
 //   Netto (1200+700+400)*250/1e6 = 0,575 m2
 //   Die 670er braucht weniger Blech und ist deshalb die bessere Rolle:
 //     Verschnitt 0,804 - 0,575 = 0,229 m2 gegen 0,625 m2 bei der 1000er.
 let plan=await page.evaluate(()=>{
  const alle=pzuSammeln(projectMeasurementsCache).materialien;
  const M=alle.find(x=>x.material==="Titanzink");
  if(!M||!M.gruppen||!M.gruppen.length)
   return {fehlt:true,gefunden:alle.map(x=>x.material)};
  const r=pzuRollenPlan(M);
  return {breiten:M.gruppen.map(g=>g.breite),
   abschnitt:M.gruppen[0].abschnittLaenge,
   streifen:M.gruppen[0].streifen.map(st=>st.stuecke.map(x=>x.laenge)),
   quellenJeStreifen:M.gruppen[0].streifen.map(st=>[...new Set(st.stuecke.map(x=>x.quelleId))]),
   beste:r.bestes?{breite:r.bestes.breite,flaeche:Math.round(r.bestes.flaeche*1000)/1000,
     rollenLaenge:r.bestes.rollenLaenge,verschnitt:Math.round(r.bestes.verschnitt*1000)/1000}:null,
   alle:(r.moeglich||[]).map(x=>({breite:x.breite,flaeche:Math.round(x.flaeche*1000)/1000})),
   netto:Math.round(r.netto*1000)/1000};
 });
 p(!plan.fehlt,"die Materialgruppe Titanzink gibt es als eigenen Plan",plan.gefunden);
 if(plan.fehlt)plan={breiten:[],streifen:[],quellenJeStreifen:[],netto:null,beste:null,alle:[],abschnitt:null};
 p(plan.breiten.length===1&&plan.breiten[0]===250,"eine Streifenbreite 250 mm",plan.breiten);
 p(plan.abschnitt===1200,"Abschnitt so lang wie das laengste Stueck: 1200 mm",plan.abschnitt);
 p(plan.streifen.length===2,"zwei Streifen",plan.streifen);
 p(JSON.stringify(plan.streifen)===JSON.stringify([[1200],[700,400]]),
   "700 und 400 liegen zusammen in einem Streifen",plan.streifen);
 p(plan.quellenJeStreifen[1]&&plan.quellenJeStreifen[1].length===2,
   "und stammen aus ZWEI verschiedenen Massaufnahmen - das ist der Gewinn",plan.quellenJeStreifen);
 p(plan.netto===0.575,"Nettoflaeche 0,575 m2",plan.netto);
 p(plan.beste&&plan.beste.breite===670&&plan.beste.rollenLaenge===1200,
   "beste Rolle 670 mm (weniger Blech als die 1000er), 1200 mm ab Rolle",plan.beste);
 p(plan.beste&&plan.beste.flaeche===0.804&&plan.beste.verschnitt===0.229,
   "0,804 m2 Blech, 0,229 m2 Verschnitt",plan.beste);
 p(plan.alle&&plan.alle.length===2&&plan.alle[0].flaeche<plan.alle[1].flaeche,
   "die Rollen sind nach Materialeinsatz sortiert",plan.alle);

 console.log("\nF · Herkunft jedes Stuecks");
 p(s.herkunft.length>=2,"die Herkunft nennt beide Massaufnahmen",s.herkunft);
 p(/Freigabe verfallen/.test(s.zuText),
   "eine verfallene Freigabe wird beim Zuschnitt genannt (keine stille Weiterproduktion)");
 if(await klick(page,'#cockpitZuschnittBody [data-pzu-open="12"]',"Herkunft")){
  await page.waitForTimeout(150);
  const auf=await page.evaluate(()=>$("measurementEditModal").hidden);
  p(auf===false,"von der Herkunft zur Massaufnahme");
  await page.evaluate(()=>{$("measurementEditModal").hidden=true});
 }

 console.log("\nG · Schnittfuge der Firma");
 // Mit 300 mm Fuge passt 700+400 nicht mehr in 1200 (700+300 + 400+300 = 1700).
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true},300);
 let mitFuge=await page.evaluate(()=>{
  const M=pzuSammeln(projectMeasurementsCache).materialien.find(x=>x.material==="Titanzink");
  if(!M||!M.gruppen||!M.gruppen.length)return null;   // sauber fehlschlagen, nicht abbrechen
  return M.gruppen[0].streifen.map(st=>st.stuecke.map(x=>x.laenge));
 });
 p(!!mitFuge&&mitFuge.length===3,"mit 300 mm Schnittfuge braucht es drei Streifen statt zwei",mitFuge);
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true},0);

 console.log("\nH · leere Faelle");
 await page.evaluate(()=>{projectMeasurementsCache=[];pmSichtbarkeitAuffrischen()});
 s=await stand(page);
 p(/Noch keine Massaufnahme/.test(s.matText),"ohne Massaufnahme: verstaendlicher Text",s.matText.slice(0,80));
 p(/Noch nichts zuzuschneiden/.test(s.zuText),"ohne Zuschnitt: verstaendlicher Text",s.zuText.slice(0,80));
 await page.evaluate(()=>{
  projectMeasurementsCache=[{id:20,project_id:7,type:"skizze_foto",title:"Foto",data:{material:2}}];
  pmSichtbarkeitAuffrischen()});
 s=await stand(page);
 p(/kein gespeichertes Ausmass|Kein gespeichertes Ausmass/.test(s.matText),
   "Massaufnahme ohne Ausmass: gesagt statt geraten",s.matText.slice(0,120));

 console.log("\nI · Breiten");
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true},0);
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:900});
  await page.evaluate(()=>pmSichtbarkeitAuffrischen());
  const m=await page.evaluate(()=>{
   const a=$("cockpitMaterialCard").getBoundingClientRect();
   const b=$("cockpitZuschnittCard").getBoundingClientRect();
   // Inhalte in einem .scroll-Container duerfen breiter sein - das ist die
   // bestehende Bauform fuer breite Tabellen (CLAUDE.md, seit v2.74).
   const raus=[...document.querySelectorAll("#cockpitMaterialBody *,#cockpitZuschnittBody *")]
    .filter(e=>{const r=e.getBoundingClientRect();
      return r.width>0&&r.right>Math.max(a.right,b.right)+1&&!e.closest(".scroll")});
   return {rechts:Math.round(Math.max(a.right,b.right)),ueber:raus.length,
    wer:raus.slice(0,4).map(e=>e.tagName+"."+String(e.className).slice(0,30)),
    scrollt:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(m.ueber===0&&!m.scrollt,w+" px: nichts laeuft seitlich hinaus",m);
 }
 await page.setViewportSize({width:1200,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await browser.close();
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

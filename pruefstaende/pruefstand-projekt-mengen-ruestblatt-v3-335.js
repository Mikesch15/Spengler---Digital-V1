// Prueft v3.335: (A) Offertmengen m²/Stueck, (B) Projekt-Ruestblatt mit Auswahl, (C) gemeinsame Rollenoptimierung der ausgewaehlten
// Massaufnahmen (Vorschau). Teil 1: reine Funktionen (vm). Teil 2: Browser mit Attrappe und Schreibspur.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-projekt-mengen-ruestblatt-v3-335.js
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,420):""))}};
const q63=fs.readFileSync("js/63-angebote.js","utf8");
const a=q63.indexOf("const ANG_MAT_STAERKE_MIN"), b=q63.indexOf("// ---- Ende Offertposition Materialdaten");
const sb={esc:s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;")};
vm.runInNewContext(q63.slice(a,b)+";this.U=angMengenUebersicht;this.H=angMengenHtml;this.E=angMengenEinheit",sb);
const L=[{id:1,name:"Kupfer"},{id:2,name:"Titanzink"}];
const pos=(d,x)=>Object.assign({pos:"",description:d,quantity:1,unit:"m"},x||{});

console.log("\nA · Offertmengen");
let r=sb.U([pos("Rinne",{quantity:12,abwicklung_mm:500})],L);
p(Math.abs(r.flaeche_m2-6)<1e-12&&r.vollstaendig,"12 m × 500 mm = 6 m²",r);
r=sb.U([pos("Boden",{quantity:7.5,unit:"m2"}),pos("Boden",{quantity:2.5,unit:"m²"})],L);
p(r.flaeche_m2===10&&r.stueck===0,"m2/m² bleibt m² (Menge ist die Fläche, keine Abwicklung multipliziert)",r);
r=sb.U([pos("Halter",{quantity:10,unit:"St"}),pos("Winkel",{quantity:4,unit:"Stk"}),pos("Lappen",{quantity:3,unit:"Stück"})],L);
p(r.stueck===17&&r.flaeche_m2===0,"St/Stk/Stück summieren nur Stück",r);
r=sb.U([pos("Rinne. Abwicklung mm 500.",{quantity:12,abwicklung_mm:500}),pos("Trennlage. b mm 500.",{quantity:86}),pos("Anschluss.",{quantity:198})],L);
p(Math.abs(r.flaeche_m2-6)<1e-12&&r.zusatzOhneFlaeche===2&&r.vollstaendig,"Zusatzpositionen ohne eigene Abwicklung erzeugen keine Fläche (nur gezählt)",r);
r=sb.U([pos("Rinne. Abwicklung mm 500.",{quantity:12})],L);
p(r.flaeche_m2===0&&r.wartetAufAbwicklung===1&&!r.vollstaendig,"nur im Text erkannte (unbestätigte) Abwicklung zählt nicht: wartet auf Bestätigung",r);
r=sb.U([pos("Rinne ohne Angabe",{quantity:12})],L);
p(r.flaeche_m2===0&&r.ohneAbwicklung===1&&!r.vollstaendig,"Meter ohne jede Abwicklung: nicht berechenbar, unvollständig",r);
r=sb.U([pos("a",{quantity:0,unit:"m",abwicklung_mm:500}),pos("b",{quantity:-3,unit:"St"}),pos("c",{quantity:"abc",unit:"m2"}),pos("d",{quantity:NaN,unit:"Stk"}),pos("e",{quantity:null,unit:"m"})],L);
p(r.flaeche_m2===0&&r.stueck===0&&r.ungueltigeMenge===5&&!r.vollstaendig,"leere/ungültige Mengen werden nicht gerechnet, aber gezählt",r);
r=sb.U([pos("Std",{quantity:30,unit:"h"}),pos("Pausch",{quantity:1,unit:"Fr"}),pos("x",{quantity:5,unit:""}),pos("y",{quantity:5,unit:"kg"}),pos("z",{quantity:5,unit:"lfm"})],L);
p(r.flaeche_m2===0&&r.stueck===0&&r.andere.h===1&&r.andere.Fr===1&&r.andere["(leer)"]===1&&r.andere.kg===1&&r.andere.lfm===1,"andere Einheiten (h, Fr, leer, kg, lfm) nicht eingerechnet, nur gezählt",r.andere);
r=sb.U([pos("Rinne",{quantity:10,abwicklung_mm:"abc"}),pos("Rinne",{quantity:10,abwicklung_mm:0}),pos("Rinne",{quantity:10,abwicklung_mm:99999})],L);
p(r.flaeche_m2===0,"ungültige/unplausible Abwicklung wird nicht verwendet",r);
r=sb.U([pos("R1",{quantity:10,abwicklung_mm:500,material_id:1}),pos("R2",{quantity:10,abwicklung_mm:250,material_id:2}),pos("R3",{quantity:4,unit:"St",material_id:1}),pos("R4",{quantity:2,unit:"St"})],L);
p(Math.abs(r.nachMaterial.Kupfer.flaeche_m2-5)<1e-12&&r.nachMaterial.Kupfer.stueck===4&&Math.abs(r.nachMaterial.Titanzink.flaeche_m2-2.5)<1e-12&&r.nachMaterial["ohne Material"].stueck===2,"Aufschlüsselung nach Werkstoff der Firma",r.nachMaterial);
r=sb.U([pos("x",{quantity:3,unit:"m",abwicklung_mm:500,material_id:999})],L);
p(r.nachMaterial["ohne Material"]&&Math.abs(r.nachMaterial["ohne Material"].flaeche_m2-1.5)<1e-12,"fremde/unbekannte material_id wird nicht als Werkstoff gezählt",r.nachMaterial);
p(sb.U([],L).flaeche_m2===0&&sb.U(null,L).stueck===0,"leere/fehlende Positionen: kein Absturz");
// Mehrere Offerten
const o1={title:"Offerte A",positions:[pos("R",{quantity:12,abwicklung_mm:500})]}, o2={title:"Offerte B",positions:[pos("R",{quantity:12,abwicklung_mm:500})]};
let h=sb.H([o1],L);
p(/Offertmengen/.test(h)&&/6[.,]00 m²/.test(h.replace(/[’']/g,""))&&/Offerte A/.test(h)&&!/nicht addiert/.test(h),"eine Offerte: Summe, klar als Offertmengen gekennzeichnet",h.slice(0,200));
h=sb.H([o1,o2],L);
p((h.match(/6[.,]00 m²/g)||[]).length===2&&/nicht addiert/.test(h)&&!/12[.,]00 m²/.test(h),"mehrere Offerten: je Offerte, NICHT addiert (kein 12,00 m²), mit Hinweis",h);
p(/keine Massaufnahme-, Zuschnitt-, Ausmass- oder verrechneten Mengen/.test(h),"Offert-, Produktions- und Ausmassmengen werden nicht vermischt (Hinweis)");
h=sb.H([{title:"U",positions:[pos("R",{quantity:12})]}],L);
p(/unvollständig/.test(h),"unvollständige Offerte wird als unvollständig gekennzeichnet",h);
p(sb.H([],L)===""&&sb.H([{title:"leer",positions:[]}],L)==="","keine Offerte/keine Positionen: nichts anzeigen");
const blockA=q63.slice(q63.indexOf("// ---- Offertmengen (v3.335)"),q63.indexOf("// ---- Ende Offertposition Materialdaten"));
p(!/\bsb\b|\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\bfetch\(/.test(blockA),"Summenanzeige liest/schreibt keine Tabelle (keine Reservierung, Lager, Massaufnahme, Leistung, Ausmass, Zuschnitt)");
p(!/lieferanten|settings\.materials|from\("materials"\)|lager_varianten/.test(blockA),"nur Werkstoffliste der Firma, keine anderen Materiallisten");
p(/projectAngeboteCache|angMengenHtml/.test(fs.readFileSync("js/70-ansicht2.js","utf8"))&&/angMengenHtml\(list/.test(q63),"Anzeige in Projektübersicht (Ansicht2) und Cockpit-Karte, ohne zweite Übersicht");

// ---- Browser ----
const STUB=`window.__log=[];window.__proj=[];
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:"https://t/"+x},error:null})})},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const z={t,eqs:[]};const q={};
  q.insert=d=>{z.op="insert";z.d=d;return q};q.update=d=>{z.op="update";z.d=d;return q};
  q.upsert=d=>{z.op="upsert";z.d=d;return q};q.delete=()=>{z.op="delete";return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  q.eq=(f,v)=>{z.eqs.push([f,v]);return q};
  ["order","limit","not","is","range","ilike","in"].forEach(k=>{q[k]=()=>q});
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  const lauf=()=>{
   if(z.op&&z.op!=="select"){window.__log.push({t,op:z.op,d:z.d,eqs:z.eqs});return {data:[Object.assign({id:(z.eqs.find(e=>e[0]==="id")||[])[1]||1},z.d)],error:null}}
   return {data:[],error:null}};
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g);return q}})};`;
(async()=>{
 const br=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await br.newPage({viewport:{width:1100,height:1400}});
 const jsFehler=[];page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 const dialoge=[];page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto("file://"+path.join(process.cwd(),"index.html"),{waitUntil:"load"});
 await page.waitForTimeout(500);
 // Fixtures: gespeicherte Plaene mit der echten Packrechnung erzeugen
 await page.evaluate(()=>{
  window.mk=(id,titel,gruppen,opt)=>{
   const o=opt||{};
   const rollen=[250,330,670,1000];
   const fm=(o.form==="tafel")?[{breite:1000,laenge:2000,text:"2000 × 1000 mm"}]:rollen.map(b=>({breite:b,laenge:null,text:b+" mm"}));
   const gr=gruppen.map(g=>({breite:g.breite,bleche:g.stuecke.map((l,i)=>({nr:g.nrs?g.nrs[i]:i+1,laenge:l}))}));
   const netto=gr.reduce((s,g)=>s+g.breite*g.bleche.reduce((x,y)=>x+y.laenge,0),0)/1e6;
   const pl=ebaFormatPlan({gruppen:gr,formate:fm,form:o.form||"rolle",netto});
   const roh=JSON.parse(JSON.stringify(Object.assign({},pl,{auswahl:o.auswahl||[],breiten:rollen,form:o.form||"rolle"})));
   roh.gruppen.forEach(g=>{delete g.bleche;(g.streifen||[]).forEach(st=>(st.stuecke||[]).forEach(x=>{if(!x.breite)x.breite=g.breite}))});
   return {id,project_id:7,type:o.type||"kehle",title:titel,workflow_status:"in_bearbeitung",staerke_mm:o.staerke===undefined?0.7:o.staerke,data:{material:o.material||"2",rollen:roh}};
  };
  measurementMaterials=[{id:1,name:"Kupfer"},{id:2,name:"Titanzink"}];
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};meineRechte={admin:true};
  allProjects=[{id:7,name:"P7",archived:false,zuschnitt_ausschluss:[]},{id:8,name:"P8",archived:false}];
  cockpitProjectId=7;
  window.pmAktiv=()=>true;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  window.alleStuecke=sammel=>{const l=[];pzuSammeln(sammel).materialien.forEach(M=>M.gruppen.forEach(g=>g.stuecke.forEach(x=>l.push(x.quelleId+"#"+x.origNr))));return l.sort()};
 });
 const setze=(liste,ausschluss)=>page.evaluate(([l,a])=>{
  projectMeasurementsCache=l;
  allProjects[0].zuschnitt_ausschluss=a||[];
  window.__log=[];
  renderProjektZuschnitt();
 },[liste,ausschluss]);
 const ms=()=>page.evaluate(()=>[
  mk(11,"Süd",[{breite:400,stuecke:[500]}],{type:"kehle"}),
  mk(12,"Nord",[{breite:250,stuecke:[500,500]}],{type:"kamineinfassung"}),
  mk(13,"Ost",[{breite:300,stuecke:[800]}],{material:"1",type:"mauerabdeckung"})]);

 console.log("\nB · Auswahl und Projekt-Rüstblatt");
 const M3=await ms();
 await setze(M3,[]);
 let t=await page.evaluate(()=>$("cockpitZuschnittBody").textContent.replace(/\s+/g," "));
 p(/3 von 3 ausgewählt/.test(t)&&/Alle auswählen/.test(t)&&/Auswahl aufheben/.test(t)&&/Rüstblatt erstellen\/aktualisieren/.test(t),"Auswahlübersicht mit Zähler, Alle auswählen, Auswahl aufheben, Rüstblatt erstellen/aktualisieren",t.slice(0,300));
 p(/Titanzink · 0,7 mm/.test(t)&&/Kupfer · 0,7 mm/.test(t)&&/Süd/.test(t)&&/Nord/.test(t)&&/Ost/.test(t),"je Massaufnahme Art/Titel, Werkstoff und Stärke",t.slice(0,400));
 p(/keine Stücke|zugeschnitten|Stück/.test(t),"Zuschnitt-/Rüststand je Massaufnahme sichtbar");
 await setze(M3,[12]);
 t=await page.evaluate(()=>$("cockpitZuschnittBody").textContent.replace(/\s+/g," "));
 p(/2 von 3 ausgewählt/.test(t),"einzelne abgewählt: 2 von 3",t.slice(0,200));
 await setze(M3,[11,12,13]);
 t=await page.evaluate(()=>$("cockpitZuschnittBody").textContent.replace(/\s+/g," "));
 p(/0 von 3 ausgewählt/.test(t)&&/Noch nichts zuzuschneiden/.test(t),"keine ausgewählt: klare Meldung, kein Plan",t.slice(0,300));
 // Knoepfe
 await setze(M3,[]);
 await page.evaluate(()=>{document.querySelector("[data-pzu-keine]").click()});await page.waitForTimeout(300);
 let log=await page.evaluate(()=>window.__log);
 p(log.length===1&&log[0].t==="projects"&&JSON.stringify(log[0].d.zuschnitt_ausschluss.sort())==="[11,12,13]","Auswahl aufheben: speichert nur die Ausschlussliste des Projekts",log);
 await page.evaluate(()=>{window.__log=[];document.querySelector("[data-pzu-alle]").click()});await page.waitForTimeout(300);
 log=await page.evaluate(()=>window.__log);
 p(log.length===1&&log[0].t==="projects"&&JSON.stringify(log[0].d)==='{"zuschnitt_ausschluss":[]}',"Alle auswählen: Ausschlussliste leer",log);
 // fehlende/geloeschte Ids in der gespeicherten Auswahl
 await setze(M3,[999,12]);
 t=await page.evaluate(()=>$("cockpitZuschnittBody").textContent.replace(/\s+/g," "));
 p(/nicht mehr gibt/.test(t)&&/2 von 3 ausgewählt/.test(t),"gelöschte Id in der gespeicherten Auswahl: ignoriert und gemeldet",t.slice(0,300));
 // Projekt-Rueckblatt oeffnen (frisch lesen: eine Massaufnahme geloescht, eine gehoert zu Projekt 99)
 await setze(M3,[]);
 await page.evaluate(()=>{
  window.__alt=sb.from;
  const frisch=[mk(11,"Süd",[{breite:400,stuecke:[500]}],{type:"kehle"}),Object.assign(mk(13,"Ost",[{breite:300,stuecke:[800]}],{material:"1"}),{project_id:99})];
  sb.from=(t)=>({select:()=>({in:async()=>({data:frisch,error:null})})});
 });
 await page.evaluate(()=>{window.__log=[];document.querySelector("[data-pzu-ruestblatt]").click()});await page.waitForTimeout(500);
 const modal=await page.evaluate(()=>({offen:!$("ruestblattModal").hidden,t:$("ruestblattBody").textContent.replace(/\s+/g," "),einzel:document.querySelectorAll("#ruestblattBody details.rb-einzel").length,formular:$("ruestblattFormular").style.display}));
 p(modal.offen&&/Projekt-Rüstblatt/.test(modal.t)&&/Vorschau/.test(modal.t),"Projekt-Rüstblatt öffnet im bestehenden Rüstblatt-Schirm als Vorschau",modal.t.slice(0,160));
 p(/gibt es nicht mehr/.test(modal.t)&&/gehört nicht zu diesem Projekt/.test(modal.t),"fehlende und fremde Massaufnahme werden ignoriert und verständlich gemeldet",modal.t.slice(0,400));
 p(modal.einzel===1&&modal.formular==="none","nur die gültige Massaufnahme (1) wird gezeigt; 'Im Formular öffnen' ist im Projektmodus aus",modal);
 log=await page.evaluate(()=>window.__log);
 p(log.length===0,"Öffnen schreibt nichts (keine Massaufnahme, kein Plan, keine Buchung)",log);
 // Einzel-Rueckblatt funktioniert weiter
 await page.evaluate(()=>{sb.from=window.__alt;rbZu()});
 const einz=await page.evaluate(()=>{rbExternMerken(mk(11,"Süd",[{breite:400,stuecke:[500]}]));rbGross(11,"");return {offen:!$("ruestblattModal").hidden,f:$("ruestblattFormular").style.display,t:$("ruestblattBody").textContent.replace(/\s+/g," ").slice(0,80)}});
 p(einz.offen&&einz.f===""&&!/Projekt-Rüstblatt/.test(einz.t),"Einzel-Rüstblatt funktioniert weiter (Formular-Knopf wieder da)",einz);
 await page.evaluate(()=>rbZu());
 p(/function rbDruckenAufnahmen/.test(fs.readFileSync("js/80-ruestblatt.js","utf8"))&&/rbDruckenAufnahmen\(eintraege/.test(fs.readFileSync("js/58-ruestliste.js","utf8")),"Rüstliste-/Druckweg (v3.325) unverändert vorhanden");
 // Druck des Projekt-Rueckblatts
 const druck=await page.evaluate(async()=>{
  const l=[mk(11,"Süd",[{breite:400,stuecke:[500]}]),mk(12,"Nord",[{breite:250,stuecke:[500,500]}],{type:"kamineinfassung"})];
  const h=await rbDokumentHtml(l,{gemeinsam:pzuProjektRuestblattHtml(l).html});
  return {seiten:(h.match(/class="rb-druck-seite"/g)||[]).length,gem:/Gemeinsamer Zuschnitt/.test(h),proj:/Projekt-Rüstblatt · 2 Massaufnahmen/.test(h)};
 });
 p(druck.seiten===3&&druck.gem&&druck.proj,"Druck: Seite 1 gemeinsamer Zuschnitt + je Massaufnahme ihr Rüstblatt",druck);

 console.log("\nC · Gemeinsame Rollenoptimierung");
 const k1=await page.evaluate(()=>{
  const l=[mk(21,"Süd",[{breite:400,stuecke:[500]}]),mk(22,"Nord",[{breite:250,stuecke:[500]}])];
  const S=pzuSammeln(l);
  const M=S.materialien[0];
  const pl=pzuRollenPlan(M);
  const getrennt=pzuGetrenntFlaeche(M);
  const roh=JSON.stringify(l);
  const html=pzuProjektRuestblattHtml(l).html;
  return {gruppen:S.materialien.length,joint:pl.bestes.flaeche,getrennt,stuecke:alleStuecke(l),unveraendert:JSON.stringify(l)===roh,
   herkunft:/Süd/.test(html)&&/Nord/.test(html),vergleich:/weniger/.test(html.replace(/\s+/g," "))};
 });
 p(k1.gruppen===1,"zwei kompatible Massaufnahmen bilden EINE Gruppe",k1);
 p(k1.joint<k1.getrennt-1e-9,"gemeinsam weniger Blech als einzeln ("+k1.joint.toFixed(3)+" gegen "+k1.getrennt.toFixed(3)+" m²)",k1);
 p(JSON.stringify(k1.stuecke)==='["21#1","22#1"]',"kein Stück verloren oder verdoppelt; stabile Referenz (Massaufnahme-Id#Stück)",k1.stuecke);
 p(k1.herkunft&&k1.vergleich,"Herkunft je Stück sichtbar, Vergleich einzeln/gemeinsam angezeigt");
 const gleich=await page.evaluate(()=>{
  const l=[mk(31,"A",[{breite:250,stuecke:[500,500]}]),mk(32,"B",[{breite:250,stuecke:[700]}]),mk(33,"C",[{breite:330,stuecke:[600,600,600]}])];
  const M=pzuSammeln(l).materialien[0];
  return {joint:pzuRollenPlan(M).bestes.flaeche,getrennt:pzuGetrenntFlaeche(M),n:alleStuecke(l).length};
 });
 p(gleich.joint<=gleich.getrennt+1e-9&&gleich.n===6,"mindestens so wenig Blech wie einzeln, alle 6 Stücke genau einmal",gleich);
 const get=await page.evaluate(()=>{
  const n=(l)=>pzuSammeln(l).materialien.map(M=>M.material+"|"+M.quellen.map(x=>x.id).join(","));
  return {material:n([mk(41,"A",[{breite:250,stuecke:[500]}],{material:"1"}),mk(42,"B",[{breite:250,stuecke:[500]}],{material:"2"})]),
   staerke:n([mk(43,"A",[{breite:250,stuecke:[500]}],{staerke:0.7}),mk(44,"B",[{breite:250,stuecke:[500]}],{staerke:0.8})]),
   staerkeOhne:n([mk(45,"A",[{breite:250,stuecke:[500]}],{staerke:null}),mk(46,"B",[{breite:250,stuecke:[500]}],{staerke:0.7})]),
   wahl:n([mk(47,"A",[{breite:250,stuecke:[500]}],{auswahl:[670]}),mk(48,"B",[{breite:250,stuecke:[500]}],{auswahl:[1000]})]),
   gleichwahl:n([mk(49,"A",[{breite:250,stuecke:[500]}],{auswahl:[1000,670]}),mk(50,"B",[{breite:250,stuecke:[500]}],{auswahl:[670,1000]})]),
   form:n([mk(51,"A",[{breite:250,stuecke:[500]}],{form:"tafel"}),mk(52,"B",[{breite:250,stuecke:[500]}])]),
   gleich:n([mk(53,"A",[{breite:250,stuecke:[500]}]),mk(54,"B",[{breite:250,stuecke:[500]}])])};
 });
 p(get.material.length===2,"verschiedene Werkstoffe: getrennte Gruppen",get.material);
 p(get.staerke.length===2,"verschiedene Stärken: getrennte Gruppen",get.staerke);
 p(get.staerkeOhne.length===2,"Stärke erfasst/nicht erfasst: getrennt (nichts geraten)",get.staerkeOhne);
 p(get.wahl.length===2,"verschiedene Rollenwahl (andere erlaubte Rollenbreiten): getrennte Gruppen",get.wahl);
 p(get.gleichwahl.length===1,"gleiche Rollenwahl in anderer Reihenfolge: eine Gruppe",get.gleichwahl);
 p(get.form.length===2,"Tafel und Rolle werden nicht gemischt",get.form);
 p(get.gleich.length===1,"Gegenprobe: gleiche Eigenschaften -> eine Gruppe",get.gleich);
 const stg=await page.evaluate(()=>{
  const st={id:61,project_id:7,type:"rinne_halbrund",title:"Stange",workflow_status:"in_bearbeitung",staerke_mm:0.7,data:{material:"2",rollen:{art:"stange",breite:250,stangen:[{laenge:6000,stuecke:[{nr:1,laenge:3000,breite:250}],rest:3000}],gesamt:6000,summeStuecke:3000}}};
  const l=[mk(62,"Rolle",[{breite:250,stuecke:[500]}]),st];
  const S=pzuSammeln(l);
  return {gruppen:S.materialien.length,quellen:S.materialien[0].quellen.map(x=>x.id),ohne:S.ohne.map(o=>o.id+":"+o.grund),stueck:alleStuecke(l)};
 });
 p(stg.gruppen===1&&JSON.stringify(stg.quellen)==="[62]"&&stg.ohne.length===1&&/Normlängen/.test(stg.ohne[0]),"Stangen/Normlängen nie im Rollenplan; sichtbar separat gelistet",stg);
 const leer=await page.evaluate(()=>{
  const l=[{id:71,project_id:7,type:"kehle",title:"leer",data:{rollen:{gruppen:[],moeglich:[]}}},{id:72,project_id:7,type:"kehle",title:"keinplan",data:{}},mk(73,"gut",[{breite:250,stuecke:[500]}]),{id:74,project_id:7,type:"kehle",title:"ohneBreite",data:{rollen:{gruppen:[{streifen:[{stuecke:[{nr:1,laenge:500}]}]}],moeglich:[]}}}];
  const S=pzuSammeln(l);
  return {gruppen:S.materialien.length,quellen:S.materialien[0].quellen.map(x=>x.id),ohne:S.ohne.map(o=>o.id+":"+o.grund)};
 });
 p(leer.gruppen===1&&JSON.stringify(leer.quellen)==="[73]"&&leer.ohne.some(x=>/^71:/.test(x))&&leer.ohne.some(x=>/^74:.*Streifenbreite/.test(x)),"leere/fehlerhafte Pläne werden gelistet statt still ausgelassen; kaputte Daten brechen nichts ab",leer);
 const eff=await page.evaluate(async()=>{
  const l=[mk(81,"A",[{breite:400,stuecke:[500]}]),mk(82,"B",[{breite:250,stuecke:[500]}])];
  const vorher=JSON.stringify(l);
  window.__log=[];
  pzuProjektRuestblattHtml(l);
  projectMeasurementsCache=l;renderProjektZuschnitt();
  await rbDokumentHtml(l,{gemeinsam:pzuProjektRuestblattHtml(l).html});
  return {unveraendert:JSON.stringify(l)===vorher,log:window.__log.slice()};
 });
 p(eff.unveraendert&&eff.log.length===0,"Vorschau verändert keine gespeicherten Pläne und schreibt nichts (keine Reservierung, Buchung, Lagerbewegung, Erledigt-Haken)",eff.log);

 console.log("\nD · Quelltext, Sicherheit");
 const q49=fs.readFileSync("js/49-projekt-zuschnitt.js","utf8");
 const blockC=q49.slice(q49.indexOf("// ---- Projekt-Rüstblatt: gemeinsamer Rollenzuschnitt"),q49.indexOf("function renderProjektZuschnitt()"));
 p(!/\bsb\b|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\bfetch\(/.test(blockC),"gemeinsame Vorschau (js/49) liest und schreibt keine Tabelle");
 p(!/lieferanten|settings\.materials|from\("materials"\)|lager_varianten|material_reservierungen|leistungen/.test(q49.slice(q49.indexOf("function pzuStaerkeText"),q49.indexOf("function pzuNetto"))+blockC),"keine Vermischung mit materials/lieferanten_artikel/Reservierung/Leistungen");
 p(/ebaFormatPlan/.test(q49)&&!/function ebaPackeInStreifen/.test(q49),"gepackt wird mit der bestehenden Packrechnung (ebaFormatPlan), keine zweite");
 p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
 await br.close();
 console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

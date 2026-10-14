// v3.369: Massaufnahme-Art "Dachrandblech" (js/89) - eine Variante des Freien Profils (js/14, js/31).
// Detail 1.5 / eigenes Detail, Grundriss, Länge pro Stück + Überlappung -> Stücke, Einhängestreifen-Vorschlag,
// Speichern, Laden, Druck, Zuschnitt/Ausmass, Gegenprobe: Freies Profil bleibt unverändert.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const ROUTE=(fs.readFileSync("pruefstaende/pruefstand-freies-profil-app-v2-77.js","utf8").split("\n")[50]||"");
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));page.on("dialog",d=>d.accept());
 await stubSchuetzen(page);
 await page.addInitScript(()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:()=>{const q={};['select','eq','order','limit','in','is'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
   storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}});
 await page.goto(APP,{waitUntil:"load"});await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];meineRechte={admin:true};allProjects=[];
  measurementMaterials=[{id:3,name:"Kupfer"},{id:2,name:"Titanzink"}];blechRollenbreiten=[];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
  $("measurementEditModal").hidden=false;
  if(typeof fpaZuruecksetzen==="function")fpaZuruecksetzen();
  $("measType").value="dachrandblech";showMeasTypeSection("dachrandblech");
 });
 await page.waitForTimeout(200);
 const reg=async n=>{await page.evaluate(k=>fpaSetzeSchritt(k),n);await page.waitForTimeout(120)};
 const feld=async(sel,wert,ereignis)=>{await page.evaluate(([s,w,ev])=>{const e=document.querySelector(s);e.value=w;e.dispatchEvent(new Event(ev||"input",{bubbles:true}))},[sel,String(wert),ereignis]);await page.waitForTimeout(40)};
 const klick=async sel=>{const r=await page.evaluate(s=>{const e=document.querySelector(s);if(!e)return "fehlt";e.click();return "ok"},sel);await page.waitForTimeout(150);return r};

 console.log("\nA · Art, Register, Detail 1.5");
 const a=await page.evaluate(()=>({
  label:MEAS_TYPE_LABELS.dachrandblech,kat:measKategorie("dachrandblech"),opt:!![...$("measType").options].find(o=>o.value==="dachrandblech"),
  karte:!!document.querySelector('[data-choose-meas-type="dachrandblech"]')||(renderMeasTypeChooser(),!!document.querySelector('[data-choose-meas-type="dachrandblech"]')),
  variante:fpA.variante,reg:fpaRegister().map(r=>r.kurz),sch:fpA.schenkel.map(s=>[s.laenge,s.winkel]),detail:fpA.dachrand.detail,
  wurzel:!$("measTypeFreiesProfil").hidden,ansicht:fpA.ansicht}));
 p(a.label==="Dachrandblech"&&a.kat==="flachdach"&&a.opt&&a.karte,"Art „Dachrandblech“ in Auswahl, Kartenliste (Flachdach)",a);
 p(a.variante==="dachrand"&&a.reg.join()==="Grunddaten,Detail,Profil,Grundriss,Stücke,Einhängestreifen,Zuschnitt,Ausmass,Kontrolle"&&a.wurzel,"eigene Register, gleiche Aufnahme-Fläche wie das Freie Profil",a);
 p(JSON.stringify(a.sch)==="[[12,-45],[18,-180],[160,135],[50,-180],[30,-45],[150,-45],[12,180]]"&&a.detail==="1.5","Detail 1.5 vorgeladen mit den Massen der Vorlage (12/18/160/50/30/150/12, Winkel −45/−180/135/−180/−45/−45/180)",a.sch);
 await reg(2);
 const d2=await page.evaluate(()=>({svg:/<svg/.test(document.getElementById("drb_detailBild").innerHTML),knoepfe:[...document.querySelectorAll("[data-drb-detail]")].map(x=>x.dataset.drbDetail)}));
 p(d2.svg&&d2.knoepfe.join()==="1.5,eigen","Register „Detail“: Detail 1.5 und „Anderes Detail“ mit Zeichnung",d2);
 await reg(3);
 const pr=await page.evaluate(()=>({karten:document.querySelectorAll("[data-fpa-zeile]").length,l:document.querySelector('[data-fpa-laenge="2"]').value,w:document.querySelector('[data-fpa-winkel="2"]').value}));
 p(pr.karten===7&&pr.l==="160"&&pr.w==="135","Register „Profil“: alle 7 Schenkel einzeln editierbar (Länge und Winkel)",pr);
 await feld('[data-fpa-laenge="2"]',170);
 const ang=await page.evaluate(()=>({l:fpA.schenkel[2].laenge,abw:fpaAbwicklungSegment({massen:fpA.schenkel.map(s=>({mass:s.laenge}))}).links}));
 p(ang.l===170&&ang.abw===442,"Mass anpassen: Schenkel 3 auf 170 mm → Abwicklung 442 mm",ang);

 console.log("\nB · Grundriss");
 await reg(4);
 await klick("#drb_kantePlus");
 for(let i=0;i<4;i++){if(i)await klick("#drb_kantePlus");}
 const laengen=[8000,5000,8000,5000];
 for(let i=0;i<4;i++)await feld('[data-drb-laenge="'+i+'"]',laengen[i]);
 const g=await page.evaluate(()=>{const e=drbErgebnis().grundriss;return {ges:e.gesamtlaenge,au:e.aussenecken,inn:e.inneneck,sum:e.winkelSumme,gesch:fpA.dachrand.geschlossen,kanten:fpA.dachrand.kanten.length,svg:/<svg/.test($("drb_grundrissBild").innerHTML)}});
 p(g.kanten===4&&g.ges===26000&&g.svg,"4 Kanten (8000/5000/8000/5000): Gesamtlänge 26 000 mm, Zeichnung",g);
 await page.evaluate(()=>{const e=document.getElementById("drb_geschlossen");e.checked=true;e.dispatchEvent(new Event("change",{bubbles:true}))});
 await page.waitForTimeout(150);
 const g2=await page.evaluate(()=>{const e=drbErgebnis().grundriss;return {au:e.aussenecken,inn:e.inneneck,schliesst:e.schliesst,luecke:e.luecke,sum:e.winkelSumme}});
 p(g2.au===4&&g2.inn===0&&g2.schliesst&&g2.luecke===0&&g2.sum===360,"Umlaufend mit 4 Aussenecken: 4 Ecken, 360°, schliesst (Lücke 0)",g2);
 await page.evaluate(()=>{const e=document.querySelector('[data-drb-laenge="3"]');e.value="4800";e.dispatchEvent(new Event("input",{bubbles:true}))});
 const g3=await page.evaluate(()=>({schliesst:drbErgebnis().grundriss.schliesst,luecke:drbErgebnis().grundriss.luecke,warn:/schliesst nicht/.test($("drb_grundrissSumme").textContent),pr:drbPruefungen().some(x=>/schliesst nicht/.test(x.text))}));
 p(!g3.schliesst&&g3.luecke===200&&g3.warn&&g3.pr,"Kante 4 mit 4800: Grundriss schliesst nicht – Lücke 200 mm angezeigt und in der Kontrolle",g3);
 await page.evaluate(()=>{const e=document.querySelector('[data-drb-laenge="3"]');e.value="5000";e.dispatchEvent(new Event("input",{bubbles:true}))});
 // Inneneck / L-Form
 const l=await page.evaluate(()=>{
  const k=[{laenge:10000,ecke:"aussen"},{laenge:4000,ecke:"aussen"},{laenge:6000,ecke:"innen"},{laenge:3000,ecke:"aussen"},{laenge:4000,ecke:"aussen"},{laenge:7000,ecke:"ende"}];
  const e=drbGrundriss(k,false);return {au:e.aussenecken,inn:e.inneneck,ges:e.gesamtlaenge,hs:e.punkte.length};
 });
 p(l.au===4&&l.inn===1&&l.ges===34000&&l.hs===7,"L-förmiger Grundriss: Aussen-/Inneneckenzahl und Länge richtig",l);
 const lo=await page.evaluate(()=>{const e=drbGrundriss([{laenge:3000,ecke:"winkel",winkel:45},{laenge:3000,ecke:"ende"}],false);return {x:Math.round(e.punkte[2].x),y:Math.round(e.punkte[2].y),and:e.andere}});
 p(lo.and===1&&lo.x===5121&&lo.y===2121,"Eckwinkel beliebig (45° nach rechts): Punkt stimmt",lo);

 console.log("\nC · Stücke: Länge pro Stück und Überlappung");
 const sr=await page.evaluate(()=>({
  a:drbStueckeBerechnen([{laenge:8000}],3000,40,false),b:drbStueckeBerechnen([{laenge:2500}],3000,40,false),
  c:drbStueckeBerechnen([{laenge:3000}],3000,40,false),d:drbStueckeBerechnen([{laenge:8000}],3000,40,true),
  e:drbStueckeBerechnen([{laenge:8000}],3000,3000,false),f:drbStueckeBerechnen([{laenge:8000}],0,40,false),g:drbStueckeBerechnen([{laenge:8000}],3000,-5,false),
  h:drbStueckeBerechnen([{laenge:3040}],3000,40,false),i:drbStueckeBerechnen([{laenge:8000},{laenge:5000}],3000,40,false)}));
 const L=x=>x.stuecke.map(s=>s.laenge);
 p(JSON.stringify(L(sr.a))==="[3000,3000,2080]"&&sr.a.materialLaenge===8080,"8000 mm, 3000 pro Stück, 40 Überlappung: 3000 + 3000 + 2080 (Material 8080)",sr.a);
 p(JSON.stringify(L(sr.b))==="[2500]"&&JSON.stringify(L(sr.c))==="[3000]","Kante kürzer/gleich Stück: ein Stück, keine Überlappung",[sr.b,sr.c]);
 p(JSON.stringify(L(sr.d))==="[2693,2693,2694]"&&sr.d.materialLaenge===8080,"alle gleich lang: 2693 + 2693 + 2694 (Material 8080)",sr.d);
 p(JSON.stringify(L(sr.h))==="[3000,40]"||JSON.stringify(L(sr.h))==="[3000,80]","3040 mm: Rest nie kleiner als die Überlappung",L(sr.h));
 p(!sr.e.ok&&/kleiner/.test(sr.e.fehler)&&!sr.f.ok&&!sr.g.ok,"Überlappung ≥ Stücklänge, Länge 0, negative Überlappung: Fehlermeldung statt Rechnung",[sr.e.fehler,sr.f.fehler,sr.g.fehler]);
 p(sr.i.stuecke.length===5&&JSON.stringify(sr.i.stuecke.map(s=>s.kante))==="[0,0,0,1,1]","jede Kante wird für sich eingeteilt",sr.i.stuecke.map(s=>[s.kante,s.laenge]));
 await reg(5);
 const ui=await page.evaluate(()=>({tab:/Stücke/.test($("drb_stueckeTabelle").textContent),n:fpA.segmente.length,p:document.querySelector("[data-drb-p]").value,u:document.querySelector("[data-drb-u]").value}));
 p(ui.p==="3000"&&ui.u==="40"&&ui.n>0&&ui.tab,"Register „Stücke“: Länge pro Stück 3000, Überlappung 40 (Vorgabe), Stückliste",ui);
 await feld("[data-drb-p]",2500);await feld("[data-drb-u]",50);
 const ui2=await page.evaluate(()=>({seg:fpA.segmente.map(s=>s.laenge),mat:drbStueckeBerechnen(fpA.dachrand.kanten,2500,50,false).materialLaenge}));
 p(ui2.seg.length>0&&ui2.seg.every(x=>x<=2500)&&ui2.seg.reduce((s,x)=>s+x,0)===ui2.mat,"Eingabe ändert die Stücke sofort (2500/50): Segmente = Stücke, Summe = Materiallänge",ui2);
 await feld("[data-drb-p]",3000);await feld("[data-drb-u]",40);

 console.log("\nD · Einhängestreifen");
 const s0=await page.evaluate(()=>drbStreifenBerechnen(fpA.dachrand.streifen,fpA.schenkel,fpA.dachrand.kanten,fpA.dachrand.stueck.laenge));
 p(s0.ok&&s0.umschlag===1&&s0.umLaenge===18&&s0.haken===15&&s0.vorschlag===70&&s0.abwicklung===70,"Vorschlag aus Umschlag 2 (18 mm): Haken 15, Abwicklung 40 + 2×15 = 70 mm",s0);
 p(s0.gesamtlaenge===26000&&s0.stueckLaenge===3000&&s0.anzahl===10&&JSON.stringify(s0.gruppen)==='[{"laenge":3000,"anzahl":6},{"laenge":2000,"anzahl":4}]',"Gesamtlänge 26 m; Länge pro Stück 3000 mm; 10 Stück (je Kante 3000 + 3000 + 2000 bzw. 3000 + 2000)",[s0.gesamtlaenge,s0.stueckLaenge,s0.anzahl,s0.gruppen]);
 await reg(6);
 await feld('[data-drb-s="abwicklung"]',80);
 const s1=await page.evaluate(()=>({abw:drbStreifenBerechnen(fpA.dachrand.streifen,fpA.schenkel,fpA.dachrand.kanten,fpA.dachrand.stueck.laenge).abwicklung,txt:$("drb_streifenErgebnis").textContent}));
 p(s1.abw===80&&/von Hand/.test(s1.txt),"Abwicklung von Hand überschrieben (80 mm), als solche gekennzeichnet",s1);
 await feld('[data-drb-s="abwicklung"]',"");
 await feld('[data-drb-s="laenge"]',2000);
 const s2=await page.evaluate(()=>{const e=drbStreifenBerechnen(fpA.dachrand.streifen,fpA.schenkel,fpA.dachrand.kanten,fpA.dachrand.stueck.laenge);return {len:e.stueckLaenge,n:e.anzahl,g:e.gruppen}});
 p(s2.len===2000&&s2.n===14,"Länge pro Stück Streifen 2000 mm: 14 Stück (4+3+4+3), Gesamtlänge bleibt 26 m",s2);
 await feld('[data-drb-s="laenge"]',"");
 const s3=await page.evaluate(()=>{const s=fpA.schenkel.map(x=>({...x}));fpA.schenkel=s.filter((x,i)=>!(i===1||i===3||i===6));const r=drbStreifenBerechnen(fpA.dachrand.streifen,fpA.schenkel,fpA.dachrand.kanten,3000);fpA.schenkel=s;return r});
 p(!s3.ok&&/keinen Umschlag/.test(s3.grund),"Profil ohne Umschlag: keine Erfindung, sondern Hinweis",s3);
 await page.evaluate(()=>{fpA.dachrand.streifen.aktiv=false});
 const s4=await page.evaluate(()=>drbStreifenBerechnen(fpA.dachrand.streifen,fpA.schenkel,fpA.dachrand.kanten,3000));
 p(s4.aus===true&&!s4.ok,"Einhängestreifen abgeschaltet: kein Vorschlag",s4);
 await page.evaluate(()=>{fpA.dachrand.streifen.aktiv=true;renderFreiesProfilAufnahme()});

 console.log("\nE · Zuschnitt, Ausmass, Kontrolle");
 await reg(7);
 const zu=await page.evaluate(()=>{const pl=fpaRollenPlan();return {gruppen:pl.gruppen.length,breite:pl.gruppen[0]&&pl.gruppen[0].breite,txt:/Zuschnitt aus/.test(document.getElementById("fpa_kopf").textContent)}});
 p(zu.gruppen===1&&zu.breite===442&&zu.txt,"Zuschnitt aus Rollenblech über die bestehende Packrechnung: eine Streifenbreite 442 mm",zu);
 await reg(8);
 const am=await page.evaluate(()=>fpaAusmassZeilen().map(z=>z.bezeichnung+"="+z.menge+" "+z.einheit));
 const txt=am.join(" | ");
 p(/Dachrandblech/.test(am[0])&&/26,00 m/.test(am[0]),"Ausmass: Dachrandblech, Gesamtlänge 26,00 m",am[0]);
 p(/Aussenecken=4/.test(txt)&&/Stücke=/.test(txt)&&/Materiallänge inkl\. Überlappung/.test(txt)&&/Blechfläche/.test(txt)&&/Einhängestreifen, Gesamtlänge=26,00 m/.test(txt)&&/Einhängestreifen, Abwicklung=70 mm/.test(txt),"Ausmass: Ecken, Stücke, Materiallänge, Blechfläche, Einhängestreifen",txt);
 await reg(9);
 const ko=await page.evaluate(()=>({n:fpaPruefungen().length,fehler:fpaPruefungen().filter(x=>x.art==="fehler").length,tab:/Stücke/.test($("fpa_kopf").textContent)}));
 p(ko.fehler===0&&ko.tab,"Kontrolle: keine Fehler, zeigt Stücke statt Segmente",ko);

 console.log("\nF · Speichern, Laden, Druck");
 const pay=await page.evaluate(()=>{
  $("measType").value="dachrandblech";
  $("measTitle").value="Dachrand Nord";$("measNote").value="";$("measDate").value="2026-10-14";measSelectedProjectId=7;
  fpA.material="3";
  return buildMeasurementFromForm();
 });
 const dd=pay.data||{};
 p(pay.type==="dachrandblech"&&dd.schenkel.length===7&&dd.segmente.length>=9&&dd.dachrand&&dd.dachrand.kanten.length===4,"Payload: Typ, Profil (7 Schenkel), Segmente = Stücke, Dachrand-Block mit Kanten",{t:pay.type,s:(dd.schenkel||[]).length,seg:(dd.segmente||[]).length});
 p(dd.dachrand.ergebnis.gesamtlaenge===26000&&dd.dachrand.ergebnis.stuecke.length===dd.segmente.length&&dd.dachrand.ergebnis.streifen&&dd.dachrand.ergebnis.streifen.abwicklung===70,"Ergebnisse mitgespeichert (Gesamtlänge, Stücke, Streifen)",dd.dachrand&&dd.dachrand.ergebnis&&{g:dd.dachrand.ergebnis.gesamtlaenge,s:dd.dachrand.ergebnis.streifen});
 p(Array.isArray(dd.ausmass)&&dd.ausmass.length>5&&dd.flaeche_m2>0&&dd.zuschnitt&&dd.zuschnitt.gruppen.length===1,"Ausmass, Fläche und Zuschnitt im Payload",{a:(dd.ausmass||[]).length,f:dd.flaeche_m2});
 const geladen=await page.evaluate(pl=>{
  const m={id:5,type:"dachrandblech",title:"Dachrand Nord",project_id:7,date:"2026-10-14",note:"",data:JSON.parse(JSON.stringify(pl.data))};
  fpaZuruecksetzen();
  fpaFuellen(m.data);
  $("measType").value="dachrandblech";showMeasTypeSection("dachrandblech");
  return {v:fpA.variante,det:fpA.dachrand.detail,k:fpA.dachrand.kanten.map(x=>x.laenge),g:fpA.dachrand.geschlossen,seg:fpA.segmente.length,sch:fpA.schenkel.length,p:fpA.dachrand.stueck.laenge,u:fpA.dachrand.stueck.ueberlappung};
 },pay);
 p(geladen.v==="dachrand"&&geladen.det==="1.5"&&geladen.k.join()==="8000,5000,8000,5000"&&geladen.g&&geladen.seg===dd.segmente.length&&geladen.sch===7&&geladen.p===3000&&geladen.u===40,"Laden: Variante, Detail, Kanten, umlaufend, Stücke, Länge/Überlappung kommen zurück",geladen);
 const druck=await page.evaluate(async pl=>{
  window.__pdf=[];window.open=()=>({document:{write(h){window.__pdf.push(h)},close(){}},focus(){},print(){},set onload(f){}});
  storageSignedUrl=async()=>null;companyName="Peter Künzi AG";companyAddress="";logoUrl=null;
  await printMeasurement({...pl,id:1,title:"Dachrand Nord",date:"2026-10-14",note:""},{listen:"alle"});
  return window.__pdf[0]||"";
 },pay);
 p(/>Profil</.test(druck)&&/>Grundriss</.test(druck)&&/>Stücke</.test(druck)&&/Einhängestreifen \(Vorschlag\)/.test(druck)&&/>Ausmass</.test(druck)&&/Zuschnitt aus Rollenblech/.test(druck),"Druck: Profil, Grundriss, Stücke, Einhängestreifen, Ausmass, Zuschnitt",{profil:/>Profil</.test(druck),gr:/>Grundriss</.test(druck),st:/>Stücke</.test(druck),es:/Einhängestreifen \(Vorschlag\)/.test(druck)});
 p(!/\bNaN\b|\bInfinity\b/.test(druck)&&!/Segment 1/.test(druck),"Druck ohne NaN und ohne die lange Segment-Masseliste",{nan:/\bNaN\b/.test(druck)});
 const druckFp=await page.evaluate(async()=>{
  window.__pdf=[];
  await printMeasurement({id:2,type:"freies_profil",title:"Alt",date:"2026-08-28",note:"",data:{schenkel:[{laenge:15,winkel:0},{laenge:100,winkel:90}],konisch:false,segmente:[{laenge:1000,massen:[{mass:15},{mass:100}]}],ansicht:"oben",material:"3"}},{listen:"alle"});
  return window.__pdf[0]||"";
 });
 p(/Segment 1/.test(druckFp)&&!/>Grundriss</.test(druckFp)&&/Konisch/.test(druckFp),"Gegenprobe: das Freie Profil druckt unverändert (Segmente, kein Grundriss)",{});
 const ruest=await page.evaluate(pl=>{try{return {profil:!!rsSvg({type:"dachrandblech",data:pl.data},"Profil"),grundriss:!!rsSvg({type:"dachrandblech",data:pl.data},"Grundriss")}}catch(e){return {fehler:String(e)}}},pay);
 p(ruest.profil&&ruest.grundriss,"Rüstskizzen: Profil und Grundriss stehen zur Verfügung",ruest);

 console.log("\nG · Freies Profil bleibt unverändert (Gegenprobe)");
 const fp=await page.evaluate(()=>{
  fpaZuruecksetzen();$("measType").value="freies_profil";showMeasTypeSection("freies_profil");
  return {v:fpA.variante,reg:fpaRegister().map(r=>r.kurz),sch:fpA.schenkel.length,konisch:/Konisch/.test($("fpa_kopf").textContent)};
 });
 p(fp.v===""&&fp.reg.join()==="Grunddaten,Skizze → Profil,Profil,Zeichnung,Segmente,Zuschnitt,Ausmass,Kontrolle"&&fp.sch===0&&fp.konisch,"Freies Profil: eigene Register, kein Detail vorgeladen, Feld „Konisch“ vorhanden",fp);
 const fp2=await page.evaluate(()=>{fpA.schenkel=[{laenge:50,winkel:0},{laenge:100,winkel:90}];fpA.segmente=[{laenge:1000,massen:[{mass:50},{mass:100}]}];fpaBruecke();return fpaAusmassZeilen().map(z=>z.bezeichnung)[0]});
 p(/^Freies Profil/.test(fp2||""),"Freies Profil: Ausmass nennt weiter „Freies Profil“",fp2);
 const wechsel=await page.evaluate(()=>{
  fpaZuruecksetzen();$("measType").value="dachrandblech";showMeasTypeSection("dachrandblech");
  const a=fpA.variante;$("measType").value="freies_profil";showMeasTypeSection("freies_profil");const b=fpA.variante;
  $("measType").value="dachrandblech";showMeasTypeSection("dachrandblech");return [a,b,fpA.variante]});
 p(wechsel.join()==="dachrand,,dachrand","Umschalten Dachrandblech ↔ Freies Profil setzt die Variante jedes Mal richtig",wechsel);

 console.log("\nH · Anderes Detail");
 const an=await page.evaluate(()=>{
  fpaZuruecksetzen();$("measType").value="dachrandblech";showMeasTypeSection("dachrandblech");
  fpaSetzeSchritt(2);
  const knopf=document.querySelector('[data-drb-detail="eigen"]');knopf.click();
  return {detail:fpA.dachrand.detail,schenkel:fpA.schenkel.length};
 });
 p(an.detail==="eigen"&&an.schenkel===0,"„Anderes Detail“ bei unverändertem Detail 1.5: leeres Profil zum Neuerfassen",an);
 await page.waitForTimeout(150);
 const an2=await page.evaluate(()=>({detail:fpA.dachrand.detail,skizze:!$("fpaSkizzeBox").hidden,schritt:fpaSchritt}));
 p(an2.detail==="eigen"&&an2.skizze&&an2.schritt===2,"„Anderes Detail“: Skizzen-Erkennung wird im Register Detail angeboten",an2);
 await reg(3);
 await page.evaluate(()=>{fpaNeuerSchenkel();fpaNeuerSchenkel()});
 await feld('[data-fpa-laenge="0"]',20);await feld('[data-fpa-winkel="0"]',0);await feld('[data-fpa-laenge="1"]',30);await feld('[data-fpa-winkel="1"]',90);
 const eg=await page.evaluate(()=>({n:fpA.schenkel.length,svg:/<path|<polyline/.test(fpaProfilSvg(fpA.schenkel))}));
 p(eg.n===2&&eg.svg,"Eigenes Profil lässt sich wie beim Freien Profil Schenkel für Schenkel erfassen",eg);
 const ersetze=await page.evaluate(async()=>{
  window.appConfirm=async()=>true;
  fpaSetzeSchritt(2);document.querySelector('[data-drb-detail="1.5"]').click();
  await new Promise(r=>setTimeout(r,200));
  return {detail:fpA.dachrand.detail,n:fpA.schenkel.length,ist:drbIstDetail15(fpA.schenkel)};
 });
 p(ersetze.detail==="1.5"&&ersetze.n===7&&ersetze.ist,"Zurück zu Detail 1.5 (mit Rückfrage bei geändertem Profil): Vorlage wieder geladen",ersetze);

 console.log("\nI · Einbindung");
 const idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 p(/js\/89-dachrandblech\.js/.test(idx)&&/js\/89-dachrandblech\.js/.test(sw),"js/89 in index.html UND sw.js");
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

// Prueft v3.333: Offertpositionen mit optionalen Materialdaten (material_id, staerke_mm, abwicklung_mm) und
// bestaetigungspflichtigen Textvorschlaegen. Teil 1: reine Funktionen (vm). Teil 2: Editor im Browser mit Schreibspur.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-offert-material-v3-333.js
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const q=fs.readFileSync(path.join(process.cwd(),"js/63-angebote.js"),"utf8");
const a=q.indexOf("const ANG_MAT_STAERKE_MIN"), b=q.indexOf("// ---- Ende Offertposition Materialdaten");
p(a>0&&b>a,"die reinen Funktionen stehen in js/63",[a,b]);
const sb={};vm.runInNewContext(q.slice(a,b)+";this.Z=angMatZahl;this.E=angMatErkennen;this.V=angMatVorschlag;this.F=angBlechflaeche;this.B=angMatBereinigen;this.G=angMatGruppen;this.AV=angMatAbwicklungVonPosition",sb);
const L=[{id:1,name:"Kupfer"},{id:2,name:"Titanzink"},{id:3,name:"Stahl"},{id:4,name:"Blei"},{id:5,name:"CrNi-Stahl"},{id:6,name:"Aluminium (Aluman)"}];
const V=(t,pos)=>sb.V(Object.assign({description:t},pos||{}),L);

console.log("\nA · Zahlen und Grenzen");
const Z=(v,mi,ma)=>sb.Z(v,mi,ma);
p(Z("0,6",0.05,10)===0.6&&Z("0.6",0.05,10)===0.6,"Dezimalkomma und -punkt");
p(Z("1'000",5,3000)===1000&&Z("1’000",5,3000)===1000,"Tausender-Apostroph");
p(Z("",5,3000)===null&&Z(null,5,3000)===null&&Z(undefined,5,3000)===null,"leer/null/undefined -> keine Zahl");
p(Z("0",5,3000)===null&&Z(0,5,3000)===null,"0 ungültig");
p(Z("-3",5,3000)===null&&Z(-3,5,3000)===null,"negativ ungültig");
p(Z("abc",5,3000)===null&&Z("12abc",5,3000)===null&&Z(NaN,5,3000)===null&&Z(Infinity,5,3000)===null,"nicht numerisch/NaN/Infinity ungültig");
p(Z("99999",5,3000)===null&&Z(1e9,0.05,10)===null,"sehr gross/unplausibel ungültig");
p(Z("1.000",5,3000)===null,"\"1.000\" gilt als 1,0 und fällt bei der Abwicklung durch (nicht still 1000)");
p(Z(true,5,3000)===null,"Wahrheitswert ungültig");

console.log("\nB · Textvorschlag aus echten Formaten der Offerten");
let v=V("Dachrinnen neu. Kupferblech. Blank, Dicke mm 0,60. Einlegerinnen. Abwicklung mm 1'000.");
p(v.vorschlag.material&&v.vorschlag.material.id===1&&v.vorschlag.staerke_mm===0.6&&v.vorschlag.abwicklung_mm===1000,"Kupferblech, Dicke mm 0,60, Abwicklung mm 1'000",v);
v=V("Einhängestreifen. Aus verzinktem und lackiertem Stahlblech mm 0,87, bis 2x abgekantet. Abwicklung mm 200.");
p(v.vorschlag.material.id===3&&v.vorschlag.staerke_mm===0.87&&v.vorschlag.abwicklung_mm===200,"Stahlblech mm 0,87 -> Stahl, 0,87, 200",v);
v=V("Bleistreifen einfalzen. Walzblei mm 0,75 oder Bleiband gerippt mm 0,75. Abwicklung mm 105.");
p(v.vorschlag.material.id===4&&v.vorschlag.staerke_mm===0.75&&v.vorschlag.abwicklung_mm===105,"Walzblei/Bleiband: gleiche Stärke zweimal ist eindeutig",v);
v=V("Abschlussboden schräg. Zu Abwicklung mm 330.");
p(v.vorschlag.abwicklung_mm===330&&!v.vorschlag.material&&v.vorschlag.staerke_mm===undefined,"nur die Abwicklung, nichts anderes erfunden",v);
v=V("Briden zu Einhängestreifen. Auf Stahl nieten. St./m 2.");
p(!v.vorschlag.material&&!v.unklar.length,"\"Auf Stahl nieten\" ist kein Werkstoff der Position",v);
v=V("Bleilappen und Bleistreifen anformen. bxl mm 130/17");
p(!v.vorschlag.material,"\"Bleilappen\" allein ist kein Werkstoffwort",v);
v=V("CrNi-Stahlblech 1.4301");
p(v.vorschlag.material&&v.vorschlag.material.id===5,"CrNi-Stahlblech -> CrNi-Stahl, nicht auch Stahl",v);
v=V("Aluminiumblech eloxiert");
p(v.vorschlag.material&&v.vorschlag.material.id===6,"Aluminiumblech -> Aluminium (Aluman)",v);

console.log("\nC · Mehrdeutig, unbekannt, unplausibel: kein geratener Treffer");
v=V("Kupferblech oder Stahlblech, Dicke mm 0,6");
p(!v.vorschlag.material&&/mehrdeutig/.test(v.unklar.join()),"zwei Werkstoffe -> kein Vorschlag, Hinweis",v);
v=V("Zinkblech, Dicke mm 0,7");
p(!v.vorschlag.material,"unbekannter Name (Zink statt Titanzink) -> kein Treffer",v);
v=V("Kupferblech Dicke mm 0,6 oder Dicke mm 0,7");
p(v.vorschlag.staerke_mm===undefined&&/Stärke/.test(v.unklar.join()),"zwei verschiedene Stärken -> kein Vorschlag",v);
v=V("Abwicklung mm 250 oder Abwicklung mm 330");
p(v.vorschlag.abwicklung_mm===undefined,"zwei verschiedene Abwicklungen -> kein Vorschlag",v);
v=V("Dicke mm 55 Abwicklung mm 99999");
p(v.vorschlag.staerke_mm===undefined&&v.vorschlag.abwicklung_mm===undefined,"unplausible Werte werden nicht vorgeschlagen",v);
v=V("Blech 0,6 mm, Abwicklung 500");
p(v.vorschlag.staerke_mm===undefined&&v.vorschlag.abwicklung_mm===undefined,"Zahl ohne eindeutiges Muster -> nichts",v);
v=V("");
p(Object.keys(v.vorschlag).length===0,"leerer Text -> nichts");
p(sb.E("Kupferblech",[]).material.art==="keiner"&&sb.E("Kupferblech",null).material.art==="keiner","ohne Werkstoffliste kein Treffer, kein Absturz");

console.log("\nD · Vorhandene Werte werden nie ersetzt");
v=V("Kupferblech, Dicke mm 0,60, Abwicklung mm 1000",{material_id:2,staerke_mm:0.7,abwicklung_mm:700});
p(Object.keys(v.vorschlag).length===0,"alles schon gepflegt -> kein Vorschlag",v);
v=V("Kupferblech, Dicke mm 0,60, Abwicklung mm 1000",{abwicklung_mm:700});
p(v.vorschlag.material&&v.vorschlag.staerke_mm===0.6&&v.vorschlag.abwicklung_mm===undefined,"nur für leere Felder",v);

console.log("\nE · Blechfläche (nur Vorschau, nur Meter)");
const Fl=(unit,menge,abw)=>sb.F({unit,quantity:menge,abwicklung_mm:abw});
let f=Fl("m",12,500);
p(f.status==="meter"&&Math.abs(f.m2-6)<1e-12,"12 m × 500 mm = 6 m²",f);
p(Math.abs(Fl("m",86,1000).m2-86)<1e-9&&Math.abs(Fl("M",7.5,333).m2-7.5*0.333)<1e-12,"andere Beispiele, ohne Rundung");
["St","Stk","h","Fr","","kg","lfm","Std."].forEach(u=>p(Fl(u,12,500).status==="einheit","Einheit \""+u+"\": keine m²-Rechnung"));
f=Fl("m2",12,500);
p(f.status==="flaeche"&&f.m2===12,"m2: Menge ist die Fläche, Abwicklung wird NICHT multipliziert",f);
p(Fl("m",12,"").status==="keine_abwicklung"&&Fl("m",12,0).status==="keine_abwicklung"&&Fl("m",12,-5).status==="keine_abwicklung","m ohne gültige Abwicklung: keine Rechnung");
p(Fl("m",0,500).status==="keine_menge"&&Fl("m",-2,500).status==="keine_menge"&&Fl("m","x",500).status==="keine_menge","m ohne gültige Menge: keine Rechnung");

console.log("\nF · Bereinigen beim Speichern");
const alt={pos:"1",description:"x",quantity:1,unit:"m",preis:5,abschnitt:"A"};
p(JSON.stringify(sb.B(alt,L))===JSON.stringify(alt),"alte Position ohne Felder bleibt unverändert");
p(sb.B({...alt,material_id:999},L).material_id===undefined,"fremde/unbekannte material_id wird entfernt");
p(sb.B({...alt,material_id:2},L).material_id===2,"gültige material_id bleibt");
p(sb.B({...alt,material_id:999},[]).material_id===999,"ohne geladene Liste wird nichts gelöscht, was nicht geprüft werden kann");
p(sb.B({...alt,material_id:null,staerke_mm:"x",abwicklung_mm:0},L).staerke_mm===undefined,"ungültige Stärke wird nicht gespeichert");
p(sb.B({...alt,abwicklung_mm:"0,5"},L).abwicklung_mm===undefined,"0,5 mm Abwicklung ist unplausibel (< 5 mm)");
p(sb.B({...alt,staerke_mm:"0,6",abwicklung_mm:500},L).staerke_mm===0.6,"gültige Werte werden als Zahl gespeichert");


console.log("\nM · v3.334: Material aus dem Offertanfang, Hauptpositionen und Zusatzpositionen");
const VK=(pos,kontext,rolle)=>sb.V(pos,L,{kontext,rolle});
let vk=VK({description:"Dachrinnen neu. Einlegerinnen. Abwicklung mm 1'000."},"Offerte Dachrinnen, alles in Kupferblech","haupt");
p(vk.vorschlag.material&&vk.vorschlag.material.id===1&&vk.vorschlag.material.herkunft==="offertanfang"&&vk.vorschlag.abwicklung_mm===1000,"Material nur im Offertanfang, Abwicklung nur in der Zeile -> eindeutiger Vorschlag (Herkunft Offertanfang)",vk);
vk=VK({description:"Dachrinnen. Abwicklung mm 500."},"Material: Kupfer","haupt");
p(vk.vorschlag.material&&vk.vorschlag.material.id===1&&vk.vorschlag.material.herkunft==="offertanfang","Werkstoffname im Offertanfang auch allein als Wort (\"Material: Kupfer\")",vk);
vk=VK({description:"Einhängestreifen. Stahlblech mm 0,87. Abwicklung mm 200."},"Offerte in Kupferblech","haupt");
p(vk.vorschlag.material.id===3&&vk.vorschlag.material.herkunft==="position","Material im eigenen Text hat Vorrang vor dem Offertanfang",vk);
vk=VK({description:"Kupferblech oder Stahlblech. Abwicklung mm 200."},"Offerte in Kupferblech","haupt");
p(!vk.vorschlag.material&&/mehrdeutig/.test(vk.unklar.join()),"eigener Text mehrdeutig: kein Ausweichen auf den Offertanfang",vk);
vk=VK({description:"Dachrinnen. Abwicklung mm 500."},"Kupfer und Stahl nach Wahl","haupt");
p(!vk.vorschlag.material&&/Offertanfang mehrdeutig/.test(vk.unklar.join()),"mehrdeutiges Material im Offertanfang: kein Vorschlag, Hinweis",vk);
vk=VK({description:"Dachrinnen. Abwicklung mm 500."},"Offerte Rinnen","haupt");
p(!vk.vorschlag.material&&vk.vorschlag.abwicklung_mm===500,"kein Werkstoff im Offertanfang: nur die Abwicklung",vk);
vk=VK({description:"Dachrinnen. Abwicklung mm 500.",material_id:2},"Offerte in Kupferblech","haupt");
p(!vk.vorschlag.material,"bereits gepflegtes Material: kein Vorschlag aus dem Offertanfang",vk);
vk=VK({description:"Trennlage. b mm 500."},"Offerte in Kupferblech","zusatz");
p(Object.keys(vk.vorschlag).length===0,"Zusatzposition bekommt keine Vorschläge",vk);
vk=VK({description:"Vorwort Abwicklung mm 500"},"Offerte in Kupferblech","davor");
p(Object.keys(vk.vorschlag).length===0,"Position vor der ersten Hauptposition: kein Vorschlag",vk);
p(sb.V({description:"Kupferblech Dicke mm 0,6"},L).vorschlag.material.id===1,"v3.333-Aufruf ohne Gruppenregel unverändert");

console.log("\nN · Schreibweisen der Abwicklung");
const AB=t=>sb.E(t,L).abwicklung;
[["Abwicklung 500 mm",500],["Abwicklung mm 500",500],["Abw. 500 mm",500],["Abw. mm 500",500],["Abw.: 500 mm",500],["abw 500mm",500],["Abwicklung: 1'000 mm",1000],["Abwicklung mm 1’250",1250],["Abwicklung mm 333,5",333.5],["Zu Abwicklung mm 250.",250],["Abwicklung mm 1'000.",1000]].forEach(([t,w])=>{
 const r=AB(t);p(r.art==="eindeutig"&&r.wert===w,"\""+t+"\" -> "+w,r)});
[["Abwicklung 500","ohne Einheit"],["Abw. 500","ohne Einheit"],["Alle Abwicklungen. Ausmass: Anzahl","Plural ohne Zahl"],["Abwicklungen mm 500","Plural"],["Abwicklung mm","ohne Zahl"],["Abwicklung 0,5 m","Meter statt mm"],["Abwicklung mm 2","unplausibel klein"],["Abwicklung mm 99999","unplausibel gross"],["Rückwicklung mm 500","anderes Wort"],["Abwicklung mm 250 oder Abwicklung mm 330","zwei Werte"]].forEach(([t,g])=>{
 const r=AB(t);p(r.art!=="eindeutig","\""+t+"\" -> kein Vorschlag ("+g+")",r)});

console.log("\nO · Positionsgruppen nach Abwicklung (über den Platz in der Liste)");
const pos=(d,x)=>Object.assign({pos:"",description:d,quantity:1,unit:"m"},x||{});
let G=sb.G([pos("Vorab. Arbeiten nach Aufwand",{unit:"h"}),pos("Rinne. Abwicklung mm 1'000."),pos("Trennlage. b mm 500."),pos("Anschluss. Auf Holz."),pos("Einlaufblech. Abwicklung mm 400."),pos("Dehnungselement St.")],L);
p(G.map(g=>g.rolle).join()==="davor,haupt,zusatz,zusatz,haupt,zusatz","Rollen: davor, Haupt, 2 Zusatz, Haupt, Zusatz",G.map(g=>g.rolle));
p(JSON.stringify(G[1].zusaetze)==="[2,3]"&&JSON.stringify(G[4].zusaetze)==="[5]","die nächste Position mit Abwicklung beginnt eine neue Gruppe",G.map(g=>g.zusaetze));
p(G[2].haupt===1&&G[3].haupt===1&&G[5].haupt===4&&G[0].haupt===null,"Zusatzpositionen zeigen auf ihre Hauptposition, Vorab-Position auf keine");
p(G[2].abw.wert===1000&&G[5].abw.wert===400,"Zusatzpositionen kennen die Abwicklung ihrer Hauptposition (nur Anzeige)");
G=sb.G([pos("A. Abwicklung mm 250.",{pos:"1"}),pos("B.",{pos:"1"}),pos("C. Abwicklung mm 250.",{pos:"1"}),pos("D.",{pos:""})],L);
p(G.map(g=>g.rolle).join()==="haupt,zusatz,haupt,zusatz"&&G[1].haupt===0&&G[3].haupt===2,"doppelte und fehlende Positionsnummern beeinflussen die Zuordnung nicht",G.map(g=>[g.rolle,g.haupt]));
G=sb.G([pos("Ohne Text",{abwicklung_mm:300}),pos("Zusatz")],L);
p(G[0].rolle==="haupt"&&G[0].abw.quelle==="feld"&&G[1].haupt===0,"gepflegtes Abwicklungsfeld macht eine Position zur Hauptposition");
p(sb.G([],L).length===0&&sb.G(null,L).length===0,"leere Liste, kein Absturz");

// "Zu Abwicklung mm N" = Zusatzleistung des laufenden Profils: gehört zur Hauptgruppe, beginnt keine neue
G=sb.G([pos("Rinne. Abwicklung mm 250."),pos("Rinnenhalter. Zu Abwicklung mm 250.",{unit:"St"}),pos("Rinnenwinkel. Zu Abwicklung mm 330.",{unit:"St"}),pos("Einlaufblech. Abwicklung mm 400.")],L);
p(G.map(g=>g.rolle).join()==="haupt,zusatz,zusatz,haupt"&&G[1].haupt===0&&G[2].haupt===0,"\"Zu Abwicklung\" beginnt keine neue Hauptgruppe, sondern gehört zur laufenden",G.map(g=>[g.rolle,g.haupt]));
p(G[1].zuAbw===250&&!G[1].abweichend&&G[2].zuAbw===330&&G[2].abweichend===true,"abweichende \"Zu Abwicklung\" wird erkannt und angezeigt, nicht still übernommen",[G[1],G[2]].map(g=>[g.zuAbw,g.abweichend]));
G=sb.G([pos("Rinnenhalter. Zu Abwicklung mm 250.",{unit:"St"}),pos("Rinne. Abwicklung mm 250.")],L);
p(G[0].rolle==="davor"&&G[1].rolle==="haupt","\"Zu Abwicklung\" vor der ersten Hauptposition: nicht zugeordnet",G.map(g=>g.rolle));
p(sb.V(pos("Rinne. Abwicklung mm 500. Zu Abwicklung mm 250."),L,{rolle:"haupt"}).vorschlag.abwicklung_mm===500,"Hauptposition: die eigene Abwicklung zählt, nicht die \"Zu Abwicklung\"");
// Fläche: Zusatzpositionen zählen nicht
p(sb.F(pos("Trennlage. b mm 500.",{quantity:86})).status==="keine_abwicklung","Zusatzposition (Meter, ohne eigene Abwicklung): keine Blechfläche");
p(Math.abs(sb.F({unit:"m",quantity:12,abwicklung_mm:500}).m2-6)<1e-12,"12 m × 500 mm = 6 m² bleibt");

// ---- Browser ----
const STUB=`window.__t={angebote:[],measurements:[],leistungen:[],leistung_massaufnahmen:[],material_reservierungen:[]};window.__log=[];window.__id=100;
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 storage:{from:()=>({createSignedUrl:async(x)=>({data:{signedUrl:"https://t/"+x},error:null}),upload:async()=>({data:{},error:null})})},
 rpc:async()=>({data:null,error:null}),
 from:(t)=>{const z={t,eqs:[]};const q={};
  q.insert=d=>{z.op="insert";z.d=d;return q};q.update=d=>{z.op="update";z.d=d;return q};
  q.upsert=d=>{z.op="upsert";z.d=d;return q};q.delete=()=>{z.op="delete";return q};
  q.select=()=>{if(!z.op)z.op="select";return q};
  q.eq=(f,v)=>{z.eqs.push([f,v]);return q};
  ["order","limit","not","is","range","ilike","in"].forEach(k=>{q[k]=()=>q});
  q.maybeSingle=()=>Promise.resolve({data:null,error:null});
  const lauf=()=>{
   if(z.op&&z.op!=="select"){window.__log.push({t,op:z.op,d:z.d,eqs:z.eqs});
    return {data:[Object.assign({id:++window.__id,updated_by:"u1",updated_at:"x"},z.d)],error:null}}
   return {data:[],error:null}};
  q.then=(f,g)=>Promise.resolve(lauf()).then(f,g);return q}})};`;
(async()=>{
 const br=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await br.newPage({viewport:{width:1200,height:1400}});
 const jsFehler=[];page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 const dialoge=[];page.on("dialog",d=>{dialoge.push(d.message());d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto("file://"+path.join(process.cwd(),"index.html"),{waitUntil:"load"});
 await page.waitForTimeout(500);
 const oeffnen=(pos,id)=>page.evaluate(([pos,id])=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"A"};meineRechte={admin:true};offerteZugriff=true;
  allProjects=[{id:7,name:"P7",archived:false},{id:8,name:"P8",archived:false}];
  measurementMaterials=[{id:1,name:"Kupfer"},{id:2,name:"Titanzink"},{id:3,name:"Stahl"},{id:4,name:"Blei"}];
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  window.__log=[];
  openAngebot({id:id||12,project_id:7,title:"Offerte",note:"",date:"2026-10-12",positions:JSON.parse(JSON.stringify(pos)),photo_paths:[]});
  window.dispatchEvent(new Event("resize"));
 },[pos,id||12]);
 const speichern=async()=>{
  await page.evaluate(()=>{window.__log=[];$("saveAngebot").click()});
  await page.waitForTimeout(500);
  return page.evaluate(()=>window.__log.slice());
 };
 const posAus=log=>{const w=log.find(x=>x.t==="angebote");return w?w.d.positions:null};
 const panel=i=>page.evaluate(i=>{const b=document.querySelector(`[data-ang-mat="${i}"]`);b.click();return document.querySelector(`[data-ang-mat-row="${i}"]`).textContent.replace(/\s+/g," ")},i);
 const setze=(sel,wert,ereignis)=>page.evaluate(([s,w,e])=>{const el=document.querySelector(s);el.value=w;el.dispatchEvent(new Event(e||"input",{bubbles:true}))},[sel,wert,ereignis]);

 console.log("\nG · Editor: alte Position, Auswahl, Speichern");
 const ALT=[{pos:"1",description:"Rinne Kupferblech Dicke mm 0,60 Abwicklung mm 500",quantity:12,unit:"m",preis:10,abschnitt:"A"}];
 await oeffnen(ALT);
 let log=await speichern();
 p(JSON.stringify(posAus(log))===JSON.stringify(ALT),"alte Position ohne Felder: unverändert gespeichert (auch mit Text, der Vorschläge hätte)",posAus(log));
 await oeffnen(ALT);
 await panel(0);
 const opt=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-ang-mat-feld="material_id"] option')).map(o=>o.textContent));
 p(JSON.stringify(opt)===JSON.stringify(["– kein Material –","Kupfer","Titanzink","Stahl","Blei"]),"angeboten wird nur die Werkstoffliste der Firma (measurement_materials)",opt);
 await setze('[data-ang-mat-feld="material_id"]',"2","change");
 log=await speichern();
 let pos=posAus(log);
 p(pos&&pos[0].material_id===2&&pos[0].staerke_mm===undefined&&pos[0].abwicklung_mm===undefined,"Material gewählt und gespeichert, sonst nichts",pos);
 p(pos[0].quantity===12&&pos[0].unit==="m"&&pos[0].preis===10&&pos[0].pos==="1","Menge, Einheit, Preis, Nummer unverändert",pos[0]);

 console.log("\nH · Vorschlag erscheint, wird aber erst nach Bestätigung übernommen");
 await oeffnen(ALT);
 let t=await panel(0);
 p(/Vorschlag aus dem Positionstext/.test(t)&&/Kupfer/.test(t)&&/0,6 mm/.test(t)&&/500 mm/.test(t),"Vorschlag sichtbar",t);
 log=await speichern();
 p(JSON.stringify(posAus(log))===JSON.stringify(ALT),"Öffnen und Speichern ohne Bestätigung übernimmt NICHTS");
 await oeffnen(ALT);await panel(0);
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-uebernehmen="0"]').click()});
 p(dialoge.slice(-1)[0]&&/anhaken/.test(dialoge.slice(-1)[0]),"Übernehmen ohne Haken: Hinweis, nichts geändert");
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-vs="material"]').click();document.querySelector('[data-ang-mat-vs="abwicklung_mm"]').click();document.querySelector('[data-ang-mat-uebernehmen="0"]').click()});
 log=await speichern();pos=posAus(log);
 p(pos[0].material_id===1&&pos[0].abwicklung_mm===500&&pos[0].staerke_mm===undefined,"nur die angehakten Felder (Material, Abwicklung) wurden übernommen, Stärke nicht",pos[0]);

 console.log("\nI · Eingaben, Text ändern, mehrdeutig, manuelle Werte");
 await oeffnen(ALT);await panel(0);
 for(const [wert,gueltig] of [["0",false],["-3",false],["abc",false],["99999",false],["",false],["500",true]]){
  await setze('[data-ang-mat-feld="abwicklung_mm"]',wert);
  const s=await page.evaluate(()=>angPositions[0].abwicklung_mm);
  p(gueltig?s===500:s===undefined,"Abwicklung \""+wert+"\" -> "+(gueltig?"gespeichert":"nicht gespeichert"),s);
 }
 await setze('[data-ang-mat-feld="staerke_mm"]',"0,6");
 p((await page.evaluate(()=>angPositions[0].staerke_mm))===0.6,"Stärke 0,6 -> Zahl 0.6");
 await setze('[data-ang-mat-feld="staerke_mm"]',"50");
 p((await page.evaluate(()=>angPositions[0].staerke_mm))===undefined,"Stärke 50 mm unplausibel -> entfernt");
 // Text ändern verwirft den alten Vorschlag
 await oeffnen([{pos:"1",description:"Kupferblech Abwicklung mm 500",quantity:1,unit:"m",preis:0}]);await panel(0);
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-vs="material"]').click()});
 await setze('[data-ang-desc="0"]',"Stahlblech Abwicklung mm 500");
 const neuVs=await page.evaluate(()=>document.querySelector('[data-ang-mat-vorschlag="0"]').textContent.replace(/\s+/g," "));
 p(/Stahl/.test(neuVs)&&!/Kupfer/.test(neuVs),"Text geändert: alter Vorschlag verworfen, neuer gerechnet",neuVs);
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-vs="material"]').click();document.querySelector('[data-ang-mat-uebernehmen="0"]').click()});
 p((await page.evaluate(()=>angPositions[0].material_id))===3,"bestätigt wird der NEUE Vorschlag (Stahl)");
 // veralteter Haken: Vorschlag angezeigt, Text im Hintergrund geändert (ohne Neuzeichnen) -> nichts Falsches übernommen
 await oeffnen([{pos:"1",description:"Kupferblech Abwicklung mm 500",quantity:1,unit:"m",preis:0}]);await panel(0);
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-vs="material"]').click();angPositions[0].description="Titanzinkblech Abwicklung mm 500";document.querySelector('[data-ang-mat-uebernehmen="0"]').click()});
 const mid=await page.evaluate(()=>angPositions[0].material_id);
 p(mid===undefined||mid===2,"veralteter Haken übernimmt nie den alten Wert (Kupfer)",mid);
 // mehrdeutig
 await oeffnen([{pos:"1",description:"Kupferblech oder Stahlblech Abwicklung mm 500",quantity:1,unit:"m",preis:0}]);
 t=await panel(0);
 p(!(await page.evaluate(()=>!!document.querySelector('[data-ang-mat-vs="material"]')))&&/nicht eindeutig/i.test(t),"mehrdeutig: kein Material-Vorschlag, Hinweis (die eindeutige Abwicklung wird weiter vorgeschlagen)",t);
 // manuelle Werte bleiben
 await oeffnen([{pos:"1",description:"Kupferblech Dicke mm 0,6 Abwicklung mm 250",quantity:1,unit:"m",preis:0,material_id:2,staerke_mm:0.8,abwicklung_mm:700}]);
 t=await panel(0);
 p(!/Vorschlag aus dem Positionstext/.test(t),"gepflegte Felder: kein Vorschlag, nichts überschrieben",t);

 console.log("\nJ · Vorschau Blechfläche im Editor");
 await oeffnen([{pos:"1",description:"x",quantity:12,unit:"m",preis:0,abwicklung_mm:500}]);
 t=await panel(0);
 p(/6 m²/.test(t),"12 m und 500 mm: 6 m² Vorschau",t);
 for(const u of ["St","Stk","h","Fr",""]){
  await oeffnen([{pos:"1",description:"x",quantity:12,unit:u,preis:0,abwicklung_mm:500}]);
  t=await panel(0);
  p(!/ m² /.test(t.replace(/Fläche/g,""))&&!/× /.test(t)&&/Keine Flächenrechnung/.test(t),"Einheit \""+u+"\": keine Flächenrechnung",t.slice(0,120));
 }

 console.log("\nK · Identität, mehrere Offerten, keine Nebenwirkungen");
 await oeffnen([{pos:"1",description:"Kupferblech Abwicklung mm 500",quantity:1,unit:"m",preis:0},{pos:"1",description:"Stahlblech Abwicklung mm 500",quantity:2,unit:"m",preis:0},{pos:"",description:"ohne Nummer",quantity:3,unit:"m",preis:0}]);
 await panel(1);
 await setze('[data-ang-mat-feld="material_id"][data-ang-mat-i="1"]',"4","change");
 log=await speichern();pos=posAus(log);
 p(pos.length===3&&pos[0].material_id===undefined&&pos[1].material_id===4&&pos[2].material_id===undefined,"doppelte Nummer und Position ohne Nummer: nur die angesprochene Position ändert sich",pos.map(x=>x.material_id));
 await oeffnen([{pos:"1",description:"A",quantity:1,unit:"m",preis:0}],12);
 await panel(0);await setze('[data-ang-mat-feld="material_id"]',"1","change");
 await oeffnen([{pos:"1",description:"B",quantity:1,unit:"m",preis:0}],13);
 log=await speichern();pos=posAus(log);
 p(pos[0].material_id===undefined&&log.find(x=>x.t==="angebote").eqs.some(e=>e[1]===13),"andere Offerte: unbeeinflusst, geschrieben wird nur Offerte 13",log.map(x=>[x.t,x.eqs]));
 await oeffnen(ALT);await panel(0);
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-vs="material"]').click();document.querySelector('[data-ang-mat-uebernehmen="0"]').click()});
 log=await speichern();
 p(log.length>0&&log.every(x=>x.t==="angebote"),"geschrieben wird ausschliesslich die Offerte (keine Reservierung, Buchung, Massaufnahme, Leistung)",log.map(x=>x.t));
 // fremde material_id im gespeicherten JSON
 await oeffnen([{pos:"1",description:"x",quantity:1,unit:"m",preis:0,material_id:999}]);
 t=await panel(0);
 p(/gibt es in der Werkstoffliste dieser Firma nicht/.test(t),"fremde material_id: Warnung, nicht als gültig angeboten",t.slice(0,160));
 log=await speichern();
 p(posAus(log)[0].material_id===undefined,"und beim Speichern entfernt");


 console.log("\nP · Editor: Offertanfang, Gruppen, Herkunft, Frische");
 const GRP=[{pos:"1",description:"Dachrinnen neu. Einlegerinnen. Abwicklung mm 1'000.",quantity:86,unit:"m",preis:10,abschnitt:"A"},
  {pos:"1",description:"Trennlage. b mm 500.",quantity:86,unit:"m",preis:1,abschnitt:"A"},
  {pos:"",description:"Anschluss an Unterdachbahn.",quantity:198,unit:"m",preis:2,abschnitt:"A"},
  {pos:"3",description:"Einlaufblech. Abw. 400 mm.",quantity:10,unit:"m",preis:5,abschnitt:"A"},
  {pos:"4",description:"Rinnenwinkel. Zu Abwicklung mm 400.",quantity:4,unit:"St",preis:50,abschnitt:"A"}];
 const mitKopf=async(titel,notiz)=>{
  await oeffnen(GRP);
  await page.evaluate(([t,n])=>{$("angTitle").value=t;$("angNote").value=n;$("angTitle").dispatchEvent(new Event("input",{bubbles:true}))},[titel,notiz]);
 };
 await mitKopf("Offerte Steildach","Alles in Kupferblech.");
 const knoepfe=await page.evaluate(()=>Array.from(document.querySelectorAll("[data-ang-mat]")).map(b=>b.textContent.trim()));
 p(JSON.stringify(knoepfe)==='["🧱💡","🧱↳","🧱↳","🧱💡","🧱↳"]',"Knopf zeigt: Hauptpositionen mit Vorschlag 💡, Zusatzpositionen ↳",knoepfe);
 t=await panel(0);
 p(/Hauptposition/.test(t)&&/Zusatzpositionen dieser Hauptposition: Zeile 2 \(Pos\. 1\), Zeile 3 \(ohne Nummer\)/.test(t)&&/nicht als weitere Blechfläche/.test(t),"Hauptposition nennt ihre Zusatzpositionen (doppelte/leere Nummer eindeutig über die Zeile)",t.slice(0,300));
 p(/Materialvorschlag aus Offertanfang/.test(t)&&/Material: Kupfer/.test(t)&&/Abwicklung: 1000 mm/.test(t),"Herkunft sichtbar: Materialvorschlag aus Offertanfang, Abwicklung aus der Zeile",t);
 t=await panel(1);
 p(/Zusatzposition zur Hauptposition Zeile 1/.test(t)&&!/Vorschlag aus dem Positionstext/.test(t),"Zusatzposition zeigt die Hauptposition und bekommt keinen Vorschlag",t.slice(0,260));
 t=await panel(3);
 p(/Hauptposition mit Abwicklung 400 mm/.test(t)&&/Zeile 5/.test(t),"nächste Position mit Abwicklung (\"Abw. 400 mm\") beginnt neue Gruppe samt Zusatzposition",t.slice(0,260));
 log=await speichern();
 p(JSON.stringify(posAus(log))===JSON.stringify(GRP),"nichts übernommen: Offerte unverändert gespeichert");
 // Bestätigen: nur Hauptposition 0, nur angehakte Felder
 await mitKopf("Offerte Steildach","Alles in Kupferblech.");await panel(0);
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-i="0"][data-ang-mat-vs="material"]').click();document.querySelector('[data-ang-mat-uebernehmen="0"]').click()});
 log=await speichern();pos=posAus(log);
 p(pos[0].material_id===1&&pos[0].abwicklung_mm===undefined&&pos.slice(1).every(x=>x.material_id===undefined&&x.abwicklung_mm===undefined),"nur die angehakte Material-Zeile der Hauptposition übernommen, nichts auf Zusatz- oder andere Positionen geschrieben",pos.map(x=>[x.material_id,x.abwicklung_mm]));
 // Offertanfang ändern -> Vorschlag erneuert, alter Haken verworfen
 await mitKopf("Offerte Steildach","Alles in Kupferblech.");await panel(0);
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-i="0"][data-ang-mat-vs="material"]').click()});
 await page.evaluate(()=>{$("angNote").value="Alles in Stahlblech.";$("angNote").dispatchEvent(new Event("input",{bubbles:true}))});
 t=await page.evaluate(()=>document.querySelector('[data-ang-mat-vorschlag="0"]').textContent.replace(/\s+/g," "));
 p(/Material: Stahl/.test(t)&&!/Kupfer/.test(t),"Offertanfang geändert: Vorschlag erneuert",t);
 p(!(await page.evaluate(()=>document.querySelector('[data-ang-mat-i="0"][data-ang-mat-vs="material"]').checked)),"und der alte Haken ist verworfen");
 await page.evaluate(()=>{document.querySelector('[data-ang-mat-i="0"][data-ang-mat-vs="material"]').click();$("angNote").value="Alles in Kupferblech.";document.querySelector('[data-ang-mat-uebernehmen="0"]').click()});
 p((await page.evaluate(()=>angPositions[0].material_id))!==1||true,"(Hilfsschritt)");
 const nachAlt=await page.evaluate(()=>angPositions[0].material_id);
 p(nachAlt===undefined||nachAlt===1,"veralteter Haken (Offertanfang inzwischen anders): nie der alte Wert Stahl",nachAlt);
 // Offertanfang mehrdeutig
 await mitKopf("Offerte","Kupfer oder Stahl");await panel(0);
 t=await page.evaluate(()=>document.querySelector('[data-ang-mat-row="0"]').textContent.replace(/\s+/g," "));
 p(!/Material:/.test(t.split("Vorschlag aus dem Positionstext")[1]||"")&&/Offertanfang mehrdeutig/.test(t),"mehrdeutiges Material im Offertanfang: Hinweis, kein Material-Vorschlag",t.slice(0,400));
 // Hinweis, wenn nirgends Material
 await mitKopf("Offerte","");await panel(0);
 t=await page.evaluate(()=>document.querySelector('[data-ang-mat-row="0"]').textContent.replace(/\s+/g," "));
 p(/Kein Material erkannt/.test(t)&&/Notiz/.test(t),"ohne Material: Hinweis, wo der Offertanfang steht",t.slice(0,400));
 // Manuelles Material bleibt: kein Vorschlag aus dem Offertanfang
 await oeffnen([{...GRP[0],material_id:2}]);
 await page.evaluate(()=>{$("angNote").value="Alles in Kupferblech.";$("angNote").dispatchEvent(new Event("input",{bubbles:true}))});
 t=await panel(0);
 p(!/Materialvorschlag aus Offertanfang/.test(t),"gepflegtes Material wird vom Offertanfang nicht ersetzt",t.slice(0,200));
 log=await speichern();
 p(log.length>0&&log.every(x=>x.t==="angebote"),"Schreibzugriffe nur auf die Offerte",log.map(x=>x.t));

 console.log("\nL · Quelltext: getrennte Materiallisten, Rechte");
 const block=q.slice(q.indexOf("// ---- Offertposition: optionale Materialdaten"),q.indexOf("function renderAngPositionsTable"));
 p(/measurementMaterials/.test(block),"Materialauswahl kommt aus measurement_materials (measurementMaterials)");
 p(!/lieferanten|settings\.materials|from\("materials"\)|lager_varianten|Regiematerial/.test(block),"keine Verwendung von materials, lieferanten_artikel, lager_varianten, Regiematerial");
 p(!/\bsb\b|\.rpc\(|\.insert\(|\.upsert\(|\.update\(|\bfetch\(/.test(block),"der neue Block fragt keine Tabelle und schreibt nichts");
 p(/function checkOfferteZugriff/.test(q)&&/offerteZugriff/.test(q),"Zugriff auf Offerten bleibt an die bestehende Feature-/Rechtepruefung (offerteZugriff) gebunden");
 const imp=fs.readFileSync("js/17-ausmass.js","utf8");
 p(!/material_id|staerke_mm|abwicklung_mm/.test(imp),"Import (PDF/Foto, js/17) bleibt unverändert und liefert die Felder nicht");
 p(jsFehler.length===0,"keine JS-Fehler",jsFehler);
 await br.close();
 console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

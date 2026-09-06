// Prueft, was in eine Materialreservierung kommt (v3.17).
//
// Rueckmeldung des Betriebs (6.9.2026): "beim reservieren reicht von miraus
// gesehen die zuschnitte ... ausser es sind noch halbfabrikate wie dilas oder
// rinnendoeden dabei". Geprueft wird deshalb:
//
//   - ZUSCHNITTE kommen immer,
//   - TEILE (Halbfabrikate/gekaufte Artikel: Dilas, Rinnenboeden, Halter,
//     Stutzen, Winkel, Schieber, Bleilappen, GAVA-Bleche) kommen immer,
//   - ABGELEITETE MASSE (Abwicklung, Blechflaeche, Stueckzahlen, Blechstoesse,
//     Gehrungen, Segmente) kommen NIE,
//   - entschieden wird am Feld "teil" der Massaufnahme, NICHT an der
//     Bezeichnung - eine Namensliste waere bei jeder Umformulierung still
//     falsch,
//   - eine Massaufnahme aus einer Fassung VOR v3.17 hat das Feld nicht: dort
//     raet die App nicht, sondern nimmt die Position mit UND sagt das,
//   - die zwoelf Module setzen das Feld wirklich (gemessen an ihrem echten
//     Ausmass, nicht an meiner Erwartung),
//   - der Schreibweg ist unveraendert: EIN insert, nie eine company_id.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-bedarf-teile-v3-17.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"), fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__ruf=[];
window.__db={reservierungen:[],reste:[],naechste:100};
function __tab(name){
 const st={name,filter:[],op:null,werte:null};
 const f={};
 ['select','order','limit','range','eq','is','in'].forEach(k=>f[k]=(a,b)=>{if(k==='eq'||k==='is'||k==='in')st.filter.push([a,k,b]);return f});
 f.insert=(w)=>{st.op='insert';st.werte=w;return f};
 f.update=(w)=>{st.op='update';st.werte=w;return f};
 f.delete=()=>{st.op='delete';return f};
 const quelle=()=>name==='material_reservierungen'?window.__db.reservierungen:
               (name==='reststuecke'?window.__db.reste:[]);
 const lauf=()=>{
  window.__ruf.push({tabelle:name,op:st.op||'select',werte:st.werte});
  if(st.op==='insert'){
   const rows=(Array.isArray(st.werte)?st.werte:[st.werte]).map(w=>({
     id:window.__db.naechste++,company_id:'FIRMA-AUS-DER-DB',
     status:'benoetigt',reserviert_von:null,reserviert_am:null,...w}));
   quelle().push(...rows); return {data:rows,error:null};
  }
  if(st.op==='update'||st.op==='delete')return {data:[],error:null};
  return {data:quelle().map(r=>({...r})),error:null};
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

// Genau der Fall aus dem Bildschirmfoto des Betriebs: ein Einlaufblech mit
// vier abgeleiteten Massen und EINEM echten Teil, dazu eine Rinne halbrund,
// deren Ausmass komplett aus Teilen besteht (Dilas, Rinnenboeden, Halter).
const AUFNAHMEN=[
 {id:11,project_id:7,type:"einlaufblech_gerade",title:"Dach Nord",
  data:{material:2,abwicklung:250,
   ausmass:[
    {pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"1,90",einheit:"m",teil:false},
    {pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:2,einheit:"Stk.",teil:false},
    {pos:3,bezeichnung:"Blechstösse",menge:1,einheit:"Stk.",teil:false},
    {pos:4,bezeichnung:"Blechfläche",menge:"0,48",einheit:"m²",teil:false},
    {pos:5,bezeichnung:"Haltebleche (GAVA Blech)",menge:4,einheit:"Stk.",teil:true}],
   rollen:{streifen:[{rest:0,stuecke:[{nr:1,laenge:1200},{nr:2,laenge:700}]}],optimal:true}}},
 {id:12,project_id:7,type:"rinne_halbrund",title:"Rinne Nord",
  data:{material:2,groesse:333,
   ausmass:[
    {pos:1,bezeichnung:"Rinne halbrund 333 mm Titanzink",menge:"18.40",einheit:"m",teil:true},
    {pos:2,bezeichnung:"Rinnenhalter 333 mm",menge:24,einheit:"Stk.",teil:true},
    {pos:3,bezeichnung:"Rinnenboden links 333 mm",menge:1,einheit:"Stk.",teil:true},
    {pos:4,bezeichnung:"Dehnungsstück 333 mm",menge:2,einheit:"Stk.",teil:true}]}}
];
// Dieselbe Aufnahme, aber OHNE das Feld - so, wie sie vor v3.17 gespeichert
// wurde. Genau die zwei Datensaetze, die real in der Produktivdatenbank
// stehen (Massaufnahme 50 und 87), haben diese Form.
const ALT=[
 {id:21,project_id:7,type:"einlaufblech_gerade",title:"Alt",
  data:{material:2,abwicklung:250,
   ausmass:[
    {pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"1,00",einheit:"m"},
    {pos:2,bezeichnung:"Haltebleche (GAVA Blech)",menge:3,einheit:"Stk."}]}}
];
const MOD={haupt:true,material:true,reservierung:true,zuschnitt:true,werkstatt:true};

const vorbereiten=async(page,aufnahmen)=>{
 await page.evaluate(([auf,mod])=>{
  currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:"admin",first_name:"P",last_name:"T"};
  allProfiles=[{id:"aaaa1111-1111-1111-1111-111111111111",first_name:"Peter",last_name:"Test"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:7,name:"Sanierung",object:"Musterstrasse 12, 3000 Bern"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[1000,670]; blechSchnittfuge=0; workflowAktiv=true;
  reststuecke=[]; window.__db.reservierungen=[]; window.__db.naechste=100;
  projectMeasurementsCache=JSON.parse(JSON.stringify(auf));
  cockpitProjectId=7;
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;$("startScreen").hidden=true;
  $("projectCockpitModal").hidden=false; $("matZuModal").hidden=false;
  ["matZuDetailsMaterial","matZuDetailsZuschnitt","matZuDetailsReservierung"]
   .forEach(id=>{const d=$(id); if(d){d.hidden=false; d.open=true}});
  window.__ruf=[];
 },[aufnahmen,MOD]);
 await page.evaluate(()=>resvCockpitLaden(7));
 await page.waitForTimeout(100);
};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:1100,height:1400}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 await page.addInitScript(STUB);
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(500);

 console.log("\nA · Was der Bedarf enthaelt");
 await vorbereiten(page,AUFNAHMEN);
 const z=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(z.some(b=>/Haltebleche/.test(b)),"das echte Teil (GAVA-Blech) ist dabei",z);
 p(z.some(b=>/Rinnenhalter/.test(b)),"Rinnenhalter ist dabei",z);
 p(z.some(b=>/Rinnenboden/.test(b)),"Rinnenboden ist dabei",z);
 p(z.some(b=>/Dehnungsstück/.test(b)),"das Dehnungsstueck (Dila) ist dabei",z);
 p(z.some(b=>/^Rinne halbrund/.test(b)),"die Rinne nach Metern ist dabei",z);
 p(!z.some(b=>/Abwicklung 250 mm/.test(b)),"die Abwicklung ist NICHT dabei",z);
 p(!z.some(b=>/Stücke \(Zuschnitte\)/.test(b)),"die Stueckzahl ist NICHT dabei",z);
 p(!z.some(b=>/Blechstösse/.test(b)),"die Blechstoesse sind NICHT dabei",z);
 p(!z.some(b=>/Blechfläche/.test(b)),"die Blechflaeche ist NICHT dabei",z);
 p(z.filter(b=>/^Zuschnitt/.test(b)).length>0,"die Zuschnitte sind dabei",z);

 console.log("\nB · Der Stand wird ehrlich gezaehlt");
 const st=await page.evaluate(()=>resvBedarfStand());
 p(st.teile===5,"fuenf Teile gezaehlt",st);
 p(st.abgeleitet===4,"vier abgeleitete Masse gezaehlt",st);
 p(st.unbekannt===0,"nichts Unbekanntes",st);
 p(st.zuschnitte>0,"Zuschnitte gezaehlt",st);
 const zusatz=await page.evaluate(()=>resvBedarfZusatz());
 p(/4 abgeleitete/.test(zusatz),"der Zusatztext nennt die vier weggelassenen",zusatz);
 p(!/ältere/.test(zusatz),"und spricht nicht von einer aelteren Fassung",zusatz);

 console.log("\nC · Uebernehmen schreibt genau das");
 await page.evaluate(()=>{window.__ruf=[]});
 const erg=await page.evaluate(async()=>await resvBedarfUebernehmen());
 const ins=await page.evaluate(()=>window.__ruf.filter(r=>r.op==="insert"));
 p(ins.length===1,"EIN insert fuer alle Zeilen",ins.length);
 const w=ins[0]?(Array.isArray(ins[0].werte)?ins[0].werte:[ins[0].werte]):[];
 p(w.length>0&&w.every(x=>!("company_id" in x)),"keine company_id vom Client",w[0]);
 p(!w.some(x=>/Blechfläche|Blechstösse|Stücke \(Zuschnitte\)|Abwicklung 250/.test(x.bezeichnung||"")),
   "kein abgeleitetes Mass im insert",w.map(x=>x.bezeichnung));
 p(w.some(x=>/Haltebleche/.test(x.bezeichnung||"")),"das Teil im insert",w.map(x=>x.bezeichnung));
 p(erg&&!erg.fehler&&erg.anzahl===w.length,"die Meldung nennt die geschriebene Zahl",erg);

 console.log("\nD · Eine Massaufnahme aus einer aelteren Fassung");
 await vorbereiten(page,ALT);
 const zAlt=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(zAlt.some(b=>/Haltebleche/.test(b)),"das Teil geht NICHT verloren",zAlt);
 p(zAlt.some(b=>/Abwicklung 250 mm/.test(b)),"die App raet nicht - sie nimmt alles mit",zAlt);
 const stAlt=await page.evaluate(()=>resvBedarfStand());
 p(stAlt.unbekannt===2&&stAlt.teile===0&&stAlt.abgeleitet===0,"beide als unbekannt gezaehlt",stAlt);
 const zusAlt=await page.evaluate(()=>resvBedarfZusatz());
 p(/ältere/.test(zusAlt)&&/öffnen und speichern/.test(zusAlt),
   "und der Text sagt, was zu tun ist",zusAlt);

 console.log("\nE · Gemischt: eine neue und eine alte Aufnahme");
 await vorbereiten(page,AUFNAHMEN.concat(ALT));
 const stMix=await page.evaluate(()=>resvBedarfStand());
 p(stMix.teile>=5&&stMix.unbekannt>=1,"beide Staende nebeneinander gezaehlt",stMix);
 const zMix=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(zMix.filter(b=>/Abwicklung 250 mm/.test(b)).length===1,
   "die bekannte Abwicklung faellt weg, die unbekannte bleibt",zMix);

 console.log("\nF · Die Entscheidung haengt NICHT an der Bezeichnung");
 await vorbereiten(page,[{id:31,project_id:7,type:"kehle",title:"X",
   data:{material:2,ausmass:[
    {pos:1,bezeichnung:"Blechfläche",menge:"1,00",einheit:"m²",teil:true},
    {pos:2,bezeichnung:"Rinnenboden links",menge:1,einheit:"Stk.",teil:false}]}}]);
 const zN=await page.evaluate(()=>resvBedarfZeilen().map(r=>r.bezeichnung));
 p(zN.some(b=>/Blechfläche/.test(b)),"als Teil markierte Blechflaeche kommt mit",zN);
 p(!zN.some(b=>/Rinnenboden/.test(b)),"als Mass markierter Rinnenboden kommt nicht",zN);

 console.log("\nG · Die Module setzen das Feld wirklich");
 // Gemessen am echten Ausmass der Module - nicht an meiner Erwartung.
 const module=await page.evaluate(()=>{
  const raus={};
  // Rinne halbrund: die Komponentenliste IST die Teileliste.
  if(typeof raAusmassZeilen==="function"&&typeof raLeer==="function"){
   const a=raLeer(); a.material=2; a.groesse=333;
   a.verlauf=[{art:"abschnitt",laenge:"8000"}];
   a.rinnenboden={links:true,rechts:false};
   const z=raAusmassZeilen(a);
   raus.rinne_halbrund={zeilen:z.length,teile:z.filter(x=>x.teil===true).length,
     ohne:z.filter(x=>x.teil===undefined).length};
  }
  return raus;
 });
 p(module.rinne_halbrund&&module.rinne_halbrund.zeilen>0,
   "Rinne halbrund liefert Ausmasszeilen",module.rinne_halbrund);
 p(module.rinne_halbrund&&module.rinne_halbrund.ohne===0,
   "keine Zeile ohne das Feld",module.rinne_halbrund);
 p(module.rinne_halbrund&&module.rinne_halbrund.teile===module.rinne_halbrund.zeilen,
   "bei der Rinne ist jede Zeile ein Teil",module.rinne_halbrund);

 // Am Quelltext: jedes Modul mit einem zeile()-Helfer reicht teil durch.
 const quellen=["js/29-einlaufblech-aufnahme.js","js/30-einlaufblech-konisch-aufnahme.js",
  "js/31-freies-profil-aufnahme.js","js/32-mauerabdeckung-aufnahme.js",
  "js/34-kehle-aufnahme.js","js/36-lukarne-aufnahme.js","js/37-kamin-aufnahme.js",
  "js/39-rinne-aufnahme.js","js/40-anschlussblech-aufnahme.js"];
 const ohneFeld=quellen.filter(f=>!/teil:teil===true/.test(fs.readFileSync(f,"utf8")));
 p(ohneFeld.length===0,"alle neun zeile()-Module reichen teil durch",ohneFeld);
 const einf=fs.readFileSync("js/38-einfassung-aufnahme.js","utf8");
 p(/teil:teil===true/.test(einf),"Einfassung Rund ebenso");
 const rinne=fs.readFileSync("js/28-rinne-aufnahme.js","utf8");
 p(/teil:true/.test(rinne),"Rinne halbrund markiert ihre Komponenten");
 // Und mindestens ein echtes Teil je Modul, das eines hat.
 const mitTeil={"js/29-einlaufblech-aufnahme.js":"Haltebleche",
  "js/32-mauerabdeckung-aufnahme.js":"Schieber","js/37-kamin-aufnahme.js":"Bleilappen",
  "js/40-anschlussblech-aufnahme.js":"Bleilappen","js/38-einfassung-aufnahme.js":"Bleilappen"};
 const fehlt=Object.keys(mitTeil).filter(f=>{
  const t=fs.readFileSync(f,"utf8");
  const re=new RegExp('"'+mitTeil[f]+'[^"]*"[^;]*,true\\)');
  return !re.test(t);
 });
 p(fehlt.length===0,"jedes Modul mit einem echten Teil markiert es auch",fehlt);

 console.log("\nH · Sauberkeit");
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));

 console.log("\n"+ok+"/"+(ok+fail)+(fail?"  "+fail+" FEHLGESCHLAGEN":"  alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH",e);process.exit(2)});

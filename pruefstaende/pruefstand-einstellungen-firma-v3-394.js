// v3.394: Zuschnitt-Einstellungen der Massaufnahme-Arten gelten firmenweit; Rüstblatt warnt bei veraltetem Zuschnitt.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const INIT=()=>{
 window.__db={ms:{sd_kehleSettings:{stoss_laenge:1111,ueberlappung:1,rest_schwelle:2}},admin:true,updates:[],selects:0};
 const chain=(tab)=>{const q={_t:tab};['select','eq','order','limit','in'].forEach(k=>q[k]=(...a)=>{if(k==="select"&&tab==="app_settings"&&!q._u)window.__db.selects++;return q});
  q.update=o=>{q._u=o;return q};
  q.maybeSingle=async()=>({data:tab==="app_settings"?{massaufnahme_einstellungen:window.__db.ms}:null,error:null});
  q.then=r=>{
   if(q._u&&tab==="app_settings"){ if(window.__db.admin){window.__db.updates.push(q._u);if(q._u.massaufnahme_einstellungen)window.__db.ms=q._u.massaufnahme_einstellungen;return Promise.resolve({data:[{id:1}],error:null}).then(r)} return Promise.resolve({data:[],error:null}).then(r)}
   return Promise.resolve({data:[],error:null}).then(r)};
  return q};
 window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},from:chain,storage:{from:()=>({})},rpc:async()=>({data:null,error:null})})};
};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(500);
 const ev=(f,...a)=>page.evaluate(f,...a);
 await ev(()=>{window.__al=[];window.appAlert=async t=>{window.__al.push(String(t))};appSettingsId=1});

 console.log("\nA · Firmenwerte ersetzen die Geräte-Werte beim Laden");
 let r=await ev(()=>{localStorage.setItem("sd_einfassungRundSettings",JSON.stringify({umschlag_hinten:20}));
  efUebernehmen({sd_einfassungRundSettings:{umschlag:10,umschlag_hinten:25,umschlag_seitlich:20,mass_seitlich:90},sd_dfaSettings:"kaputt",unbekannt:{x:1}});
  return {h:einfassungSettings.umschlag_hinten,v:einfassungSettings.umschlag,ls:JSON.parse(localStorage.getItem("sd_einfassungRundSettings")).umschlag_hinten,fremd:localStorage.getItem("unbekannt"),dfa:localStorage.getItem("sd_dfaSettings")}});
 p(r.h===25&&r.v===10&&r.ls===25,"Einfassung: Variable und lokaler Zwischenspeicher haben den Firmenwert",r);
 p(r.fremd===null&&r.dfa!=="\"kaputt\"","Unbekannte Schlüssel und Müll werden ignoriert",r);
 r=await ev(()=>{efUebernehmen({sd_kehleSettings:{stoss_laenge:2500}});return kehleSettings});
 p(r.stoss_laenge===2500&&r.ueberlappung!==undefined,"Kehle: Teilwerte werden mit den Standardwerten ergänzt",r);
 r=await ev(()=>{const vorher=JSON.stringify(einfassungSettings);efUebernehmen(null);efUebernehmen([]);return JSON.stringify(einfassungSettings)===vorher});
 p(r,"Leere/ungültige Firmenliste ändert nichts am lokalen Wert");

 console.log("\nB · Speichern: nur der geänderte Schlüssel, ehrliche Meldung");
 r=await ev(async()=>{__db.ms={sd_kehleSettings:{stoss_laenge:111},sd_kaminSettings:{ueberlappung:7}};__db.updates=[];
  localStorage.setItem("sd_einfassungRundSettings",JSON.stringify({umschlag:10,umschlag_hinten:25}));
  const x=await efFirmaSichern("sd_einfassungRundSettings");return {x,u:__db.updates,ms:__db.ms}});
 p(!r.x.fehler&&r.u.length===1,"Administrator: ein Update",r.u);
 p(r.ms.sd_kaminSettings&&r.ms.sd_kaminSettings.ueberlappung===7&&r.ms.sd_kehleSettings.stoss_laenge===111,"Andere Firmenwerte bleiben erhalten (Zusammenführen)",r.ms);
 p(r.ms.sd_einfassungRundSettings&&r.ms.sd_einfassungRundSettings.umschlag_hinten===25,"Der geänderte Wert steht in der Firma",r.ms);
 r=await ev(async()=>{__db.admin=false;__db.updates=[];const x=await efMelden("sd_kehleSettings","Gespeichert");__db.admin=true;return {x,t:__al[__al.length-1]}});
 p(r.x.fehler&&/nur auf diesem Gerät/.test(r.t)&&!/ganze Firma/.test(r.t),"Ohne Adminrecht: Meldung sagt «nur auf diesem Gerät», kein falsches Erfolgsversprechen",r.t);
 r=await ev(async()=>{await efMelden("sd_kehleSettings","Gespeichert");return __al[__al.length-1]});
 p(/Gespeichert – gilt für die ganze Firma/.test(r),"Administrator: Meldung «gilt für die ganze Firma»",r);
 r=await ev(async()=>(await efFirmaSichern("sd_gibtsnicht")).fehler);
 p(!!r,"Unbekannter Schlüssel wird abgelehnt");
 r=await ev(async()=>{const a=appSettingsId;appSettingsId=null;const x=await efFirmaSichern("sd_kehleSettings");appSettingsId=a;return x.fehler});
 p(/nicht geladen/.test(r||""),"Ohne geladene Firmenzeile: Fehler statt Schein-Erfolg",r);

 console.log("\nC · Bedienung: Speichern-Knopf der Einfassung schreibt firmenweit");
 r=await ev(async()=>{__db.updates=[];__al.length=0;
  const box=$("einfsUmschlagHinten")||document.querySelector("[id*='einfsUmschlag']");
  return {feld:!!$("saveEinfassungSettings"),id:box&&box.id}});
 p(r.feld,"Knopf «saveEinfassungSettings» vorhanden",r);
 r=await ev(async()=>{__db.updates=[];__al.length=0;$("saveEinfassungSettings").click();await new Promise(x=>setTimeout(x,300));return {n:__db.updates.length,t:__al.join("|"),ms:Object.keys(__db.ms)}});
 p(r.n===1&&/ganze Firma/.test(r.t)&&r.ms.includes("sd_einfassungRundSettings"),"Klick auf Speichern: ein Firmen-Update und Meldung «ganze Firma»",r);

 console.log("\nD · Rüstblatt warnt bei veraltetem Zuschnitt");
 r=await ev(()=>{
  einfassungSettings={...einfassungSettings,umschlag:10,umschlag_hinten:10,umschlag_seitlich:20,mass_seitlich:90};
  const e={a:110,b:340,c:60,bez:"Nr.1",anzahl:3,winkel:0,standrohr:20,durchmesser:28};
  const d={einfassungen:[e],deckung:"schiebeziegel",lattenabstand:350};
  const gut=einfaZuschnitte(d).map(x=>({laenge:x.laenge,breite:x.breite}));
  const m=(zs)=>({type:"einfassung_rund",data:{...d,zuschnitte:zs}});
  const alt=gut.map(x=>({...x,laenge:x.laenge-5}));
  return {gut:rbAbweichungText(m(gut)),alt:rbAbweichungText(m(alt)),html:rbAbweichungHtml(m(alt)),l:gut[0].laenge,
   altformat:rbAbweichungText({type:"einfassung_rund",data:{zuschnitte:alt}}),ohne:rbAbweichungText({type:"einfassung_rund",data:{...d}}),
   fremd:rbAbweichungText({type:"rinne",data:{...d,zuschnitte:alt}})}});
 p(r.gut==="","Gleicher Zuschnitt: keine Warnung",r.gut);
 p(/Gespeichert ist/.test(r.alt)&&r.alt.includes((r.l-5)+" × 248")&&r.alt.includes(r.l+" × 248"),"5 mm Abweichung: Warnung nennt gespeicherten und aktuellen Wert",r.alt);
 p(/Zuschnitt veraltet/.test(r.html)&&/neu speichern/.test(r.html),"Die Warnung sagt, was zu tun ist",r.html);
 p(r.altformat===""&&r.ohne===""&&r.fremd==="","Altes Datenformat, fehlender Zuschnitt, andere Art: keine falsche Warnung",r);
 r=await ev(()=>{const e={a:110,b:340,c:60,anzahl:1,winkel:0,durchmesser:28};const d={einfassungen:[e],deckung:"schiebeziegel",lattenabstand:350};
  const zs=einfaZuschnitte(d).map(x=>({laenge:x.laenge,breite:x.breite}));
  const m={id:5,type:"einfassung_rund",title:"T",data:{...d,zuschnitte:zs.map(x=>({...x,laenge:x.laenge-5}))}};
  return rbBlattHtml(m,{kopf:true}).includes("rb-abweichung")});
 p(r,"Das Blatt (rbBlattHtml) zeigt die Warnung tatsächlich");

 console.log("\nE · Alle Speicherstellen melden firmenweit");
 const src=f=>fs.readFileSync(f,"utf8");
 const alle=["js/07-einstellungen.js","js/20-anschlussblech.js","js/21-einfassung-rund.js","js/26-rinne.js","js/37-kamin-aufnahme.js","js/66-dachfenster-aufnahme.js"].map(src).join("\n");
 p(!/Gespeichert \(gilt nur für dieses Gerät\)\.\\n/.test(alle)&&(alle.match(/Gespeichert \(gilt nur für dieses Gerät\)/g)||[]).length===1,"Nur die reine Anzeige-Einstellung (js/07) sagt noch «nur für dieses Gerät»",(alle.match(/gilt nur für dieses Gerät/g)||[]).length);
 p((alle.match(/await efMelden\(/g)||[]).length===16,"Alle 16 Speichern- und Zurücksetzen-Stellen rufen efMelden auf",(alle.match(/await efMelden\(/g)||[]).length);
 p(/efUebernehmen\(geladen\.appSettings\.massaufnahme_einstellungen\)/.test(src("js/05-daten-laden.js")),"Beim Laden werden die Firmenwerte übernommen (js/05)");
 p(/98-einstellungen-firma\.js/.test(src("index.html"))&&/98-einstellungen-firma\.js/.test(src("sw.js")),"Neue Datei in index.html und sw.js");
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();

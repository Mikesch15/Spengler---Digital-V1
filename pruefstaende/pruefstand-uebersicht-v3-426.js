// v3.426: Übersichtlicher - Mehr neu gruppiert, Suche in den Einstellungen, Funktionen & Ansicht der Firma, gekürzte Erklärtexte.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,600):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1600}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 const ev=(f,...a)=>page.evaluate(f,...a);
 await ev(()=>{window.appAlert=async()=>{};window.__ef=[];window.efMelden=async k=>{window.__ef.push(k);return {}};localStorage.removeItem("sd_firmaAnsicht");uebAnsicht=uebLaden();currentProfile={role:"admin"}});

 console.log("\nA · Mehr neu gruppiert");
 let r=await ev(()=>{const d=document.createElement("div");d.innerHTML=a2SeiteMehr();
  const g={};d.querySelectorAll(".a2-abschnitt").forEach(s=>{g[s.querySelector("h2").textContent]=[...s.querySelectorAll("[data-a2-tu]")].map(x=>x.dataset.a2Tu)});return g});
 p(r.Werkzeuge&&r.Werkzeuge.join()==="abwicklung,zuschnittrechner","Werkzeuge: Abwicklung und Zuschnittrechner in eigener Gruppe",r);
 p(r.Hilfe&&r.Hilfe.join()==="anleitung,feedback","Hilfe: Anleitung und Feedback in eigener Gruppe",r);
 p(r.Arbeiten&&r.Arbeiten.indexOf("suche")>=0&&r.Arbeiten.indexOf("termine")>=0&&r.Arbeiten.indexOf("anleitung")<0,"Arbeiten: Suche und Termine bleiben",r);
 const reihe=await ev(()=>{const d=document.createElement("div");d.innerHTML=a2SeiteMehr();return [...d.querySelectorAll(".a2-abschnitt h2")].map(h=>h.textContent).join(",")});
 p(/^Arbeiten,Werkzeuge,Hilfe/.test(reihe),"Reihenfolge der Gruppen: Arbeiten, Werkzeuge, Hilfe, …",reihe);

 console.log("\nB · Funktionen & Ansicht");
 r=await ev(()=>{renderSettings();const s=document.getElementById("uebAbschnitt");const sel=s?s.querySelectorAll("[data-ueb-gruppe]"):[];
  return {da:!!s,imFirma:!!(s&&s.closest("#protectedContent")),arten:[...sel].filter(x=>x.dataset.uebGruppe==="arten").length,n:Object.keys(MEAS_TYPE_LABELS).length,
   wz:[...sel].filter(x=>x.dataset.uebGruppe==="werkzeuge").map(x=>x.dataset.uebKey).join(),einmal:document.querySelectorAll("#uebAbschnitt").length}});
 await ev(()=>renderSettings());
 const einmal=await ev(()=>document.querySelectorAll("#uebAbschnitt").length);
 p(r.da&&r.imFirma&&r.arten===r.n&&r.arten>10,"Abschnitt im Register «Firma» (nur Administratoren), eine Zeile je Massaufnahme-Art",r);
 p(r.wz==="abwicklung,zuschnittrechner,zaehlwerk"&&einmal===1,"Werkzeuge wählbar; mehrfaches Öffnen baut den Abschnitt nicht doppelt",{wz:r.wz,einmal});
 r=await ev(async()=>{const s=k=>document.querySelector(`#uebAbschnittBody [data-ueb-key="${k}"]`);s("kehle").value="aus";s("lukarne").value="admin";s("zuschnittrechner").value="aus";s("abwicklung").value="admin";
  document.getElementById("uebSpeichern").click();await new Promise(r=>setTimeout(r,50));
  const gesp=JSON.parse(localStorage.getItem("sd_firmaAnsicht"));
  const k=a=>{const x=document.querySelector(`[data-choose-meas-type="${a}"]`);return x?x.hidden:"fehlt"};
  const d=document.createElement("div");d.innerHTML=a2SeiteMehr();const mehr=[...d.querySelectorAll("[data-a2-tu]")].map(x=>x.dataset.a2Tu);
  return {gesp,ef:window.__ef.join(),kehle:k("kehle"),luk:k("lukarne"),rinne:k("einlaufblech_gerade"),zr:mehr.indexOf("zuschnittrechner")>=0,abw:mehr.indexOf("abwicklung")>=0}});
 p(r.gesp.arten.kehle==="aus"&&r.gesp.arten.lukarne==="admin"&&!("einlaufblech_gerade" in r.gesp.arten)&&r.gesp.werkzeuge.zuschnittrechner==="aus","Gespeichert wird nur, was nicht «für alle» ist",r.gesp);
 p(r.ef==="sd_firmaAnsicht","Firmenweit gespeichert (efMelden sd_firmaAnsicht)",r.ef);
 p(r.kehle===true&&r.luk===false&&r.rinne===false,"Admin: «ausgeblendet» fehlt in der Auswahl, «nur Administratoren» bleibt",r);
 p(!r.zr&&r.abw,"Admin: Zuschnittrechner fehlt unter Mehr, Abwicklung (nur Admin) bleibt",r);
 r=await ev(()=>{currentProfile={role:"mitarbeiter"};renderMeasTypeChooser();const k=a=>document.querySelector(`[data-choose-meas-type="${a}"]`).hidden;
  const d=document.createElement("div");d.innerHTML=a2SeiteMehr();const mehr=[...d.querySelectorAll("[data-a2-tu]")].map(x=>x.dataset.a2Tu);
  return {luk:k("lukarne"),kehle:k("kehle"),rinne:k("einlaufblech_gerade"),abw:mehr.indexOf("abwicklung")>=0,werkz:!!d.innerHTML.match(/<h2>Werkzeuge<\/h2>/)}});
 p(r.luk&&r.kehle&&!r.rinne,"Mitarbeiter: auch «nur Administratoren» fehlt; die übrigen Arten bleiben",r);
 p(!r.abw&&!r.werkz,"Mitarbeiter: leere Gruppe «Werkzeuge» verschwindet ganz",r);
 r=await ev(()=>{const kat=measKategorie("kehle");const alle=Object.keys(MEAS_TYPE_LABELS).filter(a=>measKategorie(a)===kat);
  const alt=uebAnsicht;uebAnsicht={arten:Object.fromEntries(alle.map(a=>[a,"aus"])),werkzeuge:{}};renderMeasTypeChooser();
  const sec=document.querySelector(`#measTypeChooserBody [data-section="meastype-${kat}"]`);const h=sec.hidden;uebAnsicht=alt;renderMeasTypeChooser();return {h,danach:document.querySelector(`#measTypeChooserBody [data-section="meastype-${kat}"]`).hidden}});
 p(r.h===true&&r.danach===false,"Sind alle Arten einer Gruppe ausgeblendet, verschwindet die Gruppe",r);
 r=await ev(()=>{const b=document.querySelector('[data-choose-meas-type="einlaufblech_gerade"]');b.hidden=true;uebAnsichtAnwenden();return b.hidden});
 p(r===true,"Was anderswo versteckt ist (Modul im Test), wird nie eingeblendet",r);
 r=await ev(()=>{localStorage.setItem("sd_firmaAnsicht",JSON.stringify({arten:{kehle:"quatsch",lukarne:"aus"},werkzeuge:"x"}));const a=uebLaden();return a});
 p(!("kehle" in r.arten)&&r.arten.lukarne==="aus"&&JSON.stringify(r.werkzeuge)==="{}","Unbekannte Werte werden ignoriert",r);
 r=await ev(()=>{efUebernehmen({sd_firmaAnsicht:{arten:{einfassung_rund:"aus"},werkzeuge:{}}});return {a:uebAnsicht.arten.einfassung_rund,h:document.querySelector('[data-choose-meas-type="einfassung_rund"]').hidden,kehle:document.querySelector('[data-choose-meas-type="kehle"]').hidden}});
 p(r.a==="aus"&&r.h===true&&r.kehle===false,"Beim Laden der Firmeneinstellungen übernommen und gleich angewendet",r);
 r=await ev(()=>{const t=Object.keys(MEAS_TYPE_LABELS);return typeof openMeasurementForm==="function"||true});
 const src=fs.readFileSync("js/107-uebersicht.js","utf8");
 p(!/\.delete\(|\.update\(|\.insert\(/.test(src)&&!/sb\.from/.test(src),"Nur Anzeige: js/107 schreibt nichts selbst in die Datenbank (nur über efMelden)",null);
 await ev(()=>{localStorage.removeItem("sd_firmaAnsicht");uebAnsicht=uebLaden();currentProfile={role:"admin"};renderMeasTypeChooser()});

 console.log("\nC · Suche in den Einstellungen");
 r=await ev(()=>{document.getElementById("settingsModal").hidden=false;renderSettings();const s=document.getElementById("uebSuche");s.value="nahtüberlappung";s.dispatchEvent(new Event("input",{bubbles:true}));
  const sicht=[...document.querySelectorAll("#settingsModal .settings-section")].filter(x=>!x.hidden&&!x.closest(".settings-tab-panel[hidden]")).map(x=>x.dataset.section);
  return {sicht,info:document.getElementById("uebSucheInfo").textContent,offen:document.querySelector('[data-section="rinne"]').classList.contains("open")}});
 p(r.sicht.join()==="rinne"&&r.offen&&/1 Abschnitt gefunden/.test(r.info),"«nahtüberlappung» findet nur den Abschnitt Dachrinne und klappt ihn auf",r);
 r=await ev(()=>{const s=document.getElementById("uebSuche");s.value="stundenans";s.dispatchEvent(new Event("input",{bubbles:true}));
  return [...document.querySelectorAll("#settingsModal .settings-section")].filter(x=>!x.hidden&&!x.closest(".settings-tab-panel[hidden]")).map(x=>x.dataset.section).join()});
 p(/rates/.test(r),"Admin: findet auch im Register «Firma» (Stundenansätze)",r);
 r=await ev(()=>{currentProfile={role:"mitarbeiter"};document.getElementById("protectedTabBtn").hidden=true;const s=document.getElementById("uebSuche");s.value="stundenans";s.dispatchEvent(new Event("input",{bubbles:true}));
  const x=[...document.querySelectorAll("#settingsModal .settings-section")].filter(x=>!x.hidden&&!x.closest(".settings-tab-panel[hidden]")).map(x=>x.dataset.section).join();
  currentProfile={role:"admin"};return {x,info:document.getElementById("uebSucheInfo").textContent}});
 p(r.x===""&&/Nichts gefunden/.test(r.info),"Ohne Adminrecht: Register «Firma» wird nicht durchsucht",r);
 r=await ev(()=>{document.querySelector('[data-settings-tab="lager"]').click();const s=document.getElementById("uebSuche");s.value="";s.dispatchEvent(new Event("input",{bubbles:true}));
  return {panels:[...document.querySelectorAll("#settingsModal .settings-tab-panel")].filter(p=>!p.hidden).map(p=>p.dataset.settingsPanel).join(),versteckt:[...document.querySelectorAll("#settingsModal .settings-section")].filter(x=>x.hidden&&x.id!=="vorlagenKarte").length,info:document.getElementById("uebSucheInfo").hidden}});
 p(r.panels==="lager"&&r.versteckt===0&&r.info,"Suchfeld leeren: das gewählte Register erscheint wieder, alle Abschnitte zurück",r);

 console.log("\nD · Lange Erklärtexte");
 r=await ev(async()=>{const m=document.getElementById("measurementEditModal");const d=document.createElement("div");
  d.innerHTML='<div class="info" id="uebL">'+"Sehr lange Erklärung. ".repeat(20)+'</div><div class="info" id="uebK">Kurz.</div>';m.appendChild(d);
  await new Promise(r=>setTimeout(r,120));const L=document.getElementById("uebL");
  const a={kurz:L.classList.contains("ueb-kurz"),knopf:!!(L.nextElementSibling&&L.nextElementSibling.classList.contains("ueb-mehr")),k:document.getElementById("uebK").classList.contains("ueb-kurz")};
  L.nextElementSibling.click();a.auf=!L.classList.contains("ueb-kurz");a.txt=L.nextElementSibling.textContent;d.remove();return a});
 p(r.kurz&&r.knopf&&!r.k,"Lange Erklärung gekürzt mit «mehr ▾», kurze bleibt unverändert",r);
 p(r.auf&&r.txt==="weniger ▴","«mehr» klappt auf",r);
 r=await ev(async()=>{localStorage.setItem("sd_erklaerungenGanz","ja");const m=document.getElementById("measurementEditModal");const d=document.createElement("div");
  d.innerHTML='<div class="info" id="uebL2">'+"Sehr lange Erklärung. ".repeat(20)+'</div>';m.appendChild(d);await new Promise(r=>setTimeout(r,120));
  const x=document.getElementById("uebL2").classList.contains("ueb-kurz");d.remove();localStorage.removeItem("sd_erklaerungenGanz");return {x,schalter:!!document.querySelector('[data-section="anzeige"] #uebGanz')}});
 p(!r.x&&r.schalter,"Geräte-Schalter (Einstellungen → Anzeige): Erklärungen immer ganz",r);

 console.log("\nE · Eingebunden");
 const idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 p(idx.indexOf('src="js/107-uebersicht.js"')>idx.indexOf('src="js/98-')&&sw.indexOf('"./js/107-uebersicht.js"')>0,"js/107 in index.html (nach js/98) und in sw.js",null);
 p(page.__f.length===0,"Keine Seitenfehler",page.__f);
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
 if(fail)console.log("FEHLGESCHLAGEN: insgesamt "+fail);
 process.exit(fail?1:0);
})();

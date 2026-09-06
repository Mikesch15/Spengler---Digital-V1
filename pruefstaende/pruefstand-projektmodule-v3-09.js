// Prueft die Schalterarchitektur des erweiterten Projekt-/Material-/
// Werkstattworkflows (v3.09):
//   - Standard AUS fuer neue wie bestehende Firmen,
//   - Hauptschalter gibt die sieben Untermodule frei,
//   - Abhaengigkeiten (Zuschnitt/Reservierung brauchen Material,
//     Serien brauchen Vorlagen) greifen in der Anzeige UND beim Lesen,
//   - gespeichert wird ueber set_projektmodule(), und der Rueckgabewert
//     der Datenbank ist massgeblich, nicht die Anzeige,
//   - ein abgewiesenes Speichern taeuscht keinen Erfolg vor.
//
// WAS HIER GEPRUEFT WIRD: die Oberflaeche und der abgesetzte Aufruf -
// gemessen in echtem Chromium (getComputedStyle, echte Rechtecke, echte
// Klicks), nicht behauptet.
//
// WAS HIER NICHT GEPRUEFT WIRD: ob die Datenbank die Adminpruefung und die
// Abhaengigkeiten durchsetzt. Das ist per SQL gegen das echte
// Produktivschema geprueft (CLAUDE.md 114). Der Schalter in der Oberflaeche
// ist reine Bedienung und KEINE Sicherheitsgrenze.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-projektmodule-v3-09.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

const STUB=`window.__ruf=[];window.__rpcAntwort={data:null,error:null};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});
   return (name==="set_projektmodule")?window.__rpcAntwort:{data:null,error:null}},
 from:()=>{const f={};['select','order','limit','range','eq','in','update','insert','delete'].forEach(k=>f[k]=()=>f);
   f.maybeSingle=async()=>({data:null,error:null});
   f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})}
})};`;

// Sichtbar heisst: es hat wirklich eine Flaeche. Ein Klick auf ein
// unsichtbares Element laesst den Pruefstand sonst haengen, und ein
// abgebrochener Lauf sieht aus wie "keine Fehler" (CLAUDE.md 78).
const sichtbar=(page,sel)=>page.evaluate(s=>{
 const e=document.querySelector(s); if(!e)return false;
 const r=e.getBoundingClientRect();
 return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=="hidden";
},sel);
const klick=async(page,sel,was)=>{
 if(!await sichtbar(page,sel)){p(false,(was||"Element")+" sichtbar und anklickbar ("+sel+")");return false}
 try{await page.click(sel,{timeout:4000});return true}
 catch(e){p(false,(was||"Element")+" anklickbar ("+sel+")",String(e).slice(0,120));return false}
};
const waehle=async(page,sel,wert,was)=>{
 if(!await sichtbar(page,sel)){p(false,(was||"Auswahl")+" sichtbar ("+sel+")");return false}
 try{await page.selectOption(sel,wert,{timeout:4000});return true}
 catch(e){p(false,(was||"Auswahl")+" bedienbar ("+sel+")",String(e).slice(0,120));return false}
};

const einstellungenOeffnen=(page,rolle)=>page.evaluate(r=>{
 currentProfile={id:"aaaa1111-1111-1111-1111-111111111111",role:r,first_name:"P",last_name:"Test"};
 allProfiles=[]; allProjects=[]; meineRechte={admin:r==="admin"}; appSettingsId=1;
 $("appRoot").hidden=false; $("authScreen").hidden=true; $("startScreen").hidden=true;
 $("settingsModal").hidden=false;
 // nur das Register "Allgemein" - renderSettings() wuerde die ganze
 // Einstellungsseite zeichnen und braucht Daten, die hier nichts zur Sache tun
 document.querySelectorAll("#settingsModal .settings-panel").forEach(e=>e.hidden=true);
 const a=document.getElementById("panel-general"); if(a)a.hidden=false;
 if(typeof renderProjektmodule==="function")renderProjektmodule();
},rolle);

// Der gemessene Zustand der Schalterliste.
const stand=page=>page.evaluate(()=>{
 const liste=$("pmListe"), haupt=$("pmHauptInput"), hin=$("pmHinweis");
 const r=liste?liste.getBoundingClientRect():{width:0,height:0};
 const zeilen=[...(liste?liste.querySelectorAll("label.pm-zeile"):[])].map(z=>{
  const cb=z.querySelector("input[type=checkbox]");
  const cr=cb?cb.getBoundingClientRect():{width:0,height:0};
  return {key:cb?cb.dataset.pm:null, an:!!(cb&&cb.checked), gesperrt:!!(cb&&cb.disabled),
   text:(z.innerText||"").replace(/\s+/g," ").trim(),
   grossbuchstaben:getComputedStyle(z).textTransform,
   kastenBreite:Math.round(cr.width), kastenHoehe:Math.round(cr.height)};
 });
 return {
  modul:JSON.parse(JSON.stringify(typeof projektModule==="object"?projektModule:{})),
  hauptWert:haupt?haupt.value:null,
  listeHidden:liste?liste.hidden:null,
  listeDisplay:liste?getComputedStyle(liste).display:null,
  listeHoehe:Math.round(r.height),
  zeilen,
  hinweis:hin?{text:(hin.textContent||"").trim(),hidden:hin.hidden,farbe:getComputedStyle(hin).color}:null,
  aktiv:(typeof pmAktiv==="function")
   ?["material","zuschnitt","reservierung","werkstatt","vorlagen","serien","versionierung"]
     .reduce((a,k)=>{a[k]=pmAktiv(k);return a},{})
   :null,
  haupt:(typeof pmHaupt==="function")?pmHaupt():null
 };
});

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,160)));
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 console.log("\nA · Standard AUS");
 await einstellungenOeffnen(page,"admin");
 let s=await stand(page);
 p(JSON.stringify(s.modul)==="{}"||Object.values(s.modul).every(v=>v!==true),
   "ohne geladenen Stand ist nichts an",s.modul);
 p(s.haupt===false,"pmHaupt() ist false",s.haupt);
 p(s.aktiv&&Object.values(s.aktiv).every(v=>v===false),"pmAktiv() ist fuer alle sieben false",s.aktiv);
 p(s.listeHidden===true&&s.listeHoehe===0,"die Unterschalter sind nicht sichtbar",{h:s.listeHidden,y:s.listeHoehe});
 p(s.listeDisplay==="none","die [hidden]-Regel greift (display none trotz eigener display-Angabe)",s.listeDisplay);
 p(s.hauptWert==="nein","der Hauptschalter steht auf Aus",s.hauptWert);

 console.log("\nB · leerer und unsinniger Stand aus der Datenbank");
 for(const [was,wert] of [["leeres Objekt","{}"],["null","null"],["Text",'"quatsch"'],
                          ["Array","[1,2]"],["nur unbekannte Schluessel",'{"quatsch":true}'],
                          ["Text statt true",'{"haupt":"true","material":"true"}'],
                          // Der eigentliche Fall des Auftrags Abschnitt 2: einzelne
                          // Untermodule an, Hauptschalter aus - dann ist nichts in Betrieb.
                          ["Untermodule an, Hauptschalter aus",'{"material":true,"vorlagen":true,"werkstatt":true,"versionierung":true}']]){
  const r=await page.evaluate(w=>{pmUebernehmen(JSON.parse(w));
    return {m:JSON.parse(JSON.stringify(projektModule)),h:pmHaupt(),
     a:["material","zuschnitt","reservierung","werkstatt","vorlagen","serien","versionierung"].map(pmAktiv)}},wert);
  p(r.h===false&&r.a.every(x=>x===false),was+" ergibt: alles aus",r.m);
 }

 console.log("\nC · Abhaengigkeiten schon beim Lesen");
 let r=await page.evaluate(()=>{pmUebernehmen({haupt:true,zuschnitt:true,reservierung:true,serien:true});
   return {m:JSON.parse(JSON.stringify(projektModule)),zu:pmAktiv("zuschnitt"),res:pmAktiv("reservierung"),ser:pmAktiv("serien")}});
 p(r.zu===false&&r.res===false&&r.ser===false,
   "Zuschnitt/Reservierung ohne Material und Serien ohne Vorlagen sind aus, auch wenn die Datenbank sie mitgibt",r.m);

 console.log("\nD · Hauptschalter gibt die Liste frei");
 await page.evaluate(()=>{pmUebernehmen({haupt:false,material:true,zuschnitt:true});renderProjektmodule()});
 s=await stand(page);
 p(s.listeHidden===true,"Hauptschalter aus: keine Unterschalter sichtbar",s.listeHidden);
 p(s.modul.material===true&&s.modul.zuschnitt===true,
   "die Auswahl bleibt dabei gespeichert (beim Deaktivieren wird nichts geloescht)",s.modul);
 p(s.aktiv.material===false&&s.aktiv.zuschnitt===false,
   "pmAktiv() ist trotzdem false, solange der Hauptschalter aus ist",s.aktiv);

 if(await waehle(page,"#pmHauptInput","ja","Hauptschalter")){
  s=await stand(page);
  p(s.listeHidden===false&&s.listeHoehe>0,"Hauptschalter ein: die Unterschalter erscheinen",{h:s.listeHidden,y:s.listeHoehe});
  p(s.zeilen.length===7,"genau sieben Untermodule",s.zeilen.map(z=>z.key));
  p(s.zeilen.map(z=>z.key).join(",")==="material,zuschnitt,reservierung,werkstatt,vorlagen,serien,versionierung",
    "in der Reihenfolge des Auftrags",s.zeilen.map(z=>z.key));
  p(s.aktiv.material===true&&s.aktiv.zuschnitt===true,
    "die frueher gewaehlten Module sind wieder da",s.aktiv);
  p(s.zeilen.every(z=>z.text.length>30),"jede Zeile hat Name und Erklaerung",s.zeilen.map(z=>z.text.length));
  p(s.zeilen.every(z=>z.grossbuchstaben==="none"),
    "kein GROSSBUCHSTABEN aus der globalen label-Regel",s.zeilen.map(z=>z.grossbuchstaben)[0]);
  p(s.zeilen.every(z=>z.kastenHoehe>=16&&z.kastenHoehe<=26),
    "das Kaestchen ist nicht 40 px hoch (globale input-Regel zurueckgesetzt)",s.zeilen.map(z=>z.kastenHoehe));
 }

 console.log("\nE · Abhaengigkeiten in der Anzeige");
 await page.evaluate(()=>{pmUebernehmen({haupt:true});renderProjektmodule()});
 s=await stand(page);
 const g=k=>s.zeilen.find(z=>z.key===k);
 p(g("zuschnitt").gesperrt&&g("reservierung").gesperrt,
   "ohne Materialuebersicht sind Zuschnitt und Reservierung gesperrt");
 p(g("serien").gesperrt,"ohne Vorlagen sind Serienaufnahmen gesperrt");
 p(!g("material").gesperrt&&!g("werkstatt").gesperrt&&!g("vorlagen").gesperrt&&!g("versionierung").gesperrt,
   "die vier unabhaengigen Module sind bedienbar");
 p(/Braucht/i.test(g("zuschnitt").text),"die gesperrte Zeile nennt ihre Grundlage",g("zuschnitt").text);

 if(await klick(page,'#pmListe input[data-pm="material"]',"Materialuebersicht")){
  s=await stand(page);
  p(!g2(s,"zuschnitt").gesperrt&&!g2(s,"reservierung").gesperrt,
    "mit Materialuebersicht sind Zuschnitt und Reservierung frei");
 }
 await klick(page,'#pmListe input[data-pm="zuschnitt"]',"Zuschnitt");
 s=await stand(page);
 p(s.modul.zuschnitt===true,"Zuschnitt liess sich einschalten",s.modul);
 // Grundlage wieder wegnehmen - das abhaengige Modul muss mitgehen
 await klick(page,'#pmListe input[data-pm="material"]',"Materialuebersicht aus");
 s=await stand(page);
 p(s.modul.material===false&&s.modul.zuschnitt===false&&s.modul.reservierung===false,
   "faellt die Grundlage weg, gehen die abhaengigen Module mit aus",s.modul);

 console.log("\nF · Speichern");
 await page.evaluate(()=>{window.__ruf=[];
  window.__rpcAntwort={data:{haupt:true,material:true,zuschnitt:true,reservierung:false,
    werkstatt:false,vorlagen:false,serien:false,versionierung:false},error:null};
  pmUebernehmen({haupt:true,material:true,zuschnitt:true});renderProjektmodule()});
 await klick(page,"#savePmModule","Speichern");
 await page.waitForTimeout(120);
 let ruf=await page.evaluate(()=>window.__ruf.slice());
 p(ruf.length===1&&ruf[0].name==="set_projektmodule",
   "gespeichert wird ueber set_projektmodule, nicht per direktem UPDATE",ruf);
 p(ruf[0]&&ruf[0].args&&Object.keys(ruf[0].args.p_module).length===8,
   "es werden genau die acht Schluessel gesendet",ruf[0]&&ruf[0].args);
 p(ruf[0]&&Object.values(ruf[0].args.p_module).every(v=>typeof v==="boolean"),
   "nur boolesche Werte",ruf[0]&&ruf[0].args);
 s=await stand(page);
 p(s.hinweis&&!s.hinweis.hidden&&/Gespeichert/.test(s.hinweis.text),"Bestaetigung erscheint",s.hinweis);

 // Der Rueckgabewert der Datenbank ist massgeblich, nicht die Anzeige.
 await page.evaluate(()=>{window.__ruf=[];
  window.__rpcAntwort={data:{haupt:true,material:false,zuschnitt:false,reservierung:false,
    werkstatt:false,vorlagen:false,serien:false,versionierung:false},error:null};
  pmUebernehmen({haupt:true,material:true,zuschnitt:true});renderProjektmodule()});
 await klick(page,"#savePmModule","Speichern mit abweichender Antwort");
 await page.waitForTimeout(120);
 s=await stand(page);
 p(s.modul.material===false&&s.modul.zuschnitt===false,
   "die Antwort der Datenbank ueberschreibt die Anzeige",s.modul);

 console.log("\nG · abgewiesenes Speichern taeuscht keinen Erfolg vor");
 for(const [was,antwort] of [["Fehler der Datenbank",'{"data":null,"error":{"message":"Nur für Firmenadministratoren."}}'],
                             ["0 Zeilen (still blockiert)",'{"data":null,"error":null}']]){
  await page.evaluate(a=>{window.__ruf=[];window.__rpcAntwort=JSON.parse(a);
    pmUebernehmen({haupt:true,material:true});renderProjektmodule()},antwort);
  const vorher=(await stand(page)).modul;
  await klick(page,"#savePmModule",was);
  await page.waitForTimeout(120);
  s=await stand(page);
  const rot=s.hinweis&&/rgb\(\s*(1[0-9][0-9]|2[0-5][0-9])/.test(s.hinweis.farbe);
  p(s.hinweis&&!s.hinweis.hidden&&!/Gespeichert/.test(s.hinweis.text),
    was+": Meldung statt Bestaetigung",s.hinweis&&s.hinweis.text);
  p(!!rot,was+": die Meldung ist rot",s.hinweis&&s.hinweis.farbe);
  p(JSON.stringify(s.modul)===JSON.stringify(vorher),was+": der Stand bleibt unveraendert");
 }

 console.log("\nH · nur ein Administrator kann verstellen");
 await einstellungenOeffnen(page,"employee");
 await page.evaluate(()=>{pmUebernehmen({haupt:true,material:true});renderProjektmodule()});
 let m=await page.evaluate(()=>({
  haupt:$("pmHauptInput").disabled, knopf:$("savePmModule").disabled,
  hinweis:$("pmNurAdmin")?$("pmNurAdmin").hidden:null,
  kaesten:[...$("pmListe").querySelectorAll("input[type=checkbox]")].map(c=>c.disabled)}));
 p(m.haupt===true&&m.knopf===true,"Mitarbeiter: Hauptschalter und Speichern gesperrt",m);
 p(m.kaesten.length===7&&m.kaesten.every(x=>x===true),"Mitarbeiter: alle sieben Kaestchen gesperrt",m.kaesten);
 p(m.hinweis===false,"Mitarbeiter: der Hinweis steht da",m.hinweis);
 await einstellungenOeffnen(page,"admin");
 await page.evaluate(()=>{pmUebernehmen({haupt:true,material:true});renderProjektmodule()});
 m=await page.evaluate(()=>({
  haupt:$("pmHauptInput").disabled, knopf:$("savePmModule").disabled,
  hinweis:$("pmNurAdmin")?$("pmNurAdmin").hidden:null}));
 p(m.haupt===false&&m.knopf===false&&m.hinweis===true,"Administrator: alles bedienbar, kein Hinweis",m);

 console.log("\nH · Info-Knopf");
 const knopf=await page.evaluate(()=>{
  const b=document.querySelector('[data-hilfe="einst-projektmodule"]');
  if(!b)return null;
  const r=b.getBoundingClientRect();
  return {da:true,breite:Math.round(r.width),hoehe:Math.round(r.height),
   label:b.getAttribute("aria-label"),titel:b.getAttribute("title"),
   text:(typeof HILFE_TEXTE==="object"&&HILFE_TEXTE["einst-projektmodule"])?HILFE_TEXTE["einst-projektmodule"].text.length:0};
 });
 p(!!knopf,"der Einstellungsblock hat einen Info-Knopf");
 if(knopf){
  p(knopf.breite>=16&&knopf.breite<=28&&knopf.hoehe>=16&&knopf.hoehe<=28,"er ist richtig gross",knopf);
  p(!!knopf.label&&knopf.label===knopf.titel,"er ist beschriftet",knopf);
  p(knopf.text>200,"die Erklaerung ist ausfuehrlich",knopf.text);
 }
 if(await klick(page,'[data-hilfe="einst-projektmodule"]',"Info-Knopf")){
  await page.waitForTimeout(150);
  const auf=await page.evaluate(()=>{const m=$("hilfeModal");
   return {hidden:m.hidden,titel:($("hilfeTitel").textContent||"").trim(),
    // der Klick darf den Einstellungsblock nicht mit umschalten
    listeHidden:$("pmListe").hidden}});
  p(auf.hidden===false&&/Projekt/i.test(auf.titel),"das Hilfefenster geht auf",auf);
  await page.evaluate(()=>{$("hilfeModal").hidden=true});
 }

 console.log("\nI · Breiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:900});
  await page.evaluate(()=>{pmUebernehmen({haupt:true,material:true,vorlagen:true});renderProjektmodule()});
  const m=await page.evaluate(()=>{
   const l=$("pmListe"); const r=l.getBoundingClientRect();
   const zu=[...l.querySelectorAll("label.pm-zeile")].map(z=>Math.round(z.getBoundingClientRect().right));
   return {rechts:Math.round(r.right),max:zu.length?Math.max(...zu):0,
    scrollt:document.documentElement.scrollWidth>document.documentElement.clientWidth+1};
  });
  p(m.max<=m.rechts+1&&!m.scrollt,w+" px: nichts laeuft seitlich hinaus",m);
 }
 await page.setViewportSize({width:1200,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 await browser.close();
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

function g2(s,k){return s.zeilen.find(z=>z.key===k)||{}}

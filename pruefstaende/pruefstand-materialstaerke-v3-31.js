// v3.31: Materialbestand ohne Mengen, Materialstaerke je Massaufnahme
//
// Der Betrieb hat gemeldet: "bei den materialbestand einstellungen, sind von
// mir aus gesehen keine mengen und laengen und groessen noetig, es dient ja
// ausschliesslich dazu festzulegen welche materialien die firma an lager hat
// ... ausserdem muesste dan in jeder massaufnahme die materialdicke
// zusaetzlich erfasst werden koennen, diese sollte aus genau dieser liste
// geholt werden".
//
// Geprueft wird nicht "es sieht plausibel aus", sondern:
//   - das Lagerformular hat die vier Felder nicht mehr UND sendet sie nicht
//   - alle ZWOELF Arten haben genau ein sichtbares Staerkefeld
//   - die Auswahl kommt ausschliesslich aus dem Materialbestand; fehlt dort
//     etwas, sagt das Feld das, statt eine Zahl zu erfinden
//   - die Staerke ueberlebt Speichern (base + BEIDE Payloads) und Oeffnen
//   - sie macht den Bedarf eindeutig, wo der Bestand mehrere Staerken fuehrt
//   - der projektweite Plan bekommt ausdruecklich KEINE
//   - plan.material ist die ID (bis v3.30 stand dort der NAME - dadurch
//     meldete der Restabgleich in der Werkstatt immer "kein Material")
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-materialstaerke-v3-31.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const fs=require("fs");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 const ATTRAPPE=`window.supabase={createClient:()=>{
  const tabelle=t=>{
   const kette={
    select:()=>kette, eq:(f,v)=>{(kette.__eq=kette.__eq||[]).push([f,v]);return kette},
    order:()=>kette, in:()=>kette, not:()=>kette,
    limit:()=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}),
    maybeSingle:()=>Promise.resolve({data:(window.__einzeln&&window.__einzeln[t])||null,error:null}),
    then:(f)=>Promise.resolve({data:(window.__lese&&window.__lese[t])||[],error:null}).then(f),
    insert:d=>{(window.__schreib=window.__schreib||[]).push({t,op:"insert",d});
      return {select:()=>Promise.resolve({data:(Array.isArray(d)?d:[d]).map((x,i)=>Object.assign({id:900+i},x)),error:null})}},
    upsert:(d,o)=>{(window.__schreib=window.__schreib||[]).push({t,op:"upsert",d,o});
      return {select:()=>Promise.resolve({data:(Array.isArray(d)?d:[d]),error:null})}},
    update:d=>{const eintrag={t,op:"update",d,eq:[]};
      (window.__schreib=window.__schreib||[]).push(eintrag);
      const k2={eq:(f,v)=>{eintrag.eq.push([f,v]);return k2},
        select:()=>{
          // PostgREST gibt nach einem Update die GANZE Zeile zurueck, nicht
          // nur die geschriebenen Felder. Die Attrappe muss das nachbilden,
          // sonst prueft der Pruefstand einen Fall, den es real nicht gibt.
          const id=(eintrag.eq.find(e=>e[0]==="id")||[])[1];
          const basis=(window.__zeileFuer&&window.__zeileFuer(t,id))||{};
          return Promise.resolve({data:window.__updateLeer?[]:
            [Object.assign({},basis,d,{id:id!==undefined?id:1})],
            error:window.__updateFehler?{message:"kaputt"}:null})}};
      return k2},
    delete:()=>({eq:()=>({select:()=>Promise.resolve({data:[{id:1}],error:null})})})
   };
   return kette};
  return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:tabelle, storage:{from:()=>({upload:()=>Promise.resolve({error:null}),
     createSignedUrl:()=>Promise.resolve({data:{signedUrl:"blob:x"},error:null})})},
   rpc:()=>Promise.resolve({data:null,error:null}),
   functions:{invoke:()=>Promise.resolve({data:{ok:true},error:null})}};
 }};`;
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:ATTRAPPE}));
 await page.goto(APP,{waitUntil:"load"});
 // Warten, bis die App wirklich geladen ist - ein zu frueher Zugriff bricht
 // den Lauf ab, und ein abgebrochener Lauf sieht aus wie "keine Fehler".
 await page.waitForFunction(()=>typeof measStaerkeGet==="function"
   &&typeof lagFormularHtml==="function"&&typeof showMeasTypeSection==="function"
   &&typeof buildMeasurementFromForm==="function",null,{timeout:15000});
 await page.waitForTimeout(200);

 const ARTEN=["skizze_foto","einlaufblech_gerade","rinne_halbrund","einlaufblech_konisch",
  "freies_profil","mauerabdeckung","lukarne","anschlussblech","einfassung_rund",
  "kehle","rinne","kamineinfassung"];

 await page.evaluate(arten=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"f1"};
  allProfiles=[{id:"u1",first_name:"M",last_name:"L"}]; meineRechte={admin:true};
  allProjects=[{id:7,name:"Testbau",object:"Musterweg 1",order_no:"1"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  settings={materials:[["103.01","Titanzinkblech blank","0.70","m²","12"]],rates:[]};
  materialIds=[36];
  blechRollenbreiten=[1000]; blechSchnittfuge=0;
  restMindestlaenge=1000; restMindestbreite=100;
  appSettingsId=1; window.__schreib=[]; window.__lese={};
  projektModule={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;
  // Ohne geoeffnetes Formular ist offsetParent null - dann waere jede
  // Sichtbarkeitsmessung trivial "nicht da".
  $("measurementEditModal").hidden=false;
  reststuecke=[]; restVerwendet=[]; resteImZuschnitt=false;
  // Der Materialbestand: fuer Titanzink genau eine Staerke, fuer Kupfer zwei.
  lagerbestand=[
   {id:1,material_id:2,staerke_mm:0.7,ausfuehrung:"blank",bezeichnung:"Titanzink 0.7 blank"},
   {id:2,material_id:3,staerke_mm:0.6,ausfuehrung:"blank",bezeichnung:"Kupfer 0.6"},
   {id:3,material_id:3,staerke_mm:0.8,ausfuehrung:"blank",bezeichnung:"Kupfer 0.8"}
  ];
  window.__arten=arten;
  // Das sichtbare Staerkefeld der gerade gezeigten Art.
  window.__staerkeFeld=()=>{
   const alle=[...document.querySelectorAll("[data-meas-staerke]")];
   return alle.filter(e=>e.offsetParent!==null);
  };
 },ARTEN);

 // =========================================================== A
 console.log("A · Materialbestand ohne Mengen, Laengen und Groessen");
 const a1=await page.evaluate(()=>{
  const h=lagFormularHtml({});
  return {laenge:/lag_laenge/.test(h),breite:/lag_breite/.test(h),
          menge:/lag_menge/.test(h),einheit:/lag_einheit/.test(h),
          material:/lag_material/.test(h),staerke:/lag_staerke/.test(h),
          ausf:/lag_ausfuehrung/.test(h),
          zweck:/welche<\/b> Materialien die Firma/.test(h)};
 });
 p(!a1.laenge&&!a1.breite&&!a1.menge&&!a1.einheit,"Formular hat weder Laenge, Breite, Menge noch Einheit",a1);
 p(a1.material&&a1.staerke&&a1.ausf,"Materialart, Staerke und Ausfuehrung sind geblieben",a1);
 p(a1.zweck,"der Erklaertext sagt, wofuer die Liste da ist",a1);

 const a2=await page.evaluate(async()=>{
  window.__schreib=[];
  lagFormularOeffnen({});
  $("lag_material").value="2"; $("lag_staerke").value="0.7";
  $("lag_ausfuehrung").value="blank";
  await lagSpeichern();
  const s=(window.__schreib||[]).filter(x=>x.t==="lagerbestand");
  return {anzahl:s.length,schluessel:s.length?Object.keys(s[0].d):[]};
 });
 p(a2.anzahl===1,"genau ein Schreibvorgang",a2);
 p(!a2.schluessel.some(k=>["laenge_mm","breite_mm","menge","einheit"].indexOf(k)>=0),
   "keiner der vier Schluessel wird gesendet",a2);
 p(a2.schluessel.indexOf("company_id")<0,"nie eine company_id vom Client",a2);
 p(a2.schluessel.indexOf("staerke_mm")>=0,"die Staerke wird gesendet",a2);

 const a3=await page.evaluate(()=>lagBeschreibung(
   {bezeichnung:"Titanzink",staerke_mm:0.7,ausfuehrung:"blank",
    laenge_mm:2000,breite_mm:1000,menge:5,einheit:"Tafel"}));
 p(a3==="Titanzink · 0,7 mm · blank","die Zeile nennt keine Menge und keine Groesse mehr",a3);

 // =========================================================== B
 console.log("\nB · Ein Staerkefeld in allen zwoelf Arten");
 const b1=await page.evaluate(async arten=>{
  const raus={};
  for(const t of arten){
   $("measType").value=t;
   showMeasTypeSection(t);
   await new Promise(r=>setTimeout(r,60));
   measStaerkeFelderSetzen();
   const sicht=__staerkeFeld();
   const block=sicht.length?sicht[0].closest("[data-meas-staerke-block]"):null;
   raus[t]={anzahl:sicht.length,
            info:!!(block&&block.querySelector('[data-hilfe="meas-staerke"]'))};
  }
  return raus;
 },ARTEN);
 const fehlend=Object.keys(b1).filter(t=>b1[t].anzahl!==1);
 p(fehlend.length===0,"jede der zwoelf Arten hat genau EIN sichtbares Staerkefeld",
   fehlend.length?fehlend.map(t=>t+":"+b1[t].anzahl):b1);
 const ohneInfo=Object.keys(b1).filter(t=>!b1[t].info);
 p(ohneInfo.length===0,"und an jedem haengt der Info-Knopf",ohneInfo);

 const b2=await page.evaluate(async()=>{
  $("measType").value="einlaufblech_gerade"; showMeasTypeSection("einlaufblech_gerade");
  await new Promise(r=>setTimeout(r,60));
  const setz=v=>{const f=$("eba_material"); f.value=v;
    f.dispatchEvent(new Event("change",{bubbles:true}));};
  const lies=()=>{const s=__staerkeFeld()[0];
    if(!s)return {opt:[],hinweis:"",fehlt:true};
    return {opt:[...s.options].map(o=>o.text),
            hinweis:(s.parentElement.querySelector(".small")||{}).textContent||""}};
  setz("2"); const titan=lies();
  setz("3"); const kupfer=lies();
  setz("");  const ohne=lies();
  // Ein Material, das der Materialbestand nicht fuehrt. Die Option muss
  // wirklich im Feld stehen - sonst bliebe value leer und geprueft waere
  // der Fall "kein Material" statt "Material ohne Lagereintrag".
  measurementMaterials.push({id:9,name:"Aluminium"});
  const opt=document.createElement("option"); opt.value="9"; opt.textContent="Aluminium";
  $("eba_material").appendChild(opt);
  setz("9"); const nichts=lies();
  return {titan,kupfer,ohne,nichts};
 });
 p(b2.titan.opt.length===2&&b2.titan.opt[1]==="0,7 mm",
   "Titanzink bietet genau die eine hinterlegte Staerke",b2.titan);
 p(b2.kupfer.opt.length===3&&b2.kupfer.opt[1]==="0,6 mm"&&b2.kupfer.opt[2]==="0,8 mm",
   "Kupfer bietet beide hinterlegten Staerken, aufsteigend",b2.kupfer);
 p(b2.ohne.opt.length===1&&/zuerst das Material/i.test(b2.ohne.hinweis),
   "ohne Material keine Auswahl, dafuer ein Hinweis",b2.ohne);
 p(b2.nichts.opt.length===1&&/keine Stärke hinterlegt/i.test(b2.nichts.hinweis),
   "Material ohne Lagereintrag: ehrlicher Hinweis statt erfundener Zahl",b2.nichts);

 const b3=await page.evaluate(async()=>{
  $("eba_material").value="2";
  $("eba_material").dispatchEvent(new Event("change",{bubbles:true}));
  measStaerkeSetzen(1.5);          // eine Staerke, die der Bestand nicht fuehrt
  const s=__staerkeFeld()[0];
  if(!s)return {opt:[],wert:"",gemerkt:measStaerkeGet(),fehlt:true};
  return {opt:[...s.options].map(o=>o.text),wert:s.value,gemerkt:measStaerkeGet()};
 });
 p(/nicht im Materialbestand/.test(b3.opt.join("|"))&&b3.gemerkt===1.5,
   "ein gespeicherter Wert ausserhalb des Bestands bleibt sichtbar und wird gekennzeichnet",b3);

 // =========================================================== C
 console.log("\nC · Speichern und Oeffnen");
 const c1=await page.evaluate(async arten=>{
  const raus={};
  for(const t of arten){
   $("measType").value=t; showMeasTypeSection(t);
   await new Promise(r=>setTimeout(r,40));
   measStaerkeSetzen(0.7);
   raus[t]=buildMeasurementFromForm().staerke_mm;
  }
  return raus;
 },ARTEN);
 const ohneFeld=Object.keys(c1).filter(t=>c1[t]!==0.7);
 p(ohneFeld.length===0,"buildMeasurementFromForm traegt die Staerke bei ALLEN zwoelf Arten",
   ohneFeld.length?ohneFeld.map(t=>t+":"+c1[t]):"0.7 ueberall");

 const c2=await page.evaluate(()=>{
  const s=fetch;   // nur damit der Linter ruhig ist
  const quelle=document.querySelector('script[src*="16-massaufnahme"]');
  return {online:0,offline:0,quelle:!!quelle};
 });
 // Die beiden Payloads werden am Quelltext geprueft - sie entstehen nur im
 // echten Speicherweg, und der laeuft hier nicht gegen eine Datenbank.
 const c3=fs.readFileSync("js/16-massaufnahme-formular.js","utf8");
 p((c3.match(/staerke_mm:form\.staerke_mm/g)||[]).length===2,
   "beide Payloads (online und offline) tragen die Staerke",
   (c3.match(/staerke_mm:form\.staerke_mm/g)||[]).length);
 p(/staerke_mm:\(typeof measStaerkeGet==="function"\)/.test(c3),
   "und sie steht in base - eine Stelle, nicht zwoelf");

 const c4=await page.evaluate(async()=>{
  const m={id:5,type:"einlaufblech_gerade",title:"t",date:"2026-09-08",project_id:7,
           data:{material:2},staerke_mm:0.8,photo_paths:[],sketch_paths:[]};
  openMeasurement(m); await new Promise(r=>setTimeout(r,120));
  const nach=measStaerkeGet();
  const ohne=Object.assign({},m,{id:6}); delete ohne.staerke_mm;
  openMeasurement(ohne); await new Promise(r=>setTimeout(r,120));
  const leer=measStaerkeGet();
  newMeasurementWithType("einlaufblech_gerade"); await new Promise(r=>setTimeout(r,120));
  return {nach,leer,neu:measStaerkeGet()};
 });
 p(c4.nach===0.8,"Oeffnen fuellt die gespeicherte Staerke",c4);
 p(c4.leer===null,"ein Datensatz ohne Staerke bekommt keine angedichtet",c4);
 p(c4.neu===null,"eine neue Massaufnahme startet ohne Staerke",c4);

 // =========================================================== D
 console.log("\nD · Die Staerke macht den Bedarf eindeutig");
 const d1=await page.evaluate(()=>{
  // Titanzink fuehrt der Bestand nur in 0,7 - da ist er schon ohne Angabe klar.
  const t=restBedarfMerkmale(2,null);
  // Kupfer fuehrt er in 0,6 UND 0,8 - ohne Angabe ist das mehrdeutig.
  const kOhne=restBedarfMerkmale(3,null);
  const k06=restBedarfMerkmale(3,0.6);
  const k08=restBedarfMerkmale(3,0.8);
  const k09=restBedarfMerkmale(3,0.9);
  return {t:{e:t.eindeutig,s:t.merkmale&&t.merkmale.staerke},
          kOhne:{e:kOhne.eindeutig,g:kOhne.grund,n:kOhne.gefunden.length},
          k06:{e:k06.eindeutig,s:k06.merkmale&&k06.merkmale.staerke},
          k08:{e:k08.eindeutig,s:k08.merkmale&&k08.merkmale.staerke},
          k09:{e:k09.eindeutig,g:k09.grund,n:k09.gefunden.length}};
 });
 p(d1.t.e===true&&d1.t.s===0.7,"eine einzige Staerke im Bestand: schon ohne Angabe eindeutig",d1.t);
 p(d1.kOhne.e===false&&d1.kOhne.g==="mehrdeutig"&&d1.kOhne.n===2,
   "zwei Staerken im Bestand ohne Angabe: mehrdeutig, beide werden genannt",d1.kOhne);
 p(d1.k06.e===true&&d1.k06.s===0.6,"mit 0,6 mm wird der Bedarf eindeutig",d1.k06);
 p(d1.k08.e===true&&d1.k08.s===0.8,"mit 0,8 mm ebenso - und zwar auf die ANDERE",d1.k08);
 p(d1.k09.e===false&&d1.k09.g==="staerke-nicht-im-lager"&&d1.k09.n===2,
   "eine Staerke, die der Bestand nicht fuehrt: kein Ersatz, sondern eine Ansage",d1.k09);

 const d2=await page.evaluate(async()=>{
  // Zwei Reste Kupfer: einer 0,6 - einer 0,8. Gefragt ist 0,6.
  reststuecke=[
   {id:11,material_id:3,staerke_mm:0.6,ausfuehrung:"blank",laenge_mm:3000,breite_mm:600,verbraucht:false},
   {id:12,material_id:3,staerke_mm:0.8,ausfuehrung:"blank",laenge_mm:3000,breite_mm:600,verbraucht:false}
  ];
  resteImZuschnitt=true;
  const bleche=[{nr:1,laenge:1200},{nr:2,laenge:1200}];
  measStaerkeSetzen(0.6);
  const mit=ebaVorabzug(bleche,{material:3,abwicklung:250});
  measStaerkeSetzen(0.8);
  const acht=ebaVorabzug(bleche,{material:3,abwicklung:250});
  measStaerkeSetzen(null);
  const ohne=ebaVorabzug(bleche,{material:3,abwicklung:250});
  measStaerkeSetzen(0.9);
  const falsch=ebaVorabzug(bleche,{material:3,abwicklung:250});
  measStaerkeSetzen(null); resteImZuschnitt=false;
  const ids=v=>(v.ausResten||[]).map(x=>x.rest&&x.rest.id);
  return {mit:ids(mit),acht:ids(acht),ohne:{n:(ohne.ausResten||[]).length,g:ohne.grund},
          falsch:{n:(falsch.ausResten||[]).length,g:falsch.grund}};
 });
 p(d2.mit.length===1&&d2.mit[0]===11,"bei 0,6 mm wird der 0,6er Rest genommen",d2);
 p(d2.acht.length===1&&d2.acht[0]===12,"bei 0,8 mm der 0,8er - nicht der andere",d2);
 p(d2.ohne.n===0&&d2.ohne.g==="mehrdeutig",
   "ohne Angabe wird gar kein Rest genommen, statt einen zu raten",d2.ohne);
 p(d2.falsch.n===0&&d2.falsch.g==="staerke-nicht-im-lager",
   "eine nicht gefuehrte Staerke nimmt ebenfalls nichts",d2.falsch);

 const d3=fs.readFileSync("js/49-projekt-zuschnitt.js","utf8");
 p(/staerke:null/.test(d3),
   "der projektweite Plan bekommt ausdruecklich KEINE Staerke (er umfasst mehrere Massaufnahmen)");
 const d3b=fs.readFileSync("js/29-einlaufblech-aufnahme.js","utf8");
 p(/k\.staerke===undefined&&typeof measStaerkeGet==="function"/.test(d3b),
   "und ebaVorabzug fuellt sie nur, wenn der Aufrufer nichts gesagt hat");

 const d4=await page.evaluate(async()=>{
  window.__schreib=[];
  const plan={art:"rolle",streifenbreiten:[250],staerkeFuer:0.6,
    gruppen:[{streifen:[{stuecke:[{nr:1,laenge:1200}],rest:2000}],abschnittLaenge:3200,
              breite:250,streifenJeAbschnitt:4,abschnitte:1,rollenBreite:1000}],
    bestes:{rollenBreite:1000,rollenLaenge:3200,restBreite:0}};
  const h=restBlockHtml(plan,3);
  const m=h.match(/data-rest-einlagern="([^"]*)"/);
  const daten=m?JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,"&")):null;
  return {hatKnopf:!!m,s:daten?daten.s:undefined};
 });
 p(d4.hatKnopf&&d4.s===0.6,"ein einzulagernder Rest traegt die Staerke des Plans mit",d4);

 // =========================================================== E
 console.log("\nE · plan.material ist die ID, nicht der Name");
 const e1=await page.evaluate(()=>{
  const m={id:5,type:"einlaufblech_gerade",project_id:7,staerke_mm:0.7,
   data:{material:2,abwicklung:250,
     rollen:{abwicklung:250,abschnittLaenge:2100,rollenLaenge:2100,jeAbschnitt:4,abschnitte:1,
       streifen:[{stuecke:[{nr:1,laenge:2000,breite:250}],rest:100}]}}};
  const p1=pmatPlanFuer(m);
  return p1?{material:p1.material,name:p1.materialName,text:p1.materialText,st:p1.staerkeFuer}:null;
 });
 p(e1&&e1.material===2,"plan.material ist die Material-ID (bis v3.30 stand dort der Name)",e1);
 p(e1&&e1.name==="Titanzink","der lesbare Name steht daneben",e1);
 p(e1&&e1.text==="Titanzink · 0,7 mm","und Material samt Staerke als ein Text",e1);
 p(e1&&e1.st===0.7,"die Staerke der Massaufnahme reist am Plan mit",e1);

 const e2=await page.evaluate(()=>{
  const m={id:5,type:"einlaufblech_gerade",project_id:7,staerke_mm:0.7,
   data:{material:2,abwicklung:250,
     rollen:{abwicklung:250,abschnittLaenge:2100,rollenLaenge:2100,jeAbschnitt:4,abschnitte:1,
       streifen:[{stuecke:[{nr:1,laenge:2000,breite:250}],rest:100}]}}};
  const pl=pmatPlanFuer(m);
  if(!pl)return {keinPlan:true};
  reststuecke=[{id:21,material_id:2,staerke_mm:0.7,ausfuehrung:"blank",
                laenge_mm:2500,breite_mm:400,verbraucht:false}];
  const h=restBlockHtml(pl,pl.material);
  reststuecke=[];
  return {ohneMaterial:/kein Material/.test(h),passend:/Aus dem Reststücke-Lager/.test(h)};
 });
 p(!e2.ohneMaterial&&e2.passend,
   "der Restabgleich findet das Material jetzt - bis v3.30 meldete er immer 'kein Material'",e2);

 // =========================================================== F
 console.log("\nF · Material und Staerke stehen dort, wo gerichtet wird");
 const f1=await page.evaluate(()=>{
  return {a:measStaerkeText(0.7),b:measStaerkeText(0.75),c:measStaerkeText(null),d:measStaerkeText("")};
 });
 p(f1.a==="0,7 mm"&&f1.b==="0,75 mm","die Staerke wird schweizerisch geschrieben",f1);
 p(f1.c===""&&f1.d==="","ohne Wert steht dort nichts - keine erfundene Null",f1);

 const f2=fs.readFileSync("js/51-werkstatt.js","utf8");
 p(/plan\.materialText/.test(f2),"die Werkstatt-Karte nennt Material und Staerke");
 const f3=fs.readFileSync("js/58-ruestliste.js","utf8");
 p(/measStaerkeText\(/.test(f3),"die Ruestliste ebenso");
 const f4=fs.readFileSync("js/16-massaufnahme-formular.js","utf8");
 p(/if\(o\.material\)zeilen\.push\(\["Material",o\.material\]\)/.test(f4),
   "und der PDF-Kopf hat dafuer eine eigene Zeile");
 p(/measStaerkeText\(m\.staerke_mm\)/.test(f4),"die aus Material und Staerke entsteht");

 const f5=await page.evaluate(()=>{
  const m={id:5,type:"einlaufblech_gerade",title:"Dach",date:"2026-09-08",project_id:7,
    staerke_mm:0.7,data:{material:2},photo_paths:[],sketch_paths:[]};
  const h=pdfKopfHtml({datensatz:m,projekt:allProjects[0],bezeichnung:"Dach",
    dokumenttyp:"Massaufnahme",unterart:"Einlaufblech gerade",datum:"2026-09-08",
    bearbeiter:"M L",material:"Titanzink · 0,7 mm"});
  return {hat:/Titanzink · 0,7 mm/.test(h),label:/Material:/.test(h)};
 });
 p(f5.hat&&f5.label,"der Kopf des PDF zeigt sie wirklich",f5);

 // =========================================================== G
 console.log("\nG · Bildschirmbreiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:900});
  const g=await page.evaluate(()=>{
   // Die Abschnitte davor haben das Formular geschlossen - ohne offenes
   // Modal ist offsetParent null und jede Messung waere trivial "fehlt".
   $("measurementEditModal").hidden=false;
   $("measType").value="einlaufblech_gerade";
   showMeasTypeSection("einlaufblech_gerade");
   if(typeof measStaerkeFelderSetzen==="function")measStaerkeFelderSetzen();
   const f=[...document.querySelectorAll("[data-meas-staerke]")].filter(e=>e.offsetParent!==null)[0];
   if(!f)return {fehlt:true};
   const r=f.getBoundingClientRect();
   const doc=document.documentElement;
   return {b:Math.round(r.width),h:Math.round(r.height),
           ueber:Math.round(r.right)>doc.clientWidth+1,
           seite:doc.scrollWidth>doc.clientWidth+1};
  });
  p(!g.fehlt&&!g.ueber&&!g.seite&&g.h>=34,"bei "+w+" px: Feld sichtbar, gross genug, kein Ueberlauf",g);
 }
 await page.setViewportSize({width:412,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden"+(fail?"  ("+fail+" FEHLGESCHLAGEN)":""));
 process.exit(fail?1:0);
})();

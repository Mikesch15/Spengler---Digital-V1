// v3.373: Wetter auf der Startseite (Firmenstandort, Standard aus, Open-Meteo ohne Schlüssel).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const heute=new Date();const tag=n=>{const d=new Date(heute.getTime()+n*86400000);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const ANTWORT={daily:{time:[0,1,2,3,4].map(tag),weather_code:[0,61,95,71,3],temperature_2m_max:[18.4,12.1,15,2.5,31],temperature_2m_min:[7.2,6,8,-3.1,15],
 precipitation_sum:[0,5.4,12,3,0],precipitation_probability_max:[5,90,80,70,0],wind_gusts_10m_max:[22,48,80,55,10]}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1200}});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));
 const anfragen=[];let modus="ok";
 await stubSchuetzen(page);
 await page.route(/open-meteo\.com/,r=>{
  const u=r.request().url();anfragen.push(u);
  if(modus==="aus")return r.abort();
  if(/geocoding/.test(u)){
   if(modus==="leer")return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({})});
   return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({results:[{name:"Bern",admin1:"Bern",country_code:"CH",latitude:46.9481,longitude:7.4474},{name:"Bern",admin1:"Sachsen-Anhalt",country_code:"DE",latitude:51.8,longitude:11.6},{name:"Kaputt",latitude:999,longitude:7}]})});
  }
  if(modus==="http500")return r.fulfill({status:500,contentType:"application/json",body:JSON.stringify(ANTWORT)});
  if(modus==="kaputt")return r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({daily:{time:["x"]}})});
  r.fulfill({status:200,contentType:"application/json",body:JSON.stringify(ANTWORT)});
 });
 await page.addInitScript(()=>{
  window.__geo=0;try{Object.defineProperty(navigator,"geolocation",{get(){window.__geo++;return undefined}})}catch(e){}
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:()=>{const q={};['select','eq','order','limit','in','is'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
   storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})};
 });
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};allProfiles=[currentProfile];meineRechte={admin:true};
  $("appRoot").hidden=false;$("authScreen").hidden=true;window.__alerts=[];window.appAlert=async t=>{window.__alerts.push(t)};
  window.__gespeichert=[];window.speichereAppSettings=async f=>{window.__gespeichert.push(f);return {fehler:null}};
 });
 const heuteSeite=()=>page.evaluate(()=>{a2Zustand.seite="heute";return a2SeiteHeute()});

 console.log("\nA · Standard aus: nichts angezeigt, nichts abgefragt");
 const a=await page.evaluate(()=>({aktiv:wetterAktiv,bereit:wetterBereit(),karte:wetterKarteHtml(),heute:/a2Wetter/.test((a2Zustand.seite="heute",a2SeiteHeute()))}));
 p(!a.aktiv&&!a.bereit&&a.karte===""&&!a.heute&&anfragen.length===0,"Ohne Einschalten: keine Karte auf der Startseite, keine Anfrage ins Netz",a);
 await page.evaluate(()=>wetterUebernehmen({wetter_aktiv:true,wetter_ort:"Bern",wetter_lat:null,wetter_lon:null}));
 const a2=await page.evaluate(()=>({bereit:wetterBereit(),karte:wetterKarteHtml()}));
 p(!a2.bereit&&a2.karte===""&&anfragen.length===0,"Eingeschaltet, aber ohne Standort: nichts angezeigt, nichts abgefragt",a2);

 const a3=await page.evaluate(()=>{wetterUebernehmen({wetter_aktiv:false,wetter_ort:"Bern",wetter_lat:46.9481,wetter_lon:7.4474});return {bereit:wetterBereit(),karte:wetterKarteHtml(),heute:/a2Wetter/.test((a2Zustand.seite="heute",a2SeiteHeute()))}});
 p(!a3.bereit&&a3.karte===""&&!a3.heute&&anfragen.length===0,"Standort gespeichert, aber ausgeschaltet: keine Karte, keine Anfrage",a3);

 console.log("\nB · Antwort lesen (rein)");
 const r=await page.evaluate(A=>({
  ok:wetterTageAus(A),leer:wetterTageAus({}),ohneTime:wetterTageAus({daily:{}}),laenge:wetterTageAus({daily:{time:["2026-10-15","2026-10-16"],weather_code:[0],temperature_2m_max:[1,2],temperature_2m_min:[0,0]}}),
  datum:wetterTageAus({daily:{time:["morgen"],weather_code:[0],temperature_2m_max:[1],temperature_2m_min:[0]}}),null:wetterTageAus(null),
  fehlendeWerte:wetterTageAus({daily:{time:["2026-10-15"],weather_code:[0],temperature_2m_max:[null],temperature_2m_min:["x"]}}),
  codes:[0,2,3,45,53,63,73,81,86,96,"x"].map(c=>wetterCodeInfo(c).text)}),ANTWORT);
 p(r.ok&&r.ok.length===5&&r.ok[1].code===61&&r.ok[1].tmax===12.1&&r.ok[3].tmin===-3.1&&r.ok[2].boeen===80,"Gültige Antwort: 5 Tage mit Code, Temperaturen, Regen, Wind",r.ok&&r.ok[1]);
 p(r.leer===null&&r.ohneTime===null&&r.laenge===null&&r.datum===null&&r.null===null,"Leere, unvollständige, längenungleiche Antwort oder Datum ohne Format: null – nichts wird erfunden",r);
 p(r.fehlendeWerte&&r.fehlendeWerte[0].tmax===null&&r.fehlendeWerte[0].tmin===null,"Unlesbare Einzelwerte werden zu „keine Angabe“, nicht zu 0",r.fehlendeWerte);
 p(r.codes.join()==="klar,teils bewölkt,bedeckt,Nebel,Nieselregen,Regen,Schnee,Schauer,Schnee,Gewitter,–","Wettercodes als Text",r.codes);
 const h=await page.evaluate(()=>{const H=t=>wetterHinweise(t).map(x=>x.art+":"+x.text);
  return {ruhig:H({code:0,tmax:18,tmin:7,regen:0,prob:5,boeen:20}),regen:H({code:61,tmax:12,tmin:6,regen:5.4,prob:90,boeen:30}),wahrsch:H({code:3,tmax:12,tmin:6,regen:0.2,prob:60,boeen:30}),
   wind:H({code:3,tmax:12,tmin:6,regen:0,prob:0,boeen:50}),sturm:H({code:3,tmax:12,tmin:6,regen:0,prob:0,boeen:75}),frost:H({code:0,tmax:2,tmin:0,regen:0,prob:0,boeen:0}),
   hitze:H({code:0,tmax:30,tmin:15,regen:0,prob:0,boeen:0}),gewitter:H({code:95,tmax:20,tmin:12,regen:0,prob:0,boeen:0}),leer:H(null),fehlt:H({code:null,tmax:null,tmin:null,regen:null,prob:null,boeen:null})}});
 p(h.ruhig.length===0&&h.fehlt.length===0&&h.leer.length===0,"Ruhiger Tag und fehlende Werte: kein Hinweis",[h.ruhig,h.fehlt]);
 p(h.regen.join()==="hinweis:Regen 5,4 mm"||h.regen.join()==="hinweis:Regen 5.4 mm","Regen ab 1 mm oder 60 % Wahrscheinlichkeit",h.regen);
 p(h.wahrsch.join()==="hinweis:Regen 0,2 mm"||h.wahrsch.join()==="hinweis:Regen 0.2 mm","60 % Regenwahrscheinlichkeit allein genügt",h.wahrsch);
 p(h.wind.join()==="hinweis:Wind bis 50 km/h"&&h.sturm.join()==="warn:Sturmböen 75 km/h","Wind ab 50 km/h Hinweis, Sturmböen ab 75 km/h Warnung",[h.wind,h.sturm]);
 p(h.frost.join()==="hinweis:Frost"&&h.hitze.join()==="hinweis:Hitze"&&h.gewitter.join()==="warn:Gewitter","Frost (≤ 0°), Hitze (≥ 30°), Gewitter (Warnung)",[h.frost,h.hitze,h.gewitter]);

 console.log("\nC · Anzeige und Abfrage");
 await page.evaluate(()=>{localStorage.removeItem("sd_wetter");wetterUebernehmen({wetter_aktiv:true,wetter_ort:"Bern",wetter_lat:46.9481,wetter_lon:7.4474})});
 const html0=await heuteSeite();
 await page.waitForTimeout(400);
 const c=await page.evaluate(()=>({tage:wetterTage&&wetterTage.length,laedt:wetterLaedt}));
 p(/a2Wetter/.test(html0)&&c.tage===5&&!c.laedt&&anfragen.length===1,"Startseite löst genau EINE Abfrage aus und hat danach 5 Tage",{c,n:anfragen.length});
 const u=new URL(anfragen[0]);
 p(u.host==="api.open-meteo.com"&&u.pathname==="/v1/forecast"&&u.searchParams.get("latitude")==="46.9481"&&u.searchParams.get("longitude")==="7.4474"&&u.searchParams.get("forecast_days")==="5"&&/wind_gusts_10m_max/.test(u.searchParams.get("daily"))&&u.searchParams.get("timezone")==="auto"&&![...u.searchParams.keys()].some(k=>/key|token/i.test(k)),"Abfrage: feste Adresse, Koordinaten des Firmenstandorts, 5 Tage, kein Schlüssel",anfragen[0]);
 const dom=await page.evaluate(()=>{const d=document.createElement("div");d.innerHTML=wetterKarteHtml();return {tage:d.querySelectorAll(".a2-wetter-tag").length,ort:/Wetter · Bern/.test(d.textContent),quelle:/Open-Meteo/.test(d.textContent),warn:d.querySelectorAll(".a2-wetter-tag.a2-wetter-warn").length,namen:[...d.querySelectorAll(".a2-wetter-name")].slice(0,2).map(x=>x.textContent),chips:[...d.querySelectorAll(".a2-wetter-chip")].map(x=>x.textContent)}});
 p(dom.tage===5&&dom.ort&&dom.quelle&&dom.namen.join()==="Heute,Morgen","Karte „Wetter · Bern“ mit 5 Tagen (Heute, Morgen, …) und Quellenangabe",dom);
 p(dom.warn===1&&dom.chips.some(x=>/Gewitter/.test(x))&&dom.chips.some(x=>/Sturmböen 80/.test(x))&&dom.chips.some(x=>/Frost/.test(x))&&dom.chips.some(x=>/Hitze/.test(x)),"Gewitter/Sturmböen als Warnung hervorgehoben, Frost und Hitze als Hinweis",dom);
 await page.evaluate(()=>wetterKarteHtml());await page.waitForTimeout(100);
 p(anfragen.length===1,"Erneutes Öffnen innerhalb von 30 Minuten: keine zweite Abfrage (Zwischenspeicher)",anfragen.length);
 await page.evaluate(()=>{wetterStand=Date.now()-31*60*1000;wetterLetzterVersuch=0;wetterKarteHtml()});await page.waitForTimeout(300);
 p(anfragen.length===2,"Nach 30 Minuten: neue Abfrage",anfragen.length);
 modus="aus";
 await page.evaluate(()=>{wetterStand=Date.now()-31*60*1000;wetterLetzterVersuch=0;wetterKarteHtml()});await page.waitForTimeout(400);
 const off=await page.evaluate(()=>({tage:wetterTage&&wetterTage.length,fehler:wetterFehler,html:wetterKarteHtml()}));
 p(off.tage===5&&off.fehler===""&&/Wetter · Bern/.test(off.html),"Ohne Verbindung: der zuletzt geladene Stand bleibt stehen, keine Fehlermeldung statt Daten",off);
 await page.evaluate(()=>{wetterTage=null;wetterStand=0;wetterLetzterVersuch=0;localStorage.removeItem("sd_wetter");wetterKarteHtml()});await page.waitForTimeout(400);
 const keine=await page.evaluate(()=>({tage:wetterTage,html:wetterKarteHtml().replace(/<[^>]+>/g," ")}));
 p(keine.tage===null&&/nicht verfügbar/.test(keine.html),"Ohne Verbindung und ohne Zwischenspeicher: ehrliche Meldung „nicht verfügbar“",keine.html.slice(0,200));
 modus="http500";
 await page.evaluate(()=>{wetterTage=null;wetterStand=0;wetterLetzterVersuch=0;localStorage.removeItem("sd_wetter");wetterKarteHtml()});await page.waitForTimeout(400);
 const h500=await page.evaluate(()=>({tage:wetterTage,fehler:wetterFehler}));
 p(h500.tage===null&&/nicht verfügbar/.test(h500.fehler),"HTTP-Fehler (500) mit lesbarem Inhalt: wird NICHT als Wetter angezeigt",h500);
 modus="kaputt";
 await page.evaluate(()=>{wetterTage=null;wetterStand=0;wetterLetzterVersuch=0;localStorage.removeItem("sd_wetter");wetterKarteHtml()});await page.waitForTimeout(400);
 const kaputt=await page.evaluate(()=>({tage:wetterTage,fehler:wetterFehler}));
 p(kaputt.tage===null&&/nicht verfügbar/.test(kaputt.fehler),"Unlesbare Antwort: keine Daten angezeigt, Meldung",kaputt);
 modus="ok";
 const retry=await page.evaluate(async()=>{wetterTage=null;wetterStand=0;wetterLetzterVersuch=0;localStorage.removeItem("sd_wetter");return null});
 modus="aus";const vorher=anfragen.length;
 await page.evaluate(()=>{wetterKarteHtml();wetterKarteHtml();wetterKarteHtml()});await page.waitForTimeout(400);
 await page.evaluate(()=>{wetterKarteHtml();wetterKarteHtml()});await page.waitForTimeout(200);
 p(anfragen.length-vorher===1,"Nach einem Fehlschlag fragt das Neuzeichnen NICHT dauernd neu ab (höchstens ein Versuch pro Minute)",anfragen.length-vorher);
 modus="ok";
 const zwischen=await page.evaluate(()=>{wetterUebernehmen({wetter_aktiv:true,wetter_ort:"Bern",wetter_lat:46.9481,wetter_lon:7.4474});localStorage.setItem("sd_wetter",JSON.stringify({lat:10,lon:10,ts:Date.now(),tage:[{datum:"2026-10-15",code:0,tmax:1,tmin:0}]}));return wetterCacheLesen()});
 p(zwischen===null,"Zwischenspeicher eines ANDEREN Standorts wird nicht verwendet",zwischen);

 console.log("\nD · Einstellungen");
 await page.evaluate(()=>{wetterUebernehmen({wetter_aktiv:false});});
 const f0=await page.evaluate(()=>({block:!!document.getElementById("wetterBlock"),aktiv:document.getElementById("wetterAktivInput").checked,hinweis:/nicht-kommerzielle/.test(document.getElementById("wetterBlock").textContent),anzeige:document.getElementById("wetterOrtAnzeige").textContent}));
 p(f0.block&&!f0.aktiv&&f0.hinweis&&/Noch kein Standort/.test(f0.anzeige),"Einstellungen: Block „Wetter auf der Startseite“, aus, mit Hinweis zur nicht-kommerziellen Nutzung",f0);
 const setze=(sel,w)=>page.evaluate(([s,v])=>{document.querySelector(s).value=v},[sel,w]);
 await page.evaluate(()=>{document.getElementById("wetterAktivInput").checked=true;document.getElementById("wetterLatInput").value="";document.getElementById("wetterLonInput").value="";window.__alerts=[];window.__gespeichert=[]});
 await page.evaluate(()=>wetterSpeichern());
 const s1=await page.evaluate(()=>({al:window.__alerts.slice(),g:window.__gespeichert.length}));
 p(s1.g===0&&/Standort/.test(s1.al[0]||""),"Einschalten ohne Standort wird abgelehnt (nichts gespeichert)",s1);
 for(const [la,lo] of [["95","7"],["46","200"],["abc","7"]]){
  await setze("#wetterLatInput",la);await setze("#wetterLonInput",lo);
  await page.evaluate(()=>{window.__alerts=[];window.__gespeichert=[];return wetterSpeichern()});
  const s=await page.evaluate(()=>({al:window.__alerts.length,g:window.__gespeichert.length}));
  p(s.g===0&&s.al===1,"Ungültige Koordinaten ("+la+" / "+lo+") werden abgelehnt",s);
 }
 modus="ok";
 await setze("#wetterOrtInput","Bern");
 await page.evaluate(()=>wetterOrtSuchen());await page.waitForTimeout(300);
 const t=await page.evaluate(()=>[...document.querySelectorAll("[data-wetter-treffer]")].map(x=>x.textContent));
 p(t.length===2&&/Bern, Bern, CH/.test(t[0])&&/Sachsen-Anhalt/.test(t[1]),"Ortssuche: Treffer mit Kanton und Land; ein Treffer mit ungültigen Koordinaten wird weggelassen",t);
 await page.evaluate(()=>document.querySelector('[data-wetter-treffer="0"]').click());
 const v=await page.evaluate(()=>({o:document.getElementById("wetterOrtInput").value,la:document.getElementById("wetterLatInput").value,lo:document.getElementById("wetterLonInput").value}));
 p(v.o==="Bern, Bern"&&v.la==="46.9481"&&v.lo==="7.4474","Treffer anklicken übernimmt Ort und Koordinaten",v);
 await page.evaluate(()=>{window.__alerts=[];window.__gespeichert=[];return wetterSpeichern()});
 const sp=await page.evaluate(()=>({g:window.__gespeichert[0],aktiv:wetterAktiv,lat:wetterLat,al:window.__alerts[0]}));
 p(sp.g&&sp.g.wetter_aktiv===true&&sp.g.wetter_lat===46.9481&&sp.g.wetter_lon===7.4474&&sp.g.wetter_ort==="Bern, Bern"&&sp.aktiv&&/Startseite/.test(sp.al),"Speichern schreibt nur die vier Wetterfelder und schaltet ein",sp);
 modus="leer";
 await setze("#wetterOrtInput","Nirgendwo");
 await page.evaluate(()=>wetterOrtSuchen());await page.waitForTimeout(300);
 p(await page.evaluate(()=>/Kein Ort gefunden/.test(document.getElementById("wetterTreffer").textContent)),"Ortssuche ohne Treffer: verständliche Meldung, Koordinaten von Hand möglich");
 modus="aus";
 await page.evaluate(()=>wetterOrtSuchen());await page.waitForTimeout(300);
 p(await page.evaluate(()=>/nicht erreichbar/.test(document.getElementById("wetterTreffer").textContent)),"Ortssuche ohne Verbindung: Meldung statt Fehler");
 modus="ok";

 console.log("\nE · Keine versteckten Abhängigkeiten");
 const q=fs.readFileSync("js/90-wetter.js","utf8"),idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 const hosts=[...new Set((q.match(/https:\/\/[a-z0-9.-]+/g)||[]))].sort();
 p(hosts.join()==="https://api.open-meteo.com,https://geocoding-api.open-meteo.com","Nur zwei feste Adressen im Code: api.open-meteo.com und geocoding-api.open-meteo.com",hosts);
 p(!/geolocation|apikey|api_key|appid|[?&]key=/i.test(q),"Keine Standortabfrage des Geräts, kein Schlüssel im Code");
 p(/js\/90-wetter\.js/.test(idx)&&/js\/90-wetter\.js/.test(sw),"js/90 in index.html UND sw.js");
 p(!/open-meteo/i.test(sw),"Der Service Worker speichert keine Wetter-Antworten (nur die App-Dateien)");
 const g=await page.evaluate(()=>window.__geo);
 p(g===0,"Keine Standortabfrage zur Laufzeit",g);
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();

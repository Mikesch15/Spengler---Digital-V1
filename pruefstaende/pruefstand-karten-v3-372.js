// v3.372: Google-Maps-Erweiterungen (kostenlos, nur normale URLs): Route aus mehreren Projekten, Orte in der Nähe, Street View (ehrlicher Fallback).
// Die Einzel-Navigation aus v3.371 bleibt (pruefstand-navigation-v3-371.js).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1200}});
 const fehler=[];page.on("pageerror",e=>fehler.push(String(e)));
 await stubSchuetzen(page);
 await page.addInitScript(()=>{
  window.__geo=0;try{Object.defineProperty(navigator,"geolocation",{get(){window.__geo++;return undefined}})}catch(e){}
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
   from:()=>{const q={};['select','eq','order','limit','in','is'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
   storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})};
 });
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};allProfiles=[currentProfile];meineRechte={admin:true};
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  window.__PR=(n,o,extra)=>Object.assign({id:n,name:"P"+n,order_no:"A-"+n,customer:"K",object:o,archived:false,status:"aktiv"},extra||{});
 });

 console.log("\nA · Einzel-Navigation (v3.371) bleibt");
 const e1=await page.evaluate(()=>{
  allProjects=[__PR(1,"Teststrasse 1, 3000 Bern")];a2Zustand.seite="projekt";a2Zustand.projektId=1;a2Zustand.reg="uebersicht";
  const d=document.createElement("div");d.innerHTML=a2SeiteProjekt();const a=d.querySelector("[data-a2-navi]");
  return {href:a&&a.getAttribute("href"),text:a&&a.textContent.trim(),target:a&&a.target};
 });
 p(e1.href==="https://www.google.com/maps/dir/?api=1&destination=Teststrasse%201%2C%203000%20Bern"&&e1.text==="Navigation starten"&&e1.target==="_blank","„Navigation starten“ unverändert: gleiche URL, gleicher Text, neuer Tab",e1);

 console.log("\nB · Route aus mehreren Projekten (rein)");
 const r=await page.evaluate(()=>{
  const ps=[__PR(1,"Teststrasse 1, 3000 Bern"),__PR(2,"Bahnhofstr. 12/3, 8001 Zürich"),__PR(3,"Rue de l'Église 5, 1700 Fribourg"),__PR(4,"Hauptgasse 9 & Co., 4500 Solothurn")];
  const mk=n=>Array.from({length:n},(_,i)=>__PR(100+i,"Strasse "+(i+1)+", 3000 Bern"));
  const o=a2RouteUrl(ps);const u=new URL(o.url);
  return {ok:o.ok,url:o.url,host:u.host,pfad:u.pathname,api:u.searchParams.get("api"),origin:u.searchParams.get("origin"),dest:u.searchParams.get("destination"),
   wp:u.searchParams.get("waypoints"),keys:[...u.searchParams.keys()].join(),zw:o.zwischen,
   rev:(()=>{const x=new URL(a2RouteUrl(ps.slice().reverse()).url);return {o:x.searchParams.get("origin"),d:x.searchParams.get("destination"),w:x.searchParams.get("waypoints")}})(),
   zwei:(()=>{const x=a2RouteUrl(ps.slice(0,2));const u2=new URL(x.url);return {ok:x.ok,w:u2.searchParams.get("waypoints"),keys:[...u2.searchParams.keys()].join()}})(),
   eins:a2RouteUrl(ps.slice(0,1)),null:a2RouteUrl([]),
   ohneAdr:a2RouteUrl([ps[0],__PR(9,""),ps[1]]),
   n5:a2RouteUrl(mk(5)),n6:a2RouteUrl(mk(6)),n11:a2RouteUrl(mk(11)),n12:a2RouteUrl(mk(12)),
   gleich:a2RouteUrl([ps[0],ps[1],__PR(7,"teststrasse 1, 3000 bern")]),
   pipe:(()=>{const x=a2RouteUrl([__PR(1,"A|B 1, Bern"),__PR(2,"Mitte 2, Bern"),__PR(3,"Ende 3, Bern")]);const u3=new URL(x.url);return u3.searchParams.get("waypoints")+"#"+u3.searchParams.get("origin")})()};
 });
 p(r.ok&&r.host==="www.google.com"&&r.pfad==="/maps/dir/"&&r.api==="1"&&r.keys==="api,origin,destination,waypoints","Mehrere Projekte: feste Maps-Domain, dir-URL mit api, origin, destination, waypoints",r);
 p(r.origin==="Teststrasse 1, 3000 Bern"&&r.dest==="Hauptgasse 9 & Co., 4500 Solothurn"&&r.wp==="Bahnhofstr. 12/3, 8001 Zürich|Rue de l'Église 5, 1700 Fribourg","Start = erstes, Ziel = letztes, Zwischenstopps in Auswahlreihenfolge (Umlaute, /, ', &, Komma unverändert zurück)",{o:r.origin,d:r.dest,w:r.wp});
 p(!/destination=[^&]*[ &]/.test(r.url.split("?")[1].replace(/&(api|origin|destination|waypoints)=/g,"§$1="))&&/%7C/.test(r.url)&&/%26/.test(r.url)&&/%C3%BC/.test(r.url)&&!/ /.test(r.url),"URL enthält kein rohes Leerzeichen; | → %7C, & → %26, ü → %C3%BC",r.url);
 p(r.rev.o==="Hauptgasse 9 & Co., 4500 Solothurn"&&r.rev.d==="Teststrasse 1, 3000 Bern"&&r.rev.w==="Rue de l'Église 5, 1700 Fribourg|Bahnhofstr. 12/3, 8001 Zürich","Umgekehrte Auswahl ergibt die umgekehrte Route – die App ordnet nichts um oder optimiert",r.rev);
 p(r.zwei.ok&&r.zwei.w===null&&r.zwei.keys==="api,origin,destination","Genau zwei Projekte: Start und Ziel, kein leerer waypoints-Parameter",r.zwei);
 p(!r.eins.ok&&r.eins.url===""&&/mindestens zwei/.test(r.eins.fehler)&&!r.null.ok&&r.null.url==="","Ein oder kein Projekt: Meldung, keine Route",[r.eins.fehler,r.null.fehler]);
 p(!r.ohneAdr.ok&&r.ohneAdr.url===""&&/keine verwertbare Adresse/.test(r.ohneAdr.fehler)&&/P9/.test(r.ohneAdr.fehler),"Projekt ohne Adresse: wird genannt, nicht stillschweigend als Stopp übergeben, keine Route",r.ohneAdr.fehler);
 p(r.n5.ok&&r.n5.warnung===""&&r.n6.ok&&/Smartphone/.test(r.n6.warnung)&&r.n6.zwischen===4,"Bis 3 Zwischenstopps ohne Warnung; ab 4 Warnung (Smartphone), nichts wird abgeschnitten",[r.n5.warnung,r.n6.warnung]);
 p(r.n11.ok&&r.n11.zwischen===9&&!r.n12.ok&&r.n12.url===""&&/Zu viele Stopps/.test(r.n12.fehler),"9 Zwischenstopps (11 Projekte) gehen; 12 Projekte werden NICHT geöffnet, mit Hinweis auf Teilen",[r.n11.zwischen,r.n12.fehler]);
 p(r.gleich.ok&&/dieselbe Adresse/.test(r.gleich.warnung),"Zwei Projekte mit derselben Adresse: Warnung, kein stilles Weglassen",r.gleich.warnung);
 p(r.pipe==="A B 1, Bern#"||r.pipe==="Mitte 2, Bern#A B 1, Bern","Ein „|“ in einer Adresse wird nicht zum falschen Trenner",r.pipe);

 console.log("\nC · Routenplanung in der Projektliste (echter Klick)");
 const ui=await page.evaluate(()=>{
  allProjects=[__PR(1,"Teststrasse 1, 3000 Bern"),__PR(2,"Bahnhofstr. 12, 8001 Zürich"),__PR(3,""),__PR(4,"Hauptgasse 9, 4500 Solothurn")];
  a2Route.an=false;a2Route.ids=[];a2Route.meldung="";
  window.__opened=[];window.open=u=>{window.__opened.push(u);return {}};
  a2Zustand.seite="projekte";a2Zustand.suche="";a2Zeichnen();
  const klick=s=>{const e=document.querySelector(s);if(!e)return "fehlt";e.click();return "ok"};
  const r={};
  r.knopf=!!document.querySelector('[data-a2-route="an"]');r.normalZeilen=document.querySelectorAll("[data-a2-projekt]").length;
  klick('[data-a2-route="an"]');
  r.picks=document.querySelectorAll("[data-a2-route-pick]").length;r.normalNachAn=document.querySelectorAll("[data-a2-projekt]").length;
  r.oeffnenGesperrt=document.querySelector('[data-a2-route="oeffnen"]').disabled;
  klick('[data-a2-route-pick="4"]');klick('[data-a2-route-pick="1"]');
  r.ids1=a2Route.ids.slice();r.nr=[...document.querySelectorAll(".a2-route-gewaehlt .a2-route-nr")].map(x=>x.textContent);
  r.oeffnenFrei=!document.querySelector('[data-a2-route="oeffnen"]').disabled;
  klick('[data-a2-route-pick="3"]');r.ohneAdrIds=a2Route.ids.slice();r.ohneAdrMeldung=a2Route.meldung;
  klick('[data-a2-route-pick="2"]');
  r.ids3=a2Route.ids.slice();
  klick('[data-a2-route="oeffnen"]');
  r.opened=window.__opened.slice();
  klick('[data-a2-route-weg="1"]');r.nachWeg=a2Route.ids.slice();
  klick('[data-a2-route="leeren"]');r.leer=a2Route.ids.length;
  klick('[data-a2-route-pick="1"]');klick('[data-a2-route="oeffnen"]');r.eins=window.__opened.length;r.einsGesperrt=document.querySelector('[data-a2-route="oeffnen"]').disabled;
  a2RouteKlick("oeffnen");r.eins2=window.__opened.length;r.einsMeldung=a2Route.meldung;
  klick('[data-a2-route="aus"]');
  r.aus=!a2Route.an;r.wiederNormal=document.querySelectorAll("[data-a2-projekt]").length;r.geo=window.__geo;
  return r;
 });
 p(ui.knopf&&ui.normalZeilen===4,"Knopf „Route planen“ über der bestehenden Projektliste (kein zweiter Bildschirm)",ui);
 p(ui.picks===4&&ui.normalNachAn===0&&ui.oeffnenGesperrt,"Routenmodus: Tipp wählt statt zu öffnen; „Route öffnen“ ist erst ab zwei Projekten frei",ui);
 p(JSON.stringify(ui.ids1)==="[4,1]"&&JSON.stringify(ui.nr.slice().sort())==="[\"1\",\"2\"]"&&ui.oeffnenFrei,"Auswahlreihenfolge bleibt (4 vor 1) und wird als Nummer angezeigt",ui);
 p(JSON.stringify(ui.ohneAdrIds)==="[4,1]"&&/keine verwertbare Adresse/.test(ui.ohneAdrMeldung),"Projekt ohne Adresse lässt sich nicht wählen, mit verständlicher Meldung",ui);
 const u=await page.evaluate(u=>{const x=new URL(u);return {o:x.searchParams.get("origin"),w:x.searchParams.get("waypoints"),d:x.searchParams.get("destination")}},ui.opened[0]||"https://x/?");
 p(ui.opened.length===1&&u.o==="Hauptgasse 9, 4500 Solothurn"&&u.w==="Teststrasse 1, 3000 Bern"&&u.d==="Bahnhofstr. 12, 8001 Zürich","Klick öffnet GENAU eine Maps-Route in der gewählten Reihenfolge (4 → 1 → 2)",{opened:ui.opened,u});
 p(JSON.stringify(ui.nachWeg)==="[4,2]"&&ui.leer===0,"Einzelne Projekte lassen sich wieder abwählen; „Auswahl leeren“ leert",ui);
 p(ui.eins===1&&ui.eins2===1&&ui.einsGesperrt&&/mindestens zwei/.test(ui.einsMeldung),"Nur ein Projekt gewählt: Knopf gesperrt, auch ein erzwungener Aufruf öffnet nichts und meldet es",ui);
 p(ui.aus&&ui.wiederNormal===4&&ui.geo===0,"„Fertig“ beendet den Modus; Projekte öffnen wieder normal; keine Standortabfrage",ui);

 console.log("\nD · Orte in der Nähe und Street View");
 const o=await page.evaluate(()=>{
  allProjects=[__PR(1,"Teststrasse 1, 3000 Bern"),__PR(2,"")];
  const u=(x,k)=>{const n=new URL(x);return {h:n.host,pfad:n.pathname,api:n.searchParams.get("api"),q:n.searchParams.get("query"),keys:[...n.searchParams.keys()].join()}};
  const s=k=>u(a2OrteUrl(allProjects[0],k),k);
  a2Zustand.seite="projekt";a2Zustand.projektId=1;a2Zustand.reg="uebersicht";
  const d=document.createElement("div");d.innerHTML=a2SeiteProjekt();
  a2Zustand.projektId=2;const d2=document.createElement("div");d2.innerHTML=a2SeiteProjekt();
  const sv=d.querySelector("[data-a2-streetview]");
  return {m:s("metall"),bs:s("baustoff"),e:s("entsorgung"),v:s("verleih"),
   ohne:a2OrteUrl(allProjects[1],"metall"),unbekannt:a2OrteUrl(allProjects[0],"gibtsnicht"),
   labels:[...d.querySelectorAll("[data-a2-ort]")].map(a=>a.textContent.trim()),hrefs:[...d.querySelectorAll("[data-a2-ort]")].map(a=>a.target+"|"+a.rel),
   svHref:sv&&sv.getAttribute("href"),svText:sv&&sv.textContent.trim(),svHinweis:/Koordinaten/.test(d.textContent)&&/Street View/.test(d.textContent),
   svUrl:u(a2StreetViewUrl(allProjects[0])),ohneBlock:{ort:!!d2.querySelector("[data-a2-ort]"),sv:!!d2.querySelector("[data-a2-streetview]"),navi:!!d2.querySelector("[data-a2-navi]")}};
 });
 p(o.m.h==="www.google.com"&&o.m.pfad==="/maps/search/"&&o.m.api==="1"&&o.m.keys==="api,query"&&o.m.q==="Metallhandel Spenglerbedarf nahe Teststrasse 1, 3000 Bern","Suche Metallhandel/Lieferanten: Maps-Such-URL „… nahe <Projektadresse>“",o.m);
 p(o.bs.q==="Baumarkt Baustoffhandel nahe Teststrasse 1, 3000 Bern"&&o.e.q==="Entsorgungsstelle Recycling nahe Teststrasse 1, 3000 Bern"&&o.v.q==="Kranvermietung Gerüstverleih nahe Teststrasse 1, 3000 Bern","Baumarkt/Baustoffhandel, Entsorgung/Recycling und Kran-/Gerüstverleih: erwartete Such-URLs",[o.bs.q,o.e.q,o.v.q]);
 p(o.ohne===""&&o.unbekannt==="","Ohne Adresse oder mit unbekannter Kategorie: kein Link",[o.ohne,o.unbekannt]);
 p(o.labels.join()==="Metallhandel,Baumarkt,Entsorgung,Kran / Gerüst"&&o.hrefs.every(x=>x==="_blank|noopener noreferrer"),"Vier Schaltflächen auf der Projektseite, neuer Tab, noopener noreferrer",[o.labels,o.hrefs]);
 p(o.svUrl.pfad==="/maps/search/"&&o.svUrl.q==="Teststrasse 1, 3000 Bern"&&!/pano|viewpoint|map_action/.test(o.svHref),"Street View: öffnet die KARTE zur Adresse (Such-URL) – keine pano-URL mit erfundenen Koordinaten",o.svUrl);
 p(/Karte/.test(o.svText)&&!/^Street View/.test(o.svText)&&o.svHinweis,"Die Beschriftung sagt ehrlich „Karte“, der Hinweis erklärt, dass Street View dort gewählt wird (direkt braucht Koordinaten)",[o.svText]);
 p(!o.ohneBlock.ort&&!o.ohneBlock.sv&&!o.ohneBlock.navi,"Projekt ohne Adresse: weder Navigation noch Orte noch Street View",o.ohneBlock);

 console.log("\nE · Keine Maps-Platform-API, kein Schlüssel, keine Abhängigkeit");
 const q=fs.readFileSync("js/70-ansicht2.js","utf8"),idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 const maps=q.split("\n").filter(z=>/google/i.test(z)&&!/^\s*\/\//.test(z)).join("\n");
 p(!/maps\.googleapis|AIza|[?&]key=|geocode|places\/|directions\/json|staticmap|\/embed|google\.maps\.|<iframe|geolocation/i.test(q),"Kein API-Endpunkt, kein Schlüssel, kein Geocoding/Places/Directions/Embed/Static, keine Standortabfrage im Code");
 p(/"https:\/\/www\.google\.com\/maps\/"/.test(q)&&(maps.match(/google\.com/g)||[]).length===1,"Es gibt genau EINE feste Google-Maps-Adresse im Code (https://www.google.com/maps/), alles andere sind kodierte Parameterwerte",maps);
 // v3.384: Die App-Hülle enthält die EIGENE Datei js/95-google-kalender.js (Kalender-Abgleich, läuft serverseitig) - sie ist keine Maps-Abhängigkeit.
 p(!/google/i.test(sw.replace("./js/95-google-kalender.js",""))&&!/googleapis|maps\.google|gstatic/i.test(idx),"index.html und sw.js: keine Google-Abhängigkeit, keine neue Datei");
 const netz=await page.evaluate(()=>{window.__f=0;const f=window.fetch;window.fetch=function(){window.__f++;return f.apply(this,arguments)};
  allProjects=[__PR(1,"Teststrasse 1, 3000 Bern"),__PR(2,"Bahnhofstr. 12, 8001 Zürich")];a2Route.an=true;a2Route.ids=[1,2];a2Zustand.seite="projekte";a2Zeichnen();
  a2Zustand.seite="projekt";a2Zustand.projektId=1;a2SeiteProjekt();a2Route.an=false;a2Route.ids=[];return {fetch:window.__f,geo:window.__geo}});
 p(netz.fetch===0&&netz.geo===0,"Anzeigen und Auswählen lösen keinen Netzzugriff und keine Standortabfrage aus",netz);
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();

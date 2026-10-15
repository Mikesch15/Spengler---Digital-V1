// v3.374: Wetter auf der Startseite - Daten von MeteoSchweiz ueber die Edge Function wetter-meteoschweiz, Ort = PLZ der Firmenadresse.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const heute=new Date();const tag=n=>{const d=new Date(heute.getTime()+n*86400000);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const ANTWORT={ok:true,quelle:"MeteoSchweiz",plz:"3063",ort:"Ittigen",tage:[0,1,2,3,4].map((n,i)=>({datum:tag(n),code:[1,17,24,22,3][i],tmax:[18.4,12.1,15,2.5,31][i],tmin:[7.2,6,8,-3.1,15][i],regen:[0,5.4,12,3,0][i]}))};
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
 await page.evaluate(A=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};allProfiles=[currentProfile];meineRechte={admin:true};
  $("appRoot").hidden=false;$("authScreen").hidden=true;window.__alerts=[];window.appAlert=async t=>{window.__alerts.push(t)};
  window.__gespeichert=[];window.speichereAppSettings=async f=>{window.__gespeichert.push(f);return {fehler:null}};
  window.__aufrufe=[];window.__modus="ok";window.__ANTWORT=A;
  sb.functions={invoke:async(name,opt)=>{
   window.__aufrufe.push({name,opt});
   const m=window.__modus;
   if(m==="aus")return {data:null,error:new Error("Failed to send a request to the Edge Function")};
   if(m==="http")return {data:null,error:{message:"Edge Function returned a non-2xx status code",context:{json:async()=>({ok:false,code:"keine_plz",error:"In der Firmenadresse steht keine vierstellige Postleitzahl. Bitte in den Einstellungen ergänzen."})}}};
   if(m==="kaputt")return {data:{ok:true,tage:[{datum:"x"}]},error:null};
   return {data:window.__ANTWORT,error:null};
  }};
  companyAddress="Peter Künzi AG, Worblentalstrasse 12, 3063 Ittigen";
 },ANTWORT);
 const heuteSeite=()=>page.evaluate(()=>{a2Zustand.seite="heute";return a2SeiteHeute()});
 const zurueck=()=>page.evaluate(()=>{wetterTage=null;wetterStand=0;wetterLetzterVersuch=0;wetterFehler="";localStorage.removeItem("sd_wetter_ms")});

 console.log("\nA · Standard aus / ohne Postleitzahl: nichts angezeigt, nichts abgefragt");
 const a=await page.evaluate(()=>({aktiv:wetterAktiv,bereit:wetterBereit(),karte:wetterKarteHtml(),heute:/a2Wetter/.test((a2Zustand.seite="heute",a2SeiteHeute())),n:window.__aufrufe.length}));
 p(!a.aktiv&&!a.bereit&&a.karte===""&&!a.heute&&a.n===0,"Ohne Einschalten: keine Karte, kein Aufruf",a);
 const a2=await page.evaluate(()=>{companyAddress="Worblentalstrasse 12, Ittigen";wetterUebernehmen({wetter_aktiv:true});return {bereit:wetterBereit(),karte:wetterKarteHtml(),n:window.__aufrufe.length}});
 p(!a2.bereit&&a2.karte===""&&a2.n===0,"Eingeschaltet, aber keine Postleitzahl in der Firmenadresse: nichts angezeigt, nichts abgefragt",a2);
 const a3=await page.evaluate(()=>{companyAddress="Hauptstr. 12, 3063 Ittigen";wetterUebernehmen({wetter_aktiv:false});return {bereit:wetterBereit(),karte:wetterKarteHtml(),n:window.__aufrufe.length}});
 p(!a3.bereit&&a3.karte===""&&a3.n===0,"PLZ vorhanden, aber ausgeschaltet: keine Karte, kein Aufruf",a3);

 console.log("\nB · Postleitzahl, Antwort und Codes (rein)");
 const r=await page.evaluate(A=>({
  plz:["Worblentalstr. 1234, 3063 Ittigen","3063 Ittigen","Postfach 12345","ohne","","0123 Test",null].map(x=>wetterPlzAus(x)),
  ok:wetterTageAus(A),leer:wetterTageAus({}),nichtOk:wetterTageAus({ok:false,tage:A.tage}),datum:wetterTageAus({ok:true,tage:[{datum:"morgen"}]}),nul:wetterTageAus(null),
  fehlend:wetterTageAus({ok:true,tage:[{datum:"2026-10-15",code:1,tmax:null,tmin:"x",regen:""}]}),
  texte:[1,2,3,4,5,6,17,20,22,24,26,27,28,35,"x",0].map(c=>wetterCodeInfo(c).text)}),ANTWORT);
 p(r.plz.join("|")==="3063|3063||||" +"|"||r.plz[0]==="3063"&&r.plz[1]==="3063"&&r.plz[2]===null&&r.plz[3]===null&&r.plz[5]===null&&r.plz[6]===null,"Postleitzahl: Hausnummer 1234 verliert gegen „3063 Ittigen“; fünfstellig/ohne/0xxx/leer: keine",r.plz);
 p(r.ok&&r.ok.length===5&&r.ok[1].code===17&&r.ok[1].tmax===12.1&&r.ok[3].tmin===-3.1&&r.ok[2].regen===12,"Gültige Antwort: 5 Tage mit Code, Temperaturen, Regen",r.ok&&r.ok[1]);
 p(r.leer===null&&r.nichtOk===null&&r.datum===null&&r.nul===null,"Leere Antwort, ok:false oder Datum ohne Format: null – nichts wird erfunden",r);
 p(r.fehlend&&r.fehlend[0].tmax===null&&r.fehlend[0].tmin===null&&r.fehlend[0].regen===null,"Unlesbare Einzelwerte werden zu „keine Angabe“, nicht zu 0",r.fehlend);
 p(r.texte.join()==="sonnig,ziemlich sonnig,teilweise sonnig,wechselnd bewölkt,bedeckt,Schauer,Regen,anhaltender Regen,Schnee,gewitterhaft,hohe Bewölkung,Hochnebel,Nebel,wechselhaft,–,–","Piktogramm-Nummern als Text (unbekannte: neutral „wechselhaft“, ungültige: „–“)",r.texte);
 const h=await page.evaluate(()=>{const H=t=>wetterHinweise(t).map(x=>x.art+":"+x.text);
  return {ruhig:H({code:1,tmax:18,tmin:7,regen:0}),regen:H({code:17,tmax:12,tmin:6,regen:5.4}),wenig:H({code:3,tmax:12,tmin:6,regen:0.4}),
   frost:H({code:1,tmax:2,tmin:0,regen:0}),hitze:H({code:1,tmax:30,tmin:15,regen:0}),gewitter:H({code:24,tmax:20,tmin:12,regen:0}),leer:H(null),fehlt:H({code:null,tmax:null,tmin:null,regen:null})}});
 p(h.ruhig.length===0&&h.fehlt.length===0&&h.leer.length===0&&h.wenig.length===0,"Ruhiger Tag, fehlende Werte, unter 1 mm: kein Hinweis",h);
 p(/^hinweis:Regen 5[.,]4 mm$/.test(h.regen.join())&&h.frost.join()==="hinweis:Frost"&&h.hitze.join()==="hinweis:Hitze"&&h.gewitter.join()==="warn:Gewitter","Regen ab 1 mm, Frost (≤ 0°), Hitze (≥ 30°), Gewitter als Warnung",h);

 console.log("\nC · Anzeige und Abfrage über die Edge Function");
 await page.evaluate(()=>{localStorage.removeItem("sd_wetter_ms");window.__aufrufe.length=0;companyAddress="Hauptstr. 12, 3063 Ittigen";wetterUebernehmen({wetter_aktiv:true})});
 const html0=await heuteSeite();
 await page.waitForTimeout(400);
 const c=await page.evaluate(()=>({tage:wetterTage&&wetterTage.length,laedt:wetterLaedt,n:window.__aufrufe.length,name:window.__aufrufe[0]&&window.__aufrufe[0].name,body:JSON.stringify(window.__aufrufe[0]&&window.__aufrufe[0].opt)}));
 p(/a2Wetter/.test(html0)&&c.tage===5&&!c.laedt&&c.n===1&&c.name==="wetter-meteoschweiz","Startseite löst genau EINEN Aufruf von „wetter-meteoschweiz“ aus und hat danach 5 Tage",c);
 p(c.body==='{"body":{}}',"Der Aufruf schickt keine Parameter (PLZ liest der Server selbst aus der Firmenadresse)",c.body);
 const dom=await page.evaluate(()=>{const d=document.createElement("div");d.innerHTML=wetterKarteHtml();return {tage:d.querySelectorAll(".a2-wetter-tag").length,ort:/Wetter · Ittigen/.test(d.textContent),quelle:/Quelle: MeteoSchweiz/.test(d.textContent),warn:d.querySelectorAll(".a2-wetter-tag.a2-wetter-warn").length,namen:[...d.querySelectorAll(".a2-wetter-name")].slice(0,2).map(x=>x.textContent),chips:[...d.querySelectorAll(".a2-wetter-chip")].map(x=>x.textContent),offen:/Open-Meteo/.test(d.textContent)}});
 p(dom.tage===5&&dom.ort&&dom.quelle&&!dom.offen&&dom.namen.join()==="Heute,Morgen","Karte „Wetter · Ittigen“ mit 5 Tagen und „Quelle: MeteoSchweiz“",dom);
 p(dom.warn===1&&dom.chips.some(x=>/Gewitter/.test(x))&&dom.chips.some(x=>/Frost/.test(x))&&dom.chips.some(x=>/Hitze/.test(x))&&!dom.chips.some(x=>/Wind|Sturm/.test(x)),"Gewitter als Warnung, Frost/Hitze als Hinweis; keine Windangabe (liefert die Tagesdatei nicht)",dom);
 await page.evaluate(()=>wetterKarteHtml());await page.waitForTimeout(100);
 p(await page.evaluate(()=>window.__aufrufe.length)===1,"Erneutes Öffnen innerhalb von 30 Minuten: kein zweiter Aufruf (Zwischenspeicher)");
 await page.evaluate(()=>{wetterStand=Date.now()-31*60*1000;wetterLetzterVersuch=0;wetterKarteHtml()});await page.waitForTimeout(300);
 p(await page.evaluate(()=>window.__aufrufe.length)===2,"Nach 30 Minuten: neuer Aufruf");
 await page.evaluate(()=>{window.__modus="aus"});
 await page.evaluate(()=>{wetterStand=Date.now()-31*60*1000;wetterLetzterVersuch=0;wetterKarteHtml()});await page.waitForTimeout(400);
 const off=await page.evaluate(()=>({tage:wetterTage&&wetterTage.length,fehler:wetterFehler,html:wetterKarteHtml()}));
 p(off.tage===5&&off.fehler===""&&/Wetter · Ittigen/.test(off.html),"Ohne Verbindung: der zuletzt geladene Stand bleibt stehen",off);
 await zurueck();await page.evaluate(()=>wetterKarteHtml());await page.waitForTimeout(400);
 const keine=await page.evaluate(()=>({tage:wetterTage,html:wetterKarteHtml().replace(/<[^>]+>/g," ")}));
 p(keine.tage===null&&/nicht verfügbar/.test(keine.html),"Ohne Verbindung und ohne Zwischenspeicher: ehrliche Meldung „nicht verfügbar“",keine.html.slice(0,200));
 await page.evaluate(()=>{window.__modus="http"});await zurueck();await page.evaluate(()=>wetterKarteHtml());await page.waitForTimeout(400);
 const h5=await page.evaluate(()=>({tage:wetterTage,fehler:wetterFehler}));
 p(h5.tage===null&&/Postleitzahl/.test(h5.fehler),"Fehlerantwort des Servers: deren verständlicher Text wird angezeigt, keine Daten",h5);
 await page.evaluate(()=>{window.__modus="kaputt"});await zurueck();await page.evaluate(()=>wetterKarteHtml());await page.waitForTimeout(400);
 const kaputt=await page.evaluate(()=>({tage:wetterTage,fehler:wetterFehler}));
 p(kaputt.tage===null&&/nicht verfügbar|nicht lesbar/.test(kaputt.fehler),"Unlesbare Antwort: keine Daten angezeigt, Meldung",kaputt);
 await page.evaluate(()=>{window.__modus="aus"});await zurueck();const vorher=await page.evaluate(()=>window.__aufrufe.length);
 await page.evaluate(()=>{wetterKarteHtml();wetterKarteHtml();wetterKarteHtml()});await page.waitForTimeout(400);
 await page.evaluate(()=>{wetterKarteHtml();wetterKarteHtml()});await page.waitForTimeout(200);
 p((await page.evaluate(()=>window.__aufrufe.length))-vorher===1,"Nach einem Fehlschlag fragt das Neuzeichnen NICHT dauernd neu ab (höchstens ein Versuch pro Minute)");
 await page.evaluate(()=>{window.__modus="ok"});
 const zw=await page.evaluate(()=>{localStorage.setItem("sd_wetter_ms",JSON.stringify({plz:"8000",ts:Date.now(),tage:[{datum:"2026-10-15",code:1,tmax:1,tmin:0}]}));return wetterCacheLesen()});
 p(zw===null,"Zwischenspeicher einer ANDEREN Postleitzahl wird nicht verwendet",zw);

 console.log("\nD · Einstellungen");
 await page.evaluate(()=>{companyAddress="Hauptstr. 12, 3063 Ittigen";wetterUebernehmen({wetter_aktiv:false});document.getElementById("companyAddressInput").value=companyAddress});
 const f0=await page.evaluate(()=>({block:!!document.getElementById("wetterBlock"),aktiv:document.getElementById("wetterAktivInput").checked,txt:document.getElementById("wetterBlock").textContent,anzeige:document.getElementById("wetterOrtAnzeige").textContent,eingaben:document.querySelectorAll("#wetterBlock input[type=text],#wetterBlock input:not([type])").length}));
 p(f0.block&&!f0.aktiv&&/MeteoSchweiz/.test(f0.txt)&&!/Open-Meteo|nicht-kommerzielle/.test(f0.txt)&&/3063/.test(f0.anzeige)&&f0.eingaben===0,"Einstellungen: aus, Quelle MeteoSchweiz, zeigt die erkannte PLZ 3063, keine eigene Ort-/Koordinateneingabe",f0);
 await page.evaluate(()=>{companyAddress="Worblentalstrasse 12";document.getElementById("companyAddressInput").value=companyAddress;wetterFormFuellen();document.getElementById("wetterAktivInput").checked=true;window.__alerts=[];window.__gespeichert=[]});
 await page.evaluate(()=>wetterSpeichern());
 const s1=await page.evaluate(()=>({al:window.__alerts.slice(),g:window.__gespeichert.length,anz:document.getElementById("wetterOrtAnzeige").textContent}));
 p(s1.g===0&&/Postleitzahl/.test(s1.al[0]||"")&&/keine vierstellige/.test(s1.anz),"Einschalten ohne Postleitzahl in der Firmenadresse wird abgelehnt (nichts gespeichert)",s1);
 await page.evaluate(()=>{document.getElementById("companyAddressInput").value="Hauptstr. 12, 3063 Ittigen";window.__alerts=[];window.__gespeichert=[]});
 await page.evaluate(()=>wetterSpeichern());
 const s2=await page.evaluate(()=>({al:window.__alerts.slice(),g:window.__gespeichert.length}));
 p(s2.g===0&&/noch nicht gespeichert/.test(s2.al[0]||""),"PLZ nur im Feld, Firmenadresse aber nicht gespeichert: abgelehnt (der Server liest die gespeicherte Adresse)",s2);
 await page.evaluate(()=>{companyAddress="Hauptstr. 12, 3063 Ittigen";window.__alerts=[];window.__gespeichert=[]});
 await page.evaluate(()=>wetterSpeichern());
 const sp=await page.evaluate(()=>({g:window.__gespeichert,aktiv:wetterAktiv,al:window.__alerts[0]}));
 p(sp.g.length===1&&JSON.stringify(sp.g[0])==='{"wetter_aktiv":true}'&&sp.aktiv&&/Startseite/.test(sp.al),"Speichern schreibt nur „wetter_aktiv“ (kein Ort, keine Koordinaten) und schaltet ein",sp);
 await page.evaluate(()=>{document.getElementById("wetterAktivInput").checked=false;window.__gespeichert=[]});
 await page.evaluate(()=>wetterSpeichern());
 p(await page.evaluate(()=>window.__gespeichert.length===1&&window.__gespeichert[0].wetter_aktiv===false&&!wetterAktiv),"Ausschalten funktioniert auch ohne Postleitzahlprüfung");

 console.log("\nE · Keine versteckten Abhängigkeiten");
 const q=fs.readFileSync("js/90-wetter.js","utf8"),idx=fs.readFileSync("index.html","utf8"),sw=fs.readFileSync("sw.js","utf8");
 p(!/https?:\/\//.test(q.replace(/\/\/.*$/gm,"")),"Der Browser-Code enthält keine Adresse eines Drittanbieters (nur der eigene Supabase-Aufruf)");
 p(!/fetch\(/.test(q)&&/functions\.invoke\("wetter-meteoschweiz"/.test(q),"Abruf ausschliesslich über sb.functions.invoke(\"wetter-meteoschweiz\")");
 p(!/geolocation|apikey|api_key|appid|[?&]key=/i.test(q),"Keine Standortabfrage des Geräts, kein Schlüssel im Code");
 p(/js\/90-wetter\.js/.test(idx)&&/js\/90-wetter\.js/.test(sw),"js/90 in index.html UND sw.js");
 p(!/meteoschweiz|meteoswiss|open-meteo/i.test(sw),"Der Service Worker speichert keine Wetter-Antworten (nur die App-Dateien)");
 p((await page.evaluate(()=>window.__geo))===0,"Keine Standortabfrage zur Laufzeit");
 p(fehler.length===0,"Keine JavaScript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();process.exit(fail?1:0);
})();

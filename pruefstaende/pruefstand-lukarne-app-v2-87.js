// Prueft den Einbau der Lukarne-Aufnahme (js/36) in die laufende App.
// Geladen wird die echte index.html mit echten Skripten; Supabase wird nicht
// angesprochen (die Sandbox kann das nicht).
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-lukarne-app-v2-87.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};
// Klick ueber evaluate mit Pruefung: ein fehlendes oder gesperrtes Element
// soll sauber fehlschlagen und nicht in einen Timeout laufen - ein
// abgebrochener Pruefstand sieht aus wie "keine Fehler".
async function klick(page,sel){
 const r=await page.evaluate(s=>{const e=document.querySelector(s);
  if(!e)return "fehlt"; if(e.disabled)return "gesperrt"; e.click(); return "ok";},sel);
 await page.waitForTimeout(150); return r;
}
async function tippe(page,sel,text){
 const da=await page.evaluate(s=>{const f=document.querySelector(s);
  if(!f)return false; f.focus(); f.value=""; return true;},sel);
 if(!da)return false;
 await page.keyboard.type(String(text),{delay:12});
 await page.waitForTimeout(80);
 return true;
}
const reg=async(page,n)=>{await page.evaluate(k=>lukaSetzeSchritt(k),n);await page.waitForTimeout(150)};
const daten=async(page,o)=>{await page.evaluate(x=>{Object.assign(lukA,x);renderLukarneAufnahme()},o);await page.waitForTimeout(150)};

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},from:()=>{const q={};['select','eq','order','limit'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q;}})};"}));
 const fehler=[];
 page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>d.accept());
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(400);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];
  meineRechte={admin:true};
  allProjects=[{id:7,name:"Sanierung Dach",object:"Bahnhofstrasse 12, 3011 Bern",
                order_no:"2026-123",customer:"Muster AG"}];
  measurementMaterials=[{id:2,name:"Titanzink"},{id:3,name:"Kupfer"}];
  blechRollenbreiten=[];
  lukAchsabstand=500; lukHilfsriss=200; lukZugabeBreite=0; lukZugabeLaenge=0;
  companyName="Peter Künzi AG"; companyAddress="Industriestrasse 8"; logoUrl=null;
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof renderMeasMaterialOptions==="function")renderMeasMaterialOptions();
 });

 console.log("\nA · Modul geladen, Fachdatei unangetastet");
 const da=await page.evaluate(()=>({
  modul:typeof renderLukarneAufnahme==="function",
  zurueck:typeof lukaZuruecksetzen==="function",
  fuellen:typeof lukaFuellen==="function",
  zusatz:typeof lukaZusatzDaten==="function",
  fach:typeof berechneLukarne==="function",
  plan:typeof lukPlanSvg==="function",
  zeilen:typeof lukScharenZeilen==="function",
  stummel:!!document.getElementById("luk_hoehe"),
  ziel:!!document.getElementById("lukarneAufnahme")
 }));
 p(da.modul&&da.zurueck&&da.fuellen&&da.zusatz,"js/36 geladen",da);
 p(da.fach&&da.plan&&da.zeilen,"js/19 unveraendert geladen (Fachrechnung)",da);
 p(da.stummel,"Stummel fuer js/19 vorhanden");
 p(da.ziel,"Container fuer die Aufnahme vorhanden");
 p(fehler.length===0,"die App laedt ohne JavaScript-Fehler",fehler.slice(0,3));
 if(fehler.length){console.log("\n=== Abbruch ===");await b.close();process.exit(1)}

 console.log("\nB · Sechs Register, nur eines sichtbar");
 await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  $("measType").value="lukarne"; showMeasTypeSection("lukarne");
 });
 await page.waitForTimeout(250);
 const reg1=await page.evaluate(()=>({
  knoepfe:document.querySelectorAll("#luka_register .ra-register-knopf").length,
  aktiv:document.querySelectorAll("#luka_register .ra-register-knopf.aktiv").length,
  namen:Array.from(document.querySelectorAll("#luka_register .ra-register-text")).map(x=>x.textContent)
 }));
 p(reg1.knoepfe===6,"sechs Register",reg1.knoepfe);
 p(reg1.aktiv===1,"genau eines ist aktiv",reg1.aktiv);
 p(reg1.namen.join("|")==="Grunddaten|Geometrie|Scharen|Zuschnitt|Ausmass|Kontrolle",
   "dieselben Namen und dieselbe Reihenfolge wie in den uebrigen Arten",reg1.namen);
 // Eigenschaft statt Zahl: die erste Ueberschrift traegt die eigene Nummer.
 let ersteOk=0, fremde=0;
 for(let n=1;n<=6;n++){
  await reg(page,n);
  const f=await page.evaluate(k=>{
   const h=Array.from(document.querySelectorAll("#lukarneAufnahme h2")).map(x=>x.textContent.trim());
   return {erste:h[0]||"",fremd:h.filter(t=>/^[1-6] ·/.test(t)&&!t.startsWith(k+" ·")).length};
  },n);
  if(f.erste.startsWith(n+" ·"))ersteOk++;
  fremde+=f.fremd;
 }
 p(ersteOk===6,"jedes Register zeigt seine eigene Ueberschrift",ersteOk);
 p(fremde===0,"und keine fremde Registernummer",fremde);

 console.log("\nC · Leeres Formular");
 await reg(page,2);
 const leer=await page.evaluate(()=>({
  erg:lukaErgebnis(), text:$("lukarneAufnahme").innerText,
  nan:/NaN|Infinity|undefined/.test($("lukarneAufnahme").innerHTML)
 }));
 p(leer.erg===null,"ohne Masse wird nichts gerechnet",leer.erg);
 p(/Bitte Höhe, obere Länge, Winkel/.test(leer.text),"und es steht da, was fehlt");
 p(!leer.nan,"kein NaN im leeren Zustand");
 await reg(page,3);
 p(/Bitte zuerst die Geometrie/.test(await page.evaluate(()=>$("lukarneAufnahme").innerText)),
   "die Scharen sagen ebenfalls, was fehlt");
 await reg(page,6);
 const pflicht=await page.evaluate(()=>lukaPruefungen().filter(x=>x.art==="fehler").map(x=>x.text));
 p(pflicht.length===2&&/Höhe H/.test(pflicht[0])&&/obere Länge L/.test(pflicht[1]),
   "die beiden fehlenden Masse werden gemeldet (Winkel und Achsabstand kommen aus den Einstellungen)",pflicht);
 const ohneVorgabe=await page.evaluate(()=>{
  const alt={w:lukA.winkel,p:lukA.achsabstand};
  lukA.winkel=""; lukA.achsabstand="";
  const m=lukaPruefungen().filter(x=>x.art==="fehler").map(x=>x.text);
  lukA.winkel=alt.w; lukA.achsabstand=alt.p;
  return m;
 });
 p(ohneVorgabe.length===4,"ohne Vorgabe sind es alle vier Pflichtfelder",ohneVorgabe);

 console.log("\nD · Bruecke zur Fachrechnung");
 await daten(page,{material:"2",hoehe:1200,laengeOben:2500,winkel:100,
   achsabstand:500,hilfsriss:200,zugabeBreite:20,zugabeLaenge:30});
 const br=await page.evaluate(()=>{
  lukaBruecke();
  const eigen=lukaErgebnis();
  const fach=berechneLukarne(lukaEingaben());
  return {felder:{h:$("luk_hoehe").value,l:$("luk_laengeOben").value,w:$("luk_winkel").value,
            p:$("luk_achsabstand").value,hr:$("luk_hilfsriss").value,s:$("luk_seite").value,
            m:$("luk_material").value},
   gleich:JSON.stringify(eigen)===JSON.stringify(fach),
   W:Math.round(eigen.W),A:Math.round(eigen.A),anzahl:eigen.anzahl};
 });
 p(br.felder.h==="1200"&&br.felder.l==="2500"&&br.felder.w==="100"
   &&br.felder.p==="500"&&br.felder.hr==="200"&&br.felder.s==="rechts"&&br.felder.m==="2",
   "die alten Formularfelder werden gesetzt",br.felder);
 p(br.gleich,"das angezeigte Ergebnis IST das von berechneLukarne()",br.gleich);
 // Unabhaengig nachgerechnet: beta = 10 Grad, W = L*cos(beta)
 const soll=Math.round(2500*Math.cos(10*Math.PI/180));
 p(br.W===soll,"waagerechte Breite unabhaengig nachgerechnet",{ist:br.W,soll});
 p(br.anzahl===Math.ceil(soll/500),"Anzahl Scharen = Breite / Achsabstand aufgerundet",br.anzahl);

 console.log("\nE · Geometrie: Tippen ohne Fokusverlust");
 await reg(page,2);
 const tip=await (async()=>{
  await tippe(page,"#luka_hoehe","1500");
  return page.evaluate(()=>({wert:$("luka_hoehe").value,fokus:document.activeElement.id,
    modell:lukA.hoehe}));
 })();
 p(tip.wert==="1500"&&tip.fokus==="luka_hoehe","Höhe vollstaendig getippt, Feld behaelt den Fokus",tip);
 p(String(tip.modell)==="1500","und der Wert steht im Modell",tip.modell);
 const live=await page.evaluate(()=>Array.from(document.querySelectorAll("#lukarneAufnahme .ra-kennzahlen .ra-wert")).map(x=>x.textContent));
 p(live[2]!==""&&/mm/.test(live[0]),"die Kennzahlen laufen live mit",live);
 p(/<svg/.test(await page.evaluate(()=>$("luka_plan").innerHTML)),"der Plan aus lukPlanSvg() steht da");
 await daten(page,{hoehe:1200});

 console.log("\nF · Verschiedene Hoehen, Laengen, Winkel");
 const faelle=[[1200,2500,100],[800,1800,95],[2000,3000,110],[1000,1000,135],[600,4000,92]];
 let alleOk=0;
 for(const [H,L,a] of faelle){
  await daten(page,{hoehe:H,laengeOben:L,winkel:a});
  const r=await page.evaluate(()=>{const g=lukaErgebnis();
   return {W:g.W,A:g.A,n:g.anzahl,summe:g.breiten.reduce((s,x)=>s+x,0)}});
  const beta=(a-90)*Math.PI/180, W=L*Math.cos(beta), dy=-L*Math.sin(beta);
  const A=Math.hypot(W,dy-H);
  if(Math.abs(r.W-W)<1e-6&&Math.abs(r.A-A)<1e-6&&Math.abs(r.summe-W)<1e-6)alleOk++;
 }
 p(alleOk===faelle.length,"alle fuenf Faelle rechnen wie die Fachformel, Scharbreiten summieren zur Breite",alleOk);

 console.log("\nG · Links / rechts");
 await daten(page,{hoehe:1200,laengeOben:2500,winkel:100,achsabstand:500,hilfsriss:200});
 await reg(page,3);
 const re=await page.evaluate(()=>$("lukarneAufnahme").innerText);
 await daten(page,{seite:"links"}); await reg(page,3);
 const li=await page.evaluate(()=>({text:$("lukarneAufnahme").innerText,
   erg:lukaErgebnis().scharen.map(s=>Math.round(s.zuschnittLaenge))}));
 await daten(page,{seite:"rechts"});
 const reErg=await page.evaluate(()=>lukaErgebnis().scharen.map(s=>Math.round(s.zuschnittLaenge)));
 p(li.erg.join()===reErg.join(),"links und rechts rechnen gleich",{li:li.erg,re:reErg});
 p(li.text!==re,"aber die Kanten sind in der Tabelle vertauscht");

 console.log("\nH · Achsabstand und Restbreite");
 let restOk=0;
 for(const p2 of [300,500,800,1200,3000]){
  await daten(page,{achsabstand:p2});
  const r=await page.evaluate(()=>{const g=lukaErgebnis();
   return {n:g.anzahl,rest:g.breiten[g.anzahl-1],p:g.p,W:g.W}});
  if(r.n===Math.ceil(r.W/r.p-1e-9)&&r.rest>0&&r.rest<=r.p+1e-6)restOk++;
 }
 p(restOk===5,"bei jedem Achsabstand stimmt die Scharenzahl und die Restbreite passt",restOk);
 await daten(page,{achsabstand:3000}); await reg(page,6);
 p((await page.evaluate(()=>lukaPruefungen().map(x=>x.text).join(" "))).indexOf("grösser als die waagerechte Breite")>=0,
   "ein zu grosser Achsabstand wird gemeldet");
 await daten(page,{achsabstand:500});

 console.log("\nI · Hilfsriss und Kuerzung");
 await daten(page,{achsabstand:1300,hilfsriss:200});
 const hr1=await page.evaluate(()=>{const g=lukaErgebnis();
   return {hr:g.hilfsriss,gek:g.gekuerzt,max:Math.round(g.maxHilfsriss)}});
 p(hr1.hr===200&&!hr1.gek&&hr1.max>200,"ein passender Hilfsriss wird unveraendert genommen",hr1);
 await daten(page,{hilfsriss:5000});
 const hr2=await page.evaluate(()=>{const g=lukaErgebnis();
   return {hr:Math.round(g.hilfsriss),max:Math.round(g.maxHilfsriss),gek:g.gekuerzt,
     text:$("lukarneAufnahme").innerText}});
 p(hr2.gek&&hr2.hr===hr2.max,"ein zu grosser Hilfsriss wird auf das Maximum gekuerzt",hr2);
 await reg(page,2);
 p(/gekürzt|würde sie nicht mehr schneiden/.test(await page.evaluate(()=>$("lukarneAufnahme").innerText)),
   "und die Kuerzung steht als Hinweis da");
 await reg(page,6);
 p((await page.evaluate(()=>lukaPruefungen().map(x=>x.text).join(" "))).indexOf("gekürzt")>=0,
   "die Kontrolle nennt sie ebenfalls");
 await daten(page,{achsabstand:500,hilfsriss:200});

 console.log("\nJ · Scharen kommen aus der Rechnung");
 await reg(page,3);
 const sch=await page.evaluate(()=>{
  const e=$("lukarneAufnahme");
  const g=lukaErgebnis();
  const zeilen=Array.from(e.querySelectorAll("tbody tr")).map(tr=>
    Array.from(tr.querySelectorAll("td")).map(td=>td.textContent.trim()));
  return {zeilen,anzahl:g.anzahl,felder:e.querySelectorAll("input").length,
    letzte:e.querySelector("tbody tr:last-child").className,
    rest:Math.round(g.breiten[g.anzahl-1])};
 });
 p(sch.zeilen.length===sch.anzahl,"eine Zeile je Schar",sch.zeilen.length);
 p(sch.felder===0,"keine einzige Eingabe - alle Werte kommen aus der Rechnung",sch.felder);
 p(/ra-dila-zeile/.test(sch.letzte)&&/Rest/.test(sch.zeilen[sch.zeilen.length-1][0]),
   "die letzte Schar ist als Restbreite gekennzeichnet",sch.zeilen[sch.zeilen.length-1][0]);
 p(sch.zeilen[0][1]==="0","\"ab Front\" der ersten Schar ist 0, nicht \"-\"",sch.zeilen[0][1]);
 p(/^\d[\d’']*\s*×\s*\d[\d’']*$/.test(sch.zeilen[0][9]),"Zuschnitt als Laenge × Breite",sch.zeilen[0][9]);

 console.log("\nK · Zugaben");
 const zug=await page.evaluate(()=>{
  Object.assign(lukA,{zugabeBreite:0,zugabeLaenge:0});
  const ohne=lukaErgebnis().scharen[0];
  Object.assign(lukA,{zugabeBreite:20,zugabeLaenge:30});
  const mit=lukaErgebnis().scharen[0];
  return {ob:ohne.zuschnittBreite,ol:ohne.zuschnittLaenge,
          mb:mit.zuschnittBreite,ml:mit.zuschnittLaenge,
          rb:mit.breite,rl:Math.max(mit.laengeVorne,mit.laengeHinten)};
 });
 p(Math.abs(zug.mb-zug.rb-20)<1e-6&&Math.abs(zug.ml-zug.rl-30)<1e-6,
   "die Zugaben dieser Aufnahme gehen in den Zuschnitt ein",zug);
 p(zug.mb>zug.ob&&zug.ml>zug.ol,"und wirken erst ab dem Eintrag",zug);

 console.log("\nL · Zuschnitt ueber die gemeinsame Logik");
 await reg(page,4);
 const zu=await page.evaluate(()=>{
  const e=$("lukarneAufnahme");
  const pl=lukaZuschnittPlan();
  e.querySelectorAll("details.zu-details").forEach(d=>d.open=true);
  return {art:pl.art,einheit:pl.einheit,
   liste:Array.from(e.querySelectorAll(".zu-zeile")).map(z=>({
     anzahl:z.querySelector(".zu-anzahl").textContent.trim(),
     mass:z.querySelector(".zu-mass").textContent.replace(/\s+/g," ").trim(),
     zusatz:(z.querySelector(".zu-zusatz")||{textContent:""}).textContent.replace(/\s+/g," ").trim(),
     // Seit v2.88 stehen die Positionsnummern als eigene Marken in .zu-pos.
     pos:Array.from(z.querySelectorAll(".zu-nr")).map(n=>n.textContent.trim()).join(","),
     posMarke:(z.querySelector(".zu-pos-marke")||{textContent:""}).textContent.trim()})),
   kasten:!!e.querySelector("details.zu-rollen"),
   kopf:Array.from((Array.from(e.querySelectorAll("table")).find(t=>/Rolle/.test(t.textContent))||{querySelectorAll:()=>[]}).querySelectorAll("th")).map(x=>x.textContent.trim()),
   nan:/NaN|Infinity|undefined/.test(e.innerHTML)};
 });
 p(zu.art==="rolle"&&zu.einheit==="Schar","der Plan hat die gemeinsame Form (js/33)",zu);
 p(zu.liste.length>0&&zu.liste.every(z=>/^\d+\s*×$/.test(z.anzahl)),
   "Stueckzahl × Laenge × Abwicklung",zu.liste);
 p(zu.liste.every(z=>/^\d+(,\d+)*$/.test(z.pos))&&/Schar/i.test(zu.liste[0].posMarke),
   "die Scharnummern bleiben erhalten und stehen als eigene Marken",
   zu.liste.map(z=>z.posMarke+" "+z.pos));
 p(zu.kasten,"der Kasten \"Rollen fuer diese Massaufnahme\" steht da");
 p(zu.kopf.indexOf("Ab Rolle")>=0,"und der Rollenvergleich nennt die Abschnitte",zu.kopf);
 p(!zu.nan,"kein NaN im Zuschnitt");
 // Gruppierung: gleiche Zuschnitte zusammenfassen
 const grp=await page.evaluate(()=>{
  // Ein Achsabstand, der genau aufgeht -> gleiche Breiten, aber je Schar
  // eine andere Laenge. Zwei kuenstlich gleiche Stuecke muessen zusammen.
  const echt=lukaBleche();
  const test=[{nr:1,laenge:1000,breite:500,merkmal:"Breite 500 mm"},
              {nr:2,laenge:1000,breite:500,merkmal:"Breite 500 mm"},
              {nr:3,laenge:1000,breite:400,merkmal:"Breite 400 mm"}];
  const pl={art:"rolle",einheit:"Schar",streifenbreiten:[500],
    gruppen:[{breite:500,tafelLaenge:1000,streifen:[{stuecke:test,rest:0}]}],
    moeglich:[{breite:1000,jeTafel:2,tafeln:1,flaeche:1,verschnitt:0.2,anteil:20}],
    netto:0.8,optimal:true};
  const d=document.createElement("div"); d.innerHTML=zuschnittHtml(pl);
  return {zeilen:Array.from(d.querySelectorAll(".zu-zeile")).map(z=>
    z.querySelector(".zu-anzahl").textContent.trim()+" "+z.querySelector(".zu-mass").textContent.replace(/\s+/g," ").trim()),
    echt:echt.length};
 });
 p(grp.zeilen.length===2&&/^2 ×/.test(grp.zeilen[0]),
   "fachlich gleiche Zuschnitte werden zusammengefasst, andere Breiten nicht",grp.zeilen);

 console.log("\nM · Ausmass");
 await reg(page,5);
 const am=await page.evaluate(()=>{
  const z=lukaAusmassZeilen();
  const e=$("lukarneAufnahme");
  return {zeilen:z,felder:e.querySelectorAll("input,select").length,
   text:e.innerText,
   flaeche:lukaErgebnis().flaeche};
 });
 p(am.zeilen.length===6,"sechs Ausmasspositionen",am.zeilen.length);
 p(am.felder===0,"keine zweite Eingabe im Ausmass",am.felder);
 p(am.zeilen.every(z=>z.herkunft&&z.herkunft.length>3),"jede Position nennt ihre Herkunft");
 p(!/Artikel|Preis|CHF|Fr\./.test(am.zeilen.map(z=>z.bezeichnung+" "+z.einheit).join(" ")),
   "keine Artikelnummern und keine Preise in den Positionen");
 p(am.zeilen[0].menge===(Math.round(am.flaeche*100)/100).toFixed(2).replace(".",","),
   "die Flaeche stammt aus der Fachrechnung",{ist:am.zeilen[0].menge,soll:am.flaeche});

 console.log("\nN · Kontrolle");
 await reg(page,6);
 const ko=await page.evaluate(()=>({
  keine:lukaPruefungen().filter(x=>x.art==="fehler").length,
  punkt:!!document.querySelector('#luka_register [data-luka-schritt="6"] .ra-register-punkt')
 }));
 p(ko.keine===0,"eine vollstaendige Aufnahme hat keinen Fehler",ko.keine);
 const ohneMat=await page.evaluate(()=>{const alt=lukA.material;lukA.material="";
   const m=lukaPruefungen();lukA.material=alt;return m.map(x=>x.text).join(" ")});
 p(/kein Material/.test(ohneMat),"fehlendes Material wird gemeldet");
 const winkelFalsch=await page.evaluate(()=>{const alt=lukA.winkel;lukA.winkel=200;
   const m=lukaPruefungen();lukA.winkel=alt;return m.filter(x=>x.art==="fehler").map(x=>x.text).join(" ")});
 p(/zwischen 90° und 180°/.test(winkelFalsch),"ein unmoeglicher Winkel wird gemeldet");
 const negZug=await page.evaluate(()=>{const alt=lukA.zugabeBreite;lukA.zugabeBreite=-5;
   const m=lukaPruefungen();lukA.zugabeBreite=alt;return m.filter(x=>x.art==="fehler").map(x=>x.text).join(" ")});
 p(/Zugabe kann nicht negativ/.test(negZug),"eine negative Zugabe wird gemeldet");
 const punkt=await page.evaluate(()=>{const alt=lukA.hoehe;lukA.hoehe="";
   renderLukarneAufnahme();
   const s=!!document.querySelector('#luka_register [data-luka-schritt="6"] .ra-register-punkt.fehler');
   lukA.hoehe=alt; renderLukarneAufnahme();
   return {mit:s,ohne:!!document.querySelector('#luka_register [data-luka-schritt="6"] .ra-register-punkt.fehler')};
 });
 p(punkt.mit&&!punkt.ohne,"das Kontroll-Register traegt einen roten Punkt, wenn etwas fehlt",punkt);

 console.log("\nO · Fotos und Skizze erst am Ende");
 const med=await page.evaluate(()=>{
  const box=$("measMedienBereich");
  const st=getComputedStyle(box);
  return {zu:box.hidden||st.display==="none"||box.getBoundingClientRect().height<5};
 });
 p(med.zu,"waehrend der Register ist der Fotobereich zu",med);
 await reg(page,6);
 await klick(page,"#luka_weiter");
 const med2=await page.evaluate(()=>{
  const box=$("measMedienBereich");
  return {offen:!box.hidden&&box.getBoundingClientRect().height>5,
    markiert:box.classList.contains("ra-ziel")};
 });
 p(med2.offen,"\"Fertig\" klappt Fotos und Skizze auf",med2);
 p(med2.markiert,"und hebt den Bereich hervor",med2);

 console.log("\nP · Speichern, Laden, Kopieren");
 await page.evaluate(()=>{$("measTitle").value="Lukarne Nord";$("measDate").value="2026-09-04";
   $("measNote").value="Bemerkung"; setMeasProjectField(7);});
 const pay=await page.evaluate(()=>buildMeasurementFromForm());
 const alt=["hoehe","laengeOben","winkel","achsabstand","hilfsrissWunsch","hilfsriss","seite",
   "breite","spitzeVersatz","schraege","anzahl","flaeche","zugabeBreite","zugabeLaenge",
   "scharen","material"];
 p(alt.every(k=>pay.data[k]!==undefined),"alle bisherigen Felder sind weiterhin da",
   alt.filter(k=>pay.data[k]===undefined));
 p(pay.data.flaeche_m2!==undefined&&Array.isArray(pay.data.ausmass)&&pay.data.zuschnitt,
   "und die drei neuen kommen dazu",Object.keys(pay.data).slice(-3));
 p(pay.data.zugabeBreite===20&&pay.data.zugabeLaenge===30,
   "die Zugaben DIESER Aufnahme werden gespeichert, nicht die Firmenvorgabe",
   {b:pay.data.zugabeBreite,l:pay.data.zugabeLaenge});
 p(pay.data.scharen.length===pay.data.anzahl,"die Scharenliste reist mit",pay.data.scharen.length);
 const rund=await page.evaluate(d=>{
  lukaZuruecksetzen();
  const leer={h:lukA.hoehe,m:lukA.material};
  lukaFuellen(d);
  return {leer,geladen:{h:lukA.hoehe,l:lukA.laengeOben,w:lukA.winkel,p:lukA.achsabstand,
    hr:lukA.hilfsriss,s:lukA.seite,m:lukA.material,zb:lukA.zugabeBreite,zl:lukA.zugabeLaenge},
   scharen:lukaErgebnis().scharen.map(x=>Math.round(x.zuschnittLaenge))};
 },pay.data);
 p(rund.leer.h===""&&rund.leer.m==="","Zuruecksetzen leert die Aufnahme",rund.leer);
 p(String(rund.geladen.h)==="1200"&&String(rund.geladen.w)==="100"
   &&rund.geladen.zb===20&&rund.geladen.zl===30,
   "Wiederoeffnen setzt alles zurueck, auch die Zugaben",rund.geladen);
 p(rund.scharen.join()===pay.data.scharen.map(x=>Math.round(x.zuschnittLaenge)).join(),
   "und rechnet dieselben Zuschnitte",rund.scharen);
 // Kopieren = derselbe Payload noch einmal
 const kopie=await page.evaluate(()=>{const p1=buildMeasurementFromForm();
   return JSON.stringify(p1.data)===JSON.stringify(buildMeasurementFromForm().data)});
 p(kopie,"zweimal Speichern ergibt denselben Datensatz (Kopieren)");
 // Aufnahme im Format bis v2.86 (ohne die neuen Felder)
 const altD=await page.evaluate(()=>{
  lukaFuellen({hoehe:900,laengeOben:2000,winkel:95,achsabstand:600,hilfsriss:150,
    seite:"links",material:"3"});
  return {h:lukA.hoehe,zb:lukA.zugabeBreite,auswahl:lukA.rollenAuswahl,
    erg:!!lukaErgebnis()};
 });
 p(String(altD.h)==="900"&&altD.erg&&altD.auswahl.length===0,
   "ein Datensatz im Format bis v2.86 oeffnet unveraendert",altD);

 console.log("\nQ · Druck ueber die gemeinsame Listenauswahl");
 const druck=await page.evaluate(async pl=>{
  window.__pdf=[];
  window.open=()=>({document:{write(h){window.__pdf.push(h)},close(){}},focus(){},print(){},set onload(f){}});
  storageSignedUrl=async()=>null;
  await printMeasurement({...pl,id:1,title:"Lukarne Nord",date:"2026-09-04",note:"Bemerkung",project_id:7},
    {listen:"alle"});
  return window.__pdf[0]||"";
 },pay);
 p(/>Angaben</.test(druck)&&/>Plan</.test(druck)&&/>Scharen</.test(druck),
   "Angaben, Plan und Scharen im PDF");
 p(/>Ausmass</.test(druck),"Ausmass im PDF");
 p(/Zuschnitt aus Rollenblech/.test(druck),"Rollenblech-Zuschnitt im PDF");
 p(/Bahnhofstrasse 12/.test(druck),"Kopf mit Objektadresse");
 p(!/NaN|undefined/.test(druck),"kein NaN/undefined im PDF");
 const listen=await page.evaluate(h=>{
  const z=pdfAbschnitteZerlegen(h,"eb-section-head");
  return Array.from(pdfVerfuegbareListen(z));
 },druck);
 p(listen.indexOf("rollenblech")>=0&&listen.indexOf("ausmass")>=0&&listen.indexOf("stueckliste")>=0,
   "die Abschnitte sind den gemeinsamen Kategorien zugeordnet",listen);
 const nurAm=await page.evaluate(async pl=>{
  window.__pdf=[];
  await printMeasurement({...pl,id:1,title:"T",date:"2026-09-04",note:"",project_id:7},
    {listen:["ausmass"]});
  const h=window.__pdf[0]||"";
  const re=/<div class="eb-section-head">([^<]*)</g; const o=[]; let m;
  while((m=re.exec(h))!==null)o.push(m[1]);
  return o;
 },pay);
 p(nurAm.join()==="Ausmass","nur die gewaehlte Liste wird erzeugt",nurAm);

 console.log("\nR · Fuenf Bildschirmbreiten");
 for(const w of [320,360,412,768,1280]){
  await page.setViewportSize({width:w,height:1400});
  let raus=0, scrollt=false;
  for(let n=1;n<=6;n++){
   await reg(page,n);
   const r=await page.evaluate(()=>({
    raus:Array.from(document.querySelectorAll("#lukarneAufnahme *")).filter(x=>{
      const b=x.getBoundingClientRect();
      return b.width>0&&b.right>innerWidth+1&&!x.closest(".scroll,.eb-diagram-scroll,.ra-register");
    }).length,
    scrollt:document.documentElement.scrollWidth>innerWidth+1}));
   raus+=r.raus; if(r.scrollt)scrollt=true;
  }
  p(raus===0&&!scrollt,w+" px: nichts laeuft seitlich hinaus",{raus,scrollt});
 }
 await page.setViewportSize({width:412,height:1400});

 console.log("\nS · Keine JavaScript-Fehler");
 p(fehler.length===0,"kein einziger JavaScript-Fehler in der ganzen Sitzung",fehler.slice(0,3));

 console.log("\npruefstand-lukarne-app: "+ok+"/"+(ok+fail)+
   (fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();

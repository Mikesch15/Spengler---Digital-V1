// v3.29: Wo wird ein verwendeter Rest sichtbar, und was steht dann auf der
// Ruestliste?
//
// Gemeldet wurde: "wenn ich jetzt einen resten aus dem lager verwende muesste
// ich sehen wo dieser verwendet wird und es muesste dan die usrpruengliche
// ruestliste angepasst werden".
//
// Beim Nachmessen kam ein zweiter, latenter Fehler heraus: plan.ausResten
// wurde von KEINEM der elf Module gespeichert und von zuPlanAusGespeichert()
// auch nicht gelesen. Stuecke, die aus einem Rest geschnitten werden, fehlten
// dadurch im wiederhergestellten Plan ganz - sie standen weder in der
// Zuschnittliste noch auf der Ruestliste, und niemand haette sie abgehakt.
//
// Geprueft wird deshalb nicht "es sieht plausibel aus", sondern:
//   - ausResten ueberlebt Speichern und Wiederherstellen
//   - die Stuecke stehen mit Kaestchen in der Liste und zaehlen im Stand
//   - sie tragen den Vermerk "aus Rest" und werden NICHT mit einem gleich
//     langen Stueck von der Rolle zusammengefasst
//   - der Dialog schreibt genau einen Update, nie eine company_id, und
//     0 Zeilen gelten nicht als Erfolg
//   - der Vermerk bleibt stehen, wenn kein passender Rest mehr im Lager ist
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-restverwendung-v3-29.js
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
 await page.waitForFunction(()=>typeof ebaLeer==="function"
   &&typeof zuAlleStuecke==="function"&&typeof restVerwendenOeffnen==="function",
   null,{timeout:15000});
 await page.waitForTimeout(200);

 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L",company_id:"f1"};
  allProfiles=[{id:"u1",first_name:"M",last_name:"L"}]; meineRechte={admin:true};
  allProjects=[{id:7,name:"Testbau",object:"Musterweg 1"}];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000]; blechSchnittfuge=0;
  restMindestlaenge=1000; restMindestbreite=100;
  appSettingsId=1; window.__schreib=[]; window.__lese={};
  projektModule={haupt:true,material:true,zuschnitt:true,reservierung:true,werkstatt:true};
  $("appRoot").hidden=false; $("authScreen").hidden=true;

  // Das Lager macht den Bedarf eindeutig (v3.27): genau EINE Kombination
  // aus Staerke und Ausfuehrung fuer diese Materialart.
  lagerbestand=[{id:1,material_id:2,staerke_mm:0.7,ausfuehrung:"blank",
                 bezeichnung:"Titanzink 0.7 blank",menge:5,einheit:"Tafel"}];
  resteImZuschnitt=true;
  // Ein Rest, der genau zu diesem Bedarf passt: 2000 x 300, gleiche Staerke
  // und Ausfuehrung.
  reststuecke=[{id:20,laenge_mm:2000,breite_mm:300,material_id:2,
                material_name:"Titanzink",staerke_mm:0.7,ausfuehrung:"blank",
                verbraucht:false,herkunft:"aus Zuschnitt"}];
  restVerwendet=[];
  // Die Attrappe braucht die Ausgangszeile, um wie PostgREST die ganze
  // aktualisierte Zeile zurueckzugeben.
  window.__zeileFuer=(t,id)=>t==="reststuecke"
    ?(reststuecke||[]).find(x=>Number(x.id)===Number(id))||null:null;
  projectMeasurementsCache=[{id:90,type:"einlaufblech_gerade",title:"nord",project_id:7}];

  // Ein Plan immer ueber das echte Modul - nie nachgebaut.
  window.__plan=(laengen,A)=>{
   ebA=ebaLeer(); ebA.abwicklung=A; ebA.material=2; ebA.rollenAuswahl=[];
   ebA.stuecke=laengen.map(l=>({laenge:l})); ebPieces=ebA.stuecke;
   return ebaZuschnittPlan();
  };
  window.__payload=(laengen,A)=>{ __plan(laengen,A); return ebaZusatzDaten(); };
 });

 // =========================================================== 1
 console.log("1 · Der Vorabzug greift und der Plan traegt ausResten");
 const t1=await page.evaluate(()=>{
  const pl=__plan([1800,1800,1200],250);
  return {ausResten:(pl.ausResten||[]).length,
          stuecke:(pl.ausResten||[]).reduce((a,x)=>a+(x.stuecke||[]).length,0),
          restId:((pl.ausResten||[])[0]||{}).id,
          abw:((pl.ausResten||[])[0]||{}).abwicklung};
 });
 p(t1.ausResten===1,"ein Rest wird vorab abgezogen",t1);
 p(t1.stuecke>=1,"und traegt mindestens ein Stueck",t1);
 p(t1.restId===20&&t1.abw===250,"mit Rest-Id und Streifenbreite",t1);

 // =========================================================== 2
 console.log("\n2 · ausResten ueberlebt Speichern und Wiederherstellen");
 const t2=await page.evaluate(()=>{
  const d=__payload([1800,1800,1200],250);
  const r=d.rollen;
  const wieder=zuPlanAusGespeichert(r,d.abwicklung,"Stück");
  return {gespeichert:(r.ausResten||[]).length,
          erstesStueck:((r.ausResten||[])[0]||{}).stuecke||[],
          wieder:(wieder.ausResten||[]).length,
          alle:zuAlleStuecke(wieder).length,
          ohneResten:zuAlleStuecke(Object.assign({},wieder,{ausResten:[]})).length};
 });
 p(t2.gespeichert===1,"der Speicher-Payload traegt ausResten",t2);
 p(Array.isArray(t2.erstesStueck)&&t2.erstesStueck.length>=1&&t2.erstesStueck[0].nr!==undefined,
   "mit Stuecknummer und Laenge",t2.erstesStueck);
 p(t2.wieder===1,"zuPlanAusGespeichert stellt es wieder her",t2);
 p(t2.alle===t2.ohneResten+((t2.erstesStueck||[]).length),
   "und die Stuecke stehen in zuAlleStuecke",t2);

 // =========================================================== 3
 console.log("\n3 · Alle elf Rollen-Module speichern ausResten");
 const t3=(()=>{
  const dateien=["29-einlaufblech-aufnahme","30-einlaufblech-konisch-aufnahme",
   "31-freies-profil-aufnahme","32-mauerabdeckung-aufnahme","34-kehle-aufnahme",
   "36-lukarne-aufnahme","37-kamin-aufnahme","38-einfassung-aufnahme",
   "39-rinne-aufnahme","40-anschlussblech-aufnahme"];
  const fehlt=[], mehrfach=[];
  dateien.forEach(n=>{
   const q=fs.readFileSync("js/"+n+".js","utf8");
   const treffer=(q.match(/ausResten:ebaAusRestenSpeicher\(/g)||[]).length;
   if(!treffer)fehlt.push(n); else if(treffer>1)mehrfach.push(n);
  });
  const speicher=(fs.readFileSync("js/29-einlaufblech-aufnahme.js","utf8")
    .match(/function ebaAusRestenSpeicher\(/g)||[]).length;
  return {fehlt,mehrfach,speicher};
 })();
 p(t3.fehlt.length===0,"jedes der zehn Module speichert ausResten",t3.fehlt);
 p(t3.mehrfach.length===0,"und zwar genau einmal",t3.mehrfach);
 p(t3.speicher===1,"die Speicherform steht nur einmal im Repo (js/29)",t3.speicher);

 // =========================================================== 4
 console.log("\n4 · Der Vermerk steht am Stueck und trennt die Gruppen");
 const t4=await page.evaluate(()=>{
  const d=__payload([1800,1800,1200],250);
  const pl=zuPlanAusGespeichert(d.rollen,d.abwicklung,"Stück");
  const alle=zuAlleStuecke(pl);
  const ausRest=alle.filter(x=>x.ausRestId===20);
  const gruppen=zuGruppen(pl);
  // Gibt es eine Gruppe, die ein Stueck aus dem Rest UND eines von der
  // Rolle enthaelt? Das waere falsch - sie muessen getrennt bleiben.
  const gemischt=gruppen.filter(g=>{
   const r=g.stuecke.filter(x=>x.ausRestId===20).length;
   return r>0&&r<g.stuecke.length;
  }).length;
  return {ausRest:ausRest.length,
          merkmal:(ausRest[0]||{}).merkmal||"",
          breite:(ausRest[0]||{}).breite,
          gemischt,
          gruppenMitVermerk:gruppen.filter(g=>/aus Rest/.test(g.merkmal||"")).length};
 });
 p(/^aus Rest 2'?000 × 300 mm/.test(String(t4.merkmal||"").replace(/’/g,"'")),
   "das Stueck traegt den Vermerk 'aus Rest 2000 x 300 mm'",t4.merkmal);
 p(/Titanzink/.test(String(t4.merkmal||"")),"mit dem Material des Restes",t4.merkmal);
 p(t4.breite===250,"und der Streifenbreite des Plans",t4);
 p(t4.gemischt===0&&t4.gruppenMitVermerk>=1,
   "es wird nicht mit einem gleich langen Stueck von der Rolle zusammengefasst",t4);

 // =========================================================== 5
 console.log("\n5 · Der Stand zaehlt die Stuecke aus dem Rest mit");
 const t5=await page.evaluate(()=>{
  const d=__payload([1800,1800,1200],250);
  const m={id:90,type:"einlaufblech_gerade",title:"nord",project_id:7,data:d};
  const st=pmatStuecke(m);
  return {gesamt:st.length, ausRest:st.filter(x=>x.ausRestId===20).length,
          plan:(pmatPlanFuer(m)||{}).ausResten?(pmatPlanFuer(m).ausResten||[]).length:0};
 });
 p(t5.ausRest>=1,"pmatStuecke gibt die Stuecke aus dem Rest aus",t5);
 p(t5.gesamt===3,"und zaehlt insgesamt alle drei Stuecke",t5);
 p(t5.plan===1,"pmatPlanFuer traegt ausResten weiter",t5);

 // =========================================================== 6
 console.log("\n6 · Die Ruestliste zeigt sie mit Kaestchen und Vermerk");
 const t6=await page.evaluate(()=>{
  const d=__payload([1800,1800,1200],250);
  const m={id:90,type:"einlaufblech_gerade",title:"nord",project_id:7,data:d};
  zeErledigt=new Map();
  const h=rlBlockHtml(m,pmatPlanFuer(m));
  const kaesten=(h.match(/rl-stueck/g)||[]).length;
  const nummern=(h.match(/rl-nr">(\d+)/g)||[]).map(x=>x.replace(/\D/g,""));
  return {kaesten,nummern,vermerk:/aus Rest/.test(h),
          stand:/von 3 bereits zugeschnitten/.test(h)};
 });
 p(t6.kaesten===3,"drei Kaestchen - auch das Stueck aus dem Rest",t6);
 p(t6.vermerk===true,"der Vermerk steht in der Bemerkungsspalte",t6);
 p(t6.stand===true,"und der Stand zaehlt alle drei",t6);

 // =========================================================== 7
 console.log("\n7 · Der Dialog 'Hier verwenden'");
 const t7=await page.evaluate(async()=>{
  window.__schreib=[]; window.__updateLeer=false;
  restStueckeJeMass.set(90,[{nr:1,laenge:1800,breite:250,merkmal:""},
                            {nr:2,laenge:1800,breite:250,merkmal:""},
                            {nr:3,laenge:2500,breite:250,merkmal:""}]);
  restVerwendenOeffnen(20,90);
  const box=$("restVerwendenModal");
  if(!box||box.hidden)return {offen:false,anzahl:0,vorgewaehlt:[],nichtPasst:0,titel:""};
  const kaesten=Array.prototype.slice.call(
    document.querySelectorAll("#restVerwendenStuecke [data-rest-stueck]"));
  const vorgewaehlt=kaesten.filter(x=>x.checked).map(x=>x.dataset.restStueck);
  const nichtPasst=Array.prototype.slice.call(
    document.querySelectorAll("#restVerwendenStuecke .rest-stueck-passt-nicht")).length;
  const titel=($("restVerwendenRest")||{}).textContent||"";
  return {offen:!box.hidden, anzahl:kaesten.length, vorgewaehlt, nichtPasst, titel};
 });
 p(t7.offen===true,"der Dialog geht auf",t7);
 p(t7.anzahl===3,"und bietet alle drei Stuecke an",t7);
 p((t7.vorgewaehlt||[]).join(",")==="1,2",
   "vorgewaehlt sind nur die, die in den Rest passen (1800 <= 2000)",t7);
 p(t7.nichtPasst===1,"das zu lange Stueck ist als 'passt nicht' gekennzeichnet",t7);
 p(/nord/.test(String(t7.titel||"")),"der Kopf nennt Rest und Massaufnahme",t7.titel);
 // Die globale label-Regel schreibt GROSS - "250 MM" liest sich falsch.
 // Gemessen, nicht aus der CSS-Datei gelesen (CLAUDE.md 72.5).
 const t7b=await page.evaluate(()=>{
  const l=document.querySelector("#restVerwendenStuecke .rest-stueck-wahl");
  if(!l)return {tt:"",txt:""};
  return {tt:getComputedStyle(l).textTransform, txt:l.textContent};
 });
 p(t7b.tt==="none","die Stueckangabe wird nicht in GROSSBUCHSTABEN gesetzt",t7b);
 p(/mm/.test(t7b.txt),"die Einheit steht klein da",t7b.txt);

 // =========================================================== 8
 console.log("\n8 · Was der Dialog wirklich schreibt");
 const t8=await page.evaluate(async()=>{
  window.__schreib=[];
  await $("restVerwendenSpeichern").click();
  await new Promise(r=>setTimeout(r,150));
  const s=(window.__schreib||[]).filter(x=>x.t==="reststuecke");
  return {anzahl:s.length, op:(s[0]||{}).op, d:(s[0]||{}).d, eq:(s[0]||{}).eq,
          hatCompany:JSON.stringify(s).indexOf("company_id")>=0,
          zu:$("restVerwendenModal").hidden,
          verwendet:(restVerwendet||[]).length,
          imLager:(reststuecke||[]).filter(x=>x.id===20).length};
 });
 p(t8.anzahl===1&&t8.op==="update","genau ein Update auf reststuecke",t8);
 p(t8.d&&t8.d.verbraucht===true&&t8.d.verbraucht_fuer_measurement_id===90,
   "es haelt fest, wofuer der Rest gebraucht wurde",t8.d);
 p(t8.d&&Array.isArray(t8.d.verbraucht_stuecke)&&t8.d.verbraucht_stuecke.join(",")==="1,2",
   "und welche Stuecke daraus geschnitten werden",t8.d);
 p(t8.hatCompany===false,"nie eine company_id vom Client",t8);
 p(JSON.stringify(t8.eq).indexOf("verbraucht")>=0,
   "geschrieben wird nur, solange der Rest noch frei ist",t8.eq);
 p(t8.zu===true&&t8.verwendet===1&&t8.imLager===0,
   "der Rest wandert aus dem Lager in die Nachschau",t8);

 // =========================================================== 9
 console.log("\n9 · Der Vermerk steht sofort am Stueck");
 const t9=await page.evaluate(()=>{
  const d=__payload([1800,1800,1200],250);
  // Von Hand verwendet heisst: der Plan wurde OHNE den Rest gerechnet.
  const roh=JSON.parse(JSON.stringify(d.rollen)); roh.ausResten=[];
  const m={id:90,type:"einlaufblech_gerade",title:"nord",project_id:7,
           data:Object.assign({},d,{rollen:roh})};
  const st=zuAlleStuecke(pmatPlanFuer(m));
  return {mit:st.filter(x=>/aus Rest/.test(x.merkmal||"")).map(x=>x.nr),
          ohne:st.filter(x=>!/aus Rest/.test(x.merkmal||"")).map(x=>x.nr),
          vermerk:(st.find(x=>x.nr===1)||{}).merkmal||""};
 });
 p((t9.mit||[]).join(",")==="1,2","genau die angegebenen Stuecke tragen den Vermerk",t9);
 p((t9.ohne||[]).length>=1,"die uebrigen nicht - es wird keiner erfunden",t9);
 p(/2'?000 × 300/.test(String(t9.vermerk||"").replace(/’/g,"'")),
   "und der Text nennt Laenge und Breite des Restes",t9.vermerk);

 // =========================================================== 10
 console.log("\n10 · Der Rest ist im Lager wiederzufinden");
 const t10=await page.evaluate(()=>{
  renderRestVerwendet();
  const block=$("restVerwendetBlock"), box=$("restVerwendetListe");
  const txt=(box.textContent||"").replace(/\s+/g," ");
  return {sichtbar:!block.hidden, txt,
          nennt:/nord/.test(txt), stuecke:/Stück 1, 2/.test(txt)};
 });
 p(t10.sichtbar===true,"der Block 'Zuletzt verwendet' erscheint",t10);
 p(t10.nennt===true,"er nennt die Massaufnahme",t10.txt);
 p(t10.stuecke===true,"und die zugeordneten Stuecknummern",t10.txt);

 // =========================================================== 11
 console.log("\n11 · Der Vermerk bleibt, wenn kein passender Rest mehr da ist");
 const t11=await page.evaluate(()=>{
  // Ein Plan, der die Rolle restlos aufbraucht: 4 x 250 = 1000 Breite,
  // jeder Streifen genau 2000 lang. Damit gibt es NICHTS zu zeigen -
  // kein passender Rest (Lager leer), kein uebrig bleibender, kein zu
  // kleiner. Bliebe der Block trotzdem an diesen drei Bedingungen haengen,
  // waere der Vermerk verschwunden.
  const d=__payload([2000,2000,2000,2000],250);
  const roh=JSON.parse(JSON.stringify(d.rollen)); roh.ausResten=[];
  const m={id:90,type:"einlaufblech_gerade",title:"nord",project_id:7,
           data:Object.assign({},d,{rollen:roh})};
  const plan=pmatPlanFuer(m);
  const h=restBlockHtml(plan,"Titanzink");
  return {leer:(reststuecke||[]).length,
          passend:restPassend(250,[2000],2).length,
          uebrig:restKandidaten(plan).length,
          klein:restAlle(plan).filter(x=>x.zuKlein&&x.laenge_mm>0).length,
          html:h.length>0,
          genommen:/Aus dem Lager für diese Massaufnahme verwendet/.test(h),
          nennt:/Stück 1, 2/.test(h)};
 });
 p(t11.leer===0&&t11.passend===0&&t11.uebrig===0&&t11.klein===0,
   "es gibt sonst nichts zu zeigen: kein passender, kein uebriger, kein zu kleiner Rest",t11);
 p(t11.html===true&&t11.genommen===true,
   "der Block 'Aus dem Lager verwendet' bleibt trotzdem stehen",t11);
 p(t11.nennt===true,"mit den Stuecknummern",t11);

 // =========================================================== 12
 console.log("\n12 · Freiwillig: nur bestaetigen, ohne Stuecke");
 const t12=await page.evaluate(async()=>{
  reststuecke=[{id:21,laenge_mm:2000,breite_mm:300,material_id:2,
    material_name:"Titanzink",staerke_mm:0.7,ausfuehrung:"blank",verbraucht:false}];
  restVerwendet=[]; window.__schreib=[];
  restStueckeJeMass.set(90,[{nr:1,laenge:1800,breite:250,merkmal:""}]);
  restVerwendenOeffnen(21,90);
  document.querySelectorAll("#restVerwendenStuecke [data-rest-stueck]")
    .forEach(x=>{x.checked=false});
  await $("restVerwendenSpeichern").click();
  await new Promise(r=>setTimeout(r,150));
  const s=(window.__schreib||[]).filter(x=>x.t==="reststuecke");
  return {d:(s[0]||{}).d, vermerk:restStueckVermerk(90,1),
          nrn:restStuecknummern((restVerwendet||[])[0]||{})};
 });
 p(t12.d&&t12.d.verbraucht_stuecke===null,
   "ohne Auswahl bleibt die Stueckangabe null - es wird nichts erfunden",t12.d);
 p(t12.vermerk==="","und am Stueck entsteht dann auch kein Vermerk",t12);
 p((t12.nrn||[]).length===0,"restStuecknummern gibt eine leere Liste zurueck",t12);

 // =========================================================== 13
 console.log("\n13 · 0 geschriebene Zeilen gelten nicht als Erfolg");
 const t13=await page.evaluate(async()=>{
  reststuecke=[{id:22,laenge_mm:2000,breite_mm:300,material_id:2,
    material_name:"Titanzink",staerke_mm:0.7,ausfuehrung:"blank",verbraucht:false}];
  restVerwendet=[]; window.__updateLeer=true;
  restStueckeJeMass.set(90,[{nr:1,laenge:1800,breite:250,merkmal:""}]);
  restVerwendenOeffnen(22,90);
  await $("restVerwendenSpeichern").click();
  await new Promise(r=>setTimeout(r,150));
  const f=$("restVerwendenFehler");
  const raus={offen:!$("restVerwendenModal").hidden,
    fehler:(f.textContent||""), sichtbar:!f.hidden,
    imLager:(reststuecke||[]).filter(x=>x.id===22).length,
    verwendet:(restVerwendet||[]).length};
  window.__updateLeer=false; restVerwendenSchliessen();
  return raus;
 });
 p(t13.offen===true&&t13.sichtbar===true,"der Dialog bleibt offen und meldet es",t13);
 p(/vergeben|Berechtigung/.test(String(t13.fehler||"")),"mit verstaendlichem Grund",t13.fehler);
 p(t13.imLager===1&&t13.verwendet===0,
   "der Rest bleibt im Lager - es wird kein Erfolg vorgetaeuscht",t13);

 // =========================================================== 14
 console.log("\n14 · Der Dialog liegt vor dem Formular (gemessen)");
 const t14=await page.evaluate(()=>{
  $("measurementEditModal").hidden=false;
  reststuecke=[{id:23,laenge_mm:2000,breite_mm:300,material_id:2,
    material_name:"Titanzink",staerke_mm:0.7,ausfuehrung:"blank",verbraucht:false}];
  restStueckeJeMass.set(90,[{nr:1,laenge:1800,breite:250,merkmal:""}]);
  restVerwendenOeffnen(23,90);
  const box=$("restVerwendenModal");
  const r=box.getBoundingClientRect();
  const oben=document.elementFromPoint(Math.round(r.left+r.width/2),
                                       Math.round(r.top+Math.min(40,r.height/2)));
  const knopf=$("restVerwendenSpeichern").getBoundingClientRect();
  const obenKnopf=document.elementFromPoint(Math.round(knopf.left+knopf.width/2),
                                            Math.round(knopf.top+knopf.height/2));
  const raus={imDialog:!!(oben&&box.contains(oben)),
    knopfFrei:!!(obenKnopf&&$("restVerwendenSpeichern").contains(obenKnopf)),
    z:getComputedStyle(box).zIndex, w:Math.round(r.width)};
  restVerwendenSchliessen(); $("measurementEditModal").hidden=true;
  return raus;
 });
 p(t14.imDialog===true,"der Dialog ist nicht verdeckt",t14);
 p(t14.knopfFrei===true,"und sein Speichern-Knopf ist erreichbar",t14);
 p(Number(t14.z)>=700,"er liegt ueber den gewoehnlichen Modals",t14);

 // =========================================================== 15
 console.log("\n15 · Vier Bildschirmbreiten");
 for(const w of [320,390,768,1280]){
  await page.setViewportSize({width:w,height:800});
  const t=await page.evaluate(()=>{
   reststuecke=[{id:24,laenge_mm:2000,breite_mm:300,material_id:2,
     material_name:"Titanzink",staerke_mm:0.7,ausfuehrung:"blank",verbraucht:false}];
   restStueckeJeMass.set(90,[{nr:1,laenge:1800,breite:250,merkmal:""},
                             {nr:2,laenge:1800,breite:250,merkmal:""}]);
   restVerwendenOeffnen(24,90);
   const box=$("restVerwendenModal");
   let raus=0;
   box.querySelectorAll("*").forEach(el=>{
    const r=el.getBoundingClientRect();
    if(r.width>0&&r.right>window.innerWidth+1)raus++;
   });
   const k=box.querySelector(".rest-stueck-wahl input");
   const kr=k?k.getBoundingClientRect():{width:0,height:0};
   restVerwendenSchliessen();
   return {raus, kw:Math.round(kr.width), kh:Math.round(kr.height),
           scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(t.raus===0&&!t.scroll,w+" px: nichts laeuft aus dem Bild",t);
  p(t.kw>=14&&t.kw<=28&&t.kh>=14&&t.kh<=28,w+" px: das Kaestchen hat normale Groesse",t);
 }
 await page.setViewportSize({width:412,height:900});

 // =========================================================== 16
 console.log("\n16 · Sauberkeit");
 const t16=(()=>{
  const q33=fs.readFileSync("js/33-zuschnitt.js","utf8");
  const q42=fs.readFileSync("js/42-reste.js","utf8");
  // Der Text "aus Rest" darf nur an EINER Stelle entstehen, sonst stuende in
  // der Ruestliste etwas anderes als am Bildschirm.
  const bauer=(q33.match(/"aus Rest "/g)||[]).length
             +(q42.match(/"aus Rest "/g)||[]).length;
  const nutztZu=/zuRestVermerk\(/.test(q42);
  // js/05 muss die verwendeten Reste WIRKLICH laden - ein blosses Vorkommen
  // des Namens genuegt nicht, sonst bestuende die Pruefung auch dann, wenn
  // dort restVerwendet=[] steht.
  const q05=fs.readFileSync("js/05-daten-laden.js","utf8");
  return {bauer,nutztZu,
    abfrage:/\.eq\("verbraucht",true\)/.test(q05),
    uebernimmt:/restVerwendet=geladen\.restVerwendet/.test(q05)};
 })();
 p(t16.bauer===1,"der Vermerktext entsteht nur an einer Stelle",t16);
 p(t16.nutztZu===true,"js/42 nutzt ihn statt einen eigenen zu bauen",t16);
 p(t16.abfrage===true,"js/05 fragt die verbrauchten Reste ab",t16);
 p(t16.uebernimmt===true,"und uebernimmt sie in restVerwendet",t16);
 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler.slice(0,3));

 console.log("\n=== "+ok+" bestanden, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

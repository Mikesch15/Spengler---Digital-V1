// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-laenge-mal-breite-druck-v2-81.js
// Prueft, dass die GEDRUCKTE Zuschnittliste JEDER Massaufnahme-Art die
// Laenge mal die Breite nennt - aus dem gespeicherten Datensatz.
// Ausgenommen: "Skizze / Foto" hat gar keine Stueckliste.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,220):""))}};
const LXB=/\d[\d'’.\s]*×\s*\d/;
(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:1200}});
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 await page.goto("file://"+path.join("/home/user/Spengler---Digital-V1","index.html"),{waitUntil:"load"});
 await page.waitForTimeout(350);
 await page.evaluate(()=>{
  currentProfile={id:"u1",first_name:"Mike",last_name:"Ledermann"};allProfiles=[{id:"u1",first_name:"Mike",last_name:"Ledermann"}];allProjects=[];companyName="Peter Künzi AG";
  measurementMaterials=[{id:2,name:"Titanzink",legacy_key:"titanzink",max_abstand_mm:5000,ab_fixpunkt_mm:2500}];
  window.__html=null;
  window.open=()=>({document:{write(h){window.__html=(window.__html||"")+h},close(){}},
    focus(){},print(){},addEventListener(){},setTimeout(){}, closed:false});
 });
 const faelle=[
  ["Einlaufblech gerade","einlaufblech_gerade",["2070 × 250","1560 × 250"],{abwicklung:250,gesamtlaenge:5000,material:"2",montage:"links",
    massA:120,winkel:30,engeSeite:"rechts",
    pieces:[{laenge:2070,gehrungLinks:false,gehrungRechts:false},{laenge:1560,gehrungLinks:true,gehrungRechts:false}]}],
  ["Einlaufblech konisch","einlaufblech_konisch",["2070 × 250"],{abwicklung:250,gesamtlaenge:4000,material:"2",montage:"links",
    dachneigung:30,engeSeite:"rechts",
    pieces:[{laenge:2070,massLinks:120,massRechts:150,gehrungLinks:false,gehrungRechts:false}]}],
  ["Rinne Halbrund","rinne_halbrund",["12000 × 250","6000 × 250"],{groesse:"250",rinneAbwicklung:"250",material:"2",gesamtlaenge:12000,
    segments:[{laenge:6000,winkel:0,linksTyp:"",rechtsTyp:"",zuschnittlaenge:6000},
              {laenge:6000,winkel:0,linksTyp:"",rechtsTyp:"",zuschnittlaenge:6000}],
    dilas:[],boundaries:[],dilaMass:-165,
    stueckliste:[{nr:1,von:"START",bis:"ENDE",abstand:12000,zuschnitt:12000,pos:0}]}],
  ["Mauerabdeckung","mauerabdeckung",["8000 × 460","4000 × 460"],{abwicklung:460,material:"2",gesamtlaenge:12000,
    segments:[{laenge:8000,winkel:90,bodenLinks:true,bodenRechts:false},{laenge:4000,winkel:0,bodenLinks:false,bodenRechts:true}],
    schieber:[],boundaries:[],profil:{},
    stueckliste:[{nr:1,von:"BODEN",bis:"ECKE",abstand:8000,zuschnitt:8000,schieberIndex:null,pos:0},
                 {nr:2,von:"ECKE",bis:"BODEN",abstand:4000,zuschnitt:4000,schieberIndex:null,pos:8000}]}],
  ["Freies Profil","freies_profil",["3000 × 300"],{material:"2",konisch:false,
    schenkel:[{laenge:50,winkel:0},{laenge:200,winkel:-90},{laenge:50,winkel:-90}],
    segmente:[{laenge:3000,massen:[{mass:50},{mass:200},{mass:50}]}]}],
  ["Kehle","kehle",["2070 × 500","1453 × 500"],{nh:42.5,nl:23.5,gl:5000,
    material:"2",abwicklung:500,mittelrippe:"ohne",
    segmente:[{laenge:2000,ueberlappung:70,zuschnitt:2070},
              {laenge:2000,ueberlappung:70,zuschnitt:2070},
              {laenge:1453,ueberlappung:0,zuschnitt:1453}],
    zuschnittSumme:5593,flaeche_m2:2.7965}],
  // --- die uebrigen Arten, seit v2.84 ebenfalls mit Laenge x Breite ---
  ["Ort- und Seitenbleche","anschlussblech",["3000 × 470","1200 × 470"],{
    deckung:"pfanne",art:"rinne",ausfuehrung:"wand",material:"2",
    saum:20,stossLaenge:3000,ueberlappung:100,lattenabstand:330,firstgehrung:false,
    a:300,b:100,c:50,d:50,wandAufkantung:150,restSchwelle:500,gehrungszugabe:100,
    laenge:4200,abwicklung:470,
    stueckliste:[{nr:1,laenge:3000,gehrung:false},{nr:2,laenge:1200,gehrung:false}],
    teile:[{name:"Anschlussblech",abwicklung:470}],segmente:[]}],
  ["Einfassung Rund","einfassung_rund",["330 × 520"],{
    deckung:"biber_einfach",durchmesser:110,winkel:30,a:150,b:120,c:60,
    lattenabstand:330,material:"2",abwicklung:520,breiteGesamt:330,anzahlBleilappen:4}],
  ["Rinne (Zuschnittliste)","rinne",["2500 × 981"],{
    material:"2",
    profil:[{name:"Umschlag",art:"fix",laenge:15,winkel:0},
            {name:"Anschl. Flachdach",art:"fix",laenge:150,winkel:180},
            {name:"",art:"var",winkel:70},
            {name:"Keil",art:"fix",laenge:40,winkel:-25},
            {name:"",art:"var",winkel:-45},
            {name:"Keil",art:"fix",laenge:40,winkel:-45},
            {name:"",art:"var",winkel:-45},
            {name:"Rest",art:"fix",laenge:200,winkel:56},
            {name:"Umschlag",art:"fix",laenge:15,winkel:180}],
    ansetz:{dila:-165,boden:0,ablauf:-230,gehrung:250,naht:15,nichts:0},
    fixSumme:460,varMasse:[{buchstabe:"A"},{buchstabe:"B"},{buchstabe:"C"}],
    stuecke:[{links:[127,192,202],rechts:[127,192,202],laenge:2500,
              ansetzL:"boden",ansetzR:"naht",
              abwicklungLinks:981,abwicklungRechts:981,zuschnitt:2500}]}],
  ["Lukarne","lukarne",["600 × 1200"],{
    hoehe:1000,laengeOben:1500,winkel:60,achsabstand:600,hilfsriss:200,
    seite:"links",material:"2",breite:900,schraege:1200,anzahl:1,flaeche:1.08,
    zugabeBreite:0,zugabeLaenge:0,
    scharen:[{nr:1,zuschnittBreite:600,zuschnittLaenge:1200,
      hrObenVorne:100,hrUntenVorne:200,laengeVorne:300,
      hrObenHinten:110,hrUntenHinten:210,laengeHinten:320,breite:600}]}]
 ];
 for(const [name,typ,erwartet,data] of faelle){
  const h=await page.evaluate(async ([t,d,n])=>{
   window.__html=null;
   await printMeasurement({type:t,title:n,date:"2026-09-04",data:d,project_id:null});
   return window.__html||"";
  },[typ,data,name]);
  p(h.length>500,name+": der Druck entsteht",h.length);
  const text=h.replace(/<[^>]*>/g," ").replace(/\s+/g," ");
  p(LXB.test(text),name+": die gedruckte Zuschnittliste nennt Länge × Breite",
    (text.match(/[^ ]*×[^|]{0,40}/)||[""])[0]);
  erwartet.forEach(e=>p(text.indexOf(e)>=0,
    name+": \""+e+" mm\" steht im Ausdruck",text.slice(0,0)||undefined));
  const stellen=(h.match(/.{0,60}(NaN|undefined).{0,40}/g)||[]).slice(0,3);
  p(!stellen.length,name+": kein NaN/undefined im Druck",stellen);
 }
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 console.log("\nlxb-druck: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close(); process.exit(fail?1:0);
})().catch(e=>{console.error("ABBRUCH:",e);process.exit(2)});

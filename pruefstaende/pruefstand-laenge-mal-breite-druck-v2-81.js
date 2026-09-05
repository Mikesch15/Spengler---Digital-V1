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
  // Kamineinfassung (v2.90). Von Hand: cos(25)=0.90631; 400/0.90631=441.35
  //   Vorderteil 900 x (20+300+441) = 900 x 761
  //   Hinterteil 900 x (20+60+250+80+441) = 900 x 851
  //   Seitenteile 500/400 x (20+100+150+400) = x 670
  ["Kamineinfassung","kamineinfassung",["900 × 761","900 × 851","500 × 670","400 × 670"],{
    material:"2",deckung:"biber_einfach",lattenabstand:330,getrennt:false,
    a:300,d:250,e:60,keil:80,winkelVorne:25,winkelHinten:25,
    breiteVorne:900,breiteHinten:900,
    umschlagVorne:20,umschlagHinten:20,umschlagSeite:20,ueberlappung:120,
    b:{l:500,r:500},c:{l:400,r:400},f:{l:150,r:150},g:{l:100,r:100},hoehe:{l:400,r:400},
    kaminLaenge:{l:780,r:780},
    zuschnitte:[{nr:1,name:"Vorderteil",seite:"",laenge:900,breite:761,teile:[]},
                {nr:2,name:"Hinterteil",seite:"",laenge:900,breite:851,teile:[]},
                {nr:3,name:"Seitenteil vorne",seite:"links",laenge:500,breite:670,teile:[]},
                {nr:4,name:"Seitenteil hinten",seite:"links",laenge:400,breite:670,teile:[]},
                {nr:5,name:"Seitenteil vorne",seite:"rechts",laenge:500,breite:670,teile:[]},
                {nr:6,name:"Seitenteil hinten",seite:"rechts",laenge:400,breite:670,teile:[]}],
    bleilappen:{lattenabstand:330,gesamt:8,zeilen:[
      {name:"Seitenteil vorne links",laenge:500,anzahl:2},
      {name:"Seitenteil hinten links",laenge:400,anzahl:2},
      {name:"Seitenteil vorne rechts",laenge:500,anzahl:2},
      {name:"Seitenteil hinten rechts",laenge:400,anzahl:2}]},
    flaeche_m2:2.657}],
  // --- die uebrigen Arten, seit v2.84 ebenfalls mit Laenge x Breite ---
  ["Ort- und Seitenbleche","anschlussblech",["3000 × 470","1200 × 470"],{
    deckung:"pfanne",art:"rinne",ausfuehrung:"wand",material:"2",
    saum:20,stossLaenge:3000,ueberlappung:100,lattenabstand:330,firstgehrung:false,
    a:300,b:100,c:50,d:50,wandAufkantung:150,restSchwelle:500,gehrungszugabe:100,
    laenge:4200,abwicklung:470,
    stueckliste:[{nr:1,laenge:3000,gehrung:false},{nr:2,laenge:1200,gehrung:false}],
    teile:[{name:"Anschlussblech",abwicklung:470}],segmente:[]}],
  ["Einfassung Rund (Format bis v2.95)","einfassung_rund",["330 × 520"],{
    deckung:"biber_einfach",durchmesser:110,winkel:30,a:150,b:120,c:60,
    lattenabstand:330,material:"2",abwicklung:520,breiteGesamt:330,anzahlBleilappen:4}],
  // Ab v2.96 mehrere Einfassungen mit eigener Stueckliste. Die Werte sind die
  // real gerechneten (Ø110 -> 350 x 278, Ø160 -> 400 x 308); gedruckt wird der
  // GESPEICHERTE Plan, es wird nichts nachgerechnet.
  ["Einfassung Rund (v2.96)","einfassung_rund",["350 × 278","400 × 308"],{
    deckung:"biber_doppel",durchmesser:110,winkel:30,a:20,b:100,c:100,
    lattenabstand:330,material:"2",abwicklung:278,breiteGesamt:350,anzahlBleilappen:2,
    einfassungen:[{bez:"",durchmesser:110,winkel:30,a:20,b:100,c:100,anzahl:1,
                   abwicklung:278,breiteGesamt:350,bleilappen:2},
                  {bez:"Küche",durchmesser:160,winkel:30,a:20,b:100,c:100,anzahl:2,
                   abwicklung:308,breiteGesamt:400,bleilappen:2}],
    zuschnitte:[{nr:1,name:"Einfassung 1",laenge:350,breite:278,durchmesser:110,
                 bleilappen:2,merkmal:"",hinweis:"Ø 110"},
                {nr:2,name:"Einfassung 2",laenge:400,breite:308,durchmesser:160,
                 bleilappen:2,merkmal:"",hinweis:"Küche"},
                {nr:3,name:"Einfassung 2",laenge:400,breite:308,durchmesser:160,
                 bleilappen:2,merkmal:"",hinweis:"Küche"}],
    bleilappenGesamt:6,flaeche_m2:0.3437}],
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
   await printMeasurement({type:t,title:n,date:"2026-09-04",data:d,project_id:null},{listen:"alle"});
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

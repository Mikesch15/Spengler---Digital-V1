// Prueft eine ganze FEHLERKLASSE, nicht einen Einzelfall: bleibt ein
// eingetipptes Mass sichtbar, nachdem das Modul neu gezeichnet hat?
//
// Anlass ist der Fehler in js/37 (v2.92): die seitlichen Felder wurden mit
// ihrer FELD-ID im Zustand gesucht (kamA["kam_b"] statt kamA.b). Gespeichert
// war alles, die Felder waren aber nach jedem Neuzeichnen leer - fuer den
// Anwender nicht von "wird nicht gespeichert" zu unterscheiden. Direkt nach
// dem Tippen faellt so etwas nie auf; erst ein Registerwechsel zeigt es.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-felder-bleiben-v2-93.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;
  console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};

// Die neun Arten mit Registern, mit ihrem Wurzelelement und der Umschaltfunktion.
const ARTEN=[
 {typ:"rinne_halbrund",      wurzel:"measTypeRinne",                 setz:"raSetzeSchritt",   reg:"RA_REGISTER"},
 {typ:"einlaufblech_gerade", wurzel:"measTypeEinlaufblech",          setz:"ebaSetzeSchritt",  reg:"EBA_REGISTER"},
 {typ:"einlaufblech_konisch",wurzel:"measTypeEinlaufblechKonisch",   setz:"ebkaSetzeSchritt", reg:"EBKA_REGISTER"},
 {typ:"freies_profil",       wurzel:"measTypeFreiesProfil",          setz:"fpaSetzeSchritt",  reg:"FPA_REGISTER"},
 {typ:"mauerabdeckung",      wurzel:"measTypeMauerabdeckung",        setz:"madaSetzeSchritt", reg:"MADA_REGISTER"},
 {typ:"kehle",               wurzel:"measTypeKehle",                 setz:"keaSetzeSchritt",  reg:"KEA_REGISTER"},
 {typ:"lukarne",             wurzel:"measTypeLukarne",               setz:"lukaSetzeSchritt", reg:"LUKA_REGISTER"},
 {typ:"kamineinfassung",     wurzel:"measTypeKamin",                 setz:"kamaSetzeSchritt", reg:"KAM_REGISTER"},
 {typ:"einfassung_rund",     wurzel:"measTypeEinfassungRund",        setz:"einfaSetzeSchritt",reg:"EINFA_REGISTER"}
];

(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
   args:["--no-sandbox"]});
 const page=await b.newPage();
 const jsFehler=[]; page.on("pageerror",e=>jsFehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,
   contentType:"application/javascript",
   body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}}})};"}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(500);
 await page.evaluate(()=>{
  currentProfile={id:"u1",role:"admin",first_name:"M",last_name:"L"};
  allProfiles=[]; meineRechte={admin:true}; allProjects=[];
  measurementMaterials=[{id:2,name:"Titanzink"}];
  blechRollenbreiten=[1000,670];
  $("appRoot").hidden=false; $("authScreen").hidden=true; $("measurementEditModal").hidden=false;
 });

 for(const art of ARTEN){
  console.log("\n"+art.typ);
  const anzahl=await page.evaluate(a=>{
   showMeasTypeSection(a.typ);
   // Die Register-Tabellen sind mit const deklariert und haengen deshalb
   // NICHT an window - sie werden ueber ihren Namen aufgeloest.
   const r=(0,eval)(a.reg);
   return Array.isArray(r)?r.length:0;
  },art);
  if(!anzahl){p(false,art.typ+": Register nicht gefunden ("+art.reg+")");continue}
  await page.waitForTimeout(250);

  // 0) Listen fuellen: Freies Profil und Mauerabdeckung starten ohne Segment,
  //    haetten also gar keine Eingabefelder. Je Register wird deshalb einmal
  //    auf einen "hinzufuegen"-Knopf gedrueckt.
  for(let s=1;s<=anzahl;s++){
   await page.evaluate(([a,schritt])=>{
    (0,eval)(a.setz)(schritt);
    const knopf=[...document.querySelectorAll("#"+a.wurzel+" button")]
      .find(x=>x.offsetParent!==null&&!x.disabled&&/^\s*(\uFF0B|\+)/.test(x.textContent||""));
    if(knopf)knopf.click();
   },[art,s]);
   await page.waitForTimeout(120);
  }

  // 1) Durch alle Register gehen und jedes sichtbare Zahlenfeld fuellen.
  //    Gesetzt wird ueber ein echtes input-Ereignis - denselben Weg nimmt
  //    auch ein Tastendruck. Nicht jedes Feld hat eine ID (Mauerabdeckung und
  //    Freies Profil sprechen ihre Felder ueber data-Attribute an), deshalb
  //    dient sonst "Register#Position" als Schluessel.
  const gefuellt={};
  for(let s=1;s<=anzahl;s++){
   const neu=await page.evaluate(([a,schritt])=>{
    (0,eval)(a.setz)(schritt);
    const raus={};
    [...document.querySelectorAll("#"+a.wurzel+" input[type=number]")].forEach((f,i)=>{
     if(f.disabled||f.offsetParent===null)return;
     const k=f.id||(schritt+"#"+i);
     f.focus(); f.value="30";
     f.dispatchEvent(new Event("input",{bubbles:true}));
     f.dispatchEvent(new Event("change",{bubbles:true}));
     raus[k]="30";
    });
    return raus;
   },[art,s]);
   Object.assign(gefuellt,neu);
   await page.waitForTimeout(120);
  }
  const ids=Object.keys(gefuellt);
  p(ids.length>0,art.typ+": Zahlenfelder gefunden ("+ids.length+")");
  if(!ids.length)continue;

  // 2) Neu zeichnen erzwingen: alle Register noch einmal durchblaettern.
  for(let s=1;s<=anzahl;s++){
   await page.evaluate(([a,schritt])=>(0,eval)(a.setz)(schritt),[art,s]);
   await page.waitForTimeout(60);
  }

  // 3) Jedes Feld, das es noch gibt, muss seinen Wert noch zeigen.
  const nachher=await page.evaluate(([a,liste,n])=>{
   const leer=[], da=new Set();
   for(let s=1;s<=n;s++){
    (0,eval)(a.setz)(s);
    [...document.querySelectorAll("#"+a.wurzel+" input[type=number]")].forEach((f,i)=>{
     const k=f.id||(s+"#"+i);
     if(liste.indexOf(k)<0)return;
     da.add(k);
     if(f.offsetParent===null)return;
     if(f.value===""||f.value===null)leer.push(k);
    });
   }
   return {leer:[...new Set(leer)],weg:liste.filter(k=>!da.has(k))};
  },[art,ids,anzahl]);
  p(nachher.leer.length===0,
    art.typ+": jedes eingetippte Mass steht nach dem Neuzeichnen noch im Feld",nachher.leer);
  // Ein Feld darf verschwinden (andere Variante, geloeschte Zeile) - dann ist
  // es kein Anzeigefehler. Nur gemeldet, nicht bewertet.
  if(nachher.weg.length)console.log("      (nicht mehr vorhanden, nicht bewertet: "+nachher.weg.join(", ")+")");
 }

 p(jsFehler.length===0,"keine JavaScript-Fehler waehrend des ganzen Laufs",jsFehler.slice(0,3));
 console.log("\npruefstand-felder-bleiben: "+ok+"/"+(ok+fail)+(fail?"  - "+fail+" FEHLGESCHLAGEN":"  - alle bestanden"));
 await b.close();
 process.exit(fail?1:0);
})();

// Prueft die Erweiterung der Firmenadmin-Uebersicht und den Arbeitsstand des
// Projekt-Cockpits (v3.09, Auftrag Abschnitt 9, 10 und 16):
//   - bei AUS zeigt die Uebersicht genau das, was sie in v3.08 zeigte,
//     und fragt weder Reservierungen noch Reststuecke ab,
//   - eingeschaltet: Material, Zuschnitt, Fassung und die Reservierung des
//     Projekts stehen an der Zeile - jede Angabe aus einer echten Quelle,
//   - die zweite Filterzeile erscheint nur fuer eingeschaltete Module und
//     filtert wirklich,
//   - der Arbeitsstand im Cockpit zeigt die drei neuen Bereiche nur, wenn
//     sie eingeschaltet sind, und uebernimmt die Zahl aus der bereits
//     gezeichneten Ueberschrift statt sie ein zweites Mal zu rechnen,
//   - keine Sackgasse: aus der Uebersicht geoeffnet fuehrt der Rueckweg
//     wieder in die Uebersicht.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-uebersicht-cockpit-v3-09.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};

const STUB=`window.__ruf=[];window.__rpcAntwort={};
window.__db={material_reservierungen:[],reststuecke:[],measurements:[]};
function __tab(name){
 const st={name,filter:[]};
 const f={};
 ['select','order','limit','range'].forEach(k=>f[k]=()=>f);
 f.eq=(k,v)=>{st.filter.push([k,'eq',v]);return f};
 f.in=(k,v)=>{st.filter.push([k,'in',v]);return f};
 f.is=(k,v)=>{st.filter.push([k,'is',v]);return f};
 const passt=r=>st.filter.every(([k,art,v])=>art==='in'?v.indexOf(r[k])>=0:String(r[k])===String(v));
 const lauf=()=>{window.__ruf.push({tabelle:name,filter:st.filter.slice()});
  const q=window.__db[name]||[];
  return {data:q.filter(passt).map(r=>JSON.parse(JSON.stringify(r))),error:null}};
 f.maybeSingle=async()=>{const e=lauf();return {data:(e.data||[])[0]||null,error:e.error}};
 f.then=(r)=>Promise.resolve(lauf()).then(r);
 return f;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async(name,args)=>{window.__ruf.push({name,args});
   const a=window.__rpcAntwort&&window.__rpcAntwort[name];
   if(a&&a.fehler)return {data:null,error:{message:a.fehler}};
   return {data:a?a.data:null,error:null}},
 from:(t)=>__tab(t),
 storage:{from:()=>({createSignedUrl:async(pf)=>({data:{signedUrl:'https://beispiel.test/'+pf},error:null})})}
})};`;

const MIKE="aaaa1111-1111-1111-1111-111111111111";
const LEO ="bbbb2222-2222-2222-2222-222222222222";

// Drei Massaufnahmen: eine mit Material und Zuschnitt und Fassung 2, eine
// ohne Material und ohne Zuschnitt, eine ohne Projekt.
const ZEILEN=[
 {id:11,project_id:3,projekt_name:"Test Strasse 11",projekt_adresse:"Teststrasse 11, 3000 Bern",
  projekt_archiviert:false,projekt_status:"in_arbeit",type:"rinne_halbrund",title:"Rinne Nord",
  datum:"2026-09-01",created_by:MIKE,created_at:"2026-09-01T08:00:00Z",updated_by:MIKE,
  updated_at:"2026-09-05T10:00:00Z",workflow_status:"zu_ruesten",freigabe_verfallen:false,
  freigegeben_von:MIKE,freigegeben_am:"2026-09-02T09:00:00Z",ruester_id:LEO,
  geruestet_von:null,geruestet_am:null,monteur_id:null,montiert_von:null,montiert_am:null,
  hat_material:true,hat_zuschnitt:true,fassung:2},
 {id:12,project_id:3,projekt_name:"Test Strasse 11",projekt_adresse:"Teststrasse 11, 3000 Bern",
  projekt_archiviert:false,projekt_status:"in_arbeit",type:"lukarne",title:"Lukarne West",
  datum:"2026-09-03",created_by:LEO,created_at:"2026-09-03T08:00:00Z",updated_by:LEO,
  updated_at:"2026-09-04T10:00:00Z",workflow_status:"in_bearbeitung",freigabe_verfallen:false,
  freigegeben_von:null,freigegeben_am:null,ruester_id:null,
  geruestet_von:null,geruestet_am:null,monteur_id:null,montiert_von:null,montiert_am:null,
  hat_material:false,hat_zuschnitt:false,fassung:null},
 {id:13,project_id:null,projekt_name:null,projekt_adresse:null,
  projekt_archiviert:null,projekt_status:null,type:"kehle",title:"Ohne Projekt",
  datum:"2026-08-20",created_by:MIKE,created_at:"2026-08-20T08:00:00Z",updated_by:MIKE,
  updated_at:"2026-08-25T10:00:00Z",workflow_status:"in_bearbeitung",freigabe_verfallen:false,
  freigegeben_von:null,freigegeben_am:null,ruester_id:null,
  geruestet_von:null,geruestet_am:null,monteur_id:null,montiert_von:null,montiert_am:null,
  hat_material:true,hat_zuschnitt:false,fassung:null}
];

const RESV=[
 {id:1,project_id:3,status:"reserviert"},
 {id:2,project_id:3,status:"benoetigt"},
 {id:3,project_id:3,status:"zugeschnitten"}
];
const RESTE=[{id:9,reserviert_fuer_project_id:3,verbraucht:false}];

const vorbereiten=async(page,module)=>{
 await page.evaluate(([mod,zeilen,resv,reste,MIKE,LEO])=>{
  currentProfile={id:MIKE,role:"admin",first_name:"Mike",last_name:"Ledermann"};
  allProfiles=[{id:MIKE,first_name:"Mike",last_name:"Ledermann"},
               {id:LEO,first_name:"Leo",last_name:"Bock"}];
  meineRechte={admin:true}; appSettingsId=1;
  allProjects=[{id:3,name:"Test Strasse 11",object:"Teststrasse 11, 3000 Bern",archived:false}];
  window.__rpcAntwort["admin_alle_massaufnahmen"]={data:zeilen};
  window.__db.material_reservierungen=JSON.parse(JSON.stringify(resv));
  window.__db.reststuecke=JSON.parse(JSON.stringify(reste));
  window.__db.measurements=zeilen.map(z=>({id:z.id,project_id:z.project_id,type:z.type,title:z.title,data:{}}));
  auFilter={suche:"",status:"",projekt:"",typ:"",person:"",modul:""};
  pmUebernehmen(mod);
  $("appRoot").hidden=false;$("authScreen").hidden=true;
  if(typeof showStart==="function")showStart();
  $("adminMeasModal").hidden=false;
  window.__ruf=[];
 },[module,ZEILEN,RESV,RESTE,MIKE,LEO]);
 await page.evaluate(()=>auNeuLaden());
 await page.waitForTimeout(120);
};

const sicht=page=>page.evaluate(()=>{
 const l=$("auListe"), f=$("auModulFilter");
 const fr=f.getBoundingClientRect();
 return {
  zeilen:[...l.querySelectorAll(".au-zeile")].map(z=>(z.innerText||"").replace(/\s+/g," ").trim()),
  module:[...l.querySelectorAll(".au-module")].map(z=>(z.textContent||"").replace(/\s+/g," ").trim()),
  filterAn:!f.hidden&&getComputedStyle(f).display!=="none"&&fr.height>0,
  filter:[...f.querySelectorAll("[data-au-modul]")].map(b=>b.dataset.auModul)
 };
});

const klick=async(page,wahl)=>{
 const r=await page.evaluate(w=>{
  const e=document.querySelector(w); if(!e)return "fehlt";
  const b=e.getBoundingClientRect();
  if(getComputedStyle(e).display==="none"||b.height===0)return "unsichtbar";
  e.click(); return "ok";
 },wahl);
 await page.waitForTimeout(90);
 return r;
};

(async()=>{
 const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1200,height:900}});
 const jsFehler=[];
 page.on("pageerror",e=>jsFehler.push(String(e).slice(0,200)));
 page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"networkidle"});

 console.log("\nA · bei AUS bleibt die Uebersicht wie in v3.08");
 await vorbereiten(page,{});
 let s=await sicht(page);
 p(s.zeilen.length===3,"alle drei Zeilen da",{n:s.zeilen.length});
 p(s.module.length===0,"keine Modul-Angaben an der Zeile",s.module);
 p(!s.filterAn&&s.filter.length===0,"keine zweite Filterzeile",s);
 let ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle));
 p(ruf.length===0,"weder Reservierungen noch Reststuecke abgefragt",ruf);

 console.log("\nB · Material und Zuschnitt eingeschaltet");
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true});
 s=await sicht(page);
 p(s.filterAn,"zweite Filterzeile sichtbar");
 p(s.filter.join()===",ohne_material,mit_zuschnitt,ohne_zuschnitt",
   "genau die Filter der eingeschalteten Module",s.filter);
 p(/Material/.test(s.module[0])&&/Zuschnitt/.test(s.module[0]),"erste Zeile: Material und Zuschnitt",s.module[0]);
 p(/Ohne Material/.test(s.module[1])&&/Kein Zuschnittplan/.test(s.module[1]),"zweite Zeile: beides fehlt",s.module[1]);
 p(!/Fassung/.test(s.module[0]),"keine Fassung, solange die Versionierung aus ist",s.module[0]);
 p(!/Reservierung/.test(s.module[0]),"keine Reservierung, solange sie aus ist",s.module[0]);
 ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle));
 p(ruf.length===0,"ohne Reservierungsmodul wird nichts nachgeladen",ruf);

 console.log("\nC · alle vier Module eingeschaltet");
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true,reservierung:true,versionierung:true});
 s=await sicht(page);
 p(/Fassung 2/.test(s.module[0]),"die freigegebene Fassung steht da",s.module[0]);
 p(/Keine Fassung/.test(s.module[1]),"und wo es keine gibt, steht das auch",s.module[1]);
 p(/Reservierung 2\/3/.test(s.module[0]),"Reservierung des Projekts: 2 von 3",s.module[0]);
 p(/1 Reststück/.test(s.module[0]),"ein reserviertes Reststück",s.module[0]);
 p(!/Reservierung/.test(s.module[2]),"die Zeile ohne Projekt bekommt keine Projektzahlen",s.module[2]);
 ruf=await page.evaluate(()=>window.__ruf.filter(r=>r.tabelle));
 p(ruf.length===2,"genau zwei zusaetzliche Abfragen fuer die ganze Liste",ruf.map(r=>r.tabelle));
 p(ruf.every(r=>!r.filter.some(f=>f[0]==="company_id")),"KEIN company_id-Filter im Client",ruf);
 p(ruf.every(r=>r.filter.some(f=>f[1]==="in")),"beide auf die Projekte der Liste eingegrenzt",ruf);
 s=await sicht(page);
 p(s.filter.join()===",ohne_material,mit_zuschnitt,ohne_zuschnitt,res_offen,mit_rest,ohne_fassung",
   "alle Filter der eingeschalteten Module",s.filter);

 console.log("\nD · die Filter wirken");
 await klick(page,'[data-au-modul="ohne_material"]');
 s=await sicht(page);
 p(s.zeilen.length===1&&/Lukarne West/.test(s.zeilen[0]),"„Ohne Material“ zeigt genau die eine",s.zeilen);
 await klick(page,'[data-au-modul="mit_zuschnitt"]');
 s=await sicht(page);
 p(s.zeilen.length===1&&/Rinne Nord/.test(s.zeilen[0]),"„Mit Zuschnittplan“ ebenso",s.zeilen);
 await klick(page,'[data-au-modul="ohne_fassung"]');
 s=await sicht(page);
 p(s.zeilen.length===2,"„Ohne freigegebene Fassung“ zeigt zwei",s.zeilen.length);
 await klick(page,'[data-au-modul="res_offen"]');
 s=await sicht(page);
 p(s.zeilen.length===2&&s.zeilen.every(z=>/Test Strasse 11/.test(z)),
   "„Reservierung offen“ zeigt die Zeilen des Projekts",s.zeilen.length);
 await klick(page,'[data-au-modul="mit_rest"]');
 s=await sicht(page);
 p(s.zeilen.length===2,"„Mit Reststück“ ebenso",s.zeilen.length);
 await klick(page,'[data-au-modul=""]');
 s=await sicht(page);
 p(s.zeilen.length===3,"„Alle“ zeigt wieder alles",s.zeilen.length);
 // Zusammenspiel mit dem bestehenden Statusfilter
 await page.evaluate(()=>{auFilter.status="zu_ruesten";auFilter.modul="mit_zuschnitt";auRender()});
 s=await sicht(page);
 p(s.zeilen.length===1,"beide Filterzeilen greifen zusammen",s.zeilen.length);
 await page.evaluate(()=>{auFilter.status="in_bearbeitung";auFilter.modul="mit_zuschnitt";auRender()});
 s=await sicht(page);
 p(s.zeilen.length===0,"und schliessen sich sauber aus",s.zeilen.length);

 console.log("\nE · keine Sackgasse (Abschnitt 16)");
 await vorbereiten(page,{haupt:true,material:true,zuschnitt:true,reservierung:true,versionierung:true});
 p((await klick(page,'[data-au-oeffnen="11"]'))==="ok","Massaufnahme aus der Uebersicht bedienbar");
 await page.waitForTimeout(150);
 let weg=await page.evaluate(()=>({ziel:measEditReturnTo,zu:$("adminMeasModal").hidden}));
 p(weg.ziel==="adminMeasModal"&&weg.zu===true,"Rueckziel gesetzt, Uebersicht geschlossen",weg);
 // Wie der echte Abbrechen-Knopf: erst das Formular schliessen, dann die
 // zentrale Rueckkehr - measEditZurueck() blendet das Formular bewusst nicht
 // selbst aus (js/16 macht das an allen drei Aufrufstellen).
 await page.evaluate(async()=>{$("measurementEditModal").hidden=true;await measEditZurueck()});
 await page.waitForTimeout(150);
 let zurueck=await page.evaluate(()=>({auf:!$("adminMeasModal").hidden,form:$("measurementEditModal").hidden}));
 p(zurueck.auf&&zurueck.form,"Zurueck fuehrt in die Uebersicht",zurueck);

 console.log("\nF · Arbeitsstand im Projekt-Cockpit (Abschnitt 10)");
 // Seit v3.15 steht dort EINE Zeile "Material & Zuschnitt" statt der drei
 // Modulzeilen - genau das verlangt der Auftrag zu v3.15 (keine redundanten
 // Karten). Geprueft wird deshalb diese eine Zeile.
 const cockpit=async module=>{
  await page.evaluate(mod=>{
   $("adminMeasModal").hidden=true;
   $("projectCockpitModal").hidden=false;
   cockpitProjectId=3;
   pmUebernehmen(mod);
   projectMeasurementsCache=[];
   cockpitModulStand();
  },module);
  return page.evaluate(()=>{
   const z=$("cockpitStandMatZuZeile"), k=$("cockpitMatZuCard");
   const r=z?z.getBoundingClientRect():{height:0};
   return {sichtbar:!!z&&!z.hidden&&getComputedStyle(z).display!=="none"&&r.height>0,
           karte:!!k&&!k.hidden,
           mark:($("cockpitMatZuMark")||{}).textContent||"",
           wert:($("cockpitMatZuStand")||{}).textContent||"",
           text:(($("cockpitMatZuText")||{}).innerText||"").replace(/\s+/g," ").trim(),
           alteZeilen:["Material","Zuschnitt","Reservierung"].filter(n=>$("cockpitStand"+n+"Zeile"))};
  });
 };
 let c=await cockpit({});
 p(!c.sichtbar&&!c.karte,"bei AUS weder Zeile noch Karte",c);
 p(c.alteZeilen.length===0,"die drei alten Modulzeilen gibt es nicht mehr",c.alteZeilen);
 c=await cockpit({haupt:true,material:true,zuschnitt:true});
 p(c.sichtbar&&c.karte,"eingeschaltet steht die eine Zeile da",c);
 p(/Material: 0 Positionen/.test(c.text),"sie nennt die Materialpositionen",c.text);
 p(/Zuschnitt: noch keiner/.test(c.text),"und benennt den Leerzustand statt einer falschen Zahl",c.text);
 c=await cockpit({haupt:true,material:true,zuschnitt:true,reservierung:true});
 p(c.sichtbar,"mit Reservierung bleibt es dieselbe eine Zeile",c);
 // Sprung: seit v3.15 fuehrt die Zeile auf die gemeinsame Seite.
 p((await klick(page,'[data-cockpit-goto="matzu"]'))==="ok","Sprung auf die Seite Material & Zuschnitt bedienbar");
 p(await page.evaluate(()=>!$("matZuModal").hidden),"und sie geht dabei wirklich auf");
 await page.evaluate(()=>{$("matZuModal").hidden=true});

 console.log("\nG · Bildschirmbreiten");
 for(const b of [360,412,768,1200]){
  await page.setViewportSize({width:b,height:900});
  await vorbereiten(page,{haupt:true,material:true,zuschnitt:true,reservierung:true,versionierung:true});
  const ueb=await page.evaluate(()=>{
   const l=$("auListe").getBoundingClientRect();
   return {raus:l.right>window.innerWidth+1,scroll:document.documentElement.scrollWidth>window.innerWidth+1};
  });
  p(!ueb.raus&&!ueb.scroll,b+" px: nichts laeuft seitlich hinaus",ueb);
 }
 await page.setViewportSize({width:1200,height:900});

 p(jsFehler.length===0,"keine JavaScript-Fehler",jsFehler);
 console.log("\n=== "+ok+" ok, "+fail+" fehlgeschlagen ===");
 await browser.close();
 process.exit(fail?1:0);
})();

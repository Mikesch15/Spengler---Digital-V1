// v3.363: Rotes Ausrufezeichen bei ungewöhnlichem Mass (js/86), Quelle: Zählwerk (messwert_nutzung).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof plausiPruefe==="function"&&typeof zwMesswertUebernehmen==="function");

 console.log("\nA · Die Regel (rein)");
 const a=await page.evaluate(()=>{
  const lade=zeilen=>zwMesswertUebernehmen(zeilen);
  const z=(art,feld,werte)=>Object.keys(werte).map(w=>({art,feld,wert:Number(w),anzahl:werte[w],zuletzt:"2026-10-01"}));
  const r={};
  lade(z("dachfenstereinfassung","g",{50:9,60:1,100:1}));
  r.g60=plausiPruefe("dachfenstereinfassung","g","60");
  r.g50=plausiPruefe("dachfenstereinfassung","g","50");
  r.g55=plausiPruefe("dachfenstereinfassung","g","55,5");
  r.leer=plausiPruefe("dachfenstereinfassung","g","");
  r.null=plausiPruefe("dachfenstereinfassung","g","0");
  r.andereArt=plausiPruefe("kamineinfassung","g","60");
  lade(z("dachfenstereinfassung","g",{50:4}));              // zu wenig Messungen (4)
  r.zuWenig=plausiPruefe("dachfenstereinfassung","g","60");
  lade(z("dachfenstereinfassung","g",{50:7,60:3}));         // 60 kam in 30 % der Fälle vor: selbst üblich genug
  r.selbstUeblich=plausiPruefe("dachfenstereinfassung","g","60");
  lade(z("dachfenstereinfassung","d",{150:2,295:2,330:2,315:1,340:1,430:1,305:1}));   // kein dominanter Wert
  r.variabel=plausiPruefe("dachfenstereinfassung","d","999");
  lade(z("dachfenstereinfassung","g",{50:6,60:3}));          // 60 kam 3x = 33 % -> selbst üblich genug; 50 = 66 % < 70 %
  r.mehrheitKnapp=plausiPruefe("dachfenstereinfassung","g","70");
  lade(z("dachfenstereinfassung","g",{50:9,60:1,100:1}));
  zaehlwerkAktiv=false;r.aus=plausiPruefe("dachfenstereinfassung","g","60");zaehlwerkAktiv=true;
  return r;
 });
 p(a.g60&&a.g60.ueblich===50&&a.g60.anzahlUeblich===9&&a.g60.gesamt===11&&a.g60.anzahlEingabe===1&&/Üblich ist 50/.test(a.g60.text)&&/1×/.test(a.g60.text),"60 statt üblich 50: Hinweis nennt das Übliche, die Häufigkeit und wie oft 60 vorkam",a.g60);
 p(a.g50===null&&a.leer===null&&a.null===null,"der übliche Wert, ein leeres Feld und 0 lösen nichts aus",[a.g50,a.leer,a.null]);
 p(a.g55&&a.g55.eingabe===55.5,"Komma-Eingabe wird verstanden (55,5)",a.g55);
 p(a.andereArt===null&&a.zuWenig===null,"andere Art ohne Messungen und zu wenige Messungen (< 5): kein Hinweis",[a.andereArt,a.zuWenig]);
 p(a.selbstUeblich===null,"ein Wert, der selbst in ≥ 20 % der Fälle vorkam (7×50, 3×60), löst nichts aus",a.selbstUeblich);
 p(a.variabel===null,"variables Mass ohne dominanten Wert: nie ein Hinweis",a.variabel);
 p(a.mehrheitKnapp===null,"ohne klare Mehrheit (66 % < 70 %): kein Hinweis",a.mehrheitKnapp);
 p(a.aus===null,"Zählwerk aus: kein Hinweis",a.aus);

 console.log("\nB · Welche Felder");
 const z=await page.evaluate(()=>({
  g:plausiFeldZuordnung("dfa_g_l"),gr:plausiFeldZuordnung("dfa_g_r"),f:plausiFeldZuordnung("dfa_f_l"),
  us:plausiFeldZuordnung("dfa_umschlagSeite"),a:plausiFeldZuordnung("dfa_a_l"),d:plausiFeldZuordnung("dfa_d_r"),
  kam:plausiFeldZuordnung("kam_umschlagSeite"),kamA:plausiFeldZuordnung("kam_a_l"),fremd:plausiFeldZuordnung("einfa_a_0")}));
 p(z.g&&z.g.art==="dachfenstereinfassung"&&z.g.feld==="g"&&z.gr&&z.gr.feld==="g"&&z.f&&z.f.feld==="f","seitlich unter/bis Deckmaterial (g/f) links und rechts sind geprüft",z);
 p(z.us&&z.us.feld==="umschlagSeite"&&z.kam&&z.kam.art==="kamineinfassung","Richtwert-Felder der Dachfenster- und Kamineinfassung sind geprüft",z);
 p(z.a===null&&z.d===null&&z.kamA===null&&z.fremd===null,"wechselnde Masse (a, d) und fremde Felder nicht",z);

 console.log("\nC · Anzeige im Formular");
 const c=await page.evaluate(async()=>{
  const lade=zeilen=>zwMesswertUebernehmen(zeilen);
  lade([{art:"dachfenstereinfassung",feld:"g",wert:50,anzahl:9,zuletzt:"2026-10-01"},{art:"dachfenstereinfassung",feld:"g",wert:60,anzahl:1,zuletzt:"2026-10-02"},{art:"dachfenstereinfassung",feld:"g",wert:100,anzahl:1,zuletzt:"2026-10-03"}]);
  const r={};
  // echtes Formular der Dachfenstereinfassung
  dfaA=Object.assign(dfaLeer(),{g:{l:60,r:60},f:{l:50,r:50}});
  $("measTypeDachfenster").hidden=false;
  dfaSchritt=2;
  renderDfaAufnahme();
  await new Promise(x=>setTimeout(x,200));
  const feld=document.getElementById("dfa_g_l");
  r.formular=!!feld;
  if(feld){
   const h=feld.closest(".plausi-feld");const m=h&&h.querySelector(".plausi-marke");
   r.marke=!!m&&!m.hidden;r.zeichen=m?m.textContent:"";
   r.farbe=m?getComputedStyle(m).backgroundColor:"";
   r.fOk=(()=>{const f=document.getElementById("dfa_f_l");const hh=f&&f.closest(".plausi-feld");return hh?hh.querySelector(".plausi-marke").hidden:null})();
   // Antippen zeigt den Grund
   if(m){m.click();r.text1=(feld.closest(".plausi-feld").parentElement.querySelector(".plausi-text")||{}).textContent||"";r.expanded=m.getAttribute("aria-expanded");
    m.click();r.text2=!!feld.closest(".plausi-feld").parentElement.querySelector(".plausi-text");}
   // Eintippen des üblichen Werts nimmt das Zeichen weg, ein anderer setzt es wieder
   feld.value="50";feld.dispatchEvent(new Event("input",{bubbles:true}));
   r.nach50=feld.closest(".plausi-feld").querySelector(".plausi-marke").hidden;
   feld.value="65";feld.dispatchEvent(new Event("input",{bubbles:true}));
   r.nach65=feld.closest(".plausi-feld").querySelector(".plausi-marke").hidden;
   r.wert=feld.value;   // die Eingabe bleibt unverändert
   r.ueberlauf=document.documentElement.scrollWidth<=document.documentElement.clientWidth+1;
   // Neuzeichnen des Formulars: Zeichen wird wieder gesetzt
   renderDfaAufnahme();
   await new Promise(x=>setTimeout(x,200));
   const f2=document.getElementById("dfa_g_l");const m2=f2&&f2.closest(".plausi-feld")&&f2.closest(".plausi-feld").querySelector(".plausi-marke");
   r.nachRender=!!m2&&!m2.hidden;
  }
  return r;
 });
 p(c.formular&&c.marke&&c.zeichen==="!","Dachfenster-Formular: bei g = 60 steht ein „!“ am Feld",c);
 p(/rgb\(180, 35, 24\)|rgb\(1[6-9]\d, \d+, \d+\)/.test(c.farbe),"das Zeichen ist rot",c.farbe);
 p(c.fOk===true,"das übliche f = 50 daneben hat kein Zeichen",c.fOk);
 p(/Üblich ist 50/.test(c.text1)&&c.expanded==="true"&&c.text2===false,"Antippen zeigt den Grund, nochmal Antippen klappt zu",[c.text1,c.expanded,c.text2]);
 p(c.nach50===true&&c.nach65===false&&c.wert==="65","Eintippen: 50 nimmt das Zeichen weg, 65 setzt es; die Eingabe bleibt wie getippt",c);
 p(c.nachRender===true,"nach dem Neuzeichnen des Formulars ist das Zeichen wieder da",c.nachRender);
 p(c.ueberlauf===true,"kein horizontales Überlaufen",c.ueberlauf);

 console.log("\nD · Registrierung");
 const q=fs.readFileSync("sw.js","utf8"), h=fs.readFileSync("index.html","utf8");
 p(/js\/86-plausibilitaet\.js/.test(q)&&/src="js\/86-plausibilitaet\.js"/.test(h),"Datei steht in index.html und in der App-Shell von sw.js");
 const src=fs.readFileSync("js/86-plausibilitaet.js","utf8");
 p(!/\.(insert|upsert|delete)\(/.test(src)&&!/sb\.from/.test(src),"keine Datenbankzugriffe, keine Schreibvorgänge im Modul");
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

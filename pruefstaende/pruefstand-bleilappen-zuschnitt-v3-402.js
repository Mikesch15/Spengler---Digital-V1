// v3.402: Bleilappen-Zuschnitt (Anzahl gerade/konisch mit Massen je Deckmaterial).
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const INIT=()=>{window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>{const q={};['select','eq','order','limit','in'].forEach(k=>q[k]=()=>q);q.then=r=>Promise.resolve({data:[],error:null}).then(r);return q},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"x"}})})},rpc:async()=>({data:null,error:null})})}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:1400}});page.__f=[];page.on("pageerror",e=>page.__f.push(String(e)));
 await stubSchuetzen(page);await page.addInitScript(INIT);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));await page.waitForTimeout(500);
 await page.evaluate(()=>{window.appAlert=async()=>{}});
 const ev=(f,...a)=>page.evaluate(f,...a);

 console.log("\nA · Deckmaterial -> Familie");
 let r=await ev(()=>({f:["schiebeziegel","muldenziegel","biber_einfach","biber_doppel","eternit","naturschiefer","x"].map(k=>blFamilie("kamineinfassung",k)),
   a:["pfanne","falzziegel","biber","schiefer","faserzement","welle"].map(k=>blFamilie("anschlussblech",k))}));
 p(r.f.join()==="falzziegel,falzziegel,biber_einfach,biber_doppel,faserzement,faserzement,"&&r.a.join()==="falzziegel,falzziegel,biber_einfach,faserzement,faserzement,","Schiebe-/Muldenziegel = Falzziegel, Naturschiefer/Eternit = Faserzement; Ortbleche gleich zugeordnet",r);

 console.log("\nB · Anzahl gerade/konisch mit Massen");
 r=await ev(()=>({f6:blBerechne("falzziegel",6),f1:blBerechne("falzziegel",1),f2:blBerechne("falzziegel",2),f0:blBerechne("falzziegel",0),fn:blBerechne("falzziegel",null),d:blBerechne("biber_doppel",4),e:blBerechne("biber_einfach",3)}));
 p(r.f6.gerade.n===2&&r.f6.gerade.mass==="130 × 420"&&r.f6.konisch.n===4&&r.f6.konisch.mass==="130 / 170 × 420","Falzziegel, 6 Lappen: 2 gerade 130 × 420 (links und rechts) + 4 konisch 130/170 × 420",r.f6);
 p(r.f1.gerade.n===1&&r.f1.konisch===null&&r.f2.gerade.n===2&&r.f2.konisch===null,"Ein Lappen: 1 gerade; zwei Lappen: beide gerade (links und rechts), kein konischer",[r.f1,r.f2]);
 p(r.f0===null&&r.fn===null,"Keine Lappen: nichts anzeigen");
 p(r.d.gerade.n===2&&r.d.gerade.mass==="90 × 210"&&r.d.konisch.n===2&&r.d.konisch.mass==="90 / 120 × 210","Biberschwanz Doppeldach: 2 gerade 90 × 210 + konisch 90/120 × 210",r.d);
 p(r.e.gerade.n===2&&r.e.gerade.mass==="300 × 90"&&r.e.konisch.n===1&&r.e.konisch.mass==="300 × 90 / 120","Biberschwanz Einfachdach: 2 gerade 300 × 90 + konisch 300 × 90/120",r.e);
 r=await ev(()=>{const o=pl=>blBerechne("faserzement",8,{platte:pl,breite:250});return {a:o("600x400"),b:o("400x400"),c:o("720x400"),d:o("frei"),e:blBerechne("faserzement",8,{platte:"frei",breite:""})}});
 p(r.a.gerade.n===8&&r.a.gerade.mass==="300 × 105"&&r.a.konisch===null,"Faserzement 600 × 400: 8 × 300 × 105, alle rechteckig",r.a);
 p(r.b.gerade.mass==="200 × 105"&&r.c.gerade.mass==="105 × 420"&&r.d.gerade.mass==="250 × 105","400 × 400 → 200 × 105, 720 × 400 → 105 × 420, frei → 250 × 105",[r.b.gerade.mass,r.c.gerade.mass,r.d.gerade.mass]);
 p(/fehlt/.test(r.e.gerade.mass),"Frei ohne Lappenbreite: Hinweis statt erfundener Zahl",r.e.gerade.mass);
 p(/420 mm breit/.test(r.a.hinweis)&&/Fliessrichtung/.test(r.a.hinweis),"Hinweis nennt Rolle 420 mm und Fliessrichtung",r.a.hinweis);

 console.log("\nC · Anzeige im Register «Zuschnitt» der vier Arten");
 r=await ev(()=>{
  kamaBleilappen=()=>({gesamt:6,manuell:false,berechnet:6});dfaBleilappen=()=>({gesamt:4,manuell:false,berechnet:4});
  kamA.deckung="eternit";dfaA.deckung="muldenziegel";
  anbEingabenAusFeldern=()=>({art:"bleilappen",deckung:"pfanne"});berechneAnschlussblech=()=>({anzahlBleilappen:5});
  einfA.deckung="biber_doppel";einfaBleilappenGesamt=()=>3;
  const s=h=>{const d=document.createElement("div");d.innerHTML=h;return d.textContent.replace(/\s+/g," ")};
  return {k:s(blKarteHtml("kamineinfassung")),d:s(blKarteHtml("dachfenstereinfassung")),a:s(blKarteHtml("anschlussblech")),e:s(blKarteHtml("einfassung_rund")),sel:blKarteHtml("kamineinfassung").includes("data-bl-platte"),sel2:blKarteHtml("dachfenstereinfassung").includes("data-bl-platte"),leer:blKarteHtml("kehle")}});
 p(/6 Bleilappen/.test(r.k)&&/6 ×/.test(r.k)&&/300 × 105/.test(r.k)&&r.sel,"Kamin mit Eternit: 6 Lappen 300 × 105 und Auswahl des Plattenmasses",r.k);
 p(/4 Bleilappen/.test(r.d)&&/130 × 420/.test(r.d)&&/2 ×/.test(r.d)&&!r.sel2,"Dachfenster mit Muldenziegel (= Falzziegel): 2 gerade 130 × 420 + 2 konisch",r.d);
 p(/5 Bleilappen/.test(r.a)&&/130 \/ 170 × 420/.test(r.a),"Ortblech mit Pfannenziegel: Falzziegel-Lappen",r.a);
 p(/3 Bleilappen/.test(r.e)&&/90 × 210/.test(r.e)&&/90 \/ 120 × 210/.test(r.e),"Einfassung rund, Biberschwanz Doppeldach: 90 × 210 und 90/120 × 210",r.e);
 p(r.leer==="","Arten ohne Bleilappen: keine Karte");
 r=await ev(()=>{anbEingabenAusFeldern=()=>({art:"rinne",deckung:"pfanne"});berechneAnschlussblech=()=>({anzahlBleilappen:null});const x=blKarteHtml("anschlussblech");einfA.deckung="x_unbekannt";return {x,e:blKarteHtml("einfassung_rund")}});
 p(r.x===""&&/keinen Bleilappen-Zuschnitt/.test(r.e),"Anschlussart ohne Lappen: keine Karte; unbekanntes Deckmaterial: ehrlicher Hinweis",r);

 console.log("\nD · Plattenmass wählen, Speichern, Ausdruck, Rüstblatt");
 r=await ev(async()=>{kamA.deckung="eternit";let n=0;window.renderKaminAufnahme=()=>{n++};
  $("measType").value="kamineinfassung";
  const sel=document.createElement("select");sel.dataset.blPlatte="";sel.innerHTML='<option value="400x400" selected>x</option>';document.body.appendChild(sel);
  sel.dispatchEvent(new Event("change",{bubbles:true}));
  const h=blKarteHtml("kamineinfassung");
  return {platte:blOpt.platte,neu:n,hat:/200 × 105/.test(h.replace(/<[^>]+>/g," ").replace(/\s+/g," "))}});
 p(r.platte==="400x400"&&r.neu===1&&r.hat,"Plattenmass wählen: Register wird neu gezeichnet, Lappen 200 × 105",r);
 r=await ev(()=>{const s=blMitZuschnitt("kamineinfassung",{a:1});const f=blMitZuschnitt("kehle",{a:1});anbEingabenAusFeldern=()=>({art:"rinne",deckung:"pfanne"});berechneAnschlussblech=()=>({anzahlBleilappen:null});const o=blMitZuschnitt("anschlussblech",{a:1});
  return {s,f:JSON.stringify(f),o:JSON.stringify(o)}});
 p(r.s.a===1&&r.s.bleilappenZuschnitt.anzahl===6&&r.s.bleilappenZuschnitt.platte==="400x400","Speicherstand: Bleilappen-Zuschnitt wird an die Daten gehängt (Eingaben bleiben)",r.s);
 p(r.f==='{"a":1}'&&r.o==='{"a":1}',"Andere Arten/ohne Lappen: Daten unverändert",r);
 r=await ev(()=>{const bz=blMitZuschnitt("kamineinfassung",{}).bleilappenZuschnitt;const m={id:5,type:"kamineinfassung",title:"T",data:{bleilappenZuschnitt:bz}};
  const dr=blDruckHtml(bz),ru=blRuestHtml(m),rb=(typeof rbBlattHtml==="function")?rbBlattHtml(m,{}):"";
  return {dr:/Bleilappen/.test(dr)&&/200 × 105|200 &#215; 105/.test(dr.replace(/×/g,"&#215;").replace(/&#215;/g,"×"))||/200/.test(dr),ru:/Bleilappen \(6 Stk\.\)/.test(ru),rb:/rb-bleilappen/.test(rb),leer:blDruckHtml(null)===""&&blRuestHtml({data:{}})===""}});
 p(r.dr&&r.ru&&r.rb&&r.leer,"Ausdruck und Rüstblatt zeigen die gespeicherten Lappen; ohne Lappen nichts",r);
 r=await ev(()=>{kamA.deckung="eternit";const bz=blMitZuschnitt("kamineinfassung",{}).bleilappenZuschnitt;
  const m={id:9,type:"kamineinfassung",title:"T",note:"",date:"2026-10-19",data:{deckung:"eternit",a:{l:100,r:100},d:{l:50,r:50},bleilappenZuschnitt:bz}};
  let h="";try{h=measPdfAufbau(m,{logoSrc:"",medienHtml:"",photoSrcs:[],sketchSrcs:[]}).bodyHtml}catch(e){h="ERR "+e.message}
  const m2={...m,data:{...m.data,bleilappenZuschnitt:undefined}};let h2="";try{h2=measPdfAufbau(m2,{logoSrc:"",medienHtml:"",photoSrcs:[],sketchSrcs:[]}).bodyHtml}catch(e){h2="ERR "+e.message}
  return {mit:/eb-section-head">Bleilappen</.test(h)&&/Eternit|Faserzement/.test(h),ohne:!/eb-section-head">Bleilappen</.test(h2),fehler:h.slice(0,40)}});
 p(r.mit&&r.ohne,"Ausdruck der Massaufnahme (PDF-Aufbau) enthält den Abschnitt «Bleilappen» – nur wenn gespeichert",r);
 r=await ev(()=>{blFuellen({bleilappenZuschnitt:{platte:"720x400"}});const a=blOpt.platte;blFuellen({bleilappenZuschnitt:{platte:"frei",breiteFrei:240}});const b=[blOpt.platte,blOpt.breite];blFuellen(null);return {a,b,c:blOpt.platte}});
 p(r.a==="720x400"&&r.b.join()==="frei,240"&&r.c==="600x400","Laden/Zurücksetzen: Plattenmass kommt aus dem Speicherstand, sonst Standard",r);

 console.log("\nF · Biberschwanz-Wahl bei den Ortblechen, Fläche, Ausmass-Position");
 r=await ev(()=>{blFuellen(null);anbEingabenAusFeldern=()=>({art:"bleilappen",deckung:"biber"});berechneAnschlussblech=()=>({anzahlBleilappen:4});
  const s=h=>{const d=document.createElement("div");d.innerHTML=h;return d.textContent.replace(/\s+/g," ")};
  const ein=s(blKarteHtml("anschlussblech")),selE=blKarteHtml("anschlussblech").includes("data-bl-biber");
  let n=0;window.renderAnschlussblechAufnahme=()=>{n++};$("measType").value="anschlussblech";
  const sel=document.createElement("select");sel.dataset.blBiber="";sel.innerHTML='<option value="doppel" selected>x</option>';document.body.appendChild(sel);sel.dispatchEvent(new Event("change",{bubbles:true}));
  const dop=s(blKarteHtml("anschlussblech"));
  const gespeichert=blMitZuschnitt("anschlussblech",{}).bleilappenZuschnitt;blFuellen({bleilappenZuschnitt:gespeichert});const zurueck=blOpt.biber;
  anbEingabenAusFeldern=()=>({art:"bleilappen",deckung:"pfanne"});const ohneWahl=blKarteHtml("anschlussblech").includes("data-bl-biber");
  return {ein,selE,dop,n,fam:gespeichert.familie,zurueck,ohneWahl}});
 p(r.selE&&/300 × 90/.test(r.ein)&&/Einfachdach/.test(r.ein),"Ortblech mit Biberschwanz: Auswahl Einfach-/Doppeldach, zuerst Einfachdach",r.ein);
 p(/90 × 210/.test(r.dop)&&r.n===1&&r.fam==="biber_doppel","Doppeldach gewählt: Lappen 90 × 210, Register neu gezeichnet, im Speicherstand vermerkt",r);
 p(r.zurueck==="doppel"&&!r.ohneWahl,"Die Wahl wird beim Laden wiederhergestellt; bei Pfannenziegel gibt es keine Biber-Auswahl",r);
 r=await ev(()=>{blFuellen(null);const f=blBerechne("falzziegel",6),g=blBerechne("biber_doppel",4),h=blBerechne("biber_einfach",3),k=blBerechne("faserzement",8,{platte:"600x400"}),m=blBerechne("faserzement",4,{platte:"720x400"});
  return {f:f.flaeche_m2,g:g.flaeche_m2,h:h.flaeche_m2,k:k.flaeche_m2,m:m.flaeche_m2,e1:blBerechne("falzziegel",1).flaeche_m2}});
 p(Math.abs(r.f-(2*54600+4*63000)/1e6)<1e-9&&Math.abs(r.g-(2*18900+2*22050)/1e6)<1e-9&&Math.abs(r.h-(2*27000+31500)/1e6)<1e-9,"Fläche: 2 gerade voll, konische mit Mittelmass (Falzziegel 0,36 m², Doppeldach 0,08 m², Einfachdach 0,09 m²)",r);
 p(Math.abs(r.k-8*31500/1e6)<1e-9&&Math.abs(r.m-4*105*420/1e6)<1e-9&&Math.abs(r.e1-54600/1e6)<1e-9,"Faserzement 600 × 400: 8 × 300 × 105 = 0,25 m²; 720 × 400: 4 × 105 × 420 = 0,18 m²; ein Lappen = ein gerader",r);
 r=await ev(()=>{blFuellen(null);kamA.deckung="schiebeziegel";kamaBleilappen=()=>({gesamt:6,manuell:false,berechnet:6});kamaZuschnitte=()=>[{name:"Seitenteil",laenge:500,breite:300,seite:"links"}];dfaZuschnitte=()=>[{name:"Seitenteil",laenge:500,breite:300,seite:"links"}];
  const z=blFlaecheZeile("kamineinfassung");const soll=((2*54600+4*63000)/1e6).toFixed(2).replace(".",",");
  let kz=[];try{kz=kamaAusmassZeilen()}catch(e){kz=[{err:e.message}]}
  const k=kz.find(x=>x.bezeichnung==="Bleilappen Fläche");
  const kl=kz.find(x=>x.bezeichnung==="Bleilappen");
  dfaA.deckung="eternit";dfaBleilappen=()=>({gesamt:8,manuell:false,berechnet:8});let dz=[];try{dz=dfaAusmassZeilen()}catch(e){dz=[{err:e.message}]}
  einfA.deckung="biber_doppel";einfaBleilappenGesamt=()=>4;let ez=[];try{ez=einfaAusmassZeilen()}catch(e){ez=[{err:e.message}]}
  anbEingabenAusFeldern=()=>({art:"bleilappen",deckung:"falzziegel"});
  return {z,soll,k:k&&{m:k.menge,e:k.einheit,t:k.teil},kl:!!kl,d:dz.find(x=>x.bezeichnung==="Bleilappen Fläche"),e:ez.find(x=>x.bezeichnung==="Bleilappen Fläche"),dErr:dz[0]&&dz[0].err,eErr:ez[0]&&ez[0].err}});
 p(r.z&&r.z.menge===r.soll&&/Anzahl × Lappenfläche/.test(r.z.herkunft),"Ausmass-Zeile: Fläche der Bleilappen in m² (0,36 für 6 Falzziegel-Lappen)",r.z);
 p(r.k&&r.k.m===r.soll&&r.k.e==="m²"&&r.k.t===false&&r.kl,"Kamineinfassung: die Position «Bleilappen Fläche» steht im Ausmass neben «Bleilappen»; sie wird nicht beschafft (teil = false)",r);
 p(r.d&&r.d.einheit==="m²"&&r.d.menge==="0,25","Dachfenstereinfassung (Eternit, 8 Lappen): 0,25 m²",[r.d,r.dErr]);
 p(r.e&&r.e.einheit==="m²"&&r.e.menge==="0,08","Einfassung rund (Biberschwanz Doppeldach, 4 Lappen): 0,08 m²",[r.e,r.eErr]);
 r=await ev(()=>{blFuellen(null);anbEingabenAusFeldern=()=>({art:"bleilappen",deckung:"falzziegel"});berechneAnschlussblech=()=>({anzahlBleilappen:5});anbaEingaben=()=>({segmente:[{laenge:1000}]});anbaErgebnis=()=>({stuecke:[1],teile:[],laenge:1000,abwicklung:100,flaeche:0.1,anzahlBleilappen:5,bleilappenManuell:false,bleilappenBerechnet:5});anbaFlaecheM2=()=>0.1;anbaTitelText=()=>"T";let z=[];try{z=anbaAusmassZeilen()}catch(e){z=[{err:e.message}]}
  const f=z.find(x=>x.bezeichnung==="Bleilappen Fläche");return {f,err:z[0]&&z[0].err}});
 p(r.f&&r.f.menge==="0,30"&&r.f.einheit==="m²"&&r.f.teil===false,"Ortblech (Pfannenziegel, 5 Lappen): Position «Bleilappen Fläche» 0,30 m²",r);
 r=await ev(()=>{kamaBleilappen=()=>({gesamt:null});return blFlaecheZeile("kamineinfassung")});
 p(r===null,"Ohne Bleilappen keine Position");
 console.log("\nE · Einbindung");
 const src=f=>fs.readFileSync(f,"utf8");
 p(/101-bleilappen\.js/.test(src("index.html"))&&/101-bleilappen\.js/.test(src("sw.js")),"Datei in index.html und sw.js");
 p((src("js/16-massaufnahme-formular.js").match(/blMitZuschnitt/g)||[]).length>=4&&/blDruckHtml/.test(src("js/16-massaufnahme-formular.js"))&&/blRuestHtml/.test(src("js/80-ruestblatt.js")),"Speichern (online/offline), Ausdruck und Rüstblatt eingebunden");
 p(/mdZuruecksetzen\(\)/.test(src("js/10-massaufnahme.js")),"Neue Massaufnahme setzt auch das Metalldach zurück (war vergessen worden)");
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();

// Prueft v3.328: Rollen mischen. Eine Massaufnahme darf aus mehreren der ANGEWAEHLTEN Rollenbreiten geschnitten werden,
// jede Streifenbreite (Gruppe) liegt ganz auf einer Rolle. Gemischt wird nur, wenn es spuerbar Blech spart.
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-rollen-mischen-v3-328.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync(path.join(__dirname,"pruefstand-werkstatt-zuschnitt-v3-20.js"),"utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage();const fehler=[];page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof ebaFormatPlan==="function"&&typeof zuBilanz==="function");
 const rechne=(rollen,opt)=>page.evaluate(([rollen,opt])=>{
  const fm=rollen.map(b=>({breite:b,laenge:null,text:b+" mm"}));
  const gr=opt&&opt.gruppen?opt.gruppen:[{breite:280,bleche:[{nr:1,laenge:564,merkmal:"Vorderteil"}]},
   {breite:190,bleche:[{nr:3,laenge:1225,merkmal:"Seitenteil",hinweis:"links"},{nr:5,laenge:1225,merkmal:"Seitenteil",hinweis:"rechts"}]},
   {breite:462,bleche:[{nr:2,laenge:595,merkmal:"Hinterteil"}]},
   {breite:219,bleche:[{nr:4,laenge:505,merkmal:"Seitenteil hinten",hinweis:"links"},{nr:6,laenge:505,merkmal:"Seitenteil hinten",hinweis:"rechts"}]}];
  const netto=gr.reduce((s,g)=>s+g.breite*g.bleche.reduce((a,x)=>a+x.laenge,0),0)/1e6;
  const pl=ebaFormatPlan({gruppen:gr,formate:fm,form:(opt&&opt.form)||"rolle",netto});
  pl.art=pl.form;pl.einheit="Stück";pl.streifenbreiten=gr.map(g=>g.breite);
  const bil=zuBilanz(pl);
  const geo=zuGeometrie(pl);
  const st=zuAlleStuecke(pl);
  const rest=(typeof restAlle==="function")?restAlle(pl):[];
  const kopie=JSON.parse(JSON.stringify(pl));
  const html=zuListeHtml(pl,{herkunft:true}).replace(/<[^>]+>/g," ").replace(/\s+/g," ");
  const html2=zuListeHtml(zuPlanAusGespeichert(kopie,0,"Stück"),{herkunft:true}).replace(/<[^>]+>/g," ").replace(/\s+/g," ");
  return {best:pl.bestes&&pl.bestes.text,flaeche:pl.bestes&&pl.bestes.flaeche,misch:!!(pl.bestes&&pl.bestes.mischung),
   blocks:(pl.bestes&&pl.bestes.mischung||[]).map(m=>({b:m.breite,g:m.gruppen})),
   einzel:pl.moeglich.filter(x=>!x.mischung).map(x=>[x.breite,x.flaeche]),
   gruppenRolle:pl.gruppen.map(g=>g.rolleBreite),geoB:geo.map(g=>g.B),geoIdx:geo.map(g=>g.index),
   bil:bil&&{aufgeht:bil.aufgeht,brutto:bil.brutto,netto:bil.zuschnitte},
   nrs:st.map(x=>x.nr).sort((a,b)=>a-b),rollenAmStueck:st.filter(x=>x.rolle).length,
   restText:rest.map(r=>r.text||r.bezeichnung||"").join("|"),html,html2,
   abschnitte:[...new Set(st.map(x=>x.abschnitt))].sort((a,b)=>a-b)};
 },[rollen,opt||null]);

 console.log("\nA · Das Beispiel: 670 + 1000 statt nur 670");
 const r=await rechne([250,330,670,1000]);
 p(r.misch,"es wird gemischt",r.best);
 const roll=r.blocks.map(x=>x.b).sort((a,c)=>a-c);
 p(roll.every(x=>[250,330,670,1000].includes(x)),"nur angewählte Rollen",roll);
 p(JSON.stringify(roll)===JSON.stringify([670,1000]),"genau 670 und 1000",roll);
 const einzel670=r.einzel.find(x=>x[0]===670)[1];
 p(r.flaeche<einzel670-0.1,"deutlich weniger Blech als die beste einzelne Rolle ("+r.flaeche.toFixed(3)+" gegen "+einzel670.toFixed(3)+" m²)");
 const alleG=r.blocks.reduce((a,x)=>a.concat(x.g),[]).sort();
 p(JSON.stringify(alleG)==="[0,1,2,3]","jede Streifenbreite liegt auf genau einer Rolle",alleG);
 p(r.gruppenRolle.every(x=>x>0),"jede Gruppe kennt ihre Rolle",r.gruppenRolle);
 p(r.geoB.length===4&&JSON.stringify(r.geoIdx)==="[0,1,2,3]","Geometrie je Gruppe in Gruppenreihenfolge",r.geoIdx);
 p(JSON.stringify(r.geoB)===JSON.stringify(r.gruppenRolle),"Geometrie nutzt die Rolle der Gruppe, nicht eine für alle",[r.geoB,r.gruppenRolle]);
 p(r.bil&&r.bil.aufgeht,"die Materialbilanz geht auf",r.bil);
 p(JSON.stringify(r.nrs)==="[1,2,3,4,5,6]","alle sechs Stücke stehen genau einmal auf der Liste",r.nrs);
 p(r.rollenAmStueck===6,"jedes Stück weiss, von welcher Rolle es kommt");
 p(r.abschnitte.length>=2&&r.abschnitte.every(n=>n>0)&&new Set(r.abschnitte).size===r.abschnitte.length,"Abschnittsnummern laufen fortlaufend über beide Rollen",r.abschnitte);
 p(/ab 1.000er Rolle/.test(r.html.replace(/[’']/g,"."))&&/ab 670er Rolle/.test(r.html),"die Liste nennt je Abschnitt die Rolle",r.html.slice(0,300));
 p(/Rollenblech 1.000 \+ 670 mm/.test(r.html.replace(/[’']/g,".")),"Kopf nennt beide Rollen",r.html.slice(0,80));
 p(r.html===r.html2,"gespeichert und wieder geladen sieht der Plan gleich aus");
 const r2=await rechne([250,330,670,1000]);
 p(JSON.stringify(r)===JSON.stringify(r2),"deterministisch");

 console.log("\nB · Nur angewählte Rollen");
 const nur=await rechne([670]);
 p(!nur.misch&&nur.best==="670 mm","nur 670 gewählt: keine Mischung");
 const nur1k=await rechne([1000]);
 p(!nur1k.misch&&nur1k.best==="1000 mm","nur 1000 gewählt: keine Mischung");
 const zwei=await rechne([670,1000]);
 p(zwei.misch&&zwei.blocks.every(x=>[670,1000].includes(x.b)),"670 und 1000 gewählt: nur diese beiden",zwei.blocks);
 const ohne=await rechne([250,330]);
 p(ohne.blocks.every(x=>[250,330].includes(x.b)),"nie eine nicht gewählte Rolle",ohne.blocks);

 console.log("\nC · Keine Mischung, wo sie nichts bringt");
 const eine=await rechne([670,1000],{gruppen:[{breite:250,bleche:[{nr:1,laenge:1000},{nr:2,laenge:1000}]}]});
 p(!eine.misch,"eine einzige Streifenbreite: nicht gemischt");
 const tafel=await rechne([670,1000],{form:"tafel"});
 p(!tafel.misch,"Tafel: nie gemischt");
 const gleich=await rechne([1000,670],{gruppen:[{breite:300,bleche:[{nr:1,laenge:2000}]},{breite:300.5,bleche:[{nr:2,laenge:2000}]}]});
 p(!gleich.misch||gleich.flaeche<gleich.einzel[0][1],"fast gleiche Breiten: Mischung nur mit echtem Gewinn",gleich);
 p(!/er Rolle/.test(eine.html),"ohne Mischung steht die Liste wie bisher ohne Rollenbreite je Abschnitt",eine.html.slice(0,200));

 console.log("\nD · Druck (v3.325–327): Rüstblatt/Rüstliste im Layout der übrigen Dokumente");
 const q80=fs.readFileSync("js/80-ruestblatt.js","utf8"), q58=fs.readFileSync("js/58-ruestliste.js","utf8");
 p(/rbDruckenAufnahmen\(eintraege/.test(q58),"die Werkstatt-Rüstliste druckt über rbDruckenAufnahmen");
 p(/PDF_LAYOUT_CSS/.test(q80)&&/pdfKopfHtml/.test(q80)&&/pdfFooterHtml/.test(q80),"Druckdokument nutzt Kopf, Layout und Fusszeile der übrigen Dokumente");
 p(/\.zoom/.test(q80)||/style\.zoom/.test(q80),"zu hohe Blätter werden auf eine Seite verkleinert");
 const doc=await page.evaluate(async()=>{
  const m={id:1,type:"kehle",data:{},title:"Test",project_id:1,workflow_status:"zu_ruesten"};
  rbExternMerken(m);
  const h=await rbDokumentHtml([m,m]);
  return {css:h.includes("pdf-head")||h.includes(".pdf-head"),seiten:(h.match(/class="rb-druck-seite"/g)||[]).length,kopf:/RÜSTBLATT|Rüstblatt/i.test(h)};
 });
 p(doc.css&&doc.seiten===2&&doc.kopf,"Dokument: PDF-Kopf, je Massaufnahme eine Seite",doc);
 console.log("\nE · Ältere gespeicherte Pläne (vor v3.328) zeigen die Mischung in Rüstblatt und Rüstliste");
 const alt=await page.evaluate(()=>{
  const gr=[{breite:280,bleche:[{nr:1,laenge:564,merkmal:"Vorderteil"}]},
   {breite:190,bleche:[{nr:3,laenge:1225,merkmal:"Seitenteil",hinweis:"links"},{nr:5,laenge:1225,merkmal:"Seitenteil",hinweis:"rechts"}]},
   {breite:462,bleche:[{nr:2,laenge:595,merkmal:"Hinterteil"}]},
   {breite:219,bleche:[{nr:4,laenge:505,merkmal:"Seitenteil hinten",hinweis:"links"},{nr:6,laenge:505,merkmal:"Seitenteil hinten",hinweis:"rechts"}]}];
  const netto=gr.reduce((s,g)=>s+g.breite*g.bleche.reduce((a,x)=>a+x.laenge,0),0)/1e6;
  // So sah der gespeicherte Plan vor v3.328 aus: nur die 670er gerechnet, die Rollenbreiten des Lagers daneben.
  const einzel=ebaFormatPlan({gruppen:gr.map(g=>({breite:g.breite,bleche:g.bleche.map(x=>Object.assign({breite:g.breite},x))})),formate:[{breite:670,laenge:null,text:"670 mm"}],form:"rolle",netto});
  const gespeichert=JSON.parse(JSON.stringify(Object.assign({},einzel,{breiten:[250,330,670,1000],auswahl:[]})));
  gespeichert.gruppen.forEach(g=>(g.streifen||[]).forEach(st=>(st.stuecke||[]).forEach(x=>{if(!x.breite)x.breite=g.breite})));
  const m={id:7,type:"kehle",title:"Alt",project_id:1,workflow_status:"zu_ruesten",data:{rollen:gespeichert}};
  const plan=pmatPlanFuer(m);
  const vorher=JSON.stringify(gespeichert);
  const blatt=rbBlattHtml(m,{kopf:true,ausfuehrung:"ruesten"}).replace(/<[^>]+>/g," ").replace(/[’']/g,".");
  return {misch:!!(plan&&plan.moeglich[0].mischung),text:plan&&plan.moeglich[0].text,flaeche:plan&&plan.moeglich[0].flaeche,
   einzelFlaeche:einzel.bestes.flaeche,unveraendert:JSON.stringify(m.data.rollen)===vorher,
   nrs:plan?zuAlleStuecke(plan).map(x=>x.nr).sort():[],blatt};
 });
 p(alt.misch,"Plan aus dem Datensatz wird beim Lesen gemischt",alt);
 p(alt.flaeche<alt.einzelFlaeche-0.1,"und braucht weniger Blech als der gespeicherte",[alt.flaeche,alt.einzelFlaeche]);
 p(alt.unveraendert,"der gespeicherte Datensatz selbst bleibt unverändert");
 p(JSON.stringify(alt.nrs)==="[1,2,3,4,5,6]","alle Stücke bleiben erhalten",alt.nrs);
 p(/ab 1.000er Rolle/.test(alt.blatt)&&/ab 670er Rolle/.test(alt.blatt),"das Rüstblatt (und damit die Rüstliste) nennt beide Rollen",alt.blatt.slice(0,200));
 const gleichAlt=await page.evaluate(()=>{
  const r={form:"rolle",breiten:[670,1000],netto:0.5,gruppen:[{breite:250,streifen:[{stuecke:[{nr:1,breite:250,laenge:1000}],rest:0}],abschnittLaenge:1000,jeAbschnitt:2,abschnitte:1}],moeglich:[{breite:670,laenge:null,flaeche:0.67,zeilen:[]}]};
  const m={id:8,type:"kehle",title:"Eine",project_id:1,data:{rollen:r}};
  const pl=pmatPlanFuer(m);return pl&&!pl.moeglich[0].mischung&&pl.moeglich[0].breite===670;
 });
 p(gleichAlt,"ein Plan mit nur einer Streifenbreite bleibt, wie gespeichert");
 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\nErgebnis: "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

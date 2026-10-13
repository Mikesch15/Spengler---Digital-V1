// v3.350: Anzahl Bleilappen kann in allen Arten mit Bleilappen von Hand gesetzt
// werden (leer = berechnet); Freies Profil traegt die Bezeichnung der
// Massaufnahme im Ausmass; Komplettausmass ohne feste Bleilappen-Zeile.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const {stubSchuetzen}=require(__dirname+"/stub-schutz.js");
const path=require("path"),fs=require("fs");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const QP=fs.readFileSync("pruefstaende/pruefstand-werkstatt-zuschnitt-v3-20.js","utf8");
const STUB=QP.slice(QP.indexOf("const STUB=`")+12,QP.indexOf("`;\n\nconst ICH"));
const FALL={seitenteilArt:"separat",getrennt:false,lattenabstand:355,
 a:{l:225,r:225}, b:{l:990,r:990}, c:{l:"",r:""}, d:{l:295,r:295},
 f:{l:50,r:50}, g:{l:50,r:50}, ueberlappung:"", saumVorne:35,
 aufVorne:80, aufHinten:95, breiteOben:120, breiteUnten:160,
 randAbstand:15, randStrich:12, e:35, eUmschlag:15, anreiff:15, anreiffUmschlag:10,
 umschlagVorne:20, umschlagSeite:20, breiteVorne:800, breiteHinten:800};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:900,height:900}});
 const fehler=[];
 page.on("pageerror",e=>fehler.push(e.message));
 await stubSchuetzen(page);
 await page.addInitScript(STUB);
 await page.goto("file://"+path.join(process.cwd(),"index.html"));
 await page.waitForFunction(()=>typeof dfaBleilappen==="function"&&typeof kamaBleilappen==="function"&&typeof einfaBleilappenGesamt==="function"&&typeof berechneAnschlussblech==="function");

 console.log("\nA · Dachfenster");
 const d=await page.evaluate(F=>{
  const r={};
  dfaA=Object.assign(dfaLeer(),F);
  r.leer=dfaBleilappen();
  dfaA.bleilappenManuell="5";r.hand=dfaBleilappen();
  r.zeile=dfaAusmassZeilen().find(z=>z.bezeichnung==="Bleilappen");
  r.daten=dfaDaten().bleilappenManuell;
  dfaA.bleilappenManuell="0";r.null=dfaBleilappen().gesamt;
  dfaA.bleilappenManuell="";dfaA.lattenabstand="";r.ohneLatten=dfaBleilappen().gesamt;
  dfaA.bleilappenManuell="3";r.ohneLattenHand=dfaBleilappen().gesamt;
  dfaA.bleilappenManuell="7";dfaFuellen(dfaDaten());r.zurueck=dfaA.bleilappenManuell;
  r.feld=typeof dfaFormHtml==="function"?null:undefined;
  return r;
 },FALL);
 p(d.leer.gesamt===8&&!d.leer.manuell,"leer = berechnet (8)",d.leer);
 p(d.hand.gesamt===5&&d.hand.manuell&&d.hand.berechnet===8,"von Hand 5 gilt, berechnet 8 bleibt sichtbar",d.hand);
 p(d.zeile&&String(d.zeile.menge)==="5"&&/von Hand/.test(d.zeile.herkunft),"Ausmass-Zeile Bleilappen = 5, Herkunft von Hand",d.zeile);
 p(d.daten===5,"wird gespeichert",d.daten);
 p(d.null===0,"0 ist ein gueltiger Handwert",d.null);
 p(d.ohneLatten===null&&d.ohneLattenHand===3,"ohne Lattenabstand: leer = unbekannt, von Hand = 3",d);
 p(d.zurueck==="7"||d.zurueck===7,"wird beim Oeffnen wiederhergestellt",d.zurueck);

 console.log("\nB · Kamineinfassung");
 const k=await page.evaluate(()=>{
  const r={};
  kamA=kamaLeer();
  Object.assign(kamA,{lattenabstand:330,getrennt:false,a:{l:250,r:250},d:{l:200,r:200},e:35,keil:50,winkelVorne:115,winkelHinten:65,
   b:{l:1000,r:1000},c:{l:400,r:400},f:{l:100,r:100},g:{l:100,r:100},hoehe:{l:300,r:300},breiteVorne:600,breiteHinten:600,ueberlappung:30,umschlagVorne:20,umschlagHinten:20,umschlagSeite:20});
  r.leer=kamaBleilappen();
  kamA.bleilappenManuell="4";r.hand=kamaBleilappen();
  r.zeile=kamaAusmassZeilen().find(z=>z.bezeichnung==="Bleilappen");
  r.daten=kamaDaten().bleilappenManuell;
  const dd=kamaDaten();kamA=kamaLeer();kamaFuellen(dd);r.zurueck=kamA.bleilappenManuell;
  return r;
 });
 p(!k.leer.manuell&&k.hand.manuell&&k.hand.gesamt===4,"von Hand 4 gilt, leer = berechnet",k.hand);
 p(k.zeile&&String(k.zeile.menge)==="4"&&/von Hand/.test(k.zeile.herkunft),"Ausmass-Zeile Bleilappen = 4",k.zeile);
 p(k.daten===4&&String(k.zurueck)==="4","gespeichert und wiederhergestellt",[k.daten,k.zurueck]);

 console.log("\nC · Einfassung rund");
 const e=await page.evaluate(()=>{
  const r={};
  einfA=einfaLeer();einfA.lattenabstand=330;
  Object.assign(einfA.einfassungen[0],{bez:"E1",durchmesser:100,winkel:30,a:200,b:200,c:150,anzahl:2});
  r.rechn=einfaBleilappenBerechnet();r.gesamt=einfaBleilappenGesamt();
  einfA.bleilappenManuell="9";r.hand=einfaBleilappenGesamt();
  r.zeile=einfaAusmassZeilen().find(z=>z.bezeichnung==="Bleilappen");
  r.daten=einfaDaten().bleilappenManuell;
  const dd=einfaDaten();einfA=einfaLeer();einfaFuellen(dd);r.zurueck=einfA.bleilappenManuell;
  return r;
 });
 p(e.rechn===e.gesamt&&e.hand===9,"leer = berechnet, von Hand 9 gilt",e);
 p(e.zeile&&Number(e.zeile.menge)===9&&/von Hand/.test(e.zeile.herkunft),"Ausmass-Zeile Bleilappen = 9",e.zeile);
 p(e.daten===9&&String(e.zurueck)==="9","gespeichert und wiederhergestellt",[e.daten,e.zurueck]);

 console.log("\nD · Anschlussblech (Art Bleilappen)");
 const a=await page.evaluate(()=>{
  const w={...anbVorgabe(),art:"bleilappen",deckung:Object.keys(ANB_DECKUNGEN).find(k=>anbArtenFuer(k).indexOf("bleilappen")>=0),a:100,b:100,lattenabstand:330,laenge:3300,segmente:[{laenge:3300}],bleilappenManuell:""};
  const g0=berechneAnschlussblech(w);
  const g1=berechneAnschlussblech({...w,bleilappenManuell:12});
  const g2=berechneAnschlussblech({...w,bleilappenManuell:""});
  return {a0:g0&&g0.anzahlBleilappen,a1:g1&&g1.anzahlBleilappen,m1:g1&&g1.bleilappenManuell,b1:g1&&g1.bleilappenBerechnet,a2:g2&&g2.anzahlBleilappen,m2:g2&&g2.bleilappenManuell,
   feld:!!document.getElementById("anb_bleilappenManuell")};
 });
 p(a.feld,"Eingabefeld vorhanden",a);
 p(a.a1===12&&a.m1===true&&a.b1===a.a0&&a.a2===a.a0&&a.m2===false,"von Hand 12 gilt, leer = berechnet",a);

 console.log("\nE · Formfelder von Hand");
 const f=await page.evaluate(()=>{
  const nodes=s=>document.querySelector(s)!==null;
  return {anb:nodes("#anb_bleilappenManuell")};
 });
 p(f.anb,"Anschlussblech-Feld im Dokument",f);

 console.log("\nF · Freies Profil: Bezeichnung der Massaufnahme");
 const fp=await page.evaluate(()=>{
  fpA=fpaLeer();
  fpA.schenkel=[{laenge:20,winkel:0},{laenge:150,winkel:90},{laenge:40,winkel:-90}];
  fpSchenkel=fpA.schenkel;
  fpA.segmente=[{laenge:2000,massen:[{mass:20},{mass:150}]}];
  fpSegmente=fpA.segmente;
  const t=document.getElementById("measTitle");
  t.value="Ortgangprofil Nord";
  const z1=fpaAusmassZeilen();
  t.value="";
  const z2=fpaAusmassZeilen();
  return {mit:z1[0]&&z1[0].bezeichnung,ohne:z2[0]&&z2[0].bezeichnung};
 });
 p(fp.mit==="Ortgangprofil Nord","erste Ausmass-Zeile traegt die Bezeichnung der Massaufnahme",fp);
 p(/^Freies Profil, \d+ Schenkel$/.test(fp.ohne||""),"ohne Bezeichnung bleibt die bisherige Zeile",fp);

 console.log("\nG · Komplettausmass: Bleilappen nur einmal, ohne (Teil)");
 const ka=await page.evaluate(()=>{
  const mk=(id,n)=>({id,project_id:7,company_id:"A",type:"kehle",title:"X"+id,workflow_status:"zu_ruesten",data:{ausmass:[{pos:1,bezeichnung:"Bleilappen",menge:String(n),einheit:"Stk.",teil:true}]}});
  cockpitProjectId=7;projectMeasurementsCache=[mk(1,6),mk(2,8)];kaFilter="alle";kaGeladen();
  const dd=document.createElement("div");dd.innerHTML=kaBauen("card").html;
  const t=dd.textContent.replace(/\s+/g," ");
  return {anz:(t.match(/Bleilappen/g)||[]).length,teil:/\(Teil\)/.test(t),summe:/Bleilappen\s*14 Stk/.test(t),zeile:!!dd.querySelector(".ka-bleilappen")};
 });
 p(ka.anz===1&&!ka.teil&&ka.summe&&!ka.zeile,"eine Kachel Bleilappen 14 Stk, ohne (Teil), keine feste Zeile",ka);

 console.log("\nH · Normales Ausmass: Zugang zum Komplettausmass");
 const am=await page.evaluate(()=>{
  const r={};
  r.da=!!document.getElementById("amKomplett")&&!!document.getElementById("amKomplettBody");
  cockpitProjectId=7;amSelectedProjectId=7;
  projectMeasurementsCache=[{id:1,project_id:7,company_id:"A",type:"kehle",title:"X",workflow_status:"zu_ruesten",data:{ausmass:[{pos:1,bezeichnung:"Bleilappen",menge:"6",einheit:"Stk.",teil:true}]}}];
  kaFilter="alle";kaGeladen();
  const d=document.getElementById("amKomplett");d.open=true;d.dispatchEvent(new Event("toggle"));
  r.mit=document.getElementById("amKomplettBody").textContent.replace(/\s+/g," ");
  amSelectedProjectId=9;kaAmZeigen();r.fremd=document.getElementById("amKomplettBody").textContent;
  amSelectedProjectId=null;kaAmZeigen();r.keins=document.getElementById("amKomplettBody").textContent;
  return r;
 });
 p(am.da,"Bereich im Ausmass-Formular vorhanden",am);
 p(/Bleilappen\s*6 Stk/.test(am.mit),"zeigt das Komplettausmass des Projekts (Kacheln)",am.mit);
 p(/aus dem Projekt geöffnet/.test(am.fremd)&&/Zuerst ein Projekt/.test(am.keins),"anderes/kein Projekt: Hinweis statt falscher Zahlen",[am.fremd,am.keins]);

 p(fehler.length===0,"keine JS-Fehler",fehler);
 await b.close();
 console.log("\n"+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

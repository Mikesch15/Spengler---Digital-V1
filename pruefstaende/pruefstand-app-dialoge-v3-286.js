// Prueft v3.286: eigene Dialoge statt Browser-Dialoge (js/84-app-dialoge.js).
// Gemeldet mit Bildschirmfoto: der Browser-Dialog beginnt mit "Auf
// mikesch15.github.io wird Folgendes angezeigt:" - das laesst sich bei alert()/
// confirm()/prompt() nicht ausblenden. Jede Probe hat eine Gegenprobe.
//
//   A  die drei Dialoge: OK/Abbrechen/Eingabe liefern die richtigen Antworten
//   B  Escape und die Zurueck-Taste des Geraets brechen ab; die Reihe bleibt nicht haengen
//   C  mehrere Dialoge kommen nacheinander, in der Reihenfolge der Anfrage
//   D  KEIN Browser-Dialog: der Kopf mit der Adresse kann nicht erscheinen
//   E  im Quelltext steht kein nativer alert()/confirm()/prompt() mehr
//   F  die Prueflaeufe selbst behalten die nativen Dialoge (navigator.webdriver)
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:800},locale:"de-CH"});
 const fehler=[],nativ=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>{nativ.push(d.type()+":"+d.message());d.accept()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);

 // F: ohne Umschalter bleibt es nativ (so laufen die uebrigen Pruefstaende)
 const nat=await page.evaluate(async()=>({webdriver:navigator.webdriver,antwort:await appConfirm("nativ?")}));
 p(nat.webdriver===true&&nat.antwort===true&&nativ.join("|").includes("confirm:nativ?"),"F automatisierte Laeufe behalten die nativen Dialoge",{nat,nativ});
 nativ.length=0;
 await page.evaluate(()=>{window.__appDialogEcht=true});

 const sicht=()=>page.evaluate(()=>({auf:!$("appDialogModal").hidden,text:$("appDialogText").textContent,
   eingabe:!$("appDialogEingabe").hidden,abbruch:!$("appDialogAbbruch").hidden,ok:$("appDialogOk").textContent}));
 // A: confirm OK
 await page.evaluate(()=>{window.__r=null;appConfirm("Wirklich loeschen?").then(v=>window.__r=v)});
 let s=await sicht();
 p(s.auf&&s.text==="Wirklich loeschen?"&&s.abbruch&&!s.eingabe,"A Rueckfrage zeigt Text, OK und Abbrechen",s);
 await page.click("#appDialogOk"); await page.waitForTimeout(50);
 p(await page.evaluate(()=>window.__r)===true&&!(await sicht()).auf,"A OK -> true, Dialog zu");
 // Gegenprobe: Abbrechen
 await page.evaluate(()=>{window.__r=null;appConfirm("x").then(v=>window.__r=v)});
 await page.click("#appDialogAbbruch"); await page.waitForTimeout(50);
 p(await page.evaluate(()=>window.__r)===false,"A Gegenprobe: Abbrechen -> false");
 // alert
 await page.evaluate(()=>{window.__r="offen";appAlert("Gespeichert").then(()=>window.__r="zu")});
 s=await sicht();
 p(s.auf&&!s.abbruch&&s.text==="Gespeichert","A Hinweis hat nur OK",s);
 await page.click("#appDialogOk"); await page.waitForTimeout(50);
 p(await page.evaluate(()=>window.__r)==="zu","A OK schliesst den Hinweis");
 // prompt
 await page.evaluate(()=>{window.__r="offen";appPrompt("Name?","Vorgabe").then(v=>window.__r=v)});
 s=await sicht();
 p(s.eingabe&&await page.inputValue("#appDialogEingabe")==="Vorgabe","A Eingabe zeigt die Vorgabe",s);
 await page.fill("#appDialogEingabe","Neu"); await page.press("#appDialogEingabe","Enter"); await page.waitForTimeout(50);
 p(await page.evaluate(()=>window.__r)==="Neu","A Enter bestaetigt die Eingabe");
 await page.evaluate(()=>{window.__r="offen";appPrompt("Name?").then(v=>window.__r=v)});
 await page.click("#appDialogAbbruch"); await page.waitForTimeout(50);
 p(await page.evaluate(()=>window.__r)===null,"A Gegenprobe: Abbrechen bei der Eingabe -> null");

 // B: Escape
 await page.evaluate(()=>{window.__r="offen";appConfirm("x").then(v=>window.__r=v)});
 await page.waitForTimeout(150); await page.keyboard.press("Escape"); await page.waitForTimeout(50);
 p(await page.evaluate(()=>window.__r)===false,"B Escape bricht ab");
 // B: Zurueck-Taste des Geraets
 await page.evaluate(()=>{window.__r="offen";appConfirm("x").then(v=>window.__r=v)});
 await page.waitForTimeout(100);
 await page.evaluate(()=>history.back()); await page.waitForTimeout(300);
 p(await page.evaluate(()=>window.__r)===false&&!(await sicht()).auf,"B die Zurueck-Taste des Geraets bricht ab - die App bleibt offen");
 // danach funktioniert die Reihe weiter
 await page.evaluate(()=>{window.__r="offen";appConfirm("y").then(v=>window.__r=v)});
 await page.click("#appDialogOk"); await page.waitForTimeout(50);
 p(await page.evaluate(()=>window.__r)===true,"B danach laeuft der naechste Dialog normal");

 // C: Reihenfolge
 await page.evaluate(()=>{window.__o=[];
  appAlert("eins").then(()=>window.__o.push("eins"));
  appConfirm("zwei").then(v=>window.__o.push("zwei:"+v));
  appConfirm("drei").then(v=>window.__o.push("drei:"+v));});
 const texte=[];
 for(let i=0;i<3;i++){texte.push((await sicht()).text);
  await page.click(i===2?"#appDialogAbbruch":"#appDialogOk"); await page.waitForTimeout(50);}
 const o=await page.evaluate(()=>window.__o);
 p(JSON.stringify(texte)==='["eins","zwei","drei"]'&&JSON.stringify(o)==='["eins","zwei:true","drei:false"]',"C drei Dialoge nacheinander, in Anfragereihenfolge",{texte,o});
 p(!(await sicht()).auf,"C danach ist nichts mehr offen");

 // G: ein echter Ablauf der App mit dem eigenen Dialog (nicht nur die Bausteine)
 await page.evaluate(()=>{window.__v=null;$("measurementEditModal").hidden=false;isDirty=true;
  a2FormularVerlassen().then(v=>window.__v=v)});
 await page.waitForTimeout(100);
 s=await sicht();
 p(s.auf&&/ungespeicherte Eingaben/.test(s.text),"G Formular verlassen fragt im eigenen Dialog",s);
 await page.click("#appDialogAbbruch"); await page.waitForTimeout(80);
 p(await page.evaluate(()=>window.__v)===false&&await page.evaluate(()=>!$("measurementEditModal").hidden),"G Nein: das Formular bleibt offen");
 await page.evaluate(()=>{window.__v=null;a2FormularVerlassen().then(v=>window.__v=v)});
 await page.waitForTimeout(100); await page.click("#appDialogOk"); await page.waitForTimeout(80);
 p(await page.evaluate(()=>window.__v)===true&&await page.evaluate(()=>$("measurementEditModal").hidden),"G Ja: das Formular ist zu");

 // D: kein nativer Dialog trotz Handler
 p(nativ.length===0,"D waehrend all dem erschien KEIN Browser-Dialog",nativ);

 // E: Quelltext
 const alle=fs.readdirSync("js").filter(f=>f.endsWith(".js")&&f!=="84-app-dialoge.js").map(f=>[f,fs.readFileSync("js/"+f,"utf8")]);
 const rest=[];
 alle.forEach(([f,t])=>t.split("\n").forEach((z,i)=>{
  const c=z.replace(/\/\/.*$/,"").replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,"''");
  if(/(^|[^\w$.])(window\.)?(alert|confirm|prompt)\(/.test(c))rest.push(f+":"+(i+1));
 }));
 p(rest.length===0,"E im Quelltext steht kein nativer alert()/confirm()/prompt() mehr",rest.slice(0,5));
 // Gegenprobe: die Suche erkennt einen nativen Aufruf wirklich
 p(/(^|[^\w$.])(window\.)?(alert|confirm|prompt)\(/.test(" if(!confirm('x'))return;"),"E Gegenprobe: das Suchmuster erkennt confirm(");
 const sw=fs.readFileSync("sw.js","utf8"),ix=fs.readFileSync("index.html","utf8");
 p(sw.includes("./js/84-app-dialoge.js")&&ix.includes('src="js/84-app-dialoge.js"'),"E die Datei steht in sw.js UND index.html");
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();

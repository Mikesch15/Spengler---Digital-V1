// Prueft die Umstellung aus v3.151: die neue Ansicht ist die VORGABE, und
// das Firmenlogo bleibt sichtbar.
//
// WAS HIER GEPRUEFT WIRD
//   A  Auf einem frischen Geraet erscheint die neue Ansicht, mit einem
//      einmaligen Hinweis, der den Weg zurueck nennt.
//   B  Wer sich ausdruecklich fuer die klassische Ansicht entschieden hat,
//      behaelt sie - eine geaenderte Vorgabe stoesst keine Wahl um.
//   C  Das Firmenlogo erscheint in der Markenzeile, und zwar aus derselben
//      Quelle wie auf der klassischen Startseite (keine zweite Aufloesung
//      des privaten Speicherpfads). Ohne Logo bleibt kein leerer Kasten.
//
// WAS HIER NICHT GEPRUEFT WIRD
//   Der Inhalt der neuen Ansicht selbst - der steht in
//   pruefstand-ansicht2-v3-150.js.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-ansicht2-vorgabe-v3-151.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};
const STUB=`window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 rpc:async()=>({data:null,error:null}),
 from:()=>{const f={};['select','order','limit','range','eq','in','not'].forEach(k=>f[k]=()=>f);
  f.maybeSingle=async()=>({data:null,error:null});
  f.then=(r)=>Promise.resolve({data:[],error:null}).then(r);return f},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:null})})}
})};`;
const anmelden=page=>page.evaluate(()=>{
 currentProfile={id:"u1",first_name:"Mike",last_name:"Ledermann",role:"admin"};
 companyName="Peter Künzi AG";
 allProjects=[{id:1,name:"Neubau",object:"Hofmattstrasse 4, 3400 Burgdorf",order_no:"26-011",status:"in_arbeit",archived:false,updated_at:"2026-09-21T10:00:00Z"}];
 aufgabenListe=[];
 $("authScreen").hidden=true;$("appRoot").hidden=false;$("startScreen").hidden=false;
});
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad()});
 const fehler=[];
 const neuePage=async()=>{
  const pg=await b.newPage({viewport:{width:390,height:844}});
  pg.on("pageerror",e=>fehler.push(String(e)));
  await pg.addInitScript(STUB);
  return pg;
 };

 // --- A: frisches Geraet -> neue Ansicht ist Vorgabe ---
 let page=await neuePage();
 await page.goto(APP);
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 await anmelden(page);
 await page.evaluate(()=>{showStart()});
 let a=await page.evaluate(()=>({
  gespeichert:localStorage.getItem("sd_ansicht2"),
  aktiv:a2Aktiv(),
  a2:$("a2Screen").getClientRects().length>0,
  nav:$("startNav").getClientRects().length>0,
  hinweis:!!document.querySelector(".a2-karte-hinweis"),
  marke:$("a2Inhalt").querySelector(".a2-marke")?$("a2Inhalt").querySelector(".a2-marke").textContent.trim():""
 }));
 p(a.gespeichert===null,"A1 nichts gespeichert - es zaehlt die Vorgabe",a);
 p(a.aktiv&&a.a2&&!a.nav,"A2 die neue Ansicht ist die Vorgabe",a);
 p(a.hinweis,"A3 der einmalige Hinweis steht da",a);
 p(a.marke==="Peter Künzi AG","A4 die Markenzeile nennt die Firma (ohne Logo nur der Name)",a);

 // "Verstanden" -> Hinweis weg, Ansicht bleibt
 await page.click('[data-a2-tu="hinweisweg"]');
 let a2=await page.evaluate(()=>({
  hinweis:!!document.querySelector(".a2-karte-hinweis"),
  a2:$("a2Screen").getClientRects().length>0,
  gespeichert:localStorage.getItem("sd_ansicht2"),
  merker:localStorage.getItem("sd_ansicht2Hinweis")
 }));
 p(!a2.hinweis&&a2.a2,"A5 'Verstanden' schliesst den Hinweis, die Ansicht bleibt",a2);
 p(a2.gespeichert===null&&a2.merker==="weg","A6 es wird nur der Hinweis gemerkt, keine Ansichtswahl",a2);
 await page.close();

 // --- B: wer sich fuer klassisch entschieden hat, behaelt sie ---
 page=await neuePage();
 await page.goto(APP);
 await page.evaluate(()=>localStorage.setItem("sd_ansicht2","nein"));
 await page.reload();
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 await anmelden(page);
 await page.evaluate(()=>{showStart()});
 let bb=await page.evaluate(()=>({
  aktiv:a2Aktiv(),
  a2:$("a2Screen").getClientRects().length>0,
  nav:$("startNav").getClientRects().length>0,
  logo:$("startLogo").hidden
 }));
 p(!bb.aktiv&&!bb.a2&&bb.nav,"B1 eine ausdrueckliche Wahl fuer klassisch bleibt bestehen",bb);
 await page.close();

 // --- C: mit Logo ---
 page=await neuePage();
 await page.goto(APP);
 await page.waitForFunction(()=>typeof a2Aktiv==="function");
 await anmelden(page);
 await page.evaluate(()=>{
  // So wie js/05 es tut, wenn ein Logo hinterlegt ist.
  $("startLogo").src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  $("startLogo").hidden=false;
  showStart();
 });
 await page.waitForTimeout(150);
 let c=await page.evaluate(()=>{
  const m=$("a2Inhalt").querySelector(".a2-marke");
  return {bild:!!(m&&m.querySelector("img")),
          quelle:a2LogoQuelle().slice(0,20),
          text:m?m.textContent.trim():""};
 });
 p(c.bild,"C1 das hinterlegte Logo erscheint in der Markenzeile",c);
 p(c.quelle.startsWith("data:image"),"C2 es ist dieselbe Adresse wie auf der klassischen Startseite",c);

 // Gegenprobe: Logo wieder weg -> kein Platzhalter
 await page.evaluate(()=>{$("startLogo").hidden=true;$("startLogo").removeAttribute("src");a2Zeichnen()});
 let c2=await page.evaluate(()=>({
  bild:!!$("a2Inhalt").querySelector(".a2-marke img"),
  text:$("a2Inhalt").querySelector(".a2-marke").textContent.trim()
 }));
 p(!c2.bild&&c2.text==="Peter Künzi AG","C3 ohne Logo bleibt nur der Name - kein leerer Kasten",c2);

 p(fehler.length===0,"D1 keine Javascript-Fehler",fehler);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 await b.close();
 process.exit(fail?1:0);
})();

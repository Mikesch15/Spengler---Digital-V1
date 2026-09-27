// Prueft, dass die App zur Laufzeit KEINEN fremden Server mehr braucht (v3.205).
//
// Gefunden beim App-Audit: index.html lud zwei Bibliotheken von
// cdn.jsdelivr.net - supabase-js (Zeile 14) und xlsx (Zeile 15), beide als
// blockierende <script> im Kopf.
//
// Warum das schlimmer war, als es aussieht:
//   1. OHNE supabase-js startet die App ueberhaupt nicht. Sie war damit von
//      einem fremden Server abhaengig, BEVOR irgendetwas anderes lief.
//   2. Der Service Worker kann daran nichts aendern: sein fetch-Handler
//      steigt bei fremden Adressen sofort aus ("origin !== self.location
//      .origin -> return"). Was nicht aus dem eigenen Haus kommt, landet nie
//      im Vorrat. Ob die App ohne Verbindung hochkam, hing also allein am
//      Browser-Zwischenspeicher - und der wird geleert, wann er will.
//      Die App WIRBT mit Offline-Faehigkeit (Warteschlange, App-Vorrat).
//   3. Die Adresse lautete "@2", also "was dort gerade als 2.x liegt". Eine
//      Produktiv-App, deren Datenbankbibliothek sich stillschweigend
//      austauscht, ist nicht pruefbar.
//   4. xlsx sind 880 kB, die bei JEDEM Start geladen und ausgefuehrt wurden,
//      fuer zwei Funktionen, die man selten und nie auf dem Dach braucht.
//
// Geprueft wird:
//   A  index.html nennt keine fremde Adresse mehr,
//   B  supabase-js liegt im Projekt UND im App-Vorrat (sw.js),
//   C  xlsx liegt im Projekt, aber ABSICHTLICH NICHT im Vorrat und nicht
//      im Kopf - es wird nachgeladen,
//   D  der Nachlader gibt es und beide Aufrufstellen benutzen ihn,
//   E  im Browser: die Seite laedt wirklich nichts von aussen, und die
//      vendorierte Bibliothek ist eine echte, brauchbare supabase-js.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-fremdserver-v3-205.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const fs=require("fs"), path=require("path");
const APP="file://"+path.join(process.cwd(),"index.html");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,400):""))}};
const lies=f=>fs.readFileSync(path.join(process.cwd(),f),"utf8");

(async()=>{
 // ---- A  Keine fremde Adresse mehr im Kopf --------------------------------
 console.log("\nA · index.html ohne fremden Server");
 const html=lies("index.html");
 // Gesucht wird in den ECHTEN Verweisen, nicht in Kommentaren: die
 // Begruendung darf die alte Adresse nennen, ohne die Pruefung zu brechen.
 const ohneKommentar=html.replace(/<!--[\s\S]*?-->/g,"");
 const quellen=[...ohneKommentar.matchAll(/<(?:script|link)[^>]*?(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
 const fremd=quellen.filter(q=>/^https?:\/\//i.test(q)||q.startsWith("//"));
 p(fremd.length===0,"kein <script>/<link> zeigt auf einen fremden Server",fremd);
 p(ohneKommentar.indexOf("cdn.jsdelivr.net")<0,
   "cdn.jsdelivr.net kommt in keinem Verweis mehr vor");

 // ---- B  supabase-js: im Projekt und im Vorrat ----------------------------
 console.log("\nB · supabase-js");
 p(fs.existsSync("vendor/supabase.umd.min.js"),"die Datei liegt im Projekt");
 p(fs.existsSync("vendor/supabase-LICENSE.txt"),"mit ihrer Lizenz (MIT)");
 p(quellen.indexOf("vendor/supabase.umd.min.js")>=0,
   "index.html laedt sie aus dem eigenen Haus",quellen.slice(0,3));
 const sw=lies("sw.js");
 p(sw.indexOf('"./vendor/supabase.umd.min.js"')>=0,
   "sie steht im App-Vorrat - ohne sie startet die App nicht, sie MUSS offline da sein");

 // ---- C  xlsx: im Projekt, bewusst NICHT im Vorrat ------------------------
 console.log("\nC · xlsx wird nicht mehr beim Start geladen");
 p(fs.existsSync("vendor/xlsx.full.min.js"),"die Datei liegt im Projekt");
 p(fs.existsSync("vendor/xlsx-LICENSE.txt"),"mit ihrer Lizenz (Apache-2.0)");
 p(quellen.filter(q=>q.indexOf("xlsx")>=0).length===0,
   "sie haengt NICHT mehr im Kopf von index.html",quellen.filter(q=>q.indexOf("xlsx")>=0));
 // Gegenprobe zur Verwechslung "weg = vergessen": sie ist absichtlich nicht
 // im Vorrat, und der Grund steht dort auch.
 p(sw.indexOf("xlsx.full.min.js")<0||sw.indexOf('"./vendor/xlsx.full.min.js"')<0,
   "und absichtlich nicht im App-Vorrat - sonst zahlte jede Installation die 880 kB");
 const kb=Math.round(fs.statSync("vendor/xlsx.full.min.js").size/1024);
 p(kb>500,"sie ist auch wirklich so gross ("+kb+" kB) - die Ersparnis ist keine Behauptung",kb);

 // ---- D  Der Nachlader und seine zwei Aufrufstellen -----------------------
 console.log("\nD · der Nachlader");
 const basis=lies("js/01-basis.js");
 p(/function xlsxLaden\(/.test(basis),"xlsxLaden() steht in js/01");
 p(basis.indexOf('"vendor/xlsx.full.min.js"')>=0,"und laedt aus dem eigenen Haus");
 // Kein Rueckfall auf ein CDN - das waere eine zweite Quelle und damit
 // genau der Zustand, den diese Version abschafft.
 p(basis.indexOf("cdn.jsdelivr")<0&&basis.indexOf("cdn.sheetjs")<0,
   "ohne Rueckfall auf einen fremden Server");

 // ---- D2  ZXing: derselbe Fall, beim Audit zuerst uebersehen -------------
 // Diese Pruefung hat ihn gefunden: A und B sahen nur in index.html nach,
 // ZXing wird aber aus js/01 heraus nachgeladen. Gescannt wird im Lager -
 // oft der Ort mit dem schlechtesten Empfang im Haus. Deshalb prueft der
 // naechste Absatz nicht mehr eine einzelne Datei, sondern ALLE.
 console.log("\nD2 · ZXing (Barcode-Scan)");
 p(fs.existsSync("vendor/zxing.umd.min.js"),"die Datei liegt im Projekt");
 p(fs.existsSync("vendor/zxing-LICENSE.txt"),"mit ihrer Lizenz (MIT)");
 p(basis.indexOf('s.src="vendor/zxing.umd.min.js"')>=0,
   "zxingLaden() holt sie aus dem eigenen Haus");
 // Wie xlsx absichtlich nicht im Vorrat: sie wird nur im Lager gebraucht.
 p(sw.indexOf("zxing")<0,"und absichtlich nicht im App-Vorrat - nur wer scannt, zahlt sie");

 // ---- D3  Die Regel gilt fuer JEDE Datei unter js/ -----------------------
 // Eine Pruefung, die nur die drei bekannten Namen kennt, findet den
 // vierten nicht. Deshalb wird hier stumpf jede Datei durchgesehen.
 const alleJs=fs.readdirSync("js").filter(f=>f.endsWith(".js"));
 const mitFremd=[];
 alleJs.forEach(f=>{
  // Kommentare raus - auch die am Zeilenende (js/10 erklaert dort eine
  // gespeicherte Bild-Adresse mit "https://...", das ist keine Ladestelle).
  const t=lies("js/"+f)
   .replace(/\/\*[\s\S]*?\*\//g,"").replace(/\/\/[^\n]*/g,"");
  // Gesucht wird eine Adresse, die geladen wird - nicht jede http-Zeichenkette.
  // Ausgenommen:
  //   - supabase.co / supabase.in: das IST die eigene Datenbank,
  //   - www.w3.org: XML-Namensraeume (createElementNS fuer SVG). Die werden
  //     nie abgerufen, sie sind blosse Kennungen - eine Regel, die sie
  //     mitzaehlt, meldet 20 Fehler, die keine sind, und wird deshalb
  //     ignoriert. Genau das soll diese Pruefung nicht werden.
  const treffer=[...t.matchAll(/["'`](https?:\/\/[^"'`\s]+)["'`]/g)].map(m=>m[1])
   .filter(u=>u.indexOf("supabase.co")<0&&u.indexOf("supabase.in")<0
              &&u.indexOf("www.w3.org/")<0);
  if(treffer.length)mitFremd.push({datei:"js/"+f,adressen:treffer.slice(0,3)});
 });
 p(mitFremd.length===0,
   "keine einzige Datei unter js/ laedt von einem fremden Server ("+alleJs.length+" geprueft)",
   mitFremd);
 const fb=lies("js/02-feedback.js"), kat=lies("js/08-katalog-blitzschutz.js");
 p(/await xlsxLaden\(\)/.test(fb),"der Feedback-Export wartet darauf");
 p(/await xlsxLaden\(\)/.test(kat),"der Katalog-Import ebenfalls");
 // Gegenprobe: beide duerfen XLSX nicht mehr blind benutzen, ohne vorher
 // geladen zu haben - sonst waere der Nachlader Zierde.
 p(fb.indexOf("xlsxLaden")<fb.indexOf("XLSX.utils"),
   "und zwar VOR dem ersten Zugriff auf XLSX (Feedback)");
 p(kat.indexOf("xlsxLaden")<kat.indexOf("XLSX.read"),
   "und VOR dem ersten Zugriff auf XLSX (Katalog)");

 // ---- E  Im Browser: nichts geht nach draussen ----------------------------
 console.log("\nE · im Browser gemessen");
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:390,height:900}});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 // JEDE Anfrage mitschreiben - auch die, die scheitern wuerden.
 const nachDraussen=[];
 page.on("request",r=>{
  const u=r.url();
  if(/^https?:/i.test(u))nachDraussen.push(u);
 });
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(900);
 p(nachDraussen.length===0,
   "die Seite fragt beim Start keinen einzigen fremden Server",nachDraussen.slice(0,5));

 // Die vendorierte Bibliothek ist eine ECHTE supabase-js, keine leere Huelle.
 // Ohne diese Probe koennte man eine kaputte Datei einchecken und alles
 // oben waere trotzdem gruen.
 const echt=await page.evaluate(()=>{
  if(typeof supabase!=="object"||!supabase)return {da:false};
  if(typeof supabase.createClient!=="function")return {da:true,createClient:false};
  const c=supabase.createClient("https://beispiel.supabase.co","nur-ein-testschluessel");
  return {da:true,createClient:true,
          from:typeof c.from,auth:typeof c.auth,rpc:typeof c.rpc,
          storage:typeof c.storage,functions:typeof c.functions};
 });
 p(echt.da&&echt.createClient,"vendor/supabase.umd.min.js stellt createClient bereit",echt);
 p(echt.from==="function"&&echt.rpc==="function"&&echt.auth==="object"
   &&echt.storage==="object"&&echt.functions==="object",
   "und der Client kann alles, was die App von ihm braucht",echt);
 // XLSX darf jetzt NICHT da sein - das ist der ganze Punkt.
 const xlsxDa=await page.evaluate(()=>typeof XLSX!=="undefined");
 p(!xlsxDa,"XLSX ist beim Start nicht geladen",{XLSX:xlsxDa});
 // Und der Nachlader holt es wirklich.
 const nachgeladen=await page.evaluate(async()=>{
  const gut=await xlsxLaden();
  return {gut,jetztDa:typeof XLSX!=="undefined",
          zweitesMal:await xlsxLaden()};
 });
 p(nachgeladen.gut&&nachgeladen.jetztDa,"xlsxLaden() holt es nach",nachgeladen);
 p(nachgeladen.zweitesMal===true,"und ein zweiter Aufruf liefert es sofort",nachgeladen);
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,3));

 await b.close();
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

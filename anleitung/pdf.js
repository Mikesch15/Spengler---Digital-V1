const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const path=require("path"),fs=require("fs");
(async()=>{
 const b=await chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",args:["--no-sandbox"]});
 const page=await b.newPage({locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("requestfailed",r=>fehler.push("nicht geladen: "+r.url().split("/").pop()));
 await page.goto("file://"+process.env.HTML,{waitUntil:"networkidle"});
 await page.emulateMedia({media:"print"});
 await page.waitForTimeout(600);
 // Fehlende Bilder aufspueren, statt sie stumm wegzulassen.
 const kaputt=await page.evaluate(()=>[...document.images]
   .filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute("src")));
 await page.pdf({path:process.env.PDF,format:"A4",printBackground:true,
   displayHeaderFooter:false,preferCSSPageSize:true});
 await b.close();
 console.log("Bilder ohne Inhalt: "+(kaputt.length?kaputt.join(", "):"keine"));
 console.log("Fehler: "+(fehler.length?fehler.join(" | "):"keine"));
 console.log("PDF: "+Math.round(fs.statSync(process.env.PDF).size/1024)+" kB");
})();

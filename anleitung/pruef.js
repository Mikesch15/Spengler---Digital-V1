// Schlusskontrolle: jede Seite rastern und messen, wie viel darauf steht.
const fs=require("fs");
const SD=process.env.SP;
const {createCanvas}=require(SD+"/node_modules/@napi-rs/canvas");
(async()=>{
 const pdfjs=await import(SD+"/node_modules/pdfjs-dist/legacy/build/pdf.mjs");
 const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(process.env.PDF))}).promise;
 const leer=[],voll=[];
 for(let n=1;n<=doc.numPages;n++){
  const s=await doc.getPage(n);
  const vp=s.getViewport({scale:0.6});
  const c=createCanvas(vp.width,vp.height),ctx=c.getContext("2d");
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,vp.width,vp.height);
  await s.render({canvasContext:ctx,viewport:vp}).promise;
  const d=ctx.getImageData(0,0,c.width,c.height).data;
  let bunt=0;
  for(let i=0;i<d.length;i+=4) if(d[i]<245||d[i+1]<245||d[i+2]<245) bunt++;
  const anteil=bunt/(c.width*c.height);
  // Text der Seite, um leere von bebilderten zu unterscheiden
  const txt=(await s.getTextContent()).items.map(x=>x.str).join("").trim();
  const zeile=String(n).padStart(2)+"  Fläche "+(anteil*100).toFixed(1).padStart(5)+"%  Text "+String(txt.length).padStart(5);
  if(anteil<0.02&&txt.length<40){leer.push(n);console.log(zeile+"   << FAST LEER")}
  else console.log(zeile);
 }
 console.log("\nSeiten gesamt: "+doc.numPages);
 console.log("Fast leere Seiten: "+(leer.length?leer.join(", "):"keine"));
})();

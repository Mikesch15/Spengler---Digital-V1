const fs=require("fs"),path=require("path");
const SD=process.env.SP;
const {createCanvas}=require(SD+"/node_modules/@napi-rs/canvas");
(async()=>{
 const pdfjs=await import(SD+"/node_modules/pdfjs-dist/legacy/build/pdf.mjs");
 const daten=new Uint8Array(fs.readFileSync(process.env.PDF));
 const doc=await pdfjs.getDocument({data:daten}).promise;
 console.log("Seiten: "+doc.numPages);
 const seiten=(process.env.SEITEN||"1").split(",").map(Number);
 for(const n of seiten){
  const s=await doc.getPage(n);
  const vp=s.getViewport({scale:1.4});
  const c=createCanvas(vp.width,vp.height), ctx=c.getContext("2d");
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,vp.width,vp.height);
  await s.render({canvasContext:ctx,viewport:vp}).promise;
  const d=path.join(process.env.AUS,"seite-"+String(n).padStart(2,"0")+".png");
  fs.writeFileSync(d,c.toBuffer("image/png"));
  console.log("  "+d.split("/").pop()+"  "+Math.round(vp.width)+"x"+Math.round(vp.height));
 }
})();

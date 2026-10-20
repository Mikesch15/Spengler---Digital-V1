// v3.408: Rüstblatt drucken – Mindestgrösse beim Verkleinern (lesbar bleiben).
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
 const ev=(f,...a)=>page.evaluate(f,...a);
 const seiten=h=>ev(hs=>{const d=document.implementation.createHTMLDocument("t");hs.forEach(x=>{const s=d.createElement("div");s.className="rb-druck-seite";s.style.height=x+"px";d.body.appendChild(s)});
   document.body.appendChild(d.body.cloneNode(true));const real=[...document.body.querySelectorAll(".rb-druck-seite")].slice(-hs.length);
   const fake={querySelectorAll:()=>real};const z=rbDruckSeitenEinpassen(fake);real.forEach(r=>r.remove());return {z,min:RB_DRUCK_MIN_ZOOM}},h);
 const A4=Math.round((297-14-17-14)*96/25.4);
 let r=await seiten([A4-50,A4+10,Math.round(A4*1.15),A4*3,A4*10]);
 p(r.min===0.8,"Mindestgrösse beim Verkleinern: 80 % (vorher 55 %)",r.min);
 p(r.z[0]===1,"Passt die Seite, wird nichts verkleinert",r.z);
 p(r.z[1]<1&&r.z[1]>=0.9&&r.z[2]>=0.8&&r.z[2]<0.9,"Etwas zu hoch: nur so weit verkleinern wie nötig (proportional)",r.z);
 p(r.z[3]===0.8&&r.z[4]===0.8,"Sehr hohe Seiten: nie kleiner als 80 % – der Rest läuft auf die nächste Seite",r.z);
 p(r.z.every(z=>z>=0.8),"Keine Seite wird kleiner als die Mindestgrösse",r.z);
 p(!/Math\.max\(0\.55/.test(fs.readFileSync("js/80-ruestblatt.js","utf8")),"Der alte Wert 55 % steht nicht mehr im Code");
 p(page.__f.length===0,"keine Seitenfehler",page.__f);
 await b.close();console.log("\n"+ok+" ok, "+fail+" FEHLGESCHLAGEN");process.exit(fail?1:0);
})();

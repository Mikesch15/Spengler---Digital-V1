// Prueft normlaengenPlan() gegen eine unabhaengige, vollstaendige Suche.
// Aufruf:  node prototyp/pruefstand-verschnitt.js   (aus dem Repo-Wurzelverzeichnis)
// Die Referenz zaehlt NICHT den Code nach, sondern probiert stur alle
// Zuordnungen durch - fuer kleine Faelle ist das beweisbar das Optimum.
const fs=require("fs"),vm=require("vm");
const src=fs.readFileSync("prototyp/prototyp-rinne.js","utf8");
const von=src.indexOf("const NORMLAENGEN_SPEICHER");
const bis=src.indexOf("function zuschnittStuecke(");
const ctx={console,localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
 zahl:v=>{const n=Number(v);return Number.isFinite(n)?n:0},Math,JSON,Array,Number,String,Object};
vm.createContext(ctx);
vm.runInContext(src.slice(von,bis),ctx);

let ok=0,fail=0;
const p=(b,t,z)=>{if(b)ok++;else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z):""))}};

// Referenz: kleinste Gesamtlaenge, mit der alle Stuecke unterzubringen sind.
// Vollstaendige Suche ueber Stangen-Multimengen + alle Zuordnungen.
function optimumBrute(stuecke,normen){
 const S=stuecke.reduce((a,b)=>a+b,0);
 const maxN=Math.max(...normen);
 if(stuecke.some(x=>x>maxN))return null;
 const nsort=[...normen].sort((a,b)=>b-a);
 // Obergrenze: jedes Stueck eine eigene, kleinstmoegliche Stange
 let ober=0;
 stuecke.forEach(x=>{ober+=Math.min(...nsort.filter(n=>n>=x))});
 const kombis=[];
 (function baue(i,counts,summe){
  if(summe>ober)return;
  if(i===nsort.length){if(summe>=S)kombis.push({counts:[...counts],summe});return}
  for(let c=0;c*nsort[i]+summe<=ober;c++){counts[i]=c;baue(i+1,counts,summe+c*nsort[i])}
  counts[i]=0;
 })(0,nsort.map(()=>0),0);
 kombis.sort((a,b)=>a.summe-b.summe);
 for(const k of kombis){
  const kap=[];k.counts.forEach((c,i)=>{for(let j=0;j<c;j++)kap.push(nsort[i])});
  if(!kap.length)continue;
  // stur alle Zuordnungen
  const rest=[...kap];
  const geht=(function zuordnen(i){
   if(i>=stuecke.length)return true;
   for(let b=0;b<rest.length;b++){
    if(rest[b]<stuecke[i])continue;
    rest[b]-=stuecke[i];
    if(zuordnen(i+1))return true;
    rest[b]+=stuecke[i];
   }
   return false;
  })(0);
  if(geht)return k.summe;
 }
 return null;
}

function pruefe(stuecke,normen,name){
 const r=ctx.normlaengenPlan(stuecke,normen);
 const soll=optimumBrute([...stuecke].sort((a,b)=>b-a),normen);
 // 1. Der Plan muss in sich stimmen
 if(r.ok&&r.stangen.length){
  const alle=[];r.stangen.forEach(st=>{
   const summe=st.stuecke.reduce((a,b)=>a+b,0);
   p(summe<=st.laenge,name+": keine Stange ueberladen",{st});
   p(st.rest===st.laenge-summe,name+": Rest stimmt",{st});
   p(normen.includes(st.laenge),name+": nur echte Normlaengen",{st});
   alle.push(...st.stuecke);
  });
  const soll2=[...stuecke].sort((a,b)=>a-b).join(",");
  p(alle.sort((a,b)=>a-b).join(",")===soll2,name+": jedes Stueck genau einmal",{alle,stuecke});
  p(r.gesamt===r.stangen.reduce((a,b)=>a+b.laenge,0),name+": Gesamtlaenge stimmt");
  p(r.verschnitt===r.gesamt-stuecke.reduce((a,b)=>a+b,0),name+": Verschnitt stimmt");
 }
 // 2. Und er muss das Optimum treffen
 if(soll!==null&&r.optimal)p(r.gesamt===soll,name+": Gesamtlaenge ist das Optimum",{ist:r.gesamt,soll});
 return r;
}

console.log("A · Handrechnungen");
let r=pruefe([5900],[6000],"ein Stueck 5900 / 6 m");
p(r.stangen.length===1&&r.verschnitt===100,"1 Stange, 100 mm Verschnitt",r);
r=pruefe([3000,3000],[6000],"2 x 3000 / 6 m");
p(r.stangen.length===1&&r.verschnitt===0,"beide aus EINER Stange, kein Verschnitt",r);
r=pruefe([4000,4000],[4000,5000,6000],"2 x 4000 / 4-5-6 m");
p(r.gesamt===8000&&r.verschnitt===0,"zwei 4-m-Stangen statt zweier 6-m",r);
r=pruefe([2500,2500,2500,2500],[4000,5000,6000],"4 x 2500");
p(r.gesamt===10000&&r.verschnitt===0,"2 x 5 m, kein Verschnitt",r);
r=pruefe([5000,3000,2000],[4000,5000,6000],"5000+3000+2000");
p(r.gesamt===10000&&r.verschnitt===0,"5 m + (3+2) m, kein Verschnitt",r);

console.log("B · Zu lange Stuecke werden gemeldet, nicht verschwiegen");
r=ctx.normlaengenPlan([7000,3000],[6000]);
p(r.zuLang.length===1&&r.zuLang[0]===7000,"7000 mm als zu lang gemeldet",r);
p(r.stangen.reduce((a,b)=>a+b.stuecke.length,0)===1,"nur das passende Stueck eingeplant",r);
r=ctx.normlaengenPlan([1000],null);
p(r.ok===false&&r.grund==="keine","ohne hinterlegte Normlaenge kein Plan",r);
r=ctx.normlaengenPlan([1000],[]);
p(r.ok===false&&r.grund==="keine","leere Normlaengenliste ebenso",r);
r=ctx.normlaengenPlan([],[6000]);
p(r.ok===true&&r.stangen.length===0,"keine Stuecke: leerer Plan, kein Fehler",r);

console.log("C · Zufallsfaelle gegen die vollstaendige Suche");
let seed=12345;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff};
const normSaetze=[[6000],[5000,6000],[4000,5000,6000]];
let geprueft=0;
for(let i=0;i<120;i++){
 const normen=normSaetze[Math.floor(rnd()*normSaetze.length)];
 const n=2+Math.floor(rnd()*5);
 const st=[];for(let j=0;j<n;j++)st.push(500+Math.floor(rnd()*5500));
 const soll=optimumBrute([...st].sort((a,b)=>b-a),normen);
 if(soll===null)continue;
 const res=pruefe(st,normen,"Zufall "+i+" "+JSON.stringify(st));
 if(res.optimal)geprueft++;
}
p(geprueft>=100,"genuegend Zufallsfaelle gegen die vollstaendige Suche geprueft",geprueft);

console.log("D · Groesserer, realistischer Fall laeuft und bleibt gueltig");
const t0=Date.now();
const gross=[];for(let i=0;i<24;i++)gross.push(1000+((i*937)%5000));
r=ctx.normlaengenPlan(gross,[4000,5000,6000]);
p(r.ok,"24 Stuecke: es entsteht ein Plan",{gesamt:r.gesamt,stangen:r.stangen.length});
p(r.stangen.every(s=>s.stuecke.reduce((a,b)=>a+b,0)<=s.laenge),"keine Stange ueberladen");
p(r.stangen.reduce((a,b)=>a+b.stuecke.length,0)===24,"alle 24 Stuecke eingeplant");
p(r.verschnitt>=0,"Verschnitt nie negativ",r.verschnitt);
p(Date.now()-t0<8000,"und das in vertretbarer Zeit",Date.now()-t0+" ms");

console.log(`\npruefstand-verschnitt: ${ok}/${ok+fail}`+(fail?"  FEHLGESCHLAGEN":"  - alle bestanden"));
process.exit(fail?1:0);

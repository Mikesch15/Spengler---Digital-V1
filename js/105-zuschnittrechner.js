"use strict";
// ===========================================================================
// Zuschnittrechner (v3.418)
// ===========================================================================
// Ein freies Werkzeug ohne Projekt und ohne Massaufnahme: Blechformat (Rolle
// oder Tafel) eingeben, Zuschnittmasse von Hand oder per Excel/CSV-Import,
// daraus ein Zuschnittplan mit sichtbarer Belegung - mit denselben Bausteinen
// wie der Zuschnitt in den Massaufnahmen:
//   * Schnittfuge             ebaSchnittfuge (js/29, Einstellung der Firma)
//   * Darstellung und Stil    wie das Schnittbild der Massaufnahmen (zu-bilder, js/33)
// Hier steht nur die Eingabe, die Aufbereitung der Stuecke und der Import.
// Es wird nichts in der Datenbank gespeichert; der letzte Stand bleibt als
// Bequemlichkeit im Browser dieses Geraets (localStorage).
// ===========================================================================

const ZR_SPEICHER="sd_zuschnittrechner";
const ZR_MAX_ZEILEN=500;
const ZR_ROLLEN=Object.freeze([1000,670,500,400,330,250,200]);
const ZR_TAFELN=Object.freeze([[1000,2000],[1000,3000],[1250,2500],[1250,3000],[1500,3000]]);

function zrLeer(){
 return {form:"rolle",rolle:"1000",tafelBreite:"1000",tafelLaenge:"2000",drehen:false,schritte:false,schere:"",material:"",
  zeilen:[{pos:"",bez:"",laenge:"",breite:"",anzahl:"1"}]};
}
let zrA=zrLeer();

const zrZ=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
// Zahl aus Eingabe oder Excel-Zelle: 1250 | "1'250,5" | "1250 mm" | "1 250"
function zrZahl(v){
 if(typeof v==="number")return Number.isFinite(v)?v:NaN;
 let s=String(v==null?"":v).trim().replace(/mm$/i,"").replace(/[\s'’]/g,"");
 if(!s)return NaN;
 if(/^-?\d+,\d+$/.test(s))s=s.replace(",",".");
 else s=s.replace(/,/g,"");
 return /^-?\d+(\.\d+)?$/.test(s)?Number(s):NaN;
}
const zrMm=v=>Math.round(zrZ(v)).toLocaleString("de-CH");

function zrSpeichern(){try{localStorage.setItem(ZR_SPEICHER,JSON.stringify(zrA))}catch(e){}}
function zrAusEingaben(w){
  w=(w&&typeof w==="object")?w:{};
  const a=zrLeer();
  a.form=w.form==="tafel"?"tafel":"rolle";
  ["rolle","tafelBreite","tafelLaenge","material","schere"].forEach(k=>{if(w[k]!==undefined)a[k]=String(w[k])});
  a.drehen=!!w.drehen;a.schritte=!!w.schritte;
  if(Array.isArray(w.zeilen)&&w.zeilen.length)
   a.zeilen=w.zeilen.slice(0,ZR_MAX_ZEILEN).map(z=>({pos:String(z.pos||""),bez:String(z.bez||""),laenge:String(z.laenge===undefined?"":z.laenge),
    breite:String(z.breite===undefined?"":z.breite),anzahl:String(z.anzahl===undefined?"1":z.anzahl)}));
  return a;
}
function zrLaden(){
 try{
  const w=JSON.parse(localStorage.getItem(ZR_SPEICHER)||"null");
  if(!w||typeof w!=="object")return;
  zrA=zrAusEingaben(w);
 }catch(e){}
}

// ---- Aus den Zeilen werden einzelne Stuecke -------------------------------
// Jedes Stueck bekommt eine fortlaufende Nummer; eine Zeile mit Anzahl 3 sind
// drei Stuecke mit aufeinanderfolgenden Nummern (zrNummern: von-bis je Zeile).
// "Drehen erlaubt": die kuerzere Seite wird Streifenbreite, die laengere Laenge.
function zrBleche(a,roh){
 a=a||zrA;
 const out=[],bereich=[];
 let nr=0;
 (a.zeilen||[]).forEach((z,i)=>{
  let L=zrZ(z.laenge),B=zrZ(z.breite);
  const n=Math.max(1,Math.min(1000,Math.floor(zrZ(z.anzahl)||1)));
  if(!(L>0&&B>0)){bereich[i]=null;return}
  if(a.drehen&&B>L&&!roh){const t=L;L=B;B=t}
  const von=nr+1;
  for(let k=0;k<n;k++)out.push({nr:++nr,pos:String(z.pos||"").trim(),laenge:L,breite:B,zeile:i,bez:z.bez||"",merkmal:"",hinweis:""});
  bereich[i]={von,bis:nr};
 });
 // Positionsnummern (z. B. aus der Excel-Liste): gleiche Position = gleiche Nummer auf allen Stuecken der Zeile.
 // Gibt es welche, bekommen Zeilen ohne Position die laufende Nummer in Klammern, damit nichts doppelt vorkommt.
 const hatPos=out.some(x=>x.pos);
 out.forEach(x=>{x.label=x.pos?x.pos:(hatPos?"("+x.nr+")":String(x.nr))});
 return {bleche:out,bereich,hatPos};
}
// ---- Die Packung ---------------------------------------------------------------
// Eigene Packung, weil hier verschiedene Streifenbreiten auf DERSELBEN Tafel bzw. im
// selben Rollenabschnitt liegen duerfen - die gemeinsame Packrechnung der Massaufnahmen
// (ebaFormatPlan) bildet Gruppen je Streifenbreite, jede auf eigenen Tafeln.
//
// Zuschneidbar auf der Tafelschere: es gibt nur DURCHGEHENDE Schnitte von Kante zu Kante
// (Guillotine). Die Anordnung ist deshalb dreistufig und besteht aus Streifen:
//   1. Schnitte ueber die ganze Tafel trennen die Streifen (Reihen oder Spalten) ab,
//   2. Schnitte quer durch einen einzelnen Streifen trennen die Stuecke,
//   3. ein Stueck, das schmaler ist als sein Streifen, wird noch auf Mass gekuerzt.
// Jeder Schnitt geht durch ein bereits abgetrenntes Teil, nie durch ein anderes Stueck.
// "Reihen" laufen in Laengsrichtung der Tafel, "Spalten" in Querrichtung - beide werden
// gerechnet. Die Schnittlaenge der Schere (optional) entscheidet mit.
// Gerechnet wird mit Reihenfolgen nach Breite, Laenge und Flaeche plus vielen
// (festen, reproduzierbaren) Zufallsvarianten; die beste gewinnt: erst die wenigsten
// Tafeln bzw. die kleinste Blechflaeche, dann die wenigsten Schnitte.
function zrFuge(){return typeof ebaSchnittfuge==="function"?zrZ(ebaSchnittfuge()):0}
function zrRng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
function zrPackeLauf(items,RL,H,drehen,fuge,reihenfolge){
 const teile=reihenfolge;
 const sheets=[],nicht=[];
 const orient=t=>drehen?[[t.a,t.b],[t.b,t.a]]:[[t.a,t.b]];
 const setze=(sh,t,pa,pb)=>{
  const x=sh.used+(sh.pieces.length?fuge:0);
  sh.pieces.push({nr:t.nr,label:t.label,zeile:t.zeile,bez:t.bez,laenge:t.laenge,breite:t.breite,pa,pb,x,y:sh.y});
  sh.used=x+pa;
 };
 teile.forEach(t=>{
  const passt=orient(t).filter(([pa,pb])=>pa<=RL+1e-9&&pb<=H+1e-9);
  if(!passt.length){nicht.push(t);return}
  for(const s of sheets){
   let best=null;
   passt.forEach(([pa,pb])=>{
    s.shelves.forEach(sh=>{
     const need=pa+(sh.pieces.length?fuge:0);
     if(sh.h>=pb-1e-9&&RL-sh.used>=need-1e-9){
      const w=(sh.h-pb)*1e4+(RL-sh.used-need);
      if(!best||w<best.w)best={w,sh,pa,pb,neu:false};
     }
    });
    const ny=s.usedH+(s.shelves.length?fuge:0);
    if(H-ny>=pb-1e-9){const w=1e9+pb*1e3;if(!best||w<best.w)best={w,pa,pb,ny,neu:true}}
   });
   if(best){
    let sh=best.sh;
    if(best.neu){sh={y:best.ny,h:best.pb,pieces:[],used:0};s.shelves.push(sh);s.usedH=best.ny+best.pb}
    setze(sh,t,best.pa,best.pb);
    return;
   }
  }
  const [pa,pb]=passt[0];
  const s={shelves:[],usedH:0};sheets.push(s);
  const sh={y:0,h:pb,pieces:[],used:0};s.shelves.push(sh);s.usedH=pb;
  setze(sh,t,pa,pb);
 });
 return {sheets,nicht};
}
// Schnittfolge einer Tafel/eines Abschnitts im Rahmen des Packers (x = Laufrichtung, y = Streifenfolge).
// reihen: Rahmen = wirkliche Lage; spalten: x und y vertauscht.
function zrSchritte(s,RL,H,layout,rolleBreite){
 const mm=zrMm,st=[];
 const hArt=layout==="reihen"?"Längsschnitt":"Querschnitt";   // Linie y = const im Rahmen
 const vArt=layout==="reihen"?"Querschnitt":"Längsschnitt";   // Linie x = const im Rahmen
 const kante=art=>art==="Längsschnitt"?"oberen":"linken";
 const add=o=>{o.nr=st.length+1;st.push(o)};
 if(rolleBreite>0)add({stufe:0,art:"Querschnitt",laenge:rolleBreite,text:"Abschnitt von der Rolle abschneiden: "+mm(RL)+" mm lang",ergebnis:"Abschnitt "+mm(RL)+" × "+mm(rolleBreite)+" mm",linie:null});
 s.shelves.forEach(sh=>{
  const yc=sh.y+sh.h;
  if(yc<H-0.5)add({stufe:1,art:hArt,laenge:RL,text:hArt+" bei "+mm(yc)+" mm von der "+kante(hArt)+" Kante, ganz durch",ergebnis:"Streifen "+mm(sh.h)+" × "+mm(RL)+" mm abtrennen",linie:[0,yc,RL,yc]});
 });
 s.shelves.forEach((sh,i)=>{
  sh.pieces.forEach(p=>{
   const xe=p.x+p.pa;
   if(xe<RL-0.5)add({stufe:2,art:vArt,laenge:sh.h,text:vArt+" bei "+mm(xe)+" mm von der "+kante(vArt)+" Kante, im Streifen "+(i+1),ergebnis:"Stück Nr. "+p.label+" abtrennen",linie:[xe,sh.y,xe,sh.y+sh.h]});
  });
  sh.pieces.forEach(p=>{
   if(p.pb<sh.h-0.5)add({stufe:3,art:hArt,laenge:p.pa,text:hArt+" im Stück Nr. "+p.label+": auf "+mm(p.pb)+" mm Breite kürzen",ergebnis:"Stück Nr. "+p.label+" fertig",linie:[p.x,sh.y+p.pb,p.x+p.pa,sh.y+p.pb]});
  });
 });
 return st;
}
// alle verschiedenen Reihenfolgen (gleiche Stuecke nur einmal); null, wenn es mehr als max gibt
function zrAlleReihenfolgen(stuecke,max){
 const klassen=new Map();
 stuecke.forEach(x=>{const k=x.laenge+"x"+x.breite;if(!klassen.has(k))klassen.set(k,[]);klassen.get(k).push(x)});
 const lis=Array.from(klassen.values());
 let kombi=1;for(let i=2;i<=stuecke.length;i++)kombi*=i;
 lis.forEach(l=>{for(let i=2;i<=l.length;i++)kombi/=i});
 if(kombi>max)return null;
 const out=[],pos=lis.map(()=>0),perm=[];
 (function rek(){
  if(perm.length===stuecke.length){out.push(perm.slice());return}
  for(let i=0;i<lis.length;i++){
   if(pos[i]>=lis[i].length)continue;
   perm.push(lis[i][pos[i]]);pos[i]++;rek();pos[i]--;perm.pop();
  }
 })();
 return out;
}
function zrFreiSchnittZahl(sheets){
 let z=0;
 const zaehle=n=>{if(!n||!n.stueck)return;if(n.cutW)z++;if(n.cutH)z++;zaehle(n.rechts);zaehle(n.unten)};
 sheets.forEach(s=>zaehle(s.root));
 return z;
}
function zrItems(liste,spalten){
 return liste.map(x=>({nr:x.nr,label:x.label,zeile:x.zeile,bez:x.bez,laenge:x.laenge,breite:x.breite,a:spalten?x.breite:x.laenge,b:spalten?x.laenge:x.breite}));
}
function zrKandidat(stuecke,SB,SL,tafel,drehen,fuge,layout,reihenfolge,schere){
 const spalten=layout==="spalten";
 const RL=spalten?SB:SL, H=spalten?SL:SB;
 const items=zrItems(reihenfolge,spalten);
 const r=zrPackeLauf(items,RL,H,drehen,fuge,items);
 const sheets=r.sheets.map(s=>{
  const lauf=tafel||spalten?RL:Math.max.apply(null,s.shelves.map(sh=>sh.used).concat([1]));   // Rolle: Abschnitt so lang wie belegt
  const rb=tafel?0:SB;
  const steps=zrSchritte(s,lauf,H,layout,rb);
  const conv=(x,y)=>spalten?[y,x]:[x,y];
  const shelves=s.shelves.map(sh=>({y:sh.y,h:sh.h,pieces:sh.pieces.map(p=>{
   const ax=spalten?p.y:p.x, ay=spalten?p.x:p.y, al=spalten?p.pb:p.pa, ab=spalten?p.pa:p.pb;
   return {nr:p.nr,label:p.label,zeile:p.zeile,bez:p.bez,x:ax,y:ay,laenge:al,breite:ab,gedreht:Math.abs(al-p.laenge)>0.5||Math.abs(ab-p.breite)>0.5};
  })}));
  const schritte=steps.map(t=>Object.assign({},t,{linie:t.linie?[].concat(conv(t.linie[0],t.linie[1]),conv(t.linie[2],t.linie[3])):null}));
  const len=tafel?SL:(spalten?0:lauf);
  return {shelves,len,usedH:s.usedH,schritte,
   belegt:s.shelves.reduce((a,sh)=>a+sh.pieces.reduce((b2,p)=>b2+p.laenge*p.breite,0),0),
   maxSchnitt:steps.reduce((m,t)=>Math.max(m,t.laenge),0)};
 });
 const flaeche=sheets.reduce((a,s)=>a+SB*s.len,0);
 const maxSchnitt=sheets.reduce((m,s)=>Math.max(m,s.maxSchnitt),0);
 const schnitte=sheets.reduce((a,s)=>a+s.schritte.length,0);
 // die am wenigsten gefuellte Tafel nach hinten: dort bleibt der grosse, wieder verwendbare Rest
 if(tafel)sheets.sort((x,y)=>y.belegt-x.belegt);
 return {layout,sheets,nicht:r.nicht,flaeche,maxSchnitt,schnitte,
  gueltig:!(schere>0)||maxSchnitt<=schere+1e-9,
  letzte:tafel&&sheets.length?sheets[sheets.length-1].belegt:0};
}
// ---- Freie Guillotine-Packung (beliebig tief geteilt) ------------------------------
// Die Streifen-Anordnung (Reihen/Spalten) kennt nur zwei Ebenen; manche Aufgaben gehen erst auf,
// wenn ein Teil nochmals in Teile zerlegt wird (z. B. links ein Block mit einem langen Stueck
// oben und zwei Stuecken nebeneinander darunter, rechts ein hohes Stueck). Hier wird das Blech
// als Baum aus freien Rechtecken verwaltet: ein Stueck kommt in die Ecke eines freien Rechtecks,
// ein Schnitt ueber das GANZE Rechteck trennt es ab, ein zweiter Schnitt durch das so entstandene
// Teilstueck trennt die Seite. Jeder Schnitt geht also durch ein einzelnes, schon abgetrenntes
// Teil und nie durch ein Stueck. Es entstehen keine Streifen, die noch gekuerzt werden muessen.
function zrFreiLauf(liste,SB,SL,drehen,fuge,fit,split){
 const sheets=[],nicht=[];
 const orient=t=>drehen?[[t.laenge,t.breite],[t.breite,t.laenge]]:[[t.laenge,t.breite]];
 const bewert=(r,w,h)=>{
  const dw=r.w-w,dh=r.h-h;
  if(fit==="flaeche")return r.w*r.h-w*h;
  if(fit==="kurz")return Math.min(dw,dh)*1e5+Math.max(dw,dh);
  return Math.max(dw,dh)*1e5+Math.min(dw,dh);
 };
 const platz=(s,r,t,w,h)=>{
  r.stueck={nr:t.nr,label:t.label,zeile:t.zeile,bez:t.bez,x:r.x,y:r.y,laenge:w,breite:h,gedreht:Math.abs(w-t.laenge)>0.5||Math.abs(h-t.breite)>0.5};
  s.frei.splice(s.frei.indexOf(r),1);
  const lw=r.w-w,lh=r.h-h;
  r.cutW=lw>0.5;r.cutH=lh>0.5;
  const horizontal=split==="H"?true:(split==="V"?false:(split==="kurz"?lw<=lh:lw>lh));
  r.split=horizontal?"H":"V";
  const neu=(x,y,bw,bh)=>(bw>0.5&&bh>0.5)?{x,y,w:bw,h:bh}:null;
  if(horizontal){r.unten=neu(r.x,r.y+h+fuge,r.w,lh-fuge);r.rechts=neu(r.x+w+fuge,r.y,lw-fuge,h)}
  else{r.rechts=neu(r.x+w+fuge,r.y,lw-fuge,r.h);r.unten=neu(r.x,r.y+h+fuge,w,lh-fuge)}
  if(r.rechts)s.frei.push(r.rechts);
  if(r.unten)s.frei.push(r.unten);
 };
 liste.forEach(t=>{
  const passt=orient(t).filter(([w,h])=>w<=SL+1e-9&&h<=SB+1e-9);
  if(!passt.length){nicht.push(t);return}
  let best=null;
  sheets.forEach((s,si)=>s.frei.forEach(r=>passt.forEach(([w,h])=>{
   if(w<=r.w+1e-9&&h<=r.h+1e-9){const b=bewert(r,w,h)+si*1e12;if(!best||b<best.b)best={b,s,r,w,h}}
  })));
  if(!best){
   const root={x:0,y:0,w:SL,h:SB};
   const s={root,frei:[root]};sheets.push(s);
   best={s,r:root,w:passt[0][0],h:passt[0][1]};
  }
  platz(best.s,best.r,t,best.w,best.h);
 });
 return {sheets,nicht};
}
function zrFreiSchritte(root){
 const mm=zrMm,st=[];
 const add=(idx,o)=>{o.nr=st.length+1;o.stufe=Math.min(3,idx+1);st.push(o)};
 (function emit(r,d){
  if(!r||!r.stueck)return;
  const p=r.stueck,w=p.laenge,h=p.breite;
  const teil=mm(r.w)+" × "+mm(r.h)+" mm";
  const laengs=(y)=>({art:"Längsschnitt",text:null,y});
  if(r.split==="H"){
   if(r.cutH)add(d,{art:"Längsschnitt",laenge:r.w,linie:[r.x,r.y+h,r.x+r.w,r.y+h],text:"Längsschnitt "+mm(h)+" mm von der oberen Kante des Teils "+teil+", ganz durch",ergebnis:"Streifen "+mm(r.w)+" × "+mm(h)+" mm abtrennen"});
   const ds=d+(r.cutH?1:0);
   if(r.cutW)add(ds,{art:"Querschnitt",laenge:h,linie:[r.x+w,r.y,r.x+w,r.y+h],text:"Querschnitt "+mm(w)+" mm von der linken Kante des Streifens "+mm(r.w)+" × "+mm(h)+" mm, ganz durch",ergebnis:"Stück Nr. "+p.label+" ("+mm(w)+" × "+mm(h)+") abtrennen"});
   emit(r.rechts,ds+(r.cutW?1:0));emit(r.unten,ds);
  }else{
   if(r.cutW)add(d,{art:"Querschnitt",laenge:r.h,linie:[r.x+w,r.y,r.x+w,r.y+r.h],text:"Querschnitt "+mm(w)+" mm von der linken Kante des Teils "+teil+", ganz durch",ergebnis:"Streifen "+mm(w)+" × "+mm(r.h)+" mm abtrennen"});
   const ds=d+(r.cutW?1:0);
   if(r.cutH)add(ds,{art:"Längsschnitt",laenge:w,linie:[r.x,r.y+h,r.x+w,r.y+h],text:"Längsschnitt "+mm(h)+" mm von der oberen Kante des Streifens "+mm(w)+" × "+mm(r.h)+" mm, ganz durch",ergebnis:"Stück Nr. "+p.label+" ("+mm(w)+" × "+mm(h)+") abtrennen"});
   emit(r.unten,ds+(r.cutH?1:0));emit(r.rechts,ds);
  }
 })(root,0);
 return st;
}
function zrFreiKandidat(stuecke,SB,SL,drehen,fuge,reihenfolge,fit,split,schere){
 const r=zrFreiLauf(reihenfolge,SB,SL,drehen,fuge,fit,split);
 const sheets=r.sheets.map(s=>{
  const pcs=[];
  (function sammle(n){if(!n)return;if(n.stueck)pcs.push(n.stueck);sammle(n.rechts);sammle(n.unten)})(s.root);
  const steps=zrFreiSchritte(s.root);
  return {frei:true,shelves:[{y:0,h:SB,pieces:pcs}],len:SL,usedH:SB,schritte:steps,
   belegt:pcs.reduce((a,p)=>a+p.laenge*p.breite,0),maxSchnitt:steps.reduce((m,t)=>Math.max(m,t.laenge),0)};
 });
 const maxSchnitt=sheets.reduce((m,s)=>Math.max(m,s.maxSchnitt),0);
 sheets.sort((x,y)=>y.belegt-x.belegt);
 return {layout:"frei",sheets,nicht:r.nicht,flaeche:sheets.length*SB*SL,maxSchnitt,
  schnitte:sheets.reduce((a,s)=>a+s.schritte.length,0),gueltig:!(schere>0)||maxSchnitt<=schere+1e-9,
  letzte:sheets.length?sheets[sheets.length-1].belegt:0};
}

function zrPackung(a){
 a=a||zrA;
 const tafel=a.form==="tafel";
 const SB=tafel?zrZ(a.tafelBreite):zrZ(a.rolle);
 const sb=zrBleche(a,tafel),stuecke=sb.bleche,hatPos=sb.hatPos;   // Tafel: Originallage (Drehen wird beim Legen entschieden); Rolle: ggf. schon gedreht
 const netto=stuecke.reduce((s,x)=>s+x.laenge*x.breite,0)/1e6;
 const schere=zrZ(a.schere);
 const leer={hatPos,tafel,SB,SL:0,sheets:[],nicht:[],stuecke:stuecke.length,netto,flaeche:0,verschnitt:0,anteil:0,fuge:zrFuge(),ok:false,schere,untergrenze:0,layout:"reihen",gueltig:true,maxSchnitt:0};
 if(!(SB>0)||!stuecke.length)return leer;
 let SL=tafel?zrZ(a.tafelLaenge):0;
 if(tafel&&!(SL>0))return leer;
 if(!tafel){
  const passend=stuecke.filter(x=>x.breite<=SB+1e-9);
  SL=passend.reduce((m,x)=>Math.max(m,x.laenge),0);
  if(!(SL>0))return {...leer,nicht:stuecke,SL:0};
 }
 const fuge=zrFuge(),drehen=!!a.drehen,n=stuecke.length;
 const layouts=tafel?["reihen","spalten","frei"]:["reihen"];
 const basis=[(x,y)=>y.breite-x.breite||y.laenge-x.laenge,(x,y)=>y.laenge-x.laenge||y.breite-x.breite,(x,y)=>y.laenge*y.breite-x.laenge*x.breite,(x,y)=>Math.max(y.laenge,y.breite)-Math.max(x.laenge,x.breite)];
 // Reihenfolgen: vier Sortierungen, feste Zufallsvarianten, bei kleinen Aufgaben ALLE verschiedenen Reihenfolgen
 const reihenfolgen=basis.map(f=>stuecke.slice().sort(f));
 const rnd=zrRng(4711);
 const nl=Math.max(0,Math.min(30,Math.floor(12000/Math.max(1,n))));
 for(let i=0;i<nl;i++){
  // gestoerte Sortierung: Schluessel (Breite bzw. Laenge) mit zufaelligem Faktor 0,75-1,25, je Stueck einmal gezogen
  const nachBreite=i%2===0;
  reihenfolgen.push(stuecke.map(x=>({x,k:(nachBreite?x.breite:x.laenge)*(0.75+0.5*rnd())}))
   .sort((p,q)=>q.k-p.k||q.x.laenge-p.x.laenge||q.x.breite-p.x.breite).map(o=>o.x));
 }
 const alle=zrAlleReihenfolgen(stuecke,720);
 if(alle)alle.forEach(p=>reihenfolgen.push(p));
 // Zweistufig: zuerst billig bewerten (nur Packen), von jeder Anordnung die besten wenigen voll auswerten (Schnittfolge, Schere)
 const vergleiche=(k1,k2)=>{for(let i=0;i<k1.length;i++){if(k1[i]!==k2[i])return k1[i]-k2[i]}return 0};
 const besser=(k1,k2)=>vergleiche(k1,k2)<0;
 const bewerte=c=>[c.nicht.length,c.gueltig?0:1,tafel?c.sheets.length:Math.round(c.flaeche),c.schnitte,Math.round(c.letzte)];
 const tops={};
 const merke=(layout,k,bau,max)=>{
  const l=tops[layout]||(tops[layout]=[]);
  l.push({k,bau});l.sort((x,y)=>vergleiche(x.k,y.k));
  if(l.length>max)l.length=max;
 };
 layouts.forEach(layout=>{
  if(layout==="frei"){
   const kombis=[];["flaeche","kurz","lang"].forEach(f=>["kurz","lang","H","V"].forEach(sp=>kombis.push([f,sp])));
   reihenfolgen.forEach((rf,ri)=>(n>60&&ri>=4+nl?[]:(n>60?kombis.slice(0,4):kombis)).forEach(([f,sp])=>{
    const r=zrFreiLauf(rf,SB,SL,drehen,fuge,f,sp);
    merke("frei",[r.nicht.length,r.sheets.length,zrFreiSchnittZahl(r.sheets)],()=>zrFreiKandidat(stuecke,SB,SL,drehen,fuge,rf,f,sp,schere),8);
   }));
   return;
  }
  const spalten=layout==="spalten",RL=spalten?SB:SL,H=spalten?SL:SB;
  reihenfolgen.forEach(rf=>{
   const items=zrItems(rf,spalten);
   const r=zrPackeLauf(items,RL,H,drehen,fuge,items);
   const fl=tafel?r.sheets.length:Math.round(r.sheets.reduce((x,s)=>x+SB*Math.max.apply(null,s.shelves.map(sh=>sh.used).concat([1])),0));
   merke(layout,[r.nicht.length,fl,r.sheets.reduce((x,s)=>x+s.shelves.length,0)],()=>zrKandidat(stuecke,SB,SL,tafel,drehen,fuge,layout,rf,schere),6);
  });
 });
 let best=null;
 Object.keys(tops).forEach(l=>tops[l].forEach(t=>{
  const c=t.bau();const k=bewerte(c);
  if(!best||besser(k,best.k))best={k,c};
 }));
 const c=best.c;
 const flaecheM2=c.flaeche/1e6;
 const untergrenze=tafel?Math.max(1,Math.ceil(netto*1e6/(SB*SL)-1e-9)):0;
 return {hatPos,tafel,SB,SL,layout:c.layout,sheets:c.sheets,nicht:c.nicht,stuecke:stuecke.length,netto,flaeche:flaecheM2,
  verschnitt:Math.max(0,flaecheM2-netto),anteil:flaecheM2>0?Math.max(0,flaecheM2-netto)/flaecheM2*100:0,fuge,ok:true,
  schere,gueltig:c.gueltig,maxSchnitt:c.maxSchnitt,untergrenze};
}
const zrQm=v=>zrZ(v).toFixed(2).replace(".",",");
// ---- Schnittbild im Massstab 1:1 (Laenge und Breite im gleichen Massstab) --------
// opt.schritte: die Schnittfolge einzeichnen (Nummern in der Reihenfolge, in der geschnitten wird)
function zrBildHtml(r,opt){
 if(!r.ok||!r.sheets.length)return "";
 const schritte=!!(opt&&opt.schritte);
 const W=1000;
 const bilder=r.sheets.map((s,i)=>{
  const Lz=Math.max(1,r.tafel?r.SL:s.len), sx=W/Lz, H=Math.max(20,Math.round(W*r.SB/Lz)), sy=H/r.SB;
  let el="";
  s.shelves.forEach(sh=>sh.pieces.forEach(x=>{
   const w=x.laenge*sx,h=x.breite*sy,t=String(x.label===undefined?x.nr:x.label);
   const fs=Math.max(10,Math.min(26,h*0.5,w/(t.length+0.6)));
   const farbe="hsl("+((x.zeile||0)*57%360)+",55%,88%)";
   let teil=`<rect x="${(x.x*sx).toFixed(1)}" y="${(x.y*sy).toFixed(1)}" width="${Math.max(w,1).toFixed(1)}" height="${Math.max(h,1).toFixed(1)}" fill="${farbe}" stroke="#17202a" stroke-width="1.5"/>`;
   const gross=h>=fs*2.6&&w>=fs*5;
   if(w>=fs*0.9&&h>=10)teil+=`<text x="${((x.x+x.laenge/2)*sx).toFixed(1)}" y="${((x.y+x.breite/2)*sy+fs*0.35-(gross?fs*0.55:0)).toFixed(1)}" font-size="${fs.toFixed(0)}" font-weight="700" text-anchor="middle" fill="#17202a">${esc(t)}</text>`;
   if(gross){
    const m=zrMm(x.laenge)+" × "+zrMm(x.breite)+(x.gedreht?" ⟳":"");
    const f2=Math.max(9,Math.min(fs*0.6,w/(m.length*0.62)));
    teil+=`<text x="${((x.x+x.laenge/2)*sx).toFixed(1)}" y="${((x.y+x.breite/2)*sy+fs*0.35+f2*1.25).toFixed(1)}" font-size="${f2.toFixed(0)}" text-anchor="middle" fill="#3d4850">${esc(m)}</text>`;
   }
   el+=teil;
  }));
  let cut="";
  if(schritte)s.schritte.filter(t=>t.linie).forEach(t=>{
   const [x1,y1,x2,y2]=t.linie;
   const farbe=t.stufe===1?"#c0392b":(t.stufe===2?"#e07a1f":"#6a3fb5");
   const rr=13;
   cut+=`<line x1="${(x1*sx).toFixed(1)}" y1="${(y1*sy).toFixed(1)}" x2="${(x2*sx).toFixed(1)}" y2="${(y2*sy).toFixed(1)}" stroke="${farbe}" stroke-width="${t.stufe===1?4:3}"${t.stufe===3?' stroke-dasharray="10 6"':""}/>`;
   // Nummer am Anfang der Linie, leicht eingerueckt, damit sie in der Zeichnung bleibt
   const horizontal=Math.abs(y2-y1)<Math.abs(x2-x1);
   const cx=horizontal?Math.min(Math.max(x1*sx+rr+4,rr+2),W-rr-2):Math.min(Math.max(x1*sx,rr+2),W-rr-2);
   const cy=horizontal?Math.min(Math.max(y1*sy,rr+2),H-rr-2):Math.min(Math.max(y1*sy+rr+4,rr+2),H-rr-2);
   cut+=`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr}" fill="#fff" stroke="${farbe}" stroke-width="2"/><text x="${cx.toFixed(1)}" y="${(cy+4.5).toFixed(1)}" font-size="${t.nr>=10?12:14}" font-weight="700" text-anchor="middle" fill="${farbe}">${t.nr}</text>`;
  });
  const n=s.shelves.reduce((a,sh)=>a+sh.pieces.length,0);
  const kopf=(r.tafel?"Tafel ":"Abschnitt ")+(i+1)+" · "+zrMm(Lz)+" × "+zrMm(r.SB)+" mm · "+n+" Stück"+(n===1?"":"e")+" · "+Math.round(s.belegt/(Lz*r.SB)*100)+" % belegt";
  return `<figure class="zu-bild"><figcaption>${esc(kopf)}</figcaption><svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(kopf)}"><rect x="0" y="0" width="${W}" height="${H}" fill="#eceff1"/>${el}${cut}<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#17202a" stroke-width="2.5"/></svg></figure>`;
 }).join("");
 const gedreht=r.sheets.some(s=>s.shelves.some(sh=>sh.pieces.some(x=>x.gedreht)));
 return `<div class="zu-bilder"><div class="zu-bilder-kopf">Schnittbild im Massstab 1:1 – so liegt jedes Stück <span class="zu-bilder-legende">(Länge und Breite im gleichen Massstab, grau = Rest${gedreht?", ⟳ = gedreht":""}${schritte?"; Schnittfolge: rot = durch die ganze Tafel, orange = durch ein abgetrenntes Teil, violett = durch ein noch kleineres Teil":""})</span></div>${bilder}</div>`;
}
// Schnittfolge als Liste: in dieser Reihenfolge an der Schere schneiden
function zrSchritteHtml(r){
 if(!r.ok||!r.sheets.length)return "";
 const kopf=`<h3 style="margin:12px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Schnittfolge${r.schere>0?" (Schere bis "+esc(zrMm(r.schere))+" mm)":""}</h3>
<div class="small">Jeder Schnitt geht von Kante zu Kante durch ein einzelnes, schon abgetrenntes Teil – kein Stück wird angeschnitten. Die Teile werden Schritt für Schritt kleiner: zuerst Schnitte durch die ganze Tafel (rot), dann durch die abgetrennten Teile (orange), dann durch noch kleinere (violett). Jedes Teil wird fertig zerlegt, bevor das nächste drankommt.</div>`;
 const tabellen=r.sheets.map((s,i)=>`<div style="margin-top:8px"><b>${r.tafel?"Tafel":"Abschnitt"} ${i+1}</b>: ${s.schritte.length} Schnitt${s.schritte.length===1?"":"e"}</div>
<div class="scroll"><table class="eb-table ra-tab"><thead><tr><th>Schnitt</th><th>Was</th><th style="text-align:right">Länge</th><th>Ergebnis</th></tr></thead><tbody>${
 s.schritte.map(t=>`<tr${r.schere>0&&t.laenge>r.schere+1e-9?' style="background:#fdecea"':""}><td><b>${t.nr}</b></td><td>${esc(t.text)}</td><td style="text-align:right">${esc(zrMm(t.laenge))} mm</td><td class="small">${esc(t.ergebnis)}</td></tr>`).join("")}</tbody></table></div>`).join("");
 return kopf+tabellen;
}
function zrListeHtml(r){
 if(!r.ok||!r.sheets.length)return "";
 const zeilen=[];
 r.sheets.forEach((s,i)=>s.shelves.forEach((sh,k)=>sh.pieces.forEach(x=>zeilen.push({nr:x.nr,label:x.label,bez:x.bez,laenge:x.laenge,breite:x.breite,gedreht:x.gedreht,
  ort:(r.tafel?"Tafel ":"Abschnitt ")+(i+1)+(s.frei?"":" · Streifen "+(k+1))+" · ab "+zrMm(x.x)+" / "+zrMm(x.y)+" mm"}))));
 zeilen.sort((a,b)=>a.nr-b.nr);
 return `<table class="eb-table ra-tab"><thead><tr><th>${r.hatPos?"Pos.":"Nr."}</th><th>Bezeichnung</th><th style="text-align:right">Länge × Breite</th><th>Lage (von links / oben)</th></tr></thead><tbody>${
  zeilen.map(z=>`<tr><td><b>${esc(z.label===undefined?z.nr:z.label)}</b></td><td>${esc(z.bez)}</td><td style="text-align:right">${esc(zrMm(z.laenge))} × ${esc(zrMm(z.breite))} mm${z.gedreht?" ⟳":""}</td><td class="small">${esc(z.ort)}</td></tr>`).join("")}</tbody></table>`;
}
function zrKennzahlenHtml(r){
 const f=(l,w)=>`<div><label>${l}</label><div class="ra-wert">${w}</div></div>`;
 let h=`<div class="grid" style="margin-bottom:8px">${f("Stücke",r.stuecke)}${f("Nettofläche",zrQm(r.netto)+" m²")}`;
 if(r.ok&&r.sheets.length){
  h+=r.tafel?f("Tafeln",r.sheets.length+" × "+zrMm(r.SL)+" × "+zrMm(r.SB)):f("Rolle",zrMm(r.sheets.reduce((a,s)=>a+s.len,0))+" mm lang, "+r.sheets.length+" Abschnitt"+(r.sheets.length===1?"":"e"));
  h+=f("Blechfläche",zrQm(r.flaeche)+" m²")+f("Verschnitt",zrQm(r.verschnitt)+" m² ("+Math.round(r.anteil)+" %)");
 }
 return h+"</div>";
}
function zrMeldungenHtml(r){
 const m=[];
 if(r.nicht.length)m.push(`<div class="ra-fehler">${r.nicht.length===1?"Ein Stück passt":r.nicht.length+" Stücke passen"} nicht ${r.tafel?"auf die Tafel":"auf die Rolle"}: ${esc(r.nicht.slice(0,8).map(x=>(r.hatPos?"Pos. ":"Nr. ")+x.label+" ("+zrMm(x.laenge)+" × "+zrMm(x.breite)+")").join(", "))}${r.nicht.length>8?" …":""}. ${r.tafel?"Tafel "+zrMm(r.SL)+" × "+zrMm(r.SB)+" mm":"Rollenbreite "+zrMm(r.SB)+" mm"}${zrA.drehen?"":" – evtl. «Stücke dürfen gedreht werden» einschalten"}.</div>`);
 if(r.ok&&r.schere>0&&!r.gueltig)m.push(`<div class="ra-fehler">Mit einer Schere von ${esc(zrMm(r.schere))} mm Schnittlänge geht dieser Plan nicht auf: der längste Schnitt ist ${esc(zrMm(r.maxSchnitt))} mm lang. ${r.tafel?"Ein kleineres Format oder eine längere Schere wäre nötig.":"Rollenbreite oder Schere prüfen."}</div>`);
 else if(r.ok&&r.schere>0)m.push(`<div class="ra-ok">Alle Schnitte sind höchstens ${esc(zrMm(r.maxSchnitt))} mm lang – passt auf die Schere (${esc(zrMm(r.schere))} mm).${r.layout==="spalten"?" Dafür sind die Streifen quer gelegt.":""}</div>`);
 if(r.ok&&r.fuge>0)m.push(`<div class="small">Schnittfuge ${esc(zrMm(r.fuge))} mm zwischen den Stücken und Streifen ist eingerechnet.</div>`);
 if(r.ok&&r.tafel&&r.untergrenze){
  m.push(r.sheets.length<=r.untergrenze
   ?`<div class="small">Mit ${r.sheets.length} Tafel${r.sheets.length===1?"":"n"} ist das Minimum erreicht, das die Fläche überhaupt zulässt – weniger geht nicht.</div>`
   :`<div class="small">Nach Fläche wären mindestens ${r.untergrenze} Tafel${r.untergrenze===1?"":"n"} nötig; die schnittfähige Anordnung braucht ${r.sheets.length}. Dazwischen liegt der Verschnitt, den die geraden Durchgangsschnitte der Schere erzwingen.</div>`);
 }
 if(r.ok)m.push(`<div class="small">Alle Anordnungen sind mit der Tafelschere zuschneidbar (nur durchgehende Schnitte). Gerechnet werden viele Reihenfolgen, in Reihen und in Spalten; das beste Ergebnis wird gezeigt.</div>`);
 return m.join("");
}

// ---- Import aus Excel / CSV -------------------------------------------------
// rows: Tabelle als Array von Zeilen (wie XLSX.utils.sheet_to_json mit header:1).
// Kopfzeile wird erkannt (Laenge, Breite, Anzahl, Bezeichnung); ohne Kopfzeile
// gilt die Reihenfolge Laenge, Breite, Anzahl (mit einer Textspalte davor:
// Bezeichnung, Laenge, Breite, Anzahl).
function zrZeilenAusTabelle(rows){
 const tab=(rows||[]).map(r=>Array.isArray(r)?r:[]).filter(r=>r.some(c=>String(c==null?"":c).trim()!==""));
 if(!tab.length)return {zeilen:[],grund:"leer"};
 const kopfTest={
  laenge:c=>/^(l|len|length)$/i.test(c)||/l(ä|ae|Ã¤)nge/i.test(c),
  breite:c=>/^(breite|b|width)$/i.test(c)||/breite/i.test(c),
  anzahl:c=>/^(anz\.?|anzahl|stk\.?|stück|stueck|menge|qty|n)$/i.test(c)||/anzahl|st(ü|ue)ck/i.test(c),
  bez:c=>/^(bez\.?|bezeichnung|name|text|teil)$/i.test(c)||/bezeichnung/i.test(c),
  pos:c=>/^(pos\.?|position|nr\.?|nummer|lfd\.?\s*nr\.?)$/i.test(c)||/^pos|position|nummer|pos\.?\s*-?\s*nr/i.test(c)
 };
 const kopf=tab[0].map(c=>String(c==null?"":c).trim());
 const idx={};
 Object.keys(kopfTest).forEach(k=>{const i=kopf.findIndex(c=>c&&Number.isNaN(zrZahl(c))&&kopfTest[k](c));if(i>=0)idx[k]=i});
 let start=0;
 if(idx.laenge!==undefined&&idx.breite!==undefined)start=1;
 else{
  // ohne Kopfzeile: Spalten nach Position
  const erste=tab[0];
  const nZahl=erste.filter(c=>!Number.isNaN(zrZahl(c))).length;
  const textVorn=erste.length>0&&Number.isNaN(zrZahl(erste[0]))&&nZahl>=2;
  // vier Zahlen ohne Kopfzeile: Position, Laenge, Breite, Anzahl (die uebliche Reihenfolge einer Zuschnittliste)
  const posVorn=!textVorn&&erste.length>=4&&erste.slice(0,4).every(c=>!Number.isNaN(zrZahl(c)));
  const o=(textVorn||posVorn)?1:0;
  idx.bez=textVorn?0:undefined;idx.pos=posVorn?0:undefined;idx.laenge=o;idx.breite=o+1;idx.anzahl=o+2;
  if(Number.isNaN(zrZahl(erste[idx.laenge]))&&tab.length>1){start=1}   // doch eine unbekannte Kopfzeile
 }
 const zeilen=[];let uebersprungen=0;
 for(let i=start;i<tab.length&&zeilen.length<ZR_MAX_ZEILEN;i++){
  const r=tab[i];
  const L=zrZahl(r[idx.laenge]),B=zrZahl(r[idx.breite]);
  if(!(L>0&&B>0)){uebersprungen++;continue}
  let n=idx.anzahl!==undefined?zrZahl(r[idx.anzahl]):1;
  if(!(n>=1))n=1;
  zeilen.push({pos:idx.pos!==undefined?String(r[idx.pos]==null?"":r[idx.pos]).trim().replace(/\.0+$/,""):"",bez:idx.bez!==undefined?String(r[idx.bez]==null?"":r[idx.bez]).trim():"",
   laenge:String(L),breite:String(B),anzahl:String(Math.floor(n))});
 }
 return {zeilen,uebersprungen,grund:zeilen.length?"":"keine"};
}
async function zrImportDatei(datei){
 if(typeof xlsxLaden!=="function"||!(await xlsxLaden())){appAlert("Der Excel-Import ist gerade nicht verfügbar (Bibliothek nicht geladen).");return}
 let rows;
 try{
  // CSV/Text als Text lesen (UTF-8, sonst werden Umlaute in der Kopfzeile zerstoert), Excel als Bytes
  const istText=/\.(csv|txt)$/i.test(datei.name||"")||/^text\//.test(datei.type||"");
  const wb=istText?XLSX.read(await datei.text(),{type:"string"}):XLSX.read(await datei.arrayBuffer(),{type:"array"});
  rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:true,defval:""});
 }catch(e){appAlert("Die Datei konnte nicht gelesen werden: "+(e&&e.message||e));return}
 const r=zrZeilenAusTabelle(rows);
 if(!r.zeilen.length){appAlert("In der Datei wurden keine Zuschnittmasse gefunden. Erwartet werden die Spalten Länge, Breite und Anzahl (mm).");return}
 const leer=zrA.zeilen.every(z=>!String(z.laenge).trim()&&!String(z.breite).trim());
 zrA.zeilen=(leer?[]:zrA.zeilen).concat(r.zeilen).slice(0,ZR_MAX_ZEILEN);
 zrSpeichern();zrZeichnen();
 appAlert(r.zeilen.length+" Zeile"+(r.zeilen.length===1?"":"n")+" importiert"+(r.uebersprungen?" ("+r.uebersprungen+" ohne gültige Länge/Breite übersprungen)":"")+".");
}
async function zrVorlage(){
 if(typeof xlsxLaden!=="function"||!(await xlsxLaden())){appAlert("Die Vorlage ist gerade nicht verfügbar (Bibliothek nicht geladen).");return}
 const ws=XLSX.utils.aoa_to_sheet([["Pos.","Bezeichnung","Länge (mm)","Breite (mm)","Anzahl"],[1,"Beispiel Abdeckung",2000,310,4],[2,"Beispiel Winkel",1500,250,2]]);
 const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,ws,"Zuschnitt");
 XLSX.writeFile(wb,"Zuschnittliste-Vorlage.xlsx");
}

// ---- Darstellung -------------------------------------------------------------
function zrFormatHtml(){
 const a=zrA;
 const rollen=ZR_ROLLEN.map(r=>`<button type="button" class="gray zr-chip" data-zr-rolle="${r}">${r}</button>`).join("");
 const tafeln=ZR_TAFELN.map(([b,l])=>`<button type="button" class="gray zr-chip" data-zr-tafel="${b}x${l}">${b} × ${l}</button>`).join("");
 return `<div class="grid">
<div class="wide"><label>Blechformat</label><select data-zr="form"><option value="rolle"${a.form!=="tafel"?" selected":""}>Rolle (Streifen ab Rolle)</option><option value="tafel"${a.form==="tafel"?" selected":""}>Tafel (feste Grösse)</option></select></div>
${a.form==="tafel"
 ?`<div><label>Tafelbreite (mm)</label><input data-zr="tafelBreite" type="number" inputmode="numeric" step="1" min="1" value="${esc(a.tafelBreite)}"></div>
<div><label>Tafellänge (mm)</label><input data-zr="tafelLaenge" type="number" inputmode="numeric" step="1" min="1" value="${esc(a.tafelLaenge)}"></div>`
 :`<div><label>Rollenbreite (mm)</label><input data-zr="rolle" type="number" inputmode="numeric" step="1" min="1" value="${esc(a.rolle)}"></div>`}
<div class="wide"><label>Material / Bezeichnung (für den Ausdruck)</label><input data-zr="material" type="text" placeholder="z. B. Titanzink 0,7 mm" value="${esc(a.material)}"></div>
</div>
<div class="small" style="margin:6px 0 2px">Häufige Formate:</div>
<div style="display:flex;flex-wrap:wrap;gap:6px">${a.form==="tafel"?tafeln:rollen}</div>
<label class="ra-schalter" style="margin-top:8px"><input type="checkbox" data-zr="drehen"${a.drehen?" checked":""}> Stücke dürfen gedreht werden (z. B. wenn die Maserung/Walzrichtung keine Rolle spielt)</label>
<div class="grid" style="margin-top:8px"><div class="wide"><label>Schere: grösste Schnittlänge (mm, leer = unbegrenzt)</label><input data-zr="schere" type="number" inputmode="numeric" step="1" min="1" placeholder="z. B. 2000" value="${esc(a.schere)}"></div></div>
<label class="ra-schalter" style="margin-top:8px"><input type="checkbox" data-zr="schritte"${a.schritte?" checked":""}> Schnittschritte im Plan anzeigen (Reihenfolge der Schnitte)</label>`;
}
// Hinweis unter einer Zeile: Position (wenn vorhanden) bzw. die laufenden Nummern der Stuecke
function zrZeilenHinweis(z,b){
 if(!b)return "";
 const n=b.bis-b.von+1;
 if(String(z.pos||"").trim())return "Pos. "+String(z.pos).trim()+(n>1?" · "+n+" Stück":"");
 return b.von===b.bis?"Nr. "+b.von:"Nr. "+b.von+"–"+b.bis;
}
function zrZeilenHtml(){
 const {bereich}=zrBleche();
 return zrA.zeilen.map((z,i)=>{
  const b=bereich[i];
  const nr=zrZeilenHinweis(z,b);
  return `<div class="zr-zeile" style="display:grid;grid-template-columns:minmax(0,.6fr) minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.7fr) auto;gap:6px;align-items:end;margin-bottom:6px">
<div><label>${i===0?"Pos.":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="pos" type="text" inputmode="text" placeholder="–" value="${esc(z.pos)}"></div>
<div><label>${i===0?"Bezeichnung":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="bez" type="text" placeholder="optional" value="${esc(z.bez)}"></div>
<div><label>${i===0?"Länge":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="laenge" type="number" inputmode="numeric" step="1" min="1" value="${esc(z.laenge)}"></div>
<div><label>${i===0?"Breite":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="breite" type="number" inputmode="numeric" step="1" min="1" value="${esc(z.breite)}"></div>
<div><label>${i===0?"Anzahl":"&nbsp;"}</label><input data-zr-zeile="${i}" data-zr-feld="anzahl" type="number" inputmode="numeric" step="1" min="1" value="${esc(z.anzahl)}"></div>
<div><button type="button" class="red" data-zr-weg="${i}" title="Zeile löschen" style="padding:8px 10px">×</button></div>
<div style="grid-column:1/-1;margin-top:-4px"><span class="small" data-zr-nr="${i}" style="color:var(--muted)">${esc(nr)}</span></div>
</div>`;
 }).join("");
}
function zrEingabeHtml(){
 return `<div id="zrZeilen">${zrZeilenHtml()}</div>
<div class="bar">
<button type="button" class="gray" id="zrPlus">＋ Zeile</button>
<button type="button" class="gray" id="zrImport">📥 Excel / CSV importieren</button>
<button type="button" class="gray" id="zrVorlage">⬇ Vorlage</button>
<button type="button" class="gray" id="zrLoeschen">Alles löschen</button>
</div>
<input type="file" id="zrDatei" accept=".xlsx,.xls,.csv,.ods,.txt" hidden>
<div class="small">Masse in mm. Beim Import werden die Spalten <b>Länge</b>, <b>Breite</b> und <b>Anzahl</b> (und optional <b>Pos.</b> und <b>Bezeichnung</b>) erkannt – mit oder ohne Kopfzeile. Eine Zeile mit Anzahl 3 sind drei gleiche Stücke. Eine <b>Positionsnummer</b> steht im Plan an allen Stücken dieser Zeile.</div>`;
}
function zrPlanHtml(){
 const r=zrPackung();
 return zrKennzahlenHtml(r)+zrMeldungenHtml(r)+zrBildHtml(r,{schritte:zrA.schritte})+(zrA.schritte?zrSchritteHtml(r):"")+zrListeHtml(r)
  +`<div class="bar" style="margin-top:10px"><button type="button" class="blue" id="zrDruck"${r.ok&&r.sheets.length?"":" disabled"}>🖨️ Plan drucken / PDF</button></div>`
  +((!r.stuecke)?`<div class="info">Noch nichts zuzuschneiden – bitte Zuschnittmasse eingeben oder importieren.</div>`:"");
}
// Nur die Zeilennummern aktualisieren (die Eingabefelder bleiben stehen, der Fokus auch)
function zrNummernNeu(){
 const {bereich}=zrBleche();
 document.querySelectorAll("#zrModal [data-zr-nr]").forEach(el=>{
  const b=bereich[Number(el.dataset.zrNr)];
  el.textContent=zrZeilenHinweis(zrA.zeilen[Number(el.dataset.zrNr)]||{},b);
 });
}
function zrPlanNeu(){
 const el=$("zrPlan");
 if(el)el.innerHTML=zrPlanHtml();
 zrNummernNeu();
}
let zrTimer=null;
function zrPlanSpaeter(){
 clearTimeout(zrTimer);
 zrTimer=setTimeout(zrPlanNeu,250);
}
function zrZeichnen(){
 const a=$("zrFormat"),b=$("zrEingabe");
 if(!a||!b)return;
 a.innerHTML=zrFormatHtml();
 b.innerHTML=zrEingabeHtml();
 zrPlanNeu();
 zrAblageNeu();
}
function zrOeffnen(){
 const m=$("zrModal");
 if(!m)return;
 zrLaden();
 zrZeichnen();
 m.hidden=false;
 zrPlaeneLaden();   // abgelegte Plaene (ohne Warten)
}

// ---- Ausdruck ------------------------------------------------------------------
// quelle: {r,a,bez,projekt} druckt einen GESPEICHERTEN Plan; ohne quelle der aktuelle
async function zrDrucken(quelle){
 const a=quelle?quelle.a:zrA;
 const {bleche,bereich}=zrBleche(a);
 if(!bleche.length)return;
 const win=window.open("","_blank");
 if(!win){appAlert("Der Browser hat das Öffnen des Druckfensters blockiert. Bitte Pop-ups für diese Seite erlauben.");return}
 const r=quelle?quelle.r:zrPackung(a);
 let logoSrc="";
 try{logoSrc=(typeof storageSignedUrl==="function")?await storageSignedUrl(logoUrl):logoUrl}catch(e){logoSrc=""}
 const kopf=(typeof pdfKopfHtml==="function")
  ?pdfKopfHtml({logoSrc,dokumenttyp:"Zuschnittplan",unterart:(quelle&&quelle.bez)?quelle.bez:"Zuschnittrechner",bezeichnung:(quelle&&quelle.bez)||"",projekt:(quelle&&quelle.projekt)?((typeof allProjects!=="undefined"&&allProjects.find(x=>String(x.id)===String(quelle.projekt)))||{}):(zrDb.projekt?((typeof allProjects!=="undefined"&&allProjects.find(x=>String(x.id)===String(zrDb.projekt)))||{}):{}),material:a.material||"",datum:new Date().toISOString().slice(0,10)})
  :`<h1>Zuschnittplan</h1>`;
 const tabelle=a.zeilen.map((z,i)=>bereich[i]?`<tr><td>${esc(String(z.pos||"").trim()||(bereich[i].von===bereich[i].bis?bereich[i].von:bereich[i].von+"–"+bereich[i].bis))}</td><td>${esc(z.bez)}</td><td>${zrMm(z.laenge)}</td><td>${zrMm(z.breite)}</td><td>${esc(z.anzahl)}</td></tr>`:"").join("");
 const fmt=r.tafel?"Tafel "+zrMm(r.SL)+" × "+zrMm(r.SB)+" mm":"Rolle "+zrMm(r.SB)+" mm";
 const bedarf=r.ok&&r.sheets.length?(r.tafel?r.sheets.length+" Tafel"+(r.sheets.length===1?"":"n"):zrMm(r.sheets.reduce((a,s)=>a+s.len,0))+" mm Rolle"):"–";
 const html=`${kopf}
<div class="eb-section-head">Angaben</div>
<table class="eb-info-table">
<tr><td><label>Blechformat</label><div class="val">${esc(fmt)}</div></td><td><label>Bedarf</label><div class="val">${esc(bedarf)}</div></td></tr>
<tr><td><label>Stücke / Nettofläche</label><div class="val">${r.stuecke} / ${zrQm(r.netto)} m²</div></td><td><label>Blechfläche / Verschnitt</label><div class="val">${zrQm(r.flaeche)} m² / ${zrQm(r.verschnitt)} m² (${Math.round(r.anteil)} %)</div></td></tr>
${a.drehen?`<tr><td colspan="2"><label>Drehen</label><div class="val">erlaubt</div></td></tr>`:""}
</table>
<div class="eb-section-head">Zuschnittmasse</div>
<table class="eb-cutlist"><thead><tr><th>${r.hatPos?"Pos.":"Nr."}</th><th>Bezeichnung</th><th>Länge (mm)</th><th>Breite (mm)</th><th>Anzahl</th></tr></thead><tbody>${tabelle}</tbody></table>
<div class="eb-section-head">Zuschnittplan</div>
${zrBildHtml(r,{schritte:a.schritte})}
${a.schritte?zrSchritteHtml(r):""}
${zrListeHtml(r)}
${r.nicht.length?`<div class="note">${esc(r.nicht.length+" Stück(e) passen nicht auf das Format: "+r.nicht.map(x=>(r.hatPos?"Pos. ":"Nr. ")+x.label).join(", "))}</div>`:""}`;
 win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Zuschnittplan</title>
<style>
${PDF_LAYOUT_CSS}
.zu-bilder{margin:2mm 0;padding:1.5mm 2mm;border:.5pt solid #b3bcc2;break-inside:avoid}
.zu-bilder-kopf{font-size:8pt;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:1mm}
.zu-bilder-legende{font-weight:400;text-transform:none;letter-spacing:0;color:#5b666e}
.zu-bild{margin:1mm 0 3mm;break-inside:avoid}
.zu-bild figcaption{font-size:8pt;font-weight:700}
.zu-bild svg{display:block;width:100%;height:auto}
</style></head><body>
${(typeof pdfZahlenRechts==="function")?pdfZahlenRechts(html):html}
</body></html>`);
 win.document.close();
 const drucken=()=>{try{win.focus();win.print()}catch(e){}};
 win.onload=drucken;
 setTimeout(drucken,800);
}

// ---- Ablage im Projekt (Tabelle zuschnittplaene, v3.424) ----------------------------
// Gespeichert werden die EINGABEN (Format, Zuschnittmasse mit Positionen, Optionen) und der
// gerechnete PLAN samt Schnittfolge. Beim Laden stehen die Eingaben wieder in der Maske; ein
// Ausdruck aus der Liste zeigt den gespeicherten Plan - er bleibt gleich, auch wenn sich die
// Rechnung der App spaeter aendert. Weicht ein frisch gerechneter Plan ab, wird das gesagt.
// Zugriff und Firmengrenze erzwingt die Datenbank (RLS), nicht diese Datei.
let zrDb={id:null,bez:"",projekt:""};
let zrPlaene=[];
function zrEingaben(a){
 a=a||zrA;
 return {form:a.form==="tafel"?"tafel":"rolle",rolle:String(a.rolle||""),tafelBreite:String(a.tafelBreite||""),tafelLaenge:String(a.tafelLaenge||""),
  drehen:!!a.drehen,schritte:!!a.schritte,schere:String(a.schere||""),material:String(a.material||""),
  zeilen:(a.zeilen||[]).map(z=>({pos:String(z.pos||""),bez:String(z.bez||""),laenge:String(z.laenge===undefined?"":z.laenge),breite:String(z.breite===undefined?"":z.breite),anzahl:String(z.anzahl===undefined?"1":z.anzahl)}))};
}
function zrKurztext(r){
 if(!r||!r.ok||!r.sheets||!r.sheets.length)return "–";
 return r.tafel?r.sheets.length+" Tafel"+(r.sheets.length===1?"":"n")+" "+zrMm(r.SL)+" × "+zrMm(r.SB)+" mm"
  :zrMm(r.sheets.reduce((x,s)=>x+s.len,0))+" mm Rolle "+zrMm(r.SB)+" mm";
}
function zrErgebnisFuer(r){
 return {version:"3.424",
  kennzahlen:{text:zrKurztext(r),stuecke:r.stuecke,netto:Number(zrZ(r.netto).toFixed(3)),form:r.tafel?"tafel":"rolle",
   blaetter:r.sheets.length,flaeche:Number(zrZ(r.flaeche).toFixed(3)),verschnitt:Number(zrZ(r.verschnitt).toFixed(3)),
   anteil:Math.round(r.anteil),maxSchnitt:Math.round(r.maxSchnitt||0),schere:r.schere||0,hatPos:!!r.hatPos},
  plan:JSON.parse(JSON.stringify(r))};
}
function zrProjektName(id){
 if(id===null||id===undefined||id==="")return "";
 const p=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects.find(x=>String(x.id)===String(id)):null;
 return p?(p.name||p.title||("Projekt "+p.id)):"Projekt "+id;
}
const zrDatum=s=>{try{return new Date(s).toLocaleDateString("de-CH")}catch(e){return ""}};
function zrAblageHtml(){
 const liste=(typeof allProjects!=="undefined"&&Array.isArray(allProjects))?allProjects:[];
 const opt=`<option value="">– ohne Projekt –</option>`+liste.map(p=>`<option value="${esc(p.id)}"${String(p.id)===String(zrDb.projekt)?" selected":""}>${esc(p.name||p.title||("Projekt "+p.id))}</option>`).join("");
 const plaene=zrPlaene.length?zrPlaene.map(x=>{
  const k=x.kennzahlen||{};
  const proj=zrProjektName(x.project_id);
  return `<div class="abw-zeile" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid var(--card-line)">
<div style="flex:1 1 180px"><b>${esc(x.bezeichnung||"Zuschnittplan")}</b>${String(x.id)===String(zrDb.id)?' <span class="small">(geladen)</span>':""}
<div class="small">${esc([k.text,k.stuecke?k.stuecke+" Stück":"",proj,zrDatum(x.created_at)].filter(Boolean).join(" · "))}</div></div>
<div style="display:flex;gap:6px"><button type="button" class="kon-klein kon-k-blau" data-zr-plan-laden="${esc(x.id)}">laden</button>
<button type="button" class="kon-klein kon-k-grau" data-zr-plan-druck="${esc(x.id)}">drucken</button>
<button type="button" class="kon-klein kon-k-grau" data-zr-plan-weg="${esc(x.id)}">löschen</button></div></div>`;
 }).join(""):`<p class="small">Noch nichts abgelegt.</p>`;
 return `<div class="grid">
<div class="wide"><label>Bezeichnung</label><input id="zrBez" type="text" placeholder="z. B. Dachrand Süd" value="${esc(zrDb.bez)}"></div>
<div class="wide"><label>Projekt</label><select id="zrProjekt">${opt}</select></div>
</div>
<div class="bar"><button type="button" class="green" id="zrAblegen">💾 ${zrDb.id?"Änderungen speichern":"Im Projekt speichern"}</button>${zrDb.id?'<button type="button" class="gray" id="zrAlsKopie">Als neuen Plan speichern</button>':""}</div>
<div class="small">${zrDb.id?"Dieser Plan ist abgelegt – «Änderungen speichern» überschreibt ihn.":"Gespeichert werden die Eingaben und der gerechnete Plan mit Schnittfolge."}</div>
<h3 style="margin:12px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted)">Abgelegte Zuschnittpläne</h3>${plaene}`;
}
function zrAblageNeu(){const el=$("zrAblage");if(el)el.innerHTML=zrAblageHtml()}
async function zrPlaeneLaden(){
 if(typeof sb==="undefined")return;
 try{
  const {data,error}=await sb.from("zuschnittplaene").select("id,bezeichnung,project_id,created_at,kennzahlen:ergebnis->kennzahlen").order("created_at",{ascending:false}).limit(100);
  // nur echte zuschnittplaene-Zeilen (sie tragen die Spalte kennzahlen), alles andere wird ignoriert
  zrPlaene=(!error&&Array.isArray(data))?data.filter(x=>x&&typeof x==="object"&&"kennzahlen" in x):[];
 }catch(e){zrPlaene=[]}
 zrAblageNeu();
}
async function zrAblegen(alsKopie){
 const r=zrPackung();
 if(!r.ok||!r.sheets.length){appAlert("Es gibt noch keinen Plan zum Ablegen – bitte zuerst Format und Zuschnittmasse eingeben.");return}
 if(typeof sb==="undefined"){appAlert("Keine Verbindung – nichts gespeichert.");return}
 const bez=(zrDb.bez||"").trim()||("Zuschnittplan "+zrDatum(new Date()));
 const satz={bezeichnung:bez,project_id:zrDb.projekt?Number(zrDb.projekt):null,eingaben:zrEingaben(),ergebnis:zrErgebnisFuer(r)};
 const knopf=$("zrAblegen");if(knopf)knopf.disabled=true;
 let res;
 try{
  if(zrDb.id&&!alsKopie){
   satz.updated_at=new Date().toISOString();
   res=await sb.from("zuschnittplaene").update(satz).eq("id",zrDb.id).select("id");
  }else{
   satz.erstellt_von=(typeof currentProfile==="object"&&currentProfile)?currentProfile.id:null;
   res=await sb.from("zuschnittplaene").insert(satz).select("id");
  }
 }catch(e){res={error:{message:String(e&&e.message||e)}}}
 if(knopf)knopf.disabled=false;
 if(res.error){appAlert("Konnte nicht gespeichert werden: "+res.error.message);return}
 // Ein von RLS geblockter Schreibvorgang meldet keinen Fehler, er betrifft still 0 Zeilen.
 if(!res.data||!res.data.length){appAlert("Nicht gespeichert – fehlt die nötige Berechtigung?");return}
 zrDb.id=res.data[0].id;zrDb.bez=bez;
 await zrPlaeneLaden();
 appAlert("Zuschnittplan abgelegt"+(zrDb.projekt?" im Projekt «"+zrProjektName(zrDb.projekt)+"»":"")+".");
}
async function zrZeileHolen(id){
 if(typeof sb==="undefined")return null;
 const {data,error}=await sb.from("zuschnittplaene").select("*").eq("id",id).maybeSingle();
 return error?null:data;
}
async function zrPlanLaden(id){
 const z=await zrZeileHolen(id);
 if(!z){appAlert("Der Plan konnte nicht geladen werden.");return false}
 zrA=zrAusEingaben(z.eingaben||{});
 zrDb={id:z.id,bez:z.bezeichnung||"",projekt:z.project_id?String(z.project_id):""};
 zrSpeichern();zrZeichnen();
 const m=$("zrModal");if(m)m.hidden=false;
 // gespeichert vs. heute gerechnet: Abweichung ausdruecklich sagen
 const alt=z.ergebnis&&z.ergebnis.plan,neu=zrPackung();
 if(alt&&neu.ok&&(alt.sheets.length!==neu.sheets.length||Math.abs(zrZ(alt.flaeche)-zrZ(neu.flaeche))>0.001))
  appAlert("Hinweis: Mit der heutigen Rechnung ergibt sich ein anderer Plan als beim Speichern (gespeichert: "+zrKurztext(alt)+", jetzt: "+zrKurztext(neu)+"). Der Ausdruck aus der Liste zeigt weiterhin den gespeicherten Plan.");
 return true;
}
async function zrPlanDrucken(id){
 const z=await zrZeileHolen(id);
 if(!z||!z.ergebnis||!z.ergebnis.plan){appAlert("Der Plan konnte nicht geladen werden.");return}
 await zrDrucken({r:z.ergebnis.plan,a:zrAusEingaben(z.eingaben||{}),bez:z.bezeichnung,projekt:z.project_id});
}
async function zrPlanLoeschen(id){
 if(typeof sb==="undefined")return;
 if(!await appConfirm("Diesen abgelegten Zuschnittplan wirklich löschen?"))return;
 const {data,error}=await sb.from("zuschnittplaene").delete().eq("id",id).select("id");
 if(error){appAlert("Konnte nicht gelöscht werden: "+error.message);return}
 if(!data||!data.length){appAlert("Nichts gelöscht – fehlt die nötige Berechtigung?");return}
 if(String(zrDb.id)===String(id))zrDb.id=null;
 await zrPlaeneLaden();
 const ph=$("zrPlaeneBox");if(ph&&typeof cockpitProjectId!=="undefined")zrPlaeneNachListe(cockpitProjectId);
}
// ---- Im Projekt-Cockpit, unter den Massaufnahmen (Aufruf am Ende von loadProjectMeasurements, js/09) ----
function zrPlaeneBoxHtml(liste){
 const zeilen=liste.map(x=>{
  const k=x.kennzahlen||{};
  return `<div class="report-row"><div class="report-row-info"><b>${esc(x.bezeichnung||"Zuschnittplan")}</b>`
   +`<span>${esc([k.text,k.stuecke?k.stuecke+" Stück":"",zrDatum(x.created_at)].filter(Boolean).join(" · "))}</span></div>`
   +`<div class="report-row-actions"><button class="blue" data-zrp-oeffnen="${esc(x.id)}">Öffnen</button>`
   +`<button class="gray" data-zrp-druck="${esc(x.id)}">🖨️</button>`
   +`<button class="red" data-zrp-weg="${esc(x.id)}" title="Löschen">×</button></div></div>`;
 }).join("");
 return `<div id="zrPlaeneBox" style="margin-top:14px"><h3 style="margin:8px 0">Zuschnittpläne <span class="small">(${liste.length})</span></h3>`
  +(zeilen||`<div class="empty">Noch kein Zuschnittplan in diesem Projekt.</div>`)
  +`<div class="bar"><button class="gray" data-zrp-neu="1">✂️ Neuer Zuschnittplan für dieses Projekt</button></div></div>`;
}
async function zrPlaeneNachListe(projectId){
 try{
  const box=$("cockpitMeasBody");
  if(!box||!projectId||typeof sb==="undefined")return;
  let {data,error}=await sb.from("zuschnittplaene").select("id,bezeichnung,project_id,created_at,kennzahlen:ergebnis->kennzahlen").eq("project_id",projectId).order("created_at",{ascending:false});
  if(error||!Array.isArray(data))return;
  data=data.filter(x=>x&&typeof x==="object"&&"kennzahlen" in x);
  const alt=$("zrPlaeneBox");if(alt)alt.remove();
  if(typeof cockpitProjectId!=="undefined"&&cockpitProjectId!==projectId)return;   // inzwischen ein anderes Projekt
  box.insertAdjacentHTML("beforeend",zrPlaeneBoxHtml(data));
 }catch(e){}
}
document.addEventListener("click",async e=>{
 const b=e.target&&e.target.closest?e.target.closest("[data-zrp-oeffnen],[data-zrp-druck],[data-zrp-weg],[data-zrp-neu]"):null;
 if(!b)return;
 const d=b.dataset;
 if(d.zrpOeffnen!==undefined){await zrPlanLaden(d.zrpOeffnen);return}
 if(d.zrpDruck!==undefined){await zrPlanDrucken(d.zrpDruck);return}
 if(d.zrpWeg!==undefined){await zrPlanLoeschen(d.zrpWeg);return}
 if(d.zrpNeu!==undefined){
  zrDb={id:null,bez:"",projekt:(typeof cockpitProjectId!=="undefined"&&cockpitProjectId)?String(cockpitProjectId):""};
  zrOeffnen();
 }
});

// ---- Bedienung -----------------------------------------------------------------
document.addEventListener("input",e=>{
 const t=e.target;
 if(!t||!t.closest||!t.closest("#zrModal"))return;
 if(t.id==="zrBez"){zrDb.bez=t.value;return}
 if(t.dataset.zrFeld!==undefined){
  const z=zrA.zeilen[Number(t.dataset.zrZeile)];
  if(z){z[t.dataset.zrFeld]=t.value;zrSpeichern();zrPlanSpaeter();zrNummernNeu()}
  return;
 }
 if(t.dataset.zr&&t.dataset.zr!=="form"&&t.dataset.zr!=="drehen"&&t.dataset.zr!=="schritte"){
  zrA[t.dataset.zr]=t.value;zrSpeichern();
  if(t.dataset.zr!=="material")zrPlanSpaeter();
 }
});
document.addEventListener("change",async e=>{
 const t=e.target;
 if(!t||!t.closest||!t.closest("#zrModal"))return;
 if(t.id==="zrDatei"){
  const f=t.files&&t.files[0];
  t.value="";
  if(f)await zrImportDatei(f);
  return;
 }
 if(t.id==="zrProjekt"){zrDb.projekt=t.value;return}
 if(t.dataset.zr==="form"){zrA.form=t.value==="tafel"?"tafel":"rolle";zrSpeichern();zrZeichnen();return}
 if(t.dataset.zr==="drehen"){zrA.drehen=!!t.checked;zrSpeichern();zrPlanNeu();return}
 if(t.dataset.zr==="schritte"){zrA.schritte=!!t.checked;zrSpeichern();zrPlanNeu();return}
});
document.addEventListener("click",async e=>{
 const k=e.target&&e.target.closest?e.target.closest("#zrModal button, [data-zr-oeffnen]"):null;
 if(!k)return;
 if(k.hasAttribute("data-zr-oeffnen")){zrOeffnen();return}
 if(k.id==="closeZr"){$("zrModal").hidden=true;return}
 if(k.dataset.zrRolle!==undefined){zrA.rolle=k.dataset.zrRolle;zrSpeichern();zrZeichnen();return}
 if(k.dataset.zrTafel!==undefined){const [b,l]=k.dataset.zrTafel.split("x");zrA.tafelBreite=b;zrA.tafelLaenge=l;zrSpeichern();zrZeichnen();return}
 if(k.dataset.zrWeg!==undefined){
  zrA.zeilen.splice(Number(k.dataset.zrWeg),1);
  if(!zrA.zeilen.length)zrA.zeilen.push({pos:"",bez:"",laenge:"",breite:"",anzahl:"1"});
  zrSpeichern();zrZeichnen();return;
 }
 if(k.id==="zrPlus"){
  if(zrA.zeilen.length>=ZR_MAX_ZEILEN){appAlert("Höchstens "+ZR_MAX_ZEILEN+" Zeilen.");return}
  zrA.zeilen.push({pos:"",bez:"",laenge:"",breite:"",anzahl:"1"});zrSpeichern();zrZeichnen();
  const f=document.querySelector('#zrZeilen [data-zr-zeile="'+(zrA.zeilen.length-1)+'"][data-zr-feld="laenge"]');if(f)f.focus();
  return;
 }
 if(k.id==="zrAblegen"){await zrAblegen(false);return}
 if(k.id==="zrAlsKopie"){await zrAblegen(true);return}
 if(k.dataset.zrPlanLaden!==undefined){await zrPlanLaden(k.dataset.zrPlanLaden);return}
 if(k.dataset.zrPlanDruck!==undefined){await zrPlanDrucken(k.dataset.zrPlanDruck);return}
 if(k.dataset.zrPlanWeg!==undefined){await zrPlanLoeschen(k.dataset.zrPlanWeg);return}
 if(k.id==="zrImport"){const d=$("zrDatei");if(d)d.click();return}
 if(k.id==="zrVorlage"){await zrVorlage();return}
 if(k.id==="zrLoeschen"){
  if(!await appConfirm("Alle Zuschnittmasse löschen?"))return;
  zrA.zeilen=[{pos:"",bez:"",laenge:"",breite:"",anzahl:"1"}];zrSpeichern();zrZeichnen();return;
 }
 if(k.id==="zrDruck"){await zrDrucken();return}
});

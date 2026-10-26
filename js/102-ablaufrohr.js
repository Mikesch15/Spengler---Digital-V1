"use strict";
// ===========================================================================
// Ablaufrohr (v3.413) - Fachrechnung, Skizze und Einstellung
// ===========================================================================
// Ein Ablaufrohr mit Schwanenhals: vom Stutzen (Rinnenablauf) zwei Boegen mit
// einem Rohrstueck dazwischen zur Fassade, dann senkrecht bis zum Sockelrohr.
// Diese Datei rechnet nur; die Bedienung steht in js/103-ablaufrohr-aufnahme.js.
//
// Alle Masse in mm. Bezeichnungen:
//   A  Ausladung   Hinterkante Stutzen bis Fassade
//   W  Wandabstand Hinterkante des Ablaufrohrs bis Fassade (unten, senkrecht)
//   D  = A - W     Versatz, den der Schwanenhals ueberbrueckt
//   a  Abzug je Bogen (Steckung); je Bogen wird das Zwischenstueck um a kuerzer
//   H  Hoehe Oberkante Stutzen bis Unterkante Sockelrohr
//   S  Hoehe Sockelrohr
//   Ls Laenge Schiebestueck (Teil der senkrechten Strecke)
//
//   Achse des Zwischenstuecks   s    = D / sin(Bogenwinkel)
//   Zuschnitt Zwischenstueck    sZu  = s - 2 * a
//   Hoehe des Schwanenhalses    hH   = sZu * cos(Bogenwinkel) + 2 * a
//   senkrechte Strecke          F    = H - hH
//   davon Rohr                  Frohr= F - Ls
//   Steckung Rohr (St): ein Rohr der Laenge l deckt nur l - St ab (es steckt im naechsten);
//   das Reststueck wird um St laenger geschnitten. Schiebestueck: Zuschnitt = Ls + Steckungszugabe.
// Das Fallrohr wird in Rohre der gewaehlten Laengen (2/3/4 m) geteilt; je Laenge
// n ganze Rohre plus ein Reststueck. Vorgeschlagen wird die Laenge mit dem
// kleinsten Verschnitt (Reststueck wird aus einem ganzen Rohr geschnitten).
// ===========================================================================

const AR_BOGENWINKEL=Object.freeze([45,70,85]);
const AR_ROHRLAENGEN=Object.freeze([2000,3000,4000]);
const AR_FASSADEN=Object.freeze([["daemmung","Aussendämmung"],["mauerwerk","Beton / Mauerwerk"]]);
const AR_STANDARD=Object.freeze({bogen_abzug:0,rohr_steckung:0,schiebe_zugabe:0});

function arEinstellungenLaden(){
 const w=(typeof efLokal==="function")?efLokal("sd_ablaufrohrSettings"):{};
 const wert=k=>{const x=Number(w&&w[k]);return Number.isFinite(x)&&x>=0?x:AR_STANDARD[k]};
 return {bogen_abzug:wert("bogen_abzug"),rohr_steckung:wert("rohr_steckung"),schiebe_zugabe:wert("schiebe_zugabe")};
}
let ablaufrohrSettings=arEinstellungenLaden();

const arEsc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const arHat=v=>v!==""&&v!==null&&v!==undefined&&Number.isFinite(Number(v));
const arZ=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const arMm=v=>Math.round(arZ(v)).toLocaleString("de-CH");
const arRund1=v=>Math.round(arZ(v)*10)/10;
// Abzug je Bogen: die Eingabe der Massaufnahme, sonst die Firmeneinstellung
function arWirksam(e,feld,standard){
 return arHat(e&&e[feld])?Math.max(0,arZ(e[feld])):Math.max(0,arZ(ablaufrohrSettings&&ablaufrohrSettings[standard]));
}
function arAbzugWirksam(e){return arWirksam(e,"bogenAbzug","bogen_abzug")}
function arRohrlaengenWahl(e){
 const w=Array.isArray(e&&e.rohrlaengen)?e.rohrlaengen.map(Number):AR_ROHRLAENGEN.slice();
 return AR_ROHRLAENGEN.filter(l=>w.includes(l));
}

function berechneAblaufrohr(e){
 e=e||{};
 const A=arZ(e.ausladung),W=arZ(e.wandabstand),al=arZ(e.bogenwinkel),H=arZ(e.hoehe),S=arZ(e.sockel),Ls=arZ(e.schiebestueck);
 const a=arAbzugWirksam(e),D=A-W;
 const St=arWirksam(e,"rohrSteckung","rohr_steckung"),Sz=arWirksam(e,"schiebeZugabe","schiebe_zugabe");
 const r={A,W,alpha:al,H,S,Ls,abzug:a,steckung:St,schiebeZugabe:Sz,schiebeZuschnitt:Ls>0?Ls+Sz:0,D,halsOk:false,fallOk:false,sAchse:0,sZu:0,hHals:0,fall:0,fallRohr:0,
  gesamtHoehe:H+S,optionen:[],vorschlag:null,fehler:[]};
 if(!(A>0)||!arHat(e.wandabstand)||!AR_BOGENWINKEL.includes(al))return r;
 if(!(D>0)){r.fehler.push("Der Wandabstand ("+arMm(W)+" mm) muss kleiner sein als die Ausladung ("+arMm(A)+" mm).");return r}
 const rad=al*Math.PI/180;
 r.sAchse=D/Math.sin(rad);
 r.sZu=r.sAchse-2*a;
 if(!(r.sZu>0)){r.fehler.push("Das Zwischenstück wird nicht positiv: "+arMm(r.sAchse)+" mm Achse minus 2 × "+arMm(a)+" mm Abzug je Bogen.");return r}
 r.halsOk=true;
 r.hHals=r.sZu*Math.cos(rad)+2*a;   // Hals = Zwischenstueck x cos + 2 x Abzug je Bogen
 if(!(H>0))return r;
 r.fall=H-r.hHals;
 r.fallRohr=r.fall-Ls;
 if(!(r.fallRohr>0)){r.fehler.push("Die Höhe reicht nicht: Schwanenhals "+arMm(r.hHals)+" mm"+(Ls>0?" plus Schiebestück "+arMm(Ls)+" mm":"")+" ergeben mehr als die Höhe von "+arMm(H)+" mm.");return r}
 r.fallOk=true;
 // auf 0,1 mm gerundet, sonst ergibt 3999,98 mm kein ganzes 4-m-Rohr
 const F=arRund1(r.fallRohr);
 r.optionen=arRohrlaengenWahl(e).filter(l=>l-St>0).map(l=>{
  const le=l-St;   // Nutzlaenge eines Rohres: es steckt St im naechsten
  const n=Math.floor(F/le+1e-9);
  let nutz=arRund1(F-n*le);
  if(nutz<0.5)nutz=0;
  const rest=nutz>0?nutz+St:0;   // Reststueck wird um die Steckung laenger geschnitten
  return {laenge:l,nutzlaenge:le,ganze:n,rest,restNutz:nutz,rohre:n+(rest>0?1:0),verschnitt:rest>0?l-rest:0};
 });
 r.vorschlag=r.optionen.slice().sort((x,y)=>x.verschnitt-y.verschnitt||x.rohre-y.rohre||y.laenge-x.laenge)[0]||null;
 if(r.vorschlag)r.vorschlag.vorschlag=true;
 return r;
}

// Stueckliste des Ablaufrohrs (Zuschnittliste)
function arStueckliste(g){
 const z=[];let pos=0;
 const zeile=(bez,anzahl,laenge,bem)=>z.push({pos:++pos,bezeichnung:bez,anzahl,laenge:laenge===null?null:Math.round(laenge),bemerkung:bem||""});
 if(!g.halsOk)return z;
 zeile("Bogen "+g.alpha+"°",2,null,"Schwanenhals");
 zeile("Zwischenstück Schwanenhals",1,g.sZu,"Achse "+arMm(g.sAchse)+" − 2 × "+arMm(g.abzug)+" mm Abzug");
 if(g.fallOk&&g.vorschlag){
  const v=g.vorschlag;
  if(v.ganze>0)zeile("Ablaufrohr "+(v.laenge/1000)+" m",v.ganze,v.laenge,"ganze Rohre"+(g.steckung>0?", Nutzlänge "+arMm(v.nutzlaenge)+" mm (Steckung "+arMm(g.steckung)+" mm)":""));
  if(v.rest>0)zeile("Reststück Ablaufrohr",1,v.rest,"aus "+(v.laenge/1000)+" m, Verschnitt "+arMm(v.verschnitt)+" mm"+(g.steckung>0?", Nutzlänge "+arMm(v.restNutz)+" mm + Steckung":""));
 }
 if(g.Ls>0)zeile("Schiebestück",1,g.schiebeZuschnitt,g.schiebeZugabe>0?"Länge "+arMm(g.Ls)+" mm + Steckungszugabe "+arMm(g.schiebeZugabe)+" mm":"");
 if(g.S>0)zeile("Sockelrohr",1,g.S,"");
 return z;
}

const AR_FASSADEN_HINWEIS=Object.freeze({
 daemmung:"Aussendämmung: Rohrschellen mit Distanz durch die Dämmung im tragenden Untergrund befestigen; der Wandabstand muss zu Dämmstärke und Schelle passen.",
 mauerwerk:"Beton / Mauerwerk: Rohrschellen mit Dübeln direkt in der Wand befestigen."
});

// ---- Skizze (Seitenansicht) -------------------------------------------------
// Fassade links, Stutzen oben, Schwanenhals zur Wand, dann senkrecht zum Sockel.
function arPlanSvg(g){
 if(!g||!g.halsOk)return `<div class="small" style="color:var(--muted);padding:10px">Skizze erscheint, sobald Ausladung, Wandabstand und Bogenwinkel erfasst sind.</div>`;
 const Hh=g.H>0?g.H:g.sAchse*Math.cos(g.alpha*Math.PI/180)*1.6;
 const Sh=g.S>0?g.S:0;
 const breite=Math.max(g.A,g.W)+80;
 const sc=Math.min(150/breite,300/(Hh+Sh+60));
 const ox=46,oy=54;
 const X=v=>ox+v*sc,Y=v=>oy+v*sc;
 const yHals=Y(g.sAchse*Math.cos(g.alpha*Math.PI/180));
 const yH=Y(Hh),yG=Y(Hh+Sh);
 const xA=X(g.A),xW=X(g.W);
 const T=(x,y,t,o)=>`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="11" fill="${(o&&o.f)||"#1769aa"}" font-family="Arial,Helvetica,sans-serif" font-weight="700" text-anchor="${(o&&o.a)||"middle"}">${arEsc(t)}</text>`;
 const L=(x1,y1,x2,y2,c,w,d)=>`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${c||"#68737d"}" stroke-width="${w||1}"${d?` stroke-dasharray="${d}"`:""} stroke-linecap="round"/>`;
 let s="";
 s+=`<rect x="${ox-14}" y="${oy-24}" width="14" height="${(yG-oy+24+4).toFixed(1)}" fill="#e3e8ec" stroke="#9aa5ae"/>`;
 s+=L(ox-30,yG,ox+190,yG,"#17202a",1.5);
 s+=`<rect x="${(xA-8).toFixed(1)}" y="${oy-12}" width="16" height="12" fill="#b9c4cc" stroke="#68737d"/>`;
 s+=L(xA,oy,X(g.W),yHals,"#4a5b68",6);
 s+=L(xW,yHals,xW,yH,"#4a5b68",6);
 if(Sh>0)s+=L(xW,yH,xW,yG,"#17202a",9);
 s+=`<circle cx="${xA.toFixed(1)}" cy="${oy}" r="3.2" fill="#e07a1f"/><circle cx="${xW.toFixed(1)}" cy="${yHals.toFixed(1)}" r="3.2" fill="#e07a1f"/>`;
 s+=L(ox,oy-22,xA,oy-22,"#1769aa",1)+L(ox,oy-26,ox,oy-18,"#1769aa",1)+L(xA,oy-26,xA,oy-18,"#1769aa",1)+T((ox+xA)/2,oy-28,"A "+arMm(g.A));
 const yw=yHals+22;
 s+=L(ox,yw,xW,yw,"#1769aa",1)+L(ox,yw-4,ox,yw+4,"#1769aa",1)+L(xW,yw-4,xW,yw+4,"#1769aa",1)+T((ox+xW)/2,yw+13,"W "+arMm(g.W));
 const xd=xA+34;
 s+=L(xd,oy,xd,yH,"#1769aa",1)+L(xd-4,oy,xd+4,oy,"#1769aa",1)+L(xd-4,yH,xd+4,yH,"#1769aa",1)+T(xd+6,(oy+yH)/2,"H "+arMm(g.H),{a:"start"});
 if(Sh>0)s+=L(xd,yH,xd,yG,"#0f766e",1)+L(xd-4,yG,xd+4,yG,"#0f766e",1)+T(xd+6,(yH+yG)/2+4,"S "+arMm(g.S),{a:"start",f:"#0f766e"});
 s+=T((xA+xW)/2+8,(oy+yHals)/2-6,g.alpha+"°",{a:"start",f:"#b45a09"});
 const yb=(yHals+yH)/2;
 s+=T(xW+12,yHals+4,"Hals "+arMm(g.hHals),{a:"start",f:"#b45a09"});
 if(g.Ls>0)s+=T(xW+12,Math.min(yb+14,yH-6),"Schiebestück "+arMm(g.Ls),{a:"start",f:"#68737d"});
 const hoehe=Math.round(yG+30);
 return `<svg viewBox="0 0 300 ${hoehe}" style="width:100%;max-width:340px;display:block;margin:6px auto" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

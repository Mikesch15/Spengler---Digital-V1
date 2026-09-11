// ---------------------------------------------------------------------------
// v3.30  Ruestskizzen - EINE Quelle fuer Profil, Schnitt und Grundriss
// ---------------------------------------------------------------------------
// Bis v3.29 stand der Zusammenbau der Zeichnungen ausschliesslich im
// PDF-Druck (printMeasurement in js/16): jeder der zwoelf Zweige bereitete
// seine Werte auf und rief danach den Zeichner der Fachdatei. Fuer die
// Werkstatt wird derselbe Zusammenbau ein zweites Mal gebraucht - und ein
// zweiter Zusammenbau laeuft frueher oder spaeter auseinander (genau das war
// der Befund zum doppelten Plan-Bauer, CLAUDE.md 130.3).
//
// Deshalb steht er jetzt EINMAL hier. Der Ausdruck ruft dieselbe Funktion.
//
//   rsSkizzen(m)  ->  [{titel, svg}]
//
// GERECHNET WIRD NICHTS. Genommen wird ausschliesslich der GESPEICHERTE
// Datensatz, und gezeichnet wird von den unveraenderten Zeichnern der
// Fachdateien (js/11 bis js/26, js/37) - keine zweite Zeichnung.
//
// Welche Art was liefert, steht nicht in einer geratenen Liste, sondern
// genau so in der Tabelle darunter, wie der Ausdruck es bis v3.29 hatte:
//
//   Art                    Skizze                        Grundriss
//   einlaufblech_gerade    Schnittskizze                 ja
//   einlaufblech_konisch   Schnittskizze                 ja
//   rinne_halbrund         -                             ja
//   mauerabdeckung         Profil (Querschnitt)          ja
//   freies_profil          Profil                        -
//   lukarne                Plan                          -
//   anschlussblech         Schnitt                       -
//   einfassung_rund        Schnitt                       -
//   kamineinfassung        Schnitt                       -
//   dachfenstereinfassung  Schnitt                       -
//   rinne                  Profilskizze                  -
//   kehle                  -                             -   (rechnet nur)
//   skizze_foto            -                             -   (Foto/Skizze)
//
// Eine Zeichnung kann fehlen, wenn die dafuer noetigen Masse im Datensatz
// nicht stehen. Dann liefert der Zeichner keinen SVG-Text, sondern einen
// Hinweis - und der gehoert weder ins PDF noch an die Abkantbank. Geprueft
// wird deshalb zentral auf "<svg" (bis v3.29 tat das nur der Kamin-Zweig).
// ---------------------------------------------------------------------------

function rsIstSvg(h){ return /^<svg/.test(String(h==null?"":h).trim()) }
// Nimmt nur, was wirklich eine Zeichnung ist. Fehlt der Zeichner (eine
// Fachdatei ist nicht geladen), wird nichts behauptet.
function rsEintrag(liste,titel,fn){
 let h="";
 try{ h=fn() }catch(e){ console.error("Rüstskizze "+titel,e); return }
 if(rsIstSvg(h))liste.push({titel,svg:String(h)});
}

const RS_SKIZZEN={
 einlaufblech_gerade(d,liste){
  if(typeof einlaufblechDiagramSvg==="function"&&typeof einlaufblechSettings==="object")
   rsEintrag(liste,"Schnittskizze",()=>einlaufblechDiagramSvg(d.winkel,d.massA,d.restBreite,
     einlaufblechSettings.umschlag_oben,einlaufblechSettings.umschlag_unten));
  if(typeof generateEbkGrundriss==="function")
   rsEintrag(liste,"Grundriss",()=>generateEbkGrundriss(d.pieces||[]));
 },
 einlaufblech_konisch(d,liste){
  // Dasselbe Vorgehen wie im Ausdruck: die enge Seite wird ueber alle
  // Stuecke gemittelt, weil ein konisches Blech kein einzelnes Mass A hat.
  const pieces=d.pieces||[];
  const engeSeite=d.engeSeite||"rechts";
  const masse=pieces.map(p=>Number(engeSeite==="links"?p.massLinks:p.massRechts)||0).filter(v=>v>0);
  const repMass=masse.length?masse.reduce((a,b)=>a+b,0)/masse.length:null;
  const s=(typeof einlaufblechKonischSettings==="object")?einlaufblechKonischSettings:{};
  const restBreite=repMass?(Number(d.abwicklung)-repMass-(Number(s.umschlag_oben)||0)-(Number(s.umschlag_unten)||0)):null;
  if(typeof einlaufblechDiagramSvg==="function")
   rsEintrag(liste,"Schnittskizze",()=>einlaufblechDiagramSvg(d.dachneigung,repMass,restBreite,
     s.umschlag_oben,s.umschlag_unten));
  if(typeof generateEbkGrundriss==="function")
   rsEintrag(liste,"Grundriss",()=>generateEbkGrundriss(pieces));
 },
 rinne_halbrund(d,liste){
  if(typeof generateRinneGrundriss==="function")
   rsEintrag(liste,"Grundriss",()=>generateRinneGrundriss(d.segments||[],d.dilas||[],d.boundaries||[]));
 },
 mauerabdeckung(d,liste){
  const segs=d.segments||[];
  if(typeof madProfilSvgAus==="function")
   rsEintrag(liste,"Profil (Querschnitt)",()=>madProfilSvgAus(d.profil));
  if(typeof generateRinneGrundriss==="function")
   rsEintrag(liste,"Grundriss",()=>generateRinneGrundriss(segs,d.schieber||[],d.boundaries||[],
     {anfang:!!(segs[0]&&segs[0].bodenLinks),ende:!!(segs[segs.length-1]&&segs[segs.length-1].bodenRechts)}));
 },
 freies_profil(d,liste){
  if(typeof generateProfilDiagramSvg==="function")
   rsEintrag(liste,"Profil",()=>generateProfilDiagramSvg(d.schenkel||[]));
 },
 lukarne(d,liste){
  if(typeof lukPlanSvg!=="function"||typeof berechneLukarne!=="function")return;
  const g=berechneLukarne({hoehe:d.hoehe,laengeOben:d.laengeOben,winkel:d.winkel,
   achsabstand:d.achsabstand,hilfsrissWunsch:d.hilfsrissWunsch!==undefined?d.hilfsrissWunsch:d.hilfsriss,
   seite:d.seite,zugabeLaenge:d.zugabeLaenge,zugabeBreite:d.zugabeBreite});
  rsEintrag(liste,"Plan",()=>lukPlanSvg(g,{fuerDruck:true}));
 },
 anschlussblech(d,liste){
  if(typeof anbZeichnung==="function")rsEintrag(liste,"Schnitt",()=>anbZeichnung(d));
 },
 einfassung_rund(d,liste){
  if(typeof einfZeichnung==="function")rsEintrag(liste,"Schnitt",()=>einfZeichnung(d));
 },
 kamineinfassung(d,liste){
  if(typeof kamaSkizze!=="function")return;
  rsEintrag(liste,"Schnitt",()=>kamaSkizze(Object.assign({},d,{skizzeSeite:"l"})));
  if(d.getrennt)rsEintrag(liste,"Schnitt rechts",()=>kamaSkizze(Object.assign({},d,{skizzeSeite:"r"})));
 },
 dachfenstereinfassung(d,liste){
  if(typeof dfaSkizze!=="function")return;
  rsEintrag(liste,"Schnitt",()=>dfaSkizze(Object.assign({},d,{skizzeSeite:"l"})));
  if(d.getrennt)rsEintrag(liste,"Schnitt rechts",()=>dfaSkizze(Object.assign({},d,{skizzeSeite:"r"})));
 },
 rinne(d,liste){
  if(typeof rinneSvg!=="function"||typeof rinneWerte!=="function")return;
  const w=rinneWerte(d);
  const stuecke=Array.isArray(d.stuecke)?d.stuecke:[];
  const erstes=stuecke[0];
  rsEintrag(liste,"Profilskizze",()=>rinneSvg(w.profil,erstes?erstes.links:null,null));
 }
 // kehle und skizze_foto haben keine Zeichnung - hier wird keine erfunden.
};

// Die Zeichnungen einer Massaufnahme, in der Reihenfolge, in der der
// Ausdruck sie seit je bringt: erst die Schnitt-/Profilskizze, dann der
// Grundriss.
function rsSkizzen(m){
 if(!m||!m.type)return [];
 const bauer=RS_SKIZZEN[m.type];
 if(!bauer)return [];
 const liste=[];
 try{ bauer(m.data||{},liste) }catch(e){ console.error("Rüstskizzen",e) }
 return liste;
}
function rsHatSkizze(m){ return rsSkizzen(m).length>0 }

// Eine einzelne Zeichnung nach ihrem Titel - das braucht der Ausdruck, der
// jede an ihrer eigenen Stelle im Blatt setzt. Fehlt sie (die Masse stehen
// nicht im Datensatz), kommt ein leerer Text zurueck und der Zweig laesst
// den Platz frei, statt einen Hinweis ins PDF zu drucken.
function rsSvg(m,titel){
 const t=rsSkizzen(m).find(x=>x.titel===titel);
 return t?t.svg:"";
}

// ---------------------------------------------------------------------------
// Leerraum wegschneiden - NUR fuer die Darstellung am Bildschirm
// ---------------------------------------------------------------------------
// Die Zeichner der Fachdateien geben eine feste, oft quadratische viewBox aus.
// Gemessen: der Grundriss belegt darin 280 x 47 von 368 x 368 Einheiten, also
// 10 Prozent - der Rest ist Leerraum, und der drueckt an der Abkantbank die
// Zuschnittliste aus dem Bild. Genau dieser Befund steht seit CLAUDE.md 63.6
// als offener Punkt, samt dem hier gegangenen Weg.
//
// Beschnitten wird deshalb NACH dem Einfuegen ueber die tatsaechlich
// gezeichnete Flaeche (getBBox) - dieselbe Technik, die js/26 fuer die
// Rinnen-Profilskizze seit v2.57 selbst anwendet (gemessen: 100 Prozent
// Fuellung). Die Zeichner selbst und der PDF-Weg bleiben unberuehrt.
//
// getBBox wirft, wenn nichts gerendert ist. Dann bleibt die viewBox, wie sie
// war - es wird nichts geschaetzt.
// Begrenzt die Breite so, dass eine hohe, schmale Zeichnung nicht in einen
// breiten, leeren Rahmen gezwaengt wird. Die Zeichner geben ihren SVGs keine
// width/height mit: im Blockfluss ist die Breite damit die volle Breite des
// Rahmens, die Hoehe folgt daraus - und wird von max-height gedeckelt. Beim
// Freien Profil (viewBox 123 zu 297) sind das gemessen 280 x 230 px Rahmen
// fuer eine nur 95 px breite Zeichnung.
//
// aspect-ratio hilft hier nicht: es gibt nach, sobald die Breite feststeht.
// Gerechnet wird deshalb die Breite, die zur Hoehengrenze passt - und die
// Grenze kommt aus dem CSS, damit sie nur an EINER Stelle steht.
function rsVerhaeltnis(s){
 const vb=String(s.getAttribute("viewBox")||"").trim().split(/\s+/).map(Number);
 if(vb.length!==4||!vb.every(n=>isFinite(n))||!(vb[2]>0)||!(vb[3]>0))return;
 let hmax=0;
 try{ hmax=parseFloat(getComputedStyle(s).maxHeight) }catch(e){}
 if(!(hmax>0))return;
 s.style.maxWidth=Math.round(hmax*vb[2]/vb[3])+"px";
}
function rsZuschneiden(wurzel){
 if(!wurzel||typeof wurzel.querySelectorAll!=="function")return;
 wurzel.querySelectorAll("svg[viewBox]").forEach(s=>{
  if(s.dataset.rsBeschnitten){ rsVerhaeltnis(s); return }
  let bb=null;
  try{ bb=s.getBBox() }catch(e){ rsVerhaeltnis(s); return }
  if(!bb||!(bb.width>0)||!(bb.height>0)){ rsVerhaeltnis(s); return }
  const vb=String(s.getAttribute("viewBox")||"").trim().split(/\s+/).map(Number);
  if(vb.length!==4||!vb.every(n=>isFinite(n))||!(vb[2]>0)||!(vb[3]>0))return;
  // Ein Rand, damit Strichbreiten und Beschriftungen nicht angeschnitten
  // werden - so viel wie js/26 fuer seine eigene Skizze verwendet.
  const rand=Math.max(6,Math.round(Math.max(bb.width,bb.height)*0.03));
  const x=bb.x-rand, y=bb.y-rand, w=bb.width+2*rand, h=bb.height+2*rand;
  // Nur beschneiden, wenn es wirklich etwas bringt: unter einem Fuenftel
  // Ersparnis lohnt der Eingriff nicht.
  if(w*h>vb[2]*vb[3]*0.8){ s.dataset.rsBeschnitten="unnoetig"; rsVerhaeltnis(s); return }
  s.setAttribute("viewBox",x+" "+y+" "+w+" "+h);
  s.dataset.rsBeschnitten="1";
  rsVerhaeltnis(s);
 });
}

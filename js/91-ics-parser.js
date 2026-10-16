"use strict";
// ===========================================================================
// v3.375  Terminplanung: Kalenderdatei (.ics, iCalendar RFC 5545) lesen
// ---------------------------------------------------------------------------
// REINE Funktionen ohne Datenbank und ohne Oberfläche (die Oberfläche steht in js/92-termine.js).
// Der Browser kann den Kalender des Handys nicht direkt lesen. Der Weg ist die Kalenderdatei: im Kalender des
// Handys "Teilen/Exportieren" -> .ics -> hier auswählen.
//
// GRUNDSÄTZE
//  - Nichts erfinden: Was nicht eindeutig lesbar ist, wird übersprungen und gemeldet.
//  - Die Zeitzone wird ausdrücklich angegeben (Standard Europe/Zurich); das Ergebnis hängt nie von der Zeitzone des Geräts ab.
//  - Wiederkehrende Termine (RRULE) werden NICHT aufgelöst: nur der erste Termin wird übernommen und als solcher gekennzeichnet.
//  - Der Inhalt der Datei wird nie als HTML eingefügt (die Oberfläche escaped alles).
// ===========================================================================
const ICS_MAX_BYTES=2*1024*1024;
const ICS_MAX_TERMINE=500;
const ICS_ZONE_STANDARD="Europe/Zurich";
// Zeitzonen-Namen, die in der Schweiz dieselbe Ortszeit bedeuten (Outlook/Windows nennt sie anders)
const ICS_ZONE_GLEICH=["europe/zurich","europe/berlin","europe/vienna","europe/paris","europe/rome","europe/amsterdam","europe/brussels",
 "w. europe standard time","romance standard time","central europe standard time","central european standard time","cet","cest"];

function icsEntfalten(text){
 return String(text==null?"":text).replace(/\r\n|\r/g,"\n").replace(/\n[ \t]/g,"").split("\n");
}
function icsEntschuetzen(s){
 return String(s==null?"":s).replace(/\\([nN,;\\])/g,(m,c)=>c==="n"||c==="N"?"\n":c);
}
// "DTSTART;TZID=Europe/Zurich;VALUE=DATE-TIME:2026..." -> {name,params,wert}
function icsZeileLesen(zeile){
 const i=zeile.indexOf(":");
 if(i<1)return null;
 // Doppelpunkt in Anführungszeichen eines Parameters ist selten; wir suchen den ersten ausserhalb von Anführungszeichen
 let inQ=false,pos=-1;
 for(let k=0;k<zeile.length;k++){const c=zeile[k];if(c==='"')inQ=!inQ;else if(c===":"&&!inQ){pos=k;break}}
 if(pos<1)return null;
 const kopf=zeile.slice(0,pos).split(";"),params={};
 for(const p of kopf.slice(1)){const j=p.indexOf("=");if(j>0)params[p.slice(0,j).toUpperCase()]=p.slice(j+1).replace(/^"|"$/g,"")}
 return {name:kopf[0].toUpperCase(),params,wert:zeile.slice(pos+1)};
}
function icsZonenFormat(zone){
 return new Intl.DateTimeFormat("en-CA",{timeZone:zone,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
// Ortszeit einer UTC-Zeit (ms) in einer Zeitzone -> {y,mo,d,h,mi}
function icsOrtszeit(ms,zone){
 const t={};
 icsZonenFormat(zone).formatToParts(new Date(ms)).forEach(p=>{t[p.type]=p.value});
 return {y:+t.year,mo:+t.month,d:+t.day,h:+t.hour%24,mi:+t.minute,s:+t.second};
}
// Wanduhrzeit einer Zeitzone -> UTC (ms)
function icsWandNachUtc(y,mo,d,h,mi,zone){
 const roh=Date.UTC(y,mo-1,d,h,mi,0);
 let off=0,ms=roh;
 for(let n=0;n<3;n++){
  const o=icsOrtszeit(ms,zone);
  off=Date.UTC(o.y,o.mo-1,o.d,o.h,o.mi,0)-ms;
  ms=roh-off;
 }
 return ms;
}
const icsZ2=n=>String(n).padStart(2,"0");
const icsDatumText=(y,mo,d)=>y+"-"+icsZ2(mo)+"-"+icsZ2(d);
function icsTagPlus(iso,tage){
 const [y,m,d]=iso.split("-").map(Number),dt=new Date(Date.UTC(y,m-1,d+tage));
 return icsDatumText(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
}
// Einen DTSTART/DTEND-Wert in {datum,zeit,ganztags,hinweis} umrechnen. zone = Ziel-Zeitzone.
function icsZeitWert(wert,params,zone){
 const w=String(wert||"").trim();
 let m=w.match(/^(\d{4})(\d{2})(\d{2})$/);
 if(m&&(!params.VALUE||params.VALUE.toUpperCase()==="DATE")){
  const y=+m[1],mo=+m[2],d=+m[3];
  const chk=new Date(Date.UTC(y,mo-1,d));
  if(chk.getUTCFullYear()!==y||chk.getUTCMonth()!==mo-1||chk.getUTCDate()!==d)return null;
  return {datum:icsDatumText(y,mo,d),zeit:null,ganztags:true,hinweis:""};
 }
 m=w.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/i);
 if(!m)return null;
 const y=+m[1],mo=+m[2],d=+m[3],h=+m[4],mi=+m[5];
 if(mo<1||mo>12||d<1||d>31||h>23||mi>59)return null;
 if(m[7]){
  const o=icsOrtszeit(Date.UTC(y,mo-1,d,h,mi,0),zone);
  return {datum:icsDatumText(o.y,o.mo,o.d),zeit:icsZ2(o.h)+":"+icsZ2(o.mi),ganztags:false,hinweis:""};
 }
 const tz=params.TZID?String(params.TZID):"";
 if(!tz||ICS_ZONE_GLEICH.includes(tz.toLowerCase())||tz===zone)
  return {datum:icsDatumText(y,mo,d),zeit:icsZ2(h)+":"+icsZ2(mi),ganztags:false,hinweis:""};
 try{
  const ms=icsWandNachUtc(y,mo,d,h,mi,tz),o=icsOrtszeit(ms,zone);
  return {datum:icsDatumText(o.y,o.mo,o.d),zeit:icsZ2(o.h)+":"+icsZ2(o.mi),ganztags:false,hinweis:""};
 }catch(e){
  return {datum:icsDatumText(y,mo,d),zeit:icsZ2(h)+":"+icsZ2(mi),ganztags:false,hinweis:"Zeitzone „"+tz+"“ unbekannt – als Ortszeit gelesen"};
 }
}
function icsDauerMinuten(w){
 const m=String(w||"").match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
 if(!m)return null;
 const mi=((+m[2]||0)*7*24*60)+((+m[3]||0)*24*60)+((+m[4]||0)*60)+(+m[5]||0);
 return m[1]==="-"?-mi:mi;
}
// ---- Wiederholungen auflösen (nur auf Wunsch: opt.fenster={von,bis} "JJJJ-MM-TT"; ohne Fenster bleibt es beim ersten Termin) ----
// v3.385 (Kalender-Abo): ein abonnierter Arbeitskalender enthält Serien (RRULE). Unterstützt: DAILY/WEEKLY/MONTHLY/YEARLY mit INTERVAL, COUNT, UNTIL,
// BYDAY (auch 2MO / -1FR), BYMONTHDAY, BYMONTH, EXDATE und geänderte/abgesagte Einzeltermine (RECURRENCE-ID). Alles andere (BYSETPOS, BYWEEKNO, ...)
// wird NICHT geraten: dann zählt nur der erste Termin, mit Hinweis.
const ICS_WTAG=["SU","MO","TU","WE","TH","FR","SA"];
function icsRegelLesen(text){
 const r={freq:"",interval:1,count:null,until:null,byday:[],bymonthday:[],bymonth:[],ok:true};
 for(const teil of String(text||"").split(";")){
  const i=teil.indexOf("=");if(i<1)continue;
  const k=teil.slice(0,i).toUpperCase(),v=teil.slice(i+1);
  switch(k){
   case "FREQ":r.freq=v.toUpperCase();break;
   case "INTERVAL":r.interval=Math.max(1,parseInt(v,10)||1);break;
   case "COUNT":r.count=parseInt(v,10)||null;break;
   case "UNTIL":r.until=v.trim();break;
   case "WKST":break;
   case "BYDAY":r.byday=v.split(",").map(x=>{const m=x.trim().toUpperCase().match(/^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/);return m?{n:m[1]?parseInt(m[1],10):0,tag:ICS_WTAG.indexOf(m[2])}:null});if(r.byday.includes(null))r.ok=false;break;
   case "BYMONTHDAY":r.bymonthday=v.split(",").map(x=>parseInt(x,10));if(r.bymonthday.some(n=>!n||n<-31||n>31))r.ok=false;break;
   case "BYMONTH":r.bymonth=v.split(",").map(x=>parseInt(x,10));if(r.bymonth.some(n=>!(n>=1&&n<=12)))r.ok=false;break;
   default:r.ok=false;
  }
 }
 if(!["DAILY","WEEKLY","MONTHLY","YEARLY"].includes(r.freq))r.ok=false;
 if(r.freq==="YEARLY"&&r.byday.some(b=>b.n)&&!r.bymonth.length)r.ok=false;
 return r;
}
const icsTagNr=(y,mo,d)=>Math.floor(Date.UTC(y,mo-1,d)/86400000);
function icsInstanzKey(uid,datum,zeit){return uid+"|"+datum+(zeit?"T"+zeit:"")}
// Alle Termine einer Serie im Fenster. Gibt [] zurück, wenn die Regel nicht unterstützt wird (null = nicht unterstützt).
function icsSerie(e,zone,fenster){
 const r=icsRegelLesen(e.rruleText);
 if(!r.ok)return null;
 const w=String(e.start.wert||"").trim(),par=e.start.params||{};
 let m=w.match(/^(\d{4})(\d{2})(\d{2})$/),ganz=false,utc=false,y,mo,d,h=0,mi=0;
 if(m){ganz=true;y=+m[1];mo=+m[2];d=+m[3]}
 else{m=w.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/i);if(!m)return null;y=+m[1];mo=+m[2];d=+m[3];h=+m[4];mi=+m[5];utc=!!m[7]}
 let achse=zone;
 if(!utc&&!ganz&&par.TZID&&!ICS_ZONE_GLEICH.includes(String(par.TZID).toLowerCase())&&par.TZID!==zone){try{icsZonenFormat(par.TZID);achse=par.TZID}catch(x){achse=zone}}
 const ms=(yy,mm,dd,hh,mn)=>utc?Date.UTC(yy,mm-1,dd,hh,mn,0):icsWandNachUtc(yy,mm,dd,hh,mn,achse);
 // Dauer
 let dauerMs=0,spanTage=1;
 if(e.ende){
  const z=icsZeitWert(e.ende.wert,e.ende.params||{},zone),zs=icsZeitWert(e.start.wert,par,zone);
  if(z&&zs){
   if(ganz){const [a,b,c]=zs.datum.split("-").map(Number),[a2,b2,c2]=z.datum.split("-").map(Number);spanTage=Math.max(1,icsTagNr(a2,b2,c2)-icsTagNr(a,b,c))}
   else if(!z.ganztags){
    const [a,b,c]=zs.datum.split("-").map(Number),[hh,mm]=zs.zeit.split(":").map(Number),[a2,b2,c2]=z.datum.split("-").map(Number),[hh2,mm2]=z.zeit.split(":").map(Number);
    dauerMs=Math.max(0,icsWandNachUtc(a2,b2,c2,hh2,mm2,zone)-icsWandNachUtc(a,b,c,hh,mm,zone));
   }
  }
 }else if(e.dauer!==null&&e.dauer!==undefined&&e.dauer>=0){if(ganz)spanTage=Math.max(1,Math.ceil(e.dauer/1440));else dauerMs=e.dauer*60000}
 // Ende der Auflösung
 const [by,bm,bd]=fenster.bis.split("-").map(Number);
 const bisNr=icsTagNr(by,bm,bd)+2;
 let untilMs=null;
 if(r.until){
  const u=r.until.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z?))?$/i);
  if(!u)return null;
  if(u[4]===undefined)untilMs=icsWandNachUtc(+u[1],+u[2],+u[3],23,59,zone);
  else untilMs=u[7]?Date.UTC(+u[1],+u[2]-1,+u[3],+u[4],+u[5],0):icsWandNachUtc(+u[1],+u[2],+u[3],+u[4],+u[5],zone);
 }
 const startNr=icsTagNr(y,mo,d),startWd=new Date(Date.UTC(y,mo-1,d)).getUTCDay();
 const wochenStart=startNr-((startWd+6)%7);   // Montag der ersten Woche
 const aus=[];let n=0;
 const ex=new Set(e.exKeys||[]);
 for(let nr=startNr;nr<=bisNr&&nr-startNr<20000;nr++){
  const dt=new Date(nr*86400000),Y=dt.getUTCFullYear(),M=dt.getUTCMonth()+1,D=dt.getUTCDate(),wd=dt.getUTCDay();
  const dim=new Date(Date.UTC(Y,M,0)).getUTCDate();
  let ok=false;
  const monatTag=()=>{
   if(r.bymonthday.length)return r.bymonthday.some(b=>b>0?b===D:dim+b+1===D);
   if(r.byday.length)return r.byday.some(b=>b.tag===wd&&(b.n===0||b.n===Math.ceil(D/7)||b.n===-Math.ceil((dim-D+1)/7)));
   return D===d;
  };
  if(r.freq==="DAILY"){
   ok=(nr-startNr)%r.interval===0&&(!r.byday.length||r.byday.some(b=>b.tag===wd))&&(!r.bymonthday.length||r.bymonthday.some(b=>b>0?b===D:dim+b+1===D))&&(!r.bymonth.length||r.bymonth.includes(M));
  }else if(r.freq==="WEEKLY"){
   const wk=Math.floor((nr-wochenStart)/7);
   ok=wk%r.interval===0&&(r.byday.length?r.byday.some(b=>b.tag===wd):wd===startWd)&&(!r.bymonth.length||r.bymonth.includes(M));
  }else if(r.freq==="MONTHLY"){
   ok=((Y-y)*12+(M-mo))%r.interval===0&&monatTag()&&(!r.bymonth.length||r.bymonth.includes(M));
  }else{
   ok=(Y-y)%r.interval===0&&(r.bymonth.length?r.bymonth:[mo]).includes(M)&&monatTag();
  }
  if(nr===startNr)ok=true;   // der erste Termin gilt immer
  if(!ok)continue;
  const sMs=ms(Y,M,D,h,mi);
  if(untilMs!==null&&sMs>untilMs)break;
  n++;if(r.count&&n>r.count)break;
  let sd,sz,ed,ez;
  if(ganz){sd=icsDatumText(Y,M,D);sz=null;ed=icsTagPlus(sd,spanTage-1);ez=null}
  else{
   const o=icsOrtszeit(sMs,zone),o2=icsOrtszeit(sMs+dauerMs,zone);
   sd=icsDatumText(o.y,o.mo,o.d);sz=icsZ2(o.h)+":"+icsZ2(o.mi);
   if(dauerMs>0){ed=icsDatumText(o2.y,o2.mo,o2.d);ez=icsZ2(o2.h)+":"+icsZ2(o2.mi)}else{ed=sd;ez=null}
  }
  if(ex.has(icsInstanzKey("",sd,sz)))continue;
  if(ed<fenster.von||sd>fenster.bis)continue;
  aus.push({datum:sd,zeit:sz,endDatum:ed,endZeit:ez,ganztags:ganz});
 }
 return aus;
}

function icsHash(s){let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return h.toString(36)}
// Hauptfunktion. Ergebnis: {termine:[...],hinweise:[...],fehler:""}
function icsLesen(text,opt){
 opt=opt||{};
 const zone=opt.zone||ICS_ZONE_STANDARD;
 const aus={termine:[],hinweise:[],fehler:"",uebersprungen:0};
 const roh=String(text==null?"":text);
 if(!roh.trim()){aus.fehler="Die Datei ist leer.";return aus}
 if(roh.length>ICS_MAX_BYTES){aus.fehler="Die Datei ist zu gross (höchstens 2 MB).";return aus}
 if(!/BEGIN:VCALENDAR/i.test(roh)){aus.fehler="Das ist keine Kalenderdatei (.ics).";return aus}
 const zeilen=icsEntfalten(roh);
 const gesehen=new Set();
 const fenster=opt.fenster&&opt.fenster.von&&opt.fenster.bis?opt.fenster:null;   // Serien auflösen (Kalender-Abo)
 const maxT=fenster?(opt.max||3000):ICS_MAX_TERMINE;
 const ueb=new Set();   // Einzeltermine, die eine Serie ersetzen oder absagen (RECURRENCE-ID)
 let ev=null,anz=0;
 const hinweis=t=>{if(!aus.hinweise.includes(t))aus.hinweise.push(t)};
 const abschliessen=e=>{
  anz++;
  if(anz>maxT){if(anz===maxT+1)hinweis("Es werden höchstens "+maxT+" Termine gelesen – der Rest wurde ignoriert.");aus.uebersprungen++;return}
  if(fenster&&e.recId&&e.uid&&e.start){const r0=icsZeitWert(e.recId,e.recParams||e.start.params||{},zone);if(r0)ueb.add(icsInstanzKey(e.uid,r0.datum,r0.zeit))}
  if(e.status==="CANCELLED"){aus.uebersprungen++;hinweis("Abgesagte Termine wurden ausgelassen.");return}
  if(opt.privatAus&&(e.klasse==="PRIVATE"||e.klasse==="CONFIDENTIAL")){aus.uebersprungen++;hinweis("Private Termine wurden nicht übernommen.");return}
  if(!e.start){aus.uebersprungen++;hinweis("Termine ohne lesbares Datum wurden ausgelassen.");return}
  const s=icsZeitWert(e.start.wert,e.start.params,zone);
  if(!s){aus.uebersprungen++;hinweis("Termine ohne lesbares Datum wurden ausgelassen.");return}
  if(fenster&&e.rrule&&!e.recId&&e.uid){
   const serie=icsSerie(e,zone,fenster);
   if(serie){
    const titelS=(e.titel||"").replace(/\s+/g," ").trim().slice(0,200)||"(ohne Titel)";
    for(const x of serie)aus.termine.push({uid:icsInstanzKey(e.uid,x.datum,x.zeit).slice(0,500),_serie:e.uid,_key:icsInstanzKey(e.uid,x.datum,x.zeit),titel:titelS,start_datum:x.datum,ende_datum:x.endDatum,start_zeit:x.zeit,ende_zeit:x.endZeit,ganztags:x.ganztags,
     ort:(e.ort||"").replace(/\s+/g," ").trim().slice(0,300),notiz:(e.notiz||"").trim().slice(0,4000),wiederkehrend:true});
    return;
   }
   hinweis("Eine Serie mit nicht unterstützter Wiederholungsregel wurde nur mit dem ersten Termin übernommen.");
  }
  let endDatum=s.datum,endZeit=null,notizHinweis=s.hinweis;
  if(e.ende){
   const z=icsZeitWert(e.ende.wert,e.ende.params,zone);
   if(z){
    if(s.ganztags){
     endDatum=z.ganztags?icsTagPlus(z.datum,-1):z.datum;
     if(endDatum<s.datum)endDatum=s.datum;
    }else if(!z.ganztags){
     endDatum=z.datum;endZeit=z.zeit;
     if(endDatum<s.datum||(endDatum===s.datum&&endZeit<s.zeit)){endDatum=s.datum;endZeit=null;hinweis("Bei einzelnen Terminen lag das Ende vor dem Beginn – das Ende wurde weggelassen.")}
    }
    if(z.hinweis)notizHinweis=z.hinweis;
   }
  }else if(e.dauer!==null&&e.dauer!==undefined&&e.dauer>=0){
   if(s.ganztags){endDatum=icsTagPlus(s.datum,Math.max(0,Math.ceil(e.dauer/1440)-1))}
   else{
    const [h,mi]=s.zeit.split(":").map(Number),[y,mo,d]=s.datum.split("-").map(Number);
    const ms=Date.UTC(y,mo-1,d,h,mi)+e.dauer*60000,dt=new Date(ms);
    endDatum=icsDatumText(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());endZeit=icsZ2(dt.getUTCHours())+":"+icsZ2(dt.getUTCMinutes());
   }
  }
  if(notizHinweis)hinweis(notizHinweis);
  const titel=(e.titel||"").replace(/\s+/g," ").trim().slice(0,200)||"(ohne Titel)";
  const schluessel=e.uid?(e.uid+(e.recId?"|"+e.recId:"")):("ohneuid-"+icsHash(titel+"|"+s.datum+"|"+(s.zeit||"")+"|"+endDatum+"|"+(endZeit||"")));
  const key=schluessel.slice(0,500);
  if(gesehen.has(key)){aus.uebersprungen++;hinweis("Doppelte Termine in der Datei wurden nur einmal gelesen.");return}
  gesehen.add(key);
  if(e.rrule&&!fenster)hinweis("Wiederkehrende Termine: nur der erste Termin wird übernommen, die Wiederholungen nicht.");
  aus.termine.push({uid:key,titel,start_datum:s.datum,ende_datum:endDatum,start_zeit:s.zeit,ende_zeit:endZeit,ganztags:s.ganztags,
   ort:(e.ort||"").replace(/\s+/g," ").trim().slice(0,300),notiz:(e.notiz||"").trim().slice(0,4000),wiederkehrend:!!e.rrule});
 };
 for(const z of zeilen){
  if(!z)continue;
  const u=z.toUpperCase();
  if(u==="BEGIN:VEVENT"){ev={};continue}
  if(u==="END:VEVENT"){if(ev)abschliessen(ev);ev=null;continue}
  if(!ev)continue;
  if(/^BEGIN:/i.test(z)){ev._tief=(ev._tief||0)+1;continue}   // z. B. VALARM: Zeilen darin gehören nicht dem Termin
  if(/^END:/i.test(z)){ev._tief=Math.max(0,(ev._tief||0)-1);continue}
  if(ev._tief)continue;
  const p=icsZeileLesen(z);
  if(!p)continue;
  switch(p.name){
   case "SUMMARY":ev.titel=icsEntschuetzen(p.wert);break;
   case "LOCATION":ev.ort=icsEntschuetzen(p.wert);break;
   case "DESCRIPTION":ev.notiz=icsEntschuetzen(p.wert);break;
   case "UID":ev.uid=p.wert.trim();break;
   case "RECURRENCE-ID":ev.recId=p.wert.trim();ev.recParams=p.params;break;
   case "CLASS":ev.klasse=p.wert.trim().toUpperCase();break;
   case "EXDATE":for(const t of p.wert.split(",")){const z=icsZeitWert(t.trim(),p.params,zone);if(z)(ev.exKeys=ev.exKeys||[]).push(icsInstanzKey("",z.datum,z.zeit))}break;
   case "STATUS":ev.status=p.wert.trim().toUpperCase();break;
   case "RRULE":ev.rrule=true;ev.rruleText=p.wert.trim();break;
   case "DTSTART":ev.start={wert:p.wert,params:p.params};break;
   case "DTEND":ev.ende={wert:p.wert,params:p.params};break;
   case "DURATION":ev.dauer=icsDauerMinuten(p.wert.trim());break;
  }
 }
 if(fenster)aus.termine=aus.termine.filter(t=>!(t._key&&ueb.has(t._key))).map(t=>{if(t._key!==undefined){delete t._key;delete t._serie}return t});
 if(!aus.termine.length&&!aus.fehler)aus.fehler="In der Datei wurde kein lesbarer Termin gefunden.";
 aus.termine.sort((a,b)=>(a.start_datum+(a.start_zeit||"")).localeCompare(b.start_datum+(b.start_zeit||"")));
 return aus;
}
// ---- Projekt-Vorschlag ----------------------------------------------------
function icsNorm(s){
 return " "+String(s==null?"":s).toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").replace(/é|è|ê/g,"e").replace(/à|â/g,"a")
  .replace(/strasse\b/g,"str").replace(/str\./g,"str").replace(/[^a-z0-9]+/g," ")+" ";
}
// Schlägt ein Projekt vor, wenn Titel/Ort/Notiz des Termins eindeutig darauf passen. null = kein Vorschlag.
// Gewicht: Auftragsnummer 100 · Strasse mit Hausnummer 80 · Projektname 50. Ein Vorschlag braucht mind. 50 und muss eindeutig vorn liegen.
function icsProjektVorschlag(termin,projekte){
 const text=icsNorm([termin.ort,termin.titel,termin.notiz].join(" "));
 const treffer=[];
 for(const p of (Array.isArray(projekte)?projekte:[])){
  if(!p||p.archived)continue;
  let score=0;
  const nr=icsNorm(p.order_no).trim();
  if(nr.length>=3&&text.includes(" "+nr+" "))score=Math.max(score,100);
  const adr=icsNorm(String(p.object||"").split(",")[0]).trim();
  if(adr.length>=5&&/\d/.test(adr)&&text.includes(" "+adr+" "))score=Math.max(score,80);
  const name=icsNorm(p.name).trim();
  if(name.length>=5&&text.includes(" "+name+" "))score=Math.max(score,50);
  if(score)treffer.push({id:p.id,score});
 }
 if(!treffer.length)return null;
 treffer.sort((a,b)=>b.score-a.score);
 if(treffer.length>1&&treffer[1].score===treffer[0].score)return null;
 return treffer[0].score>=50?{projectId:treffer[0].id,score:treffer[0].score}:null;
}

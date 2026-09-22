"use strict";
// ===========================================================================
// ECHTE DATEN - ausschliesslich LESEND
// ===========================================================================
// Der Prototyp laesst sich auf die echte Datenbank umschalten, damit sich die
// Bedienung an den eigenen Projekten beurteilen laesst. Mit erfundenen
// Projekten geht das nicht.
//
//   IN DIESER DATEI STEHT KEIN EINZIGER SCHREIBWEG.
//   Kein insert, kein update, kein delete, kein upsert, kein rpc, kein
//   Storage-Upload. Nur .select(). Das ist kein Versprechen, sondern
//   nachpruefbar: "grep -nE 'insert|update|delete|upsert' js/echt.js"
//   findet nichts ausser diesem Satz.
//
// Zugang: derselbe oeffentliche Schluessel wie die App (er steht dort seit je
// im Quelltext - das ist bei Supabase so vorgesehen). Was jemand sehen darf,
// entscheidet NICHT dieser Schluessel, sondern die Anmeldung und die Row
// Level Security der Datenbank. Der Prototyp sieht also genau das, was der
// angemeldete Benutzer auch in der App sieht - nicht mehr.
//
// Die Anmeldung wird nach Moeglichkeit gar nicht verlangt: App und Prototyp
// liegen auf derselben Adresse, also teilen sie sich den angemeldeten
// Zustand. Wer in der App angemeldet ist, ist es hier auch.
// ===========================================================================

const ECHT_URL="https://nfgryuzkpwjfmdlmevuy.supabase.co";
const ECHT_KEY="sb_publishable_U1YsWEdl4X9U94JO4sL5Lg_7_dU0erM";
const ECHT_CDN="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

let echtSb=null;                 // der Supabase-Client, erst bei Bedarf
let echtDaten=null;              // das geladene Abbild
let echtFehler="";               // letzte Fehlermeldung, ehrlich weitergereicht
let echtLaedt=false;

// supabase-js wird erst geladen, wenn wirklich umgeschaltet wird - mit
// Beispieldaten geht der Prototyp keine einzige Verbindung ein.
function echtSkriptLaden(){
 return new Promise((fertig,schief)=>{
  if(window.supabase&&window.supabase.createClient)return fertig();
  const s=document.createElement("script");
  s.src=ECHT_CDN;
  s.onload=()=>fertig();
  s.onerror=()=>schief(new Error("Die Verbindungsbibliothek liess sich nicht laden."));
  document.head.appendChild(s);
 });
}
async function echtClient(){
 if(echtSb)return echtSb;
 await echtSkriptLaden();
 echtSb=window.supabase.createClient(ECHT_URL,ECHT_KEY);
 return echtSb;
}
async function echtSitzung(){
 const sb=await echtClient();
 const {data}=await sb.auth.getSession();
 return (data&&data.session)||null;
}
// Derselbe Weg wie in der App (js/03-login.js): ein Benutzername wird zur
// Pseudo-Adresse, eine echte E-Mail ueber resolve-login-email aufgeloest.
async function echtAnmelden(benutzer,passwort){
 const sb=await echtClient();
 const u=String(benutzer||"").trim();
 let email=u.includes("@")?u.toLowerCase():(u.toLowerCase().replace(/\s+/g,"")+"@nfgryuzkpwjfmdlmevuy.supabase.co");
 if(u.includes("@")){
  try{
   const {data,error}=await sb.functions.invoke("resolve-login-email",{body:{login:u}});
   if(!error&&data&&data.email)email=data.email;
  }catch(e){ /* Rueckfall auf die Eingabe selbst, wie in der App */ }
 }
 const {error}=await sb.auth.signInWithPassword({email,password:passwort});
 return error?"Benutzername oder Passwort falsch.":"";
}
async function echtAbmelden(){
 // Meldet NUR den Prototyp ab. Dass damit auch die App abgemeldet ist, steht
 // ausdruecklich am Knopf - die beiden teilen sich denselben Zustand.
 const sb=await echtClient();
 await sb.auth.signOut();
 echtDaten=null;
}

// ---- Laden ----------------------------------------------------------------
// Fuenf Abfragen, alle lesend. Mehr braucht der Prototyp nicht, und mehr
// soll er auch nicht anfassen.
async function echtLaden(){
 const sb=await echtClient();
 echtFehler="";
 // Die Massaufnahmen zuerst und fuer sich: nur hier steht eine Spalte, die
 // ich nicht gegen die echte Datenbank testen konnte (data->>material holt
 // EIN Feld aus dem gespeicherten Datensatz, statt den ganzen Zuschnittplan
 // mitzuschleppen). Geht sie nicht, wird OHNE sie noch einmal gefragt -
 // dann fehlt die Materialangabe, aber alles Uebrige ist da. Ein Prototyp,
 // der wegen einer Nebensache gar nichts zeigt, ist nutzlos.
 const MESS_FELDER="id,project_id,type,title,date,workflow_status,"
   +"freigabe_verfallen,staerke_mm,ruester_id,monteur_id";
 let mess=await sb.from("measurements").select(MESS_FELDER+",data->>material")
   .order("date",{ascending:false}).limit(600);
 let ohneMaterial=false;
 if(mess.error){
  ohneMaterial=true;
  mess=await sb.from("measurements").select(MESS_FELDER)
    .order("date",{ascending:false}).limit(600);
 }
 const [proj,mmat,mat,prof]=await Promise.all([
  sb.from("projects").select("id,name,order_no,customer,object,archived,status").order("name"),
  sb.from("measurement_materials").select("id,name"),
  sb.from("materials").select("edv_nr,name,dim,unit").order("edv_nr"),
  sb.from("profiles").select("id,first_name,last_name")
 ]);
 const schief=[proj,mess,mmat,mat,prof].find(r=>r.error);
 if(schief){echtFehler=schief.error.message||"Die Daten liessen sich nicht laden.";return false}
 echtDaten=echtAufbereiten(proj.data||[],mess.data||[],mmat.data||[],mat.data||[],prof.data||[]);
 echtDaten.ohneMaterial=ohneMaterial;
 return true;
}

// ---- Vom Datensatz zur Anzeige -------------------------------------------
// Hier wird UMGERECHNET, nicht erfunden - und wo etwas nicht herleitbar ist,
// bleibt es leer statt geraten zu werden.
const ECHT_STAND={
 in_bearbeitung:"arbeit", freigegeben:"fertig", zu_ruesten:"fertig",
 geruestet:"fertig", zu_montieren:"fertig", montiert:"fertig", abgeschlossen:"fertig"
};
// Welche Phase hat ein Projekt? Abgeleitet aus dem WEITESTEN Arbeitsstatus
// seiner Massaufnahmen - denn solange eine noch zu ruesten ist, ist das
// Projekt nicht in der Montage. Ohne Massaufnahme steht es am Anfang.
const ECHT_PHASE_RANG=[
 ["abgeschlossen","ausmass"],["montiert","montage"],["zu_montieren","montage"],
 ["geruestet","werkstatt"],["zu_ruesten","werkstatt"],["freigegeben","produktion"],
 ["in_bearbeitung","massaufnahme"]
];
function echtPhase(messListe){
 if(!messListe.length)return "offerte";
 // Die SCHWAECHSTE Station entscheidet: was noch in Bearbeitung ist, zieht
 // das ganze Projekt dorthin zurueck.
 for(let i=ECHT_PHASE_RANG.length-1;i>=0;i--){
  const [status,phase]=ECHT_PHASE_RANG[i];
  if(messListe.some(m=>m.workflow_status===status))return phase;
 }
 return "massaufnahme";
}
function echtArtName(typ){
 return (typeof MEAS_ARTEN==="object"&&MEAS_ARTEN[typ])||ECHT_ARTEN[typ]||typ||"Massaufnahme";
}
// Dieselben Bezeichnungen wie in der App (MEAS_TYPE_LABELS, js/01-basis.js).
// Bewusst hier wiederholt statt die App-Datei zu laden: der Prototyp bleibt
// getrennt. Kommt eine Art dazu, steht schlimmstenfalls der interne Name da.
const ECHT_ARTEN={
 skizze_foto:"Skizze/Foto", einlaufblech_gerade:"Einlaufblech gerade",
 rinne_halbrund:"Dachrinne", einlaufblech_konisch:"Einlaufblech konisch",
 freies_profil:"Freies Profil", mauerabdeckung:"Mauerabdeckung",
 lukarne:"Lukarne Seitenverkleidung", anschlussblech:"Ort- und Seitenbleche",
 einfassung_rund:"Einfassung Rund", kamineinfassung:"Kamineinfassung",
 dachfenstereinfassung:"Dachfenstereinfassung", kehle:"Kehle", rinne:"Rinne"
};

function echtAufbereiten(projekte,messungen,messMaterial,material,profile){
 const matName=new Map(messMaterial.map(m=>[String(m.id),m.name]));
 const nachProjekt=new Map();
 messungen.forEach(m=>{
  const k=String(m.project_id);
  if(!nachProjekt.has(k))nachProjekt.set(k,[]);
  nachProjekt.get(k).push(m);
 });

 const p=projekte.filter(x=>!x.archived).map(x=>{
  const mess=nachProjekt.get(String(x.id))||[];
  const warn=mess.find(m=>m.freigabe_verfallen);
  return {
   id:x.id, nr:x.order_no||String(x.id), name:x.name||"Ohne Namen",
   adresse:x.object||"", kunde:x.customer||"",
   phase:echtPhase(mess),
   termin:"",              // die Tabelle projects fuehrt keinen Termin
   leiter:null,            // im Prototyp nicht hergeleitet
   offertBetrag:0,         // Offertbetrag steckt in den Positionen, nicht als Summe
   hinweis:warn?("Massaufnahme „"+(warn.title||echtArtName(warn.type))
     +"“ wurde nach der Freigabe geändert – sie muss erneut freigegeben werden."):"",
   hinweisArt:warn?"warnung":"",
   massaufnahmen:mess.map(m=>({
    id:m.id, art:echtArtName(m.type), titel:m.title||"",
    stand:m.freigabe_verfallen?"verfallen":(ECHT_STAND[m.workflow_status]||"offen"),
    material:matName.get(String(m.material))||"",
    staerke:m.staerke_mm==null?null:Number(m.staerke_mm),
    status:m.workflow_status,
    // Stueckzahlen kommen aus dem gespeicherten Zuschnittplan. Den rechnet
    // das Zuschnitt-Modul der App; der Prototyp rechnet ihn NICHT nach -
    // eine zweite Rechnung liefe frueher oder spaeter auseinander. Deshalb
    // bleibt die Liste leer statt erfunden.
    teile:[]
   }))
  };
 });

 // Aufgaben: was wirklich auf eine Freigabe wartet. Nichts dazuerfunden.
 const aufgaben=[];
 p.forEach(x=>x.massaufnahmen.forEach(m=>{
  if(m.stand==="verfallen")aufgaben.push({id:"v"+m.id,art:"freigabe",dringend:true,
   text:"Massaufnahme „"+(m.titel||m.art)+"“ erneut freigeben",projekt:x.id});
  else if(m.status==="in_bearbeitung")aufgaben.push({id:"f"+m.id,art:"freigabe",dringend:false,
   text:"Massaufnahme „"+(m.titel||m.art)+"“ freigeben",projekt:x.id});
 }));

 // Anstehende Montage: was gerüstet ist und auf die Montage wartet.
 const montage=[];
 p.forEach(x=>x.massaufnahmen.forEach(m=>{
  if(m.status==="zu_montieren")montage.push({projekt:x.id,datum:"",
   text:x.name+" – "+(m.titel||m.art),wer:null});
 }));

 return {
  projekte:p,
  aufgaben:aufgaben.slice(0,12),
  montage:montage.slice(0,12),
  lager:material.map(a=>({nr:a.edv_nr||"",bez:a.name||"",dim:a.dim||"",
    einheit:a.unit||"",bestand:null,reserviert:0,mind:0,barcode:""})),
  wareneingang:[],
  verlauf:[],
  mitarbeiter:profile.map(x=>({id:x.id,
    name:[x.first_name,x.last_name].filter(Boolean).join(" ")||"Unbekannt",
    kurz:((x.first_name||"?")[0]+(x.last_name||"?")[0]).toUpperCase(),
    funktion:""}))
 };
}

"use strict";
// ============================================================
// Rechte je Mitarbeiter
//
// Die Rechte liegen in der Datenbank, nicht hier:
//   profiles.role            "admin" oder "employee"
//   permission_settings      Vorgabe je Rolle (can_view, can_edit, scope, edit_scope)
//   permission_overrides     Ausnahme je Mitarbeiter, sticht die Rolle
//
// Auswertung: Administrator darf alles -> sonst Ausnahme des
// Mitarbeiters -> sonst Vorgabe der Rolle -> sonst nein.
// Genau dieselbe Reihenfolge wie in der Datenbankfunktion
// has_permission(). Diese Datei bildet sie nur nach, um Knöpfe und
// Felder auszublenden. Wirksam ist die Datenbank.
// ============================================================

const RECHTE_BEREICHE=[
 {key:"rapport",      resource:"reports",      label:"Regierapport"},
 {key:"massaufnahme", resource:"measurements", label:"Massaufnahme"},
 {key:"ausmass",      resource:"ausmass",      label:"Ausmass"}
];
const RECHTE_KATALOGE=["materials","rates","blitzschutz_materials","rinne_fitting_types","measurement_materials"];

const SEHEN_OPTIONEN=[
 {wert:"keine",  text:"gar nicht"},
 {wert:"eigene", text:"nur eigene"},
 {wert:"alle",   text:"alle"}
];
const BEARBEITEN_OPTIONEN=[
 {wert:"keine",  text:"nichts"},
 {wert:"eigene", text:"nur eigene"},
 {wert:"alle",   text:"alle"}
];

let rollenVorgaben=[];   // Inhalt von permission_settings
let alleOverrides=[];    // Inhalt von permission_overrides
let alleFeatureAccess=[];// v3.34: Inhalt von feature_access (Offerte-Zugriff je Mitarbeiter)
let meineRechte={};      // { rapport:{sehen:"alle",bearbeiten:"eigene"}, ... , kataloge:true, admin:false }

async function ladeRechteTabellen(){
 const [vor,ovr,fa]=await Promise.all([
  sb.from("permission_settings").select("*"),
  sb.from("permission_overrides").select("*"),
  sb.from("feature_access").select("*")
 ]);
 rollenVorgaben=vor.data||[];
 alleOverrides=ovr.data||[];
 alleFeatureAccess=fa.data||[];
}

// v3.34: hat dieser Mitarbeiter die Offerten-Funktion freigeschaltet?
// feature_access ist bewusst getrennt vom Rechte-Modell oben (permission_
// overrides/-settings) - siehe js/63-angebote.js fuer die Begruendung.
function offerteZugriffVon(profilId){
 const zeile=alleFeatureAccess.find(x=>x.profile_id===profilId&&x.feature==="angebote");
 return !!(zeile&&zeile.granted);
}

// Rohwerte für einen Mitarbeiter und eine Tabelle zusammensuchen
function rohRecht(profil,resource){
 const leer={can_view:null,can_edit:null,scope:null,edit_scope:null};
 if(!profil)return leer;
 const o=alleOverrides.find(x=>x.profile_id===profil.id&&x.resource===resource)||leer;
 const v=rollenVorgaben.find(x=>x.role===profil.role&&x.resource===resource)||leer;
 const nimm=(a,b,standard)=>(a===null||a===undefined)?((b===null||b===undefined)?standard:b):a;
 return {
  can_view:  nimm(o.can_view, v.can_view, false),
  can_edit:  nimm(o.can_edit, v.can_edit, false),
  scope:     nimm(o.scope,      v.scope,      "all"),
  edit_scope:nimm(o.edit_scope, v.edit_scope, "all")
 };
}

// Rohwerte in die Stufen der Oberfläche übersetzen
function rechteVon(profil){
 const r={admin:!!(profil&&profil.role==="admin")};
 RECHTE_BEREICHE.forEach(b=>{
  if(r.admin){r[b.key]={sehen:"alle",bearbeiten:"alle"};return}
  const w=rohRecht(profil,b.resource);
  r[b.key]={
   sehen:      !w.can_view?"keine":(w.scope==="own"?"eigene":"alle"),
   bearbeiten: !w.can_edit?"keine":(w.edit_scope==="own"?"eigene":"alle")
  };
 });
 r.kataloge=r.admin?true:RECHTE_KATALOGE.every(res=>rohRecht(profil,res).can_edit);
 return r;
}

function istEigenerEintrag(createdBy){
 if(!createdBy)return true; // neuer, noch nicht gespeicherter Eintrag
 return !!(currentProfile&&createdBy===currentProfile.id);
}
function darfBearbeiten(bereich,createdBy){
 const stufe=(meineRechte[bereich]||{}).bearbeiten;
 if(stufe==="alle")return true;
 if(stufe==="eigene")return istEigenerEintrag(createdBy);
 return false;
}

// Wird nach dem Anmelden aufgerufen (siehe 03-login.js).
async function applyRechte(){
 await ladeRechteTabellen();
 meineRechte=rechteVon(currentProfile);
 const b=document.body;
 RECHTE_BEREICHE.forEach(x=>{
  const stufe=meineRechte[x.key];
  b.classList.remove("recht-"+x.key+"-ansehen");
  b.classList.toggle("recht-"+x.key+"-nichts",stufe.bearbeiten==="keine");
  const btn=$(x.key==="rapport"?"navReport":(x.key==="massaufnahme"?"navMeasurements":"navAusmass"));
  if(btn)btn.hidden=(stufe.sehen==="keine"&&stufe.bearbeiten==="keine");
 });
 b.classList.toggle("recht-einstellungen-ansehen",!meineRechte.kataloge);
 b.classList.toggle("ist-admin",!!meineRechte.admin);
 applyModuleTest();
}

// ---- Module in Entwicklung ----
// Ein Modul im Testbetrieb erscheint nur bei Administratoren. So kann eine
// Funktion fertig gebaut werden, ohne dass jemand mit halbfertigen Zahlen
// arbeitet.
function modulImTest(schluessel){
 return !!(moduleImTest&&moduleImTest[schluessel]);
}
function modulGesperrt(schluessel){
 return modulImTest(schluessel)&&!meineRechte.admin;
}
function applyModuleTest(){
 document.querySelectorAll("[data-choose-meas-type]").forEach(b=>{
  b.hidden=modulGesperrt("meas:"+b.dataset.chooseMeasType);
 });
 document.querySelectorAll("[data-choose-am-type]").forEach(b=>{
  b.hidden=modulGesperrt("am:"+b.dataset.chooseAmType);
 });
}

// Sperrt das Formular, wenn der geöffnete Eintrag jemand anderem gehört.
function sperreFuerEintrag(bereich,createdBy){
 document.body.classList.toggle("recht-"+bereich+"-ansehen",!darfBearbeiten(bereich,createdBy));
}

// ---- Mitarbeiterliste in den Einstellungen ----
function renderMitarbeiterSettings(){
 const box=$("employeeSettings");
 if(!box)return;
 if(!settings.employees.length){box.innerHTML='<div class="empty">Noch keine Mitarbeiter.</div>';return}
 const darfVergeben=!!meineRechte.admin;
 box.innerHTML=settings.employees.map((e,i)=>{
  const p=allProfiles.find(x=>x.id===employeeIds[i]);
  const r=rechteVon(p);
  const istAdmin=!!(p&&p.role==="admin");
  const felder=RECHTE_BEREICHE.map(b=>`
   <div class="rechte-bereich">
    <div class="rechte-bereich-titel">${esc(b.label)}</div>
    <div class="rechte-paar">
     <div><label>Sehen</label>
      <select data-recht-mitarbeiter="${i}" data-recht-bereich="${b.key}" data-recht-art="sehen"${istAdmin?" disabled":""}>
       ${SEHEN_OPTIONEN.map(o=>`<option value="${o.wert}"${r[b.key].sehen===o.wert?" selected":""}>${o.text}</option>`).join("")}
      </select>
     </div>
     <div><label>Bearbeiten</label>
      <select data-recht-mitarbeiter="${i}" data-recht-bereich="${b.key}" data-recht-art="bearbeiten"${istAdmin?" disabled":""}>
       ${BEARBEITEN_OPTIONEN.map(o=>`<option value="${o.wert}"${r[b.key].bearbeiten===o.wert?" selected":""}>${o.text}</option>`).join("")}
      </select>
     </div>
    </div>
   </div>`).join("");
  const block=darfVergeben?`
   <label class="rechte-schalter"><input type="checkbox" data-recht-admin="${i}"${istAdmin?" checked":""}> Administrator – darf alles, auch Rechte vergeben</label>
   ${istAdmin?'<div class="small">Ein Administrator hat immer volle Rechte. Zum Einschränken zuerst den Haken oben entfernen.</div>':""}
   ${felder}
   <div class="rechte-bereich">
    <div class="rechte-bereich-titel">Kataloge</div>
    <label class="rechte-schalter"><input type="checkbox" data-recht-kataloge="${i}"${r.kataloge?" checked":""}${istAdmin?" disabled":""}> darf Material, Stundenansätze, Blitzschutz, Rinnenteile und Massaufnahme-Materialien ändern</label>
   </div>`
   :'<div class="small">Rechte kann nur ein Administrator ändern.</div>';
  // v3.16: fest hinterlegte Funktion. Sie ist eine Alltagseinstellung und
  // steht deshalb offen da, nicht hinter "Rechte". Aendern darf sie nur ein
  // Administrator - das erzwingt ohnehin die profiles-Policy, die Anzeige
  // fuehrt nur.
  const funktion=`<div class="mitarbeiter-funktion">
    <label for="empFunktion${i}">Funktion / Stundenansatz</label>
    <select id="empFunktion${i}" data-emp-funktion="${i}"${darfVergeben?"":" disabled"}>
     <option value="">– keine hinterlegt –</option>
     ${settings.rates.map((r,ri)=>`<option value="${esc(rateIds[ri])}"${(p&&String(p.rate_id)===String(rateIds[ri]))?" selected":""}>${esc(r[0])} · CHF ${money(r[1])}</option>`).join("")}
    </select>
   </div>`;
  // v3.34: Offerte-Zugriff. Bewusst NICHT wie "Administrator" oben von
  // istAdmin abhaengig gemacht - ein Administrator hat diese Freigabe nicht
  // automatisch, sie ist eigens zu vergeben (feature_boundary_angebote
  // prueft granted=true unabhaengig von der Rolle). Fuer Nicht-Administratoren
  // dieser Ansicht faellt der Schalter ganz weg statt nur deaktiviert zu sein
  // - kein funktionsloses Element fuer jemanden, der es ohnehin nicht
  // aendern darf.
  const offerteSchalter=darfVergeben?`<label class="rechte-schalter">
    <input type="checkbox" data-emp-angebot="${i}"${offerteZugriffVon(employeeIds[i])?" checked":""}>
    Offerte-Zugriff – darf Offerten importieren, ansehen und einem Projekt zuordnen
   </label>`:"";
  return `<div class="rechte-zeile">
   <div class="rechte-kopf">
    <input data-set-emp="${i}" value="${esc(e)}">
    ${darfVergeben?`<button type="button" class="gray" data-pw-reset="${i}" title="Passwort zurücksetzen">🔑</button>`:""}
    <button class="red" data-del-emp="${i}">Löschen</button>
   </div>
   ${funktion}
   ${offerteSchalter}
   <details class="rechte-details">
    <summary>Rechte${istAdmin?" – Administrator":""}</summary>
    ${block}
   </details>
  </div>`;
 }).join("");
}

// Stufen der Oberfläche zurück in Datenbankwerte übersetzen
function overrideZeilen(i,profilId){
 const zeilen=[];
 const jetzt=new Date().toISOString();
 RECHTE_BEREICHE.forEach(b=>{
  const s=document.querySelector(`[data-recht-mitarbeiter="${i}"][data-recht-bereich="${b.key}"][data-recht-art="sehen"]`);
  const e=document.querySelector(`[data-recht-mitarbeiter="${i}"][data-recht-bereich="${b.key}"][data-recht-art="bearbeiten"]`);
  const sehen=s?s.value:"alle";
  let bearbeiten=e?e.value:"alle";
  // Was man nicht sieht, kann man nicht bearbeiten.
  if(sehen==="keine")bearbeiten="keine";
  if(sehen==="eigene"&&bearbeiten==="alle")bearbeiten="eigene";
  zeilen.push({
   profile_id:profilId,
   resource:b.resource,
   can_view:sehen!=="keine",
   can_edit:bearbeiten!=="keine",
   scope:sehen==="eigene"?"own":"all",
   edit_scope:bearbeiten==="eigene"?"own":"all",
   updated_at:jetzt
  });
 });
 const kat=document.querySelector(`[data-recht-kataloge="${i}"]`);
 const katAn=kat?kat.checked:false;
 RECHTE_KATALOGE.forEach(res=>{
  zeilen.push({profile_id:profilId,resource:res,can_view:true,can_edit:katAn,scope:"all",edit_scope:"all",updated_at:jetzt});
 });
 return zeilen;
}

document.addEventListener("change",async e=>{
 const t=e.target;
 const i=t.dataset.rechtMitarbeiter??t.dataset.rechtKataloge??t.dataset.rechtAdmin;
 if(i===undefined)return;
 if(!meineRechte.admin){alert("Nur ein Administrator kann Rechte ändern.");return}
 const id=employeeIds[Number(i)];
 if(!id)return;

 // Rolle umstellen
 if(t.dataset.rechtAdmin!==undefined){
  const neueRolle=t.checked?"admin":"employee";
  const {error}=await sb.from("profiles").update({role:neueRolle}).eq("id",id);
  if(error){alert("Rolle konnte nicht geändert werden: "+error.message);t.checked=!t.checked;return}
  const p=allProfiles.find(x=>x.id===id);
  if(p)p.role=neueRolle;
  if(currentProfile&&currentProfile.id===id)currentProfile.role=neueRolle;
 }else{
  const {error}=await sb.from("permission_overrides")
   .upsert(overrideZeilen(Number(i),id),{onConflict:"profile_id,resource"});
  if(error){alert("Rechte konnten nicht gespeichert werden: "+error.message);return}
 }

 await ladeRechteTabellen();
 if(currentProfile&&currentProfile.id===id)await applyRechte();
 renderMitarbeiterSettings();
});

// ---------------------------------------------------------------------------
// v3.16  Funktion eines Mitarbeiters speichern
// ---------------------------------------------------------------------------
// Ein gewoehnliches UPDATE auf profiles - dieselbe Policy wie beim Namen
// (has_permission('profiles','edit') UND (id=auth.uid() ODER is_admin())).
// Eine SECURITY-DEFINER-Funktion waere hier falsch: sie wuerde RLS umgehen
// und muesste die Pruefung nachbauen.
//
// Ein von RLS abgelehntes UPDATE meldet in PostgREST KEINEN Fehler, es
// betrifft still 0 Zeilen (CLAUDE.md 24.1). Deshalb .select() und 0 Zeilen
// ausdruecklich NICHT als Erfolg werten - sonst stuende die Auswahl auf
// einem Wert, den die Datenbank gar nicht hat.
if($("employeeSettings")){
 $("employeeSettings").addEventListener("change",async e=>{
  const feld=e.target.closest?e.target.closest("[data-emp-funktion]"):null;
  if(!feld)return;
  const i=Number(feld.dataset.empFunktion);
  const profil=allProfiles.find(x=>x.id===employeeIds[i]);
  if(!profil)return;
  const vorher=profil.rate_id===null||profil.rate_id===undefined?"":String(profil.rate_id);
  const wert=feld.value?Number(feld.value):null;
  const {data,error}=await sb.from("profiles").update({rate_id:wert,updated_at:new Date().toISOString()})
    .eq("id",profil.id).select("id,rate_id");
  if(error||!data||!data.length){
   feld.value=vorher;
   alert(error?("Die Funktion konnte nicht gespeichert werden: "+error.message)
              :"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");
   return;
  }
  profil.rate_id=data[0].rate_id;
  // Der angemeldete Benutzer aendert seine eigene Funktion: die Vorbelegung
  // neuer Arbeitspositionen haengt daran.
  if(currentProfile&&currentProfile.id===profil.id)currentProfile.rate_id=data[0].rate_id;
 });
}

// ---------------------------------------------------------------------------
// v3.34  Offerte-Zugriff je Mitarbeiter speichern (Feature-Freischaltung)
// ---------------------------------------------------------------------------
// feature_access ist ABSICHTLICH getrennt vom Rechte-Modell oben
// (permission_overrides/-settings) - siehe Kopf von js/63-angebote.js:
// "Ohne den Auftrag zu verletzen (kein clientseitiges if-Verstecken) reicht
// eine Ausnahme im bestehenden Rechte-Modell hier nicht, weil dessen
// Ressourcen fest auf reports/measurements/ausmass zugeschnitten sind."
// Ein gewoehnliches upsert - dieselbe Absicherung wie beim Feld "Funktion"
// oben: KEINE SECURITY-DEFINER-Funktion (die wuerde RLS umgehen), company_id
// wird NIE vom Client geschickt (der Trigger enforce_feature_access_company()
// setzt sie serverseitig aus profiles.company_id), 0 geschriebene Zeilen
// gelten ausdruecklich NICHT als Erfolg (CLAUDE.md 24.1).
if($("employeeSettings")){
 $("employeeSettings").addEventListener("change",async e=>{
  const feld=e.target.closest?e.target.closest("[data-emp-angebot]"):null;
  if(!feld)return;
  const i=Number(feld.dataset.empAngebot);
  const profilId=employeeIds[i];
  if(!profilId)return;
  const neu=feld.checked;
  const {data,error}=await sb.from("feature_access")
    .upsert({profile_id:profilId,feature:"angebote",granted:neu,
             granted_by:currentProfile?currentProfile.id:null},
            {onConflict:"profile_id,feature"})
    .select("id,profile_id,feature,granted");
  if(error||!data||!data.length){
   feld.checked=!neu;
   alert(error?("Der Offerte-Zugriff konnte nicht gespeichert werden: "+error.message)
              :"Es wurde nichts gespeichert. Fehlt die nötige Berechtigung?");
   return;
  }
  const zeile=alleFeatureAccess.find(x=>x.profile_id===profilId&&x.feature==="angebote");
  if(zeile)zeile.granted=data[0].granted; else alleFeatureAccess.push(data[0]);
  // Der angemeldete Benutzer aendert seinen eigenen Zugriff: Cockpit-Karte
  // und Arbeitsstand-Zeile sofort nachziehen, ohne dass er sich neu anmelden
  // muss.
  if(currentProfile&&currentProfile.id===profilId&&typeof checkOfferteZugriff==="function")
   await checkOfferteZugriff();
 });
}

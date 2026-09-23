// Prueft v3.172: Richtwerte aus echten Aufnahmen.
//
// WORUM ES GEHT
// Seit v3.67 steht neben einem leeren Pflichtfeld ein Chip mit dem
// Richtwert aus den Einstellungen. Der stammt aus dem, was einmal
// hinterlegt wurde - nicht aus dem, was der Betrieb wirklich baut. Ab
// v3.172 steht daneben, was TATSAECHLICH gemessen wurde, mit der Zahl
// dazu.
//
// DIE VIER ZAEHLWERK-REGELN UND WO SIE HIER GEPRUEFT SIND
//   1. Nie verstecken, nur ergaenzen -> B1, B4 (der hinterlegte Richtwert
//      bleibt in jedem Fall stehen)
//   2. Immer die Zahl dazu           -> B7
//   3. Nie eine Zahl selbst setzen   -> C3
//   4. Je Firma                      -> Sache der RLS; die Sicht
//      messwert_nutzung laeuft mit security_invoker, der Client filtert
//      nicht selbst nach company_id (E4).
//
// WAS HIER GEPRUEFT WIRD
//   A  zwMesswertRichtwert: Schwelle, Haeufigkeit, Gleichstand,
//      Schreibweise, kaputte Zeilen.
//   B  vorschlagChip: die vier Faelle, und OHNE Zaehlwerk exakt das
//      Verhalten von vor v3.172.
//   C  Uebernehmen: der Wert landet im Feld, beide Chips verschwinden,
//      und ohne Antippen passiert NICHTS.
//   D  Die Verdrahtung an den echten Modulen: welche Art und welchen
//      Feldnamen jedes Formular durchreicht. Das ist der gefaehrliche
//      Teil - eine falsche Zuordnung zeigt eine falsche Zahl genau dort,
//      wo gemessen wird.
//   E  Struktur: die Lerntabellen der Module decken sich mit dem, was
//      die Sicht messwert_nutzung liefert.
//
// Aufruf:  SP=<Ordner mit node_modules> node pruefstaende/pruefstand-richtwerte-v3-172.js
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};

// Was die Sicht messwert_nutzung je Art liefert. Diese Liste ist der
// Vertrag zwischen Datenbank und Formular: steht ein Feld in einer
// Lerntabelle eines Moduls, aber nicht hier, dann lernt das Formular
// etwas, das nie gezaehlt wird - der Chip bliebe fuer immer stumm und
// niemand wuerde es merken.
const VERTRAG={
 einlaufblech_gerade:["gava_abstand"],
 rinne_halbrund:["halter_abstand"],
 kehle:["ueberlappung"],
 mauerabdeckung:["profil_breite","profil_gefaelle","profil_hoeheLinks",
  "profil_hoeheRechts","profil_umschlagLinks","profil_umschlagRechts",
  "profil_biegeLinks","profil_biegeRechts","profil_saum"],
 lukarne:["achsabstand","hilfsriss","zugabeLaenge","zugabeBreite"],
 einfassung_rund:["lattenabstand","a","b","c"],
 anschlussblech:["saum","stossLaenge","ueberlappung","lattenabstand",
  "ortAufkantung","ortOben","ortStirn","ortNase","wandAufkantung",
  "masse_a","masse_b","masse_c","masse_d","masse_e"],
 kamineinfassung:["lattenabstand","ueberlappung","e","umschlagVorne",
  "umschlagHinten","umschlagSeite","a","d"],
 dachfenstereinfassung:["lattenabstand","ueberlappung","aufVorne","aufHinten",
  "saumVorne","breiteOben","breiteUnten","randAbstand","randStrich","e",
  "eUmschlag","anreiff","anreiffUmschlag","umschlagVorne","umschlagSeite","a","d"]
};

(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:420,height:900},locale:"de-CH"});
 const fehler=[]; page.on("pageerror",e=>fehler.push(String(e))); page.on("dialog",d=>d.accept());
 await page.route("**://cdn.jsdelivr.net/**",r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"});
 await page.waitForTimeout(600);

 // ---- A  Die Zaehlung selbst ---------------------------------------------
 const A=await page.evaluate(()=>{
  zwMesswertUebernehmen([
   // kaputte Zeilen: duerfen nichts umwerfen und nichts beitragen
   null, {}, {art:"kehle"}, {art:"kehle",feld:"ueberlappung"},
   {art:"kehle",feld:"ueberlappung",wert:"keine Zahl",anzahl:9},
   {art:"kehle",feld:"ueberlappung",wert:0,anzahl:9},
   {art:"kehle",feld:"ueberlappung",wert:-5,anzahl:9},
   // einmal gemessen - unter der Schwelle
   {art:"lukarne",feld:"hilfsriss",wert:40,anzahl:1,zuletzt:"2026-09-01"},
   // klare Mehrheit
   {art:"kehle",feld:"ueberlappung",wert:120,anzahl:5,zuletzt:"2026-09-01"},
   {art:"kehle",feld:"ueberlappung",wert:100,anzahl:2,zuletzt:"2026-09-20"},
   // Gleichstand: der zuletzt gemessene gewinnt
   {art:"kamineinfassung",feld:"lattenabstand",wert:330,anzahl:3,zuletzt:"2026-01-05"},
   {art:"kamineinfassung",feld:"lattenabstand",wert:340,anzahl:3,zuletzt:"2026-09-18"},
   // Gross-/Kleinschreibung: Feld genau, Art egal
   {art:"DACHFENSTEREINFASSUNG",feld:"umschlagVorne",wert:15,anzahl:4,zuletzt:"2026-09-01"},
   {art:"dachfenstereinfassung",feld:"umschlagvorne",wert:99,anzahl:2,zuletzt:"2026-09-02"}
  ]);
  return {
   kaputt:zwMesswertRichtwert("kehle","gibtsnicht"),
   unterSchwelle:zwMesswertRichtwert("lukarne","hilfsriss"),
   mehrheit:zwMesswertRichtwert("kehle","ueberlappung"),
   gleichstand:zwMesswertRichtwert("kamineinfassung","lattenabstand"),
   artEgal:zwMesswertRichtwert("dachfenstereinfassung","umschlagVorne"),
   feldGenau:zwMesswertRichtwert("dachfenstereinfassung","umschlagvorne"),
   schwelle:typeof ZW_MESSWERT_MINDESTENS==="number"?ZW_MESSWERT_MINDESTENS:null
  };
 });
 p(A.kaputt===null,"A1 ein unbekanntes Feld liefert null - es wird nichts erfunden",A);
 p(A.unterSchwelle===null,
   "A2 eine einzelne Messung ist noch kein Richtwert (Schwelle "+A.schwelle+")",A);
 p(A.schwelle===2,"A3 die Schwelle steht bei zwei Messungen",A);
 p(A.mehrheit&&A.mehrheit.wert===120&&A.mehrheit.anzahl===5,
   "A4 der meistgemessene Wert gewinnt",A);
 p(A.mehrheit&&A.mehrheit.gesamt===7,
   "A5 gesamt zaehlt ALLE Messungen des Feldes, nicht nur die des Siegers",A);
 p(A.gleichstand&&A.gleichstand.wert===340,
   "A6 bei Gleichstand gewinnt der zuletzt gemessene Wert - wer umgestellt "
   +"hat, bekommt nicht den alten zurueck",A);
 p(A.artEgal&&A.artEgal.wert===15,
   "A7 die Art wird ohne Gross-/Kleinschreibung verglichen",A);
 p(A.feldGenau&&A.feldGenau.wert===99,
   "A8 der Feldname NICHT - umschlagVorne und umschlagvorne sind zwei Felder",A);

 // ---- B  Der Chip ---------------------------------------------------------
 const B=await page.evaluate(()=>{
  zwMesswertUebernehmen([
   {art:"kehle",feld:"ueberlappung",wert:120,anzahl:3,zuletzt:"2026-09-01"},
   {art:"lukarne",feld:"achsabstand",wert:590,anzahl:4,zuletzt:"2026-09-01"},
   {art:"lukarne",feld:"zugabeBreite",wert:80,anzahl:2,zuletzt:"2026-09-01"}
  ]);
  const zerleg=h=>{
   const d=document.createElement("div"); d.innerHTML=h;
   return [...d.querySelectorAll(".vorschlag-chip")].map(k=>({
    wert:k.dataset.vorschlagWert, fuer:k.dataset.vorschlagFuer,
    zw:k.classList.contains("zw-chip"), text:k.textContent,
    zahl:!!k.querySelector(".zw-zahl")}));
  };
  return {
   nurRichtwert:zerleg(vorschlagChip("f1",330,"kehle","gibtsnicht")),
   garnichts:zerleg(vorschlagChip("f2","","kehle","gibtsnicht")),
   gleich:zerleg(vorschlagChip("f3",120,"kehle","ueberlappung")),
   ungleich:zerleg(vorschlagChip("f4",500,"lukarne","achsabstand")),
   nurGelernt:zerleg(vorschlagChip("f5","","lukarne","zugabeBreite")),
   alteForm:vorschlagChip("f6",330),
   alteFormNeu:vorschlagChip("f6",330,"kehle","gibtsnicht"),
   ohneZaehlwerkKehle:vorschlagChip("f7",120,"kehle","ueberlappung")
  };
 });
 p(B.nurRichtwert.length===1&&B.nurRichtwert[0].text==="Richtwert 330"
   &&!B.nurRichtwert[0].zw,
   "B1 ohne eigene Messung steht genau der hinterlegte Richtwert da - wie bisher",B.nurRichtwert);
 p(B.garnichts.length===0,
   "B2 ohne Richtwert und ohne Messung bleibt es leer - kein Chip ohne Inhalt",B.garnichts);
 p(B.gleich.length===1&&/Richtwert 120/.test(B.gleich[0].text)
   &&/3×/.test(B.gleich[0].text),
   "B3 stimmen Richtwert und Messung ueberein, ist es EIN Chip mit der Zahl dazu",B.gleich);
 p(B.ungleich.length===2&&B.ungleich[0].wert==="500"&&B.ungleich[1].wert==="590"
   &&!B.ungleich[0].zw&&B.ungleich[1].zw,
   "B4 weichen sie ab, stehen BEIDE da - der hinterlegte Richtwert verschwindet nie",B.ungleich);
 p(B.ungleich.length===2&&/Richtwert 500/.test(B.ungleich[0].text)
   &&/590/.test(B.ungleich[1].text)&&/4×/.test(B.ungleich[1].text),
   "B5 und jeder nennt seinen eigenen Wert, damit man sie unterscheiden kann",B.ungleich);
 p(B.nurGelernt.length===1&&B.nurGelernt[0].wert==="80"&&B.nurGelernt[0].zw,
   "B6 ohne hinterlegten Richtwert steht die eigene Messung allein da",B.nurGelernt);
 p(B.gleich[0].zahl&&B.ungleich[1].zahl&&B.nurGelernt[0].zahl,
   "B7 Regel 2: an jedem gelernten Chip steht die Zahl, nachpruefbar",B);
 const V171='<button type="button" class="vorschlag-chip no-print" '
  +'data-vorschlag-fuer="f6" data-vorschlag-wert="330" '
  +'title="Richtwert \u00fcbernehmen">Richtwert 330</button>';
 p(B.alteForm===V171,
   "B8 Gegenprobe: der Chip mit dem hinterlegten Richtwert ist Zeichen fuer "
   +"Zeichen der von v3.171 - alte Aufrufform, gleiche Ausgabe",
   {ist:B.alteForm,soll:V171});
 p(B.alteFormNeu===V171,
   "B9 und auch mit Art und Feld, solange dazu nichts gemessen wurde",
   {ist:B.alteFormNeu,soll:V171});

 // ---- C  Uebernehmen ------------------------------------------------------
 const C=await page.evaluate(async()=>{
  const wrap=document.createElement("div");
  wrap.innerHTML='<input id="pruefFeld" type="number">'
   +vorschlagChip("pruefFeld",500,"lukarne","achsabstand");
  document.body.appendChild(wrap);
  const vorher={wert:document.getElementById("pruefFeld").value,
                chips:wrap.querySelectorAll(".vorschlag-chip").length};
  wrap.querySelector(".zw-chip").click();
  await new Promise(f=>setTimeout(f,120));
  const nachher={wert:document.getElementById("pruefFeld").value,
                 chips:document.querySelectorAll('.vorschlag-chip[data-vorschlag-fuer="pruefFeld"]').length};
  wrap.remove();
  return {vorher,nachher};
 });
 p(C.vorher.wert===""&&C.vorher.chips===2,
   "C1 solange nichts angetippt ist, stehen beide Vorschlaege und das Feld ist leer",C);
 p(C.nachher.wert==="590",
   "C2 ein Tipp auf die eigene Messung uebernimmt genau diesen Wert",C);
 p(C.nachher.chips===0,
   "C3 danach verschwinden BEIDE Chips - ein Vorschlag neben einem "
   +"gefuellten Feld waere ein Knopf ohne Wirkung",C);

 // ---- D  Die Verdrahtung an den echten Modulen ---------------------------
 // vorschlagChip wird mitgeschrieben statt nachgebaut: so steht hier
 // wirklich das, was das Modul durchreicht.
 const D=await page.evaluate(()=>{
  const protokoll=[];
  const echt=vorschlagChip;
  vorschlagChip=function(feldId,wert,art,feld){
   protokoll.push({feldId:feldId,art:art||null,feld:feld===undefined?null:feld});
   return echt.apply(null,arguments);
  };
  const versuch=f=>{ try{ f() }catch(e){ protokoll.push({fehler:String(e)}) } };
  // Jedes Modul zeichnet seine Felder mit dem eigenen, leeren Zustand -
  // leer heisst: die Chips entstehen ueberhaupt.
  versuch(()=>lukaZahlFeld("x","luka_achsabstand","","1",true,500));
  versuch(()=>lukaZahlFeld("x","luka_zugabeBreite","","1",true,80));
  versuch(()=>lukaZahlFeld("x","luka_hoehe","","1",true,undefined));
  versuch(()=>kamaZahlFeld("x","kam_lattenabstand","","1",true,330));
  versuch(()=>kamaZahlFeld("x","kam_umschlagVorne","","1",true,20));
  versuch(()=>kamaZahlFeld("x","kam_a_l","","1",true,250));
  versuch(()=>kamaZahlFeld("x","kam_a_r","","1",true,250));
  versuch(()=>kamaZahlFeld("x","kam_d_r","","1",true,300));
  versuch(()=>dfaZahlFeld("x","dfa_anreiffUmschlag","","1",true,10));
  versuch(()=>dfaZahlFeld("x","dfa_d_l","","1",true,430));
  versuch(()=>einfaZahlFeld("x","einfa_a_3","","1",true,200));
  versuch(()=>einfaZahlFeld("x","einfa_lattenabstand","","1",true,330));
  versuch(()=>einfaZahlFeld("x","einfa_durchmesser_2","","1",true,120));
  versuch(()=>madaProfilHtml());
  versuch(()=>raKomponentenHtml());
  // Die Kehle zeigt die Ueberlappung nur zwischen zwei Segmenten - das
  // letzte Segment stoesst an nichts an.
  versuch(()=>{ kehleA.segmente=[{laenge:2000,ueberlappung:""},
                                 {laenge:2000,ueberlappung:""}];
                keaSegmenteHtml(); });
  // Das GAVA-Blech ist abschaltbar; ohne Haken gibt es das Feld nicht.
  versuch(()=>{ ebA.gava={aktiv:true,abstand_mm:"",anzahl:null};
                ebaGavaHtml(); });
  // Anschlussblech: die vier festen Felder und die Masse der gewaehlten
  // Anschlussart entstehen in zwei getrennten Funktionen.
  versuch(()=>{ const w=Object.assign(anbVorgabe(),
                 {saum:"",stossLaenge:"",ueberlappung:"",lattenabstand:"",
                  ausfuehrung:"ort",art:"bleilappen",
                  a:"",b:"",c:"",d:"",e:"",
                  ortAufkantung:"",ortOben:"",ortStirn:"",ortNase:"",
                  wandAufkantung:""});
                anbFesteFelderFuellen(w); anbMassfelderZeichnen(w); });
  vorschlagChip=echt;
  return protokoll;
 });
 const fand=(feldId)=>D.find(x=>x.feldId===feldId)||null;
 p(!D.some(x=>x.fehler),"D0 alle Feld-Bauer laufen durch",D.filter(x=>x.fehler));
 p(fand("luka_achsabstand")&&fand("luka_achsabstand").art==="lukarne"
   &&fand("luka_achsabstand").feld==="achsabstand",
   "D1 Lukarne: luka_achsabstand lernt als lukarne/achsabstand",fand("luka_achsabstand"));
 p(!!fand("luka_hoehe")&&!fand("luka_hoehe").feld,
   "D2 ein Feld ohne Richtwert lernt NICHTS - kein geratener Name",fand("luka_hoehe"));
 p(fand("kam_lattenabstand")&&fand("kam_lattenabstand").art==="kamineinfassung"
   &&fand("kam_lattenabstand").feld==="lattenabstand",
   "D3 Kamin: kam_lattenabstand lernt als kamineinfassung/lattenabstand",fand("kam_lattenabstand"));
 p(fand("kam_umschlagVorne")&&fand("kam_umschlagVorne").feld==="umschlagVorne",
   "D4 Kamin: die Schreibweise des gespeicherten Schluessels bleibt erhalten",fand("kam_umschlagVorne"));
 p(fand("kam_a_l")&&fand("kam_a_l").feld==="a"&&fand("kam_a_r")&&fand("kam_a_r").feld==="a",
   "D5 Kamin: linke und rechte Seite lernen unter demselben Mass",
   [fand("kam_a_l"),fand("kam_a_r")]);
 p(fand("kam_d_r")&&fand("kam_d_r").feld==="d","D6 Kamin: dasselbe fuer d",fand("kam_d_r"));
 p(fand("dfa_anreiffUmschlag")&&fand("dfa_anreiffUmschlag").art==="dachfenstereinfassung"
   &&fand("dfa_anreiffUmschlag").feld==="anreiffUmschlag",
   "D7 Dachfenster: anreiffUmschlag",fand("dfa_anreiffUmschlag"));
 p(fand("dfa_d_l")&&fand("dfa_d_l").feld==="d","D8 Dachfenster: Seitenmass d",fand("dfa_d_l"));
 p(fand("einfa_a_3")&&fand("einfa_a_3").art==="einfassung_rund"
   &&fand("einfa_a_3").feld==="a",
   "D9 Einfassung rund: die laufende Nummer faellt weg - es ist dasselbe Mass",fand("einfa_a_3"));
 p(fand("einfa_lattenabstand")&&fand("einfa_lattenabstand").feld==="lattenabstand",
   "D10 Einfassung rund: Lattenabstand ohne Nummer",fand("einfa_lattenabstand"));
 p(fand("einfa_durchmesser_2")&&!fand("einfa_durchmesser_2").feld,
   "D11 Gegenprobe: der Rohrdurchmesser ist ein Bauwerksmass und lernt nichts",
   fand("einfa_durchmesser_2"));
 const mada=D.filter(x=>/^mada_profil_/.test(x.feldId||""));
 p(mada.length>0&&mada.every(x=>x.art==="mauerabdeckung"
   &&x.feld==="profil_"+x.feldId.replace("mada_profil_","")),
   "D12 Mauerabdeckung: gelernt wird unter dem FORMULARnamen (die Sicht rechnet "
   +"auf den abweichenden Speicherschluessel um)",mada);
 const ra=fand("ra_halterAbstand");
 p(!!ra&&ra.art==="rinne_halbrund"&&ra.feld==="halter_abstand",
   "D13 Rinne halbrund: Halterabstand",ra);
 const kea=D.find(x=>/^kea_ueb_/.test(x.feldId||""));
 p(!!kea&&kea.art==="kehle"&&kea.feld==="ueberlappung",
   "D14 Kehle: jede Segment-Ueberlappung lernt unter demselben Namen",kea);
 const eba=fand("eba_gavaAbstand");
 p(!!eba&&eba.art==="einlaufblech_gerade"&&eba.feld==="gava_abstand",
   "D15 Einlaufblech gerade: der GAVA-Abstand liegt unter gava.abstand_mm, "
   +"gelernt wird er als gava_abstand",eba);
 const anbFest=["anb_saum","anb_stossLaenge","anb_ueberlappung","anb_lattenabstand"]
   .map(fand);
 p(anbFest.every(x=>x&&x.art==="anschlussblech")
   &&anbFest.map(x=>x&&x.feld).join(",")==="saum,stossLaenge,ueberlappung,lattenabstand",
   "D16 Anschlussblech: die vier festen Felder lernen unter ihrem "
   +"gespeicherten Schluessel",anbFest);
 const anbMasse=D.filter(x=>/^anb_masse_/.test(x.feldId||""));
 p(anbMasse.length>0&&anbMasse.every(x=>x.art==="anschlussblech"
   &&x.feld==="masse_"+x.feldId.replace("anb_masse_","")),
   "D17 Anschlussblech: die Masse a..e liegen flach im Datensatz und werden "
   +"als masse_a..masse_e gezaehlt - ohne Vorsatz waeren sie nicht von den "
   +"gleichnamigen Feldern anderer Arten zu unterscheiden",anbMasse);
 const anbOrt=fand("anb_ortAufkantung");
 p(!!anbOrt&&anbOrt.art==="anschlussblech"&&anbOrt.feld==="ortAufkantung",
   "D18 Anschlussblech: der Ortabschluss",anbOrt);

 // ---- E  Struktur ---------------------------------------------------------
 const E=await page.evaluate(()=>({
  luka:typeof LUKA_LERNFELDER==="object"?LUKA_LERNFELDER:null,
  kam:typeof KAM_LERNFELDER==="object"?KAM_LERNFELDER:null,
  dfa:typeof DFA_LERNFELDER==="object"?DFA_LERNFELDER:null,
  einfa:typeof EINFA_LERNFELDER==="object"?EINFA_LERNFELDER:null
 }));
 const namen=t=>[...new Set(Object.keys(t||{}).map(k=>t[k]))].sort();
 const soll=a=>VERTRAG[a].slice().sort();
 p(JSON.stringify(namen(E.luka))===JSON.stringify(soll("lukarne")),
   "E1 Lukarne: Lerntabelle und Sicht messwert_nutzung decken sich",
   {ist:namen(E.luka),soll:soll("lukarne")});
 p(JSON.stringify(namen(E.kam))===JSON.stringify(soll("kamineinfassung")),
   "E2 Kamineinfassung: dasselbe",{ist:namen(E.kam),soll:soll("kamineinfassung")});
 p(JSON.stringify(namen(E.dfa))===JSON.stringify(soll("dachfenstereinfassung")),
   "E3 Dachfenstereinfassung: dasselbe",{ist:namen(E.dfa),soll:soll("dachfenstereinfassung")});
 p(JSON.stringify(namen(E.einfa))===JSON.stringify(soll("einfassung_rund")),
   "E4 Einfassung rund: dasselbe",{ist:namen(E.einfa),soll:soll("einfassung_rund")});

 const quelle=fs.readFileSync(path.join(process.cwd(),"js/71-zaehlwerk.js"),"utf8");
 p(/from\("messwert_nutzung"\)/.test(quelle),
   "E5 geladen wird die Sicht messwert_nutzung");
 p(!/company_id/.test(quelle),
   "E6 Regel 4: der Client filtert NICHT selbst nach Firma - das macht die RLS "
   +"ueber security_invoker. Eine eigene Filterung waere eine zweite, "
   +"stillschweigend veraltende Zugriffskontrolle");
 const laden=fs.readFileSync(path.join(process.cwd(),"js/05-daten-laden.js"),"utf8");
 p(/zaehlwerkMesswertLaden\(\)/.test(laden)
   &&/zaehlwerkMesswert:zwMessRes/.test(laden),
   "E7 die Zaehlung wird mitgeladen und wandert in den Offline-Zwischenspeicher");
 p(!/fehlgeschlagen=\[[^\]]*zwMessRes/.test(laden),
   "E8 und sie entscheidet NICHT ueber 'Laden fehlgeschlagen' - ohne sie "
   +"verhaelt sich jeder Chip wie vor v3.172");

 p(fehler.length===0,"F1 keine Javascript-Fehler",fehler.slice(0,3));
 await b.close();
 console.log("\n"+ok+" von "+(ok+fail)+" Pruefungen bestanden.");
 process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1)});

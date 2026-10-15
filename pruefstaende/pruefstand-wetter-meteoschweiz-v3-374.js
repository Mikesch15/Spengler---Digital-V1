// v3.374: Lesen der MeteoSchweiz-Vorhersage (Edge Function wetter-meteoschweiz, reine Funktionen in parser.js).
// Die Fixtures unter pruefstaende/fixtures-wetter/ sind ECHTE Auszüge der offenen Dateien von MeteoSchweiz (Lauf 2026-10-13 23:00 UTC:
// Orte, jp2000d0, tre200px, rka150p0; Auszug = die Zeilen für Ittigen, Lausanne 25 und die erste Station). tre200pn ist SYNTHETISCH
// (aus tre200px abgeleitet) und prüft nur das Format, nicht die Werte.
const fs=require("fs"),path=require("path");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
const fx=n=>fs.readFileSync(path.join(__dirname,"fixtures-wetter",n),"latin1");
(async()=>{
 const P=await import("file://"+path.join(process.cwd(),"supabase/functions/wetter-meteoschweiz/parser.js"));

 console.log("\nA · Postleitzahl aus der Firmenadresse");
 const plz=t=>P.plzAusAdresse(t);
 p(plz("Peter Künzi AG, Worblentalstrasse 28, 3063 Ittigen")==="3063","Adresse mit Ort: 3063",plz("Peter Künzi AG, Worblentalstrasse 28, 3063 Ittigen"));
 p(plz("Strasse 1234, 3063 Ittigen")==="3063","Vierstellige Hausnummer gewinnt nicht gegen PLZ mit Ortsname",plz("Strasse 1234, 3063 Ittigen"));
 p(plz("3063 Ittigen\nTel 031 123 45 67")==="3063","Telefonnummer wird nicht als PLZ gelesen",plz("3063 Ittigen\nTel 031 123 45 67"));
 p(plz("Postfach 12345, Bern")===null&&plz("")===null&&plz(null)===null&&plz("Ohne Zahl")===null&&plz("Tel 0311234567")===null,"Fünfstellige Zahl, leer, null, ohne Zahl, lange Telefonnummer: keine PLZ",[plz("Postfach 12345, Bern"),plz("Tel 0311234567")]);
 p(plz("0123 Test")===null&&plz("Weg 999, 8000 Zürich")==="8000","PLZ beginnt nie mit 0; dreistellige Hausnummer ignoriert",[plz("0123 Test"),plz("Weg 999, 8000 Zürich")]);

 console.log("\nB · Ort finden (echte Ortsliste, Auszug)");
 const meta=fx("meta_point.csv");
 const o=P.punktFinden(meta,"3063");
 p(o&&o.id===306300&&o.name==="Ittigen","3063 → Punkt 306300 „Ittigen“",o);
 const m2=P.punktFinden(meta,"1000");
 p(m2&&m2.id===100025,"Mehrere Orte zur selben PLZ (1000): der mit der kleinsten Nummer (100025)",m2);
 p(P.punktFinden(meta,"9999")===null&&P.punktFinden("kaputt","3063")===null&&P.punktFinden(meta,"1")===null,"Unbekannte PLZ, kaputte Datei: kein Ort",null);
 const ohneTyp2="point_id;point_type_id;station_abbr;postal_code;point_name\n5;1;ABC;3063;Station";
 p(P.punktFinden(ohneTyp2,"3063")===null,"Eine Station mit derselben Nummer in der PLZ-Spalte zählt nicht (nur Typ 2)",null);

 console.log("\nC · Werte lesen (echte Tagesdateien, Auszug)");
 const code=P.werteFuerPunkt(fx("jp2000d0.csv"),"jp2000d0",306300),tmax=P.werteFuerPunkt(fx("tre200px.csv"),"tre200px",306300),regen=P.werteFuerPunkt(fx("rka150p0.csv"),"rka150p0",306300);
 p(Object.keys(code).length===9&&code["202610130000"]===3&&code["202610170000"]===17,"Piktogramm: 9 Tage, 13.10.=3, 17.10.=17",code);
 p(tmax["202610130000"]===16.3&&tmax["202610170000"]===12.3&&regen["202610170000"]===6.8&&regen["202610180000"]===4.5,"Tagesmaximum 12,3 °C und Regen 6,8 mm am 17.10. (wie in der Originaldatei)",[tmax["202610170000"],regen["202610170000"]]);
 p(P.werteFuerPunkt(fx("jp2000d0.csv"),"tre200px",306300)===null,"Falsche Messgrösse im Kopf: Formatfehler (null), nichts wird geraten",null);
 p(P.werteFuerPunkt("a;b;c;d\n1;2;3;4","jp2000d0",306300)===null,"Unbekannter Kopf: null",null);
 const leer=P.werteFuerPunkt("point_id;point_type_id;Date;rka150p0\n306300;2;202610130000;\n306300;2;202610140000;1.5\n306300;2;kaputt;2\n306300;2;202610150000;x","rka150p0",306300);
 p(leer["202610130000"]===null&&leer["202610140000"]===1.5&&leer["kaputt"]===undefined&&leer["202610150000"]===null,"Leerer oder unlesbarer Wert → null (nie 0); ungültiges Datum wird verworfen",leer);
 const fremd=P.werteFuerPunkt("point_id;point_type_id;Date;rka150p0\n306300;1;202610130000;9\n306301;2;202610130000;8\n306300;2;202610130000;0.1","rka150p0",306300);
 p(Object.keys(fremd).length===1&&fremd["202610130000"]===0.1,"Nur Typ 2 UND genau diese Nummer (kein Treffer bei 306301 oder Typ 1)",fremd);

 console.log("\nD · Lauf und Adresse der Dateien");
 const k=P.laufKandidaten(new Date(Date.UTC(2026,9,15,0,30)),4);
 p(k.join()==="202610142300,202610142200,202610142100,202610142000","Kandidaten: eine Stunde zurück, stündlich, über Mitternacht",k);
 p(P.dateiUrl("202610132300","jp2000d0")==="https://data.geo.admin.ch/ch.meteoschweiz.ogd-local-forecasting/20261013-ch/vnut12.lssw.202610132300.jp2000d0.csv","Dateiadresse wie in der Dateiliste von MeteoSchweiz");

 console.log("\nE · Ganzer Ablauf mit nachgebautem Abruf");
 const dateien={[P.META_PUNKTE]:fx("meta_point.csv"),
  [P.dateiUrl("202610132300","jp2000d0")]:fx("jp2000d0.csv"),[P.dateiUrl("202610132300","tre200px")]:fx("tre200px.csv"),
  [P.dateiUrl("202610132300","tre200pn")]:fx("tre200pn.csv"),[P.dateiUrl("202610132300","rka150p0")]:fx("rka150p0.csv")};
 const abrufe=[];
 const mk=(vorhanden,fehler)=>async(u,o)=>{abrufe.push(o.method+" "+u.split("/").pop());
  if(fehler&&fehler(u))return {ok:false,status:500,text:async()=>""};
  const t=vorhanden[u];return t===undefined?{ok:false,status:404,text:async()=>""}:{ok:true,status:200,text:async()=>t}};
 const jetzt=new Date(Date.UTC(2026,9,14,1,10));   // erster Kandidat 2026-10-14 00:00 existiert nicht, 13.10. 23:00 schon
 const v=await P.holeVorhersage({fetchFn:mk(dateien),plz:"3063",jetzt});
 p(v.ort==="Ittigen"&&v.lauf==="202610132300"&&v.tage.length===9&&v.tage[0].datum==="2026-10-13","Ergebnis: Ittigen, neuester vorhandener Lauf 13.10. 23:00, 9 Tage ab 2026-10-13",{ort:v.ort,lauf:v.lauf,n:v.tage.length});
 const t17=v.tage.find(x=>x.datum==="2026-10-17");
 p(t17&&t17.code===17&&t17.tmax===12.3&&t17.regen===6.8&&t17.tmin===4.3,"Tag 17.10.: Piktogramm 17, max 12,3 °C, min 4,3 °C (synthetisch), Regen 6,8 mm",t17);
 p(abrufe.filter(x=>x.startsWith("HEAD")).length===2&&abrufe.filter(x=>x.startsWith("GET")).length===5,"Es wird zuerst mit HEAD nach dem neuesten Lauf gesucht (2 Versuche), dann je eine Datei geholt (Ortsliste + 4 Tagesdateien)",abrufe);
 const ohneLauf=await P.holeVorhersage({fetchFn:mk({[P.META_PUNKTE]:fx("meta_point.csv")}),plz:"3063",jetzt}).catch(e=>e);
 p(ohneLauf instanceof Error&&ohneLauf.code==="kein_lauf"&&/keine aktuelle Vorhersage/.test(ohneLauf.message),"Kein Lauf in den letzten 8 Stunden: ehrliche Meldung, nichts erfunden",ohneLauf.message);
 const keinOrt=await P.holeVorhersage({fetchFn:mk(dateien),plz:"9999",jetzt}).catch(e=>e);
 p(keinOrt.code==="kein_ort"&&/9999/.test(keinOrt.message),"Unbekannte PLZ: Meldung mit der PLZ",keinOrt.message);
 const metaWeg=await P.holeVorhersage({fetchFn:mk(dateien,u=>u===P.META_PUNKTE),plz:"3063",jetzt}).catch(e=>e);
 p(metaWeg.code==="quelle","Ortsliste nicht erreichbar: Fehler „quelle“",metaWeg.message);
 const dateiWeg=await P.holeVorhersage({fetchFn:mk(dateien,u=>/rka150p0\.csv$/.test(u)&&!/HEAD/.test(u)),plz:"3063",jetzt}).catch(e=>e);
 p(dateiWeg.code==="quelle"||dateiWeg.tage!==undefined,"Eine Tagesdatei fehlt: Fehler statt Teilergebnis (kein stilles Weglassen)",dateiWeg.code);
 const falsch={...dateien,[P.dateiUrl("202610132300","rka150p0")]:"x;y;z;w\n1;2;3;4"};
 const fmt=await P.holeVorhersage({fetchFn:mk(falsch),plz:"3063",jetzt}).catch(e=>e);
 p(fmt.code==="format"&&/geändert/.test(fmt.message),"Geändertes Dateiformat: Fehler „format“ mit klarer Meldung",fmt.message);

 console.log("\nF · Einbindung");
 const src=fs.readFileSync("supabase/functions/wetter-meteoschweiz/index.ts","utf8"),par=fs.readFileSync("supabase/functions/wetter-meteoschweiz/parser.js","utf8");
 p(/my_company_id/.test(src)&&/Bearer/.test(src)&&/wetter_aktiv/.test(src),"Die Funktion prüft Anmeldung (aktive Firma), liest PLZ und Schalter aus den Firmeneinstellungen – der Client schickt nichts",null);
 p(!/req\.json\(|searchParams|req\.url/.test(src),"Kein Parameter des Aufrufers wird verwendet (kein offener Proxy)",null);
 const hosts=[...new Set((par+src).match(/https:\/\/[a-z0-9.-]+/g)||[])].filter(h=>!/supabase|invalid/.test(h));
 p(hosts.join()==="https://data.geo.admin.ch","Einzige externe Adresse: data.geo.admin.ch (MeteoSchweiz/swisstopo)",hosts);
 p(!/apikey\s*[:=]\s*"[A-Za-z0-9]{20,}"|AIza|sk-/.test(src+par),"Kein Schlüssel im Code",null);
 p(/Quelle|MeteoSchweiz/.test(src),"Die Antwort nennt die Quelle (MeteoSchweiz)",null);
 console.log("\n  "+ok+" ok, "+fail+" fehlgeschlagen");
 process.exit(fail?1:0);
})();

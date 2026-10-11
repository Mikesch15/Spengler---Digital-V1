// Prueft v3.317 (Nachtauftrag Paket G): dbFehlerText() uebersetzt technische Fehlermeldungen (Netz, Anmeldung, Rechte,
// Datenbank) in deutsche Saetze mit der naechsten Handlung; bewusst deutsche Meldungen unserer Datenbankfunktionen
// gehen unveraendert durch. Und: die Workflow-/Aufgaben-/Werkstatt-/Admin-/Modul-/Reservierungs-/Vorlagen-/Versions-
// Ansichten zeigen error.message nicht mehr roh (Quelltext-Pruefung: jede Stelle nutzt dbFehlerText).
"use strict";
const fs=require("fs"), path=require("path"), vm=require("vm");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,300):""))}};
const wurzel=process.cwd();
const basis=fs.readFileSync(path.join(wurzel,"js/01-basis.js"),"utf8");
const a=basis.indexOf("function dbFehlerText"), b=basis.indexOf("// ---- Ende dbFehlerText");
p(a>0&&b>a,"dbFehlerText steht in js/01-basis.js",[a,b]);
const sb={};vm.runInNewContext(basis.slice(a,b),sb);
const f=(m,v)=>sb.dbFehlerText(typeof m==="string"?{message:m}:m,v);
console.log("\nA · Technische Meldungen werden uebersetzt");
const netz=/Keine Verbindung zum Server/;
p(netz.test(f("TypeError: Failed to fetch")),"Failed to fetch -> Verbindung");
p(netz.test(f("NetworkError when attempting to fetch resource.")),"NetworkError -> Verbindung");
p(netz.test(f("Load failed")),"Load failed (iOS) -> Verbindung");
p(/Anmeldung ist abgelaufen/.test(f("JWT expired")),"JWT expired -> Anmeldung abgelaufen");
p(/Anmeldung ist abgelaufen/.test(f("Invalid Refresh Token: Refresh Token Not Found")),"Refresh Token -> Anmeldung abgelaufen");
const rechte=f('permission denied for table measurements');
p(/Berechtigung/.test(rechte)&&rechte.indexOf("measurements")<0,"permission denied for table x -> Berechtigung, OHNE Tabellennamen",rechte);
const rls=f('new row violates row-level security policy for table "projects"');
p(/Berechtigung/.test(rls)&&rls.indexOf("projects")<0,"RLS-Verletzung -> Berechtigung, ohne Tabellennamen",rls);
const dup=f('duplicate key value violates unique constraint "profiles_email_key"');
p(/existiert bereits/.test(dup)&&dup.indexOf("profiles_email_key")<0,"doppelter Schluessel -> Satz, ohne Constraint-Namen",dup);
p(/unvollständig|verknüpft/.test(f('insert or update on table "x" violates foreign key constraint "x_fk"')),"Fremdschluessel -> Satz");
p(/zu lange/.test(f("canceling statement due to statement timeout")),"Statement-Timeout -> zu lange");
p(/nicht verfügbar/.test(f("Could not find the function public.foo in the schema cache")),"Funktion nicht gefunden -> nicht verfuegbar");
const std="Der Schritt konnte nicht ausgeführt werden.";
p(f('invalid input syntax for type bigint: "abc"',std)===std,"unbekannte technische Meldung -> die Vorgabe des Aufrufers (nichts Technisches im Dialog)");
console.log("\nB · Deutsche Meldungen und Randfaelle");
for(const m of ["Nur der zugewiesene Ruester kann das Ruesten bestaetigen.","Massaufnahme nicht gefunden.","Die Massaufnahme muss zuerst freigegeben werden.","Der gewaehlte Monteur gehoert nicht zu dieser Firma.","Diese Massaufnahme ist bereits freigegeben.","Dieser Benutzer gehört nicht zu Ihrer Firma."])
 p(f(m)===m,"Datenbank-Satz bleibt unveraendert: "+m.slice(0,40)+"…");
p(f("",std)===std&&f(null,std)===std&&f(undefined)===("Der Vorgang konnte nicht ausgeführt werden. Bitte nochmals versuchen."),"leer/null/undefined -> Vorgabe");
p(f("x".repeat(500)).length<=305,"sehr lange Meldung wird gekuerzt");
p(f({message:"Failed to fetch",code:"x"}).indexOf("Verbindung")>0&&netz.test(sb.dbFehlerText("Failed to fetch")),"auch ein reiner Text statt Fehlerobjekt geht");
console.log("\nC · Keine rohen error.message mehr in den Ansichten");
const dateien=["44-workflow","45-aufgaben","46-admin-uebersicht","47-projektmodule","50-reservierung","51-werkstatt","52-vorlagen","53-versionen"];
for(const d of dateien){
 const zeilen=fs.readFileSync(path.join(wurzel,"js",d+".js"),"utf8").split("\n");
 const roh=zeilen.map((z,i)=>[i+1,z]).filter(([i,z])=>/(error|err)\.message/.test(z)&&!/console\./.test(z)&&!/dbFehlerText/.test(z));
 p(roh.length===0,"js/"+d+".js: jede angezeigte Fehlermeldung laeuft ueber dbFehlerText",roh.slice(0,2));
}
console.log(`\n=== ${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail?1:0);

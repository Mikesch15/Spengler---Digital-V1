// Prueft v3.290: Ein Firmen-Administrator darf stellvertretend freigeben.
// Serverseitig steht die Regel in measurement_freigeben() (Aufnehmer ODER Admin,
// NACH der Mandantenpruefung mw_firma_ok); diesen Pruefstand sieht nur der Client.
// Die Serverseite wurde separat mit vier Faellen geprueft (siehe Bericht), ohne
// Daten zu veraendern. Jede Probe hat eine Gegenprobe.
const {chromium}=require(process.env.SP+"/node_modules/playwright-core");
const {chromePfad}=require(__dirname+"/chrome-pfad.js");
const path=require("path"),fs=require("fs");
const APP="file://"+path.join(process.cwd(),"index.html");
const STUB=fs.readFileSync(path.join(process.cwd(),"anleitung/stub.js"),"utf8");
let ok=0,fail=0;
const p=(b,t,z)=>{if(b){ok++;console.log("  ok  "+t)}else{fail++;console.log("  FEHLGESCHLAGEN: "+t+(z!==undefined?"  "+JSON.stringify(z).slice(0,500):""))}};
(async()=>{
 const b=await chromium.launch({executablePath:chromePfad(),args:["--no-sandbox"]});
 const page=await b.newPage({viewport:{width:412,height:900},locale:"de-CH"});
 const fehler=[],dialoge=[]; page.on("pageerror",e=>fehler.push(String(e)));
 page.on("dialog",d=>{dialoge.push(d.message());d.dismiss()});
 await page.route(/cdn\.jsdelivr\.net|\/vendor\/supabase\./,r=>r.fulfill({status:200,contentType:"application/javascript",body:STUB}));
 await page.goto(APP,{waitUntil:"load"}); await page.waitForTimeout(600);
 const r=await page.evaluate(async()=>{
  const A="aaaa-aufnehmer",B="bbbb-mitarbeiter",D="dddd-admin";
  workflowAktiv=true;
  profileName=id=>({[A]:"Anna Aufnehmer",[B]:"Bruno Mitarbeiter",[D]:"Dora Admin"}[id]||"");
  const m={id:5,project_id:1,type:"rinne",title:"T",created_by:A,workflow_status:"in_bearbeitung",freigabe_verfallen:false,date:"2026-10-01"};
  const wer=(id,rolle)=>{currentProfile={id,role:rolle,company_id:"c1"};meineRechte={admin:rolle==="admin"}};
  const o={};
  wer(A,"employee");  o.aufnehmer=mwSchrittDarfIch(m,"freigeben");
  wer(B,"employee");  o.fremderMA=mwSchrittDarfIch(m,"freigeben"); o.fremderMAerneut=mwSchrittDarfIch(m,"erneut_freigeben");
  wer(D,"admin");     o.admin=mwSchrittDarfIch(m,"freigeben"); o.adminErneut=mwSchrittDarfIch(m,"erneut_freigeben");
  o.btnAdmin=a2MessZeileHtml(m,"x","").includes("data-a2-freigeben");
  wer(B,"employee");  o.btnMA=a2MessZeileHtml(m,"x","").includes("data-a2-freigeben");
  // Rueckfrage: Admin fuer Aufnehmer -> mit Hinweis; Aufnehmer selbst -> ohne
  const fragen=[]; window.confirm=t=>{fragen.push(t);return false};
  sb.rpc=async()=>({data:null,error:{message:"x"}});
  wer(D,"admin");  mwStandAusZeile(m); await mwFreigeben();
  wer(A,"employee"); mwStandAusZeile(m); await mwFreigeben();
  o.fragen=fragen;
  // Anzeige "Freigegeben von"
  const f=Object.assign({},m,{workflow_status:"zu_ruesten",freigegeben_von:D,freigegeben_am:"2026-10-02T08:00:00Z",ruester_id:A,monteur_id:A});
  o.textStellv=mwStellvertretungText(f);
  o.textSelbst=mwStellvertretungText(Object.assign({},f,{freigegeben_von:A}));
  return o;
 });
 p(r.aufnehmer===true,"der Aufnehmer darf freigeben (unveraendert)",r);
 p(r.fremderMA===false&&r.fremderMAerneut===false,"Gegenprobe: ein anderer Mitarbeiter darf NICHT freigeben",r);
 p(r.admin===true&&r.adminErneut===true,"ein Administrator darf freigeben und erneut freigeben (Stellvertretung)",r);
 p(r.btnAdmin===true&&r.btnMA===false,"der Knopf 'Freigeben' in der Massaufnahme-Liste: fuer den Admin da, fuer den fremden Mitarbeiter nicht",r);
 p(r.fragen.length===2&&/Wortlaut|Massaufnahme freigeben\?/.test(r.fragen[0])&&/stellvertretend für Anna Aufnehmer/.test(r.fragen[0]),"Rueckfrage des Admins nennt die Stellvertretung",r.fragen);
 p(!/stellvertretend/.test(r.fragen[1])&&/Mit der Freigabe bestätigst du/.test(r.fragen[1]),"Gegenprobe: die Rueckfrage des Aufnehmers hat den unveraenderten Wortlaut ohne Zusatz",r.fragen);
 p(/stellvertretend für Anna Aufnehmer/.test(r.textStellv)&&r.textSelbst==="","'Freigegeben von' nennt die Stellvertretung - nur dann",r);
 const sql=fs.readFileSync("supabase/migrations/v3290_freigabe_stellvertretung_admin.sql","utf8");
 p(/not public\.is_admin\(\)/.test(sql)&&/mw_firma_ok\(p_id\)/.test(sql)&&sql.indexOf("mw_firma_ok")<sql.indexOf("is_admin()"),"Migration im Repo: Mandantenpruefung steht VOR der Admin-Ausnahme");
 p(fehler.length===0,"keine JavaScript-Fehler",fehler.slice(0,2));
 await b.close();
 console.log(`\n${ok} ok, ${fail} fehlgeschlagen`); process.exit(fail?1:0);
})();

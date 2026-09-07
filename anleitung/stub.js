// Supabase-Attrappe fuer die Anleitung: liefert erfundene Demodaten.
// Es wird KEINE Verbindung zur echten Datenbank aufgebaut.
window.__demo={
 projects:[
  {id:1,name:"Sanierung Dach Nord",order_no:"2026-118",customer:"Muster Immobilien AG",object:"Bahnhofstrasse 12, 3011 Bern",archived:false,status:"in_arbeit",created_by:"u1",created_at:"2026-08-14T08:00:00Z",updated_by:"u1",updated_at:"2026-09-02T10:12:00Z"},
  {id:2,name:"Neubau Reiheneinfamilienhaus",order_no:"2026-124",customer:"Bauherr Meier",object:"Sonnhaldenweg 4, 3097 Liebefeld",archived:false,status:"offen",created_by:"u2",created_at:"2026-08-28T07:30:00Z",updated_by:"u2",updated_at:"2026-09-01T15:40:00Z"},
  {id:3,name:"Sturmschaden Kamin",order_no:"2026-131",customer:"Verwaltung Rosenweg",object:"Rosenweg 8, 3006 Bern",archived:false,status:"abgeschlossen",created_by:"u1",created_at:"2026-07-02T09:00:00Z",updated_by:"u1",updated_at:"2026-08-19T16:05:00Z"}
 ],
 measurements:[
  {id:11,project_id:1,type:"rinne_halbrund",title:"Rinne Nordseite",date:"2026-08-29",note:"",data:{material:1,groesse:333,rinneAbwicklung:333,ausmass:[{pos:1,bezeichnung:"Rinne halbrund, Abwicklung 333 mm",menge:"18,40",einheit:"m"},{pos:2,bezeichnung:"Rinnenhalter",menge:24,einheit:"Stk."},{pos:3,bezeichnung:"Dehnungselemente",menge:2,einheit:"Stk."}],rollen:{abwicklung:333,abschnittLaenge:3835,streifen:[{rest:0,stuecke:[{nr:1,laenge:3835}]},{rest:0,stuecke:[{nr:2,laenge:3835}]},{rest:1000,stuecke:[{nr:3,laenge:2835}]},{rest:1000,stuecke:[{nr:4,laenge:2835}]}],optimal:true}},photo_path:null,sketch_paths:[],created_by:"u1",created_at:"2026-08-29T09:10:00Z",updated_by:"u1",updated_at:"2026-08-29T09:40:00Z",rapport_material:[{no:"101.20",qty:"18",bem:"Rinne halbrund"},{no:"101.10",qty:"3",bem:"Blech für Rinnenböden"}],workflow_status:"zu_ruesten",freigegeben_von:"u1",freigegeben_am:"2026-08-29T09:45:00Z",ruester_id:"u1",ruester_zugewiesen_am:"2026-08-29T10:00:00Z",monteur_id:"u2",monteur_zugewiesen_am:"2026-08-29T10:00:00Z"},
  {id:12,project_id:1,type:"einlaufblech_gerade",title:"Einlaufblech Traufe Nord",date:"2026-08-29",note:"",data:{material:1,abwicklung:250,ausmass:[{pos:1,bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:"6,20",einheit:"m"},{pos:2,bezeichnung:"Stücke (Zuschnitte)",menge:4,einheit:"Stk."}],rollen:{abwicklung:250,abschnittLaenge:2070,streifen:[{rest:0,stuecke:[{nr:1,laenge:2070}]},{rest:0,stuecke:[{nr:2,laenge:2070}]},{rest:0,stuecke:[{nr:3,laenge:2060}]}],optimal:true}},photo_path:null,sketch_paths:[],created_by:"u1",created_at:"2026-08-29T10:00:00Z",updated_by:"u2",updated_at:"2026-09-02T10:12:00Z",rapport_material:[{no:"204.05",qty:"1.5",bem:"Anschluss Kamin"}],workflow_status:"in_bearbeitung"},
  {id:13,project_id:1,type:"kehle",title:"Kehle Lukarne Ost",date:"2026-08-30",note:"",data:{},photo_path:null,sketch_paths:[],created_by:"u2",created_at:"2026-08-30T13:20:00Z",updated_by:"u2",updated_at:"2026-08-30T13:55:00Z"},
  {id:14,project_id:2,type:"mauerabdeckung",title:"Mauerabdeckung Attika",date:"2026-09-03",note:"",data:{},photo_path:null,sketch_paths:[],created_by:"u1",created_at:"2026-09-03T08:15:00Z",updated_by:"u1",updated_at:"2026-09-04T14:20:00Z",workflow_status:"in_bearbeitung",freigabe_verfallen:true,freigegeben_von:null,freigegeben_am:null,ruester_id:"u2",ruester_zugewiesen_am:"2026-09-03T09:00:00Z",monteur_id:"u2",monteur_zugewiesen_am:"2026-09-03T09:00:00Z"}
 ],
 ausmass:[
  {id:5,project_id:1,type:"blitzschutz_ausmass",title:"Blitzschutz Hauptdach",date:"2026-08-30",positions:[],created_by:"u1",created_at:"2026-08-30T14:00:00Z",updated_by:"u1",updated_at:"2026-08-30T14:30:00Z"}
 ],
 reports:[
  {id:7,project_id:1,date:"2026-09-01",order_no:"2026-118",customer:"Muster Immobilien AG",object:"Dachfläche Nord",vat:"8.1 %",work_entries:[],material_entries:[],created_by:"u1",created_at:"2026-09-01T17:00:00Z",updated_by:"u1",updated_at:"2026-09-01T17:20:00Z"}
 ],
 project_files:[
  {id:3,project_id:1,name:"Dachaufsicht Plan.pdf",file_path:"project-files/1/plan.pdf",size_bytes:412300,mime_type:"application/pdf",created_by:"u1",created_at:"2026-08-15T08:20:00Z",updated_at:"2026-08-15T08:20:00Z"}
 ],
 audit_log:[
  {id:11,company_id:"c1",user_id:"u1",entity_type:"measurement",entity_id:14,project_id:2,action:"status_changed",description:"Mauerabdeckung Attika",changes:[{field:"workflow_status",old:"zu_ruesten",new:"in_bearbeitung"},{field:"freigabe_verfallen",old:false,new:true}],created_at:"2026-09-04T14:20:00Z"},
  {id:10,company_id:"c1",user_id:"u1",entity_type:"measurement",entity_id:11,project_id:1,action:"status_changed",description:"Rinne Nordseite",changes:[{field:"workflow_status",old:"freigegeben",new:"zu_ruesten"},{field:"ruester_id",old:null,new:"u1"}],created_at:"2026-08-29T10:00:00Z"},
 {id:9,company_id:"c1",user_id:"u2",entity_type:"measurement",entity_id:12,project_id:1,action:"updated",description:"Einlaufblech Traufe Nord",changes:null,created_at:"2026-09-02T10:12:00Z"},
  {id:8,company_id:"c1",user_id:"u1",entity_type:"project",entity_id:1,project_id:1,action:"status_changed",description:"Sanierung Dach Nord",changes:[{field:"status",old:"offen",new:"in_arbeit"}],created_at:"2026-08-29T08:05:00Z"},
  {id:7,company_id:"c1",user_id:"u1",entity_type:"project",entity_id:1,project_id:1,action:"created",description:"Sanierung Dach Nord",changes:null,created_at:"2026-08-14T08:00:00Z"}
 ],
 feedback:[
  {id:31,module:"Massaufnahme",profiles:{first_name:"Beat",last_name:"Muster"},message:"Beim Einlaufblech wäre eine Vorlage für wiederkehrende Dächer praktisch.",created_by:"u2",created_at:"2026-09-02T07:14:00Z",resolved:false},
  {id:30,module:"Regierapport",profiles:{first_name:"Andrea",last_name:"Beispiel"},message:"Die freie Position 999.90 funktioniert gut, danke.",created_by:"u1",created_at:"2026-08-31T16:02:00Z",resolved:true}
 ],
 // v3.08 Firmenadmin-Uebersicht: dieselben Demo-Massaufnahmen, dazu zwei
 // ohne Projekt - genau der Fall, den die Uebersicht sichtbar macht.
 adminMass:[
  {id:11,project_id:1,projekt_name:"Sanierung Dach Nord",projekt_adresse:"Bahnhofstrasse 12, 3011 Bern",projekt_archiviert:false,projekt_status:"in_arbeit",type:"rinne_halbrund",title:"Rinne Nordseite",datum:"2026-08-29",created_by:"u1",created_at:"2026-08-29T09:10:00Z",updated_by:"u1",updated_at:"2026-09-05T09:40:00Z",workflow_status:"zu_ruesten",freigabe_verfallen:false,freigegeben_von:"u1",freigegeben_am:"2026-08-29T09:45:00Z",ruester_id:"u1",geruestet_von:null,geruestet_am:null,monteur_id:"u2",montiert_von:null,montiert_am:null,hat_material:true,hat_zuschnitt:true,fassung:2},
  {id:14,project_id:2,projekt_name:"Neubau Reiheneinfamilienhaus",projekt_adresse:"Sonnhaldenweg 4, 3097 Liebefeld",projekt_archiviert:false,projekt_status:"offen",type:"mauerabdeckung",title:"Mauerabdeckung Attika",datum:"2026-09-03",created_by:"u1",created_at:"2026-09-03T08:15:00Z",updated_by:"u1",updated_at:"2026-09-04T14:20:00Z",workflow_status:"in_bearbeitung",freigabe_verfallen:true,freigegeben_von:null,freigegeben_am:null,ruester_id:"u2",geruestet_von:null,geruestet_am:null,monteur_id:"u2",montiert_von:null,montiert_am:null,hat_material:true,hat_zuschnitt:false,fassung:null},
  {id:13,project_id:1,projekt_name:"Sanierung Dach Nord",projekt_adresse:"Bahnhofstrasse 12, 3011 Bern",projekt_archiviert:false,projekt_status:"in_arbeit",type:"kehle",title:"Kehle Lukarne Ost",datum:"2026-08-30",created_by:"u2",created_at:"2026-08-30T13:20:00Z",updated_by:"u2",updated_at:"2026-08-30T13:55:00Z",workflow_status:"abgeschlossen",freigabe_verfallen:false,freigegeben_von:"u2",freigegeben_am:"2026-08-30T14:00:00Z",ruester_id:null,geruestet_von:null,geruestet_am:null,monteur_id:"u2",montiert_von:"u2",montiert_am:"2026-09-01T11:00:00Z",hat_material:true,hat_zuschnitt:true,fassung:1},
  {id:9,project_id:null,projekt_name:null,projekt_adresse:null,projekt_archiviert:null,projekt_status:null,type:"lukarne",title:"Lukarne Probe",datum:"2026-08-12",created_by:"u1",created_at:"2026-08-12T10:00:00Z",updated_by:"u1",updated_at:"2026-08-12T10:00:00Z",workflow_status:"in_bearbeitung",freigabe_verfallen:false,freigegeben_von:null,freigegeben_am:null,ruester_id:null,geruestet_von:null,geruestet_am:null,monteur_id:null,montiert_von:null,montiert_am:null,hat_material:false,hat_zuschnitt:false,fassung:null}
 ],
 // v3.09 Reservierung, Reststuecke, Fassungen und Vorlagen - alles erfunden.
 material_reservierungen:[
  {id:1,company_id:"c1",project_id:1,measurement_id:11,material_name:"Titanzink 0.7 mm",bezeichnung:"Rinne halbrund, Abwicklung 333 mm",menge:18.4,einheit:"m",breite_mm:333,laenge_mm:null,status:"reserviert",reserviert_von:"u1",reserviert_am:"2026-09-02T08:00:00Z",notiz:null,created_at:"2026-09-02T07:50:00Z"},
  {id:2,company_id:"c1",project_id:1,measurement_id:11,material_name:"Titanzink 0.7 mm",bezeichnung:"Zuschnitt 3'835 × 333 mm",menge:4,einheit:"Stk.",breite_mm:333,laenge_mm:3835,status:"zugeschnitten",reserviert_von:"u1",reserviert_am:"2026-09-02T08:00:00Z",notiz:null,created_at:"2026-09-02T07:50:00Z"},
  {id:3,company_id:"c1",project_id:1,measurement_id:12,material_name:"Titanzink 0.7 mm",bezeichnung:"Einlaufblech gerade, Abwicklung 250 mm",menge:6.2,einheit:"m",breite_mm:250,laenge_mm:null,status:"benoetigt",reserviert_von:null,reserviert_am:null,notiz:null,created_at:"2026-09-02T07:50:00Z"},
  // v3.18: zwei Zeilen aus einer Uebernahme vor v3.18 - Rechenergebnisse, die
  // der Aufraeum-Knopf wegnimmt. Erfunden wie alles hier.
  {id:4,company_id:"c1",project_id:1,measurement_id:12,material_name:"Titanzink 0.7 mm",bezeichnung:"Stücke (Zuschnitte)",menge:4,einheit:"Stk.",breite_mm:null,laenge_mm:null,status:"benoetigt",reserviert_von:null,reserviert_am:null,notiz:null,created_at:"2026-09-02T07:50:00Z"}
 ],
 reststuecke:[
  {id:21,company_id:"c1",material_name:"Titanzink 0.7 mm",breite_mm:333,laenge_mm:1450,anzahl:1,verbraucht:false,reserviert_fuer_project_id:1,reserviert_von:"u1",reserviert_am:"2026-09-02T08:05:00Z",notiz:"aus Rinne Südseite",created_at:"2026-08-20T10:00:00Z"},
  {id:22,company_id:"c1",material_name:"Kupfer 0.6 mm",breite_mm:500,laenge_mm:2100,anzahl:1,verbraucht:false,reserviert_fuer_project_id:null,reserviert_von:null,reserviert_am:null,notiz:null,created_at:"2026-08-22T10:00:00Z"}
 ],
 measurement_versionen:[
  {id:1,company_id:"c1",measurement_id:11,nummer:1,type:"rinne_halbrund",title:"Rinne Nordseite",project_id:1,data:{material:1,rinneAbwicklung:333,groesse:333,segments:[{laenge:8000}]},freigegeben_von:"u1",freigegeben_am:"2026-08-28T15:10:00Z"},
  {id:2,company_id:"c1",measurement_id:11,nummer:2,type:"rinne_halbrund",title:"Rinne Nordseite",project_id:1,data:{material:1,rinneAbwicklung:333,groesse:333,segments:[{laenge:8000},{laenge:4200}]},freigegeben_von:"u1",freigegeben_am:"2026-08-29T09:45:00Z"}
 ],
 measurement_vorlagen:[
  {id:1,company_id:"c1",name:"Standardrinne Reiheneinfamilienhaus",type:"rinne_halbrund",notiz:"Grösse 333, Titanzink",data:{material:1,rinneAbwicklung:333,groesse:333},created_by:"u1",created_at:"2026-08-10T09:00:00Z",updated_by:"u1",updated_at:"2026-08-10T09:00:00Z"},
  {id:2,company_id:"c1",name:"Lukarne Standard 1.50 m",type:"lukarne",notiz:null,data:{material:1,hoehe:1500,laengeOben:4000,winkel:100,achsabstand:500},created_by:"u2",created_at:"2026-08-24T11:30:00Z",updated_by:"u2",updated_at:"2026-08-24T11:30:00Z"}
 ],
 companies:[{id:"c1",name:"Muster Spenglerei AG",slug:"muster-spenglerei",subscription_status:"active",trial_days:30,trial_started_at:"2026-08-01T00:00:00Z",trial_ends_at:"2026-08-31T00:00:00Z",created_at:"2026-08-01T00:00:00Z",is_active:true}]
};

function filtere(tabelle,filter){
 let rows=(window.__demo[tabelle]||[]).slice();
 filter.forEach(f=>{
  if(f.art==="eq")rows=rows.filter(r=>String(r[f.feld])===String(f.wert));
  if(f.art==="in")rows=rows.filter(r=>f.wert.map(String).indexOf(String(r[f.feld]))>=0);
  if(f.art==="ilike"){const m=String(f.wert).replace(/%/g,"").toLowerCase();
   rows=rows.filter(r=>String(r[f.feld]||"").toLowerCase().indexOf(m)>=0)}
  if(f.art==="or"){const teile=String(f.wert).split(",").map(t=>{
    const g=t.match(/^([a-z_]+)\.ilike\.(.*)$/); return g?{feld:g[1],m:g[2].replace(/%/g,"").toLowerCase()}:null
   }).filter(Boolean);
   rows=rows.filter(r=>teile.some(t=>String(r[t.feld]||"").toLowerCase().indexOf(t.m)>=0))}
 });
 return rows;
}
function bauer(tabelle){
 const filter=[]; let limit=null,order=null,richtung=true,von=null,bis=null;
 const antwort=()=>{
  let rows=filtere(tabelle,filter);
  if(order)rows.sort((a,b)=>String(a[order]||"").localeCompare(String(b[order]||""))*(richtung?1:-1));
  // .range(von,bis) - seit v3.04 blaettert der Verlauf damit (js/23).
  if(von!=null)rows=rows.slice(von,bis!=null?bis+1:undefined);
  if(limit!=null)rows=rows.slice(0,limit);
  return {data:rows,error:null,count:rows.length};
 };
 const b={
  select(){return b},
  eq(feld,wert){filter.push({art:"eq",feld,wert});return b},
  in(feld,wert){filter.push({art:"in",feld,wert});return b},
  or(a){filter.push({art:"or",wert:a});return b},
  ilike(feld,wert){filter.push({art:"ilike",feld,wert});return b},
  neq(){return b}, not(){return b},
  order(feld,opt){order=feld;richtung=!(opt&&opt.ascending===false);return b},
  limit(n){limit=n;return b},
  range(a,e){von=a;bis=e;return b},
  insert(){return b}, update(){return b}, delete(){return b}, upsert(){return b},
  maybeSingle(){const a=antwort();return Promise.resolve({data:a.data[0]||null,error:null})},
  single(){const a=antwort();return Promise.resolve({data:a.data[0]||null,error:null})},
  then(f,g){return Promise.resolve(antwort()).then(f,g)}
 };
 return b;
}
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{},signOut:async()=>({})},
 from:t=>bauer(t),
 rpc:async(name)=>{
   if(name==="admin_alle_massaufnahmen")return {data:window.__demo.adminMass,error:null};
   return {data:null,error:null};
 },
 functions:{invoke:async()=>({data:null,error:null})},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"Demo"}}),
   upload:async()=>({error:null}),remove:async()=>({error:null})})}
})};

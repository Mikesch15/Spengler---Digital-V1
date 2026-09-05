// Supabase-Attrappe fuer die Anleitung: liefert erfundene Demodaten.
// Es wird KEINE Verbindung zur echten Datenbank aufgebaut.
window.__demo={
 projects:[
  {id:1,name:"Sanierung Dach Nord",order_no:"2026-118",customer:"Muster Immobilien AG",object:"Bahnhofstrasse 12, 3011 Bern",archived:false,status:"in_arbeit",created_by:"u1",created_at:"2026-08-14T08:00:00Z",updated_by:"u1",updated_at:"2026-09-02T10:12:00Z"},
  {id:2,name:"Neubau Reiheneinfamilienhaus",order_no:"2026-124",customer:"Bauherr Meier",object:"Sonnhaldenweg 4, 3097 Liebefeld",archived:false,status:"offen",created_by:"u2",created_at:"2026-08-28T07:30:00Z",updated_by:"u2",updated_at:"2026-09-01T15:40:00Z"},
  {id:3,name:"Sturmschaden Kamin",order_no:"2026-131",customer:"Verwaltung Rosenweg",object:"Rosenweg 8, 3006 Bern",archived:false,status:"abgeschlossen",created_by:"u1",created_at:"2026-07-02T09:00:00Z",updated_by:"u1",updated_at:"2026-08-19T16:05:00Z"}
 ],
 measurements:[
  {id:11,project_id:1,type:"rinne_halbrund",title:"Rinne Nordseite",date:"2026-08-29",note:"",data:{},photo_path:null,sketch_paths:[],created_by:"u1",created_at:"2026-08-29T09:10:00Z",updated_by:"u1",updated_at:"2026-08-29T09:40:00Z"},
  {id:12,project_id:1,type:"einlaufblech_gerade",title:"Einlaufblech Traufe Nord",date:"2026-08-29",note:"",data:{},photo_path:null,sketch_paths:[],created_by:"u1",created_at:"2026-08-29T10:00:00Z",updated_by:"u2",updated_at:"2026-09-02T10:12:00Z"},
  {id:13,project_id:1,type:"kehle",title:"Kehle Lukarne Ost",date:"2026-08-30",note:"",data:{},photo_path:null,sketch_paths:[],created_by:"u2",created_at:"2026-08-30T13:20:00Z",updated_by:"u2",updated_at:"2026-08-30T13:55:00Z"}
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
  {id:9,company_id:"c1",user_id:"u2",entity_type:"measurement",entity_id:12,project_id:1,action:"updated",description:"Einlaufblech Traufe Nord",changes:null,created_at:"2026-09-02T10:12:00Z"},
  {id:8,company_id:"c1",user_id:"u1",entity_type:"project",entity_id:1,project_id:1,action:"status_changed",description:"Sanierung Dach Nord",changes:[{field:"status",old:"offen",new:"in_arbeit"}],created_at:"2026-08-29T08:05:00Z"},
  {id:7,company_id:"c1",user_id:"u1",entity_type:"project",entity_id:1,project_id:1,action:"created",description:"Sanierung Dach Nord",changes:null,created_at:"2026-08-14T08:00:00Z"}
 ],
 feedback:[
  {id:31,module:"Massaufnahme",profiles:{first_name:"Beat",last_name:"Muster"},message:"Beim Einlaufblech wäre eine Vorlage für wiederkehrende Dächer praktisch.",created_by:"u2",created_at:"2026-09-02T07:14:00Z",resolved:false},
  {id:30,module:"Regierapport",profiles:{first_name:"Andrea",last_name:"Beispiel"},message:"Die freie Position 999.90 funktioniert gut, danke.",created_by:"u1",created_at:"2026-08-31T16:02:00Z",resolved:true}
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
 const filter=[]; let limit=null,order=null,richtung=true;
 const antwort=()=>{
  let rows=filtere(tabelle,filter);
  if(order)rows.sort((a,b)=>String(a[order]||"").localeCompare(String(b[order]||""))*(richtung?1:-1));
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
 rpc:async()=>({data:null,error:null}),
 functions:{invoke:async()=>({data:null,error:null})},
 storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{message:"Demo"}}),
   upload:async()=>({error:null}),remove:async()=>({error:null})})}
})};

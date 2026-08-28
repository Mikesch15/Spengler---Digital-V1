/* Spengler Digital V1.49 – extracted module; logic unchanged */
function resizeImageFile(file,maxDim,quality,format){
 format=format||"jpeg";
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>{
   const img=new Image();
   img.onload=()=>{
    let w=img.width,h=img.height;
    if(w>maxDim||h>maxDim){
     if(w>h){h=Math.round(h*maxDim/w);w=maxDim}
     else{w=Math.round(w*maxDim/h);h=maxDim}
    }
    const c=document.createElement("canvas");c.width=w;c.height=h;
    c.getContext("2d").drawImage(img,0,0,w,h);
    resolve(c.toDataURL(format==="png"?"image/png":"image/jpeg",quality));
   };
   img.onerror=()=>reject(new Error("Bild konnte nicht gelesen werden."));
   img.src=reader.result;
  };
  reader.onerror=()=>reject(new Error("Datei konnte nicht gelesen werden."));
  reader.readAsDataURL(file);
 });
}
$("measPhotoInput").addEventListener("change",async e=>{
 const file=e.target.files[0];
 if(!file)return;
 try{
  const pq=photoQualitySettings();measPhotoDataUrl=await resizeImageFile(file,pq.maxDim,pq.quality);
  $("measPhotoPreview").src=measPhotoDataUrl;
  $("measPhotoPreview").hidden=false;
  $("measPhotoRemove").hidden=false;
  $("drawOnPhoto").hidden=false;
 }catch(err){alert("Foto konnte nicht geladen werden: "+err.message)}
});

function dataUrlToBlob(dataUrl){
 const [meta,b64]=dataUrl.split(",");
 const mime=meta.match(/data:(.*);base64/)[1];
 const bin=atob(b64);
 const arr=new Uint8Array(bin.length);
 for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
 return new Blob([arr],{type:mime});
}
async function uploadMeasurementImage(dataUrl,kind){
 const blob=dataUrlToBlob(dataUrl);
 const ext=blob.type==="image/png"?"png":"jpg";
 const path=`${kind}/${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
 const {error}=await sb.storage.from("measurements").upload(path,blob,{contentType:blob.type,upsert:false});
 if(error)throw error;
 const {data}=sb.storage.from("measurements").getPublicUrl(path);
 return data.publicUrl;
}

$("measProjectSearch").addEventListener("input",e=>{
 const box=$("measProjectResults");
 box.innerHTML=searchProjects(e.target.value).map(p=>`<div class="item" data-pick-meas-project="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.order_no||"–")} · ${esc(p.customer||"–")}</span></div>`).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});
$("measProjectSearch").addEventListener("focus",e=>{
 e.target.select();
 const box=$("measProjectResults");
 box.innerHTML=searchProjects(e.target.value).map(p=>`<div class="item" data-pick-meas-project="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.order_no||"–")} · ${esc(p.customer||"–")}</span></div>`).join("");
 if(box.innerHTML)positionSuggest(e.target,box);
});

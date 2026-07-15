function loadImageFile(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Could not read image"))};
    img.src=url;
  });
}
function canvasToBlob(canvas,mime,quality){
  return new Promise(resolve=>canvas.toBlob(resolve,mime,mime==="image/png"?undefined:quality));
}
function fmt(bytes){return bytes<1024?`${bytes} B`:bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(2)} MB`}
function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function safeStem(n){return n.replace(/\.[^.]+$/,"").replace(/[^\w.-]+/g,"-")}
async function binarySearchTarget(canvas,mime,targetBytes,maxQuality,onProgress){
  let low=.08,high=Math.max(.1,maxQuality),best=null;
  for(let i=0;i<10;i++){
    const q=(low+high)/2;
    const blob=await canvasToBlob(canvas,mime,q);
    if(onProgress)onProgress(Math.round((i+1)/10*100));
    if(blob.size<=targetBytes){best=blob;low=q}else{high=q}
  }
  if(!best)best=await canvasToBlob(canvas,mime,.08);
  return best;
}
(() => {
  const choose=document.querySelector("#chooseResizeImage"),input=document.querySelector("#resizeImageInput");
  const original=document.querySelector("#resizeOriginalPreview"),output=document.querySelector("#resizeOutputPreview");
  const w=document.querySelector("#resizeWidth"),h=document.querySelector("#resizeHeight"),keep=document.querySelector("#keepAspect");
  const quality=document.querySelector("#resizeQuality"),target=document.querySelector("#resizeTargetKb"),format=document.querySelector("#resizeFormat");
  const previewBtn=document.querySelector("#previewResize"),downloadBtn=document.querySelector("#downloadResize");
  const status=document.querySelector("#resizeStatus"),bar=document.querySelector("#resizeProgress");
  const origSize=document.querySelector("#resizeOriginalSize"),outSize=document.querySelector("#resizeOutputSize"),dims=document.querySelector("#resizeDimensions");
  let file=null,img=null,blob=null;

  choose.onclick=()=>input.click();
  input.onchange=async()=>{
    if(!input.files[0])return;
    file=input.files[0];img=await loadImageFile(file);
    original.src=URL.createObjectURL(file);origSize.textContent=fmt(file.size);
    w.value=img.naturalWidth;h.value=img.naturalHeight;
    previewBtn.disabled=false;downloadBtn.disabled=true;
    status.textContent="Adjust settings and update preview.";
  };

  w.oninput=()=>{if(keep.checked&&img)h.value=Math.round(img.naturalHeight*(+w.value/img.naturalWidth))};
  h.oninput=()=>{if(keep.checked&&img)w.value=Math.round(img.naturalWidth*(+h.value/img.naturalHeight))};

  previewBtn.onclick=async()=>{
    if(!img)return;
    previewBtn.disabled=true;bar.style.width="10%";status.textContent="Rendering preview…";
    try{
      const cw=Math.max(1,+w.value||img.naturalWidth),ch=Math.max(1,+h.value||Math.round(img.naturalHeight*cw/img.naturalWidth));
      const c=document.createElement("canvas");c.width=cw;c.height=ch;c.getContext("2d").drawImage(img,0,0,cw,ch);
      const mime=format.value,maxQ=Math.min(1,Math.max(.1,+quality.value/100));
      blob=target.value?await binarySearchTarget(c,mime,+target.value*1024,maxQ,p=>bar.style.width=`${p}%`):await canvasToBlob(c,mime,maxQ);
      output.src=URL.createObjectURL(blob);outSize.textContent=fmt(blob.size);dims.textContent=`${cw} × ${ch} px`;
      bar.style.width="100%";status.textContent="Preview ready.";downloadBtn.disabled=false;
    }catch(e){status.textContent="Error: "+e.message}
    finally{previewBtn.disabled=false}
  };

  downloadBtn.onclick=()=>{if(!blob||!file)return;const ext=format.value==="image/png"?"png":format.value==="image/webp"?"webp":"jpg";downloadBlob(blob,`${safeStem(file.name)}-resized.${ext}`)};
})();
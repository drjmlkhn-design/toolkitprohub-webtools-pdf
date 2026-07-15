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
  const choose=document.querySelector("#chooseCompressImage"),input=document.querySelector("#compressImageInput");
  const original=document.querySelector("#compressOriginalPreview"),output=document.querySelector("#compressOutputPreview");
  const target=document.querySelector("#compressTargetKb"),quality=document.querySelector("#compressQuality"),format=document.querySelector("#compressFormat");
  const previewBtn=document.querySelector("#previewCompress"),downloadBtn=document.querySelector("#downloadCompress");
  const status=document.querySelector("#compressStatus"),bar=document.querySelector("#compressProgress");
  const origSize=document.querySelector("#compressOriginalSize"),outSize=document.querySelector("#compressOutputSize"),reduction=document.querySelector("#compressReduction");
  let file=null,img=null,blob=null;

  choose.onclick=()=>input.click();
  input.onchange=async()=>{
    if(!input.files[0])return;
    file=input.files[0];img=await loadImageFile(file);
    original.src=URL.createObjectURL(file);origSize.textContent=fmt(file.size);
    previewBtn.disabled=false;downloadBtn.disabled=true;
    status.textContent="Choose target KB and compress.";
  };

  previewBtn.onclick=async()=>{
    if(!img)return;
    previewBtn.disabled=true;status.textContent="Compressing…";bar.style.width="5%";
    try{
      const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext("2d").drawImage(img,0,0);
      const mime=format.value,maxQ=Math.min(1,Math.max(.1,+quality.value/100));
      blob=await binarySearchTarget(c,mime,+target.value*1024,maxQ,p=>bar.style.width=`${p}%`);
      output.src=URL.createObjectURL(blob);outSize.textContent=fmt(blob.size);
      const pct=Math.max(0,Math.round((1-blob.size/file.size)*100));reduction.textContent=`${pct}% smaller`;
      bar.style.width=`${pct}%`;status.textContent=`Compression complete: ${pct}% reduction.`;
      downloadBtn.disabled=false;
    }catch(e){status.textContent="Error: "+e.message}
    finally{previewBtn.disabled=false}
  };

  downloadBtn.onclick=()=>{if(!blob||!file)return;const ext=format.value==="image/webp"?"webp":"jpg";downloadBlob(blob,`${safeStem(file.name)}-compressed.${ext}`)};
})();
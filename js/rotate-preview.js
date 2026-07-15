(() => {
  const input = document.querySelector("#rotatePdfInput");
  const choose = document.querySelector("#chooseRotatePdf");
  const grid = document.querySelector("#rotatePagesGrid");
  const save = document.querySelector("#saveRotatedPdf");
  const clear = document.querySelector("#clearRotatePdf");
  const allLeft = document.querySelector("#rotateAllLeft");
  const allRight = document.querySelector("#rotateAllRight");
  const status = document.querySelector("#rotateStatus");
  const progress = document.querySelector("#rotateProgress");

  let sourceFile = null;
  let sourceBytes = null;
  let pages = [];
  let draggedId = null;

  choose.onclick = () => input.click();
  input.onchange = () => { if(input.files[0]) load(input.files[0]); };

  clear.onclick = () => {
    sourceFile=null; sourceBytes=null; pages=[]; input.value="";
    grid.innerHTML=""; save.disabled=allLeft.disabled=allRight.disabled=true;
    progress.style.width="0%"; status.textContent="Choose a PDF to preview its pages.";
  };

  allLeft.onclick = () => {pages.forEach(p=>p.rotation=(p.rotation-90+360)%360);renderCards()};
  allRight.onclick = () => {pages.forEach(p=>p.rotation=(p.rotation+90)%360);renderCards()};

  async function load(file){
    try{
      status.textContent="Loading PDF…";
      sourceFile=file;
      sourceBytes=new Uint8Array(await file.arrayBuffer());
      const pdf=await pdfjsLib.getDocument({data:sourceBytes.slice()}).promise;
      pages=[];
      for(let i=1;i<=pdf.numPages;i++){
        status.textContent=`Rendering page ${i} of ${pdf.numPages}…`;
        const page=await pdf.getPage(i);
        const viewport=page.getViewport({scale:.45});
        const canvas=document.createElement("canvas");
        canvas.width=viewport.width;canvas.height=viewport.height;
        await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
        pages.push({id:`p-${i}-${Date.now()}`,sourceIndex:i-1,rotation:0,dataUrl:canvas.toDataURL("image/png")});
        progress.style.width=`${Math.round(i/pdf.numPages*100)}%`;
      }
      renderCards();
      save.disabled=allLeft.disabled=allRight.disabled=false;
      status.textContent="Drag pages to reorder. Use rotate buttons on each page.";
    }catch(e){status.textContent="Error: "+e.message}
  }

  function renderCards(){
    grid.innerHTML="";
    pages.forEach((item,index)=>{
      const card=document.createElement("article");
      card.className="page-card";card.draggable=true;card.dataset.id=item.id;
      card.innerHTML=`
        <img src="${item.dataUrl}" style="transform:rotate(${item.rotation}deg)">
        <div class="page-card-meta"><span>Page ${item.sourceIndex+1}</span><span>Order ${index+1}</span></div>
        <div class="page-card-actions">
          <button data-act="left">↺ Left</button>
          <button data-act="right">↻ Right</button>
        </div>`;
      card.querySelector('[data-act="left"]').onclick=e=>{e.stopPropagation();item.rotation=(item.rotation-90+360)%360;renderCards()};
      card.querySelector('[data-act="right"]').onclick=e=>{e.stopPropagation();item.rotation=(item.rotation+90)%360;renderCards()};

      card.ondragstart=()=>{draggedId=item.id;card.classList.add("dragging")};
      card.ondragend=()=>{draggedId=null;card.classList.remove("dragging");document.querySelectorAll(".page-card").forEach(n=>n.classList.remove("drag-over"))};
      card.ondragover=e=>{e.preventDefault();if(draggedId!==item.id)card.classList.add("drag-over")};
      card.ondragleave=()=>card.classList.remove("drag-over");
      card.ondrop=e=>{
        e.preventDefault();card.classList.remove("drag-over");
        const from=pages.findIndex(p=>p.id===draggedId),to=pages.findIndex(p=>p.id===item.id);
        if(from<0||to<0||from===to)return;
        const [m]=pages.splice(from,1);pages.splice(to,0,m);renderCards();
      };
      grid.appendChild(card);
    });
  }

  save.onclick=async()=>{
    if(!sourceBytes)return;
    save.disabled=true;status.textContent="Creating PDF…";
    try{
      const src=await PDFLib.PDFDocument.load(sourceBytes.slice().buffer);
      const out=await PDFLib.PDFDocument.create();
      for(let i=0;i<pages.length;i++){
        status.textContent=`Saving page ${i+1} of ${pages.length}…`;
        const item=pages[i];
        const [copied]=await out.copyPages(src,[item.sourceIndex]);
        copied.setRotation(PDFLib.degrees(item.rotation));
        out.addPage(copied);
        progress.style.width=`${Math.round((i+1)/pages.length*100)}%`;
      }
      download(new Blob([await out.save()],{type:"application/pdf"}),`${stem(sourceFile.name)}-rotated-reordered.pdf`);
      status.textContent="Done — download started.";
    }catch(e){status.textContent="Error: "+e.message}
    finally{save.disabled=false}
  };

  function stem(n){return n.replace(/\.[^.]+$/,"").replace(/[^\w.-]+/g,"-")}
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
})();
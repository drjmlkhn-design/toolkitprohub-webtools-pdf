(() => {
  const input = document.querySelector("#pdfImageInput");
  const choose = document.querySelector("#choosePdfImage");
  const drop = document.querySelector("#pdfImageDrop");
  const fileBox = document.querySelector("#pdfImageFile");
  const countText = document.querySelector("#pdfImagePageCount");
  const fromInput = document.querySelector("#pdfImageFrom");
  const toInput = document.querySelector("#pdfImageTo");
  const format = document.querySelector("#pdfImageFormat");
  const scale = document.querySelector("#pdfImageScale");
  const run = document.querySelector("#convertPdfImages");
  const clear = document.querySelector("#clearPdfImage");
  const bar = document.querySelector("#pdfImageProgress");
  const status = document.querySelector("#pdfImageStatus");

  let file = null;
  let pdf = null;

  choose.onclick = e => { e.preventDefault(); e.stopPropagation(); input.click(); };
  drop.onclick = e => { if (!e.target.closest("button")) input.click(); };
  input.onchange = () => { if (input.files[0]) load(input.files[0]); };

  drop.ondragover = e => { e.preventDefault(); drop.classList.add("tph-dragover"); };
  drop.ondragleave = () => drop.classList.remove("tph-dragover");
  drop.ondrop = e => {
    e.preventDefault();
    drop.classList.remove("tph-dragover");
    if (e.dataTransfer.files[0]) load(e.dataTransfer.files[0]);
  };

  clear.onclick = () => {
    file = null; pdf = null; input.value = "";
    fileBox.innerHTML = ""; countText.textContent = "";
    run.disabled = true; bar.style.width = "0%";
    status.textContent = "Your PDF never leaves your device.";
  };

  async function load(f) {
    if (!(f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))) {
      status.textContent = "Please choose a valid PDF.";
      return;
    }
    try {
      status.textContent = "Reading PDF…";
      const data = new Uint8Array(await f.arrayBuffer());
      pdf = await pdfjsLib.getDocument({data}).promise;
      file = f;
      fileBox.innerHTML = `<div class="file"><span>${esc(f.name)}</span><button id="removePdfImage">×</button></div>`;
      document.querySelector("#removePdfImage").onclick = () => clear.click();
      countText.textContent = `Total pages: ${pdf.numPages}`;
      fromInput.max = toInput.max = pdf.numPages;
      fromInput.value = 1;
      toInput.value = pdf.numPages;
      run.disabled = false;
      status.textContent = "Choose the range and convert.";
    } catch (e) {
      status.textContent = "Error: " + e.message;
    }
  }

  run.onclick = async () => {
    if (!pdf || !file) return;
    let from = +fromInput.value, to = +toInput.value;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < 1 || from > to || to > pdf.numPages) {
      status.textContent = `Choose a valid range between 1 and ${pdf.numPages}.`;
      return;
    }
    run.disabled = true;
    try {
      const total = to - from + 1;
      for (let i = from; i <= to; i++) {
        status.textContent = `Rendering page ${i} of ${to}…`;
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({scale:+scale.value});
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
        const mime = format.value;
        const blob = await new Promise(r => canvas.toBlob(r,mime,mime==="image/jpeg"?.92:undefined));
        download(blob,`${stem(file.name)}-page-${i}.${mime==="image/png"?"png":"jpg"}`);
        const done = i-from+1;
        bar.style.width = `${Math.round(done/total*100)}%`;
        await pause(250);
      }
      status.textContent = "Done — downloads started.";
    } catch(e) {
      status.textContent = "Error: " + e.message;
    } finally {
      run.disabled = false;
    }
  };

  function stem(n){return n.replace(/\.[^.]+$/,"").replace(/[^\w.-]+/g,"-")}
  function esc(v){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
  function pause(ms){return new Promise(r=>setTimeout(r,ms))}
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)}
})();
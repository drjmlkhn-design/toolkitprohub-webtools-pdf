(() => {
  "use strict";

  const input = document.querySelector("#reorderPdfInput");
  const chooseButton = document.querySelector("#chooseReorderPdf");
  const drop = document.querySelector("#reorderDrop");
  const fileBox = document.querySelector("#reorderFileBox");
  const pageCountText = document.querySelector("#reorderPageCount");
  const orderInput = document.querySelector("#pageOrder");
  const runButton = document.querySelector("#reorderPagesButton");
  const clearButton = document.querySelector("#clearReorderPdf");
  const status = document.querySelector("#reorderStatus");

  let selectedFile = null;
  let pageCount = 0;

  chooseButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  });

  drop.addEventListener("click", (event) => {
    if (!event.target.closest("button")) input.click();
  });

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (file) loadFile(file);
  });

  drop.addEventListener("dragover", (event) => {
    event.preventDefault();
    drop.classList.add("tph-dragover");
  });

  drop.addEventListener("dragleave", () => {
    drop.classList.remove("tph-dragover");
  });

  drop.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("tph-dragover");
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  clearButton.addEventListener("click", () => {
    selectedFile = null;
    pageCount = 0;
    input.value = "";
    fileBox.innerHTML = "";
    pageCountText.textContent = "";
    runButton.disabled = true;
    status.textContent = "Your PDF never leaves your device.";
  });

  runButton.addEventListener("click", async () => {
    if (!selectedFile) return;

    runButton.disabled = true;
    status.textContent = "Reordering pages…";

    try {
      const pdfDoc = await PDFLib.PDFDocument.load(
        await selectedFile.arrayBuffer()
      );

      const order = parseOrderedPages(
        orderInput.value,
        pdfDoc.getPageCount()
      );

      if (!order.length) {
        throw new Error("Enter a valid page order.");
      }

      const output = await PDFLib.PDFDocument.create();
      const copied = await output.copyPages(pdfDoc, order);
      copied.forEach((page) => output.addPage(page));

      downloadBlob(
        new Blob([await output.save()], { type: "application/pdf" }),
        `${safeStem(selectedFile.name)}-reordered.pdf`
      );

      status.textContent = "Done — download started.";
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
    } finally {
      runButton.disabled = false;
    }
  });

  async function loadFile(file) {
    if (!isPdf(file)) {
      status.textContent = "Please choose a valid PDF file.";
      return;
    }

    try {
      status.textContent = "Reading PDF…";
      const pdfDoc = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      selectedFile = file;
      pageCount = pdfDoc.getPageCount();

      fileBox.innerHTML = `
        <div class="file">
          <span>${escapeHtml(file.name)}</span>
          <button type="button" id="removeReorderFile">×</button>
        </div>
      `;

      document.querySelector("#removeReorderFile").addEventListener("click", () => {
        clearButton.click();
      });

      pageCountText.textContent = `Total pages: ${pageCount}`;
      orderInput.value = `1-${pageCount}`;
      runButton.disabled = false;
      status.textContent = "Enter the final page order.";
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
    }
  }

  function parseOrderedPages(text, count) {
    const result = [];

    String(text || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const match = part.match(/^(\d+)(?:-(\d+))?$/);
        if (!match) return;

        const start = Number(match[1]);
        const end = Number(match[2] || match[1]);
        const step = start <= end ? 1 : -1;

        for (
          let page = start;
          step > 0 ? page <= end : page >= end;
          page += step
        ) {
          if (page >= 1 && page <= count) {
            result.push(page - 1);
          }
        }
      });

    return result;
  }

  function isPdf(file) {
    return (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  function safeStem(name) {
    return name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-");
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
})();
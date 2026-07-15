(() => {
  "use strict";

  const input = document.querySelector("#pdfInput");
  const chooseButton = document.querySelector("#choosePdf");
  const dropArea = document.querySelector("#pdfDropArea");
  const pageSelect = document.querySelector("#pdfPageSelect");
  const applyMode = document.querySelector("#pdfApplyMode");
  const preview = document.querySelector("#pdfPagePreview");
  const empty = document.querySelector("#pdfEmpty");
  const filename = document.querySelector("#pdfFileName");
  const status = document.querySelector("#pdfStatus");
  const info = document.querySelector("#pdfCropInfo");
  const resetButton = document.querySelector("#resetPdfCrop");
  const downloadButton = document.querySelector("#downloadCroppedPdf");

  let sourceFile = null;
  let sourceBytes = null;
  let pdfPreviewDocument = null;
  let cropper = null;
  let currentPageNumber = 1;
  let renderedWidth = 1;
  let renderedHeight = 1;
  let normalizedCrop = { x: 0, y: 0, width: 1, height: 1 };

  if (!input || !chooseButton) return;

  chooseButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  });

  dropArea.addEventListener("click", (event) => {
    if (!event.target.closest(".cropper-container")) {
      input.click();
    }
  });

  dropArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropArea.classList.add("tph-dragover");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("tph-dragover");
  });

  dropArea.addEventListener("drop", (event) => {
    event.preventDefault();
    dropArea.classList.remove("tph-dragover");
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) loadPdfFile(file);
  });

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (file) loadPdfFile(file);
  });

  async function loadPdfFile(file) {
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      status.textContent = "Please choose a valid PDF file.";
      return;
    }

    if (!window.pdfjsLib) {
      status.textContent = "PDF preview library failed to load. Refresh the page and try again.";
      return;
    }

    try {
      sourceFile = file;
      filename.textContent = file.name;
      status.textContent = "Loading PDF…";
      sourceBytes = new Uint8Array(await file.arrayBuffer());

      pdfPreviewDocument = await window.pdfjsLib
        .getDocument({ data: sourceBytes.slice() })
        .promise;

      pageSelect.innerHTML = "";

      for (let pageNumber = 1; pageNumber <= pdfPreviewDocument.numPages; pageNumber++) {
        const option = document.createElement("option");
        option.value = String(pageNumber);
        option.textContent = `Page ${pageNumber}`;
        pageSelect.appendChild(option);
      }

      pageSelect.disabled = false;
      applyMode.disabled = false;
      resetButton.disabled = false;
      downloadButton.disabled = false;
      currentPageNumber = 1;
      normalizedCrop = { x: 0, y: 0, width: 1, height: 1 };

      await renderPage(1);
      status.textContent = "Drag and resize the crop box.";
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
    }
  }

  pageSelect.addEventListener("change", async () => {
    saveNormalizedCrop();
    currentPageNumber = Number(pageSelect.value);
    await renderPage(currentPageNumber);
  });

  resetButton.addEventListener("click", () => {
    normalizedCrop = { x: 0, y: 0, width: 1, height: 1 };
    if (cropper) cropper.reset();
    updateCropInfo();
  });

  downloadButton.addEventListener("click", async () => {
    if (!sourceFile || !sourceBytes || !cropper) return;
    if (!window.PDFLib) {
      status.textContent = "PDF processing library failed to load.";
      return;
    }

    saveNormalizedCrop();
    downloadButton.disabled = true;
    status.textContent = "Cropping PDF…";

    try {
      const pdfDoc = await PDFLib.PDFDocument.load(sourceBytes.slice().buffer);
      const pages = pdfDoc.getPages();

      const targetIndices =
        applyMode.value === "all"
          ? pages.map((_, index) => index)
          : [currentPageNumber - 1];

      targetIndices.forEach((index) => {
        const page = pages[index];
        const { width, height } = page.getSize();

        const cropX = normalizedCrop.x * width;
        const cropWidth = normalizedCrop.width * width;
        const cropHeight = normalizedCrop.height * height;
        const cropY =
          height - (normalizedCrop.y + normalizedCrop.height) * height;

        page.setCropBox(cropX, cropY, cropWidth, cropHeight);
      });

      const bytes = await pdfDoc.save();
      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        `${safeStem(sourceFile.name)}-cropped.pdf`
      );
      status.textContent = "Done — download started.";
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
    } finally {
      downloadButton.disabled = false;
    }
  });

  async function renderPage(pageNumber) {
    status.textContent = `Rendering page ${pageNumber}…`;

    const page = await pdfPreviewDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport
    }).promise;

    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    preview.src = canvas.toDataURL("image/png");
    preview.hidden = false;
    empty.hidden = true;

    await new Promise((resolve) => {
      if (preview.complete) resolve();
      else preview.onload = resolve;
    });

    renderedWidth = canvas.width;
    renderedHeight = canvas.height;

    cropper = new Cropper(preview, {
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 0.9,
      background: false,
      responsive: true,
      movable: true,
      zoomable: true,
      rotatable: false,
      scalable: false,
      ready() {
        cropper.setData({
          x: normalizedCrop.x * renderedWidth,
          y: normalizedCrop.y * renderedHeight,
          width: normalizedCrop.width * renderedWidth,
          height: normalizedCrop.height * renderedHeight
        });
      },
      crop() {
        saveNormalizedCrop();
      }
    });

    info.hidden = false;
    updateCropInfo();
  }

  function saveNormalizedCrop() {
    if (!cropper) return;

    const data = cropper.getData(true);
    normalizedCrop = {
      x: clamp(data.x / renderedWidth),
      y: clamp(data.y / renderedHeight),
      width: clamp(data.width / renderedWidth),
      height: clamp(data.height / renderedHeight)
    };

    normalizedCrop.width = Math.min(normalizedCrop.width, 1 - normalizedCrop.x);
    normalizedCrop.height = Math.min(normalizedCrop.height, 1 - normalizedCrop.y);
    updateCropInfo();
  }

  function updateCropInfo() {
    document.querySelector("#pdfCropLeft").textContent =
      `${Math.round(normalizedCrop.x * 100)}%`;
    document.querySelector("#pdfCropTop").textContent =
      `${Math.round(normalizedCrop.y * 100)}%`;
    document.querySelector("#pdfCropWidth").textContent =
      `${Math.round(normalizedCrop.width * 100)}%`;
    document.querySelector("#pdfCropHeight").textContent =
      `${Math.round(normalizedCrop.height * 100)}%`;
  }

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function safeStem(name) {
    return name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-");
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
})();
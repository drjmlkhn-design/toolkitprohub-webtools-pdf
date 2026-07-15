const TOOL_CONFIG = {
  merge: {
    title: "Merge PDF",
    icon: "📚",
    kind: "pdf",
    multiple: true,
    description: "Select two or more PDFs and combine them into one document."
  },
  split: {
    title: "Split PDF",
    icon: "✂️",
    kind: "pdf",
    multiple: true,
    description: "Select one or more PDFs and extract the same From–To page range from each file."
  },
  delete: {
    title: "Delete PDF Pages",
    icon: "🗑️",
    kind: "pdf",
    multiple: false,
    description: "Enter the pages to remove, for example 1,3-5."
  },
  reorder: {
    title: "Reorder PDF Pages",
    icon: "↕️",
    kind: "pdf",
    multiple: false,
    description: "Enter the new page order, for example 3,1,2."
  },
  rotate: {
    title: "Rotate PDF",
    icon: "↻",
    kind: "pdf",
    multiple: true,
    description: "Rotate every page in each selected PDF by 90 degrees."
  },
  cropPdf: {
    title: "Crop PDF",
    icon: "▣",
    kind: "pdf",
    multiple: true,
    description: "Crop a small outer margin from every page in each selected PDF."
  },
  imageToPdf: {
    title: "Image to PDF",
    icon: "🖼️",
    kind: "image",
    multiple: true,
    description: "Combine one or more images into a single PDF."
  },
  pdfToImage: {
    title: "PDF to Image",
    icon: "▧",
    kind: "pdf",
    multiple: false,
    description: "Convert every page of one PDF into PNG images."
  },
  cropImage: {
    title: "Crop Image",
    icon: "✂",
    kind: "image",
    multiple: true,
    description: "Crop 10% from each outer edge of every selected image."
  },
  resize: {
    title: "Resize Image",
    icon: "⤢",
    kind: "image",
    multiple: true,
    description: "Set the desired width and optional height for each selected image."
  },
  compress: {
    title: "Compress Image",
    icon: "🗜",
    kind: "image",
    multiple: true,
    description: "Reduce image file size using your selected quality level."
  }
};

const toolType = document.body.dataset.tool;

if (toolType && TOOL_CONFIG[toolType]) {
  initializeTool(toolType, TOOL_CONFIG[toolType]);
}

function initializeTool(type, config) {
  const $ = (selector) => document.querySelector(selector);
  let selectedFiles = [];

  document.title = `${config.title} · Toolkit Pro Hub`;
  $("#title").textContent = `${config.icon} ${config.title}`;
  $("#desc").textContent = config.description;
  $("#kind").textContent = config.kind === "pdf" ? "PDF files" : "images";

  const input = $("#input");
  const drop = $("#drop");

  input.accept =
    config.kind === "pdf" ? "application/pdf,.pdf" : "image/*";
  input.multiple = config.multiple;

  document.querySelectorAll(".split-option").forEach((element) => {
    element.hidden = type !== "split";
  });

  const pagesOption = $(".pages-option");
  pagesOption.hidden = !["delete", "reorder"].includes(type);

  $(".width-option").hidden = type !== "resize";
  $(".height-option").hidden = type !== "resize";
  $(".quality-option").hidden = type !== "compress";

  function renderFiles() {
    const box = $("#files");

    box.innerHTML = selectedFiles
      .map(
        (file, index) => `
          <div class="file">
            <span title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
            <button type="button" data-index="${index}" aria-label="Remove file">×</button>
          </div>
        `
      )
      .join("");

    box.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        selectedFiles.splice(Number(button.dataset.index), 1);
        renderFiles();
      });
    });

    const runButton = $("#run");
    runButton.hidden = selectedFiles.length === 0;

    if (selectedFiles.length > 1 && type !== "merge") {
      runButton.textContent = `Process ${selectedFiles.length} files`;
    } else {
      runButton.textContent = "Process file";
    }
  }

  function addFiles(fileList) {
    const acceptedFiles = [...fileList].filter((file) => {
      if (config.kind === "pdf") {
        return (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        );
      }

      return file.type.startsWith("image/");
    });

    if (!config.multiple) {
      selectedFiles = acceptedFiles.slice(0, 1);
    } else {
      selectedFiles.push(...acceptedFiles);
    }

    renderFiles();
  }

  $("#choose").addEventListener("click", (event) => {
    event.stopPropagation();
    input.click();
  });

  drop.addEventListener("click", (event) => {
    if (!event.target.closest("button")) {
      input.click();
    }
  });

  input.addEventListener("change", (event) => {
    addFiles(event.target.files);
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
    addFiles(event.dataTransfer.files);
  });

  $("#clear").addEventListener("click", () => {
    selectedFiles = [];
    input.value = "";
    $("#note").textContent = "Your files never leave your device.";
    renderFiles();
  });

  $("#run").addEventListener("click", async () => {
    const runButton = $("#run");
    const note = $("#note");

    runButton.disabled = true;
    note.textContent = "Processing…";

    try {
      if (config.kind === "pdf") {
        await handlePdfTool(type, selectedFiles, updateStatus);
      } else {
        await handleImageTool(type, selectedFiles, updateStatus);
      }

      note.textContent =
        selectedFiles.length > 1 && type !== "merge" && type !== "imageToPdf"
          ? `Done — ${selectedFiles.length} downloads started.`
          : "Done — download started.";
    } catch (error) {
      console.error(error);
      note.textContent = `Error: ${error.message}`;
    } finally {
      runButton.disabled = false;
    }

    function updateStatus(message) {
      note.textContent = message;
    }
  });
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

function safeStem(filename) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-");
}

function downloadFile(data, filename, mimeType) {
  const blob =
    data instanceof Blob ? data : new Blob([data], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parsePages(text, pageCount) {
  const pages = [];

  String(text || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const match = part.match(/^(\d+)(?:-(\d+))?$/);

      if (!match) {
        return;
      }

      const start = Number(match[1]);
      const end = Number(match[2] || match[1]);

      if (start > end) {
        return;
      }

      for (let page = start; page <= end; page += 1) {
        if (page >= 1 && page <= pageCount) {
          pages.push(page - 1);
        }
      }
    });

  return pages;
}

async function handlePdfTool(operation, files, updateStatus) {
  if (!window.PDFLib && operation !== "pdfToImage") {
    throw new Error("PDF library did not load.");
  }

  if (operation === "merge") {
    if (files.length < 2) {
      throw new Error("Select at least two PDF files.");
    }

    const output = await PDFLib.PDFDocument.create();

    for (let index = 0; index < files.length; index += 1) {
      updateStatus(`Adding PDF ${index + 1} of ${files.length}…`);

      const source = await PDFLib.PDFDocument.load(
        await files[index].arrayBuffer()
      );

      const copiedPages = await output.copyPages(
        source,
        source.getPageIndices()
      );

      copiedPages.forEach((page) => output.addPage(page));
    }

    downloadFile(
      await output.save(),
      "merged.pdf",
      "application/pdf"
    );

    return;
  }

  if (operation === "pdfToImage") {
    await convertPdfToImages(files[0], updateStatus);
    return;
  }

  if (operation === "split") {
    await splitMultiplePdfs(files, updateStatus);
    return;
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    updateStatus(`Processing PDF ${index + 1} of ${files.length}…`);

    const pdfDoc = await PDFLib.PDFDocument.load(
      await file.arrayBuffer()
    );

    const pageCount = pdfDoc.getPageCount();
    const stem = safeStem(file.name);

    if (operation === "rotate") {
      pdfDoc.getPages().forEach((page) => {
        const currentAngle = page.getRotation().angle;
        page.setRotation(
          PDFLib.degrees((currentAngle + 90) % 360)
        );
      });

      downloadFile(
        await pdfDoc.save(),
        `${stem}-rotated.pdf`,
        "application/pdf"
      );

      await pause(350);
      continue;
    }

    if (operation === "cropPdf") {
      pdfDoc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        const marginX = width * 0.05;
        const marginY = height * 0.05;

        page.setCropBox(
          marginX,
          marginY,
          width - marginX * 2,
          height - marginY * 2
        );
      });

      downloadFile(
        await pdfDoc.save(),
        `${stem}-cropped.pdf`,
        "application/pdf"
      );

      await pause(350);
      continue;
    }

    const pagesText =
      document.querySelector("#pages").value;

    let selectedPages = parsePages(
      pagesText,
      pageCount
    );

    if (!selectedPages.length) {
      throw new Error(
        `Enter valid pages for ${file.name}, for example 1,3-5.`
      );
    }

    if (operation === "delete") {
      const removalSet = new Set(selectedPages);

      selectedPages = pdfDoc
        .getPageIndices()
        .filter((pageIndex) => !removalSet.has(pageIndex));

      if (!selectedPages.length) {
        throw new Error(
          `You cannot delete every page from ${file.name}.`
        );
      }
    }

    const output = await PDFLib.PDFDocument.create();
    const copiedPages = await output.copyPages(
      pdfDoc,
      selectedPages
    );

    copiedPages.forEach((page) => output.addPage(page));

    const outputName =
      operation === "delete"
        ? `${stem}-pages-deleted.pdf`
        : `${stem}-reordered.pdf`;

    downloadFile(
      await output.save(),
      outputName,
      "application/pdf"
    );

    await pause(350);
  }
}

async function splitMultiplePdfs(files, updateStatus) {
  const fromPage = Number(
    document.querySelector("#fromPage").value
  );

  const toPage = Number(
    document.querySelector("#toPage").value
  );

  if (!Number.isInteger(fromPage) || !Number.isInteger(toPage)) {
    throw new Error("Enter valid From and To page numbers.");
  }

  if (fromPage < 1 || toPage < 1) {
    throw new Error("Page numbers must start from 1.");
  }

  if (fromPage > toPage) {
    throw new Error(
      "From page cannot be greater than To page."
    );
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    updateStatus(
      `Splitting PDF ${index + 1} of ${files.length}…`
    );

    const source = await PDFLib.PDFDocument.load(
      await file.arrayBuffer()
    );

    const pageCount = source.getPageCount();

    if (fromPage > pageCount) {
      throw new Error(
        `${file.name} has only ${pageCount} pages.`
      );
    }

    const actualToPage = Math.min(toPage, pageCount);
    const selectedIndices = [];

    for (
      let page = fromPage;
      page <= actualToPage;
      page += 1
    ) {
      selectedIndices.push(page - 1);
    }

    const output = await PDFLib.PDFDocument.create();
    const copiedPages = await output.copyPages(
      source,
      selectedIndices
    );

    copiedPages.forEach((page) => output.addPage(page));

    downloadFile(
      await output.save(),
      `${safeStem(file.name)}-pages-${fromPage}-to-${actualToPage}.pdf`,
      "application/pdf"
    );

    await pause(350);
  }
}

async function handleImageTool(operation, files, updateStatus) {
  if (operation === "imageToPdf") {
    await convertImagesToPdf(files, updateStatus);
    return;
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    updateStatus(
      `Processing image ${index + 1} of ${files.length}…`
    );

    const image = await loadImage(file);

    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = image.width;
    let sourceHeight = image.height;
    let outputWidth = image.width;
    let outputHeight = image.height;

    if (operation === "resize") {
      const requestedWidth = Number(
        document.querySelector("#width").value
      );

      const requestedHeight = Number(
        document.querySelector("#height").value
      );

      outputWidth = requestedWidth || image.width;

      outputHeight =
        requestedHeight ||
        Math.round(
          (image.height * outputWidth) / image.width
        );
    }

    if (operation === "cropImage") {
      sourceX = Math.round(image.width * 0.1);
      sourceY = Math.round(image.height * 0.1);
      sourceWidth = Math.round(image.width * 0.8);
      sourceHeight = Math.round(image.height * 0.8);
      outputWidth = sourceWidth;
      outputHeight = sourceHeight;
    }

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const quality =
      operation === "compress"
        ? Number(document.querySelector("#quality").value)
        : 0.92;

    const blob = await new Promise((resolve) => {
      canvas.toBlob(
        resolve,
        "image/jpeg",
        quality
      );
    });

    if (!blob) {
      throw new Error("Image conversion failed.");
    }

    downloadFile(
      blob,
      `${safeStem(file.name)}-${operation}.jpg`,
      "image/jpeg"
    );

    await pause(300);
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(`Could not read ${file.name}.`)
      );
    };

    image.src = url;
  });
}

async function convertImagesToPdf(files, updateStatus) {
  if (!window.PDFLib) {
    throw new Error("PDF library did not load.");
  }

  const output = await PDFLib.PDFDocument.create();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];

    updateStatus(
      `Adding image ${index + 1} of ${files.length}…`
    );

    const bytes = await file.arrayBuffer();
    const lowerName = file.name.toLowerCase();

    let embeddedImage;

    if (
      file.type === "image/png" ||
      lowerName.endsWith(".png")
    ) {
      embeddedImage = await output.embedPng(bytes);
    } else {
      embeddedImage = await output.embedJpg(bytes);
    }

    const page = output.addPage([
      embeddedImage.width,
      embeddedImage.height
    ]);

    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: embeddedImage.width,
      height: embeddedImage.height
    });
  }

  downloadFile(
    await output.save(),
    "images-to-pdf.pdf",
    "application/pdf"
  );
}

async function convertPdfToImages(file, updateStatus) {
  if (!window.pdfjsLib) {
    throw new Error("PDF.js library did not load.");
  }

  const data = new Uint8Array(
    await file.arrayBuffer()
  );

  const pdf = await window.pdfjsLib
    .getDocument({ data })
    .promise;

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber += 1
  ) {
    updateStatus(
      `Rendering page ${pageNumber} of ${pdf.numPages}…`
    );

    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.7 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport
    }).promise;

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });

    if (!blob) {
      throw new Error(
        `Could not render page ${pageNumber}.`
      );
    }

    downloadFile(
      blob,
      `${safeStem(file.name)}-page-${pageNumber}.png`,
      "image/png"
    );

    await pause(300);
  }
}
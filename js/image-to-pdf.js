(() => {
  "use strict";

  const input = document.querySelector("#imageInput");
  const chooseButton = document.querySelector("#chooseImages");
  const drop = document.querySelector("#imageDrop");
  const grid = document.querySelector("#sortableGrid");
  const createButton = document.querySelector("#createPdf");
  const clearButton = document.querySelector("#clearImages");
  const status = document.querySelector("#imagePdfStatus");
  const sortHelp = document.querySelector("#sortHelp");

  let items = [];
  let draggedId = null;

  chooseButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    input.click();
  });

  drop.addEventListener("click", (event) => {
    if (!event.target.closest("button")) input.click();
  });

  input.addEventListener("change", () => {
    addFiles(input.files);
    input.value = "";
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

  clearButton.addEventListener("click", () => {
    items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    items = [];
    render();
    status.textContent = "Your images never leave your device.";
  });

  createButton.addEventListener("click", async () => {
    if (!items.length) return;

    if (!window.PDFLib) {
      status.textContent = "PDF library failed to load.";
      return;
    }

    createButton.disabled = true;
    status.textContent = "Creating PDF…";

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        status.textContent = `Adding image ${index + 1} of ${items.length}…`;

        const bytes = await item.file.arrayBuffer();
        const lowerName = item.file.name.toLowerCase();
        let image;

        if (
          item.file.type === "image/png" ||
          lowerName.endsWith(".png")
        ) {
          image = await pdfDoc.embedPng(bytes);
        } else if (
          item.file.type === "image/jpeg" ||
          item.file.type === "image/jpg" ||
          lowerName.endsWith(".jpg") ||
          lowerName.endsWith(".jpeg")
        ) {
          image = await pdfDoc.embedJpg(bytes);
        } else {
          const converted = await convertToJpeg(item.file);
          image = await pdfDoc.embedJpg(await converted.arrayBuffer());
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height
        });
      }

      const pdfBytes = await pdfDoc.save();
      downloadBlob(
        new Blob([pdfBytes], { type: "application/pdf" }),
        "images-to-pdf.pdf"
      );

      status.textContent = "Done — download started.";
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
    } finally {
      createButton.disabled = false;
    }
  });

  function addFiles(fileList) {
    const validFiles = [...fileList].filter((file) =>
      file.type.startsWith("image/")
    );

    validFiles.forEach((file) => {
      items.push({
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file)
      });
    });

    render();
  }

  function render() {
    grid.innerHTML = "";

    items.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "sortable-card";
      card.draggable = true;
      card.dataset.id = item.id;

      card.innerHTML = `
        <button class="sortable-remove" type="button" aria-label="Remove image">×</button>
        <div class="sortable-thumb">
          <img src="${item.previewUrl}" alt="${escapeHtml(item.file.name)}">
        </div>
        <div class="sortable-meta">
          <span class="sortable-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span>
          <span class="sortable-index">${index + 1}</span>
        </div>
      `;

      card.querySelector(".sortable-remove").addEventListener("click", () => {
        const found = items.find((entry) => entry.id === item.id);
        if (found) URL.revokeObjectURL(found.previewUrl);
        items = items.filter((entry) => entry.id !== item.id);
        render();
      });

      card.addEventListener("dragstart", () => {
        draggedId = item.id;
        card.classList.add("dragging");
      });

      card.addEventListener("dragend", () => {
        draggedId = null;
        card.classList.remove("dragging");
        document.querySelectorAll(".sortable-card").forEach((node) => {
          node.classList.remove("drag-over");
        });
      });

      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        if (draggedId && draggedId !== item.id) {
          card.classList.add("drag-over");
        }
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over");
      });

      card.addEventListener("drop", (event) => {
        event.preventDefault();
        card.classList.remove("drag-over");

        if (!draggedId || draggedId === item.id) return;

        const fromIndex = items.findIndex((entry) => entry.id === draggedId);
        const toIndex = items.findIndex((entry) => entry.id === item.id);

        if (fromIndex < 0 || toIndex < 0) return;

        const [moved] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, moved);
        render();
      });

      grid.appendChild(card);
    });

    createButton.hidden = items.length === 0;
    sortHelp.hidden = items.length < 2;

    createButton.textContent =
      items.length > 1
        ? `Create PDF from ${items.length} images`
        : "Create PDF";
  }

  function convertToJpeg(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext("2d").drawImage(image, 0, 0);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) resolve(blob);
            else reject(new Error(`Could not convert ${file.name}.`));
          },
          "image/jpeg",
          0.94
        );
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Could not read ${file.name}.`));
      };

      image.src = url;
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

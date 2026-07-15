(() => {
  "use strict";

  const input = document.querySelector("#pdfInput");
  const chooseButton = document.querySelector("#choosePdfs");
  const drop = document.querySelector("#pdfDrop");
  const grid = document.querySelector("#pdfSortableGrid");
  const mergeButton = document.querySelector("#mergePdfs");
  const clearButton = document.querySelector("#clearPdfs");
  const status = document.querySelector("#mergeStatus");
  const sortHelp = document.querySelector("#pdfSortHelp");

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
    items = [];
    render();
    status.textContent = "Your PDFs never leave your device.";
  });

  mergeButton.addEventListener("click", async () => {
    if (items.length < 2) {
      status.textContent = "Select at least two PDF files.";
      return;
    }

    if (!window.PDFLib) {
      status.textContent = "PDF library failed to load.";
      return;
    }

    mergeButton.disabled = true;
    status.textContent = "Merging PDFs…";

    try {
      const output = await PDFLib.PDFDocument.create();

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        status.textContent = `Adding PDF ${index + 1} of ${items.length}…`;

        const source = await PDFLib.PDFDocument.load(
          await item.file.arrayBuffer()
        );

        const copiedPages = await output.copyPages(
          source,
          source.getPageIndices()
        );

        copiedPages.forEach((page) => output.addPage(page));
      }

      const bytes = await output.save();
      downloadBlob(
        new Blob([bytes], { type: "application/pdf" }),
        "merged.pdf"
      );

      status.textContent = "Done — download started.";
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
    } finally {
      mergeButton.disabled = false;
    }
  });

  function addFiles(fileList) {
    const validFiles = [...fileList].filter((file) =>
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );

    validFiles.forEach((file) => {
      items.push({
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
        file
      });
    });

    render();
  }

  function render() {
    grid.innerHTML = "";

    items.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "pdf-sortable-card";
      card.draggable = true;
      card.dataset.id = item.id;

      card.innerHTML = `
        <button class="pdf-sortable-remove" type="button" aria-label="Remove PDF">×</button>
        <div class="pdf-sortable-icon">📄</div>
        <div class="pdf-sortable-meta">
          <span class="pdf-sortable-name" title="${escapeHtml(item.file.name)}">${escapeHtml(item.file.name)}</span>
          <span class="pdf-sortable-index">${index + 1}</span>
        </div>
        <div class="pdf-sortable-size">${formatBytes(item.file.size)}</div>
      `;

      card.querySelector(".pdf-sortable-remove").addEventListener("click", () => {
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
        document.querySelectorAll(".pdf-sortable-card").forEach((node) => {
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

    mergeButton.hidden = items.length < 2;
    sortHelp.hidden = items.length < 2;

    mergeButton.textContent =
      items.length >= 2
        ? `Merge ${items.length} PDFs`
        : "Merge PDFs";
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
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


(() => {
  "use strict";

  const input = document.querySelector("#imageInput");
  const chooseButton = document.querySelector("#chooseImage");
  const preview = document.querySelector("#cropImagePreview");
  const empty = document.querySelector("#imageEmpty");
  const filename = document.querySelector("#imageFileName");
  const ratio = document.querySelector("#imageRatio");
  const format = document.querySelector("#imageFormat");
  const status = document.querySelector("#imageStatus");
  const info = document.querySelector("#imageCropInfo");

  const rotateLeft = document.querySelector("#rotateLeft");
  const rotateRight = document.querySelector("#rotateRight");
  const resetButton = document.querySelector("#resetImageCrop");
  const downloadButton = document.querySelector("#downloadCroppedImage");

  let cropper = null;
  let sourceFile = null;
  let sourceUrl = "";

  chooseButton.addEventListener("click", () => input.click());

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      status.textContent = "Please choose a valid image file.";
      return;
    }

    sourceFile = file;
    filename.textContent = file.name;
    status.textContent = "Loading preview…";

    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    if (sourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }

    sourceUrl = URL.createObjectURL(file);
    preview.src = sourceUrl;
    preview.hidden = false;
    empty.hidden = true;

    preview.onload = () => {
      cropper = new Cropper(preview, {
        viewMode: 1,
        dragMode: "move",
        autoCropArea: 0.82,
        responsive: true,
        background: false,
        movable: true,
        zoomable: true,
        rotatable: true,
        scalable: false,
        crop(event) {
          document.querySelector("#cropX").textContent =
            Math.round(event.detail.x);
          document.querySelector("#cropY").textContent =
            Math.round(event.detail.y);
          document.querySelector("#cropWidth").textContent =
            Math.round(event.detail.width);
          document.querySelector("#cropHeight").textContent =
            Math.round(event.detail.height);
        }
      });

      info.hidden = false;
      rotateLeft.disabled = false;
      rotateRight.disabled = false;
      resetButton.disabled = false;
      downloadButton.disabled = false;
      status.textContent = "Drag and resize the crop box.";
    };
  });

  ratio.addEventListener("change", () => {
    if (!cropper) return;
    cropper.setAspectRatio(
      ratio.value === "free" ? NaN : Number(ratio.value)
    );
  });

  rotateLeft.addEventListener("click", () => {
    if (cropper) cropper.rotate(-90);
  });

  rotateRight.addEventListener("click", () => {
    if (cropper) cropper.rotate(90);
  });

  resetButton.addEventListener("click", () => {
    if (cropper) {
      cropper.reset();
      cropper.setAspectRatio(
        ratio.value === "free" ? NaN : Number(ratio.value)
      );
    }
  });

  downloadButton.addEventListener("click", async () => {
    if (!cropper || !sourceFile) return;

    status.textContent = "Preparing cropped image…";
    downloadButton.disabled = true;

    try {
      const mimeType = format.value;
      const canvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high"
      });

      const blob = await new Promise((resolve) => {
        canvas.toBlob(
          resolve,
          mimeType,
          mimeType === "image/png" ? undefined : 0.92
        );
      });

      if (!blob) {
        throw new Error("Could not create the cropped image.");
      }

      const extension =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
          ? "webp"
          : "jpg";

      downloadBlob(
        blob,
        `${safeStem(sourceFile.name)}-cropped.${extension}`
      );

      status.textContent = "Done — download started.";
    } catch (error) {
      console.error(error);
      status.textContent = `Error: ${error.message}`;
    } finally {
      downloadButton.disabled = false;
    }
  });

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

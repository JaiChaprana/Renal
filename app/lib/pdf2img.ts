// app/lib/pdf2img.ts
// Vite + React + TS version (no public/ worker copy needed)
// Uses Vite asset URL import for the PDF.js worker. [web:31][web:37]

import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"; // Vite turns this into a real URL at build time. [web:31]

export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
  if (pdfjsLib) return pdfjsLib;
  if (loadPromise) return loadPromise;

  loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
    // Must be set before calling getDocument to avoid “fake worker” issues. [web:59][web:31]
    lib.GlobalWorkerOptions.workerSrc = workerUrl; // [web:31][web:37]
    pdfjsLib = lib;
    return lib;
  });

  return loadPromise;
}

export async function convertPdfToImage(
  file: File
): Promise<PdfConversionResult> {
  try {
    const lib = await loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await lib.getDocument({ data: arrayBuffer }).promise; // Rendering from ArrayBuffer is supported. [web:13]
    const page = await pdf.getPage(1);

    const scale = 4;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        imageUrl: "",
        file: null,
        error: "Canvas 2D context not available",
      };
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    context.imageSmoothingEnabled = true;

    await page.render({ canvasContext: context, viewport }).promise;

    return await new Promise<PdfConversionResult>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({
              imageUrl: "",
              file: null,
              error: "Failed to create image blob",
            });
            return;
          }

          const originalName = file.name.replace(/\.pdf$/i, "");
          const imageFile = new File([blob], `${originalName}.png`, {
            type: "image/png",
          });

          resolve({
            imageUrl: URL.createObjectURL(blob),
            file: imageFile,
          });
        },
        "image/png",
        1.0 // Quality argument is accepted for image types like image/jpeg; PNG ignores quality in many browsers. [web:64]
      );
    });
  } catch (err) {
    return {
      imageUrl: "",
      file: null,
      error: `Failed to convert PDF: ${String(err)}`,
    };
  }
}

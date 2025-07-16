// utils/pdfUtils.ts
import { PDFDocument } from 'pdf-lib';

export async function addSignatureToPdf(
  pdfUrl: string,
  signatureDataUrl: string,
  x: number , // PDF coordinate
  y: number, // PDF coordinate
  pageNumber: number,
  signatureWidth: number , // Desired width of signature on PDF
  signatureHeight: number // Desired height of signature on PDF
) {
  // Fetch the existing PDF
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  // Embed the signature image
  // Note: `fetch` might fail if `signatureDataUrl` is too long (browser URL limit)
  // Consider passing `signatureImageBytes` directly if you have them,
  // or using a Blob/File object if the signature is large.
  const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes); // Assuming PNG from Signer.tsx

  // Get the specific page
  const pages = pdfDoc.getPages();
  const page = pages[pageNumber - 1]; // pageNumber is 1-indexed for users, 0-indexed for array

  // Draw the image on the page
  page.drawImage(signatureImage, {
    x: x ,
    y: y,
    width: signatureWidth,
    height: signatureHeight,
  });

  // Serialize the PDFDocument to bytes
  const modifiedPdfBytes = await pdfDoc.save();

  return modifiedPdfBytes; // This will be a Uint8Array
}
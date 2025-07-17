import { PDFDocument } from 'pdf-lib';

// herer 
export async function addSignatureToPdf(
  pdfUrl: string,
  signatureDataUrl: string,
  x: number , // PDF coordinate
  y: number, // PDF coordinate
  pageNumber: number,
  signatureWidth: number , //  width of signature on PDF
  signatureHeight: number // height of signature on PDF
) {
  // Fetch the existing PDF
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes); // Assuming PNG from Signer.tsx

  // Get the specific page
  const pages = pdfDoc.getPages();
  const page = pages[pageNumber - 1]; 

  // Draw the image on the page
  page.drawImage(signatureImage, {
    x: x ,
    y: y,
    width: signatureWidth,
    height: signatureHeight,
  });

  // Serialize the PDFDocument to bytes
  const modifiedPdfBytes = await pdfDoc.save();

  return modifiedPdfBytes; 
}
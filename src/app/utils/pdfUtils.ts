import { PDFDocument } from 'pdf-lib';

// herer 
export async function addSignatureToPdf(
  pdfUrl: string,
  signatureDataUrl: string,
  x: number, // PDF coordinate
  y: number, // PDF coordinate
  pageNumber: number,
  signatureWidth: number, //  width of signature on PDF
  signatureHeight: number, // height of signature on PDF
  reactPdfDimensions: { width: number; height: number }
) {
  // Fetch the existing PDF
  const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes); // Assuming PNG from Signer.tsx

  // Get the specific page
  const pages = pdfDoc.getPages();
  const page = pages[pageNumber - 1];

  // Get the actual PDF page dimensions (these are the correct ones)
  const actualPageWidth = page.getWidth();
  const actualPageHeight = page.getHeight();

  // Convert coordinates from react-pdf's reported dimensions to actual PDF dimensions
  const reactPdfWidth = reactPdfDimensions.width;
  const reactPdfHeight = reactPdfDimensions.height;

  // Scale the coordinates to match the actual PDF dimensions
  const scaleX = actualPageWidth / reactPdfWidth;
  const scaleY = actualPageHeight / reactPdfHeight;

  const correctedX = x * scaleX;
  const correctedY = y * scaleY;

  // Ensure coordinates are within page bounds
  const clampedX = Math.max(0, Math.min(correctedX, actualPageWidth - signatureWidth));
  const clampedY = Math.max(0, Math.min(correctedY, actualPageHeight - signatureHeight));

  console.log('PDF placement debug:', {
    originalCoords: { x, y },
    correctedCoords: { x: correctedX, y: correctedY },
    clampedCoords: { x: clampedX, y: clampedY },
    reactPdfDimensions: { width: reactPdfWidth, height: reactPdfHeight },
    actualPageDimensions: { width: actualPageWidth, height: actualPageHeight },
    scales: { scaleX, scaleY },
    signatureDimensions: { width: signatureWidth, height: signatureHeight }
  });

  // Draw the image on the page
  page.drawImage(signatureImage, {
    x: clampedX,
    y: clampedY,
    width: signatureWidth,
    height: signatureHeight,
  });

  // Serialize the PDFDocument to bytes
  const modifiedPdfBytes = await pdfDoc.save();

  return modifiedPdfBytes;
}
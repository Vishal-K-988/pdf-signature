'use client'

import { useState, useCallback, useEffect } from 'react';
import { PDF } from "./components/pdf";
import SignPreview from "./components/Signer";
import { addSignatureToPdf } from './utils/pdfUtils';

export default function Home() {
  // here is the file path , we also use pdf from anywhere around the internet ! 
  // I'm working on a feature where user uploads their pdf to aws s3 and from that it fetches the url and displayed to the user to sign the contract / pdf 
  // but for test case I'm using a sample.pdf ! 

  const initialPdfUrl = "/sample.pdf";

  const [currentPdfUrl, setCurrentPdfUrl] = useState(initialPdfUrl);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signaturePlacement, setSignaturePlacement] = useState<{ x: number; y: number; pageNumber: number } | null>(null);
  // New state for live preview position
  const [liveSignaturePreview, setLiveSignaturePreview] = useState<{ x: number; y: number; pageNumber: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [totalPdfPages, setTotalPdfPages] = useState(1);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [objectUrl]);

  const handleSignatureSave = useCallback((dataUrl: string | null) => {
    setSignatureDataUrl(dataUrl);
    if (dataUrl) {
      alert('Signature saved! Now click on the PDF to place it, or move your mouse over the PDF to preview.');
    } else {
      alert('Signature cleared.');
      setLiveSignaturePreview(null); // Clear preview if signature is cleared
    }
  }, []);

  const handlePdfInteraction = useCallback((params: {
    clientX?: number;
    clientY?: number;
    pageNumber: number;
    renderedPageWidth?: number;
    renderedPageHeight?: number;
    originalPdfPageWidth?: number;
    originalPdfPageHeight?: number;
    eventType: 'click' | 'mousemove'; // Add eventType
  }) => {
    if (params.pageNumber !== currentPageNum) {
      setCurrentPageNum(params.pageNumber);
      setSignaturePlacement(null);
      setLiveSignaturePreview(null); // Clear preview on page change
      return;
    }

    // Also this one 
    if (signatureDataUrl && params.renderedPageWidth && params.originalPdfPageWidth) {
        const { clientX, clientY, renderedPageWidth, renderedPageHeight, originalPdfPageWidth, originalPdfPageHeight } = params;

        const scaleX = originalPdfPageWidth / renderedPageWidth;
        const scaleY = originalPdfPageHeight / renderedPageHeight; 

        // Adjust Y-coordinate for PDF coordinate system (origin at bottom-left)
        const pdfX = clientX * scaleX;
        // The signature image's bottom-left corner should be at pdfY.
        // If the click Y is relative to the top of the *rendered* page, then:
        // Y coordinate in PDF is (rendered page height - click Y on rendered page) * scaleY
        const pdfY = (renderedPageHeight - clientY) * scaleY;

        if (params.eventType === 'click') {
            setSignaturePlacement({ x: pdfX, y: pdfY, pageNumber: currentPageNum });
            alert(`Signature will be placed on Page ${currentPageNum} at X: ${Math.round(pdfX)}, Y: ${Math.round(pdfY)}. Click 'Apply' to confirm.`);
            setLiveSignaturePreview(null); // Clear live preview after click
        } else if (params.eventType === 'mousemove') {
            setLiveSignaturePreview({ x: pdfX, y: pdfY, pageNumber: currentPageNum });
        }
    } else if (signatureDataUrl === null) {
      // Only show alert if it's a click and no signature is drawn
      if (params.eventType === 'click') {
        alert('Please draw and save your signature first using the signature pad.');
      }
    }
  }, [currentPageNum, signatureDataUrl]);

  const handleDocumentLoadSuccess = useCallback((numPages: number) => {
      setTotalPdfPages(numPages);
  }, []);

  // Clear live preview when mouse leaves PDF area
  const handlePdfMouseLeave = useCallback(() => {
    setLiveSignaturePreview(null);
  }, []);


  const handleApplySignature = async () => {
    if (!signatureDataUrl) {
      alert('Please draw and save your signature.');
      return;
    }
    if (!signaturePlacement) {
      alert('Please click on the PDF to choose where to place the signature.');
      return;
    }

    setLoading(true);
    try {
      console.log("Applying signature to PDF...");
      // might some modification here or ! 
      const modifiedPdfBytes = await addSignatureToPdf(
        currentPdfUrl,
        signatureDataUrl,
        signaturePlacement.x,
        signaturePlacement.y,
        signaturePlacement.pageNumber,
        150, // width for signature in PDF
        75   // height for signature in PDF
      );

      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const newObjectUrl = URL.createObjectURL(blob);

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setObjectUrl(newObjectUrl);

      setCurrentPdfUrl(newObjectUrl);

      setSignaturePlacement(null);
      setSignatureDataUrl(null);
      alert('Signature applied and PDF updated successfully! Viewing the modified document.');

    } catch (error) {
      console.error('Failed to apply signature:', error);
      alert('Failed to apply signature. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">PDF Signer</h1>

      <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full max-w-screen-xl gap-4">
        <div className="flex-1 min-w-0">
          <PDF
            pdfUrl={currentPdfUrl}
            onPageClick={handlePdfInteraction}
            onPageMouseMove={handlePdfInteraction} // Pass for mousemove
            onPageMouseLeave={handlePdfMouseLeave} // Pass for mouseleave
            currentPageNumber={currentPageNum}
            onDocumentLoadSuccess={handleDocumentLoadSuccess}
            signatureDataUrl={signatureDataUrl} // Pass signatureDataUrl
            liveSignaturePreview={liveSignaturePreview} // Pass live preview coordinates
          />
        </div>

        <div className="flex-none w-full md:w-80 p-4 bg-gray-100 rounded-lg shadow-md">
          <SignPreview onSignatureSave={handleSignatureSave} />

          <div className="mt-6 text-center">
            {signaturePlacement && (
              <p className="mb-4 text-blue-600 font-medium text-sm">
                Signature selected for Page {signaturePlacement.pageNumber} at X: {Math.round(signaturePlacement.x)}, Y: {Math.round(signaturePlacement.y)}.
              </p>
            )}
            <button
              onClick={handleApplySignature}
              disabled={loading || !signatureDataUrl || !signaturePlacement}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 w-full"
            >
              {loading ? 'Processing...' : 'Apply Signature & Update PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
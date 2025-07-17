'use client'

import { useState, useCallback, useEffect } from 'react';
import { PDF } from "./components/pdf";
import SignPreview from "./components/Signer";
import { addSignatureToPdf } from './utils/pdfUtils';

export default function Home() {
  const initialPdfUrl = "/sample.pdf";

  const [currentPdfUrl, setCurrentPdfUrl] = useState(initialPdfUrl);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signaturePlacement, setSignaturePlacement] = useState<{ x: number; y: number; pageNumber: number } | null>(null);
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
      alert('Signature saved! Now click on the PDF to place it.');
    } else {
      alert('Signature cleared.');
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
  }) => {
    if (params.pageNumber !== currentPageNum) {
      setCurrentPageNum(params.pageNumber);
      setSignaturePlacement(null);
      return;
    }

    if (params.clientX !== undefined && params.clientY !== undefined && signatureDataUrl && params.renderedPageWidth && params.originalPdfPageWidth) {
    
      const { clientX, clientY, renderedPageWidth, renderedPageHeight, originalPdfPageWidth, originalPdfPageHeight } = params;

      const scaleX = originalPdfPageWidth / renderedPageWidth;
      const scaleY = originalPdfPageHeight / renderedPageHeight; 

      const pdfX = clientX * scaleX;
      const pdfY = (renderedPageHeight - clientY) * scaleY;

      setSignaturePlacement({ x: pdfX, y: pdfY, pageNumber: currentPageNum });
      alert(`Signature will be placed on Page ${currentPageNum} at X: ${Math.round(pdfX)}, Y: ${Math.round(pdfY)}. Click 'Apply' to confirm.`);
    } else if (signatureDataUrl === null) {
      alert('Please draw and save your signature first using the signature pad.');
    }
  }, [currentPageNum, signatureDataUrl]);

  const handleDocumentLoadSuccess = useCallback((numPages: number) => {
      setTotalPdfPages(numPages);
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
      const modifiedPdfBytes = await addSignatureToPdf(
        currentPdfUrl,
        signatureDataUrl,
        signaturePlacement.x,
        signaturePlacement.y,
        signaturePlacement.pageNumber,
        150,
        75
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
     

      <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full max-w-screen-xl gap-4">
        <div className="flex-1 min-w-0">
          <PDF
            pdfUrl={currentPdfUrl}
            onPageClick={handlePdfInteraction}
            currentPageNumber={currentPageNum}
            onDocumentLoadSuccess={handleDocumentLoadSuccess}
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
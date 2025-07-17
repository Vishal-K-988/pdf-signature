'use client'

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';


const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
);

const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
);


let pdfjs;
if (typeof window !== 'undefined') {
  pdfjs = require('react-pdf').pdfjs;
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
};

const maxWidth = 800;

// Add props: pdfUrl, onPageClick, currentPageNumber, onDocumentLoadSuccess, onPageRenderSuccess
export const PDF = ({
    pdfUrl,
    onPageClick,
    currentPageNumber,
    onDocumentLoadSuccess,
}) => {
    const [numPages, setNumPages] = useState(null)
    const [isLoading, setIsLoading] = useState(true);
    const pageRef = useRef(null); // Ref to the div containing the Page component

    // This state will hold the *original* dimensions of the PDF page (before scaling for display)
    const [originalPdfPageDimensions, setOriginalPdfPageDimensions] = useState<{ width: number; height: number } | null>(null);


    const onDocumentSuccess = useCallback(({ numPages }) => {
      setNumPages(numPages);
      setIsLoading(false);
      if (onDocumentLoadSuccess) {
          onDocumentLoadSuccess(numPages);
      }
    }, [onDocumentLoadSuccess]);

    const onDocumentError = useCallback((error) => {
        console.error('Error loading PDF document:', error);
        setIsLoading(false);
    }, []);

    const onPageRenderSuccess = useCallback((page) => {
        // This callback gives you the actual dimensions of the PDF page
        setOriginalPdfPageDimensions({ width: page.width, height: page.height });
    }, []);

    const handlePageClick = useCallback((event) => {
        if (!onPageClick || !originalPdfPageDimensions || !pageRef.current) {
            return;
        }

        const rect = pageRef.current.getBoundingClientRect(); 
        const clientX = event.clientX - rect.left;
        const clientY = event.clientY - rect.top;

        // Pass all necessary info back to the parent
        onPageClick({
            clientX,
            clientY,
            pageNumber: currentPageNumber,
            renderedPageWidth: rect.width,
            renderedPageHeight: rect.height,
            originalPdfPageWidth: originalPdfPageDimensions.width,
            originalPdfPageHeight: originalPdfPageDimensions.height,
        });
    }, [onPageClick, currentPageNumber, originalPdfPageDimensions]);


    return (
        <div className="p-4  bg-gray-100 font-inter">
            

            <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
                {isLoading && (
                    <div className="text-gray-600 text-lg mb-4">Loading PDF...</div>
                )}

                {!isLoading && numPages === null && (
                    <div className="text-red-600 text-lg mb-4">Failed to load PDF. Please try again.</div>
                )}

                <div
                    className="border border-gray-300 rounded-md overflow-hidden"
                    onClick={handlePageClick} 
                    style={{ cursor: 'copy' }} 
                    ref={pageRef} 
                >

                    {pdfjs && pdfUrl && ( 
                        <Document
                            file={pdfUrl}
                            onLoadSuccess={onDocumentSuccess}
                            onLoadError={onDocumentError}
                            options={options}
                            className="w-full h-auto"
                        >
                            <Page
                                pageNumber={currentPageNumber}
                                width={Math.min(maxWidth, window.innerWidth * 0.9)}
                                renderAnnotationLayer={false}
                                renderTextLayer={false}
                                onRenderSuccess={onPageRenderSuccess} 
                            />
                        </Document>
                    )}
                </div>

                {numPages && (
                    <div className="flex items-center justify-center mt-6 space-x-4">
                        <button
                            // This button's onClick now calls the parent's handler
                            onClick={() => onPageClick({ pageNumber: Math.max(1, currentPageNumber - 1) })}
                            disabled={currentPageNumber <= 1}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out"
                        >
                            Previous
                        </button>
                        <span className="text-lg font-medium text-gray-700">
                            Page {currentPageNumber} of {numPages}
                        </span>
                        <button
                            // This button's onClick now calls the parent's handler
                            onClick={() => onPageClick({ pageNumber: Math.min(numPages, currentPageNumber + 1) })}
                            disabled={currentPageNumber >= numPages}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
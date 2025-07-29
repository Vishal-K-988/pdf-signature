'use client'

import { useCallback, useEffect, useRef, useState } from 'react';

import Image from 'next/image'; // Import Image component
import dynamic from 'next/dynamic';

const Document = dynamic(
    () => import('react-pdf').then((mod) => mod.Document),
    { ssr: false }
);

const Page = dynamic(
    () => import('react-pdf').then((mod) => mod.Page),
    { ssr: false }
);

// Move pdfjs initialization to useEffect to avoid hydration issues
const options = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
};

const maxWidth = 800;

interface PDFProps {
    pdfUrl: string;
    onPageClick: (params: any) => void;
    onPageMouseMove: (params: any) => void;
    onPageMouseLeave: () => void;
    currentPageNumber: number;
    onDocumentLoadSuccess: (numPages: number) => void;
    signatureDataUrl: string | null;
    liveSignaturePreview: { x: number; y: number; pageNumber: number } | null;
    onPageDimensionsChange?: (dimensions: { width: number; height: number }) => void;
}

export const PDF = ({
    pdfUrl,
    onPageClick,
    onPageMouseMove, // New prop
    onPageMouseLeave, // New prop
    currentPageNumber,
    onDocumentLoadSuccess,
    signatureDataUrl, // New prop
    liveSignaturePreview, // New prop
    onPageDimensionsChange, // New prop
}: PDFProps) => {
    const [numPages, setNumPages] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);
    const pageRef = useRef<HTMLDivElement>(null); // Ref to the div containing the Page component

    const [originalPdfPageDimensions, setOriginalPdfPageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [renderedPageDimensions, setRenderedPageDimensions] = useState<{ width: number; height: number } | null>(null);

    // Initialize client-side only code
    useEffect(() => {
        setIsClient(true);
        // Initialize pdfjs only on client side
        const pdfjs = require('react-pdf').pdfjs;
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }, []);

    const onDocumentSuccess = useCallback(({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setIsLoading(false);
        if (onDocumentLoadSuccess) {
            onDocumentLoadSuccess(numPages);
        }
    }, [onDocumentLoadSuccess]);

    const onDocumentError = useCallback((error: any) => {
        console.error('Error loading PDF document:', error);
        setIsLoading(false);
    }, []);

    const onPageRenderSuccess = useCallback((page: any) => {
        const dimensions = { width: page.width, height: page.height };
        setOriginalPdfPageDimensions(dimensions);
        // Store the rendered dimensions as well
        if (pageRef.current) {
            setRenderedPageDimensions({ width: pageRef.current.offsetWidth, height: pageRef.current.offsetHeight });
        }
        // Notify parent of page dimensions
        if (onPageDimensionsChange) {
            onPageDimensionsChange(dimensions);
        }
    }, [onPageDimensionsChange]);

    // Effect to update renderedPageDimensions if window resizes
    useEffect(() => {
        const handleResize = () => {
            if (pageRef.current) {
                setRenderedPageDimensions({ width: pageRef.current.offsetWidth, height: pageRef.current.offsetHeight });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getEventParams = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>, eventType: 'click' | 'mousemove') => {
        if (!originalPdfPageDimensions || !pageRef.current || !renderedPageDimensions) {
            return null;
        }

        const rect = pageRef.current.getBoundingClientRect();
        const clientX = event.clientX - rect.left;
        const clientY = event.clientY - rect.top;

        return {
            clientX,
            clientY,
            pageNumber: currentPageNumber,
            renderedPageWidth: renderedPageDimensions.width,
            renderedPageHeight: renderedPageDimensions.height,
            originalPdfPageWidth: originalPdfPageDimensions.width,
            originalPdfPageHeight: originalPdfPageDimensions.height,
            eventType: eventType,
        };
    }, [currentPageNumber, originalPdfPageDimensions, renderedPageDimensions]);


    const handlePageClick = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        const params = getEventParams(event, 'click');
        if (params && onPageClick) {
            onPageClick(params);
        }
    }, [onPageClick, getEventParams]);

    const handlePageMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (signatureDataUrl) { // Only track mouse movement if a signature is available
            const params = getEventParams(event, 'mousemove');
            if (params && onPageMouseMove) {
                onPageMouseMove(params);
            }
        }
    }, [onPageMouseMove, getEventParams, signatureDataUrl]);

    const handlePageMouseLeave = useCallback(() => {
        if (onPageMouseLeave) {
            onPageMouseLeave();
        }
    }, [onPageMouseLeave]);

    // Calculate live preview position relative to the rendered PDF page
    const livePreviewStyle = liveSignaturePreview && renderedPageDimensions && originalPdfPageDimensions && signatureDataUrl
        ? (() => {
            const scaleX = renderedPageDimensions.width / originalPdfPageDimensions.width;
            const scaleY = renderedPageDimensions.height / originalPdfPageDimensions.height;

            // signaturePreview.x and y are in PDF coordinates (origin bottom-left).
            // To position on rendered HTML, we need to convert to top-left origin for CSS 'top' and 'left'.
            // The signature is 150px wide and 75px high (as passed to addSignatureToPdf)
            const signatureWidthInPdf = 150;
            const signatureHeightInPdf = 75;

            // Calculate 'left' position:
            const leftPx = liveSignaturePreview.x * scaleX;

            // Calculate 'top' position:
            // PDF Y is from bottom. Rendered Y (top) is from top.
            // Since we subtracted signatureHeightInPdf from the PDF Y coordinate,
            // we need to add it back when converting to rendered coordinates
            const topPx = (originalPdfPageDimensions.height - liveSignaturePreview.y - signatureHeightInPdf) * scaleY;

            return {
                position: 'absolute' as const,
                left: `${leftPx}px`,
                top: `${topPx}px`,
                // Set the size of the preview image to match the eventual placed size
                width: `${signatureWidthInPdf * scaleX}px`,
                height: `${signatureHeightInPdf * scaleY}px`,
                pointerEvents: 'none' as const, // Allows clicks to pass through to the PDF
                opacity: 0.6, // Semi-transparent
                zIndex: 10,
            };
        })()
        : {};

    // Don't render PDF content until client-side is ready
    if (!isClient) {
        return (
            <div className="p-4 bg-gray-100 font-inter">
                <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
                    <div className="text-gray-600 text-lg mb-4">Loading PDF...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gray-100 font-inter">
            <div className="w-full max-w-4xl bg-white rounded-lg shadow-xl p-6 flex flex-col items-center">
                {isLoading && (
                    <div className="text-gray-600 text-lg mb-4">Loading PDF...</div>
                )}

                {!isLoading && numPages === null && (
                    <div className="text-red-600 text-lg mb-4">Failed to load PDF. Please try again.</div>
                )}

                <div
                    className="border border-gray-300 rounded-md overflow-hidden relative" // Added relative for positioning
                    onClick={handlePageClick}
                    onMouseMove={handlePageMouseMove} // Added mouse move handler
                    onMouseLeave={handlePageMouseLeave} // Added mouse leave handler
                    style={{ cursor: signatureDataUrl ? 'copy' : 'default' }} // Change cursor when signature is ready
                    ref={pageRef}
                >
                    {pdfUrl && (
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

                    {/* Live Signature Preview */}
                    {signatureDataUrl && liveSignaturePreview && liveSignaturePreview.pageNumber === currentPageNumber && (
                        <Image
                            src={signatureDataUrl}
                            alt="Signature Preview"
                            style={livePreviewStyle}
                            width={150} // Base width for Image component (will be scaled by CSS)
                            height={75} // Base height for Image component (will be scaled by CSS)
                        />
                    )}

                    {/* Debug: Show click position indicator */}
                    {signatureDataUrl && liveSignaturePreview && liveSignaturePreview.pageNumber === currentPageNumber && renderedPageDimensions && originalPdfPageDimensions && (
                        <div
                            style={{
                                position: 'absolute',
                                left: `${liveSignaturePreview.x * renderedPageDimensions.width / originalPdfPageDimensions.width}px`,
                                top: `${(originalPdfPageDimensions.height - liveSignaturePreview.y - 75) * renderedPageDimensions.height / originalPdfPageDimensions.height}px`,
                                width: '4px',
                                height: '4px',
                                backgroundColor: 'red',
                                borderRadius: '50%',
                                pointerEvents: 'none',
                                zIndex: 20,
                            }}
                        />
                    )}
                </div>

                {numPages && (
                    <div className="flex items-center justify-center mt-6 space-x-4">
                        <button
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
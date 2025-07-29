'use client'

import Image from "next/image";
import { useState, useCallback } from "react"; 
import SignatureCanvas from "../components/react-signature-canvas/index";

// Define props for SignPreview component
interface SignPreviewProps {
  onSignatureSave: (dataUrl: string | null) => void;
}

export default function SignPreview({ onSignatureSave }: SignPreviewProps) {
  const [signaturePad, setSignaturePad] = useState<any>(null); 
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string>(""); 

  
  const handleClear = useCallback(() => {
    if (signaturePad) {
      signaturePad.clear();
      setSavedSignatureUrl(""); 
      onSignatureSave(null);
    }
  }, [signaturePad, onSignatureSave]);

  // Callback to save the signature
  const handleSave = useCallback(() => {
    if (signaturePad) {
     
      if (!signaturePad.isEmpty()) {
        const dataUrl = signaturePad.getTrimmedCanvas().toDataURL('image/png');
        setSavedSignatureUrl(dataUrl);
        onSignatureSave(dataUrl); 
      } else {
        alert("Please draw your signature before saving.");
      }
    }
  }, [signaturePad, onSignatureSave]);

  return (
    <div className="font-sans flex flex-col items-center gap-4 p-4 border border-gray-200 rounded-lg shadow-inner bg-gray-50">
      <h2 className="text-xl font-semibold text-gray-700">Draw Your Signature</h2>
      <div className="border-2 ring-2 ring-emerald-500 bg-black rounded-md overflow-hidden">
        <SignatureCanvas
          penColor="black"
          canvasProps={{ 
            width: 250, 
            height: 150, 
            className: 'sigCanvas',
            style: { backgroundColor: 'white' }
          }}
          ref={data => setSignaturePad(data)}
        />
      </div>
      <div className="flex gap-4 mt-2">
        <button
          className="px-5 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300"
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          className="px-5 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition duration-300"
          onClick={handleSave}
        >
          Save Signature
        </button>
      </div>

      {savedSignatureUrl && (
        <div className="mt-4 text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Saved Signature Preview:</h3>
          <Image src={savedSignatureUrl} alt="Saved Signature" width={150} height={75} className="border border-gray-300 rounded mx-auto" />
        </div>
      )}
    </div>
  );
}
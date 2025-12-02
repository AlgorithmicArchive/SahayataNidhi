import React from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import CustomButton from "./CustomButton";
import { downloadFile } from "../assets/downloadFile";

// Import the worker as a URL (Vite will handle it)
import workerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

const PdfViewer = ({ pdfUrl, path, exportButton = null, width }) => {
  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      {exportButton && (
        <CustomButton text="Export PDF" onClick={() => downloadFile(path)} />
      )}

      <Worker workerSrc={workerUrl}>
        <div style={{ height: "750px", width: width || "600px", margin: "0 auto" }}>
          <Viewer fileUrl={`/Base/DisplayFile?filename=${pdfUrl}`} />
        </div>
      </Worker>
    </div>
  );
};

export default PdfViewer;
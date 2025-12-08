import React, { useState } from "react";
import * as XLSX from "xlsx";
import { ed25519 } from "@noble/curves/ed25519.js";
import { saveAs } from "file-saver";
import { toByteArray, fromByteArray } from "base64-js";

export default function FileSigner() {
  const [signPrivateKey, setSignPrivateKey] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [signature, setSignature] = useState(null);

  // Cargar Excel y extraer clave de firma
  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Buscar la fila de UserSignKeyPair
    const signRow = rows.find((r) =>
      String(r[0]).includes("UserSignKeyPair")
    );

    if (!signRow) {
      alert("No se encontró UserSignKeyPair en el Excel.");
      return;
    }

    const privateKeyBase64 = signRow[2];
    const privateKey = toByteArray(privateKeyBase64); // base64 → Uint8Array

    if (privateKey.length !== 32) {
      alert("La clave privada no es válida o está incompleta.");
      return;
    }

    setSignPrivateKey(privateKey);
    alert("Clave de firma (Ed25519) cargada correctamente.");
  };

  // Seleccionar archivo a firmar
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
  };

  // Firmar archivo con UserSigningKey
  const handleSignFile = async () => {
    if (!signPrivateKey) {
      alert("Primero carga el Excel con la clave de firma.");
      return;
    }
    if (!selectedFile) {
      alert("Selecciona un archivo para firmar.");
      return;
    }

    const arrayBuffer = await selectedFile.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    // Crear firma (Ed25519)
    const signatureBytes = ed25519.sign(fileBytes, signPrivateKey);
    const signatureBase64 = fromByteArray(signatureBytes);

    setSignature(signatureBase64);

    // Guardar firma en un .txt
    const blob = new Blob([`${signatureBase64}`], {
      type: "text/plain;charset=utf-8",
    });
    saveAs(blob, `${selectedFile.name}_signature.txt`);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-gray-100 rounded-2xl shadow-md text-center">
      <h1 className="text-2xl font-bold mb-4">
        Firmar Archivo con UserSigningKey (Ed25519)
      </h1>

      <div className="space-y-4">
        <div>
          <label className="font-semibold">
            Selecciona el archivo Excel con las claves:
          </label>
          <input
            type="file"
            accept=".xlsx"
            onChange={handleExcelUpload}
            className="mt-2 block mx-auto"
          />
        </div>

        <div>
          <label className="font-semibold">
            Selecciona el archivo que deseas firmar:
          </label>
          <input
            type="file"
            onChange={handleFileSelect}
            className="mt-2 block mx-auto"
          />
        </div>

        <button onClick={handleSignFile} className="btn btn-primary mt-4">
          Firmar archivo
        </button>

        {signature && (
          <div className="mt-6 text-left bg-white p-4">
            <h2 className="text-lg font-semibold mb-2">
              Firma manifiesto con UserSigningKey →
            </h2>
            <p className="break-all text-sm">{signature}</p>
          </div>
        )}
      </div>
    </div>
  );
}
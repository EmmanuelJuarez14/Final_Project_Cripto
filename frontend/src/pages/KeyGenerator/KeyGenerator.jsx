import React, { useState } from "react";
import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { fromByteArray } from "base64-js";

export default function KeyGenerator() {
  const [keys, setKeys] = useState(null);

  const generateKeys = () => {
    // Generar claves privadas aleatorias (32 bytes)
    const userPrivateKey = crypto.getRandomValues(new Uint8Array(32));
    const userPublicKey = x25519.getPublicKey(userPrivateKey);

    const signPrivateKey = crypto.getRandomValues(new Uint8Array(32));
    const signPublicKey = ed25519.getPublicKey(signPrivateKey);

    const data = {
      UserKeyPair: {
        publicKey: fromByteArray(userPublicKey),
        privateKey: fromByteArray(userPrivateKey),
      },
      UserSignKeyPair: {
        publicKey: fromByteArray(signPublicKey),
        privateKey: fromByteArray(signPrivateKey),
      },
    };

    setKeys(data);
  };

  const exportToExcel = () => {
    if (!keys) return alert("Primero genera las claves.");

    const rows = [
      ["Tipo de Clave", "Clave Pública (Base64)", "Clave Privada (Base64)"],
      [
        "UserKeyPair (X25519)",
        keys.UserKeyPair.publicKey,
        keys.UserKeyPair.privateKey,
      ],
      [
        "UserSignKeyPair (Ed25519)",
        keys.UserSignKeyPair.publicKey,
        keys.UserSignKeyPair.privateKey,
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UserKeys");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "UserKeys.xlsx");
  };

  return (
    <div className="p-6 max-w-xl mx-auto text-center bg-gray-100 rounded-2xl shadow-md">
      <h1 className="text-2xl font-bold mb-4">Generar Claves</h1>

      <button onClick={generateKeys} className="btn btn-primary">
        Generar Claves
      </button>

      {keys && (
        <div className="mt-6 text-left">
          <h2 className="text-lg font-semibold mt-4 mb-2">
            UserKeyPair (ECDH) (X25519)
          </h2>
          <p><strong>Public Key:</strong> {keys.UserKeyPair.publicKey}</p>
          <p><strong>Private Key:</strong> {keys.UserKeyPair.privateKey}</p>

          <h2 className="text-lg font-semibold mt-4 mb-2">
            UserSignKeyPair (Firma) (Ed25519)
          </h2>
          <p><strong>Public Key:</strong> {keys.UserSignKeyPair.publicKey}</p>
          <p><strong>Private Key:</strong> {keys.UserSignKeyPair.privateKey}</p>

          <button onClick={exportToExcel} className="btn btn-primary">
            Guardar en Excel
          </button>
        </div>
      )}
    </div>
  );
}
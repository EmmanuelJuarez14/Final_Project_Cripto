import { sha256 } from "@noble/hashes/sha2.js";


export function hashPassword(password) {
  // Convertir string a Uint8Array si es necesario
  const passwordBytes = typeof password === 'string' 
    ? new TextEncoder().encode(password) 
    : password;
    
  const hashBytes = sha256(passwordBytes);
  
  return Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
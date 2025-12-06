import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from '@noble/ciphers/utils.js';
import * as XLSX from "xlsx";

// ==========================================
// 1. CONFIGURACIÓN Y CACHÉ
// ==========================================

let PUBLIC_KEY_CACHE = null;
let PRIVATE_KEY_CACHE = null;

/**
 * Genera un par de claves RSA-OAEP (2048 bits, SHA-256)
 */
export async function generarParClaveRSA() {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]), // 65537
                hash: 'SHA-256'
            },
            true, 
            ['encrypt', 'decrypt']
        );
        return keyPair;
    } catch (error) {
        throw new Error(`Error generando par RSA: ${error.message}`);
    }
}

// ==========================================
// 2. CONVERSIÓN Y FORMATO (PEM/ArrayBuffer)
// ==========================================

async function exportarClavePEM(key, tipo) {
    try {
        const formato = tipo === 'public' ? 'spki' : 'pkcs8';
        const exported = await crypto.subtle.exportKey(formato, key);
        const exportedArray = new Uint8Array(exported);
        const b64 = btoa(String.fromCharCode(...exportedArray));
        const b64Lines = b64.match(/.{1,64}/g).join('\n');
        
        const header = tipo === 'public' ? '-----BEGIN PUBLIC KEY-----' : '-----BEGIN PRIVATE KEY-----';
        const footer = tipo === 'public' ? '-----END PUBLIC KEY-----' : '-----END PRIVATE KEY-----';
        
        return `${header}\n${b64Lines}\n${footer}`;
    } catch (error) {
        throw new Error(`Error exportando clave a PEM: ${error.message}`);
    }
}

function pemToArrayBuffer(pem) {
    const b64 = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ==========================================
// 3. GESTIÓN DE CLAVES (Generar, Guardar, Cargar)
// ==========================================

/**
 * Genera claves y las guarda en localStorage (SIN descargar nada)
 */
export async function generarYGuardarClaves(nombreUsuario = 'usuario') {
    try {
        const { publicKey, privateKey } = await generarParClaveRSA();
        
        const publicPEM = await exportarClavePEM(publicKey, 'public');
        const privatePEM = await exportarClavePEM(privateKey, 'private');
        
        localStorage.setItem('rsa_public_key', publicPEM);
        localStorage.setItem('rsa_private_key', privatePEM);
        
        PUBLIC_KEY_CACHE = publicKey;
        PRIVATE_KEY_CACHE = privateKey;
        
        return { publicKey, privateKey, publicPEM, privatePEM };
    } catch (error) {
        throw new Error(`Fallo al generar claves: ${error.message}`);
    }
}

export function existenClavesRSA() {
    return localStorage.getItem('rsa_public_key') !== null && 
           localStorage.getItem('rsa_private_key') !== null;
}

export async function inicializarSistemaCifrado(nombreUsuario = null) {
    try {
        if (existenClavesRSA()) return { nuevo: false };
        
        if (!nombreUsuario) {
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            nombreUsuario = usuario.nombre || 'usuario';
        }
        
        // Generación silenciosa
        await generarYGuardarClaves(nombreUsuario);
        return { nuevo: true };
    } catch (error) {
        throw new Error(`Error inicializando: ${error.message}`);
    }
}

export function obtenerClavePublicaPEM() {
    return localStorage.getItem('rsa_public_key');
}

async function importarClavePublicaRSA() {
    if (PUBLIC_KEY_CACHE) return PUBLIC_KEY_CACHE;
    let publicPEM = localStorage.getItem('rsa_public_key');
    
    if (!publicPEM) {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const { publicKey } = await generarYGuardarClaves(usuario.nombre);
        return publicKey;
    }
    
    const keyData = pemToArrayBuffer(publicPEM);
    const publicKey = await crypto.subtle.importKey(
        'spki', keyData, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']
    );
    PUBLIC_KEY_CACHE = publicKey;
    return publicKey;
}

async function importarClavePrivadaRSA() {
    if (PRIVATE_KEY_CACHE) return PRIVATE_KEY_CACHE;
    const privatePEM = localStorage.getItem('rsa_private_key');
    if (!privatePEM) throw new Error('Clave privada no encontrada. Restaura tu copia de seguridad.');
    
    const keyData = pemToArrayBuffer(privatePEM);
    const privateKey = await crypto.subtle.importKey(
        'pkcs8', keyData, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt']
    );
    PRIVATE_KEY_CACHE = privateKey;
    return privateKey;
}

// ==========================================
// 4. IMPORTACIÓN Y EXPORTACIÓN (BACKUP)
// ==========================================

/**
 * Importa claves desde Strings PEM (Usado por importarClavesDesdeExcel)
 */
export async function importarClavesDesdeTexto(publicPEM, privatePEM) {
    try {
        if (!publicPEM.includes('BEGIN PUBLIC KEY') || !privatePEM.includes('BEGIN PRIVATE KEY')) {
            throw new Error('Formato de claves inválido');
        }
        // Validar importando
        const pubData = pemToArrayBuffer(publicPEM);
        const privData = pemToArrayBuffer(privatePEM);
        
        await crypto.subtle.importKey('spki', pubData, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['encrypt']);
        await crypto.subtle.importKey('pkcs8', privData, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt']);
        
        localStorage.setItem('rsa_public_key', publicPEM);
        localStorage.setItem('rsa_private_key', privatePEM);
        
        PUBLIC_KEY_CACHE = null;
        PRIVATE_KEY_CACHE = null;
        return true;
    } catch (error) {
        throw new Error(`Error importando claves: ${error.message}`);
    }
}

/**
 * Lee Excel y restaura claves
 */
export async function importarClavesDesdeExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let publicPEM = null, privatePEM = null;

                for (let row of rows) {
                    for (let cell of row) {
                        if (typeof cell === 'string') {
                            if (cell.includes("-----BEGIN PUBLIC KEY-----")) publicPEM = cell;
                            if (cell.includes("-----BEGIN PRIVATE KEY-----")) privatePEM = cell;
                        }
                    }
                }

                if (!publicPEM || !privatePEM) throw new Error("No se encontraron claves válidas en el archivo.");
                await importarClavesDesdeTexto(publicPEM, privatePEM);
                resolve({ success: true });
            } catch (error) { reject(error); }
        };
        reader.onerror = () => reject(new Error("Error leyendo archivo"));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Genera y descarga el Excel de respaldo (Botón Backup)
 */
export async function descargarCopiaSeguridad() {
    try {
        const publicPEM = localStorage.getItem('rsa_public_key');
        const privatePEM = localStorage.getItem('rsa_private_key');
        
        if (!publicPEM || !privatePEM) throw new Error("No hay claves para respaldar.");

        let nombreUsuario = 'usuario';
        const usuarioStr = localStorage.getItem('usuario');
        if (usuarioStr) {
            const u = JSON.parse(usuarioStr);
            nombreUsuario = u.nombre || 'usuario';
        }

        const datos = [
            ['CLAVES DE SEGURIDAD - SYSTEM CRYPTO'],
            ['Guarde este archivo en un lugar seguro.'],
            ['Usuario:', nombreUsuario],
            ['Fecha:', new Date().toLocaleString()],
            ['--- CLAVE PÚBLICA ---'],
            [publicPEM],
            ['--- CLAVE PRIVADA ---'],
            [privatePEM]
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(datos);
        ws['!cols'] = [{ wch: 100 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Keys');
        
        const filename = `Backup_Claves_${nombreUsuario.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, filename);
        return true;
    } catch (error) {
        throw new Error("Error generando respaldo: " + error.message);
    }
}

// ==========================================
// 5. FUNCIONES DE CIFRADO HÍBRIDO (Core)
// ==========================================

export async function cifrarClaveConRSA(claveSimetrica) {
    const publicKey = await importarClavePublicaRSA();
    const cifrado = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, claveSimetrica);
    return btoa(String.fromCharCode(...new Uint8Array(cifrado)));
}

export async function descifrarClaveConRSA(claveCifradaBase64) {
    const privateKey = await importarClavePrivadaRSA();
    const cifradoBytes = Uint8Array.from(atob(claveCifradaBase64), c => c.charCodeAt(0));
    const descifrado = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, cifradoBytes);
    return new Uint8Array(descifrado);
}

export async function cifrarClaveParaDestinatario(claveSimetricaBytes, pemPublicaDestinatario) {
    const binaryDer = pemToArrayBuffer(pemPublicaDestinatario);
    const publicKey = await crypto.subtle.importKey(
        "spki", binaryDer, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]
    );
    const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, claveSimetricaBytes);
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// ==========================================
// 6. FUNCIONES CHACHA20-POLY1305
// ==========================================

export function generarClaveSimetrica() {
    return randomBytes(32);
}

export function cifrarVideoConChaCha20(videoBytes, clave) {
    const nonce = randomBytes(12);
    const cipher = chacha20poly1305(clave, nonce);
    const ciphertext = cipher.encrypt(videoBytes);
    const resultado = new Uint8Array(nonce.length + ciphertext.length);
    resultado.set(nonce, 0);
    resultado.set(ciphertext, nonce.length);
    return resultado;
}

export function descifrarVideoConChaCha20(videoCifrado, clave) {
    try {
        const nonce = videoCifrado.slice(0, 12);
        const ciphertext = videoCifrado.slice(12);
        const decipher = chacha20poly1305(clave, nonce);
        return decipher.decrypt(ciphertext);
    } catch (e) {
        throw new Error("Error descifrando video (ChaCha20): Clave incorrecta o archivo corrupto.");
    }
}

// ==========================================
// 7. LEGACY (Compatibilidad)
// ==========================================
export function cifrarTexto(mensaje) { return btoa(mensaje); } // Placeholder simple
export function descifrarTexto(mensaje) { return atob(mensaje); } // Placeholder simple
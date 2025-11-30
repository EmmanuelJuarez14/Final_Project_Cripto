import { chacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes } from '@noble/ciphers/utils.js';
import { sha256 } from "@noble/hashes/sha2.js";
import * as XLSX from "xlsx";

// ========================
// CONFIGURACIÓN RSA-OAEP
// ========================

// Clave pública RSA almacenada (se carga desde localStorage o se genera)
let PUBLIC_KEY_CACHE = null;
let PRIVATE_KEY_CACHE = null;

/**
 * Genera un par de claves RSA-OAEP (pública y privada)
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 */
export async function generarParClaveRSA() {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048, // Tamaño de la clave
                publicExponent: new Uint8Array([1, 0, 1]), // 65537
                hash: 'SHA-256'
            },
            true, // Extraíble
            ['encrypt', 'decrypt']
        );
        
        return keyPair;
    } catch (error) {
        throw new Error(`Error al generar par de claves RSA: ${error.message}`);
    }
}

/**
 * Convierte una CryptoKey a formato PEM
 */
async function exportarClavePEM(key, tipo) {
    try {
        const formato = tipo === 'public' ? 'spki' : 'pkcs8';
        const exported = await crypto.subtle.exportKey(formato, key);
        const exportedArray = new Uint8Array(exported);
        const b64 = btoa(String.fromCharCode(...exportedArray));
        
        // Formatear en líneas de 64 caracteres
        const b64Lines = b64.match(/.{1,64}/g).join('\n');
        
        const header = tipo === 'public' 
            ? '-----BEGIN PUBLIC KEY-----'
            : '-----BEGIN PRIVATE KEY-----';
        const footer = tipo === 'public'
            ? '-----END PUBLIC KEY-----'
            : '-----END PRIVATE KEY-----';
        
        return `${header}\n${b64Lines}\n${footer}`;
    } catch (error) {
        throw new Error(`Error al exportar clave: ${error.message}`);
    }
}

/**
 * Guarda las claves RSA en un archivo Excel
 */
export async function guardarClavesEnExcel(publicKey, privateKey, nombreUsuario = 'usuario') {
    try {
        // Exportar claves a formato PEM
        const publicPEM = await exportarClavePEM(publicKey, 'public');
        const privatePEM = await exportarClavePEM(privateKey, 'private');
        
        // Crear datos para Excel
        const datos = [
            ['CLAVES RSA-OAEP - SISTEMA DE CIFRADO DE VIDEOS'],
            [''],
            ['Usuario:', nombreUsuario],
            ['Fecha de generación:', new Date().toLocaleString()],
            ['Algoritmo:', 'RSA-OAEP'],
            ['Tamaño de clave:', '2048 bits'],
            ['Hash:', 'SHA-256'],
            ['CLAVE PÚBLICA (compartir con otros para que cifren videos para ti):'],
            [publicPEM],
            ['CLAVE PRIVADA (NUNCA COMPARTIR - MANTENER SEGURA):'],
            [privatePEM],

        ];
        
        // Crear libro de Excel
        const ws = XLSX.utils.aoa_to_sheet(datos);
        
        // Ajustar anchos de columna
        ws['!cols'] = [{ wch: 100 }];
        
        // Aplicar estilos (colores de fondo)
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellAddress]) continue;
                
                // Títulos en negrita
                if (R === 0 || R === 8 || R === 12 || R === 16) {
                    ws[cellAddress].s = { font: { bold: true, sz: 12 } };
                }
                
                // Advertencia en rojo
                if (R === 12) {
                    ws[cellAddress].s = { font: { bold: true, color: { rgb: "FF0000" } } };
                }
            }
        }
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Claves RSA');
        
        // Descargar archivo
        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `claves_rsa_${nombreUsuario}_${fecha}.xlsx`;
        XLSX.writeFile(wb, nombreArchivo);
        
        console.log(`✅ Claves guardadas en: ${nombreArchivo}`);
        return nombreArchivo;
        
    } catch (error) {
        throw new Error(`Error al guardar claves en Excel: ${error.message}`);
    }
}

/**
 * Genera claves RSA y las guarda en Excel y localStorage
 */
export async function generarYGuardarClaves(nombreUsuario = 'usuario') {
    try {
        // Generar par de claves
        const { publicKey, privateKey } = await generarParClaveRSA();
        
        // Exportar a PEM
        const publicPEM = await exportarClavePEM(publicKey, 'public');
        const privatePEM = await exportarClavePEM(privateKey, 'private');
        
        // Guardar en localStorage
        localStorage.setItem('rsa_public_key', publicPEM);
        localStorage.setItem('rsa_private_key', privatePEM);
        
        // Guardar en Excel
        await guardarClavesEnExcel(publicKey, privateKey, nombreUsuario);
        
        // Actualizar caché
        PUBLIC_KEY_CACHE = publicKey;
        PRIVATE_KEY_CACHE = privateKey;
        
        return {
            publicKey,
            privateKey,
            publicPEM,
            privatePEM
        };
        
    } catch (error) {
        throw new Error(`Error al generar y guardar claves: ${error.message}`);
    }
}

/**
 * Convierte PEM a formato binario para Web Crypto API
 */
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

/**
 * Importa la clave pública RSA para cifrado
 */
async function importarClavePublicaRSA() {
    try {
        // Si ya está en caché, usarla
        if (PUBLIC_KEY_CACHE) {
            return PUBLIC_KEY_CACHE;
        }
        
        // Intentar cargar desde localStorage
        let publicPEM = localStorage.getItem('rsa_public_key');
        
        // Si no existe, generar nuevas claves
        if (!publicPEM) {
            console.warn('No se encontró clave pública. Generando nuevas claves...');
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            const nombreUsuario = usuario.nombre || usuario.email || 'usuario';
            
            const { publicKey } = await generarYGuardarClaves(nombreUsuario);
            PUBLIC_KEY_CACHE = publicKey;
            return publicKey;
        }
        
        // Importar clave pública desde PEM
        const keyData = pemToArrayBuffer(publicPEM);
        const publicKey = await crypto.subtle.importKey(
            'spki',
            keyData,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['encrypt']
        );
        
        PUBLIC_KEY_CACHE = publicKey;
        return publicKey;
        
    } catch (error) {
        throw new Error(`Error al importar clave pública RSA: ${error.message}`);
    }
}

/**
 * Importa la clave privada RSA para descifrado
 */
async function importarClavePrivadaRSA() {
    try {
        // Si ya está en caché, usarla
        if (PRIVATE_KEY_CACHE) {
            return PRIVATE_KEY_CACHE;
        }
        
        // Intentar cargar desde localStorage
        const privatePEM = localStorage.getItem('rsa_private_key');
        
        if (!privatePEM) {
            throw new Error('No se encontró clave privada en localStorage');
        }
        
        // Importar clave privada desde PEM
        const keyData = pemToArrayBuffer(privatePEM);
        const privateKey = await crypto.subtle.importKey(
            'pkcs8',
            keyData,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['decrypt']
        );
        
        PRIVATE_KEY_CACHE = privateKey;
        return privateKey;
        
    } catch (error) {
        throw new Error(`Error al importar clave privada RSA: ${error.message}`);
    }
}

/**
 * Verifica si existen claves RSA en localStorage
 */
export function existenClavesRSA() {
    return localStorage.getItem('rsa_public_key') !== null && 
           localStorage.getItem('rsa_private_key') !== null;
}

/**
 * Inicializa el sistema de cifrado (genera claves si no existen)
 * Llamar esta función al inicio de la aplicación o cuando el usuario se registre
 */
export async function inicializarSistemaCifrado(nombreUsuario = null) {
    try {
        // Verificar si ya existen claves
        if (existenClavesRSA()) {
            console.log('Claves RSA ya existen en el sistema');
            return {
                nuevo: false,
                mensaje: 'Claves RSA cargadas correctamente'
            };
        }
        
        // Si no hay usuario en localStorage, obtenerlo
        if (!nombreUsuario) {
            const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
            nombreUsuario = usuario.nombre || usuario.email || 'usuario';
        }
        
        console.log('🔑 Generando nuevas claves RSA...');
        
        // Generar y guardar claves
        const resultado = await generarYGuardarClaves(nombreUsuario);
        
        return {
            nuevo: true,
            mensaje: 'Claves RSA generadas y guardadas exitosamente',
            archivo: `claves_rsa_${nombreUsuario}_${new Date().toISOString().split('T')[0]}.xlsx`
        };
        
    } catch (error) {
        throw new Error(`Error al inicializar sistema de cifrado: ${error.message}`);
    }
}

/**
 * Exporta las claves actuales a Excel (por si el usuario las necesita de nuevo)
 */
export async function exportarClavesActuales() {
    try {
        if (!existenClavesRSA()) {
            throw new Error('No hay claves RSA en el sistema');
        }
        
        const publicKey = await importarClavePublicaRSA();
        const privateKey = await importarClavePrivadaRSA();
        
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        const nombreUsuario = usuario.nombre || usuario.email || 'usuario';
        
        return await guardarClavesEnExcel(publicKey, privateKey, nombreUsuario);
        
    } catch (error) {
        throw new Error(`Error al exportar claves: ${error.message}`);
    }
}

/**
 * Obtiene la clave pública en formato PEM (para compartir)
 */
export function obtenerClavePublicaPEM() {
    return localStorage.getItem('rsa_public_key');
}

/**
 * Importa claves desde un archivo Excel o PEM
 */
export async function importarClavesDesdeTexto(publicPEM, privatePEM) {
    try {
        // Validar formato PEM
        if (!publicPEM.includes('BEGIN PUBLIC KEY') || !privatePEM.includes('BEGIN PRIVATE KEY')) {
            throw new Error('Formato de claves inválido');
        }
        
        // Intentar importar para validar
        const publicKeyData = pemToArrayBuffer(publicPEM);
        const privateKeyData = pemToArrayBuffer(privatePEM);
        
        await crypto.subtle.importKey(
            'spki',
            publicKeyData,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['encrypt']
        );
        
        await crypto.subtle.importKey(
            'pkcs8',
            privateKeyData,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true,
            ['decrypt']
        );
        
        // Si son válidas, guardar en localStorage
        localStorage.setItem('rsa_public_key', publicPEM);
        localStorage.setItem('rsa_private_key', privatePEM);
        
        // Limpiar caché
        PUBLIC_KEY_CACHE = null;
        PRIVATE_KEY_CACHE = null;
        
        console.log('✅ Claves importadas correctamente');
        return true;
        
    } catch (error) {
        throw new Error(`Error al importar claves: ${error.message}`);
    }
}

/**
 * Cifra la clave simétrica con RSA-OAEP
 * @param {Uint8Array} claveSimetrica - Clave de 32 bytes
 * @returns {Promise<string>} Clave cifrada en base64
 */
export async function cifrarClaveConRSA(claveSimetrica) {
    try {
        // Importar clave pública (genera automáticamente si no existe)
        const publicKey = await importarClavePublicaRSA();
        
        // Cifrar con RSA-OAEP
        const cifrado = await crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP'
            },
            publicKey,
            claveSimetrica
        );
        
        // Convertir a base64
        const cifradoArray = new Uint8Array(cifrado);
        return btoa(String.fromCharCode(...cifradoArray));
        
    } catch (error) {
        throw new Error(`Error al cifrar clave con RSA-OAEP: ${error.message}`);
    }
}

/**
 * Descifra la clave simétrica con RSA-OAEP
 * @param {string} claveCifradaBase64 - Clave cifrada en base64
 * @returns {Promise<Uint8Array>} Clave simétrica descifrada
 */
export async function descifrarClaveConRSA(claveCifradaBase64) {
    try {
        // Importar clave privada
        const privateKey = await importarClavePrivadaRSA();
        
        // Convertir de base64 a bytes
        const cifradoBytes = Uint8Array.from(atob(claveCifradaBase64), c => c.charCodeAt(0));
        
        // Descifrar con RSA-OAEP
        const descifrado = await crypto.subtle.decrypt(
            {
                name: 'RSA-OAEP'
            },
            privateKey,
            cifradoBytes
        );
        
        return new Uint8Array(descifrado);
        
    } catch (error) {
        throw new Error(`Error al descifrar clave con RSA-OAEP: ${error.message}`);
    }
}

// ========================
// CHACHA20-POLY1305 PARA VIDEOS
// ========================

/**
 * Cifra un video con ChaCha20-Poly1305 (cifrado autenticado)
 * @param {Uint8Array} videoBytes - Bytes del video
 * @param {Uint8Array} clave - Clave de 32 bytes
 * @returns {Uint8Array} Video cifrado (nonce + ciphertext + authTag)
 */
export function cifrarVideoConChaCha20(videoBytes, clave) {
    try {
        // Validar que videoBytes sea Uint8Array
        if (!(videoBytes instanceof Uint8Array)) {
            throw new Error(`videoBytes debe ser Uint8Array, recibido: ${typeof videoBytes}`);
        }
        
        // Validar que clave sea Uint8Array
        if (!(clave instanceof Uint8Array)) {
            throw new Error(`clave debe ser Uint8Array, recibido: ${typeof clave}`);
        }
        
        // Validar que la clave tenga 32 bytes
        if (clave.length !== 32) {
            throw new Error(`La clave debe tener 32 bytes, tiene: ${clave.length}`);
        }
        
        console.log('Cifrando video con ChaCha20-Poly1305:', {
            tamañoVideo: videoBytes.length,
            tamañoClave: clave.length
        });
        
        // Generar nonce de 12 bytes (requerido por ChaCha20-Poly1305)
        const nonce = randomBytes(12);
        console.log('Nonce generado:', nonce.length, 'bytes');
        
        // Crear cipher de ChaCha20-Poly1305
        // chacha20poly1305(key, nonce, AAD?) - AAD es opcional
        const cipher = chacha20poly1305(clave, nonce);
        console.log('Cipher ChaCha20-Poly1305 creado');
        
        // Cifrar el video
        // El método encrypt incluye automáticamente el authentication tag de 16 bytes
        console.log('Iniciando cifrado autenticado...');
        const ciphertext = cipher.encrypt(videoBytes);
        console.log('Cifrado completado:', ciphertext.length, 'bytes');
        
        // El ciphertext ya incluye el tag de autenticación al final (16 bytes)
        // Formato: nonce (12 bytes) + ciphertext + authTag (16 bytes ya incluido)
        const resultado = new Uint8Array(nonce.length + ciphertext.length);
        resultado.set(nonce, 0);
        resultado.set(ciphertext, nonce.length);
        
        console.log('Video cifrado exitosamente con autenticación:', {
            tamañoOriginal: videoBytes.length,
            tamañoCifrado: resultado.length,
            nonce: nonce.length,
            ciphertextConTag: ciphertext.length
        });
        
        return resultado;
        
    } catch (error) {
        console.error('Error detallado al cifrar:', error);
        console.error('Stack trace:', error.stack);
        throw new Error(`Error al cifrar video con ChaCha20-Poly1305: ${error.message}`);
    }
}

/**
 * Descifra un video con ChaCha20-Poly1305 (verifica autenticación)
 * @param {Uint8Array} videoCifrado - Video cifrado (nonce + ciphertext + authTag)
 * @param {Uint8Array} clave - Clave de 32 bytes
 * @returns {Uint8Array} Video descifrado
 */
export function descifrarVideoConChaCha20(videoCifrado, clave) {
    try {
        console.log('🔓 Descifrando video con ChaCha20-Poly1305:', {
            tamañoCifrado: videoCifrado.length,
            tamañoClave: clave.length
        });
        
        // Separar nonce y ciphertext (que incluye el tag)
        const nonce = videoCifrado.slice(0, 12);
        const ciphertext = videoCifrado.slice(12);
        
        console.log('📦 Componentes separados:', {
            nonce: nonce.length,
            ciphertextConTag: ciphertext.length
        });
        
        // Crear decipher de ChaCha20-Poly1305
        const decipher = chacha20poly1305(clave, nonce);
        console.log('✅ Decipher ChaCha20-Poly1305 creado');
        
        // Descifrar y verificar autenticación
        // Si el tag no es válido, lanzará un error automáticamente
        console.log('🔓 Iniciando descifrado y verificación...');
        const plaintext = decipher.decrypt(ciphertext);
        console.log('✅ Descifrado completado:', plaintext.length, 'bytes');
        
        return plaintext;
        
    } catch (error) {
        console.error('❌ Error al descifrar:', error);
        // Si el error es de autenticación, dar un mensaje más específico
        if (error.message.includes('authentication') || error.message.includes('tag')) {
            throw new Error('Error de autenticación: el video ha sido modificado o la clave es incorrecta');
        }
        throw new Error(`Error al descifrar video con ChaCha20-Poly1305: ${error.message}`);
    }
}

// ========================
// UTILIDADES
// ========================

/**
 * Genera una clave simétrica aleatoria de 32 bytes (256 bits)
 * @returns {Uint8Array} Clave aleatoria
 */
export function generarClaveSimetrica() {
    return randomBytes(32);
}

/**
 * Exporta una clave en formato base64
 * @param {Uint8Array} clave
 * @returns {string} Clave en base64
 */
export function exportarClave(clave) {
    return btoa(String.fromCharCode(...clave));
}

/**
 * Importa una clave desde base64
 * @param {string} claveBase64
 * @returns {Uint8Array} Clave en bytes
 */
export function importarClave(claveBase64) {
    const binary = atob(claveBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

// ========================
// FUNCIONES LEGACY (para compatibilidad)
// ========================

/**
 * @deprecated Usar cifrarClaveConRSA en su lugar
 */
export function cifrarTexto(mensaje) {
    console.warn('cifrarTexto está deprecated. Usar cifrarClaveConRSA para claves.');
    
    if (!mensaje || typeof mensaje !== 'string') {
        throw new Error('El mensaje debe ser una cadena no vacía');
    }
    
    try {
        const nonce = randomBytes(12);
        // Clave dummy de 32 bytes para compatibilidad
        const KEY = new Uint8Array(32);
        
        const cipher = chacha20poly1305(KEY, nonce);
        const msgBytes = new TextEncoder().encode(mensaje);
        const ciphertext = cipher.encrypt(msgBytes);
        
        const total = new Uint8Array(nonce.length + ciphertext.length);
        total.set(nonce);
        total.set(ciphertext, nonce.length);
        
        return btoa(String.fromCharCode(...total));
    } catch (error) {
        throw new Error(`Error al cifrar: ${error.message}`);
    }
}

/**
 * @deprecated Usar descifrarVideoConChaCha20 en su lugar
 */
export function descifrarTexto(mensajeCifrado) {
    console.warn('descifrarTexto está deprecated.');
    
    if (!mensajeCifrado || typeof mensajeCifrado !== 'string') {
        throw new Error('El mensaje cifrado debe ser una cadena no vacía');
    }
    
    try {
        const total = Uint8Array.from(atob(mensajeCifrado), c => c.charCodeAt(0));
        const nonce = total.slice(0, 12);
        const ciphertext = total.slice(12);
        
        // Clave dummy de 32 bytes para compatibilidad
        const KEY = new Uint8Array(32);
        const decipher = chacha20poly1305(KEY, nonce);
        const plaintext = decipher.decrypt(ciphertext);
        
        return new TextDecoder().decode(plaintext);
    } catch (error) {
        throw new Error(`Error al descifrar: ${error.message}`);
    }
}
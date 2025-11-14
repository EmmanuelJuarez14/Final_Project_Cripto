from Crypto.Cipher import ChaCha20
import base64
import os

# ===============================================================
# LLAVE DEL SISTEMA
# ===============================================================
# ChaCha20 usa claves de 32 bytes.
# IMPORTANTE: En un sistema real esto va en variables de entorno
KEY = b"Clave_Segura_Para_ChaCha20_Proyecto!!"[:32]

# ===============================================================
# CIFRAR TEXTO (ej: contraseñas)
# ===============================================================
def cifrar_texto(mensaje: str) -> str:
    """
    Cifra un texto usando ChaCha20 y devuelve un string en Base64
    que contiene: NONCE + CIFERTEXT
    """
    nonce = os.urandom(12)  # tamaño recomendado para ChaCha20
    cipher = ChaCha20.new(key=KEY, nonce=nonce)
    ciphertext = cipher.encrypt(mensaje.encode())

    # Guardamos nonce + ciphertext en un solo string base64
    datos = base64.b64encode(nonce + ciphertext).decode()
    return datos


# ===============================================================
# DESCIFRAR TEXTO
# ===============================================================
def descifrar_texto(texto_cifrado: str) -> str:
    """
    Recibe un string base64 que contiene NONCE + CIFERTEXT
    y devuelve el texto original desencriptado.
    """
    datos = base64.b64decode(texto_cifrado)
    nonce = datos[:12]
    ciphertext = datos[12:]

    cipher = ChaCha20.new(key=KEY, nonce=nonce)
    mensaje = cipher.decrypt(ciphertext)

    return mensaje.decode()

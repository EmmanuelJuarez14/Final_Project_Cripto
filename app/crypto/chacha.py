from Crypto.Cipher import ChaCha20
import base64
import os

# ChaCha20 32 bytes.
KEY = b"Clave_Segura_Para_ChaCha20_Proyecto!!"[:32]

# CIFRAR TEXTO (ej: contraseñas)
def cifrar_texto(mensaje: str) -> str:
    nonce = os.urandom(12)  # tamaño recomendado para ChaCha20
    cipher = ChaCha20.new(key=KEY, nonce=nonce)
    ciphertext = cipher.encrypt(mensaje.encode())

    # Guardamos nonce + ciphertext en un solo string base64
    datos = base64.b64encode(nonce + ciphertext).decode()
    return datos

# DESCIFRAR TEXTO
def descifrar_texto(texto_cifrado: str) -> str:
    # Recibe un string base64 que contiene NONCE + CIFERTEXT
    # y devuelve el texto original desencriptado.
    datos = base64.b64decode(texto_cifrado)
    nonce = datos[:12]
    ciphertext = datos[12:]

    cipher = ChaCha20.new(key=KEY, nonce=nonce)
    mensaje = cipher.decrypt(ciphertext)

    return mensaje.decode()

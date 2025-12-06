from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes

from app.crypto.rsa_keys import load_private_key, load_public_key

def rsa_encrypt_key(sym_key: bytes) -> bytes:
    """Cifra clave simétrica usando RSA-OAEP."""
    public_key = load_public_key()

    encrypted = public_key.encrypt(
        sym_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return encrypted

def rsa_decrypt_key(cipher_key: bytes) -> bytes:
    """Descifra clave simétrica usando RSA-OAEP."""
    private_key = load_private_key()

    decrypted = private_key.decrypt(
        cipher_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    return decrypted

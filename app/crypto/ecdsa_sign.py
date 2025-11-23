import hashlib
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from app.crypto.ecdsa_keys import load_private_key, load_public_key


def hash_file(path: str) -> str:
    sha = hashlib.sha256()

    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha.update(chunk)

    return sha.hexdigest()


def sign_hash(hex_hash: str) -> bytes:
    private_key = load_private_key()
    signature = private_key.sign(
        hex_hash.encode(),
        ec.ECDSA(hashes.SHA256())
    )
    return signature


def verify_signature(hex_hash: str, signature: bytes) -> bool:
    public_key = load_public_key()
    try:
        public_key.verify(
            signature,
            hex_hash.encode(),
            ec.ECDSA(hashes.SHA256())
        )
        return True
    except:
        return False

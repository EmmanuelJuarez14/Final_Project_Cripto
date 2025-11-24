import hashlib
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives import hashes
from app.crypto.ecdsa_keys import load_private_key, load_public_key

def hash_file(path: str) -> bytes:
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha.update(chunk)
    return sha.digest()

def sign_hash(hash_bytes: bytes) -> bytes:
    private_key = load_private_key()
    signature = private_key.sign(
        hash_bytes,
        ec.ECDSA(utils.Prehashed(hashes.SHA256())) 
    )
    return signature

def verify_signature(hash_bytes: bytes, signature: bytes) -> bool:
    public_key = load_public_key()
    try:
        public_key.verify(
            signature,
            hash_bytes,
            ec.ECDSA(utils.Prehashed(hashes.SHA256()))
        )
        return True
    except Exception:
        return False
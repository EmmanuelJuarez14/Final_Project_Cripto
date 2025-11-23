from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import os

from app.database import get_db
from app.models import Video
from app.schemas.video import VideoRespuesta

# 🔐 Importar funciones de hash y firma
from app.crypto.ecdsa_sign import hash_file, sign_hash, verify_signature
import re

router = APIRouter()

UPLOAD_DIR = "videos_cifrados"


# ================================================================
#  POST /videos/upload
#  Sube video cifrado + genera hash SHA-256 + firma digital ECDSA
# ================================================================
@router.post("/videos/upload", response_model=VideoRespuesta)
async def subir_video(
    titulo: str = Form(...),
    descripcion: str = Form(None),
    key_cifrada: str = Form(...),  # clave simétrica cifrada desde el front-end
    autor_id: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validar formato de archivo
    if not archivo.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(400, "Formato de video no permitido.")

    # Crear nombre de archivo único
    # Limpia el nombre del archivo para evitar espacios o caracteres problemáticos
    nombre_limpio = re.sub(r'[^a-zA-Z0-9._-]', '_', archivo.filename)

    # Crear nombre único sin espacios
    nombre_archivo = f"{uuid.uuid4()}_{nombre_limpio}"
    ruta_completa = os.path.join(UPLOAD_DIR, nombre_archivo)

    # Crear el directorio si no existe
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Guardar archivo cifrado tal como llega
    with open(ruta_completa, "wb") as buffer:
        contenido = await archivo.read()
        buffer.write(contenido)

    # =============================
    # 🔐 Semana 3: Criptografía
    # =============================

    # 1) Hash SHA-256 del archivo cifrado
    hash_archivo = hash_file(ruta_completa)

    # 2) Firma digital ECDSA del hash
    firma_bytes = sign_hash(hash_archivo)
    firma_hex = firma_bytes.hex()

    # Registrar en BD
    nuevo = Video(
        titulo=titulo,
        descripcion=descripcion,
        ruta_archivo=ruta_completa,
        autor_id=autor_id,
        key_cifrada=key_cifrada,
        hash_archivo=hash_archivo,
        firma=firma_hex
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo


# ================================================================
#  GET /videos/verify/{id}
#  Verifica integridad + autentica firma digital del video
# ================================================================
@router.get("/videos/verify/{video_id}")
def verificar_video(video_id: int, db: Session = Depends(get_db)):

    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    # Recalcular hash actual del archivo
    hash_actual = hash_file(video.ruta_archivo)

    integridad_ok = (hash_actual == video.hash_archivo)

    # Verificar firma digital ECDSA
    firma_bytes = bytes.fromhex(video.firma)
    #firma_ok = verify_signature(video.hash_archivo, firma_bytes)
    firma_ok = verify_signature(hash_actual, firma_bytes)


    return {
        "video_id": video_id,
        "integridad": "válida" if integridad_ok else "corrupta",
        "firma": "válida" if firma_ok else "inválida",
        "hash_actual": hash_actual,
        "hash_registrado": video.hash_archivo
    }


# ================================================================
#  GET /videos/my_videos
#  Muestra todos los videos del usuario
# ================================================================
@router.get("/videos/my_videos")
def mis_videos(autor_id: int, db: Session = Depends(get_db)):
    return db.query(Video).filter(Video.autor_id == autor_id).all()

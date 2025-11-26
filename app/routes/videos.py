# app/routes/videos.py

import os
import uuid
import base64

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import FileResponse

from app.database import get_db
from app.models import Video, Solicitud
from app.dependencies import get_current_user

from app.crypto.ecdsa_sign import hash_file, sign_hash, verify_signature
from app.crypto.rsa_oaep import rsa_encrypt_key, rsa_decrypt_key

router = APIRouter(prefix="/videos", tags=["Videos"])

VIDEOS_DIR = "videos_cifrados"
os.makedirs(VIDEOS_DIR, exist_ok=True)


# ============================================================
#   🔐 ENDPOINT: SUBIR VIDEO (con ECDSA + RSA-OAEP)
# ============================================================

@router.post("/upload_video")
async def subir_video(
    archivo: UploadFile = File(...),
    titulo: str = Form(...),
    descripcion: str = Form(""),
    key_cifrada: str = Form(...),             # clave simétrica cifrada por el front (base64)
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    # --------------------------------------------------------
    # 1. Guardar archivo físicamente con nombre seguro
    # --------------------------------------------------------
    extension = archivo.filename.split(".")[-1]
    nombre_seguro = f"{uuid.uuid4()}.{extension}"
    ruta = os.path.join(VIDEOS_DIR, nombre_seguro)

    with open(ruta, "wb") as f:
        f.write(await archivo.read())

    # --------------------------------------------------------
    # 2. Generar hash SHA-256 (bytes crudos)
    # --------------------------------------------------------
    video_hash = hash_file(ruta)

    # --------------------------------------------------------
    # 3. Firmar hash con ECDSA
    # --------------------------------------------------------
    firma = sign_hash(video_hash)

    # --------------------------------------------------------
    # 4. Cifrar clave simétrica con RSA-OAEP
    # --------------------------------------------------------
    key_raw = base64.b64decode(key_cifrada)
    key_cifrada_rsa = rsa_encrypt_key(key_raw)
    key_cifrada_b64 = base64.b64encode(key_cifrada_rsa).decode()

    # --------------------------------------------------------
    # 5. Guardar registro en la BD
    # --------------------------------------------------------
    nuevo = Video(
        titulo=titulo,
        descripcion=descripcion,
        ruta_archivo=ruta,
        key_cifrada=key_cifrada_b64,
        firma=base64.b64encode(firma).decode(),
        autor_id=current_user.id
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return {
        "mensaje": "Video subido correctamente",
        "video_id": nuevo.id
    }


# ============================================================
#   🔍 VERIFICAR FIRMA DE VIDEO
# ============================================================

@router.get("/verify_signature/{video_id}")
def verificar(video_id: int, db: Session = Depends(get_db)):

    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    hash_bytes = hash_file(video.ruta_archivo)
    firma_bytes = base64.b64decode(video.firma)

    valido = verify_signature(hash_bytes, firma_bytes)

    return {
        "video_id": video_id,
        "integridad": "válida" if valido else "corrupta"
    }


# ============================================================
#   📥 SOLICITAR ACCESO A VIDEO
# ============================================================

@router.post("/request_access/{video_id}")
def solicitar_acceso(
    video_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    solicitud = Solicitud(
        solicitante_id=current_user.id,
        video_id=video_id,
        estado="pendiente"
    )

    db.add(solicitud)
    db.commit()
    return {"mensaje": "Solicitud enviada"}


# ============================================================
#   ✔ APROBAR / RECHAZAR ACCESO
# ============================================================

@router.post("/approve_request/{solicitud_id}")
def aprobar(
    solicitud_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sol = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")

    video = db.query(Video).filter(Video.id == sol.video_id).first()

    if video.autor_id != current_user.id:
        raise HTTPException(403, "No eres dueño del video.")

    sol.estado = "aprobado"
    db.commit()

    return {"mensaje": "Solicitud aprobada"}


@router.post("/reject_request/{solicitud_id}")
def rechazar(
    solicitud_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    sol = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")

    video = db.query(Video).filter(Video.id == sol.video_id).first()

    if video.autor_id != current_user.id:
        raise HTTPException(403, "No eres dueño del video.")

    sol.estado = "rechazado"
    db.commit()

    return {"mensaje": "Solicitud rechazada"}


# ============================================================
#   🔓 DESCARGAR VIDEO (solo si aprobado)
# ============================================================

@router.get("/download/{video_id}")
def descargar(
    video_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    # Verificar permiso
    sol = db.query(Solicitud).filter(
        Solicitud.video_id == video_id,
        Solicitud.solicitante_id == current_user.id,
        Solicitud.estado == "aprobado"
    ).first()

    if not sol and current_user.id != video.autor_id:
        raise HTTPException(403, "No tienes permiso para ver este video.")

    return FileResponse(video.ruta_archivo)

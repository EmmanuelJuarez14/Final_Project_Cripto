from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import uuid
import os
import re

from app.database import get_db
from app.models import Video, Solicitud, Usuario
from app.dependencies import get_current_user
from app.crypto.signature import hash_file, sign_hash, verify_signature

router = APIRouter(prefix="/videos", tags=["videos"])

UPLOAD_DIR = "videos_cifrados"


# ================================================================
# SUBIR VIDEO (con firma ECDSA)
# ================================================================
@router.post("/upload")
async def upload_video(
    titulo: str = Form(...),
    descripcion: str = Form(None),
    key_cifrada: str = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):

    if not archivo.filename.lower().endswith((".mp4", ".mov", ".mkv", ".avi")):
        raise HTTPException(400, "Formato de video no permitido.")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    nombre_limpio = re.sub(r'[^a-zA-Z0-9._-]', '_', archivo.filename)
    nombre_final = f"{uuid.uuid4()}_{nombre_limpio}"
    ruta = os.path.join(UPLOAD_DIR, nombre_final)

    with open(ruta, "wb") as buffer:
        buffer.write(await archivo.read())

    # HASH + FIRMA (Semana 3)
    hash_bytes = hash_file(ruta)
    firma_bytes = sign_hash(hash_bytes)

    nuevo = Video(
        titulo=titulo,
        descripcion=descripcion,
        ruta_archivo=ruta,
        autor_id=current_user.id,
        key_cifrada=key_cifrada,
        hash_archivo=hash_bytes.hex(),
        firma=firma_bytes.hex()
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return {"mensaje": "Video subido", "id": nuevo.id}


# ================================================================
# VERIFICAR INTEGRIDAD + FIRMA DIGITAL
# ================================================================
@router.get("/verify_signature/{video_id}")
def verify(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    hash_actual = hash_file(video.ruta_archivo).hex()
    integridad = (hash_actual == video.hash_archivo)

    firma_bytes = bytes.fromhex(video.firma)
    firma_ok = verify_signature(bytes.fromhex(hash_actual), firma_bytes)

    return {
        "integridad": "válida" if integridad else "corrupta",
        "firma": "válida" if firma_ok else "inválida"
    }


# ================================================================
# SOLICITAR ACCESO AL VIDEO (Semana 3)
# ================================================================
@router.post("/request_access/{video_id}")
def request_access(video_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    existente = db.query(Solicitud).filter(
        Solicitud.video_id == video_id,
        Solicitud.solicitante_id == current_user.id
    ).first()

    if existente:
        raise HTTPException(400, "Ya existe una solicitud para este video.")

    nueva = Solicitud(
        video_id=video_id,
        solicitante_id=current_user.id,
        estado="pendiente"
    )

    db.add(nueva)
    db.commit()
    return {"mensaje": "Solicitud enviada."}



# APROBAR SOLICITUD (solo AUTOR del video)
@router.post("/approve_request/{solicitud_id}")
def approve_request(solicitud_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    sol = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")

    video = db.query(Video).filter(Video.id == sol.video_id).first()

    if video.autor_id != current_user.id:
        raise HTTPException(403, "No eres el dueño del video.")

    sol.estado = "aprobado"
    db.commit()
    return {"mensaje": "Solicitud aprobada"}

# RECHAZAR SOLICITUD (solo AUTOR)
@router.post("/reject_request/{solicitud_id}")
def reject_request(solicitud_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    sol = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not sol:
        raise HTTPException(404, "Solicitud no encontrada")

    video = db.query(Video).filter(Video.id == sol.video_id).first()

    if video.autor_id != current_user.id:
        raise HTTPException(403, "No eres el dueño del video.")

    sol.estado = "rechazado"
    db.commit()
    return {"mensaje": "Solicitud rechazada"}



# DESCARGAR VIDEO (solo autor o autorizado)
@router.get("/download/{video_id}")
def download(video_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    # Autor siempre tiene acceso
    if video.autor_id == current_user.id:
        return FileResponse(video.ruta_archivo)

    # Verificar solicitud aprobada
    sol = db.query(Solicitud).filter(
        Solicitud.video_id == video_id,
        Solicitud.solicitante_id == current_user.id,
        Solicitud.estado == "aprobado"
    ).first()

    if sol:
        return FileResponse(video.ruta_archivo)

    raise HTTPException(403, "No tienes permiso para acceder a este video.")

# app/routes/videos.py

import os
import uuid
import base64

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.database import get_db
from app.models import Video, Solicitud, Usuario
from app.dependencies import get_current_user
from app.crypto.ecdsa_sign import hash_file, sign_hash, verify_signature


class ApproveRequest(BaseModel):
    encrypted_key: str

router = APIRouter(prefix="/videos", tags=["Videos"])

VIDEOS_DIR = "videos_cifrados"
os.makedirs(VIDEOS_DIR, exist_ok=True)


# Subir Video 

@router.post("/upload_video")
async def subir_video(
    archivo: UploadFile = File(...),
    titulo: str = Form(...),
    descripcion: str = Form(""),
    key_cifrada: str = Form(...),             # clave simétrica cifrada por el front (base64)
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    # Formato de nombre correcto
    extension = archivo.filename.split(".")[-1]
    nombre_seguro = f"{uuid.uuid4()}.{extension}"
    ruta = os.path.join(VIDEOS_DIR, nombre_seguro)

    with open(ruta, "wb") as f:
        f.write(await archivo.read())

    # Generar hash SHA-256 
    video_hash = hash_file(ruta)

    # Firmar ECDSA
    firma = sign_hash(video_hash)

    nuevo = Video(
        titulo=titulo,
        descripcion=descripcion,
        ruta_archivo=ruta,
        key_cifrada=key_cifrada, 
        hash_archivo=base64.b64encode(video_hash).decode(),
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

# Verifica firma
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


# Solicita acceso a un video
@router.post("/request_access/{video_id}")
def solicitar_acceso(
    video_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    # Verificar si ya existe solicitud
    existe = db.query(Solicitud).filter(
        Solicitud.solicitante_id == current_user.id,
        Solicitud.video_id == video_id
    ).first()

    if existe:
        raise HTTPException(400, "Ya existe una solicitud para este video")

    solicitud = Solicitud(
        solicitante_id=current_user.id,
        video_id=video_id,
        estado="pendiente"
    )

    db.add(solicitud)
    db.commit()
    return {"mensaje": "Solicitud enviada"}


# Ver video (Binario cifrado)

@router.get("/download/{video_id}")
def descargar(
    video_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(404, "Video no encontrado")

    # Verificar permiso: Soy autor O tengo solicitud aprobada
    sol = db.query(Solicitud).filter(
        Solicitud.video_id == video_id,
        Solicitud.solicitante_id == current_user.id,
        Solicitud.estado == "aprobado"
    ).first()

    if not sol and current_user.id != video.autor_id:
        raise HTTPException(403, "No tienes permiso para ver este video.")

    return FileResponse(video.ruta_archivo)


# Lista de solicitudes (para el autor de videos)
@router.get("/solicitudes")
def listar_solicitudes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtiene todas las solicitudes de acceso a los videos del usuario actual.
    Incluye la llave cifrada original del video y la llave pública del solicitante
    para poder hacer el intercambio.
    """
    solicitudes = (
        db.query(Solicitud)
        .join(Video, Solicitud.video_id == Video.id)
        .filter(Video.autor_id == current_user.id)
        .options(
            joinedload(Solicitud.solicitante_rel),
            joinedload(Solicitud.video_rel)
        )
        .all()
    )
    
    resultado = []
    for sol in solicitudes:
        resultado.append({
            "id": sol.id,
            "estado": sol.estado,
            "fecha_solicitud": sol.fecha_solicitud.isoformat() if sol.fecha_solicitud else None,
            "solicitante_id": sol.solicitante_id,
            "video_id": sol.video_id,
            "solicitante_rel": {
                "nombre": sol.solicitante_rel.nombre if sol.solicitante_rel else None,
                "email": sol.solicitante_rel.correo if sol.solicitante_rel else None,
                "public_key": sol.solicitante_rel.public_key # IMPORTANTE para el cifrado
            },
            "video_rel": {
                "titulo": sol.video_rel.titulo if sol.video_rel else None,
                "key_cifrada": sol.video_rel.key_cifrada # IMPORTANTE para el descifrado
            }
        })
    
    return {"items": resultado}

#   Aprobar solicitud (Intercambio de llave)
@router.post("/approve_request/{solicitud_id}")
def aprobar(
    solicitud_id: int,
    payload: ApproveRequest, # Recibimos la llave cifrada para el destinatario
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
    # Guardamos la llave que el frontend del dueño re-cifró para el solicitante
    sol.encrypted_key_for_requester = payload.encrypted_key 
    
    db.commit()

    return {"mensaje": "Solicitud aprobada y llave asignada correctamente"}

# Rechaza solicitud
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
    # Limpiamos llave por seguridad si existía
    sol.encrypted_key_for_requester = None 
    db.commit()

    return {"mensaje": "Solicitud rechazada"}

# Lista de videos de la comunidad
@router.get("/community")
def listar_videos_comunidad(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    videos = db.query(Video).options(joinedload(Video.autor_rel)).all()
    
    resultado = []
    for video in videos:
        # Verificar estado de solicitud
        solicitud = db.query(Solicitud).filter(
            Solicitud.video_id == video.id,
            Solicitud.solicitante_id == current_user.id
        ).first()
        
        es_autor = video.autor_id == current_user.id
        ya_solicitado = solicitud is not None and solicitud.estado == "pendiente"
        tiene_acceso = solicitud is not None and solicitud.estado == "aprobado"
        fue_rechazado = solicitud is not None and solicitud.estado == "rechazado"
        
        resultado.append({
            "id": video.id,
            "titulo": video.titulo,
            "descripcion": video.descripcion,
            "fecha_subida": video.fecha_subida.isoformat() if video.fecha_subida else None,
            "autor_id": video.autor_id,
            "autor_rel": {
                "nombre": video.autor_rel.nombre if video.autor_rel else None,
                "correo": video.autor_rel.correo if video.autor_rel else None
            },
            "es_autor": es_autor,
            "ya_solicitado": ya_solicitado,
            "tiene_acceso": tiene_acceso,
            "fue_rechazado": fue_rechazado
        })
    
    return {"items": resultado}

# Lista videos propios y compartidos
@router.get("/my_accessible_videos")
def listar_mis_videos_y_accesos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    
    # Aqui se obtienes mis propios videos
    mis_videos = (
        db.query(Video)
        .filter(Video.autor_id == current_user.id)
        .options(joinedload(Video.autor_rel))
        .all()
    )
    
    # Aqui obtienes los videos que se te aprobaron para ver 
    solicitudes_aprobadas = (
        db.query(Solicitud)
        .filter(
            Solicitud.solicitante_id == current_user.id,
            Solicitud.estado == "aprobado"
        )
        .options(joinedload(Solicitud.video_rel).joinedload(Video.autor_rel))
        .all()
    )
    
    resultado = []
    
    # Agregar mis videos
    for video in mis_videos:
        resultado.append({
            "id": video.id,
            "titulo": video.titulo,
            "descripcion": video.descripcion,
            "fecha_subida": video.fecha_subida.isoformat() if video.fecha_subida else None,
            "autor_id": video.autor_id,
            "key_cifrada": video.key_cifrada, # Llave para el dueño
            "llave_asignada": None,           # No aplica
            "autor_rel": {
                "nombre": video.autor_rel.nombre if video.autor_rel else None,
                "correo": video.autor_rel.correo if video.autor_rel else None
            },
            "es_autor": True,
            "tiene_acceso": True
        })
    
    # Agregar videos compartidos
    for sol in solicitudes_aprobadas:
        video = sol.video_rel
        if video:
            resultado.append({
                "id": video.id,
                "titulo": video.titulo,
                "descripcion": video.descripcion,
                "fecha_subida": video.fecha_subida.isoformat() if video.fecha_subida else None,
                "autor_id": video.autor_id,
                "key_cifrada": None, # No puedo ver la llave del dueño
                "llave_asignada": sol.encrypted_key_for_requester, # Llave re-cifrada para mí
                "autor_rel": {
                    "nombre": video.autor_rel.nombre if video.autor_rel else None,
                    "correo": video.autor_rel.correo if video.autor_rel else None
                },
                "es_autor": False,
                "tiene_acceso": True
            })
    
    # Ordenar por fecha de subida
    resultado.sort(key=lambda x: x["fecha_subida"] or "", reverse=True)
    
    return {"items": resultado}
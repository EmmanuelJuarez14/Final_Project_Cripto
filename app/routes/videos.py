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
from sqlalchemy.orm import joinedload
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
    print(key_cifrada)
    #key_raw = base64.b64decode(key_cifrada)
    #key_cifrada_rsa = rsa_encrypt_key(key_raw)
    #key_cifrada_b64 = base64.b64encode(key_cifrada_rsa).decode()

    # --------------------------------------------------------
    # 5. Guardar registro en la BD
    # --------------------------------------------------------
    nuevo = Video(
    titulo=titulo,
    descripcion=descripcion,
    ruta_archivo=ruta,
    key_cifrada=key_cifrada,
    hash_archivo=base64.b64encode(video_hash).decode(),  # <-- FALTABA ESTO
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


# ============================================================
#   VER VIDEOS PROPIOS
# ============================================================

@router.get("/my_videos")
def obtener_mis_videos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    videos = db.query(Video).filter(Video.autor_id == current_user.id).all()
    
    return {
        "total": len(videos),
        "videos": [
            {
                "id": v.id,
                "titulo": v.titulo,
                "descripcion": v.descripcion,
                "fecha_subida": v.fecha_subida,
                "ruta_archivo": v.ruta_archivo
            }
            for v in videos
        ]
    }


# Agregar estos endpoints al final de app/routes/videos.py

from sqlalchemy.orm import joinedload

# ============================================================
#   📋 LISTAR SOLICITUDES (para el autor de videos)
# ============================================================

@router.get("/solicitudes")
def listar_solicitudes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtiene todas las solicitudes de acceso a los videos del usuario actual
    """
    # Obtener todas las solicitudes de los videos del usuario actual
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
                "email": sol.solicitante_rel.correo if sol.solicitante_rel else None
            },
            "video_rel": {
                "titulo": sol.video_rel.titulo if sol.video_rel else None
            }
        })
    
    return {"items": resultado}


# ============================================================
#   ✔ APROBAR SOLICITUD (actualizado)
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


# ============================================================
#   ❌ RECHAZAR SOLICITUD (actualizado)
# ============================================================

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
#   🌐 LISTAR VIDEOS DE LA COMUNIDAD
# ============================================================

@router.get("/community")
def listar_videos_comunidad(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtiene todos los videos disponibles en la comunidad con información
    sobre si el usuario ya solicitó acceso o ya tiene acceso
    """
    from app.models import Usuario
    
    # Obtener todos los videos
    videos = db.query(Video).options(joinedload(Video.autor_rel)).all()
    
    resultado = []
    for video in videos:
        # Verificar si el usuario ya tiene una solicitud para este video
        solicitud = db.query(Solicitud).filter(
            Solicitud.video_id == video.id,
            Solicitud.solicitante_id == current_user.id
        ).first()
        
        # Determinar el estado
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


# ============================================================
#   📺 LISTAR MIS VIDEOS Y VIDEOS CON ACCESO APROBADO
# ============================================================

@router.get("/my_accessible_videos")
def listar_mis_videos_y_accesos(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Obtiene todos los videos del usuario actual (como autor)
    y los videos a los que tiene acceso aprobado
    """
    from app.models import Usuario
    
    # 1. Obtener mis propios videos (donde soy autor)
    mis_videos = (
        db.query(Video)
        .filter(Video.autor_id == current_user.id)
        .options(joinedload(Video.autor_rel))
        .all()
    )
    
    # 2. Obtener videos con acceso aprobado
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
            "ruta_archivo": video.ruta_archivo,
            "key_cifrada": video.key_cifrada,
            "autor_rel": {
                "nombre": video.autor_rel.nombre if video.autor_rel else None,
                "correo": video.autor_rel.correo if video.autor_rel else None
            },
            "es_autor": True,
            "tiene_acceso": True
        })
    
    # Agregar videos con acceso aprobado
    for sol in solicitudes_aprobadas:
        video = sol.video_rel
        if video:
            resultado.append({
                "id": video.id,
                "titulo": video.titulo,
                "descripcion": video.descripcion,
                "fecha_subida": video.fecha_subida.isoformat() if video.fecha_subida else None,
                "autor_id": video.autor_id,
                "ruta_archivo": video.ruta_archivo,
                "key_cifrada": video.key_cifrada,
                "autor_rel": {
                    "nombre": video.autor_rel.nombre if video.autor_rel else None,
                    "correo": video.autor_rel.correo if video.autor_rel else None
                },
                "es_autor": False,
                "tiene_acceso": True
            })
    
    # Eliminar duplicados por ID (en caso de que existan)
    videos_unicos = {v["id"]: v for v in resultado}
    resultado_final = list(videos_unicos.values())
    
    # Ordenar por fecha de subida (más recientes primero)
    resultado_final.sort(key=lambda x: x["fecha_subida"] or "", reverse=True)
    
    return {"items": resultado_final}

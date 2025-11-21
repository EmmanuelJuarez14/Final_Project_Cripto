from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import os

from app.database import get_db
from app.models import Video
from app.schemas.video import VideoRespuesta

router = APIRouter()

UPLOAD_DIR = "videos_cifrados"


@router.post("/videos/upload", response_model=VideoRespuesta)
async def subir_video(
    titulo: str = Form(...),
    descripcion: str = Form(None),
    key_cifrada: str = Form(...),  # clave cifrada por el front
    autor_id: int = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Verificar tipo de archivo
    if not archivo.filename.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        raise HTTPException(400, "Formato de video no permitido.")

    # Generar nombre único
    nombre_archivo = f"{uuid.uuid4()}_{archivo.filename}"
    ruta_completa = os.path.join(UPLOAD_DIR, nombre_archivo)

    # Guardar archivo cifrado tal como llega
    with open(ruta_completa, "wb") as buffer:
        contenido = await archivo.read()
        buffer.write(contenido)

    # Registrar en BD
    nuevo = Video(
        titulo=titulo,
        descripcion=descripcion,
        ruta_archivo=ruta_completa,
        autor_id=autor_id,
        key_cifrada=key_cifrada,
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo

@router.get("/my_videos")
def mis_videos(autor_id: int, db: Session = Depends(get_db)):
    # Retorna todos los videos pertenecientes al usuario especificado.
    videos = db.query(Video).filter(Video.autor_id == autor_id).all()
    return videos

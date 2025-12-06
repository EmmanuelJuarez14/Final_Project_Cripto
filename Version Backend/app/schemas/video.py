from pydantic import BaseModel

class VideoBase(BaseModel):
    titulo: str
    descripcion: str | None = None
    key_cifrada: str  # clave simétrica cifrada enviada por el front-end

class VideoRespuesta(BaseModel):
    id: int
    titulo: str
    descripcion: str | None
    ruta_archivo: str
    autor_id: int

    model_config = {
        "from_attributes": True
    }

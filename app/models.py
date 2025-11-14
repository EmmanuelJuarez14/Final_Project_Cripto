from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# ============================================================
# MODELO USUARIO
# ============================================================
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)

    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    
    # Contraseña cifrada con ChaCha20 y almacenada como base64
    password = Column(String, nullable=False)

    rol = Column(String, default="usuario")  # usuario / admin
    estado = Column(String, default="pendiente")  # pendiente / aprobado

    # Relación con videos
    videos = relationship("Video", back_populates="autor_rel")

    # Relación con solicitudes de acceso
    solicitudes = relationship("Solicitud", back_populates="solicitante_rel")


# ============================================================
# MODELO VIDEO
# ============================================================

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text)

    fecha_subida = Column(DateTime, default=datetime.utcnow)

    ruta_archivo = Column(String, nullable=False)

    # NUEVO: clave simétrica cifrada desde el front-end
    key_cifrada = Column(String, nullable=False)

    # Firma se usará en semana 3
    firma = Column(String, nullable=True)

    autor_id = Column(Integer, ForeignKey("usuarios.id"))

    autor_rel = relationship("Usuario", back_populates="videos")

    # 👉 ESTA RELACIÓN FALTABA
    solicitudes = relationship("Solicitud", back_populates="video_rel")


# ============================================================
# MODELO SOLICITUD
# ============================================================
class Solicitud(Base):
    __tablename__ = "solicitudes"

    id = Column(Integer, primary_key=True, index=True)

    solicitante_id = Column(Integer, ForeignKey("usuarios.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))

    estado = Column(String, default="pendiente")  # pendiente / aprobado / rechazado

    fecha_solicitud = Column(DateTime, default=datetime.utcnow)

    # Relación hacia usuario
    solicitante_rel = relationship("Usuario", back_populates="solicitudes")

    # Relación hacia video
    video_rel = relationship("Video", back_populates="solicitudes")

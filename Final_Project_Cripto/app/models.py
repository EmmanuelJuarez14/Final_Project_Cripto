from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

# MODELO USUARIO
class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    correo = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String, default="usuario")  # usuario / admin
    estado = Column(String, default="pendiente")  # pendiente / aprobado

    public_key = Column(Text, nullable=True)

    videos = relationship("Video", back_populates="autor_rel")
    solicitudes = relationship("Solicitud", back_populates="solicitante_rel")


# MODELO VIDEO
class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text)

    fecha_subida = Column(DateTime, default=datetime.utcnow)

    ruta_archivo = Column(String, nullable=False)

    # clave simétrica cifrada enviada por el front-end
    key_cifrada = Column(String, nullable=False)

    # Hash SHA-256 del archivo cifrado (nuevo en semana 3)
    hash_archivo = Column(String, nullable=False)

    # Firma digital ECDSA del hash
    firma = Column(String, nullable=False)

    autor_id = Column(Integer, ForeignKey("usuarios.id"))
    autor_rel = relationship("Usuario", back_populates="videos")

    # Relación con solicitudes de acceso
    solicitudes = relationship("Solicitud", back_populates="video_rel")


# MODELO SOLICITUD
class Solicitud(Base):
    __tablename__ = "solicitudes"

    id = Column(Integer, primary_key=True, index=True)
    solicitante_id = Column(Integer, ForeignKey("usuarios.id"))
    video_id = Column(Integer, ForeignKey("videos.id"))
    estado = Column(String, default="pendiente")  # pendiente / aprobado / rechazado
    fecha_solicitud = Column(DateTime, default=datetime.utcnow)

    encrypted_key_for_requester = Column(Text, nullable=True)

    # Relación hacia usuario
    solicitante_rel = relationship("Usuario", back_populates="solicitudes")

    # Relación hacia video
    video_rel = relationship("Video", back_populates="solicitudes")

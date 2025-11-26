# app/routes/auth.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt

from app.schemas.auth import RegistroUsuario, LoginUsuario, UsuarioRespuesta
from app.database import get_db
from app.models import Usuario
from app.config import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/auth", tags=["Auth"])


# ===============================================================
#   REGISTER — password viene en SHA-256 desde frontend
# ===============================================================

@router.post("/register", response_model=UsuarioRespuesta)
def registrar_usuario(data: RegistroUsuario, db: Session = Depends(get_db)):

    existente = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    if existente:
        raise HTTPException(400, "Correo ya registrado")

    nuevo = Usuario(
        nombre=data.nombre,
        correo=data.correo,
        password_hash=data.password_hash,  # SHA-256 ya viene del front
        estado="pendiente",
        rol="usuario"
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo


# ===============================================================
#   LOGIN — retorna JWT Bearer Token
# ===============================================================

@router.post("/login")
def login(data: LoginUsuario, db: Session = Depends(get_db)):

    usuario = db.query(Usuario).filter(Usuario.correo == data.correo).first()

    if not usuario:
        raise HTTPException(404, "Usuario no encontrado")

    if usuario.password_hash != data.password_hash:
        raise HTTPException(401, "Contraseña incorrecta")

    # Generar JWT
    token = jwt.encode({"id": usuario.id}, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario_id": usuario.id
    }

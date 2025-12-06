# app/routes/auth.py

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from jose import jwt

from app.schemas.auth import RegistroUsuario, LoginUsuario, UsuarioRespuesta
from app.database import get_db
from app.models import Usuario
from app.config import SECRET_KEY, ALGORITHM
from app.dependencies import get_current_user # Necesario para identificar al usuario al subir la llave


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

    # Comparación directa de hashes (Frontend Hash vs DB Hash)
    if usuario.password_hash != data.password_hash:
        raise HTTPException(401, "Contraseña incorrecta")
    
    # Validación de estado
    if usuario.estado == "pendiente":
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta aún está pendiente de aprobación por un administrador"
        )

    # Generar JWT
    token = jwt.encode({"id": usuario.id}, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario_id": usuario.id,
        "nombre": usuario.nombre,
        "rol": usuario.rol,
        "estado": usuario.estado,
        "primer_login": usuario.primer_login
    }


# ===============================================================
#   NUEVO: PUBLICAR LLAVE PÚBLICA (Para intercambio seguro)
# ===============================================================

@router.post("/users/me/public_key")
def update_public_key(
    public_key_pem: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Permite al usuario subir su Llave Pública RSA recién generada en el frontend.
    Esto es necesario para que otros usuarios (dueños de videos) puedan
    cifrarle la llave del video (Key Rewrapping) al aprobar una solicitud.
    """
    current_user.public_key = public_key_pem
    db.commit()
    
    return {"msg": "Llave pública actualizada correctamente"}

# ===============================================================
#   NUEVO: CONFIRMAR PRIMER LOGIN (Apagar bandera)
# ===============================================================
@router.post("/users/me/confirm_first_login")
def confirmar_primer_login(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    current_user.primer_login = False
    db.commit()
    return {"mensaje": "Primer login completado."}
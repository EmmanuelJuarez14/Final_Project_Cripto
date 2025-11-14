from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.schemas.auth import RegistroUsuario, LoginUsuario, UsuarioRespuesta
from app.database import get_db
from app.models import Usuario
from app.crypto.chacha import cifrar_texto, descifrar_texto

router = APIRouter()


# ============================================================
# REGISTER
# ============================================================
@router.post("/register", response_model=UsuarioRespuesta)
def registrar_usuario(data: RegistroUsuario, db: Session = Depends(get_db)):
    
    # Verificar si el correo ya existe
    existente = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    if existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    # Cifrar la contraseña con ChaCha20
    password_cifrada = cifrar_texto(data.password)

    # Crear el usuario
    nuevo = Usuario(
        nombre=data.nombre,
        correo=data.correo,
        password=password_cifrada,
        estado="pendiente",
        rol="usuario"
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo


# ============================================================
# LOGIN
# ============================================================
@router.post("/login")
def login(data: LoginUsuario, db: Session = Depends(get_db)):

    usuario = db.query(Usuario).filter(Usuario.correo == data.correo).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Desencriptar contraseña almacenada
    password_original = descifrar_texto(usuario.password)

    if password_original != data.password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    return {
        "mensaje": "Inicio de sesión exitoso",
        "usuario": {
            "id": usuario.id,
            "nombre": usuario.nombre,
            "correo": usuario.correo,
            "rol": usuario.rol,
            "estado": usuario.estado,
        }
    }

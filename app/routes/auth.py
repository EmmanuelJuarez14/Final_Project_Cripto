from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from jose import jwt

from app.schemas.auth import RegistroUsuario, LoginUsuario, UsuarioRespuesta
from app.database import get_db
from app.models import Usuario
from app.dependencies import SECRET_KEY, ALGORITHM

router = APIRouter()


# ===============================================================
#   REGISTER (semana 3: recibe password SHA-256 desde el front)
# ===============================================================
@router.post("/register", response_model=UsuarioRespuesta)
def registrar_usuario(data: RegistroUsuario, db: Session = Depends(get_db)):
    
    # Verificar si el correo ya existe
    existente = db.query(Usuario).filter(Usuario.correo == data.correo).first()
    if existente:
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    # Crear usuario
    nuevo = Usuario(
        nombre=data.nombre,
        correo=data.correo,
        password_hash=data.password_hash,   # hash SHA-256 generado en front-end
        estado="pendiente",
        rol="usuario"
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    return nuevo



# ===============================================================
#   LOGIN — retorna JWT (semana 3)
# ===============================================================
@router.post("/login")
def login(data: LoginUsuario, db: Session = Depends(get_db)):

    usuario = db.query(Usuario).filter(Usuario.correo == data.correo).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Comparar hash enviado VS hash almacenado
    if usuario.password_hash != data.password_hash:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")

    # -----------------------------------------------------------
    #   *** GENERAR JWT ***
    # -----------------------------------------------------------
    token = jwt.encode(
        {"id": usuario.id},        # solo necesitamos saber el usuario
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario_id": usuario.id
    }

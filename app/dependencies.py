from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import get_db
from app.models import Usuario

# Ruta donde se obtiene el token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Llave y algoritmo para JWT
SECRET_KEY = "CLAVE_SUPER_SECRETA_PARA_JWT_semana3"
ALGORITHM = "HS256"


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Obtiene el usuario actual basado en el token JWT.
    Semana 3: no hay roles, solo identificación básica.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )

    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()

    if usuario is None:
        raise HTTPException(401, "Usuario no encontrado")

    return usuario

# app/routes/admin.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, require_admin
from app.database import get_db
from app.models import Usuario

router = APIRouter(prefix="/admin", tags=["Admin"])

# ------------------------------------------------------------------
# LISTAR TODOS LOS USUARIOS
# ------------------------------------------------------------------
@router.get("/users")
def listar_usuarios(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(Usuario).all()


# ------------------------------------------------------------------
# USUARIOS PENDIENTES POR APROBAR
# ------------------------------------------------------------------
@router.get("/pending_users")
def usuarios_pendientes(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return db.query(Usuario).filter(Usuario.estado == "pendiente").all()


# ------------------------------------------------------------------
# APROBAR USUARIO
# ------------------------------------------------------------------
@router.post("/approve_user/{user_id}")
def aprobar_usuario(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    user.estado = "aprobado"
    db.commit()

    return {"mensaje": f"Usuario {user_id} aprobado."}


# ------------------------------------------------------------------
# PROMOVER A ADMIN
# ------------------------------------------------------------------
@router.post("/make_admin/{user_id}")
def hacer_admin(user_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    
    if not user:
        raise HTTPException(404, "Usuario no encontrado")

    user.rol = "admin"
    db.commit()

    return {"mensaje": f"Usuario {user_id} ahora es administrador."}

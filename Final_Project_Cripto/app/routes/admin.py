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

# ============================================================
#   🗑️ ELIMINAR USUARIO (Endpoint Faltante)
# ============================================================

@router.delete("/users/{user_id}")
def eliminar_usuario(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin = Depends(require_admin) # Solo un admin puede ejecutar esto
):
    # 1. Buscar al usuario que queremos borrar
    user_to_delete = db.query(Usuario).filter(Usuario.id == user_id).first()
    
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2. Protección: Evitar que el admin se borre a sí mismo por error
    if user_to_delete.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta de administrador.")

    # 3. Eliminar y guardar cambios
    db.delete(user_to_delete)
    db.commit()

    return {"mensaje": f"Usuario {user_to_delete.correo} eliminado correctamente."}

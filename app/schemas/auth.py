from pydantic import BaseModel, EmailStr

# Datos que llegan en /register
class RegistroUsuario(BaseModel):
    nombre: str
    correo: EmailStr
    password_hash: str

# Datos que llegan en /login
class LoginUsuario(BaseModel):
    correo: EmailStr
    password_hash: str

# Respuesta que regresamos al registrarse
class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    correo: str
    estado: str

    model_config = {
        "from_attributes": True
    }

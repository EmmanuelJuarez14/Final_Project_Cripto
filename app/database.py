from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Esto genera un archivo videos.db en la raíz del proyecto.
SQLALCHEMY_DATABASE_URL = "sqlite:///./videos.db"

# Conexion
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Necesario para SQLite en FastAPI
)

# Crear la sesión de base de datos
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Clase base para los modelos
Base = declarative_base()

# Dependencia de base de datos para FastAPI
def get_db():
    # Abre una sesión de BD por cada request y la cierra automáticamente.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

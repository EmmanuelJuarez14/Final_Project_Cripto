from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# -----------------------------------------
# 1. URL de la base de datos SQLite
# -----------------------------------------
# Esto genera un archivo videos.db en la raíz del proyecto.
SQLALCHEMY_DATABASE_URL = "sqlite:///./videos.db"

# -----------------------------------------
# 2. Crear el motor de conexión
# -----------------------------------------
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Necesario para SQLite en FastAPI
)

# -----------------------------------------
# 3. Crear la sesión de base de datos
# -----------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# -----------------------------------------
# 4. Clase base para los modelos
# -----------------------------------------
Base = declarative_base()

# -----------------------------------------
# 5. Dependencia de base de datos para FastAPI
# -----------------------------------------
def get_db():
    """
    Abre una sesión de BD por cada request y la cierra automáticamente.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

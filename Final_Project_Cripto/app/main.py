from fastapi import FastAPI
from app import models
from app.database import engine
from app.routes import auth
from app.routes import videos
from app.crypto.ecdsa_keys import generate_keys
from fastapi.middleware.cors import CORSMiddleware
from app.routes import admin
from app.crypto.rsa_keys import generate_rsa_keys

generate_rsa_keys()
generate_keys()

models.Base.metadata.create_all(bind=engine)


app = FastAPI(title="Streaming Secure Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Permitir desde cualquier origen
    allow_credentials=True,
    allow_methods=["*"],       # Permite POST, GET, OPTIONS, DELETE, etc.
    allow_headers=["*"],       # Permite cualquier header
)

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(videos.router)
@app.get("/")
def root():
    return {"mensaje": "Servidor backend funcionando correctamente"}

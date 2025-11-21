from fastapi import FastAPI
from app import models
from app.database import engine
from app.routes import auth
from app.routes import videos

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Streaming Secure Service")

app.include_router(auth.router)
app.include_router(videos.router)

@app.get("/")
def root():
    return {"mensaje": "Servidor backend funcionando correctamente"}

#!/bin/bash

uvicorn app.main:app --reload --port 8000

if [ -f "server_private.pem" ]; then
    chmod 600 app/crypto/ecdsa_private.pem
    echo "Permisos de llave guardados"
fi


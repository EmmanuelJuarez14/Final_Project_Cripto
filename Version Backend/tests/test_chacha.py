import sys
import os

# ---------------------------------------------------------
# AGREGAR RUTA ABSOLUTA DEL PROYECTO AL PYTHONPATH
# ---------------------------------------------------------
# Ruta absoluta a la raíz del proyecto
PROJECT_ROOT = "/home/emmanuel/Documentos/Final_project_cripto"

# Solo agregar si no está ya
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# ---------------------------------------------------------
# IMPORTAR FUNCIONES DE CHACHA
# ---------------------------------------------------------
from app.crypto.chacha import cifrar_texto, descifrar_texto

# ---------------------------------------------------------
# PRUEBA DE FUNCIONAMIENTO
# ---------------------------------------------------------
def main():
    texto = "Hola Mundo"
    cifrado = cifrar_texto(texto)
    descifrado = descifrar_texto(cifrado)

    print("Texto original:", texto)
    print("Texto cifrado:", cifrado)
    print("Texto descifrado:", descifrado)


if __name__ == "__main__":
    main()


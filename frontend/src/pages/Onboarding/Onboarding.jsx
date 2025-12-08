import { useState } from "react";
import { useNavigate } from "react-router-dom";
// IMPORTAMOS TODAS LAS FUNCIONES NECESARIAS
import { 
    descargarCopiaSeguridad, 
    inicializarSistemaCifrado, 
    obtenerClavePublicaPEM 
} from "../../utils/crypto";
import { toast } from "react-toastify";
import './_onboarding.scss';

const Onboarding = () => {
    const navigate = useNavigate();
    const [descargado, setDescargado] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDescargar = async () => {
        setLoading(true);
        try {
            const usuarioStr = localStorage.getItem("usuario");
            if (!usuarioStr) {
                toast.error("Sesión no encontrada. Inicia sesión nuevamente.");
                navigate("/login");
                return;
            }
            const usuario = JSON.parse(usuarioStr);

            // -----------------------------------------------------------
            // PASO 1: GARANTIZAR QUE EXISTAN LLAVES (Corrección del Error)
            // -----------------------------------------------------------
            // Esto verifica si hay llaves. Si no hay, las genera.
            await inicializarSistemaCifrado(usuario.nombre);

            // -----------------------------------------------------------
            // PASO 2: SINCRONIZAR CON EL SERVIDOR
            // -----------------------------------------------------------
            // Si las acabamos de generar, debemos subir la pública al backend
            // para que otros usuarios puedan compartirnos videos.
            const publicKeyPEM = obtenerClavePublicaPEM();
            if (publicKeyPEM) {
                await fetch(`${process.env.REACT_APP_API_URL}/auth/users/me/public_key`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${usuario.access_token}`
                    },
                    body: JSON.stringify({ public_key_pem: publicKeyPEM })
                });
            }

            // -----------------------------------------------------------
            // PASO 3: AHORA SÍ, DESCARGAR EL EXCEL
            // -----------------------------------------------------------
            await descargarCopiaSeguridad();
            
            setDescargado(true);
            toast.success("✅ Identidad descargada y sincronizada correctamente");

        } catch (error) {
            console.error(error);
            toast.error("Error al procesar llaves: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleContinuar = async () => {
        try {
            const usuarioStr = localStorage.getItem("usuario");
            const usuario = JSON.parse(usuarioStr);
            
            // 4. Avisar al backend que ya terminamos el onboarding
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/users/me/confirm_first_login`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${usuario.access_token}`
                }
            });

            if (response.ok) {
                // Actualizar localstorage para futuras sesiones
                usuario.primer_login = false;
                localStorage.setItem("usuario", JSON.stringify(usuario));

                toast.success("¡Configuración terminada!");

                // 5. Redirigir
                if (usuario.rol === 'admin') {
                    navigate("/administrador");
                } else {
                    navigate("/comunidad");
                }
            } else {
                toast.error("Error al confirmar con el servidor");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
        }
    };

    return (
        <div className="background d-flex flex-column justify-content-center align-items-center vh-100">
            <div className="card shadow-lg p-5" style={{maxWidth: "600px"}}>
                <div className="text-center mb-4">
                    <i className="bi bi-shield-lock-fill text-primary" style={{fontSize: "4rem"}}></i>
                    <h2 className="mt-3 fw-bold">Seguridad Criptográfica</h2>
                </div>
                
                <p className="text-muted text-center mb-4">
                    Bienvenido. Esta plataforma utiliza cifrado de extremo a extremo. 
                    Para garantizar que <strong>solo tú</strong> puedas acceder a tus videos, 
                    necesitas descargar tu <strong>Identidad Digital (Llaves)</strong>.
                </p>

                <div className="alert alert-warning" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <strong>Importante:</strong> Guarda este archivo en un lugar seguro. 
                    Si cambias de computadora o borras el historial, lo necesitarás para recuperar tu cuenta.
                </div>

                <div className="d-grid gap-3 mt-4">
                    <button 
                        className={`btn btn-lg ${descargado ? 'btn-success' : 'btn-primary'}`}
                        onClick={handleDescargar}
                        disabled={descargado || loading}
                    >
                        {loading ? "Generando llaves..." : 
                            (descargado ? <><i className="bi bi-check-circle-fill me-2"></i> Llaves Descargadas</> : <><i className="bi bi-download me-2"></i> 1. Descargar mis Llaves</>)
                        }
                    </button>

                    <button 
                        className="btn btn-outline-secondary"
                        onClick={handleContinuar}
                        disabled={!descargado} 
                    >
                        2. Continuar a la Plataforma <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { descargarCopiaSeguridad } from "../../utils/crypto";
import { toast } from "react-toastify";
import './_onboarding.scss'; // Puedes crear estilos básicos o usar bootstrap

const Onboarding = () => {
    const navigate = useNavigate();
    const [descargado, setDescargado] = useState(false);

    const handleDescargar = async () => {
        try {
            // 1. Descargar el Excel
            await descargarCopiaSeguridad();
            setDescargado(true);
            toast.success("Claves descargadas correctamente");
        } catch (error) {
            toast.error("Error al generar claves: " + error.message);
        }
    };

    const handleContinuar = async () => {
        try {
            // 2. Avisar al backend que ya descargamos (Apagar bandera)
            const usuarioStr = localStorage.getItem("usuario");
            const usuario = JSON.parse(usuarioStr);
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/users/me/confirm_first_login`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${usuario.access_token}`
                }
            });

            if (response.ok) {
                // Actualizar localstorage para futuras sesiones (opcional pero recomendado)
                usuario.primer_login = false;
                localStorage.setItem("usuario", JSON.stringify(usuario));

                // 3. Redirigir
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
        }
    };

    return (
        <div className="container d-flex flex-column justify-content-center align-items-center vh-100">
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
                        disabled={descargado}
                    >
                        {descargado ? <><i className="bi bi-check-circle-fill me-2"></i> Descargado</> : <><i className="bi bi-download me-2"></i> 1. Descargar mis Llaves</>}
                    </button>

                    <button 
                        className="btn btn-outline-secondary"
                        onClick={handleContinuar}
                        disabled={!descargado} // Bloqueado hasta que descargue
                    >
                        2. Continuar a la Plataforma <i className="bi bi-arrow-right ms-2"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
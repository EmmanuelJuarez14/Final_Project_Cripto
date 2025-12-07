import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import './_iniciarSesion.scss';
import PublicHeader from "../../components/PublicHeader/PublicHeader";
import ModalRestauracion from "../../components/ModalRestauracion/ModalRestauracion"; // <--- IMPORTAR

import { hashPassword } from "../../utils/hash"; 
// Importar 'existenClavesRSA' para verificar
import { inicializarSistemaCifrado, obtenerClavePublicaPEM, existenClavesRSA } from "../../utils/crypto";

const IniciarSesion = () => {
    
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    
    // Estado para el Modal
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [tempUserData, setTempUserData] = useState(null);

    const handleSubmit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleLogin();
    };

    const handleLogin = async () => {
        setLoading(true);

        try {
            const hashedPassword = hashPassword(password);
            const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    correo: email,
                    password_hash: hashedPassword 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                toast.error(data?.detail || "Error al iniciar sesión");
                setLoading(false);
                return;
            }

            // Guardar sesión
            localStorage.setItem("usuario", JSON.stringify(data));

            // ============================================================
            // 🧠 LÓGICA DE DETECCIÓN DE DISPOSITIVO / INCÓGNITO
            // ============================================================
            
            // CASO 1: Primer Login (Nunca ha tenido llaves) -> Ir a Onboarding
            if (data.primer_login) {
                navigate("/onboarding");
                return;
            }

            // CASO 2: Usuario Recurrente SIN LLAVES (Incógnito/Nuevo PC)
            if (!existenClavesRSA()) {
                console.warn("Detectado usuario recurrente sin llaves. Solicitando restauración.");
                setTempUserData(data); // Guardamos data temporalmente
                setShowRestoreModal(true); // ¡ALTO! Mostrar Modal
                setLoading(false); 
                return; // No navegamos aún
            }

            // CASO 3: Usuario Recurrente CON LLAVES (Mismo PC)
            // Sincronización silenciosa normal
            try {
                await inicializarSistemaCifrado(data.nombre);
                const pubKey = obtenerClavePublicaPEM();
                if(pubKey) {
                    await fetch(`${process.env.REACT_APP_API_URL}/auth/users/me/public_key`, {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${data.access_token}`
                        },
                        body: JSON.stringify({ public_key_pem: pubKey })
                    });
                }
            } catch (e) { console.error(e); }

            // Navegar
            completeLoginRedirect(data);

        } catch (error) {
            console.error(error);
            toast.error("Error de conexión");
            setLoading(false);
        }
    };

    // Función auxiliar para redirigir tras éxito
    const completeLoginRedirect = (userData) => {
        toast.success(`Bienvenido de nuevo, ${userData.nombre}`);
        if (userData.rol === "admin") {
            navigate("/administrador");
        } else {
            navigate("/comunidad");
        }
    };

    return (
        <div className="background">
            <PublicHeader />
            
            {/* --- MODAL DE RESTAURACIÓN --- */}
            <ModalRestauracion 
                show={showRestoreModal}
                usuarioData={tempUserData}
                onHide={() => setShowRestoreModal(false)}
                onSuccess={() => completeLoginRedirect(tempUserData)}
            />
            {/* ----------------------------- */}

            <form className="form__container" onSubmit={handleSubmit}>
                <h2 className="bold">Iniciar sesión</h2>
                <p>Completa los campos para ingresar a tu cuenta. ¿Aún no tienes una cuenta? <Link to="/signup"><u>crear cuenta</u></Link></p>
                
                <div className="mb-3">
                    <label htmlFor="email" className="form-label bold">Correo electrónico</label>
                    <input
                        type="email"
                        className="form__input--borde form-control"
                        id="email"
                        placeholder="ejemplo@correo.com"
                        value={email}
                        onChange={(e) => (setEmail(e.target.value))}
                        required
                    />
                </div>
                
                <div className="mb-3">
                    <label htmlFor="password" className="form-label bold">Contraseña</label>
                    <input
                        type="password"
                        className="form__input--borde form-control"
                        id="password"
                        required
                        minLength="8"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value) }}
                    />
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Ingresando...
                        </>
                    ) : (
                        "Ingresar"
                    )}
                </button>
            </form>
        </div>
    )
}

export default IniciarSesion;
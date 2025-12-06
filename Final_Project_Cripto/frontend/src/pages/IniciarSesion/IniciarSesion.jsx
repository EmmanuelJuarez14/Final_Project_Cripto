import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import './_iniciarSesion.scss';
import PublicHeader from "../../components/PublicHeader/PublicHeader";

// Utilidades de seguridad
import { hashPassword } from "../../utils/hash"; 
import { inicializarSistemaCifrado, obtenerClavePublicaPEM } from "../../utils/crypto";

const IniciarSesion = () => {
    
    const navigate = useNavigate();
    const [validated, setValidated] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = (event) => {
        const form = event.currentTarget;
        setValidated(true);
        if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
        } else {
            event.preventDefault();
            event.stopPropagation();
            handleLogin();
        }
    };

    const handleLogin = async () => {
        setLoading(true);

        try {
            // 1. Hasheamos la contraseña en el cliente (Requerimiento específico)
            const hashedPassword = hashPassword(password);

            // 2. Petición de Login
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

            // 3. Guardar sesión en el navegador
            localStorage.setItem("usuario", JSON.stringify(data));

            // ============================================================
            // 🚀 SINCRONIZACIÓN SILENCIOSA DE IDENTIDAD
            // ============================================================
            // Esto asegura que el usuario siempre tenga llaves (nuevas o existentes)
            // y que el servidor tenga su llave pública para recibir videos compartidos.
            try {
                // A. Generar claves en RAM/LocalStorage si no existen
                await inicializarSistemaCifrado(data.nombre);
                
                // B. Obtener la llave pública
                const publicKeyPEM = obtenerClavePublicaPEM();

                // C. Sincronizar con el servidor (para que otros puedan compartirme videos)
                if (publicKeyPEM) {
                    await fetch(`${process.env.REACT_APP_API_URL}/auth/users/me/public_key`, {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${data.access_token}`
                        },
                        body: JSON.stringify({
                            public_key_pem: publicKeyPEM
                        })
                    });
                }
            } catch (cryptoError) {
                console.warn("Advertencia: No se pudo sincronizar la identidad criptográfica", cryptoError);
            }
            // ============================================================

            toast.success(`Bienvenido, ${data.nombre}`);

            // 4. Redirección Inteligente (Flow de Onboarding vs Recurrente)
            if (data.primer_login) {
                // Si es su primera vez, lo mandamos a descargar sus llaves obligatoriamente
                navigate("/onboarding");
            } else {
                // Si ya es usuario recurrente, entra a su panel correspondiente
                if (data.rol === "admin") {
                    navigate("/administrador");
                } else {
                    navigate("/comunidad");
                }
            }

        } catch (error) {
            console.error(error);
            toast.error("Error de conexión con el servidor");
        }

        setLoading(false);
    };

    return (
        <div className="background">
            <PublicHeader />
            <form className={`needs-validation ${validated ? "was-validated" : ""} form__container`} noValidate onSubmit={handleSubmit}>
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
                    <div className="invalid-feedback">Por favor, introduce un correo válido.</div>
                </div>
                
                <div className="mb-3">
                    <label htmlFor="password" className="form-label bold">Contraseña</label>
                    <input
                        type="password"
                        className="form__input--borde form-control"
                        id="password"
                        placeholder="********"
                        required
                        minLength="8"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value) }}
                    />
                    <div className="invalid-feedback">La contraseña debe tener al menos 8 caracteres.</div>
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { importarClavesDesdeExcel, inicializarSistemaCifrado, obtenerClavePublicaPEM } from "../../utils/crypto";

const ModalRestauracion = ({ show, onHide, onSuccess, usuarioData }) => {
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);

    if (!show) return null;

    // A) Opción: Importar Respaldo (Lo recomendado)
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);

        try {
            await importarClavesDesdeExcel(file);
            toast.success("✅ Identidad restaurada correctamente.");
            onSuccess(); // Dejar pasar al usuario
        } catch (error) {
            console.error(error);
            toast.error("Error al leer el archivo: " + error.message);
        } finally {
            setLoading(false);
            e.target.value = null;
        }
    };

    // B) Opción: Generar Nuevas (Peligroso: pierde acceso a videos viejos)
    const handleGenerarNuevas = async () => {
        if (!window.confirm("⚠️ ¿ESTÁS SEGURO?\n\nSi generas llaves nuevas, PERDERÁS EL ACCESO a todos los videos que hayas subido o te hayan compartido anteriormente.\n\nSolo haz esto si perdiste tu archivo Excel.")) {
            return;
        }
        
        setLoading(true);
        try {
            // Generar nuevas
            await inicializarSistemaCifrado(usuarioData.nombre);
            
            // Subir la nueva pública al servidor
            const publicKeyPEM = obtenerClavePublicaPEM();
            if (publicKeyPEM) {
                await fetch(`${process.env.REACT_APP_API_URL}/auth/users/me/public_key`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${usuarioData.access_token}`
                    },
                    body: JSON.stringify({ public_key_pem: publicKeyPEM })
                });
            }
            
            toast.info("Se han generado nuevas llaves de seguridad.");
            onSuccess();

        } catch (error) {
            toast.error("Error al generar llaves: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg">
                    <div className="modal-header bg-warning text-dark">
                        <h5 className="modal-title fw-bold">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            Dispositivo Nuevo o Incógnito Detectado
                        </h5>
                    </div>
                    <div className="modal-body p-4">
                        <p>Hemos detectado que estás ingresando desde un navegador sin llaves de seguridad, pero tu cuenta ya tiene historial.</p>
                        
                        <div className="alert alert-info border-0 shadow-sm">
                            <strong>¿Qué debo hacer?</strong><br/>
                            Para poder ver tus videos anteriores, debes cargar tu <strong>Archivo Excel de Respaldo</strong>.
                        </div>

                        {/* Input Oculto */}
                        <input 
                            type="file" 
                            accept=".xlsx, .xls"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFileChange}
                        />

                        <div className="d-grid gap-3 mt-4">
                            {/* Botón Principal: Importar */}
                            <button 
                                className="btn btn-primary btn-lg" 
                                onClick={() => fileInputRef.current.click()}
                                disabled={loading}
                            >
                                {loading ? "Procesando..." : <><i className="bi bi-upload me-2"></i> Importar mis Llaves (Excel)</>}
                            </button>

                            <hr className="my-2"/>

                            {/* Botón Secundario: Generar Nuevas */}
                            <button 
                                className="btn btn-outline-danger btn-sm"
                                onClick={handleGenerarNuevas}
                                disabled={loading}
                            >
                                Perbí mi respaldo (Generar llaves nuevas y perder historial)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModalRestauracion;
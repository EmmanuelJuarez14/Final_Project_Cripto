import { Link, useNavigate } from "react-router-dom";
import { useRef } from "react";
import { toast } from "react-toastify";
// Importamos las funciones nuevas
import { importarClavesDesdeExcel, descargarCopiaSeguridad } from "../../utils/crypto";

import './_header.scss'

const Header = ({admin}) => {
    const navigate = useNavigate();
    // Referencia para el input de archivo oculto
    const fileInputRef = useRef(null);

    const handleLogout = () => {
        localStorage.removeItem("usuario");
        // Opcional: No borramos las claves al salir para no obligar a importar siempre
        // localStorage.removeItem("rsa_private_key"); 
        // localStorage.removeItem("rsa_public_key");
        navigate("/login");
    };

    // Click en el botón "Importar" -> Click en el input oculto
    const triggerImport = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    // Procesar archivo Excel seleccionado
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await importarClavesDesdeExcel(file);
            toast.success("🔑 ¡Identidad restaurada! Ya puedes ver tus videos.");
        } catch (error) {
            console.error(error);
            toast.error("Error al importar: " + error.message);
        }
        
        // Limpiar input para permitir subir el mismo archivo si se requiere
        e.target.value = null; 
    };

    // Acción del botón "Backup"
    const handleBackup = async () => {
        try {
            if(window.confirm("Se descargará un archivo Excel con tu llave privada.\n\n⚠️ GUÁRDALO EN UN LUGAR SEGURO.\nSi cambias de PC, necesitarás este archivo.")) {
                await descargarCopiaSeguridad();
                toast.success("Respaldo descargado correctamente");
            }
        } catch (error) {
            console.error(error);
            toast.error("No se pudo generar el respaldo: " + error.message);
        }
    };

    return (
        <nav className="navbar navbar-expand-lg custom-nav px-3">
            <div className="container-fluid">
                {/* Logo */}
                <Link className="navbar-brand" to="/">Crypto</Link>

                {/* Input Oculto para Importación */}
                <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    ref={fileInputRef} 
                    style={{ display: "none" }} 
                    onChange={handleFileChange}
                />

                {/* Botón Hamburguesa */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Menú Colapsable */}
                {!admin ? (
                    <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                        <ul className="navbar-nav font-secondary align-items-center">
                            
                            {/* --- BOTONES DE GESTIÓN DE CLAVES --- */}
                            <li className="nav-item">
                                <button 
                                    className="btn nav-link text-warning" 
                                    onClick={triggerImport}
                                    title="Restaurar llaves desde Excel"
                                >
                                    <i className="bi bi-upload me-1"></i> Importar
                                </button>
                            </li>
                            <li className="nav-item">
                                <button 
                                    className="btn nav-link text-info" 
                                    onClick={handleBackup}
                                    title="Guardar copia de seguridad de mis llaves"
                                >
                                    <i className="bi bi-download me-1"></i> Backup
                                </button>
                            </li>
                            {/* ----------------------------------- */}

                            <li className="nav-item">
                                <Link className="nav-link" to="/comunidad"><i className="bi bi-people-fill"></i>Comunidad</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/upload-video"><i className="bi bi-cloud-upload-fill"></i> Subir video</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/solicitudes"><i className="bi bi-bell-fill"></i> Solicitudes</Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link" to="/ver-videos"><i className="bi bi-camera-video-fill"></i> Ver videos</Link>
                            </li>
                            <li className="nav-item">
                                <button className="btn nav-link" onClick={handleLogout}>
                                    <i className="bi bi-power"></i> Cerrar sesión
                                </button>
                            </li>
                        </ul>
                    </div>
                ) : (
                    <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                        <ul className="navbar-nav font-secondary">
                            <li className="nav-item">
                                <button className="btn nav-link" onClick={handleLogout}>
                                    <i className="bi bi-power"></i> Cerrar sesión
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Header;
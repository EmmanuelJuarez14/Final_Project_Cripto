import Header from "../../components/Header/Header"
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { descifrarClaveConRSA, descifrarVideoConChaCha20 } from "../../utils/crypto";

const VerVideo = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [videoInfo, setVideoInfo] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState("");
    
    // Referencia para limpiar el objeto URL al desmontar
    const videoObjectUrl = useRef(null);

    const getToken = () => {
        const usuarioStr = localStorage.getItem("usuario");
        if (!usuarioStr) return null;
        try {
            const usuario = JSON.parse(usuarioStr);
            return usuario.access_token;
        } catch (e) {
            return null;
        }
    };

    useEffect(() => {
        let isMounted = true;

        const cargarYDescifrar = async () => {
            try {
                const token = getToken();
                if (!token) {
                    toast.error("No estás autenticado");
                    navigate("/login");
                    return;
                }

                // ---------------------------------------------------------
                // PASO 1: Obtener metadatos (incluye llaves cifradas)
                // ---------------------------------------------------------
                setProgress("Verificando permisos y llaves...");
                const metaResponse = await fetch(
                    `${process.env.REACT_APP_API_URL}/videos/my_accessible_videos`,
                    {
                        headers: { "Authorization": `Bearer ${token}` }
                    }
                );

                if (!metaResponse.ok) throw new Error("Error al obtener lista de videos");
                
                const data = await metaResponse.json();
                const videos = data.items || data.videos || data;
                
                // Buscar el video específico (convertimos ID a string para asegurar match)
                const targetVideo = videos.find(v => String(v.id) === String(id));

                if (!targetVideo) {
                    throw new Error("No tienes permiso para ver este video o no existe.");
                }

                setVideoInfo(targetVideo);

                // ---------------------------------------------------------
                // PASO 2: Descargar el archivo cifrado (Blob)
                // ---------------------------------------------------------
                setProgress("Descargando video cifrado (esto puede tardar)...");
                const fileResponse = await fetch(
                    `${process.env.REACT_APP_API_URL}/videos/download/${id}`,
                    {
                        headers: { "Authorization": `Bearer ${token}` }
                    }
                );

                if (!fileResponse.ok) {
                    const errorText = await fileResponse.text();
                    throw new Error(`Error en descarga: ${errorText}`);
                }

                const encryptedBlob = await fileResponse.blob();
                const encryptedBytes = new Uint8Array(await encryptedBlob.arrayBuffer());

                // ---------------------------------------------------------
                // PASO 3: Seleccionar y Descifrar la llave simétrica (RSA)
                // ---------------------------------------------------------
                setProgress("Descifrando llave de seguridad...");

                let llaveCifradaParaMi = null;

                if (targetVideo.es_autor) {
                    // A) Soy el dueño -> Uso la llave original
                    llaveCifradaParaMi = targetVideo.key_cifrada;
                } else {
                    // B) Soy invitado -> Uso la llave que me asignaron al aprobar
                    llaveCifradaParaMi = targetVideo.llave_asignada;
                }

                if (!llaveCifradaParaMi) {
                    throw new Error("Error de seguridad: No se encontró una llave cifrada para tu usuario. Contacta al dueño del video.");
                }
                
                // Usamos nuestra llave privada (localStorage) para abrir el sobre digital
                const symmetricKey = await descifrarClaveConRSA(llaveCifradaParaMi);

                // ---------------------------------------------------------
                // PASO 4: Descifrar el video (ChaCha20-Poly1305)
                // ---------------------------------------------------------
                setProgress("Descifrando contenido de video...");
                const decryptedBytes = descifrarVideoConChaCha20(encryptedBytes, symmetricKey);

                // ---------------------------------------------------------
                // PASO 5: Visualización
                // ---------------------------------------------------------
                const decryptedBlob = new Blob([decryptedBytes], { type: "video/mp4" });
                const url = URL.createObjectURL(decryptedBlob);
                
                if (isMounted) {
                    videoObjectUrl.current = url;
                    setVideoUrl(url);
                    setLoading(false);
                    toast.success("¡Video descifrado y listo!");
                }

            } catch (error) {
                console.error(error);
                if (isMounted) {
                    toast.error(error.message || "Error al procesar el video");
                    setLoading(false);
                }
            }
        };

        cargarYDescifrar();

        // Cleanup: Liberar memoria RAM al salir
        return () => {
            isMounted = false;
            if (videoObjectUrl.current) {
                URL.revokeObjectURL(videoObjectUrl.current);
            }
        };
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="background">
                <Header />
                <div className="container mt-5 text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{width: "3rem", height: "3rem"}}>
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                    <h4 className="text-muted">{progress}</h4>
                    <p className="small text-secondary">
                        <i className="bi bi-shield-lock me-1"></i>
                        Operación criptográfica segura en proceso
                    </p>
                </div>
            </div>
        );
    }

    if (!videoInfo) {
        return (
            <div className="background">
                <Header />
                <div className="container mt-5">
                    <div className="alert alert-danger">No se pudo cargar la información del video.</div>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>Volver</button>
                </div>
            </div>
        );
    }

    return (
        <div className="background">
            <Header />
            <div className="container mt-4 mb-5">
                <button 
                    className="btn btn-secondary mb-3"
                    onClick={() => navigate(-1)}
                >
                    <i className="bi bi-arrow-left me-2"></i>
                    Volver
                </button>

                <div className="row justify-content-center">
                    <div className="col-lg-10">
                        {/* Video Player */}
                        <div className="card shadow-lg mb-4 border-0">
                            <div className="ratio ratio-16x9 bg-black rounded-top">
                                {videoUrl && (
                                    <video 
                                        controls 
                                        autoPlay 
                                        controlsList="nodownload" 
                                        className="rounded-top"
                                    >
                                        <source src={videoUrl} type="video/mp4" />
                                        Tu navegador no soporta la etiqueta video.
                                    </video>
                                )}
                            </div>
                            
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h3 className="card-title fw-bold mb-2">{videoInfo.titulo}</h3>
                                        <p className="text-muted mb-3">{videoInfo.descripcion}</p>
                                    </div>
                                    <span className="badge bg-success p-2">
                                        <i className="bi bi-shield-lock-fill me-1"></i>
                                        {videoInfo.es_autor ? "Propietario" : "Acceso Autorizado"}
                                    </span>
                                </div>

                                <hr className="my-4" />

                                <div className="d-flex align-items-center">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm"
                                         style={{width: "50px", height: "50px", fontSize: "24px"}}>
                                        {(videoInfo.autor_rel?.nombre || "A").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">{videoInfo.autor_rel?.nombre || "Autor Desconocido"}</h6>
                                        <small className="text-muted">
                                            Subido el {videoInfo.fecha_subida ? new Date(videoInfo.fecha_subida).toLocaleDateString() : "Fecha desconocida"}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer bg-light text-center py-3">
                                <small className="text-muted">
                                    <i className="bi bi-info-circle me-1"></i>
                                    Este video fue descifrado localmente usando tu llave privada RSA y ChaCha20.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerVideo;
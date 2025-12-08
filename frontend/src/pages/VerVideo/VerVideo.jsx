import Header from "../../components/Header/Header"
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { descifrarClaveConRSA, descifrarVideoConChaCha20 } from "../../utils/crypto";

const VerVideo = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); 
    
    const [videoInfo, setVideoInfo] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState("");
    
    const videoObjectUrl = useRef(null);

    const getToken = () => {
        const usuarioStr = localStorage.getItem("usuario");
        if (!usuarioStr) return null;
        try { return JSON.parse(usuarioStr).access_token; } catch (e) { return null; }
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
                // PASO 1: Obtener Datos y Llaves
                // ---------------------------------------------------------
                let targetVideo = location.state; 

                // Verificamos si los datos que tenemos (del state) tienen las llaves necesarias.
                // Si venimos de "Explorar Comunidad", targetVideo existe pero NO tiene llaves.
                const tieneLlavesCompletas = targetVideo && (
                    (targetVideo.es_autor && targetVideo.key_cifrada) || 
                    (!targetVideo.es_autor && targetVideo.llave_asignada)
                );

                // Si no hay datos O si faltan las llaves, hacemos fetch
                if (!targetVideo || !tieneLlavesCompletas) {
                    setProgress("Obteniendo llaves de seguridad del servidor...");
                    
                    // Consultamos el endpoint seguro que SÍ entrega las llaves
                    const metaResponse = await fetch(
                        `${process.env.REACT_APP_API_URL}/videos/my_accessible_videos`,
                        { headers: { "Authorization": `Bearer ${token}` } }
                    );

                    if (!metaResponse.ok) throw new Error("Error al obtener tus videos accesibles.");
                    
                    const data = await metaResponse.json();
                    const videos = data.items || data.videos || data;
                    
                    // Buscamos el video actual en la lista segura
                    targetVideo = videos.find(v => String(v.id) === String(id));
                }

                if (!targetVideo) {
                    throw new Error("No tienes permiso para ver este video (o no ha sido aprobado).");
                }

                if (isMounted) setVideoInfo(targetVideo);

                // ---------------------------------------------------------
                // PASO 2: Descargar el Archivo Cifrado
                // ---------------------------------------------------------
                setProgress("Descargando archivo cifrado...");
                const fileResponse = await fetch(
                    `${process.env.REACT_APP_API_URL}/videos/download/${id}`,
                    { headers: { "Authorization": `Bearer ${token}` } }
                );

                if (!fileResponse.ok) throw new Error("Error descargando el archivo binario.");

                const encryptedBlob = await fileResponse.blob();
                const encryptedBytes = new Uint8Array(await encryptedBlob.arrayBuffer());

                // ---------------------------------------------------------
                // PASO 3: Selección de Llave
                // ---------------------------------------------------------
                setProgress("Desbloqueando criptografía...");
                let llaveCifradaParaMi = null;

                if (targetVideo.es_autor) {
                    llaveCifradaParaMi = targetVideo.key_cifrada;
                } else {
                    llaveCifradaParaMi = targetVideo.llave_asignada;
                }

                if (!llaveCifradaParaMi) {
                    throw new Error("El video no tiene llave asignada. Verifica en 'Mis Videos' si tienes acceso.");
                }

                // ---------------------------------------------------------
                // PASO 4: Criptografía (RSA + ChaCha20)
                // ---------------------------------------------------------
                let symmetricKey;
                try {
                    // Descifrar la llave del video con TU llave privada
                    symmetricKey = await descifrarClaveConRSA(llaveCifradaParaMi);
                } catch (rsaError) {
                    console.error("Fallo RSA:", rsaError);
                    throw new Error("Fallo de identidad: No se pudo abrir la llave. ¿Cambiaste de PC? Importa tu Excel.");
                }

                // Descifrar el video con la llave obtenida
                let decryptedBytes;
                try {
                    decryptedBytes = descifrarVideoConChaCha20(encryptedBytes, symmetricKey);
                } catch (chachaError) {
                    throw new Error("Integridad fallida: La llave es incorrecta o el archivo se corrompió.");
                }

                // ---------------------------------------------------------
                // PASO 5: Reproducción
                // ---------------------------------------------------------
                const decryptedBlob = new Blob([decryptedBytes], { type: "video/mp4" });
                const url = URL.createObjectURL(decryptedBlob);
                
                if (isMounted) {
                    videoObjectUrl.current = url;
                    setVideoUrl(url);
                    setLoading(false);
                    toast.success("¡Video descifrado!");
                }

            } catch (error) {
                console.error(error);
                if (isMounted) {
                    toast.error(error.message);
                    setLoading(false);
                }
            }
        };

        cargarYDescifrar();

        return () => {
            isMounted = false;
            if (videoObjectUrl.current) URL.revokeObjectURL(videoObjectUrl.current);
        };
    }, [id, navigate, location.state]);

    if (loading) {
        return (
            <div className="background">
                <Header />
                <div className="container mt-5 text-center">
                    <div className="spinner-border text-primary mb-3"></div>
                    <h4 className="text-muted">{progress}</h4>
                </div>
            </div>
        );
    }

    if (!videoInfo) return (
        <div className="background">
            <Header />
            <div className="container mt-5">
                <div className="alert alert-danger">No se pudo cargar el video.</div>
                <button className="btn btn-primary" onClick={() => navigate('/comunidad')}>Volver</button>
            </div>
        </div>
    );

    return (
        <div className="background">
            <Header />
            <div className="container mt-4 mb-5">
                <button className="btn btn-secondary mb-3" onClick={() => navigate('/comunidad')}>
                    <i className="bi bi-arrow-left me-2"></i> Volver
                </button>

                <div className="card shadow-lg border-0">
                    <div className="ratio ratio-16x9 bg-black rounded-top">
                        {videoUrl && (
                            <video controls autoPlay controlsList="nodownload" className="rounded-top">
                                <source src={videoUrl} type="video/mp4" />
                            </video>
                        )}
                    </div>
                    <div className="card-body">
                        <h3>{videoInfo.titulo}</h3>
                        <p className="text-muted">{videoInfo.descripcion}</p>
                        <span className={`badge ${videoInfo.es_autor ? 'bg-primary' : 'bg-success'}`}>
                            {videoInfo.es_autor ? "Tu Video" : "Video Compartido"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerVideo;
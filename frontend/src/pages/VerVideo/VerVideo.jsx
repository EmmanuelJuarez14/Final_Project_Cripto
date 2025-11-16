import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const VerVideo = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchVideo = async () => {
        try {
            // Simulación de datos - Reemplaza con tu API real
            // const response = await fetch(`${}/videos/${id}`, {
            //     headers: {
            //         "x-token": localStorage.getItem("token"),
            //     },
            // });
            
            const mockVideo = {
                id: id || "vid_001",
                titulo: "Introducción a React Hooks",
                descripcion: "Aprende a usar useState, useEffect y otros hooks fundamentales de React para crear aplicaciones modernas y eficientes.",
                url_video: "https://www.youtube.com/embed/dQw4w9WgXcQ",
                duracion: "15:30",
                fecha_subida: "2025-01-15T10:00:00Z",
                autor: "Juan Desarrollador",
                vistas: 1250
            };

            setVideo(mockVideo);
            setLoading(false);
        } catch (error) {
            console.error("Error al cargar video:", error);
            toast.error("Error al cargar el video");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVideo();
    }, [id]);

    if (loading) {
        return (
            <div className="background">
                <Header />
                <div className="container mt-5 text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Cargando...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!video) {
        return (
            <div className="background">
                <Header />
                <div className="container mt-5">
                    <div className="alert alert-warning">Video no encontrado</div>
                    <button className="btn btn-primary" onClick={() => navigate(-1)}>
                        Volver
                    </button>
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

                <div className="row">
                    <div className="col-lg-12">
                        {/* Video Player */}
                        <div className="card shadow-sm mb-3">
                            <div className="ratio ratio-16x9">
                                <iframe
                                    src={video.url_video}
                                    title={video.titulo}
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                ></iframe>
                            </div>
                        </div>

                        {/* Información del Video */}
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h3 className="card-title mb-3">{video.titulo}</h3>
                                
                                <div className="d-flex align-items-center text-muted mb-3">
                                    <span className="me-3">
                                        <i className="bi bi-clock me-1"></i>
                                        {video.duracion}
                                    </span>
                                    <span>
                                        <i className="bi bi-calendar me-1"></i>
                                        {new Date(video.fecha_subida).toLocaleDateString("es-MX", {
                                            day: "2-digit",
                                            month: "long",
                                            year: "numeric"
                                        })}
                                    </span>
                                </div>

                                <hr />

                                <div className="d-flex align-items-center mb-3">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                                         style={{width: "48px", height: "48px", fontSize: "20px"}}>
                                        {video.autor.charAt(0)}
                                    </div>
                                    <div>
                                        <h6 className="mb-0">{video.autor}</h6>
                                        <small className="text-muted">Autor</small>
                                    </div>
                                </div>

                                <hr />

                                <h5>Descripción</h5>
                                <p className="text-muted">{video.descripcion}</p>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default VerVideo;
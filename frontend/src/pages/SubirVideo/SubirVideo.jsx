import Header from "../../components/Header/Header"
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const SubirVideo = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        titulo: "",
        descripcion: "",
        url_video: "",
        duracion: "",
        categoria: "",
    });
    const [videoFile, setVideoFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar que sea un archivo de video
            if (!file.type.startsWith('video/')) {
                toast.error("Por favor selecciona un archivo de video válido");
                return;
            }

            // Validar tamaño (ejemplo: máximo 500MB)
            const maxSize = 500 * 1024 * 1024; // 500MB
            if (file.size > maxSize) {
                toast.error("El archivo es demasiado grande. Máximo 500MB");
                return;
            }

            setVideoFile(file);
            
            // Crear preview
            const videoURL = URL.createObjectURL(file);
            setPreview(videoURL);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validaciones
        if (!formData.titulo.trim()) {
            toast.error("El título es requerido");
            return;
        }

        if (!formData.url_video.trim() && !videoFile) {
            toast.error("Debes proporcionar una URL o subir un archivo de video");
            return;
        }

        setLoading(true);

        try {
            const dataToSend = new FormData();
            dataToSend.append('titulo', formData.titulo);
            dataToSend.append('descripcion', formData.descripcion);
            dataToSend.append('categoria', formData.categoria);

            
            if (videoFile) {
                dataToSend.append('video', videoFile);
                dataToSend.append('duracion', formData.duracion);
            } else {
                dataToSend.append('url_video', formData.url_video);
            }

            // Aquí va tu llamada a la API
            /*
            const response = await fetch(`${import.meta.env.VITE_API_URL}/videos`, {
                method: "POST",
                headers: {
                    "x-token": localStorage.getItem("token"),
                },
                body: dataToSend
            });

            const result = await response.json();

            if (response.ok) {
                toast.success("Video subido correctamente");
                navigate("/videos");
            } else {
                toast.error(result.error || "Error al subir el video");
            }
            */

            // Simulación
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast.success("Video subido correctamente");
            console.log("Datos a enviar:", {
                titulo: formData.titulo,
                descripcion: formData.descripcion,
                categoria: formData.categoria,
                archivo: videoFile?.name || formData.url_video
            });
            
            // navigate("/videos");

        } catch (error) {
            console.error("Error al subir video:", error);
            toast.error("Error al subir el video");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (preview) {
            URL.revokeObjectURL(preview);
        }
        navigate(-1);
    };

    return (
        <div className="background">
            <Header />
            <div className="container mt-4 mb-5">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <div className="card shadow-sm">
                            <div className="card-header bg-primary text-white">
                                <h4 className="mb-0">
                                    <i className="bi bi-cloud-upload me-2"></i>
                                    Subir Video
                                </h4>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handleSubmit}>
                                    {/* Título */}
                                    <div className="mb-3">
                                        <label htmlFor="titulo" className="form-label">
                                            Título <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="titulo"
                                            name="titulo"
                                            value={formData.titulo}
                                            onChange={handleInputChange}
                                            placeholder="Ingresa el título del video"
                                            required
                                        />
                                    </div>

                                    {/* Descripción */}
                                    <div className="mb-3">
                                        <label htmlFor="descripcion" className="form-label">
                                            Descripción
                                        </label>
                                        <textarea
                                            className="form-control"
                                            id="descripcion"
                                            name="descripcion"
                                            value={formData.descripcion}
                                            onChange={handleInputChange}
                                            rows="4"
                                            placeholder="Describe tu video..."
                                        ></textarea>
                                    </div>

                                    {/* Categoría */}
                                    <div className="mb-3">
                                        <label htmlFor="categoria" className="form-label">
                                            Categoría
                                        </label>
                                        <select
                                            className="form-select"
                                            id="categoria"
                                            name="categoria"
                                            value={formData.categoria}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Selecciona una categoría</option>
                                            <option value="programacion">Programación</option>
                                            <option value="diseno">Diseño</option>
                                            <option value="marketing">Marketing</option>
                                            <option value="negocios">Negocios</option>
                                            <option value="ciencia">Ciencia</option>
                                            <option value="educacion">Educación</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>

                                    <hr className="my-4" />

                                    {/* Subir Archivo de Video */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Archivo de Video <span className="text-danger">*</span>
                                        </label>
                                        
                                        {!videoFile ? (
                                            <div 
                                                className="border rounded p-5 text-center bg-light"
                                                style={{ cursor: 'pointer', borderStyle: 'dashed', borderWidth: '2px' }}
                                                onClick={() => document.getElementById('videoFileInput').click()}
                                            >
                                                <i className="bi bi-cloud-upload fs-1 text-primary"></i>
                                                <p className="mt-3 mb-2">
                                                    <strong>Haz clic para seleccionar un video</strong>
                                                </p>
                                                <p className="text-muted small mb-0">
                                                    Formatos soportados: MP4, AVI, MOV, MKV<br />
                                                    Tamaño máximo: 500MB
                                                </p>
                                                <input
                                                    type="file"
                                                    id="videoFileInput"
                                                    className="d-none"
                                                    accept="video/*"
                                                    onChange={handleFileChange}
                                                />
                                            </div>
                                        ) : (
                                            <div className="border rounded p-3 bg-light">
                                                <div className="d-flex align-items-start justify-content-between">
                                                    <div className="flex-grow-1">
                                                        <div className="alert alert-success mb-3">
                                                            <i className="bi bi-check-circle me-2"></i>
                                                            <strong>Archivo seleccionado</strong>
                                                        </div>
                                                        
                                                        <div className="mb-2">
                                                            <i className="bi bi-file-earmark-play me-2"></i>
                                                            <strong>{videoFile.name}</strong>
                                                        </div>
                                                        
                                                        <div className="text-muted small mb-3">
                                                            <i className="bi bi-hdd me-2"></i>
                                                            Tamaño: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                                                        </div>

                                                        {/* Preview del video */}
                                                        {preview && (
                                                            <div className="mb-3">
                                                                <video 
                                                                    src={preview} 
                                                                    controls 
                                                                    className="w-100 rounded"
                                                                    style={{ maxHeight: '300px' }}
                                                                >
                                                                    Tu navegador no soporta la reproducción de videos.
                                                                </video>
                                                            </div>
                                                        )}

                                                        {/* Duración del video */}
                                                        <div className="mb-0">
                                                            <label htmlFor="duracion" className="form-label">
                                                                Duración (opcional)
                                                            </label>
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                id="duracion"
                                                                name="duracion"
                                                                value={formData.duracion}
                                                                onChange={handleInputChange}
                                                                placeholder="Ej: 15:30"
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger ms-3"
                                                        onClick={() => {
                                                            setVideoFile(null);
                                                            setPreview(null);
                                                            document.getElementById('videoFileInput').value = '';
                                                        }}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botones */}
                                    <div className="d-flex justify-content-end gap-2 mt-4">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={handleCancel}
                                            disabled={loading}
                                        >
                                            <i className="bi bi-x-circle me-2"></i>
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Subiendo...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-cloud-upload me-2"></i>
                                                    Subir Video
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Información adicional */}
                        <div className="card shadow-sm mt-3">
                            <div className="card-body">
                                <h6 className="card-title">
                                    <i className="bi bi-info-circle me-2"></i>
                                    Consejos para subir videos
                                </h6>
                                <ul className="mb-0 small text-muted">
                                    <li>Usa títulos descriptivos y claros</li>
                                    <li>La descripción ayuda a los usuarios a entender el contenido</li>
                                    <li>Verifica que el video tenga buena calidad antes de subirlo</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubirVideo;
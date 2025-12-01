import Header from "../../components/Header/Header"
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { cifrarClaveConRSA, cifrarVideoConChaCha20, generarClaveSimetrica } from "../../utils/crypto";

const SubirVideo = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        titulo: "",
        descripcion: "",
    });
    const [videoFile, setVideoFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const autorId = usuario.usuario_id;

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

        if (!videoFile) {
            toast.error("Debes seleccionar un archivo de video");
            return;
        }

        setLoading(true);
        setUploadProgress(0);

        try {
            
            // 1. Generar clave simétrica (32 bytes para ChaCha20)
            
            toast.info("Generando clave de cifrado...");
            const claveSimetrica = generarClaveSimetrica(); // Uint8Array de 32 bytes
            
            
            // 2. Cifrar la clave simétrica con RSA-OAEP
            
            toast.info("Cifrando clave con RSA-OAEP...");
            const keyCifrada = await cifrarClaveConRSA(claveSimetrica);
            setUploadProgress(10);

            
            // 3. Leer el archivo de video como ArrayBuffer
            
            toast.info("Leyendo archivo de video...");
            const arrayBuffer = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Error al leer el archivo'));
                reader.readAsArrayBuffer(videoFile);
            });
            
            const videoBytes = new Uint8Array(arrayBuffer);
            setUploadProgress(20);


            // 4. Cifrar el video con ChaCha20-Poly1305

            toast.info("Cifrando video con ChaCha20-Poly1305... (esto puede tardar)");
            console.log('Datos antes de cifrar:', {
                videoBytes: videoBytes?.length,
                claveSimetrica: claveSimetrica?.length,
                tipoVideoBytes: videoBytes?.constructor?.name,
                tipoClave: claveSimetrica?.constructor?.name
            });
            
            const videoCifrado = cifrarVideoConChaCha20(videoBytes, claveSimetrica);
            setUploadProgress(60);


            // 5. Crear Blob con el video cifrado

  
            const nombreOriginal = videoFile.name;
            const videoCifradoBlob = new Blob([videoCifrado], { type: 'application/octet-stream' });

            // 6. Enviar al backend

            toast.info("Subiendo video cifrado al servidor...");
            const dataToSend = new FormData();
            dataToSend.append('titulo', formData.titulo);
            dataToSend.append('descripcion', formData.descripcion);
            dataToSend.append('key_cifrada', keyCifrada); // Clave cifrada con RSA-OAEP
            dataToSend.append('autor_id', autorId);
            // El tercer parámetro (nombreOriginal) se convierte en archivo.filename en el backend
            dataToSend.append('archivo', videoCifradoBlob, nombreOriginal);
            console.log("dataToSend",dataToSend)
            setUploadProgress(70);

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/videos/upload_video`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${usuario.access_token}`,
                    },
                    body: dataToSend
                }
            );

            setUploadProgress(90);

            const raw = await response.text();
            const result = raw ? JSON.parse(raw) : null;

            if (!response.ok) {
                toast.error(result?.detail || "Error al subir video");
                setLoading(false);
                setUploadProgress(0);
                return;
            }

            setUploadProgress(100);
            toast.success("Video cifrado y subido correctamente");
            
            setTimeout(() => {
                navigate("/ver-videos");
            }, 1000);

        } catch (error) {
            console.error("Error al subir video:", error);
            toast.error(`Error: ${error.message || "Error de conexión"}`);
            setUploadProgress(0);
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
                                    Subir Video Cifrado
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
                                            disabled={loading}
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
                                            disabled={loading}
                                        ></textarea>
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
                                                        {preview && !loading && (
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
                                                    </div>
                                                    
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger ms-3"
                                                        onClick={() => {
                                                            setVideoFile(null);
                                                            setPreview(null);
                                                            document.getElementById('videoFileInput').value = '';
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Barra de progreso */}
                                    {loading && uploadProgress > 0 && (
                                        <div className="mb-3">
                                            <div className="progress" style={{ height: '25px' }}>
                                                <div 
                                                    className="progress-bar progress-bar-striped progress-bar-animated"
                                                    role="progressbar"
                                                    style={{ width: `${uploadProgress}%` }}
                                                    aria-valuenow={uploadProgress}
                                                    aria-valuemin="0"
                                                    aria-valuemax="100"
                                                >
                                                    {uploadProgress}%
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Alerta de seguridad */}
                                    <div className="alert alert-info">
                                        <i className="bi bi-shield-lock me-2"></i>
                                        <strong>Seguridad mejorada:</strong>
                                        <ul className="mb-0 mt-2 small">
                                            <li>Video cifrado con <strong>ChaCha20-Poly1305</strong> (cifrado autenticado)</li>
                                            <li>Clave protegida con <strong>RSA-OAEP</strong> (cifrado asimétrico)</li>
                                            
                                        </ul>
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
                                                    Procesando... {uploadProgress}%
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-shield-lock me-2"></i>
                                                    Subir Video Cifrado
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
                                    Proceso de cifrado autenticado
                                </h6>
                                <ol className="mb-0 small text-muted">
                                    <li>Se genera una clave simétrica aleatoria (256 bits)</li>
                                    <li>El video se cifra con ChaCha20-Poly1305 usando esta clave</li>
                                    <li>La clave se cifra con RSA-OAEP (clave pública)</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubirVideo;
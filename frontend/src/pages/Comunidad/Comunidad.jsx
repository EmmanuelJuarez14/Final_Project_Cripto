import Header from "../../components/Header/Header"
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

DataTable.use(DT); 

const Comunidad = () => {
    const [allVideos, setAllVideos] = useState([]); 
    const [tableData, setTableData] = useState([]); 
    const [activeTab, setActiveTab] = useState("explorar"); // 'explorar' | 'mis_videos'
    const navigate = useNavigate();

    const getToken = () => {
        const usuarioStr = localStorage.getItem("usuario");
        if (!usuarioStr) return null;
        try {
            return JSON.parse(usuarioStr).access_token || null;
        } catch (e) { return null; }
    };

    // --- CORRECCIÓN 1: Pasar el objeto completo al navegar ---
    const handleVerVideo = (videoObj) => {
        // Pasamos el objeto "videoObj" en el state para evitar un fetch extra y asegurar tener las llaves
        navigate(`/videos/${videoObj.id}`, { state: videoObj });
    };

    const solicitarAcceso = async (videoId) => {
        try {
            const token = getToken();
            if (!token) { navigate("/login"); return; }

            const response = await fetch(`${process.env.REACT_APP_API_URL}/videos/request_access/${videoId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
            });

            const result = await response.json();

            if (response.ok) {
                toast.success("Solicitud enviada.");
                fetchVideos(); 
            } else {
                toast.error(result.detail || "Error al solicitar.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión.");
        }
    }

    // --- CORRECCIÓN 2: Endpoint Dinámico ---
    const fetchVideos = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) { navigate("/login"); return; }

            // Si estoy en "Explorar", pido la lista pública (sin llaves)
            // Si estoy en "Mis Videos", pido la lista privada (CON LLAVES)
            const endpoint = activeTab === 'explorar' 
                ? `${process.env.REACT_APP_API_URL}/videos/community`
                : `${process.env.REACT_APP_API_URL}/videos/my_accessible_videos`;

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error("Error al cargar videos");

            const data = await response.json();
            const lista = data.items || data.videos || data;
            
            setAllVideos(lista);

        } catch (error) {
            console.error(error);
        }
    }, [navigate, activeTab]); // <--- Se ejecuta cuando cambia la pestaña

    // Efecto para filtrar y formatear tabla
    useEffect(() => {
        // Aunque el fetch ya trae lo correcto, hacemos un filtrado visual extra por seguridad
        const videosFiltrados = allVideos.filter(v => {
            if (activeTab === "explorar") return !v.es_autor; 
            return true; // En "mis videos" el endpoint ya filtra, pero dejamos pasar todo
        });

        const formattedData = videosFiltrados.map(v => {
            let actionButton = "";

            // Serializamos el objeto con cuidado de caracteres especiales
            const dataStr = JSON.stringify(v).replace(/"/g, '&quot;');

            if (activeTab === "mis_videos") {
                // Botón VER (Pasamos todo el objeto en data-video)
                actionButton = `
                    <button class="btn btn-sm btn-success ver-btn" data-video="${dataStr}">
                        <i class="bi bi-play-circle"></i> Reproducir
                    </button>
                `;
            } else {
                // Lógica Explorar
                if (v.tiene_acceso) {
                    // Si tengo acceso aunque no sea el autor, también puedo ver
                    actionButton = `<button class="btn btn-sm btn-success ver-btn" data-video="${dataStr}">
                                        <i class="bi bi-play-circle"></i> Ver (Acceso OK)
                                    </button>`;
                } else if (v.ya_solicitado) {
                    actionButton = `<span class="badge bg-warning text-dark">Pendiente</span>`;
                } else if (v.fue_rechazado) {
                    actionButton = `<span class="badge bg-danger">Rechazado</span>`;
                } else {
                    actionButton = `<button class="btn btn-sm btn-primary solicitar-btn" data-video="${dataStr}">
                                        <i class="bi bi-send"></i> Solicitar
                                    </button>`;
                }
            }

            return [
                v.titulo || "",
                v.descripcion || "",
                v.autor_rel?.nombre || "Desconocido",
                v.fecha_subida ? new Date(v.fecha_subida).toLocaleDateString() : "",
                actionButton
            ];
        });

        setTableData(formattedData);

    }, [allVideos, activeTab]);

    // Delegación de eventos (Manejo de clicks en la tabla)
    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper');

        const handleTableClick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            try {
                const dataStr = btn.getAttribute('data-video');
                if (!dataStr) return;
                const videoData = JSON.parse(dataStr.replace(/&quot;/g, '"'));
                
                if (btn.classList.contains('solicitar-btn')) {
                    if (window.confirm(`¿Solicitar acceso a "${videoData.titulo}"?`)) {
                        solicitarAcceso(videoData.id);
                    }
                } else if (btn.classList.contains('ver-btn')) {
                    // --- CORRECCIÓN 3: Llamar al handler con el objeto completo ---
                    handleVerVideo(videoData);
                }
            } catch (err) { console.error("Error parseando video data", err); }
        };

        if (tableElement) tableElement.addEventListener('click', handleTableClick);
        return () => {
            if (tableElement) tableElement.removeEventListener('click', handleTableClick);
        };
    }, [tableData]); 

    // Cargar al inicio y al cambiar pestaña
    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    return (
        <div className="background">
            <Header />
            <div className='container mt-5'>
                <div className='input__container d-flex flex-column align-items-center mb-4 p-4' style={{padding:"3px"}}>
                    <h3 className='bold text-primary'>Comunidad de Videos</h3>
                    <p className="text-muted">Explora contenido seguro o gestiona tus subidas</p>
                </div>

                <ul className="nav nav-tabs mb-0 border-bottom-0 ps-2">
                    <li className="nav-item">
                        <button 
                            className={`nav-link px-4 ${activeTab === 'explorar' ? 'active fw-bold' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'explorar' ? '#0E3D55' : 'transparent',
                                color: activeTab === 'explorar' ? '#fff' : '#0E3D55',
                                border: '1px solid transparent'
                            }}
                            onClick={() => setActiveTab('explorar')}
                        >
                            <i className="bi bi-globe me-2"></i> Explorar
                        </button>
                    </li>
                    <li className="nav-item">
                        <button 
                            className={`nav-link px-4 ${activeTab === 'mis_videos' ? 'active fw-bold' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'mis_videos' ? '#0E3D55' : 'transparent',
                                color: activeTab === 'mis_videos' ? '#fff' : '#0E3D55',
                                border: '1px solid transparent'
                            }}
                            onClick={() => setActiveTab('mis_videos')}
                        >
                            <i className="bi bi-collection-play-fill me-2"></i> Mis Videos
                        </button>
                    </li>
                </ul>

                <div className="bg-white p-4 rounded-bottom shadow-sm border border-top-0 data-table-wrapper">
                    <DataTable
                        data={tableData}
                        className="table table-striped align-middle"
                        options={{
                            responsive: true,
                            autoWidth: false,
                            destroy: true,
                            columnDefs: [{ targets: 4, orderable: false, searchable: false, className: "text-center" }],
                            language: { search: "Buscar:", emptyTable: "No hay videos", paginate: { first: "«", last: "»", next: "›", previous: "‹" } },
                        }}
                    >
                        <thead className="table-primary">
                            <tr>
                                <th>Título</th>
                                <th>Descripción</th>
                                <th>Autor</th>
                                <th>Fecha</th>
                                <th className="text-center">Acción</th>
                            </tr>
                        </thead>
                    </DataTable>
                </div>
            </div>
        </div>
    )
}

export default Comunidad;
import Header from "../../components/Header/Header"
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

DataTable.use(DT); 

const Comunidad = () => {
    const [allVideos, setAllVideos] = useState([]); // Almacena todos los videos del fetch
    const [tableData, setTableData] = useState([]); // Datos filtrados para la tabla
    const [activeTab, setActiveTab] = useState("explorar"); // 'explorar' | 'mis_videos'
    const navigate = useNavigate();

    const getToken = () => {
        const usuarioStr = localStorage.getItem("usuario");
        if (!usuarioStr) return null;
        try {
            const usuario = JSON.parse(usuarioStr);
            return usuario.access_token || null;
        } catch (e) { return null; }
    };

    // Función para ir al reproductor
    const handleVerVideo = (videoId) => {
        navigate(`/videos/${videoId}`);
    };

    // Función para solicitar acceso
    const solicitarAcceso = async (videoId) => {
        try {
            const token = getToken();
            if (!token) {
                navigate("/login");
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/videos/request_access/${videoId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    }
                }
            );

            const result = await response.json();

            if (response.ok) {
                toast.success("Solicitud enviada. Espera la aprobación.");
                fetchVideos(); // Recargar para actualizar estado del botón
            } else {
                toast.error(result.detail || "Error al solicitar.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión.");
        }
    }

    // Carga inicial de datos
    const fetchVideos = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) {
                navigate("/login");
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/videos/community`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error("Error al cargar videos");

            const data = await response.json();
            const lista = data.items || data.videos || data;
            
            setAllVideos(lista);

        } catch (error) {
            console.error(error);
            // toast.error("Error al cargar la comunidad.");
        }
    }, [navigate]);

    // Efecto para filtrar datos según la pestaña activa
    useEffect(() => {
        if (!allVideos.length) {
            setTableData([]);
            return;
        }

        // 1. Filtrar según pestaña
        const videosFiltrados = allVideos.filter(v => {
            if (activeTab === "explorar") {
                // En Explorar, NO mostramos mis propios videos
                return !v.es_autor;
            } else {
                // En Mis Videos, SOLO mostramos donde soy autor
                return v.es_autor;
            }
        });

        // 2. Formatear para la tabla
        const formattedData = videosFiltrados.map(v => {
            let actionButton = "";

            if (activeTab === "mis_videos") {
                // Si es mi video, botón para VER
                actionButton = `
                    <button class="btn btn-sm btn-success ver-btn" data-video='${JSON.stringify(v)}'>
                        <i class="bi bi-play-circle"></i> Reproducir
                    </button>
                `;
            } else {
                // Si es de otro, lógica de solicitud
                if (v.tiene_acceso) {
                    actionButton = `<button class="btn btn-sm btn-success ver-btn" data-video='${JSON.stringify(v)}'>
                                        <i class="bi bi-play-circle"></i> Ver (Acceso OK)
                                    </button>`;
                } else if (v.ya_solicitado) {
                    actionButton = `<span class="badge bg-warning text-dark">Solicitud Pendiente</span>`;
                } else if (v.fue_rechazado) {
                    actionButton = `<span class="badge bg-danger">Rechazado</span>`;
                } else {
                    actionButton = `<button class="btn btn-sm btn-primary solicitar-btn" data-video='${JSON.stringify(v)}'>
                                        <i class="bi bi-send"></i> Solicitar Acceso
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

    // Delegación de eventos para botones dinámicos
    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper');

        const handleTableClick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            try {
                const dataStr = btn.getAttribute('data-video');
                if (!dataStr) return;
                const videoData = JSON.parse(dataStr);
                
                if (btn.classList.contains('solicitar-btn')) {
                    if (window.confirm(`¿Solicitar acceso a "${videoData.titulo}"?`)) {
                        solicitarAcceso(videoData.id);
                    }
                } else if (btn.classList.contains('ver-btn')) {
                    handleVerVideo(videoData.id);
                }
            } catch (err) { console.error(err); }
        };

        if (tableElement) tableElement.addEventListener('click', handleTableClick);
        return () => {
            if (tableElement) tableElement.removeEventListener('click', handleTableClick);
        };
    }, [tableData]); // Re-enlazar cuando cambia la tabla

    // Cargar al inicio
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

                {/* --- PESTAÑAS --- */}
                <ul className="nav nav-tabs mb-0 border-bottom-0 ps-2">
                    <li className="nav-item">
                        <button 
                            className={`nav-link px-4 ${activeTab === 'explorar' ? 'active fw-bold' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'explorar' ? '#0E3D55' : '#e9ecef',
                                color: activeTab === 'explorar' ? '#fff' : '#0E3D55',
                                border: '1px solid #0E3D55'
                            }}
                            onClick={() => setActiveTab('explorar')}
                        >
                            <i className="bi bi-globe me-2"></i>
                            Explorar Comunidad
                        </button>
                    </li>

                    <li className="nav-item">
                        <button 
                            className={`nav-link px-4 ${activeTab === 'mis_videos' ? 'active fw-bold' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'mis_videos' ? '#0E3D55' : '#e9ecef',
                                color: activeTab === 'mis_videos' ? '#fff' : '#0E3D55',
                                border: '1px solid #0E3D55'
                            }}
                            onClick={() => setActiveTab('mis_videos')}
                        >
                            <i className="bi bi-collection-play-fill me-2"></i>
                            Mis Videos Subidos
                        </button>
                    </li>
                </ul>

                {/* --- TABLA --- */}
                <div className="bg-white p-4 rounded-bottom shadow-sm border border-top-0 data-table-wrapper" style={{marginTop: '-1px'}}>
                    <DataTable
                        data={tableData}
                        className="table table-striped align-middle"
                        options={{
                            responsive: true,
                            autoWidth: false,
                            destroy: true, // Vital para recargar al cambiar tabs
                            columnDefs: [
                                {
                                    targets: 4, // Columna Acciones
                                    render: (data) => data,
                                    orderable: false,
                                    searchable: false,
                                    className: "text-center"
                                },
                            ],
                            language: {
                                search: "Buscar video:",
                                lengthMenu: "Mostrar _MENU_",
                                info: "Mostrando _START_ a _END_ de _TOTAL_",
                                emptyTable: "No hay videos en esta sección",
                                zeroRecords: "No encontrado",
                                paginate: { first: "«", last: "»", next: "›", previous: "‹" }
                            },
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
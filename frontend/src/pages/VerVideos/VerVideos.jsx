import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

DataTable.use(DT); 

const VerVideos = () => {
    const [tableData, setTableData] = useState([]);
    const navigate = useNavigate();

    const getToken = () => {
        const usuarioStr = localStorage.getItem("usuario");
        if (!usuarioStr) return null;
        try { return JSON.parse(usuarioStr).access_token; } catch (e) { return null; }
    };

    // --- CORRECCIÓN 1: Pasar el objeto completo (llaves) al navegar ---
    const handleEditClick = (videoData) => {
        if (videoData?.id) {
            // Pasamos 'state' para que VerVideo.jsx no tenga que volver a descargar la lista
            navigate(`/videos/${videoData.id}`, { state: videoData });
        }
    };

    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper'); 

        const handleTableClick = (e) => {
            const target = e.target;
            
            // Delegación de eventos para el botón
            if (target.classList.contains('ver-btn') || target.closest('.ver-btn')) {
                try {
                    const button = target.classList.contains('ver-btn') ? target : target.closest('.ver-btn');
                    const videoDataString = button.getAttribute('data-video');
                    
                    if (videoDataString) {
                        // Reemplazar &quot; por comillas reales antes de parsear
                        const videoData = JSON.parse(videoDataString.replace(/&quot;/g, '"'));
                        handleEditClick(videoData);
                    }
                } catch (error) {
                    console.error("Error al obtener datos:", error);
                }
            } 
        };

        if (tableElement) tableElement.addEventListener('click', handleTableClick);
        return () => {
            if (tableElement) tableElement.removeEventListener('click', handleTableClick);
        };
    }, [navigate, tableData]);

    const fetchVideos = async () => {
        try {
            const token = getToken();
            if(!token) {
                navigate("/login");
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/videos/my_accessible_videos`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error("Error al obtener los videos");

            const data = await response.json();
            const videos = data.items || data.videos || data;

            const formattedData = videos.map(v => {
                const tipoBadge = v.es_autor 
                    ? '<span class="badge bg-primary me-2">Mi Video</span>'
                    : '<span class="badge bg-success me-2">Compartido</span>';

                // --- CORRECCIÓN 2: Escapar comillas para evitar errores de HTML ---
                const safeData = JSON.stringify(v).replace(/"/g, '&quot;');

                const verButton = `${tipoBadge}
                                   <button class="btn btn-sm btn-primary ver-btn" data-video="${safeData}">
                                     <i class="bi bi-play-circle"></i> Ver
                                   </button>`;

                const fechaFormateada = v.fecha_subida
                    ? new Date(v.fecha_subida).toLocaleDateString("es-MX", {
                        day: "2-digit", month: "2-digit", year: "numeric"
                    })
                    : "";

                return [
                    v.titulo || "",
                    v.descripcion || "",
                    v.autor_rel?.nombre || "N/A",
                    fechaFormateada,
                    verButton
                ];
            });

            setTableData(formattedData);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al cargar los videos.");
        }
    };

    useEffect(() => {
        fetchVideos();
    }, []);

    return (
        <div className="background">
            <Header />
            <div className='container d-flex flex-column justify-content-between align-items-center'>
                <div className='input__container d-flex flex-column align-items-center mt-5 p-4' style={{padding:"3px"}}>
                    <h3 className='bold text-primary'>Mis Videos</h3>
                    <p className='text-muted'>Videos propios y compartidos contigo</p>
                </div>
                
                <div className="bg-white p-4 rounded shadow-sm border w-100 data-table-wrapper">
                    <DataTable
                        data={tableData}
                        className="table table-striped align-middle"
                        options={{
                            responsive: true,
                            autoWidth: false,
                            columnDefs: [{ 
                                targets: 4, 
                                orderable: false, 
                                searchable: false,
                                className: "text-center"
                            }],
                            language: {
                                search: "Buscar:",
                                emptyTable: "No tienes videos disponibles",
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

export default VerVideos;
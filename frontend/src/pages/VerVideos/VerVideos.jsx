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

    const handleOption = (route) => {
        console.log("click")
        navigate(route);
    }
    const getToken = () => {
        const usuario = JSON.parse(localStorage.getItem("usuario"));
        return usuario?.access_token || null;
    };

    const handleEditClick = (videoData) => {
        console.log("Ver video:", videoData);
        if (videoData?.id) {
            const videoId = videoData.id; 
            navigate(`/videos/${videoId}`);
        }
    };

    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper'); 

        const handleTableClick = (e) => {
            const target = e.target;
            
            // Verificamos si se hizo clic en el botón de ver
            if (target.classList.contains('ver-btn') || target.closest('.ver-btn')) {
                try {
                    const button = target.classList.contains('ver-btn') ? target : target.closest('.ver-btn');
                    const videoDataString = button.getAttribute('data-video');
                    const videoData = JSON.parse(videoDataString);
                    handleEditClick(videoData);
                } catch (error) {
                    console.error("Error al obtener o parsear los datos del video:", error);
                }
            } 
        };

        // Agregar el listener al contenedor de la tabla
        if (tableElement) {
            tableElement.addEventListener('click', handleTableClick);
        }

        // Función de limpieza para remover el listener al desmontar o actualizar
        return () => {
            if (tableElement) {
                tableElement.removeEventListener('click', handleTableClick);
            }
        };
    }, [navigate, tableData]);

    const fetchVideos = async () => {
        try {
            const token = getToken();
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

            if (!response.ok) {
                throw new Error("Error al obtener los videos");
            }

            const data = await response.json();
            console.log("Videos obtenidos:", data);

            const videos = data.items || data.videos || data;

            const formattedData = videos.map(v => {
                // Badge para identificar si es tu video o tienes acceso
                const tipoBadge = v.es_autor 
                    ? '<span class="badge bg-primary me-2">Mi Video</span>'
                    : '<span class="badge bg-success me-2">Acceso Aprobado</span>';

                const verButton = `${tipoBadge}
                                   <button class="btn btn-sm btn-primary ver-btn" data-video='${JSON.stringify(v)}'>
                                     <i class="bi bi-play-circle"></i> Ver
                                   </button>`;

                const fechaFormateada = v.fecha_subida
                    ? new Date(v.fecha_subida).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
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

            console.log("Datos formateados:", formattedData);
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
                <div className='input__container d-flex flex-column align-items-center mt-5' style={{padding:"3px"}}>
                    <h3 className='bold'>Mis Videos</h3>
                    <p className='text-muted'>Videos que has subido y videos a los que tienes acceso</p>
                </div>
                <DataTable
                    data={tableData}
                    className="table table-striped data-table-wrapper"
                    options={{
                        responsive: false,
                        autoWidth: false,
                        deferRender: true,
                        columnDefs: [
                            {
                                targets: 4, // La columna "Acción"
                                render: (data, type, row) => data,
                                orderable: false,
                                searchable: false,
                            },
                        ],
                        language: {
                            decimal: ",",
                            thousands: ".",
                            processing: "Procesando...",
                            search: "Buscar:",
                            lengthMenu: "Mostrar _MENU_ registros",
                            info: "Mostrando _START_ a _END_ de _TOTAL_",
                            infoEmpty: "Mostrando 0 a 0 de 0 registros",
                            infoFiltered: "(filtrado de _MAX_ registros totales)",
                            loadingRecords: "Cargando...",
                            zeroRecords: "No se encontraron registros",
                            emptyTable: "No hay videos disponibles",
                            paginate: {
                                first: "Primero",
                                previous: "Anterior",
                                next: "Siguiente",
                                last: "Último",
                            },
                            aria: {
                                sortAscending: ": activar para ordenar columna ascendente",
                                sortDescending: ": activar para ordenar columna descendente",
                            },
                        },
                    }}
                >
                    <thead className="table-primary">
                        <tr>
                            <th>Título</th>
                            <th>Descripción</th>
                            <th>Autor</th>
                            <th>Fecha</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                </DataTable>
            </div>
        </div>
    )
}

export default VerVideos;
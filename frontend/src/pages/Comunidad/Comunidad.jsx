import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

DataTable.use(DT); 

const Comunidad = () => {
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

    const solicitarAcceso = async (videoId) => {
        try {
            const token = getToken();
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
            console.log("Respuesta al solicitar acceso:", result);

            if (response.ok) {
                toast.success("Solicitud enviada correctamente. Espera la aprobación del autor.");
                // Opcional: Podrías actualizar el estado del botón para ese video
                fetchVideos();
            } else {
                toast.error(result.detail || result.mensaje || "Error al solicitar acceso.");
            }
        } catch (error) {
            console.error("Error al solicitar acceso:", error);
            toast.error("Error al solicitar acceso al video.");
        }
    }

    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper');

        const handleTableClick = (e) => {
            const target = e.target;
            
            // Verificamos si se hizo clic en el botón de solicitar acceso
            if (target.classList.contains('solicitar-btn') || target.closest('.solicitar-btn')) {
                try {
                    const button = target.classList.contains('solicitar-btn') ? target : target.closest('.solicitar-btn');
                    const videoDataString = button.getAttribute('data-video');
                    const videoData = JSON.parse(videoDataString);
                    
                    if (window.confirm(`¿Deseas solicitar acceso al video "${videoData.titulo}"?`)) {
                        solicitarAcceso(videoData.id);
                    }
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
    }, [tableData]);

    const fetchVideos = async () => {
        try {
            const token = getToken();
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

            if (!response.ok) {
                throw new Error("Error al obtener los videos");
            }

            const data = await response.json();
            console.log("Videos obtenidos:", data);

            const videos = data.items || data.videos || data;

            const formattedData = videos.map(v => {
                // Puedes agregar lógica para mostrar diferentes botones según el estado
                // Por ejemplo, si ya solicitaste acceso o si ya tienes acceso
                const actionButton = v.ya_solicitado 
                    ? `<span class="badge bg-warning">Solicitud Pendiente</span>`
                    : v.tiene_acceso
                    ? `<span class="badge bg-success">Tienes Acceso</span>`
                    : `<button class="btn btn-sm btn-primary solicitar-btn" data-video='${JSON.stringify(v)}'>
                         <i class="bi bi-send"></i> Solicitar Acceso
                       </button>`;

                return [
                    v.titulo || "",
                    v.descripcion || "",
                    v.autor_rel?.nombre || v.autor_id || "N/A",
                    actionButton
                ];
            });

            console.log("Datos formateados:", formattedData);
            setTableData(formattedData);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al cargar los videos de la comunidad.");
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
                    <h3 className='bold'>Comunidad</h3>
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
                                targets: 3, // La columna "Acción"
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
                            emptyTable: "No hay datos disponibles en la tabla",
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
                            <th>Acción</th>
                        </tr>
                    </thead>
                </DataTable>
            </div>
        </div>
    )
}

export default Comunidad;
import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

const Administrar = () => {
    const [tableData, setTableData] = useState([]);
    const navigate = useNavigate();

    const handleOption = (route) => {
        console.log("click")
        navigate(route);
    }

    const aceptarSolicitud = async (solicitudId) => {
        /*
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/solicitudes/${solicitudId}/aceptar`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "x-token": `${token}`,
                    },
                    body: JSON.stringify({ estado: "aprobado" })
                }
            );

            const result = await response.json();
            console.log("Respuesta al aceptar solicitud:", result);

            if (response.ok) {
                toast.success("Solicitud aceptada correctamente.");
                // Actualizar la tabla
                fetchSolicitudes();
            } else {
                toast.error(result.error || "Error al aceptar la solicitud.");
            }
        } catch (error) {
            console.error("Error al aceptar solicitud:", error);
            toast.error("Error al aceptar la solicitud.");
        }
        */
    }

    const eliminarSolicitud = async (solicitudId) => {
    /*    if (!solicitudId) {
            return;
        }
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/solicitudes/${solicitudId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "x-token": `${token}`,
                    }
                }
            );

            const result = await response.json();
            console.log("Respuesta al eliminar solicitud:", result);

            if (response.ok) {
                toast.success("Solicitud eliminada correctamente.");
                setTableData(prev => prev.filter(s => s[0] !== solicitudId));
            } else {
                toast.error(result.error || "Error al eliminar la solicitud.");
            }
        } catch (error) {
            console.error("Error al eliminar solicitud:", error);
            toast.error("Error al eliminar la solicitud.");
        }
        */
    }

    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper');

        const handleTableClick = (e) => {
            const target = e.target;
            
            // Verificamos si se hizo clic en el botón de aceptar
            if (target.classList.contains('aceptar-btn') || target.closest('.aceptar-btn')) {
                try {
                    const button = target.classList.contains('aceptar-btn') ? target : target.closest('.aceptar-btn');
                    const solicitudDataString = button.getAttribute('data-solicitud');
                    const solicitudData = JSON.parse(solicitudDataString);
                    aceptarSolicitud(solicitudData.id);
                } catch (error) {
                    console.error("Error al obtener o parsear los datos de la solicitud:", error);
                }
            }
            // Verificamos si se hizo clic en el botón de eliminar
            else if (target.classList.contains('eliminar-btn') || target.closest('.eliminar-btn')) {
                try {
                    const button = target.classList.contains('eliminar-btn') ? target : target.closest('.eliminar-btn');
                    const solicitudDataString = button.getAttribute('data-solicitud');
                    const solicitudData = JSON.parse(solicitudDataString);
                    
                    if (window.confirm('¿Estás seguro de que deseas eliminar esta solicitud?')) {
                        eliminarSolicitud(solicitudData.id);
                    }
                } catch (error) {
                    console.error("Error al obtener o parsear los datos de la solicitud:", error);
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

    const fetchSolicitudes = async () => {
        try {
            // const response = await fetch(`${}/solicitudes`, {
            //     method: "GET",
            //     headers: {
            //         "Content-Type": "application/json",
            //         "x-token": `${localStorage.getItem("token")}`,
            //     },
            // });
            const response = {
                ok: true,
                json: async () => ({
                    items: [
                    {
                        id: "sol_001",
                        estado: "pendiente",
                        fecha_solicitud: "2025-01-10T14:32:00Z",
                        solicitante_id: "user_111",
                        video_id: "vid_001",
                        solicitante_rel: {
                        nombre: "Carlos Hernández",
                        email: "carlos@example.com"
                        },
                        video_rel: {
                        titulo: "Primeros pasos en React"
                        }
                    },
                    {
                        id: "sol_002",
                        estado: "aprobado",
                        fecha_solicitud: "2025-01-12T09:20:00Z",
                        solicitante_id: "user_222",
                        video_id: "vid_002",
                        solicitante_rel: {
                        nombre: "María López",
                        email: "maria@example.com"
                        },
                        video_rel: {
                        titulo: "Criptografía con WebCrypto API"
                        }
                    },
                    {
                        id: "sol_003",
                        estado: "rechazado",
                        fecha_solicitud: "2025-01-15T19:05:00Z",
                        solicitante_id: "user_333",
                        video_id: "vid_003",
                        solicitante_rel: {
                        nombre: "Juan Pérez",
                        email: "juanp@example.com"
                        },
                        video_rel: {
                        titulo: "Cómo usar DynamoDB"
                        }
                    },
                    {
                        id: "sol_004",
                        estado: "pendiente",
                        fecha_solicitud: "2025-01-20T11:50:00Z",
                        solicitante_id: "user_444",
                        video_id: "vid_004",
                        solicitante_rel: {
                        nombre: "Ana Torres",
                        email: "ana_t@example.com"
                        },
                        video_rel: {
                        titulo: "Firmas digitales con Ed25519"
                        }
                    }
                    ]
                })
                };

            if (!response.ok) {
                throw new Error("Error al obtener las solicitudes");
            }

            const data = await response.json();
            console.log(data);

            const solicitudes = data.items || data;

            const formattedData = solicitudes.map(s => {
                const estadoBadge = s.estado === "pendiente" 
                    ? '<span class="badge bg-warning">Pendiente</span>'
                    : s.estado === "aprobado"
                    ? '<span class="badge bg-success">Aprobado</span>'
                    : '<span class="badge bg-danger">Rechazado</span>';

                const accionButtons = s.estado === "pendiente"
                    ? `<button class="btn btn-sm btn-success aceptar-btn me-2" data-solicitud='${JSON.stringify(s)}'>Aceptar</button>
                       <button class="btn btn-sm btn-danger eliminar-btn" data-solicitud='${JSON.stringify(s)}'><i class="bi bi-trash-fill"></i></button>`
                    : ``;

                const fechaFormateada = s.fecha_solicitud
                    ? new Date(s.fecha_solicitud).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    })
                    : "";

                return [
                    s.id || "",
                    s.solicitante_rel?.nombre || s.solicitante_rel?.email || "N/A",
                    s.video_rel?.titulo || "N/A",
                    estadoBadge,
                    fechaFormateada,
                    accionButtons,
                ];
            });

            console.log(formattedData);
            setTableData(formattedData);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al cargar las solicitudes.");
        }
    };

    useEffect(() => {
        fetchSolicitudes();
    }, []);

    return (
        <div className="background">
            <Header admin={true}/>
            <div className='container d-flex flex-column justify-content-between align-items-center'>
                <div className='input__container d-flex flex-column align-items-center mt-5' style={{padding:"3px"}}>
                    <h3 className='bold'>Solicitudes</h3>
                </div>
                <DataTable
                    data={tableData}
                    className="table table-striped data-table-wrapper"
                    options={{

                        responsive: false, // Desactiva responsive si no lo necesitas
                        autoWidth: false,
                        deferRender: true,
                        columnDefs: [
                            {
                                targets: [3, 5], // Las columnas "Estado" y "Acción"
                                render: (data, type, row) => data, // Renderiza el HTML directo
                                orderable: false, // Opcional: Deshabilita la ordenación
                                searchable: false, // Opcional: Deshabilita la búsqueda
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
                            <th>ID</th>
                            <th>Solicitante</th>
                            <th>Video</th>
                            <th>Estado</th>
                            <th>Fecha Solicitud</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                </DataTable>
            </div>
        </div>
    )
}

export default Administrar;
import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

const Solicitudes = () => {
    const [tableData, setTableData] = useState([]);
    const navigate = useNavigate();

    const handleOption = (route) => {
        console.log("click")
        navigate(route);
    }

    const aceptarSolicitud = async (solicitudId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/videos/approve_request/${solicitudId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    }
                }
            );

            const result = await response.json();
            console.log("Respuesta al aceptar solicitud:", result);

            if (response.ok) {
                toast.success("Solicitud aceptada correctamente.");
                fetchSolicitudes();
            } else {
                toast.error(result.detail || "Error al aceptar la solicitud.");
            }
        } catch (error) {
            console.error("Error al aceptar solicitud:", error);
            toast.error("Error al aceptar la solicitud.");
        }
    }

    const rechazarSolicitud = async (solicitudId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/videos/reject_request/${solicitudId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    }
                }
            );

            const result = await response.json();
            console.log("Respuesta al rechazar solicitud:", result);

            if (response.ok) {
                toast.success("Solicitud rechazada correctamente.");
                fetchSolicitudes();
            } else {
                toast.error(result.detail || "Error al rechazar la solicitud.");
            }
        } catch (error) {
            console.error("Error al rechazar solicitud:", error);
            toast.error("Error al rechazar la solicitud.");
        }
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
            // Verificamos si se hizo clic en el botón de rechazar
            else if (target.classList.contains('rechazar-btn') || target.closest('.rechazar-btn')) {
                try {
                    const button = target.classList.contains('rechazar-btn') ? target : target.closest('.rechazar-btn');
                    const solicitudDataString = button.getAttribute('data-solicitud');
                    const solicitudData = JSON.parse(solicitudDataString);
                    
                    if (window.confirm('¿Estás seguro de que deseas rechazar esta solicitud?')) {
                        rechazarSolicitud(solicitudData.id);
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
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/videos/solicitudes`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Error al obtener las solicitudes");
            }

            const data = await response.json();
            console.log("Solicitudes obtenidas:", data);

            const solicitudes = data.items || data.solicitudes || data;

            const formattedData = solicitudes.map(s => {
                const estadoBadge = s.estado === "pendiente" 
                    ? '<span class="badge bg-warning">Pendiente</span>'
                    : s.estado === "aprobado"
                    ? '<span class="badge bg-success">Aprobado</span>'
                    : '<span class="badge bg-danger">Rechazado</span>';

                const accionButtons = s.estado === "pendiente"
                    ? `<button class="btn btn-sm btn-success aceptar-btn me-2" data-solicitud='${JSON.stringify(s)}'>Aceptar</button>
                       <button class="btn btn-sm btn-warning rechazar-btn" data-solicitud='${JSON.stringify(s)}'>Rechazar</button>`
                    : `<button class="btn btn-sm btn-warning rechazar-btn" data-solicitud='${JSON.stringify(s)}'>Rechazar</button>`;

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

            console.log("Datos formateados:", formattedData);
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
            <Header />
            <div className='container d-flex flex-column justify-content-between align-items-center'>
                <div className='input__container d-flex flex-column align-items-center mt-5' style={{padding:"3px"}}>
                    <h3 className='bold'>Solicitudes</h3>
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
                                targets: [3, 5], // Las columnas "Estado" y "Acción"
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

export default Solicitudes;
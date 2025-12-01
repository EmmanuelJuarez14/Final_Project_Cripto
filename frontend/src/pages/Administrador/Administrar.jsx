import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

const Administrar = () => {
    const [tableData, setTableData] = useState([]);
    const navigate = useNavigate();

    // Obtener el token desde localStorage
    const getToken = () => {
        const usuario = JSON.parse(localStorage.getItem("usuario"));
        return usuario?.access_token || null;
    };

    const handleOption = (route) => {
        console.log("click")
        navigate(route);
    }

    const aceptarSolicitud = async (userId) => {
        try {
            console.log(userId)
            const token = getToken();
            if (!token) {
                toast.error("No se encontró el token de autenticación.");
                navigate("/login");
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/admin/approve_user/${userId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    }
                }
            );

            const result = await response.json();
            console.log("Respuesta al aprobar usuario:", result);

            if (response.ok) {
                toast.success(result.mensaje || "Usuario aprobado correctamente.");
                // Actualizar la tabla
                fetchSolicitudes();
            } else {
                toast.error(result.detail || "Error al aprobar el usuario.");
            }
        } catch (error) {
            console.error("Error al aprobar usuario:", error);
            toast.error("Error al aprobar el usuario.");
        }
    }

    const eliminarSolicitud = async (userId) => {
        if (!userId) {
            return;
        }
        try {
            const token = getToken();
            if (!token) {
                toast.error("No se encontró el token de autenticación.");
                navigate("/login");
                return;
            }

            // Asumiendo que existe un endpoint DELETE para usuarios
            // Si no existe, necesitarías agregarlo al backend
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/users/${userId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    }
                }
            );

            const result = await response.json();
            console.log("Respuesta al eliminar usuario:", result);

            if (response.ok) {
                toast.success("Usuario eliminado correctamente.");
                setTableData(prev => prev.filter(s => s[0] !== userId));
            } else {
                toast.error(result.detail || "Error al eliminar el usuario.");
            }
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            toast.error("Error al eliminar el usuario.");
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
                    const usuarioDataString = button.getAttribute('data-usuario');
                    const usuarioData = JSON.parse(usuarioDataString);
                    aceptarSolicitud(usuarioData.id);
                } catch (error) {
                    console.error("Error al obtener o parsear los datos del usuario:", error);
                }
            }
            // Verificamos si se hizo clic en el botón de eliminar
            else if (target.classList.contains('eliminar-btn') || target.closest('.eliminar-btn')) {
                try {
                    const button = target.classList.contains('eliminar-btn') ? target : target.closest('.eliminar-btn');
                    const usuarioDataString = button.getAttribute('data-usuario');
                    const usuarioData = JSON.parse(usuarioDataString);
                    
                    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
                        eliminarSolicitud(usuarioData.id);
                    }
                } catch (error) {
                    console.error("Error al obtener o parsear los datos del usuario:", error);
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
            const token = getToken();
            if (!token) {
                toast.error("No se encontró el token de autenticación.");
                navigate("/login");
                return;
            }

            // Llamada al endpoint de usuarios pendientes
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Sesión expirada. Por favor inicia sesión nuevamente.");
                    navigate("/login");
                    return;
                }
                throw new Error("Error al obtener los usuarios pendientes");
            }

            const usuarios = await response.json();
            console.log("Usuarios pendientes:", usuarios);

            const formattedData = usuarios.map(u => {
                const estadoBadge = u.estado === "pendiente" 
                    ? '<span class="badge bg-warning">Pendiente</span>'
                    : u.estado === "aprobado"
                    ? '<span class="badge bg-success">Aprobado</span>'
                    : '<span class="badge bg-danger">Rechazado</span>';

                const accionButtons = u.estado === "pendiente"
                    ? `<button class="btn btn-sm btn-success aceptar-btn me-2" data-usuario='${JSON.stringify(u)}'>Aprobar</button>
                       <button class="btn btn-sm btn-danger eliminar-btn" data-usuario='${JSON.stringify(u)}'><i class="bi bi-trash-fill"></i></button>`
                    : `<button class="btn btn-sm btn-danger eliminar-btn" data-usuario='${JSON.stringify(u)}'><i class="bi bi-trash-fill"></i></button>`;

                const fechaFormateada = u.fecha_registro
                    ? new Date(u.fecha_registro).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    })
                    : "";

                return [
                    u.id || "",
                    u.nombre || "N/A",
                    u.correo || "N/A",
                    estadoBadge,
                    //fechaFormateada,
                    accionButtons,
                ];
            });

            console.log("Datos formateados:", formattedData);
            setTableData(formattedData);
        } catch (error) {
            console.error("Error:", error);
            toast.error("Error al cargar los usuarios pendientes.");
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
                    <h3 className='bold'>Aceptar usuarios</h3>
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
                                targets: [3, 4], // Las columnas "Estado" y "Acción"
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
                            emptyTable: "No hay usuarios pendientes",
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
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                </DataTable>
            </div>
        </div>
    )
}

export default Administrar;
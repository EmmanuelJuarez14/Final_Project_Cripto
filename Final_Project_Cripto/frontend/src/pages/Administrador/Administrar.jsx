import Header from "../../components/Header/Header"
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";

// Inicializamos DataTables una sola vez
DataTable.use(DT);

const Administrar = () => {
    const [allUsers, setAllUsers] = useState([]); // Todos los usuarios crudos del backend
    const [tableData, setTableData] = useState([]); // Los datos formateados para la tabla actual
    const [activeTab, setActiveTab] = useState("pendientes"); // 'pendientes' | 'aprobados'
    const navigate = useNavigate();

    // Obtener token seguro
    const getToken = () => {
        const usuarioStr = localStorage.getItem("usuario");
        if (!usuarioStr) return null;
        const usuario = JSON.parse(usuarioStr);
        return usuario.access_token;
    };

    // ---------------------------------------------
    // 1. CARGAR DATOS (Optimizado con useCallback)
    // ---------------------------------------------
    const fetchUsuarios = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) {
                toast.error("Sesión expirada");
                navigate("/login");
                return;
            }

            // Traemos TODOS los usuarios y filtramos en el frontend
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/users`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Sesión inválida");
                    navigate("/login");
                    return;
                }
                throw new Error("Error al obtener usuarios");
            }

            const data = await response.json();
            setAllUsers(data); // Guardamos la data cruda

        } catch (error) {
            console.error("Error:", error);
            toast.error("Error de conexión al cargar usuarios.");
        }
    }, [navigate]);

    // ---------------------------------------------
    // 2. PROCESAR DATOS SEGÚN PESTAÑA ACTIVA
    // ---------------------------------------------
    const procesarDatosTabla = useCallback(() => {
        if (!allUsers.length) {
            setTableData([]);
            return;
        }

        // A) Filtramos según la pestaña
        const usuariosFiltrados = allUsers.filter(u => {
            if (activeTab === "pendientes") return u.estado === "pendiente";
            if (activeTab === "aprobados") return u.estado === "aprobado";
            return false;
        });

        // B) Formateamos para DataTable (Array de Arrays)
        const formattedData = usuariosFiltrados.map(u => {
            
            // Botones dinámicos según la pestaña
            let botonesAccion = "";

            if (activeTab === "pendientes") {
                // En pendientes: Aprobar (Verde) y Rechazar/Eliminar (Rojo)
                botonesAccion = `
                    <button class="btn btn-sm btn-success aceptar-btn me-2" data-usuario='${JSON.stringify(u)}'>
                        <i class="bi bi-check-lg"></i> Aprobar
                    </button>
                    <button class="btn btn-sm btn-danger eliminar-btn" data-usuario='${JSON.stringify(u)}'>
                        <i class="bi bi-trash-fill"></i> Rechazar
                    </button>
                `;
            } else {
                // En aprobados: Solo Eliminar/Dar de baja (Rojo)
                botonesAccion = `
                    <button class="btn btn-sm btn-outline-danger eliminar-btn" data-usuario='${JSON.stringify(u)}'>
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                `;
            }

            const estadoBadge = u.estado === "pendiente" 
                ? '<span class="badge bg-warning text-dark">Pendiente</span>'
                : '<span class="badge bg-success">Aprobado</span>';

            return [
                u.id,
                u.nombre || "Sin Nombre",
                u.correo,
                estadoBadge,
                botonesAccion
            ];
        });

        setTableData(formattedData);
    }, [allUsers, activeTab]);

    // Efecto para actualizar la tabla cuando cambian los datos o la pestaña
    useEffect(() => {
        procesarDatosTabla();
    }, [procesarDatosTabla]);

    // Cargar usuarios al montar
    useEffect(() => {
        fetchUsuarios();
    }, [fetchUsuarios]);


    // ---------------------------------------------
    // 3. ACCIONES (Aprobar / Eliminar)
    // ---------------------------------------------
    const aprobarUsuario = useCallback(async (userId) => {
        try {
            const token = getToken();
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/admin/approve_user/${userId}`,
                {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${token}` }
                }
            );

            if (response.ok) {
                toast.success("Usuario aprobado correctamente");
                fetchUsuarios(); // Recargar lista
            } else {
                const err = await response.json();
                toast.error(err.detail || "Error al aprobar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    }, [fetchUsuarios]);

    const eliminarUsuario = useCallback(async (userId) => {
        try {
            const token = getToken();
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/admin/users/${userId}`,
                {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                }
            );

            if (response.ok) {
                toast.success("Usuario eliminado/rechazado");
                fetchUsuarios(); // Recargar lista
            } else {
                toast.error("Error al eliminar (Verifica que el backend tenga el endpoint DELETE)");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    }, [fetchUsuarios]);

    // ---------------------------------------------
    // 4. MANEJO DE CLICS EN LA TABLA (Delegación de eventos)
    // ---------------------------------------------
    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper');
        
        const handleTableClick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            const dataStr = btn.getAttribute('data-usuario');
            if (!dataStr) return;
            
            const user = JSON.parse(dataStr);

            if (btn.classList.contains('aceptar-btn')) {
                aprobarUsuario(user.id);
            } else if (btn.classList.contains('eliminar-btn')) {
                const accion = activeTab === "pendientes" ? "rechazar" : "eliminar";
                if (window.confirm(`¿Seguro que deseas ${accion} al usuario ${user.correo}?`)) {
                    eliminarUsuario(user.id);
                }
            }
        };

        if (tableElement) tableElement.addEventListener('click', handleTableClick);
        return () => {
            if (tableElement) tableElement.removeEventListener('click', handleTableClick);
        };
    }, [tableData, activeTab, aprobarUsuario, eliminarUsuario]); 


    return (
        <div className="background">
            <Header admin={true}/>
            <div className='container mt-5'>
                
                {/* Título */}
                <div className='input__container d-flex flex-column align-items-center mb-4 p-4'>
                    <h3 className='bold text-primary'>Panel de Administración</h3>
                    <p className="text-muted">Gestiona el acceso de los usuarios a la plataforma</p>
                </div>

                {/* ESTILOS MEJORADOS PARA LAS PESTAÑAS 
                    Se aplica un fondo blanco y texto azul cuando está activa para resaltar.
                */}
                <ul className="nav nav-tabs mb-0 border-bottom-0 ps-2">
                    <li className="nav-item">
                        <button 
                            className={`nav-link px-4 ${activeTab === 'pendientes' ? 'active fw-bold' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'pendientes' ? '#0E3D55' : '#e9ecef',
                                color: activeTab === 'pendientes' ? '#fff' : '#0E3D55',
                                border: '1px solid #0E3D55'
                            }}
                            onClick={() => setActiveTab('pendientes')}
                        >
                            <i className="bi bi-clock-history me-2"></i>
                            PENDIENTES POR APROBAR
                            {allUsers.filter(u => u.estado === 'pendiente').length > 0 && 
                                <span className="badge bg-danger ms-2 rounded-pill">
                                    {allUsers.filter(u => u.estado === 'pendiente').length}
                                </span>
                            }
                        </button>
                    </li>

                    <li className="nav-item">
                        <button 
                            className={`nav-link px-4 ${activeTab === 'aprobados' ? 'active fw-bold' : ''}`}
                            style={{
                                backgroundColor: activeTab === 'aprobados' ? '#0E3D55' : '#e9ecef',
                                color: activeTab === 'aprobados' ? '#fff' : '#0E3D55',
                                border: '1px solid #0E3D55'
                            }}
                            onClick={() => setActiveTab('aprobados')}
                        >
                            <i className="bi bi-people-fill me-2"></i>
                            USUARIOS APROBADOS
                        </button>
                    </li>

                </ul>


                {/* CONTENEDOR TABLA */}
                <div className="bg-white p-4 rounded-bottom shadow-sm border border-top-0 data-table-wrapper" style={{marginTop: '-1px'}}>
                    <DataTable
                        data={tableData}
                        className="table table-hover align-middle"
                        options={{
                            responsive: true,
                            autoWidth: false,
                            destroy: true, // Importante para reinicializar al cambiar tabs
                            columnDefs: [
                                { targets: [3, 4], orderable: false, searchable: false, className: "text-center" },
                            ],
                            language: {
                                search: "Buscar usuario:",
                                lengthMenu: "Mostrar _MENU_ por pág.",
                                info: "Mostrando _START_ a _END_ de _TOTAL_",
                                infoEmpty: "No hay usuarios en esta lista",
                                zeroRecords: "No se encontraron coincidencias",
                                paginate: { first: "«", last: "»", next: "›", previous: "‹" }
                            }
                        }}
                    >
                        <thead className="table-light">
                            <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Correo Electrónico</th>
                                <th className="text-center">Estado</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                    </DataTable>
                </div>
            </div>
        </div>
    )
}

export default Administrar;
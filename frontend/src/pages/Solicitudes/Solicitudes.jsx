import Header from "../../components/Header/Header"
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
import { toast } from "react-toastify";
// IMPORTAMOS LAS FUNCIONES CRÍTICAS DEL MÓDULO CRYPTO
import { descifrarClaveConRSA, cifrarClaveParaDestinatario } from "../../utils/crypto"; 

// Inicializar DataTables
DataTable.use(DT);

const Solicitudes = () => {
    const [tableData, setTableData] = useState([]);
    const navigate = useNavigate();

    const getToken = () => {
        const usuarioStr = localStorage.getItem("usuario");
        if (!usuarioStr) return null;
        try {
            const usuario = JSON.parse(usuarioStr);
            return usuario.access_token || null;
        } catch (e) {
            return null;
        }
    };

    // Función para cargar solicitudes
    const fetchSolicitudes = useCallback(async () => {
        try {
            const token = getToken();
            if (!token) {
                navigate("/login");
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/videos/solicitudes`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Tu sesión ha expirado");
                    localStorage.removeItem("usuario");
                    navigate("/login");
                    return;
                }
                throw new Error("Error al obtener las solicitudes");
            }

            const data = await response.json();
            const solicitudes = data.items || data.solicitudes || data;

            const formattedData = solicitudes.map(s => {
                const estadoBadge = s.estado === "pendiente" 
                    ? '<span class="badge bg-warning text-dark">Pendiente</span>'
                    : s.estado === "aprobado"
                    ? '<span class="badge bg-success">Aprobado</span>'
                    : '<span class="badge bg-danger">Rechazado</span>';

                const accionButtons = s.estado === "pendiente"
                    ? `<button class="btn btn-sm btn-success aceptar-btn me-2" data-solicitud='${JSON.stringify(s)}'>Aceptar</button>
                       <button class="btn btn-sm btn-danger rechazar-btn" data-solicitud='${JSON.stringify(s)}'>Rechazar</button>`
                    : `<span class="text-muted small">Sin acciones</span>`;

                const fechaFormateada = s.fecha_solicitud
                    ? new Date(s.fecha_solicitud).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    })
                    : "";

                return [
                    s.id,
                    s.solicitante_rel?.nombre || s.solicitante_rel?.email || "N/A",
                    s.video_rel?.titulo || "N/A",
                    estadoBadge,
                    fechaFormateada,
                    accionButtons,
                ];
            });

            setTableData(formattedData);
        } catch (error) {
            console.error("Error:", error);
        }
    }, [navigate]);

    // Cargar datos al montar el componente
    useEffect(() => {
        fetchSolicitudes();
    }, [fetchSolicitudes]);


    // --- IMPLEMENTACIÓN DEL INTERCAMBIO DE LLAVES ---
    const aceptarSolicitud = useCallback(async (solicitud) => { // Recibe el objeto solicitud completo
        try {
            const token = getToken(); 
            const usuario = JSON.parse(localStorage.getItem("usuario"));

            if (!solicitud.solicitante_rel.public_key) {
                toast.error("El solicitante no tiene llave pública publicada. Pídele que se loguee para generarla.");
                return;
            }
            
            toast.info("1/2: Desbloqueando llave original...");

            // 1. DESCIFRAR la llave simétrica del video (usando MI llave privada RSA)
            const llaveSimetricaRaw = await descifrarClaveConRSA(solicitud.video_rel.key_cifrada);

            toast.info("2/2: Re-cifrando llave para el destinatario...");

            // 2. RE-CIFRAR la llave usando la PÚBLICA del solicitante
            const nuevaLlaveCifrada = await cifrarClaveParaDestinatario(
                llaveSimetricaRaw,
                solicitud.solicitante_rel.public_key
            );

            // 3. ENVIAR al backend la llave re-cifrada
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/videos/approve_request/${solicitud.id}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    // ENVIAMOS EL PAYLOAD ESPERADO POR EL BACKEND (encrypted_key)
                    body: JSON.stringify({
                        encrypted_key: nuevaLlaveCifrada 
                    })
                }
            );

            const result = await response.json();

            if (response.ok) {
                toast.success("Solicitud aceptada y llave intercambiada.");
                fetchSolicitudes(); 
            } else {
                toast.error(result.detail || "Error al aceptar y guardar llave.");
            }
        } catch (error) {
            console.error("Error en intercambio de llave:", error);
            toast.error("Error Criptográfico: No se pudo aprobar la solicitud.");
        }
    }, [fetchSolicitudes]);

    // Función para rechazar solicitud
    const rechazarSolicitud = useCallback(async (solicitudId) => {
        try {
            const token = getToken();
            const response = await fetch(
                `${process.env.REACT_APP_API_URL}/videos/reject_request/${solicitudId}`,
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
                toast.success("Solicitud rechazada.");
                fetchSolicitudes(); 
            } else {
                toast.error(result.detail || "Error al rechazar.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error de conexión.");
        }
    }, [fetchSolicitudes]);

    // Manejador de eventos delegado para la tabla (MODIFICADO para pasar OBJETO)
    useEffect(() => {
        const tableElement = document.querySelector('.data-table-wrapper');

        const handleTableClick = (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            // Extraer datos del atributo data-solicitud
            const dataStr = btn.getAttribute('data-solicitud');
            if (!dataStr) return;
            
            try {
                const solicitudData = JSON.parse(dataStr);

                if (btn.classList.contains('aceptar-btn')) {
                    // PASAMOS EL OBJETO COMPLETO
                    aceptarSolicitud(solicitudData); 
                } else if (btn.classList.contains('rechazar-btn')) {
                    if (window.confirm('¿Seguro que deseas rechazar esta solicitud?')) {
                        rechazarSolicitud(solicitudData.id);
                    }
                }
            } catch (err) {
                console.error("Error al procesar acción", err);
            }
        };

        if (tableElement) {
            tableElement.addEventListener('click', handleTableClick);
        }

        return () => {
            if (tableElement) {
                tableElement.removeEventListener('click', handleTableClick);
            }
        };
    }, [tableData, aceptarSolicitud, rechazarSolicitud]);

    return (
        <div className="background">
            <Header />
            <div className='container d-flex flex-column justify-content-between align-items-center'>
                <div className='input__container d-flex flex-column align-items-center mt-5 p-4' style={{padding:"3px"}}>
                    <h3 className='bold text-primary'>Gestión de Solicitudes</h3>
                    <p className="text-muted">Aprueba quién puede ver tus videos cifrados</p>
                </div>
                
                <div className="bg-white p-4 rounded shadow-sm border w-100 data-table-wrapper">
                    <DataTable
                        data={tableData}
                        className="table table-striped align-middle"
                        options={{
                            responsive: true,
                            autoWidth: false,
                            destroy: true,
                            columnDefs: [
                                {
                                    targets: [3, 5],
                                    render: (data) => data,
                                    orderable: false,
                                    searchable: false,
                                    className: "text-center"
                                },
                            ],
                            language: {
                                search: "Buscar:",
                                lengthMenu: "Mostrar _MENU_ solicitudes",
                                info: "Mostrando _START_ a _END_ de _TOTAL_",
                                infoEmpty: "No tienes solicitudes pendientes",
                                zeroRecords: "No se encontraron registros",
                                paginate: {
                                    first: "«",
                                    previous: "‹",
                                    next: "›",
                                    last: "»",
                                },
                            },
                        }}
                    >
                        <thead className="table-primary">
                            <tr>
                                <th>ID</th>
                                <th>Solicitante</th>
                                <th>Video Solicitado</th>
                                <th className="text-center">Estado</th>
                                <th>Fecha</th>
                                <th className="text-center">Acciones</th>
                            </tr>
                        </thead>
                    </DataTable>
                </div>
            </div>
        </div>
    )
}

export default Solicitudes;
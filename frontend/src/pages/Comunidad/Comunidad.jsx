import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
DataTable.use(DT); 
const Comunidad=()=>{
    const [tableData, setTableData] = useState([]);
  const navigate = useNavigate();
    const handleOption=(route)=>{
        console.log("click")
        navigate(route);
    }
    const handleEditClick = (videoData) => {
    console.log("Ver video:", videoData);
    // Los datos se envían en el 'state' para que el componente de destino pueda acceder a ellos.
    if(videoData?.id){
        const videoId = videoData.id; 
        navigate(`/videos/${videoId}`);
    }
    
  };
    useEffect(() => {
      // Nota: El selector 'table.dataTable' es una convención de DataTables.
      // Podrías necesitar ajustarlo a un selector más específico si tienes varias tablas.
      const tableElement = document.querySelector('.data-table-wrapper'); 
  
      const handleTableClick = (e) => {
        const target = e.target;
        // Verificamos si se hizo clic en el botón de edición
        if (target.classList.contains('ver-btn')) {
          try {
            // Obtenemos los datos de la empresa incrustados en el atributo data-empresa
            const notificacionDataString = target.getAttribute('data-video');
            const notificacionData = JSON.parse(notificacionDataString);
            handleEditClick(notificacionData);
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

    useEffect(() => {
    const fetchVideos = async () => {
      try {
        // const response = await fetch(`${}/getVideos`, {
        //   method: "GET",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        // });

      const response = {
      ok: true,
      json: async () => ({
        items: [
          {
            id: "vid_001",
            titulo: "Introducción a React",
            descripcion: "Video básico para entender componentes y props.",
            autor_id: "user_123",
            fecha: "2025-01-10",
            duracion: "12:45"
          },
          {
            id: "vid_002",
            titulo: "Criptografía con WebCrypto",
            descripcion: "Explicación de RSA-OAEP, AES-GCM y HKDF.",
            autor_id: "user_456",
            fecha: "2025-01-12",
            duracion: "18:20"
          },
          {
            id: "vid_003",
            titulo: "Cómo usar DynamoDB",
            descripcion: "Conceptos de tablas, particiones y consultas.",
            autor_id: "user_789",
            fecha: "2025-01-14",
            duracion: "15:05"
          },
          {
            id: "vid_004",
            titulo: "Firmas digitales con Ed25519",
            descripcion: "Cómo firmar y verificar mensajes.",
            autor_id: "user_999",
            fecha: "2025-01-20",
            duracion: "09:31"
          }
        ]
      })
    };

        if (!response.ok) {
          throw new Error("Error al obtener los videos");
        }

        const data = await response.json();

        console.log(data)

        const videos = data.items || data;

        const formattedData = videos.map(v => {
          const editButton = `<button class="btn btn-sm btn-primary ver-btn" data-video='${JSON.stringify(v)}'>Ver</button>`;
          return [
          v.titulo || "",
          v.descripcion || "",
          v.autor_id || "",
          editButton
        ]
      });
        console.log(formattedData)
        setTableData(formattedData);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        //setLoading(false);
      }
    };

    fetchVideos();
  }, []);
    return(
        <div className="background">
            <Header />
            <div className='container d-flex flex-column justify-content-between align-items-center'>
      <div className='input__container  d-flex flex-column align-items-center mt-5' style={{padding:"3px"}}>
        <h3 className='bold'>Comunidad</h3>
        {/* <p></p> */}
      </div>
      <DataTable
        data={tableData}
        className="table table-striped data-table-wrapper"
        options={{
          columnDefs: [
              {
                targets: 3, // La columna "Acción" (índice 8)
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
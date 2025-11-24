import Header from "../../components/Header/Header"
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-bs5';
DataTable.use(DT); 
const VerVideos=()=>{
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
        const usuario = JSON.parse(localStorage.getItem("usuario"));
        const autorId = usuario?.id; // <- cámbialo por el ID real del usuario autenticado

        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/videos/my_videos?autor_id=${autorId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              // Si necesitas token:
              // "x-token": token
            },
          }
        );

        if (!response.ok) throw new Error("Error al obtener los videos");

        const videos = await response.json();
        console.log(videos)
        // Construir filas para DataTable
        const formattedData = videos.map(v => {
          const btn = `<button class="btn btn-sm btn-primary ver-btn" data-video='${JSON.stringify(
            v
          )}'>Ver</button>`;

          return [
            v.titulo ?? "",
            v.descripcion ?? "",
            v.autor_id ?? "",
            btn
          ];
        });

        setTableData(formattedData);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    fetchVideos();
  }, []);
    return(
        <div className="background">
            <Header />
            <div className='container d-flex flex-column justify-content-between align-items-center'>
      <div className='input__container  d-flex flex-column align-items-center mt-5' style={{padding:"3px"}}>
        <h3 className='bold'>Videos</h3>
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
            <th>Titulo</th>
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
export default VerVideos;
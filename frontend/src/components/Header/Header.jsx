
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import './_header.scss'
const Header = ({admin}) => {
    const navigate = useNavigate();
    const handleLogout = () => {
        localStorage.removeItem("usuario");
        navigate("/login");
  };
    return (
        <nav className="navbar navbar-expand-lg custom-nav px-3">
            <div className="container-fluid">
                {/* Logo o nombre */}
                <Link className="navbar-brand" to="/">Crypto</Link>

                {/* Botón hamburguesa */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Menú colapsable */}
                {!admin?
                <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul className="navbar-nav font-secondary">
                        <li className="nav-item">
                            <Link className="nav-link" to="/comunidad"><i className="bi bi-people-fill"></i>Comunidad</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/upload-video"><i className="bi bi-cloud-upload-fill"></i> Subir video</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/solicitudes"><i className="bi bi-bell-fill"></i> Solicitudes</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/ver-videos"><i className="bi bi-camera-video-fill"></i> Ver videos</Link>
                        </li>
                        <li className="nav-item" onClick={()=>handleLogout()}>
                            <Link className="nav-link" to="/login"><i className="bi bi-power"></i> Cerrar sesión</Link>
                        </li>
                    </ul>
                </div>:
                <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul className="navbar-nav font-secondary">
                        <li className="nav-item" onClick={()=>handleLogout()}>
                            <Link className="nav-link" to="/login"><i className="bi bi-power"></i> Cerrar sesión</Link>
                        </li>
                    </ul>
                </div>
                }
            </div>
        </nav>
    );
};

export default Header;

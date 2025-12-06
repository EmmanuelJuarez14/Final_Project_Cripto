
import { Link } from "react-router-dom";
import './_header.scss'
const PublicHeader = () => {
    return (
        <nav className="navbar navbar-expand-lg custom-nav px-3 mb-3">
            <div className="container-fluid">
                {/* Logo o nombre */}
                <Link className="navbar-brand" to="/login">Crypto</Link>

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
                <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
                    <ul className="navbar-nav font-secondary">
                        <li className="nav-item">
                            <Link className="nav-link" to="/login"><i className="bi bi-person-fill-up"></i> Iniciar sesión</Link>
                        </li>
                        <li className="nav-item">
                            <Link className="nav-link" to="/signup">
                                <i className="bi bi-person-fill-add"></i> Crear cuenta
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default PublicHeader;

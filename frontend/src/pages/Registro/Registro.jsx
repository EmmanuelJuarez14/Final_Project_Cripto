import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import './_iniciarSesion.scss';
import PublicHeader from "../../components/PublicHeader/PublicHeader";
import { hashPassword } from "../../utils/hash";
import { toast } from "react-toastify";
const Registro=()=>{
    
    const navigate = useNavigate();
    const [validated, setValidated] = useState(false);
    const [nombres, setNombres] = useState("");
    const [apellidos, setApellidos] = useState("");
    const [email, setEmail]=useState("");
    const [password, setPassword]=useState("");
    const [loading, setLoading] = useState(false);
    const handleSubmit = (event) => {
    const form = event.currentTarget;
    setValidated(true);
    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
      console.log(validated)
    }else{
    event.preventDefault();
    event.stopPropagation();
    
    handleLogin()
    }
    
  };

    // Manejar el envío del formulario
    const handleLogin = async () => {
  try {
    setLoading(true);

    const hashed = hashPassword(password);

    const body = {
      nombre: `${nombres} ${apellidos}`,
      correo: email,
      password_hash: hashed
    };

    const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    console.log("Resultado del registro:", result);

    if (!response.ok) {
      alert(result.detail);
      setLoading(false);
      return;
    }
    toast.success("Usuario creado")
    navigate("/login");
  } catch (error) {
    toast.error(error);
  } finally {
    setLoading(false);
  }
};

    return(
        <div className="background">
          <PublicHeader />
            <form className={`needs-validation ${validated ? "was-validated" : ""} form__container`} noValidate onSubmit={handleSubmit}>
                <h2 className="bold">Registro</h2>
                <div className="mb-3">
                    <label htmlFor="nombres" className="form-label bold">Nombres</label>
                    <input
                    type="text"
                    className="form__input--borde form-control"
                    id="nombres"
                    placeholder="Juan Carlos"
                    value={nombres}
                    onChange={(e)=>(setNombres(e.target.value))}
                    required
                    />
                    <div className="invalid-feedback">Por favor, introduce tu nombre.</div>
                </div>
                <div className="mb-3">
                    <label htmlFor="apellidos" className="form-label bold">Apellidos</label>
                    <input
                    type="text"
                    className="form__input--borde form-control"
                    id="apellidos"
                    placeholder="García López"
                    value={apellidos}
                    onChange={(e)=>(setApellidos(e.target.value))}
                    required
                    />
                    <div className="invalid-feedback">Por favor, introduce tus apellidos.</div>
                </div>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label bold">Correo electrónico</label>
                    <input
                    type="email"
                    className="form__input--borde form-control"
                    id="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e)=>(setEmail(e.target.value))}
                    required
                    />
                    <div className="invalid-feedback">Por favor, introduce un correo válido.</div>
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label bold">Contraseña</label>
                    <input
                    type="password"
                    className="form__input--borde form-control"
                    id="password"
                    placeholder="********"
                    required
                    minLength="8"
                    value={password}
                    onChange={(e)=>{setPassword(e.target.value)}}
                    />
                    <div className="invalid-feedback">La contraseña debe tener al menos 6 caracteres.</div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Ingresando...
                    </>
                  ) : (
                    "Ingresar"
                  )}
                </button>
            </form>
        </div>
    )
}
export default Registro;
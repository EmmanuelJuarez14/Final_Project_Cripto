
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import './_iniciarSesion.scss';
import PublicHeader from "../../components/PublicHeader/PublicHeader";
import { hashPassword } from "../../utils/hash";
import { toast } from "react-toastify";
const IniciarSesion=()=>{
    
    const navigate = useNavigate();
    const [validated, setValidated] = useState(false);
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
    
    handleLogin(event)
    }
    
  };

    // Manejar el envío del formulario
     const handleLogin = async () => {
    setLoading(true);

    try {
      const password_hash = hashPassword(password);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: email,
          password_hash
        })
      });

      const raw = await response.text();
      console.log("RAW:", raw);

      const data = raw ? JSON.parse(raw) : null;
      console.log(data)

      if (!response.ok) {
        toast.error(data?.detail || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      toast.success("Inicio de sesión exitoso");

      localStorage.setItem("usuario", JSON.stringify(data));

      navigate("/comunidad");


    } catch (error) {
      console.error(error);
      toast.error("Error de conexión con el servidor");
    }

    setLoading(false);
  };


    return(
        <div className="background">
          <PublicHeader />
            <form className={`needs-validation ${validated ? "was-validated" : ""} form__container`} noValidate onSubmit={handleSubmit}>
                <h2 className="bold">Iniciar sesión</h2>
                <p>Completa los campos para ingresar a tu cuenta. ¿Aún no tienes una cuenta? <Link to="/signup"><u>crear cuenta</u></Link></p>
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
export default IniciarSesion;
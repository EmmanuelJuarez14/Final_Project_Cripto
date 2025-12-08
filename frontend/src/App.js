import './_app.scss'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import 'datatables.net-bs5/css/dataTables.bootstrap5.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap-icons/font/bootstrap-icons.css';
import IniciarSesion from './pages/IniciarSesion/IniciarSesion';
import KeyGenerator from './pages/KeyGenerator/KeyGenerator';
import FileSigner from './pages/FileSigner/FileSigner';
import VerVideos from './pages/VerVideos/VerVideos';
import Comunidad from './pages/Comunidad/Comunidad';
import Solicitudes from './pages/Solicitudes/Solicitudes';
import { ToastContainer } from 'react-toastify';
import VerVideo from './pages/VerVideo/VerVideo';
import SubirVideo from './pages/SubirVideo/SubirVideo';
import Registro from './pages/Registro/Registro';
import Administrar from './pages/Administrador/Administrar';
import Onboarding from './pages/Onboarding/Onboarding';

function App() {
  return (
    <Router>
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 9999 }}
      />
      <Routes>
        <Route
          path="/login"
          element={
              <IniciarSesion />
          }
        />
        <Route
          path="/keys"
          element={
              <KeyGenerator />
          }
        />
        <Route
          path="/signer"
          element={
              <FileSigner />
          }
        />
        
        <Route
          path="/ver-videos"
          element={
              <VerVideos />
          }
        />
        <Route
          path="/comunidad"
          element={
              <Comunidad />
          }
        />
        <Route
          path="/solicitudes"
          element={
              <Solicitudes />
          }
        />
        <Route
          path="/videos/:id"
          element={
              <VerVideo />
          }
        />
        <Route
          path="/upload-video"
          element={
              <SubirVideo />
          }
        />
        <Route
          path="/signup"
          element={
              <Registro />
          }
        />
        <Route
          path="/administrador"
          element={
              <Administrar />
          }
        />
        <Route 
          path="/onboarding" 
          element={
            <Onboarding />
            } 
        />
        </Routes>
        
        
        <ToastContainer />
    </Router>
  );
}

export default App;

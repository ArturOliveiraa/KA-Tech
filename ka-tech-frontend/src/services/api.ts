import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3333/api",
});

// Interceptor para enviar o token JWT automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ka-tech:token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}); // padrão comum com Axios + JWT [web:310][web:313][web:319]

export default api;

import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:8000',
});

// Attach access token to every request
instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors and attempt refresh
instance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem('refresh')
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.post('http://localhost:8000/api/refresh/', {
          refresh: localStorage.getItem('refresh'),
        });
        localStorage.setItem('token', res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return instance(originalRequest);
      } catch (refreshError) {
        // refresh token is invalid/expired
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        window.location.href = '/login'; // force logout
      }
    }

    return Promise.reject(error);
  }
);

export default instance;

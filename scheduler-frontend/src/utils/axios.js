import axios from 'axios';

// const instance = axios.create({
//   baseURL: 'http://localhost:8000',
// });

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach access token to every request
instance.interceptors.request.use((config) => {
  const access = localStorage.getItem('access');
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Handle token refresh if access is expired
instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem('refresh')
    ) {
      console.warn('🔄 Attempting token refresh...');
      originalRequest._retry = true;
      try {
        const res = await axios.post('http://localhost:8000/api/refresh/', {
          refresh: localStorage.getItem('refresh'),
        });

        console.log('✅ Token refresh successful:', res.data);

        localStorage.setItem('access', res.data.access);

        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;
        return instance(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.response?.data || refreshError);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        //window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default instance;

import axios from 'axios';

const axiosPublic = axios.create({
  baseURL: 'http://localhost:8000',
});

export default axiosPublic;

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import PasswordInput from '../components/PasswordInput';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login/', { username, password });
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      localStorage.setItem('username', username); // Optional: useful elsewhere

      navigate('/dashboard');
    } catch (err) {
      if (err.response?.data?.detail) {
        // DRF's default error message format (e.g. "No active account found...")
        setError(err.response.data.detail);
      } else if (Array.isArray(err.response?.data) && err.response.data.length > 0) {
        // Handles case like: ["Incorrect username or password."]
        setError(err.response.data[0]);
      } else if (typeof err.response?.data === 'object') {
        // Handles custom messages from your serializer
        const firstKey = Object.keys(err.response.data)[0];
        const msg = err.response.data[firstKey];
        setError(Array.isArray(msg) ? msg[0] : msg);
      } else if (err.message === 'Network Error') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError('Unexpected error. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-black dark:text-white transition-colors">
      <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center mb-4 text-purple-600">ScheduLounge</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Email or Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
          />
          <PasswordInput
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />
          <button type="submit" className="bg-purple-500 text-white p-2 rounded hover:bg-purple-700 transition">
            Login
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <p className="text-sm text-center mt-2">
            <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">
              Forgot your password?
            </Link>
          </p>
        </form>
        <p className="text-sm mt-4 text-gray-700 dark:text-gray-300 text-center">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
            Register
          </Link>
        </p>
        <ThemeToggle />
      </div>
    </div>
  );
}

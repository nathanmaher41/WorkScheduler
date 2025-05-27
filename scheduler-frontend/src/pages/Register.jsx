import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosPublic from '../utils/axiosPublic'; 
import { Link } from "react-router-dom";
import ThemeToggle from '../components/ThemeToggle';
import PasswordInput from '../components/PasswordInput';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.trim() !== form.password2.trim()) {
      setError('Passwords do not match');
      return;
    }
    try {
      await axiosPublic.post('/api/register/', form);
      localStorage.setItem('username', form.username);
      navigate('/check-email');
    } catch (err) {
      const data = err.response?.data;
      if (data?.password) setError(data.password[0]);
      else if (data?.username) setError(`Username: ${data.username[0]}`);
      else if (data?.email) setError(`Email: ${data.email[0]}`);
      else setError('Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
      <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-md transition-colors duration-300">
        <h1 className="text-3xl font-extrabold text-center mb-2 text-purple-600">ScheduaLounge</h1>
        <h1 className="text-2xl font-bold mb-1">Register</h1>
        <p className="text-gray-500 mb-6">Create your account below.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <input
              name="username"
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className="w-full p-2 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <PasswordInput
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
            <PasswordInput
              name="password2"
              placeholder="Confirm Password"
              value={form.password2}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="bg-purple-500 text-white p-2 rounded hover:bg-purple-700 transition">
            Register
          </button>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-4">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
        </p>
        <ThemeToggle />
      </div>
    </div>
  );
}

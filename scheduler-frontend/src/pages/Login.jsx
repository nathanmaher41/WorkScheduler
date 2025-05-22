import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { Link } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login/', { username, password });
      localStorage.setItem('token', res.data.access);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-64">
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="border p-2 rounded" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="border p-2 rounded" />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded">Login</button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
      <p className="text-sm text-gray-600 mt-4">
        Don't have an account? <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
      </p>
    </div>
    
  );
}
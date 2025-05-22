import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios'; 
import { Link } from "react-router-dom";
import axiosPublic from '../utils/axiosPublic';


export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', password2: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log(form);
    if (form.password !== form.password2) {
      setError('Passwords do not match');
      return;
    }
    try {
      await axiosPublic.post('/api/register/', form);
      navigate('/login');
    } catch (err) {
      setError('Registration failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl mb-4">Register</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-64">
       <input
  name="username"
  type="text"
  placeholder="Username"
  value={form.username}
  onChange={handleChange}
  className="border p-2 rounded"
/>
<input
  name="email"
  type="email"
  placeholder="Email"
  value={form.email}
  onChange={handleChange}
  className="border p-2 rounded"
/>
<input
  name="password"
  type="password"
  placeholder="Password"
  value={form.password}
  onChange={handleChange}
  className="border p-2 rounded"
/>
<input
  name="password2"
  type="password"
  placeholder="Confirm Password"
  value={form.password2}
  onChange={handleChange}
  className="border p-2 rounded"
/>
        <button type="submit" className="bg-green-500 text-white p-2 rounded">Register</button>
      </form>
      <p className="text-sm text-gray-600 mt-4">
        Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
      </p>
    </div>
  );
}

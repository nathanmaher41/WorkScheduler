// src/pages/CompleteProfile.jsx
import { useState } from 'react';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';

export default function CompleteProfile() {
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone_number: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await axios.put('/api/profile/', form);
      navigate('/dashboard');
    } catch (err) {
      setError('Could not save profile. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black dark:bg-gray-900 dark:text-white">
      <form onSubmit={handleSubmit} className="bg-gray-100 dark:bg-gray-800 p-8 rounded shadow max-w-md w-full space-y-4">
        <h1 className="text-xl font-bold">Complete Your Profile</h1>

        <input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleChange} className="input" />
        <input name="middle_name" placeholder="Middle Name (Optional)" value={form.middle_name} onChange={handleChange} className="input" />
        <input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleChange} className="input" />
        
        <div>
          <input name="phone_number" placeholder="Phone Number (Optional)" value={form.phone_number} onChange={handleChange} className="input" />
          <p className="text-xs text-gray-500 mt-1">Optional — provide this if you want to receive SMS updates later.</p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full">Finish Setup</button>
      </form>
    </div>
  );
}

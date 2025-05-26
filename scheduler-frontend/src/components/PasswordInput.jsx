import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import EyelashClosed from './EyelashClosed';
import EyelashOpen from './EyelashOpen';

export default function PasswordInput({ name, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);

  const handleChange = (e) => {
    if (e?.target?.name && typeof onChange === 'function') {
      onChange(e);
    } else if (typeof onChange === 'function') {
      onChange(e.target.value);
    }
  };

  return (
    <div className="relative w-full">
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className="w-full p-2 pr-10 border rounded bg-white text-black placeholder-gray-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-gray-300 dark:border-gray-600 focus:outline-blue-500"
      />
      <div
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-2.5 text-gray-400 cursor-pointer"
      >
        {visible ? <EyelashOpen /> : <EyelashClosed />}
      </div>
    </div>
  );
}

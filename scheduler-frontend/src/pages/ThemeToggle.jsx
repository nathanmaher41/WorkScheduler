import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const html = document.documentElement;
    if (dark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <div className="flex items-center gap-2 mt-4">
      <button
        onClick={() => setDark(!dark)}
        className="w-16 h-8 rounded-full border-2 border-purple-500 flex items-center px-1 transition-all duration-300 bg-gray-300 dark:bg-gray-700"
      >
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300
          ${dark ? 'translate-x-8 bg-black' : 'translate-x-0 bg-white'}`}
        >
          {dark ? (
            <Moon size={16} className="text-purple-400" />
          ) : (
            <Sun size={16} className="text-yellow-500" />
          )}
        </div>
      </button>
      <span className="text-xs text-gray-400 dark:text-gray-500">
        Toggle {dark ? 'light' : 'dark'} mode
      </span>
    </div>
  );
}

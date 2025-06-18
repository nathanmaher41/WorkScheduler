export default function DarkTest() {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
      <h1 className="text-4xl font-bold mb-4">ScheduLounge</h1>
      <p className="mb-6">Now dark mode should work 🎉</p>
      <button
        onClick={() => setDark(prev => !prev)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Toggle {dark ? 'Light' : 'Dark'} Mode
      </button>
    </div>
  );
}

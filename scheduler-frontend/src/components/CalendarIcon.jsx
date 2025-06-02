import { useEffect, useState } from 'react';
import CalendarBlack from '../resources/CalendarBlack.svg';
import CalendarWhite from '../resources/CalendarWhite.svg';

export default function CalendarIcon() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode(); // Initial check
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <img
      src={isDarkMode ? CalendarWhite : CalendarBlack}
      alt="Settings Icon"
      className="w-6 h-6"
    />
  );
}
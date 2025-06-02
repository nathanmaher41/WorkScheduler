import { useEffect, useState } from 'react';
import SettingsBlack from '../resources/SettingsBlack.svg';
import SettingsWhite from '../resources/SettingsWhite.svg';

export default function SettingsIcon() {
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
      src={isDarkMode ? SettingsWhite : SettingsBlack}
      alt="Settings Icon"
      className="w-6 h-6"
    />
  );
}
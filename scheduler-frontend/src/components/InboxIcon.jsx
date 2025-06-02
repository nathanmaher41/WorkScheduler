import { useEffect, useState } from 'react';
import InboxBlack from '../resources/InboxBlack.svg';
import InboxWhite from '../resources/InboxWhite.svg';

export default function InboxIcon() {
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
      src={isDarkMode ? InboxWhite : InboxBlack}
      alt="Inbox Icon"
      className="w-6 h-6"
    />
  );
}
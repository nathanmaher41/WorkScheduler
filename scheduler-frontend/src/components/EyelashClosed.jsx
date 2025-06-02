import EyeClosed from '../resources/svgwebsite.svg';
import EyeClosedWhite from '../resources/eyeclosedwhite.svg';

export default function EyelashClosed({ dark }) {
  return (
    <img
      src={dark ? EyeClosedWhite : EyeClosed}
      alt="Closed Eye with Lashes"
      className="w-6 h-6"
    />
  );
}

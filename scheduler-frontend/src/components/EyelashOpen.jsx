import EyeOpen from '../resources/eyeopen_clean.svg';
import EyeOpenWhite from '../resources/eyeopen_white.svg';

export default function EyelashOpen({ dark }) {
  return (
    <img
      src={dark ? EyeOpenWhite : EyeOpen}
      alt="Open Eye with Lashes"
      className="w-6 h-6"
    />
  );
}

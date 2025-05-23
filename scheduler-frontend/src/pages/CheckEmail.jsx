import { Link } from 'react-router-dom';

export default function CheckEmail() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center px-4">
      <h1 className="text-2xl font-bold mb-2 text-purple-600">Verify Your Email</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        We've sent a confirmation link to your email. Click the link to activate your account.
        If you didn’t get it, you can request a new one.
      </p>
      <Link to="/resend-activation" className="text-blue-600 hover:underline text-sm">
        Resend activation email
      </Link>
    </div>
  );
}

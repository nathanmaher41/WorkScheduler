import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ActivateSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const access = searchParams.get('access');
    const refresh = searchParams.get('refresh');

    if (access && refresh) {
      localStorage.setItem('access', access);
      localStorage.setItem('refresh', refresh);
      navigate('/complete-profile');
    }
  }, [navigate, searchParams]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">Activating your account...</h1>
      <p className="text-gray-600">Please wait while we log you in.</p>
    </div>
  );
}

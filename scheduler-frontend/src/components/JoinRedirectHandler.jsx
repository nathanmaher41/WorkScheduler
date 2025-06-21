import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function JoinRedirectHandler() {
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      // Redirect with token in query param to trigger JoinCalendarModal later
      navigate(`/dashboard?invite_token=${token}`);
    }
  }, [token, navigate]);

  return null;
}
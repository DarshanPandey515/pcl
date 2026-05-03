import { useState, useEffect } from 'react';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export const useProfile = (username) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const { user, updateProfile: ctxUpdate } = useAuth();

  useEffect(() => {
    if (username) {
      authAPI.getPublicProfile(username)
        .then(setProfile)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else if (user) {
      setProfile(user);
      setLoading(false);
    }
  }, [username, user]);

  const updateProfile = async (data) => {
    const updated = await ctxUpdate(data);
    setProfile(updated);
    return updated;
  };

  return { profile, loading, error, updateProfile };
};

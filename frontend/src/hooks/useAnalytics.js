import { useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

export const useAnalytics = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [syncing, setSyncing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authAPI.getAnalytics();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const sync = async () => {
    try {
      setSyncing(true);
      setError(null);
      // 1. Tell backend to run sync (blocks until sync is done)
      await authAPI.syncGithub();
      // 2. Refetch the full analytics payload — this is the fresh data
      await fetchAnalytics();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return { data, loading, error, syncing, refetch: fetchAnalytics, sync };
};
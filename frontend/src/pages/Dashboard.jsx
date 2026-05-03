import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useAnalytics } from '../hooks/useAnalytics';
import Spinner from '../components/ui/Spinner';
import MomentumCard from '../components/dashboard/MomentumCard';
import ProfileCard from '../components/dashboard/ProfileCard';
import HeatmapCard from '../components/dashboard/HeatmapCard';
import StreakCard from '../components/dashboard/StreakCard';
import ContributionChart from '../components/dashboard/ContributionChart';
import LanguageCard from '../components/dashboard/LanguageCard';
import NarrativeCard from '../components/dashboard/NarrativeCard';
import RepoHealthCard from '../components/dashboard/RepoHealthCard';
import BurnoutCard from '../components/dashboard/BurnoutCard';
import MomentumHistoryChart from '../components/dashboard/MomentumHistoryChart';

const TopBar = ({ syncing, onSync, lastSync }) => {
  const lastLabel = lastSync
    ? new Date(lastSync).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg2)',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
        {lastLabel ? `Last synced ${lastLabel}` : 'Not yet synced'}
      </p>

      <button
        onClick={onSync}
        disabled={syncing}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 14px',
          borderRadius: 8,
          fontSize: 12, fontWeight: 500,
          color: syncing ? 'var(--ink3)' : 'var(--accent)',
          background: 'var(--bg3)',
          border: '1px solid var(--border2)',
          cursor: syncing ? 'not-allowed' : 'pointer',
          opacity: syncing ? 0.6 : 1,
          letterSpacing: '-0.01em',
        }}
      >
        {syncing ? <Spinner size="xs" /> : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M10.5 6A4.5 4.5 0 116 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M10.5 1.5V4.5H7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {syncing ? 'Syncing…' : 'Sync GitHub'}
      </button>
    </div>
  );
};

const Dashboard = () => {
  const { user }  = useAuth();
  const { data, loading, error, syncing, sync } = useAnalytics();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Spinner size="lg" />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', marginTop: 12, letterSpacing: '0.06em' }}>
            Loading dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ fontSize: 13, color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
          <p style={{ fontSize: 12, color: 'var(--ink3)' }}>Try refreshing or syncing again.</p>
        </div>
      </div>
    );
  }

  const profile  = user?.profile || {};
  const momentum = data?.momentum || {};
  const summary  = data?.summary  || {};
  const trends   = data?.trends   || {};
  const history  = momentum.history || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar syncing={syncing} onSync={sync} lastSync={data?.last_sync} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row 1 — Momentum + Profile */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MomentumCard momentum={momentum} />
            <ProfileCard  user={user} analytics={data} />
          </div>

          {/* Burnout alert */}
          {data?.burnout?.risk !== 'low' && <BurnoutCard burnout={data.burnout} />}

          {/* Row 2 — Heatmap + Streak */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 210px', gap: 12 }}>
            <HeatmapCard daily={trends.daily || profile.daily_contributions || {}} />
            <StreakCard   summary={summary} profile={profile} />
          </div>

          {/* Momentum history */}
          {history.length > 0 && <MomentumHistoryChart history={history} />}

          {/* Row 3 — Chart + Languages */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 230px', gap: 12 }}>
            <ContributionChart
              monthly={trends.monthly || profile.monthly_contributions || {}}
              weekly={trends.weekly   || profile.weekly_contributions  || {}}
            />
            <LanguageCard languageStats={data?.languages || profile.language_stats || {}} />
          </div>

          {/* Row 4 — Narrative + Repos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <NarrativeCard narrative={data?.narrative || profile.contribution_narrative || []} />
            <RepoHealthCard repos={data?.repos || profile.own_repos || []} />
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: 8, paddingBottom: 16,
            borderTop: '1px solid var(--border)',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink4)' }}>
              GitVisualizer · Open source contribution intelligence
            </p>
            {data?.last_full_sync && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink4)' }}>
                Full sync {new Date(data.last_full_sync).toLocaleDateString()}
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

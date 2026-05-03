import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import Spinner from '../components/ui/Spinner';
import Card from '../components/ui/Card';
import Label from '../components/ui/Label';
import HeatmapCard from '../components/dashboard/HeatmapCard';
import ContributionChart from '../components/dashboard/ContributionChart';
import LanguageCard from '../components/dashboard/LanguageCard';
import NarrativeCard from '../components/dashboard/NarrativeCard';

const PERSONALITY_COLORS = {
  explorer: 'var(--blue)', specialist: 'var(--purple)',
  maintainer: 'var(--green)', sprinter: 'var(--amber)', unknown: 'var(--ink3)',
};

const StatPill = ({ label, value, highlight }) => (
  <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: 'var(--bg3)' }}>
    <p className="font-mono text-lg font-medium" style={{ color: highlight || 'var(--ink)' }}>{value}</p>
    <p className="font-mono text-[9px] text-[var(--ink3)] uppercase tracking-wider mt-0.5">{label}</p>
  </div>
);

const PublicProfile = () => {
  const { username } = useParams();
  const { profile, loading, error } = useProfile(username);

  if (loading) return (
    <div className="flex items-center justify-center h-screen"><Spinner size="lg" /></div>
  );
  if (error) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <p className="font-mono text-[10px] text-[var(--red)] tracking-widest uppercase mb-2">not found</p>
        <p className="font-serif italic text-xl text-[var(--ink)]">{error}</p>
        <Link to="/leaderboard" className="font-mono text-[11px] text-[var(--amber)] mt-4 block">← leaderboard</Link>
      </div>
    </div>
  );

  const stats     = profile.stats || {};
  const contribs  = profile.contribution_data || {};
  const pType     = profile.personality_type || 'unknown';
  const pColor    = PERSONALITY_COLORS[pType];

  return (
    <div className="px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4 mb-2">
        {profile.avatar_url && (
          <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full border" style={{ borderColor: 'var(--border)' }} />
        )}
        <div>
          <h1 className="font-serif italic font-light text-3xl text-[var(--ink)]">{profile.full_name}</h1>
          <p className="font-mono text-[12px] text-[var(--ink2)]">@{profile.username}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--border2)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: pColor }} />
              <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: pColor }}>{pType}</span>
            </div>
            {profile.momentum_score > 0 && (
              <span className="font-mono text-[11px] text-[var(--ink3)]">
                momentum <span style={{ color: 'var(--amber)' }}>{Number(profile.momentum_score).toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
        <Link to="/leaderboard" className="ml-auto font-mono text-[10px] text-[var(--ink3)] hover:text-[var(--amber)] transition-colors">
          ← leaderboard
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-2">
        <StatPill label="contributions" value={(stats.total_contributions || 0).toLocaleString()} highlight="var(--green)" />
        <StatPill label="commits"       value={stats.total_commits || 0} />
        <StatPill label="pull requests" value={stats.total_pull_requests || 0} />
        <StatPill label="streak"        value={`${stats.current_streak || 0}d`} highlight={stats.current_streak >= 7 ? 'var(--green)' : undefined} />
        <StatPill label="top language"  value={stats.top_language || 'N/A'} />
      </div>

      {/* Heatmap */}
      {contribs.daily && Object.keys(contribs.daily).length > 0 && (
        <HeatmapCard daily={contribs.daily} />
      )}

      {/* Charts */}
      <div className="grid grid-cols-[1fr_240px] gap-4">
        <ContributionChart
          monthly={contribs.monthly || {}}
          weekly={contribs.weekly   || {}}
        />
        <LanguageCard languageStats={contribs.languages || {}} />
      </div>

      {/* Narrative */}
      {profile.contribution_narrative?.length > 0 && (
        <NarrativeCard narrative={profile.contribution_narrative} />
      )}

      {/* Pinned repos */}
      {profile.pinned_repos?.length > 0 && (
        <Card className="p-5">
          <Label className="mb-3">pinned repositories</Label>
          <div className="grid grid-cols-2 gap-2">
            {profile.pinned_repos.map((repo, i) => (
              <a
                key={i}
                href={repo.url || repo.html_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border px-3 py-2.5 block transition-colors"
                style={{ borderColor: 'var(--border)', background: 'var(--bg3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border2)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <p className="font-mono text-[12px] text-[var(--blue)]">{repo.name || repo.nameWithOwner}</p>
                {repo.description && (
                  <p className="font-mono text-[10px] text-[var(--ink3)] mt-0.5 truncate">{repo.description}</p>
                )}
                {repo.primaryLanguage?.name && (
                  <p className="font-mono text-[9px] text-[var(--ink3)] mt-1.5">
                    {repo.primaryLanguage.name} · ★ {repo.stargazerCount || repo.stargazers_count || 0}
                  </p>
                )}
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PublicProfile;

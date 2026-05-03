// src/pages/ContributorProfile.jsx - Real data + Dark SaaS theme
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const C = {
  bg:'#080810',card:'#12121f',border:'#1e1e30',muted:'#2a2a40',
  text:'#e8e8f0',dim:'#6b6b8a',accent:'#6366f1',aLo:'rgba(99,102,241,0.14)',
  teal:'#2dd4bf',amber:'#f59e0b',rose:'#f43f5e',green:'#22c55e',
};
const PAL = [C.accent,C.teal,C.amber,C.rose,C.green,'#a78bfa'];
const cs = { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'22px 24px' };

const Tip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'#1c1c2e',border:`1px solid ${C.border}`,borderRadius:10,padding:'10px 14px',fontSize:12}}>
      {label&&<p style={{color:C.dim,marginBottom:4}}>{label}</p>}
      {payload.map((p,i)=><p key={i} style={{color:p.color||C.text,fontWeight:600}}>{p.name}: {p.value}</p>)}
    </div>
  );
};

export default function ContributorProfile() {
  const {username} = useParams();
  const [profile,setProfile] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try { setProfile(await authAPI.getPublicProfile(username)); }
      catch(e){ setError(e.message||'Profile not found'); }
      finally{ setLoading(false); }
    })();
  },[username]);

  if(loading) return (
    <div style={{background:C.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:40,height:40,border:`3px solid ${C.border}`,borderTopColor:C.accent,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if(error) return (
    <div style={{background:C.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'"DM Sans",system-ui,sans-serif'}}>
      <div style={{...cs,maxWidth:400,textAlign:'center'}}>
        <p style={{fontSize:48,marginBottom:16}}>👤</p>
        <p style={{color:C.text,fontWeight:700,fontSize:18,marginBottom:8}}>Profile not found</p>
        <p style={{color:C.dim,fontSize:14,marginBottom:20}}>{error}</p>
        <Link to="/contributors/search" style={{color:C.accent,fontWeight:600,fontSize:14,textDecoration:'none'}}>← Back to search</Link>
      </div>
    </div>
  );

  const monthly = Object.entries(profile.contribution_data?.monthly||{})
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([month,count])=>({month:month.slice(5),contributions:count})).slice(-12);

  const langs = Object.entries(profile.contribution_data?.languages||{})
    .sort(([,a],[,b])=>b-a).slice(0,6)
    .map(([name,value])=>({name,value}));

  const st = profile.stats||{};

  return (
    <div style={{background:C.bg,minHeight:'100vh',fontFamily:'"DM Sans",system-ui,sans-serif',color:C.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}a{text-decoration:none}.rc:hover{background:${C.muted}!important}`}</style>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'44px 28px'}}>

        {/* back */}
        <Link to="/contributors/search" style={{display:'inline-flex',alignItems:'center',gap:6,color:C.dim,fontSize:13,fontWeight:600,marginBottom:28}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          All contributors
        </Link>

        {/* profile header card */}
        <div style={{...cs,marginBottom:20,position:'relative',overflow:'hidden'}}>
          {/* gradient bar */}
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${C.accent},${C.teal})`}}/>
          
          <div style={{display:'flex',alignItems:'flex-start',gap:20,paddingTop:8}}>
            <img
              src={profile.avatar_url||`https://avatars.githubusercontent.com/${username}`}
              alt={profile.username}
              style={{width:80,height:80,borderRadius:'50%',border:`3px solid ${C.border}`,flexShrink:0}}
              onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${username}&background=1e1e30&color=6366f1&bold=true&size=80`;}}
            />
            <div style={{flex:1,minWidth:0}}>
              <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-.02em',marginBottom:4}}>
                {profile.full_name||profile.username}
              </h1>
              <p style={{color:C.dim,fontSize:13,fontFamily:'"DM Mono",monospace',marginBottom:12}}>@{profile.username}</p>
              {profile.bio&&<p style={{color:C.text,fontSize:14,lineHeight:1.6,maxWidth:600,marginBottom:12}}>{profile.bio}</p>}
              <div style={{display:'flex',flexWrap:'wrap',gap:16,fontSize:13,color:C.dim}}>
                {profile.location&&<span>📍 {profile.location}</span>}
                {profile.github_username&&(
                  <a href={profile.github_url} target="_blank" rel="noopener noreferrer" style={{color:C.accent,fontWeight:600}}>
                    GitHub ↗
                  </a>
                )}
                {profile.twitter_handle&&(
                  <a href={`https://twitter.com/${profile.twitter_handle.replace('@','')}`} target="_blank" rel="noopener noreferrer" style={{color:C.teal,fontWeight:600}}>
                    Twitter ↗
                  </a>
                )}
                {profile.website&&(
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{color:C.green,fontWeight:600}}>
                    Website ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
          {[
            {label:'Total Contributions',value:st.total_contributions?.toLocaleString(),color:C.accent},
            {label:'Current Streak',value:st.current_streak!=null?`${st.current_streak}d`:null,color:C.amber},
            {label:'Top Language',value:st.top_language,color:C.teal},
            {label:'Peak Time',value:st.peak_contribution_time,color:C.green},
          ].map(({label,value,color})=>(
            <div key={label} style={cs}>
              <p style={{color:C.dim,fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:10}}>{label}</p>
              <p style={{fontSize:24,fontWeight:800,letterSpacing:'-.02em',color}}>{value||'—'}</p>
            </div>
          ))}
        </div>

        {/* charts */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:20}}>
          <div style={cs}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:18}}>Monthly Contributions</p>
            {monthly.length===0?(
              <div style={{height:240,display:'flex',alignItems:'center',justifyContent:'center',color:C.dim,fontSize:13}}>No data</div>
            ):(
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="month" tick={{fill:C.dim,fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:C.dim,fontSize:11}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip/>}/>
                  <Line type="monotone" dataKey="contributions" name="Contributions" stroke={C.accent} strokeWidth={2.5} dot={{fill:C.accent,r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          <div style={cs}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:18}}>Languages Used</p>
            {langs.length===0?(
              <div style={{height:240,display:'flex',alignItems:'center',justifyContent:'center',color:C.dim,fontSize:13}}>No data</div>
            ):(
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={langs} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={{stroke:C.dim}}>
                    {langs.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                  </Pie>
                  <Tooltip content={<Tip/>}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* contributed repos */}
        {profile.contributed_repos?.length>0&&(
          <div style={cs}>
            <p style={{fontSize:13,fontWeight:700,marginBottom:20}}>Contributed Repositories</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {profile.contributed_repos.map((repo,i)=>(
                <a key={i} href={repo.html_url} target="_blank" rel="noopener noreferrer"
                  className="rc"
                  style={{display:'block',padding:'14px 16px',border:`1px solid ${C.border}`,borderRadius:10,transition:'background .15s',background:'transparent'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{color:C.accent,fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{repo.name}</span>
                    {repo.contribution_type&&<span style={{background:C.aLo,color:C.accent,borderRadius:5,padding:'2px 8px',fontSize:10,fontWeight:700,flexShrink:0,marginLeft:8}}>{repo.contribution_type.replace('Event','')}</span>}
                  </div>
                  {repo.description&&<p style={{color:C.dim,fontSize:12,marginBottom:8,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{repo.description}</p>}
                  <div style={{display:'flex',gap:14,fontSize:11,color:C.dim}}>
                    <span>★ {repo.stargazers_count||0}</span>
                    <span>⑂ {repo.forks_count||0}</span>
                    {repo.language&&<span style={{background:'#1a1a2e',color:C.teal,borderRadius:4,padding:'1px 7px',fontWeight:600}}>{repo.language}</span>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
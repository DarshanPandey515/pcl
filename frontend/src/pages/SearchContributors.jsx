// src/pages/SearchContributors.jsx - Real API + Dark SaaS theme
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/auth';

const C = {
  bg:'#080810',card:'#12121f',border:'#1e1e30',muted:'#2a2a40',
  text:'#e8e8f0',dim:'#6b6b8a',accent:'#6366f1',aLo:'rgba(99,102,241,0.14)',
  teal:'#2dd4bf',amber:'#f59e0b',rose:'#f43f5e',green:'#22c55e',
};
const cs = { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'22px 24px' };

const LANGS = ['JavaScript','TypeScript','Python','Java','Go','Rust','C++','PHP','Ruby','Swift','Kotlin'];

const StatBadge = ({value,label,color=C.dim}) => (
  <div style={{textAlign:'center',minWidth:70}}>
    <p style={{fontSize:18,fontWeight:800,color:color,letterSpacing:'-.02em',lineHeight:1}}>{value??'—'}</p>
    <p style={{fontSize:10,color:C.dim,fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginTop:3}}>{label}</p>
  </div>
);

export default function SearchContributors() {
  const [q,setQ] = useState('');
  const [lang,setLang] = useState('');
  const [minC,setMinC] = useState('');
  const [results,setResults] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [searched,setSearched] = useState(false);

  const search = async (e) => {
    if(e) e.preventDefault();
    setLoading(true); setError(''); setSearched(true);
    try {
      const params = new URLSearchParams();
      if(q.trim()) params.append('q',q.trim());
      if(lang && lang!=='All') params.append('language',lang);
      if(minC) params.append('min_contributions',minC);
      const data = await authAPI.searchContributors(params);
      setResults(Array.isArray(data)?data:[]);
    } catch(e){ setError(e.message||'Search failed'); }
    finally{ setLoading(false); }
  };

  // load all on mount (empty search shows all public profiles)
  useEffect(()=>{ search(); },[]);

  return (
    <div style={{background:C.bg,minHeight:'100vh',fontFamily:'"DM Sans",system-ui,sans-serif',color:C.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}a{text-decoration:none}input,select{font-family:inherit}input::placeholder{color:${C.dim}}input:focus,select:focus{outline:none;border-color:${C.accent}!important;box-shadow:0 0 0 3px rgba(99,102,241,.15)}.cr:hover{background:${C.muted}!important;cursor:pointer}`}</style>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'44px 28px'}}>

        {/* header */}
        <div style={{marginBottom:40}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:C.teal,display:'block',boxShadow:`0 0 10px ${C.teal}`}}/>
            <span style={{color:C.dim,fontSize:11,fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase'}}>Discover</span>
          </div>
          <h1 style={{fontSize:32,fontWeight:800,letterSpacing:'-.03em',lineHeight:1.1}}>Find Contributors</h1>
          <p style={{color:C.dim,fontSize:14,marginTop:8}}>Discover open source contributors by name, language, or activity.</p>
        </div>

        {/* search form */}
        <div style={{...cs,marginBottom:28}}>
          <form onSubmit={search}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 180px 160px auto',gap:12,alignItems:'flex-end'}}>
              <div>
                <label style={{display:'block',color:C.dim,fontSize:11,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Search</label>
                <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Username or name..."
                  style={{width:'100%',background:'#0a0a14',border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,transition:'border-color .15s'}}/>
              </div>
              <div>
                <label style={{display:'block',color:C.dim,fontSize:11,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Language</label>
                <select value={lang} onChange={e=>setLang(e.target.value)}
                  style={{width:'100%',background:'#0a0a14',border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,transition:'border-color .15s',appearance:'none'}}>
                  <option value="">All languages</option>
                  {LANGS.map(l=><option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:'block',color:C.dim,fontSize:11,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Min Contributions</label>
                <input type="number" value={minC} onChange={e=>setMinC(e.target.value)} placeholder="e.g. 50" min="0"
                  style={{width:'100%',background:'#0a0a14',border:`1px solid ${C.border}`,borderRadius:9,padding:'10px 14px',color:C.text,fontSize:14,transition:'border-color .15s'}}/>
              </div>
              <button type="submit" disabled={loading}
                style={{background:C.accent,color:'#fff',border:'none',borderRadius:9,padding:'10px 24px',fontSize:14,fontWeight:700,cursor:loading?'not-allowed':'pointer',opacity:loading?.6:1,fontFamily:'inherit',whiteSpace:'nowrap',marginTop:24}}>
                {loading ? 'Searching…' : 'Search'}
              </button>
            </div>
          </form>
        </div>

        {error&&<div style={{background:'rgba(244,63,94,.1)',border:'1px solid rgba(244,63,94,.3)',borderRadius:10,padding:'12px 18px',color:C.rose,marginBottom:24,fontSize:14}}>&#9888; {error}</div>}

        {/* results */}
        {searched && (
          <div style={cs}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
              <p style={{fontSize:13,fontWeight:700,color:C.text}}>Results</p>
              {results.length>0&&<span style={{background:C.aLo,color:C.accent,borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:700}}>{results.length}</span>}
            </div>

            {loading && (
              <div style={{display:'flex',justifyContent:'center',padding:'40px 0',gap:12,alignItems:'center',color:C.dim,fontSize:13}}>
                <div style={{width:20,height:20,border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                Searching contributors…
              </div>
            )}

            {!loading && results.length===0 && (
              <div style={{textAlign:'center',padding:'48px 0',color:C.dim}}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{margin:'0 auto 12px',display:'block'}}>
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <p style={{fontSize:14,fontWeight:500}}>No contributors found</p>
                <p style={{fontSize:12,marginTop:6}}>Try a different search or register to appear here</p>
              </div>
            )}

            {!loading && results.length>0 && (
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {results.map((c,i)=>(
                  <Link key={c.username} to={`/profile/${c.username}`}
                    className="cr"
                    style={{display:'flex',alignItems:'center',gap:16,padding:'14px 16px',borderRadius:10,transition:'background .15s',background:'transparent'}}>
                    
                    {/* rank */}
                    <span style={{color:C.dim,fontSize:12,fontWeight:700,fontFamily:'"DM Mono",monospace',minWidth:24,textAlign:'right'}}>
                      {(i+1).toString().padStart(2,'0')}
                    </span>

                    {/* avatar */}
                    <img
                      src={c.avatar_url||`https://avatars.githubusercontent.com/${c.username}`}
                      alt={c.username}
                      style={{width:44,height:44,borderRadius:'50%',border:`2px solid ${C.border}`,flexShrink:0}}
                      onError={e=>{e.target.src=`https://ui-avatars.com/api/?name=${c.username}&background=1e1e30&color=6366f1&bold=true`;}}
                    />

                    {/* info */}
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {c.full_name||c.username}
                      </p>
                      <p style={{color:C.dim,fontSize:12,fontFamily:'"DM Mono",monospace'}}>@{c.username}</p>
                    </div>

                    {/* top lang badge */}
                    {c.top_language && (
                      <span style={{background:C.aLo,color:C.accent,borderRadius:6,padding:'3px 10px',fontSize:11,fontWeight:700,flexShrink:0}}>
                        {c.top_language}
                      </span>
                    )}

                    {/* stats */}
                    <div style={{display:'flex',gap:24,flexShrink:0}}>
                      <StatBadge value={c.total_contributions?.toLocaleString()} label="Contributions" color={C.accent}/>
                      <StatBadge value={c.current_streak!=null?`${c.current_streak}d`:null} label="Streak" color={C.teal}/>
                    </div>

                    {/* arrow */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" style={{flexShrink:0}}>
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
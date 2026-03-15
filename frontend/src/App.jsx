import React, { useState, useEffect } from 'react'
import { Hexagon, AlertCircle, Loader2, LayoutGrid, BarChart2, Globe, Cpu } from 'lucide-react'
import StartupCard from './components/StartupCard'
import AnalyticsDashboard from './components/AnalyticsDashboard'
import SearchBar from './components/SearchBar'
import './index.css'

function App() {
  const [startups, setStartups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filtered, setFiltered] = useState([])
  const [aiMode, setAiMode] = useState(false)
  const [activeTab, setActiveTab] = useState('feed')

  useEffect(() => { fetchStartups() }, [])

  const fetchStartups = async () => {
    try {
      setError(null)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/startups`)
      if (!res.ok) throw new Error('Failed to fetch startups')
      const data = await res.json()
      setStartups(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const triggerVectorSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    setError(null)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/search?q=${encodeURIComponent(search)}`)
      if (!res.ok) throw new Error('Vector search failed to connect to server')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFiltered(data)
    } catch (err) {
      setError(err.message)
      setFiltered([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!aiMode) {
      if (!search.trim()) {
        setFiltered(startups)
      } else {
        const lower = search.toLowerCase()
        setFiltered(startups.filter(s =>
          s.name?.toLowerCase().includes(lower) ||
          s.description?.toLowerCase().includes(lower) ||
          s.industry?.toLowerCase().includes(lower) ||
          s.techStack?.some(t => t.technology.toLowerCase().includes(lower))
        ))
      }
    }
  }, [search, startups, aiMode])

  const handleToggleAI = () => {
    setAiMode(prev => {
      if (prev) setFiltered(startups)
      return !prev
    })
    setError(null)
  }

  return (
    <div className="app-container">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="logo-container" onClick={() => window.location.reload()}>
          <Hexagon size={32} className="logo-icon" strokeWidth={2.5} />
          <span className="app-title">CoFoundry Intelligence</span>
        </div>

        <p className="app-subtitle">
          The ultimate engine for real-time AI startup discovery, 
          deep-tech vector search, and global ecosystem analytics.
        </p>

        {/* Segmented Tab Control */}
        <div className="tab-group">
          <button
            className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
            onClick={() => setActiveTab('feed')}
          >
            Data Feed
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Analytics Dashboard
          </button>
        </div>
      </header>


      {/* ── Dashboard Tab ── */}
      {activeTab === 'dashboard' && <AnalyticsDashboard />}


      {/* ── Feed Tab ── */}
      {activeTab === 'feed' && (
        <>
          <div className="controls-bar">
            <SearchBar
              aiMode={aiMode}
              search={search}
              onSearchChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && aiMode) triggerVectorSearch() }}
              onSearch={triggerVectorSearch}
              onToggleAI={handleToggleAI}
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="loader-container">
              <Loader2 size={44} className="loader-icon" />
              <p>Sifting through the intelligence foundry…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="error-container glass-panel">
              <AlertCircle size={40} style={{ margin: '0 auto 1rem', color: '#f87171' }} />
              <h2 style={{ color: '#0f172a' }}>Something went wrong</h2>
              <p>{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="empty-state">
              <p>No startups found{search ? ` matching "${search}"` : ''}.</p>
            </div>
          )}

          {/* Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="startups-grid">
              {filtered.map((startup, index) => (
                <StartupCard key={startup.id} startup={startup} index={index} aiMode={aiMode} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App

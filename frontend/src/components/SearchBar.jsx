import React from 'react';
import { Search, Sparkles, Hexagon } from 'lucide-react';

export default function SearchBar({ aiMode, search, onSearchChange, onKeyDown, onSearch, onToggleAI }) {
  return (
    <>
      <div className={`search-wrapper glass-panel ${aiMode ? 'ai-mode' : ''}`}>
        {aiMode
          ? <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          : <Search size={20} style={{ color: 'var(--text-muted)' }} />
        }
        <input
          type="text"
          className="chat-search-input"
          placeholder={
            aiMode
              ? "Ask CoFoundry (e.g. 'Find YC startups in AI/ML hiring for remote roles')…"
              : "Search the database by company name, tech stack, or industry…"
          }
          value={search}
          onChange={onSearchChange}
          onKeyDown={onKeyDown}
          aria-label="Search startups"
        />
        {aiMode && (
          <button 
            className="ai-pill-btn active" 
            style={{ height: '40px', padding: '0 1.2rem', borderRadius: '12px' }} 
            onClick={onSearch}
          >
            Search
          </button>
        )}
      </div>

      <button
        className={`ai-pill-btn glass-panel ${aiMode ? 'active' : ''}`}
        onClick={onToggleAI}
        aria-label="Toggle AI vector search mode"
      >
        <Sparkles size={16} />
        Intelligence Mode
      </button>
    </>
  );
}

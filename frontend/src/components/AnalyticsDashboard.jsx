import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';
import { MapPin, Cpu, Briefcase, Globe as GlobeIcon, TrendingUp } from 'lucide-react';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#fb923c', '#fbbf24', '#22c55e', '#06b6d4'];

const AnalyticsDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    fetch(`${apiUrl}/api/analytics`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
      <div className="pulse-loader" />
      <p style={{ marginTop: '20px', opacity: 0.6 }}>Synchronizing Location Intelligence...</p>
    </div>
  );

  return (
    <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', padding: '20px 0' }}>
      
      {/* ── Startup Hubs (Locations) ── */}
      <div className="glass-panel analytics-card">
        <div className="card-header">
          <MapPin size={18} color="var(--primary)" />
          <h3>Global Startup Hubs</h3>
        </div>
        <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.startupLocations} layout="vertical" margin={{ left: 40, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                stroke="rgba(255,255,255,0.4)" 
                fontSize={10} 
                width={100}
                tick={{ fill: 'rgba(255,255,255,0.7)' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.startupLocations.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Industry Distribution ── */}
      <div className="glass-panel analytics-card">
        <div className="card-header">
          <Cpu size={18} color="#a855f7" />
          <h3>Top Tech Trends</h3>
        </div>
        <div style={{ height: '300px', width: '100%', marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.technologies.slice(0, 8)}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
              >
                {data.technologies.slice(0, 8).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>


      {/* ── Intelligence Coverage ── */}
      <div className="glass-panel analytics-card">
        <div className="card-header">
          <TrendingUp size={18} color="#22c55e" />
          <h3>Discovery Reach</h3>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: '#fff', textShadow: '0 0 20px rgba(34, 197, 94, 0.4)' }}>
            {data.sources.reduce((acc, s) => acc + s.count, 0)}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
            Unified Startup Nodes
          </p>
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
            {data.sources.map(s => (
              <div key={s.name}>
                <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{s.count}</div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>{s.name.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsDashboard;

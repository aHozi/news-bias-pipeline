import React, { useState, useEffect } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Search, AlertCircle, Zap } from 'lucide-react'
import './App.css'

function App() {
  const [data, setData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSource, setSelectedSource] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({})
  const [biasView, setBiasView] = useState('disparity') // 'disparity' or 'coverage'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const sourceMapping = {
    'klan': 'TV Klan',
    'tch': 'Top Channel'
  }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Adjust path based on your setup
      const response = await fetch('popularity_people_metrics.csv')

      if (!response.ok) {
        throw new Error('Data file not found. Run the pipeline first: kedro run --pipeline=popularity_metrics')
      }

      const text = await response.text()
      const rows = text.trim().split('\n')
      const headers = rows[0].split(',')

      const parsed = rows.slice(1).map(row => {
        const values = row.split(',')
        const rawSource = values[1]?.trim().replace(/^"|"$/g, '')
        return {
          name: values[0]?.trim().replace(/^"|"$/g, ''),
          source: sourceMapping[rawSource] || rawSource,
          total_mentions: parseInt(values[2]) || 0
        }
      }).filter(item => item.name && item.source)

      setData(parsed)
      calculateStats(parsed)
      filterData(parsed, '', 'all')
      setError(null)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const calculateStats = (dataset) => {
    const uniquePeople = new Set(dataset.map(d => d.name)).size
    const uniqueSources = new Set(dataset.map(d => d.source)).size
    const totalMentions = dataset.reduce((sum, d) => sum + d.total_mentions, 0)
    const avgMentions = Math.round(totalMentions / dataset.length)

    setStats({
      uniquePeople,
      uniqueSources,
      totalMentions,
      avgMentions
    })
    setLoading(false)
  }

  const filterData = (dataset, search, source) => {
    let filtered = dataset

    if (source !== 'all') {
      filtered = filtered.filter(item => item.source === source)
    }

    if (search) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    setCurrentPage(1)
    setFilteredData(filtered.sort((a, b) => b.total_mentions - a.total_mentions))
  }

  const handleSearch = (value) => {
    setSearchTerm(value)
    filterData(data, value, selectedSource)
  }

  const handleSourceFilter = (value) => {
    setSelectedSource(value)
    filterData(data, searchTerm, value)
  }

  const sources = [...new Set(filteredData.map(d => d.source))]
  const topPeople = filteredData.slice(0, 10)

  // Pagination for detailed table
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredData.slice(startIndex, endIndex)

  // Calculate person-source matrix for bias analysis - using filtered data
  const personSourceMap = {}
  filteredData.forEach(item => {
    if (!personSourceMap[item.name]) {
      personSourceMap[item.name] = {}
    }
    personSourceMap[item.name][item.source] = item.total_mentions
  })

  // Calculate bias metrics for each person
  const peopleWithBias = Object.entries(personSourceMap).map(([name, sourceCounts]) => {
    const mentions = Object.values(sourceCounts)
    const total = mentions.reduce((a, b) => a + b, 0)
    const max = Math.max(...mentions)
    const min = Math.min(...mentions)
    const disparity = max - min
    const disparityPercent = ((disparity / total) * 100).toFixed(1)

    return {
      name,
      ...sourceCounts,
      total,
      disparity,
      disparityPercent,
      concentration: ((max / total) * 100).toFixed(1)
    }
  }).sort((a, b) => b.disparity - a.disparity)

  // Most biased people (high disparity)
  const mostBiasedPeople = peopleWithBias.filter(p => p.disparity >= 3).slice(0, 12)

  // People mentioned equally across sources (balanced coverage)
  // Both sources must mention the person for it to be considered balanced
  const balancedPeople = peopleWithBias
    .filter(p => {
      const klan = p[sourceMapping['klan']] || 0
      const tch = p[sourceMapping['tch']] || 0
      return p.total >= 5 && p.disparity <= 2 && klan > 0 && tch > 0
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // Source comparison data - using filtered data
  const sourceData = sources.map(source => ({
    name: source,
    count: filteredData.filter(d => d.source === source).length,
    mentions: filteredData.filter(d => d.source === source).reduce((sum, d) => sum + d.total_mentions, 0)
  }))

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea']

  if (loading && data.length === 0) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading popularity metrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            Make sure to run: <code>cd bias-detection && kedro run --pipeline=popularity_metrics</code>
          </p>
          <button onClick={loadData}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>📊 Popularity Metrics Dashboard</h1>
          <p>News Bias Pipeline - Person Entity Analysis</p>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-info">
            <div className="stat-value">{new Set(filteredData.map(d => d.name)).size}</div>
            <div className="stat-label">Unique People</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📰</div>
          <div className="stat-info">
            <div className="stat-value">{sources.length}</div>
            <div className="stat-label">News Sources</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📢</div>
          <div className="stat-info">
            <div className="stat-value">{filteredData.reduce((sum, d) => sum + d.total_mentions, 0)}</div>
            <div className="stat-label">Total Mentions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <div className="stat-value">{filteredData.length > 0 ? Math.round(filteredData.reduce((sum, d) => sum + d.total_mentions, 0) / filteredData.length) : 0}</div>
            <div className="stat-label">Avg Mentions</div>
          </div>
        </div>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search person by name..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select value={selectedSource} onChange={(e) => handleSourceFilter(e.target.value)} className="filter-select">
          <option value="all">All Sources</option>
          {sources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>

      <div className="bias-controls">
        <div className="bias-tabs">
          <button
            className={`bias-tab ${biasView === 'disparity' ? 'active' : ''}`}
            onClick={() => setBiasView('disparity')}
          >
            <AlertCircle size={18} /> Bias Detection
          </button>
          <button
            className={`bias-tab ${biasView === 'coverage' ? 'active' : ''}`}
            onClick={() => setBiasView('coverage')}
          >
            <Zap size={18} /> Coverage Analysis
          </button>
        </div>
      </div>

      {biasView === 'coverage' && (
        <div className="charts-grid">
          <div className="chart-container">
            <h3>Top 10 Most Mentioned People</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topPeople}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_mentions" fill="#667eea" name="Mentions" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Mentions Distribution by Source</h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, mentions }) => `${name}: ${mentions}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="mentions"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {biasView === 'disparity' && (
        <div className="bias-analysis">
          <div className="bias-section">
            <h3>🚨 Most Biased Coverage</h3>
            <p className="section-desc">People with the biggest mention gap between sources</p>
            <div className="bias-grid">
              {mostBiasedPeople.map((person, idx) => {
                const klanMentions = person[sourceMapping['klan']] || 0
                const tchMentions = person[sourceMapping['tch']] || 0
                const isKlanFocused = klanMentions > tchMentions

                return (
                  <div key={idx} className="bias-card">
                    <div className="bias-header">
                      <h4>{person.name}</h4>
                      <span className="bias-badge" title="Disparity between sources">
                        {person.disparityPercent}% gap
                      </span>
                    </div>
                    <div className="bias-bar-container">
                      <div className="bias-source-row">
                        <span className="source-label">{sourceMapping['klan']}</span>
                        <div className="bias-bar">
                          <div
                            className="bias-fill klan"
                            style={{width: `${(klanMentions / person.total) * 100}%`}}
                          >
                            {klanMentions > 0 && <span>{klanMentions}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="bias-source-row">
                        <span className="source-label">{sourceMapping['tch']}</span>
                        <div className="bias-bar">
                          <div
                            className="bias-fill tch"
                            style={{width: `${(tchMentions / person.total) * 100}%`}}
                          >
                            {tchMentions > 0 && <span>{tchMentions}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bias-meta">
                      <span>Total: {person.total} mentions</span>
                      <span className={isKlanFocused ? 'klan-focus' : 'tch-focus'}>
                        {isKlanFocused ? 'KLAN-focused' : 'TCH-focused'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bias-section">
            <h3>⚖️ Balanced Coverage</h3>
            <p className="section-desc">People mentioned fairly equally across sources</p>
            <div className="balanced-table">
              <div className="table-header">
                <div className="col-name">Person Name</div>
                <div className="col-klan">{sourceMapping['klan']}</div>
                <div className="col-tch">{sourceMapping['tch']}</div>
                <div className="col-total">Total</div>
                <div className="col-balance">Balance</div>
              </div>
              {balancedPeople.map((person, idx) => {
                const klanMentions = person[sourceMapping['klan']] || 0
                const tchMentions = person[sourceMapping['tch']] || 0
                const minMentions = Math.min(klanMentions, tchMentions)
                const maxMentions = Math.max(klanMentions, tchMentions)
                const ratio = minMentions > 0 ? (maxMentions / minMentions) : 1

                return (
                  <div key={idx} className="table-row">
                    <div className="col-name">{person.name}</div>
                    <div className="col-klan">{klanMentions}</div>
                    <div className="col-tch">{tchMentions}</div>
                    <div className="col-total">{person.total}</div>
                    <div className="col-balance">
                      <span className="balance-badge">{ratio.toFixed(1)}x</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {biasView === 'coverage' && (
        <div className="coverage-analysis">
          <h3>📊 Source Coverage Comparison</h3>
          <p className="section-desc">How different sources focus on different people</p>
          <div className="source-comparison">
            {sources.map((source, sourceIdx) => {
              const sourcePersonData = filteredData
                .filter(d => d.source === source)
                .sort((a, b) => b.total_mentions - a.total_mentions)
                .slice(0, 8)

              return (
                <div key={source} className="source-card">
                  <h4>{source.toUpperCase()}</h4>
                  <div className="source-people-list">
                    {sourcePersonData.map((item, idx) => (
                      <div key={idx} className="person-item">
                        <span className="rank">#{idx + 1}</span>
                        <span className="name">{item.name}</span>
                        <span className="mentions">{item.total_mentions}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {biasView === 'coverage' && (
        <div className="table-container">
          <h3>📋 Detailed Results ({filteredData.length} records)</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Person Name</th>
                  <th>News Source</th>
                  <th>Total Mentions</th>
                  <th>Popularity %</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, idx) => {
                  const totalMentions = filteredData.reduce((sum, d) => sum + d.total_mentions, 0)
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'even' : ''}>
                      <td className="name-cell">{item.name}</td>
                      <td className="source-cell">{item.source}</td>
                      <td className="mentions-cell">
                        <span className="badge">{item.total_mentions}</span>
                      </td>
                      <td className="percent-cell">
                        {((item.total_mentions / totalMentions) * 100).toFixed(2)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ← Previous
            </button>
            <div className="pagination-info">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Data source: Kedro Pipeline - Popularity Metrics</p>
      </footer>
    </div>
  )
}

export default App


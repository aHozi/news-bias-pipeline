import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import {
  CalendarDays,
  Flag,
  Moon,
  Radio,
  Search,
  Sun,
} from 'lucide-react'
import './App.css'

const SOURCES = [
  { id: 'tch', name: 'Top Channel' },
  { id: 'klan', name: 'TV Klan' },
  { id: 'reporttv', name: 'Report TV' },
  { id: 'news24', name: 'News 24 / BalkanWeb' },
  { id: 'euronews', name: 'Euronews Albania' },
  { id: 'abc', name: 'ABC News Albania' },
  { id: 'vizionplus', name: 'Vizion Plus' },
  { id: 'rtsh', name: 'RTSH' },
]

const PARTIES = [
  { id: 'PS', name: 'Partia Socialiste', short: 'PS', color: '#ec4899' }, // Pink
  { id: 'PD', name: 'Partia Demokratike', short: 'PD', color: '#3b82f6' }, // Blue
  { id: 'PL', name: 'Partia e Lirisë', short: 'PL', color: '#ef4444' }, // Red
  { id: 'MUNDESIA', name: 'Partia Mundësia', short: 'Mundësia', color: '#d99138' },
]

function parseCSV(text) {
  const rows = []
  let row = []
  let value = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(value)
      value = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1
      row.push(value)
      rows.push(row)
      row = []
      value = ''
    } else {
      value += char
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value)
    rows.push(row)
  }

  const [headers = [], ...dataRows] = rows.filter((item) => item.some((cell) => cell !== ''))
  return dataRows.map((dataRow) =>
    headers.reduce((record, header, index) => {
      record[header] = dataRow[index] ?? ''
      return record
    }, {})
  )
}

async function fetchCSV(path) {
  const response = await fetch(path)
  if (!response.ok) return []
  return parseCSV(await response.text())
}

function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toneLabel(value) {
  const label = String(value || 'Neutral').trim()
  return ['Positive', 'Neutral', 'Negative'].includes(label) ? label : 'Neutral'
}

function partyConfig(id) {
  return PARTIES.find((party) => party.id === id) || PARTIES[0]
}

function sourceName(id) {
  return SOURCES.find((source) => source.id === id)?.name || id
}

function isTrue(value) {
  return String(value).toLowerCase() === 'true'
}

function aggregateMentionRows(rows) {
  const groupedRows = {}

  rows.forEach((row) => {
    if (!PARTIES.find((party) => party.id === row.party)) return

    const key = `${row.source}-${row.published_date || 'unknown'}-${row.party}`
    if (!groupedRows[key]) {
      groupedRows[key] = {
        source: row.source,
        published_date: row.published_date || 'unknown',
        party: row.party,
        mentions: 0,
        articles: new Set(),
        title_mentions: 0,
        positive_mentions: 0,
        neutral_mentions: 0,
        negative_mentions: 0,
        sentimentSum: 0,
        sentimentWeight: 0,
      }
    }

    const group = groupedRows[key]
    const weight = Math.max(numberValue(row.mention_weight), 1)
    const sentiment = numberValue(row.sentiment_score)
    group.mentions += 1
    group.articles.add(row.article_id || row.url || row.title)
    group.title_mentions += isTrue(row.appeared_in_title) ? 1 : 0
    group.positive_mentions += row.sentiment_label === 'Positive' ? 1 : 0
    group.neutral_mentions += row.sentiment_label === 'Neutral' ? 1 : 0
    group.negative_mentions += row.sentiment_label === 'Negative' ? 1 : 0
    group.sentimentSum += sentiment * weight
    group.sentimentWeight += weight
  })

  return Object.values(groupedRows).map((row) => {
    const avgSentiment = row.sentimentWeight ? row.sentimentSum / row.sentimentWeight : 0
    return {
      ...row,
      articles: row.articles.size,
      avg_sentiment_score: avgSentiment,
      favorability_score: Math.round(((avgSentiment + 1) / 2) * 100),
    }
  })
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [selectedRange, setSelectedRange] = useState('14d')
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedParty, setSelectedParty] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceData, setSourceData] = useState([])
  const [entityData, setEntityData] = useState([])
  const [mentionsData, setMentionsData] = useState([])

  useEffect(() => {
    Promise.all([
      fetchCSV('party_source_metrics.csv'),
      fetchCSV('political_entity_metrics.csv'),
      fetchCSV('political_mentions.csv'),
    ]).then(([sources, entities, mentions]) => {
      setSourceData(sources)
      setEntityData(entities)
      setMentionsData(mentions)
    })
  }, [])

  const query = searchTerm.trim().toLowerCase()
  const visibleParties = selectedParty === 'all' ? PARTIES : PARTIES.filter((party) => party.id === selectedParty)

  const selectedMentionRows = useMemo(
    () =>
      mentionsData.filter((row) => {
        const sourceMatches = selectedSource === 'all' || row.source === selectedSource
        const partyMatches = selectedParty === 'all' || row.party === selectedParty
        const searchMatches =
          !query ||
          `${row.title} ${row.canonical_name} ${sourceName(row.source)} ${row.context_sentence}`
            .toLowerCase()
            .includes(query)
        return sourceMatches && partyMatches && searchMatches
      }),
    [mentionsData, selectedSource, selectedParty, query]
  )

  const selectedMetricRows = useMemo(
    () => sourceData.filter((row) => selectedSource === 'all' || row.source === selectedSource),
    [sourceData, selectedSource]
  )

  const selectedSourceRows = useMemo(
    () => (query ? aggregateMentionRows(selectedMentionRows) : selectedMetricRows),
    [query, selectedMentionRows, selectedMetricRows]
  )

  const selectedEntityRows = useMemo(
    () => entityData.filter((row) => selectedSource === 'all' || row.source === selectedSource),
    [entityData, selectedSource]
  )

  const sourceCoverage = useMemo(() => {
    const coverageMap = {}
    selectedSourceRows.forEach((row) => {
      if (!coverageMap[row.source]) {
        coverageMap[row.source] = { source: row.source, articles: 0, sentiment: {}, sentimentWeight: {} }
        PARTIES.forEach(p => { 
          coverageMap[row.source][p.id] = 0
          coverageMap[row.source].sentiment[p.id] = 50
          coverageMap[row.source].sentimentWeight[p.id] = 0
        })
      }
      if (PARTIES.find(p => p.id === row.party)) {
        const mentions = numberValue(row.mentions)
        coverageMap[row.source][row.party] += mentions
        coverageMap[row.source].articles += numberValue(row.articles)
        if (row.favorability_score !== undefined && row.favorability_score !== '') {
          const previousWeight = coverageMap[row.source].sentimentWeight[row.party]
          const nextWeight = previousWeight + Math.max(mentions, 1)
          coverageMap[row.source].sentiment[row.party] = Math.round(
            ((coverageMap[row.source].sentiment[row.party] * previousWeight)
              + (numberValue(row.favorability_score) * Math.max(mentions, 1))) / nextWeight
          )
          coverageMap[row.source].sentimentWeight[row.party] = nextWeight
        }
      }
    })
    return Object.values(coverageMap)
  }, [selectedSourceRows])

  const partyTotals = useMemo(
    () =>
      PARTIES.map((party) => ({
        ...party,
        mentions: sourceCoverage.reduce((sum, row) => sum + row[party.id], 0),
      })),
    [sourceCoverage]
  )

  const totalArticles = sourceCoverage.reduce((sum, row) => sum + row.articles, 0)
  const totalMentions = partyTotals.reduce((sum, party) => sum + party.mentions, 0)
  const topParty = [...partyTotals].sort((a, b) => b.mentions - a.mentions)[0]

  const politiciansData = useMemo(() => {
    const pMap = {}
    const rows = query ? selectedMentionRows : selectedEntityRows
    rows.forEach(row => {
      if (row.entity_type === 'PERSON') {
        const key = `${row.canonical_name}-${row.party}`
        if (!pMap[key]) {
          pMap[key] = { name: row.canonical_name, party: row.party, mentions: 0 }
        }
        pMap[key].mentions += query ? 1 : numberValue(row.mentions)
      }
    })
    return Object.values(pMap).sort((a, b) => b.mentions - a.mentions)
  }, [query, selectedEntityRows, selectedMentionRows])

  const filteredPoliticians = politiciansData.filter((person) => {
    const partyMatches = selectedParty === 'all' || person.party === selectedParty
    const searchMatches = !query || person.name.toLowerCase().includes(query)
    return partyMatches && searchMatches
  })
  const topPolitician = filteredPoliticians[0] || { name: 'None', party: 'PS' }
  const favorability = Math.round(
    sourceCoverage.reduce((sum, source) => {
      const partyScores = visibleParties.map((party) => source.sentiment[party.id])
      return sum + partyScores.reduce((a, b) => a + b, 0) / partyScores.length
    }, 0) / Math.max(sourceCoverage.length, 1)
  )

  const chartRows = sourceCoverage.map((row) => ({
    ...row,
    sourceName: sourceName(row.source),
  }))

  const timelineData = useMemo(() => {
    const datesMap = {}
    selectedSourceRows.forEach((row) => {
      const dateLabel = row.published_date && row.published_date !== 'unknown' ? row.published_date : 'Undated'
      if (!datesMap[dateLabel]) {
        datesMap[dateLabel] = { date: dateLabel }
        PARTIES.forEach(p => { 
          datesMap[dateLabel][p.id] = 0 
          datesMap[dateLabel][`${p.id}_favorability`] = 50
          datesMap[dateLabel][`${p.id}_favorabilityWeight`] = 0
        })
      }
      if (PARTIES.find(p => p.id === row.party)) {
        const mentions = numberValue(row.mentions)
        datesMap[dateLabel][row.party] += mentions
        if (row.favorability_score !== undefined && row.favorability_score !== '') {
          const scoreKey = `${row.party}_favorability`
          const weightKey = `${row.party}_favorabilityWeight`
          const previousWeight = datesMap[dateLabel][weightKey]
          const nextWeight = previousWeight + Math.max(mentions, 1)
          datesMap[dateLabel][scoreKey] = Math.round(
            ((datesMap[dateLabel][scoreKey] * previousWeight)
              + (numberValue(row.favorability_score) * Math.max(mentions, 1))) / nextWeight
          )
          datesMap[dateLabel][weightKey] = nextWeight
        }
      }
    })
    return Object.values(datesMap).sort((a, b) => {
      if (a.date === 'Undated') return 1
      if (b.date === 'Undated') return -1
      return a.date.localeCompare(b.date)
    })
  }, [selectedSourceRows])

  let timeSliced = timelineData
  if (selectedRange === '7d') timeSliced = timelineData.slice(-7)
  else if (selectedRange === '14d') timeSliced = timelineData.slice(-14)
  else if (selectedRange === '30d') timeSliced = timelineData.slice(-30)

  const filteredTimeline = timeSliced.map((row) => {
    const next = { date: row.date }
    visibleParties.forEach((party) => {
      next[party.id] = row[party.id]
    })
    next.PS_favorability = row.PS_favorability
    next.PD_favorability = row.PD_favorability
    next.PL_favorability = row.PL_favorability
    next.MUNDESIA_favorability = row.MUNDESIA_favorability
    return next
  })

  const titleBodyRows = useMemo(() => {
    const tMap = {}
    PARTIES.forEach(p => tMap[p.id] = { party: p.id, title: 0, body: 0, partyName: p.short })
    
    selectedSourceRows.forEach(row => {
      if (tMap[row.party]) {
        const titleM = numberValue(row.title_mentions)
        const totalM = numberValue(row.mentions)
        tMap[row.party].title += titleM
        tMap[row.party].body += (totalM - titleM)
      }
    })
    return Object.values(tMap).filter((row) => selectedParty === 'all' || row.party === selectedParty)
  }, [selectedSourceRows, selectedParty])

  const recentMentionsData = useMemo(() => {
    return selectedMentionRows
      .map(row => ({
        headline: row.title,
        source: sourceName(row.source),
        party: row.party,
        politician: row.canonical_name,
        tone: toneLabel(row.sentiment_label),
        date: row.published_date,
        rawSource: row.source
      }))
      .sort((a, b) => {
        if (a.date !== b.date) return b.date ? b.date.localeCompare(a.date) : 0
        return a.headline.localeCompare(b.headline)
      })
      .slice(0, 50)
  }, [selectedMentionRows])

  const recentRows = recentMentionsData.filter((row) => {
    const searchMatches = !query || `${row.headline} ${row.politician} ${row.source}`.toLowerCase().includes(query)
    return searchMatches
  })

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="monitor-shell">
        <main className="main-content">
          <header className="top-header">
            <div>
              <p className="eyebrow">Live monitoring workspace</p>
              <h1>Political News Bias Monitor</h1>
              <p>Real-time analysis of political media coverage in Albania</p>
            </div>
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setIsDarkMode((current) => !current)}
              title={isDarkMode ? 'Use light mode' : 'Use dark mode'}
              aria-label={isDarkMode ? 'Use light mode' : 'Use dark mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
          </header>

            <section className="filters">
              <label>
                <CalendarDays size={17} />
                <select value={selectedRange} onChange={(event) => setSelectedRange(event.target.value)}>
                  <option value="7d">Last 7 days</option>
                  <option value="14d">Last 14 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </label>
              <label>
                <Radio size={17} />
                <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value)}>
                  <option value="all">All sources</option>
                  {SOURCES.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <Flag size={17} />
                <select value={selectedParty} onChange={(event) => setSelectedParty(event.target.value)}>
                  <option value="all">All parties</option>
                  {PARTIES.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="search-filter">
                <Search size={17} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search politicians, sources, headlines"
                />
              </label>
            </section>

            <section className="kpi-grid">
              <div className="kpi-card">
                <span>Total Articles</span>
                <strong>{totalArticles.toLocaleString()}</strong>
                <small>Across {sourceCoverage.length} monitored sources</small>
              </div>
              <div className="kpi-card">
                <span>Total Mentions</span>
                <strong>{totalMentions.toLocaleString()}</strong>
                <small>Party and politician references</small>
              </div>
              <div className="kpi-card">
                <span>Most Mentioned Party</span>
                <strong>{topParty.short}</strong>
                <small>{topParty.mentions.toLocaleString()} mentions</small>
              </div>
              <div className="kpi-card">
                <span>Most Mentioned Politician</span>
                <strong>{topPolitician.name}</strong>
                <small>{partyConfig(topPolitician.party).name}</small>
              </div>
              <div className="kpi-card accent">
                <span>Favorability Score</span>
                <strong>{favorability}%</strong>
                <small>Positive and neutral tone blend</small>
              </div>
            </section>

            <section className="chart-grid">
              <div className="panel wide">
                <div className="panel-heading">
                  <h2>Mentions Over Time</h2>
                  <span>{selectedRange === '14d' ? '14-day trend' : 'Selected range'}</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={filteredTimeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {visibleParties.map((party) => (
                      <Line
                        key={party.id}
                        type="monotone"
                        dataKey={party.id}
                        stroke={party.color}
                        strokeWidth={3}
                        dot={filteredTimeline.length <= 1}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="panel wide">
                <div className="panel-heading">
                  <h2>Party Mentions by Source</h2>
                  <span>Grouped comparison</span>
                </div>
                <ResponsiveContainer width="100%" height={330}>
                  <BarChart data={chartRows}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="sourceName" angle={-22} textAnchor="end" height={78} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {visibleParties.map((party) => (
                      <Bar key={party.id} dataKey={party.id} fill={party.color} radius={[6, 6, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <h2>Coverage Share by Party</h2>
                  <span>All monitored sources</span>
                </div>
                <div className="donut-wrap">
                  <ResponsiveContainer width="58%" height={260}>
                    <PieChart>
                      <Pie data={partyTotals} dataKey="mentions" innerRadius={68} outerRadius={104} paddingAngle={4}>
                        {partyTotals.map((party) => (
                          <Cell key={party.id} fill={party.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="legend-list">
                    {partyTotals.map((party) => (
                      <div key={party.id}>
                        <span style={{ background: party.color }} />
                        <strong>{party.name}</strong>
                        <small>{party.mentions.toLocaleString()} mentions</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <h2>Most Mentioned Politicians</h2>
                  <span>Tracked public figures</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={filteredPoliticians.slice(0, 7)} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={110} />
                    <Tooltip />
                    <Bar dataKey="mentions" radius={[0, 8, 8, 0]}>
                      {filteredPoliticians.slice(0, 7).map((person) => (
                        <Cell key={person.name} fill={partyConfig(person.party).color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <h2>Title Mentions vs Body Mentions</h2>
                  <span>Headline and article body split</span>
                </div>
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={titleBodyRows} layout="vertical" margin={{ left: 18 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="partyName" type="category" width={74} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="title" stackId="mentions" name="Title" fill="#4f46e5" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="body" stackId="mentions" name="Body" fill="#7dd3fc" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="panel">
                <div className="panel-heading">
                  <h2>Sentiment Trend by Party</h2>
                  <span>Favorability index</span>
                </div>
                <ResponsiveContainer width="100%" height={270}>
                  <LineChart data={filteredTimeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis domain={[30, 70]} />
                    <Tooltip />
                    <Legend />
                    {visibleParties.map((party) => (
                      <Line
                        key={party.id}
                        type="monotone"
                        dataKey={`${party.id}_favorability`}
                        name={party.short}
                        stroke={party.color}
                        strokeWidth={3}
                        dot={filteredTimeline.length <= 1}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="lower-grid">
              <div className="panel">
                <div className="panel-heading">
                  <h2>Source Favorability Snapshot</h2>
                  <span>Positive + neutral tone</span>
                </div>
                <div className="heatmap">
                  <div className="heatmap-header">
                    <span>Source</span>
                    {PARTIES.map((party) => (
                      <span key={party.id}>{party.short}</span>
                    ))}
                  </div>
                  {chartRows.slice(0, 8).map((source) => (
                    <div className="heatmap-row" key={source.source}>
                      <strong>{source.sourceName}</strong>
                      {PARTIES.map((party) => {
                        const score = source.sentiment[party.id]
                        return (
                          <span key={party.id} style={{ '--heat': `${score}%` }}>
                            {score}%
                          </span>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel recent-panel">
                <div className="panel-heading">
                  <h2>Recent Political Mentions</h2>
                  <span>Article-level signals</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Headline</th>
                        <th>Source</th>
                        <th>Party</th>
                        <th>Politician</th>
                        <th>Tone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRows.map((row) => (
                        <tr key={`${row.source}-${row.headline}`}>
                          <td>{row.headline}</td>
                          <td>{row.source}</td>
                          <td>
                            <span className="party-pill" style={{ background: partyConfig(row.party).color }}>
                              {partyConfig(row.party).short}
                            </span>
                          </td>
                          <td>{row.politician}</td>
                          <td>
                            <span className={`tone ${row.tone.toLowerCase()}`}>{row.tone}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </main>
      </div>
    </div>
  )
}

export default App

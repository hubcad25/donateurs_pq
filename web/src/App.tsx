import { useState, useMemo } from 'react'
import { DataDashboard } from './components/DataDashboard'
import InteractiveMap from './components/InteractiveMap'

function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'data'>('map')
  const [metric, setMetric] = useState<string>('Somme')
  const [selectedYears, setSelectedYears] = useState<number[]>([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026])

  const availableYears = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]

  const toggleYear = (year: number) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year))
    } else {
      setSelectedYears([...selectedYears, year].sort())
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-blue-900 text-white p-4 shadow-md flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold m-0 text-white">Analyse des Donateurs du PQ</h1>
          <p className="text-blue-100 text-sm">Identification des potentiels socio-démographiques par RTA</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6 bg-blue-800/50 p-2 rounded-lg border border-blue-700">
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-blue-200 uppercase tracking-wider">Métrique:</label>
            <select 
              value={metric} 
              onChange={(e) => setMetric(e.target.value)}
              className="bg-blue-900 text-white border border-blue-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="Intensity">Intensité ($ / 100 pers)</option>
              <option value="Somme">Somme des dons</option>
              <option value="Nombre de donateurs">Nombre de donateurs</option>
              <option value="median_income_hh">Revenu médian</option>
              <option value="pct_income_100k_plus">% Revenu 100k+</option>
              <option value="pct_owners">% Propriétaires</option>
              <option value="pct_edu_university">% Universitaires</option>
              <option value="pct_french">% Langue française</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-blue-200 uppercase tracking-wider ml-1">Années financières:</label>
            <div className="flex gap-1">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                    selectedYears.includes(year)
                      ? 'bg-blue-500 text-white shadow-inner'
                      : 'bg-blue-900/50 text-blue-300 hover:bg-blue-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b flex px-4">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'map' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'
          }`}
        >
          Carte Interactive
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'data' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-600'
          }`}
        >
          Tableau de Données
        </button>
      </nav>

      <main className="flex-1 overflow-auto">
        {activeTab === 'map' && (
          <div className="h-[calc(100vh-140px)] w-full relative">
            <InteractiveMap metric={metric} selectedYears={selectedYears} />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="container mx-auto py-6">
            <DataDashboard selectedYears={selectedYears} />
          </div>
        )}
      </main>

      <footer className="bg-white border-t p-2 text-center text-[10px] text-gray-400">
        &copy; 2026 Donateurs PQ - Données Élections Québec & Recensement 2021
      </footer>
    </div>
  )
}

export default App

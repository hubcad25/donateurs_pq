import { useState } from 'react'
import { DataDashboard } from './components/DataDashboard'
import InteractiveMap from './components/InteractiveMap'

function App() {
  const [activeTab, setActiveTab] = useState<'map' | 'data'>('map')
  const [metric, setMetric] = useState<string>('Somme')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold m-0 text-white">Analyse des Donateurs du PQ</h1>
          <p className="text-blue-100 text-sm">Identification des potentiels socio-démographiques par RTA</p>
        </div>
        {activeTab === 'map' && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Métrique:</label>
            <select 
              value={metric} 
              onChange={(e) => setMetric(e.target.value)}
              className="bg-blue-800 text-white border border-blue-700 rounded px-2 py-1 text-sm"
            >
              <option value="Somme">Somme des dons</option>
              <option value="Nombre de donateurs">Nombre de donateurs</option>
              <option value="Moyenne">Don moyen</option>
              <option value="median_income_hh">Revenu médian</option>
              <option value="pct_income_100k_plus">% Revenu 100k+</option>
              <option value="pct_owners">% Propriétaires</option>
              <option value="pct_edu_university">% Universitaires</option>
              <option value="pct_french">% Langue française</option>
            </select>
          </div>
        )}
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
            <InteractiveMap metric={metric} />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="container mx-auto py-6">
            <DataDashboard />
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


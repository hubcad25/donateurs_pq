import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleLinear } from 'd3-scale';
import { quantile } from 'd3-array';
import * as topojson from 'topojson-client';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
import 'leaflet/dist/leaflet.css';

interface MapProps {
  metric?: string;
}

const InteractiveMap: React.FC<MapProps> = ({ metric = "Somme" }) => {
  const [data, setData] = useState<FeatureCollection<Geometry, GeoJsonProperties> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mask, setMask] = useState<any>(null);

  useEffect(() => {
    fetch('/data/map_data.topojson')
      .then(res => res.json())
      .then(topojsonData => {
        const objectKey = topojsonData.objects.map_data ? 'map_data' : Object.keys(topojsonData.objects)[0];
        const geojson = topojson.feature(topojsonData, topojsonData.objects[objectKey]) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
        setData(geojson);

        // Créer un masque pour cacher le reste du monde
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outline = topojson.merge(topojsonData, topojsonData.objects[objectKey].geometries) as any;
        
        // On construit les anneaux pour le trou (Québec)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let holes: any[] = [];
        if (outline.type === "Polygon") {
          holes = outline.coordinates;
        } else if (outline.type === "MultiPolygon") {
          // Pour un MultiPolygon, on prend le premier anneau de chaque polygone (l'extérieur)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          holes = outline.coordinates.map((poly: any) => poly[0]);
        }

        const worldMask = {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-180, -90],
                [180, -90],
                [180, 90],
                [-180, 90],
                [-180, -90]
              ],
              ...holes
            ]
          }
        };
        setMask(worldMask);
      });
  }, []);

  const bounds = useMemo(() => {
    if (!data) return null;
    return L.geoJSON(data).getBounds();
  }, [data]);

  const colorScale = useMemo(() => {
    if (!data) return null;
    const values = data.features
      .map((f) => {
        // Handle special case for 'Intensité' if needed, but for now we assume it's in properties
        // If not in properties, we calculate it on the fly for the map too
        if (metric === "Intensity") {
          const { Somme, age_total } = f.properties || {};
          return age_total > 0 ? (Somme / age_total) * 100 : 0;
        }
        return f.properties?.[metric];
      })
      .filter((v) => v !== undefined && v !== null && v > 0) as number[];
    
    if (values.length === 0) return () => "#EEE";

    // User wants: 0 (Red), 50 (Yellow), 75 (Green), 90 (Blue)
    // We interpret these as percentiles for better visualization across different metrics
    const sortedValues = [...values].sort((a, b) => a - b);
    const p0 = sortedValues[0];
    const p50 = quantile(sortedValues, 0.5) || 0;
    const p75 = quantile(sortedValues, 0.75) || 0;
    const p90 = quantile(sortedValues, 0.90) || 0;

    return scaleLinear<string>()
      .domain([p0, p50, p75, p90])
      .range(["#ef4444", "#facc15", "#22c55e", "#2563eb"]); // Rouge, Jaune, Vert, Bleu
  }, [data, metric]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style = (feature: any) => {
    let value = feature.properties[metric];
    if (metric === "Intensity") {
      const { Somme, age_total } = feature.properties;
      value = age_total > 0 ? (Somme / age_total) * 100 : 0;
    }
    
    return {
      fillColor: value ? colorScale?.(value) : "#EEE",
      weight: 0.2, // Très fin
      opacity: 0.5,
      color: 'white',
      fillOpacity: 0.6, // Un peu plus opaque pour compenser le fond blanc
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e) => {
        const l = e.target;
        l.setStyle({
          weight: 2,
          color: '#fbbf24', // Orange/Amber subtil
          fillOpacity: 0.6,
        });
        l.bringToFront();
      },
      mouseout: (e) => {
        const l = e.target;
        l.setStyle(style(feature));
      },
    });

    const { 
      CFSAUID, median_income_hh, Somme, [metric]: val,
      age_total, pct_age_15_24, pct_age_65_74, pct_age_75_plus,
      pct_edu_university, pct_owners, pct_french
    } = feature.properties;
    
    const pct_65_plus = (pct_age_65_74 || 0) + (pct_age_75_plus || 0);
    const intensity = age_total > 0 ? (Somme / age_total) * 100 : 0;

    const displayVal = metric === "Intensity" ? intensity : val;

    const popupContent = `
      <div class="p-2 min-w-[220px]">
        <h3 class="font-bold text-lg border-b mb-2 text-slate-800">RTA: ${CFSAUID}</h3>
        <div class="space-y-1 text-sm">
          <p class="flex justify-between text-blue-600 font-bold text-base">
            <strong>Somme des dons:</strong> 
            <span>${Somme?.toLocaleString() || '0'}$</span>
          </p>
          <p class="flex justify-between text-slate-700 pb-1 border-b">
            <strong>Intensité:</strong> 
            <span class="font-semibold">${intensity.toFixed(2)}$ / 100 pers.</span>
          </p>
          <p class="flex justify-between pt-1"><strong>${metric}:</strong> <span>${displayVal?.toLocaleString() || '0'}${metric.includes('Somme') || metric.includes('income') || metric === 'Intensity' ? '$' : ''}</span></p>
          <div class="border-t my-1"></div>
          <p class="flex justify-between"><strong>Population:</strong> <span>${age_total?.toLocaleString() || 'N/A'}</span></p>
          <p class="flex justify-between"><strong>Revenu Médian:</strong> <span>${median_income_hh?.toLocaleString() || '0'}$</span></p>
          <p class="flex justify-between"><strong>Propriétaires:</strong> <span>${pct_owners?.toFixed(1) || '0'}%</span></p>
          <p class="flex justify-between"><strong>Français (Mère):</strong> <span>${pct_french?.toFixed(1) || '0'}%</span></p>
          <p class="flex justify-between"><strong>Univ. (Bac+):</strong> <span>${pct_edu_university?.toFixed(1) || '0'}%</span></p>
          <div class="border-t my-1"></div>
          <p class="flex justify-between text-xs text-slate-500"><strong>15-24 ans:</strong> <span>${pct_age_15_24?.toFixed(1) || '0'}%</span></p>
          <p class="flex justify-between text-xs text-slate-500"><strong>65 ans+:</strong> <span>${pct_65_plus?.toFixed(1) || '0'}%</span></p>
        </div>
      </div>
    `;
    layer.bindPopup(popupContent);
  };

  if (!data) return <div className="flex items-center justify-center h-full">Chargement de la carte...</div>;

  return (
    <div className="w-full h-full relative bg-slate-100">
      <MapContainer 
        center={[46.0, -73]} // Un peu plus bas/ouest pour viser MTL-QC
        zoom={8} 
        minZoom={7}
        maxBounds={bounds || undefined}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true}
        className="w-full h-full bg-white"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {mask && (
          <GeoJSON 
            data={mask} 
            style={{
              fillColor: "#f8fafc",
              fillOpacity: 1,
              color: "none",
              weight: 0,
              fillRule: "evenodd" // Crucial pour le trou
            }}
            interactive={false}
          />
        )}
        <GeoJSON 
          data={data} 
          style={style} 
          onEachFeature={onEachFeature}
        />
      </MapContainer>

      {/* Légende flottante simplifiée */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-2xl border border-slate-200">
        <h4 className="text-sm font-bold mb-3 text-slate-800 uppercase tracking-wider">Légende: {metric}</h4>
        <div className="flex flex-col gap-2">
          <div className="flex h-3 w-48 rounded-full overflow-hidden border border-slate-200">
             <div className="flex-1" style={{ background: 'linear-gradient(to right, #ef4444, #facc15, #22c55e, #2563eb)' }}></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-medium px-1">
            <span>Min</span>
            <span>50%</span>
            <span>75%</span>
            <span>90%</span>
            <span>Max</span>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-slate-400 leading-tight">
          Échelle basée sur les centiles (0, 50, 75, 90).<br/>
          Couleurs: <span className="text-red-500">R</span>-<span className="text-yellow-500">J</span>-<span className="text-green-500">V</span>-<span className="text-blue-500">B</span>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;

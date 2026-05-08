import React, { useEffect, useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleQuantile } from 'd3-scale';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';

interface MapProps {
  metric?: string;
}

const InteractiveMap: React.FC<MapProps> = ({ metric = "Somme" }) => {
  const [data, setData] = useState<FeatureCollection<Geometry, GeoJsonProperties> | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>("");
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/data/map_data.topojson')
      .then(res => res.json())
      .then(topojsonData => {
        const objectKey = topojsonData.objects.map_data ? 'map_data' : Object.keys(topojsonData.objects)[0];
        const geojson = feature(topojsonData, topojsonData.objects[objectKey]) as unknown as FeatureCollection<Geometry, GeoJsonProperties>;
        setData(geojson);
      });
  }, []);

  const colorScale = useMemo(() => {
    if (!data) return null;
    const values = data.features
      .map((f) => f.properties?.[metric])
      .filter((v) => v !== undefined && v !== null) as number[];
    
    if (values.length === 0) return () => "#EEE";

    return scaleQuantile<string>()
      .domain(values)
      .range([
        "#f7fbff",
        "#deebf7",
        "#c6dbef",
        "#9ecae1",
        "#6baed6",
        "#4292c6",
        "#2171b5",
        "#08519c",
        "#08306b"
      ]);
  }, [data, metric]);

  if (!data) return <div className="flex items-center justify-center h-full">Loading map...</div>;

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden text-slate-900">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1200,
          center: [-72, 47] // Center roughly on Quebec
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup>
          <Geographies geography={data}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo) => {
                const value = geo.properties[metric];
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      const { CFSAUID, median_income_hh, Moyenne } = geo.properties;
                      setTooltipContent(
                        `<strong>RTA:</strong> ${CFSAUID}<br/>` +
                        `<strong>${metric}:</strong> ${value?.toLocaleString() || 'N/A'}<br/>` +
                        `<strong>Revenu médian:</strong> ${median_income_hh?.toLocaleString() || 'N/A'}$<br/>` +
                        `<strong>Don moyen:</strong> ${Moyenne?.toFixed(2) || 'N/A'}$`
                      );
                    }}
                    onMouseMove={(e: any) => {
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => {
                      setTooltipContent("");
                    }}
                    style={{
                      default: {
                        fill: value ? colorScale?.(value) : "#EEE",
                        stroke: "#FFF",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      hover: {
                        fill: "#F53",
                        stroke: "#FFF",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                      pressed: {
                        fill: "#E42",
                        stroke: "#FFF",
                        strokeWidth: 0.5,
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltipContent && (
        <div
          className="absolute z-50 pointer-events-none bg-white p-2 rounded shadow-lg border border-gray-200 text-sm text-gray-800"
          style={{
            left: tooltipPos.x + 10,
            top: tooltipPos.y + 10,
          }}
          dangerouslySetInnerHTML={{ __html: tooltipContent }}
        />
      )}

      <div className="absolute bottom-4 right-4 bg-white p-3 rounded shadow-md border border-gray-200 pointer-events-none">
        <h4 className="text-xs font-bold mb-2 uppercase text-gray-500">Légende: {metric}</h4>
        <div className="flex flex-col gap-1">
          {[...Array(5)].map((_, i) => {
             const colors = ["#deebf7", "#9ecae1", "#4292c6", "#08519c", "#08306b"];
             return (
               <div key={i} className="flex items-center gap-2">
                 <div className="w-4 h-4" style={{ backgroundColor: colors[i] }}></div>
                 <span className="text-xs text-gray-600">
                   {i === 0 ? "Bas" : i === 4 ? "Élevé" : ""}
                 </span>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;

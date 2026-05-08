import React, { useEffect, useState, useMemo } from 'react';
import type { SortingState } from '@tanstack/react-table';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as topojson from 'topojson-client';

interface RTAData {
  CFSAUID: string;
  Somme: number;
  'Nombre de donateurs': number;
  median_income_hh: number;
  pct_income_100k_plus: number;
  pct_french: number;
  pct_owners: number;
  age_total: number;
  intensity?: number;
  donations_yearly?: Record<string, { Somme: number, 'Nombre de donateurs': number }>;
}

const columnHelper = createColumnHelper<RTAData>();

const columns = [
  columnHelper.accessor('CFSAUID', {
    header: 'RTA',
    cell: info => <span className="font-mono font-bold">{String(info.getValue())}</span>,
  }),
  columnHelper.accessor('intensity', {
    header: 'Intensité ($/100p)',
    cell: info => (info.getValue() as number)?.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  }),
  columnHelper.accessor('Somme', {
    header: 'Somme ($)',
    cell: info => (info.getValue() as number)?.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' }),
  }),
  columnHelper.accessor('Nombre de donateurs', {
    header: 'Donateurs',
    cell: info => (info.getValue() as number)?.toLocaleString('fr-CA'),
  }),
  columnHelper.accessor('median_income_hh', {
    header: 'Revenu Médian',
    cell: info => (info.getValue() as number)?.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' }),
  }),
  columnHelper.accessor('pct_income_100k_plus', {
    header: '% 100k+',
    cell: info => {
      const val = info.getValue() as number;
      return val ? `${val.toFixed(1)}%` : '-';
    },
  }),
  columnHelper.accessor('pct_french', {
    header: '% Français',
    cell: info => {
      const val = info.getValue() as number;
      return val ? `${val.toFixed(1)}%` : '-';
    },
  }),
  columnHelper.accessor('pct_owners', {
    header: '% Proprio',
    cell: info => {
      const val = info.getValue() as number;
      return val ? `${val.toFixed(1)}%` : '-';
    },
  }),
];

interface DashboardProps {
  selectedYears?: number[];
}

export const DataDashboard: React.FC<DashboardProps> = ({ selectedYears = [] }) => {
  const [rawData, setRawData] = useState<RTAData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/map_data.topojson');
        const topology = await response.json();
        const objectKey = topology.objects.map_data ? 'map_data' : Object.keys(topology.objects)[0];
        const rtaObjects = topology.objects[objectKey];
        const geojson = topojson.feature(topology, rtaObjects) as any;
        const properties = geojson.features.map((f: any) => f.properties);
        setRawData(properties);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const data = useMemo(() => {
    return rawData.map(props => {
      let currentSomme = 0;
      let currentCount = 0;
      
      if (props.donations_yearly) {
        selectedYears.forEach(year => {
          const yearStr = year.toString();
          if (props.donations_yearly![yearStr]) {
            currentSomme += props.donations_yearly![yearStr].Somme || 0;
            currentCount += props.donations_yearly![yearStr]['Nombre de donateurs'] || 0;
          }
        });
      }
      
      return {
        ...props,
        Somme: currentSomme,
        'Nombre de donateurs': currentCount,
        intensity: props.age_total > 0 ? (currentSomme / props.age_total) * 100 : 0
      };
    });
  }, [rawData, selectedYears]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (loading) {
    return <div className="p-8 text-center">Chargement des données...</div>;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Explorateur de données RTA ({selectedYears.length} ans)</h2>
        <div className="flex items-center gap-2">
          <label htmlFor="search" className="text-sm font-medium">Rechercher RTA:</label>
          <input
            id="search"
            type="text"
            value={globalFilter ?? ''}
            onChange={e => setGlobalFilter(e.target.value)}
            className="px-3 py-1 border rounded-md"
            placeholder="Ex: H2X..."
          />
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 font-semibold text-gray-700 cursor-pointer select-none hover:bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' 🔼',
                        desc: ' 🔽',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 border-r last:border-r-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

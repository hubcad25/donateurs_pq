import React, { useEffect, useState } from 'react';
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

export const DataDashboard: React.FC = () => {
  const [data, setData] = useState<RTAData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/map_data.topojson');
        const topology = await response.json();
        
        // Extract properties from TopoJSON
        // Use the first object key if 'map_data' is not found
        const objectKey = topology.objects.map_data ? 'map_data' : Object.keys(topology.objects)[0];
        const rtaObjects = topology.objects[objectKey];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geojson = topojson.feature(topology, rtaObjects) as any;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const properties = geojson.features.map((f: any) => {
          const props = f.properties;
          return {
            ...props,
            intensity: props.age_total > 0 ? (props.Somme / props.age_total) * 100 : 0
          };
        });
        setData(properties);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        <h2 className="text-xl font-bold">Explorateur de données RTA</h2>
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
      <div className="text-xs text-gray-500">
        Affichage de {table.getRowModel().rows.length} RTAs
      </div>
    </div>
  );
};

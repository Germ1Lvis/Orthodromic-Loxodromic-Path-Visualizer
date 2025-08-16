import React, { useState, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { GlobeVisualization } from './components/GlobeVisualization';
import { MercatorVisualization } from './components/MercatorVisualization';
import { getCoordinatesForLocation } from './services/geminiService';
import type { Coordinates, LocationPoint, PathType } from './types';
import { calculateOrthodromicDistance, calculateLoxodromicDistance } from './utils/geo';

type ViewMode = 'globe' | 'map';

const App: React.FC = () => {
  const [points, setPoints] = useState<[LocationPoint, LocationPoint] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('globe');
  const [pathType, setPathType] = useState<PathType>('orthodromic');

  const handleVisualize = useCallback(async (from: string, to: string) => {
    if (!from || !to) {
      setError('Please enter both a start and end location.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setPoints(null);

    try {
      const [fromCoords, toCoords] = await Promise.all([
        getCoordinatesForLocation(from),
        getCoordinatesForLocation(to),
      ]);

      if (!fromCoords || !toCoords) {
        throw new Error('Could not find coordinates for one or both locations.');
      }

      setPoints([
        { name: from, coords: fromCoords },
        { name: to, coords: toCoords },
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to fetch location data: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const distance = points
    ? pathType === 'orthodromic'
      ? calculateOrthodromicDistance(points[0].coords, points[1].coords)
      : calculateLoxodromicDistance(points[0].coords, points[1].coords)
    : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 font-sans relative overflow-hidden">
      <header className="w-full max-w-5xl text-center mb-4 z-10">
        <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 tracking-tight">
          Orthodromic & Loxodromic Path Visualizer
        </h1>
        <p className="text-gray-400 mt-2 text-lg">
          Visualize great-circle (orthodromic) and rhumb line (loxodromic) paths between two points on an interactive 3D globe and 2D map.
        </p>
      </header>

      <div className="w-full flex flex-col lg:flex-row gap-4 max-w-7xl mx-auto">
        <aside className="lg:w-1/3 xl:w-1/4 z-10">
          <ControlPanel 
            onVisualize={handleVisualize} 
            isLoading={isLoading} 
            error={error}
            points={points}
            distance={distance}
            pathType={pathType}
            onPathTypeChange={setPathType}
          />
        </aside>
        <main className="flex-1 flex flex-col h-[70vh] lg:h-auto min-h-[500px] z-0">
          <div className="mb-2 flex justify-center lg:justify-start gap-2">
            <button
              onClick={() => setViewMode('globe')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'globe' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            >
              3D Globe
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'map' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
            >
              2D Map
            </button>
          </div>
          <div className="flex-grow w-full h-full">
            {viewMode === 'globe' ? (
              <GlobeVisualization 
                points={points ? [points[0].coords, points[1].coords] : null}
                pathType={pathType}
              />
            ) : (
              <MercatorVisualization
                points={points ? [points[0].coords, points[1].coords] : null}
                pathType={pathType}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
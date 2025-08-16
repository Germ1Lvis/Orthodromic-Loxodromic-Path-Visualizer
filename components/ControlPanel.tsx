import React, { useState } from 'react';
import type { LocationPoint, PathType } from '../types';

interface ControlPanelProps {
  onVisualize: (from: string, to: string) => void;
  isLoading: boolean;
  error: string | null;
  points: [LocationPoint, LocationPoint] | null;
  distance: number | null;
  pathType: PathType;
  onPathTypeChange: (type: PathType) => void;
}

const LoadingSpinner: React.FC = () => (
  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
    <svg className="animate-spin h-5 w-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({ onVisualize, isLoading, error, points, distance, pathType, onPathTypeChange }) => {
  const [from, setFrom] = useState<string>('Paris, France');
  const [to, setTo] = useState<string>('New York, USA');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onVisualize(from, to);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg shadow-2xl border border-gray-700 h-full flex flex-col">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="from" className="block text-sm font-medium text-gray-300 mb-1">From</label>
          <input
            id="from"
            type="text"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="e.g., London, UK"
            className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-gray-300 mb-1">To</label>
          <input
            id="to"
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="e.g., Tokyo, Japan"
            className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Path Type</label>
          <div className="flex rounded-md shadow-sm bg-gray-900 border border-gray-600">
            <button
              type="button"
              onClick={() => onPathTypeChange('orthodromic')}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md transition ${pathType === 'orthodromic' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:bg-gray-800 disabled:text-gray-500'}`}
            >
              Great Circle
            </button>
            <button
              type="button"
              onClick={() => onPathTypeChange('loxodromic')}
              disabled={isLoading}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md transition ${pathType === 'loxodromic' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300 disabled:bg-gray-800 disabled:text-gray-500'}`}
            >
              Rhumb Line
            </button>
          </div>
        </div>

        <div className="relative">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            {isLoading ? 'Visualizing...' : 'Visualize Path'}
          </button>
          {isLoading && <LoadingSpinner />}
        </div>
      </form>

      {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md text-sm">{error}</div>}

      <div className="mt-6 pt-6 border-t border-gray-700 flex-grow">
        <h3 className="text-lg font-semibold text-cyan-400 mb-3">Path Details</h3>
        {points && distance !== null ? (
          <div className="space-y-3 text-sm">
            <div className="bg-gray-900/50 p-3 rounded-md">
              <p className="font-bold text-gray-300">Start: <span className="font-normal text-white">{points[0].name}</span></p>
              <p className="text-gray-400">{`(${points[0].coords.lat.toFixed(4)}, ${points[0].coords.lon.toFixed(4)})`}</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-md">
              <p className="font-bold text-gray-300">End: <span className="font-normal text-white">{points[1].name}</span></p>
              <p className="text-gray-400">{`(${points[1].coords.lat.toFixed(4)}, ${points[1].coords.lon.toFixed(4)})`}</p>
            </div>
            <div className="bg-cyan-900/30 p-4 rounded-md text-center">
              <p className="text-gray-300 text-base">{pathType === 'orthodromic' ? 'Great-Circle' : 'Rhumb Line'} Distance</p>
              <p className="text-2xl font-bold text-cyan-300 mt-1">{distance.toLocaleString('en-US', { maximumFractionDigits: 0 })} km</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 pt-8">
            <p>Enter two locations and click "Visualize" to see the magic happen.</p>
          </div>
        )}
      </div>
    </div>
  );
};

import type { Coordinates } from '../types';

/**
 * Calculates the great-circle distance between two points on the Earth.
 * @param p1 - The first point with latitude and longitude.
 * @param p2 - The second point with latitude and longitude.
 * @returns The distance in kilometers.
 */
export function calculateOrthodromicDistance(p1: Coordinates, p2: Coordinates): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(p2.lat - p1.lat);
  const dLon = deg2rad(p2.lon - p1.lon);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(p1.lat)) * Math.cos(deg2rad(p2.lat)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

/**
 * Calculates the loxodromic (rhumb line) distance between two points on the Earth.
 * @param p1 - The first point with latitude and longitude.
 * @param p2 - The second point with latitude and longitude.
 * @returns The distance in kilometers.
 */
export function calculateLoxodromicDistance(p1: Coordinates, p2: Coordinates): number {
  const R = 6371; // Radius of the Earth in kilometers
  const phi1 = deg2rad(p1.lat);
  const phi2 = deg2rad(p2.lat);
  const deltaPhi = phi2 - phi1;
  let deltaLon = deg2rad(p2.lon - p1.lon);

  // Correct for longitude wrap-around
  if (Math.abs(deltaLon) > Math.PI) {
    deltaLon = deltaLon > 0 ? -(2 * Math.PI - deltaLon) : (2 * Math.PI + deltaLon);
  }

  const deltaPsi = Math.log(Math.tan(phi2 / 2 + Math.PI / 4) / Math.tan(phi1 / 2 + Math.PI / 4));
  
  // Check for straight E-W line (deltaPsi is 0)
  const q = Math.abs(deltaPsi) > 10e-12 ? deltaPhi / deltaPsi : Math.cos(phi1);

  const d = Math.sqrt(deltaPhi * deltaPhi + q * q * deltaLon * deltaLon) * R;

  return d;
}


function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

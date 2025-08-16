export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationPoint {
    name: string;
    coords: Coordinates;
}

export type PathType = 'orthodromic' | 'loxodromic';

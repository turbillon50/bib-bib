declare module 'ngeohash' {
  function encode(lat: number, lng: number, precision?: number): string;
  function decode(geohash: string): { latitude: number; longitude: number };
  function neighbors(geohash: string): Record<string, string>;
  function bbox(geohash: string): [number, number, number, number];
}

import { Coordinates } from '../types';

/**
 * High-fidelity Jagatpura Road Network Corridors
 * Used as reliable road-snapped fallback geometry if external OSRM API is unreachable or rate-limited.
 * Guarantees trucks always travel along actual Jagatpura streets without passing through buildings.
 */

export interface RoadIntersection {
  id: string;
  name: string;
  coords: Coordinates;
  connections: string[]; // Connected intersection IDs along roads
}

export const JAGATPURA_ROAD_GRAPH: Record<string, RoadIntersection> = {
  // Northern Arterial / Flyover
  'INT_PHATAK_FLYOVER': {
    id: 'INT_PHATAK_FLYOVER',
    name: 'Jagatpura Overbridge Junction',
    coords: { lat: 26.8408, lng: 75.8395 },
    connections: ['INT_STATION_CROSSING', 'INT_BOMBAY_HOSP_CORNER', 'INT_MODEL_TOWN_NORTH'],
  },
  'INT_STATION_CROSSING': {
    id: 'INT_STATION_CROSSING',
    name: 'Station Road Phatak',
    coords: { lat: 26.8340, lng: 75.8450 },
    connections: ['INT_PHATAK_FLYOVER', 'INT_CENTRAL_SPINE_NORTH', 'INT_RTO_PARK'],
  },
  'INT_MODEL_TOWN_NORTH': {
    id: 'INT_MODEL_TOWN_NORTH',
    name: 'Model Town D-Block Link',
    coords: { lat: 26.8375, lng: 75.8325 },
    connections: ['INT_PHATAK_FLYOVER', 'INT_BOMBAY_HOSP_CORNER'],
  },
  'INT_BOMBAY_HOSP_CORNER': {
    id: 'INT_BOMBAY_HOSP_CORNER',
    name: 'Bombay Hospital Road Junction',
    coords: { lat: 26.8312, lng: 75.8365 },
    connections: ['INT_PHATAK_FLYOVER', 'INT_MODEL_TOWN_NORTH', 'INT_AKSHAY_PATRA_NORTH'],
  },
  // Central Arterial / Mahal Road & Central Spine
  'INT_CENTRAL_SPINE_NORTH': {
    id: 'INT_CENTRAL_SPINE_NORTH',
    name: 'Central Spine North Entry',
    coords: { lat: 26.8285, lng: 75.8480 },
    connections: ['INT_STATION_CROSSING', 'INT_RTO_PARK', 'INT_MAHAL_ROAD_CENTRAL', 'INT_CENTRAL_SPINE_MID'],
  },
  'INT_CENTRAL_SPINE_MID': {
    id: 'INT_CENTRAL_SPINE_MID',
    name: 'Central Spine Commercial Plaza',
    coords: { lat: 26.8210, lng: 75.8525 },
    connections: ['INT_CENTRAL_SPINE_NORTH', 'INT_MAHAL_ROAD_CENTRAL', 'INT_AKSHAY_PATRA_SOUTH'],
  },
  'INT_RTO_PARK': {
    id: 'INT_RTO_PARK',
    name: 'RTO Office & Seven Wonders Road',
    coords: { lat: 26.8268, lng: 75.8482 },
    connections: ['INT_STATION_CROSSING', 'INT_CENTRAL_SPINE_NORTH', 'INT_AKSHAY_PATRA_NORTH'],
  },
  'INT_MAHAL_ROAD_CENTRAL': {
    id: 'INT_MAHAL_ROAD_CENTRAL',
    name: 'Main Mahal Road Hub',
    coords: { lat: 26.8245, lng: 75.8570 },
    connections: ['INT_CENTRAL_SPINE_NORTH', 'INT_CENTRAL_SPINE_MID', 'INT_GYAN_VIHAR_LINK', 'INT_NRI_CIRCLE'],
  },
  // Eastern Institutional / Ramnagariya Corridor
  'INT_GYAN_VIHAR_LINK': {
    id: 'INT_GYAN_VIHAR_LINK',
    name: 'Gyan Vihar University Corner',
    coords: { lat: 26.8282, lng: 75.8585 },
    connections: ['INT_MAHAL_ROAD_CENTRAL', 'INT_SKIT_MAIN', 'INT_RAMNAGARIYA_MANDI'],
  },
  'INT_SKIT_MAIN': {
    id: 'INT_SKIT_MAIN',
    name: 'SKIT College Road Tri-Junction',
    coords: { lat: 26.8222, lng: 75.8692 },
    connections: ['INT_GYAN_VIHAR_LINK', 'INT_RAMNAGARIYA_MANDI', 'INT_NRI_CIRCLE'],
  },
  'INT_RAMNAGARIYA_MANDI': {
    id: 'INT_RAMNAGARIYA_MANDI',
    name: 'Ramnagariya Sabzi Mandi Link',
    coords: { lat: 26.8250, lng: 75.8655 },
    connections: ['INT_GYAN_VIHAR_LINK', 'INT_SKIT_MAIN', 'INT_MAHAL_ROAD_CENTRAL'],
  },
  // Southern & Temple / NRI Corridors
  'INT_NRI_CIRCLE': {
    id: 'INT_NRI_CIRCLE',
    name: 'NRI Circle Rotary Island',
    coords: { lat: 26.8188, lng: 75.8622 },
    connections: ['INT_MAHAL_ROAD_CENTRAL', 'INT_SKIT_MAIN', 'INT_AKSHAY_PATRA_SOUTH'],
  },
  'INT_AKSHAY_PATRA_NORTH': {
    id: 'INT_AKSHAY_PATRA_NORTH',
    name: 'Hare Krishna Marg North Entry',
    coords: { lat: 26.8220, lng: 75.8420 },
    connections: ['INT_BOMBAY_HOSP_CORNER', 'INT_RTO_PARK', 'INT_AKSHAY_PATRA_SOUTH'],
  },
  'INT_AKSHAY_PATRA_SOUTH': {
    id: 'INT_AKSHAY_PATRA_SOUTH',
    name: 'Akshay Patra Temple South Gate',
    coords: { lat: 26.8168, lng: 75.8418 },
    connections: ['INT_AKSHAY_PATRA_NORTH', 'INT_CENTRAL_SPINE_MID', 'INT_NRI_CIRCLE'],
  },
};

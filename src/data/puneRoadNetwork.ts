// ==========================================
// WasteWise Pune Edition - Arterial Road Network Corridors
// ==========================================

export interface RoadIntersection {
  id: string;
  name: string;
  coords: [number, number]; // [lat, lng]
  connectedTo: string[];
}

export const PUNE_ROAD_GRAPH: Record<string, RoadIntersection> = {
  PUN_SWARGATE: {
    id: 'PUN_SWARGATE',
    name: 'Swargate Multimodal Hub & Shivaji Road Junction',
    coords: [18.5018, 73.8580],
    connectedTo: ['PUN_KASBAPETH', 'PUN_DECCAN', 'PUN_HADAPSAR', 'PUN_URALI'],
  },
  PUN_KASBAPETH: {
    id: 'PUN_KASBAPETH',
    name: 'Shaniwar Wada - Kasba Peth Heritage Chowk',
    coords: [18.5196, 73.8553],
    connectedTo: ['PUN_SWARGATE', 'PUN_SHIVAJINAGAR', 'PUN_DECCAN'],
  },
  PUN_DECCAN: {
    id: 'PUN_DECCAN',
    name: 'Deccan Gymkhana - Goodluck FC Road Chowk',
    coords: [18.5165, 73.8415],
    connectedTo: ['PUN_KASBAPETH', 'PUN_SHIVAJINAGAR', 'PUN_KOTHRUD', 'PUN_SWARGATE'],
  },
  PUN_SHIVAJINAGAR: {
    id: 'PUN_SHIVAJINAGAR',
    name: 'Shivajinagar Station - JM Road Concourse',
    coords: [18.5314, 73.8446],
    connectedTo: ['PUN_KASBAPETH', 'PUN_DECCAN', 'PUN_AUNDH', 'PUN_VIMANNAGAR'],
  },
  PUN_KOTHRUD: {
    id: 'PUN_KOTHRUD',
    name: 'Karve Road - Kothrud Depot Terminal',
    coords: [18.5074, 73.8077],
    connectedTo: ['PUN_DECCAN'],
  },
  PUN_AUNDH: {
    id: 'PUN_AUNDH',
    name: 'Bremen Chowk - Aundh University Corridor',
    coords: [18.5604, 73.8082],
    connectedTo: ['PUN_SHIVAJINAGAR'],
  },
  PUN_VIMANNAGAR: {
    id: 'PUN_VIMANNAGAR',
    name: 'Nagar Road - Viman Nagar Transit Crossing',
    coords: [18.5635, 73.9125],
    connectedTo: ['PUN_SHIVAJINAGAR', 'PUN_HADAPSAR'],
  },
  PUN_HADAPSAR: {
    id: 'PUN_HADAPSAR',
    name: 'Gadital - Hadapsar Industrial Gateway',
    coords: [18.5089, 73.9259],
    connectedTo: ['PUN_SWARGATE', 'PUN_VIMANNAGAR', 'PUN_URALI'],
  },
  PUN_URALI: {
    id: 'PUN_URALI',
    name: 'Urali Devachi Processing Site & SLF Access',
    coords: [18.4357, 73.9704],
    connectedTo: ['PUN_SWARGATE', 'PUN_HADAPSAR'],
  },
};

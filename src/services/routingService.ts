import { Coordinates } from '../types';
import { PUNE_ROAD_GRAPH } from '../data/puneRoadNetwork';

/**
 * WasteWise Pune Edition - Road Routing Service
 * Fetches real road geometry from OpenStreetMap OSRM routing engine.
 * Falls back to high-fidelity Pune arterial road network corridors if OSRM is unreachable.
 */

export interface RouteGeometryResult {
  coordinates: [number, number][]; // [lat, lng] array
  distanceKm: number;
  durationMinutes: number;
  isFallback: boolean;
  statusMessage: string;
}

// In-memory cache to prevent redundant network calls
const routeCache = new Map<string, RouteGeometryResult>();

/**
 * Calculates Haversine distance in kilometers between two lat/lng points
 */
export function haversineDistanceKm(p1: Coordinates, p2: Coordinates): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest road intersection in our Pune road graph
 */
function findNearestIntersection(point: Coordinates): string {
  let minDistance = Infinity;
  let nearestId = Object.keys(PUNE_ROAD_GRAPH)[0];

  for (const [id, node] of Object.entries(PUNE_ROAD_GRAPH)) {
    const dist = haversineDistanceKm(point, { lat: node.coords[0], lng: node.coords[1] });
    if (dist < minDistance) {
      minDistance = dist;
      nearestId = id;
    }
  }

  return nearestId;
}

/**
 * Generates a realistic road-snapped fallback geometry through the Pune road graph
 */
export function generateRoadSnappedFallback(waypoints: Coordinates[]): RouteGeometryResult {
  if (waypoints.length === 0) {
    return {
      coordinates: [],
      distanceKm: 0,
      durationMinutes: 0,
      isFallback: true,
      statusMessage: 'No waypoints provided',
    };
  }

  if (waypoints.length === 1) {
    return {
      coordinates: [[waypoints[0].lat, waypoints[0].lng]],
      distanceKm: 0,
      durationMinutes: 0,
      isFallback: true,
      statusMessage: 'Single waypoint',
    };
  }

  const path: [number, number][] = [];
  let totalDistanceKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];

    path.push([start.lat, start.lng]);

    // Snap to road network between consecutive points
    const nearStartId = findNearestIntersection(start);
    const nearEndId = findNearestIntersection(end);

    const startNode = PUNE_ROAD_GRAPH[nearStartId];
    const endNode = PUNE_ROAD_GRAPH[nearEndId];

    if (startNode && (startNode.coords[0] !== start.lat || startNode.coords[1] !== start.lng)) {
      path.push([startNode.coords[0], startNode.coords[1]]);
    }

    if (nearStartId !== nearEndId && endNode) {
      path.push([endNode.coords[0], endNode.coords[1]]);
    }

    path.push([end.lat, end.lng]);

    // Urban road tortuosity factor (~1.25x direct distance for Pune street grid)
    const legDistance = haversineDistanceKm(start, end) * 1.25;
    totalDistanceKm += legDistance;
  }

  // Deduplicate consecutive identical points
  const cleanPath: [number, number][] = [];
  for (let i = 0; i < path.length; i++) {
    if (
      i === 0 ||
      cleanPath[cleanPath.length - 1][0] !== path[i][0] ||
      cleanPath[cleanPath.length - 1][1] !== path[i][1]
    ) {
      cleanPath.push(path[i]);
    }
  }

  // Urban municipal tipper average speed: ~20 km/h in Pune traffic + 3 mins service per stop
  const travelDurationMinutes = (totalDistanceKm / 20) * 60;
  const serviceDurationMinutes = (waypoints.length - 1) * 3;
  const totalDuration = Math.round(travelDurationMinutes + serviceDurationMinutes);

  return {
    coordinates: cleanPath,
    distanceKm: parseFloat(totalDistanceKm.toFixed(2)),
    durationMinutes: totalDuration,
    isFallback: true,
    statusMessage: 'Offline Fallback: Geometry snapped to Pune arterial road corridors',
  };
}

/**
 * Primary routing function: Queries OpenStreetMap OSRM API with graceful road-graph fallback
 */
export async function getRoadRoute(waypoints: Coordinates[]): Promise<RouteGeometryResult> {
  if (waypoints.length < 2) {
    return generateRoadSnappedFallback(waypoints);
  }

  // Create cache key from coordinates
  const cacheKey = waypoints.map((w) => `${w.lat.toFixed(4)},${w.lng.toFixed(4)}`).join(';');
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  try {
    // Format coordinates for OSRM: lng,lat;lng,lat
    const coordsQuery = waypoints.map((w) => `${w.lng},${w.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second network timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      const latLngCoordinates: [number, number][] = route.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );

      const distanceKm = parseFloat((route.distance / 1000).toFixed(2));
      // Add 3 min service time per bin stop
      const durationMinutes = Math.round(route.duration / 60 + (waypoints.length - 1) * 3);

      const result: RouteGeometryResult = {
        coordinates: latLngCoordinates,
        distanceKm,
        durationMinutes,
        isFallback: false,
        statusMessage: 'Live OpenStreetMap OSRM road geometry',
      };

      routeCache.set(cacheKey, result);
      return result;
    } else {
      throw new Error(`OSRM code: ${data.code}`);
    }
  } catch (error) {
    // Graceful fallback to Pune road-snapped geometry
    const fallback = generateRoadSnappedFallback(waypoints);
    routeCache.set(cacheKey, fallback);
    return fallback;
  }
}

'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in webpack bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const finishIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

type LatLng = [number, number];

function parseGpx(gpxText: string): LatLng[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxText, 'text/xml');
  const points: LatLng[] = [];
  // Support both <trkpt> (track) and <rtept> (route)
  const selectors = ['trkpt', 'rtept', 'wpt'];
  for (const sel of selectors) {
    const els = doc.getElementsByTagName(sel);
    if (els.length > 0) {
      for (let i = 0; i < els.length; i++) {
        const lat = parseFloat(els[i].getAttribute('lat') ?? '');
        const lon = parseFloat(els[i].getAttribute('lon') ?? '');
        if (!isNaN(lat) && !isNaN(lon)) points.push([lat, lon]);
      }
      break;
    }
  }
  return points;
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(points as any, { padding: [30, 30] });
    }
  }, [map, points]);
  return null;
}

interface Props {
  raceId: string;
  raceName?: string;
}

export function GpxMap({ raceId, raceName }: Props) {
  const [points, setPoints] = useState<LatLng[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api'}/races/${raceId}/gpx`;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(apiUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        const pts = parseGpx(text);
        if (pts.length === 0) throw new Error('No track points found in GPX file');
        setPoints(pts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-xl">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading route…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-xl border border-red-200">
        <p className="text-sm text-red-600">Could not load route: {error}</p>
      </div>
    );
  }

  const start = points[0];
  const finish = points[points.length - 1];
  const totalKm = points.reduce((acc, pt, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    const R = 6371;
    const dLat = ((pt[0] - prev[0]) * Math.PI) / 180;
    const dLon = ((pt[1] - prev[1]) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((prev[0] * Math.PI) / 180) * Math.cos((pt[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Stats strip */}
      <div className="flex gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600 rounded-t-xl">
        <span>📍 {points.length.toLocaleString()} track points</span>
        <span>📏 ~{totalKm.toFixed(1)} km measured</span>
        {raceName && <span className="ml-auto font-medium text-gray-700">{raceName}</span>}
      </div>

      <div className="flex-1 relative">
        <MapContainer
          center={start ?? [36.8, 10.18]}
          zoom={13}
          style={{ height: '100%', width: '100%', borderRadius: '0 0 0.75rem 0.75rem' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.length > 1 && (
            <Polyline positions={points} color="#3b82f6" weight={4} opacity={0.85} />
          )}
          {start && <Marker position={start} icon={startIcon} />}
          {finish && points.length > 1 && <Marker position={finish} icon={finishIcon} />}
          <FitBounds points={points} />
        </MapContainer>
      </div>
    </div>
  );
}

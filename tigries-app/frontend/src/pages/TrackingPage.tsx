import {
  Activity,
  Clock3,
  Filter,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Route,
  Search,
  Wrench,
} from "lucide-react";
import L, { type LatLngBoundsExpression, type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type Depot = {
  id: string;
  name: string;
  city: string;
  address: string;
};

type ToolStatus = "available" | "in_use" | "maintenance";

type TrackingTool = {
  id: string;
  brand: string;
  name: string;
  reference: string;
  category: string;
  status: ToolStatus;
  condition: string;
  depot_id: string | null;
  image_url: string;
  updated_at: string;
  depots: Depot | Depot[] | null;
};

type MapAsset = {
  id: string;
  label: string;
  reference: string;
  category: string;
  status: ToolStatus;
  condition: string;
  depot: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  speed: number;
  heading: number;
  imageUrl: string;
  updatedAt: string;
};

const statusLabels: Record<ToolStatus, string> = {
  available: "Available",
  in_use: "In use",
  maintenance: "Maintenance",
};

const cityPositions: Record<string, { lat: number; lng: number; x: number; y: number }> = {
  antwerp: { lat: 51.2194, lng: 4.4025, x: 42, y: 18 },
  brussels: { lat: 50.8503, lng: 4.3517, x: 48, y: 52 },
  charleroi: { lat: 50.4108, lng: 4.4446, x: 54, y: 82 },
  ghent: { lat: 51.0543, lng: 3.7174, x: 24, y: 31 },
  lyon: { lat: 45.764, lng: 4.8357, x: 42, y: 68 },
  leuven: { lat: 50.8798, lng: 4.7005, x: 63, y: 47 },
  liege: { lat: 50.6326, lng: 5.5797, x: 82, y: 66 },
  madrid: { lat: 40.4168, lng: -3.7038, x: 50, y: 58 },
  milan: { lat: 45.4642, lng: 9.19, x: 62, y: 72 },
  namur: { lat: 50.4674, lng: 4.8718, x: 63, y: 75 },
  rotterdam: { lat: 51.9244, lng: 4.4777, x: 48, y: 28 },
  stuttgart: { lat: 48.7758, lng: 9.1829, x: 65, y: 52 },
};

const fallbackPosition = { lat: 50.8503, lng: 4.3517, x: 48, y: 52 };
const europeanTrackingHubs = [
  {
    address: "Madrid logistics assignment, Spain",
    city: "Madrid, Spain",
    depot: "Madrid field fleet",
    key: "Madrid",
  },
  {
    address: "Stuttgart machinery corridor, Germany",
    city: "Stuttgart, Germany",
    depot: "Stuttgart field fleet",
    key: "Stuttgart",
  },
  {
    address: "Lyon site assignment, France",
    city: "Lyon, France",
    depot: "Lyon field fleet",
    key: "Lyon",
  },
  {
    address: "Rotterdam port route, Netherlands",
    city: "Rotterdam, Netherlands",
    depot: "Rotterdam field fleet",
    key: "Rotterdam",
  },
  {
    address: "Milan equipment route, Italy",
    city: "Milan, Italy",
    depot: "Milan field fleet",
    key: "Milan",
  },
  {
    address: "Brussels operations route, Belgium",
    city: "Brussels, Belgium",
    depot: "Brussels field fleet",
    key: "Brussels",
  },
] as const;

export function TrackingPage() {
  const [assets, setAssets] = useState<MapAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ToolStatus>("all");
  const [tick, setTick] = useState(0);
  const [isLive, setIsLive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("inventory_tools")
      .select(
        "id, brand, name, reference, category, status, condition, depot_id, image_url, updated_at, depots(id, name, city, address)"
      )
      .order("updated_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
      setAssets(createFallbackAssets());
    } else {
      const nextAssets = ((data ?? []) as TrackingTool[])
        .slice(0, europeanTrackingHubs.length)
        .map(mapToolToAsset);
      setAssets(nextAssets.length > 0 ? nextAssets : createFallbackAssets());
      setLastSync(new Date());
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (!isLive) {
      return undefined;
    }

    const movementTimer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 2200);
    const syncTimer = window.setInterval(() => {
      void loadAssets();
    }, 30000);

    return () => {
      window.clearInterval(movementTimer);
      window.clearInterval(syncTimer);
    };
  }, [isLive, loadAssets]);

  const liveAssets = useMemo(
    () => assets.map((asset) => applyLiveMovement(asset, tick)),
    [assets, tick]
  );

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return liveAssets.filter((asset) => {
      const matchesStatus = statusFilter === "all" || asset.status === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          asset.label,
          asset.reference,
          asset.category,
          asset.depot,
          asset.city,
          statusLabels[asset.status],
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesStatus && matchesQuery;
    });
  }, [liveAssets, query, statusFilter]);

  const selectedAsset =
    filteredAssets.find((asset) => asset.id === selectedId) ??
    filteredAssets[0] ??
    null;
  const activeSelectedId = selectedAsset?.id ?? null;
  const orderedAssets = useMemo(() => {
    if (!activeSelectedId) {
      return filteredAssets;
    }

    return [...filteredAssets].sort((first, second) => {
      if (first.id === activeSelectedId) {
        return -1;
      }

      if (second.id === activeSelectedId) {
        return 1;
      }

      return 0;
    });
  }, [activeSelectedId, filteredAssets]);

  const stats = useMemo(
    () => ({
      live: liveAssets.filter((asset) => asset.status === "in_use").length,
      tracked: liveAssets.length,
      maintenance: liveAssets.filter((asset) => asset.status === "maintenance").length,
      depots: new Set(liveAssets.map((asset) => asset.depot)).size,
    }),
    [liveAssets]
  );

  return (
    <section className="page-stack tracking-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operations / Tracking</p>
          <h1>Live tracking</h1>
          <p>Monitor equipment, vehicles, and active field assets in real time.</p>
        </div>
        <div className="page-header-actions">
          <span className={isLive ? "tracking-live-pill" : "tracking-live-pill paused"}>
            <Radio aria-hidden="true" size={14} />
            {isLive ? "Live" : "Paused"}
          </span>
          <Button type="button" variant="outline" onClick={() => void loadAssets()}>
            <RefreshCw aria-hidden="true" />
            Sync
          </Button>
        </div>
      </header>

      <div className="metrics-grid tracking-stats">
        <article className="mini-stat mini-stat-success">
          <Activity aria-hidden="true" size={19} />
          <span>Live assets</span>
          <strong>{stats.live}</strong>
        </article>
        <article className="mini-stat">
          <LocateFixed aria-hidden="true" size={19} />
          <span>Tracked units</span>
          <strong>{stats.tracked}</strong>
        </article>
        <article className="mini-stat mini-stat-danger">
          <Wrench aria-hidden="true" size={19} />
          <span>Maintenance</span>
          <strong>{stats.maintenance}</strong>
        </article>
        <article className="mini-stat mini-stat-warning">
          <MapPin aria-hidden="true" size={19} />
          <span>Depots</span>
          <strong>{stats.depots}</strong>
        </article>
      </div>

      <section className="tracking-shell">
        <div className="tracking-toolbar">
          <div className="tracking-search">
            <Search aria-hidden="true" size={16} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search asset, reference, depot..."
            />
          </div>
          <div className="segmented-control">
            {(["all", "in_use", "available", "maintenance"] as const).map((status) => (
              <button
                className={statusFilter === status ? "active" : ""}
                key={status}
                onClick={() => setStatusFilter(status)}
                type="button"
              >
                {status === "all" ? "All" : statusLabels[status]}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" onClick={() => setIsLive((value) => !value)}>
            <Filter aria-hidden="true" />
            {isLive ? "Pause live" : "Resume live"}
          </Button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {isLoading ? <p className="muted-text">Loading live map...</p> : null}

        <div className="tracking-grid">
          <div className="tracking-map-card">
            <LiveMap
              assets={filteredAssets}
              focusedAsset={selectedId ? selectedAsset : null}
              selectedId={activeSelectedId}
              onSelect={setSelectedId}
            />
          </div>

          <aside className="tracking-side-panel">
            <div className="tracking-side-header">
              <div>
                <span>Fleet status</span>
                <strong>{filteredAssets.length} visible assets</strong>
              </div>
              <small>
                {lastSync ? `Synced ${formatTime(lastSync)}` : "Waiting for sync"}
              </small>
            </div>

            {selectedAsset ? <TrackingAssetDetails asset={selectedAsset} /> : null}

            <div className="tracking-asset-list">
              {orderedAssets.map((asset) => (
                <button
                  className={activeSelectedId === asset.id ? "active" : ""}
                  key={asset.id}
                  onClick={() => setSelectedId(asset.id)}
                  type="button"
                >
                  <span className={`tracking-status-dot tracking-${asset.status}`} />
                  {asset.imageUrl ? (
                    <img alt="" className="tracking-asset-thumb" loading="lazy" src={asset.imageUrl} />
                  ) : (
                    <span className="tracking-asset-thumb tracking-asset-thumb-empty" />
                  )}
                  <div>
                    <strong>{asset.label}</strong>
                    <small>{asset.reference}</small>
                  </div>
                  <em>{statusLabels[asset.status]}</em>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </section>
  );
}

function LiveMap({
  assets,
  focusedAsset,
  onSelect,
  selectedId,
}: {
  assets: MapAsset[];
  focusedAsset: MapAsset | null;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  const routePoints: LatLngExpression[] = assets
    .filter((asset) => asset.status === "in_use")
    .slice(0, 6)
    .map((asset) => [asset.lat, asset.lng]);

  return (
    <div className="tracking-map" aria-label="Live tracking map">
      <MapContainer
        center={[50.8503, 4.3517]}
        className="tracking-leaflet"
        scrollWheelZoom
        zoom={8}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <LeafletBounds assets={assets} />
        <LeafletSelectedFocus asset={focusedAsset} />
        <LeafletResize />
        {routePoints.length > 1 ? (
          <Polyline
            pathOptions={{ color: "#2563eb", dashArray: "6 8", opacity: 0.72, weight: 3 }}
            positions={routePoints}
          />
        ) : null}
        {assets.map((asset) => (
          <Marker
            eventHandlers={{ click: () => onSelect(asset.id) }}
            icon={createAssetIcon(asset, selectedId === asset.id, Boolean(selectedId))}
            key={asset.id}
            position={[asset.lat, asset.lng]}
          >
            <Popup>
              <div className="tracking-popup">
                <span>{asset.category}</span>
                <strong>{asset.label}</strong>
                <small>{asset.reference}</small>
                <button onClick={() => onSelect(asset.id)} type="button">
                  View details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function LeafletBounds({ assets }: { assets: MapAsset[] }) {
  const map = useMap();
  const hasFittedBounds = useRef(false);

  useEffect(() => {
    if (hasFittedBounds.current) {
      return;
    }

    if (assets.length === 0) {
      map.setView([50.8503, 4.3517], 8);
      hasFittedBounds.current = true;
      return;
    }

    const bounds = assets.map((asset) => [asset.lat, asset.lng]) as LatLngBoundsExpression;
    map.fitBounds(bounds, { maxZoom: 12, padding: [48, 48] });
    hasFittedBounds.current = true;
  }, [assets, map]);

  return null;
}

function LeafletSelectedFocus({ asset }: { asset: MapAsset | null }) {
  const map = useMap();
  const lastFocusedId = useRef<string | null>(null);

  useEffect(() => {
    if (!asset || lastFocusedId.current === asset.id) {
      return;
    }

    lastFocusedId.current = asset.id;
    map.flyTo([asset.lat, asset.lng], Math.max(map.getZoom(), 14), {
      animate: true,
      duration: 0.75,
    });
  }, [asset, map]);

  return null;
}

function LeafletResize() {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => map.invalidateSize();
    const resizeMap = window.setTimeout(handleResize, 80);

    window.addEventListener("resize", handleResize);
    return () => {
      window.clearTimeout(resizeMap);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  return null;
}

function createAssetIcon(asset: MapAsset, isSelected: boolean, hasSelection: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div class="tracking-leaflet-marker tracking-${asset.status} ${isSelected ? "active" : ""} ${
        hasSelection && !isSelected ? "muted" : ""
      }">
        <span>${asset.category.toLowerCase().includes("vehicle") ? "VEH" : "EQP"}</span>
        <strong>${escapeHtml(asset.reference)}</strong>
      </div>
    `,
    iconAnchor: [42, 18],
    iconSize: [84, 36],
    popupAnchor: [0, -18],
  });
}

function TrackingAssetDetails({ asset }: { asset: MapAsset }) {
  return (
    <article className="tracking-detail-card">
      <div className="tracking-detail-title">
        {asset.imageUrl ? (
          <img alt="" className="tracking-detail-image" loading="lazy" src={asset.imageUrl} />
        ) : null}
        <div>
          <span>{asset.category}</span>
          <strong>{asset.label}</strong>
        </div>
        <span className={`status-badge status-${asset.status}`}>
          {statusLabels[asset.status]}
        </span>
      </div>
      <div className="tracking-detail-grid">
        <TrackingMeta icon={MapPin} label="Location" value={`${asset.city} - ${asset.depot}`} />
        <TrackingMeta icon={Navigation} label="Coordinates" value={`${asset.lat.toFixed(5)}, ${asset.lng.toFixed(5)}`} />
        <TrackingMeta icon={Route} label="Speed" value={`${asset.speed} km/h`} />
        <TrackingMeta icon={Clock3} label="Last update" value={formatRelative(asset.updatedAt)} />
      </div>
    </article>
  );
}

function TrackingMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="tracking-meta">
      <Icon aria-hidden="true" size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function mapToolToAsset(tool: TrackingTool, index: number): MapAsset {
  const hub = europeanTrackingHubs[index % europeanTrackingHubs.length];
  const base = getCityPosition(hub.key);
  const offset = getStableOffset(tool.id, index);

  return {
    address: hub.address,
    category: tool.category,
    city: hub.city,
    condition: tool.condition,
    depot: hub.depot,
    heading: (hashString(tool.reference) + index * 29) % 360,
    id: tool.id,
    imageUrl: tool.image_url,
    label: `${tool.brand} ${tool.name}`,
    lat: base.lat + offset.lat,
    lng: base.lng + offset.lng,
    reference: tool.reference,
    speed: tool.status === "in_use" ? 18 + ((hashString(tool.id) + index) % 42) : 0,
    status: tool.status,
    updatedAt: tool.updated_at,
    x: clamp(base.x + offset.x, 8, 92),
    y: clamp(base.y + offset.y, 10, 90),
  };
}

function applyLiveMovement(asset: MapAsset, tick: number): MapAsset {
  if (asset.status !== "in_use") {
    return asset;
  }

  const phase = hashString(asset.id) % 12;
  const xMovement = Math.sin((tick + phase) / 2.4) * 1.8;
  const yMovement = Math.cos((tick + phase) / 2.8) * 1.4;

  return {
    ...asset,
    heading: (asset.heading + tick * 7) % 360,
    lat: asset.lat + yMovement / 8000,
    lng: asset.lng + xMovement / 8000,
    updatedAt: new Date().toISOString(),
    x: clamp(asset.x + xMovement, 6, 94),
    y: clamp(asset.y + yMovement, 8, 92),
  };
}

function getCityPosition(city?: string | null) {
  if (!city) {
    return fallbackPosition;
  }

  const normalized = city.trim().toLowerCase();
  return cityPositions[normalized] ?? fallbackPosition;
}

function getStableOffset(id: string, index: number) {
  const hash = hashString(id);

  return {
    lat: ((hash % 11) - 5) / 1000,
    lng: (((hash >> 2) % 11) - 5) / 1000,
    x: ((hash % 13) - 6) * 1.1 + (index % 3) * 1.4,
    y: (((hash >> 3) % 13) - 6) * 1.1,
  };
}

function createFallbackAssets(): MapAsset[] {
  const now = new Date().toISOString();
  const fallbackTools: TrackingTool[] = [
    {
      brand: "Toyota",
      category: "Vehicles",
      condition: "Good",
      depot_id: null,
      depots: null,
      id: "demo-madrid-van",
      image_url: "https://loremflickr.com/640/420/construction,van?lock=9001",
      name: "Proace site van",
      reference: "VEH-MAD-001",
      status: "in_use",
      updated_at: now,
    },
    {
      brand: "Bobcat",
      category: "Machines",
      condition: "Used",
      depot_id: null,
      depots: null,
      id: "demo-stuttgart-loader",
      image_url: "https://loremflickr.com/640/420/construction,loader?lock=9002",
      name: "Compact track loader",
      reference: "MAC-STU-002",
      status: "in_use",
      updated_at: now,
    },
    {
      brand: "Makita",
      category: "Power tools",
      condition: "Good",
      depot_id: null,
      depots: null,
      id: "demo-lyon-drill",
      image_url: "https://loremflickr.com/640/420/construction,drill?lock=9003",
      name: "Impact drill kit",
      reference: "TOO-LYO-003",
      status: "available",
      updated_at: now,
    },
    {
      brand: "Mercedes-Benz",
      category: "Vehicles",
      condition: "Good",
      depot_id: null,
      depots: null,
      id: "demo-rotterdam-sprinter",
      image_url: "https://loremflickr.com/640/420/construction,sprinter-van?lock=9004",
      name: "Sprinter logistics van",
      reference: "VEH-ROT-004",
      status: "in_use",
      updated_at: now,
    },
    {
      brand: "Wacker Neuson",
      category: "Compaction machines",
      condition: "Needs service",
      depot_id: null,
      depots: null,
      id: "demo-milan-compactor",
      image_url: "https://loremflickr.com/640/420/construction,plate-compactor?lock=9005",
      name: "Plate compactor",
      reference: "MAC-MIL-005",
      status: "maintenance",
      updated_at: now,
    },
    {
      brand: "Hilti",
      category: "Measurement",
      condition: "Good",
      depot_id: null,
      depots: null,
      id: "demo-brussels-laser",
      image_url: "https://loremflickr.com/640/420/construction,laser-level?lock=9006",
      name: "Rotating laser level",
      reference: "MEA-BRU-006",
      status: "available",
      updated_at: now,
    },
  ];

  return fallbackTools.map(mapToolToAsset);
}

function hashString(value: string) {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  return `${minutes} min ago`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

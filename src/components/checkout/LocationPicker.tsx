import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

// Component to handle map click events and marker
function MapEvents({ 
  position, 
  onPositionChange,
  setMapInstance
}: { 
  position: [number, number]; 
  onPositionChange: (lat: number, lng: number) => void;
  setMapInstance: (map: L.Map) => void;
}) {
  const map = useMap();
  
  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);

  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={position} icon={customIcon} />;
}

// Geolocation button component
function GeolocationButton({ 
  onLocate, 
  isLocating 
}: { 
  onLocate: () => void;
  isLocating: boolean;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="absolute bottom-4 right-4 z-[1000] shadow-lg bg-background hover:bg-secondary"
      onClick={onLocate}
      disabled={isLocating}
    >
      {isLocating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Crosshair className="w-4 h-4" />
      )}
    </Button>
  );
}

export function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>([lat, lng]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [address, setAddress] = useState('');
  const mapInstanceRef = useRef<L.Map | null>(null);
  const addressFetchedRef = useRef(false);

  // Reverse geocode to get address from coordinates
  const getAddressFromCoords = useCallback(async (latitude: number, longitude: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'uz,ru,en',
            'User-Agent': 'XozMarket/1.0',
          },
        }
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        const parts: string[] = [];
        if (data.address) {
          if (data.address.road) parts.push(data.address.road);
          if (data.address.house_number) parts.push(data.address.house_number);
          if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
          if (data.address.suburb) parts.push(data.address.suburb);
          if (data.address.city || data.address.town || data.address.village) {
            parts.push(data.address.city || data.address.town || data.address.village);
          }
        }
        const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
        setAddress(formattedAddress);
        onLocationChange(latitude, longitude, formattedAddress);
      } else {
        const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setAddress(fallbackAddress);
        onLocationChange(latitude, longitude, fallbackAddress);
      }
    } catch (error) {
      console.error('Failed to get address:', error);
      const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setAddress(fallbackAddress);
      onLocationChange(latitude, longitude, fallbackAddress);
    } finally {
      setIsLoadingAddress(false);
    }
  }, [onLocationChange]);

  const handlePositionChange = useCallback((newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    getAddressFromCoords(newLat, newLng);
  }, [getAddressFromCoords]);

  const handleSetMapInstance = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setPosition([newLat, newLng]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 16);
        }
        getAddressFromCoords(newLat, newLng);
        setIsLocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [getAddressFromCoords]);

  // Get initial address only once
  useEffect(() => {
    if (!addressFetchedRef.current) {
      addressFetchedRef.current = true;
      getAddressFromCoords(lat, lng);
    }
  }, [lat, lng, getAddressFromCoords]);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: '280px' }}>
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          dragging={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents 
            position={position} 
            onPositionChange={handlePositionChange}
            setMapInstance={handleSetMapInstance}
          />
        </MapContainer>
        <GeolocationButton onLocate={handleGetCurrentLocation} isLocating={isLocating} />
      </div>

      {/* Address display */}
      <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-xl">
        <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted-foreground mb-1">Tanlangan manzil:</p>
          {isLoadingAddress ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Manzil aniqlanmoqda...</span>
            </div>
          ) : (
            <p className="text-sm font-medium">{address || 'Xaritadan joy tanlang'}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        📍 Xaritadagi istalgan joyni bosing yoki ⊕ tugmasini bosib joriy joylashuvingizni aniqlang
      </p>
    </div>
  );
}

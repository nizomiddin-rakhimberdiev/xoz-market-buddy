import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationPickerProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

function LocationMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number]; 
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={position} />;
}

function MapCenterButton({ onCenter }: { onCenter: () => void }) {
  const map = useMap();
  
  const handleCenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 16);
          onCenter();
        },
        () => {
          // If geolocation fails, stay at current position
        }
      );
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="absolute bottom-4 right-4 z-[1000] shadow-lg"
      onClick={handleCenter}
    >
      <Crosshair className="w-4 h-4" />
    </Button>
  );
}

export function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>([lat, lng]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [address, setAddress] = useState('');
  const mapRef = useRef<L.Map | null>(null);

  // Reverse geocode to get address from coordinates
  const getAddressFromCoords = async (latitude: number, longitude: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'uz,ru,en',
          },
        }
      );
      const data = await response.json();
      
      if (data && data.display_name) {
        // Format address nicely
        const parts = [];
        if (data.address) {
          if (data.address.road) parts.push(data.address.road);
          if (data.address.house_number) parts.push(data.address.house_number);
          if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
          if (data.address.suburb) parts.push(data.address.suburb);
          if (data.address.city || data.address.town) parts.push(data.address.city || data.address.town);
        }
        const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name;
        setAddress(formattedAddress);
        onLocationChange(latitude, longitude, formattedAddress);
      }
    } catch (error) {
      console.error('Failed to get address:', error);
      setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      onLocationChange(latitude, longitude, `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handlePositionChange = (newLat: number, newLng: number) => {
    setPosition([newLat, newLng]);
    getAddressFromCoords(newLat, newLng);
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = pos.coords.latitude;
          const newLng = pos.coords.longitude;
          setPosition([newLat, newLng]);
          if (mapRef.current) {
            mapRef.current.flyTo([newLat, newLng], 16);
          }
          getAddressFromCoords(newLat, newLng);
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  // Get initial address
  useEffect(() => {
    getAddressFromCoords(lat, lng);
  }, []);

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={position}
          zoom={14}
          style={{ height: '250px', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onPositionChange={handlePositionChange} />
          <MapCenterButton onCenter={handleGetCurrentLocation} />
        </MapContainer>
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

      <p className="text-xs text-muted-foreground">
        Xaritadagi joyni bosing yoki o'ng pastdagi tugmani bosib joriy manzilingizni aniqlang
      </p>
    </div>
  );
}

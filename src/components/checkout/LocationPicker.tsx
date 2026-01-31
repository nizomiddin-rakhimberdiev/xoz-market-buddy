import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
const defaultIcon = L.icon({
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

export function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [address, setAddress] = useState('');
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

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 14,
      scrollWheelZoom: true,
      doubleClickZoom: false, // Disable to allow click for marker
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add marker
    const marker = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);

    // Handle map click
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      marker.setLatLng([newLat, newLng]);
      getAddressFromCoords(newLat, newLng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Get initial address
    if (!addressFetchedRef.current) {
      addressFetchedRef.current = true;
      getAddressFromCoords(lat, lng);
    }

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [lat, lng, getAddressFromCoords]);

  const handleGetCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        
        if (mapRef.current && markerRef.current) {
          mapRef.current.flyTo([newLat, newLng], 16);
          markerRef.current.setLatLng([newLat, newLng]);
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

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: '280px' }}>
        <div 
          ref={mapContainerRef} 
          style={{ height: '100%', width: '100%' }}
        />
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute bottom-4 right-4 z-[1000] shadow-lg bg-background hover:bg-secondary"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4" />
          )}
        </Button>
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

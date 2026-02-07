'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Loader2, X } from 'lucide-react';
import { useChatContext } from '@/contexts/ChatContext';

interface LocationRequestProps {
  reason: string;
  onLocationReceived?: (lat: number, lng: number) => void;
  onDeclined?: () => void;
}

export function LocationRequest({ reason, onLocationReceived, onDeclined }: LocationRequestProps) {
  const { setUserLocation } = useChatContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Save location to context
        setUserLocation({
          lat: latitude,
          lng: longitude,
          timestamp: Date.now(),
        });

        // Notify parent
        onLocationReceived?.(latitude, longitude);
        
        setIsLoading(false);
      },
      (error) => {
        let errorMessage = 'Impossible d\'obtenir votre position';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permission de géolocalisation refusée';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Position non disponible';
            break;
          case error.TIMEOUT:
            errorMessage = 'La demande de position a expiré';
            break;
        }
        
        setError(errorMessage);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const handleDecline = () => {
    onDeclined?.();
  };

  return (
    <Card className="border-primary/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Accès à votre position</p>
            <p className="text-sm text-muted-foreground mt-1">{reason}</p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={requestLocation}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Localisation...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Partager ma position
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

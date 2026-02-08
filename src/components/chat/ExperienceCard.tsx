'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Users, BedDouble, DoorOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getImageUrl } from '@/utils/functions';

interface RoomInfo {
  name: string;
  type?: string;
  price_mad: number;
  capacity_beds?: number;
  max_persons?: number;
}

interface ExperienceCardProps {
  experience: {
    id: string;
    title: string;
    description?: string;
    type: 'lodging' | 'trip' | 'activity';
    city: string;
    region?: string;
    price_mad: number;
    currency?: string;
    rating?: number;
    reviews_count?: number;
    distance_km?: number;
    has_promo?: boolean;
    promo_badge?: string;
    thumbnail_url?: string;
    host_name?: string;
    rooms?: RoomInfo[];
  };
  onSelect?: () => void;
  onBook?: () => void;
}

const typeLabels = {
  lodging: 'Hébergement',
  trip: 'Voyage',
  activity: 'Activité',
};

export function ExperienceCard({ experience, onSelect, onBook }: ExperienceCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 w-full">
        {experience.thumbnail_url ? (
          <Image
            src={getImageUrl(experience.thumbnail_url)!}
            alt={experience.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">Pas d'image</span>
          </div>
        )}
        
        {experience.has_promo && experience.promo_badge && (
          <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600">
            {experience.promo_badge}
          </Badge>
        )}
        
        <Badge className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground">
          {typeLabels[experience.type]}
        </Badge>
      </div>
      
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-2">{experience.title}</h3>
          {experience.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {experience.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{experience.city}</span>
          </div>
          
          {experience.rating && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{experience.rating.toFixed(1)}</span>
              {experience.reviews_count && experience.reviews_count > 0 && (
                <span className="text-xs">({experience.reviews_count})</span>
              )}
            </div>
          )}
          
          {experience.distance_km !== null && experience.distance_km !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{experience.distance_km.toFixed(1)} km</span>
            </div>
          )}
        </div>
        
        {experience.host_name && (
          <p className="text-xs text-muted-foreground">Par {experience.host_name}</p>
        )}

        {experience.type === 'lodging' && experience.rooms && experience.rooms.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <DoorOpen className="w-3 h-3" />
              {experience.rooms.length} type{experience.rooms.length > 1 ? 's' : ''} de chambre
            </p>
            {experience.rooms.slice(0, 3).map((room, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <BedDouble className="w-3 h-3" />
                  {room.name}
                  {room.max_persons && <span className="text-[10px]">({room.max_persons} pers.)</span>}
                </span>
                <span className="font-medium">{room.price_mad} MAD</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-2xl font-bold">{experience.price_mad} MAD</p>
            <p className="text-xs text-muted-foreground">
              {experience.type === 'lodging' ? 'par nuit' : 'par personne'}
            </p>
          </div>
          
          <div className="flex gap-2">
            {onSelect && (
              <Button variant="outline" size="sm" onClick={onSelect}>
                Détails
              </Button>
            )}
            {onBook && (
              <Button size="sm" onClick={onBook}>
                Réserver
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

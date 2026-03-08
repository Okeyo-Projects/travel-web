"use client";

import {
  BedDouble,
  Calendar,
  Check,
  ChevronLeft,
  Heart,
  Loader2,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Users,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBooking } from "@/hooks/use-booking";
import { useExperienceDetail } from "@/hooks/use-experience-detail";
import { ExperienceGallery } from "@/components/experience/ExperienceGallery";
import { MarketingHeader } from "@/components/site/MarketingHeader";

export default function ExperiencePage() {
  const params = useParams();
  const identifier = params?.id as string;
  const { data, isLoading, isError } = useExperienceDetail(identifier);
  const { openBooking, BookingModal } = useBooking();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive text-lg font-medium">
          Une erreur est survenue
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  const experience = data.transformed;
  const { host, trip, lodging } = experience;

  const price = trip?.price_per_person
    ? new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: trip.price_currency,
    }).format(trip.price_per_person / 100)
    : lodging?.rooms[0]?.price_cents
      ? new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: lodging.rooms[0].currency,
      }).format(lodging.rooms[0].price_cents / 100)
      : "Sur demande";

  const allGalleryImages = experience.gallery
    .map((g) => g.url)
    .filter(Boolean) as string[];

  if (experience.thumbnailUrl && !allGalleryImages.includes(experience.thumbnailUrl)) {
    allGalleryImages.unshift(experience.thumbnailUrl);
  }

  // Find next available date if any
  const nextDeparture = trip?.departures?.[0]?.depart_at ? new Date(trip.departures[0].depart_at) : null;
  const departureDateStr = nextDeparture ? nextDeparture.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : "--/--";

  // Determine top amenities to highlight (mocking Wifi if present in keywords)
  const hasWifi = experience.amenities.some(a => a.label.toLowerCase().includes('wifi'));
  const totalBeds = lodging?.rooms?.reduce((acc, r) => acc + (r.capacity_beds || 0), 0) || 0;
  const maxCapacity = lodging?.rooms?.reduce((acc, r) => acc + (r.max_persons || 0), 0) || trip?.group_size_max || 0;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Universal Header wrapped in dark background to match its white text/logo theme */}
      <div className="bg-[#1a1a1a] px-5 py-4 sm:px-8 shadow-sm relative z-50">
        <div className="max-w-[1280px] mx-auto">
          <MarketingHeader />
        </div>
      </div>

      {/* Top Bar for back & share */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Heart className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Hidden on mobile, shown on desktop */}
        <div className="hidden lg:flex justify-between items-start mb-6">
          <Button variant="ghost" className="gap-2" onClick={() => window.history.back()}>
            <ChevronLeft className="h-4 w-4" />
            Retour
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" /> Partager
            </Button>
            <Button variant="outline" className="gap-2">
              <Heart className="h-4 w-4" /> Enregistrer
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative items-start">

          {/* LEFT COLUMN: Gallery */}
          <div className="lg:col-span-5 xl:col-span-6 space-y-4">
            <div className="lg:sticky lg:top-8">
              <ExperienceGallery images={allGalleryImages} videoUrl={experience.video?.url} />
            </div>
          </div>

          {/* MIDDLE COLUMN: Details via Tabs */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-6">

            {/* Title & Summary */}
            <section className="space-y-6 pt-2">
              <div>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {experience.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-3xl md:text-3xl lg:text-4xl font-bold leading-tight text-foreground">
                  {experience.title}
                </h1>

                {experience.metrics.rating && (
                  <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{experience.metrics.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground underline">
                      {experience.metrics.reviews} avis
                    </span>
                  </div>
                )}
              </div>

              {/* Inspiration-style Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {totalBeds > 0 && (
                  <div className="flex items-center gap-3 border rounded-xl p-3 bg-muted/20">
                    <BedDouble className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lits</p>
                      <p className="text-sm font-semibold">{totalBeds}</p>
                    </div>
                  </div>
                )}
                {maxCapacity > 0 && (
                  <div className="flex items-center gap-3 border rounded-xl p-3 bg-muted/20">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Capacité</p>
                      <p className="text-sm font-semibold">{maxCapacity} max</p>
                    </div>
                  </div>
                )}
                {hasWifi && (
                  <div className="flex items-center gap-3 border rounded-xl p-3 bg-muted/20">
                    <Wifi className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Wifi</p>
                      <p className="text-sm font-semibold">Inclus</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none p-0 h-auto mb-6 sticky top-0 bg-background/95 z-10 pt-4 pb-0">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-base">Aperçu</TabsTrigger>
                {lodging && lodging.rooms && lodging.rooms.length > 0 && (
                  <TabsTrigger value="rooms" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-base">Chambres</TabsTrigger>
                )}
                <TabsTrigger value="location" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-base">Emplacement</TabsTrigger>
                <TabsTrigger value="reviews" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-base">Avis</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none pb-8 animate-in fade-in duration-300">
                {/* Host Section */}
                {host && (
                  <section className="space-y-4">
                    <h2 className="text-xl font-semibold">Proposé par</h2>
                    <div className="flex items-center gap-4 border rounded-2xl p-4 bg-muted/10">
                      <Avatar className="h-14 w-14 border">
                        <AvatarImage src={host.avatarUrl ?? undefined} />
                        <AvatarFallback>{host.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-lg">{host.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          {host.verified && (
                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <ShieldCheck className="h-3 w-3" /> Vérifié
                            </span>
                          )}
                          <span>Hôte depuis {new Date().getFullYear()}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <div className="prose prose-slate max-w-none text-muted-foreground dark:prose-invert">
                  <p>{experience.longDescription || experience.shortDescription}</p>
                </div>

                {experience.amenities.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="font-semibold text-lg">Inclus dans ce lieu</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      {experience.amenities.map((amenity) => (
                        <div key={amenity.key} className="flex items-center gap-3">
                          <div className="p-2 bg-muted/50 rounded-lg">
                            <Check className="h-4 w-4 text-foreground" />
                          </div>
                          <span className="text-sm font-medium text-foreground/80">{amenity.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {lodging && lodging.rooms && lodging.rooms.length > 0 && (
                <TabsContent value="rooms" className="mt-0 focus-visible:outline-none pb-8 animate-in fade-in duration-300">
                  <div className="space-y-4">
                    {lodging.rooms.map((room) => (
                      <div key={room.id} className="flex gap-4 border rounded-2xl p-4 hover:bg-muted/30 transition-colors">
                        {room.photoUrls[0] ? (
                          <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                            <Image src={room.photoUrls[0]} alt={room.name || "Chambre"} fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <BedDouble className="h-8 w-8 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 py-1">
                          <h3 className="font-semibold text-lg">{room.name}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{room.description}</p>
                          <div className="mt-auto flex flex-wrap gap-3 text-xs font-medium pt-3">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-lg">
                              <Users className="h-3.5 w-3.5" />
                              {room.max_persons} max
                            </span>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-background border rounded-lg">
                              <BedDouble className="h-3.5 w-3.5" />
                              {room.capacity_beds} lits
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              <TabsContent value="location" className="mt-0 focus-visible:outline-none pb-8 animate-in fade-in duration-300">
                <div className="flex flex-col gap-2 relative">
                  <div className="flex items-center gap-2 text-muted-foreground p-3 border rounded-xl bg-muted/10">
                    <MapPin className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span>
                      {experience.address ? `${(experience.address as any).street || ''} ` : ''}
                      {experience.city}, {experience.region ? `${experience.region}, ` : ''} {experience.country}
                    </span>
                  </div>
                  {/* Placeholder for map - in the future this would be a Google Map */}
                  <div className="w-full h-48 bg-muted rounded-2xl mt-4 flex items-center justify-center border relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Morocco&zoom=5&size=600x300&maptype=roadmap&sensor=false')] bg-cover opacity-20 dark:opacity-10 dark:invert" />
                    <Button variant="secondary" className="relative z-10 rounded-full shadow-md font-medium">
                      Voir sur la carte
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-0 focus-visible:outline-none pb-8 animate-in fade-in duration-300">
                <div className="text-center text-muted-foreground py-12 border rounded-2xl bg-muted/10">
                  Les avis seront bientôt disponibles.
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT COLUMN: Booking Sidebar */}
          <div className="lg:col-span-3 xl:col-span-2 hidden lg:block">
            <div className="sticky top-8">
              <Card className="shadow-lg border-muted/60 overflow-hidden">
                <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="flex flex-col">
                    <span className="text-sm font-normal text-muted-foreground mb-1">
                      {trip ? "Prochain départ" : "À partir de"}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold">{price}</span>
                      <span className="text-muted-foreground font-normal text-sm">
                        / {trip ? "pers." : "nuit"}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border rounded-xl p-3 bg-background hover:border-primary/50 transition-colors cursor-pointer">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">
                        Arrivée
                      </p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{departureDateStr}</span>
                      </div>
                    </div>
                    <div className="border rounded-xl p-3 bg-background hover:border-primary/50 transition-colors cursor-pointer">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">
                        Départ
                      </p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">--/--</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-xl p-3 bg-background hover:border-primary/50 transition-colors cursor-pointer">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase block mb-1">
                      Voyageurs
                    </p>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{maxCapacity > 0 ? `Max ${maxCapacity}` : "1 voyageur"}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-6 bg-muted/5">
                  <Button
                    className="w-full h-12 text-md rounded-xl shadow-md hover:shadow-lg transition-all"
                    size="lg"
                    onClick={() => openBooking(experience)}
                  >
                    Vérifier la disponibilité
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Sticky Booking Footer */}
      <div className="lg:hidden fixed bottom-16 sm:bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t z-50 flex items-center justify-between shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
        <div>
          <p className="text-sm font-medium text-muted-foreground">À partir de</p>
          <p className="text-lg font-bold">{price}</p>
        </div>
        <Button
          size="lg"
          className="rounded-full px-8 shadow-md"
          onClick={() => openBooking(experience)}
        >
          Réserver
        </Button>
      </div>

      <BookingModal />
    </div>
  );
}

"use client";

import {
  Bike,
  Calendar,
  ChevronDown,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSiteI18n } from "@/components/site/site-i18n";

interface SearchFilterBarProps {
  className?: string;
  onSearch?: (filters: {
    location: string;
    activity: string;
    date: string;
    guests: number;
  }) => void;
}

export function SearchFilterBar({ className, onSearch }: SearchFilterBarProps) {
  const { t } = useSiteI18n();
  const [location, _setLocation] = useState("");
  const [activity, _setActivity] = useState("");
  const [date, _setDate] = useState("");
  const [guests, _setGuests] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSearch = () => {
    onSearch?.({
      location,
      activity,
      date,
      guests,
    });
  };

  return (
    <div
      className={cn(
        "bg-[#1a1a1a] rounded-full p-2 transition-all duration-300",
        isExpanded ? "rounded-3xl" : "rounded-full",
        className,
      )}
    >
      {/* Desktop / Collapsed Mobile View */}
      <div className="flex items-center gap-1">
        {/* Location */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors flex-1 min-w-0"
        >
          <MapPin className="w-5 h-5 text-[#ff2566] shrink-0" />
          <div className="text-left min-w-0">
            <p className="text-xs text-gray-400">
              {t("explore.filters.location.label")}
            </p>
            <p className="text-sm text-white truncate">
              {location || t("explore.filters.location.defaultText")}
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 hidden sm:block" />

        {/* Activity - Desktop only */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden md:flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors"
        >
          <Bike className="w-5 h-5 text-[#ff2566] shrink-0" />
          <div className="text-left">
            <p className="text-xs text-gray-400">
              {t("explore.filters.activity.label")}
            </p>
            <p className="text-sm text-white">
              {activity || t("explore.filters.activity.defaultText")}
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 hidden md:block" />

        {/* When - Desktop only */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden lg:flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors"
        >
          <Calendar className="w-5 h-5 text-[#ff2566] shrink-0" />
          <div className="text-left">
            <p className="text-xs text-gray-400">
              {t("explore.filters.date.label")}
            </p>
            <p className="text-sm text-white">
              {date || t("explore.filters.date.empty")}
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-white/10 hidden lg:block" />

        {/* Guests - Desktop only */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="hidden xl:flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-full transition-colors"
        >
          <Users className="w-5 h-5 text-[#ff2566] shrink-0" />
          <div className="text-left">
            <p className="text-xs text-gray-400">
              {t("explore.filters.guests.label")}
            </p>
            <p className="text-sm text-white">
              {guests} {t("explore.filters.guests.label").toLowerCase()}
            </p>
          </div>
        </button>

        {/* Search Button */}
        <button
          type="button"
          onClick={handleSearch}
          className="w-12 h-12 bg-[#ff2566] hover:bg-[#e0205a] rounded-full flex items-center justify-center transition-colors shrink-0"
        >
          <Search className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Expanded Mobile View */}
      {isExpanded && (
        <div className="mt-4 px-4 pb-4 space-y-4 sm:hidden">
          <div className="flex items-center gap-3 py-2">
            <Bike className="w-5 h-5 text-[#ff2566] shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">
                {t("explore.filters.activity.label")}
              </p>
              <p className="text-sm text-white">
                {activity || t("explore.filters.activity.defaultText")}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-3 py-2">
            <Calendar className="w-5 h-5 text-[#ff2566] shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">
                {t("explore.filters.date.label")}
              </p>
              <p className="text-sm text-white">
                {date || t("explore.filters.date.empty")}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-3 py-2">
            <Users className="w-5 h-5 text-[#ff2566] shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-400">
                {t("explore.filters.guests.label")}
              </p>
              <p className="text-sm text-white">
                {guests} {t("explore.filters.guests.countOne")}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}
    </div>
  );
}

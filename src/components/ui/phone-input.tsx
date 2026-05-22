"use client";

import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js/min";
import type * as React from "react";
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PhoneCountry = CountryCode;

const PREFERRED_COUNTRIES: PhoneCountry[] = [
  "MA",
  "FR",
  "ES",
  "GB",
  "US",
  "CA",
  "DE",
  "IT",
  "BE",
  "NL",
];

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function getCountryName(country: PhoneCountry) {
  return countryNames.of(country) ?? country;
}

function buildCountryOptions() {
  const preferred = new Set(PREFERRED_COUNTRIES);
  const countries = getCountries() as PhoneCountry[];

  return countries
    .map((country) => ({
      country,
      dialCode: getCountryCallingCode(country),
      name: getCountryName(country),
      preferred: preferred.has(country),
    }))
    .sort((a, b) => {
      if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function normalizePhoneNumber(
  value: string,
  country: PhoneCountry,
): string | null {
  const parsed = parsePhoneNumberFromString(value, country);

  if (!parsed?.isValid()) return null;
  if (parsed.country && parsed.country !== country) return null;

  return parsed.number;
}

export function formatPhoneNumberInput(value: string, country: PhoneCountry) {
  return new AsYouType(country).input(value);
}

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "type" | "value" | "onChange"
> & {
  value: string;
  country: PhoneCountry;
  countryLabel: string;
  onValueChange: (value: string) => void;
  onCountryChange: (country: PhoneCountry) => void;
};

function PhoneInput({
  id,
  value,
  country,
  countryLabel,
  onValueChange,
  onCountryChange,
  className,
  placeholder,
  required,
  "aria-invalid": ariaInvalid,
  ...props
}: PhoneInputProps) {
  const countryOptions = useMemo(() => buildCountryOptions(), []);
  const selectedCountry = countryOptions.find(
    (option) => option.country === country,
  );

  return (
    <div
      className={cn(
        "border-input focus-within:border-ring focus-within:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex h-11 w-full overflow-hidden rounded-full border bg-muted/60 shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
        className,
      )}
      aria-invalid={ariaInvalid}
    >
      <Select
        value={country}
        onValueChange={(nextCountry) => {
          const typedCountry = nextCountry as PhoneCountry;
          onCountryChange(typedCountry);
          onValueChange(formatPhoneNumberInput(value, typedCountry));
        }}
      >
        <SelectTrigger
          id={id ? `${id}-country` : undefined}
          aria-label={countryLabel}
          className="h-full min-w-[108px] shrink-0 rounded-none border-0 border-r bg-transparent px-3 pr-3 shadow-none focus:ring-0 focus-visible:ring-0 sm:min-w-[116px]"
        >
          <SelectValue>
            {selectedCountry ? (
              <span className="flex min-w-0 items-center gap-1.5 leading-none">
                <span className="truncate font-medium">
                  +{selectedCountry.dialCode}
                </span>
              </span>
            ) : (
              country
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className="z-[220] max-h-[320px] w-[calc(100vw-2rem)] max-w-[360px] sm:w-[360px]"
          position="popper"
        >
          {countryOptions.map((option) => (
            <SelectItem
              key={option.country}
              value={option.country}
              textValue={`${option.name} +${option.dialCode}`}
            >
              <span className="flex-1 truncate">{option.name}</span>
              <span className="text-muted-foreground">+{option.dialCode}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        id={id}
        type="tel"
        value={value}
        onChange={(event) =>
          onValueChange(formatPhoneNumberInput(event.target.value, country))
        }
        placeholder={placeholder}
        autoComplete="tel"
        inputMode="tel"
        required={required}
        aria-invalid={ariaInvalid}
        className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 shadow-none focus-visible:ring-0"
        {...props}
      />
    </div>
  );
}

export { PhoneInput };

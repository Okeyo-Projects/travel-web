import { tool } from "ai";
import { z } from "zod";

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

function describeWeatherCode(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? "Unknown";
}

export const getWeather = tool({
  description: `Get current weather and a 7-day forecast for any city or location.
Use this when the user asks about weather conditions, temperature, rain, or climate at a destination.
The location argument must always use the English name of the city or location. Translate names supplied in French, Arabic, or any other language to English before calling this tool.
Supports any city worldwide but is especially useful for Moroccan destinations like Marrakech, Chefchaouen, Essaouira, Fès, Agadir, etc.`,
  inputSchema: z.object({
    location: z
      .string()
      .describe(
        'City or location name in English. Translate the user-provided name to English before calling this tool (e.g., "Londres" → "London", "Marrakech" → "Marrakech").',
      ),
    days: z
      .number()
      .min(1)
      .max(7)
      .optional()
      .default(3)
      .describe("Number of forecast days to return (1-7, default 3)"),
  }),
  execute: async ({ location, days = 3 }) => {
    try {
      // Step 1: Geocode the location
      const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
      const geocodeRes = await fetch(geocodeUrl);

      if (!geocodeRes.ok) {
        return {
          success: false,
          error: `Geocoding request failed (${geocodeRes.status})`,
        };
      }

      const geocodeData = (await geocodeRes.json()) as {
        results?: Array<{
          name: string;
          country: string;
          latitude: number;
          longitude: number;
          admin1?: string;
        }>;
      };

      if (!geocodeData.results || geocodeData.results.length === 0) {
        return {
          success: false,
          error: `Location "${location}" not found. Try a more specific city name.`,
        };
      }

      const place = geocodeData.results[0];

      // Step 2: Fetch weather
      const forecastDays = Math.min(Math.max(days, 1), 7);
      const weatherUrl =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${place.latitude}&longitude=${place.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max` +
        `&timezone=auto&forecast_days=${forecastDays}`;

      const weatherRes = await fetch(weatherUrl);

      if (!weatherRes.ok) {
        return {
          success: false,
          error: `Weather request failed (${weatherRes.status})`,
        };
      }

      const weatherData = (await weatherRes.json()) as {
        current: {
          time: string;
          temperature_2m: number;
          relative_humidity_2m: number;
          apparent_temperature: number;
          weather_code: number;
          wind_speed_10m: number;
          precipitation: number;
        };
        daily: {
          time: string[];
          weather_code: number[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_sum: number[];
          wind_speed_10m_max: number[];
        };
      };

      const current = weatherData.current;
      const daily = weatherData.daily;

      const forecast = daily.time.map((date, i) => ({
        date,
        condition: describeWeatherCode(daily.weather_code[i]),
        temp_max_c: Math.round(daily.temperature_2m_max[i]),
        temp_min_c: Math.round(daily.temperature_2m_min[i]),
        precipitation_mm: daily.precipitation_sum[i],
        wind_speed_kmh: Math.round(daily.wind_speed_10m_max[i]),
      }));

      return {
        success: true,
        location: {
          name: place.name,
          country: place.country,
          region: place.admin1 ?? null,
        },
        current: {
          condition: describeWeatherCode(current.weather_code),
          temperature_c: Math.round(current.temperature_2m),
          feels_like_c: Math.round(current.apparent_temperature),
          humidity_pct: current.relative_humidity_2m,
          wind_speed_kmh: Math.round(current.wind_speed_10m),
          precipitation_mm: current.precipitation,
        },
        forecast,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

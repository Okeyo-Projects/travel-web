import { tool } from 'ai';
import { z } from 'zod';

const requestLocationSchema = z.object({
  reason: z.string().describe('Explanation of why location is needed (e.g., "to find experiences near you", "to calculate distances")'),
});

export const requestUserLocation = tool({
  description: `Request the user's location to enable distance-based search and recommendations.
Use this when the user asks for nearby experiences or wants to sort by distance.
This returns a special marker that the frontend will interpret to show a location permission request.`,
  inputSchema: requestLocationSchema,
  execute: async ({ reason }) => {
    // This tool returns a special marker that the frontend will interpret
    // The frontend will show a location permission dialog and send the coordinates back
    return {
      type: 'location_request',
      reason,
      message: `I'd like to access your location ${reason}. This will help me show you the most relevant experiences based on your location.`,
    };
  },
});

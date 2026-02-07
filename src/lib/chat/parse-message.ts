/**
 * Parse message content to extract UI blocks and text
 * UI blocks are in the format: ```ui:component_name { json }```
 */

export interface ParsedContent {
  type: 'text' | 'ui';
  content: any;
}

export function parseMessageContent(content: string): ParsedContent[] {
  const result: ParsedContent[] = [];
  
  // Regular expression to match UI blocks: ```ui:component_name { ... }```
  const uiBlockRegex = /```ui:(\w+)\s*(\{[\s\S]*?\})\s*```/g;
  
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = uiBlockRegex.exec(content)) !== null) {
    // Add text before the UI block
    if (match.index > lastIndex) {
      const textContent = content.substring(lastIndex, match.index).trim();
      if (textContent) {
        result.push({
          type: 'text',
          content: textContent,
        });
      }
    }
    
    // Parse and add the UI block
    try {
      const componentName = match[1];
      const jsonData = JSON.parse(match[2]);
      
      result.push({
        type: 'ui',
        content: {
          component: componentName,
          data: jsonData,
        },
      });
    } catch (error) {
      console.error('Failed to parse UI block:', error);
      // If parsing fails, treat it as text
      result.push({
        type: 'text',
        content: match[0],
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last UI block
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex).trim();
    if (textContent) {
      result.push({
        type: 'text',
        content: textContent,
      });
    }
  }
  
  // If no UI blocks were found, return the entire content as text
  if (result.length === 0 && content.trim()) {
    result.push({
      type: 'text',
      content: content.trim(),
    });
  }
  
  return result;
}

/**
 * Extract location request from tool response
 */
export function isLocationRequest(data: any): boolean {
  return data?.type === 'location_request';
}

/**
 * Format experience card data for display
 */
export function formatExperienceForCard(experience: any) {
  return {
    id: experience.id,
    title: experience.title,
    description: experience.short_description || experience.description,
    type: experience.type,
    city: experience.city,
    region: experience.region,
    price_mad: experience.price_mad || experience.price_cents / 100,
    currency: experience.currency || 'MAD',
    rating: experience.avg_rating || experience.rating,
    reviews_count: experience.reviews_count || 0,
    distance_km: experience.distance_km,
    has_promo: experience.has_promo,
    promo_badge: experience.promo_badge,
    thumbnail_url: experience.thumbnail_url,
    host_name: experience.host_name,
  };
}

// Address utility functions for Google Maps integration
// Used by Bubbles AI and other components

export const extractAddressFromText = (text) => {
  // Common address patterns
  const addressPatterns = [
    // Street address patterns
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl)\b/gi,
    // City, State patterns
    /[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi,
    // Full address patterns
    /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl)[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/gi
  ];

  const addresses = [];
  
  addressPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      addresses.push(...matches.map(match => match.trim()));
    }
  });

  return [...new Set(addresses)]; // Remove duplicates
};

export const formatAddressForDisplay = (address) => {
  if (!address) return '';
  
  // Clean up common formatting issues
  return address
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/,\s*,/g, ',') // Remove double commas
    .trim();
};

export const validateAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  
  // Basic validation - should contain at least a number and street name
  const hasNumber = /\d+/.test(address);
  const hasStreet = /(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl)/i.test(address);
  
  return hasNumber && hasStreet;
};

export const getAddressComponents = (address) => {
  if (!address) return null;
  
  // Try to parse address components
  const parts = address.split(',').map(part => part.trim());
  
  if (parts.length >= 2) {
    return {
      street: parts[0],
      city: parts[1],
      state: parts[2]?.split(' ')[0] || '',
      zip: parts[2]?.split(' ')[1] || ''
    };
  }
  
  return {
    street: address,
    city: '',
    state: '',
    zip: ''
  };
};

export const isAddressQuery = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  const addressKeywords = [
    'address', 'location', 'where', 'site', 'property', 'building',
    'street', 'avenue', 'road', 'drive', 'lane', 'boulevard',
    'city', 'state', 'zip', 'postal'
  ];
  
  const lowerText = text.toLowerCase();
  return addressKeywords.some(keyword => lowerText.includes(keyword));
};

export const enhanceAddressQuery = (text) => {
  if (!isAddressQuery(text)) return text;
  
  // Add context for better Google Maps results
  const enhancedText = text + ' United States';
  return enhancedText;
};

export const getAddressSuggestions = async (query, apiKey) => {
  if (!apiKey || !query) return [];
  
  try {
    // This would be used with Google Places API
    // For now, return a mock response
    return [
      {
        formatted_address: `${query}, United States`,
        place_id: 'mock_place_id',
        geometry: {
          location: {
            lat: 39.7392,
            lng: -104.9903
          }
        }
      }
    ];
  } catch (error) {
    console.error('Error getting address suggestions:', error);
    return [];
  }
};

export default {
  extractAddressFromText,
  formatAddressForDisplay,
  validateAddress,
  getAddressComponents,
  isAddressQuery,
  enhanceAddressQuery,
  getAddressSuggestions
};

import React, { useEffect, useRef, useState } from 'react';

const GoogleMapsAutocomplete = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Enter address",
  className = "",
  disabled = false,
  required = false,
  name = "address",
  id = null
}) => {
  const inputRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    // Initialize Places API (New) REST endpoints
    loadGoogleMapsAPI();
  }, []);

  const loadGoogleMapsAPI = () => {
    const apiKey = 'AIzaSyC3KmPaCtYwN4n0G0m7ZVK3wXm_zu-nar0';
    
    console.log('🔍 GOOGLE MAPS DEBUG: Starting Google Maps API load');
    console.log('🔍 GOOGLE MAPS DEBUG: API Key exists:', !!apiKey);
    console.log('🔍 GOOGLE MAPS DEBUG: API Key value:', apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined');
    console.log('🔍 GOOGLE MAPS DEBUG: All env vars:', Object.keys(process.env).filter(key => key.includes('GOOGLE')));
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      console.warn('REACT_APP_GOOGLE_MAPS_API_KEY environment variable is required');
      console.error('🔍 GOOGLE MAPS DEBUG: API key is missing or undefined');
      return;
    }

    // For Places API (New), we don't need to load the JavaScript API
    // We'll use the REST API endpoints directly
    console.log('🔍 GOOGLE MAPS DEBUG: Using Places API (New) REST endpoints');
    setIsLoaded(true);
    initializeAutocomplete();
  };

  const initializeAutocomplete = () => {
    console.log('🔍 GOOGLE MAPS DEBUG: Initializing Places API (New) REST endpoints');
    console.log('🔍 GOOGLE MAPS DEBUG: inputRef.current exists:', !!inputRef.current);
    
    if (!inputRef.current) {
      console.error('🔍 GOOGLE MAPS DEBUG: Input ref not available');
      return;
    }

    try {
      console.log('🔍 GOOGLE MAPS DEBUG: Places API (New) REST endpoints ready');
      // No need to initialize services - we'll use REST API directly
    } catch (err) {
      console.error('Error initializing Places API (New):', err);
      setError('Failed to initialize address autocomplete');
    }
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    onChange(e);
    setError(null);
    
    if (query.length > 2) {
      // Use Places API (New) REST endpoint for autocomplete
      fetchAutocompleteSuggestions(query);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const fetchAutocompleteSuggestions = async (query) => {
    const apiKey = 'AIzaSyC3KmPaCtYwN4n0G0m7ZVK3wXm_zu-nar0';
    
    if (!apiKey) {
      console.error('🔍 GOOGLE MAPS DEBUG: API key not found');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    try {
      console.log('🔍 GOOGLE MAPS DEBUG: Fetching suggestions from Google Places API (New)');
      console.log('🔍 GOOGLE MAPS DEBUG: API Key present:', !!apiKey);
      
      const response = await fetch(
        `https://places.googleapis.com/v1/places:autocomplete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.structuredFormat.mainText,suggestions.placePrediction.structuredFormat.secondaryText'
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: ['US'],
            languageCode: 'en',
            regionCode: 'US'
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 GOOGLE MAPS DEBUG: Google Places API response:', data);
        
        if (data.suggestions && data.suggestions.length > 0) {
          // Transform the response to match our expected format
          const transformedSuggestions = data.suggestions.map(suggestion => {
            console.log('🔍 GOOGLE MAPS DEBUG: Raw suggestion:', suggestion);
            console.log('🔍 GOOGLE MAPS DEBUG: placePrediction:', suggestion.placePrediction);
            console.log('🔍 GOOGLE MAPS DEBUG: text field:', suggestion.placePrediction?.text);
            
            return {
              place_id: suggestion.placePrediction?.placeId,
              description: typeof suggestion.placePrediction?.text === 'string' 
                ? suggestion.placePrediction.text 
                : suggestion.placePrediction?.text?.text || '',
              structured_formatting: {
                main_text: typeof suggestion.placePrediction?.text === 'string' 
                  ? suggestion.placePrediction.text 
                  : suggestion.placePrediction?.text?.text || '',
                secondary_text: suggestion.placePrediction?.structuredFormat?.secondaryText || ''
              }
            };
          });
          
          setSuggestions(transformedSuggestions);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        const errorText = await response.text();
        console.error('🔍 GOOGLE MAPS DEBUG: Google Places API error:', response.status, response.statusText);
        console.error('🔍 GOOGLE MAPS DEBUG: Error response:', errorText);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('🔍 GOOGLE MAPS DEBUG: Places API (New) fetch error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const formattedAddress = suggestion.description;
    onChange({ target: { name, value: formattedAddress } });
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Get place details using Places API (New)
    if (suggestion.place_id) {
      fetchPlaceDetails(suggestion.place_id);
    }
  };

  const fetchPlaceDetails = async (placeId) => {
    const apiKey = 'AIzaSyC3KmPaCtYwN4n0G0m7ZVK3wXm_zu-nar0';
    
    try {
      console.log('🔍 GOOGLE MAPS DEBUG: Fetching place details from Google Places API (New)');
      
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'formattedAddress,location,addressComponents,id,types'
          }
        }
      );

      if (response.ok) {
        const place = await response.json();
        console.log('🔍 GOOGLE MAPS DEBUG: Place details response:', place);
        console.log('🔍 GOOGLE MAPS DEBUG: Address components:', place.addressComponents);
        if (place.addressComponents) {
          console.log('🔍 GOOGLE MAPS DEBUG: All address components:', place.addressComponents);
          place.addressComponents.forEach((component, index) => {
            console.log(`🔍 GOOGLE MAPS DEBUG: Component ${index}:`, component);
          });
        }
        
        // Parse address components to extract specific fields
        const parsedComponents = {};
        if (place.addressComponents) {
          place.addressComponents.forEach(component => {
            if (component.types) {
              component.types.forEach(type => {
                if (type === 'postal_code') {
                  parsedComponents.postal_code = component.longText;
                } else if (type === 'locality') {
                  parsedComponents.locality = component.longText;
                } else if (type === 'administrative_area_level_1') {
                  parsedComponents.administrative_area_level_1 = component.longText;
                } else if (type === 'country') {
                  parsedComponents.country = component.longText;
                } else if (type === 'street_number') {
                  parsedComponents.street_number = component.longText;
                } else if (type === 'route') {
                  parsedComponents.route = component.longText;
                }
              });
            }
          });
        }
        
        console.log('🔍 GOOGLE MAPS DEBUG: Parsed components:', parsedComponents);
        console.log('🔍 GOOGLE MAPS DEBUG: Postal code found:', parsedComponents.postal_code);

        if (onPlaceSelect) {
          onPlaceSelect({
            formattedAddress: place.formattedAddress,
            geometry: {
              location: place.location
            },
            addressComponents: parsedComponents,
            placeId: place.id,
            name: place.name,
            types: place.types
          });
        }
      } else {
        const errorText = await response.text();
        console.error('🔍 GOOGLE MAPS DEBUG: Place details error:', response.status, response.statusText);
        console.error('🔍 GOOGLE MAPS DEBUG: Error response:', errorText);
      }
    } catch (error) {
      console.error('🔍 GOOGLE MAPS DEBUG: Place details fetch error:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        name={name}
        id={id || name}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
        } ${className}`}
        autoComplete="off"
      />
      
      {/* Address Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {typeof suggestion.structured_formatting?.main_text === 'string' 
                      ? suggestion.structured_formatting.main_text 
                      : suggestion.description || ''}
                  </div>
                  {suggestion.structured_formatting?.secondary_text && typeof suggestion.structured_formatting.secondary_text === 'string' && (
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.structured_formatting.secondary_text}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!isLoaded && !error && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      
      {isLoaded && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsAutocomplete;
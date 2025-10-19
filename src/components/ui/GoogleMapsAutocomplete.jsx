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
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    // Check if Google Maps API is available
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      initializeAutocomplete();
    } else {
      // Load Google Maps API if not already loaded
      loadGoogleMapsAPI();
    }
  }, []);

  const loadGoogleMapsAPI = () => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
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

    // Check if script is already loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Script exists, wait for it to load
      const checkGoogleMaps = () => {
        if (window.google && window.google.maps && window.google.maps.places) {
          setIsLoaded(true);
          initializeAutocomplete();
        } else {
          setTimeout(checkGoogleMaps, 100);
        }
      };
      checkGoogleMaps();
      return;
    }

    // Load Google Maps API with Places API (New) support
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=3.56`;
    script.async = true;
    script.defer = true;
    
    console.log('🔍 GOOGLE MAPS DEBUG: Creating script with URL:', script.src);
    
    script.onload = () => {
      console.log('🔍 GOOGLE MAPS DEBUG: Script loaded successfully');
      console.log('🔍 GOOGLE MAPS DEBUG: window.google exists:', !!window.google);
      console.log('🔍 GOOGLE MAPS DEBUG: window.google.maps exists:', !!(window.google && window.google.maps));
      console.log('🔍 GOOGLE MAPS DEBUG: window.google.maps.places exists:', !!(window.google && window.google.maps && window.google.maps.places));
      setIsLoaded(true);
      initializeAutocomplete();
    };
    script.onerror = (error) => {
      console.error('🔍 GOOGLE MAPS DEBUG: Script failed to load:', error);
      setError('Failed to load Google Maps API');
    };
    document.head.appendChild(script);
  };

  const initializeAutocomplete = () => {
    console.log('🔍 GOOGLE MAPS DEBUG: Initializing Places API (New) autocomplete');
    console.log('🔍 GOOGLE MAPS DEBUG: inputRef.current exists:', !!inputRef.current);
    console.log('🔍 GOOGLE MAPS DEBUG: window.google exists:', !!window.google);
    console.log('🔍 GOOGLE MAPS DEBUG: window.google.maps exists:', !!(window.google && window.google.maps));
    console.log('🔍 GOOGLE MAPS DEBUG: window.google.maps.places exists:', !!(window.google && window.google.maps && window.google.maps.places));
    
    if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
      console.error('🔍 GOOGLE MAPS DEBUG: Missing required components for autocomplete initialization');
      return;
    }

    try {
      console.log('🔍 GOOGLE MAPS DEBUG: Creating AutocompleteService and PlacesService');
      
      // Initialize AutocompleteService for getting suggestions
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      
      // Initialize PlacesService for getting place details
      placesServiceRef.current = new window.google.maps.places.PlacesService(
        document.createElement('div') // Dummy div for PlacesService
      );
      
      console.log('🔍 GOOGLE MAPS DEBUG: Services created successfully');
    } catch (err) {
      console.error('Error initializing Google Maps autocomplete services:', err);
      setError('Failed to initialize address autocomplete');
    }
  };

  const handleInputChange = (e) => {
    const query = e.target.value;
    onChange(e);
    setError(null);
    
    if (query.length > 2 && autocompleteServiceRef.current) {
      // Get autocomplete predictions
      autocompleteServiceRef.current.getPlacePredictions({
        input: query,
        types: ['address'],
        componentRestrictions: { country: 'us' }
      }, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const formattedAddress = suggestion.description;
    onChange({ target: { name, value: formattedAddress } });
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Get place details
    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails({
        placeId: suggestion.place_id,
        fields: ['formatted_address', 'geometry', 'address_components', 'place_id', 'name', 'types']
      }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          if (onPlaceSelect) {
            onPlaceSelect({
              formattedAddress: place.formatted_address,
              geometry: place.geometry,
              addressComponents: place.address_components,
              placeId: place.place_id,
              name: place.name,
              types: place.types
            });
          }
        }
      });
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
                    {suggestion.structured_formatting?.main_text || suggestion.description}
                  </div>
                  {suggestion.structured_formatting?.secondary_text && (
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

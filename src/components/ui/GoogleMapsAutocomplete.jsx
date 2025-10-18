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
  const autocompleteRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

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
    const apiKey = 'AIzaSyBL-BzpAUPd-Deu8LndaoQO367iokdlehM';

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

    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
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
    console.log('🔍 GOOGLE MAPS DEBUG: Initializing autocomplete');
    console.log('🔍 GOOGLE MAPS DEBUG: inputRef.current exists:', !!inputRef.current);
    console.log('🔍 GOOGLE MAPS DEBUG: window.google exists:', !!window.google);
    console.log('🔍 GOOGLE MAPS DEBUG: window.google.maps exists:', !!(window.google && window.google.maps));
    console.log('🔍 GOOGLE MAPS DEBUG: window.google.maps.places exists:', !!(window.google && window.google.maps && window.google.maps.places));
    
    if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
      console.error('🔍 GOOGLE MAPS DEBUG: Missing required components for autocomplete initialization');
      return;
    }

    try {
      console.log('🔍 GOOGLE MAPS DEBUG: Creating Autocomplete instance');
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
        fields: ['formatted_address', 'geometry', 'address_components', 'place_id']
      });
      console.log('🔍 GOOGLE MAPS DEBUG: Autocomplete instance created successfully');

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        
        if (place.formatted_address) {
          const formattedAddress = place.formatted_address;
          onChange({ target: { name, value: formattedAddress } });
          
          if (onPlaceSelect) {
            onPlaceSelect({
              formattedAddress,
              geometry: place.geometry,
              addressComponents: place.address_components,
              placeId: place.place_id
            });
          }
        }
      });
    } catch (err) {
      console.error('Error initializing Google Maps autocomplete:', err);
      setError('Failed to initialize address autocomplete');
    }
  };

  const handleInputChange = (e) => {
    onChange(e);
    setError(null);
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
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
        } ${className}`}
        autoComplete="off"
      />
      
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

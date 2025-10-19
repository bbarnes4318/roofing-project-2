import React, { useEffect, useRef, useState } from 'react';

const GoogleAddressSelector = ({ 
  onAddressSelect, 
  initialAddress = '', 
  placeholder = 'Enter address',
  className = '',
  style = {}
}) => {
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [addressComponents, setAddressComponents] = useState({});

  useEffect(() => {
    const loadGoogleMapsExtendedLibrary = async () => {
      try {
        // Load the Google Maps Extended Component Library
        const script = document.createElement('script');
        script.type = 'module';
        script.innerHTML = `
          import {APILoader} from 'https://ajax.googleapis.com/ajax/libs/@googlemaps/extended-component-library/0.6.11/index.min.js';
          
          window.googleMapsExtended = { APILoader };
          window.dispatchEvent(new CustomEvent('googleMapsExtendedLoaded'));
        `;
        
        // Hardcode the API key
        window.REACT_APP_GOOGLE_MAPS_API_KEY = 'AIzaSyC3KmPaCtYwN4n0G0m7ZVK3wXm_zu-nar0';
        document.head.appendChild(script);

        // Wait for the library to load
        await new Promise((resolve) => {
          window.addEventListener('googleMapsExtendedLoaded', resolve, { once: true });
        });

        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load Google Maps Extended Library:', error);
      }
    };

    loadGoogleMapsExtendedLibrary();
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    const initializeAddressSelector = async () => {
      try {
        const { APILoader } = window.googleMapsExtended;
        const { Autocomplete } = await APILoader.importLibrary('places');

        const input = containerRef.current.querySelector('#address-input');
        if (!input) return;

        const autocomplete = new Autocomplete(input, {
          fields: ['address_components', 'geometry', 'name', 'formatted_address'],
          types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          
          if (!place.geometry) {
            console.warn('No details available for input:', place.name);
            return;
          }

          // Extract address components
          const components = {};
          if (place.address_components) {
            place.address_components.forEach(component => {
              const type = component.types[0];
              components[type] = component.long_name;
              components[`${type}_short`] = component.short_name;
            });
          }

          const addressData = {
            formatted_address: place.formatted_address,
            geometry: place.geometry,
            name: place.name,
            components: components,
            place_id: place.place_id
          };

          setAddressComponents(components);
          setAddress(place.formatted_address);
          
          if (onAddressSelect) {
            onAddressSelect(addressData);
          }
        });

      } catch (error) {
        console.error('Failed to initialize address selector:', error);
      }
    };

    initializeAddressSelector();
  }, [isLoaded, onAddressSelect]);

  return (
    <div className={`google-address-selector ${className}`} style={style}>
      <style jsx>{`
        .google-address-selector {
          position: relative;
          width: 100%;
        }
        
        .address-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        
        .address-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .address-input::placeholder {
          color: #9ca3af;
        }
        
        .loading-indicator {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: translateY(-50%) rotate(0deg); }
          100% { transform: translateY(-50%) rotate(360deg); }
        }
        
        .address-details {
          margin-top: 8px;
          padding: 8px 12px;
          background-color: #f9fafb;
          border-radius: 6px;
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>
      
      <div ref={containerRef} className="relative">
        <input
          id="address-input"
          type="text"
          placeholder={placeholder}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="address-input"
          disabled={!isLoaded}
        />
        
        {!isLoaded && (
          <div className="loading-indicator"></div>
        )}
      </div>
      
      {Object.keys(addressComponents).length > 0 && (
        <div className="address-details">
          <strong>Selected Address:</strong> {address}
          {addressComponents.street_number && addressComponents.route && (
            <div>Street: {addressComponents.street_number} {addressComponents.route}</div>
          )}
          {addressComponents.locality && (
            <div>City: {addressComponents.locality}</div>
          )}
          {addressComponents.administrative_area_level_1 && (
            <div>State: {addressComponents.administrative_area_level_1}</div>
          )}
          {addressComponents.postal_code && (
            <div>ZIP: {addressComponents.postal_code}</div>
          )}
          {addressComponents.country && (
            <div>Country: {addressComponents.country}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleAddressSelector;

import React, { useEffect, useRef, useState } from 'react';

const GoogleAddressSelectorWithMap = ({ 
  onAddressSelect, 
  initialAddress = '', 
  placeholder = 'Enter address',
  className = '',
  style = {},
  showMap = true,
  mapHeight = '400px'
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [address, setAddress] = useState(initialAddress);
  const [addressComponents, setAddressComponents] = useState({});
  const [selectedPlace, setSelectedPlace] = useState(null);

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
          setSelectedPlace(place);
          
          // Update map if available
          if (showMap && mapRef.current && place.geometry && place.geometry.location) {
            updateMap(place.geometry.location);
          }
          
          if (onAddressSelect) {
            onAddressSelect(addressData);
          }
        });

      } catch (error) {
        console.error('Failed to initialize address selector:', error);
      }
    };

    initializeAddressSelector();
  }, [isLoaded, onAddressSelect, showMap]);

  const updateMap = (location) => {
    if (!mapRef.current) return;
    
    try {
      // Update map center
      mapRef.current.center = location;
      
      // Update marker position
      if (markerRef.current) {
        markerRef.current.position = location;
      }
    } catch (error) {
      console.error('Failed to update map:', error);
    }
  };

  return (
    <div className={`google-address-selector-with-map ${className}`} style={style}>
      <style jsx>{`
        .google-address-selector-with-map {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }
        
        .address-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
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
        
        .address-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 12px;
          background-color: #f9fafb;
          border-radius: 8px;
          font-size: 12px;
        }
        
        .address-detail-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .address-detail-label {
          font-weight: 500;
          color: #374151;
        }
        
        .address-detail-value {
          color: #6b7280;
        }
        
        .map-container {
          width: 100%;
          height: ${mapHeight};
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        
        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #6b7280;
        }
        
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (min-width: 768px) {
          .google-address-selector-with-map {
            flex-direction: row;
          }
          
          .address-section {
            flex: 1;
            min-width: 300px;
          }
          
          .map-container {
            flex: 1;
            min-width: 300px;
          }
        }
      `}</style>
      
      <div className="address-section">
        <div ref={containerRef}>
          <input
            id="address-input"
            type="text"
            placeholder={placeholder}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="address-input"
            disabled={!isLoaded}
          />
        </div>
        
        {Object.keys(addressComponents).length > 0 && (
          <div className="address-details">
            <div className="address-detail-item">
              <span className="address-detail-label">Street</span>
              <span className="address-detail-value">
                {addressComponents.street_number} {addressComponents.route}
              </span>
            </div>
            <div className="address-detail-item">
              <span className="address-detail-label">City</span>
              <span className="address-detail-value">{addressComponents.locality}</span>
            </div>
            <div className="address-detail-item">
              <span className="address-detail-label">State</span>
              <span className="address-detail-value">{addressComponents.administrative_area_level_1}</span>
            </div>
            <div className="address-detail-item">
              <span className="address-detail-label">ZIP</span>
              <span className="address-detail-value">{addressComponents.postal_code}</span>
            </div>
            <div className="address-detail-item">
              <span className="address-detail-label">Country</span>
              <span className="address-detail-value">{addressComponents.country}</span>
            </div>
            <div className="address-detail-item">
              <span className="address-detail-label">Full Address</span>
              <span className="address-detail-value">{address}</span>
            </div>
          </div>
        )}
      </div>
      
      {showMap && (
        <div className="map-container">
          {!isLoaded ? (
            <div className="loading-indicator">
              <div className="spinner"></div>
              Loading Google Maps...
            </div>
          ) : (
            <gmp-map 
              ref={mapRef}
              center={{lat: 37.4221, lng: -122.0841}}
              zoom="11"
              map-id="DEMO_MAP_ID"
            >
              <gmp-advanced-marker ref={markerRef}></gmp-advanced-marker>
            </gmp-map>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleAddressSelectorWithMap;

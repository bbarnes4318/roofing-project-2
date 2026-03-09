import React, { useEffect, useRef } from 'react';

const GoogleMapModal = ({ isOpen, onClose, address }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !address || !mapRef.current) return;

    // Load Google Maps API
    const loadGoogleMaps = async () => {
      try {
        const apiKey = 'AIzaSyC3KmPaCtYwN4n0G0m7ZVK3wXm_zu-nar0';
        
        // Check if Google Maps is already loaded
        if (window.google && window.google.maps) {
          initializeMap();
          return;
        }

        // Load the script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    const initializeMap = () => {
      if (!window.google || !window.google.maps) {
        console.error('Google Maps not loaded');
        return;
      }

      // Use Geocoding API to get coordinates from address
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          
          // Create map
          mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
            center: location,
            zoom: 17,
            mapTypeId: 'satellite',
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
              position: window.google.maps.ControlPosition.TOP_CENTER,
              mapTypeIds: ['roadmap', 'satellite', 'hybrid']
            },
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
          });

          // Add marker
          new window.google.maps.Marker({
            map: mapInstanceRef.current,
            position: location,
            title: address,
            animation: window.google.maps.Animation.DROP,
          });

          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `<div style="padding: 8px;"><strong>Project Location</strong><br/>${address}</div>`,
          });
          
          const marker = new window.google.maps.Marker({
            map: mapInstanceRef.current,
            position: location,
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstanceRef.current, marker);
          });

        } else {
          console.error('Geocoding failed:', status);
        }
      });
    };

    loadGoogleMaps();

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, address]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Project Location</h2>
              <p className="text-blue-100 mt-1 text-sm">{address}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 p-4">
          <div 
            ref={mapRef} 
            className="w-full h-full rounded-xl border-2 border-gray-200"
            style={{ minHeight: '500px' }}
          />
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
            >
              Open in Google Maps →
            </a>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapModal;


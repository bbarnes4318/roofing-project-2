import React, { useState } from 'react';
import GoogleAddressSelector from './GoogleAddressSelector';
import GoogleAddressSelectorWithMap from './GoogleAddressSelectorWithMap';

const AddressField = ({ 
  name = 'address',
  value = '',
  onChange,
  placeholder = 'Enter address',
  showMap = false,
  mapHeight = '300px',
  className = '',
  style = {},
  label = 'Address',
  required = false,
  error = null
}) => {
  const [addressData, setAddressData] = useState(null);

  const handleAddressSelect = (data) => {
    setAddressData(data);
    
    // Call the parent onChange with the formatted address
    if (onChange) {
      onChange({
        target: {
          name: name,
          value: data.formatted_address
        }
      });
    }
  };

  const AddressComponent = showMap ? GoogleAddressSelectorWithMap : GoogleAddressSelector;

  return (
    <div className={`address-field ${className}`} style={style}>
      <style jsx>{`
        .address-field {
          width: 100%;
        }
        
        .field-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }
        
        .field-label.required::after {
          content: ' *';
          color: #ef4444;
        }
        
        .field-error {
          margin-top: 4px;
          color: #ef4444;
          font-size: 12px;
        }
      `}</style>
      
      {label && (
        <label className={`field-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      
      <AddressComponent
        onAddressSelect={handleAddressSelect}
        initialAddress={value}
        placeholder={placeholder}
        showMap={showMap}
        mapHeight={mapHeight}
      />
      
      {error && (
        <div className="field-error">
          {error}
        </div>
      )}
      
      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={value}
      />
    </div>
  );
};

export default AddressField;

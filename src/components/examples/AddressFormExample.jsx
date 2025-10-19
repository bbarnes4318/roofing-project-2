import React, { useState } from 'react';
import AddressField from '../ui/AddressField';

const AddressFormExample = () => {
  const [formData, setFormData] = useState({
    projectAddress: '',
    companyAddress: '',
    customerAddress: ''
  });

  const [showMap, setShowMap] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <style jsx>{`
        .form-container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          padding: 24px;
        }
        
        .form-title {
          font-size: 24px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 24px;
        }
        
        .form-section {
          margin-bottom: 32px;
        }
        
        .section-title {
          font-size: 18px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        
        @media (min-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        
        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }
        
        .btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background-color: #3b82f6;
          color: white;
          border: none;
        }
        
        .btn-primary:hover {
          background-color: #2563eb;
        }
        
        .btn-secondary {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }
        
        .btn-secondary:hover {
          background-color: #e5e7eb;
        }
        
        .toggle-container {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .toggle {
          position: relative;
          width: 44px;
          height: 24px;
          background-color: #d1d5db;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .toggle.active {
          background-color: #3b82f6;
        }
        
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background-color: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        
        .toggle.active .toggle-thumb {
          transform: translateX(20px);
        }
      `}</style>
      
      <div className="form-container">
        <h1 className="form-title">Address Selection Examples</h1>
        
        <form onSubmit={handleSubmit}>
          {/* Toggle for map display */}
          <div className="toggle-container">
            <div 
              className={`toggle ${showMap ? 'active' : ''}`}
              onClick={() => setShowMap(!showMap)}
            >
              <div className="toggle-thumb"></div>
            </div>
            <span>Show map with address selection</span>
          </div>
          
          <div className="form-grid">
            {/* Project Address */}
            <div className="form-section">
              <h3 className="section-title">Project Address</h3>
              <AddressField
                name="projectAddress"
                value={formData.projectAddress}
                onChange={handleInputChange}
                placeholder="Enter project address"
                label="Project Address"
                required
                showMap={showMap}
                mapHeight="300px"
              />
            </div>
            
            {/* Company Address */}
            <div className="form-section">
              <h3 className="section-title">Company Address</h3>
              <AddressField
                name="companyAddress"
                value={formData.companyAddress}
                onChange={handleInputChange}
                placeholder="Enter company address"
                label="Company Address"
                showMap={showMap}
                mapHeight="300px"
              />
            </div>
            
            {/* Customer Address */}
            <div className="form-section">
              <h3 className="section-title">Customer Address</h3>
              <AddressField
                name="customerAddress"
                value={formData.customerAddress}
                onChange={handleInputChange}
                placeholder="Enter customer address"
                label="Customer Address"
                showMap={showMap}
                mapHeight="300px"
              />
            </div>
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Addresses
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressFormExample;

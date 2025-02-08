// Update CustomLocationSelect.jsx
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const CustomLocationSelect = ({ 
  selectedLocation, 
  onLocationChange, 
  LOCATIONS 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (locationKey, isTruck = false) => {
    onLocationChange(isTruck ? `${locationKey}-truck` : locationKey);
    setIsOpen(false);
  };

  const getDisplayName = () => {
    if (!selectedLocation) return 'Select Location';
    
    const isTruck = selectedLocation.includes('-truck');
    const baseLocation = isTruck ? selectedLocation.split('-truck')[0] : selectedLocation;
    const location = LOCATIONS[baseLocation];
    
    return isTruck 
      ? `${location.name} (Truck Inventory)` 
      : location.name;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px',
        fontWeight: '500',
        color: '#374151'
      }}>
        Location
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          width: '100%', 
          padding: '10px 12px', 
          borderRadius: '6px', 
          border: '1px solid #D1D5DB',
          backgroundColor: 'white',
          color: '#1F2937',
          fontSize: '14px',
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{getDisplayName()}</span>
        <ChevronDown size={16} color="#6B7280" />
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          zIndex: 10,
          width: '100%',
          marginTop: '4px',
          backgroundColor: 'white',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ padding: '8px' }}>
            <div style={{ 
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6B7280'
            }}>
              Branch Locations
            </div>
            {Object.entries(LOCATIONS).map(([key, location]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                style={{
                  width: '100%',
                  padding: '8px',
                  textAlign: 'left',
                  backgroundColor: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#1F2937'
                }}
              >
                <img src={location.icon} alt="" style={{ width: '20px', height: '20px' }} />
                {location.name}
              </button>
            ))}
            
            <div style={{ 
              padding: '4px 8px',
              marginTop: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6B7280'
            }}>
              Truck Inventory
            </div>
            {Object.entries(LOCATIONS).map(([key, location]) => (
              <button
                key={`${key}-truck`}
                type="button"
                onClick={() => handleSelect(key, true)}
                style={{
                  width: '100%',
                  padding: '8px',
                  textAlign: 'left',
                  backgroundColor: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#1F2937'
                }}
              >
                <img src={location.icon} alt="" style={{ width: '20px', height: '20px' }} />
                {location.name} (Truck Inventory)
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomLocationSelect;
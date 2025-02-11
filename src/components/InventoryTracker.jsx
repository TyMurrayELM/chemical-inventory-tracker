import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
import nLogo from '../assets/icons/n.png';
import swLogo from '../assets/icons/sw.png';
import seLogo from '../assets/icons/se.png';
import fullLogo from '../assets/logos/full.png';
import agave from '../assets/logos/agave.png';  // Adjust the path based on your project structure
import CustomLocationSelect from './CustomLocationSelect';


const LOCATIONS = {
  'PHX-N': { name: 'Phx - N', color: '#10B981', icon: nLogo },  // Green
  'PHX-SW': { name: 'Phx - SW', color: '#1E40AF', icon: swLogo }, // Navy Blue
  'PHX-SE': { name: 'Phx - SE', color: '#EF4444', icon: seLogo }  // Red
};

const convertToOunces = (value, unit) => {
  if (unit === 'Gal') return value * 128; // 1 gallon = 128 fluid ounces
  return value; // Already in ounces
};

const formatInventoryDisplay = (amount) => {
  const gallons = (amount / 128).toFixed(2); // Convert to gallons with 2 decimal places
  return `${amount} Oz / ${gallons} Gal`;
};

// Initial data for one chemical
const initialInventory = [
  { 
    id: 1, 
    name: 'Hydrochloric Acid',
    inventory: {
      'PHX-N': { inventory: 256, truckInventory: 5 }, // Branch inventory: 256 Oz (2 Gal)
      'PHX-SW': { inventory: 15, truckInventory: 0 },
      'PHX-SE': { inventory: 15, truckInventory: 5 }
    },
    unit: 'Oz',
    minLevel: 20 
  }
];

const InventoryTracker = ({ user }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedChemicals, setSelectedChemicals] = useState([]);
  const [selectedChemical, setSelectedChemical] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('PHX-N');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('Oz');
  const [changeType, setChangeType] = useState('add');
  const [inventoryType, setInventoryType] = useState('newInventory');
  const [showAddChemical, setShowAddChemical] = useState(false);
  const [newChemicalName, setNewChemicalName] = useState('');
  const [newChemicalUnit, setNewChemicalUnit] = useState('Oz');
  const [newChemicalMinLevel, setNewChemicalMinLevel] = useState('');
  const [changeHistory, setChangeHistory] = useState([]);
  const [historyLocationFilter, setHistoryLocationFilter] = useState('all');
  const [attachedFile, setAttachedFile] = useState(null);
  const fileInputRef = useRef(null);
  const handleFileUpload = async (changeId, file) => {
    try {
      const fileUrl = await uploadFile(file, changeId);
      
      if (fileUrl) {
        // Update the change history record in Supabase
        const { error } = await supabase
          .from('change_history')
          .update({ attachment_url: fileUrl })
          .eq('id', changeId);

        if (error) throw error;

        // Update local state
        setChangeHistory(prev => prev.map(change => {
          if (change.id === changeId) {
            return { ...change, attachment_url: fileUrl };
          }
          return change;
        }));
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  const uploadFile = async (file, changeId) => {
    try {
      if (!file) return null;
  
      // Create a unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${changeId}-${Date.now()}.${fileExt}`;
  
      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
  
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
  
      // Log for debugging
      console.log('File uploaded:', fileName);
  
      // Get the signed URL (valid for 1 hour)
      const { data } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 3600);
  
      if (!data?.signedUrl) {
        throw new Error('Failed to generate signed URL');
      }
  
      console.log('Signed URL:', data.signedUrl);
      return data.signedUrl;
  
    } catch (error) {
      console.error('Error in uploadFile:', error);
      alert('Failed to upload file: ' + error.message);
      return null;
    }
  };

  const fetchData = async () => {
    try {
      // Fetch chemicals
      const { data: chemicalsData, error: chemicalsError } = await supabase
        .from('chemicals')
        .select('*');
    
      console.log('Chemicals data:', chemicalsData); // Debug log
      if (chemicalsError) {
        console.error('Chemicals error:', chemicalsError);
        throw chemicalsError;
      }
    
      // Fetch inventory levels for each chemical
      const { data: levelsData, error: levelsError } = await supabase
        .from('inventory_levels')
        .select('*');
    
      console.log('Levels data:', levelsData); // Debug log
      if (levelsError) {
        console.error('Levels error:', levelsError);
        throw levelsError;
      }
    
      // Fetch change history
      const { data: historyData, error: historyError } = await supabase
        .from('change_history')
        .select('*')
        .order('created_at', { ascending: false });
    
      console.log('History data:', historyData); // Debug log
      if (historyError) {
        console.error('History error:', historyError);
        throw historyError;
      }
    
      // Map history data with chemical names
      const formattedHistory = historyData.map(change => {
        console.log('Raw change data:', change);  // Debug log
        return {
          id: change.id,
          chemical: chemicalsData.find(c => c.id === change.chemical_id)?.name || 'Unknown',
          location: change.location,
          amount: change.amount,
          type: change.type,
          unit: chemicalsData.find(c => c.id === change.chemical_id)?.unit || 'Oz',
          user: change.user_name,
          date: new Date(change.created_at).toLocaleDateString(),
          time: new Date(change.created_at).toLocaleTimeString(),
          attachment_url: change.attachment_url
        };
      });
      
      // Combine the chemical data
      const combinedData = chemicalsData.map(chemical => ({
        id: chemical.id,
        name: chemical.name,
        unit: chemical.unit,
        minLevel: chemical.min_level,
        inventory: {
          'PHX-N': { 
            current: levelsData.find(l => l.chemical_id === chemical.id && l.location === 'PHX-N')?.current_amount || 0,
            truckInventory: levelsData.find(l => l.chemical_id === chemical.id && l.location === 'PHX-N')?.in_transit_amount || 0
          },
          'PHX-SW': {
            current: levelsData.find(l => l.chemical_id === chemical.id && l.location === 'PHX-SW')?.current_amount || 0,
            truckInventory: levelsData.find(l => l.chemical_id === chemical.id && l.location === 'PHX-SW')?.in_transit_amount || 0
          },
          'PHX-SE': {
            current: levelsData.find(l => l.chemical_id === chemical.id && l.location === 'PHX-SE')?.current_amount || 0,
            truckInventory: levelsData.find(l => l.chemical_id === chemical.id && l.location === 'PHX-SE')?.in_transit_amount || 0
          }
        }
      }));
  
      // Set all state updates at once
      setIsLoading(false);
      setError(null);
      setInventory(combinedData);
      setChangeHistory(formattedHistory);
      if (combinedData.length > 0) {
        setSelectedChemicals([combinedData[0].name]);
      }
  
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
      setError(error.message);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);

// Replace the existing handleInventoryChange function with this corrected version
const handleInventoryChange = async (e) => {
  e.preventDefault();
  
  if (!selectedChemical || !amount) return;

  try {
    const chemical = inventory.find(item => item.name === selectedChemical);
    if (!chemical) return;

    console.log('Selected Chemical:', chemical); // Add this debug line
    // Convert amount based on inventory type
    let convertedAmount = parseFloat(amount);
    if (unit === 'Gal') {
      convertedAmount = convertedAmount * 128; // Convert gallons to ounces
    }

    // Apply negative amounts for withdrawals and removals
    if (inventoryType === 'withdrawn') {
      convertedAmount *= -1;
    } else if (inventoryType === 'audit' && changeType === 'remove') {
      convertedAmount *= -1;
    }

    // First, determine if we're dealing with a truck inventory location
    const isTruckLocation = selectedLocation.includes('truck');
    const baseLocation = isTruckLocation ? selectedLocation.split('-truck')[0] : selectedLocation;

    // Get current inventory levels
    const { data: currentLevel, error: fetchError } = await supabase
      .from('inventory_levels')
      .select('*')
      .eq('chemical_id', chemical.id)
      .eq('location', baseLocation)
      .single();

    if (fetchError) throw fetchError;

    let updates = {};
    let changeHistoryType = inventoryType;

    if (isTruckLocation) {
      // For truck inventory locations
      if (inventoryType === 'withdrawn') {
        // If product is used from truck inventory, reduce in_transit_amount
        const newTruckInventory = currentLevel.in_transit_amount + convertedAmount; // convertedAmount is already negative
        if (newTruckInventory < 0) {
          throw new Error('Cannot reduce truck inventory below 0');
        }
        updates = {
          in_transit_amount: newTruckInventory
        };
      } else {
        // For other operations on truck inventory
        const newTruckInventory = currentLevel.in_transit_amount + convertedAmount;
        if (newTruckInventory < 0) {
          throw new Error('Cannot reduce truck inventory below 0');
        }
        updates = {
          in_transit_amount: newTruckInventory
        };
      }
    } else {
      // For branch locations inventory
      if (inventoryType === 'truckInventory') {
        // When transferring to truck inventory, reduce branch inventory and increase truck inventory
// When transferring to truck inventory, reduce branch inventory and increase truck inventory
const amountToTransfer = Math.abs(convertedAmount);
const newBranchInventory = currentLevel.current_amount - amountToTransfer;
const newTruckInventory = currentLevel.in_transit_amount + amountToTransfer;

if (newBranchInventory < 0) {
  throw new Error('Cannot reduce branch inventory below 0');
}

// First update - reduce branch inventory
const { error: branchError } = await supabase
  .from('inventory_levels')
  .update({ current_amount: newBranchInventory })
  .eq('chemical_id', chemical.id)
  .eq('location', baseLocation);

if (branchError) throw branchError;

// Second update - increase truck inventory
const { error: truckError } = await supabase
  .from('inventory_levels')
  .update({ in_transit_amount: newTruckInventory })
  .eq('chemical_id', chemical.id)
  .eq('location', baseLocation);

if (truckError) throw truckError;
      } else {
        const newInventory = currentLevel.current_amount + convertedAmount;
        if (newInventory < 0) {
          throw new Error('Cannot reduce inventory below 0');
        }
        updates = {
          current_amount: newInventory
        };
      }
    }

    // Update inventory levels
    const { error: updateError } = await supabase
      .from('inventory_levels')
      .update(updates)
      .eq('chemical_id', chemical.id)
      .eq('location', baseLocation);

    if (updateError) throw updateError;

    // Handle file upload if there's an attachment
    let attachmentUrl = null;
    if (attachedFile) {
      console.log('Attempting to upload file:', attachedFile);
      const timestamp = Date.now();
      attachmentUrl = await uploadFile(attachedFile, timestamp);
      console.log('Upload successful, URL:', attachmentUrl);
      
      if (!attachmentUrl) {
        throw new Error('Failed to get URL for uploaded file');
      }
    }

    // Record in change history
    if (inventoryType === 'truckInventory') {
      // First record - reduction from branch inventory
      const { error: historyError1 } = await supabase
        .from('change_history')
        .insert([{
          chemical_id: chemical.id,
          location: baseLocation,  // Branch location
          amount: -Math.abs(convertedAmount),  // Negative amount for reduction
          type: changeHistoryType,
          user_email: user.email,
          user_name: user.name,
          attachment_url: attachmentUrl,
          created_at: new Date().toISOString()
        }]);

      if (historyError1) throw historyError1;

      // Second record - increase in truck inventory
      const { error: historyError2 } = await supabase
        .from('change_history')
        .insert([{
          chemical_id: chemical.id,
          location: `${baseLocation}-truck`,  // Truck location
          amount: Math.abs(convertedAmount),  // Positive amount for increase
          type: changeHistoryType,
          user_email: user.email,
          user_name: user.name,
          attachment_url: attachmentUrl,
          created_at: new Date().toISOString()
        }]);

      if (historyError2) throw historyError2;
    } else {
      // Regular history record for other types
      const { error: historyError } = await supabase
        .from('change_history')
        .insert([{
          chemical_id: chemical.id,
          location: selectedLocation,
          amount: convertedAmount,
          type: changeHistoryType,
          user_email: user.email,
          user_name: user.name,
          attachment_url: attachmentUrl,
          created_at: new Date().toISOString()
        }]);

      if (historyError) throw historyError;
    }

    // Refresh data
    await fetchData();

    // Reset form
    setSelectedChemical('');
    setAmount('');
    setUnit('Oz');
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

  } catch (error) {
    console.error('Error updating inventory:', error);
    alert('Failed to update inventory. Please try again.');
  }
};

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header and Chemical Selection */}
      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px',
        overflow: 'hidden'
      }}>
        {/* Header with gradient background */}
        <div style={{ 
          background: 'linear-gradient(to right, #1E40AF, #06B6D4)',
          padding: '24px',
          color: 'white'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            marginBottom: '4px'
          }}>
            Chemical Inventory Tracker
          </h1>
          <p style={{ 
            fontSize: '14px', 
            opacity: '0.9'
          }}>
            Monitor and manage chemical inventory across all locations
          </p>
        </div>

{/* Chemical Selection Bar */}
<div style={{ 
  padding: '16px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTop: '1px solid rgba(255,255,255,0.1)',
  background: '#FAFAFA'
}}>
<div style={{ 
  display: 'flex', 
  alignItems: 'center', 
  gap: '12px'
}}>
  <div 
    onClick={() => setShowAddChemical(true)}
    style={{ 
      background: '#1E40AF',
      minWidth: '100px',
      height: '32px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      padding: '0 12px',
      cursor: 'pointer'
    }}
  >
    + Add Type
  </div>
  <select
    value={selectedChemicals[0] || ''}
    onChange={(e) => setSelectedChemicals([e.target.value])}
    style={{ 
      width: '240px',
      padding: '8px 12px',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
      backgroundColor: 'white',
      color: '#1F2937',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 8px center',
      backgroundSize: '20px 20px',
      paddingRight: '32px'
    }}
  >
    <option value="">Select a Chemical</option>
    {inventory.map(item => (
      <option key={item.id} value={item.name}>{item.name}</option>
    ))}
  </select>
</div>

  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: '12px',
    background: 'white',
    padding: '8px 16px',
    borderRadius: '24px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#1E40AF',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '500',
      fontSize: '16px'
    }}>
      {user.name.charAt(0)}
    </div>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }}>
      <p style={{
        fontSize: '14px',
        color: '#1F2937',
        fontWeight: '500',
        margin: 0
      }}>
        {user.name}
      </p>
      <p style={{
        fontSize: '12px',
        color: '#6B7280',
        margin: 0
      }}>
        {user.email}
      </p>
    </div>
  </div>
</div>
      </div>



{/* Add Chemical Modal */}
{showAddChemical && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  }}>
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '480px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      position: 'relative'
    }}>
      <div style={{ 
        borderBottom: '1px solid #E5E7EB', 
        paddingBottom: '16px', 
        marginBottom: '24px'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#1F2937'
        }}>
          Add New Chemical
        </h2>
        <p style={{ 
          fontSize: '14px', 
          color: '#6B7280', 
          marginTop: '4px' 
        }}>
          Enter the details for the new chemical inventory item
        </p>
      </div>

      <form onSubmit={async (e) => {
  e.preventDefault();
  
  try {
    // First, insert the new chemical
    const { data: newChemical, error: chemicalError } = await supabase
      .from('chemicals')
      .insert([{
        name: newChemicalName,
        unit: newChemicalUnit,
        min_level: parseFloat(newChemicalMinLevel)
      }])
      .select()
      .single();

    if (chemicalError) throw chemicalError;

    // Then, create inventory levels for each location
    const inventoryLevels = ['PHX-N', 'PHX-SW', 'PHX-SE'].map(location => ({
      chemical_id: newChemical.id,
      location: location,
      current_amount: 0,       // DB field for branch inventory
      in_transit_amount: 0     // DB field for truck inventory
    }));

    const { error: levelsError } = await supabase
      .from('inventory_levels')
      .insert(inventoryLevels);

    if (levelsError) throw levelsError;

    // Update local state
    await fetchData(); // Refetch all data to ensure consistency
    
    // Close modal and reset form
    setShowAddChemical(false);
    setNewChemicalName('');
    setNewChemicalUnit('Oz');
    setNewChemicalMinLevel('');

  } catch (error) {
    console.error('Error adding chemical:', error);
    alert('Failed to add chemical. Please try again.');
  }
}}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
          }}>
            Chemical Name
          </label>
          <input
  type="text"
  value={newChemicalName}
  onChange={(e) => setNewChemicalName(e.target.value)}
  placeholder="Enter chemical name"
  required
  style={{
    width: '75%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    color: '#1F2937'
  }}
/>
        </div>

        <div style={{ marginBottom: '20px' }}>
  <label style={{ 
    display: 'block', 
    marginBottom: '8px',
    fontWeight: '500',
    color: '#374151'
  }}>
    Unit Type:
  </label>
  <select
    value={newChemicalUnit}
    onChange={(e) => setNewChemicalUnit(e.target.value)}
    style={{
      width: '120px',
      padding: '10px 12px',
      borderRadius: '6px',
      border: '1px solid #D1D5DB',
      fontSize: '14px',
      color: '#1F2937',
      background: 'white'
    }}
  >
    <option value="Oz">Oz (Gal)</option>
  </select>
</div>

<div style={{ marginBottom: '24px' }}>
  <label style={{ 
    display: 'block', 
    marginBottom: '8px',
    fontWeight: '500',
    color: '#374151'
  }}>
    Minimum Level (Gallons)
  </label>
  <input
  type="number"
  value={newChemicalMinLevel}
  onChange={(e) => setNewChemicalMinLevel(e.target.value)}
  placeholder="Enter gallons"
  required
  min="0"
  step="0.1"
  style={{
    width: '120px',  // Reduced from 100%
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    fontSize: '14px',
    color: '#1F2937'
  }}
/>
          <p style={{ 
            fontSize: '13px', 
            color: '#6B7280', 
            marginTop: '6px' 
          }}>
            Alert will show when inventory drops below this level
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          paddingTop: '16px',
          borderTop: '1px solid #E5E7EB'
        }}>
          <button
            type="button"
            onClick={() => setShowAddChemical(false)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              background: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#10B981',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Add Chemical
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Inventory Chart */}
      <div style={{ 
        background: '#f0f9ff', 
        padding: '24px', 
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
   <h2 style={{ 
  fontSize: '18px', 
  fontWeight: '600', 
  marginBottom: '16px',
  color: '#1F2937'
}}>
  Inventory Levels
</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
          <BarChart 
  data={inventory
    .filter(item => selectedChemicals.includes(item.name))
    .map(item => {
      const data = { 
        name: item.name,
        unit: item.unit
      };
      Object.entries(LOCATIONS).forEach(([locationKey, locationData]) => {
        // Convert to gallons
        data[`${locationData.name}`] = item.inventory[locationKey].current / 128;
        data[`${locationData.name} (Truck)`] = item.inventory[locationKey].truckInventory / 128;
      });
      return data;
    })}
  margin={{ bottom: 40 }}
>
  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
  <XAxis 
    dataKey="name" 
    tick={{ fill: '#4B5563' }}
    axisLine={{ stroke: '#9CA3AF' }}
  />
  <YAxis 
    tick={{ fill: '#4B5563' }}
    axisLine={{ stroke: '#9CA3AF' }}
    label={{ 
      value: 'Gallons', 
      angle: -90, 
      position: 'insideLeft',
      style: { fill: '#4B5563' }
    }}
    tickFormatter={(value) => value.toFixed(1)}
  />
<Tooltip 
  contentStyle={{ 
    background: '#ffffff',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }}
  cursor={{ strokeDasharray: '3 3' }}
  formatter={(value, name, props) => {
    const ozValue = value * 128;
    return [
      `${ozValue.toFixed(0)} Oz / ${value.toFixed(2)} Gal`, 
      name.includes('(Truck)') ? name.replace('(Truck)', '(Truck Inventory)') : name
    ];
  }}
/>
<Legend
 content={({ payload }) => {
   const locationGroups = Object.entries(LOCATIONS).map(([key, loc]) => ({
     location: loc.name,
     color: loc.color,
     items: payload
       .filter(p => p.value.startsWith(loc.name))
       .sort((a, b) => b.value.includes('(Truck)') - a.value.includes('(Truck)'))  // Added this line
   }));

   return (
     <div style={{ 
       display: 'grid',
       gridTemplateColumns: 'repeat(3, 1fr)',
       gap: '16px',
       marginTop: '16px',
       textAlign: 'center'
     }}>
       {locationGroups.map(group => (
         <div key={group.location} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
           <span style={{ 
             color: group.color, 
             fontWeight: '600',
             marginBottom: '4px'
           }}>
             {group.location}
           </span>
           {group.items.map((entry, i) => (
             <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
               <div style={{
                 width: '12px',
                 height: '12px',
                 backgroundColor: entry.color,
                 borderRadius: '2px'
               }} />
               <span style={{ color: '#4B5563', fontSize: '14px' }}>
                 {entry.value.includes('(Truck)') ? 'Truck Inventory' : 'Branch Inventory'}
               </span>
             </div>
           ))}
         </div>
       ))}
     </div>
   );
 }}
/>
  {Object.entries(LOCATIONS).map(([locationKey, locationData]) => (
    <React.Fragment key={locationKey}>
      <Bar 
        dataKey={locationData.name} 
        fill={locationData.color} 
        stackId={locationKey}
        radius={[4, 4, 0, 0]}
      />
      <Bar 
        dataKey={`${locationData.name} (Truck)`}
        fill={`${locationData.color}88`}
        stackId={locationKey}
        radius={[4, 4, 0, 0]}
        pattern={[{ d: 'M 0 0 L 10 10', strokeWidth: 2, stroke: '#fff' }]}
      />
    </React.Fragment>
  ))}
</BarChart>
          </ResponsiveContainer>
        </div>
      </div>

{/* Inventory Table */}
<div style={{ 
        background: '#f0f9ff', 
        padding: '24px', 
        borderRadius: '8px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
  fontSize: '18px', 
  fontWeight: '600', 
  marginBottom: '16px',
  color: '#1F2937'
}}>
  Inventory Levels
</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'separate',
            borderSpacing: '0',
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #E5E7EB',
                  color: '#4B5563',
                  fontWeight: '600'
                }}>Chemical</th>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '12px 16px', 
                  borderBottom: '1px solid #E5E7EB',
                  color: '#4B5563',
                  fontWeight: '600'
                }}>Unit</th>
{Object.entries(LOCATIONS).map(([key, location]) => (
  <th 
    key={key} 
    style={{ 
      textAlign: 'left', 
      padding: '12px 16px', 
      borderBottom: '1px solid #E5E7EB',
      color: location.color,
      fontWeight: '600'
    }}
  >
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px' 
    }}>
      <img 
        src={location.icon} 
        alt={location.name} 
        style={{ 
          width: '24px', 
          height: '24px', 
          objectFit: 'contain' 
        }} 
      />
      {location.name}
    </div>
  </th>
))}
              </tr>
            </thead>
            <tbody>
              {inventory
                .filter(item => selectedChemicals.includes(item.name))
                .map(item => (
                  <tr key={item.id} style={{ 
                    transition: 'background-color 0.2s',
                    ':hover': { background: '#F9FAFB' }
                  }}>
                    <td style={{ 
                      padding: '16px', 
                      borderBottom: '1px solid #E5E7EB',
                      fontWeight: '500'
                    }}>{item.name}</td>
                    <td style={{ 
                      padding: '16px', 
                      borderBottom: '1px solid #E5E7EB',
                      color: '#6B7280'
                    }}>{item.unit}</td>
                    {Object.entries(LOCATIONS).map(([locationKey, location]) => (
                      <td 
                        key={locationKey} 
                        style={{ 
                          padding: '16px', 
                          borderBottom: '1px solid #E5E7EB',
                          borderLeft: `2px solid ${location.color}`,
                          background: 'white'
                        }}
                      >
<div style={{ fontWeight: '500' }}>
  Inventory: {formatInventoryDisplay(item.inventory[locationKey].current)}
</div>
<div style={{ 
  fontSize: '0.9em', 
  color: '#6B7280',
  marginTop: '4px'
}}>
  Truck Inventory: {formatInventoryDisplay(item.inventory[locationKey].truckInventory)}
</div>
                        {item.inventory[locationKey].current <= item.minLevel && (
                          <div style={{ 
                            color: '#DC2626',
                            fontSize: '0.85em',
                            fontWeight: '600',
                            marginTop: '8px',
                            padding: '4px 8px',
                            background: '#FEE2E2',
                            borderRadius: '4px',
                            display: 'inline-block'
                          }}>
                            Low Stock
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

{/* Inventory Change Form */}
<div style={{ 
  background: '#f0f9ff', 
  padding: '24px', 
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  overflowX: 'auto',  // Added for mobile scrolling
  minWidth: '320px'   // Added minimum width
}}>
  <h2 style={{ 
    fontSize: '18px', 
    fontWeight: '600', 
    marginBottom: '20px',
    color: '#1F2937'
  }}>
    Record Inventory Change
  </h2>
  <form onSubmit={handleInventoryChange}>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '1fr 1fr', 
      gap: '20px', 
      marginBottom: '24px',
      minWidth: '600px'  // Added minimum width for scrolling
    }}>
      {/* Chemical Selection */}
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px',
          fontWeight: '500',
          color: '#374151'
        }}>
          Chemical
        </label>
        <select 
          value={selectedChemical}
          onChange={(e) => setSelectedChemical(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px 12px', 
            borderRadius: '6px', 
            border: '1px solid #D1D5DB',
            backgroundColor: 'white',
            color: '#1F2937',
            fontSize: '14px'
          }}
        >
          <option value="">Select Chemical</option>
          {inventory.map(item => (
            <option key={item.id} value={item.name}>{item.name}</option>
          ))}
        </select>
      </div>
      
 {/* Location Selection */}
<div>
  <CustomLocationSelect
    selectedLocation={selectedLocation}
    onLocationChange={setSelectedLocation}
    LOCATIONS={LOCATIONS}
  />
</div>

      {/* Amount Input Group */}
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px',
          fontWeight: '500',
          color: '#374151'
        }}>
          Amount
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {inventoryType === 'audit' && (
            <select
              value={changeType}
              onChange={(e) => setChangeType(e.target.value)}
              style={{ 
                padding: '10px 12px', 
                borderRadius: '6px', 
                border: '1px solid #D1D5DB',
                backgroundColor: 'white',
                color: '#1F2937',
                fontSize: '14px',
                width: '120px'
              }}
            >
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
          )}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            style={{ 
              flex: 1,
              padding: '10px 12px', 
              borderRadius: '6px', 
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#1F2937',
              fontSize: '14px'
            }}
          />
          <select 
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            style={{ 
              width: '80px',
              padding: '10px 12px', 
              borderRadius: '6px', 
              border: '1px solid #D1D5DB',
              backgroundColor: 'white',
              color: '#1F2937',
              fontSize: '14px'
            }}
          >
            <option value="Oz">Oz</option>
            <option value="Gal">Gal</option>
          </select>
        </div>
      </div>

      {/* Change Type Selection */}
      <div>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px',
          fontWeight: '500',
          color: '#374151'
        }}>
          Type
        </label>
        <select 
          value={inventoryType}
          onChange={(e) => setInventoryType(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px 12px', 
            borderRadius: '6px', 
            border: '1px solid #D1D5DB',
            backgroundColor: 'white',
            color: '#1F2937',
            fontSize: '14px'
          }}
        >
          <option value="withdrawn">Product Used</option>
          <option value="truckInventory">Transfer to Truck Inventory</option>
          <option value="audit">Inventory Audit</option>
          <option value="newInventory">New Inventory</option>
        </select>
      </div>
    </div>

    {/* File Attachment */}
    <div style={{ 
      marginBottom: '24px',
      padding: '16px',
      background: '#F9FAFB',
      borderRadius: '6px',
      border: '1px dashed #D1D5DB'
    }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '8px',
        fontWeight: '500',
        color: '#374151'
      }}>
        Attach Receipt or Documentation
      </label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => setAttachedFile(e.target.files[0])}
        style={{
          width: '100%',
          padding: '8px',
          color: '#4B5563',
          fontSize: '14px'
        }}
      />
      <p style={{ 
        fontSize: '12px', 
        color: '#6B7280',
        marginTop: '4px'
      }}>
        Optional: Attach relevant documentation (receipts, invoices, etc.)
      </p>
    </div>

    {/* Submit Button */}
    <button 
      type="submit"
      disabled={!selectedChemical || !amount || !selectedLocation || !inventoryType}
      style={{
        background: '#1E40AF',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '6px',
        border: 'none',
        cursor: (!selectedChemical || !amount || !selectedLocation || !inventoryType) ? 'not-allowed' : 'pointer',
        fontWeight: '500',
        fontSize: '14px',
        transition: 'background-color 0.2s',
        opacity: (!selectedChemical || !amount || !selectedLocation || !inventoryType) ? 0.5 : 1
      }}
    >
      Submit Change
    </button>
  </form>
</div>

{/* Change History */}
<div style={{ 
  background: '#f0f9ff', 
  padding: '24px', 
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
}}>
  <h2 style={{ 
    fontSize: '18px', 
    fontWeight: '600', 
    marginBottom: '16px',
    color: '#1F2937'
  }}>
    Change History
  </h2>
  
  {/* Location Filter */}
  <div style={{ 
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <label style={{ 
      fontWeight: '500',
      color: '#374151',
      fontSize: '14px'
    }}>
      Filter by Location:
    </label>
    <select
  value={historyLocationFilter}
  onChange={(e) => setHistoryLocationFilter(e.target.value)}
  style={{ 
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: 'white',
    color: '#1F2937',
    fontSize: '14px',
    width: '200px'
  }}
>
  <option value="all">All Locations</option>
  <optgroup label="Branch Locations">
    {Object.entries(LOCATIONS).map(([key, location]) => (
      <option key={key} value={key}>{location.name}</option>
    ))}
  </optgroup>
  <optgroup label="Truck Inventory">
    {Object.entries(LOCATIONS).map(([key, location]) => (
      <option key={`${key}-truck`} value={`${key}-truck`}>{location.name} (Truck Inventory)</option>
    ))}
  </optgroup>
</select>
  </div>
  <div style={{ overflowX: 'auto' }}>
    <table style={{ 
      width: '100%', 
      borderCollapse: 'separate',
      borderSpacing: '0',
      background: 'white',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
<thead>
        <tr style={{ background: '#F9FAFB' }}>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>Date/Time</th>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>Chemical</th>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>Location</th>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>Change</th>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>Type</th>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>User</th>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>Attachment</th>
          <th style={{ 
            textAlign: 'left', 
            padding: '12px 16px', 
            borderBottom: '1px solid #E5E7EB',
            color: '#4B5563',
            fontWeight: '600'
          }}>Running Total</th>
        </tr>
      </thead>
      <tbody>
        {changeHistory
          .filter(change => 
            // Filter by selected chemical and location
            (!selectedChemicals[0] || change.chemical === selectedChemicals[0]) &&
            (historyLocationFilter === 'all' || change.location === historyLocationFilter)
          )
          .map((change, index) => {
// Calculate running total inventory for this chemical at this location
const runningTotal = changeHistory
            .filter(h => 
              h.chemical === change.chemical && 
              h.location === change.location &&
              (historyLocationFilter === 'all' || h.location === historyLocationFilter)
            )
            // Sort by date in ascending order
            .sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))
            // Calculate running total up to this change
            .reduce((total, h) => {
              if (new Date(h.date + ' ' + h.time) <= new Date(change.date + ' ' + change.time)) {
                return total + h.amount;
              }
              return total;
            }, 0);

            return (
              <tr key={change.id} style={{
              transition: 'background-color 0.2s',
              ':hover': { background: '#F9FAFB' }
            }}>
              <td style={{ 
                padding: '16px', 
                borderBottom: '1px solid #E5E7EB'
              }}>
                <div>{change.date}</div>
                <div style={{ fontSize: '0.9em', color: '#6B7280' }}>{change.time}</div>
              </td>
              <td style={{ 
                padding: '16px', 
                borderBottom: '1px solid #E5E7EB',
                fontWeight: '500'
              }}>{change.chemical}</td>
<td style={{ 
  padding: '16px', 
  borderBottom: '1px solid #E5E7EB',
  color: LOCATIONS[change.location.split('-truck')[0]]?.color || '#6B7280',
  fontWeight: '500'
}}>
{change.location.includes('-truck') 
  ? `${LOCATIONS[change.location.split('-truck')[0]]?.name} (Truck Inventory)` 
  : LOCATIONS[change.location]?.name}
</td>
              <td style={{ 
                padding: '16px', 
                borderBottom: '1px solid #E5E7EB',
                color: change.amount > 0 ? '#059669' : '#DC2626',
                fontWeight: '500'
              }}>
                {change.amount > 0 ? '+' : ''}{change.amount} {change.unit}
              </td>
              <td style={{ 
                padding: '16px', 
                borderBottom: '1px solid #E5E7EB'
              }}>
                    {change.type === 'truckInventory' ? 'Transfer to Truck Inventory' : 
                     change.type === 'withdrawn' ? 'Product Used' :
                     change.type === 'audit' ? 'Inventory Audit' :
                     change.type === 'newInventory' ? 'New Inventory' :
                     change.type}
              </td>
              <td style={{ 
                padding: '16px', 
                borderBottom: '1px solid #E5E7EB',
                color: '#6B7280'
              }}>{change.user}</td>
<td style={{ 
  padding: '16px', 
  borderBottom: '1px solid #E5E7EB'
}}>
  <div style={{
    color: '#1E40AF',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  }}>
    <span>📎</span>
    {change.attachment_url ? (
      <a 
        href={change.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ 
          color: '#1E40AF',
          textDecoration: 'none',
          cursor: 'pointer'
        }}
        onClick={(e) => {
          if (!change.attachment_url.startsWith('http')) {
            e.preventDefault();
            alert('Invalid attachment URL');
          }
        }}
      >
        View Receipt
      </a>
    ) : (
      <div>
        <label
          style={{
            color: '#1E40AF',
            cursor: 'pointer'
          }}
        >
          Attach File
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => handleFileUpload(change.id, e.target.files[0])}
            style={{ display: 'none' }}
          />
        </label>
        <div style={{ fontSize: '10px', color: '#666' }}>
          No URL
        </div>
      </div>
    )}
  </div>
</td>
              <td style={{ 
                padding: '16px', 
                borderBottom: '1px solid #E5E7EB',
                fontWeight: '600',
                color: '#1F2937'
              }}>
                {runningTotal.toFixed(1)} {change.unit}
              </td>
            </tr>
          );
        })}
        {changeHistory.length === 0 && (
          <tr>
            <td 
              colSpan="8" 
              style={{ 
                padding: '32px 16px',
                textAlign: 'center',
                color: '#6B7280',
                fontStyle: 'italic'
              }}
            >
              No changes recorded yet
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>

    </div>
  );
};

export default InventoryTracker;
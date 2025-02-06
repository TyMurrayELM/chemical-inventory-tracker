import { useState } from 'react';
import InventoryTracker from './components/InventoryTracker';
import Login from './components/Login';

function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <InventoryTracker user={user} />;
}

export default App;
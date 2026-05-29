import React, { useState } from 'react';
import Tracker from './components/Tracker';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { Home, Activity, User } from 'lucide-react';
import './index.css';

const DEFAULT_RIDES = [
  {
    id: 1,
    user: "Alex Rider",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    title: "Sunday Morning Sunmori",
    date: "Today at 06:30 AM",
    distance: "124.5",
    topSpeed: "145.2",
    avgSpeed: "68.4",
    likes: 24,
    comments: 5,
    route: [
      [-6.200000, 106.816666],
      [-6.210000, 106.820000],
      [-6.220000, 106.830000],
      [-6.250000, 106.850000],
      [-6.300000, 106.900000] // simple mock route
    ]
  },
  {
    id: 2,
    user: "Sarah Connor",
    avatar: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
    title: "Night Ride to Puncak",
    date: "Yesterday at 22:00 PM",
    distance: "85.2",
    topSpeed: "110.5",
    avgSpeed: "55.1",
    likes: 42,
    comments: 12,
    route: [
      [-6.300000, 106.816666],
      [-6.400000, 106.850000],
      [-6.500000, 106.900000],
      [-6.600000, 106.950000]
    ]
  }
];

function App() {
  const [activeTab, setActiveTab] = useState('record');
  const [rides, setRides] = useState(() => {
    const saved = localStorage.getItem('ridetrack_rides');
    return saved ? JSON.parse(saved) : DEFAULT_RIDES;
  });

  const addRide = (newRide) => {
    setRides((prev) => {
      const updated = [newRide, ...prev];
      localStorage.setItem('ridetrack_rides', JSON.stringify(updated));
      return updated;
    });
    setActiveTab('home'); // Automatically switch to feed (home)
  };

  const updateRideTitle = (id, newTitle) => {
    setRides((prev) => {
      const updated = prev.map(ride => 
        ride.id === id ? { ...ride, title: newTitle } : ride
      );
      localStorage.setItem('ridetrack_rides', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteRide = (id) => {
    setRides((prev) => {
      const updated = prev.filter(ride => ride.id !== id);
      localStorage.setItem('ridetrack_rides', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>RIDE<span style={{color: 'var(--text-primary)'}}>TRACK</span></h1>
        <div style={{width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--card-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <User size={18} color="var(--accent-color)" />
        </div>
      </header>

      {activeTab === 'home' && (
        <Dashboard 
          rides={rides} 
          onUpdateRideTitle={updateRideTitle} 
          onDeleteRide={deleteRide} 
        />
      )}
      {activeTab === 'record' && <Tracker onSaveRide={addRide} />}
      {activeTab === 'profile' && <Profile rides={rides} />}

      <nav className="bottom-nav">
        <div 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <Home size={24} />
          <span>Feed</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          <Activity size={24} />
          <span>Record</span>
        </div>
        <div 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={24} />
          <span>Profile</span>
        </div>
      </nav>
    </div>
  );
}

export default App;

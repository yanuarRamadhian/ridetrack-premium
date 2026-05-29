import React, { useState, useEffect } from 'react';
import Tracker from './components/Tracker';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Auth from './components/Auth';
import { supabase } from './lib/supabaseClient';
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
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('ridetrack_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [rides, setRides] = useState(() => {
    const saved = localStorage.getItem('ridetrack_rides');
    return saved ? JSON.parse(saved) : DEFAULT_RIDES;
  });

  // Fetch Rides from Supabase in Real-Time
  useEffect(() => {
    if (supabase && currentUser) {
      const fetchRides = async () => {
        try {
          const { data, error } = await supabase
            .from('rides')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data) {
            // Map snake_case database fields back to React camelCase
            const mappedRides = data.map(ride => ({
              id: ride.id,
              riderId: ride.rider_id,
              user: ride.user_name,
              avatar: ride.avatar,
              title: ride.title,
              date: ride.date,
              distance: String(ride.distance),
              topSpeed: String(ride.top_speed),
              avgSpeed: String(ride.avg_speed),
              route: ride.route,
              maxLeanLeft: ride.max_lean_left,
              maxLeanRight: ride.max_lean_right,
              likes: ride.likes || 0,
              comments: ride.comments || 0
            }));
            
            // If we have cloud data, display it!
            if (mappedRides.length > 0) {
              setRides(mappedRides);
            }
          }
        } catch (err) {
          console.error("Gagal memuat perjalanan dari Supabase:", err);
        }
      };
      fetchRides();
    }
  }, [currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('ridetrack_current_user', JSON.stringify(user));
    setActiveTab('home'); // Go to Feed home upon login
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ridetrack_current_user');
  };

  const handleProfileUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const addRide = async (newRide) => {
    if (currentUser) {
      newRide.user = currentUser.name;
      newRide.avatar = currentUser.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(currentUser.email)}`;
    }

    // Supabase Cloud Insert
    if (supabase && currentUser) {
      try {
        const { data, error } = await supabase
          .from('rides')
          .insert([{
            rider_id: currentUser.id,
            user_name: newRide.user,
            avatar: newRide.avatar,
            title: newRide.title,
            date: newRide.date,
            distance: Number(newRide.distance),
            top_speed: Number(newRide.topSpeed),
            avg_speed: Number(newRide.avgSpeed),
            route: newRide.route,
            max_lean_left: newRide.maxLeanLeft || 0,
            max_lean_right: newRide.maxLeanRight || 0
          }])
          .select()
          .single();

        if (!error && data) {
          const savedRide = {
            id: data.id,
            riderId: data.rider_id,
            user: data.user_name,
            avatar: data.avatar,
            title: data.title,
            date: data.date,
            distance: String(data.distance),
            topSpeed: String(data.top_speed),
            avgSpeed: String(data.avg_speed),
            route: data.route,
            maxLeanLeft: data.max_lean_left,
            maxLeanRight: data.max_lean_right,
            likes: data.likes || 0,
            comments: data.comments || 0
          };
          setRides(prev => [savedRide, ...prev]);
        } else {
          console.error("Gagal menyimpan rute ke Supabase:", error);
        }
      } catch (err) {
        console.error(err);
      }
      setActiveTab('home');
      return;
    }

    // LocalStorage Fallback
    setRides((prev) => {
      const updated = [newRide, ...prev];
      localStorage.setItem('ridetrack_rides', JSON.stringify(updated));
      return updated;
    });
    setActiveTab('home'); // Automatically switch to feed (home)
  };

  const updateRideTitle = async (id, newTitle) => {
    // Supabase Cloud Update
    if (supabase) {
      try {
        const { error } = await supabase
          .from('rides')
          .update({ title: newTitle })
          .eq('id', id);

        if (error) {
          console.error("Gagal mengupdate judul di Supabase:", error);
        }
      } catch (err) {
        console.error(err);
      }
    }

    setRides((prev) => {
      const updated = prev.map(ride => 
        ride.id === id ? { ...ride, title: newTitle } : ride
      );
      localStorage.setItem('ridetrack_rides', JSON.stringify(updated));
      return updated;
    });
  };

  const deleteRide = async (id) => {
    // Supabase Cloud Delete
    if (supabase) {
      try {
        const { error } = await supabase
          .from('rides')
          .delete()
          .eq('id', id);

        if (error) {
          console.error("Gagal menghapus rute di Supabase:", error);
        }
      } catch (err) {
        console.error(err);
      }
    }

    setRides((prev) => {
      const updated = prev.filter(ride => ride.id !== id);
      localStorage.setItem('ridetrack_rides', JSON.stringify(updated));
      return updated;
    });
  };

  // Auth gate
  if (!currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>RIDE<span style={{color: 'var(--text-primary)'}}>TRACK</span></h1>
        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
          <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold'}}>{currentUser.name}</span>
          <div style={{width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--card-bg)'}}>
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            ) : (
              <User size={18} color="var(--accent-color)" />
            )}
          </div>
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
      {activeTab === 'profile' && (
        <Profile 
          rides={rides} 
          currentUser={currentUser} 
          onLogout={handleLogout} 
          onProfileUpdate={handleProfileUpdate}
        />
      )}

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

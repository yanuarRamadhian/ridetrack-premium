import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Award, Edit, Check, X, Shield, Activity, Compass, Flame } from 'lucide-react';

const Profile = ({ rides = [] }) => {
  // 1. Profile State initialized from localStorage
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('ridetrack_profile');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      name: "Yanuar Rider",
      bio: "Life is better on two wheels. 🏍️ Jakarta Asphalt Eater.",
      location: "Jakarta, Indonesia",
      avatar: "https://i.pravatar.cc/150?u=yanuar_rider"
    };
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...profile });

  // Save profile changes to localStorage
  const handleSave = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      const updated = { ...formData, name: formData.name.trim(), location: formData.location.trim(), bio: formData.bio.trim() };
      setProfile(updated);
      localStorage.setItem('ridetrack_profile', JSON.stringify(updated));
      setIsEditing(false);
    }
  };

  // 2. Calculate Lifetime Statistics Dynamically from rides prop
  const totalTrips = rides.length;
  
  const totalDistance = rides.reduce((sum, ride) => {
    return sum + (Number(ride.distance) || 0);
  }, 0);

  const maxTopSpeed = rides.reduce((max, ride) => {
    const speed = Number(ride.topSpeed) || 0;
    return speed > max ? speed : max;
  }, 0);

  const avgSpeedSum = rides.reduce((sum, ride) => {
    return sum + (Number(ride.avgSpeed) || 0);
  }, 0);
  
  const overallAvgSpeed = totalTrips > 0 ? (avgSpeedSum / totalTrips) : 0;

  // 3. Weekly Goal Target (50 km)
  const WEEKLY_GOAL_KM = 50;
  const goalPercentage = Math.min((totalDistance / WEEKLY_GOAL_KM) * 100, 100);

  // 4. Badges Achievement Logic
  const badgesList = [
    { id: 'beg', name: 'Asphalt Beginner', desc: 'Selesaikan perjalanan pertama Anda', minKm: 0, icon: <Flame size={16} /> },
    { id: 'urb', name: 'Urban Rider', desc: 'Mencapai total jarak 10 km', minKm: 10, icon: <Compass size={16} /> },
    { id: 'hwy', name: 'Highway King', desc: 'Mencapai total jarak 50 km', minKm: 50, icon: <Award size={16} /> },
    { id: 'iron', name: 'Iron Butt Master', desc: 'Mencapai total jarak 100 km', minKm: 100, icon: <Shield size={16} /> }
  ];

  return (
    <div className="dashboard" style={{ animation: 'fadeIn 0.4s ease' }}>
      
      {/* 1. Profile Bio Header Card */}
      <div className="profile-card">
        <div className="profile-banner"></div>
        <div className="profile-avatar-container">
          <img src={profile.avatar} alt={profile.name} className="profile-avatar" />
        </div>
        
        <div className="profile-info">
          {!isEditing ? (
            <>
              <div className="profile-name-row">
                <div>
                  <h2 className="profile-name">{profile.name}</h2>
                  <div className="profile-location">
                    <MapPin size={14} color="var(--accent-color)" /> {profile.location || "Earth"}
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => {
                    setFormData({ ...profile });
                    setIsEditing(true);
                  }}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <Edit size={14} /> Edit Profil
                </button>
              </div>
              <p className="profile-bio">{profile.bio}</p>
            </>
          ) : (
            <form className="profile-edit-form" onSubmit={handleSave}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px' }}>Edit Profil Rider</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nama Rider</span>
                <input 
                  type="text" 
                  className="profile-edit-input" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={25}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lokasi</span>
                <input 
                  type="text" 
                  className="profile-edit-input" 
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  maxLength={30}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Biografi Singkat</span>
                <textarea 
                  className="profile-edit-input" 
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  maxLength={100}
                  style={{ resize: 'none', height: '60px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: '0.875rem' }}>
                  <Check size={16} /> Simpan
                </button>
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setIsEditing(false)} 
                  style={{ flex: 1, fontSize: '0.875rem', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)' }}
                >
                  <X size={16} /> Batal
                </button>
              </div>
            </form>
          )}

          {/* Joined Date (Visual element) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            <Calendar size={12} /> Joined RideTrack in 2026
          </div>
        </div>
      </div>

      {/* 2. Lifetime Cumulative Stats Grid */}
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Lifetime Statistics
      </h3>
      <div className="stats-grid">
        <div className="stat-item-box active">
          <span className="stat-box-label">Total Jarak</span>
          <span className="stat-box-value">{totalDistance.toFixed(2)} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>km</span></span>
        </div>
        <div className="stat-item-box active">
          <span className="stat-box-label">Perjalanan</span>
          <span className="stat-box-value">{totalTrips} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>rides</span></span>
        </div>
        <div className="stat-item-box danger">
          <span className="stat-box-label">Kecepatan Puncak</span>
          <span className="stat-box-value">{maxTopSpeed.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>km/h</span></span>
        </div>
        <div className="stat-item-box active">
          <span className="stat-box-label">Rata-rata Kecepatan</span>
          <span className="stat-box-value">{overallAvgSpeed.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>km/h</span></span>
        </div>
      </div>

      {/* 3. Weekly Goals Module */}
      <div className="profile-goal-card">
        <div className="profile-goal-header">
          <div>
            <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Target Jarak Mingguan</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target Anda: {WEEKLY_GOAL_KM} km per minggu</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-color)' }}>{goalPercentage.toFixed(0)}%</span>
          </div>
        </div>
        
        <div className="profile-goal-bar-bg">
          <div className="profile-goal-bar-fill" style={{ width: `${goalPercentage}%` }}></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Terlampaui: {totalDistance.toFixed(1)} km</span>
          <span>Sisa: {Math.max(WEEKLY_GOAL_KM - totalDistance, 0).toFixed(1)} km lagi</span>
        </div>
      </div>

      {/* 4. Badges & Gelar Pencapaian */}
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Badges & Achievements
      </h3>
      <div className="badges-container">
        {badgesList.map(badge => {
          const isUnlocked = totalDistance >= badge.minKm;
          return (
            <div 
              key={badge.id} 
              className={`badge-pill ${isUnlocked ? '' : 'locked'}`}
              title={`${badge.name}: ${badge.desc} (${isUnlocked ? 'Unlocked' : `Requires ${badge.minKm} km`})`}
            >
              {badge.icon}
              <span>{badge.name}</span>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Profile;

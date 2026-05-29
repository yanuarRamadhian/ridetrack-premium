import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Award, Edit, Check, X, Shield, Activity, Compass, Flame, Upload } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PRESET_AVATARS = [
  { name: 'Red Helmet Tracker', url: 'https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?w=150&h=150&fit=crop&q=80' },
  { name: 'Cafe Racer Biker', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=150&h=150&fit=crop&q=80' },
  { name: 'Rider on Track', url: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=150&h=150&fit=crop&q=80' },
  { name: 'Adventure Rider', url: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=150&h=150&fit=crop&q=80' },
  { name: 'Scrambler Classic', url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=150&h=150&fit=crop&q=80' },
  { name: 'Urban Moto Racer', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&q=80' },
  { name: 'Sport Lady Biker', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80' },
  { name: 'Speedster MotoGP', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80' }
];

const Profile = ({ rides = [], currentUser, onLogout, onProfileUpdate }) => {
  // 1. Profile State initialized from localStorage / currentUser props
  const [profile, setProfile] = useState(() => {
    if (currentUser) {
      return {
        name: currentUser.name,
        bio: currentUser.bio || `Riding class: ${currentUser.bikeClass || '150cc'}. Let's tour! 🏍️`,
        location: currentUser.location || "Jakarta, Indonesia",
        avatar: currentUser.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(currentUser.email)}`
      };
    }
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

  // Social connection states (Add friends / followers)
  const [followingList, setFollowingList] = useState(() => {
    try {
      const saved = localStorage.getItem('ridetrack_following');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Fetch following list on component mount
  useEffect(() => {
    if (supabase && currentUser) {
      const fetchFollowing = async () => {
        try {
          const { data, error } = await supabase
            .from('friends')
            .select('*')
            .eq('user_id', currentUser.id);
          if (!error && data) {
            setFollowingList(data);
            localStorage.setItem('ridetrack_following', JSON.stringify(data));
          }
        } catch (err) {
          console.error("Gagal memuat list teman:", err);
        }
      };
      fetchFollowing();
    }
  }, [currentUser]);

  // Handle Friend Search using exact Account Code (RT-ID) or partial Username
  const handleFriendSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchResult(null);
    setSearchError('');

    let searchVal = searchQuery.trim();
    
    // Check if user entered an Account Code (e.g. RT-4)
    let parsedId = null;
    if (searchVal.toUpperCase().startsWith('RT-')) {
      parsedId = parseInt(searchVal.substring(3));
    }

    if (supabase) {
      try {
        let query = supabase.from('riders').select('*');
        if (parsedId !== null && !isNaN(parsedId)) {
          query = query.eq('id', parsedId);
        } else {
          query = query.ilike('name', `%${searchVal}%`);
        }

        const { data, error } = await query;
        if (error) {
          setSearchError("Gagal mencari rider: " + error.message);
        } else if (!data || data.length === 0) {
          setSearchError("Rider tidak ditemukan. Coba cek kembali Kode Akun atau Username!");
        } else {
          // Exclude ourselves
          const filtered = data.filter(r => r.id !== currentUser?.id);
          if (filtered.length === 0) {
            setSearchError("Anda tidak dapat menambahkan diri sendiri sebagai teman! 😉");
          } else {
            setSearchResult(filtered);
          }
        }
      } catch (err) {
        setSearchError("Kesalahan jaringan: " + err.message);
      } finally {
        setSearchLoading(false);
      }
    } else {
      // Offline fallback: Search local storage
      const users = JSON.parse(localStorage.getItem('ridetrack_users') || '[]');
      const filtered = users.filter(u => {
        const matches = parsedId !== null && !isNaN(parsedId) 
          ? u.id === parsedId 
          : u.name.toLowerCase().includes(searchVal.toLowerCase());
        return matches && u.id !== currentUser?.id;
      });

      if (filtered.length === 0) {
        setSearchError("Rider tidak ditemukan secara lokal!");
      } else {
        setSearchResult(filtered);
      }
      setSearchLoading(false);
    }
  };

  // Follow / Add friend rider action
  const handleFollowRider = async (rider) => {
    if (!currentUser) return;
    
    const isAlreadyFollowing = followingList.some(item => Number(item.friend_id) === Number(rider.id));
    if (isAlreadyFollowing) {
      alert(`Anda sudah berteman/mengikuti ${rider.name}!`);
      return;
    }

    const newFriendObj = {
      user_id: currentUser.id,
      friend_id: rider.id,
      friend_name: rider.name,
      friend_avatar: rider.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(rider.email || rider.id)}`
    };

    // Update state & localStorage locally
    const updatedList = [...followingList, newFriendObj];
    setFollowingList(updatedList);
    localStorage.setItem('ridetrack_following', JSON.stringify(updatedList));

    // Supabase Sync
    if (supabase) {
      try {
        const { error } = await supabase
          .from('friends')
          .insert([newFriendObj]);

        if (error) {
          console.error("Gagal menambahkan teman di Supabase:", error);
        } else {
          alert(`Berhasil mengikuti ${rider.name}! Rutenya kini akan muncul di filter Following Anda 🏍️`);
        }
      } catch (err) {
        console.error("Kesalahan jaringan mengikuti teman:", err);
      }
    } else {
      alert(`Berhasil mengikuti ${rider.name} secara lokal!`);
    }
  };

  // Unfollow / Remove friend action
  const handleUnfollowRider = async (friendId, friendName) => {
    if (!currentUser) return;
    
    if (window.confirm(`Apakah Anda yakin ingin berhenti berteman/mengikuti ${friendName}?`)) {
      const updatedList = followingList.filter(item => Number(item.friend_id) !== Number(friendId));
      setFollowingList(updatedList);
      localStorage.setItem('ridetrack_following', JSON.stringify(updatedList));

      if (supabase) {
        try {
          await supabase
            .from('friends')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('friend_id', friendId);
        } catch (err) {
          console.error("Gagal menghapus teman di Supabase:", err);
        }
      }
    }
  };

  // 1.1 Crop States for Interactive Circular Cropper Modal
  const [cropImage, setCropImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Handle local file selection - triggers the crop modal
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Harap unggah file gambar yang valid!");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setCropImage(event.target.result);
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Dragging event handlers for panning the avatar image inside circular viewport
  const handleDragStart = (clientX, clientY) => {
    setIsDragging(true);
    setDragStart({ x: clientX - pan.x, y: clientY - pan.y });
  };

  const handleDragMove = (clientX, clientY) => {
    if (!isDragging) return;
    setPan({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Performs actual image cropping in a virtual canvas to 150x150 pixels with 82% quality
  const handleCropSave = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');

      // Fill with dark theme background
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, 150, 150);

      // Viewport size: 180px, Canvas size: 150px
      const ratio = 150 / 180;
      const centerX = 150 / 2;
      const centerY = 150 / 2;

      // Fit inside 180x180 viewport
      const imgRatio = img.width / img.height;
      let drawW, drawH;
      if (imgRatio > 1) {
        drawW = 180;
        drawH = 180 / imgRatio;
      } else {
        drawW = 180 * imgRatio;
        drawH = 180;
      }

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.translate(pan.x * ratio, pan.y * ratio);
      ctx.scale(zoom, zoom);
      
      ctx.drawImage(img, - (drawW * ratio) / 2, - (drawH * ratio) / 2, drawW * ratio, drawH * ratio);
      ctx.restore();

      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setFormData({ ...formData, avatar: croppedDataUrl });
      setCropImage(null); // Close crop modal
    };
    img.src = cropImage;
  };

  // Save profile changes to localStorage and sync global user db
  const handleSave = (e) => {
    e.preventDefault();
    if (formData.name.trim()) {
      const updated = { ...formData, name: formData.name.trim(), location: formData.location.trim(), bio: formData.bio.trim() };
      setProfile(updated);
      localStorage.setItem('ridetrack_profile', JSON.stringify(updated));
      
      if (currentUser) {
        const updatedUser = { ...currentUser, name: updated.name, location: updated.location, bio: updated.bio, avatar: updated.avatar };
        localStorage.setItem('ridetrack_current_user', JSON.stringify(updatedUser));
        
        // Also update in registered users database
        const users = JSON.parse(localStorage.getItem('ridetrack_users') || '[]');
        const updatedUsers = users.map(u => u.email.toLowerCase() === currentUser.email.toLowerCase() ? { ...u, name: updated.name, location: updated.location, bio: updated.bio, avatar: updated.avatar } : u);
        localStorage.setItem('ridetrack_users', JSON.stringify(updatedUsers));
        
        // Supabase Cloud Update for riders table!
        if (supabase) {
          supabase
            .from('riders')
            .update({ 
              name: updated.name, 
              location: updated.location, 
              bio: updated.bio,
              avatar: updated.avatar 
            })
            .eq('id', currentUser.id)
            .then(({ error }) => {
              if (error) console.error("Gagal sinkronisasi profil ke Supabase:", error);
            });
        }

        if (onProfileUpdate) {
          onProfileUpdate(updatedUser);
        }
      }
      
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
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px' }}>
                    <div className="profile-location" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="var(--accent-color)" /> {profile.location || "Jakarta, Indonesia"}
                    </div>
                    {currentUser?.id && (
                      <span 
                        title="Klik untuk menyalin Kode Akun" 
                        onClick={() => {
                          navigator.clipboard.writeText(`RT-${currentUser.id}`);
                          alert("Kode Akun berhasil disalin! Bagikan ke teman Anda untuk di-invite 🏍️");
                        }}
                        style={{
                          backgroundColor: 'rgba(0, 255, 136, 0.1)',
                          border: '1px solid rgba(0, 255, 136, 0.25)',
                          color: 'var(--accent-color)',
                          fontSize: '0.68rem',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        🆔 RT-{currentUser.id}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={() => {
                      setFormData({ ...profile });
                      setIsEditing(true);
                    }}
                    style={{
                      padding: '0.5rem 0.9rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--text-primary)',
                      borderRadius: '12px'
                    }}
                  >
                    <Edit size={14} /> Edit
                  </button>
                  {onLogout && (
                    <button 
                      type="button" 
                      className="btn-logout" 
                      onClick={onLogout}
                      title="Keluar Sesi Rider"
                    >
                      Keluar
                    </button>
                  )}
                </div>
              </div>
              <p className="profile-bio">{profile.bio}</p>
            </>
          ) : (
            <form className="profile-edit-form" onSubmit={handleSave}>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '8px' }}>Edit Profil Rider</h3>
              
              {/* Profile Avatar Selection Gallery */}
              <div style={{ marginBottom: '1rem' }}>
                <span className="avatar-gallery-label">Pilih Foto Profil Sporty 🏍️</span>
                <div className="avatar-gallery-grid">
                  {PRESET_AVATARS.map((item, idx) => {
                    const isSelected = formData.avatar === item.url;
                    return (
                      <div 
                        key={idx} 
                        className={`avatar-gallery-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, avatar: item.url })}
                        title={item.name}
                        type="button"
                      >
                        <img src={item.url} alt={item.name} />
                        {isSelected && <div className="avatar-gallery-checkmark">✓</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Local Device File Upload Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ATAU UNGGAH FOTO DARI DEVICE:</span>
                  <label 
                    className="btn" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '8px', 
                      fontSize: '0.8rem', 
                      padding: '10px 14px', 
                      backgroundColor: 'rgba(0, 255, 136, 0.05)', 
                      border: '1.5px dashed rgba(0, 255, 136, 0.25)',
                      color: 'var(--accent-color)',
                      cursor: 'pointer',
                      borderRadius: '12px',
                      transition: 'all 0.2s ease',
                      fontWeight: 'bold'
                    }}
                  >
                    <Upload size={14} /> Pilih Foto dari HP / PC
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ATAU TEMPEL URL FOTO KUSTOM:</span>
                  <input 
                    type="url" 
                    className="profile-edit-input" 
                    placeholder="https://example.com/foto-anda.jpg"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  />
                </div>
              </div>

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

      {/* 5. Friends & Followers Social Module */}
      <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: '1.5rem 0 0.75rem 0', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Temukan Teman / Klub Rider
      </h3>
      <div className="profile-goal-card" style={{ marginBottom: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
        <h4 style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '8px', color: 'var(--accent-color)' }}>
          🔍 Tambah Teman Lintas Akun (Strava Mode)
        </h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Masukkan <strong>Kode Akun</strong> (contoh: <code>RT-4</code>) atau <strong>Username</strong> teman Anda untuk saling mengikuti rute touring!
        </p>

        {/* Invite Code Search Form */}
        <form onSubmit={handleFriendSearch} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input 
            type="text" 
            placeholder="e.g. RT-4 atau Rian" 
            className="profile-edit-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, margin: 0, padding: '10px 14px', fontSize: '0.85rem' }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px', fontSize: '0.85rem' }} disabled={searchLoading}>
            {searchLoading ? 'Mencari...' : 'Cari Rider'}
          </button>
        </form>

        {/* Search Results Display */}
        {searchError && (
          <div style={{ fontSize: '0.78rem', color: 'var(--danger-color)', backgroundColor: 'rgba(255, 51, 102, 0.08)', padding: '8px 12px', borderRadius: '10px', marginBottom: '12px' }}>
            ⚠️ {searchError}
          </div>
        )}

        {searchResult && searchResult.length > 0 && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>RIDER DITEMUKAN:</span>
            {searchResult.map(rider => {
              const isFollowing = followingList.some(item => Number(item.friend_id) === Number(rider.id));
              return (
                <div key={rider.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={rider.avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(rider.email || rider.id)}`} 
                      alt={rider.name} 
                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-color)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '0.82rem', color: '#fff' }}>{rider.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>🆔 RT-{rider.id} | {rider.location}</div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: '8px', backgroundColor: isFollowing ? 'rgba(255,255,255,0.08)' : 'var(--accent-color)', color: isFollowing ? 'var(--text-secondary)' : '#000', border: isFollowing ? '1px solid rgba(255,255,255,0.1)' : 'none' }}
                    onClick={() => handleFollowRider(rider)}
                    disabled={isFollowing}
                  >
                    {isFollowing ? '✓ Diikuti' : '+ Ikuti / Add'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Following List Panel */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginTop: '12px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
            👥 TEMAN YANG ANDA IKUTI ({followingList.length}):
          </span>
          {followingList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {followingList.map(friend => (
                <div key={friend.friend_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img 
                      src={friend.friend_avatar || 'https://i.pravatar.cc/150'} 
                      alt={friend.friend_name} 
                      style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-primary)' }}>{friend.friend_name}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>RT-{friend.friend_id}</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    style={{ fontSize: '0.68rem', padding: '4px 8px', borderRadius: '6px' }}
                    onClick={() => handleUnfollowRider(friend.friend_id, friend.friend_name)}
                  >
                    Batal Ikuti
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0' }}>
              Belum ada teman yang diikuti. Bagikan kode akun Anda atau undang teman baru untuk berkendara bersama! 🏍️
            </div>
          )}
        </div>
      </div>

      {/* Interactive Crop Modal Overlay */}
      {cropImage && (
        <div className="crop-modal-overlay">
          <div className="crop-modal-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0 }}>Sesuaikan Foto Anda ✂️</h3>
            <p className="crop-instructions">Geser gambar untuk menyesuaikan posisi. Gunakan slider di bawah untuk memperbesar/memperkecil.</p>
            
            <div 
              className="crop-viewport"
              onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
              onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
            >
              <img 
                src={cropImage} 
                className="crop-image-element" 
                style={{ 
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isDragging ? 'none' : 'transform 0.05s ease'
                }} 
              />
            </div>
            
            <span className="crop-zoom-label">Perbesar / Perkecil</span>
            <input 
              type="range" 
              min="1" 
              max="3" 
              step="0.05" 
              value={zoom} 
              className="crop-zoom-slider"
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            />
            
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleCropSave}
                style={{ flex: 2, fontSize: '0.85rem', padding: '10px 14px' }}
              >
                <Check size={14} /> Potong & Simpan
              </button>
              <button 
                type="button" 
                className="btn" 
                onClick={() => setCropImage(null)}
                style={{ flex: 1, fontSize: '0.85rem', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}
              >
                <X size={14} /> Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;

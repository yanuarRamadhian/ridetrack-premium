import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { Heart, MessageCircle, Share2, MapPin, MoreVertical, Edit2, Trash2, Check, X, Send } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../lib/supabaseClient';

// Custom glowing Leaflet DivIcons for Start and End coordinates
const startIcon = typeof window !== 'undefined' ? L.divIcon({
  html: `<div style="background-color: var(--accent-color); width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px var(--accent-color);"></div>`,
  className: 'custom-gps-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
}) : null;

const endIcon = typeof window !== 'undefined' ? L.divIcon({
  html: `<div style="background-color: var(--danger-color); width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px var(--danger-color);"></div>`,
  className: 'custom-gps-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
}) : null;

const Dashboard = ({ rides = [], onUpdateRideTitle, onDeleteRide }) => {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitleText, setEditTitleText] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // MotoGP tilt active ID
  const [activeTiltId, setActiveTiltId] = useState(null);

  // Current logged in user info (for posting comments)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('ridetrack_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Local storage lists for liked rides
  const [likedIds, setLikedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('ridetrack_liked_rides');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Local state for likes count overrides (so updates are instant and fluid!)
  const [likesOverrides, setLikesOverrides] = useState({});

  // Local state for comments list map
  const [commentsMap, setCommentsMap] = useState(() => {
    try {
      const saved = localStorage.getItem('ridetrack_comments_map');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Open comments drawer ID
  const [activeCommentsRideId, setActiveCommentsRideId] = useState(null);
  const [commentInputText, setCommentInputText] = useState('');

  // Handle Like trigger
  const handleLike = async (rideId, currentLikes) => {
    const isAlreadyLiked = likedIds.includes(rideId);
    let newLikes = currentLikes;
    let newLikedIds = [...likedIds];

    if (isAlreadyLiked) {
      newLikes = Math.max(0, currentLikes - 1);
      newLikedIds = newLikedIds.filter(id => id !== rideId);
    } else {
      newLikes = currentLikes + 1;
      newLikedIds.push(rideId);
    }

    // Update state & localStorage
    setLikedIds(newLikedIds);
    localStorage.setItem('ridetrack_liked_rides', JSON.stringify(newLikedIds));
    setLikesOverrides(prev => ({ ...prev, [rideId]: newLikes }));

    // Supabase Cloud Sync
    if (supabase) {
      try {
        await supabase
          .from('rides')
          .update({ likes: newLikes })
          .eq('id', rideId);
      } catch (err) {
        console.error("Gagal sinkronisasi likes ke Supabase:", err);
      }
    }
  };

  // Handle Comment Submit
  const handleCommentSubmit = async (e, rideId) => {
    e.preventDefault();
    if (!commentInputText.trim()) return;

    const newCommentObj = {
      user: currentUser?.name || "Rider Speedster ⚡",
      avatar: currentUser?.avatar || "https://i.pravatar.cc/150",
      content: commentInputText.trim(),
      date: "Baru saja"
    };

    // Update comments array in map locally first for zero-lag premium UX
    const currentComments = commentsMap[rideId] || [];
    const updatedComments = [...currentComments, newCommentObj];
    const newCommentsMap = { ...commentsMap, [rideId]: updatedComments };

    setCommentsMap(newCommentsMap);
    localStorage.setItem('ridetrack_comments_map', JSON.stringify(newCommentsMap));
    setCommentInputText('');

    // Insert comment row globally into Supabase comments table
    if (supabase) {
      try {
        const { error: insertErr } = await supabase
          .from('comments')
          .insert([{
            ride_id: rideId,
            rider_name: newCommentObj.user,
            rider_avatar: newCommentObj.avatar,
            content: newCommentObj.content
          }]);

        if (insertErr) {
          console.error("Gagal menyimpan komentar ke Supabase:", insertErr);
        }

        // Also update comment counts in rides table
        await supabase
          .from('rides')
          .update({ comments: updatedComments.length })
          .eq('id', rideId);
      } catch (err) {
        console.error("Gagal sinkronisasi comments ke Supabase:", err);
      }
    }
  };

  // Fetch global comments from Supabase Cloud Table
  useEffect(() => {
    if (supabase) {
      const fetchGlobalComments = async () => {
        try {
          const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: true });

          if (!error && data) {
            // Group comments by ride_id
            const grouped = {};
            data.forEach(item => {
              if (!grouped[item.ride_id]) {
                grouped[item.ride_id] = [];
              }
              grouped[item.ride_id].push({
                id: item.id,
                user: item.rider_name,
                avatar: item.rider_avatar,
                content: item.content,
                date: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            });
            // Update commentsMap state & sync with localStorage
            setCommentsMap(grouped);
            localStorage.setItem('ridetrack_comments_map', JSON.stringify(grouped));
          } else if (error) {
            console.warn("Gagal mengambil komentar dari Supabase, beralih ke local storage:", error.message);
          }
        } catch (err) {
          console.error("Gagal koneksi tabel komentar Supabase:", err);
        }
      };
      fetchGlobalComments();
    }
  }, [rides]);

  // Close options menu when clicking outside anywhere on the screen
  React.useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleMenuToggle = (e, id) => {
    e.stopPropagation(); // Avoid closing immediately from the document event listener
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  return (
    <div className="dashboard">
      <div style={{marginBottom: '1.5rem', display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem'}}>
        {/* Quick filters / tags */}
        <span style={{padding: '0.5rem 1rem', backgroundColor: 'var(--card-bg)', borderRadius: '20px', fontSize: '0.875rem', whiteSpace: 'nowrap'}}>All Rides</span>
        <span style={{padding: '0.5rem 1rem', backgroundColor: 'var(--accent-color)', color: '#000', borderRadius: '20px', fontSize: '0.875rem', whiteSpace: 'nowrap', fontWeight: 'bold'}}>Following</span>
        <span style={{padding: '0.5rem 1rem', backgroundColor: 'var(--card-bg)', borderRadius: '20px', fontSize: '0.875rem', whiteSpace: 'nowrap'}}>Clubs</span>
      </div>

      {rides.map(ride => (
        <div key={ride.id} className="stat-card" style={{padding: '0', overflow: 'hidden', marginBottom: '1.5rem', position: 'relative'}}>
          
          {/* Deletion Confirmation Screen Overlay */}
          {deletingId === ride.id && (
            <div className="confirm-overlay">
              <div className="confirm-overlay-title">Hapus Aktivitas?</div>
              <div className="confirm-overlay-desc">Apakah Anda yakin ingin menghapus "{ride.title}" secara permanen? Tindakan ini tidak dapat dibatalkan.</div>
              <div className="confirm-overlay-actions">
                <button 
                  type="button"
                  className="btn btn-danger" 
                  onClick={() => {
                    onDeleteRide(ride.id);
                    setDeletingId(null);
                  }}
                  style={{padding: '0.5rem 1.25rem', fontSize: '0.875rem'}}
                >
                  Ya, Hapus
                </button>
                <button 
                  type="button"
                  className="btn" 
                  onClick={() => setDeletingId(null)}
                  style={{padding: '0.5rem 1.25rem', fontSize: '0.875rem', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)'}}
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* User Info & Options Menu */}
          <div style={{padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <img src={ride.avatar} alt={ride.user} style={{width: '40px', height: '40px', borderRadius: '50%'}} />
            <div style={{flex: 1}}>
              <div style={{fontWeight: 'bold'}}>{ride.user}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{ride.date}</div>
            </div>
            
            {/* Options Menu Dropdown Button */}
            <div className="card-menu-container">
              <button 
                type="button"
                className="card-menu-btn" 
                onClick={(e) => handleMenuToggle(e, ride.id)}
              >
                <MoreVertical size={20} />
              </button>
              
              {activeMenuId === ride.id && (
                <div className="card-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button 
                    type="button"
                    className="card-menu-item"
                    onClick={() => {
                      setEditingId(ride.id);
                      setEditTitleText(ride.title);
                      setActiveMenuId(null);
                    }}
                  >
                    <Edit2 size={16} /> Edit Judul
                  </button>
                  <button 
                    type="button"
                    className="card-menu-item danger"
                    onClick={() => {
                      setDeletingId(ride.id);
                      setActiveMenuId(null);
                    }}
                  >
                    <Trash2 size={16} /> Hapus Perjalanan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ride Title or Inline Edit Form */}
          <div style={{padding: '0 1rem 1rem 1rem'}}>
            {editingId === ride.id ? (
              <form 
                className="inline-edit-form" 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editTitleText.trim()) {
                    onUpdateRideTitle(ride.id, editTitleText.trim());
                  }
                  setEditingId(null);
                }}
              >
                <input 
                  type="text" 
                  className="inline-edit-input" 
                  value={editTitleText}
                  onChange={(e) => setEditTitleText(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" className="inline-edit-btn save" title="Simpan Judul">
                  <Check size={18} />
                </button>
                <button 
                  type="button" 
                  className="inline-edit-btn cancel" 
                  onClick={() => setEditingId(null)}
                  title="Batal"
                >
                  <X size={18} />
                </button>
              </form>
            ) : (
              <h3 style={{fontSize: '1.1rem', marginBottom: '0.5rem'}}>{ride.title}</h3>
            )}
            
            {/* Stats Grid */}
            <div style={{display: 'flex', gap: '1.5rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap'}}>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Distance</div>
                <div style={{fontWeight: 'bold'}}>{Number(ride.distance).toFixed(2)} <span style={{fontSize: '0.75rem'}}>km</span></div>
              </div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Top Speed</div>
                <div style={{fontWeight: 'bold'}}>{Number(ride.topSpeed).toFixed(1)} <span style={{fontSize: '0.75rem'}}>km/h</span></div>
              </div>
              <div>
                <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Avg Speed</div>
                <div style={{fontWeight: 'bold'}}>{Number(ride.avgSpeed).toFixed(1)} <span style={{fontSize: '0.75rem'}}>km/h</span></div>
              </div>
              {ride.maxLeanLeft && (
                <div className="cornering-stat-pill" title="Maksimum Sudut Kemiringan Belok Kiri & Kanan">
                  📐 L {ride.maxLeanLeft}° / R {ride.maxLeanRight}°
                </div>
              )}
            </div>
          </div>

          {/* Interactive Leaflet Map */}
          {ride.route && ride.route.length > 0 ? (
            <div style={{height: '240px', width: '100%', backgroundColor: '#111'}}>
              <MapContainer 
                center={[ride.route[Math.floor(ride.route.length / 2)][0], ride.route[Math.floor(ride.route.length / 2)][1]]} 
                zoom={12} 
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                dragging={true}
                scrollWheelZoom={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                
                {/* Draw speed heatmap: check if route points contain speed values (3rd element) */}
                {ride.route[0] && ride.route[0].length >= 3 ? (
                  ride.route.slice(1).map((point, idx) => {
                    const start = ride.route[idx];
                    const end = point;
                    const speedVal = end[2] || 0;
                    
                    let segmentColor = 'var(--accent-color)'; // Default Kawasaki Green
                    if (speedVal > 75) {
                      segmentColor = '#ef4444'; // Red
                    } else if (speedVal > 45) {
                      segmentColor = '#f97316'; // Orange
                    }
                    
                    return (
                      <Polyline 
                        key={idx} 
                        positions={[[start[0], start[1]], [end[0], end[1]]]} 
                        color={segmentColor} 
                        weight={5} 
                      />
                    );
                  })
                ) : (
                  // Fallback for older coordinates structure (simple lat/lng arrays)
                  <Polyline positions={ride.route} color="var(--accent-color)" weight={4} />
                )}
                
                {/* Start Point Marker */}
                {startIcon && (
                  <Marker position={[ride.route[0][0], ride.route[0][1]]} icon={startIcon}>
                    <Popup>
                      <div>
                        <strong>🏁 START POINT</strong><br />
                        Jarak Tempuh: <strong>{Number(ride.distance).toFixed(2)} km</strong><br />
                        Avg Speed: <strong>{Number(ride.avgSpeed).toFixed(1)} km/h</strong>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* End Point Marker */}
                {endIcon && (
                  <Marker position={[ride.route[ride.route.length - 1][0], ride.route[ride.route.length - 1][1]]} icon={endIcon}>
                    <Popup>
                      <div>
                        <strong>🏆 END POINT</strong><br />
                        Aktivitas: <strong>{ride.title}</strong><br />
                        Top Speed: <strong>{Number(ride.topSpeed).toFixed(1)} km/h</strong>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Convoy companions on feed maps near end point */}
                {ride.route.length > 0 && (
                  <>
                    <Marker 
                      position={[ride.route[ride.route.length - 1][0] + 0.0002, ride.route[ride.route.length - 1][1] + 0.0003]} 
                      icon={L.divIcon({ html: '<div class="custom-companion-marker" title="Rian Rider (ZX-25R)"></div>', className: 'poi-companion-rider', iconSize: [14, 14], iconAnchor: [7, 7] })}
                    >
                      <Popup>
                        <div><strong>🏍️ Rian Rider (ZX-25R)</strong><br />Convoy Companion</div>
                      </Popup>
                    </Marker>
                    <Marker 
                      position={[ride.route[ride.route.length - 1][0] - 0.0003, ride.route[ride.route.length - 1][1] - 0.0002]} 
                      icon={L.divIcon({ html: `<div class="custom-companion-marker" style="background-color: #a855f7; box-shadow: 0 0 15px #a855f7;" title="Alex Rider (CRF250)"></div>`, className: 'poi-companion-rider', iconSize: [14, 14], iconAnchor: [7, 7] })}
                    >
                      <Popup>
                        <div><strong>🏍️ Alex Rider (CRF250 Rally)</strong><br />Convoy Companion</div>
                      </Popup>
                    </Marker>
                  </>
                )}
              </MapContainer>
            </div>
          ) : (
            <div style={{height: '240px', width: '100%', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'}}>
              No Route Data
            </div>
          )}

          {/* MotoGP Inclinometer Telemetry Gauges */}
          {ride.maxLeanLeft && Number(ride.maxLeanLeft) > 0 && (
            <div className="motogp-telemetry-panel">
              <div className="motogp-title-row">
                <span className="motogp-title-tag">🏁 MotoGP Lean Angle Telemetry</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Hover motor untuk miring!</span>
              </div>
              <div className="motogp-gauge-wrapper">
                {/* Left Lean angle */}
                <div className="motogp-degree-badge" style={{ color: 'var(--warning-color)' }}>
                  L {ride.maxLeanLeft}°
                </div>
                
                {/* Visual bar scale */}
                <div className="motogp-tilt-scale">
                  <div className="motogp-tilt-fill left" style={{ width: `${Math.min((Number(ride.maxLeanLeft) / 55) * 50, 50)}%` }}></div>
                  <div className="motogp-tilt-fill right" style={{ width: `${Math.min((Number(ride.maxLeanRight) / 55) * 50, 50)}%` }}></div>
                </div>
                
                {/* Central dynamic interactive bike silhouette indicator */}
                <div 
                  className="motogp-bike-indicator"
                  style={{ transform: `rotate(${activeTiltId === ride.id ? -Number(ride.maxLeanLeft) : Number(ride.maxLeanRight)}deg)` }}
                  onMouseEnter={() => setActiveTiltId(ride.id)}
                  onMouseLeave={() => setActiveTiltId(null)}
                  onTouchStart={() => setActiveTiltId(ride.id)}
                  onTouchEnd={() => setActiveTiltId(null)}
                >
                  🏍️
                </div>

                {/* Right Lean angle */}
                <div className="motogp-degree-badge" style={{ color: 'var(--accent-color)' }}>
                  R {ride.maxLeanRight}°
                </div>
              </div>
            </div>
          )}

          {/* Actions Bar */}
          {(() => {
            const activeLikesCount = likesOverrides[ride.id] !== undefined ? likesOverrides[ride.id] : (ride.likes || 0);
            const isLiked = likedIds.includes(ride.id);
            const localComments = commentsMap[ride.id] || [];
            const activeCommentsCount = (ride.comments || 0) + localComments.length;

            return (
              <>
                <div style={{padding: '1rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: activeCommentsRideId === ride.id ? '1px solid rgba(255,255,255,0.05)' : 'none'}}>
                  <div style={{display: 'flex', gap: '1.5rem'}}>
                    <div 
                      style={{display: 'flex', alignItems: 'center', gap: '0.35rem', color: isLiked ? '#ff3366' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: isLiked ? 'bold' : 'normal'}}
                      onClick={() => handleLike(ride.id, ride.likes || 0)}
                    >
                      <Heart size={20} className={isLiked ? "liked-heart" : ""} /> {activeLikesCount}
                    </div>
                    <div 
                      style={{display: 'flex', alignItems: 'center', gap: '0.35rem', color: activeCommentsRideId === ride.id ? 'var(--accent-color)' : 'var(--text-secondary)', cursor: 'pointer'}}
                      onClick={() => setActiveCommentsRideId(activeCommentsRideId === ride.id ? null : ride.id)}
                    >
                      <MessageCircle size={20} /> {activeCommentsCount}
                    </div>
                  </div>
                  <div 
                    style={{color: 'var(--text-secondary)', cursor: 'pointer'}}
                    onClick={() => {
                      navigator.clipboard.writeText(`Rute Touring keren "${ride.title}" oleh ${ride.user}! Jarak: ${ride.distance}km.`);
                      alert("Tautan aktivitas disalin! Bagikan ke teman klub motor Anda 🏍️");
                    }}
                  >
                    <Share2 size={20} />
                  </div>
                </div>

                {/* Collapsible Comments Section Drawer */}
                {activeCommentsRideId === ride.id && (
                  <div className="comments-section-container">
                    {/* Add Comment Input Form */}
                    <form className="comment-input-row" onSubmit={(e) => handleCommentSubmit(e, ride.id)}>
                      <input 
                        type="text" 
                        placeholder="Tulis komentar touring..." 
                        className="comment-text-input"
                        value={commentInputText}
                        onChange={(e) => setCommentInputText(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn btn-primary" style={{padding: '8px 12px', borderRadius: '12px'}}>
                        <Send size={14} />
                      </button>
                    </form>

                    {/* Comments List */}
                    <div className="comments-list">
                      {localComments.length > 0 ? (
                        localComments.map((comment, index) => (
                          <div key={index} className="comment-item">
                            <img src={comment.avatar} alt={comment.user} className="comment-avatar" />
                            <div className="comment-bubble">
                              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2px'}}>
                                <span style={{fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--accent-color)'}}>{comment.user}</span>
                                <span style={{fontSize: '0.65rem', color: 'var(--text-secondary)'}}>{comment.date}</span>
                              </div>
                              <p style={{margin: 0, fontSize: '0.78rem', color: 'var(--text-color)', textAlign: 'left'}}>{comment.content}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0'}}>
                          Belum ada komentar. Jadilah yang pertama memberikan masukan! 🏍️
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
};

export default Dashboard;

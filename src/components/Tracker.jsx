import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Pause, Navigation, Compass, MapPin, Wrench, Shield } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Haversine formula to calculate distance between two coordinates in km
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

// Helper component to auto-pan the Leaflet map as the user moves
function ChangeView({ center, autoCenter }) {
  const map = useMap();
  useEffect(() => {
    if (center && autoCenter) {
      map.setView(center, map.getZoom());
    }
  }, [center, autoCenter]);
  return null;
}

// Captures manual dragging and zooming gestures to toggle autoCenter off
function MapEventsHandler({ onManualInteraction }) {
  const map = useMap();
  useEffect(() => {
    const handleInteraction = () => {
      onManualInteraction();
    };
    
    map.on('dragstart', handleInteraction);
    map.on('zoomstart', handleInteraction);
    
    return () => {
      map.off('dragstart', handleInteraction);
      map.off('zoomstart', handleInteraction);
    };
  }, [map, onManualInteraction]);
  
  return null;
}

// Custom glowing Rider Marker DivIcon
const riderIcon = typeof window !== 'undefined' ? L.divIcon({
  html: `<div class="custom-rider-marker"></div>`,
  className: 'custom-gps-rider',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
}) : null;

// Custom pulsing Group Convoy Companion Icons
const companionIconRian = typeof window !== 'undefined' ? L.divIcon({
  html: `<div class="custom-companion-marker" title="Rian Rider (ZX-25R)"></div>`,
  className: 'custom-convoy-rider',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
}) : null;

const companionIconAlex = typeof window !== 'undefined' ? L.divIcon({
  html: `<div class="custom-companion-marker" style="background-color: #a855f7; box-shadow: 0 0 15px #a855f7;" title="Alex Rider (CRF250)"></div>`,
  className: 'custom-convoy-rider',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
}) : null;

// SPBU & Bengkel POI Markers DivIcons
const spbuIcon = typeof window !== 'undefined' ? L.divIcon({
  html: `<div class="custom-poi-spbu-marker" title="SPBU Fuel Station">⛽</div>`,
  className: 'poi-gps-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
}) : null;

const bengkelIcon = typeof window !== 'undefined' ? L.divIcon({
  html: `<div class="custom-poi-bengkel-marker" title="Bengkel Service Station">🔧</div>`,
  className: 'poi-gps-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
}) : null;

// Realistic scenic route in Jakarta: Monas -> MH Thamrin -> Bundaran HI -> Sudirman -> Semanggi -> Senayan -> Blok M
const JAKARTA_ROUTE = [
  [-6.175392, 106.827153], // Monas Start
  [-6.180479, 106.827824],
  [-6.186524, 106.823485], // Sarinah
  [-6.192500, 106.823000],
  [-6.193235, 106.822998], // Bundaran HI
  [-6.197000, 106.822500],
  [-6.200192, 106.822345],
  [-6.204500, 106.821000],
  [-6.208573, 106.819876], // Dukuh Atas
  [-6.212000, 106.819000],
  [-6.214590, 106.818321],
  [-6.218000, 106.817500],
  [-6.221543, 106.816543], // Semanggi
  [-6.223500, 106.814000],
  [-6.225567, 106.811543], // GBK
  [-6.228000, 106.808000],
  [-6.230123, 106.804567], // Senayan
  [-6.235000, 106.802500],
  [-6.238456, 106.801234]  // Blok M End
];

// Mock Biker POIs
const BIKER_POIS = [
  { id: 'spbu_1', type: 'spbu', name: 'SPBU Shell Sudirman', detail: 'Pertamax Turbo & V-Power Available', lat: -6.195000, lng: 106.822600 },
  { id: 'spbu_2', type: 'spbu', name: 'SPBU Pertamina Semanggi', detail: 'Pertamax Dex & Turbo Fastlane', lat: -6.220500, lng: 106.815500 },
  { id: 'repair_1', type: 'bengkel', name: 'Bengkel Motor 24Jam Dukuh Atas', detail: 'Chain lube, tire patch & spareparts', lat: -6.206000, lng: 106.820200 },
  { id: 'repair_2', type: 'bengkel', name: 'Bengkel Superbike Senayan', detail: 'Professional tune up & tire service', lat: -6.233000, lng: 106.803500 }
];

const Tracker = ({ onSaveRide }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSimulated, setIsSimulated] = useState(true); // Default to simulated on desktop for easy testing
  const [distance, setDistance] = useState(0); // in km
  const [speed, setSpeed] = useState(0); // in km/h
  const [topSpeed, setTopSpeed] = useState(0); // in km/h
  const [duration, setDuration] = useState(0); // in seconds
  const [route, setRoute] = useState([]); // array of [lat, lng, speed]
  const [autoCenter, setAutoCenter] = useState(true); // Lock map camera to rider
  
  // Real-world Lean Angle & Calibration State
  const [leanLeft, setLeanLeft] = useState(0);
  const [leanRight, setLeanRight] = useState(0);
  const [maxLeanLeft, setMaxLeanLeft] = useState(0);
  const [maxLeanRight, setMaxLeanRight] = useState(0);
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const currentRawGamma = useRef(0);

  // POI Layer Toggling
  const [showPOIs, setShowPOIs] = useState(false);

  // Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [rideTitle, setRideTitle] = useState('');

  const watchId = useRef(null);
  const timerRef = useRef(null);
  const lastPosition = useRef(null);
  const simulationIndexRef = useRef(0);

  // Real Gyro DeviceOrientation handler
  const handleDeviceOrientation = (event) => {
    const rawGamma = event.gamma; // rotation left/right in degrees
    if (rawGamma !== null) {
      currentRawGamma.current = rawGamma;
      
      // Calculate angle subtracting user's calibration offset
      const calibratedAngle = rawGamma - calibrationOffset;
      
      // Threshold: ignore vibrations & slight shakes under 4.5 degrees
      if (calibratedAngle < -4.5) {
        const leanL = Math.min(Math.abs(calibratedAngle), 55); // cap at realistic 55 degree knee-down limit
        setLeanLeft(leanL);
        setLeanRight(0);
        setMaxLeanLeft(prev => Math.max(prev, leanL));
      } else if (calibratedAngle > 4.5) {
        const leanR = Math.min(calibratedAngle, 55); // cap at realistic 55 degree limit
        setLeanRight(leanR);
        setLeanLeft(0);
        setMaxLeanRight(prev => Math.max(prev, leanR));
      } else {
        setLeanLeft(0);
        setLeanRight(0);
      }
    }
  };

  // Perform Giroskop Zero-Point calibration based on current stang placement angle
  const handleCalibrate = () => {
    setCalibrationOffset(currentRawGamma.current);
    alert(`Giroskop berhasil dikalibrasi! Sudut stang saat ini ditetapkan sebagai 0°`);
  };

  // Ask and bind real mobile gyroscope hardware permissions
  const bindRealGyroscope = async () => {
    if (typeof window !== 'undefined' && 
        typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleDeviceOrientation);
        } else {
          console.warn("Sensor Giroskop ditolak oleh sistem iOS.");
        }
      } catch (err) {
        console.error("Gagal mendapatkan izin Giroskop iOS:", err);
      }
    } else if (typeof window !== 'undefined') {
      // Android / non-iOS standard browsers
      window.addEventListener('deviceorientation', handleDeviceOrientation);
    }
  };

  const unbindRealGyroscope = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
    }
  };

  useEffect(() => {
    if (isRecording && !isPaused) {
      if (isSimulated) {
        // ------------------ GPS SIMULATION MODE ------------------
        timerRef.current = setInterval(() => {
          setDuration(prev => {
            const nextDuration = prev + 1;
            
            // Advance route coordinate index every second
            simulationIndexRef.current++;
            const pointIndex = simulationIndexRef.current % JAKARTA_ROUTE.length;
            const nextPoint = JAKARTA_ROUTE[pointIndex];

            // Simulate realistic vehicle speed oscillation (acceleration/deceleration)
            // Oscillates between ~35 km/h and ~85 km/h, simulating real riding traffic
            const simulatedSpeed = 52 + Math.sin(nextDuration / 4) * 25 + Math.random() * 8;
            setSpeed(simulatedSpeed);
            setTopSpeed(ts => Math.max(ts, simulatedSpeed));
            
            // Update route path state with SPEED coordinate [lat, lng, speed]
            const nextPointWithSpeed = [nextPoint[0], nextPoint[1], simulatedSpeed];
            setRoute(prevRoute => [...prevRoute, nextPointWithSpeed]);

            // Simulate Lean Angle cornering based on route curves
            const turnOscillation = Math.sin(nextDuration / 2.2);
            if (Math.abs(turnOscillation) > 0.35) {
              const currentLean = Math.abs(turnOscillation) * 28 + Math.random() * 5;
              if (turnOscillation < 0) {
                setLeanLeft(currentLean);
                setLeanRight(0);
                setMaxLeanLeft(ml => Math.max(ml, currentLean));
              } else {
                setLeanRight(currentLean);
                setLeanLeft(0);
                setMaxLeanRight(mr => Math.max(mr, currentLean));
              }
            } else {
              setLeanLeft(0);
              setLeanRight(0);
            }

            // Accumulate distance realistically based on simulated speed (speed in km/h / 3600 = km per second)
            const distInKm = simulatedSpeed / 3600;
            setDistance(d => d + distInKm);

            return nextDuration;
          });
        }, 1000);

      } else {
        // ------------------ REAL GPS TRACKING MODE ------------------
        // Activate Mobile Hardware Gyro sensor listeners
        bindRealGyroscope();

        timerRef.current = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);

        if ("geolocation" in navigator) {
          watchId.current = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude, longitude, speed: gpsSpeed } = position.coords;
              
              let currentSpeed = 0;
              if (gpsSpeed !== null && gpsSpeed >= 0) {
                currentSpeed = gpsSpeed * 3.6; // m/s to km/h
              }
              
              setSpeed(currentSpeed);
              setTopSpeed(prev => Math.max(prev, currentSpeed));

              const newPointWithSpeed = [latitude, longitude, currentSpeed];
              setRoute(prev => [...prev, newPointWithSpeed]);

              if (lastPosition.current) {
                const dist = calculateDistance(
                  lastPosition.current.latitude,
                  lastPosition.current.longitude,
                  latitude,
                  longitude
                );
                setDistance(prev => prev + dist);
              }
              lastPosition.current = { latitude, longitude };
            },
            (error) => {
              console.error("Error getting location:", error);
            },
            {
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 5000
            }
          );
        }
      }
    } else {
      clearInterval(timerRef.current);
      if (watchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      unbindRealGyroscope();
    }

    return () => {
      clearInterval(timerRef.current);
      if (watchId.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      unbindRealGyroscope();
    };
  }, [isRecording, isPaused, isSimulated, calibrationOffset]);

  // Start a new ride from scratch
  const handleStartNew = () => {
    setDistance(0);
    setSpeed(0);
    setTopSpeed(0);
    setDuration(0);
    setRideTitle('');
    setLeanLeft(0);
    setLeanRight(0);
    setMaxLeanLeft(0);
    setMaxLeanRight(0);
    setCalibrationOffset(0);
    currentRawGamma.current = 0;
    simulationIndexRef.current = 0;
    
    if (isSimulated) {
      setRoute([[JAKARTA_ROUTE[0][0], JAKARTA_ROUTE[0][1], 0]]);
      lastPosition.current = { latitude: JAKARTA_ROUTE[0][0], longitude: JAKARTA_ROUTE[0][1] };
    } else {
      setRoute([]);
      lastPosition.current = null;
    }
    
    setIsRecording(true);
    setIsPaused(false);

    // Call iOS Gyro Permission on user click gesture
    if (!isSimulated) {
      bindRealGyroscope();
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    setLeanLeft(0);
    setLeanRight(0);
    unbindRealGyroscope();
  };

  const handleResume = () => {
    setIsPaused(false);
    if (!isSimulated) {
      bindRealGyroscope();
    }
  };

  const handleStop = () => {
    setIsPaused(true); // Temporarily pause recording
    setLeanLeft(0);
    setLeanRight(0);
    unbindRealGyroscope();
    setShowSaveModal(true); // Show confirmation modal
  };

  const handleSaveConfirm = () => {
    const finalTitle = rideTitle.trim() || `Ride Sore Nyore #${Date.now().toString().slice(-4)}`;
    const avgSpeed = duration > 0 ? (distance / (duration / 3600)) : 0;
    
    // Fallback lean values if we didn't tilt
    const finalMaxLeanLeft = maxLeanLeft > 0 ? maxLeanLeft : (18 + Math.random() * 15);
    const finalMaxLeanRight = maxLeanRight > 0 ? maxLeanRight : (18 + Math.random() * 15);

    const newRide = {
      id: Date.now(),
      user: "Yanuar Speedster ⚡",
      avatar: "https://i.pravatar.cc/150?u=yanuar_rider",
      title: finalTitle,
      date: "Today at " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distance: distance.toFixed(2),
      topSpeed: topSpeed.toFixed(1),
      avgSpeed: avgSpeed.toFixed(1),
      likes: 0,
      comments: 0,
      route: route,
      maxLeanLeft: finalMaxLeanLeft.toFixed(0),
      maxLeanRight: finalMaxLeanRight.toFixed(0)
    };

    onSaveRide(newRide); // Pass to top-level state
    
    // Reset tracker states
    setIsRecording(false);
    setIsPaused(false);
    setShowSaveModal(false);
  };

  const handleDiscard = () => {
    if (window.confirm("Apakah Anda yakin ingin membuang data perjalanan ini?")) {
      setIsRecording(false);
      setIsPaused(false);
      setShowSaveModal(false);
      setRoute([]);
    }
  };

  // Format duration mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate live companion coordinates near active rider (only shown in simulation mode)
  const currentPos = route.length > 0 ? route[route.length - 1] : null;
  const companionRianPos = currentPos ? [currentPos[0] + 0.0003, currentPos[1] + 0.0004] : null;
  const companionAlexPos = currentPos ? [currentPos[0] - 0.0004, currentPos[1] - 0.0003] : null;

  return (
    <div className="tracker-display" style={{ width: '100%' }}>
      {/* Mode Selector - Only visible when not recording */}
      {!isRecording && (
        <div className="mode-selector">
          <button 
            type="button"
            className={`mode-btn ${isSimulated ? 'active' : ''}`}
            onClick={() => setIsSimulated(true)}
          >
            <Compass size={16} /> GPS Simulator
          </button>
          <button 
            type="button"
            className={`mode-btn ${!isSimulated ? 'active' : ''}`}
            onClick={() => setIsSimulated(false)}
          >
            <Navigation size={16} /> Real GPS
          </button>
        </div>
      )}

      {/* Main Speed Stat */}
      <div className="main-stat">
        {speed.toFixed(1)}
        <span style={{fontSize: '1.5rem', color: 'var(--text-secondary)'}}> km/h</span>
      </div>
      <div style={{color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '0.875rem', marginBottom: '1rem'}}>
        {isSimulated ? 'Simulated Speed' : 'Current Speed'}
      </div>

      {/* lean angle giro visualizer */}
      {isRecording && !isPaused && (
        <div className="lean-container-box" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="lean-meter-circle">
            <div 
              className="lean-bike-silhouette"
              style={{ transform: `rotate(${leanLeft > 0 ? -leanLeft : leanRight}deg)` }}
            >
              🏍️
            </div>
          </div>
          <div>
            <div className="lean-angle-tag">
              {leanLeft > 0 ? `L ${leanLeft.toFixed(0)}°` : leanRight > 0 ? `R ${leanRight.toFixed(0)}°` : '0°'}
            </div>
            <div className="lean-angle-subtext">Sudut Miring</div>
            
            {/* Real Hardware Calibration Button */}
            {!isSimulated && (
              <button 
                type="button"
                className="btn btn-primary"
                onClick={handleCalibrate}
                style={{ fontSize: '0.7rem', padding: '4px 10px', marginTop: '6px', borderRadius: '8px' }}
              >
                <Wrench size={10} style={{ marginRight: '4px' }} /> Kalibrasi 0°
              </button>
            )}
          </div>
          <div className="lean-stats-column">
            <div className="lean-stat-badge left">
              Left Max: {maxLeanLeft.toFixed(0)}°
            </div>
            <div className="lean-stat-badge right">
              Right Max: {maxLeanRight.toFixed(0)}°
            </div>
          </div>
        </div>
      )}

      {/* Ride Stats Grid */}
      <div className="tracker-grid">
        <div className="stat-card">
          <div className="stat-value">{distance.toFixed(2)}</div>
          <div className="stat-label">Jarak (km)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{topSpeed.toFixed(1)}</div>
          <div className="stat-label">Kecepatan Top (km/h)</div>
        </div>
        <div className="stat-card" style={{gridColumn: 'span 2'}}>
          <div className="stat-value">{formatTime(duration)}</div>
          <div className="stat-label">Elapsed Time</div>
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{width: '100%', display: 'flex', gap: '1rem', marginTop: '0.5rem', zIndex: 10}}>
        {!isRecording ? (
          <button className="btn btn-primary" onClick={handleStartNew}>
            <Play fill="black" /> START RIDE
          </button>
        ) : (
          <>
            {isPaused ? (
              <button className="btn btn-primary" onClick={handleResume} style={{flex: 1}}>
                <Play fill="black" /> RESUME
              </button>
            ) : (
              <button className="btn" onClick={handlePause} style={{flex: 1, backgroundColor: 'var(--warning-color)', color: '#000'}}>
                <Pause fill="black" /> PAUSE
              </button>
            )}
            <button className="btn btn-danger" onClick={handleStop} style={{flex: 1}}>
              <Square fill="white" /> STOP
            </button>
          </>
        )}
      </div>

      {/* Map Preview */}
      {route.length > 0 && (
        <div className="map-container" style={{ position: 'relative', marginTop: '1.5rem' }}>
          {/* Floating Auto-Center Compass Button */}
          <button 
            type="button"
            className={`auto-center-btn ${autoCenter ? 'active' : ''}`}
            onClick={() => setAutoCenter(true)}
            title={autoCenter ? "Auto-Center Locked" : "Click to Lock Auto-Center"}
          >
            <Compass size={22} />
          </button>

          {/* Floating Biker POI toggle button */}
          <button 
            type="button"
            className={`poi-toggle-btn ${showPOIs ? 'active' : ''}`}
            onClick={() => setShowPOIs(!showPOIs)}
            title={showPOIs ? "Hide Biker POIs" : "Show SPBU & Bengkel POIs"}
          >
            <MapPin size={20} />
          </button>

          <MapContainer 
            center={[route[route.length - 1][0], route[route.length - 1][1]]} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            dragging={true}
          >
            <ChangeView center={[route[route.length - 1][0], route[route.length - 1][1]]} autoCenter={autoCenter} />
            <MapEventsHandler onManualInteraction={() => setAutoCenter(false)} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            
            {/* Draw speed heatmap: we map segment polylines instead of a single polyline! */}
            {route.slice(1).map((point, index) => {
              const startPoint = route[index];
              const endPoint = point;
              const pointSpeed = endPoint[2] || 0;

              // Color based on simulated speed: Red (> 75 km/h), Orange (45-75 km/h), Green (< 45 km/h)
              let segmentColor = 'var(--accent-color)'; // Default Kawasaki Green
              if (pointSpeed > 75) {
                segmentColor = '#ef4444'; // Red
              } else if (pointSpeed > 45) {
                segmentColor = '#f97316'; // Orange
              }

              return (
                <Polyline 
                  key={index} 
                  positions={[[startPoint[0], startPoint[1]], [endPoint[0], endPoint[1]]]} 
                  color={segmentColor} 
                  weight={5.5} 
                />
              );
            })}

            {/* Active Rider Marker */}
            {riderIcon && (
              <Marker position={[route[route.length - 1][0], route[route.length - 1][1]]} icon={riderIcon}>
                <Popup>
                  <div>
                    <strong>🏍️ ACTIVE RIDER</strong><br />
                    Kecepatan: <strong>{speed.toFixed(1)} km/h</strong><br />
                    Lean Angle: <strong>{leanLeft > 0 ? `L ${leanLeft.toFixed(0)}°` : leanRight > 0 ? `R ${leanRight.toFixed(0)}°` : '0°'}</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Convoy Group Ride Companions Radar Markers (Only visible in Simulation/convoy mode) */}
            {isRecording && !isPaused && isSimulated && companionIconRian && companionRianPos && (
              <Marker position={companionRianPos} icon={companionIconRian}>
                <Popup>
                  <div>
                    <strong>🏍️ Rian Rider (ZX-25R)</strong><br />
                    Status: <span style={{color: 'var(--accent-color)'}}>Convoy Companion</span><br />
                    Jarak: <strong>50m Ahead</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {isRecording && !isPaused && isSimulated && companionIconAlex && companionAlexPos && (
              <Marker position={companionAlexPos} icon={companionIconAlex}>
                <Popup>
                  <div>
                    <strong>🏍️ Alex Rider (CRF250 Rally)</strong><br />
                    Status: <span style={{color: 'var(--accent-color)'}}>Convoy Companion</span><br />
                    Jarak: <strong>80m Behind</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Biker SPBU & Bengkel POIs Layer */}
            {showPOIs && BIKER_POIS.map(poi => (
              <Marker 
                key={poi.id} 
                position={[poi.lat, poi.lng]} 
                icon={poi.type === 'spbu' ? spbuIcon : bengkelIcon}
              >
                <Popup>
                  <div>
                    <strong>{poi.type === 'spbu' ? '⛽ ' : '🔧 '}{poi.name}</strong><br />
                    <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{poi.detail}</span>
                  </div>
                </Popup>
              </Marker>
            ))}

          </MapContainer>
        </div>
      )}

      {/* Premium Save Ride Modal Overlay */}
      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Save Your Ride</h3>
            <p className="modal-desc">Hebat! Perekaman telah selesai. Masukkan judul perjalanan Anda untuk disimpan ke feed.</p>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px'}}>
              <div>
                <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Jarak</span>
                <div style={{fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--accent-color)'}}>{distance.toFixed(2)} km</div>
              </div>
              <div>
                <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Durasi</span>
                <div style={{fontWeight: 'bold', fontSize: '1.25rem'}}>{formatTime(duration)}</div>
              </div>
              <div>
                <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Kecepatan Top</span>
                <div style={{fontWeight: 'bold', fontSize: '1.25rem'}}>{topSpeed.toFixed(1)} km/h</div>
              </div>
              <div>
                <span style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Lean Left/Right</span>
                <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>
                  L {maxLeanLeft.toFixed(0)}° / R {maxLeanRight.toFixed(0)}°
                </div>
              </div>
            </div>

            <div className="modal-input-group">
              <label className="modal-label">Ride Title</label>
              <input 
                type="text" 
                className="modal-input" 
                placeholder="e.g. Sore Nyore di Sudirman 🏍️"
                value={rideTitle}
                onChange={(e) => setRideTitle(e.target.value)}
                maxLength={40}
              />
            </div>

            <div className="modal-actions">
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={handleSaveConfirm}
                style={{flex: 2, padding: '0.75rem'}}
              >
                Save Ride
              </button>
              <button 
                type="button"
                className="btn btn-danger" 
                onClick={handleDiscard}
                style={{flex: 1, padding: '0.75rem', backgroundColor: 'rgba(255,51,102,0.1)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)'}}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tracker;

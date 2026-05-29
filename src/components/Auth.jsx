import React, { useState } from 'react';
import { User, Mail, Lock, MapPin, Compass, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const Auth = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [bikeClass, setBikeClass] = useState('150cc-250cc');
  const [error, setError] = useState('');

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ------------------ SUPABASE CLOUD PIPELINE ------------------
    if (supabase) {
      try {
        if (isLogin) {
          // Cloud Login
          const { data: user, error: loginError } = await supabase
            .from('riders')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();

          if (loginError) {
            setError(`Error database: ${loginError.message}`);
            return;
          }

          if (!user) {
            setError('Email tidak terdaftar. Silakan buat akun terlebih dahulu!');
            return;
          }

          if (user.password !== password) {
            setError('Password salah! Cek kembali kredensial Anda.');
            return;
          }

          // Map database snake_case fields back to React camelCase
          const mappedUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            location: user.location,
            bikeClass: user.bike_class || '150cc-250cc',
            bio: user.bio || `Riding class: ${user.bike_class}. Let's tour! 🏍️`,
            joined: user.created_at ? new Date(user.created_at).getFullYear() : 2026
          };

          onLoginSuccess(mappedUser);
        } else {
          // Cloud Register
          if (!name.trim()) {
            setError('Nama Rider wajib diisi!');
            return;
          }

          // Check if email already taken
          const { data: emailCheck, error: checkError } = await supabase
            .from('riders')
            .select('email')
            .eq('email', email.toLowerCase())
            .maybeSingle();

          if (checkError) {
            setError(`Error database: ${checkError.message}`);
            return;
          }

          if (emailCheck) {
            setError('Email sudah digunakan! Gunakan email lain atau silakan Masuk.');
            return;
          }

          // Register new rider
          const { data: newUser, error: regError } = await supabase
            .from('riders')
            .insert([{
              name: name.trim(),
              email: email.toLowerCase(),
              password: password,
              location: location.trim() || 'Jakarta, Indonesia',
              bike_class: bikeClass,
              bio: `Riding class: ${bikeClass}. Let's tour! 🏍️`
            }])
            .select()
            .single();

          if (regError) {
            setError(`Gagal mendaftar: ${regError.message}`);
            return;
          }

          const mappedUser = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            password: newUser.password,
            location: newUser.location,
            bikeClass: newUser.bike_class || '150cc-250cc',
            bio: newUser.bio || `Riding class: ${newUser.bike_class}. Let's tour! 🏍️`,
            joined: new Date(newUser.created_at).getFullYear()
          };

          onLoginSuccess(mappedUser);
        }
      } catch (err) {
        setError(`Kesalahan koneksi internet: ${err.message}`);
      }
      return;
    }

    // ------------------ LOCALSTORAGE FALLBACK PIPELINE ------------------
    // Fetch registered users database and pre-seed with default admin if empty
    const users = JSON.parse(localStorage.getItem('ridetrack_users') || '[]');
    if (users.length === 0) {
      const defaultUser = {
        id: 1,
        name: "Yanuar Speedster ⚡",
        email: "yanuar@ridetrack.com",
        password: "password123",
        location: "Jakarta, Indonesia",
        bikeClass: "150cc-250cc",
        bio: "Riding class: 150cc-250cc. Let's tour! 🏍️",
        joined: 2026
      };
      users.push(defaultUser);
      localStorage.setItem('ridetrack_users', JSON.stringify(users));
    }

    if (isLogin) {
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        setError('Email tidak terdaftar. Silakan buat akun terlebih dahulu!');
        return;
      }
      
      if (user.password !== password) {
        setError('Password salah! Cek kembali kredensial Anda.');
        return;
      }

      onLoginSuccess(user);
    } else {
      if (!name.trim()) {
        setError('Nama Rider wajib diisi!');
        return;
      }

      const emailExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        setError('Email sudah digunakan! Gunakan email lain atau silakan Masuk.');
        return;
      }

      const newUser = {
        id: Date.now(),
        name: name.trim(),
        email: email.toLowerCase(),
        password: password,
        location: location.trim() || 'Jakarta, Indonesia',
        bikeClass: bikeClass,
        bio: `Riding class: ${bikeClass}. Let's tour! 🏍️`,
        joined: new Date().getFullYear()
      };

      users.push(newUser);
      localStorage.setItem('ridetrack_users', JSON.stringify(users));

      onLoginSuccess(newUser);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-logo">RIDE<span>TRACK</span></h2>
          <p className="auth-subtitle">
            {isLogin ? 'Masuk untuk mencatat rute sunmori Anda' : 'Buat akun rider premium baru Anda'}
          </p>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: 'rgba(255, 51, 102, 0.1)',
            border: '1px solid rgba(255, 51, 102, 0.2)',
            borderRadius: '12px',
            color: 'var(--danger-color)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            animation: 'fadeIn 0.2s ease'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Register Only Fields */}
          {!isLogin && (
            <>
              <div className="auth-input-group">
                <label className="auth-label">Nama Rider</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="auth-input" 
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="e.g. Yanuar Speedster"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Lokasi</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="auth-input" 
                    style={{ paddingLeft: '2.75rem' }}
                    placeholder="e.g. Bandung, Indonesia"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">Kelas Motor</label>
                <div style={{ position: 'relative' }}>
                  <Compass size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  <select 
                    className="auth-select" 
                    style={{ paddingLeft: '2.75rem' }}
                    value={bikeClass}
                    onChange={(e) => setBikeClass(e.target.value)}
                  >
                    <option value="Under 150cc">Bebek/Matic (Under 150cc)</option>
                    <option value="150cc-250cc">Sport/Naked (150cc-250cc)</option>
                    <option value="250cc-600cc">Adventure/Moge (250cc-600cc)</option>
                    <option value="Superbike 600cc+">Superbike (600cc+)</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Standard Fields (Both Login and Register) */}
          <div className="auth-input-group">
            <label className="auth-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" 
                className="auth-input" 
                style={{ paddingLeft: '2.75rem' }}
                placeholder="rider@ridetrack.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="rgba(255,255,255,0.4)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" 
                className="auth-input" 
                style={{ paddingLeft: '2.75rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-auth">
            {isLogin ? 'MASUK SEKARANG 🏍️' : 'DAFTAR SEBAGAI RIDER 🏆'}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <>
              Belum punya akun? 
              <button 
                type="button" 
                className="auth-toggle-btn"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
              >
                Daftar Akun
              </button>
            </>
          ) : (
            <>
              Sudah punya akun? 
              <button 
                type="button" 
                className="auth-toggle-btn"
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
              >
                Masuk
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

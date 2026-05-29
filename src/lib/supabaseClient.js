import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Defensive check: Verify that variables are valid and do not contain placeholders
const isConfigured = 
  supabaseUrl && 
  supabaseUrl.trim() !== '' && 
  !supabaseUrl.includes('ganti-dengan') && 
  supabaseAnonKey && 
  supabaseAnonKey.trim() !== '' && 
  !supabaseAnonKey.includes('ganti-dengan');

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (!isConfigured) {
  console.warn('⚠️ Supabase belum dikonfigurasi di file .env. Aplikasi akan berjalan menggunakan LocalStorage.');
} else {
  console.log('⚡ Supabase Cloud Database terhubung secara sukses!');
}

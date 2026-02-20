// Supabase Configuration
// Copy file ini menjadi 'supabase-config.js' dan isi dengan credentials kamu

const SUPABASE_CONFIG = {
    // Ganti dengan URL project kamu dari Supabase Dashboard → Settings → API
    url: 'https://opmfmqmrvybciumukpew.supabase.co',

    // Ganti dengan anon/public key kamu dari Supabase Dashboard → Settings → API
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wbWZtcW1ydnliY2l1bXVrcGV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjA5OTUsImV4cCI6MjA4Njk5Njk5NX0.4MxUfxx6seF2V_UaTo-cuTevL1zgBl38pi_bvzW8QtE'
};

// Jangan ubah kode di bawah ini
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}

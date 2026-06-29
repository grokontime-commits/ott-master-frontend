(function () {
  const config = window.OTT_CONFIG || {};

  function requireSupabaseConfig() {
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in ott-config.js');
    }
  }

  async function loginWithPassword(email, password) {
    requireSupabaseConfig();

    const response = await fetch(`${config.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: config.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${config.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.msg || payload?.error_description || payload?.error || 'Supabase login failed');
    }

    const accessToken = payload.access_token;
    if (!accessToken) {
      throw new Error('Supabase login did not return access_token');
    }

    window.OTTApi.setAccessToken(accessToken);
    sessionStorage.setItem('ott_user_email', email);
    return payload;
  }

  function logout() {
    window.OTTApi.clearAccessToken();
    sessionStorage.removeItem('ott_user_email');
  }

  function isLoggedIn() {
    return Boolean(window.OTTApi.getAccessToken());
  }

  window.OTTAuth = {
    login: loginWithPassword,
    loginWithPassword,
    logout,
    isLoggedIn
  };
})();

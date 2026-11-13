window.AccountAPI = {
  currentUser: null,
  _localAccountsKey: "gd_local_accounts",
  _localSessionKey: "gd_local_session",

  _url(path) {
    return `${window._apiBase}${path}`;
  },

  _readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  _writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },

  _localAccounts() {
    const accounts = this._readJSON(this._localAccountsKey, {});
    return accounts && typeof accounts === "object" ? accounts : {};
  },

  _saveLocalAccounts(accounts) {
    this._writeJSON(this._localAccountsKey, accounts);
  },

  _localSaveKey(username) {
    return `gd_local_save_${String(username || "").toLowerCase()}`;
  },

  _randomSalt() {
    try {
      const bytes = new Uint8Array(16);
      worldCrypto().getRandomValues(bytes);
      return Array.from(bytes).map(byte => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    }
  },

  async _hashPassword(password, salt) {
    const value = `${salt}:${password}`;
    try {
      if (!worldCrypto().subtle) throw new Error("Subtle crypto unavailable");
      const encoded = new TextEncoder().encode(value);
      const digest = await worldCrypto().subtle.digest("SHA-256", encoded);
      return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      let hash = 2166136261;
      for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return `fallback-${(hash >>> 0).toString(16)}`;
    }
  },

  _localUser(record) {
    return {
      id: record.id,
      username: record.username,
      email: record.email || "",
      local: true
    };
  },

  _getLocalSession() {
    const session = this._readJSON(this._localSessionKey, null);
    if (!session || !session.username) return null;
    const record = this._localAccounts()[String(session.username).toLowerCase()];
    return record ? this._localUser(record) : null;
  },

  _setLocalSession(record) {
    this._writeJSON(this._localSessionKey, {
      username: record.username,
      id: record.id
    });
  },

  _clearLocalSession() {
    try {
      localStorage.removeItem(this._localSessionKey);
    } catch {}
  },

  async _localRegister(username, email, password) {
    const cleanUsername = String(username || "").trim();
    if (!cleanUsername || !password) {
      throw new Error("Enter username and password.");
    }

    const key = cleanUsername.toLowerCase();
    const accounts = this._localAccounts();
    if (accounts[key]) {
      throw new Error("Username already exists.");
    }

    const salt = this._randomSalt();
    const record = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      username: cleanUsername,
      email: String(email || "").trim(),
      salt,
      passwordHash: await this._hashPassword(password, salt),
      createdAt: Date.now()
    };
    accounts[key] = record;
    this._saveLocalAccounts(accounts);
    this._setLocalSession(record);
    this.currentUser = this._localUser(record);
    return this.currentUser;
  },

  async _localLogin(username, password) {
    const cleanUsername = String(username || "").trim();
    const record = this._localAccounts()[cleanUsername.toLowerCase()];
    if (!record) {
      throw new Error("Wrong username or password.");
    }

    const hash = await this._hashPassword(String(password || ""), record.salt);
    if (hash !== record.passwordHash) {
      throw new Error("Wrong username or password.");
    }

    this._setLocalSession(record);
    this.currentUser = this._localUser(record);
    return this.currentUser;
  },

  _localLogout() {
    this._clearLocalSession();
    this.currentUser = null;
  },

  async checkSession() {
    let remoteUser = null;
    try {
      const res = await fetch(this._url('/api/auth/me'), { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        remoteUser = data && data.user ? data.user : null;
        if (remoteUser) remoteUser.local = false;
      }
    } catch {}

    this.currentUser = remoteUser || this._getLocalSession();
    return this.currentUser;
  },

  async login(username, password) {
    try {
      const res = await fetch(this._url('/api/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || 'Login failed');
        error.status = res.status;
        if (res.status === 404 || res.status >= 500) {
          return this._localLogin(username, password);
        }
        throw error;
      }
      if (!data.user) throw new Error('Login failed');
      data.user.local = false;
      this._clearLocalSession();
      this.currentUser = data.user;
      return data.user;
    } catch (error) {
      if (error.status) throw error;
      return this._localLogin(username, password);
    }
  },

  async register(username, email, password) {
    try {
      const res = await fetch(this._url('/api/auth/register'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email: email || undefined, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(data.error || 'Registration failed');
        error.status = res.status;
        if (res.status === 404 || res.status >= 500) {
          return this._localRegister(username, email, password);
        }
        throw error;
      }
      if (!data.user) throw new Error('Registration failed');
      data.user.local = false;
      this._clearLocalSession();
      this.currentUser = data.user;
      return data.user;
    } catch (error) {
      if (error.status) throw error;
      return this._localRegister(username, email, password);
    }
  },

  async logout() {
    try {
      await fetch(this._url('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch {}
    this._localLogout();
  },

  clearClientData() {
    try {
      const keys = [
        'gd_settings', 'gd_totalAttempts', 'gd_totalJumps', 'gd_totalDeaths',
        'gd_completedLevels', 'created_levels', 'iconMainColor', 'iconSecondaryColor',
        'iconCurrentPlayer', 'iconCurrentShip', 'iconCurrentBall', 'iconCurrentWave',
        'iconCurrentSpider', 'iconCurrentBird', 'userMusicVol', 'userSfxVol',
        'menuMusicEnabled',
      ];
      for (const key of keys) {
        localStorage.removeItem(key);
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('bestPercent_') || key.startsWith('practiceBestPercent_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {}

    try {
      sessionStorage.clear();
    } catch {}

    try {
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (const cookie of cookies) {
        const eqIndex = cookie.indexOf('=');
        const name = (eqIndex >= 0 ? cookie.slice(0, eqIndex) : cookie).trim();
        if (!name) continue;
        const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
        const path = 'path=/';
        document.cookie = `${name}=; ${expires}; ${path}`;
        document.cookie = `${name}=; ${expires}; ${path}; domain=${location.hostname}`;
      }
    } catch {}
  },

  async unlinkAccount() {
    await this.logout();
    this.clearClientData();
  },

  async getCloudSave() {
    if (this.currentUser && this.currentUser.local) {
      return this._readJSON(this._localSaveKey(this.currentUser.username), null);
    }

    try {
      const res = await fetch(this._url('/api/saves'), { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to load save');
      return data.save;
    } catch (error) {
      if (this.currentUser && this.currentUser.username) {
        const localSave = this._readJSON(this._localSaveKey(this.currentUser.username), null);
        if (localSave) return localSave;
      }
      throw error;
    }
  },

  async setCloudSave(saveData) {
    const save = saveData || this.collectLocalData();
    if (this.currentUser && this.currentUser.local) {
      this._writeJSON(this._localSaveKey(this.currentUser.username), save);
      return { local: true };
    }

    try {
      const res = await fetch(this._url('/api/saves'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      return { local: false };
    } catch (error) {
      if (this.currentUser && !this.currentUser.local) {
        this._writeJSON(this._localSaveKey(this.currentUser.username), save);
        return { local: true };
      }
      throw error;
    }
  },

  collectLocalData() {
    const keys = [
      'gd_settings', 'gd_totalAttempts', 'gd_totalJumps', 'gd_totalDeaths',
      'gd_completedLevels', 'gd_completedSet', 'gd_profile_levels',
      'gd_totalsecretcoins', 'gd_totalusercoins', 'created_levels',
      'iconMainColor', 'iconSecondaryColor',
      'iconCurrentPlayer', 'iconCurrentShip', 'iconCurrentBall', 'iconCurrentWave',
      'iconCurrentSpider', 'iconCurrentBird', 'userMusicVol', 'userSfxVol',
      'menuMusicEnabled',
    ];
    const save = {};
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val !== null) save[key] = val;
    }
    const bestPercents = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('bestPercent_') || k.startsWith('practiceBestPercent_'))) {
        bestPercents[k] = localStorage.getItem(k);
      }
    }
    save._bestPercents = bestPercents;
    return save;
  },

  applyLocalData(save) {
    if (!save) return;
    const keys = [
      'gd_settings', 'gd_totalAttempts', 'gd_totalJumps', 'gd_totalDeaths',
      'gd_completedLevels', 'gd_completedSet', 'gd_profile_levels',
      'gd_totalsecretcoins', 'gd_totalusercoins', 'created_levels',
      'iconMainColor', 'iconSecondaryColor',
      'iconCurrentPlayer', 'iconCurrentShip', 'iconCurrentBall', 'iconCurrentWave',
      'iconCurrentSpider', 'iconCurrentBird', 'userMusicVol', 'userSfxVol',
      'menuMusicEnabled',
    ];
    for (const key of keys) {
      if (save[key] !== undefined) localStorage.setItem(key, save[key]);
    }
    if (save._bestPercents) {
      for (const [k, v] of Object.entries(save._bestPercents)) {
        localStorage.setItem(k, v);
      }
    }
  },
};

function worldCrypto() {
  return window.crypto || window.msCrypto || {};
}

// Check session silently on page load so currentUser is populated before
// the player opens the settings screen. If the hosted backend is offline,
// this restores a local account session instead of leaving Account locked.
window.AccountAPI.checkSession().catch(() => {});

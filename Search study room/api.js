const API_BASE = 'http://localhost:3001/api';

const api = {
  _token: sessionStorage.getItem('authToken'),

  _headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this._token) h['Authorization'] = 'Bearer ' + this._token;
    return h;
  },

  setToken(token) {
    this._token = token;
    sessionStorage.setItem('authToken', token);
  },

  clearToken() {
    this._token = null;
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
  },

  isLoggedIn() { return !!this._token; },

  getCurrentUser() {
    const u = sessionStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
  },

  setCurrentUser(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  },

  async request(method, path, body) {
    try {
      const opts = { method, headers: this._headers() };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(API_BASE + path, opts);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { this.clearToken(); }
        throw { status: res.status, message: data.error || 'Request failed', data };
      }
      return data;
    } catch (err) {
      if (err.status) throw err;
      throw { status: 0, message: 'Network error — is the server running?' };
    }
  },

  // Auth
  async login(studentId, password) {
    const data = await this.request('POST', '/auth/login', { studentId, password });
    this.setToken(data.token);
    this.setCurrentUser(data.user);
    return data;
  },

  async register(studentId, email, password) {
    const data = await this.request('POST', '/auth/register', { studentId, email, password });
    this.setToken(data.token);
    this.setCurrentUser(data.user);
    return data;
  },

  // Buildings & Rooms
  getBuildings() { return this.request('GET', '/buildings'); },

  getRoomsAvailability(buildingId, level, date, startTime, duration) {
    const params = new URLSearchParams({ buildingId, level, date, startTime, duration });
    return this.request('GET', '/rooms/availability?' + params);
  },

  // Bookings
  createBooking(roomId, date, startTime, durationHours, title, remarks) {
    return this.request('POST', '/bookings', { roomId, date, startTime, durationHours, title, remarks });
  },

  getMyBookings() { return this.request('GET', '/bookings/me'); },

  cancelBooking(id) { return this.request('PATCH', '/bookings/' + id + '/cancel'); },
};

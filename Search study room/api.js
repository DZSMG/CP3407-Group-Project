const API_BASE = 'http://localhost:3001/api';
let authToken = sessionStorage.getItem('authToken');

const api = {
  setToken(token) {
    authToken = token;
    sessionStorage.setItem('authToken', token);
  },

  clearToken() {
    authToken = null;
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
  },

  isLoggedIn() {
    return !!authToken;
  },

  getUser() {
    const u = sessionStorage.getItem('authUser');
    return u ? JSON.parse(u) : null;
  },

  setUser(user) {
    sessionStorage.setItem('authUser', JSON.stringify(user));
  },

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Request failed' };
    return data;
  },

  // Auth
  login(studentId, password) {
    return this.request('POST', '/auth/login', { studentId, password });
  },

  register(studentId, email, password) {
    return this.request('POST', '/auth/register', { studentId, email, password });
  },

  getProfile() {
    return this.request('GET', '/auth/me');
  },

  // Rooms
  getBuildings() {
    return this.request('GET', '/buildings');
  },

  getRooms(buildingId, floor, type) {
    const params = new URLSearchParams({ buildingId });
    if (floor) params.append('floor', floor);
    if (type && type !== 'All') params.append('type', type);
    return this.request('GET', '/rooms?' + params);
  },

  getFloorAvailability(buildingId, floor, date, startTime, durationHours) {
    const params = new URLSearchParams({
      buildingId: String(buildingId),
      floor,
      date,
      startTime,
      durationHours: String(durationHours),
    });
    return this.request('GET', '/rooms/floor-availability?' + params);
  },

  getRoomAvailability(roomId, date, startTime, durationHours) {
    const params = new URLSearchParams({ date, startTime, durationHours: String(durationHours) });
    return this.request('GET', `/rooms/${roomId}/availability?` + params);
  },

  // Bookings
  createBooking(roomId, date, startTime, durationHours) {
    return this.request('POST', '/bookings', { roomId, date, startTime, durationHours });
  },

  getMyBookings() {
    return this.request('GET', '/bookings/me');
  },

  cancelBooking(id) {
    return this.request('PATCH', `/bookings/${id}/cancel`);
  },
};

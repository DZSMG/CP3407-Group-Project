// Library seat layout — purely UI concern for rendering the map grid
const libraryMapData = {
    "Level 1": {
        unbookable: [1,2,3,4,5],
        left: [
            [[1, 2], [10, 9]],
            [[11, 12, 13, 14], [18, 19, 20, 21]],
            [[22, 23, 24, 25], [32, 33, 34, 35]]
        ],
        right: [
            [[3, 4, 5], [8, 7, 6]],
            [[17, 16, 15], [28, 27, 26]],
            [[31, 30, 29]]
        ]
    },
    "Level 2": {
        unbookable: [1,2,3,4,5,6,7,8],
        left: [
            [[5,6,7,8], [9,10,11,12]],
            [[21,22,23,24], [25,26,27,28]],
            [[37,38,39,40], [41,42,43,44]],
            [[53,54,55,56], [57,58,59,60]],
            [[65,66,67,68,69,70,71], [72,73,74,75,76,77,78]]
        ],
        right: [
            [[1,2,3,4], [13,14,15,16]],
            [[17,18,19,20], [29,30,31,32]],
            [[33,34,35,36], [45,46,47,48]],
            [[49,50,51,52], [61,62,63,64]]
        ]
    }
};

// Global state
let buildingsData = [];
let currentBuildingId = null;
let currentBuildingName = null;
let currentFloor = null;
let pendingBooking = null;

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToSet = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    html.setAttribute('data-theme', themeToSet);
    document.getElementById('sunIcon').style.display = themeToSet === 'dark' ? 'block' : 'none';
    document.getElementById('moonIcon').style.display = themeToSet === 'dark' ? 'none' : 'block';
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        document.getElementById('sunIcon').style.display = newTheme === 'dark' ? 'block' : 'none';
        document.getElementById('moonIcon').style.display = newTheme === 'dark' ? 'none' : 'block';
    });
}

window.onload = function() {
    initTheme();
    document.getElementById('dateInput').valueAsDate = new Date();
    document.getElementById('timeInput').value = '10:00';
    initBuildingSelector();
    updateAuthUI();
};

function updateAuthUI() {
    const loginBtn = document.querySelector('.btn-login-header');
    if (api.isLoggedIn()) {
        const user = api.getCurrentUser();
        loginBtn.textContent = user ? user.studentId + ' \u25be' : 'Logged In';
        loginBtn.onclick = () => {
            if (confirm('Log out?')) {
                api.clearToken();
                updateAuthUI();
                if (!document.getElementById('bookings-view').classList.contains('hidden')) {
                    switchView('home');
                }
                renderBookings();
            }
        };
    } else {
        loginBtn.textContent = 'Log In';
        loginBtn.onclick = () => document.getElementById('loginModal').classList.remove('hidden');
    }
}

function openModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('loginModal').classList.add('hidden');
    pendingBooking = null;
}

// Building selector — loads from API
async function initBuildingSelector() {
    const container = document.getElementById('building-container');
    container.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    try {
        const data = await api.getBuildings();
        buildingsData = data;
        container.innerHTML = '';
        data.forEach(bldg => {
            const card = document.createElement('div');
            card.className = 'select-card';
            card.innerHTML = '<h3>' + bldg.name + '</h3><p>' + bldg.description + '</p>';
            card.onclick = () => selectBuilding(bldg.id, bldg.name, card);
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load buildings:', err);
        container.innerHTML = '<p style="color:var(--danger)">Failed to connect to server. Make sure the backend is running on port 3001.</p>';
    }
}

function selectBuilding(buildingId, buildingName, cardElement) {
    currentBuildingId = buildingId;
    currentBuildingName = buildingName;
    currentFloor = null;
    document.querySelectorAll('#building-container .select-card').forEach(el => el.classList.remove('active'));
    cardElement.classList.add('active');
    document.getElementById('step3-section').classList.add('hidden');
    document.getElementById('step2-section').classList.remove('hidden');

    const container = document.getElementById('floor-container');
    container.innerHTML = '';

    let floors;
    if (buildingName === 'Library') {
        floors = ['Level 1', 'Level 2'];
    } else if (buildingName === 'Block A') {
        floors = ['Level 1', 'Level 2'];
    } else if (buildingName === 'Block B') {
        floors = ['Level 2', 'Level 3'];
    } else if (buildingName === 'Block C') {
        floors = ['Level 1', 'Level 2', 'Level 3', 'Level 4'];
    } else if (buildingName === 'Block E') {
        floors = ['Level 2'];
    } else {
        floors = ['Level 1'];
    }

    floors.forEach(floor => {
        const pill = document.createElement('button');
        pill.className = 'pill';
        pill.innerText = floor;
        pill.onclick = () => selectFloor(floor, pill);
        container.appendChild(pill);
    });
}

function selectFloor(floorName, pillElement) {
    currentFloor = floorName;
    document.querySelectorAll('#floor-container .pill').forEach(el => el.classList.remove('active'));
    pillElement.classList.add('active');
    document.getElementById('step3-section').classList.remove('hidden');
    renderRooms();
}

async function renderRooms() {
    if (!currentBuildingId || !currentFloor) return;

    const targetDate = document.getElementById('dateInput').value;
    const targetTime = document.getElementById('timeInput').value;
    const duration = document.getElementById('durationInput').value;

    if (currentBuildingName === 'Library') {
        document.getElementById('typeFilterContainer').style.display = 'none';
        document.getElementById('room-grid').classList.add('hidden');
        document.getElementById('library-map-section').classList.remove('hidden');
        await renderLibraryMap(targetDate, targetTime, duration);
        return;
    }

    document.getElementById('typeFilterContainer').style.display = 'block';
    document.getElementById('room-grid').classList.remove('hidden');
    document.getElementById('library-map-section').classList.add('hidden');

    try {
        let rooms = await api.getRoomsAvailability(currentBuildingId, currentFloor, targetDate, targetTime, duration);

        const typeFilter = document.getElementById('typeFilter').value;
        if (typeFilter !== 'All') {
            rooms = rooms.filter(r => r.room_type === typeFilter);
        }

        const container = document.getElementById('room-grid');
        container.innerHTML = '';
        document.getElementById('result-count').innerText = rooms.length + ' Spaces Found';

        if (rooms.length === 0) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">No spaces match criteria.</div>';
            return;
        }

        const typeImages = {
            'Classroom': 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60',
            'Computer Lab': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60',
            'Finance Lab': 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60',
            'Consultation Room': 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&auto=format&fit=crop&q=60',
            'Lecture Theatre': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60',
        };

        rooms.forEach((room, idx) => {
            const card = document.createElement('div');
            card.className = 'room-card';
            card.style.animationDelay = idx * 0.05 + 's';
            card.setAttribute('data-room-id', room.id);
            const img = typeImages[room.room_type] || '';
            card.innerHTML =
                '<div class="room-img-container">' +
                    '<span class="status-badge ' + (room.isAvailable ? 'badge-available' : 'badge-full') + '">' + (room.isAvailable ? 'Available' : 'Taken') + '</span>' +
                    (img ? '<img src="' + img + '" alt="">' : '') +
                '</div>' +
                '<div class="room-info">' +
                    '<h3 class="room-title">' + room.room_id + '</h3>' +
                    '<div class="room-type">' + room.room_type + '</div>' +
                    '<div class="room-meta"><div class="meta-item">Cap: ' + room.capacity + '</div><div class="meta-item">' + currentBuildingName + '</div></div>' +
                    '<button class="btn ' + (room.isAvailable ? 'btn-primary' : 'btn-disabled') + '" ' + (!room.isAvailable ? 'disabled' : '') +
                    ' onclick="handleBook(' + room.id + ',\'' + room.room_id + '\',\'' + currentBuildingName + '\')">' +
                    (room.isAvailable ? 'Book Space' : 'Unavailable') + '</button>' +
                '</div>';
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load rooms:', err);
        const container = document.getElementById('room-grid');
        container.innerHTML = '<p style="color:var(--danger);grid-column:1/-1;text-align:center;padding:2rem">Error: ' + err.message + '</p>';
    }
}

async function renderLibraryMap(date, time, duration) {
    const container = document.getElementById('library-map-container');
    container.innerHTML = '';
    const floorData = libraryMapData[currentFloor];
    if (!floorData) return;

    let roomAvailability = {};
    try {
        const rooms = await api.getRoomsAvailability(currentBuildingId, currentFloor, date, time, duration);
        rooms.forEach(r => {
            const parts = r.room_id.split('-');
            const seatNum = parseInt(parts[parts.length - 1]);
            roomAvailability[seatNum] = { dbId: r.id, isAvailable: r.isAvailable, roomId: r.room_id };
        });
    } catch (err) {
        console.error('Failed to load library availability:', err);
    }

    let totalSeats = 0;
    const mapWrapper = document.createElement('div');
    mapWrapper.className = 'library-layout';

    const createSide = (sideData) => {
        const sideDiv = document.createElement('div');
        sideDiv.className = 'map-side';
        sideData.forEach(block => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'desk-block';
            block.forEach(row => {
                if (!row || row.length === 0) return;
                const rowDiv = document.createElement('div');
                rowDiv.className = 'desk-row';
                row.forEach(seatNum => {
                    totalSeats++;
                    const isPublic = floorData.unbookable.includes(seatNum);
                    const seatInfo = roomAvailability[seatNum];
                    const isAvail = seatInfo ? seatInfo.isAvailable : false;
                    const seatName = (currentFloor === 'Level 1' ? 'L1' : 'L2') + '-Seat-' + seatNum;

                    const btn = document.createElement('button');
                    btn.className = 'seat ' + (isPublic ? 'public' : (isAvail ? 'available' : 'booked'));
                    btn.innerText = seatNum;
                    btn.title = isPublic ? seatName + ' (Public/No Booking)' : seatName;
                    btn.setAttribute('data-seat-id', seatInfo ? seatInfo.dbId : '');

                    if (!isPublic && isAvail && seatInfo) {
                        btn.onclick = () => handleBook(seatInfo.dbId, seatInfo.roomId, 'Library');
                    }
                    rowDiv.appendChild(btn);
                });
                blockDiv.appendChild(rowDiv);
            });
            sideDiv.appendChild(blockDiv);
        });
        return sideDiv;
    };

    mapWrapper.appendChild(createSide(floorData.left));
    const corridor = document.createElement('div');
    corridor.className = 'corridor';
    corridor.innerHTML = 'CORRIDOR';
    mapWrapper.appendChild(corridor);
    mapWrapper.appendChild(createSide(floorData.right));
    container.appendChild(mapWrapper);
    document.getElementById('result-count').innerText = totalSeats + ' Seats Found';
}

function handleBook(roomId, roomName, building) {
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeInput').value;
    const duration = document.getElementById('durationInput').value;
    if (!date || !time) return alert('Please select a valid date and time.');
    pendingBooking = { roomId, roomName, building, date, time, duration };

    if (api.isLoggedIn()) {
        processBooking();
    } else {
        document.getElementById('loginModal').classList.remove('hidden');
    }
}

async function processLogin() {
    const studentId = document.getElementById('studentId').value.trim();
    const password = document.getElementById('passwordInput') ? document.getElementById('passwordInput').value : document.querySelector('#loginModal input[type="password"]').value;
    if (!studentId) return alert('Student ID is required.');
    if (!password) return alert('Password is required.');

    try {
        await api.login(studentId, password);
        updateAuthUI();
        document.getElementById('loginModal').classList.add('hidden');
        if (pendingBooking) {
            await processBooking();
        }
    } catch (err) {
        if (err.status === 401) {
            alert('Invalid student ID or password.');
        } else {
            alert('Login failed: ' + err.message);
        }
    }
}

async function processBooking() {
    if (!pendingBooking) return;
    const { roomId, roomName, building, date, time, duration } = pendingBooking;

    try {
        const booking = await api.createBooking(roomId, date, time, parseInt(duration));
        alert('Booking Confirmed!\nSpace: ' + roomName + ' (' + building + ')\nTime: ' + date + ' | ' + booking.start_time + ' - ' + booking.end_time + '\nRef: ' + booking.booking_ref);
        pendingBooking = null;
        switchView('bookings');
    } catch (err) {
        if (err.status === 409) {
            alert('This time slot was just booked by someone else.');
        } else if (err.status === 429) {
            alert('Library weekly quota reached (max 3 per week).');
        } else if (err.status === 401) {
            alert('Please log in to make a booking.');
            document.getElementById('loginModal').classList.remove('hidden');
        } else {
            alert('Booking failed: ' + err.message);
        }
        pendingBooking = null;
        renderRooms();
    }
}

async function renderBookings() {
    const container = document.getElementById('booking-list');
    container.innerHTML = '';

    if (!api.isLoggedIn()) {
        container.innerHTML = '<div style="text-align:center;padding:4rem;background:var(--glass-bg);border-radius:12px;border:1px solid var(--glass-border-subtle);"><p>Please log in to see your bookings.</p><button class="btn btn-primary" style="width:auto;padding:10px 24px;margin-top:1rem;" onclick="document.getElementById(\'loginModal\').classList.remove(\'hidden\')">Log In</button></div>';
        return;
    }

    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Loading bookings...</p>';

    try {
        const bookings = await api.getMyBookings();

        if (bookings.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:4rem;background:var(--glass-bg);border-radius:12px;border:1px solid var(--glass-border-subtle);"><p>No bookings yet.</p><button class="btn btn-primary" style="width:auto;padding:10px 24px;margin-top:1rem;" onclick="switchView(\'home\')">Find a Space</button></div>';
            return;
        }

        container.innerHTML = '';
        bookings.forEach(b => {
            const item = document.createElement('div');
            item.className = 'booking-item';
            item.innerHTML =
                '<div class="b-details">' +
                    '<h4>' + b.room_name + ' <span style="font-weight:400;color:var(--text-muted);">\u2022 ' + b.building_name + ', ' + b.level + '</span></h4>' +
                    '<p>Date: ' + b.booking_date + ' | Time: ' + b.start_time + ' - ' + b.end_time + '</p>' +
                    '<div class="b-id">Ref: ' + b.booking_ref + ' | Status: ' + b.status + '</div>' +
                '</div>' +
                (b.status === 'confirmed' ? '<button class="btn btn-outline-danger" onclick="cancelBooking(' + b.id + ')">Cancel</button>' : '<span style="color:var(--text-muted);font-size:0.85rem;">' + b.status + '</span>');
            container.appendChild(item);
        });
    } catch (err) {
        console.error('Failed to load bookings:', err);
        container.innerHTML = '<p style="color:var(--danger);text-align:center;padding:2rem">Failed to load bookings.</p>';
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Cancel this booking?')) return;
    try {
        await api.cancelBooking(bookingId);
        renderBookings();
    } catch (err) {
        alert('Failed to cancel: ' + err.message);
    }
}

function switchView(viewName) {
    document.getElementById('home-view').classList.toggle('hidden', viewName !== 'home');
    document.getElementById('bookings-view').classList.toggle('hidden', viewName !== 'bookings');
    document.getElementById('nav-home').classList.toggle('active', viewName === 'home');
    document.getElementById('nav-bookings').classList.toggle('active', viewName === 'bookings');
    if (viewName === 'bookings') renderBookings();
    else if (viewName === 'home') { if (currentBuildingId && currentFloor) renderRooms(); }
}

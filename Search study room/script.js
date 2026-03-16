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
let currentBuilding = null;
let currentBuildingId = null;
let currentFloor = null;
let pendingBooking = null;
let allBuildingsCache = [];

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

window.onload = async function() {
    initTheme();
    document.getElementById('dateInput').valueAsDate = new Date();
    document.getElementById('timeInput').value = "10:00";
    updateAuthUI();
    await initBuildingSelector();
};

function updateAuthUI() {
    const user = api.getUser();
    const loginBtn = document.querySelector('.btn-login-header');
    if (user && api.isLoggedIn()) {
        loginBtn.textContent = `${user.studentId} ▾`;
        loginBtn.onclick = () => {
            if (confirm('Log out?')) {
                api.clearToken();
                updateAuthUI();
                renderBookings();
            }
        };
    } else {
        loginBtn.textContent = 'Log In';
        loginBtn.onclick = openModal;
    }
}

function openModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

// Building selector — loads from API
async function initBuildingSelector() {
    const container = document.getElementById('building-container');
    container.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';
    try {
        const { buildings } = await api.getBuildings();
        allBuildingsCache = buildings;
        container.innerHTML = '';
        buildings.forEach(bldg => {
            const card = document.createElement('div');
            card.className = 'select-card';
            card.innerHTML = `<h3>${bldg.name}</h3><p>${bldg.description}</p>`;
            card.onclick = () => selectBuilding(bldg, card);
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:var(--danger)">Failed to load buildings: ${err.message}</p>`;
    }
}

async function selectBuilding(bldg, cardElement) {
    currentBuilding = bldg.name;
    currentBuildingId = bldg.id;
    currentFloor = null;
    document.querySelectorAll('#building-container .select-card').forEach(el => el.classList.remove('active'));
    cardElement.classList.add('active');
    document.getElementById('step3-section').classList.add('hidden');
    document.getElementById('step2-section').classList.remove('hidden');

    // Load floors from rooms API
    const container = document.getElementById('floor-container');
    container.innerHTML = '<span style="color:var(--text-muted)">Loading floors...</span>';
    try {
        const { rooms } = await api.getRooms(bldg.id);
        const floors = [...new Set(rooms.map(r => r.floor))].sort();
        container.innerHTML = '';
        floors.forEach(floor => {
            const pill = document.createElement('button');
            pill.className = 'pill';
            pill.innerText = floor;
            pill.onclick = () => selectFloor(floor, pill);
            container.appendChild(pill);
        });
    } catch (err) {
        container.innerHTML = `<span style="color:var(--danger)">Error: ${err.message}</span>`;
    }
}

function selectFloor(floorName, pillElement) {
    currentFloor = floorName;
    document.querySelectorAll('#floor-container .pill').forEach(el => el.classList.remove('active'));
    pillElement.classList.add('active');
    document.getElementById('step3-section').classList.remove('hidden');
    renderRooms();
}

async function renderRooms() {
    if (!currentBuilding || !currentFloor) return;

    const targetDate = document.getElementById('dateInput').value;
    const targetTime = document.getElementById('timeInput').value;
    const duration = parseInt(document.getElementById('durationInput').value);

    if (currentBuilding === 'Library') {
        document.getElementById('typeFilterContainer').style.display = 'none';
        document.getElementById('room-grid').classList.add('hidden');
        document.getElementById('library-map-section').classList.remove('hidden');
        await renderLibraryMap(targetDate, targetTime, duration);
        return;
    }

    document.getElementById('typeFilterContainer').style.display = 'block';
    document.getElementById('room-grid').classList.remove('hidden');
    document.getElementById('library-map-section').classList.add('hidden');

    const typeFilter = document.getElementById('typeFilter').value;
    const container = document.getElementById('room-grid');
    container.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:2rem">Loading rooms...</p>';

    try {
        const { rooms } = await api.getFloorAvailability(currentBuildingId, currentFloor, targetDate, targetTime, duration);

        const filteredRooms = typeFilter === 'All'
            ? rooms
            : rooms.filter(r => r.room.type === typeFilter.toUpperCase().replace(/ /g, '_'));

        document.getElementById('result-count').innerText = `${filteredRooms.length} Spaces Found`;
        container.innerHTML = '';

        if (filteredRooms.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No spaces match criteria.</div>`;
            return;
        }

        filteredRooms.forEach(({ room, isAvailable }, idx) => {
            const typeLabel = room.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const card = document.createElement('div');
            card.className = 'room-card';
            card.setAttribute('data-room-id', room.id);
            card.style.animationDelay = `${idx * 0.05}s`;
            card.innerHTML = `
                <div class="room-img-container">
                    <span class="status-badge ${isAvailable ? 'badge-available' : 'badge-full'}">${isAvailable ? 'Available' : 'Taken'}</span>
                    ${room.imageUrl ? `<img src="${room.imageUrl}" alt="">` : ''}
                </div>
                <div class="room-info">
                    <h3 class="room-title">${room.name}</h3>
                    <div class="room-type">${typeLabel}</div>
                    <div class="room-meta"><div class="meta-item">Cap: ${room.capacity}</div><div class="meta-item">${room.building.name}</div></div>
                    <button class="btn ${isAvailable ? 'btn-primary' : 'btn-disabled'}" ${!isAvailable ? 'disabled' : ''}
                        onclick="handleBook(${room.id}, '${room.name}', '${room.building.name}')">${isAvailable ? 'Book Space' : 'Unavailable'}</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:var(--danger);grid-column:1/-1;text-align:center;padding:2rem">Error: ${err.message}</p>`;
    }
}

async function renderLibraryMap(date, time, duration) {
    const container = document.getElementById('library-map-container');
    container.innerHTML = '';
    const floorData = libraryMapData[currentFloor];
    if (!floorData) return;

    // Fetch availability from API
    let availabilityMap = {};
    try {
        const { rooms } = await api.getFloorAvailability(currentBuildingId, currentFloor, date, time, duration);
        rooms.forEach(({ room, isAvailable }) => {
            // Extract seat number from name e.g. "Lib-L1-5" -> 5
            const match = room.name.match(/\d+$/);
            if (match) availabilityMap[parseInt(match[0])] = isAvailable;
        });
    } catch (err) {
        container.innerHTML = `<p style="color:var(--danger)">Error loading seats: ${err.message}</p>`;
        return;
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
                    const levelPrefix = currentFloor === 'Level 1' ? 'L1' : 'L2';
                    const seatName = `${levelPrefix}-${seatNum}`;
                    const isAvail = availabilityMap[seatNum] !== undefined ? availabilityMap[seatNum] : true;

                    const btn = document.createElement('button');
                    btn.className = `seat ${isPublic ? 'public' : (isAvail ? 'available' : 'booked')}`;
                    btn.innerText = seatNum;
                    btn.setAttribute('data-seat-num', seatNum);
                    btn.title = isPublic ? `${seatName} (Public/No Booking)` : `${seatName} - Click to book`;

                    if (!isPublic && isAvail) {
                        // Find the room id from the API response
                        const seatId = findLibrarySeatId(seatNum);
                        if (seatId) btn.onclick = () => handleBook(seatId, seatName, 'Library');
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
    document.getElementById('result-count').innerText = `${totalSeats} Seats Found`;

    // Store availability for seat ID lookup
    window._libraryRoomsCache = {};
    try {
        const { rooms } = await api.getFloorAvailability(currentBuildingId, currentFloor, date, time, duration);
        rooms.forEach(({ room }) => {
            const match = room.name.match(/\d+$/);
            if (match) window._libraryRoomsCache[parseInt(match[0])] = room.id;
        });
    } catch (_) {}
}

function findLibrarySeatId(seatNum) {
    return window._libraryRoomsCache ? window._libraryRoomsCache[seatNum] : null;
}

function handleBook(roomId, roomName, building) {
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeInput').value;
    const duration = parseInt(document.getElementById('durationInput').value);
    if (!date || !time) return alert("Please select a valid date and time.");

    pendingBooking = { roomId, roomName, building, date, startTime: time, durationHours: duration };
    document.getElementById('loginModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('loginModal').classList.add('hidden');
    pendingBooking = null;
}

async function processLogin() {
    const studentId = document.getElementById('studentId').value.trim();
    const password = document.getElementById('passwordInput')?.value || '';

    if (!studentId) {
        alert("Student ID is required.");
        return;
    }

    try {
        // Login if not already logged in
        if (!api.isLoggedIn()) {
            const { token, user } = await api.login(studentId, password);
            api.setToken(token);
            api.setUser(user);
            updateAuthUI();
        }

        if (pendingBooking) {
            const { roomId, roomName, building, date, startTime, durationHours } = pendingBooking;
            const { booking } = await api.createBooking(roomId, date, startTime, durationHours);

            const endTime = booking.endTime;
            alert(`Booking Confirmed!\nSpace: ${roomName} (${building})\nTime: ${date} | ${startTime} - ${endTime}`);
            closeModal();
            switchView('bookings');
        }
    } catch (err) {
        if (err.status === 409) {
            alert('This time slot was just taken by someone else. Please choose a different time.');
            closeModal();
            renderRooms();
        } else if (err.status === 429) {
            alert('Library booking limit reached: you can only book 3 library seats per week.');
            closeModal();
        } else if (err.status === 401) {
            alert('Invalid student ID or password. Please try again.');
        } else {
            alert(`Booking failed: ${err.message}`);
        }
    }
}

async function renderBookings() {
    const container = document.getElementById('booking-list');
    container.innerHTML = '';

    if (!api.isLoggedIn()) {
        container.innerHTML = `<div style="text-align:center; padding: 4rem; background: var(--glass-bg); border-radius: 12px; border: 1px solid var(--glass-border-subtle);"><p>Please log in to see your bookings.</p></div>`;
        return;
    }

    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Loading bookings...</p>';

    try {
        const { bookings } = await api.getMyBookings();

        if (bookings.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding: 4rem; background: var(--glass-bg); border-radius: 12px; border: 1px solid var(--glass-border-subtle);"><p>No bookings yet.</p></div>`;
            return;
        }

        container.innerHTML = '';
        bookings.forEach(b => {
            const dateStr = new Date(b.date).toISOString().split('T')[0];
            const location = `${b.room.building.name}, ${b.room.floor}`;
            const item = document.createElement('div');
            item.className = 'booking-item';
            item.innerHTML = `
                <div class="b-details">
                    <h4>${b.room.name} <span style="font-weight:400; color:var(--text-muted);">• ${location}</span></h4>
                    <p>Date: ${dateStr} | Time: ${b.startTime} - ${b.endTime}</p>
                    <div class="b-id">Ref ID: ${b.id.slice(0,8).toUpperCase()} | Status: ${b.status}</div>
                </div>
                ${b.status === 'CONFIRMED' ? `<button class="btn btn-outline-danger" onclick="cancelBooking('${b.id}')">Cancel</button>` : '<span style="color:var(--text-muted)">' + b.status + '</span>'}
            `;
            container.appendChild(item);
        });
    } catch (err) {
        container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem">Error loading bookings: ${err.message}</p>`;
    }
}

async function cancelBooking(bookingId) {
    if (confirm("Cancel this booking?")) {
        try {
            await api.cancelBooking(bookingId);
            renderBookings();
        } catch (err) {
            alert(`Failed to cancel: ${err.message}`);
        }
    }
}

function switchView(viewName) {
    document.getElementById('home-view').classList.toggle('hidden', viewName !== 'home');
    document.getElementById('bookings-view').classList.toggle('hidden', viewName !== 'bookings');
    document.getElementById('nav-home').classList.toggle('active', viewName === 'home');
    document.getElementById('nav-bookings').classList.toggle('active', viewName === 'bookings');
    if (viewName === 'bookings') renderBookings();
    else if (viewName === 'home') { if (currentBuilding && currentFloor) renderRooms(); }
}

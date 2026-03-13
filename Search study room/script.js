// 1. Campus Data Mapping
const rawCampusData = {
    "Block A ": {
        desc: "Business & Finance Hub ",
        levels: {
            "Level 1 ": { "Classroom ": ["A1-04 ", "A1-05 "], "Finance Lab ": ["A1-03 "] },
            "Level 2 ": { "Classroom ": ["A2-02 ", "A2-03 ", "A2-04 ", "A2-05 ", "A2-06 ", "A2-07 "], "Computer Lab ": ["A2-09 "] }
        }
    },
    "Block B ": {
        desc: "IT & Engineering ",
        levels: {
            "Level 2 ": { "Computer Lab ": ["B2-04 ", "B2-05 ", "B2-06 "], "Classroom ": ["B2-07 "] },
            "Level 3 ": { "Classroom ": ["B3-02 ", "B3-03 ", "B3-04 ", "B3-05 ", "B3-06 ", "B3-07 "] }
        }
    },
    "Block C ": {
        desc: "Main Lecture Block ",
        levels: {
            "Level 1 ": { "Classroom ": ["C1-01 ", "C1-02 ", "C1-03 ", "C1-04 ", "C1-05 ", "C1-06 ", "C1-07 "], "Consultation room ": ["C1-10 ", "C1-11 ", "C1-12 ", "C1-13 "] },
            "Level 2 ": { "Classroom ": ["C2-02 ", "C2-03 ", "C2-04 ", "C2-05 ", "C2-06 "], "Lecture Theatre ": ["C2-13 ", "C2-14 ", "C2-15 "] },
            "Level 3 ": { "Classroom ": ["C3-02 ", "C3-03 ", "C3-04 ", "C3-05 "] },
            "Level 4 ": { "Classroom ": ["C4-01 ", "C4-02 ", "C4-03 ", "C4-04 ", "C4-05 ", "C4-06 ", "C4-07 ", "C4-08 ", "C4-09 "], "Lecture Theatre ": ["C4-13 ", "C4-14 ", "C4-15 "] }
        }
    },
    "Block E ": {
        desc: "General Studies ",
        levels: {
            "Level 2 ": { "Classroom ": ["E2-01 ", "E2-02 ", "E2-03 ", "E2-04A ", "E2-04B "] }
        }
    }
};

const facilityMeta = {
    "Classroom ": { cap: 40, img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60" },
    "Computer Lab ": { cap: 30, img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60" },
    "Finance Lab ": { cap: 25, img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60" },
    "Consultation room ": { cap: 4, img: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&auto=format&fit=crop&q=60" },
    "Lecture Theatre ": { cap: 150, img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60" }
};

let allRooms = [];
let roomIdCounter = 1;

for (const [building, bData] of Object.entries(rawCampusData)) {
    for (const [floor, types] of Object.entries(bData.levels)) {
        for (const [type, rooms] of Object.entries(types)) {
            rooms.forEach(roomName => {
                allRooms.push({
                    id: roomIdCounter++,
                    building: building,
                    floor: floor,
                    type: type,
                    name: roomName,
                    capacity: facilityMeta[type].cap,
                    image: facilityMeta[type].img
                });
            });
        }
    }
}

// 2. Global State & Time Conflict System
let currentBuilding = null;
let currentFloor = null;
let pendingBooking = null;

// Global bookings database (Simulated Server)
let globalBookings = JSON.parse(localStorage.getItem('campusGlobalBookingsV3')) || [];

// Theme Toggle System
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const html = document.documentElement;

// Initialize Theme
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        html.setAttribute('data-theme', 'dark');
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    } else {
        html.setAttribute('data-theme', 'light');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
}

// Theme Toggle Event
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        if (newTheme === 'dark') {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    });
}

window.onload = function() {
    initTheme();
    document.getElementById('dateInput').valueAsDate = new Date();
    document.getElementById('timeInput').value = "10:00";
    initBuildingSelector();
};

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

function isRoomAvailable(roomId, targetDate, targetStartTime, durationHours) {
    const newStart = timeToMinutes(targetStartTime);
    const newEnd = newStart + (parseInt(durationHours) * 60);
    return !globalBookings.some(booking => {
        if (booking.roomId !== roomId || booking.date !== targetDate) return false;

        const bStart = timeToMinutes(booking.time);
        const bEnd = bStart + (parseInt(booking.duration) * 60);

        return (newStart < bEnd) && (newEnd > bStart);
    });
}

// 3. UI Interaction Logic
function initBuildingSelector() {
    const container = document.getElementById('building-container');
    Object.keys(rawCampusData).forEach(bldg => {
        const card = document.createElement('div');
        card.className = 'select-card';
        card.innerHTML = `<h3>${bldg}</h3><p>${rawCampusData[bldg].desc}</p>`;
        card.onclick = () => selectBuilding(bldg, card);
        container.appendChild(card);
    });
}

function selectBuilding(buildingName, cardElement) {
    currentBuilding = buildingName;
    currentFloor = null;
    document.querySelectorAll('#building-container .select-card').forEach(el => el.classList.remove('active'));
    cardElement.classList.add('active');
    document.getElementById('step3-section').classList.add('hidden');
    document.getElementById('step2-section').classList.remove('hidden');

    const container = document.getElementById('floor-container');
    container.innerHTML = '';

    Object.keys(rawCampusData[buildingName].levels).forEach(floor => {
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

function renderRooms() {
    if (!currentBuilding || !currentFloor) return;
    const typeFilter = document.getElementById('typeFilter').value;
    const targetDate = document.getElementById('dateInput').value;
    const targetTime = document.getElementById('timeInput').value;
    const duration = document.getElementById('durationInput').value;

    const container = document.getElementById('room-grid');
    container.innerHTML = '';

    const filteredRooms = allRooms.filter(room => {
        return room.building === currentBuilding &&
            room.floor === currentFloor &&
            (typeFilter === 'All' || room.type === typeFilter);
    });

    document.getElementById('result-count').innerText = `${filteredRooms.length} found`;

    if (filteredRooms.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No spaces match your criteria.</div>`;
        return;
    }

    let delayCount = 0;

    filteredRooms.forEach(room => {
        const isAvail = isRoomAvailable(room.id, targetDate, targetTime, duration);

        const card = document.createElement('div');
        card.className = 'room-card';
        card.style.animationDelay = `${delayCount * 0.05}s`;
        delayCount++;

        card.innerHTML = `
            <div class="room-img-container">
                <span class="status-badge ${isAvail ? 'badge-available' : 'badge-full'}">
                    ${isAvail ? 'Available' : 'Unavailable'}
                </span>
                <img src="${room.image}" alt="${room.name}">
            </div>
            <div class="room-info">
                <h3 class="room-title">${room.name}</h3>
                <div class="room-type">${room.type}</div>

                <div class="room-meta">
                    <div class="meta-item">Cap: ${room.capacity} Pax</div>
                    <div class="meta-item">${room.building}</div>
                </div>

                <button class="btn ${isAvail ? 'btn-primary' : 'btn-disabled'}" 
                        ${!isAvail ? 'disabled' : ''} 
                        onclick="handleBook(${room.id}, '${room.name}', '${room.building}')">
                    ${isAvail ? `Book for ${duration} hr(s)` : 'Time Slot Taken'}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. Booking Logic & Modal System
function handleBook(roomId, roomName, building) {
    const date = document.getElementById('dateInput').value;
    const time = document.getElementById('timeInput').value;
    const duration = document.getElementById('durationInput').value;
    if (!date || !time) {
        alert("Please select a valid date and time.");
        return;
    }

    if (!isRoomAvailable(roomId, date, time, duration)) {
        alert("Sorry, this room was just booked by someone else for this time slot.");
        renderRooms();
        return;
    }

    pendingBooking = { roomId, roomName, building, date, time, duration };
    openModal();
}

function openModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('loginModal').classList.add('hidden');
    pendingBooking = null;
}

function processLogin() {
    const studentId = document.getElementById('studentId').value;
    if (pendingBooking) {
        const { roomId, roomName, building, date, time, duration } = pendingBooking;

        if (!isRoomAvailable(roomId, date, time, duration)) {
            alert("Sorry, this room became unavailable while you were logging in.");
            closeModal();
            renderRooms();
            return;
        }

        const bookingId = "BK-" + Math.floor(Math.random() * 90000 + 10000);
        const endMins = timeToMinutes(time) + (duration * 60);
        const endHrs = Math.floor(endMins / 60).toString().padStart(2, '0');
        const endM = (endMins % 60).toString().padStart(2, '0');
        const endTime = `${endHrs}:${endM}`;

        const newBooking = {
            id: bookingId,
            roomId: roomId,
            roomName: roomName,
            location: `${building}, ${currentFloor}`,
            date: date,
            time: time,
            endTime: endTime,
            duration: duration
        };

        globalBookings.push(newBooking);
        localStorage.setItem('campusGlobalBookingsV3', JSON.stringify(globalBookings));

        alert(`Booking Confirmed!\n\nSpace: ${roomName} (${building})\nTime: ${date} | ${time} - ${endTime}`);

        closeModal();
        switchView('bookings');
    } else {
        alert("Logged in successfully!");
        closeModal();
    }
}

function renderBookings() {
    const container = document.getElementById('booking-list');
    container.innerHTML = '';
    if (globalBookings.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem; background: var(--glass-bg); border-radius: var(--radius-lg); border: 1px solid var(--glass-border-subtle);">
                <h3 style="color: var(--text-primary); font-weight:600; margin-bottom: 8px;">No bookings yet</h3>
                <p style="color: var(--text-muted);">Your upcoming study sessions will appear here.</p>
                <button class="btn btn-primary" style="width:auto; padding: 10px 24px; margin-top: 1rem;" onclick="switchView('home')">Find a Space</button>
            </div>`;
        return;
    }

    [...globalBookings].reverse().forEach(b => {
        const item = document.createElement('div');
        item.className = 'booking-item';
        item.innerHTML = `
            <div class="b-details">
                <h4>${b.roomName} <span style="color:var(--text-muted); font-size: 0.9rem; font-weight: 500;">• ${b.location}</span></h4>
                <p>Date: ${b.date} &nbsp;| &nbsp; Time: ${b.time} - ${b.endTime} (${b.duration} hrs)</p>
                <div class="b-id">Ref ID: ${b.id}</div>
            </div>
            <button class="btn btn-outline-danger" onclick="cancelBooking('${b.id}')">Cancel</button>
        `;
        container.appendChild(item);
    });
}

function cancelBooking(bookingId) {
    if (confirm("Are you sure you want to cancel this booking?")) {
        globalBookings = globalBookings.filter(b => b.id !== bookingId);
        localStorage.setItem('campusGlobalBookingsV3', JSON.stringify(globalBookings));
        renderBookings();
    }
}

// 5. View Switching
function switchView(viewName) {
    document.getElementById('home-view').classList.toggle('hidden', viewName !== 'home');
    document.getElementById('bookings-view').classList.toggle('hidden', viewName !== 'bookings');
    document.getElementById('nav-home').classList.toggle('active', viewName === 'home');
    document.getElementById('nav-bookings').classList.toggle('active', viewName === 'bookings');

    if (viewName === 'bookings') {
        renderBookings();
    } else if (viewName === 'home') {
        if (currentBuilding && currentFloor) renderRooms();
    }
}
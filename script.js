const rawCampusData = {
  "Block A": { 
    desc: "Business & Finance Hub", 
    levels: { 
      "Level 1": { 
        "Classroom": ["A1-04", "A1-05"], 
        "Finance Lab": ["A1-03"] 
      }, 
      "Level 2": { 
        "Classroom": ["A2-02", "A2-03", "A2-04", "A2-05", "A2-06", "A2-07"], 
        "Computer Lab": ["A2-09"] 
      } 
    } 
  },
  "Block B": { 
    desc: "IT & Engineering", 
    levels: { 
      "Level 2": { 
        "Computer Lab": ["B2-04", "B2-05", "B2-06"], 
        "Classroom": ["B2-07"] 
      }, 
      "Level 3": { 
        "Classroom": ["B3-02", "B3-03", "B3-04", "B3-05", "B3-06", "B3-07"] 
      } 
    } 
  },
  "Block C": { 
    desc: "Main Lecture Block", 
    levels: { 
      "Level 1": { 
        "Classroom": ["C1-01", "C1-02", "C1-03", "C1-04", "C1-05", "C1-06", "C1-07"], 
        "Consultation room": ["C1-10", "C1-11", "C1-12", "C1-13"] 
      }, 
      "Level 2": { 
        "Classroom": ["C2-02", "C2-03", "C2-04", "C2-05", "C2-06"], 
        "Lecture Theatre": ["C2-13", "C2-14", "C2-15"] 
      }, 
      "Level 3": { 
        "Classroom": ["C3-02", "C3-03", "C3-04", "C3-05"] 
      }, 
      "Level 4": { 
        "Classroom": ["C4-01", "C4-02", "C4-03", "C4-04", "C4-05", "C4-06", "C4-07", "C4-08", "C4-09"], 
        "Lecture Theatre": ["C4-13", "C4-14", "C4-15"] 
      } 
    } 
  },
  "Block E": { 
    desc: "General Studies", 
    levels: { 
      "Level 2": { 
        "Classroom": ["E2-01", "E2-02", "E2-03", "E2-04A", "E2-04B"] 
      } 
    } 
  },
  "Library": { 
    desc: "Quiet Study & Research", 
    levels: { 
      "Level 1": {}, 
      "Level 2": {} 
    } 
  }
};

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
      [[53,54,55,56], [57,58,59,60]]
    ],
    right: [
      [[1,2,3,4], [13,14,15,16]],
      [[17,18,19,20], [29,30,31,32]],
      [[33,34,35,36], [45,46,47,48]],
      [[49,50,51,52], [61,62,63,64]]
    ],
    bottom: [
      [[65,66,67,68,69,70,71], [72,73,74,75,76,77,78]]
    ]
  }
};

const facilityMeta = {
  "Classroom": { cap: 40, img: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60" },
  "Computer Lab": { cap: 30, img: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60" },
  "Finance Lab": { cap: 25, img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60" },
  "Consultation room": { cap: 4, img: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&auto=format&fit=crop&q=60" },
  "Lecture Theatre": { cap: 150, img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60" }
};

let allRooms = [];
let roomIdCounter = 1;
for (const [building, bData] of Object.entries(rawCampusData)) {
  if(building === "Library") continue;
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

let currentBuilding = null;
let currentFloor = null;
let pendingBooking = null;
let currentUser = null;
let globalBookings = JSON.parse(localStorage.getItem('campusGlobalBookingsV4')) || [];

function showCustomAlert(msg, callback) {
    document.getElementById('alertMessage').innerText = msg;
    const modal = document.getElementById('customAlertModal');
    modal.classList.remove('hidden');
    document.getElementById('alertOkBtn').onclick = () => {
        modal.classList.add('hidden');
        if(callback) callback();
    };
}

function showCustomConfirm(msg, onConfirm) {
    document.getElementById('confirmMessage').innerText = msg;
    const modal = document.getElementById('customConfirmModal');
    modal.classList.remove('hidden');
    
    document.getElementById('confirmCancelBtn').onclick = () => {
        modal.classList.add('hidden');
    };
    document.getElementById('confirmOkBtn').onclick = () => {
        modal.classList.add('hidden');
        if(onConfirm) onConfirm();
    };
}

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const themeToSet = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  html.setAttribute('data-theme', themeToSet);
  const sunIcon = document.getElementById('sunIcon');
  const moonIcon = document.getElementById('moonIcon');
  if(sunIcon) sunIcon.style.display = themeToSet === 'dark' ? 'block' : 'none';
  if(moonIcon) moonIcon.style.display = themeToSet === 'dark' ? 'none' : 'block';
}

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const newTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');
    if(sunIcon) sunIcon.style.display = newTheme === 'dark' ? 'block' : 'none';
    if(moonIcon) moonIcon.style.display = newTheme === 'dark' ? 'none' : 'block';
  });
}

function calculateMaxDate() {
    let count = 0;
    let d = new Date();
    while (count < 3) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0) {
            count++;
        }
    }
    return d;
}

window.onload = function() {
  initTheme();
  
  flatpickr("#dateInput", {
      locale: "en",
      defaultDate: "today",
      minDate: "today",
      maxDate: calculateMaxDate(),
      disable: [
          function(date) {
              return (date.getDay() === 0);
          }
      ],
      dateFormat: "Y-m-d"
  });

  const timeInput = document.getElementById('timeInput');
  if(timeInput) timeInput.value = "10:00";
  
  initBuildingSelector();
  updateLoginUI();
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

function validateBookingTime(building, dateStr, timeStr, duration) {
    const date = new Date(dateStr);
    const day = date.getDay();
    
    if (day === 0) {
        return { valid: false, msg: "Sundays are not available for booking." };
    }

    const startMins = timeToMinutes(timeStr);
    const endMins = startMins + (parseInt(duration) * 60);

    if (building === "Library") {
        if (day >= 1 && day <= 5) {
            const minTime = timeToMinutes("07:00");
            const maxTime = timeToMinutes("20:00");
            if (startMins < minTime || endMins > maxTime) {
                return { valid: false, msg: "Library hours (Mon-Fri) are 07:00 to 20:00. Please adjust your time or duration." };
            }
        } else if (day === 6) {
            const minTime = timeToMinutes("09:00");
            const maxTime = timeToMinutes("18:00");
            if (startMins < minTime || endMins > maxTime) {
                return { valid: false, msg: "Library hours (Sat) are 09:00 to 18:00. Please adjust your time or duration." };
            }
        }
    } else {
        const minTime = timeToMinutes("07:00");
        const maxTime = timeToMinutes("21:00");
        if (startMins < minTime || endMins > maxTime) {
            return { valid: false, msg: "Classroom hours are 07:00 to 21:00. Please adjust your time or duration." };
        }
    }
    return { valid: true };
}

function getWeekNumber(dateString) {
  const d = new Date(dateString);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay()||7));
  return Math.ceil((((d - new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
}

function initBuildingSelector() {
  const container = document.getElementById('building-container');
  if(!container) return;
  container.innerHTML = '';
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
  if(!container) return;
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
  const targetDate = document.getElementById('dateInput').value;
  const targetTime = document.getElementById('timeInput').value;
  const duration = document.getElementById('durationInput').value;

  if(currentBuilding === "Library") {
    const typeFilterContainer = document.getElementById('typeFilterContainer');
    if(typeFilterContainer) typeFilterContainer.style.display = 'none';
    const roomGrid = document.getElementById('room-grid');
    if(roomGrid) roomGrid.classList.add('hidden');
    const libraryMapSection = document.getElementById('library-map-section');
    if(libraryMapSection) libraryMapSection.classList.remove('hidden');
    renderLibraryMap(targetDate, targetTime, duration);
    return;
  }

  const typeFilterContainer = document.getElementById('typeFilterContainer');
  if(typeFilterContainer) typeFilterContainer.style.display = 'block';
  const roomGrid = document.getElementById('room-grid');
  if(roomGrid) roomGrid.classList.remove('hidden');
  const libraryMapSection = document.getElementById('library-map-section');
  if(libraryMapSection) libraryMapSection.classList.add('hidden');

  const typeFilter = document.getElementById('typeFilter').value;
  const container = document.getElementById('room-grid');
  if(!container) return;
  container.innerHTML = '';

  const filteredRooms = allRooms.filter(room => 
    room.building === currentBuilding && 
    room.floor === currentFloor && 
    (typeFilter === 'All' || room.type === typeFilter)
  );
  
  const resultCount = document.getElementById('result-count');
  if(resultCount) resultCount.innerText = `${filteredRooms.length} Spaces Found`;

  if (filteredRooms.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">No spaces match criteria.</div>`;
    return;
  }

  filteredRooms.forEach((room, idx) => {
    const isAvail = isRoomAvailable(room.id, targetDate, targetTime, duration);
    const card = document.createElement('div');
    card.className = 'room-card';
    card.style.animationDelay = `${idx * 0.05}s`;
    card.innerHTML = `
      <div class="room-img-container">
        <span class="status-badge ${isAvail ? 'badge-available' : 'badge-full'}">${isAvail ? 'Available' : 'Taken'}</span>
        <img src="${room.image}" alt="">
      </div>
      <div class="room-info">
        <h3 class="room-title">${room.name}</h3>
        <div class="room-type">${room.type}</div>
        <div class="room-meta">
          <div class="meta-item">Cap: ${room.capacity}</div>
          <div class="meta-item">${room.building}</div>
        </div>
        <button class="btn ${isAvail ? 'btn-primary' : 'btn-disabled'}" ${!isAvail ? 'disabled' : ''} 
          onclick="handleBook('${room.id}', '${room.name}', '${room.building}')">${isAvail ? 'Book Space' : 'Unavailable'}</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderLibraryMap(date, time, duration) {
  const container = document.getElementById('library-map-container');
  if(!container) return;
  container.innerHTML = '';
  const floorData = libraryMapData[currentFloor];
  if (!floorData) return;
  let totalSeats = 0;

  const mapWrapper = document.createElement('div');
  mapWrapper.className = 'library-layout-wrapper'; 
  
  const createSide = (sideData) => {
    const sideDiv = document.createElement('div');
    sideDiv.className = 'map-side';
    sideData.forEach(block => {
      const blockDiv = document.createElement('div');
      blockDiv.className = 'desk-block';
      block.forEach(row => {
        if(!row || row.length===0) return;
        const rowDiv = document.createElement('div');
        rowDiv.className = 'desk-row';
        row.forEach(seatNum => {
          totalSeats++;
          const isPublic = floorData.unbookable.includes(seatNum);
          const seatId = `Lib-${currentFloor}-${seatNum}`;
          const seatName = `${currentFloor === 'Level 1' ? 'L1' : 'L2'}-${seatNum}`;
          const isAvail = isRoomAvailable(seatId, date, time, duration);

          const btn = document.createElement('button');
          btn.className = `seat ${isPublic ? 'public' : (isAvail ? 'available' : 'booked')}`;
          btn.innerText = seatNum;
          btn.title = isPublic ? `${seatName} (Public/No Booking)` : `${seatName} - Click to book`;
          
          if(!isPublic && isAvail) {
            btn.onclick = () => handleBook(seatId, seatName, "Library");
          }
          rowDiv.appendChild(btn);
        });
        blockDiv.appendChild(rowDiv);
      });
      sideDiv.appendChild(blockDiv);
    });
    return sideDiv;
  };

  const topSection = document.createElement('div');
  topSection.className = 'library-layout top-layout';
  
  if (floorData.left) topSection.appendChild(createSide(floorData.left));
  
  const corridor = document.createElement('div');
  corridor.className = 'corridor';
  corridor.innerHTML = 'CORRIDOR';
  topSection.appendChild(corridor);
  
  if (floorData.right) topSection.appendChild(createSide(floorData.right));
  
  mapWrapper.appendChild(topSection);

  if (floorData.bottom) {
    const bottomSection = document.createElement('div');
    bottomSection.className = 'library-layout bottom-layout';
    bottomSection.appendChild(createSide(floorData.bottom));
    mapWrapper.appendChild(bottomSection);
  }

  container.appendChild(mapWrapper);
  
  const resultCount = document.getElementById('result-count');
  if(resultCount) resultCount.innerText = `${totalSeats} Seats Found`;
}

function handleBook(roomId, roomName, building) {
  const date = document.getElementById('dateInput').value;
  const time = document.getElementById('timeInput').value;
  const duration = document.getElementById('durationInput').value;
  
  if (!date || !time) {
    showCustomAlert("Please select a valid date and time.");
    return;
  }

  const timeValidation = validateBookingTime(building, date, time, duration);
  if (!timeValidation.valid) {
      showCustomAlert(timeValidation.msg);
      return;
  }

  if (!isRoomAvailable(roomId, date, time, duration)) {
    showCustomAlert("Sorry, this space was just booked by someone else.", () => {
      renderRooms(); 
    });
    return;
  }

  if (!currentUser) {
    pendingBooking = { roomId, roomName, building, date, time, duration };
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }
  confirmBooking(roomId, roomName, building, date, time, duration);
}

function closeModal() {
  const loginModal = document.getElementById('loginModal');
  if(loginModal) loginModal.classList.add('hidden');
  pendingBooking = null;
}

function validateStudentId(studentId) {
  return /^\d{8}$/.test(studentId);
}

function validatePassword(password) {
  return /^\d{8}$/.test(password);
}

function processLogin() {
  const userType = document.querySelector('input[name="userType"]:checked');
  const studentId = document.getElementById('studentId').value.trim();
  const password = document.getElementById('password').value.trim();
  
  if(!userType) {
    showCustomAlert("Please select a user type.");
    return;
  }
  
  if(!studentId) {
    showCustomAlert("Student ID is strictly required to enforce booking quotas.");
    return;
  }
  
  if(!validateStudentId(studentId)) {
    showCustomAlert("Student ID must be exactly 8 digits (numbers only).");
    return;
  }
  
  if(!validatePassword(password)) {
    showCustomAlert("Password must be your Date of Birth in format: ddmmyyyy (8 digits).");
    return;
  }
  
  currentUser = {
    studentId: studentId,
    userType: userType.value
  };
  
  updateLoginUI();
  closeModal();
  
  if(pendingBooking) {
    const { roomId, roomName, building, date, time, duration } = pendingBooking;
    confirmBooking(roomId, roomName, building, date, time, duration);
    pendingBooking = null;
  }
}

function confirmBooking(roomId, roomName, building, date, time, duration) {
  if (!isRoomAvailable(roomId, date, time, duration)) {
    showCustomAlert("Space became unavailable during booking.", () => {
        renderRooms(); 
    });
    return;
  }

  if(building === "Library") {
    const targetWeek = getWeekNumber(date);
    const libBookingsThisWeek = globalBookings.filter(b => 
      b.studentId === currentUser.studentId && 
      b.building === "Library" && 
      getWeekNumber(b.date) === targetWeek
    );
    
    if(libBookingsThisWeek.length >= 3) {
      showCustomAlert(`Limit Reached!\n\nStudent ID [${currentUser.studentId}] has already booked Library spaces 3 times this week. You cannot book anymore.`);
      return;
    }
  }

  const endTime = (timeToMinutes(time) + (duration * 60));
  const endStr = `${Math.floor(endTime/60).toString().padStart(2,'0')}:${(endTime%60).toString().padStart(2,'0')}`;
  
  const newBooking = {
    id: "BK-" + Math.floor(Math.random() * 90000 + 10000),
    studentId: currentUser.studentId,
    roomId: roomId,
    roomName: roomName,
    building: building,
    location: `${building}, ${currentFloor}`,
    date: date,
    time: time,
    endTime: endStr,
    duration: duration
  };

  globalBookings.push(newBooking);
  localStorage.setItem('campusGlobalBookingsV4', JSON.stringify(globalBookings));
  
  showCustomAlert(`Booking Confirmed!\nSpace: ${roomName} (${building})\nTime: ${date} | ${time} - ${endStr}`, () => {
      switchView('bookings');
  });
}

function renderBookings() {
  const container = document.getElementById('booking-list');
  if(!container) return;
  container.innerHTML = '';
  if (globalBookings.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 4rem; background: var(--glass-bg); border-radius: 12px; border: 1px solid var(--glass-border-subtle);"><p>No bookings yet.</p></div>`;
    return;
  }
  [...globalBookings].reverse().forEach(b => {
    const item = document.createElement('div');
    item.className = 'booking-item';
    item.innerHTML = `<div class="b-details"><h4>${b.roomName}<span style="font-weight:400; color:var(--text-muted);"> • ${b.location}</span></h4><p>Date: ${b.date} | Time: ${b.time} - ${b.endTime}</p><div class="b-id">Ref ID: ${b.id} | User: ${b.studentId}</div></div><button class="btn btn-outline-danger" onclick="cancelBooking('${b.id}')">Cancel</button>`;
    container.appendChild(item);
  });
}

function cancelBooking(bookingId) {
  showCustomConfirm("Are you sure you want to cancel this booking?", () => {
      globalBookings = globalBookings.filter(b => b.id !== bookingId);
      localStorage.setItem('campusGlobalBookingsV4', JSON.stringify(globalBookings));
      renderBookings();
  });
}

function logout() {
  showCustomConfirm("Are you sure you want to log out?\nThis will clear your local view history.", () => {
      currentUser = null;
      globalBookings = [];
      localStorage.setItem('campusGlobalBookingsV4', JSON.stringify(globalBookings));
      updateLoginUI();
      switchView('home');
      showCustomAlert("You have been logged out successfully.");
  });
}

function updateLoginUI() {
  const loginBtn = document.getElementById('loginBtnHeader');
  const logoutBtn = document.getElementById('logoutBtnHeader');
  const userInfo = document.getElementById('userInfo');
  
  if(currentUser) {
    if(loginBtn) loginBtn.classList.add('hidden');
    if(logoutBtn) logoutBtn.classList.remove('hidden');
    if(userInfo) {
      userInfo.classList.remove('hidden');
      userInfo.innerHTML = `<span>Welcome, ${currentUser.studentId}</span>`;
    }
  } else {
    if(loginBtn) loginBtn.classList.remove('hidden');
    if(logoutBtn) logoutBtn.classList.add('hidden');
    if(userInfo) userInfo.classList.add('hidden');
  }
}

function switchView(viewName) {
  const homeView = document.getElementById('home-view');
  const bookingsView = document.getElementById('bookings-view');
  const navHome = document.getElementById('nav-home');
  const navBookings = document.getElementById('nav-bookings');
  
  if(homeView) homeView.classList.toggle('hidden', viewName !== 'home');
  if(bookingsView) bookingsView.classList.toggle('hidden', viewName !== 'bookings');
  if(navHome) navHome.classList.toggle('active', viewName === 'home');
  if(navBookings) navBookings.classList.toggle('active', viewName === 'bookings');
  
  if (viewName === 'bookings') renderBookings();
  else if (viewName === 'home') { 
    if (currentBuilding && currentFloor) renderRooms(); 
  }
}
// 1. Mock Data (simulates database data)
const mockRoomsData = [
    {
        id: 101,
        name: "Activity Hub Alpha",
        facilityType: "Activity Room",
        capacity: 8,
        features: ["Whiteboard", "TV Screen", "Flexible Seating"],
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60",
        status: "Available"
    },
    {
        id: 102,
        name: "Classroom 201",
        facilityType: "Classroom",
        capacity: 30,
        features: ["Projector", "Whiteboard", "AC"],
        image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60",
        status: "Available"
    },
    {
        id: 103,
        name: "Computer Lab A",
        facilityType: "Computer Lab",
        capacity: 25,
        features: ["30 Computers", "Fast Internet", "Printer"],
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60",
        status: "Available"
    },
    {
        id: 104,
        name: "Private Pod",
        facilityType: "Consultation Room",
        capacity: 3,
        features: ["Soundproof", "Video Conf", "Privacy"],
        image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&auto=format&fit=crop&q=60",
        status: "Full"
    },
    {
        id: 105,
        name: "Financial Trading Lab",
        facilityType: "Financial Lab",
        capacity: 20,
        features: ["Bloomberg Terminals", "Trading Sim"],
        image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60",
        status: "Available"
    },
    {
        id: 106,
        name: "Main Lecture Theatre",
        facilityType: "Lecture Theatre",
        capacity: 150,
        features: ["Stage", "Pro Audio", "Recording"],
        image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=500&auto=format&fit=crop&q=60",
        status: "Available"
    },
    {
        id: 107,
        name: "Activity Room Beta",
        facilityType: "Activity Room",
        capacity: 12,
        features: ["Movable Furniture", "Smart Screen"],
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop&q=60",
        status: "Available"
    },
    {
        id: 108,
        name: "Computer Lab B",
        facilityType: "Computer Lab",
        capacity: 20,
        features: ["20 Computers", "Scanner"],
        image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&auto=format&fit=crop&q=60",
        status: "Full"
    }
];

// Store current filtered data
let currentRooms = [...mockRoomsData];

// Store Booking History (Load from LocalStorage if available)
let myBookings = JSON.parse(localStorage.getItem('campusBookings')) || [];

// 2. Initialize page on load
window.onload = function() {
    // Set date input to today's date by default
    const dateInput = document.getElementById('date');
    if(dateInput) dateInput.valueAsDate = new Date();
    
    // Set default time
    const timeInput = document.getElementById('time');
    if(timeInput) timeInput.value = "09:00";
    
    // Initial render of all rooms
    renderRooms(currentRooms);
    renderBookings(); // Initialize booking list
};

// 3. Render function: Convert data into HTML cards
function renderRooms(rooms) {
    const container = document.getElementById('room-list');
    const resultCount = document.getElementById('result-count');
    
    if(!container) return; // Guard clause

    container.innerHTML = ""; // Clear current list
    resultCount.innerText = `Found ${rooms.length} Room${rooms.length !== 1 ? 's' : ''}`;

    if (rooms.length === 0) {
        container.innerHTML = '<div class="loading">No rooms found matching your criteria.</div>';
        return;
    }

    rooms.forEach(room => {
        const card = document.createElement('div');
        card.className = 'room-card';
        
        const statusClass = room.status === 'Available' ? 'available' : 'full';
        const btnDisabled = room.status === 'Available' ? '' : 'disabled';
        const btnText = room.status === 'Available' ? 'Book Now' : 'Fully Booked';

        const featuresHTML = room.features.map(feature => 
            `<span class="feature-tag">${feature}</span>`
        ).join('');

        card.innerHTML = `
            <img src="${room.image}" alt="${room.name}" class="room-img">
            <div class="room-info">
                <span class="status-badge ${statusClass}">${room.status}</span>
                <h3 class="room-title">${room.name}</h3>
                <div class="room-detail">
                    <span>🏢</span>
                    <span>${room.facilityType}</span>
                </div>
                <div class="room-detail">
                    <span>👥</span>
                    <span>Capacity: ${room.capacity}</span>
                </div>
                <div class="features-container">
                    ${featuresHTML}
                </div>
                <button class="book-btn" ${btnDisabled} onclick="handleBook(${room.id}, '${room.name}')">${btnText}</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 4. Search/filter logic
function filterRooms() {
    const facilityTypeInput = document.getElementById('facility-type').value;
    const capacityInput = parseInt(document.getElementById('capacity').value) || 0;
    
    currentRooms = mockRoomsData.filter(room => {
        if (facilityTypeInput !== 'all' && room.facilityType !== facilityTypeInput) {
            return false;
        }
        if (capacityInput > 0 && room.capacity < capacityInput) {
            return false;
        }
        return true;
    });

    renderRooms(currentRooms);
}

// 5. Sort rooms function
function sortRooms() {
    const sortBy = document.getElementById('sort').value;
    
    currentRooms.sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortBy === 'capacity') {
            return b.capacity - a.capacity;
        } else if (sortBy === 'type') {
            return a.facilityType.localeCompare(b.facilityType);
        }
        return 0;
    });

    renderRooms(currentRooms);
}

// 6. Booking Logic
function handleBook(id, name) {
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;

    if(!date || !time) {
        alert("Please select a date and time first.");
        return;
    }
    
    // Create booking object
    const newBooking = {
        bookingId: Date.now(), // Simple unique ID
        roomId: id,
        roomName: name,
        date: date,
        time: time,
        timestamp: new Date().toLocaleString()
    };

    // Add to array
    myBookings.push(newBooking);
    
    // Save to LocalStorage
    localStorage.setItem('campusBookings', JSON.stringify(myBookings));

    alert(`✅ Success! \n\nYou have booked ${name}\nDate: ${date}\nTime: ${time}`);
    
    // Switch to bookings view to show the result
    switchView('bookings');
    renderBookings();
}

// 7. Render Booking History
function renderBookings() {
    const container = document.getElementById('booking-list');
    if(!container) return;

    container.innerHTML = "";

    if (myBookings.length === 0) {
        container.innerHTML = '<p style="text-align:center; color: #666; padding: 20px;">You haven\'t made any bookings yet.</p>';
        return;
    }

    // Sort by most recent booking created
    const sortedBookings = [...myBookings].sort((a, b) => b.bookingId - a.bookingId);

    sortedBookings.forEach(booking => {
        const item = document.createElement('div');
        item.className = 'booking-item';
        item.innerHTML = `
            <div class="booking-info">
                <h4>${booking.roomName}</h4>
                <p>📅 ${booking.date} at ⏰ ${booking.time}</p>
                <p style="font-size: 0.8rem; margin-top:5px; opacity:0.7">Ref ID: #${booking.bookingId}</p>
            </div>
            <button class="cancel-btn" onclick="cancelBooking(${booking.bookingId})">Cancel</button>
        `;
        container.appendChild(item);
    });
}

// 8. Cancel Booking Function
function cancelBooking(bookingId) {
    if(confirm("Are you sure you want to cancel this booking?")) {
        myBookings = myBookings.filter(b => b.bookingId !== bookingId);
        localStorage.setItem('campusBookings', JSON.stringify(myBookings));
        renderBookings();
    }
}

// 9. View Switcher
function switchView(viewName) {
    const homeView = document.getElementById('home-view');
    const bookingsView = document.getElementById('bookings-view');
    const navHome = document.getElementById('nav-home');
    const navBookings = document.getElementById('nav-bookings');

    if (viewName === 'home') {
        homeView.style.display = 'block';
        bookingsView.style.display = 'none';
        navHome.classList.add('active');
        navBookings.classList.remove('active');
    } else {
        homeView.style.display = 'none';
        bookingsView.style.display = 'block';
        navHome.classList.remove('active');
        navBookings.classList.add('active');
        renderBookings(); // Refresh list when viewing
    }
}
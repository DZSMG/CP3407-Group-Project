// 1. Mock Data (simulates database data)
// In a real project, this data would be fetched from a SQL database via Python (Flask/Django)
const mockRoomsData = [
    {
        id: 101,
        name: "Activity Hub Alpha",
        facilityType: "Activity Room",
        capacity: 8,
        features: ["Whiteboard", "TV Screen", "Flexible Seating"],
        image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Available"
    },
    {
        id: 102,
        name: "Classroom 201",
        facilityType: "Classroom",
        capacity: 30,
        features: ["Projector", "Whiteboard", "Air Conditioning"],
        image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Available"
    },
    {
        id: 103,
        name: "Computer Lab A",
        facilityType: "Computer Lab",
        capacity: 25,
        features: ["30 Computers", "High-speed Internet", "Printer"],
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Available"
    },
    {
        id: 104,
        name: "Private Consultation Pod",
        facilityType: "Consultation Room",
        capacity: 3,
        features: ["Soundproof", "Video Conference", "Privacy"],
        image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Full"
    },
    {
        id: 105,
        name: "Financial Trading Lab",
        facilityType: "Financial Lab",
        capacity: 20,
        features: ["Bloomberg Terminal", "Trading Simulation", "Multiple Monitors"],
        image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Available"
    },
    {
        id: 106,
        name: "Main Lecture Theatre",
        facilityType: "Lecture Theatre",
        capacity: 150,
        features: ["Stage", "Audio System", "Recording Equipment"],
        image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Available"
    },
    {
        id: 107,
        name: "Activity Room Beta",
        facilityType: "Activity Room",
        capacity: 12,
        features: ["Movable Furniture", "Interactive Display", "Kitchenette"],
        image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Available"
    },
    {
        id: 108,
        name: "Computer Lab B",
        facilityType: "Computer Lab",
        capacity: 20,
        features: ["20 Computers", "Software Suite", "Scanner"],
        image: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        status: "Full"
    }
];

// Store current filtered data
let currentRooms = [...mockRoomsData];

// 2. Initialize page on load
window.onload = function() {
    // Set date input to today's date by default
    document.getElementById('date').valueAsDate = new Date();
    // Set default time
    document.getElementById('time').value = "09:00";
    // Initial render of all rooms
    renderRooms(currentRooms);
};

// 3. Render function: Convert data into HTML cards
function renderRooms(rooms) {
    const container = document.getElementById('room-list');
    const resultCount = document.getElementById('result-count');
    container.innerHTML = ""; // Clear current list

    resultCount.innerText = `Found ${rooms.length} Room${rooms.length !== 1 ? 's' : ''}`;

    if (rooms.length === 0) {
        container.innerHTML = '<div class="loading">No rooms found matching your criteria. Try adjusting your filters.</div>';
        return;
    }

    rooms.forEach(room => {
        // Create card HTML
        const card = document.createElement('div');
        card.className = 'room-card';
        
        const statusClass = room.status === 'Available' ? 'available' : 'full';
        const btnDisabled = room.status === 'Available' ? '' : 'disabled';
        const btnText = room.status === 'Available' ? '📅 Book Now' : '❌ Fully Booked';

        // Create features tags HTML
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
                    <span>Capacity: ${room.capacity} people</span>
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

// 4. Search/filter logic (corresponds to Search User Story)
function filterRooms() {
    const facilityTypeInput = document.getElementById('facility-type').value;
    const capacityInput = parseInt(document.getElementById('capacity').value) || 0;
    
    // Filter logic simulation
    currentRooms = mockRoomsData.filter(room => {
        // Check facility type
        if (facilityTypeInput !== 'all' && room.facilityType !== facilityTypeInput) {
            return false;
        }
        // Check capacity
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
            return b.capacity - a.capacity; // Descending order
        } else if (sortBy === 'type') {
            return a.facilityType.localeCompare(b.facilityType);
        }
        return 0;
    });

    renderRooms(currentRooms);
}

// 6. Booking button click handler (connects to next User Story: Book Room)
function handleBook(id, name) {
    const date = document.getElementById('date').value;
    const time = document.getElementById('time').value;
    
    alert(`🎉 Prototype Action: Booking request for:\n\nRoom: ${name}\nRoom ID: ${id}\nDate: ${date}\nTime: ${time}\n\nIn the real app, this would open the Booking Confirmation page.`);
}
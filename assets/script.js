// IndexedDB Setup
const dbRequest = indexedDB.open("phillieDeuxDB", 2);

dbRequest.onupgradeneeded = function (event) {
  const db = event.target.result;

  if (!db.objectStoreNames.contains("trips")) {
    const store = db.createObjectStore("trips", { keyPath: "id" });
    store.createIndex("byStartDate", "startDate", { unique: false });
    store.createIndex("byEndDate", "endDate", { unique: false });
  }
};

dbRequest.onsuccess = function () {
  console.log("IndexedDB version 2 is ready.");
};

dbRequest.onerror = function () {
  console.error("Error opening IndexedDB:", dbRequest.error);
};

// Add a New Trip
document.getElementById("tripInputForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const tripId = parseInt(document.getElementById("tripId").value);
  const location = document.getElementById("location").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const notes = document.getElementById("notes").value;
  const photoFiles = document.getElementById("photoUpload").files;

  // Convert photos to Base64
  const photoPromises = Array.from(photoFiles).map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject("Error reading file");
      reader.readAsDataURL(file);
    });
  });

  Promise.all(photoPromises).then((photos) => {
    const newTrip = {
      id: tripId,
      location,
      startDate,
      endDate,
      notes,
      dailyNotes: {},
      photos,
    };

    const dbRequest = indexedDB.open("phillieDeuxDB", 2);
    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction("trips", "readwrite");
      const store = transaction.objectStore("trips");

      const checkRequest = store.get(tripId);
      checkRequest.onsuccess = function () {
        if (checkRequest.result) {
          alert(`Oh là là ! Le numéro de voyage ${tripId} est déjà utilisé. Essayez un autre, mon ami !`);
        } else {
          store.put(newTrip);
          alert("Votre voyage a été ajouté avec succès !");
          document.getElementById("tripInputForm").reset();
          displayAllTrips(); // Refresh the list of all trips
        }
      };
    };

    dbRequest.onerror = function () {
      console.error("Error opening database:", dbRequest.error);
    };
  });
});

// Fetch and Display a Trip by ID
document.getElementById("tripForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const tripNumber = parseInt(document.getElementById("tripNumber").value);
  const dbRequest = indexedDB.open("phillieDeuxDB", 2);

  dbRequest.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction("trips", "readonly");
    const store = transaction.objectStore("trips");

    const request = store.get(tripNumber);
    request.onsuccess = function () {
      const trip = request.result;
      if (trip) {
        displayTrip(trip);
      } else {
        alert("Trip not found.");
      }
    };
  };
});


// Display Trip Details with Delete and Edit Buttons
function displayTrip(trip) {
  const detailsContainer = document.getElementById("tripDetails");

  console.log("Photos retrieved for display:", trip.photos);

  const dailyNotes = Object.entries(trip.dailyNotes || {})
    .map(([date, note]) => `<li>${date}: ${note}</li>`)
    .join("");

  // Generate resized thumbnails
  const photos = (trip.photos || []).map(
    (photo, index) => `
      <img 
        src="${photo}" 
        alt="Thumbnail" 
        style="width: 50px; height: auto; margin-right: 10px; cursor: pointer;" 
        onclick="openFullImage('${photo}')"
      />
    `
  ).join("");

  detailsContainer.innerHTML = `
    <h2>Trip ${trip.id}</h2>
    <p><strong>Location:</strong> ${trip.location}</p>
    <p><strong>Start Date:</strong> ${trip.startDate}</p>
    <p><strong>End Date:</strong> ${trip.endDate}</p>
    <p><strong>Notes:</strong> ${trip.notes}</p>
    <h3>Daily Notes:</h3>
    <ul>${dailyNotes || "<p>No daily notes available.</p>"}</ul>
    <h3>Photos:</h3>
    <div>${photos || "<p>No photos available.</p>"}</div>
    <button onclick="deleteTrip(${trip.id})" style="margin-top: 10px;">Delete Trip</button>
    <button onclick="editTrip(${trip.id})" style="margin-top: 10px; margin-left: 10px;">Edit Trip</button>
  `;
}

// Delete a Trip with Confirmation
function deleteTrip(tripId) {
  if (confirm(`Are you sure you want to delete Trip ${tripId}? This action cannot be undone.`)) {
    const dbRequest = indexedDB.open("phillieDeuxDB", 2);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction("trips", "readwrite");
      const store = transaction.objectStore("trips");

      const deleteRequest = store.delete(tripId);
      deleteRequest.onsuccess = function () {
        alert(`Trip ${tripId} has been deleted successfully!`);
        document.getElementById("tripDetails").innerHTML = ""; // Clear trip details
        displayAllTrips(); // Refresh trip list
      };

      deleteRequest.onerror = function () {
        console.error("Error deleting trip:", deleteRequest.error);
      };
    };

    dbRequest.onerror = function () {
      console.error("Error opening database:", dbRequest.error);
    };
  }
}

// Edit a Trip
function editTrip(tripId) {
  const dbRequest = indexedDB.open("phillieDeuxDB", 2);

  dbRequest.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction("trips", "readonly");
    const store = transaction.objectStore("trips");

    const request = store.get(tripId);
    request.onsuccess = function () {
      const trip = request.result;
      if (trip) {
        // Populate form fields with trip data for editing
        document.getElementById("tripId").value = trip.id;
        document.getElementById("location").value = trip.location;
        document.getElementById("startDate").value = trip.startDate;
        document.getElementById("endDate").value = trip.endDate;
        document.getElementById("notes").value = trip.notes;
        alert("You can now edit the trip details and click 'Add Trip' to save changes.");
      } else {
        alert("Trip not found for editing.");
      }
    };

    request.onerror = function () {
      console.error("Error fetching trip for editing:", request.error);
    };
  };

  dbRequest.onerror = function () {
    console.error("Error opening database:", dbRequest.error);
  };
}

// Add a New Trip (Prevent Overwriting)
document.getElementById("tripInputForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const tripId = parseInt(document.getElementById("tripId").value);
  const location = document.getElementById("location").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const notes = document.getElementById("notes").value;
  const photoFiles = document.getElementById("photoUpload").files;

  // Convert photos to Base64
  const photoPromises = Array.from(photoFiles).map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject("Error reading file");
      reader.readAsDataURL(file);
    });
  });

  Promise.all(photoPromises).then((photos) => {
    const newTrip = {
      id: tripId,
      location,
      startDate,
      endDate,
      notes,
      dailyNotes: {},
      photos,
    };

    const dbRequest = indexedDB.open("phillieDeuxDB", 2);

    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction("trips", "readwrite");
      const store = transaction.objectStore("trips");

      // Check if the trip ID already exists
      const checkRequest = store.get(tripId);
      checkRequest.onsuccess = function () {
        if (checkRequest.result) {
          // Trip ID already exists, prevent overwriting
          alert(`Trip ${tripId} already exists. Please use a different Trip ID.`);
        } else {
          // Trip ID does not exist, save the new trip
          store.put(newTrip);
          alert(`Trip ${tripId} has been successfully added!`);
          document.getElementById("tripInputForm").reset();
          displayAllTrips(); // Refresh the list of all trips
        }
      };

      checkRequest.onerror = function () {
        console.error("Error checking trip ID:", checkRequest.error);
      };
    };

    dbRequest.onerror = function () {
      console.error("Error opening database:", dbRequest.error);
    };
  });
});





// Helper function to open the full-size image
function openFullImage(base64Image) {
  const newTab = window.open();
  if (newTab) {
    newTab.document.body.style.margin = "0";
    newTab.document.body.style.background = "black";
    const img = newTab.document.createElement("img");
    img.src = base64Image;
    img.style.width = "100%";
    img.style.height = "auto";
    newTab.document.body.appendChild(img);
  } else {
    alert("Please allow popups for this website to view images.");
  }
}

// Export Trips as JSON
function exportTrips() {
  const dbRequest = indexedDB.open("phillieDeuxDB", 2);

  dbRequest.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction("trips", "readonly");
    const store = transaction.objectStore("trips");

    store.getAll().onsuccess = function (event) {
      const trips = event.target.result;
      const blob = new Blob([JSON.stringify(trips, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "trips.json";
      a.click();
    };
  };
}

document.getElementById("exportTrips").addEventListener("click", exportTrips);

// Display All Trips as an Ordered List
function displayAllTrips() {
  const dbRequest = indexedDB.open("phillieDeuxDB", 2);

  dbRequest.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction("trips", "readonly");
    const store = transaction.objectStore("trips");

    const getAllRequest = store.getAll();
    getAllRequest.onsuccess = function () {
      const trips = getAllRequest.result;
      const tripList = document.getElementById("tripList");

      tripList.innerHTML = "";

      trips.forEach((trip) => {
        const listItem = document.createElement("li");
        listItem.textContent = `Trip ${trip.id}: ${trip.location}`;
        listItem.style.cursor = "pointer";
        listItem.addEventListener("click", () => displayTrip(trip));
        tripList.appendChild(listItem);
      });
    };

    getAllRequest.onerror = function () {
      console.error("Error fetching trips:", getAllRequest.error);
    };
  };
}

displayAllTrips();
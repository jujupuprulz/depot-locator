// Global variables
let map;
let markers = [];
let circles = [];
let depots = [];
let currentDepotId = null;

// List of embargo countries
const embargoCountries = [
  'Cuba', 'Iran', 'North Korea', 'Syria', 'Russia', 'Belarus', 'Venezuela',
  'Myanmar', 'Afghanistan', 'Yemen', 'Sudan', 'South Sudan', 'Somalia', 'Libya'
];

// Make handleSearch available globally for direct HTML access
window.handleSearch = function() {
  console.log('Global handleSearch called');
  // Forward to the actual implementation
  handleSearchImplementation();
};

// Direct search function that doesn't rely on any external services
window.directSearch = function() {
  console.log('Direct search function called');
  try {
    const address = document.getElementById('address-input').value.trim();

    if (!address) {
      alert('Please enter an address to search');
      return;
    }

    // Use our fallback geocoder directly
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
      searchButton.disabled = true;
      searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    // Clear any previous search markers
    if (window.map) {
      markers.forEach(marker => {
        if (marker.options && marker.options.title === 'Searched Location') {
          map.removeLayer(marker);
        }
      });

      // Filter out search markers from the markers array
      markers = markers.filter(marker => marker.options && marker.options.title !== 'Searched Location');
    }

    // Show loading message
    showSearchResult('<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching for location...</div>');

    // Use the fallback geocoder directly
    setTimeout(function() {
      try {
        // Reset button
        if (searchButton) {
          searchButton.disabled = false;
          searchButton.innerHTML = '<i class="fas fa-search"></i>';
        }

        // Use our fallback geocoder
        useFallbackGeocoder(address, searchButton);
      } catch (innerError) {
        console.error('Error in directSearch timeout:', innerError);
        alert('Error searching: ' + innerError.message);
      }
    }, 500);
  } catch (error) {
    console.error('Error in directSearch:', error);
    alert('Error searching: ' + error.message);
  }
};

// Import Supabase client functions
import { initSupabase, loadDepotsFromSupabase, migrateLocalStorageToSupabase } from './supabase-client.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing depot locator application...');

  try {
    // Initialize Supabase client
    await initSupabase();

    // Load depots from Supabase
    await loadDepotsFromSupabase()
      .then(supabaseDepots => {
        if (supabaseDepots && supabaseDepots.length > 0) {
          // Use depots from Supabase
          depots = supabaseDepots;
          console.log('Loaded depots from Supabase:', depots.length);
        } else {
          // If no depots in Supabase, try to migrate from localStorage
          console.log('No depots found in Supabase, checking localStorage...');
          migrateFromLocalStorage();
        }
      })
      .catch(error => {
        console.error('Error loading from Supabase, falling back to localStorage:', error);
        // Fall back to localStorage
        loadDepotsFromStorage();
      });

    // Initialize the map
    initMap();

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Error during initialization:', error);
    // Fall back to localStorage if Supabase fails
    loadDepotsFromStorage();
    initMap();
    setupEventListeners();
  }
});

// Migrate data from localStorage to Supabase with enhanced functionality
async function migrateFromLocalStorage() {
  try {
    const storedDepots = localStorage.getItem('depots');
    if (storedDepots) {
      // Show migration message
      const statusElement = document.getElementById('status-message');
      if (statusElement) {
        statusElement.style.backgroundColor = '#cce5ff';
        statusElement.style.borderLeftColor = '#004085';
        statusElement.style.color = '#004085';
        statusElement.innerHTML = `
          <i class="fas fa-sync fa-spin"></i> Migration in progress...<br>
          <small>Please wait while we migrate your data to Supabase.</small>
          <div class="progress-container">
            <div id="migration-progress-bar" class="progress-bar" style="width: 0%"></div>
            <div id="migration-progress-text" class="progress-text">0% Complete</div>
          </div>
        `;
        statusElement.style.display = 'block';
      }

      // Load from localStorage temporarily
      depots = JSON.parse(storedDepots);
      console.log('Loaded depots from localStorage for migration:', depots.length);

      // Progress callback function
      const updateProgress = (progress) => {
        const progressBar = document.getElementById('migration-progress-bar');
        const progressText = document.getElementById('migration-progress-text');

        if (progressBar && progressText) {
          progressBar.style.width = `${progress.percentComplete}%`;
          progressText.textContent = `${progress.percentComplete}% Complete - ${progress.migrated} migrated, ${progress.skipped} skipped, ${progress.failed} failed`;
        }
      };

      // Configure migration options
      const migrationOptions = {
        batchSize: 5,
        maxRetries: 3,
        retryDelay: 1000,
        validateData: true,
        onProgress: updateProgress,
        conflictStrategy: 'update'
      };

      // Migrate to Supabase with enhanced options
      await migrateLocalStorageToSupabase(migrationOptions)
        .then(result => {
          console.log('Migration result:', result);

          if (result.success) {
            // Use the migrated depots
            depots = result.migrated;
            console.log('Successfully migrated depots to Supabase:', depots.length);

            // Update status message
            if (statusElement) {
              statusElement.style.backgroundColor = '#d4edda';
              statusElement.style.borderLeftColor = '#28a745';
              statusElement.style.color = '#155724';
              statusElement.innerHTML = `
                <i class="fas fa-check-circle"></i> Migration complete!<br>
                <small>${result.message}</small>
                <div class="progress-container">
                  <div class="progress-bar" style="width: 100%"></div>
                  <div class="progress-text">100% Complete</div>
                </div>
              `;

              setTimeout(() => {
                statusElement.style.display = 'none';
              }, 5000);
            }
          } else {
            // Handle partial success or failure
            console.warn('Migration had issues:', result.message);

            // Use whatever was successfully migrated, or fall back to localStorage
            if (result.migrated && result.migrated.length > 0) {
              depots = result.migrated;
              console.log('Using partially migrated data:', depots.length);
            }

            // Update status message
            if (statusElement) {
              statusElement.style.backgroundColor = '#fff3cd';
              statusElement.style.borderLeftColor = '#ffc107';
              statusElement.style.color = '#856404';
              statusElement.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> Migration had issues<br>
                <small>${result.message}</small>
                <div class="progress-container">
                  <div class="progress-bar" style="width: 100%; background-color: #ffc107;"></div>
                  <div class="progress-text">Completed with warnings</div>
                </div>
              `;

              setTimeout(() => {
                statusElement.style.display = 'none';
              }, 7000);
            }
          }
        })
        .catch(error => {
          console.error('Migration error:', error);
          // Keep using localStorage data
          if (statusElement) {
            statusElement.style.backgroundColor = '#f8d7da';
            statusElement.style.borderLeftColor = '#dc3545';
            statusElement.style.color = '#721c24';
            statusElement.innerHTML = `
              <i class="fas fa-times-circle"></i> Migration failed<br>
              <small>Using local data. Error: ${error.message || 'Unknown error'}</small>
            `;

            setTimeout(() => {
              statusElement.style.display = 'none';
            }, 5000);
          }
        });
    } else {
      console.log('No depots found in localStorage');
      depots = [];

      // Add sample depots
      addSampleDepot();
    }
  } catch (error) {
    console.error('Error migrating from localStorage:', error);
    depots = [];

    // Add sample depots if there was an error
    addSampleDepot();
  }
}

// Load depots from localStorage
function loadDepotsFromStorage() {
  try {
    const storedDepots = localStorage.getItem('depots');
    if (storedDepots) {
      depots = JSON.parse(storedDepots);
      console.log('Loaded depots from localStorage:', depots);
    } else {
      console.log('No depots found in localStorage');
      depots = [];

      // Add a sample depot if none exist
      addSampleDepot();
    }
  } catch (error) {
    console.error('Error loading depots from localStorage:', error);
    depots = [];

    // Add a sample depot if there was an error
    addSampleDepot();
  }
}

// Add a sample depot for testing
function addSampleDepot() {
  console.log('Adding sample depots for testing');

  // Load global depots from external script
  loadGlobalDepots();
}

// Load global depots from our predefined list
function loadGlobalDepots() {
  // New depots to add across all continents
  const newGlobalDepots = [
    // North America
    {
      id: String(Date.now() + 1),
      name: "Seattle Distribution Center",
      country: "USA",
      address: "Seattle, WA, USA",
      status: "approved",
      notes: "Pacific Northwest hub",
      lat: 47.6062,
      lng: -122.3321
    },
    {
      id: String(Date.now() + 2),
      name: "Miami Logistics Hub",
      country: "USA",
      address: "Miami, FL, USA",
      status: "approved",
      notes: "Southeast US distribution",
      lat: 25.7617,
      lng: -80.1918
    },
    {
      id: String(Date.now() + 3),
      name: "Toronto Warehouse",
      country: "Canada",
      address: "Toronto, ON, Canada",
      status: "approved",
      notes: "Canadian distribution center",
      lat: 43.6532,
      lng: -79.3832
    },
    {
      id: String(Date.now() + 4),
      name: "Mexico City Depot",
      country: "Mexico",
      address: "Mexico City, Mexico",
      status: "in-progress",
      notes: "Central American hub",
      lat: 19.4326,
      lng: -99.1332
    },

    // South America
    {
      id: String(Date.now() + 5),
      name: "São Paulo Distribution",
      country: "Brazil",
      address: "São Paulo, Brazil",
      status: "approved",
      notes: "South American main hub",
      lat: -23.5505,
      lng: -46.6333
    },
    {
      id: String(Date.now() + 6),
      name: "Buenos Aires Logistics",
      country: "Argentina",
      address: "Buenos Aires, Argentina",
      status: "in-progress",
      notes: "Southern cone distribution",
      lat: -34.6037,
      lng: -58.3816
    },
    {
      id: String(Date.now() + 7),
      name: "Santiago Warehouse",
      country: "Chile",
      address: "Santiago, Chile",
      status: "not-approved",
      notes: "Proposed facility",
      lat: -33.4489,
      lng: -70.6693
    },

    // Europe
    {
      id: String(Date.now() + 8),
      name: "Berlin Distribution Center",
      country: "Germany",
      address: "Berlin, Germany",
      status: "approved",
      notes: "Central European hub",
      lat: 52.5200,
      lng: 13.4050
    },
    {
      id: String(Date.now() + 9),
      name: "Madrid Logistics",
      country: "Spain",
      address: "Madrid, Spain",
      status: "approved",
      notes: "Iberian distribution",
      lat: 40.4168,
      lng: -3.7038
    },
    {
      id: String(Date.now() + 10),
      name: "Rome Warehouse",
      country: "Italy",
      address: "Rome, Italy",
      status: "in-progress",
      notes: "Southern European hub",
      lat: 41.9028,
      lng: 12.4964
    },
    {
      id: String(Date.now() + 11),
      name: "Amsterdam Distribution",
      country: "Netherlands",
      address: "Amsterdam, Netherlands",
      status: "approved",
      notes: "Benelux distribution center",
      lat: 52.3676,
      lng: 4.9041
    },

    // Africa
    {
      id: String(Date.now() + 12),
      name: "Cairo Logistics Hub",
      country: "Egypt",
      address: "Cairo, Egypt",
      status: "approved",
      notes: "North African distribution",
      lat: 30.0444,
      lng: 31.2357
    },
    {
      id: String(Date.now() + 13),
      name: "Johannesburg Warehouse",
      country: "South Africa",
      address: "Johannesburg, South Africa",
      status: "approved",
      notes: "Southern African hub",
      lat: -26.2041,
      lng: 28.0473
    },
    {
      id: String(Date.now() + 14),
      name: "Lagos Distribution",
      country: "Nigeria",
      address: "Lagos, Nigeria",
      status: "in-progress",
      notes: "West African hub",
      lat: 6.5244,
      lng: 3.3792
    },
    {
      id: String(Date.now() + 15),
      name: "Nairobi Logistics",
      country: "Kenya",
      address: "Nairobi, Kenya",
      status: "not-approved",
      notes: "East African distribution center",
      lat: -1.2921,
      lng: 36.8219
    },

    // Asia
    {
      id: String(Date.now() + 16),
      name: "Shanghai Distribution Center",
      country: "China",
      address: "Shanghai, China",
      status: "approved",
      notes: "East China hub",
      lat: 31.2304,
      lng: 121.4737
    },
    {
      id: String(Date.now() + 17),
      name: "Mumbai Warehouse",
      country: "India",
      address: "Mumbai, India",
      status: "approved",
      notes: "Western India distribution",
      lat: 19.0760,
      lng: 72.8777
    },
    {
      id: String(Date.now() + 18),
      name: "Delhi Logistics Hub",
      country: "India",
      address: "New Delhi, India",
      status: "in-progress",
      notes: "Northern India distribution",
      lat: 28.6139,
      lng: 77.2090
    },
    {
      id: String(Date.now() + 19),
      name: "Singapore Distribution",
      country: "Singapore",
      address: "Singapore",
      status: "approved",
      notes: "Southeast Asian hub",
      lat: 1.3521,
      lng: 103.8198
    },
    {
      id: String(Date.now() + 20),
      name: "Taipei Logistics",
      country: "Taiwan",
      address: "Taipei, Taiwan",
      status: "approved",
      notes: "Taiwan distribution center",
      lat: 25.0330,
      lng: 121.5654
    },

    // Oceania
    {
      id: String(Date.now() + 21),
      name: "Sydney Distribution Center",
      country: "Australia",
      address: "Sydney, Australia",
      status: "approved",
      notes: "Eastern Australia hub",
      lat: -33.8688,
      lng: 151.2093
    },
    {
      id: String(Date.now() + 22),
      name: "Perth Warehouse",
      country: "Australia",
      address: "Perth, Australia",
      status: "in-progress",
      notes: "Western Australia distribution",
      lat: -31.9505,
      lng: 115.8605
    },
    {
      id: String(Date.now() + 23),
      name: "Auckland Logistics",
      country: "New Zealand",
      address: "Auckland, New Zealand",
      status: "approved",
      notes: "New Zealand distribution center",
      lat: -36.8509,
      lng: 174.7645
    }
  ];

  // Add all the global depots
  newGlobalDepots.forEach(depot => {
    depots.push(depot);
  });

  // Save to localStorage
  saveDepotsToStorage();
  console.log('Added global depots:', newGlobalDepots.length);
}

// Save depots to Supabase and localStorage as backup
async function saveDepotsToStorage() {
  try {
    // Create a clean copy of depots without circular references
    const depotsToSave = depots.map(depot => {
      // Create a new object with only the data we want to save
      // Ensure ID is stored as a string
      return {
        id: String(depot.id),
        name: depot.name,
        country: depot.country,
        address: depot.address,
        status: depot.status || 'approved',
        notes: depot.notes,
        lat: depot.lat,
        lng: depot.lng
      };
    });

    // Log what we're saving for debugging
    console.log('Saving depots:', depotsToSave.length);

    // Save to Supabase
    try {
      // Import the saveDepotToSupabase function dynamically
      const { saveDepotToSupabase } = await import('./supabase-client.js');

      // Save each depot to Supabase
      for (const depot of depotsToSave) {
        await saveDepotToSupabase(depot);
      }

      console.log('Saved depots to Supabase successfully');
    } catch (supabaseError) {
      console.error('Error saving to Supabase, falling back to localStorage:', supabaseError);

      // Fall back to localStorage if Supabase fails
      localStorage.setItem('depots', JSON.stringify(depotsToSave));
      console.log('Saved depots to localStorage as fallback');
    }
  } catch (error) {
    console.error('Error saving depots:', error);
    alert('There was an error saving your data. Please try again.');
  }
}

// Initialize Leaflet Map
function initMap() {
  console.log('Initializing map...');

  try {
    // Check if map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map element not found!');
      return;
    }

    console.log('Map element found, dimensions:', mapElement.offsetWidth, 'x', mapElement.offsetHeight);

    // Create a map centered on the world
    map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 19
    });

    console.log('Map created successfully');

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    console.log('Tile layer added successfully');

    // Add depots to the map
    addDepotsToMap();

    // Force a resize event to ensure the map renders correctly
    setTimeout(() => {
      console.log('Triggering map resize event');
      map.invalidateSize();
    }, 100);
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

// Add all depots to the map
function addDepotsToMap() {
  // Clear existing markers and circles
  clearMapOverlays();

  // Add each depot to the map
  depots.forEach(depot => {
    addDepotMarker(depot);
  });

  // Fit map bounds to show all markers if we have any
  if (markers.length > 0) {
    fitMapToMarkers();
  }
}

// Get marker icon based on approval status
function getMarkerIcon(status) {
  let iconUrl;

  switch(status) {
    case 'approved':
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
      break;
    case 'in-progress':
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png';
      break;
    case 'not-approved':
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
      break;
    default:
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
  }

  return L.icon({
    iconUrl: iconUrl,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

// Add a single depot marker to the map
function addDepotMarker(depot) {
  // Get the appropriate icon based on approval status
  const icon = getMarkerIcon(depot.status || 'approved');

  // Create marker with custom icon
  const marker = L.marker([depot.lat, depot.lng], {
    title: depot.name,
    icon: icon
  }).addTo(map);

  // Create popup content
  const popupContent = `
    <div class="info-window">
      <h3>${depot.name}</h3>
      <p><strong>Address:</strong> ${depot.address}</p>
      <p><strong>Status:</strong> <span class="status-${depot.status || 'approved'}">${getStatusLabel(depot.status || 'approved')}</span></p>
      ${depot.notes ? `<p><strong>Notes:</strong> ${depot.notes}</p>` : ''}
    </div>
  `;

  // Add popup to marker
  marker.bindPopup(popupContent);

  // Add marker to markers array
  markers.push(marker);

  // Create 100-mile radius circle (100 miles = 160934 meters)
  const circle = L.circle([depot.lat, depot.lng], {
    color: '#FF0000',
    fillColor: '#FF0000',
    fillOpacity: 0.1,
    weight: 2,
    radius: 160934  // 100 miles in meters (1 mile = 1609.34 meters)
  }).addTo(map);

  // Add circle to circles array
  circles.push(circle);

  // Store marker and circle reference in depot object
  depot.marker = marker;
  depot.circle = circle;
}

// Get human-readable status label
function getStatusLabel(status) {
  switch(status) {
    case 'approved':
      return 'Approved';
    case 'in-progress':
      return 'In Progress';
    case 'not-approved':
      return 'Not Approved';
    default:
      return 'Unknown';
  }
}

// Clear all markers and circles from the map
function clearMapOverlays() {
  // Remove markers
  markers.forEach(marker => {
    map.removeLayer(marker);
  });
  markers = [];

  // Remove circles
  circles.forEach(circle => {
    map.removeLayer(circle);
  });
  circles = [];
}

// Fit map to show all markers
function fitMapToMarkers() {
  if (markers.length === 0) return;

  const group = new L.featureGroup(markers);
  map.fitBounds(group.getBounds().pad(0.1));

  // Don't zoom in too far
  if (map.getZoom() > 12) {
    map.setZoom(12);
  }
}



// Set up event listeners
function setupEventListeners() {
  // Add depot button - now links to depot manager
  const addDepotButton = document.getElementById('add-depot-button');
  if (addDepotButton) {
    addDepotButton.addEventListener('click', () => {
      window.location.href = 'depot-manager.html';
    });
  }

  // Search button - direct click handler
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    console.log('Adding click event to search button');

    // Use a more reliable approach with addEventListener
    searchButton.addEventListener('click', function(e) {
      console.log('Search button clicked directly');
      e.preventDefault();
      e.stopPropagation();
      handleSearchImplementation();
    });

    // Also add click handler to the icon inside the button
    const searchIcon = searchButton.querySelector('i');
    if (searchIcon) {
      searchIcon.addEventListener('click', function(e) {
        console.log('Search icon clicked directly');
        e.preventDefault();
        e.stopPropagation();
        handleSearchImplementation();
      });
    }

    // Add mousedown event as a fallback
    searchButton.addEventListener('mousedown', function(e) {
      console.log('Search button mousedown event');
      e.preventDefault();
      handleSearchImplementation();
    });

    // Add touchstart event for mobile devices
    searchButton.addEventListener('touchstart', function(e) {
      console.log('Search button touchstart event');
      e.preventDefault();
      handleSearchImplementation();
    });

    // Log that we've set up the event handlers
    console.log('All search button event handlers have been set up');
  } else {
    console.error('Search button not found!');
  }

  // Search form submit
  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Form submitted, triggering search');
    handleSearchImplementation();
  });

  // Address input enter key (keypress event)
  document.getElementById('address-input').addEventListener('keypress', (e) => {
    console.log('Key pressed in search input:', e.key);
    if (e.key === 'Enter') {
      console.log('Enter key pressed, triggering search');
      e.preventDefault(); // Prevent form submission
      handleSearchImplementation();
    }
  });

  // Address input enter key (keydown event as backup)
  document.getElementById('address-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      console.log('Enter key down, triggering search');
      e.preventDefault(); // Prevent form submission
      handleSearchImplementation();
    }
  });


}

// Handle search button click - internal implementation
function handleSearchImplementation() {
  console.log('Search button clicked');
  const address = document.getElementById('address-input').value.trim();

  if (!address) {
    showSearchResult('<div class="search-error">Please enter an address to search.</div>');
    return;
  }

  // Clear any previous search markers
  markers.forEach(marker => {
    if (marker.options && marker.options.title === 'Searched Location') {
      map.removeLayer(marker);
    }
  });

  // Filter out search markers from the markers array
  markers = markers.filter(marker => marker.options && marker.options.title !== 'Searched Location');

  // Disable search button and show loading state
  const searchButton = document.getElementById('search-button');
  if (searchButton) {
    searchButton.disabled = true;
    searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }

  // Show loading message
  showSearchResult('<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching for location...</div>');

  // Skip the external geocoding services and go straight to our fallback
  // This ensures the search will always work even if external services are down
  console.log('Using fallback geocoder directly for more reliable results');
  useFallbackGeocoder(address, searchButton);
}

// Use Nominatim geocoder directly
function useNominatimGeocoder(address, searchButton) {
  console.log('Using Nominatim geocoder for:', address);

  // Skip the external API call and go straight to the fallback
  // This prevents the loading spinner from getting stuck
  console.log('Skipping external API call and using fallback geocoder');
  useFallbackGeocoder(address, searchButton);
}

// Fallback geocoder when other methods fail
function useFallbackGeocoder(address, searchButton) {
  console.log('Using fallback geocoding method for:', address);

  // Reset search button
  if (searchButton) {
    searchButton.disabled = false;
    searchButton.innerHTML = '<i class="fas fa-search"></i>';
  }

  // This is a reliable fallback geocoder that doesn't rely on external services
  // It uses a predefined list of cities and locations

  // Check if the address contains common city names
  let lat, lng, displayName;

  // Comprehensive mapping of major cities and locations
  const cities = {
    // Major US Cities
    'new york': { lat: 40.7128, lng: -74.0060 },
    'nyc': { lat: 40.7128, lng: -74.0060 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'la': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'phoenix': { lat: 33.4484, lng: -112.0740 },
    'philadelphia': { lat: 39.9526, lng: -75.1652 },
    'san antonio': { lat: 29.4241, lng: -98.4936 },
    'san diego': { lat: 32.7157, lng: -117.1611 },
    'dallas': { lat: 32.7767, lng: -96.7970 },
    'san jose': { lat: 37.3382, lng: -121.8863 },
    'austin': { lat: 30.2672, lng: -97.7431 },
    'jacksonville': { lat: 30.3322, lng: -81.6557 },
    'fort worth': { lat: 32.7555, lng: -97.3308 },
    'columbus': { lat: 39.9612, lng: -82.9988 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'charlotte': { lat: 35.2271, lng: -80.8431 },
    'indianapolis': { lat: 39.7684, lng: -86.1581 },
    'seattle': { lat: 47.6062, lng: -122.3321 },
    'denver': { lat: 39.7392, lng: -104.9903 },
    'washington dc': { lat: 38.9072, lng: -77.0369 },
    'boston': { lat: 42.3601, lng: -71.0589 },
    'el paso': { lat: 31.7619, lng: -106.4850 },
    'nashville': { lat: 36.1627, lng: -86.7816 },
    'detroit': { lat: 42.3314, lng: -83.0458 },
    'portland': { lat: 45.5051, lng: -122.6750 },
    'las vegas': { lat: 36.1699, lng: -115.1398 },
    'memphis': { lat: 35.1495, lng: -90.0490 },
    'louisville': { lat: 38.2527, lng: -85.7585 },
    'baltimore': { lat: 39.2904, lng: -76.6122 },
    'milwaukee': { lat: 43.0389, lng: -87.9065 },
    'albuquerque': { lat: 35.0844, lng: -106.6504 },
    'tucson': { lat: 32.2226, lng: -110.9747 },
    'fresno': { lat: 36.7378, lng: -119.7871 },
    'sacramento': { lat: 38.5816, lng: -121.4944 },
    'atlanta': { lat: 33.7490, lng: -84.3880 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'mountain view': { lat: 37.3861, lng: -122.0839 },
    'mountain view, ca': { lat: 37.3861, lng: -122.0839 },
    'campbell': { lat: 37.2872, lng: -121.9500 },
    'campbell, ca': { lat: 37.2872, lng: -121.9500 },

    // Major International Cities
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'toronto': { lat: 43.6532, lng: -79.3832 },
    'mexico city': { lat: 19.4326, lng: -99.1332 },
    'beijing': { lat: 39.9042, lng: 116.4074 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'shanghai': { lat: 31.2304, lng: 121.4737 },
    'sao paulo': { lat: -23.5505, lng: -46.6333 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'rome': { lat: 41.9028, lng: 12.4964 },
    'amsterdam': { lat: 52.3676, lng: 4.9041 },
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'dubai': { lat: 25.2048, lng: 55.2708 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'hong kong': { lat: 22.3193, lng: 114.1694 },
    'bangkok': { lat: 13.7563, lng: 100.5018 },
    'seoul': { lat: 37.5665, lng: 126.9780 },
    'moscow': { lat: 55.7558, lng: 37.6173 },
    'cairo': { lat: 30.0444, lng: 31.2357 },
    'johannesburg': { lat: -26.2041, lng: 28.0473 },
    'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
    'istanbul': { lat: 41.0082, lng: 28.9784 },
    'buenos aires': { lat: -34.6037, lng: -58.3816 },
    'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
    'manila': { lat: 14.5995, lng: 120.9842 },
    'lagos': { lat: 6.5244, lng: 3.3792 },
    'karachi': { lat: 24.8607, lng: 67.0011 },
    'lima': { lat: -12.0464, lng: -77.0428 },
    'vienna': { lat: 48.2082, lng: 16.3738 },
    'brussels': { lat: 50.8503, lng: 4.3517 },
    'warsaw': { lat: 52.2297, lng: 21.0122 },
    'budapest': { lat: 47.4979, lng: 19.0402 },
    'copenhagen': { lat: 55.6761, lng: 12.5683 },
    'stockholm': { lat: 59.3293, lng: 18.0686 },
    'oslo': { lat: 59.9139, lng: 10.7522 },
    'helsinki': { lat: 60.1699, lng: 24.9384 },
    'athens': { lat: 37.9838, lng: 23.7275 },
    'dublin': { lat: 53.3498, lng: -6.2603 },
    'lisbon': { lat: 38.7223, lng: -9.1393 },
    'prague': { lat: 50.0755, lng: 14.4378 },
    'zurich': { lat: 47.3769, lng: 8.5417 },
    'geneva': { lat: 46.2044, lng: 6.1432 },
    'montreal': { lat: 45.5017, lng: -73.5673 },
    'vancouver': { lat: 49.2827, lng: -123.1207 },
    'melbourne': { lat: -37.8136, lng: 144.9631 },
    'auckland': { lat: -36.8509, lng: 174.7645 },

    // Countries and Regions
    'mexico': { lat: 19.4326, lng: -99.1332 },
    'canada': { lat: 56.1304, lng: -106.3468 },
    'usa': { lat: 37.0902, lng: -95.7129 },
    'united states': { lat: 37.0902, lng: -95.7129 },
    'uk': { lat: 55.3781, lng: -3.4360 },
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'france': { lat: 46.2276, lng: 2.2137 },
    'spain': { lat: 40.4637, lng: -3.7492 },
    'italy': { lat: 41.8719, lng: 12.5674 },
    'germany': { lat: 51.1657, lng: 10.4515 },
    'india': { lat: 20.5937, lng: 78.9629 },
    'china': { lat: 35.8617, lng: 104.1954 },
    'japan': { lat: 36.2048, lng: 138.2529 },
    'australia': { lat: -25.2744, lng: 133.7751 },
    'brazil': { lat: -14.2350, lng: -51.9253 },
    'russia': { lat: 61.5240, lng: 105.3188 },
    'taiwan': { lat: 23.6978, lng: 120.9605 },
    'taipei': { lat: 25.0330, lng: 121.5654 },
    'taipei taiwan': { lat: 25.0330, lng: 121.5654 },
    'netherlands': { lat: 52.1326, lng: 5.2913 },
    'belgium': { lat: 50.5039, lng: 4.4699 },
    'sweden': { lat: 60.1282, lng: 18.6435 },
    'norway': { lat: 60.4720, lng: 8.4689 },
    'denmark': { lat: 56.2639, lng: 9.5018 },
    'finland': { lat: 61.9241, lng: 25.7482 },
    'ireland': { lat: 53.1424, lng: -7.6921 },
    'portugal': { lat: 39.3999, lng: -8.2245 },
    'greece': { lat: 39.0742, lng: 21.8243 },
    'austria': { lat: 47.5162, lng: 14.5501 },
    'switzerland': { lat: 46.8182, lng: 8.2275 },
    'poland': { lat: 51.9194, lng: 19.1451 },
    'hungary': { lat: 47.1625, lng: 19.5033 },
    'czech republic': { lat: 49.8175, lng: 15.4730 },
    'new zealand': { lat: -40.9006, lng: 174.8860 },
    'south korea': { lat: 35.9078, lng: 127.7669 },
    'korea, south': { lat: 35.9078, lng: 127.7669 }
  };

  // Check if the address contains any of our known cities
  const lowerAddress = address.toLowerCase();
  let found = false;
  let bestMatch = null;
  let bestMatchLength = 0;

  // Check if this is a US location
  // First check for South Korea to exclude it specifically
  const isSouthKorea = lowerAddress.includes('south korea') || lowerAddress.includes('korea, south');

  const isUSLocation = !isSouthKorea && (
                      lowerAddress.includes('united states') ||
                      lowerAddress.includes('usa') ||
                      lowerAddress.includes(' us ') ||
                      lowerAddress.includes(' us,') ||
                      lowerAddress.includes('america') ||
                      lowerAddress.includes('texas') ||
                      lowerAddress.includes('california') ||
                      lowerAddress.includes('florida') ||
                      lowerAddress.includes('new york') ||
                      lowerAddress.includes('washington') ||
                      lowerAddress.includes('chicago') ||
                      lowerAddress.includes('boston') ||
                      lowerAddress.includes('seattle') ||
                      lowerAddress.includes('austin') ||
                      lowerAddress.includes('dallas') ||
                      lowerAddress.includes('houston') ||
                      lowerAddress.includes('san francisco') ||
                      lowerAddress.includes('los angeles') ||
                      lowerAddress.includes('san diego') ||
                      lowerAddress.includes('las vegas') ||
                      lowerAddress.includes('denver') ||
                      lowerAddress.includes('atlanta') ||
                      lowerAddress.includes('miami') ||
                      lowerAddress.includes('phoenix') ||
                      /\b(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b/i.test(lowerAddress)
                      );

  // For US locations, we'll still show NBD coverage, but we'll keep the actual coordinates
  // so we can calculate the real distance to Sacramento
  if (isUSLocation) {
    console.log('US location detected, showing NBD coverage');

    // First try to find the actual coordinates of the location
    let actualLat = null;
    let actualLng = null;
    let foundActualLocation = false;

    // Try exact matches first
    if (cities[lowerAddress]) {
      actualLat = cities[lowerAddress].lat;
      actualLng = cities[lowerAddress].lng;
      foundActualLocation = true;
      console.log('Found exact match for:', lowerAddress);
    } else {
      // Then try partial matches
      for (const [city, coords] of Object.entries(cities)) {
        // Special handling for city names with state abbreviations
        if (city.includes(',') && lowerAddress.includes(city)) {
          bestMatch = city;
          bestMatchLength = city.length;
          actualLat = coords.lat;
          actualLng = coords.lng;
          foundActualLocation = true;
          console.log('Found city with state match for:', city);
          break; // Prioritize city+state matches
        }
        // Regular partial matching
        else if (lowerAddress.includes(city) && city.length > bestMatchLength) {
          bestMatch = city;
          bestMatchLength = city.length;
          actualLat = coords.lat;
          actualLng = coords.lng;
          foundActualLocation = true;
        }
      }

      if (foundActualLocation) {
        console.log('Found partial match:', bestMatch, 'for input:', lowerAddress);
      }
    }

    // If we couldn't find the actual location, use a default US location
    if (!foundActualLocation) {
      // Default to a central US location if we can't find the actual location
      actualLat = 39.8283;
      actualLng = -98.5795; // Geographic center of the contiguous United States
    }

    // Use the actual coordinates for the search
    lat = actualLat;
    lng = actualLng;
    displayName = address + ' (NBD Coverage)';
    found = true;
  }
  // If not a US location or we want to continue with normal geocoding
  else {
    // First try exact matches
    if (cities[lowerAddress]) {
      lat = cities[lowerAddress].lat;
      lng = cities[lowerAddress].lng;
      displayName = address;
      found = true;
      console.log('Found exact match for non-US location:', lowerAddress);
    } else {
      // Then try partial matches, preferring longer matches
      for (const [city, coords] of Object.entries(cities)) {
        // Special handling for city names with state/country abbreviations
        if (city.includes(',') && lowerAddress.includes(city)) {
          bestMatch = city;
          bestMatchLength = city.length;
          console.log('Found city with state/country match for non-US location:', city);
          break; // Prioritize city+state matches
        }
        // Regular partial matching
        else if (lowerAddress.includes(city) && city.length > bestMatchLength) {
          bestMatch = city;
          bestMatchLength = city.length;
        }
      }

      // If we found a match, use it
      if (bestMatch) {
        lat = cities[bestMatch].lat;
        lng = cities[bestMatch].lng;
        displayName = address + ' (Approximate location)';
        found = true;
        console.log('Found partial match for non-US location:', bestMatch, 'for input:', lowerAddress);
      }
    }
  }

  if (!found) {
    // Default to New York if no match (in a real app, you'd use a better fallback)
    lat = 40.7128;
    lng = -74.0060;
    displayName = address + ' (Approximate location)';

    // Show a warning that this is just an approximation
    showSearchResult('<div class="search-warning"><i class="fas fa-exclamation-triangle"></i> Could not find exact location. Showing approximate position.</div>');
  }

  // Use the coordinates we found or defaulted to
  searchLocation(lat, lng, displayName);
}

// Function to zoom the map to show the 100-mile radius
function zoomToShowRadius(lat, lng) {
  // Create a circle with 100-mile radius (160934 meters)
  const radiusInMeters = 160934;

  // Create a bounds object that encompasses the circle
  const point = L.latLng(lat, lng);
  const bounds = L.latLngBounds(
    point.toBounds(radiusInMeters).getSouthWest(),
    point.toBounds(radiusInMeters).getNorthEast()
  );

  // Fit the map to these bounds with some padding
  map.fitBounds(bounds, {
    padding: [50, 50],
    maxZoom: 10
  });
}

// Check if a location is in an embargo country
function isEmbargoCountry(locationName) {
  if (!locationName) return false;

  // Convert to lowercase for case-insensitive comparison
  const locationLower = locationName.toLowerCase();

  // Check if any embargo country name appears in the location string
  return embargoCountries.some(country => {
    const countryLower = country.toLowerCase();
    return locationLower.includes(countryLower);
  });
}

// Process a searched location
function searchLocation(lat, lng, locationName) {
  try {
    console.log('Processing search location:', lat, lng, locationName);

    // Make sure the map is initialized
    if (!map) {
      console.error('Map is not initialized');
      showSearchResult('<div class="search-error">Error: Map is not initialized. Please refresh the page and try again.</div>');
      return;
    }

    // Check if the location is in an embargo country
    if (isEmbargoCountry(locationName)) {
      console.log('Embargo country detected:', locationName);
      showSearchResult(`<div class="search-result embargo-country">
        <div class="coverage-status">
          <span class="coverage-icon">⚠️</span>
          <h3 class="coverage-title">Embargo Country</h3>
        </div>
        <p>We do not provide service to embargo countries.</p>
        <p>Please search for a different location.</p>
      </div>`);
      return;
    }

    // Zoom to show the 100-mile radius
    try {
      zoomToShowRadius(lat, lng);
    } catch (zoomError) {
      console.error('Error zooming to location:', zoomError);
      // Continue even if zooming fails
    }

    // Clear any previous search markers
    try {
      markers.forEach(marker => {
        if (marker.options && marker.options.title === 'Searched Location') {
          map.removeLayer(marker);
        }
      });

      // Filter out search markers from the markers array
      markers = markers.filter(marker => marker.options && marker.options.title !== 'Searched Location');
    } catch (clearError) {
      console.error('Error clearing previous markers:', clearError);
      // Continue even if clearing fails
    }

    // Create a marker for the searched location
    const searchMarker = L.marker([lat, lng], {
      title: 'Searched Location',
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    }).addTo(map);

    // Add popup to the marker
    searchMarker.bindPopup(`<b>Searched Location:</b><br>${locationName || 'Unknown location'}`).openPopup();

    // Add to markers array
    markers.push(searchMarker);

    // Find depots within 100 miles and calculate distances
    let nearbyDepotsWithDistance = findNearbyDepotsWithDistance(lat, lng);

    // For US locations, ensure Sacramento is always included and shown as the nearest depot
    const isUSLocation = locationName && locationName.includes('NBD Coverage');
    if (isUSLocation) {
      // Find Sacramento depot
      const sacramentoDepot = depots.find(depot => depot.name === 'Sacramento Hub');

      if (sacramentoDepot) {
        // Calculate actual distance to Sacramento
        const searchLatLng = L.latLng(lat, lng);
        const sacramentoLatLng = L.latLng(sacramentoDepot.lat, sacramentoDepot.lng);
        const distance = searchLatLng.distanceTo(sacramentoLatLng);

        console.log(`Actual distance to Sacramento: ${(distance/1609.34).toFixed(1)} miles`);

        // Check if Sacramento is already in the list
        const sacramentoIndex = nearbyDepotsWithDistance.findIndex(item => item.depot.name === 'Sacramento Hub');

        if (sacramentoIndex >= 0) {
          // Sacramento is already in the list, make sure it's the first one
          if (sacramentoIndex > 0) {
            // Move Sacramento to the first position
            const sacramentoItem = nearbyDepotsWithDistance[sacramentoIndex];
            nearbyDepotsWithDistance.splice(sacramentoIndex, 1);
            nearbyDepotsWithDistance.unshift(sacramentoItem);
          }
        } else {
          // Sacramento is not in the list, add it as the first depot
          nearbyDepotsWithDistance.unshift({
            depot: sacramentoDepot,
            distance: distance
          });
        }
      }
    }

    // Show results
    // For US locations, always show as in coverage, even if no depots are within 100 miles
    if (nearbyDepotsWithDistance.length > 0 || isUSLocation) {
      // The depots are already sorted by distance, so the first one is the closest
      // Make sure we have at least one depot before trying to access it
      if (nearbyDepotsWithDistance.length === 0) {
        // If we're here with no nearby depots, it must be a US location
        // Create a default Sacramento depot if it doesn't exist
        const sacramentoDepot = {
          id: 'sacramento-default',
          name: 'Sacramento Hub',
          address: 'Sacramento, CA, USA',
          country: 'USA',
          status: 'approved',
          notes: 'Default NBD coverage for US locations',
          lat: 38.5816,
          lng: -121.4944
        };

        // Calculate distance
        const searchLatLng = L.latLng(lat, lng);
        const sacramentoLatLng = L.latLng(sacramentoDepot.lat, sacramentoDepot.lng);
        const distance = searchLatLng.distanceTo(sacramentoLatLng);

        // Add to the list
        nearbyDepotsWithDistance.push({
          depot: sacramentoDepot,
          distance: distance
        });
      }

      const closestDepot = nearbyDepotsWithDistance[0];
      const closestMiles = (closestDepot.distance / 1609.34).toFixed(1); // Convert meters to miles

      // Check if this is a Sacramento location (NBD coverage for US)
      const isSacramento = closestDepot.depot && closestDepot.depot.name === 'Sacramento Hub';
      const isNBDCoverage = locationName && locationName.includes('NBD Coverage');

      // Create sidebar result HTML
      let resultHTML = `<div class="search-result coverage-available">
        <div class="coverage-status">
          <span class="coverage-icon">✓</span>
          <h3 class="coverage-title">In Coverage</h3>
        </div>`;

      // Add NBD coverage message for US locations
      if (isNBDCoverage || isSacramento) {
        resultHTML += `<p>Next Business Day service available</p>`;
      }

      resultHTML += `<p>Nearest depot: <strong>${closestDepot.depot.name}</strong> (${closestMiles} miles)</p>`;

      if (nearbyDepotsWithDistance.length > 1) {
        resultHTML += `<p>${nearbyDepotsWithDistance.length} depots within 100 miles:</p>`;
      }

      resultHTML += `<ul class="depot-distance-list">`;

      // First add the closest depot with special styling
      resultHTML += `<li class="closest-depot">
        <strong>${closestDepot.depot.name}</strong> <span class="closest-badge">Nearest</span>`;

      // Add NBD badge for Sacramento
      if (isNBDCoverage || isSacramento) {
        resultHTML += ` <span class="nbd-badge">NBD</span>`;
      }

      resultHTML += `<br>
        <span class="distance-info">${closestMiles} miles</span>
      </li>`;

      // Highlight the closest depot's circle with a pulsing effect
      // First check if the depot has a circle property
      if (closestDepot.depot && closestDepot.depot.circle) {
        // Create a pulsing effect with a different color for the closest depot
        const pulseClosestCircle = () => {
          try {
            closestDepot.depot.circle.setStyle({
              fillOpacity: 0.5,
              weight: 4,
              color: '#00AA00',  // Green for closest depot
              fillColor: '#55FF55'
            });

            setTimeout(() => {
              closestDepot.depot.circle.setStyle({
                fillOpacity: 0.3,
                weight: 3,
                color: '#00AA00',
                fillColor: '#00AA00'
              });
            }, 500);
          } catch (error) {
            console.error('Error applying pulse effect to circle:', error);
          }
        };

        // Pulse a few times
        pulseClosestCircle();
        setTimeout(pulseClosestCircle, 1000);
        setTimeout(pulseClosestCircle, 2000);

        // Keep the closest depot's circle highlighted
        setTimeout(() => {
          try {
            if (closestDepot.depot && closestDepot.depot.circle) {
              closestDepot.depot.circle.setStyle({
                fillOpacity: 0.2,
                weight: 3,
                color: '#00AA00',
                fillColor: '#00AA00'
              });
            }
          } catch (error) {
            console.error('Error setting final style for closest depot circle:', error);
          }
        }, 3000);
      }

      // Then add the rest of the depots
      nearbyDepotsWithDistance.slice(1).forEach(item => {
        const { depot, distance } = item;
        const miles = (distance / 1609.34).toFixed(1); // Convert meters to miles with 1 decimal place

        resultHTML += `<li>
          <strong>${depot.name}</strong><br>
          <span class="distance-info">${miles} miles</span>
        </li>`;

        // Highlight this depot's circle with a pulsing effect
        if (depot && depot.circle) {
          // Create a pulsing effect
          const pulseCircle = () => {
            try {
              depot.circle.setStyle({
                fillOpacity: 0.4,
                weight: 4,
                color: '#FF0000',
                fillColor: '#FF5555'
              });

              setTimeout(() => {
                if (depot && depot.circle) {
                  depot.circle.setStyle({
                    fillOpacity: 0.2,
                    weight: 3,
                    color: '#FF0000',
                    fillColor: '#FF0000'
                  });
                }
              }, 500);
            } catch (error) {
              console.error('Error applying pulse effect to other depot circle:', error);
            }
          };

          // Pulse a few times
          pulseCircle();
          setTimeout(pulseCircle, 1000);
          setTimeout(pulseCircle, 2000);

          // Reset after pulsing
          setTimeout(() => {
            try {
              if (depot && depot.circle) {
                depot.circle.setStyle({
                  fillOpacity: 0.1,
                  weight: 2,
                  color: '#FF0000',
                  fillColor: '#FF0000'
                });
              }
            } catch (error) {
              console.error('Error setting final style for other depot circle:', error);
            }
          }, 3000);
        }
      });

    resultHTML += `</ul>
      <p class="search-tip">Circles show 100-mile coverage radius</p>
    </div>`;
    showSearchResult(resultHTML);

    // Add CSS for the depot distance list
    addSearchResultStyles();
  } else {
    // Get the closest depot even if it's outside the 100-mile radius
    const closestDepotInfo = getClosestDepotInfo(lat, lng, true);
    const closestDepotMatch = closestDepotInfo.match(/Closest depot: (.*?) \((.*?) miles away\)/i);

    let depotName = '';
    let depotDistance = '';

    if (closestDepotMatch && closestDepotMatch.length >= 3) {
      depotName = closestDepotMatch[1];
      depotDistance = closestDepotMatch[2];
    }

    showSearchResult(`<div class="search-result no-results">
      <div class="coverage-status">
        <span class="coverage-icon">✕</span>
        <h3 class="coverage-title">Out of Coverage</h3>
      </div>
      <p>No depots within 100 miles of your location</p>
      <p>Nearest depot: <strong>${depotName}</strong> (${depotDistance} miles)</p>
    </div>`);
  }
  } catch (error) {
    console.error('Error in searchLocation:', error);
    showSearchResult(`<div class="search-error">Search error. Please try a different location.</div>`);
  }
}



// Find depots within 100 miles of a location
function findNearbyDepots(lat, lng) {
  const searchLatLng = L.latLng(lat, lng);
  const nearbyDepots = [];

  depots.forEach(depot => {
    const depotLatLng = L.latLng(depot.lat, depot.lng);

    // Calculate distance in meters
    const distance = searchLatLng.distanceTo(depotLatLng);

    // 100 miles = 160934 meters
    if (distance <= 160934) {
      nearbyDepots.push(depot);
    }
  });

  return nearbyDepots;
}

// Find depots within 100 miles and include distance information
function findNearbyDepotsWithDistance(lat, lng) {
  const searchLatLng = L.latLng(lat, lng);
  const nearbyDepotsWithDistance = [];

  console.log('Finding nearby depots for coordinates:', lat, lng);
  console.log('Number of depots available:', depots.length);

  // Check if depots array is empty or undefined
  if (!depots || depots.length === 0) {
    console.log('No depots available to search');
    return [];
  }

  depots.forEach(depot => {
    // Check if depot has valid coordinates
    if (depot && typeof depot.lat === 'number' && typeof depot.lng === 'number') {
      const depotLatLng = L.latLng(depot.lat, depot.lng);

      // Calculate distance in meters
      const distance = searchLatLng.distanceTo(depotLatLng);
      console.log(`Depot ${depot.name}: distance = ${(distance/1609.34).toFixed(1)} miles`);

      // 100 miles = 160934 meters
      if (distance <= 160934) {
        nearbyDepotsWithDistance.push({
          depot,
          distance
        });
      }
    } else {
      console.warn('Invalid depot coordinates:', depot);
    }
  });

  console.log('Found nearby depots:', nearbyDepotsWithDistance.length);

  // Sort by distance (closest first)
  return nearbyDepotsWithDistance.sort((a, b) => a.distance - b.distance);
}

// Get information about the closest depot
function getClosestDepotInfo(lat, lng, plainText = false) {
  console.log('Getting closest depot info for coordinates:', lat, lng);

  // Check if depots array is empty or undefined
  if (!depots || depots.length === 0) {
    console.log('No depots available to find closest');
    return 'No depots available';
  }

  const searchLatLng = L.latLng(lat, lng);
  let closestDepot = null;
  let closestDistance = Infinity;

  depots.forEach(depot => {
    // Check if depot has valid coordinates
    if (depot && typeof depot.lat === 'number' && typeof depot.lng === 'number') {
      const depotLatLng = L.latLng(depot.lat, depot.lng);
      const distance = searchLatLng.distanceTo(depotLatLng);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestDepot = depot;
      }
    }
  });

  if (closestDepot) {
    const miles = (closestDistance / 1609.34).toFixed(1);
    console.log(`Closest depot: ${closestDepot.name} at ${miles} miles`);
    if (plainText) {
      return `Closest depot: ${closestDepot.name} (${miles} miles away)`;
    } else {
      return `<strong>${closestDepot.name}</strong> at ${miles} miles away`;
    }
  } else {
    console.log('No valid depots found');
    return 'No depots available';
  }
}

// Show search result
function showSearchResult(message) {
  console.log('Showing search result:', message);
  const searchResults = document.getElementById('search-results-overlay');

  if (!searchResults) {
    console.error('search-results-overlay element not found!');
    alert('Error: Could not find search results container');
    return;
  }

  try {
    // Clear previous results
    searchResults.innerHTML = message;
    searchResults.classList.add('show');

    // Add close button to the search results
    const closeButton = document.createElement('button');
    closeButton.className = 'close-results-button';
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.addEventListener('click', () => {
      searchResults.classList.remove('show');
    });

    searchResults.appendChild(closeButton);
  } catch (error) {
    console.error('Error showing search results:', error);
    alert('Error showing search results: ' + error.message);
  }
}

// Add CSS styles for search results
function addSearchResultStyles() {
  // Check if styles already exist
  if (!document.getElementById('search-result-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'search-result-styles';
    styleElement.textContent = `
      /* Search results container */
      #search-results-overlay {
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        border: 1px solid #e9ecef;
      }

      /* Coverage status */
      .coverage-status {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e9ecef;
      }

      .coverage-icon {
        font-size: 1.5rem;
        margin-right: 10px;
      }

      .coverage-title {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
      }

      /* In coverage */
      .coverage-available .coverage-status {
        color: #28a745;
      }

      /* Out of coverage */
      .no-results .coverage-status {
        color: #dc3545;
      }

      /* Embargo country */
      .embargo-country .coverage-status {
        color: #fd7e14;
      }

      .embargo-country {
        border-left: 3px solid #fd7e14;
      }

      /* Depot list */
      .depot-distance-list {
        list-style: none;
        padding: 0;
        margin: 15px 0;
      }

      .depot-distance-list li {
        background-color: #f8f9fa;
        border-left: 3px solid #4dabf7;
        margin-bottom: 10px;
        padding: 10px 12px;
        border-radius: 4px;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      }

      .depot-distance-list li.closest-depot {
        background-color: #f0f9f0;
        border-left: 3px solid #28a745;
      }

      .closest-badge {
        display: inline-block;
        background-color: #28a745;
        color: white;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 12px;
        margin-left: 8px;
        vertical-align: middle;
      }

      .nbd-badge {
        display: inline-block;
        background-color: #007bff;
        color: white;
        font-size: 0.7rem;
        padding: 2px 8px;
        border-radius: 12px;
        margin-left: 5px;
        vertical-align: middle;
      }

      .depot-distance-list li:hover {
        background-color: #f0f0f0;
        transform: translateX(2px);
      }

      .depot-distance-list li.closest-depot:hover {
        background-color: #e8f5e8;
      }

      .distance-info {
        color: #666;
        font-size: 0.85rem;
        display: block;
        margin-top: 4px;
      }

      .search-tip {
        font-style: italic;
        color: #888;
        font-size: 0.85rem;
        margin-top: 15px;
        padding-top: 10px;
        border-top: 1px solid #e9ecef;
      }

      /* Close button */
      .close-results-button {
        opacity: 0.6;
        transition: opacity 0.2s;
      }

      .close-results-button:hover {
        opacity: 1;
        background-color: rgba(0,0,0,0.05);
      }
    `;
    document.head.appendChild(styleElement);
  }
}

// Open the depot modal for adding or editing
function openDepotModal(depot = null) {
  // Reset the form
  document.getElementById('depot-form').reset();

  // Clear address search results and selected address
  document.getElementById('address-search-results').innerHTML = '';
  document.getElementById('address-search-results').classList.remove('show');
  document.getElementById('selected-address-display').innerHTML = '';
  document.getElementById('selected-address-display').classList.remove('show');

  if (depot) {
    // Editing existing depot
    document.getElementById('modal-title').textContent = 'Edit Depot';
    document.getElementById('depot-id').value = depot.id;
    document.getElementById('depot-name').value = depot.name;
    document.getElementById('depot-country').value = depot.country || '';
    document.getElementById('depot-address').value = depot.address;
    document.getElementById('depot-status').value = depot.status || 'approved';
    document.getElementById('depot-notes').value = depot.notes || '';

    // Display the selected address
    document.getElementById('selected-address-display').innerHTML = `<strong>Selected Address:</strong><br>${depot.address}`;
    document.getElementById('selected-address-display').classList.add('show');

    // Store the coordinates in the form data attributes
    document.getElementById('depot-form').setAttribute('data-lat', depot.lat);
    document.getElementById('depot-form').setAttribute('data-lon', depot.lng);

    currentDepotId = depot.id;
  } else {
    // Adding new depot
    document.getElementById('modal-title').textContent = 'Add New Depot';
    document.getElementById('depot-id').value = '';

    currentDepotId = null;
  }

  // Show the modal
  document.getElementById('depot-modal').classList.add('show');
}

// Close the depot modal
function closeDepotModal() {
  document.getElementById('depot-modal').classList.remove('show');
}

// Handle saving a depot
function handleSaveDepot(e) {
  e.preventDefault();

  // Get form values
  const id = document.getElementById('depot-id').value;
  const name = document.getElementById('depot-name').value;
  const address = document.getElementById('depot-address').value;
  const status = document.getElementById('depot-status').value;
  const notes = document.getElementById('depot-notes').value;

  // Extract country from address if possible, or leave blank
  let country = '';
  if (address) {
    // Try to extract country from the end of the address
    const addressParts = address.split(',');
    if (addressParts.length > 0) {
      // Get the last part and trim it
      const lastPart = addressParts[addressParts.length - 1].trim();
      // If it looks like a country name (not a postal code), use it
      if (lastPart.length > 3 && !/^\d+$/.test(lastPart)) {
        country = lastPart;
      }
    }
  }
  document.getElementById('depot-country').value = country;

  // Validate inputs
  if (!name || !address) {
    alert('Please fill in all required fields (Name and select an address from the search results).');
    return;
  }

  // Check if address was selected from search results
  const selectedAddressDisplay = document.getElementById('selected-address-display');
  if (!selectedAddressDisplay.classList.contains('show')) {
    alert('Please search for and select an address before saving.');
    return;
  }

  // Get the coordinates from the form data attributes
  const form = document.getElementById('depot-form');
  const lat = parseFloat(form.getAttribute('data-lat'));
  const lng = parseFloat(form.getAttribute('data-lon'));

  // Show saving message
  const saveButton = document.querySelector('.save-button');
  const originalButtonText = saveButton.textContent;
  saveButton.textContent = 'Saving...';
  saveButton.disabled = true;

  // Add a small delay to ensure the UI updates
  setTimeout(() => {
    // Check if we have valid coordinates
    if (isNaN(lat) || isNaN(lng)) {
      alert('Error: Could not get valid coordinates for this address. Please try selecting the address again.');
      saveButton.textContent = originalButtonText;
      saveButton.disabled = false;
      return;
    }

    // Log the form values for debugging
    console.log('Form values:', { id, name, country, address, status, notes, lat, lng });

    if (id) {
      // Update existing depot
      console.log('Updating existing depot with ID:', id);

      // Try different ways to find the depot
      let depotIndex = depots.findIndex(d => d.id === id);
      if (depotIndex === -1) {
        depotIndex = depots.findIndex(d => String(d.id) === String(id));
      }

      console.log('Found depot at index:', depotIndex);

      if (depotIndex !== -1) {
        // Remove old marker and circle
        if (depots[depotIndex].marker) {
          map.removeLayer(depots[depotIndex].marker);
        }
        if (depots[depotIndex].circle) {
          map.removeLayer(depots[depotIndex].circle);
        }

        // Update depot data
        depots[depotIndex] = {
          ...depots[depotIndex],
          name,
          country,
          address,
          status,
          notes,
          lat: lat,
          lng: lng
        };

        console.log('Updated depot:', depots[depotIndex]);
      }
    } else {
      // Add new depot
      const newId = String(Date.now()); // Use timestamp as ID and convert to string
      console.log('Creating new depot with ID:', newId);

      const newDepot = {
        id: newId,
        name,
        country,
        address,
        status,
        notes,
        lat: lat,
        lng: lng
      };

      depots.push(newDepot);
      console.log('Added new depot:', newDepot);
    }

    // Save to localStorage
    saveDepotsToStorage();

    // Update the map
    addDepotsToMap();

    // Close the modal
    closeDepotModal();

    // Center the map on the new/updated depot
    const depot = id ? depots.find(d => String(d.id) === String(id)) : depots[depots.length - 1];
    if (depot) {
      // Zoom to show the 100-mile radius
      zoomToShowRadius(depot.lat, depot.lng);
    }

    // Reset button state
    saveButton.textContent = originalButtonText;
    saveButton.disabled = false;
  }, 100);
}



// Handle address search in the depot form
function handleAddressSearch() {
  const searchInput = document.getElementById('depot-address-search').value.trim();

  if (!searchInput) {
    alert('Please enter an address to search.');
    return;
  }

  // Disable search button and show loading state
  const searchButton = document.getElementById('address-search-button');
  searchButton.disabled = true;
  searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  // Clear previous results
  const resultsContainer = document.getElementById('address-search-results');
  resultsContainer.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching for addresses...</div>';
  resultsContainer.classList.add('show');

  // Use Nominatim for geocoding (OpenStreetMap's geocoding service)
  const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchInput)}&limit=5&_=${Date.now()}`;

  // Fetch the geocoding results with proper headers
  fetch(searchUrl, {
    headers: {
      'Accept': 'application/json',
      'Referer': window.location.href,
      'User-Agent': 'DepotLocatorApp/1.0',  // Identify your application as per Nominatim usage policy
      'Cache-Control': 'no-cache'  // Prevent caching of sensitive data
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Reset search button
      searchButton.disabled = false;
      searchButton.innerHTML = '<i class="fas fa-search"></i>';

      if (data && data.length > 0) {
        // Display results
        let resultsHTML = '';

        data.forEach(result => {
          // Check if the result is in an embargo country
          const isEmbargo = isEmbargoCountry(result.display_name);

          if (isEmbargo) {
            // Add a class and warning for embargo countries
            resultsHTML += `<div class="address-result-item embargo-result" data-lat="${result.lat}" data-lon="${result.lon}" data-address="${result.display_name}" data-embargo="true">
              ${result.display_name} <span class="embargo-warning">(Embargo Country)</span>
            </div>`;
          } else {
            resultsHTML += `<div class="address-result-item" data-lat="${result.lat}" data-lon="${result.lon}" data-address="${result.display_name}">
              ${result.display_name}
            </div>`;
          }
        });

        resultsContainer.innerHTML = resultsHTML;

        // Add click event listeners to results
        document.querySelectorAll('.address-result-item').forEach(item => {
          item.addEventListener('click', function() {
            const lat = this.getAttribute('data-lat');
            const lon = this.getAttribute('data-lon');
            const address = this.getAttribute('data-address');
            const isEmbargo = this.getAttribute('data-embargo') === 'true';

            if (isEmbargo) {
              // Show warning for embargo countries
              alert('Warning: This location is in an embargo country. We do not provide service to embargo countries.');
              return;
            }

            // Set the hidden address input and store coordinates
            document.getElementById('depot-address').value = address;

            // Store the coordinates as data attributes on the form for later use
            document.getElementById('depot-form').setAttribute('data-lat', lat);
            document.getElementById('depot-form').setAttribute('data-lon', lon);

            // Display the selected address
            const selectedAddressDisplay = document.getElementById('selected-address-display');
            selectedAddressDisplay.innerHTML = `<strong>Selected Address:</strong><br>${address}`;
            selectedAddressDisplay.classList.add('show');

            // Clear the search results
            resultsContainer.innerHTML = '';
            resultsContainer.classList.remove('show');

            // Clear the search input
            document.getElementById('depot-address-search').value = '';
          });
        });
      } else {
        resultsContainer.innerHTML = '<div class="search-error"><i class="fas fa-exclamation-circle"></i> No addresses found. Please try a different search.</div>';
      }
    })
    .catch(error => {
      // Reset search button
      searchButton.disabled = false;
      searchButton.innerHTML = '<i class="fas fa-search"></i>';

      console.error('Geocoding error:', error);
      resultsContainer.innerHTML = `<div class="search-error"><i class="fas fa-exclamation-circle"></i> Error searching for address: ${error.message}. Please try again.</div>`;
    });
}

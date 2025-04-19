// Global variables
let map;
let markers = [];
let circles = [];
let depots = [];
let currentDepotId = null;

// Import Supabase client functions
import { initSupabase, loadDepotsFromSupabase, migrateLocalStorageToSupabase } from './supabase-client.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing depot manager...');

  try {
    // Initialize Supabase client
    await initSupabase();

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
    }

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

    // Render the depot list
    renderDepotList();

    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    // Fall back to localStorage if Supabase fails
    loadDepotsFromStorage();
    initMap();
    setupEventListeners();
    renderDepotList();

    // Hide loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
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

          // Refresh the depot list
          renderDepotList();
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
    }
  } catch (error) {
    console.error('Error migrating from localStorage:', error);
    depots = [];
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
    }
  } catch (error) {
    console.error('Error loading depots from localStorage:', error);
    depots = [];
  }
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
  // Create a map centered on the world
  map = L.map('map').setView([20, 0], 2);

  // Add OpenStreetMap tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);

  // Add depots to the map
  addDepotsToMap();
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

// Get depot count by status
function getDepotCountByStatus(status) {
  const count = depots.filter(depot => (depot.status || 'approved') === status).length;
  return count === 1 ? '1 Depot' : `${count} Depots`;
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

// Render the depot list
function renderDepotList() {
  const depotsList = document.getElementById('depots-list');
  depotsList.innerHTML = '';

  if (depots.length === 0) {
    depotsList.innerHTML = '<div class="no-depots">No depots added yet. Click "Add New Depot" to get started.</div>';
    return;
  }

  // Log all depots for debugging (without circular references)
  try {
    // Create a clean copy for logging without circular references
    const depotsForLogging = depots.map(depot => ({
      id: String(depot.id),
      name: depot.name,
      country: depot.country,
      address: depot.address,
      status: depot.status || 'approved',
      notes: depot.notes,
      lat: depot.lat,
      lng: depot.lng
    }));
    console.log('Rendering depot list with depots:', depotsForLogging);
  } catch (error) {
    console.error('Error logging depots:', error);
  }

  // Sort depots by status: approved first, then in-progress, then not-approved
  const sortedDepots = [...depots].sort((a, b) => {
    const statusOrder = {
      'approved': 1,
      'in-progress': 2,
      'not-approved': 3
    };
    const statusA = a.status || 'approved';
    const statusB = b.status || 'approved';
    return statusOrder[statusA] - statusOrder[statusB];
  });

  // Group headers for each status type
  let currentStatus = null;

  sortedDepots.forEach(depot => {
    // Ensure depot ID is a string to avoid type issues
    const depotId = String(depot.id);
    const statusClass = depot.status || 'approved';

    // Add a group header if this is a new status group
    if (currentStatus !== statusClass) {
      currentStatus = statusClass;

      // Create a unique ID for this group
      const groupId = `depot-group-${statusClass}`;

      // Create the group header with collapse functionality
      const groupHeader = document.createElement('div');
      groupHeader.className = `depot-group-header status-${statusClass}`;
      groupHeader.setAttribute('data-target', groupId);
      groupHeader.innerHTML = `
        <div class="group-header-content">
          <div class="group-title-wrapper">
            <span class="collapse-indicator"></span>
            <h2 class="group-title">${getStatusLabel(statusClass)} Depots</h2>
          </div>
          <div class="depot-count">${getDepotCountByStatus(statusClass)}</div>
        </div>
      `;
      depotsList.appendChild(groupHeader);

      // Create a container for this group's depots
      const groupContainer = document.createElement('div');
      groupContainer.id = groupId;
      groupContainer.className = 'depot-group-container';
      depotsList.appendChild(groupContainer);

      // Initialize all groups as expanded (not collapsed)
      groupHeader.classList.remove('collapsed');
    }

    const depotItem = document.createElement('div');
    depotItem.className = `depot-item status-${statusClass}`;
    depotItem.innerHTML = `
      <div class="depot-header">
        <h3 class="depot-title">${depot.name}</h3>
        <div class="depot-status status-${statusClass}">
          <i class="fas fa-circle status-icon"></i> ${getStatusLabel(statusClass)}
        </div>
      </div>
      <div class="depot-address">${depot.address}</div>
      ${depot.notes ? `<div class="depot-notes">${depot.notes}</div>` : ''}
      <div class="depot-actions">
        <button class="view-button" data-id="${depotId}">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="edit-button" data-id="${depotId}">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="delete-button" data-id="${depotId}">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;

    // Append to the current group container instead of directly to the list
    const groupContainer = document.getElementById(`depot-group-${statusClass}`);
    groupContainer.appendChild(depotItem);
  });

  // Add event listeners to the buttons
  document.querySelectorAll('.view-button').forEach(button => {
    button.addEventListener('click', handleViewDepot);
  });

  document.querySelectorAll('.edit-button').forEach(button => {
    button.addEventListener('click', handleEditDepot);
  });

  document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', handleDeleteDepot);
  });

  // Add event listeners to the group headers for collapsing
  document.querySelectorAll('.depot-group-header').forEach(header => {
    header.addEventListener('click', toggleGroupCollapse);
  });
}

// Set up event listeners
function setupEventListeners() {
  // Add depot button
  document.getElementById('add-depot-button').addEventListener('click', () => {
    openDepotModal();
  });

  // Search input
  document.getElementById('depot-search').addEventListener('input', handleDepotSearch);

  // Depot form submission
  document.getElementById('depot-form').addEventListener('submit', handleSaveDepot);

  // Modal close button
  document.querySelector('.close-button').addEventListener('click', closeDepotModal);

  // Cancel button in depot modal
  document.querySelector('.cancel-button').addEventListener('click', closeDepotModal);

  // Address search button in depot form
  document.getElementById('address-search-button').addEventListener('click', handleAddressSearch);

  // Enter key in address search input
  document.getElementById('depot-address-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddressSearch();
    }
  });

  // Confirm delete button
  document.getElementById('confirm-delete').addEventListener('click', confirmDeleteDepot);

  // Cancel delete button
  document.getElementById('cancel-delete').addEventListener('click', closeConfirmModal);

  // Close button in confirm modal
  document.getElementById('close-confirm-modal').addEventListener('click', closeConfirmModal);
}

// Handle depot search
function handleDepotSearch(e) {
  const searchTerm = e.target.value.toLowerCase().trim();
  const depotItems = document.querySelectorAll('.depot-item');
  const groupContainers = document.querySelectorAll('.depot-group-container');
  const groupHeaders = document.querySelectorAll('.depot-group-header');

  // If search is empty, restore original view
  if (!searchTerm) {
    depotItems.forEach(item => {
      item.style.display = 'block';
    });

    // Show all group containers and headers
    groupContainers.forEach(container => {
      container.style.display = 'block';
    });

    groupHeaders.forEach(header => {
      header.style.display = 'block';
    });

    return;
  }

  // Track which groups have visible items
  const groupsWithVisibleItems = new Set();

  // Check each depot item
  depotItems.forEach(item => {
    const name = item.querySelector('.depot-title').textContent.toLowerCase();
    const address = item.querySelector('.depot-address').textContent.toLowerCase();
    const notes = item.querySelector('.depot-notes') ?
                  item.querySelector('.depot-notes').textContent.toLowerCase() : '';
    const groupId = item.parentElement.id;

    if (name.includes(searchTerm) || address.includes(searchTerm) || notes.includes(searchTerm)) {
      item.style.display = 'block';
      groupsWithVisibleItems.add(groupId);

      // Make sure parent group is expanded
      const parentGroup = document.getElementById(groupId);
      if (parentGroup) {
        parentGroup.classList.remove('collapsed');

        // Update the header to show as expanded
        const headerId = groupId.replace('depot-group-', '');
        const header = document.querySelector(`.depot-group-header.status-${headerId}`);
        if (header) {
          header.classList.remove('collapsed');
        }
      }
    } else {
      item.style.display = 'none';
    }
  });

  // Hide empty groups
  groupContainers.forEach(container => {
    const hasVisibleItems = groupsWithVisibleItems.has(container.id);
    if (!hasVisibleItems) {
      container.style.display = 'none';
    } else {
      container.style.display = 'block';
    }
  });

  // Hide headers of empty groups
  groupHeaders.forEach(header => {
    const button = header.querySelector('.collapse-button');
    if (button) {
      const targetId = button.dataset.target;
      const hasVisibleItems = groupsWithVisibleItems.has(targetId);
      if (!hasVisibleItems) {
        header.style.display = 'none';
      } else {
        header.style.display = 'block';
      }
    }
  });
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
      if (lastPart.length > 3 && !/^\\d+$/.test(lastPart)) {
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

    // Update the map and list
    addDepotsToMap();
    renderDepotList();

    // Close the modal
    closeDepotModal();

    // Center the map on the new/updated depot
    const depot = id ? depots.find(d => String(d.id) === String(id)) : depots[depots.length - 1];
    if (depot) {
      map.setView([depot.lat, depot.lng], 10);
    }

    // Reset button state
    saveButton.textContent = originalButtonText;
    saveButton.disabled = false;
  }, 100);
}

// Handle viewing a depot
function handleViewDepot(e) {
  const depotIdStr = e.currentTarget.dataset.id;
  // Find depot using string comparison
  const depot = depots.find(d => String(d.id) === String(depotIdStr));

  if (depot && depot.marker) {
    map.setView([depot.lat, depot.lng], 10);
    depot.marker.openPopup();
  }
}

// Handle editing a depot
function handleEditDepot(e) {
  const depotIdStr = e.currentTarget.dataset.id;
  // Find depot using string comparison
  const depot = depots.find(d => String(d.id) === String(depotIdStr));

  if (depot) {
    openDepotModal(depot);
  }
}

// Handle deleting a depot
function handleDeleteDepot(e) {
  e.preventDefault(); // Prevent any default action
  e.stopPropagation(); // Stop event bubbling

  // Get the depot ID from the button's data attribute
  const depotIdStr = e.currentTarget.dataset.id;
  if (!depotIdStr) {
    console.error('No depot ID found in delete button');
    return;
  }

  // Find the depot in our data array
  const depot = depots.find(d => String(d.id) === String(depotIdStr));
  if (!depot) {
    console.error(`Depot with ID ${depotIdStr} not found in data`);
    return;
  }

  const depotName = depot.name;
  console.log('Attempting to delete depot:', { id: depotIdStr, name: depotName });

  // Store the depot info for the confirmation handler
  window.depotToDelete = {
    id: depotIdStr,
    name: depotName
  };

  // Update confirmation message
  const confirmMessage = document.getElementById('confirm-message');
  confirmMessage.innerHTML = `Are you sure you want to delete the depot <strong>${depotName}</strong>?`;

  // Show confirmation modal
  document.getElementById('confirm-modal').classList.add('show');
}

// Confirm depot deletion
async function confirmDeleteDepot() {
  const deleteInfo = window.depotToDelete;
  console.log('Confirming deletion of depot:', deleteInfo);

  if (!deleteInfo || !deleteInfo.id) {
    console.error('No depot information found for deletion');
    closeConfirmModal();
    return;
  }

  const depotIdStr = deleteInfo.id;
  const depotName = deleteInfo.name;

  // Show loading indicator in the confirm modal
  const confirmMessage = document.getElementById('confirm-message');
  confirmMessage.innerHTML = `<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Deleting depot '${depotName}'...</div>`;

  // Disable buttons during deletion
  document.getElementById('confirm-delete').disabled = true;
  document.getElementById('cancel-delete').disabled = true;

  try {
    // First try to find the depot by ID
    let depotIndex = depots.findIndex(d => String(d.id) === String(depotIdStr));
    console.log('Depot index found:', depotIndex);

    if (depotIndex === -1) {
      // If we can't find it by ID, try to find it by name as a fallback
      const nameIndex = depots.findIndex(d => d.name === depotName);

      if (nameIndex === -1) {
        throw new Error('Depot not found by ID or name');
      }

      console.log('Found depot by name instead of ID, index:', nameIndex);
      // Use the name index instead
      depotIndex = nameIndex;
    }

    // Get the depot object
    const depot = depots[depotIndex];
    console.log('Found depot to delete:', depot);

    // Remove marker and circle from map if they exist
    if (depot.marker) {
      map.removeLayer(depot.marker);
      // Remove the marker reference to avoid circular references
      depot.marker = null;
    }
    if (depot.circle) {
      map.removeLayer(depot.circle);
      // Remove the circle reference to avoid circular references
      depot.circle = null;
    }

    // Delete from Supabase first
    try {
      // Import the deleteDepotFromSupabase function dynamically
      const { deleteDepotFromSupabase } = await import('./supabase-client.js');
      await deleteDepotFromSupabase(depotIdStr);
      console.log(`Depot '${depotName}' deleted from Supabase`);
    } catch (supabaseError) {
      console.error('Error deleting from Supabase:', supabaseError);
      // Show warning but continue with local deletion
      const statusElement = document.getElementById('status-message');
      if (statusElement) {
        statusElement.textContent = 'Warning: Deleted locally but Supabase deletion failed. Changes may not persist.';
        statusElement.style.display = 'block';
        setTimeout(() => {
          statusElement.style.display = 'none';
        }, 5000);
      }
    }

    // Remove from array
    depots.splice(depotIndex, 1);
    console.log(`Depot '${depotName}' removed. Remaining depots:`, depots.length);

    // Update localStorage as backup
    try {
      localStorage.setItem('depots', JSON.stringify(depots));
      console.log('Updated localStorage after deletion');
    } catch (localStorageError) {
      console.error('Error updating localStorage after deletion:', localStorageError);
    }

    // Update the map and list
    addDepotsToMap();
    renderDepotList();

    // Show a temporary success message
    const depotsList = document.getElementById('depots-list');
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `<i class="fas fa-check-circle"></i> Depot '${depotName}' has been deleted successfully.`;

    if (depots.length === 0) {
      depotsList.innerHTML = '';
    }

    depotsList.insertBefore(successMessage, depotsList.firstChild);

    // Clear the message after 3 seconds
    setTimeout(() => {
      if (document.querySelector('.success-message')) {
        document.querySelector('.success-message').remove();

        if (depots.length === 0) {
          renderDepotList(); // Re-render to show "No depots" message
        }
      }
    }, 3000);

    // Clear the depot info
    window.depotToDelete = null;

    // Close the modal
    closeConfirmModal();
  } catch (error) {
    console.error('Error deleting depot:', error);
    alert(`There was an error deleting the depot: ${error.message}. Please try again.`);

    // Re-enable buttons
    document.getElementById('confirm-delete').disabled = false;
    document.getElementById('cancel-delete').disabled = false;

    // Reset confirmation message
    confirmMessage.innerHTML = `Are you sure you want to delete the depot <strong>${depotName}</strong>?`;

    // Don't close the modal so user can try again
  }
}

// Toggle group collapse
function toggleGroupCollapse(e) {
  const header = e.currentTarget;
  const targetId = header.dataset.target;
  const targetContainer = document.getElementById(targetId);

  if (targetContainer) {
    // Toggle the collapsed class on the container
    targetContainer.classList.toggle('collapsed');

    // Toggle the collapsed class on the header for styling
    header.classList.toggle('collapsed');
  }
}

// Close confirmation modal
function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.remove('show');
  // Clear the depot info when closing the modal
  window.depotToDelete = null;

  // Clear the confirmation message
  const confirmMessage = document.getElementById('confirm-message');
  if (confirmMessage) {
    confirmMessage.innerHTML = '';
  }
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

  // Fetch the geocoding results
  fetch(searchUrl, {
    headers: {
      'Accept': 'application/json',
      'Referer': window.location.href
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
          resultsHTML += `<div class="address-result-item" data-lat="${result.lat}" data-lon="${result.lon}" data-address="${result.display_name}">
            ${result.display_name}
          </div>`;
        });

        resultsContainer.innerHTML = resultsHTML;

        // Add click event listeners to results
        document.querySelectorAll('.address-result-item').forEach(item => {
          item.addEventListener('click', function() {
            const lat = this.getAttribute('data-lat');
            const lon = this.getAttribute('data-lon');
            const address = this.getAttribute('data-address');

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

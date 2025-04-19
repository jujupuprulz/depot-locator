# Global Depot Locator

A web-based tool for locating and managing distribution depots worldwide. This application allows users to search for nearby depots, view coverage areas, and manage depot information.

## Features

- Interactive map interface with depot locations and coverage areas
- Search functionality to find nearby depots
- Coverage radius visualization (100-mile radius)
- Depot management interface for adding, editing, and removing depots
- Data persistence using Supabase database
- Responsive design for desktop and mobile devices
- Space-themed UI with custom animations

## Technologies Used

- HTML5, CSS3, and JavaScript
- Leaflet.js for interactive maps
- OpenStreetMap for map tiles
- Supabase for database storage
- Font Awesome for icons
- Google Fonts for typography

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for map tiles and Supabase connectivity

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/depot-locator.git
   ```

2. Navigate to the project directory:
   ```
   cd depot-locator
   ```

3. Open the application in your browser:
   - Option 1: Open `depot-locator-new.html` directly in your browser
   - Option 2: Use a local server (recommended):
     ```
     python -m http.server 8000
     ```
     Then visit `http://localhost:8000/depot-locator-new.html`

## Usage

### Searching for Depots

1. Enter a location or coordinates in the search bar
2. Click the search button or press Enter
3. View nearby depots within a 100-mile radius
4. Click on depot markers for more information

### Managing Depots

1. Click "Manage Depots" in the navigation bar
2. Use the depot manager interface to:
   - Add new depots
   - Edit existing depots
   - Delete depots
   - View depot details

## Data Migration

The application supports migrating data from localStorage to Supabase:

1. Open the migration tool at `migrate-depots.html`
2. Click "Migrate Data to Supabase"
3. View the migration logs for details

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Leaflet.js for the mapping library
- OpenStreetMap contributors for map data
- Supabase for the backend database service

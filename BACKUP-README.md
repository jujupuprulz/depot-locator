# Depot Locator Backup System

This document explains how to use the backup system for the Depot Locator application.

## Backup Options

The Depot Locator application now supports two backup methods:

1. **GitHub Backup**: All code changes are backed up to GitHub
2. **Supabase Backup**: Depot data is backed up to Supabase database

## GitHub Backup

Your code is already backed up to GitHub in the repository: https://github.com/jujupuprulz/depot-locator

To manually backup changes to GitHub:

1. Open a terminal
2. Navigate to your project directory: `cd /Users/judytsao/Desktop/Organized\ Depot\ Locator_Latest_Version`
3. Add changes: `git add .`
4. Commit changes: `git commit -m "Your commit message"`
5. Push to GitHub: `git push origin leaflet-version`

## Supabase Backup

### Setting Up Supabase Backup

1. Get your Supabase API key from the Supabase dashboard
2. Open the `backup-to-supabase.js` file
3. Replace `YOUR_SUPABASE_KEY` with your actual Supabase API key
4. Install required dependencies: `npm install @supabase/supabase-js`
5. Run the backup script: `node backup-to-supabase.js`

### Using the Backup Viewer

A web-based backup viewer is included to help you manage your Supabase backups:

1. Open the `supabase-backup-viewer.html` file
2. Replace `YOUR_SUPABASE_KEY` with your actual Supabase API key
3. Open the file in a web browser

The backup viewer allows you to:
- View all backed up depots
- Backup current depot data to Supabase
- Restore depot data from Supabase to your local storage
- Export depot data as a JSON file

## Automatic Backups

For automatic backups, you can:

1. Set up a GitHub Action to automatically push changes to GitHub
2. Set up a cron job to run the `backup-to-supabase.js` script periodically

## Restoring from Backup

### Restoring from GitHub

To restore from GitHub:

1. Clone the repository: `git clone https://github.com/jujupuprulz/depot-locator.git`
2. Checkout the desired branch: `git checkout leaflet-version`

### Restoring from Supabase

To restore depot data from Supabase:

1. Open the backup viewer (`supabase-backup-viewer.html`)
2. Click the "Restore to Local" button

This will restore the depot data to your browser's localStorage.

## Troubleshooting

If you encounter issues with the backup system:

1. Check that your Supabase API key is correct
2. Ensure you have internet connectivity
3. Check the browser console for any error messages
4. Verify that your GitHub credentials are correct

For any persistent issues, please contact support.

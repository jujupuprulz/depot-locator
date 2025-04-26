// Script to extract depot data from localStorage and upload to Supabase
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = 'https://guqubcdsalglyqoqutee.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXViY2RzYWxnbHlxb3F1dGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM0MzA5NjcsImV4cCI6MjAyOTAwNjk2N30.Nh83ebqzf9Nt-yDj3m0q0MJHzlITaagaWlIWyQb_29Y'; // Anon key

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to extract depot data from HTML file
async function extractDepotData() {
  try {
    // Read the HTML file
    const filePath = path.join(__dirname, 'Latest Version', 'basic-depot-manager.html');
    const htmlContent = fs.readFileSync(filePath, 'utf8');

    // Extract the defaultDepots array using regex
    const depotsMatch = htmlContent.match(/const\s+defaultDepots\s*=\s*(\[[\s\S]*?\]);/);

    if (!depotsMatch || !depotsMatch[1]) {
      console.error('Could not find defaultDepots in the HTML file');
      return null;
    }

    // Parse the extracted JSON
    // Need to replace single quotes with double quotes for valid JSON
    const depotsJson = depotsMatch[1].replace(/'/g, '"');
    const depots = JSON.parse(depotsJson);

    console.log(`Extracted ${depots.length} depots from HTML file`);
    return depots;
  } catch (error) {
    console.error('Error extracting depot data:', error);
    return null;
  }
}

// Function to upload depots to Supabase
async function uploadToSupabase(depots) {
  if (!depots || !depots.length) {
    console.error('No depot data to upload');
    return;
  }

  try {
    // First, clear existing data
    const { error: deleteError } = await supabase
      .from('depots')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      return;
    }

    console.log('Cleared existing data from Supabase');

    // Prepare data for insertion
    const depotsForInsert = depots.map(depot => ({
      name: depot.name,
      address: depot.address,
      status: depot.status,
      lat: depot.lat,
      lng: depot.lng,
      notes: depot.notes || ''
    }));

    // Insert data
    const { data, error } = await supabase
      .from('depots')
      .insert(depotsForInsert)
      .select();

    if (error) {
      console.error('Error uploading to Supabase:', error);
      return;
    }

    console.log(`Successfully uploaded ${data.length} depots to Supabase`);
  } catch (error) {
    console.error('Error in Supabase upload process:', error);
  }
}

// Main function
async function main() {
  console.log('Starting backup to Supabase...');
  const depots = await extractDepotData();
  if (depots) {
    await uploadToSupabase(depots);
  }
  console.log('Backup process completed');
}

// Run the script
main();

// Script to migrate depot data from localStorage to Supabase
import { initSupabase, saveDepotToSupabase } from './supabase-client.js';

// Function to migrate data
async function migrateDepotsToSupabase() {
  console.log('Starting migration of depots from localStorage to Supabase...');
  
  try {
    // Initialize Supabase client
    await initSupabase();
    
    // Get depots from localStorage
    const storedDepots = localStorage.getItem('depots');
    if (!storedDepots) {
      console.log('No depots found in localStorage to migrate');
      return { success: false, message: 'No depots found in localStorage' };
    }
    
    // Parse depots
    const depots = JSON.parse(storedDepots);
    console.log(`Found ${depots.length} depots in localStorage for migration`);
    
    // Track migration results
    const results = {
      total: depots.length,
      migrated: [],
      failed: []
    };
    
    // Migrate each depot
    for (const depot of depots) {
      try {
        // Ensure ID is a string
        depot.id = String(depot.id);
        
        // Save to Supabase
        const savedDepot = await saveDepotToSupabase(depot);
        console.log(`Migrated depot: ${depot.name} (ID: ${depot.id})`);
        results.migrated.push(savedDepot);
      } catch (error) {
        console.error(`Failed to migrate depot ${depot.name} (ID: ${depot.id}):`, error);
        results.failed.push({ depot, error: error.message });
      }
    }
    
    // Log results
    console.log('Migration completed:');
    console.log(`- Total: ${results.total}`);
    console.log(`- Migrated: ${results.migrated.length}`);
    console.log(`- Failed: ${results.failed.length}`);
    
    return {
      success: results.failed.length === 0,
      message: `Migration completed: ${results.migrated.length} migrated, ${results.failed.length} failed`,
      results
    };
  } catch (error) {
    console.error('Error during migration:', error);
    return { success: false, message: `Migration error: ${error.message}`, error };
  }
}

// Run the migration
migrateDepotsToSupabase().then(result => {
  console.log('Migration result:', result);
  
  // Display result on the page
  const resultElement = document.createElement('div');
  resultElement.style.position = 'fixed';
  resultElement.style.top = '20px';
  resultElement.style.right = '20px';
  resultElement.style.padding = '20px';
  resultElement.style.backgroundColor = result.success ? '#d4edda' : '#f8d7da';
  resultElement.style.color = result.success ? '#155724' : '#721c24';
  resultElement.style.borderRadius = '5px';
  resultElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  resultElement.style.zIndex = '9999';
  
  resultElement.innerHTML = `
    <h3>Migration ${result.success ? 'Successful' : 'Completed with issues'}</h3>
    <p>${result.message}</p>
    <button id="close-migration-result" style="margin-top: 10px; padding: 5px 10px;">Close</button>
  `;
  
  document.body.appendChild(resultElement);
  
  document.getElementById('close-migration-result').addEventListener('click', () => {
    resultElement.remove();
  });
});

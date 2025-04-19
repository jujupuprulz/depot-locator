// Verification script for Supabase migration
// This script checks if all depot data has been properly migrated to Supabase

import { initSupabase, getMigrationStatus, migrateLocalStorageToSupabase, getLocalDepots } from './supabase-client.js';

// Function to verify migration
async function verifyMigration() {
  try {
    console.log('Starting migration verification...');

    // Initialize Supabase client
    await initSupabase();

    // Get migration status using the enhanced function
    const status = await getMigrationStatus();
    console.log('Migration status:', status);

    // Compare counts
    if (status.localCount === 0 && status.supabaseCount === 0) {
      return {
        success: true,
        message: 'No depots found in either localStorage or Supabase.',
        localCount: 0,
        supabaseCount: 0,
        missingInSupabase: [],
        details: 'No data to migrate.',
        percentComplete: 100
      };
    }

    // Return formatted results
    return {
      success: status.success,
      message: status.success
        ? 'All depots successfully migrated to Supabase!'
        : 'Some depots are missing in Supabase.',
      localCount: status.localCount,
      supabaseCount: status.supabaseCount,
      missingInSupabase: status.missingInSupabase,
      details: status.success
        ? `All ${status.localCount} depots from localStorage are present in Supabase.`
        : `${status.missingInSupabase.length} depots from localStorage are missing in Supabase.`,
      percentComplete: status.percentComplete
    };
  } catch (error) {
    console.error('Error verifying migration:', error);
    return {
      success: false,
      message: 'Error verifying migration',
      error: error.message,
      details: 'An error occurred while verifying the migration.',
      percentComplete: 0
    };
  }
}

// Function to run the migration with progress tracking
async function runMigration(onProgress) {
  try {
    console.log('Starting migration process...');

    // Initialize Supabase client
    await initSupabase();

    // Configure migration options
    const migrationOptions = {
      batchSize: 5,
      maxRetries: 3,
      retryDelay: 1000,
      validateData: true,
      onProgress: onProgress,
      conflictStrategy: 'update'
    };

    // Run the migration with enhanced options
    const result = await migrateLocalStorageToSupabase(migrationOptions);

    return {
      success: result.success,
      message: result.message,
      migrated: result.migrated.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
      details: result.message,
      complete: true
    };
  } catch (error) {
    console.error('Error running migration:', error);
    return {
      success: false,
      message: 'Error running migration',
      error: error.message,
      details: 'An error occurred during the migration process.',
      complete: false
    };
  }
}

// Function to display verification results with enhanced UI
function displayVerificationResults(results) {
  const statusElement = document.getElementById('status-message');
  if (!statusElement) return;

  statusElement.style.display = 'block';

  // Add progress bar if percentComplete is available
  const progressBar = results.percentComplete !== undefined
    ? `<div class="progress-container">
        <div class="progress-bar" style="width: ${results.percentComplete}%"></div>
        <div class="progress-text">${results.percentComplete}% Complete</div>
       </div>`
    : '';

  if (results.success) {
    statusElement.style.backgroundColor = '#d4edda';
    statusElement.style.borderLeftColor = '#28a745';
    statusElement.style.color = '#155724';
    statusElement.innerHTML = `
      <i class="fas fa-check-circle"></i> ${results.message}<br>
      <small>${results.details}</small>
      ${progressBar}
    `;
  } else {
    statusElement.style.backgroundColor = '#f8d7da';
    statusElement.style.borderLeftColor = '#dc3545';
    statusElement.style.color = '#721c24';
    statusElement.innerHTML = `
      <i class="fas fa-exclamation-circle"></i> ${results.message}<br>
      <small>${results.details}</small>
      ${results.error ? `<br><small>Error: ${results.error}</small>` : ''}
      ${progressBar}
    `;

    if (results.missingInSupabase && results.missingInSupabase.length > 0) {
      // Show missing depots with a limit to avoid overwhelming the UI
      const maxDisplayed = 5;
      const remaining = results.missingInSupabase.length > maxDisplayed ?
        results.missingInSupabase.length - maxDisplayed : 0;

      let missingList = '<br><small>Missing depots: ';
      results.missingInSupabase.slice(0, maxDisplayed).forEach((depot, index) => {
        missingList += `${depot.name} (ID: ${depot.id})`;
        if (index < Math.min(results.missingInSupabase.length, maxDisplayed) - 1) {
          missingList += ', ';
        }
      });

      if (remaining > 0) {
        missingList += ` and ${remaining} more...`;
      }

      missingList += '</small>';
      statusElement.innerHTML += missingList;

      // Add a button to run the migration if depots are missing
      statusElement.innerHTML += `
        <div class="action-buttons">
          <button id="run-migration-btn" class="action-button primary-button">
            <i class="fas fa-sync"></i> Migrate Missing Depots
          </button>
        </div>
      `;

      // Add event listener after the button is added to the DOM
      setTimeout(() => {
        const migrationButton = document.getElementById('run-migration-btn');
        if (migrationButton) {
          migrationButton.addEventListener('click', startMigration);
        }
      }, 0);
    }
  }

  // Don't auto-hide if there's an action button
  if (!results.missingInSupabase || results.missingInSupabase.length === 0) {
    // Hide after 10 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 10000);
  }
}

// Function to start the migration process with UI updates
async function startMigration() {
  const statusElement = document.getElementById('status-message');
  if (!statusElement) return;

  // Update UI to show migration in progress
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

  // Progress callback function
  const updateProgress = (progress) => {
    const progressBar = document.getElementById('migration-progress-bar');
    const progressText = document.getElementById('migration-progress-text');

    if (progressBar && progressText) {
      progressBar.style.width = `${progress.percentComplete}%`;
      progressText.textContent = `${progress.percentComplete}% Complete - ${progress.migrated} migrated, ${progress.skipped} skipped, ${progress.failed} failed`;
    }
  };

  // Run the migration
  const result = await runMigration(updateProgress);

  // Display the results
  displayVerificationResults(result);
}

// Export functions
export {
  verifyMigration,
  displayVerificationResults,
  runMigration,
  startMigration
};

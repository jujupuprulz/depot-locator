// Supabase client integration for Depot Locator
// This file handles all interactions with the Supabase database

// Supabase project URL and anon key (public)
const SUPABASE_URL = 'https://guqubcdsalglyqoqutee.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cXViY2RzYWxnbHlxb3F1dGVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTMwODI2ODQsImV4cCI6MjAyODY1ODY4NH0.Rl_GsVPQXJXaPYGbN_-QjEOYgQW1G_YJzQgdVe_wPSE';

// Initialize the Supabase client
let supabase = null;

// Initialize Supabase client
async function initSupabase() {
  if (!supabase) {
    try {
      // Dynamically import the Supabase JS client
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');

      // Create the client
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Supabase client initialized successfully');

      return supabase;
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
      throw error;
    }
  }
  return supabase;
}

// Load all depots from Supabase
async function loadDepotsFromSupabase() {
  try {
    const client = await initSupabase();

    const { data, error } = await client
      .from('depots')
      .select('*')
      .order('name');

    if (error) {
      throw error;
    }

    console.log('Loaded depots from Supabase:', data);
    return data || [];
  } catch (error) {
    console.error('Error loading depots from Supabase:', error);
    throw error;
  }
}

// Save a depot to Supabase (insert or update)
async function saveDepotToSupabase(depot) {
  try {
    const client = await initSupabase();

    // Ensure ID is a string
    depot.id = String(depot.id);

    // Check if depot exists
    const { data: existingDepot, error: checkError } = await client
      .from('depots')
      .select('id')
      .eq('id', depot.id)
      .maybeSingle();

    if (checkError) {
      throw checkError;
    }

    let result;

    if (existingDepot) {
      // Update existing depot
      const { data, error } = await client
        .from('depots')
        .update({
          name: depot.name,
          country: depot.country,
          address: depot.address,
          status: depot.status || 'approved',
          notes: depot.notes,
          lat: depot.lat,
          lng: depot.lng
        })
        .eq('id', depot.id)
        .select();

      if (error) {
        throw error;
      }

      result = data[0];
      console.log('Updated depot in Supabase:', result);
    } else {
      // Insert new depot
      const { data, error } = await client
        .from('depots')
        .insert({
          id: depot.id,
          name: depot.name,
          country: depot.country,
          address: depot.address,
          status: depot.status || 'approved',
          notes: depot.notes,
          lat: depot.lat,
          lng: depot.lng
        })
        .select();

      if (error) {
        throw error;
      }

      result = data[0];
      console.log('Inserted new depot in Supabase:', result);
    }

    return result;
  } catch (error) {
    console.error('Error saving depot to Supabase:', error);
    throw error;
  }
}

// Delete a depot from Supabase
async function deleteDepotFromSupabase(depotId) {
  try {
    const client = await initSupabase();

    const { error } = await client
      .from('depots')
      .delete()
      .eq('id', String(depotId));

    if (error) {
      throw error;
    }

    console.log(`Deleted depot with ID ${depotId} from Supabase`);
    return true;
  } catch (error) {
    console.error('Error deleting depot from Supabase:', error);
    throw error;
  }
}

// Find nearby depots within a certain radius (in miles)
async function findNearbyDepots(lat, lng, radiusMiles = 100) {
  try {
    const client = await initSupabase();

    // Convert miles to meters (1 mile = 1609.34 meters)
    const radiusMeters = radiusMiles * 1609.34;

    // Use PostgreSQL's earthdistance extension if available
    // Otherwise, fall back to a simpler calculation
    const { data, error } = await client.rpc('find_nearby_depots', {
      p_lat: lat,
      p_lng: lng,
      p_radius_miles: radiusMiles
    });

    if (error) {
      console.warn('RPC function not available, using fallback query');

      // Fallback to manual calculation
      // This is less efficient but works without the earthdistance extension
      const { data: fallbackData, error: fallbackError } = await client
        .from('depots')
        .select('*');

      if (fallbackError) {
        throw fallbackError;
      }

      // Calculate distances manually
      const nearbyDepots = fallbackData
        .map(depot => {
          // Simple distance calculation (not accurate for long distances)
          const latDiff = depot.lat - lat;
          const lngDiff = depot.lng - lng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 69.172; // Rough miles conversion

          return {
            ...depot,
            distance
          };
        })
        .filter(depot => depot.distance <= radiusMiles)
        .sort((a, b) => a.distance - b.distance);

      return nearbyDepots;
    }

    return data;
  } catch (error) {
    console.error('Error finding nearby depots:', error);
    throw error;
  }
}

// Migrate data from localStorage to Supabase with enhanced features
async function migrateLocalStorageToSupabase(options = {}) {
  try {
    // Default options
    const defaultOptions = {
      batchSize: 5,           // Number of depots to process in parallel
      maxRetries: 3,          // Maximum number of retry attempts for failed operations
      retryDelay: 1000,       // Delay between retries in milliseconds
      validateData: true,     // Whether to validate data before migration
      onProgress: null,       // Progress callback function
      conflictStrategy: 'update' // Strategy for handling conflicts: 'update', 'skip', or 'error'
    };

    // Merge default options with provided options
    const settings = { ...defaultOptions, ...options };

    // Get depots from localStorage
    const storedDepots = localStorage.getItem('depots');
    if (!storedDepots) {
      console.log('No depots found in localStorage to migrate');
      return { success: true, migrated: [], skipped: [], failed: [], message: 'No depots found to migrate' };
    }

    // Parse and validate depots
    let depots = JSON.parse(storedDepots);
    console.log(`Found ${depots.length} depots in localStorage for migration`);

    // Data validation if enabled
    if (settings.validateData) {
      const validationResults = validateDepots(depots);
      if (validationResults.invalid.length > 0) {
        console.warn(`Found ${validationResults.invalid.length} invalid depots that will be skipped`);
        depots = validationResults.valid;
      }
    }

    // Initialize tracking arrays
    const migratedDepots = [];
    const skippedDepots = [];
    const failedDepots = [];

    // Process depots in batches
    const totalDepots = depots.length;
    let processedCount = 0;

    // Process in batches
    for (let i = 0; i < depots.length; i += settings.batchSize) {
      const batch = depots.slice(i, i + settings.batchSize);

      // Report progress
      if (settings.onProgress) {
        settings.onProgress({
          total: totalDepots,
          processed: processedCount,
          migrated: migratedDepots.length,
          skipped: skippedDepots.length,
          failed: failedDepots.length,
          percentComplete: Math.round((processedCount / totalDepots) * 100)
        });
      }

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(depot => processSingleDepot(depot, settings))
      );

      // Process results
      batchResults.forEach(result => {
        if (result.success) {
          migratedDepots.push(result.depot);
        } else if (result.skipped) {
          skippedDepots.push({
            depot: result.depot,
            reason: result.reason
          });
        } else {
          failedDepots.push({
            depot: result.depot,
            error: result.error
          });
        }
      });

      processedCount += batch.length;
    }

    // Final progress update
    if (settings.onProgress) {
      settings.onProgress({
        total: totalDepots,
        processed: processedCount,
        migrated: migratedDepots.length,
        skipped: skippedDepots.length,
        failed: failedDepots.length,
        percentComplete: 100,
        complete: true
      });
    }

    // Generate summary message
    const summary = `Migration complete: ${migratedDepots.length} depots migrated, ${skippedDepots.length} skipped, ${failedDepots.length} failed`;
    console.log(summary);

    return {
      success: failedDepots.length === 0,
      migrated: migratedDepots,
      skipped: skippedDepots,
      failed: failedDepots,
      message: summary
    };
  } catch (error) {
    console.error('Error migrating depots to Supabase:', error);
    throw error;
  }
}

// Process a single depot with retry logic
async function processSingleDepot(depot, settings) {
  let retries = 0;

  while (retries <= settings.maxRetries) {
    try {
      // Check if depot already exists in Supabase
      const client = await initSupabase();
      const { data: existingDepot, error: checkError } = await client
        .from('depots')
        .select('id')
        .eq('id', String(depot.id))
        .maybeSingle();

      if (checkError) throw checkError;

      // Handle conflict based on strategy
      if (existingDepot) {
        if (settings.conflictStrategy === 'skip') {
          return { success: false, skipped: true, depot, reason: 'Depot already exists' };
        } else if (settings.conflictStrategy === 'error') {
          throw new Error(`Depot with ID ${depot.id} already exists`);
        }
        // Default is 'update' - continue with save
      }

      // Save depot to Supabase
      const savedDepot = await saveDepotToSupabase(depot);
      return { success: true, depot: savedDepot };
    } catch (error) {
      retries++;

      if (retries <= settings.maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, settings.retryDelay));
        console.log(`Retrying depot ${depot.id} (Attempt ${retries} of ${settings.maxRetries})`);
      } else {
        return { success: false, skipped: false, depot, error: error.message || 'Unknown error' };
      }
    }
  }
}

// Validate depots before migration
function validateDepots(depots) {
  const valid = [];
  const invalid = [];

  depots.forEach(depot => {
    // Check required fields
    if (!depot.id || !depot.name || typeof depot.lat !== 'number' || typeof depot.lng !== 'number') {
      invalid.push({
        depot,
        reason: 'Missing required fields (id, name, lat, lng)'
      });
      return;
    }

    // Ensure ID is a string
    depot.id = String(depot.id);

    // Ensure status is valid
    if (depot.status && !['approved', 'in-progress', 'not-approved'].includes(depot.status)) {
      depot.status = 'approved'; // Default to approved if invalid
    }

    // Add to valid depots
    valid.push(depot);
  });

  return { valid, invalid };
}

// Create a stored procedure for finding nearby depots
async function createNearbyDepotsProcedure() {
  try {
    const client = await initSupabase();

    // Create the stored procedure
    const { error } = await client.rpc('create_find_nearby_depots_function');

    if (error) {
      console.warn('Could not create stored procedure:', error);

      // Try to create it directly
      const { error: directError } = await client.query(`
        CREATE OR REPLACE FUNCTION find_nearby_depots(p_lat NUMERIC, p_lng NUMERIC, p_radius_miles NUMERIC)
        RETURNS SETOF depots AS $$
        BEGIN
          RETURN QUERY
          SELECT d.*
          FROM depots d
          WHERE (
            -- Convert miles to degrees (approximate)
            -- 1 degree of latitude is approximately 69.172 miles
            -- 1 degree of longitude varies, but at the equator it's also about 69.172 miles
            -- This is a simple approximation and not accurate for long distances
            (d.lat - p_lat)^2 + (d.lng - p_lng)^2 <= (p_radius_miles / 69.172)^2
          )
          ORDER BY ((d.lat - p_lat)^2 + (d.lng - p_lng)^2);
        END;
        $$ LANGUAGE plpgsql;
      `);

      if (directError) {
        console.error('Error creating stored procedure directly:', directError);
      } else {
        console.log('Created find_nearby_depots function directly');
      }
    } else {
      console.log('Created find_nearby_depots function via RPC');
    }
  } catch (error) {
    console.error('Error creating stored procedure:', error);
  }
}

// Get migration status
async function getMigrationStatus() {
  try {
    // Get counts from both sources
    const localDepots = getLocalDepots();
    const supabaseDepots = await loadDepotsFromSupabase();

    // Check if all local depots are in Supabase
    const missingInSupabase = [];

    for (const localDepot of localDepots) {
      const found = supabaseDepots.some(supabaseDepot =>
        String(supabaseDepot.id) === String(localDepot.id)
      );

      if (!found) {
        missingInSupabase.push({
          id: localDepot.id,
          name: localDepot.name
        });
      }
    }

    // Determine success
    const success = missingInSupabase.length === 0 && supabaseDepots.length >= localDepots.length;

    return {
      success,
      localCount: localDepots.length,
      supabaseCount: supabaseDepots.length,
      missingInSupabase,
      complete: success,
      percentComplete: localDepots.length > 0
        ? Math.round(((localDepots.length - missingInSupabase.length) / localDepots.length) * 100)
        : 100
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return {
      success: false,
      error: error.message,
      complete: false,
      percentComplete: 0
    };
  }
}

// Helper function to get depots from localStorage
function getLocalDepots() {
  try {
    const storedDepots = localStorage.getItem('depots');
    if (storedDepots) {
      return JSON.parse(storedDepots);
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }
  return [];
}

// Export functions
export {
  initSupabase,
  loadDepotsFromSupabase,
  saveDepotToSupabase,
  deleteDepotFromSupabase,
  findNearbyDepots,
  migrateLocalStorageToSupabase,
  createNearbyDepotsProcedure,
  getMigrationStatus,
  getLocalDepots,
  validateDepots
};

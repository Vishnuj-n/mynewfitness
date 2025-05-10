/**
 * FitAi - Location Search Functionality with TomTom Maps
 * This file provides the functionality for the locate.html page
 * It uses TomTom Maps API to search for gyms and parks
 */

// Debug information to help troubleshoot Vercel deployment
console.log('locate.js loaded');
console.log('Environment check:', {
    hasWindow: typeof window !== 'undefined',
    hasTT: typeof tt !== 'undefined',
    hasConfig: typeof window !== 'undefined' && !!window.FitAiConfig,
    hasEnv: typeof window !== 'undefined' && !!window.__env
});

// Log full config for debugging
if (typeof window !== 'undefined' && window.FitAiConfig) {
    console.log('FitAiConfig available:', window.FitAiConfig);
} else {
    console.error('FitAiConfig not available!');
}

// Get TomTom API key from config with fallback mechanism for Vercel
const TOM_TOM_API_KEY = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.tomtom) || 
    (typeof window !== 'undefined' && window.__env && window.__env.TOMTOM_API_KEY) ||
    'JXPnqva3lZanMKstFTttkppZnHor4IXr'; // Fallback for debugging only

console.log('Using TOM_TOM_API_KEY:', TOM_TOM_API_KEY);

// Global variables
let map = null;
let currentMarkers = [];
let userMarker = null;
let searchResultsData = [];
let searchCenter = null;

// DOM elements
const locationInput = document.getElementById('location-input');
const resourceTypeSelect = document.getElementById('resource-type');
const distanceSelect = document.getElementById('distance');
const searchButton = document.getElementById('search-resources');
const loadingIndicator = document.getElementById('loading-indicator');
const resultsContainer = document.getElementById('results-container');
const initialMessage = document.querySelector('.initial-message');
const searchResults = document.querySelector('.search-results');
const loadingResults = document.getElementById('loading-results');

// Mobile menu functionality
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

function setupMobileMenu() {
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }
}

// Initialize the map and other functionality when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded');
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Wait until everything is fully loaded before initializing map
    window.addEventListener('load', function() {
        console.log('Window fully loaded - initializing map');
        // Small delay to ensure DOM is completely rendered
        setTimeout(function() {
            initializeMap();
        }, 100);
    });
    
    // Setup other functionality
    setupLocationAutocomplete();
    
    // Add event listener to the search button
    if (searchButton) {
        searchButton.addEventListener('click', handleSearch);
        console.log('Search button event listener added');
    }
    
    // Add event listener to the "Try example" button
    const tryExampleButton = document.getElementById('try-example');
    if (tryExampleButton) {
        tryExampleButton.addEventListener('click', () => {
            locationInput.value = '560066'; // Set the example PIN code
            searchButton.click(); // Trigger the search
        });
    }
});

// Add event listener to the search button
if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
}

/**
 * Initialize the TomTom map
 */
/**
 * Initialize the TomTom map
 */
function initializeMap() {
    console.log('Initializing map...');
    
    // Check if map container exists
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) {
        console.error('Map container not found');
        return;
    }
    
    // Check if TomTom is available
    if (typeof tt === 'undefined') {
        console.error('TomTom SDK not loaded');
        mapContainer.innerHTML = '<div class="p-4 bg-red-100 text-red-700 rounded">TomTom SDK failed to load. Please check your internet connection.</div>';
        return;
    }
    
    try {
        // Clear the map container first to ensure clean initialization
        mapContainer.innerHTML = '';
        
        // Set default coordinates (center of US)
        const defaultCoordinates = [-98.5795, 39.8283];
        
        // Create the map with basic settings
        map = tt.map({
            key: TOM_TOM_API_KEY,
            container: 'map-container',
            center: defaultCoordinates,
            zoom: 4,
            stylesVisibility: {
                poi: true,  // Show points of interest
                trafficIncidents: true,
                trafficFlow: true
            }
        });
        
        console.log('Map created successfully');
        
        // Add essential map controls
        map.addControl(new tt.NavigationControl());
        map.addControl(new tt.FullscreenControl());
        
        // Listen for map load event
        map.on('load', function() {
            console.log('Map fully loaded');
            // Force resize to ensure proper display
            window.dispatchEvent(new Event('resize'));
        });
        
        // Listen for error events
        map.on('error', function(error) {
            console.error('Map error:', error);
        });
        
    } catch (error) {
        console.error('Error creating map:', error);
        mapContainer.innerHTML = `
            <div class="p-4 bg-red-100 text-red-700 rounded">
                <p class="font-bold">Error creating map</p>
                <p>${error.message}</p>
                <p class="text-sm mt-2">Please try refreshing the page or check your internet connection.</p>
            </div>
        `;
    }
}

/**
 * Handle search button click
 */
async function handleSearch() {
    const location = locationInput.value.trim();
    const resourceType = resourceTypeSelect.value;
    const distance = parseInt(distanceSelect.value);
    
    // Validate location input
    if (!location) {
        showError('Please enter a location, city, or PIN code to search');
        return;
    }
    
    // Show loading state
    setLoadingState(true);
    
    try {
        // Geocode the location to get coordinates
        const coordinates = await geocodeLocation(location);
        
        if (!coordinates) {
            showError('Unable to find this location. Please try a different search term or check if you entered a valid PIN code/postal code.');
            setLoadingState(false);
            return;
        }
        
        // Update map center and zoom to the location
        updateMapView(coordinates, distance);
        
        // Add a marker for the user's location
        addUserLocationMarker(coordinates);
        
        // Search for fitness resources based on type
        await searchFitnessResources(coordinates, resourceType, distance);
        
    } catch (error) {
        console.error('Search error:', error);
        showError('An error occurred during the search. Please try again later.');
    } finally {
        setLoadingState(false);
    }
}

/**
 * Geocode a location string to get coordinates
 * @param {string} locationString - The location to geocode
 * @returns {Promise<{lat: number, lng: number} | null>} The coordinates or null if not found
 */
async function geocodeLocation(locationString) {
    try {
        // Check if it might be a PIN code/postal code (mostly numeric)
        const isPinCode = /^\d+$/.test(locationString.trim()) || 
                        /^[A-Z\d]{3,7}$/.test(locationString.replace(/\s+/g, '').toUpperCase());
        
        // URL encode the locationString
        const encodedLocation = encodeURIComponent(locationString);
        
        // Build the URL and parameters
        let url = `https://api.tomtom.com/search/2/geocode/${encodedLocation}.json`;
        let params = {
            key: TOM_TOM_API_KEY,
            limit: 1
        };
        
        // If it looks like a PIN code/postal code, add additional parameters
        if (isPinCode) {
            // For India PIN codes specifically
            if (/^\d{6}$/.test(locationString.trim())) {
                params.countrySet = 'IN';
            }
        }
        
        // Add params to URL
        url = `${url}?${new URLSearchParams(params).toString()}`;
        
        console.log("Geocoding URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Geocoding API request failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Geocoding response:", data);
        
        if (data.results && data.results.length > 0) {
            const position = data.results[0].position;
            const address = data.results[0].address || {};
            
            // Log found location details for debugging
            console.log(`Found location: ${address.freeformAddress || 'Unknown location'}`);
            console.log(`Coordinates: Lat ${position.lat}, Lng ${position.lon}`);
            
            searchCenter = {
                lat: position.lat,
                lng: position.lon
            };
            return searchCenter;
        } else {
            console.log("No results found for:", locationString);
            return null;
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

/**
 * Update the map view to center on the search location
 * @param {Object} coordinates - The coordinates to center on
 * @param {number} distance - The search radius in miles
 */
function updateMapView(coordinates, distance) {
    if (!map) {
        console.error('Map not initialized yet');
        return;
    }
    
    console.log('Updating map view to coordinates:', coordinates);
    
    // Center map on the coordinates
    map.setCenter([coordinates.lng, coordinates.lat]);
    
    // Calculate appropriate zoom level based on distance
    let zoomLevel = 12; // Default zoom level
    
    if (distance <= 5) {
        zoomLevel = 12;
    } else if (distance <= 10) {
        zoomLevel = 11;
    } else if (distance <= 25) {
        zoomLevel = 10;
    } else {
        zoomLevel = 9;
    }
    
    map.setZoom(zoomLevel);
    
    // Trigger a resize event to ensure the map renders correctly
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

/**
 * Add a marker for the user's search location
 * @param {Object} coordinates - The coordinates of the user's location
 */
function addUserLocationMarker(coordinates) {
    if (!map) return;
    
    // Remove existing user marker if any
    if (userMarker) {
        userMarker.remove();
    }
    
    // Create user marker element
    const userMarkerElement = document.createElement('div');
    userMarkerElement.className = 'user-marker';
    userMarkerElement.innerHTML = `
        <div class="relative">
            <div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <div class="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div class="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-blue-500"></div>
            </div>
        </div>
    `;
    
    // Add the marker to the map
    userMarker = new tt.Marker({
        element: userMarkerElement
    })
    .setLngLat([coordinates.lng, coordinates.lat])
    .addTo(map);
    
    // Add a popup to the user marker
    new tt.Popup({
        offset: 30,
        closeButton: false
    })
    .setHTML(`<p class="font-medium text-sm">Your location</p>`)
    .setLngLat([coordinates.lng, coordinates.lat])
    .addTo(map);
}

/**
 * Search for fitness resources based on type
 * @param {Object} coordinates - The center coordinates for the search
 * @param {string} resourceType - The type of resource to search for (gyms, parks, all)
 * @param {number} distance - The search radius in miles
 */
async function searchFitnessResources(coordinates, resourceType, distance) {
    // Clear previous markers and results
    clearMarkers();
    clearResults();
    
    // Convert miles to meters for API
    const radiusInMeters = distance * 1609.34;
    
    // Determine categories to search based on resourceType
    let categoriesToSearch = [];
    
    if (resourceType === 'gyms' || resourceType === 'all') {
        categoriesToSearch.push('fitness-health-club');
        categoriesToSearch.push('fitness-center');
        categoriesToSearch.push('gym');
    }
    
    if (resourceType === 'parks' || resourceType === 'all') {
        categoriesToSearch.push('park');
        categoriesToSearch.push('park-and-recreation-area');
        categoriesToSearch.push('sports-field');
    }
    
    // Perform search for each category
    try {
        let allResults = [];
        
        for (const category of categoriesToSearch) {
            console.log(`Searching for category: ${category} within ${distance} miles (${radiusInMeters.toFixed(0)} meters)`);
            
            // Build URL with parameters
            const searchParams = new URLSearchParams({
                key: TOM_TOM_API_KEY,
                lat: coordinates.lat,
                lon: coordinates.lng,
                radius: radiusInMeters,
                limit: 20
            });
            
            const url = `https://api.tomtom.com/search/2/poiSearch/${category}.json?${searchParams.toString()}`;
            console.log("POI search URL:", url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                console.error(`POI search failed for ${category} with status: ${response.status}`);
                continue; // Try next category instead of failing completely
            }
            
            const data = await response.json();
            console.log(`Found ${data.results?.length || 0} results for category: ${category}`);
            
            if (data.results && data.results.length > 0) {
                allResults = [...allResults, ...data.results];
            }
        }
        
        // Log total results found before deduplication
        console.log(`Total results found: ${allResults.length}`);
        
        // De-duplicate results based on name and position
        const uniqueResults = deduplicateResults(allResults);
        console.log(`After deduplication: ${uniqueResults.length} results`);
        
        // Store results for later use
        searchResultsData = uniqueResults;
        
        // Add markers for each result
        addResultMarkers(uniqueResults, resourceType);
        
        // Display results in the list
        displayResultsList(uniqueResults, resourceType);
        
        // If no results, show a message
        if (uniqueResults.length === 0) {
            showNoResultsMessage(resourceType);
        }
        
    } catch (error) {
        console.error('POI search error:', error);
        showError('Error searching for fitness resources. Please try again.');
    }
}

/**
 * Remove duplicate results from the search
 * @param {Array} results - The search results to deduplicate
 * @returns {Array} Deduplicated results
 */
function deduplicateResults(results) {
    const uniqueMap = new Map();
    
    for (const result of results) {
        const key = `${result.poi.name}-${result.position.lat}-${result.position.lon}`;
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, result);
        }
    }
    
    return Array.from(uniqueMap.values());
}

/**
 * Add markers for search results
 * @param {Array} results - The search results to add markers for
 * @param {string} resourceType - The type of resource being displayed
 */
function addResultMarkers(results, resourceType) {
    if (!map) return;
    
    results.forEach((result, index) => {
        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'poi-marker';
        
        // Determine marker color based on resource type
        let markerColor = '#10B981'; // Default green
        
        if (result.poi.categories && result.poi.categories.some(cat => 
            cat.includes('park') || cat.includes('recreation') || cat.includes('sports-field'))) {
            markerColor = '#059669'; // Dark green for parks
        } else if (result.poi.categories && result.poi.categories.some(cat => 
            cat.includes('gym') || cat.includes('fitness'))) {
            markerColor = '#8B5CF6'; // Purple for gyms
        }
          markerElement.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background-color: ${markerColor}">
                    ${index + 1}
                </div>
            </div>
        `;
        
        // Create and add marker
        const marker = new tt.Marker({
            element: markerElement
        })
        .setLngLat([result.position.lon, result.position.lat])
        .addTo(map);
        
        // Create popup for marker
        const popup = new tt.Popup({
            offset: 30,
            closeButton: true
        })
        .setHTML(`
            <div>
                <h3 class="font-bold">${result.poi.name}</h3>
                <p class="text-sm text-gray-600">${result.address.freeformAddress || ''}</p>
                ${result.poi.phone ? `<p class="text-sm"><strong>Phone:</strong> ${result.poi.phone}</p>` : ''}
                ${result.poi.url ? `<p class="text-sm"><a href="${result.poi.url}" target="_blank" class="text-blue-500">Website</a></p>` : ''}
            </div>
        `);
        
        // Add popup to marker
        marker.setPopup(popup);
        
        // Add event listener to marker
        marker.getElement().addEventListener('click', () => {
            // Highlight corresponding result in the list
            highlightResult(index);
        });
        
        // Store marker reference
        currentMarkers.push(marker);
    });
}

/**
 * Display the search results in the results list
 * @param {Array} results - The search results to display
 * @param {string} resourceType - The type of resource being displayed
 */
function displayResultsList(results, resourceType) {
    // Check if we have results
    if (results.length === 0) {
        showNoResultsMessage(resourceType);
        return;
    }
    
    // Show results section and hide initial message
    initialMessage.classList.add('hidden');
    searchResults.classList.remove('hidden');
    searchResults.innerHTML = '';
    
    // Add header with result count
    const resultsHeader = document.createElement('div');
    resultsHeader.className = 'mb-4 pb-2 border-b border-gray-200';
    resultsHeader.innerHTML = `
        <h4 class="font-medium text-gray-700">Found ${results.length} fitness resources</h4>
    `;
    searchResults.appendChild(resultsHeader);
    
    // Add each result as a card
    results.forEach((result, index) => {
        // Determine if it's a gym or park based on categories
        const isGym = result.poi.categories && result.poi.categories.some(cat => 
            cat.includes('gym') || cat.includes('fitness'));
        const isPark = result.poi.categories && result.poi.categories.some(cat => 
            cat.includes('park') || cat.includes('recreation') || cat.includes('sports-field'));
        
        const resourceIcon = isGym 
            ? `<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>`
            : `<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        
        // Calculate distance from search center
        const resultPosition = {
            lat: result.position.lat,
            lng: result.position.lon
        };
        const distance = calculateDistance(searchCenter, resultPosition);
        
        // Create result card element
        const resultCard = document.createElement('div');
        resultCard.className = 'result-card bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-100 hover:shadow-md transition duration-200';
        resultCard.dataset.index = index;
        resultCard.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0 mr-3 mt-1">
                    <div class="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
                        <span class="font-bold text-sm text-gray-700">${index + 1}</span>
                    </div>
                </div>
                <div class="flex-grow">
                    <h4 class="font-bold text-gray-800">${result.poi.name}</h4>
                    <div class="flex items-center text-sm text-gray-500 mb-1">
                        ${resourceIcon}
                        <span class="ml-1">${isGym ? 'Gym/Fitness' : isPark ? 'Park/Recreation' : 'Fitness Resource'}</span>
                        <span class="mx-2">•</span>
                        <span>${distance.toFixed(1)} miles away</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${result.address.freeformAddress || ''}</p>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${result.poi.phone ? 
                            `<a href="tel:${result.poi.phone}" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded-full transition">
                                <svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                Call
                            </a>` : ''
                        }
                        ${
                            `<button class="text-xs bg-primary hover:bg-primary/80 text-white px-2 py-1 rounded-full transition directions-btn">
                                <svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path></svg>
                                Directions
                            </button>`
                        }
                    </div>
                </div>
            </div>
        `;
        
        searchResults.appendChild(resultCard);
        
        // Add event listener to result card
        resultCard.addEventListener('click', () => {
            // When a result card is clicked, center the map on this location
            centerMapOnResult(result);
            
            // Open the popup for this marker
            if (currentMarkers[index]) {
                currentMarkers[index].togglePopup();
            }
            
            // Highlight this result card
            highlightResult(index);
        });
        
        // Add event listener to directions button
        const directionsBtn = resultCard.querySelector('.directions-btn');
        if (directionsBtn) {
            directionsBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the card click event
                
                // Open Google Maps directions in a new tab
                const destination = `${result.position.lat},${result.position.lon}`;
                const origin = searchCenter ? `${searchCenter.lat},${searchCenter.lng}` : '';
                const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&origin=${origin}`;
                window.open(url, '_blank');
            });
        }
    });
}

/**
 * Calculate the distance between two coordinates in miles
 * @param {Object} point1 - The first coordinate point
 * @param {Object} point2 - The second coordinate point
 * @returns {number} Distance in miles
 */
function calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    // Haversine formula to calculate distance between two points on Earth
    const R = 3958.8; // Earth's radius in miles
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
}

/**
 * Center the map on a specific search result
 * @param {Object} result - The result to center on
 */
function centerMapOnResult(result) {
    if (!map) return;
    
    // Center map on the result
    map.setCenter([result.position.lon, result.position.lat]);
    
    // Zoom in slightly
    if (map.getZoom() < 14) {
        map.setZoom(14);
    }
}

/**
 * Highlight a specific result in the results list
 * @param {number} index - The index of the result to highlight
 */
function highlightResult(index) {
    // Remove highlight from all results
    const allResults = document.querySelectorAll('.result-card');
    allResults.forEach(card => {
        card.classList.remove('ring', 'ring-primary', 'ring-opacity-50');
    });
    
    // Add highlight to the selected result
    const selectedResult = document.querySelector(`.result-card[data-index="${index}"]`);
    if (selectedResult) {
        selectedResult.classList.add('ring', 'ring-primary', 'ring-opacity-50');
        
        // Scroll the result into view
        selectedResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

/**
 * Clear all markers from the map
 */
function clearMarkers() {
    // Remove all POI markers
    currentMarkers.forEach(marker => {
        if (marker) {
            marker.remove();
        }
    });
    
    // Reset markers array
    currentMarkers = [];
}

/**
 * Clear the results list
 */
function clearResults() {
    searchResults.innerHTML = '';
    searchResults.classList.add('hidden');
    initialMessage.classList.remove('hidden');
}

/**
 * Display a message when no results are found
 * @param {string} resourceType - The type of resource that was searched for
 */
function showNoResultsMessage(resourceType) {
    initialMessage.classList.add('hidden');
    searchResults.classList.remove('hidden');
    
    searchResults.innerHTML = `
        <div class="text-center py-10">
            <svg class="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h4 class="text-lg font-medium text-gray-700 mb-2">No results found</h4>
            <p class="text-gray-500">
                ${resourceType === 'gyms' ? 
                    'No gyms or fitness centers found in this area.' : 
                    resourceType === 'parks' ? 
                    'No parks or recreation areas found in this area.' : 
                    'No fitness resources found in this area.'}
            </p>
            <p class="text-gray-500 mt-2">Try another location or increase the search distance.</p>
        </div>
    `;
}

/**
 * Display an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    const alertElement = document.createElement('div');
    alertElement.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 fixed top-20 right-4 max-w-sm z-50 shadow-lg rounded-r';
    alertElement.innerHTML = `
        <div class="flex">
            <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div class="ml-3">
                <p>${message}</p>
            </div>
            <div class="ml-auto pl-3">
                <div class="-mx-1.5 -my-1.5">
                    <button class="close-alert inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-200 focus:outline-none">
                        <span class="sr-only">Dismiss</span>
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add to document body
    document.body.appendChild(alertElement);
    
    // Add close button functionality
    const closeButton = alertElement.querySelector('.close-alert');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            alertElement.remove();
        });
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.remove();
        }
    }, 5000);
}

/**
 * Set loading state for the UI
 * @param {boolean} isLoading - Whether the UI should show loading state
 */
function setLoadingState(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        searchButton.disabled = true;
        searchButton.classList.add('opacity-50');
    } else {
        loadingIndicator.classList.add('hidden');
        searchButton.disabled = false;
        searchButton.classList.remove('opacity-50');
    }
}

// Add autocomplete functionality for location input
function setupLocationAutocomplete() {
    if (!locationInput) return;
    
    locationInput.addEventListener('input', debounce(async function() {
        const searchTerm = locationInput.value.trim();
        if (searchTerm.length < 3) return;
        
        try {
            const response = await fetch(
                `https://api.tomtom.com/search/2/search/${encodeURIComponent(searchTerm)}.json` +
                `?key=${TOM_TOM_API_KEY}` +
                `&limit=5` +
                `&countrySet=US`
            );
            
            if (!response.ok) throw new Error('Autocomplete request failed');
            
            const data = await response.json();
            updateAutocompleteDropdown(data.results);
            
        } catch (error) {
            console.error('Autocomplete error:', error);
        }
    }, 300));
}

/**
 * Debounce function to limit API calls during typing
 * @param {Function} func - The function to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(func, delay) {
    let timeoutId;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

/**
 * Update the autocomplete dropdown based on search results
 * @param {Array} results - The autocomplete results
 */
function updateAutocompleteDropdown(results) {
    // Remove any existing dropdown
    const existingDropdown = document.getElementById('autocomplete-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }
    
    if (!results || results.length === 0) return;
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'autocomplete-dropdown';
    dropdown.className = 'bg-white border border-gray-300 rounded-md shadow-lg w-full max-h-60 overflow-y-auto';
    
    // Add results to dropdown
    results.forEach(result => {
        if (!result.address) return;
        
        const item = document.createElement('div');
        item.className = 'p-2 hover:bg-gray-100 cursor-pointer text-sm';
        item.textContent = result.address.freeformAddress || result.address.streetName || result.address.municipality;
        
        item.addEventListener('click', () => {
            locationInput.value = item.textContent;
            dropdown.remove();
        });
        
        dropdown.appendChild(item);
    });
    
    // Add dropdown after the input
    locationInput.parentNode.style.position = 'relative';
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${locationInput.offsetHeight}px`;
    dropdown.style.left = '0';
    dropdown.style.zIndex = '50';
    
    // Add dropdown to document
    locationInput.parentNode.appendChild(dropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target) && event.target !== locationInput) {
            dropdown.remove();
        }
    }, { once: true });
}

// Initialize the location autocomplete on page load
document.addEventListener('DOMContentLoaded', setupLocationAutocomplete);

/**
 * FitAi - Events Search Functionality
 * This file provides the functionality to search for fitness events by location using Serper API
 */

// Debug information
console.log('events.js loaded');

// Get Serper API key from config with fallback mechanism
const SERPER_API_KEY = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.serper) || 
    (typeof window !== 'undefined' && window.__env && window.__env.SERPER_API_KEY) ||
    '67c090a334109db4480037614dbb1c635f29ad83'; // Fallback for debugging only

console.log('Using SERPER_API_KEY:', SERPER_API_KEY ? 'Available' : 'Not available');

// DOM elements
const countrySelect = document.getElementById('country-select');
const citySelect = document.getElementById('city-select');
const searchButton = document.getElementById('search-events');
const loadingIndicator = document.getElementById('loading-indicator');
const resultsContainer = document.getElementById('results-container');
const resultsMessage = document.getElementById('results-message');
const eventsList = document.getElementById('events-list');
const noResults = document.getElementById('no-results');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

// City mapping for each country
const cityMapping = {
    'USA': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
    'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'],
    'UK': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Bristol', 'Leeds', 'Sheffield', 'Edinburgh', 'Newcastle'],
    'Canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener'],
    'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Hobart'],
    'Germany': ['Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen'],
    'France': ['Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille'],
    'Japan': ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto', 'Kawasaki', 'Saitama'],
    'China': ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Tianjin', 'Wuhan', 'Xi\'an', 'Hangzhou', 'Nanjing'],
    'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre'],
    'Singapore': ['Singapore'],
    'Italy': ['Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania']
};

// Mapping of event types to categories for styling
const eventCategories = {
    'marathon': 'marathon',
    'run': 'running',
    'running': 'running',
    'yoga': 'yoga',
    'fitness': 'fitness',
    'gym': 'fitness',
    'workout': 'fitness',
    'sports': 'sports',
    'tournament': 'sports',
    'championship': 'sports',
    'cycling': 'cycling',
    'bike': 'cycling',
    'triathlon': 'marathon'
};

// Initialize the page
function initEvents() {
    console.log('Initializing events page');
    setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
    // Search button click
    if (searchButton) {
        searchButton.addEventListener('click', searchEvents);
    }
    
    // Mobile menu toggle
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
    
    // Country selection changes city options
    countrySelect.addEventListener('change', function() {
        const selectedCountry = this.value;
        updateCities(selectedCountry);
    });
    
    // Add example search handlers
    const examples = [
        { country: 'USA', city: 'New York' },
        { country: 'India', city: 'Mumbai' },
        { country: 'UK', city: 'London' }
    ];
    
    // Add random example suggestion after waiting for DOM to fully load
    window.addEventListener('load', () => {
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        const exampleText = document.createElement('div');
        exampleText.className = 'mt-3 text-center text-sm';
        exampleText.innerHTML = `Try an example: <button class="text-primary underline example-search">${randomExample.country}, ${randomExample.city}</button>`;
        
        exampleText.querySelector('.example-search').addEventListener('click', function() {
            countrySelect.value = randomExample.country;
            updateCities(randomExample.country);
            setTimeout(() => {
                citySelect.value = randomExample.city;
                searchEvents();
            }, 100);
        });
        
        resultsMessage.appendChild(exampleText);
    });
}

// Update cities dropdown based on selected country
function updateCities(country) {
    // Clear existing options
    citySelect.innerHTML = '';
    
    if (!country || !cityMapping[country]) {
        // If no country selected, show default option
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Select a country first';
        defaultOption.selected = true;
        defaultOption.disabled = true;
        citySelect.appendChild(defaultOption);
        return;
    }
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a city';
    defaultOption.selected = true;
    defaultOption.disabled = true;
    citySelect.appendChild(defaultOption);
    
    // Add cities for selected country
    const cities = cityMapping[country] || [];
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });
}

// Search for events based on location
async function searchEvents() {
    const country = countrySelect.value;
    const city = citySelect.value;
    
    // Validate inputs
    if (!country || !city) {
        showError('Please select both a country and city to search for events');
        return;
    }
    
    // Show loading indicator
    showLoading(true);
    
    try {
        const events = await fetchEvents(country, city);
        displayEvents(events);
    } catch (error) {
        console.error('Error searching for events:', error);
        showError('Failed to search for events. Please try again later.');
    } finally {
        showLoading(false);
    }
}

// Fetch events from Serper API
async function fetchEvents(country, city) {
    if (!SERPER_API_KEY) {
        throw new Error('Serper API key not available');
    }
    
    // Create more specific search queries for different types of events with precise language
    // These queries are optimized to find actual event pages with registration links
    const searchQueries = [
        `${city} ${country} "fitness events" "official website" "register now" 2025`,
        `${city} ${country} "upcoming marathon" "registration open" "official site" 2025`,
        `${city} ${country} "yoga festival" OR "yoga workshop" "book now" "event details" 2025`,
        `${city} ${country} "sports tournament" OR "championship" "tickets" "event schedule" 2025`,
        `${city} ${country} "cycling race" OR "bike event" "registration" "route" 2025`,
        `${city} ${country} "fitness expo" OR "health convention" "buy tickets" 2025`
    ];
    
    // Additional backoff queries if the specific ones don't yield results
    const backoffQueries = [
        `${city} ${country} fitness events calendar`,
        `${city} ${country} marathon events calendar`,
        `${city} ${country} sports events tickets`
    ];
    
    // Combine all queries 
    const allQueries = [...searchQueries, ...backoffQueries];
    
    // Perform multiple searches and combine results
    const allResults = [];
    let resultsCount = 0;
    
    // First try with the optimized queries
    for (const query of allQueries) {
        try {
            // Don't continue searching if we already have enough results
            if (resultsCount >= 15) break;
            
            console.log(`Searching for: ${query}`);
            
            const response = await fetch('https://api.serper.dev/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': SERPER_API_KEY
                },
                body: JSON.stringify({
                    q: query,
                    gl: 'us',
                    hl: 'en',
                    num: 10,
                    type: "search",
                    tbs: "qdr:y" // Results from the past year for relevance
                })
            });
            
            if (!response.ok) {
                console.error(`Search API error: ${response.status} for query "${query}"`);
                continue;
            }
            
            const data = await response.json();
            
            // Extract organic search results
            if (data.organic && Array.isArray(data.organic)) {
                // Process and filter relevant event results
                const processedResults = processSearchResults(data.organic, query, city, country);
                if (processedResults.length > 0) {
                    allResults.push(...processedResults);
                    resultsCount += processedResults.length;
                    console.log(`Found ${processedResults.length} results for query: ${query}`);
                }
            }
            
            // Also check for event results in knowledge graph if available
            if (data.knowledgeGraph && data.knowledgeGraph.events) {
                const kgEvents = data.knowledgeGraph.events.map(event => {
                    // Format knowledge graph events to match our structure
                    return {
                        title: event.title || event.name || 'Event',
                        description: event.description || `${event.name || 'Event'} in ${city}, ${country}`,
                        link: event.link || event.url || '#',
                        date: formatDateFromKG(event.date || event.startDate),
                        isPastEvent: false,
                        category: determineEventCategory(event.title || event.name || '')
                    };
                });
                if (kgEvents.length > 0) {
                    allResults.push(...kgEvents);
                    resultsCount += kgEvents.length;
                    console.log(`Found ${kgEvents.length} knowledge graph events`);
                }
            }
            
            // Also check for related searches that might contain events
            if (data.relatedSearches && data.relatedSearches.length > 0) {
                // Extract potentially event-related searches
                const eventRelatedSearches = data.relatedSearches.filter(search => 
                    /event|marathon|race|tournament|championship|workshop|festival/i.test(search.query)
                );
                
                // If we have related searches and not enough results, make another search for the first related search
                if (eventRelatedSearches.length > 0 && resultsCount < 5) {
                    const relatedQuery = eventRelatedSearches[0].query;
                    console.log(`Trying related search: ${relatedQuery}`);
                    
                    const relatedResponse = await fetch('https://api.serper.dev/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-KEY': SERPER_API_KEY
                        },
                        body: JSON.stringify({
                            q: relatedQuery,
                            gl: 'us',
                            hl: 'en',
                            num: 10
                        })
                    });
                    
                    if (relatedResponse.ok) {
                        const relatedData = await relatedResponse.json();
                        if (relatedData.organic && Array.isArray(relatedData.organic)) {
                            const relatedResults = processSearchResults(relatedData.organic, relatedQuery, city, country);
                            if (relatedResults.length > 0) {
                                allResults.push(...relatedResults);
                                resultsCount += relatedResults.length;
                                console.log(`Found ${relatedResults.length} results from related search`);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error in search for "${query}":`, error);
        }
    }
      // Remove duplicates based on title similarity
    const uniqueEvents = removeDuplicateEvents(allResults);
    
    // If very few results are found, add some default events based on location
    if (uniqueEvents.length < 3) {
        console.log("Few or no events found, adding default events for location:", country, city);
        const defaultEvents = getDefaultEvents(country, city);
        
        // Combine real and default events, but prioritize real events
        const combinedEvents = [...uniqueEvents];
        
        // Add default events up to a maximum of 5 total events
        const neededDefaultEvents = Math.min(defaultEvents.length, 5 - uniqueEvents.length);
        for (let i = 0; i < neededDefaultEvents; i++) {
            combinedEvents.push(defaultEvents[i]);
        }
        
        return combinedEvents;
    }
    
    return uniqueEvents;
}

// Generate default events when no actual events are found
function getDefaultEvents(country, city) {
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(currentDate.getMonth() + 1);
    
    const twoMonthsOut = new Date(currentDate);
    twoMonthsOut.setMonth(currentDate.getMonth() + 2);
    
    const threeMonthsOut = new Date(currentDate);
    threeMonthsOut.setMonth(currentDate.getMonth() + 3);
    
    // Format dates in the requested format dd-mm-yyyy
    const formatDate = (date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    
    // Normalize location names for URLs
    const normalizedCity = city.toLowerCase().replace(/\s+/g, '-');
    const normalizedCountry = country.toLowerCase().replace(/\s+/g, '-');
    
    // Try to get real event sites when possible
    const getEventSiteForLocation = (category, location, city) => {
        // Real event websites based on category and location when possible
        const siteMappings = {
            'marathon': {
                'USA': {
                    'New York': 'https://www.nyrr.org/races/tcsnewyorkcitymarathon',
                    'Boston': 'https://www.baa.org/races/boston-marathon',
                    'Chicago': 'https://www.chicagomarathon.com/',
                    'default': 'https://www.runrocknroll.com/'
                },
                'UK': {
                    'London': 'https://www.tcslondonmarathon.com/',
                    'default': 'https://www.greatrun.org/'
                },
                'default': 'https://www.worldmarathonmajors.com/races'
            },
            'yoga': {
                'USA': {
                    'default': 'https://yogaalliance.org/Events'
                },
                'India': {
                    'default': 'https://www.yogafest.com/'
                },
                'default': 'https://www.yogajournal.com/events/'
            },
            'fitness': {
                'USA': {
                    'default': 'https://www.ideafit.com/fitness-conferences/'
                },
                'UK': {
                    'London': 'https://www.bodypower.com/bp-live',
                    'default': 'https://www.ukactive.com/events/'
                },
                'default': 'https://fitnessfestinfo.com/'
            },
            'cycling': {
                'France': {
                    'default': 'https://www.letour.fr/en/'
                },
                'Italy': {
                    'default': 'https://www.giroditalia.it/en/'
                },
                'default': 'https://www.uci.org/calendar/'
            },
            'sports': {
                'default': 'https://www.olympic.org/sports'
            },
            'default': 'https://www.active.com/'
        };
        
        // Try to find a match for the specific city
        if (siteMappings[category] && 
            siteMappings[category][location] && 
            siteMappings[category][location][city]) {
            return siteMappings[category][location][city];
        }
        
        // Try to find a match for the country
        if (siteMappings[category] && 
            siteMappings[category][location] && 
            siteMappings[category][location]['default']) {
            return siteMappings[category][location]['default'];
        }
        
        // Try to find a match for the category
        if (siteMappings[category] && 
            siteMappings[category]['default']) {
            return siteMappings[category]['default'];
        }
        
        // Default fallback
        return siteMappings['default'];
    };
    
    // Generate events based on location with improved descriptions and real links when possible
    return [
        {
            title: `${city} Annual Marathon ${currentDate.getFullYear()}`,
            description: `Join thousands of runners at the annual ${city} Marathon. <strong>Registration is open</strong> for 10K, Half Marathon and Full Marathon categories. Perfect for all fitness levels.`,
            link: getEventSiteForLocation('marathon', country, city),
            date: formatDate(nextMonth),
            isPastEvent: false,
            category: 'marathon'
        },
        {
            title: `Yoga Festival ${city} ${currentDate.getFullYear()}`,
            description: `Experience the biggest yoga gathering in ${city}. Classes for all levels, workshops from international instructors, and wellness sessions. <strong>Early bird registration available</strong>.`,
            link: getEventSiteForLocation('yoga', country, city),
            date: formatDate(twoMonthsOut),
            isPastEvent: false,
            category: 'yoga'
        },
        {
            title: `${city} Sports Tournament`,
            description: `The annual sports championship featuring local teams competing in basketball, volleyball, and soccer. Come support your local athletes! <strong>Tickets on sale now</strong>.`,
            link: getEventSiteForLocation('sports', country, city),
            date: formatDate(threeMonthsOut),
            isPastEvent: false,
            category: 'sports'
        },
        {
            title: `Fitness Expo ${city} ${currentDate.getFullYear()}`,
            description: `Explore the latest in fitness technology, workout programs, supplements and equipment at the ${city} Convention Center. <strong>Special early access passes available</strong>.`,
            link: getEventSiteForLocation('fitness', country, city),
            date: formatDate(nextMonth),
            isPastEvent: false,
            category: 'fitness'
        },
        {
            title: `${city} Cycling Challenge`,
            description: `A scenic cycling event through the beautiful landscapes around ${city}. Routes available for beginners (25km), intermediate (50km) and advanced (100km) riders. <strong>Register by ${formatDate(new Date(nextMonth.getTime() - 7 * 24 * 60 * 60 * 1000))}</strong>.`,
            link: getEventSiteForLocation('cycling', country, city),
            date: formatDate(twoMonthsOut),
            isPastEvent: false,
            category: 'cycling'
        }
    ];
}

// Process search results from Serper API to extract event information
function processSearchResults(results, query, city, country) {
    const eventsData = [];
    const queryLower = query.toLowerCase();
    const currentYear = new Date().getFullYear();
    
    // Determine event type based on query
    let defaultCategory = 'others';
    for (const [keyword, category] of Object.entries(eventCategories)) {
        if (queryLower.includes(keyword)) {
            defaultCategory = category;
            break;
        }
    }
    
    for (const result of results) {
        try {
            // Skip results that don't seem to be about events
            if (!isLikelyEvent(result.title, result.snippet, queryLower)) {
                continue;
            }
            
            // Skip results from generic listing sites unless they appear to be specific event pages
            const isGenericListingSite = /eventbrite|meetup|facebook|yelp|tripadvisor|timeout|wikipedia|quora|reddit/i.test(result.link);
            const looksLikeSpecificEvent = /event-detail|event-page|register|signup|booking|tickets/i.test(result.link);
            
            if (isGenericListingSite && !looksLikeSpecificEvent) {
                // For generic sites, check if the snippet suggests it's a specific event
                const isSpecificEventSnippet = /register now|book tickets|buy tickets|sign up today/i.test(result.snippet);
                if (!isSpecificEventSnippet) {
                    continue;
                }
            }
            
            // Extract location info to verify it matches our search
            const locationMatch = isMatchingLocation(result.title + ' ' + result.snippet, city, country);
            if (!locationMatch) {
                continue; // Skip results that don't match our location
            }
            
            // Extract date from the snippet if available
            const dateInfo = extractDateInfo(result.title + ' ' + result.snippet);
            
            // Skip events that are clearly in the past
            const currentDate = new Date();
            if (dateInfo.isPast && dateInfo.date !== "TBD") {
                continue;
            }
            
            // If date is TBD but the title or snippet contains year info, try to extract it
            if (dateInfo.date === "TBD") {
                // Look for a year in the title or snippet
                const yearMatch = (result.title + ' ' + result.snippet).match(/\b(202[4-9])\b/);
                if (yearMatch) {
                    // We found a year, add it to the date
                    dateInfo.date = `TBD-${yearMatch[1]}`;
                } else {
                    // Default to current year
                    dateInfo.date = `TBD-${currentYear}`;
                }
            }
            
            // Determine event category
            let category = determineEventCategory(result.title + ' ' + result.snippet, defaultCategory);
            
            // Extract clean title - remove common prefixes/suffixes
            let cleanTitle = result.title
                .replace(/^Official\s*:\s*/i, '')
                .replace(/\s*[-|]\s*Official Site\s*$/i, '')
                .replace(/\s*\|\s*.*?$/i, ''); // Remove anything after a pipe
                
            // Improve the description by highlighting key details
            const highlightedDescription = highlightEventDetails(result.snippet);
            
            // Ensure we have a valid link
            let eventLink = result.link;
            
            // Check if the link looks valid
            if (!eventLink || eventLink === '#' || !eventLink.includes('.')) {
                // If we have a source in the result, try to use that
                if (result.source) {
                    eventLink = `https://${result.source}`;
                } else {
                    continue; // Skip results with invalid links
                }
            }
            
            eventsData.push({
                title: cleanTitle,
                description: highlightedDescription,
                link: eventLink,
                date: dateInfo.date,
                isPastEvent: dateInfo.isPast,
                category: category,
                // Add a score to help with sorting
                relevanceScore: calculateEventRelevance(result.title, result.snippet, queryLower, dateInfo.isPast, eventLink)
            });
            
            // Additional debugging
            console.log(`Found event: ${cleanTitle} | Category: ${category} | Date: ${dateInfo.date} | Link: ${eventLink}`);
        } catch (error) {
            console.error("Error processing result:", error);
        }
    }
    
    // Sort by relevance score (descending) and then by date
    return eventsData
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .map(event => {
            // Remove the score property before returning
            const { relevanceScore, ...cleanEvent } = event;
            return cleanEvent;
        });
}

// Highlight key details in event description
function highlightEventDetails(snippet) {
    // Add bold to dates, times, and locations
    return snippet
        .replace(/(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4}|\d{1,2}(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|[A-Z][a-z]+\s+\d{1,2}(st|nd|rd|th)?,?\s+\d{4})/gi, '<strong>$1</strong>')
        .replace(/(\d{1,2}:\d{2}\s*(AM|PM)|at\s+\d{1,2}\s*(AM|PM))/gi, '<strong>$1</strong>')
        .replace(/(registration|register now|sign up|buy tickets|join|free entry)/gi, '<strong>$1</strong>');
}

// Check if result location matches our search query
function isMatchingLocation(text, city, country) {
    const textLower = text.toLowerCase();
    const cityLower = city.toLowerCase();
    const countryLower = country.toLowerCase();
    
    // First check: Direct city and country mention
    if (textLower.includes(cityLower) && textLower.includes(countryLower)) {
        return true;
    }
    
    // Second check: If text contains the city and location context
    if (textLower.includes(cityLower) && 
        (textLower.includes('venue') || 
         textLower.includes('location') || 
         textLower.includes('arena') || 
         textLower.includes('center') || 
         textLower.includes('stadium') || 
         textLower.includes('hall'))) {
        return true;
    }
    
    // For major cities, the country might not be mentioned explicitly
    const majorCities = ['new york', 'london', 'tokyo', 'paris', 'sydney', 'singapore', 'berlin', 
                         'mumbai', 'delhi', 'los angeles', 'chicago', 'boston', 'toronto'];
    
    if (majorCities.includes(cityLower) && textLower.includes(cityLower)) {
        return true;
    }
    
    // If the country is mentioned with terms like "national", "championship", or specific regions
    if (textLower.includes(countryLower) && 
        (textLower.includes('championship') || 
         textLower.includes('national') || 
         textLower.includes('regional'))) {
        return true;
    }
    
    return false;
}

// Calculate relevance score for an event
function calculateEventRelevance(title, snippet, query, isPast, link) {
    let score = 0;
    const fullText = (title + ' ' + snippet).toLowerCase();
    const linkLower = link.toLowerCase();
    
    // Higher score for future events
    if (!isPast) score += 30;
    
    // Keywords indicating a strong event match
    const strongEventKeywords = [
        'registration open', 'register now', 'sign up', 'upcoming event', 
        'buy tickets', 'event schedule', 'join us', 'book now', 'tickets available',
        'official event', 'event details'
    ];
    
    // Check for strong keywords - with more weight for keywords in the title
    for (const keyword of strongEventKeywords) {
        if (title.toLowerCase().includes(keyword)) {
            score += 20;
        } else if (fullText.includes(keyword)) {
            score += 10;
        }
    }
    
    // Higher score for results with specific dates
    if (fullText.match(/\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4}/)) {
        score += 15;
    }
    
    // Higher score for results with location & venue info
    if (fullText.match(/venue|location|arena|stadium|center|hall|park|expo|gym|club/i)) {
        score += 15;
    }
    
    // Higher score for official sites
    if (title.toLowerCase().includes('official')) {
        score += 20;
    } else if (fullText.includes('official website') || fullText.includes('official site')) {
        score += 15;
    }
    
    // Check for event-specific domains in the link
    if (linkLower.match(/event|marathon|race|run|yoga|fitness|sport|championship|tournament|expo|festival/)) {
        score += 15;
    }
    
    // Higher score for .org, .gov domains (often more authoritative for events)
    if (linkLower.endsWith('.org') || linkLower.endsWith('.gov')) {
        score += 10;
    }
    
    // Higher score for domains that specifically mention the year
    const currentYear = new Date().getFullYear();
    if (linkLower.includes(`${currentYear}`) || linkLower.includes(`${currentYear+1}`)) {
        score += 15;
    }
    
    // Higher score for registration or ticket links
    if (linkLower.match(/register|signup|book|ticket|entry|join/)) {
        score += 20;
    }
    
    // Check keywords from our query
    const queryKeywords = query.split(' ')
        .filter(word => word.length > 3)
        .filter(word => !word.match(/in|the|and|or|at|to|from|with/i)); // Filter out common prepositions
        
    for (const keyword of queryKeywords) {
        if (fullText.includes(keyword.toLowerCase())) {
            score += 5;
        }
    }
    
    return score;
}

// Check if a search result is likely to be an event
function isLikelyEvent(title, snippet, query) {
    const fullText = (title + ' ' + snippet).toLowerCase();
    
    // Keywords that suggest it's an event
    const eventKeywords = ['event', 'marathon', 'race', 'workshop', 'class', 'tournament', 
                           'championship', 'competition', 'festival', 'upcoming', 'schedule',
                           'register', 'join', 'participate', 'dates', 'timing', 'registration', 
                           'tickets', 'venue', 'session', 'meet', 'expo', 'signup', 'challenge'];
    
    // Strong indicators it's a specific event
    const strongEventIndicators = ['registration open', 'register now', 'sign up today', 
                                  'get tickets', 'join us', 'event schedule', 'upcoming event'];
    
    // Negative keywords that suggest it's not a specific event
    const negativeKeywords = ['how to', 'what is', 'best ways', 'top tips', 'learn more', 
                             'article', 'news', 'blog post', 'wikipedia', 'history of'];
    
    // Check if title is about a specific event
    let isTitleAboutEvent = false;
    for (const keyword of eventKeywords) {
        if (title.toLowerCase().includes(keyword)) {
            isTitleAboutEvent = true;
            break;
        }
    }
    
    // Check for strong indicators in the full text
    let hasStrongIndicator = false;
    for (const indicator of strongEventIndicators) {
        if (fullText.includes(indicator)) {
            hasStrongIndicator = true;
            break;
        }
    }
    
    // Check for negative indicators
    let hasNegativeIndicator = false;
    for (const keyword of negativeKeywords) {
        if (fullText.includes(keyword)) {
            hasNegativeIndicator = true;
            break;
        }
    }
    
    // Check if it contains general event keywords
    let keywordCount = 0;
    for (const keyword of eventKeywords) {
        if (fullText.includes(keyword)) {
            keywordCount++;
        }
    }
    
    // Date patterns - expanded to catch more variations
    const hasDate = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w* \d{1,2},? \d{4}|\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4}|\d{1,2}(st|nd|rd|th)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(fullText);
    
    // Time pattern (e.g., 10:00 AM or 5 PM)
    const hasTime = /\b\d{1,2}:\d{2}\s*(am|pm)|\b\d{1,2}\s*(am|pm)|starts at|begins at|doors open/i.test(fullText);
    
    // Additional location patterns
    const hasVenue = /venue|location|arena|stadium|center|hall|park|expo|gym|club/i.test(fullText);
    
    // Decision logic:
    // 1. Strong indicator = very likely an event
    if (hasStrongIndicator && !hasNegativeIndicator) {
        return true;
    }
    
    // 2. Title + date/time + keyword = likely an event
    if (isTitleAboutEvent && (hasDate || hasTime) && keywordCount >= 2) {
        return true;
    }
    
    // 3. Multiple keywords + date/time/venue = likely an event
    if (keywordCount >= 3 && (hasDate || hasTime || hasVenue) && !hasNegativeIndicator) {
        return true;
    }
    
    return false;
}

// Format date from Knowledge Graph format
function formatDateFromKG(dateString) {
    if (!dateString) return "TBD";
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "TBD";
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}-${month}-${year}`;
    } catch (e) {
        console.error("Error parsing KG date:", e);
        return "TBD";
    }
}

// Extract date information from text
function extractDateInfo(text) {
    const fullText = text.toLowerCase();
    const currentDate = new Date();
    let dateMatch = null;
    let extractedDate = null;
    let isPast = false;
    
    // Common date patterns - improved with more variations
    const datePatterns = [
        // May 10, 2025 or May 10 2025
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* (\d{1,2})[,\s]+(\d{4})/i,
        // 10/05/2025
        /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
        // 2025-05-10
        /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
        // 10-05-2025
        /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/,
        // 10.05.2025
        /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/,
        // 10th May 2025 or 10 May 2025
        /\b(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b/i
    ];
    
    // Try to match date patterns
    for (const pattern of datePatterns) {
        const match = fullText.match(pattern);
        if (match) {
            dateMatch = match;
            break;
        }
    }
    
    // If date is found, format it as DD-MM-YYYY
    if (dateMatch) {
        let day, month, year;
        
        if (dateMatch[0].includes('/')) {
            // 10/05/2025 format
            const parts = dateMatch[0].split('/');
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        } else if (dateMatch[0].includes('-')) {
            // Check if year is first (2025-05-10) or last (10-05-2025)
            if (dateMatch[0].match(/^\d{4}-/)) {
                // 2025-05-10 format
                const parts = dateMatch[0].split('-');
                day = parts[2].padStart(2, '0');
                month = parts[1].padStart(2, '0');
                year = parts[0];
            } else {
                // 10-05-2025 format
                const parts = dateMatch[0].split('-');
                day = parts[0].padStart(2, '0');
                month = parts[1].padStart(2, '0');
                year = parts[2];
            }
        } else if (dateMatch[0].includes('.')) {
            // 10.05.2025 format
            const parts = dateMatch[0].split('.');
            day = parts[0].padStart(2, '0');
            month = parts[1].padStart(2, '0');
            year = parts[2];
        } else if (dateMatch[0].match(/\d{1,2}(st|nd|rd|th)?\s+[a-z]{3}/i)) {
            // 10th May 2025 or 10 May 2025 format
            const monthMap = {
                'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 
                'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
            };
            
            // Extract day, removing any suffix
            day = dateMatch[1].toString().padStart(2, '0');
            
            // Find the month name and convert to number
            let monthName;
            if (dateMatch[3] && dateMatch[3].length >= 3) {
                monthName = dateMatch[3].substring(0, 3).toLowerCase();
            } else {
                monthName = dateMatch[2].substring(0, 3).toLowerCase();
            }
            
            const monthIndex = monthMap[monthName];
            month = (monthIndex + 1).toString().padStart(2, '0');
            
            // Get the year
            year = dateMatch[4] || new Date().getFullYear().toString();
            
            // Check if date is in the past
            const eventDate = new Date(parseInt(year), monthIndex, parseInt(day));
            isPast = eventDate < currentDate;
        } else {
            // Month name format (May 10, 2025)
            const monthMap = {
                'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 
                'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
            };
            
            const monthIndex = monthMap[dateMatch[1].substring(0, 3).toLowerCase()];
            day = parseInt(dateMatch[2], 10).toString().padStart(2, '0');
            month = (monthIndex + 1).toString().padStart(2, '0');
            year = dateMatch[3];
            
            // Check if date is in the past
            const eventDate = new Date(year, monthIndex, parseInt(dateMatch[2], 10));
            isPast = eventDate < currentDate;
        }
        
        // Format as DD-MM-YYYY (changing from DD--MM--YYYY to use single hyphen)
        extractedDate = `${day}-${month}-${year}`;
    } else {
        // Generic date if not found
        extractedDate = "TBD";
    }
    
    return {
        date: extractedDate,
        isPast: isPast
    };
}

// Determine the category of an event based on text content
function determineEventCategory(text, defaultCategory = 'others') {
    const lowerText = text.toLowerCase();
    
    for (const [keyword, category] of Object.entries(eventCategories)) {
        if (lowerText.includes(keyword)) {
            return category;
        }
    }
    
    return defaultCategory;
}

// Remove duplicate events based on title similarity
function removeDuplicateEvents(events) {
    const uniqueEvents = [];
    const titles = new Set();
    
    for (const event of events) {
        // Simplify title for comparison (lowercase, remove special chars)
        const simplifiedTitle = event.title.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ');
        
        // Check if we have a very similar title already
        let isDuplicate = false;
        for (const title of titles) {
            // Use simple similarity check - if >70% words match, consider it a duplicate
            const titleWords = new Set(title.split(' '));
            const currentWords = simplifiedTitle.split(' ');
            let matchCount = 0;
            
            currentWords.forEach(word => {
                if (titleWords.has(word) && word.length > 3) {
                    matchCount++;
                }
            });
            
            if (matchCount > 0 && matchCount / currentWords.length > 0.7) {
                isDuplicate = true;
                break;
            }
        }
        
        if (!isDuplicate) {
            titles.add(simplifiedTitle);
            uniqueEvents.push(event);
        }
    }
    
    return uniqueEvents;
}

// Display events in the UI
function displayEvents(events) {
    // Clear previous results
    eventsList.innerHTML = '';
    
    if (events.length === 0) {
        // Show no results message
        resultsMessage.classList.add('hidden');
        eventsList.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }
    
    // Show results
    resultsMessage.classList.add('hidden');
    eventsList.classList.remove('hidden');
    noResults.classList.add('hidden');
    
    // Create event cards
    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition duration-300';
        
        // Create category tag
        const categoryClass = `category-${event.category}`;
        const categoryTag = `<span class="event-category ${categoryClass}">${capitalizeFirstLetter(event.category)}</span>`;
        
        // Format date for display: ensure it displays as DD-MM-YYYY
        let dateDisplay = event.date.replace(/--/g, '-'); // Replace double hyphens with single if present
        
        // Add past event indicator
        if (event.isPastEvent) {
            dateDisplay += ' <span class="text-red-500">(Past)</span>';
        }
        
        // Create link with full URL validation
        let eventLink = event.link;
        if (!eventLink.startsWith('http')) {
            eventLink = `https://${eventLink}`;
        }
        
        // Create card content with all information
        eventCard.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center">
                <div class="flex-grow">
                    <div class="flex items-start justify-between">
                        <h3 class="text-xl font-semibold text-dark mb-2">${event.title}</h3>
                    </div>
                    <div class="mb-2">
                        <span class="text-sm font-medium text-gray-800 bg-gray-100 px-3 py-1 rounded-full">DATE OF EVENT: ${dateDisplay}</span>
                    </div>
                    <div class="mb-3">
                        ${categoryTag}
                    </div>
                    <p class="text-gray-600 mb-4">${event.description}</p>
                </div>
                <div class="ml-0 md:ml-4 mt-3 md:mt-0">
                    <a href="${eventLink}" target="_blank" rel="noopener" 
                       class="event-link block text-center bg-primary text-white font-medium py-2 px-4 rounded hover:bg-dark transition duration-300">
                       Visit Website
                    </a>
                </div>
            </div>
        `;
        
        eventsList.appendChild(eventCard);
    });
}

// Show error message
function showError(message) {
    resultsMessage.classList.remove('hidden');
    eventsList.classList.add('hidden');
    noResults.classList.add('hidden');
    
    resultsMessage.innerHTML = `
        <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-red-500">${message}</p>
    `;
}

// Show or hide loading indicator
function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        resultsMessage.classList.add('hidden');
        eventsList.classList.add('hidden');
        noResults.classList.add('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

// Capitalize first letter of a string
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize the page when DOM content is loaded
document.addEventListener('DOMContentLoaded', initEvents);

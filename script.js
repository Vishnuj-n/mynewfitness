// FitAi JavaScript Functionality

document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Set active navigation based on current page
    const currentPage = window.location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (currentPage === linkPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('nav-active');
        }
    });    // Chatbot Functionality with Groq API
    const chatInput = document.getElementById('chat-input');
    const sendChatButton = document.getElementById('send-chat');    const chatMessages = document.getElementById('chat-messages');
    const popularTopics = document.querySelectorAll('.popular-topic');
    
    // Log config availability for debugging
    console.log('Chatbot initialization - Config check:', {
        hasWindow: typeof window !== 'undefined',
        hasConfig: typeof window !== 'undefined' && !!window.FitAiConfig,
        hasGroqConfig: typeof window !== 'undefined' && window.FitAiConfig && !!window.FitAiConfig.apiKeys && !!window.FitAiConfig.apiKeys.groq,
        hasEnv: typeof window !== 'undefined' && !!window.__env
    });
    
    // Get Groq API key from config with fallback mechanisms
    const GROQ_API_KEY = 
        (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.groq) || 
        (typeof window !== 'undefined' && window.__env && window.__env.GROQ_API_KEY) ||
        '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'; // Fallback for debugging only
        
    console.log('Using GROQ_API_KEY:', GROQ_API_KEY ? 'Key available (not showing for security)' : 'No key available');
    
    // Conversation history to maintain context
    let conversationHistory = [
        {
            role: "system",
            content: "you are only a healthcare assistant bot, dont respond to questions out of context from healthcare (just say I dont have information on that)"
        }
    ];
    
    function addMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 
            'bg-gray-200 p-3 rounded-lg max-w-md ml-auto' :
            'bg-primary/20 p-3 rounded-lg max-w-md';
        
        // Convert newlines to <br> tags
        const formattedMessage = message.replace(/\n/g, '<br>');
        
        // Format lists if present (detected by * or - at the beginning of lines)
        let htmlContent = formattedMessage;
        if (formattedMessage.includes('<br>* ') || formattedMessage.includes('<br>- ')) {
            // If message contains list items, convert to HTML list
            const lines = formattedMessage.split('<br>');
            let inList = false;
            
            htmlContent = lines.map(line => {
                if (line.startsWith('* ') || line.startsWith('- ')) {
                    if (!inList) {
                        inList = true;
                        return `<ul class="list-disc pl-5 mt-2 space-y-1"><li>${line.substring(2)}</li>`;
                    }
                    return `<li>${line.substring(2)}</li>`;
                } else if (inList) {
                    inList = false;
                    return `</ul>${line}`;
                } else {
                    return line;
                }
            }).join('<br>');
            
            if (inList) {
                htmlContent += '</ul>';
            }
        }
        
        messageDiv.innerHTML = `<p class="text-dark">${htmlContent}</p>`;
        chatMessages.appendChild(messageDiv);
        
        // Auto-scroll to the bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    async function sendMessageToGroq(message) {
        try {
            // Add user message to history
            conversationHistory.push({
                role: "user",
                content: message
            });
            
            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'bg-primary/20 p-3 rounded-lg max-w-md flex';
            loadingDiv.innerHTML = '<div class="loading-dots"><span>.</span><span>.</span><span>.</span></div>';
            chatMessages.appendChild(loadingDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Make API request to Groq
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: conversationHistory,
                    temperature: 0.5,
                    max_tokens: 1024
                })
            });
            
            // Remove loading indicator
            chatMessages.removeChild(loadingDiv);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to get response from AI');
            }
            
            const data = await response.json();
            const assistantMessage = data.choices[0].message.content;
            
            // Add assistant response to conversation history
            conversationHistory.push({
                role: "assistant",
                content: assistantMessage
            });
            
            // Keep conversation history from getting too long (maintain last 10 messages)
            if (conversationHistory.length > 11) {
                // Always keep the system message at index 0
                conversationHistory = [
                    conversationHistory[0],
                    ...conversationHistory.slice(conversationHistory.length - 10)
                ];
            }
            
            return assistantMessage;
        } catch (error) {
            console.error('Error sending message to Groq:', error);
            return "I'm sorry, I'm having trouble connecting to my knowledge base right now. Please try again later.";        }
    }
    
    async function handleChatSubmit() {
        const message = chatInput.value.trim();
        if (message) {
            // Add user message to UI
            addMessage(message, true);
            chatInput.value = '';
            
            // Get AI response
            const aiResponse = await sendMessageToGroq(message);
            addMessage(aiResponse);
        }
    }
    
    if (sendChatButton && chatInput) {
        sendChatButton.addEventListener('click', handleChatSubmit);
        
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleChatSubmit();
                e.preventDefault();
            }
        });
    }
    
    // Handle popular topics clicks
    if (popularTopics.length > 0) {
        popularTopics.forEach(topic => {
            topic.addEventListener('click', function() {
                const topicText = this.textContent.trim();
                chatInput.value = topicText;
                handleChatSubmit();
            });
        });
    }
    
    // Add loading dots animation styles
    const style = document.createElement('style');
    style.textContent = `
        .loading-dots {
            display: flex;
            align-items: center;
        }
        .loading-dots span {
            animation: loadingDots 1.4s infinite ease-in-out both;
            font-size: 20px;
            margin: 0 2px;
        }
        .loading-dots span:nth-child(1) {
            animation-delay: 0s;
        }
        .loading-dots span:nth-child(2) {
            animation-delay: 0.2s;
        }        .loading-dots span:nth-child(3) {
            animation-delay: 0.4s;
        }
        @keyframes loadingDots {
            0%, 80%, 100% { opacity: 0; }
            40% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    // Form Submissions and Plan Generation
    const planForm = document.getElementById('plan-form');
    const planFormContainer = document.getElementById('plan-form-container');
    const loadingSpinner = document.getElementById('loading-spinner');
    const planResults = document.getElementById('plan-results');
    const planSummary = document.getElementById('plan-summary');
    const workoutDays = document.getElementById('workout-days');
    const downloadPdfBtn = document.getElementById('download-pdf');
    
    // Sleep and stress level sliders
    const sleepHours = document.getElementById('sleep-hours');
    const sleepHoursValue = document.getElementById('sleep-hours-value');
    const stressLevel = document.getElementById('stress-level');
    const stressLevelValue = document.getElementById('stress-level-value');
    
    if (sleepHours) {
        sleepHours.addEventListener('input', function() {
            sleepHoursValue.textContent = this.value;
        });
    }
    
    if (stressLevel) {
        stressLevel.addEventListener('input', function() {
            stressLevelValue.textContent = this.value;
        });
    }
    
    if (planForm) {
        planForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Your personalized fitness plan is being generated! This would connect to the backend in a production environment.');
            
            // For testing purposes, let's simulate showing the results section
            if (planFormContainer && loadingSpinner && planResults) {
                planFormContainer.classList.add('hidden');
                loadingSpinner.classList.remove('hidden');
                
                // Simulate API delay
                setTimeout(() => {
                    loadingSpinner.classList.add('hidden');
                    planResults.classList.remove('hidden');
                }, 2000);
            }
        });
    }
    
    async function generateWorkoutPlan(userData) {
        // Construct prompt for Groq API
        const prompt = `
Generate a personalized 7-day workout plan for a user with the following details:
- Name: ${userData.firstName} ${userData.lastName}
- Age: ${userData.age}
- Gender: ${userData.gender}
- Height: ${userData.height} cm
- Weight: ${userData.weight} kg
- Sleep: ${userData.sleepHours} hours per night
- Stress Level: ${userData.stressLevel}/10
- Fitness Goal: ${userData.fitnessGoal}
- Workout Location: ${userData.workoutLocation}
- Dietary Restriction: ${userData.isVegan ? 'Vegan' : 'None'}

The workout plan should include:
1. A brief introduction and summary of the plan
2. For each day (Day 1 to Day 7):
   - The focus area/muscle groups
   - Warm-up exercises
   - Main workout with exercises, sets, reps
   - Cool-down exercises
3. Include appropriate rest days
4. Brief nutritional suggestions that align with their goals ${userData.isVegan ? 'and vegan diet' : ''}

Format the response as a JSON object with the following structure:
{
  "summary": "Brief overall summary of the plan",
  "days": [
    {
      "day": "Day 1",
      "focus": "Focus area",
      "warmup": ["Exercise 1", "Exercise 2"],
      "workout": [
        {"exercise": "Exercise name", "sets": X, "reps": Y, "notes": "Any special instructions"}
      ],
      "cooldown": ["Exercise 1", "Exercise 2"]
    }
  ],
  "nutrition": "Brief nutritional guidelines"
}
`;

        // Call Groq API
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: "You are a professional fitness trainer and nutritionist who creates personalized workout plans. Format your response as JSON only without any markdown."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.5,
                    max_tokens: 4000
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to get response from Groq API');
            }
            
            const data = await response.json();
            const responseText = data.choices[0].message.content;
            
            // Extract JSON from response
            let jsonStart = responseText.indexOf('{');
            let jsonEnd = responseText.lastIndexOf('}');
            
            if (jsonStart === -1 || jsonEnd === -1) {
                throw new Error('Invalid JSON response from API');
            }
            
            const jsonResponse = responseText.substring(jsonStart, jsonEnd + 1);
            return JSON.parse(jsonResponse);
            
        } catch (error) {
            console.error('Error calling Groq API:', error);
            throw error;
        }
    }
    
    function displayWorkoutPlan(workoutPlan, userData) {
        // Display summary
        planSummary.innerHTML = `
            <div class="mb-3">
                <h3 class="text-xl font-semibold text-dark mb-2">Plan for ${userData.firstName} ${userData.lastName}</h3>
                <p class="text-gray-700">${workoutPlan.summary}</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                    <span class="font-semibold">Goal:</span> ${capitalizeFirstLetter(userData.fitnessGoal.replace('-', ' '))}
                </div>
                <div>
                    <span class="font-semibold">Location:</span> ${capitalizeFirstLetter(userData.workoutLocation)}
                </div>
                <div>
                    <span class="font-semibold">Nutrition:</span> ${userData.isVegan ? 'Vegan' : 'Standard'}
                </div>
            </div>
        `;
        
        // Display days
        workoutDays.innerHTML = '';
        workoutPlan.days.forEach(day => {
            const dayCard = document.createElement('div');
            dayCard.className = 'bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-300';
            
            // Determine card color based on focus (subtle background)
            let focusColor = 'bg-green-50'; // Default
            if (day.focus.toLowerCase().includes('rest')) {
                focusColor = 'bg-blue-50';
            } else if (day.focus.toLowerCase().includes('leg') || day.focus.toLowerCase().includes('lower')) {
                focusColor = 'bg-indigo-50';
            } else if (day.focus.toLowerCase().includes('chest') || day.focus.toLowerCase().includes('upper')) {
                focusColor = 'bg-red-50';
            } else if (day.focus.toLowerCase().includes('core') || day.focus.toLowerCase().includes('ab')) {
                focusColor = 'bg-yellow-50';
            }
            
            // Create workout list
            let workoutList = '';
            if (day.workout && day.workout.length > 0) {
                workoutList = day.workout.map(exercise => `
                    <li class="mb-2">
                        <span class="font-semibold">${exercise.exercise}</span>
                        <div class="text-sm text-gray-600">
                            ${exercise.sets} sets × ${exercise.reps} reps
                            ${exercise.notes ? `<div class="text-xs italic mt-1">${exercise.notes}</div>` : ''}
                        </div>
                    </li>
                `).join('');
            }
            
            dayCard.innerHTML = `
                <div class="${focusColor} rounded-t-lg p-3 -m-4 mb-3">
                    <h4 class="font-bold text-dark">${day.day}</h4>
                    <p class="text-gray-700 text-sm">${day.focus}</p>
                </div>
                
                <div>
                    <h5 class="text-sm font-semibold text-primary mb-1">Warm-up</h5>
                    <ul class="text-sm text-gray-600 mb-3 pl-4 list-disc">
                        ${day.warmup.map(exercise => `<li>${exercise}</li>`).join('')}
                    </ul>
                    
                    <h5 class="text-sm font-semibold text-primary mb-1">Workout</h5>
                    <ul class="mb-3 pl-4">
                        ${workoutList}
                    </ul>
                    
                    <h5 class="text-sm font-semibold text-primary mb-1">Cool-down</h5>
                    <ul class="text-sm text-gray-600 pl-4 list-disc">
                        ${day.cooldown.map(exercise => `<li>${exercise}</li>`).join('')}
                    </ul>
                </div>
            `;
            
            workoutDays.appendChild(dayCard);
        });
        
        // Add nutrition section
        const nutritionSection = document.createElement('div');
        nutritionSection.className = 'col-span-full mt-4 p-4 bg-green-50 rounded-lg';
        nutritionSection.innerHTML = `
            <h3 class="text-lg font-semibold text-dark mb-2">Nutrition Guidelines</h3>
            <p class="text-gray-700">${workoutPlan.nutrition}</p>
        `;
        
        workoutDays.appendChild(nutritionSection);
        
        // Set up PDF download functionality
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', function() {
                generatePDF(workoutPlan, userData);
            });
        }
    }
    
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    function generatePDF(workoutPlan, userData) {
        // Import jsPDF and html2canvas dynamically
        const jsPDFScript = document.createElement('script');
        jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(jsPDFScript);
        
        const html2canvasScript = document.createElement('script');
        html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(html2canvasScript);
        
        html2canvasScript.onload = function() {
            jsPDFScript.onload = function() {
                const { jsPDF } = window.jspdf;
                
                // Create PDF content
                const doc = new jsPDF('p', 'mm', 'a4');
                const pageWidth = doc.internal.pageSize.getWidth();
                
                // Add header
                doc.setFontSize(24);
                doc.setTextColor(10, 185, 129); // Primary green color
                doc.text('FitAi Personalized Workout Plan', pageWidth/2, 20, {align: 'center'});
                
                // Add user info
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.text(`Plan for: ${userData.firstName} ${userData.lastName}`, 20, 30);
                doc.text(`Age: ${userData.age} | Height: ${userData.height}cm | Weight: ${userData.weight}kg`, 20, 37);
                doc.text(`Goal: ${capitalizeFirstLetter(userData.fitnessGoal.replace('-', ' '))}`, 20, 44);
                
                // Add summary
                doc.setFontSize(16);
                doc.setTextColor(10, 185, 129);
                doc.text('Plan Summary', 20, 55);
                
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                const summaryLines = doc.splitTextToSize(workoutPlan.summary, pageWidth - 40);
                doc.text(summaryLines, 20, 62);
                
                let yPos = 62 + (summaryLines.length * 7);
                
                // Add workout days
                workoutPlan.days.forEach(day => {
                    // Check if we need a new page
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.setFontSize(16);
                    doc.setTextColor(10, 185, 129);
                    doc.text(`${day.day} - ${day.focus}`, 20, yPos);
                    yPos += 7;
                    
                    // Warm-up
                    doc.setFontSize(12);
                    doc.setTextColor(0, 0, 0);
                    doc.text('Warm-up:', 20, yPos);
                    yPos += 6;
                    
                    day.warmup.forEach(exercise => {
                        doc.text(`• ${exercise}`, 25, yPos);
                        yPos += 6;
                    });
                    
                    yPos += 2;
                    
                    // Main workout
                    doc.text('Workout:', 20, yPos);
                    yPos += 6;
                    
                    day.workout.forEach(exercise => {
                        doc.text(`• ${exercise.exercise}: ${exercise.sets} sets × ${exercise.reps} reps`, 25, yPos);
                        yPos += 6;
                        
                        if (exercise.notes) {
                            doc.setFontSize(10);
                            doc.text(`   ${exercise.notes}`, 25, yPos);
                            doc.setFontSize(12);
                            yPos += 5;
                        }
                    });
                    
                    yPos += 2;
                    
                    // Cool-down
                    doc.text('Cool-down:', 20, yPos);
                    yPos += 6;
                    
                    day.cooldown.forEach(exercise => {
                        doc.text(`• ${exercise}`, 25, yPos);
                        yPos += 6;
                    });
                    
                    yPos += 10;
                });
                
                // Add nutrition on a new page if needed
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setFontSize(16);
                doc.setTextColor(10, 185, 129);
                doc.text('Nutrition Guidelines', 20, yPos);
                
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                const nutritionLines = doc.splitTextToSize(workoutPlan.nutrition, pageWidth - 40);
                doc.text(nutritionLines, 20, yPos + 7);
                
                // Add footer
                const totalPages = doc.internal.getNumberOfPages();
                for(let i = 1; i <= totalPages; i++) {
                    doc.setPage(i);
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text('Generated by FitAi - Your AI Fitness Assistant', pageWidth/2, 290, {align: 'center'});
                    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 20, 290, {align: 'right'});
                }
                
                // Save PDF
                doc.save(`FitAi_Plan_${userData.firstName}_${userData.lastName}.pdf`);
            };
        };    }
      const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you soon. This would send the form data to a server in a production environment.');
            contactForm.reset();
        });
    }
    
    // Location Search with TomTom API
    const searchResourcesButton = document.getElementById('search-resources');
    const locationInput = document.getElementById('location-input');
    const resourceType = document.getElementById('resource-type');
    const distance = document.getElementById('distance');
    const mapContainer = document.getElementById('map-container');
    const resultsContainer = document.getElementById('results-container');
    
    // TomTom API credentials - updated with valid key
    const tomtomAPIKey = 'JXPnqva3lZanMKstFTttkppZnHor4IXr'; // Updated TomTom API key    // Serper.dev API credentials
    const serperAPIKey = window.FitAiConfig?.apiKeys?.serper || '67c090a334109db4480037614dbb1c635f29ad83';
    
    // Initialize a default map when the page loads if we're on the location page
    if (mapContainer && window.location.pathname.includes('locate.html')) {
        // Default coordinates (New York City)
        const defaultLat = 40.730610;
        const defaultLng = -73.935242;
        
        // Check if alternate map service script is needed
        if (!window.L) {
            // Add Leaflet CSS and JS as fallback in case TomTom fails
            const leafletCSS = document.createElement('link');
            leafletCSS.rel = 'stylesheet';
            leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(leafletCSS);
            
            const leafletJS = document.createElement('script');
            leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            document.head.appendChild(leafletJS);
        }
        
        // Initialize the map with default location after a short delay
        setTimeout(() => {
            try {
                tt.setProductInfo('FitAi', '1.0');
                
                // Add error handler for map tiles
                window.addEventListener('error', function(e) {
                    // Check if the error is related to map tiles
                    if (e.target && (e.target.src || e.target.href)) {
                        const url = e.target.src || e.target.href;
                        if (url.includes('api.tomtom.com')) {
                            console.warn('TomTom resource failed to load:', url);
                            tomtomErrorCount++;
                            
                            // If we have multiple tile errors, flag TomTom as failing
                            if (tomtomErrorCount > 5 && !isTomTomFailure) {
                                console.error('TomTom map service seems to be having issues');
                                isTomTomFailure = true;
                                
                                // Try to initialize fallback OpenStreetMap if Leaflet is loaded
                                if (window.L && mapContainer) {
                                    // Only switch if not already using Leaflet
                                    if (!mapContainer._leafletMap) {
                                        initializeLeafletMap(defaultLat, defaultLng);
                                    }
                                }
                            }
                        }
                    }                }, true);
                
                const defaultMap = tt.map({
                    key: tomtomAPIKey,
                    container: 'map-container',
                    center: [defaultLng, defaultLat],
                    zoom: 10
                });
                
                // Add a marker for the default location
                new tt.Marker()
                    .setLngLat([defaultLng, defaultLat])
                    .addTo(defaultMap);
                      } catch (error) {
                console.error('Error initializing default map:', error);
                // Leave the placeholder visible if map fails to load
            }
        }, 500);
    }

    // Initialize TomTom map    
    function initializeMap(latitude, longitude) {
        try {
            // Check if mapContainer is a valid DOM element
            if (!mapContainer) {
                console.error("Map container is not a valid DOM element");
                return null;
            }
            
            // Create a map instance
            const map = tt.map({
                key: tomtomAPIKey,
                container: 'map-container',
                center: [longitude, latitude],
                zoom: 13
            });
            
            // Add map controls
            map.addControl(new tt.NavigationControl());
            map.addControl(new tt.FullscreenControl());
            
            return {
                map: map,
                latitude: latitude,
                longitude: longitude
            };
        } catch (error) {
            console.error('Error initializing map:', error);
            mapContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center bg-red-100">
                <div class="text-center p-4">
                    <p class="text-xl text-red-600 mb-2">Map Error</p>
                    <p class="text-gray-600">Unable to load map: ${error.message || 'Unknown error'}</p>
                </div>
            </div>`;
            
            // Return a mock map object to prevent errors in calling code
            return {
                map: {
                    fitBounds: () => {},
                    addControl: () => {}
                },
                latitude: latitude,
                longitude: longitude
            };        }
    }    // Search for location using TomTom Geocoding API
    async function geocodeLocation(locationQuery) {
        try {
            // Check if the input is an Indian PIN code
            if (isIndianPinCode(locationQuery)) {
                console.log('Detected Indian PIN code, using specialized geocoding...');
                const pincodeResult = await getCoordinatesFromPincode(locationQuery, tomtomAPIKey);
                
                if (pincodeResult.latitude && pincodeResult.longitude) {
                    return {
                        latitude: pincodeResult.latitude,
                        longitude: pincodeResult.longitude,
                        address: pincodeResult.address || `PIN Code: ${locationQuery}`
                    };
                } else {
                    throw { message: `PIN code ${locationQuery} not found. Please check the PIN code and try again.` };
                }
            }
            
            // For other locations, use standard geocoding
            const countryCode = isPostalCode(locationQuery) ? detectCountryFromPostalCode(locationQuery) : 'global';
            let params = `key=${tomtomAPIKey}&limit=1`;
            
            // Add country filter if specific country detected
            if (countryCode !== 'global') {
                params += `&countrySet=${countryCode}`;
            }
            
            // Make fetch request to TomTom's Geocoding API
            const response = await fetch(
                `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(locationQuery)}.json?${params}`
            );
            
            if (!response.ok) {
                console.error(`Geocoding error: ${response.status}`);
                throw { status: response.status, message: `Geocoding error: ${response.status}` };
            }
            
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                return {
                    latitude: result.position.lat,
                    longitude: result.position.lon,
                    address: result.address.freeformAddress || locationQuery
                };
            } else {
                console.error('Location not found');
                throw { message: 'Location not found. Please try a different location or postal code.' };
            }
        } catch (error) {
            console.error('Error geocoding location:', error);
            throw error;
        }
    }

    // Search for POIs using TomTom Search API
    async function searchPOIs(latitude, longitude, category, radius) {
        try {
            // Map resource type to TomTom category
            let searchTerm;
            if (category === 'gyms') {
                searchTerm = 'gym';
            } else if (category === 'parks') {
                searchTerm = 'park';
            } else {
                // Use both in separate calls and combine results
                const gymsPromise = fetch(
                    `https://api.tomtom.com/search/2/poiSearch/gym.json?key=${tomtomAPIKey}&lat=${latitude}&lon=${longitude}&radius=${parseFloat(radius) * 1609.34}&limit=10`
                );
                
                const parksPromise = fetch(
                    `https://api.tomtom.com/search/2/poiSearch/park.json?key=${tomtomAPIKey}&lat=${latitude}&lon=${longitude}&radius=${parseFloat(radius) * 1609.34}&limit=10`
                );
                
                const [gymsResponse, parksResponse] = await Promise.all([gymsPromise, parksPromise]);
                
                if (!gymsResponse.ok || !parksResponse.ok) {
                    throw { 
                        status: !gymsResponse.ok ? gymsResponse.status : parksResponse.status, 
                        message: `POI search error: ${!gymsResponse.ok ? gymsResponse.status : parksResponse.status}` 
                    };
                }
                
                const gymsData = await gymsResponse.json();
                const parksData = await parksResponse.json();
                
                const gyms = gymsData.results || [];
                const parks = parksData.results || [];
                
                // Process and combine the results
                return [
                    ...gyms.map(poi => ({
                        id: poi.id,
                        name: poi.poi.name,
                        type: 'gyms',
                        position: {
                            lat: poi.position.lat,
                            lon: poi.position.lon
                        },
                        address: poi.address.freeformAddress,
                        distance: (poi.dist / 1609.34).toFixed(1), // Convert meters to miles
                        rating: (3 + Math.random() * 2).toFixed(1), // TomTom doesn't provide ratings, so we simulate
                        phone: poi.poi.phone || "Not available",
                        hours: poi.poi.openingHours || "Hours not available"
                    })),
                    ...parks.map(poi => ({
                        id: poi.id,
                        name: poi.poi.name,
                        type: 'parks',
                        position: {
                            lat: poi.position.lat,
                            lon: poi.position.lon
                        },
                        address: poi.address.freeformAddress,
                        distance: (poi.dist / 1609.34).toFixed(1), // Convert meters to miles
                        rating: (3 + Math.random() * 2).toFixed(1), // TomTom doesn't provide ratings, so we simulate
                        phone: poi.poi.phone || "Not available",
                        hours: poi.poi.openingHours || "Hours not available"
                    }))
                ];
            }
            
            // For single category search
            const response = await fetch(
                `https://api.tomtom.com/search/2/poiSearch/${searchTerm}.json?key=${tomtomAPIKey}&lat=${latitude}&lon=${longitude}&radius=${parseFloat(radius) * 1609.34}&limit=10`
            );
            
            if (!response.ok) {
                throw { status: response.status, message: `POI search error: ${response.status}` };
            }
            
            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                throw { message: 'No locations found in this area. Try increasing the search radius or changing the resource type.' };
            }
            
            // Process the results
            return data.results.map(poi => {
                return {
                    id: poi.id,
                    name: poi.poi.name,
                    type: category, // Use the requested category type
                    position: {
                        lat: poi.position.lat,
                        lon: poi.position.lon
                    },
                    address: poi.address.freeformAddress,
                    distance: (poi.dist / 1609.34).toFixed(1), // Convert meters to miles
                    rating: (3 + Math.random() * 2).toFixed(1), // TomTom doesn't provide ratings, so we simulate
                    phone: poi.poi.phone || "Not available",
                    hours: poi.poi.openingHours || "Hours not available"                };
            });
        } catch (error) {            
            console.error('Error searching POIs:', error);
            throw error;
        }
    }
    
    // Gather additional information about a POI using serper.dev
    async function getAdditionalInfo(placeName, placeAddress) {
        try {
            // Construct the search query
            const searchQuery = `${placeName} ${placeAddress} reviews`;
            
            const response = await fetch('https://api.serper.dev/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': serperAPIKey
                },
                body: JSON.stringify({
                    q: searchQuery,
                    gl: 'us',
                    hl: 'en',
                    num: 5
                })
            });
            
            if (!response.ok) {
                throw { status: response.status, message: `Serper.dev API error: ${response.status}` };
            }
            
            const data = await response.json();
            
            // Extract information from search results
            let website = null;
            const reviews = [];
            const amenities = [];
            
            // Find official website
            if (data.organic && data.organic.length > 0) {
                for (const result of data.organic) {
                    if (result.link && (result.link.includes(placeName.toLowerCase().replace(/[^a-z0-9]/g, '')) || 
                        result.title.toLowerCase().includes(placeName.toLowerCase()))) {
                        website = result.link;
                        break;
                    }
                }
                
                // Extract reviews from snippets
                for (const result of data.organic) {
                    if (result.snippet && result.snippet.toLowerCase().includes('review')) {
                        const reviewText = result.snippet.substring(0, 100) + '...';
                        const author = "Customer";
                        const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars (simulated)
                        
                        reviews.push({
                            author: author,
                            rating: rating,
                            text: reviewText,
                            date: new Date().toLocaleDateString()
                        });
                        
                        if (reviews.length >= 3) break;
                    }
                }
            }
            
            // Generate amenities based on organic results and place type
            if (placeName.toLowerCase().includes('gym') || placeName.toLowerCase().includes('fitness')) {
                const possibleAmenities = ["Free weights", "Cardio equipment", "Locker rooms", "Showers", "Personal training", "Group classes", "Sauna", "Pool", "Basketball court", "Childcare"];
                
                // Look for amenities in the organic results
                if (data.organic) {
                    for (const result of data.organic) {
                        for (const amenity of possibleAmenities) {
                            if (result.snippet && result.snippet.toLowerCase().includes(amenity.toLowerCase()) && !amenities.includes(amenity)) {
                                amenities.push(amenity);
                            }
                        }
                    }
                }
                
                // Add some random amenities if we didn't find enough
                if (amenities.length < 3) {
                    const remainingAmenities = possibleAmenities.filter(a => !amenities.includes(a));
                    const numToAdd = Math.min(3 - amenities.length, remainingAmenities.length);
                    
                    for (let i = 0; i < numToAdd; i++) {
                        const randomIndex = Math.floor(Math.random() * remainingAmenities.length);
                        amenities.push(remainingAmenities[randomIndex]);
                        remainingAmenities.splice(randomIndex, 1);
                    }
                }
            } else {
                // Park amenities
                const possibleAmenities = ["Walking trails", "Playground", "Picnic area", "Sports fields", "Basketball courts", "Outdoor fitness equipment", "Dog park", "Restrooms", "Bike paths", "Water features"];
                
                // Process similar to gym amenities
                if (data.organic) {
                    for (const result of data.organic) {
                        for (const amenity of possibleAmenities) {
                            if (result.snippet && result.snippet.toLowerCase().includes(amenity.toLowerCase()) && !amenities.includes(amenity)) {
                                amenities.push(amenity);
                            }
                        }
                    }
                }
                
                // Add some random amenities if we didn't find enough
                if (amenities.length < 3) {
                    const remainingAmenities = possibleAmenities.filter(a => !amenities.includes(a));
                    const numToAdd = Math.min(3 - amenities.length, remainingAmenities.length);
                    
                    for (let i = 0; i < numToAdd; i++) {
                        const randomIndex = Math.floor(Math.random() * remainingAmenities.length);
                        amenities.push(remainingAmenities[randomIndex]);
                        remainingAmenities.splice(randomIndex, 1);
                    }
                }
            }
            
            return {
                reviews: reviews,
                amenities: amenities,
                website: website || `https://www.${placeName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
            };
        } catch (error) {
            console.warn('Error getting additional info, continuing with limited info:', error);
            // Return empty data but don't fail the entire operation
            return {
                reviews: [],
                amenities: [],
                website: null
            };
        }
    }
    
    // Create HTML for star rating
    function createStarRating(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        
        let starsHTML = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            starsHTML += `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
        }
        
        // Half star
        if (halfStar) {
            starsHTML += `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clip-path="inset(0 50% 0 0)"></path></svg>`;
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            starsHTML += `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>`;
        }
        
        return starsHTML;
    }
    
    // Generate result card HTML
    function createResultCard(place, additionalInfo) {
        const typeIcon = place.type === 'gyms' 
            ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>'
            : '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        
        // Format the amenities list
        const amenitiesList = additionalInfo.amenities.map(a => `<li class="text-sm text-gray-600"><span class="text-primary">•</span> ${a}</li>`).join('');
        
        // Format the reviews list
        const reviewsList = additionalInfo.reviews.map(review => `
            <div class="mb-2 pb-2 border-b border-gray-100">
                <div class="flex items-center">
                    <div class="flex text-yellow-500 mr-1">
                        ${createStarRating(review.rating)}
                    </div>
                    <span class="text-sm font-medium">${review.author}</span>
                    <span class="text-xs text-gray-500 ml-2">${review.date}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">${review.text}</p>
            </div>
        `).join('');
        
        return `
            <div class="p-4 border rounded-lg hover:shadow-md transition cursor-pointer hover:bg-primary/5 mb-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3 bg-primary/20 rounded-full p-2 text-primary">
                        ${typeIcon}
                    </div>
                    <div class="flex-grow">
                        <h4 class="font-bold text-dark flex items-center">
                            ${place.name}
                            <span class="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded ml-2">${place.type === 'gyms' ? 'Gym' : 'Park'}</span>
                        </h4>
                        <p class="text-gray-600 text-sm">${place.address}</p>
                        <div class="flex items-center mt-1">
                            <div class="flex text-yellow-500">
                                ${createStarRating(place.rating)}
                            </div>
                            <span class="text-gray-500 text-sm ml-1">${place.rating}/5.0</span>
                            <span class="text-gray-500 text-sm ml-3">${place.distance} miles away</span>
                        </div>
                    </div>
                </div>
                
                <div class="mt-2 pt-2 border-t border-gray-100">
                    <div class="flex flex-wrap gap-2">
                        <div class="flex items-center text-xs text-gray-600">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            ${place.phone}
                        </div>
                        <div class="flex items-center text-xs text-gray-600 ml-2">
                            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            ${place.hours}
                        </div>
                    </div>
                </div>
                
                <div class="mt-3">
                    <div class="flex justify-between">
                        <h5 class="text-sm font-semibold text-dark mb-1">Amenities</h5>
                        <a href="${additionalInfo.website}" target="_blank" class="text-primary text-xs hover:underline">Visit Website</a>
                    </div>
                    <ul class="grid grid-cols-2 gap-x-2">
                        ${amenitiesList}
                    </ul>
                </div>
                
                ${reviewsList ? `
                    <div class="mt-3 pt-2 border-t border-gray-100">
                        <h5 class="text-sm font-semibold text-dark mb-2">Reviews</h5>
                        ${reviewsList}
                    </div>
                ` : ''}
            </div>
        `;
    }    async function performSearch(location, resourceType, distanceValue) {
        // Show loading state
        showLoadingIndicator();
        
        try {
            // Clear any existing map content first
            if (mapContainer) {
                // Show a temporary loading state in the map container
                mapContainer.innerHTML = `
                    <div class="h-full flex items-center justify-center bg-gray-100">
                        <div class="text-center">
                            <div class="spinner-border text-primary mx-auto mb-4" role="status"></div>
                            <p class="text-gray-500">Loading map...</p>
                        </div>
                    </div>
                `;
            }
            
            // Update search status for PIN code searches
            const searchStatus = document.getElementById('search-status');
            const isPinCode = isIndianPinCode(location);
            
            if (searchStatus) {
                searchStatus.classList.remove('hidden');
                if (isPinCode) {
                    searchStatus.innerHTML = `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            <svg class="-ml-1 mr-1.5 h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            Searching with PIN code: ${location}
                        </span>
                    `;
                } else {
                    searchStatus.innerHTML = `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                            <svg class="-ml-1 mr-1.5 h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            Searching for: ${location}
                        </span>
                    `;
                }
            }
            
            // 1. Geocode the location (convert address to coordinates)
            const geocodeResult = await geocodeLocation(location);
            const { latitude, longitude, address } = geocodeResult;
            
            // 2. Initialize the map with the coordinates
            const mapData = initializeMap(latitude, longitude);
            
            if (!mapData || !mapData.map) {
                throw new Error('Failed to initialize map. Please try again.');
            }
            
            const map = mapData.map;
            
            // 3. Search for POIs near the location
            const pois = await searchPOIs(latitude, longitude, resourceType, distanceValue);
            
            // 4. Add markers for each POI to the map
            addMarkersToMap(map, { latitude, longitude, address }, pois);
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            // Hide search status
            if (searchStatus) {
                searchStatus.classList.add('hidden');
            }
            
            // Show results
            if (pois.length > 0) {
                // Show search results container
                const searchResultsDiv = document.querySelector('.search-results');
                searchResultsDiv.classList.remove('hidden');
                searchResultsDiv.innerHTML = '';
                
                // Process each POI
                for (const poi of pois) {
                    // Get additional information about the POI
                    const additionalInfo = await getAdditionalInfo(poi.name, poi.address);
                    
                    // Create result card
                    const cardHTML = createResultCard(poi, additionalInfo);
                    searchResultsDiv.innerHTML += cardHTML;
                }
                
                // Show results container
                document.querySelector('.initial-message').classList.add('hidden');
            } else {
                // No results found
                document.querySelector('.initial-message').classList.add('hidden');
                resultsContainer.innerHTML = `
                    <div class="text-center py-10">
                        <svg class="w-12 h-12 text-primary/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-gray-500">No fitness resources found near ${location}. Try a different location or expand your search radius.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error during search:', error);
            // Hide loading indicator
            hideLoadingIndicator();
            
            resultsContainer.innerHTML = `
                <div class="text-center py-10">
                    <svg class="w-12 h-12 text-red-500/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-gray-500">An error occurred while searching: ${error.message || 'Please try again later.'}</p>
                </div>
            `;        }
    }
      if (searchResourcesButton && locationInput) {
        searchResourcesButton.addEventListener('click', function() {
            const location = locationInput.value.trim();
            const resourceTypeValue = resourceType ? resourceType.value : 'all';
            const distanceValue = distance ? distance.value : '10';
            
            if (location) {
                // Check for PIN code format and show appropriate feedback
                if (isIndianPinCode(location)) {
                    const searchStatus = document.getElementById('search-status');
                    if (searchStatus) {
                        searchStatus.classList.remove('hidden');
                        searchStatus.innerHTML = `
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                <svg class="-ml-1 mr-1.5 h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                </svg>
                                Detected Indian PIN code: ${location}
                            </span>
                        `;
                    }
                }
                
                performSearch(location, resourceTypeValue, distanceValue);
            } else {
                alert('Please enter a location or PIN code to search.');
            }
        });
        
        // Add event listener for Enter key in the search input
        locationInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchResourcesButton.click();
            }
        });
          // Add helper text for PIN code detection
        locationInput.addEventListener('input', function() {
            const value = this.value.trim();
            const searchStatus = document.getElementById('search-status');
            const pinIndicator = document.getElementById('pin-indicator');
            
            // Show/hide PIN indicator
            if (pinIndicator) {
                if (isIndianPinCode(value)) {
                    pinIndicator.classList.remove('hidden');
                } else {
                    pinIndicator.classList.add('hidden');
                }
            }
            
            if (searchStatus) {
                if (isIndianPinCode(value)) {
                    searchStatus.classList.remove('hidden');
                    searchStatus.innerHTML = `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            <svg class="-ml-1 mr-1.5 h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Detected Indian PIN code format
                        </span>
                    `;
                } else if (isPostalCode(value)) {
                    searchStatus.classList.remove('hidden');
                    searchStatus.innerHTML = `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <svg class="-ml-1 mr-1.5 h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            Detected postal code format
                        </span>
                    `;
                } else if (value.length > 0) {
                    searchStatus.classList.remove('hidden');
                    searchStatus.innerHTML = `
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            <svg class="-ml-1 mr-1.5 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            Searching as city or address
                        </span>
                    `;
                } else {
                    searchStatus.classList.add('hidden');
                }
            }
        });
    }
    
    // Add loading indicator
    function showLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.remove('hidden');
        }
        
        // Hide initial message if it exists
        const initialMessage = document.querySelector('.initial-message');
        if (initialMessage) {
            initialMessage.classList.add('hidden');
        }
        
        // Hide search results if they are displayed
        const searchResults = document.querySelector('.search-results');
        if (searchResults && !searchResults.classList.contains('hidden')) {
            searchResults.classList.add('hidden');
        }
    }
      function hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
    
    // Animation on scroll for feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    
    function checkScroll() {
        featureCards.forEach(card => {
            const cardTop = card.getBoundingClientRect().top;
            const windowHeight = window.innerHeight;
            
            if (cardTop < windowHeight * 0.75) {
                card.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    }
    
    window.addEventListener('scroll', checkScroll);
    checkScroll(); // Check on page load

    // TomTom map error handler
    function handleTomTomError(error) {
        console.error('TomTom Maps error:', error);
        return `<div class="p-4 text-center">
            <p class="text-red-500">Error loading map: ${error.message || 'Unknown error'}</p>
            <p class="text-sm text-gray-500 mt-2">Please try again later or contact support.</p>
        </div>`;
    }    // Add markers to the map for POIs
    function addMarkersToMap(map, userLocation, pois) {
        try {
            // Create bounds to fit all markers
            const bounds = new tt.LngLatBounds();
            
            // Add marker for user location first - use a pin if it's a PIN code location
            const isUserLocationPinCode = userLocation.address && userLocation.address.includes('PIN Code:');
              // Create a custom marker element for PIN code locations
            let userMarkerOptions = { color: "#FF0000" }; // Default red marker
            
            if (isUserLocationPinCode) {
                // Create a custom marker for PIN code search
                const markerElement = document.createElement('div');
                markerElement.className = 'pin-code-marker';
                markerElement.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"></path>
                    </svg>
                `;
                userMarkerOptions = { element: markerElement };
            }
            
            const userMarker = new tt.Marker(userMarkerOptions)
                .setLngLat([userLocation.longitude, userLocation.latitude])
                .addTo(map);
                
            const userPopup = new tt.Popup({ offset: 35 })
                .setHTML(`
                    <div style="text-align: center;">
                        <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${isUserLocationPinCode ? 'PIN Code Location' : 'Your Location'}</h3>
                        <p style="margin: 5px 0; font-size: 12px;">${userLocation.address}</p>
                    </div>
                `);
                
            userMarker.setPopup(userPopup);
            bounds.extend([userLocation.longitude, userLocation.latitude]);
            
            // Add markers for each POI
            pois.forEach(poi => {
                // Use different color pins based on POI type
                const markerColor = poi.type === 'gyms' ? "#10B981" : "#3B82F6"; // Green for gyms, Blue for parks
                
                const marker = new tt.Marker({
                    color: markerColor
                })
                    .setLngLat([poi.position.lon, poi.position.lat])
                    .addTo(map);
                
                // Create popup with POI info
                const popup = new tt.Popup({ offset: 35 })
                    .setHTML(`
                        <div style="text-align: center;">
                            <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${poi.name}</h3>
                            <p style="margin: 5px 0; font-size: 12px;">${poi.address}</p>
                            <p style="margin: 0; font-size: 12px; color: #666;">${poi.distance} miles away</p>
                        </div>
                    `);
                
                marker.setPopup(popup);
                
                // Extend bounds to include this POI
                bounds.extend([poi.position.lon, poi.position.lat]);
            });
            
            // Fit map to show all markers with padding
            if (pois.length > 0) {
                // Only adjust bounds if we have POIs
                setTimeout(() => {
                    map.fitBounds(bounds, { 
                        padding: 50,
                        duration: 1000
                    });
                }, 100);
            }
            
            return bounds;
        } catch (error) {
            console.error("Error adding markers to map:", error);
            return null;
        }
    }
});
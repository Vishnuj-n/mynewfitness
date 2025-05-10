/**
 * API Key Validator for FitAi
 * This script checks if all required API keys are available and shows relevant warnings if not.
 */

document.addEventListener('DOMContentLoaded', function() {
  // Wait for env-preload and config to be processed
  setTimeout(checkApiKeys, 1000);
});

function checkApiKeys() {
  console.log('Checking API key availability...');
  
  // Get keys from various sources
  const groqKey = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.groq) || 
    (typeof window !== 'undefined' && window.__env && window.__env.GROQ_API_KEY) ||
    (typeof window !== 'undefined' && window.ENV && window.ENV.GROQ_API_KEY);
    
  const tomtomKey = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.tomtom) || 
    (typeof window !== 'undefined' && window.__env && window.__env.TOMTOM_API_KEY) ||
    (typeof window !== 'undefined' && window.ENV && window.ENV.TOMTOM_API_KEY);
    
  const serperKey = 
    (typeof window !== 'undefined' && window.FitAiConfig && window.FitAiConfig.apiKeys && window.FitAiConfig.apiKeys.serper) || 
    (typeof window !== 'undefined' && window.__env && window.__env.SERPER_API_KEY) ||
    (typeof window !== 'undefined' && window.ENV && window.ENV.SERPER_API_KEY);
  
  // Check each key
  const missingKeys = [];
  
  if (!groqKey) missingKeys.push('Groq API key (for AI chat functionality)');
  if (!tomtomKey) missingKeys.push('TomTom API key (for location services)');
  if (!serperKey) missingKeys.push('Serper API key (for search functionality)');
  
  // Only show warning if at least one key is missing
  if (missingKeys.length > 0) {
    showApiKeyWarning(missingKeys);
  }
}

function showApiKeyWarning(missingKeys) {
  // Create warning banner
  const banner = document.createElement('div');
  banner.className = 'fixed top-0 left-0 w-full bg-yellow-100 p-2 text-yellow-800 text-sm border-b border-yellow-200 z-50';
  
  const warningHTML = `
    <div class="container mx-auto flex items-center">
      <svg class="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
      </svg>
      <div>
        <span class="font-medium">Warning:</span> The following API keys are missing:
        <ul class="list-disc ml-5 mt-1">
          ${missingKeys.map(key => `<li>${key}</li>`).join('')}
        </ul>
        <p class="mt-1">Some features may not work correctly. Set up environment variables on your hosting platform.</p>
      </div>
      <button id="close-warning" class="ml-auto bg-yellow-200 hover:bg-yellow-300 rounded px-2 py-1 text-xs">Dismiss</button>
    </div>
  `;
  
  banner.innerHTML = warningHTML;
  document.body.prepend(banner);
  
  // Add event listener to close button
  document.getElementById('close-warning').addEventListener('click', function() {
    banner.remove();
  });
}

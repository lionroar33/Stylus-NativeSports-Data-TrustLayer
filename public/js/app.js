/**
 * Sport Performance Protocol - UI JavaScript
 * Phase 1 & Phase 2 - UI Interactions
 */

// ============================================
// Navigation & Sidebar
// ============================================
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.toggle('open');
  }
}

function setActiveNavItem(itemId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const activeItem = document.getElementById(itemId);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

// ============================================
// Form Validation
// ============================================
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePhone(phone) {
  const re = /^\+?[\d\s-]{10,}$/;
  return re.test(phone);
}

function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);

  if (input) {
    input.classList.add('form-input-error');
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);

  if (input) {
    input.classList.remove('form-input-error');
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
}

// ============================================
// OTP Input Handling
// ============================================
function initOTPInputs() {
  const otpInputs = document.querySelectorAll('.otp-input');

  otpInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value;

      // Only allow single digit
      if (value.length > 1) {
        e.target.value = value.slice(-1);
      }

      // Move to next input
      if (value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      // Move to previous input on backspace
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        otpInputs[index - 1].focus();
      }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').slice(0, 6);

      pastedData.split('').forEach((char, i) => {
        if (otpInputs[index + i]) {
          otpInputs[index + i].value = char;
        }
      });

      const nextIndex = Math.min(index + pastedData.length, otpInputs.length - 1);
      otpInputs[nextIndex].focus();
    });
  });
}

function getOTPValue() {
  const otpInputs = document.querySelectorAll('.otp-input');
  return Array.from(otpInputs).map(input => input.value).join('');
}

// ============================================
// Sport Selection
// ============================================
const selectedSports = new Set();

function toggleSportSelection(sportId) {
  const card = document.getElementById(`sport-${sportId}`);

  if (selectedSports.has(sportId)) {
    selectedSports.delete(sportId);
    card?.classList.remove('selected');
  } else {
    selectedSports.add(sportId);
    card?.classList.add('selected');
  }

  updateSelectedSportsCount();
}

function updateSelectedSportsCount() {
  const countEl = document.getElementById('selected-sports-count');
  if (countEl) {
    countEl.textContent = selectedSports.size;
  }
}

function getSelectedSports() {
  return Array.from(selectedSports);
}

// ============================================
// Skill Level Selection
// ============================================
const sportSkillLevels = {};

function selectSkillLevel(sportId, level) {
  sportSkillLevels[sportId] = level;

  // Update UI
  document.querySelectorAll(`[data-sport="${sportId}"] .skill-level`).forEach(el => {
    el.classList.remove('selected');
  });

  const selectedEl = document.querySelector(`[data-sport="${sportId}"] [data-level="${level}"]`);
  selectedEl?.classList.add('selected');
}

function getSkillLevels() {
  return sportSkillLevels;
}

// ============================================
// Onboarding Progress
// ============================================
let currentStep = 1;
const totalSteps = 8;

function goToStep(step) {
  if (step < 1 || step > totalSteps) return;

  // Hide current step
  document.getElementById(`step-${currentStep}`)?.classList.add('hidden');

  // Show new step
  document.getElementById(`step-${step}`)?.classList.remove('hidden');

  // Update progress circles
  for (let i = 1; i <= totalSteps; i++) {
    const circle = document.querySelector(`[data-step-circle="${i}"]`);
    const line = document.querySelector(`[data-step-line="${i}"]`);

    if (circle) {
      circle.classList.remove('active', 'completed');
      if (i < step) {
        circle.classList.add('completed');
      } else if (i === step) {
        circle.classList.add('active');
      }
    }

    if (line) {
      line.classList.remove('completed');
      if (i < step) {
        line.classList.add('completed');
      }
    }
  }

  currentStep = step;
}

function nextStep() {
  goToStep(currentStep + 1);
}

function prevStep() {
  goToStep(currentStep - 1);
}

// ============================================
// Image Upload Preview
// ============================================
function initImageUpload(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);

  if (!input || !preview) return;

  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
      };
      reader.readAsDataURL(file);
    }
  });
}

// ============================================
// Tab Navigation
// ============================================
function switchTab(tabGroup, tabId) {
  // Hide all tab contents
  document.querySelectorAll(`[data-tab-group="${tabGroup}"]`).forEach(content => {
    content.classList.add('hidden');
  });

  // Deactivate all tab buttons
  document.querySelectorAll(`[data-tab-button="${tabGroup}"]`).forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab content
  document.getElementById(tabId)?.classList.remove('hidden');

  // Activate selected tab button
  document.querySelector(`[data-tab-button="${tabGroup}"][data-tab="${tabId}"]`)?.classList.add('active');
}

// ============================================
// Alert/Toast Messages
// ============================================
function showAlert(message, type = 'info', duration = 5000) {
  const alertContainer = document.getElementById('alert-container') || createAlertContainer();

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:1.25rem;">&times;</button>
  `;

  alertContainer.appendChild(alert);

  if (duration > 0) {
    setTimeout(() => alert.remove(), duration);
  }
}

function createAlertContainer() {
  const container = document.createElement('div');
  container.id = 'alert-container';
  container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:1000;display:flex;flex-direction:column;gap:0.5rem;';
  document.body.appendChild(container);
  return container;
}

// ============================================
// Loading State
// ============================================
function setLoading(buttonId, isLoading) {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `
      <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="0.75"></path>
      </svg>
      Loading...
    `;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || button.innerHTML;
  }
}

// ============================================
// Country/State/City Cascading Dropdowns
// ============================================
const locationData = {
  'India': {
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi']
  },
  'United States': {
    'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
    'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
    'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio'],
    'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville']
  },
  'United Kingdom': {
    'England': ['London', 'Manchester', 'Birmingham', 'Liverpool'],
    'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
    'Wales': ['Cardiff', 'Swansea', 'Newport', 'Wrexham']
  },
  'Australia': {
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
    'Victoria': ['Melbourne', 'Geelong', 'Ballarat'],
    'Queensland': ['Brisbane', 'Gold Coast', 'Cairns']
  }
};

function populateCountries(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.innerHTML = '<option value="">Select Country</option>';
  Object.keys(locationData).forEach(country => {
    select.innerHTML += `<option value="${country}">${country}</option>`;
  });
}

function onCountryChange(countrySelectId, stateSelectId, citySelectId) {
  const country = document.getElementById(countrySelectId)?.value;
  const stateSelect = document.getElementById(stateSelectId);
  const citySelect = document.getElementById(citySelectId);

  if (!stateSelect || !citySelect) return;

  stateSelect.innerHTML = '<option value="">Select State</option>';
  citySelect.innerHTML = '<option value="">Select City</option>';

  if (country && locationData[country]) {
    Object.keys(locationData[country]).forEach(state => {
      stateSelect.innerHTML += `<option value="${state}">${state}</option>`;
    });
  }
}

function onStateChange(countrySelectId, stateSelectId, citySelectId) {
  const country = document.getElementById(countrySelectId)?.value;
  const state = document.getElementById(stateSelectId)?.value;
  const citySelect = document.getElementById(citySelectId);

  if (!citySelect) return;

  citySelect.innerHTML = '<option value="">Select City</option>';

  if (country && state && locationData[country]?.[state]) {
    locationData[country][state].forEach(city => {
      citySelect.innerHTML += `<option value="${city}">${city}</option>`;
    });
  }
}

// ============================================
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize OTP inputs if present
  if (document.querySelector('.otp-input')) {
    initOTPInputs();
  }

  // Initialize country dropdown if present
  if (document.getElementById('country')) {
    populateCountries('country');
  }

  // Initialize image upload if present
  if (document.getElementById('profile-image-input')) {
    initImageUpload('profile-image-input', 'profile-image-preview');
  }
});

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);

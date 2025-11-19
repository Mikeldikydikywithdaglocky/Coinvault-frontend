// API Base URL
const API_URL = 'https://unreplevisable-breathier-jenee.ngrok-free.dev/api';

// Password strength checker
function checkStrength() {
  const password = document.getElementById("password").value;
  const bar = document.getElementById("strength-bar");
  let strength = 0;
  
  if (password.match(/[a-z]+/)) strength++;
  if (password.match(/[A-Z]+/)) strength++;
  if (password.match(/[0-9]+/)) strength++;
  if (password.match(/[$@#&!]+/)) strength++;
  if (password.length > 7) strength++;

  let width = (strength / 5) * 100;
  bar.style.width = width + "%";
  
  if (strength <= 2) {
    bar.style.background = "red";
  } else if (strength === 3) {
    bar.style.background = "orange";
  } else {
    bar.style.background = "limegreen";
  }
}

// Register form validation and submission
async function validateRegister() {
  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;

  // Validation
  if (fullName.length < 2) {
    showNotification("Please enter your full name.", "error");
    return;
  }
  if (!email.match(emailPattern)) {
    showNotification("Please enter a valid email address.", "error");
    return;
  }
  if (password.length < 6) {
    showNotification("Password must be at least 6 characters long.", "error");
    return;
  }
  if (password !== confirmPassword) {
    showNotification("Passwords do not match.", "error");
    return;
  }

  // Show loading state
  const registerBtn = document.querySelector('.btn');
  const originalText = registerBtn.innerHTML;
  registerBtn.innerHTML = 'Creating Account...';
  registerBtn.disabled = true;

  try {
    // ✅ Updated with your ngrok API URL
    const API_URL = 'https://unreplevisable-breathier-jenee.ngrok-free.dev/api';

    // ✅ Corrected fetch request to match backend route
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullName,
        email,
        password
      })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showNotification("Account created successfully! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showNotification(data.message || "Registration failed. Please try again.", "error");
      registerBtn.innerHTML = originalText;
      registerBtn.disabled = false;
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification("Network error. Please check your connection.", "error");
    registerBtn.innerHTML = originalText;
    registerBtn.disabled = false;
  }
}


// Show notification
function showNotification(message, type) {
  // Remove any existing notifications
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    ${type === 'success' ? 'background: linear-gradient(90deg, #10b981, #059669);' : 'background: linear-gradient(90deg, #ef4444, #dc2626);'}
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Check if user is already logged in
if (localStorage.getItem('token')) {
  window.location.href = 'index.html';
}
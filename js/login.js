// API Base URL
const API_URL = 'https://https://unreplevisable-breathier-jenee.ngrok-free.dev/api';

// Login form validation and submission
async function validateLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const rememberMe = document.getElementById("rememberMe").checked;

  const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;

  // Validation
  if (!email.match(emailPattern)) {
    showNotification("Please enter a valid email address.", "error");
    return;
  }
  if (password.length < 6) {
    showNotification("Password must be at least 6 characters.", "error");
    return;
  }

  // Show loading state
  const loginBtn = document.querySelector('.btn');
  const originalText = loginBtn.innerHTML;
  loginBtn.innerHTML = 'Signing in...';
  loginBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      // Store token
      localStorage.setItem('token', data.token);
      
      // Store user data
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Remember me functionality
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }

      showNotification("Login successful! Redirecting...", "success");
      
      // Redirect to dashboard after 1 second
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showNotification(data.message || "Login failed. Please try again.", "error");
      loginBtn.innerHTML = originalText;
      loginBtn.disabled = false;
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification("Network error. Please check your connection.", "error");
    loginBtn.innerHTML = originalText;
    loginBtn.disabled = false;
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
/**
 * Demo SUT (System Under Test)
 * Simple web application for demonstrating Playwright parameterized testing
 */

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';

// Simple user database (in-memory for demo)
const users = new Map<string, { name: string; tier: 'free' | 'paid'; password: string }>();

// Initialize demo users
users.set('user@free.com', { name: 'Free User', tier: 'free', password: 'password123' });
users.set('user@paid.com', { name: 'Paid User', tier: 'paid', password: 'password123' });

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // Serve HTML pages based on route
    if (url.pathname === '/' || url.pathname === '/login') {
      return new Response(getLoginPage(), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (url.pathname === '/dashboard') {
      // Check for user cookie/session
      const cookies = req.headers.get('Cookie') || '';
      const userEmail = cookies.match(/user=([^;]+)/)?.[1];

      if (!userEmail) {
        return new Response('Unauthorized', { status: 401 });
      }

      const user = users.get(decodeURIComponent(userEmail));
      if (!user) {
        return new Response('User not found', { status: 404 });
      }

      return new Response(getDashboardPage(user), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    // Handle login POST
    if (url.pathname === '/api/login' && req.method === 'POST') {
      const body = await req.json();
      const { email, password } = body;

      const user = users.get(email);
      if (user && user.password === password) {
        return new Response(JSON.stringify({ success: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `user=${encodeURIComponent(email)}; Path=/; HttpOnly`,
          },
        });
      }

      return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', environment: ENV }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`🚀 Demo SUT running on http://localhost:${PORT}`);
console.log(`📊 Environment: ${ENV}`);
console.log(`👤 Test users: user@free.com, user@paid.com (password: password123)`);

function getLoginPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Demo App</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
    input { width: 100%; padding: 10px; margin: 10px 0; box-sizing: border-box; }
    button { width: 100%; padding: 12px; background: #0066cc; color: white; border: none; cursor: pointer; }
    button:hover { background: #0052a3; }
    .error { color: red; margin: 10px 0; }
    .env-badge { background: #f0f0f0; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="env-badge">Environment: ${ENV}</div>
  <h1>Login</h1>
  <form id="loginForm">
    <input type="email" id="email" name="email" placeholder="Email" required value="user@free.com">
    <input type="password" id="password" name="password" placeholder="Password" required value="password123">
    <button type="submit">Login</button>
    <div id="error" class="error"></div>
  </form>

  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (data.success) {
          window.location.href = '/dashboard';
        } else {
          document.getElementById('error').textContent = data.error || 'Login failed';
        }
      } catch (error) {
        document.getElementById('error').textContent = 'Network error';
      }
    });
  </script>
</body>
</html>`;
}

function getDashboardPage(user: { name: string; tier: 'free' | 'paid' }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Demo App</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
    .user-info { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .tier-badge {
      padding: 5px 15px;
      border-radius: 4px;
      display: inline-block;
      background: ${user.tier === 'paid' ? '#4CAF50' : '#9E9E9E'};
      color: white;
      font-weight: bold;
    }
    .feature-list { list-style: none; padding: 0; }
    .feature-list li { padding: 10px; margin: 5px 0; background: #f9f9f9; border-left: 3px solid #0066cc; }
    .premium-only { opacity: ${user.tier === 'paid' ? '1' : '0.5'}; }
  </style>
</head>
<body>
  <h1>Dashboard</h1>
  <div class="user-info">
    <h2 id="userName">${user.name}</h2>
    <p>Tier: <span class="tier-badge" id="userTier">${user.tier}</span></p>
  </div>

  <h3>Available Features</h3>
  <ul class="feature-list">
    <li>✓ Basic Dashboard Access</li>
    <li>✓ View User Profile</li>
    <li class="premium-only">${user.tier === 'paid' ? '✓' : '✗'} Premium Analytics</li>
    <li class="premium-only">${user.tier === 'paid' ? '✓' : '✗'} Advanced Reports</li>
    <li class="premium-only">${user.tier === 'paid' ? '✓' : '✗'} Priority Support</li>
  </ul>

  <p><a href="/login">Logout</a></p>
</body>
</html>`;
}

import { type BunRequest, serve } from 'bun'
import { CONFIG } from '../../CONFIG.ts'
import {
  assertIsTestableEnvironment,
  isTestableEnvironment,
  type TestableEnvironment,
  testableEnvironments,
  type UserTier,
  userTiers,
} from '../types.ts'

// Define types for user and session objects
type User = {
  username: string
  password: string
  tier: UserTier
}

type Session = {
  username: string
  expires: number
  tier: UserTier
}

// Structure users by environment and maintain tier information
const users: Map<TestableEnvironment, Map<User['username'], User>> = new Map()

// Initialize user storage for each environment
for (const env of testableEnvironments) {
  users.set(env, new Map())
}

const sessions: Map<TestableEnvironment, Map<string, Session>> = new Map()

// Initialize session storage for each environment
for (const env of testableEnvironments) {
  sessions.set(env, new Map())
}

const server = serve({
  hostname: CONFIG.host,
  port: CONFIG.port,
  development: true,
  routes: {
    '/': async (_req) => Response.redirect('/production/'),
    '/:env/': async (req) => handleHome(req),
    '/:env/login/': async (req) => handleLogin(req),
    '/:env/register': async (req) => handleRegister(req),
    '/:env/logout': async (req) => handleLogout(req),
    '/:env/profile': async (req) => handleProfile(req),
  },
  fetch(req) {
    const url = new URL(req.url)
    const path = url.pathname
    return new Response(`Path ${path} Not Found`, { status: 404 })
  },
})

console.log(`Server running at http://localhost:${server.port}`)

// Helper function to validate environment
function validateEnvironment(env: string): Response | null {
  if (!isTestableEnvironment(env)) {
    return new Response(`Invalid environment: ${env}`, { status: 404 })
  }
  return null
}

async function handleHome(req: BunRequest<'/:env/'>): Promise<Response> {
  const { env } = req.params
  const envError = validateEnvironment(env)
  if (envError) return envError
  assertIsTestableEnvironment(env)

  // Get session from cookies
  const cookies = parseCookies(req.headers.get('cookie') ?? '')
  const sessionId = cookies.sessionId

  const pageContent = isValidSession(env, sessionId)
    ? generateAuthenticatedContent(env, sessionId)
    : generateUnauthenticatedContent(env)

  const capitalizedEnv = capitalizeFirstLetter(env)
  const pageTitle = `${capitalizedEnv} Environment`

  return new Response(htmlTemplate(pageTitle, pageContent), {
    headers: { 'Content-Type': 'text/html' },
  })
}

function generateAuthenticatedContent(env: TestableEnvironment, sessionId: ValidSessionId): string {
  const session = sessions.get(env)?.get(sessionId)
  const username = session?.username ?? ''
  const tier = session?.tier ?? ''

  return `
            <h1>Welcome to ${env} environment</h1>
            <p>Hello, ${username} (${tier} tier)</p>
            <a href="/${env}/profile">Profile</a>
            <a href="/${env}/logout">Logout</a>
        `
}

function generateUnauthenticatedContent(env: TestableEnvironment): string {
  return `
            <h1>Welcome to ${env} environment</h1>
            <p>Please <a href="/${env}/login/">login</a> or <a href="/${env}/register">register</a></p>
        `
}

function capitalizeFirstLetter(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

async function handleLogin(req: BunRequest<'/:env/login/'>): Promise<Response> {
  const { env } = req.params
  assertIsTestableEnvironment(env)
  const envError = validateEnvironment(env)
  if (envError) return envError

  if (req.method === 'GET') {
    const content = `
            <h1>Login to ${env}</h1>
            <form action="/${env}/login/" method="POST">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
                <br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                <br>
                <button type="submit">Login</button>
            </form>
        `
    return new Response(htmlTemplate(`Login to ${env}`, content), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const formData = await req.formData()
  const username = formData.get('username')
  const password = formData.get('password')

  if (!username || !password) {
    return new Response('Missing username or password', { status: 400 })
  }
  assertIsString(username)

  const user = users.get(env)?.get(username)
  if (user && user.password === password) {
    // Create session
    const sessionId = generateSessionId()
    // Session expires after 24 hours
    const expiryTime = Date.now() + 24 * 60 * 60 * 1000
    sessions.get(env)?.set(sessionId, {
      username: username.toString(),
      expires: expiryTime,
      tier: user.tier,
    })

    // Redirect to environment home with session cookie
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/${env}/`,
        'Set-Cookie': `sessionId=${sessionId}; Path=/; HttpOnly; Max-Age=${24 * 60 * 60}`,
      },
    })
  }
  const content = `
            <h1>Login Failed</h1>
            <p>Invalid credentials</p>
            <a href="/${env}/login/">Try again</a>
        `
  return new Response(htmlTemplate('Login Failed', content), {
    headers: { 'Content-Type': 'text/html' },
  })
}

async function handleRegister(req: BunRequest<'/:env/register'>): Promise<Response> {
  const { env } = req.params
  const envError = validateEnvironment(env)
  if (envError) return envError
  assertIsTestableEnvironment(env)

  if (req.method === 'GET') {
    const content = `
            <h1>Register for ${env}</h1>
            <form action="/${env}/register" method="POST">
                <label for="username">Username:</label>
                <input type="text" id="username" name="username" required>
                <br>
                <label for="password">Password:</label>
                <input type="password" id="password" name="password" required>
                <br>
                <label for="tier">User Tier:</label>
                <select id="tier" name="tier" required>
                    ${userTiers.map((tier) => `<option value="${tier}">${tier}</option>`).join('')}
                </select>
                <br>
                <button type="submit">Register</button>
            </form>
        `
    return new Response(htmlTemplate(`Register for ${env}`, content), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const formData = await req.formData()
  const username = formData.get('username')
  assertIsString(username)
  const password = formData.get('password')
  assertIsString(password)
  const tier = formData.get('tier')
  assertIsString(tier)

  if (!username || !password) {
    return new Response('Missing username or password', { status: 400 })
  }

  if (!tier || !userTiers.includes(tier as UserTier)) {
    return new Response('Invalid user tier', { status: 400 })
  }

  if (users.get(env)?.has(username)) {
    const content = `
            <h1>Registration Failed</h1>
            <p>Username already exists</p>
            <a href="/${env}/register">Try again</a>
        `
    return new Response(htmlTemplate('Registration Failed', content), {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  // Create user with tier
  users.get(env)?.set(username, {
    username,
    password,
    tier: tier as UserTier,
  })

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${env}/login/`,
    },
  })
}

async function handleLogout(req: BunRequest<'/:env/logout'>): Promise<Response> {
  const { env } = req.params
  const envError = validateEnvironment(env)
  if (envError) return envError

  // Clear the session cookie
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${env}/`,
      'Set-Cookie': 'sessionId=; Path=/; HttpOnly; Max-Age=0',
    },
  })
}

async function handleProfile(req: BunRequest<'/:env/profile'>): Promise<Response> {
  const { env } = req.params
  const envError = validateEnvironment(env)
  if (envError) return envError
  assertIsTestableEnvironment(env)

  const cookies = parseCookies(req.headers.get('cookie') ?? '')
  const sessionId = cookies.sessionId

  if (
    !sessionId ||
    !sessions.get(env)?.has(sessionId) ||
    (sessions.get(env)?.get(sessionId)?.expires ?? 0) <= Date.now()
  ) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/${env}/login/`,
      },
    })
  }

  const session = sessions.get(env)?.get(sessionId)
  const username = session?.username ?? ''
  const tier = session?.tier ?? ''

  const content = `
        <h1>User Profile (${env})</h1>
        <p>Username: ${username}</p>
        <p>User Tier: ${tier}</p>
        <a href="/${env}/">Back to Home</a>
    `

  return new Response(htmlTemplate('User Profile', content), {
    headers: { 'Content-Type': 'text/html' },
  })
}

// Helper function to generate a session ID
function generateSessionId(): string {
  return Bun.randomUUIDv7()
}

// Helper function to parse cookies
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim().split('=') as [string, string])
    .reduce(
      (acc, [name, value]) => {
        if (name) {
          acc[name] = value
        }
        return acc
      },
      {} as Record<string, string>
    )
}

// HTML template helper function
function htmlTemplate(title: string, content: string, username?: string): string {
  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                a {
                    margin-right: 15px;
                }
            </style>
        </head>
        <body>
           ${createNavBar(username)}
        <div style="padding: 20px;">
            ${content}
        </div>
        </body>
        </html>
    `
}

function createNavBar(username?: string): string {
  const authLinks = username
    ? `<li><a href="/profile">Profile (${username})</a></li><li><a href="/logout">Logout</a></li>`
    : `<li><a href="/login">Login</a></li><li><a href="/register">Register</a></li>`

  return `
    <nav>
        <ul style="display: flex; list-style: none; gap: 20px; padding: 10px; background-color: #f0f0f0;">
            <li><a href="/">Home</a></li>
            ${authLinks}
        </ul>
    </nav>`
}

function assertIsString(x: unknown): asserts x is string {
  if (typeof x !== 'string') {
    throw new Error('Expected a string')
  }
}

type Brand<K, T> = K & { __brand: T }

type ValidSessionId = Brand<string, 'ValidSessionId'>

function isValidSession(env: TestableEnvironment, sessionId: unknown): sessionId is ValidSessionId {
  if (!sessionId) return false
  if (typeof sessionId !== 'string') return false

  const envSessions = sessions.get(env)
  if (!envSessions?.has(sessionId)) return false

  const sessionExpiration = envSessions.get(sessionId)?.expires ?? 0
  return sessionExpiration > Date.now()
}

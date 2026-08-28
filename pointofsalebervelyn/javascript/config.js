// Use the local API during development and same-origin API routes on Vercel.
const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
window.NEXATILL_API_URL = isLocalDevelopment ? 'http://localhost:3000' : window.location.origin;
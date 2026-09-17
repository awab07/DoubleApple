import api from './client'

export function register({ firstname, lastname, email, password, phno, gender }) {
  return api.post('/Api/register', { firstname, lastname, email, password, phno, gender }).then((r) => r.data)
}

export function login(email, password) {
  return api.post('/Api/login', { email, password }).then((r) => r.data)
}

export function verifyOtp(email, otp) {
  return api.post('/Api/verify', { email, otp }).then((r) => r.data)
}

export function reverify(email) {
  return api.post('/Api/reverify', { email }).then((r) => r.data)
}

export function logout() {
  return api.post('/Api/logout').then((r) => r.data)
}

export function getProfile() {
  // No trailing slash: Vercel's rewrite for /Api/:path* doesn't match a bare
  // "/Api/" with an empty path segment, so it silently fell through to the
  // SPA's index.html instead of reaching the backend.
  return api.get('/Api').then((r) => r.data)
}

export function updateProfile(payload) {
  return api.put('/Api/update', payload).then((r) => r.data)
}

export function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/Api/avatar', formData).then((r) => r.data)
}

export function removeAvatar() {
  return api.delete('/Api/avatar').then((r) => r.data)
}

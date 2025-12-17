import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't automatically logout on 401 - let components handle auth errors
    return Promise.reject(error)
  }
)

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (userData) => api.post('/auth/signup', userData),
  verify: () => api.post('/auth/verify')
}

// Properties API calls
export const propertiesAPI = {
  search: (locality) => api.get(`/properties/search?locality=${encodeURIComponent(locality)}`),
  getById: (id) => api.get(`/properties/${id}`),
  getByOwner: (ownerId) => api.get(`/properties/owner/${ownerId}`),
  create: (propertyData) => api.post('/properties', propertyData),
  getAll: () => api.get('/properties')
}

// Rentals API calls
export const rentalsAPI = {
  getHistory: (propertyId) => api.get(`/rentals/history/${propertyId}`),
  getTenant: (propertyId) => api.get(`/rentals/tenant/${propertyId}`),
  create: (rentalData) => api.post('/rentals', rentalData),
  endRental: (rentalData) => api.put('/rentals/end', rentalData),
  getAll: () => api.get('/rentals'),
  getTenantActive: () => api.get('/rentals/tenant-active'),
  getOwnerActive: () => api.get('/rentals/owner-active')
}

// Rental Requests API calls
export const rentalRequestsAPI = {
  create: (data) => api.post('/rental-requests', data),
  getAll: () => api.get('/rental-requests'),
  getById: (id) => api.get(`/rental-requests/${id}`),
  approve: (id) => api.put(`/rental-requests/${id}/approve`),
  reject: (id, { reason } = {}) => api.put(`/rental-requests/${id}/reject`, { reason })
}

// Users API calls
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  getAll: () => api.get('/users'),
  getOwners: () => api.get('/users/owners'),
  getTenants: () => api.get('/users/tenants'),
  getManagers: () => api.get('/users/managers')
}

// Notifications API calls
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/mark-read/${id}`)
}

// Audit Logs API calls
export const logsAPI = {
  getAll: (params = {}) => api.get('/logs', { params })
}

export default api

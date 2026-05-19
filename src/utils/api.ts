import axios from 'axios'

export const api = axios.create({
    baseURL: (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error: unknown) => {
        return Promise.reject(error)
    }
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login?reason=session_expired'
            }
        }
        return Promise.reject(error)
    }
)


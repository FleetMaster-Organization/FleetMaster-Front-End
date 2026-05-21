import axios from 'axios'

export const api = axios.create({
    // /api is proxied server-side in all environments:
    // - Dev:  Vite proxy (vite.config.ts)
    // - Prod: Netlify proxy redirect (netlify.toml)
    baseURL: '/api',
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

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
    refreshSubscribers.push(cb)
}

function onRefreshed(token: string) {
    refreshSubscribers.forEach((cb) => cb(token))
    refreshSubscribers = []
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url?.includes('/auth/refresh')) {
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?reason=session_expired'
                }
                return Promise.reject(error)
            }

            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
                originalRequest._retry = true

                if (!isRefreshing) {
                    isRefreshing = true
                    try {
                        const refreshRes = await axios.post(
                            `${api.defaults.baseURL}/auth/refresh`,
                            {},
                            {
                                headers: {
                                    'Refresh-Token': refreshToken,
                                    'Content-Type': 'application/json',
                                },
                            }
                        )
                        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshRes.data
                        localStorage.setItem('token', newAccessToken)
                        localStorage.setItem('refreshToken', newRefreshToken)

                        isRefreshing = false
                        onRefreshed(newAccessToken)
                    } catch (refreshErr) {
                        isRefreshing = false
                        refreshSubscribers = []
                        localStorage.removeItem('token')
                        localStorage.removeItem('refreshToken')
                        localStorage.removeItem('user')
                        if (!window.location.pathname.includes('/login')) {
                            window.location.href = '/login?reason=session_expired'
                        }
                        return Promise.reject(refreshErr)
                    }
                }

                return new Promise((resolve) => {
                    subscribeTokenRefresh((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`
                        resolve(api(originalRequest))
                    })
                })
            } else {
                localStorage.removeItem('token')
                localStorage.removeItem('refreshToken')
                localStorage.removeItem('user')
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login?reason=session_expired'
                }
            }
        }
        return Promise.reject(error)
    }
)

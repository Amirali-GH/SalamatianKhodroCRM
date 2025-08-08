import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

const instance = axios.create({
    baseURL: API_BASE,
    timeout: 15000
})

// interceptor to add Authorization header automatically
instance.interceptors.request.use(cfg => {
    const token = localStorage.getItem('token')
    if (token) cfg.headers['Authorization'] = 'Bearer ' + token
    return cfg
}, err => Promise.reject(err))

export default instance

import React, { useState } from 'react'
import { Box, Paper, TextField, Button, Typography } from '@mui/material'
import api from '../api/axios'

export default function LoginForm({ onLogin }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const submit = async (e) => {
        e?.preventDefault()
        setLoading(true)
        try {
            const resp = await api.post('/api/auth/login', { email, password })
            // فرض: پاسخ شامل { token: "..." }
            if (resp.data && resp.data.token) {
                onLogin(resp.data.token)
            } else {
                alert('خطا: پاسخ نامعتبر از سرور')
            }
        } catch (err) {
            console.error(err)
            alert('خطا در ورود: ' + (err?.response?.data?.message || err.message))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <Paper sx={{ p: 4, width: 420 }} elevation={3}>
                <Typography variant="h6" gutterBottom>ورود به پنل شعبه</Typography>
                <form onSubmit={submit}>
                    <TextField fullWidth sx={{ mb: 2 }} label="ایمیل" value={email} onChange={e => setEmail(e.target.value)} />
                    <TextField fullWidth sx={{ mb: 2 }} label="رمز عبور" type="password" value={password} onChange={e => setPassword(e.target.value)} />
                    <Button variant="contained" color="primary" fullWidth type="submit" disabled={loading}>
                        {loading ? 'در حال ورود...' : 'ورود'}
                    </Button>
                </form>
            </Paper>
        </Box>
    )
}

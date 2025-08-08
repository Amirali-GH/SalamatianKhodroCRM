import React, { useState, useEffect } from 'react'
import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Button from '@mui/material/Button'
import UploadComponent from './components/UploadComponent'
import LeadsTable from './components/LeadsTable'
import LoginForm from './components/LoginForm'
import api from './api/axios'

export default function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || null)
    const [agentId] = useState(import.meta.env.VITE_AGENT_ID || 'agent-1')
    const [refreshLeads, setRefreshLeads] = useState(false)

    useEffect(() => {
        // simple token validity check (optional)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('token')
        setToken(null)
    }

    if (!token) {
        return <LoginForm onLogin={(tok) => { localStorage.setItem('token', tok); setToken(tok); }} />
    }

    return (
        <>
            <AppBar position="static" color="primary">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>پنل شعبه</Typography>
                    <Button color="inherit" onClick={handleLogout}>خروج</Button>
                </Toolbar>
            </AppBar>

            <Container className="app-container">
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h5" gutterBottom>بارگذاری فایل اکسل</Typography>
                    <UploadComponent onUploaded={() => setRefreshLeads(p => !p)} agentId={agentId} />
                </Box>

                <Box sx={{ mt: 4 }}>
                    <Typography variant="h5" gutterBottom>مشتریان تخصیص‌یافته</Typography>
                    <LeadsTable refreshToggle={refreshLeads} agentId={agentId} />
                </Box>
            </Container>
        </>
    )
}

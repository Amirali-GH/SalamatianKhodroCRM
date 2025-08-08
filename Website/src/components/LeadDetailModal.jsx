import React, { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, TextField } from '@mui/material'
import api from '../api/axios'

export default function LeadDetailModal({ open, leadId, onClose }) {
    const [lead, setLead] = useState(null)
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && leadId) {
            fetchLead()
        } else {
            setLead(null); setNote('')
        }
    }, [open, leadId])

    async function fetchLead() {
        setLoading(true)
        try {
            const r = await api.get(`/api/leads/${leadId}`)
            setLead(r.data)
        } catch (e) {
            alert('خطا در دریافت جزئیات')
        } finally {
            setLoading(false)
        }
    }

    async function saveResult() {
        try {
            await api.post(`/api/leads/${leadId}/result`, { resultCode: 'note', note, contactedAt: new Date().toISOString() })
            alert('ثبت شد')
            onClose()
        } catch (e) {
            alert('خطا در ثبت')
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>جزئیات مشتری</DialogTitle>
            <DialogContent dividers>
                {lead ? (
                    <>
                        <Typography>تلفن: {lead.phone}</Typography>
                        <Typography>نام: {lead.firstName} {lead.lastName}</Typography>
                        <Typography>وضعیت: {lead.status}</Typography>
                        <TextField fullWidth multiline rows={4} sx={{ mt: 2 }} label="یادداشت" value={note} onChange={e => setNote(e.target.value)} />
                    </>
                ) : <Typography>در حال بارگذاری...</Typography>}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>بستن</Button>
                <Button variant="contained" onClick={saveResult}>ثبت نتیجه</Button>
            </DialogActions>
        </Dialog>
    )
}

import React, { useEffect, useState } from 'react'
import { Paper, Table, TableHead, TableRow, TableCell, TableBody, Checkbox, TableContainer, TextField, Button, Box, Pagination } from '@mui/material'
import api from '../api/axios'
import XLSX from 'xlsx'
import LeadDetailModal from './LeadDetailModal'

export default function LeadsTable({ agentId, refreshToggle }) {
    const [rows, setRows] = useState([])
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState(new Set())
    const [loading, setLoading] = useState(false)
    const [detailId, setDetailId] = useState(null)

    useEffect(() => { loadLeads(page, search) }, [page, refreshToggle])

    async function loadLeads(p = 1, q = '') {
        setLoading(true)
        try {
            const resp = await api.get('/api/leads/assigned', { params: { agentId, page: p, pageSize: 25, search: q } })
            setRows(resp.data.data || [])
            // فرض: سرور totalPages برمی‌گرداند
            setTotalPages(Math.ceil((resp.data.total || resp.data.data.length) / 25))
        } catch (err) {
            alert('خطا در دریافت لیست: ' + (err?.response?.data?.message || err.message))
        } finally {
            setLoading(false)
        }
    }

    function toggleSelect(id) {
        const ns = new Set(selected)
        if (ns.has(id)) ns.delete(id) else ns.add(id)
        setSelected(ns)
    }

    async function exportSelected() {
        if (selected.size === 0) {
            // export all current rows
            exportToExcel(rows)
        } else {
            const filtered = rows.filter(r => selected.has(r.leadId))
            exportToExcel(filtered)
        }
    }

    function exportToExcel(data) {
        const ws = XLSX.utils.json_to_sheet(data.map(r => ({
            phone: r.phone, firstName: r.firstName, lastName: r.lastName, status: r.status, assignedAt: r.assignedAt
        })))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Leads')
        XLSX.writeFile(wb, `leads_export_${Date.now()}.xlsx`)
    }

    async function markContacted(id) {
        try {
            await api.post(`/api/leads/${id}/result`, { resultCode: 'contacted', note: 'تماس از پنل', contactedAt: new Date().toISOString() })
            alert('نتیجه ثبت شد')
            loadLeads(page, search)
        } catch (err) {
            alert('خطا در ثبت نتیجه: ' + (err?.message || ''))
        }
    }

    return (
        <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField placeholder="جستجو..." size="small" value={search} onChange={e => setSearch(e.target.value)} />
                <Button variant="contained" onClick={() => loadLeads(1, search)}>جستجو</Button>
                <Button variant="outlined" onClick={() => exportSelected()}>خروجی اکسل</Button>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell>تلفن</TableCell>
                            <TableCell>نام</TableCell>
                            <TableCell>وضعیت</TableCell>
                            <TableCell>تخصیص</TableCell>
                            <TableCell>آخرین تماس</TableCell>
                            <TableCell>عملیات</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map(r => (
                            <TableRow key={r.leadId} hover>
                                <TableCell><Checkbox checked={selected.has(r.leadId)} onChange={() => toggleSelect(r.leadId)} /></TableCell>
                                <TableCell>{r.phone}</TableCell>
                                <TableCell>{r.firstName} {r.lastName}</TableCell>
                                <TableCell>{r.status}</TableCell>
                                <TableCell>{r.assignedAt}</TableCell>
                                <TableCell>{r.lastContact || '-'}</TableCell>
                                <TableCell>
                                    <Button size="small" onClick={() => setDetailId(r.leadId)}>جزئیات</Button>
                                    <Button size="small" onClick={() => markContacted(r.leadId)}>تماس زده شد</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} />
            </Box>

            <LeadDetailModal open={!!detailId} leadId={detailId} onClose={() => setDetailId(null)} />
        </Paper>
    )
}

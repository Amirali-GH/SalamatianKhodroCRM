import React, { useState, useRef } from 'react'
import { Paper, Box, Button, Typography, LinearProgress } from '@mui/material'
import XLSX from 'xlsx'
import api from '../api/axios'

export default function UploadComponent({ agentId, onUploaded }) {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [progress, setProgress] = useState(0)
    const inputRef = useRef()

    const REQUIRED = ['Phone', 'FirstName', 'LastName']

    const handleFile = (f) => {
        if (!f) return
        if (f.size > 10 * 1024 * 1024) { alert('حجم فایل بیش از 10MB است'); return }
        setFile(f)
        // preview via SheetJS
        const reader = new FileReader()
        reader.onload = (e) => {
            const wb = XLSX.read(e.target.result, { type: 'array' })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
            const header = Object.keys(json[0] || {})
            const missing = REQUIRED.filter(c => !header.includes(c))
            setPreview({ rows: json.length, sample: json.slice(0, 3), missing })
        }
        reader.readAsArrayBuffer(f)
    }

    const onDrop = (ev) => {
        ev.preventDefault()
        const f = ev.dataTransfer.files[0]
        handleFile(f)
    }

    const onUpload = () => {
        if (!file) { alert('فایل انتخاب نشده'); return }
        // بهتر است server نیز اعتبارسنجی کند
        const fd = new FormData()
        fd.append('file', file)
        fd.append('branchId', agentId)
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/uploads', true)
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const p = Math.round((e.loaded / e.total) * 100)
                setProgress(p)
            }
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const r = JSON.parse(xhr.responseText)
                    alert('آپلود موفق: ' + (r.message || 'فایل ارسال شد'))
                    onUploaded && onUploaded()
                } catch (e) {
                    alert('آپلود با موفقیت اما پاسخ سرور قابل خواندن نبود')
                }
            } else {
                alert('خطا در آپلود: ' + xhr.statusText)
            }
            setProgress(0)
        }
        xhr.onerror = () => { alert('خطا در ارسال فایل'); setProgress(0) }
        xhr.send(fd)
    }

    return (
        <Paper sx={{ p: 2 }}>
            <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="drop-area"
            >
                <Typography>فایل اکسل را اینجا رها کنید یا از دکمهٔ انتخاب فایل استفاده کنید.</Typography>
                <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                <Box sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => inputRef.current.click()}>انتخاب فایل</Button>
                    <Button sx={{ mr: 1 }} variant="contained" onClick={onUpload} disabled={!file}>آپلود</Button>
                </Box>

                {preview && (
                    <Box sx={{ mt: 2, textAlign: 'left' }}>
                        {preview.missing && preview.missing.length > 0 ? (
                            <Typography color="error">ستون‌های ضروری fehlen: {preview.missing.join(', ')}</Typography>
                        ) : (
                            <>
                                <Typography>تعداد ردیف: {preview.rows}</Typography>
                                <Box sx={{ mt: 1 }}>
                                    {preview.sample.map((r, i) => <div key={i}>{r.Phone} — {r.FirstName} {r.LastName}</div>)}
                                </Box>
                            </>
                        )}
                    </Box>
                )}

                {progress > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress variant="determinate" value={progress} />
                        <Typography sx={{ mt: 1 }}>{progress}%</Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    )
}

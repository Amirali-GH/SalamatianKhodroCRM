function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    this.classList.add('active');
}

function unhighlight() {
    this.classList.remove('active');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/vnd.ms-excel' || 
            file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            // هدایت به صفحه آپلود
            if (typeof loadPage === 'function') {
                loadPage('upload');
            }
        } else {
            alert('لطفا فقط فایل اکسل آپلود کنید.');
        }
    }
}

// مقداردهی اولیه داشبورد
function initDashboard() {
    const dropArea = document.getElementById('dashboard-drop-area');
    const fileInput = document.getElementById('dashboard-file-input');
    
    if (dropArea && fileInput) {
        // مدیریت کشیدن و رها کردن فایل
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        dropArea.addEventListener('drop', handleDrop, false);
        dropArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function() {
            handleFiles(this.files);
        });
    }
}

// فراخوانی تابع مقداردهی اولیه
initDashboard();
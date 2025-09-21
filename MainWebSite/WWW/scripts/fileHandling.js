import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

export function handleFile(file) {
    if (!file) return;
    
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        alert('لطفاً یک فایل اکسل معتبر انتخاب کنید (فرمت‌های مجاز: .xlsx, .xls)');
        return;
    }
    else{
        currentState.currentExcel_FileName = file.name;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('حجم فایل نباید بیشتر از 10 مگابایت باشد');
        return;
    }
    else{
        currentState.currentExcel_FileSize = file.size;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // داده خام با ستون‌های فارسی - همه مقادیر را به صورت رشته دریافت می‌کنیم
        let rawData = XLSX.utils.sheet_to_json(worksheet, { 
            defval: "",
            raw: false // این گزینه باعث می‌شود همه مقادیر به صورت رشته برگردانده شوند
        });

        if (rawData.length === 0) {
            alert("فایل اکسل خالی است.");
            return;
        }

        // مپینگ ستون‌های فارسی به کلیدهای سه‌حرفی
        const columnMap = {
            "شماره تماس": "phn",
            "نام و نام خانوادگی": "fnm",
            "کدملی": "ncd",
            "خودرو درخواستی": "rcr",
            "شعبه": "brn",
            "کارشناس تماس گیرنده": "agt",
            "آخرین تماس": "lcn",
            "مراحل تغییر حالت": "scs",
            "وضعیت مشتری": "cst",
            "توضیحات 1": "ds1",
            "توضیحات 2": "ds2",
            "توضیحات 3": "ds3",
            "پتانسیل مشتری شدن": "ptn",
            "راه ارتباطی با مجموعه": "cch",
            "نام کمپین": "cmp"
        };

        // ساخت داده جدید با کلیدهای سه‌حرفی - اطمینان از رشته بودن همه مقادیر
        let mappedData = rawData.map(row => {
            let newRow = {};
            for (const [persianKey, engKey] of Object.entries(columnMap)) {
                // تبدیل همه مقادیر به رشته
                newRow[engKey] = String(row[persianKey] || "");
            }
            return newRow;
        });

        // ذخیره در state
        currentState.currentExcel_JSON = mappedData;

        // Preview با ستون‌های فارسی
        displayPreview(rawData.slice(0, 10));
        document.getElementById('row-count').textContent = `تعداد کل ردیف‌ها: ${rawData.length}`;

        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
    };

    reader.readAsArrayBuffer(file);
}

export function displayPreview(data) {
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (data.length === 0) return;

    // ستون‌های معتبر (فارسی)
    const validColumns = [
        "شماره تماس",
        "نام و نام خانوادگی",
        "کدملی",
        "خودرو درخواستی",
        "شعبه",
        "کارشناس تماس گیرنده",
        "آخرین تماس",
        "مراحل تغییر حالت",
        "وضعیت مشتری",
        "توضیحات 1",
        "توضیحات 2",
        "توضیحات 3",
        "پتانسیل مشتری شدن",
        "راه ارتباطی با مجموعه",
        "نام کمپین"
    ];

    // فقط ستون‌های مجاز رو نگه می‌داریم
    let columns = Object.keys(data[0]).filter(col => validColumns.includes(col));

    // ساخت هدر
    let headerRow = `<th class="py-2 px-4 border-b">ردیف</th>`;
    columns.forEach(col => {
        headerRow += `<th class="py-2 px-4 border-b text-center">${col}</th>`;
    });
    thead.innerHTML = `<tr>${headerRow}</tr>`;

    // ساخت ردیف‌ها
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        let rowHtml = `<td class="py-2 px-4 border-b">${index + 1}</td>`;
        columns.forEach(col => {
            rowHtml += `<td class="py-2 px-4 border-b">${row[col] || '-'}</td>`;
        });

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
}

export async function uploadFile() {
    if (!currentState.currentExcel_JSON) {
        alert('هیچ فایل معتبری انتخاب نشده است.');
        return;
    }

    // نمایش modal تأیید
    const confirmModal = document.getElementById('confirm-upload-modal');
    confirmModal.classList.remove('hidden');

    // برگرداندین promise برای مدیریت asynchronous
    return new Promise((resolve) => {
        // اضافه کردن event listener برای دکمه تأیید
        document.getElementById('confirm-upload-btn').onclick = async () => {
            // بستن modal تأیید
            confirmModal.classList.add('hidden');
            
            // نمایش modal پردازش
            const processingModal = document.getElementById('processing-modal');
            processingModal.classList.remove('hidden');
            
            const uploadBtn = document.getElementById('upload-btn');
            const uploadResultEl = document.getElementById('upload-result');

            // غیرفعال کردن دکمه آپلود (هم از نظر ظاهری و هم عملکردی)
            uploadBtn.disabled = true;
            uploadBtn.classList.add('opacity-50', 'cursor-not-allowed');

            uploadResultEl.classList.add('hidden');

            try {
                const apiBaseUrl = window.location.origin;
                const url = `${apiBaseUrl}/api/v1/upload/salesconsultant/sheet`;
                const urlObject = new URL(url);
                urlObject.searchParams.append('filename', currentState.currentExcel_FileName);   
                urlObject.searchParams.append('filesize', currentState.currentExcel_FileSize);   

                const response = await fetch(urlObject, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentState.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(currentState.currentExcel_JSON)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'خطا در آپلود فایل');
                }   

                const result = await response.text();

                uploadResultEl.innerHTML = `
                    <div class="bg-green-50 text-green-700 p-3 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons mr-2">check_circle</i>
                            <span>${result}</span>
                        </div>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');

                // رفرش لیست فایل‌های آپلود شده
                loadUploadedFiles();

            } catch (error) {
                console.error('Upload failed:', error);
                uploadResultEl.innerHTML = `
                    <div class="bg-red-50 text-red-700 p-3 rounded-lg">
                        <i class="material-icons mr-2">error</i>
                        <span>${error.message}</span>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');
            } finally {
                // مخفی کردن modal پردازش
                const processingModal = document.getElementById('processing-modal');
                processingModal.classList.add('hidden');
                
                // فعال کردن دکمه آپلود
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                
                resolve();
            }
        };

        // event listener برای دکمه انصراف
        document.getElementById('confirm-upload-cancel').onclick = () => {
            confirmModal.classList.add('hidden');
            resolve();
        };
    });
}

export function downloadSampleExcel() {
    const sampleData = [
        {
            "شماره تماس": "09123456789",
            "نام و نام خانوادگی": "نام نمونه",
            "کدملی": "0012345678",
            "خودرو درخواستی": "Arrizo 5",
            "شعبه": "اکستریم",
            "کارشناس تماس گیرنده": "کارشناس نمونه",
            "آخرین تماس": "1403/01/01",
            "مراحل تغییر حالت": "",
            "وضعیت مشتری": "وضعیت نمونه",
            "توضیحات 1": "توضیحات نمونه",
            "توضیحات 2": "",
            "توضیحات 3": "",
            "پتانسیل مشتری شدن": "A",
            "راه ارتباطی با مجموعه": "اینستاگرام",
            "نام کمپین": "M1"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "sample_template.xlsx");
}

// متغیرهای سراسری برای مدیریت وضعیت
let currentPage = 1;
let currentSearchTerm = '';
const pageSize = 5; // تعداد آیتم‌ها در هر صفحه

// تابع مدیریت جستجو
export function handleSearch() {
    const searchInput = document.getElementById('search-input');
    currentSearchTerm = searchInput.value.trim();
    currentPage = 1; // بازگشت به صفحه اول هنگام جستجو
    loadUploadedFiles();
}

// تابع بارگذاری فایل‌های آپلود شده از API
export async function loadUploadedFiles(currentPage = 1, currentSearchTerm = '') {
    const filesContainer = document.getElementById('files-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    // نمایش وضعیت در حال بارگذاری
    filesContainer.innerHTML = `
        <div class="loading">
            <i class="material-icons">hourglass_empty</i>
            <p>در حال بارگذاری فایل‌ها...</p>
        </div>
    `;
    paginationContainer.innerHTML = '';
    
    // ساخت URL با پارامترهای صفحه‌بندی و جستجو
    const apiBaseUrl = window.location.origin;
    const token = localStorage.getItem('authToken');
    
    const apiUrl = new URL(`${apiBaseUrl}/api/v1/file-result`);
    apiUrl.searchParams.append('page', currentPage);
    if (currentSearchTerm) {
        apiUrl.searchParams.append('context', currentSearchTerm);
    }
    
    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات از سرور');
        
        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            renderFilesList(data.data);
            renderPagination(data.meta);
        } else {
            throw new Error(data.meta?.description || 'خطا در دریافت اطلاعات');
        }

    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

// تابع renderFilesList را به صورت زیر اصلاح می‌کنیم:
export function renderFilesList(files) {
    const filesContainer = document.getElementById('files-container');
    
    if (!files || files.length === 0) {
        filesContainer.innerHTML = `
            <div class="loading flex flex-col items-center justify-center p-6">
                <i class="material-icons text-4xl text-gray-400 mb-2">folder_open</i>
                <p class="text-gray-500">هیچ فایلی یافت نشد.</p>
            </div>
        `;
        return;
    }
    
    let filesHTML = '';
    
    files.forEach(file => {
        const fileSize = file.filesize ? formatFileSize(file.filesize) : 'نامشخص';
        const uploadDate = file.uploadedat ? formatDate(file.uploadedat) : 'نامشخص';
        const statusClass = file.errormessage ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
        const statusText = file.errormessage ? 'ناموفق' : 'موفق';
        const errorIcon = file.errormessage ? 'error' : 'check_circle';
        
        filesHTML += `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm hover:shadow-md transition-shadow mb-3">
                <div class="flex items-center flex-1">
                    <i class="material-icons text-gray-500 mr-3">description</i>
                    <div class="flex-1">
                        <p class="text-sm font-medium text-gray-800">${file.filename}</p>
                        <div class="flex items-center mt-2 text-xs text-gray-500">
                            <span class="ml-3"><i class="material-icons text-xs mr-1">storage</i> ${fileSize}</span>
                            <span><i class="material-icons text-xs mr-1">schedule</i> ${uploadDate}</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 rtl:space-x-reverse">
                    <span class="px-3 py-1 ${statusClass} text-xs rounded-full flex items-center">
                        <i class="material-icons text-xs mr-1">${errorIcon}</i>
                        ${statusText}
                    </span>
                </div>
            </div>
        `;
    });
    
    filesContainer.innerHTML = filesHTML;
}

// تابع ایجاد pagination
export function renderPagination(meta) {
    const paginationContainer = document.getElementById('pagination-container');
    
    if (!meta || !meta.page || !meta.count) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    const pageNum = parseInt(meta.page.page_num) || 1;
    const pageSize = parseInt(meta.page.page_size) || 5;
    const totalCount = parseInt(meta.count) || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // اگر فقط یک صفحه وجود دارد، pagination نشان داده نشود
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // دکمه قبلی
    paginationHTML += `
        <button class="page-btn" ${pageNum === 1 ? 'disabled' : ''} data-page="${pageNum - 1}">
            <i class="material-icons">chevron_right</i>
        </button>
    `;
    
    // تولید دکمه‌های صفحات
    const startPage = Math.max(1, pageNum - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === pageNum ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    // دکمه بعدی
    paginationHTML += `
        <button class="page-btn" ${pageNum === totalPages ? 'disabled' : ''} data-page="${pageNum + 1}">
            <i class="material-icons">chevron_left</i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHTML;
    
    // اضافه کردن event listener به دکمه‌های pagination
    const pageButtons = paginationContainer.querySelectorAll('.page-btn');
    pageButtons.forEach(button => {
        button.addEventListener('click', () => {
            const page = parseInt(button.getAttribute('data-page'));
            if (page && page !== currentPage) {
                currentPage = page;
                loadUploadedFiles();
            }
        });
    });
}

// تابع کمکی برای فرمت‌دهی سایز فایل
export function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// تابع کمکی برای فرمت‌دهی تاریخ
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}


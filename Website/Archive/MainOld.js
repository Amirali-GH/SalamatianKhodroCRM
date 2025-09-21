let currentState = {
    token: null,
    user: null,
    leads: [],
    currentPage: 1,
    pageSize: 10,
    totalLeads: 0,
    totalPages: 1,
    searchQuery: '',
    sortField: 'assignedAt',
    sortOrder: 'desc',
    selectedLeads: [],
    currentFile: null,
    currentLead: null
};

document.addEventListener('DOMContentLoaded', function () {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (token && user) {
        currentState.token = token;
        currentState.user = user;
        showMainPanel();
        fetchLeads();
    } else {
        showLoginForm();
    }

    setupEventListeners();
});

// تنظیم تمامی رویدادهای صفحه
function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');

    dropArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

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

    // دکمه آپلود
    document.getElementById('upload-btn').addEventListener('click', uploadFile);

    // جستجو
    document.getElementById('search-input').addEventListener('input', handleSearch);

    // مرتب‌سازی
    document.querySelectorAll('.sortable-header').forEach(header => {
        header.addEventListener('click', () => handleSort(header.dataset.sort));
    });

    // انتخاب همه
    document.getElementById('select-all').addEventListener('change', toggleSelectAll);

    // دکمه خروجی اکسل
    document.getElementById('export-btn').addEventListener('click', exportLeads);

    // صفحه‌بندی
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
    document.getElementById('page-size').addEventListener('change', handlePageSizeChange);

    // مودال
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('contact-form').addEventListener('submit', saveContactResult);
}

// مدیریت فرم لاگین
// مدیریت فرم لاگین
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // استفاده از host فعلی به جای 127.0.0.1
    const apiBaseUrl = window.location.origin; // این متغیر خودکار دامنه/آیپی جاری را می‌گیرد
    
    try {
        const response = await fetch(`${apiBaseUrl}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error("خطا در لاگین");
        }

        const data = await response.json();

        if (data.token) {
            // ذخیره توکن
            localStorage.setItem("token", data.token);

            // ذخیره اطلاعات کاربر
            const user = { username: username };
            localStorage.setItem("user", JSON.stringify(user));

            currentState.token = data.token;
            currentState.user = user;

            showMainPanel();
            fetchLeads();
        } else {
            showLoginError("توکن دریافت نشد");
        }
    } catch (error) {
        console.error(error);
        showLoginError("کاربر یافت نشد!");
    }
}

// نمایش خطا
function showLoginError(msg) {
    const errorEl = document.getElementById("loginError");
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
}



// شبیه‌سازی API لاگین
function mockLoginApi(email, password) {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (email === "admin@example.com" && password === "password123") {
                resolve({
                    success: true,
                    token: "mock_jwt_token_123456",
                    user: {
                        id: "user_123",
                        name: "مدیر سیستم",
                        email: "admin@example.com",
                        role: "admin"
                    }
                });
            } else {
                resolve({
                    success: false,
                    message: "ایمیل یا رمز عبور اشتباه است"
                });
            }
        }, 1000);
    });
}

// نمایش خطای لاگین
function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

// مدیریت خروج کاربر
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentState.token = null;
    currentState.user = null;
    showLoginForm();
}

// نمایش فرم لاگین
function showLoginForm() {
    document.getElementById('login-container').classList.remove('hidden');
    document.getElementById('main-panel').classList.add('hidden');
    document.getElementById('logout-btn').classList.add('hidden');
    document.getElementById('login-error').classList.add('hidden');
}

// نمایش پنل اصلی
function showMainPanel() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('main-panel').classList.remove('hidden');
    document.getElementById('logout-btn').classList.remove('hidden');
}

// توابع مرتبط با درگ و دراپ
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    document.getElementById('drop-area').classList.add('active');
}

function unhighlight() {
    document.getElementById('drop-area').classList.remove('active');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    handleFile(file);
}

// مدیریت فایل انتخاب شده
function handleFile(file) {
    if (!file) return;

    // اعتبارسنجی نوع فایل
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        alert('لطفاً یک فایل اکسل معتبر انتخاب کنید (فرمت‌های مجاز: .xlsx, .xls)');
        return;
    }

    // اعتبارسنجی اندازه فایل (حداکثر 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('حجم فایل نباید بیشتر از 10 مگابایت باشد');
        return;
    }

    currentState.currentFile = file;
    previewExcelFile(file);
}

// پیش‌نمایش فایل اکسل
function previewExcelFile(file) {
    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // گرفتن اولین شیت
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // تبدیل به JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // اعتبارسنجی ستون‌های ضروری
        const requiredColumns = ['Phone', 'FirstName', 'LastName'];
        const firstRow = jsonData[0] || {};
        const missingColumns = requiredColumns.filter(col => !Object.keys(firstRow).includes(col));

        if (missingColumns.length > 0) {
            alert(`فایل اکسل باید شامل ستون‌های زیر باشد: ${missingColumns.join(', ')}`);
            return;
        }

        // نمایش هشدار برای کد ملی
        const hasNationalCode = Object.keys(firstRow).includes('NationalCode');
        document.getElementById('validation-warning').classList.toggle('hidden', hasNationalCode);

        // نمایش پیش‌نمایش
        displayPreview(jsonData.slice(0, 3)); // فقط 3 ردیف اول
        document.getElementById('row-count').textContent = `تعداد کل ردیف‌ها: ${jsonData.length}`;

        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
    };

    reader.readAsArrayBuffer(file);
}

// نمایش پیش‌نمایش داده‌ها
function displayPreview(data) {
    const tbody = document.getElementById('preview-table-body');
    tbody.innerHTML = '';

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        tr.innerHTML = `
                    <td class="py-2 px-4 border-b">${index + 1}</td>
                    <td class="py-2 px-4 border-b">${row.Phone || '-'}</td>
                    <td class="py-2 px-4 border-b">${row.FirstName || '-'}</td>
                    <td class="py-2 px-4 border-b">${row.LastName || '-'}</td>
                    <td class="py-2 px-4 border-b">${row.NationalCode || '-'}</td>
                `;

        tbody.appendChild(tr);
    });
}

async function uploadFile() {
    if (!currentState.currentFile) {
        alert('لطفاً ابتدا یک فایل را انتخاب کنید.');
        return;
    }

    const uploadBtn = document.getElementById('upload-btn');
    const uploadResultEl = document.getElementById('upload-result');

    // غیرفعال کردن دکمه برای جلوگیری از کلیک‌های مکرر
    uploadBtn.disabled = true;
    uploadResultEl.classList.add('hidden'); // مخفی کردن پیام قبلی

    try {
        // 2. یک FormData بسازید تا فایل را در آن قرار دهید
        const formData = new FormData();
        // کلید 'file' باید با نامی که API در بک‌اند انتظار دارد، مطابقت داشته باشد
        formData.append('file', currentState.currentFile);

        // 3. آدرس API را مشخص کنید
        const apiBaseUrl = window.location.origin;
        const url = `${apiBaseUrl}/api/upload/customerSheet`;

        // 4. درخواست fetch را ارسال کنید
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                // ارسال توکن برای احراز هویت
                'Authorization': `Bearer ${currentState.token}`
                // نکته: Content-Type را هنگام استفاده از FormData تنظیم نکنید.
                // مرورگر به طور خودکار آن را به multipart/form-data با boundary صحیح تنظیم می‌کند.
            },
            body: formData
        });

        // 5. پاسخ سرور را بررسی کنید
        if (!response.ok) {
            // اگر سرور خطایی برگرداند (مانند 400, 401, 500)
            const errorData = await response.json();
            throw new Error(errorData.message || 'خطا در آپلود فایل');
        }

        const result = await response.json();

        // 6. نمایش پیام موفقیت‌آمیز بر اساس پاسخ سرور
        uploadResultEl.innerHTML = `
            <div class="bg-green-50 text-green-700 p-3 rounded-lg">
                <div class="flex items-center">
                    <i class="material-icons mr-2">check_circle</i>
                    <span>فایل با موفقیت برای پردازش ارسال شد!</span>
                </div>
                <div class="mt-3">
                    <p>شناسه پیگیری: <span class="font-mono">${result.task_id}</span></p>
                    <p class="mt-2">وضعیت پردازش به زودی در پنل شما نمایش داده خواهد شد.</p>
                </div>
            </div>
        `;
        uploadResultEl.classList.remove('hidden');

    } catch (error) {
        // 7. نمایش پیام خطا در صورت بروز مشکل
        console.error('Upload failed:', error);
        uploadResultEl.innerHTML = `
            <div class="bg-red-50 text-red-700 p-3 rounded-lg">
                <i class="material-icons mr-2">error</i>
                <span>${error.message}</span>
            </div>
        `;
        uploadResultEl.classList.remove('hidden');
    } finally {
        // 8. دکمه را در هر صورت (موفقیت یا شکست) دوباره فعال کنید
        uploadBtn.disabled = false;
    }
}

// شبیه‌سازی دریافت لیست مشتریان از سرور
function mockLeadsApi(page, pageSize, search, sortField, sortOrder) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // داده‌های نمونه
            const mockData = [];
            const statuses = ['new', 'contacted', 'followup', 'closed'];

            for (let i = 0; i < 48; i++) {
                mockData.push({
                    id: `lead_${i + 1}`,
                    phone: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
                    firstName: ['محمد', 'علی', 'فاطمه', 'زهرا', 'حسین', 'مریم', 'پارسا', 'سارا'][Math.floor(Math.random() * 8)],
                    lastName: ['رضایی', 'محمدی', 'کریمی', 'حسینی', 'جعفری', 'اکبری', 'قاسمی', 'امیری'][Math.floor(Math.random() * 8)],
                    nationalCode: Math.floor(1000000000 + Math.random() * 9000000000),
                    status: statuses[Math.floor(Math.random() * 4)],
                    assignedAt: `1402/05/${15 + Math.floor(i / 10)} - ${9 + Math.floor(i % 10)}:${Math.floor(Math.random() * 60)}`,
                    lastContact: i > 10 ? `1402/05/${10 + Math.floor(i % 15)} - ${8 + Math.floor(i % 10)}:${Math.floor(Math.random() * 60)}` : '-'
                });
            }

            // فیلتر کردن بر اساس جستجو
            let filteredData = mockData;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredData = mockData.filter(lead =>
                    lead.phone.includes(search) ||
                    lead.firstName.toLowerCase().includes(searchLower) ||
                    lead.lastName.toLowerCase().includes(searchLower)
                );
            }

            // مرتب‌سازی
            filteredData.sort((a, b) => {
                if (sortField === 'name') {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                }

                // برای سایر فیلدها، از مرتب‌سازی ساده استفاده می‌کنیم
                return sortOrder === 'asc' ? 1 : -1;
            });

            // صفحه‌بندی
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedData = filteredData.slice(startIndex, endIndex);

            resolve({
                success: true,
                data: paginatedData,
                total: filteredData.length,
                page,
                pageSize,
                totalPages: Math.ceil(filteredData.length / pageSize)
            });
        }, 800);
    });
}

// دریافت لیست مشتریان از سرور
async function fetchLeads() {
    const { currentPage, pageSize, searchQuery, sortField, sortOrder } = currentState;

    try {
        // در محیط واقعی، این‌جا درخواست fetch به سرور ارسال می‌شود
        const response = await mockLeadsApi(
            currentPage,
            pageSize,
            searchQuery,
            sortField,
            sortOrder
        );

        if (response.success) {
            currentState.leads = response.data;
            currentState.totalLeads = response.total;
            currentState.totalPages = response.totalPages;

            renderLeadsTable();
            renderPagination();
        } else {
            alert('خطا در دریافت داده‌ها');
        }
    } catch (error) {
        alert('خطا در ارتباط با سرور');
    }
}

// نمایش لیست مشتریان در جدول
function renderLeadsTable() {
    const tbody = document.getElementById('leads-table-body');
    tbody.innerHTML = '';

    if (currentState.leads.length === 0) {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="py-8 text-center text-gray-500">
                            <i class="material-icons text-4xl mb-2">info</i>
                            <p>موردی یافت نشد</p>
                        </td>
                    </tr>
                `;
        return;
    }

    currentState.leads.forEach(lead => {
        const isSelected = currentState.selectedLeads.includes(lead.id);
        const statusText = {
            'new': 'جدید',
            'contacted': 'تماس گرفته شده',
            'followup': 'پیگیری',
            'closed': 'بسته شده'
        }[lead.status];

        const statusClass = {
            'new': 'status-new',
            'contacted': 'status-contacted',
            'followup': 'status-followup',
            'closed': 'status-closed'
        }[lead.status];

        const tr = document.createElement('tr');
        tr.className = 'table-row border-b';

        tr.innerHTML = `
                    <td class="py-3 px-4">
                        <input type="checkbox" class="lead-checkbox rounded text-purple-600 focus:ring-purple-500" data-id="${lead.id}" ${isSelected ? 'checked' : ''}>
                    </td>
                    <td class="py-3 px-4">${lead.phone}</td>
                    <td class="py-3 px-4">${lead.firstName} ${lead.lastName}</td>
                    <td class="py-3 px-4">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </td>
                    <td class="py-3 px-4">${lead.assignedAt}</td>
                    <td class="py-3 px-4">${lead.lastContact}</td>
                    <td class="py-3 px-4">
                        <div class="flex gap-2">
                            <button class="btn-outline px-2 py-1 rounded text-sm detail-btn" data-id="${lead.id}">
                                جزئیات
                            </button>
                            <button class="btn-primary px-2 py-1 rounded text-sm contact-btn" data-id="${lead.id}">
                                تماس
                            </button>
                        </div>
                    </td>
                `;

        tbody.appendChild(tr);
    });

    // اضافه کردن رویدادها به دکمه‌ها
    document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', toggleLeadSelection);
    });

    document.querySelectorAll('.detail-btn').forEach(btn => {
        btn.addEventListener('click', () => openDetailModal(btn.dataset.id));
    });

    document.querySelectorAll('.contact-btn').forEach(btn => {
        btn.addEventListener('click', () => openContactModal(btn.dataset.id));
    });
}

// مدیریت انتخاب مشتریان
function toggleLeadSelection(e) {
    const leadId = e.target.dataset.id;

    if (e.target.checked) {
        if (!currentState.selectedLeads.includes(leadId)) {
            currentState.selectedLeads.push(leadId);
        }
    } else {
        currentState.selectedLeads = currentState.selectedLeads.filter(id => id !== leadId);
        document.getElementById('select-all').checked = false;
    }
}

// انتخاب/عدم انتخاب همه مشتریان
function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    currentState.selectedLeads = isChecked ? currentState.leads.map(lead => lead.id) : [];

    document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}

// مدیریت جستجو
function handleSearch(e) {
    currentState.searchQuery = e.target.value;
    currentState.currentPage = 1; // بازگشت به صفحه اول
    fetchLeads();
}

// مدیریت مرتب‌سازی
function handleSort(field) {
    if (currentState.sortField === field) {
        currentState.sortOrder = currentState.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentState.sortField = field;
        currentState.sortOrder = 'asc';
    }

    fetchLeads();
}

// مدیریت تغییر اندازه صفحه
function handlePageSizeChange(e) {
    currentState.pageSize = parseInt(e.target.value);
    currentState.currentPage = 1;
    fetchLeads();
}

// تغییر صفحه
function changePage(direction) {
    const newPage = currentState.currentPage + direction;

    if (newPage > 0 && newPage <= currentState.totalPages) {
        currentState.currentPage = newPage;
        fetchLeads();
    }
}

// نمایش صفحه‌بندی
function renderPagination() {
    const paginationElement = document.getElementById('pagination-numbers');
    const { currentPage, totalPages } = currentState;

    paginationElement.innerHTML = '';

    // محدودیت برای نمایش صفحات (حداکثر 5 صفحه)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    // دکمه صفحه قبلی
    document.getElementById('prev-page').disabled = currentPage === 1;

    // دکمه‌های شماره صفحات
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : 'border border-gray-300'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            if (i !== currentPage) {
                currentState.currentPage = i;
                fetchLeads();
            }
        });

        paginationElement.appendChild(pageBtn);
    }

    // دکمه صفحه بعدی
    document.getElementById('next-page').disabled = currentPage === totalPages;

    // نمایش اطلاعات صفحه فعلی
    document.getElementById('current-page').textContent = currentPage;
    document.getElementById('total-pages').textContent = totalPages;
}

// باز کردن مودال جزئیات مشتری
function openDetailModal(leadId) {
    const lead = currentState.leads.find(l => l.id === leadId);
    if (!lead) return;

    currentState.currentLead = lead;

    document.getElementById('lead-name').textContent = `${lead.firstName} ${lead.lastName}`;
    document.getElementById('lead-phone').textContent = lead.phone;
    document.getElementById('lead-national-code').textContent = lead.nationalCode;
    document.getElementById('lead-assigned-at').textContent = lead.assignedAt;

    document.getElementById('lead-modal').classList.remove('hidden');
}

// باز کردن مودال ثبت تماس
function openContactModal(leadId) {
    openDetailModal(leadId);
    // در اینجا می‌توانید بخش‌های خاص مربوط به تماس را فعال کنید
}

// بستن مودال
function closeModal() {
    document.getElementById('lead-modal').classList.add('hidden');
    currentState.currentLead = null;
}

// ذخیره نتیجه تماس
async function saveContactResult(e) {
    e.preventDefault();

    const result = document.getElementById('contact-result').value;
    const notes = document.getElementById('contact-notes').value;

    if (!currentState.currentLead) return;

    // شبیه‌سازی ارسال به سرور
    try {
        // در محیط واقعی، این‌جا درخواست fetch به سرور ارسال می‌شود
        const response = await mockSaveContactApi(
            currentState.currentLead.id,
            result,
            notes
        );

        if (response.success) {
            alert('نتیجه تماس با موفقیت ثبت شد');
            closeModal();
            fetchLeads(); // تازه‌سازی داده‌ها
        } else {
            alert('خطا در ثبت نتیجه تماس');
        }
    } catch (error) {
        alert('خطا در ارتباط با سرور');
    }
}

// شبیه‌سازی ذخیره نتیجه تماس
function mockSaveContactApi(leadId, result, notes) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });
        }, 1000);
    });
}

// خروجی اکسل
function exportLeads() {
    let dataToExport = [];

    if (currentState.selectedLeads.length > 0) {
        // خروجی رکوردهای انتخاب شده
        dataToExport = currentState.leads.filter(lead =>
            currentState.selectedLeads.includes(lead.id)
        );
    } else {
        // خروجی کل داده‌های فیلتر شده
        // در محیط واقعی، این‌جا باید داده‌ها را از سرور دریافت کنید
        dataToExport = [...currentState.leads];
    }

    if (dataToExport.length === 0) {
        alert('هیچ داده‌ای برای خروجی وجود ندارد');
        return;
    }

    // تبدیل داده‌ها به فرمت مورد نیاز برای اکسل
    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(lead => ({
        'شماره تماس': lead.phone,
        'نام': lead.firstName,
        'نام خانوادگی': lead.lastName,
        'کد ملی': lead.nationalCode,
        'وضعیت': lead.status,
        'تاریخ تخصیص': lead.assignedAt,
        'آخرین تماس': lead.lastContact
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'مشتریان');

    // تولید فایل و دانلود
    XLSX.writeFile(workbook, `خروجی_مشتریان_${new Date().toLocaleDateString('fa-IR')}.xlsx`);
}

import { currentState } from './state.js';
import { renderLeadsTable } from './ui.js';
import { mockLeadsApi } from './Temp.js';

export function renderPagination() {
    const paginationNumbers = document.getElementById('pagination-numbers');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');

    // به‌روزرسانی متن صفحه جاری
    currentPageSpan.textContent = currentState.currentPage;
    totalPagesSpan.textContent = currentState.totalPages || '-'; // اگر totalPages معتبر نیست، خط تیره نمایش داده شود

    // پاک کردن شماره‌های قبلی
    paginationNumbers.innerHTML = '';

    // اگر totalPages معتبر باشد، شماره‌های صفحات را نمایش بده
    if (currentState.totalPages) {
        for (let i = 1; i <= currentState.totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            pageBtn.classList.add('pagination-btn', 'border', 'border-gray-300', 'px-3', 'py-1', 'mx-1', 'rounded');
            if (i === currentState.currentPage) {
                pageBtn.classList.add('bg-purple-500', 'text-white');
            }
            pageBtn.addEventListener('click', () => {
                currentState.currentPage = i;
                fetchLeads();
            });
            paginationNumbers.appendChild(pageBtn);
        }
    } else {
        // فقط شماره صفحه جاری را نمایش بده
        const pageBtn = document.createElement('button');
        pageBtn.textContent = currentState.currentPage;
        pageBtn.classList.add('pagination-btn', 'border', 'border-gray-300', 'px-3', 'py-1', 'mx-1', 'rounded', 'bg-purple-500', 'text-white');
        paginationNumbers.appendChild(pageBtn);
    }

    // مدیریت فعال/غیرفعال بودن دکمه‌ها
    prevPageBtn.disabled = !currentState.prevPageUri;
    nextPageBtn.disabled = !currentState.nextPageUri;
}

export async function fetchLeads() {
    const { searchQuery, selectedBranch } = currentState;

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            alert('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        // ساخت URL با پارامترها
        let url = `${apiBaseUrl}/api/v1/phoneassignment?page=${currentState.currentPage}`;
        
        if (currentState.user.userrolename !== 'admin' && currentState.user.branchid) {
            url += `&branchid=${currentState.user.branchid}`;
        }
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }
        if (selectedBranch) {
            url += `&branchid=${selectedBranch}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`خطا در دریافت داده‌ها: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // لاگ برای دیباگ

        if (data.meta.is_success) {
            // تبدیل داده‌های API به فرمت مورد نیاز
            const mappedData = data.data.map(item => ({
                id: item.assignmentid,
                phone: item.phone,
                name: item.username,
                status: item.sourcename,
                assignedAt: new Date().toLocaleDateString('fa-IR'),
                lastContact: ''
            }));

            // به‌روزرسانی حالت
            currentState.leads = mappedData;
            currentState.currentPage = parseInt(data.meta.page.page_num);
            currentState.pageSize = parseInt(data.meta.page.page_size);
            currentState.nextPageUri = data.meta.page.next_page_uri;
            currentState.prevPageUri = data.meta.page.prev_page_uri;

            // اگر total_size معتبر نیست، از count و page_num برای تخمین تعداد صفحات استفاده نکنیم
            currentState.totalPages = data.meta.page.total_size > 0 
                ? Math.ceil(data.meta.page.total_size / currentState.pageSize)
                : null; // null برای نشان دادن عدم وجود total_size معتبر

            renderLeadsTable();
            renderPagination();
        } else {
            alert('خطا در دریافت داده‌ها');
        }
    } catch (error) {
        console.error('Error fetching leads:', error);
        alert('خطا در ارتباط با سرور');
    }
}

export async function loadBranches() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            console.error('No auth token found');
            return;
        }
        
        const response = await fetch(`${apiBaseUrl}/api/v1/branch`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`خطا در دریافت شعب: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
            throw new Error('ساختار داده‌های دریافتی نامعتبر است');
        }
        
        currentState.branches = data.data;
        const branchSelect = document.getElementById('branch-filter');
        
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">همه شعب</option>';
            
            currentState.branches.forEach(branch => {
                if (branch.branchid && branch.mainname) {
                    const option = document.createElement('option');
                    option.value = branch.branchid;
                    option.textContent = branch.mainname;
                    branchSelect.appendChild(option);
                }
            });
            
            // انتخاب اولین شعبه به صورت پیش‌فرض
            if (currentState.branches.length > 0 && !currentState.selectedBranch) {
                currentState.selectedBranch = currentState.branches[0].branchid;
                branchSelect.value = currentState.selectedBranch;
            }
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        const branchSelect = document.getElementById('branch-filter');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">خطا در بارگذاری شعب</option>';
        }
    }
}

export function handleSort(field) {
    alert('مرتب سازی در این نسخه پشتیبانی نمی شود.');
    return;
}

export function handleBranchChange(e) {
    currentState.selectedBranch = e.target.value;
    currentState.currentPage = 1;
    fetchLeads();
}

export function closeModal() {
    document.getElementById('lead-modal').classList.add('hidden');
    currentState.currentLead = null;
}

// انتخاب/عدم انتخاب همه مشتریان
export function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    currentState.selectedLeads = isChecked ? currentState.leads.map(lead => lead.id) : [];

    document.querySelectorAll('.lead-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}


export function handleSearch(e) {
    currentState.searchQuery = e.target.value;
    currentState.currentPage = 1; // بازگشت به صفحه اول
    fetchLeads();
}

export function handlePageSizeChange(e) {
    currentState.pageSize = parseInt(e.target.value);
    currentState.currentPage = 1;
    fetchLeads();
}

export function changePage(direction) {
    const newPage = currentState.currentPage + direction;
    console.log('Changing to page:', newPage);

    // بررسی وجود URL برای صفحه بعدی یا قبلی
    if (direction === 1 && !currentState.nextPageUri) {
        console.log('No next page available');
        return;
    }
    if (direction === -1 && !currentState.prevPageUri) {
        console.log('No previous page available');
        return;
    }

    if (newPage > 0) {
        currentState.currentPage = newPage;
        fetchLeads();
    }
}

// ذخیره نتیجه تماس
export async function saveContactResult(e) {
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
export function mockSaveContactApi(leadId, result, notes) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: true });
        }, 1000);
    });
}

// خروجی اکسل
export function exportLeads() {
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
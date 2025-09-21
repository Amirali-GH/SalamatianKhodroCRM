import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';


export function renderPagination() {
    const paginationNumbers = document.getElementById('pagination-numbers');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const currentPageSpan = document.getElementById('current-page');
    const totalPagesSpan = document.getElementById('total-pages');
    
    // محافظت در برابر مقادیر نامعتبر
    const totalPages = Math.max(1, parseInt(currentState.totalPages) || 1);
    let currentPage = Math.min(Math.max(1, parseInt(currentState.currentPage) || 1), totalPages);
    currentState.currentPage = currentPage;

    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;

    paginationNumbers.innerHTML = '';

    function addPageButton(page, isActive = false) {
        const btn = document.createElement('button');
        btn.textContent = page;
        btn.className = "pagination-btn border border-gray-300 px-3 py-1 mx-1 rounded";
        if (isActive) {
            btn.classList.add("bg-purple-500", "text-white");
            btn.setAttribute('aria-current', 'page');
            btn.disabled = true;
        } else {
            btn.onclick = () => {
                if (currentState.currentPage !== page) {
                    currentState.currentPage = page;
                    fetchLeads();
                }
            };
        }
        paginationNumbers.appendChild(btn);
    }

    function addEllipsis() {
        const span = document.createElement('span');
        span.textContent = "...";
        span.className = "px-2";
        paginationNumbers.appendChild(span);
    }

    // ساده‌تر و قابل‌اعتماد: اگر تعداد صفحات کم است، همه را نشان بده
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            addPageButton(i, i === currentPage);
        }
    } else {
        // همیشه صفحه ۱
        addPageButton(1, currentPage === 1);

        // محاسبه بازه وسط (از 2 تا totalPages - 1)
        let start = Math.max(2, currentPage - 3);  // تغییر به -3 برای بازه وسیع‌تر
        let end = Math.min(totalPages - 1, currentPage + 3);
        // و در نزدیکی انتها:
        if (currentPage >= totalPages - 4) {  // تنظیم به -4
            start = Math.max(2, totalPages - 6);  // برای نمایش حدود 7 دکمه
            end = totalPages - 1;
        }

        // اگر در نزدیکی ابتدای لیست هستیم، بازه را جابجا کن تا همیشه 5 دکمه وسط (اگر ممکن بود) نمایش داده شود
        if (currentPage <= 4) {
            start = 2;
            end = 5;
        }

        // اگر در نزدیکی انتها هستیم، بازه را جابجا کن
        if (currentPage >= totalPages - 3) {
            start = Math.max(2, totalPages - 4);
            end = totalPages - 1;
        }

        // بیضی سمت چپ اگر بین 1 و start شکاف باشه
        if (start > 2) addEllipsis();

        // صفحات وسط
        for (let i = start; i <= end; i++) {
            addPageButton(i, i === currentPage);
        }

        // بیضی سمت راست اگر بین end و last شکاف باشه
        if (end < totalPages - 1) addEllipsis();

        // همیشه صفحه آخر
        addPageButton(totalPages, currentPage === totalPages);
    }

    // کنترل prev/next
    prevPageBtn.style.display = (currentPage === 1) ? 'none' : 'inline-block';
    nextPageBtn.style.display = (currentPage === totalPages) ? 'none' : 'inline-block';
}

let searchTimeout;
export function handleSearch(e) {
    clearTimeout(searchTimeout);
    currentState.searchQuery = e.target.value;
    
    searchTimeout = setTimeout(() => {
        currentState.currentPage = 1;
        fetchLeads();
    }, 500);
}

export function renderLeadsTable() {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (currentState.leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-500">
                    <i class="material-icons text-4xl mb-2">info</i>
                    <p>موردی یافت نشد</p>
                </td>
            </tr>
        `;
        return;
    }

    currentState.leads.forEach((lead) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                <input type="checkbox" class="lead-checkbox" data-id="${lead.id}">
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.phone || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.name || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">${lead.status || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <button class="text-purple-600 hover:text-purple-900 edit-assignment" data-id="${lead.id}" title="ویرایش">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-assignment" data-id="${lead.id}" title="حذف">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

export async function fetchLeads() {
    const tableBody = document.getElementById('leads-table-body');
    showLoading(tableBody); // نمایش لودینگ

    try {
        const totalPages = Math.max(1, parseInt(currentState.totalPages) || 1);
        if (currentState.currentPage < 1 || currentState.currentPage > totalPages) {
            currentState.currentPage = Math.min(Math.max(1, currentState.currentPage), totalPages);
        }

        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        const urlObj = new URL('/api/v1/phoneassignment', apiBaseUrl);
        const params = new URLSearchParams();
        params.set('page', currentState.currentPage);
        params.set('page_size', currentState.pageSize);

        let branchIdForQuery;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchIdForQuery = currentState.selectedBranch;
            if (branchIdForQuery === '') { // "" به معنی "همه شعب"
                branchIdForQuery = '0';
            }
        } else {
            // اگر ادمین نیست => فقط شعبه خودش
            branchIdForQuery = currentState.user?.branchid;
        }

        if (branchIdForQuery) {
            params.set('branchid', branchIdForQuery);
        }

        if (currentState.searchQuery) {
            params.set('search', currentState.searchQuery);
        }

        urlObj.search = params.toString();
        const url = urlObj.toString();

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`خطا در دریافت داده‌ها: ${response.status}`);
        
        const data = await response.json();
        if (data.meta && data.meta.is_success) {
            const mappedData = (data.data || []).map(item => ({
                id: item.assignmentid,
                phone: item.phone || '',
                name: item.username || '',
                status: item.sourcename || ''
            }));
            currentState.leads = mappedData;
            currentState.currentPage = parseInt(data.meta.page.page_num) || currentState.currentPage;
            currentState.totalRecords = data.meta.page.total_size;
            currentState.pageSize = parseInt(data.meta.page.page_size) || currentState.pageSize;
            currentState.totalPages = Math.ceil(currentState.totalRecords / currentState.pageSize) || 1;
            renderLeadsTable();
            renderPagination();
        } else {
            showNotification('خطا در دریافت داده‌ها از سرور', 'error');
            renderLeadsTable(); // جدول را خالی نشان می‌دهد
        }
    } catch (error) {
        console.error('Error fetching leads:', error);
        showNotification('خطا در ارتباط با سرور: ' + (error.message || error), 'error');
    } finally {
        // در هر صورت (موفقیت یا خطا) لودینگ را پنهان می‌کنیم
        // با یک تاخیر کوچک تا کاربر متوجه تغییر شود
        setTimeout(() => {
            hideLoading(tableBody);
            if (currentState.leads.length === 0) {
                renderLeadsTable(); // برای نمایش پیام "موردی یافت نشد"
            }
        }, 300);
    }
}

export async function loadBranchesInLeads() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.error('No auth token found');
            return;
        }
        const response = await fetch(`${apiBaseUrl}/api/v1/branch`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`خطا در دریافت شعب: ${response.status}`);
        
        const data = await response.json();
        if (!data.data || !Array.isArray(data.data)) throw new Error('ساختار داده‌های دریافتی نامعتبر است');
        
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
        }
    } catch (error) {
        console.error('Error loading branches:', error);
        const branchSelect = document.getElementById('branch-filter');
        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">خطا در بارگذاری شعب</option>';
        }
    }
}

export function closeAssignmentModal() {
    document.getElementById('assignment-modal').classList.add('hidden');
}

export async function openAssignmentModal(assignmentId = null) {
    const modal = document.getElementById('assignment-modal');
    const title = document.getElementById('assignment-modal-title');
    const form = document.getElementById('assignment-form');
    const branchSelect = document.getElementById('assignment-branch');

    // Populate branch dropdown
    branchSelect.innerHTML = '<option value="">انتخاب شعبه...</option>';
    currentState.branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.branchid;
        option.textContent = branch.mainname;
        branchSelect.appendChild(option);
    });

    if (assignmentId) {
        // --- Edit Mode ---
        title.textContent = 'ویرایش تخصیص';
        try {
            const apiBaseUrl = window.location.origin;
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('تخصیص مورد نظر یافت نشد');
            
            const result = await response.json();
            const assignment = result.data;
            
            document.getElementById('assignment-id').value = assignment.assignmentid;
            document.getElementById('assignment-phone').value = assignment.phone || '';
            document.getElementById('assignment-username').value = assignment.username || '';
            branchSelect.value = assignment.branchid || '';
        } catch (error) {
            showNotification('خطا در دریافت اطلاعات برای ویرایش: ' + error.message, 'error');
            return;
        }
    } else {
        // --- Add Mode ---
        title.textContent = 'افزودن شماره جدید';
        form.reset();
        document.getElementById('assignment-id').value = '';
    }
    modal.classList.remove('hidden');
}

export async function saveAssignment(e) {
    e.preventDefault();
    const assignmentId = document.getElementById('assignment-id').value;
    const assignmentData = {
        phone: document.getElementById('assignment-phone').value,
        username: document.getElementById('assignment-username').value,
        branchid: parseInt(document.getElementById('assignment-branch').value),
        sourcecollectingdataid: 3 // Fixed value as requested
    };

    if (!assignmentData.phone || !assignmentData.branchid) {
        showNotification('لطفا شماره تماس و شعبه را انتخاب کنید.');
        return;
    }

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const url = assignmentId ? `${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}` : `${apiBaseUrl}/api/v1/phoneassignment`;
        const method = assignmentId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(assignmentData)
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.meta.description || 'خطا در ذخیره‌سازی');

        showNotification(responseData.meta.description, 'success');
        closeAssignmentModal();
        fetchLeads(); // Refresh table
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

export async function deleteAssignment(assignmentId) {
    if (!confirm('آیا از حذف این تخصیص اطمینان دارید؟')) return;

    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${apiBaseUrl}/api/v1/phoneassignment/${assignmentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.meta.description || 'خطا در حذف');
        
        showNotification(responseData.meta.description, 'success');
        fetchLeads(); // Refresh table
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

export function handleSort(field) {
    showNotification('مرتب سازی در این نسخه پشتیبانی نمی شود.');
}

export function handleBranchChange(e) {
    currentState.selectedBranch = e.target.value;

    // اطمینان از اینکه gallery تعریف شده
    ensureGalleryState();

    currentState.gallery.currentPage = 1;
    currentState.currentPage = 1;
    
    fetchBranchImages();
    fetchLeads();
}


export function toggleSelectAll(e) {
    const isChecked = e.target.checked;
    currentState.selectedLeads = isChecked ? currentState.leads.map(lead => lead.id) : [];
    document.querySelectorAll('.lead-checkbox').forEach(checkbox => checkbox.checked = isChecked);
}

export function handlePageSizeChange(e) {
    const newPageSize = parseInt(e.target.value);
    if (newPageSize > 0) {
        currentState.pageSize = newPageSize;
        currentState.currentPage = 1;
        fetchLeads();
    }
}

export function changePage(direction) {
    const newPage = currentState.currentPage + direction;
    if (newPage >= 1 && newPage <= currentState.totalPages) {
        currentState.currentPage = newPage;
        fetchLeads();
    }
}

export async function exportLeads() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        // تعیین branchid (اولویت به فیلتر انتخاب‌شده، در غیر اینصورت branch کاربر)
        let branchId;
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchId = currentState.selectedBranch;
            if (branchId === '') { // "" به معنی "همه شعب"
                branchId = '0';
            }
        } else {
            // اگر ادمین نیست => فقط شعبه خودش
            branchId = currentState.user?.branchid;
        }

        // نقطه شروع درخواست (بدون page => طبق گفته شما سرور کل مخزن را برمی‌فرستد)
        let requestUrl = `${apiBaseUrl}/api/v1/phoneassignment?branchid=${encodeURIComponent(branchId)}`;
console.log(requestUrl);
        // اگر خواستید فیلتر جستجو را هم اعمال کنید:
        if (currentState.searchQuery) {
            requestUrl += `&context=${encodeURIComponent(currentState.searchQuery)}`;
        }

        const allItems = [];

        // تابع کمکی برای ساخت headers
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // فراخوانی اول و احتمال دنبال کردن pagination اگر سرور صفحات را برگرداند
        let nextUrl = requestUrl;
        while (nextUrl) {
            const resp = await fetch(nextUrl, { headers });
            if (!resp.ok) throw new Error(`خطا در دریافت داده‌ها: ${resp.status}`);

            const json = await resp.json();

            // ساختار داده‌ی مورد انتظار: json.data => array
            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('داده‌های دریافتی ساختار مورد انتظار را ندارند.');
            }

            allItems.push(...json.data);

            // اگر متا شامل next_page_uri باشد، آن را دنبال کن (ممکن است مقدار نسبی باشد)
            const pageMeta = json.meta && json.meta.page;
            if (pageMeta && pageMeta.next_page_uri) {
                // next_page_uri ممکن است آدرس نسبی باشد؛ اگر نسبی بود آن را به apiBaseUrl وصل می‌کنیم
                if (pageMeta.next_page_uri.startsWith('http')) {
                    nextUrl = pageMeta.next_page_uri;
                } else {
                    // حذف اسلش اضافی
                    nextUrl = apiBaseUrl.replace(/\/$/, '') + pageMeta.next_page_uri;
                }
            } else {
                nextUrl = null;
            }
        }

        if (allItems.length === 0) {
            showNotification('هیچ داده‌ای برای خروجی وجود ندارد.', 'error');
            return;
        }

        // نگاشت فیلدها به ستون‌های اکسل (انعطاف‌پذیر: از چند نام احتمالی فیلد استفاده می‌کنیم)
        const normalized = allItems.map(item => {
            const phone = item.phone ?? '';
            const username = item.username ?? '';
            const sourcename = item.sourcename ?? '';

            return {
                'شماره تماس': phone,
                'نام کاربری': username,
                'منبع': sourcename
            };
        });

        // تبدیل به شیت و ساخت فایل اکسل (نیاز به کتابخانه XLSX/SheetJS در صفحه)
        const worksheet = XLSX.utils.json_to_sheet(normalized);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'مخزن_مشتریان');

        const nowStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const filename = `export_leads_branch_${branchId}_${nowStr}.xlsx`;
        XLSX.writeFile(workbook, filename);

    } catch (error) {
        console.error('exportLeads error:', error);
        showNotification('خطا هنگام خروجی گرفتن: ' + (error.message || error), 'error');
    }
}



//-- :) -------------------------------------------------------------------------------------------

export function ensureGalleryState() {
    if (!currentState.gallery) {
        currentState.gallery = {
            currentPage: 1,
            pageSize: 5,
            totalPages: 1,
            totalRecords: 0,
            items: []
        };
    }
}

export function setupTabIndicator() {
    const tabs = document.querySelectorAll('.tab-item');
    const indicator = document.getElementById('tab-indicator');
    
    if (!indicator || tabs.length === 0) return;

    function updateIndicator() {
        const activeTab = document.querySelector('.tab-item.active');
        if (!activeTab) return;

        const rect = activeTab.getBoundingClientRect();
        const parentRect = activeTab.parentElement.getBoundingClientRect();
        
        indicator.style.width = `${rect.width}px`;
        indicator.style.left = `${rect.left - parentRect.left}px`;
    }

    // ابتدا موقعیت اندیکاتور را تنظیم کنید
    updateIndicator();
    
    // هنگام تغییر سایز پنجره موقعیت را به روز کنید
    window.addEventListener('resize', updateIndicator);
}

export function initAssignmentTabs() {
    const tabAssignments = document.getElementById('tab-assignments');
    const tabGallery = document.getElementById('tab-gallery');
    const assignmentsPanel = document.getElementById('assignments-panel');
    const galleryPanel = document.getElementById('gallery-panel');
    const buttonBoxAssignment = document.getElementById('button-box-assignment');

    if (!tabAssignments || !tabGallery || !assignmentsPanel || !galleryPanel) return;

    // تابع برای تغییر تب‌ها
    function switchTab(tabName) {
        if (tabName === 'assignments') {
            assignmentsPanel.classList.remove('hidden');
            galleryPanel.classList.add('hidden');
            tabAssignments.classList.add('active');
            tabGallery.classList.remove('active');
            buttonBoxAssignment.classList.remove('hidden');
        } else {
            assignmentsPanel.classList.add('hidden');
            galleryPanel.classList.remove('hidden');
            tabAssignments.classList.remove('active');
            tabGallery.classList.add('active');
            buttonBoxAssignment.classList.add('hidden');
            
            // فقط زمانی که تب گالری فعال است تصاویر را لود کنید
            if (tabName === 'gallery') {
                ensureGalleryState();
                currentState.gallery.currentPage = 1;
                fetchBranchImages().catch(error => {
                    console.error('Error loading gallery:', error);
                    showNotification('خطا در بارگذاری گالری', 'error');
                });
            }
        }
        setupTabIndicator();
    }

    // رویداد کلیک برای تب‌ها
    tabAssignments.addEventListener('click', () => switchTab('assignments'));
    tabGallery.addEventListener('click', () => switchTab('gallery'));

    // مقداردهی اولیه
    switchTab('assignments');
    
    // Lightbox events
    const lightbox = document.getElementById('image-lightbox');
    const lightboxClose = document.getElementById('lightbox-close');
    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
}

export async function fetchBranchImages(page = null) {
    const galleryContainer = document.getElementById('gallery-container');
    showLoading(galleryContainer); // نمایش لودینگ

    ensureGalleryState();
    const g = currentState.gallery;
    const token = localStorage.getItem('authToken');
    const apiBaseUrl = window.location.origin;

    if (page !== null) g.currentPage = page;
    const pageNum = g.currentPage || 1;
    const pageSize = g.pageSize || 5;

    // --- شروع اصلاح منطق Branch ID ---
    let branchIdForQuery;
    if (currentState.user && currentState.user.userrolename === 'admin') {
        branchIdForQuery = currentState.selectedBranch;
        if (branchIdForQuery === '') { // "" به معنی "همه شعب"
            branchIdForQuery = '0';
        }
    } else {
        // اگر ادمین نیست => فقط شعبه خودش
        branchIdForQuery = currentState.user.branchid;
    }
    
    if (!branchIdForQuery) {
        showNotification('شناسه شعبه یافت نشد.', 'error');
        hideLoading(galleryContainer);
        galleryContainer.innerHTML = '<div>لطفا یک شعبه انتخاب کنید.</div>';
        return;
    }
    // --- پایان اصلاح منطق Branch ID ---

    try {
        const url = new URL('/api/v1/images/by-branch', apiBaseUrl);
        url.searchParams.set('branchid', branchIdForQuery);
        url.searchParams.set('page', pageNum);
        url.searchParams.set('pageSize', pageSize);

        const resp = await fetch(url.toString(), {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!resp.ok) throw new Error(`خطا در دریافت تصاویر: ${resp.status}`);
        const json = await resp.json();

        if (!json.items) throw new Error('پاسخ سرور برای تصاویر ساختار معتبری ندارد.');
        
        g.items = (json.items || []).map(item => {
            const guid = item.url.replace('/images/', '').replace(/[{}]/g, '');
            const finalImageUrl = `${apiBaseUrl}/api/v1/images/${guid}`;
            return { url: finalImageUrl, filename: item.fileName };
        });

        g.currentPage = parseInt(json.page) || pageNum;
        g.pageSize = parseInt(json.pageSize) || pageSize;
        g.totalRecords = parseInt(json.total) || 0;
        g.totalPages = Math.max(1, Math.ceil(g.totalRecords / g.pageSize));
        
        renderGallery();
    } catch (err) {
        console.error('fetchBranchImages error:', err);
        showNotification(err.message || 'خطا در دریافت تصاویر', 'error');
    } finally {
        setTimeout(() => {
            hideLoading(galleryContainer);
            if (g.items.length === 0) {
                renderGallery(); // برای نمایش پیام "هیچ تصویری یافت نشد"
            }
        }, 300);
    }
}

/** render gallery thumbnails + pagination */
export function renderGallery() {
    ensureGalleryState();
    const g = currentState.gallery;
    const container = document.getElementById('gallery-container');
    const paginationEl = document.getElementById('gallery-pagination');
    const currentPageSpan = document.getElementById('gallery-current-page');
    const totalPagesSpan = document.getElementById('gallery-total-pages');

    if (!container || !paginationEl || !currentPageSpan || !totalPagesSpan) return;

    container.innerHTML = '';
    paginationEl.innerHTML = '';

    if (!g.items || g.items.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-gray-500 py-8">
            <i class="material-icons text-4xl mb-2">photo_library</i>
            <div>هیچ تصویری یافت نشد</div>
        </div>`;
        currentPageSpan.textContent = '0';
        totalPagesSpan.textContent = '0';
        return;
    }

    g.items.forEach(img => {
        const col = document.createElement('div');
        col.className = 'relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer shadow-sm';
        col.style.minHeight = '180px';

        const imgEl = document.createElement('img');
        imgEl.src = img.url; // اکنون URL کامل است
        imgEl.alt = img.filename || 'تصویر';
        imgEl.className = 'w-full h-44 object-cover';
        col.appendChild(imgEl);

        const meta = document.createElement('div');
        meta.className = 'p-2 text-right';
        
        // --- شروع اصلاحات ---
        // حذف نمایش تاریخ آپلود چون در پاسخ API وجود ندارد
        meta.innerHTML = `<div class="text-sm text-gray-700 font-medium">${img.filename || ''}</div>`;
        // --- پایان اصلاحات ---

        col.appendChild(meta);
        col.addEventListener('click', () => openImageLightbox(img));
        container.appendChild(col);
    });

    // بخش صفحه‌بندی بدون تغییر باقی می‌ماند...
    const startPage = Math.max(1, g.currentPage - 2);
    const endPage = Math.min(g.totalPages, g.currentPage + 2);

    if (g.currentPage > 1) {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 border rounded';
        btn.textContent = '«';
        btn.onclick = () => changeGalleryPage(-1);
        paginationEl.appendChild(btn);
    }

    for (let p = startPage; p <= endPage; p++) {
        const btn = document.createElement('button');
        btn.className = 'px-3 py-1 border rounded mx-1';
        if (p === g.currentPage) {
            btn.classList.add('bg-purple-500', 'text-white');
            btn.disabled = true;
        } else {
            btn.onclick = () => fetchBranchImages(p);
        }
        btn.textContent = p;
        paginationEl.appendChild(btn);
    }

    if (g.currentPage < g.totalPages) {
        const btn = document.createElement('button');
        btn.className = 'px-2 py-1 border rounded';
        btn.textContent = '»';
        btn.onclick = () => changeGalleryPage(1);
        paginationEl.appendChild(btn);
    }

    currentPageSpan.textContent = String(g.currentPage);
    totalPagesSpan.textContent = String(g.totalPages);
}

/** change page by delta (±1) */
export function changeGalleryPage(delta) {
    ensureGalleryState();
    const g = currentState.gallery;
    const newPage = Math.min(Math.max(1, g.currentPage + delta), g.totalPages);
    if (newPage === g.currentPage) return;
    fetchBranchImages(newPage);
}

/** open lightbox */
export function openImageLightbox(imgObj) {
    const lb = document.getElementById('image-lightbox');
    const lbImg = document.getElementById('lightbox-image');
    const lbMeta = document.getElementById('lightbox-meta');

    if (!lb || !lbImg) return;

    lbImg.src = imgObj.url;
    lbImg.alt = imgObj.filename || 'تصویر';
    if (lbMeta) {
        // --- شروع اصلاحات ---
        // حذف نمایش تاریخ آپلود
        lbMeta.innerHTML = `<div>${imgObj.filename || ''}</div>`;
        // --- پایان اصلاحات ---
    }
    lb.classList.remove('hidden');
}

/** close lightbox */
export function closeLightbox() {
    const lb = document.getElementById('image-lightbox');
    const lbImg = document.getElementById('lightbox-image');
    if (lb) lb.classList.add('hidden');
    if (lbImg) lbImg.src = '';
}

















// leads.js

// --- توابع جدید برای نمایش لودینگ ---
function showLoading(containerElement) {
    if (!containerElement) return;
    const loadingHtml = `
        <div class="loading-spinner col-span-full flex items-center justify-center py-16">
            <style>
                .spinner {
                    border: 4px solid rgba(0, 0, 0, 0.1);
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border-left-color: #6d28d9; /* purple-700 */
                    animation: spin 1s ease infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
            <div class="spinner"></div>
        </div>
    `;
    // برای جدول، محتوا را در tbody قرار می‌دهیم
    if (containerElement.tagName.toLowerCase() === 'tbody') {
        containerElement.innerHTML = `<tr><td colspan="5">${loadingHtml}</td></tr>`;
    } else { // برای گالری، محتوا را مستقیم در کانتینر قرار می‌دهیم
        containerElement.innerHTML = loadingHtml;
    }
}

function hideLoading(containerElement) {
    if (!containerElement) return;
    const spinner = containerElement.querySelector('.loading-spinner');
    if (spinner) {
        // اگر در جدول بود، کل ردیف را پاک کن
        if (containerElement.tagName.toLowerCase() === 'tbody') {
            containerElement.innerHTML = '';
        } else {
            spinner.remove();
        }
    }
}
// --- پایان توابع لودینگ ---
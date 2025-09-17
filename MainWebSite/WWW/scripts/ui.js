import { currentState } from './state.js';
import { fetchLeads } from './leads.js';
import { pages } from './main.js'
import { initSystemManagement } from './systemAdmin.js';
import { initCustomersTab } from './ControllerCustomer.js';
import {
    setupSidebarEventListeners,
    setupLoginEventListeners,
    setupLeadsPageListeners,
    setupUploadPageListeners,
    closeSidebar
} from './events.js';
import { getUserInfo } from './auth.js'; 

export function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        
        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 3000);
    }
}

export function renderLeadsTable() {
    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;
    
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
    
    // رندر کردن داده‌ها (کد کامل آن بستگی به ساختار داده‌های شما دارد)
    currentState.leads.forEach((lead, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="py-3 px-4 border-b">
                <input type="checkbox" class="lead-checkbox" data-id="${lead.id}">
            </td>
            <td class="py-3 px-4 border-b">${lead.phone || ''}</td>
            <td class="py-3 px-4 border-b">${lead.name || ''}</td>
            <td class="py-3 px-4 border-b">${lead.status || ''}</td>
            <td class="py-3 px-4 border-b">${lead.assignedAt || ''}</td>
            <td class="py-3 px-4 border-b">${lead.lastContact || ''}</td>
            <td class="py-3 px-4 border-b">
                <button class="text-blue-500 hover:text-blue-700 view-details" data-id="${lead.id}">
                    <i class="material-icons">visibility</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

export function renderPagination() {
    const paginationElement = document.getElementById('pagination-numbers');
    if (!paginationElement) return;
    
    const { currentPage, totalPages } = currentState;
    paginationElement.innerHTML = '';

    // ایجاد دکمه‌های صفحه‌بندی
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'bg-purple-500 text-white' : 'border border-gray-300'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            if (i !== currentPage) {
                currentState.currentPage = i;
                fetchLeads();
            }
        });
        paginationElement.appendChild(pageBtn);
    }

    // به‌روزرسانی وضعیت دکمه‌های قبلی/بعدی
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    if (currentPageEl) currentPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
}

export function openDetailModal(leadId) {
    const lead = currentState.leads.find(l => l.id === leadId);
    if (!lead) return;

    currentState.currentLead = lead;

    const nameEl = document.getElementById('lead-name');
    const phoneEl = document.getElementById('lead-phone');
    const nationalCodeEl = document.getElementById('lead-national-code');
    const assignedAtEl = document.getElementById('lead-assigned-at');
    const modal = document.getElementById('lead-modal');
    
    if (nameEl) nameEl.textContent = `${lead.firstName} ${lead.lastName}`;
    if (phoneEl) phoneEl.textContent = lead.phone;
    if (nationalCodeEl) nationalCodeEl.textContent = lead.nationalCode;
    if (assignedAtEl) assignedAtEl.textContent = lead.assignedAt;
    if (modal) modal.classList.remove('hidden');
}

export function openContactModal(leadId) {
    openDetailModal(leadId);
    // در اینجا می‌توانید بخش‌های خاص مربوط به تماس را فعال کنید
}


let sidebarLoaded = false;

export async function loadPage(pageName) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`[data-page="${pageName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // به روزرسانی عنوان صفحه
    const pageTitle = document.getElementById('page-title');
    if (pageTitle && activeItem) {
        const spanElement = activeItem.querySelector('span');
        if (spanElement) {
            pageTitle.textContent = spanElement.textContent;
        }
    }

    if (window.innerWidth < 768) {
        closeSidebar();
    }

    // بارگذاری محتوای صفحه
    fetch(pages[pageName])
        .then(response => response.text())
        .then(html => {
            if (pageName !== 'login') {
                document.getElementById('main-content').classList.remove('hidden');
                document.getElementById('app').classList.remove('hidden');
                document.getElementById('login-container').classList.add('hidden');

                if (!sidebarLoaded) {
                    const sidebarContainer = document.getElementById('sidebar-container');
                    if (sidebarContainer) {
                        fetch(pages['sidebar'])
                            .then(response => response.text())
                            .then(sidebarHtml => {
                                sidebarContainer.innerHTML = sidebarHtml;
                                setupSidebarEventListeners();
                                sidebarLoaded = true;
                                // *** مهم: getUserInfo در اینجا فراخوانی می‌شود ***
                                getUserInfo();
                            })
                            .catch(error => console.error('Error loading sidebar:', error));
                    }
                }

                const container = document.getElementById('pages-container');
                if (container) {
                    container.innerHTML = html;

                if (pageName === 'dashboard') {
                    initDashboard();
                } else if (pageName === 'assigned-numbers') {
                    initAssignedNumbers();
                    setupLeadsPageListeners();
                    fetchLeads();
                } else if (pageName === 'upload') {
                    initUploadPage();
                    setupUploadPageListeners();
                } else if (pageName === 'system-management') {
                    initSystemManagement(); 
                    
                    const user = JSON.parse(localStorage.getItem('user'));
                    if (user && user.role === 'admin') {
                        document.getElementById('admin-menu-item').classList.remove('hidden');
                    }
                } else if (pageName === 'customer-management') {  // شرط جدید
                    initCustomersTab();  // این تابع event listenerها و loadCustomers را فراخوانی می‌کند
                }
                
            }
            } else {
                document.getElementById('app').classList.add('hidden');
                document.getElementById('login-container').classList.remove('hidden');

                const loginContainer = document.getElementById('login-container');
                if (loginContainer) {
                    loginContainer.innerHTML = html;
                    setupLoginEventListeners();
                }
            }
        })
        .catch(error => {
            console.error('Error loading page:', error);
            const container = document.getElementById('pages-container');
            if (container) {
                container.innerHTML = `
                    <div class="bg-white rounded-xl shadow-md p-6">
                        <div class="text-center text-gray-500 py-8">
                            <i class="material-icons text-4xl mb-2">error</i>
                            <p>خطا در بارگذاری صفحه. لطفا دوباره تلاش کنید.</p>
                        </div>
                    </div>
                `;
            }
        });
}

// توابعی که در صفحات فراخوانی می‌شوند
export function initDashboard() {
    console.log("Dashboard initialized");
    // این تابع در dashboard.html فراخوانی می‌شود
}

export function initAssignedNumbers() {
    console.log("Assigned numbers initialized");
    // این تابع در assigned-numbers.html فراخوانی می‌شود
}

export function initLoginPage() {
    console.log("initLoginPage page initialized");
    // این تابع در login-section.html فراخوانی می‌شود
}

export function initUploadPage() {
    console.log("Upload page initialized");
}
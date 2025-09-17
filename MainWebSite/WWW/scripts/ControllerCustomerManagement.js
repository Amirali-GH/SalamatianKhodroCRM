import { showNotification, debounce } from "./systemAdmin.js";

// -------------------- مدیریت وضعیت مشتری --------------------
export function initCustomerStatusesTab() {
    console.log("Initializing Customer Statuses Tab...");
    
    const addStatusBtn = document.getElementById('add-customer-status-btn');
    if (addStatusBtn) {
        addStatusBtn.addEventListener('click', function() {
            document.getElementById('customer-status-modal-title').textContent = 'افزودن وضعیت جدید';
            document.getElementById('customer-status-form').reset();
            document.getElementById('customer-status-id').value = '';
            document.getElementById('customer-status-modal').classList.remove('hidden');
        });
    }
    
    const statusForm = document.getElementById('customer-status-form');
    if (statusForm) {
        statusForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCustomerStatus();
        });
    }
    
    const statusSearch = document.getElementById('customer-status-search');
    if (statusSearch) {
        statusSearch.addEventListener('input', debounce(function() {
            const search = this.value;
            const status = document.getElementById('customer-status-filter').value;
            loadCustomerStatuses(1, search, status);
        }, 300));
    }
    
    const statusFilter = document.getElementById('customer-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const search = document.getElementById('customer-status-search').value;
            const status = this.value;
            loadCustomerStatuses(1, search, status);
        });
    }
    
    loadCustomerStatuses();
}

export async function loadCustomerStatuses(page = 1, search = '', status = 'all') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/customer-status?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        if (status !== 'all') url += `&status=${status}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت داده‌ها');
        
        const data = await response.json();
        renderCustomerStatusesTable(data.data);
        renderCustomerStatusesPagination(data.meta);
    } catch (error) {
        console.error('Error loading customer statuses:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

export function renderCustomerStatusesTable(statuses) {
    const tbody = document.getElementById('customer-statuses-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (statuses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    موردی یافت نشد
                </td>
            </tr>
        `;
        return;
    }
    
    statuses.forEach(status => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${status.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${status.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${status.description || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${status.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-purple-600 hover:text-purple-900 edit-customer-status mr-3" data-id="${status.customerstatusid}">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-customer-status" data-id="${status.customerstatusid}">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.edit-customer-status').forEach(button => {
        button.addEventListener('click', function() {
            const statusId = this.getAttribute('data-id');
            editCustomerStatus(statusId);
        });
    });
    
    document.querySelectorAll('.delete-customer-status').forEach(button => {
        button.addEventListener('click', function() {
            const statusId = this.getAttribute('data-id');
            deleteCustomerStatus(statusId);
        });
    });
}

export function renderCustomerStatusesPagination(meta) {
    const paginationContainer = document.getElementById('customer-statuses-pagination');
    if (!paginationContainer || !meta || !meta.page) return;

    const current_page = parseInt(meta.page.page_num);
    const page_size = parseInt(meta.page.page_size);
    const total_count = meta.count;
    const total_pages = Math.ceil(total_count / page_size);

    paginationContainer.innerHTML = `
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2 space-x-reverse">
                <button class="pagination-btn ${current_page === 1 ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${current_page === 1 ? 'disabled' : ''} id="customer-statuses-prev-page">
                    قبلی
                </button>
                
                ${Array.from({ length: total_pages }, (_, i) => i + 1).map(page => `
                    <button class="pagination-btn ${page === current_page ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}" 
                        data-page="${page}">
                        ${page}
                    </button>
                `).join('')}
                
                <button class="pagination-btn ${current_page === total_pages ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${current_page === total_pages ? 'disabled' : ''} id="customer-statuses-next-page">
                    بعدی
                </button>
            </div>
        </div>
    `;

    document.querySelectorAll('#customer-statuses-pagination button[data-page]').forEach(button => {
        button.addEventListener('click', function() {
            const page = parseInt(this.getAttribute('data-page'));
            const search = document.getElementById('customer-status-search').value;
            const status = document.getElementById('customer-status-filter').value;
            loadCustomerStatuses(page, search, status);
        });
    });

    const prevButton = document.getElementById('customer-statuses-prev-page');
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (current_page > 1) {
                const search = document.getElementById('customer-status-search').value;
                const status = document.getElementById('customer-status-filter').value;
                loadCustomerStatuses(current_page - 1, search, status);
            }
        });
    }

    const nextButton = document.getElementById('customer-statuses-next-page');
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (current_page < total_pages) {
                const search = document.getElementById('customer-status-search').value;
                const status = document.getElementById('customer-status-filter').value;
                loadCustomerStatuses(current_page + 1, search, status);
            }
        });
    }
}

export async function saveCustomerStatus() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const statusId = document.getElementById('customer-status-id').value;
        
        const statusData = {
            code: document.getElementById('customer-status-code').value,
            name: document.getElementById('customer-status-name').value,
            description: document.getElementById('customer-status-description').value,
            isactive: document.getElementById('customer-status-isactive').checked
        };
        
        const url = statusId 
            ? `${apiBaseUrl}/api/v1/customer-status/${statusId}`
            : `${apiBaseUrl}/api/v1/customer-status`;
            
        const method = statusId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(statusData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(responseData.meta.description || 'کد وضعیت مشتری تکراری است');
            } else if (response.status === 404) {
                throw new Error('وضعیت مشتری یافت نشد');
            } else {
                throw new Error(responseData.meta.description || 'خطا در ذخیره داده‌ها');
            }
        }
        
        document.getElementById('customer-status-modal').classList.add('hidden');
        showNotification(responseData.meta.description || 'اطلاعات با موفقیت ذخیره شد', 'success');
        loadCustomerStatuses();
    } catch (error) {
        console.error('Error saving customer status:', error);
        showNotification(error.message || 'خطا در ذخیره داده‌ها', 'error');
    }
}

export async function editCustomerStatus(statusId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer-status/${statusId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('وضعیت مشتری یافت نشد');
            } else {
                throw new Error('خطا در دریافت داده‌ها');
            }
        }
        
        const data = await response.json();
        const status = data.data;
        
        document.getElementById('customer-status-modal-title').textContent = 'ویرایش وضعیت مشتری';
        document.getElementById('customer-status-id').value = status.customerstatusid;
        document.getElementById('customer-status-code').value = status.code || '';
        document.getElementById('customer-status-name').value = status.name || '';
        document.getElementById('customer-status-description').value = status.description || '';
        document.getElementById('customer-status-isactive').checked = status.isactive;
        
        document.getElementById('customer-status-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading customer status:', error);
        showNotification(error.message || 'خطا در دریافت داده‌ها', 'error');
    }
}

export async function deleteCustomerStatus(statusId) {
    if (!confirm('آیا از حذف این وضعیت مشتری اطمینان دارید؟ این عمل قابل بازگشت نیست.')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer-status/${statusId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('وضعیت مشتری مورد نظر یافت نشد!');
            } else {
                throw new Error(responseData.meta.description || 'خطا در حذف داده‌ها');
            }
        }
        
        showNotification(responseData.meta.description || 'وضعیت مشتری با موفقیت حذف شد', 'success');
        loadCustomerStatuses();
    } catch (error) {
        console.error('Error deleting customer status:', error);
        showNotification(error.message || 'خطا در حذف داده‌ها', 'error');
    }
}

// -------------------- مدیریت پتانسیل مشتری --------------------
export function initCustomerPotentialsTab() {
    console.log("Initializing Customer Potentials Tab...");
    
    const addPotentialBtn = document.getElementById('add-customer-potential-btn');
    if (addPotentialBtn) {
        addPotentialBtn.addEventListener('click', function() {
            document.getElementById('customer-potential-modal-title').textContent = 'افزودن پتانسیل جدید';
            document.getElementById('customer-potential-form').reset();
            document.getElementById('customer-potential-id').value = '';
            document.getElementById('customer-potential-modal').classList.remove('hidden');
        });
    }
    
    const potentialForm = document.getElementById('customer-potential-form');
    if (potentialForm) {
        potentialForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCustomerPotential();
        });
    }
    
    const potentialSearch = document.getElementById('customer-potential-search');
    if (potentialSearch) {
        potentialSearch.addEventListener('input', debounce(function() {
            const search = this.value;
            const status = document.getElementById('customer-potential-filter').value;
            loadCustomerPotentials(1, search, status);
        }, 300));
    }
    
    const potentialFilter = document.getElementById('customer-potential-filter');
    if (potentialFilter) {
        potentialFilter.addEventListener('change', function() {
            const search = document.getElementById('customer-potential-search').value;
            const status = this.value;
            loadCustomerPotentials(1, search, status);
        });
    }
    
    loadCustomerPotentials();
}

export async function loadCustomerPotentials(page = 1, search = '', status = 'both') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/potential-level?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        if (status !== 'all') url += `&status=${status}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('خطا در دریافت داده‌ها');
        
        const data = await response.json();
        renderCustomerPotentialsTable(data.data);
        renderCustomerPotentialsPagination(data.meta);
    } catch (error) {
        console.error('Error loading customer potentials:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

export function renderCustomerPotentialsTable(potentials) {
    const tbody = document.getElementById('customer-potentials-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (potentials.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    موردی یافت نشد
                </td>
            </tr>
        `;
        return;
    }
    
    potentials.forEach(potential => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${potential.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${potential.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${potential.description || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${potential.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${potential.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-purple-600 hover:text-purple-900 edit-customer-potential mr-3" data-id="${potential.potentiallevelid}">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-customer-potential" data-id="${potential.potentiallevelid}">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.edit-customer-potential').forEach(button => {
        button.addEventListener('click', function() {
            const potentialId = this.getAttribute('data-id');
            editCustomerPotential(potentialId);
        });
    });
    
    document.querySelectorAll('.delete-customer-potential').forEach(button => {
        button.addEventListener('click', function() {
            const potentialId = this.getAttribute('data-id');
            deleteCustomerPotential(potentialId);
        });
    });
}

export function renderCustomerPotentialsPagination(meta) {
    const paginationContainer = document.getElementById('customer-potentials-pagination');
    if (!paginationContainer || !meta || !meta.page) return;

    const current_page = parseInt(meta.page.page_num);
    const page_size = parseInt(meta.page.page_size);
    const total_count = meta.count;
    const total_pages = Math.ceil(total_count / page_size);

    paginationContainer.innerHTML = `
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2 space-x-reverse">
                <button class="pagination-btn ${current_page === 1 ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${current_page === 1 ? 'disabled' : ''} id="customer-potentials-prev-page">
                    قبلی
                </button>
                
                ${Array.from({ length: total_pages }, (_, i) => i + 1).map(page => `
                    <button class="pagination-btn ${page === current_page ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'}" 
                        data-page="${page}">
                        ${page}
                    </button>
                `).join('')}
                
                <button class="pagination-btn ${current_page === total_pages ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${current_page === total_pages ? 'disabled' : ''} id="customer-potentials-next-page">
                    بعدی
                </button>
            </div>
        </div>
    `;

    document.querySelectorAll('#customer-potentials-pagination button[data-page]').forEach(button => {
        button.addEventListener('click', function() {
            const page = parseInt(this.getAttribute('data-page'));
            const search = document.getElementById('customer-potential-search').value;
            const status = document.getElementById('customer-potential-filter').value;
            loadCustomerPotentials(page, search, status);
        });
    });

    const prevButton = document.getElementById('customer-potentials-prev-page');
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (current_page > 1) {
                const search = document.getElementById('customer-potential-search').value;
                const status = document.getElementById('customer-potential-filter').value;
                loadCustomerPotentials(current_page - 1, search, status);
            }
        });
    }

    const nextButton = document.getElementById('customer-potentials-next-page');
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (current_page < total_pages) {
                const search = document.getElementById('customer-potential-search').value;
                const status = document.getElementById('customer-potential-filter').value;
                loadCustomerPotentials(current_page + 1, search, status);
            }
        });
    }
}

export async function saveCustomerPotential() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const potentialId = document.getElementById('customer-potential-id').value;
        
        const potentialData = {
            code: document.getElementById('customer-potential-code').value,
            name: document.getElementById('customer-potential-name').value,
            description: document.getElementById('customer-potential-description').value,
            isactive: document.getElementById('customer-potential-isactive').checked
        };
        
        const url = potentialId 
            ? `${apiBaseUrl}/api/v1/potential-level/${potentialId}`
            : `${apiBaseUrl}/api/v1/potential-level`;
            
        const method = potentialId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(potentialData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(responseData.meta.description || 'کد پتانسیل مشتری تکراری است');
            } else if (response.status === 404) {
                throw new Error('پتانسیل مشتری یافت نشد');
            } else {
                throw new Error(responseData.meta.description || 'خطا در ذخیره داده‌ها');
            }
        }
        
        document.getElementById('customer-potential-modal').classList.add('hidden');
        showNotification(responseData.meta.description || 'اطلاعات با موفقیت ذخیره شد', 'success');
        loadCustomerPotentials();
    } catch (error) {
        console.error('Error saving customer potential:', error);
        showNotification(error.message || 'خطا در ذخیره داده‌ها', 'error');
    }
}

export async function editCustomerPotential(potentialId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/potential-level/${potentialId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('پتانسیل مشتری یافت نشد');
            } else {
                throw new Error('خطا در دریافت داده‌ها');
            }
        }
        
        const data = await response.json();
        const potential = data.data;
        
        document.getElementById('customer-potential-modal-title').textContent = 'ویرایش پتانسیل مشتری';
        document.getElementById('customer-potential-id').value = potential.potentiallevelid;
        document.getElementById('customer-potential-code').value = potential.code || '';
        document.getElementById('customer-potential-name').value = potential.name || '';
        document.getElementById('customer-potential-description').value = potential.description || '';
        document.getElementById('customer-potential-isactive').checked = potential.isactive;
        
        document.getElementById('customer-potential-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading customer potential:', error);
        showNotification(error.message || 'خطا در دریافت داده‌ها', 'error');
    }
}

export async function deleteCustomerPotential(potentialId) {
    if (!confirm('آیا از حذف این پتانسیل مشتری اطمینان دارید؟ این عمل قابل بازگشت نیست.')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/potential-level/${potentialId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('پتانسیل مشتری مورد نظر یافت نشد!');
            } else {
                throw new Error(responseData.meta.description || 'خطا در حذف داده‌ها');
            }
        }
        
        showNotification(responseData.meta.description || 'پتانسیل مشتری با موفقیت حذف شد', 'success');
        loadCustomerPotentials();
    } catch (error) {
        console.error('Error deleting customer potential:', error);
        showNotification(error.message || 'خطا در حذف داده‌ها', 'error');
    }
}


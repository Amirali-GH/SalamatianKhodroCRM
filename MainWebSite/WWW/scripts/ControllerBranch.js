import { showNotification } from "./systemAdmin.js";

export function initBranchesTab() {
    // Initialize add branch button
    document.getElementById('add-branch-btn').addEventListener('click', function() {
        document.getElementById('branch-modal-title').textContent = 'افزودن شعبه جدید';
        document.getElementById('branch-form').reset();
        document.getElementById('branch-id').value = '';
        document.getElementById('branch-modal').classList.remove('hidden');
    });

    // Initialize form submission
    document.getElementById('branch-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveBranch();
    });

    // Initialize search and filters
    document.getElementById('branch-search').addEventListener('input', function() {
        loadBranches(1, this.value);
    });

    document.getElementById('branch-status-filter').addEventListener('change', function() {
        loadBranches(1, document.getElementById('branch-search').value, this.value);
    });

    // Load initial data
    loadBranches();
}

export async function loadBranches(page = 1, search = '', status = 'all') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/branch?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        if (status !== 'all') url += `&status=${status}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || 'خطا در دریافت داده‌ها');
        }
        
        const data = await response.json();
        renderBranchesTable(data.data);
        renderBranchesPagination(data.meta);
    } catch (error) {
        console.error('Error loading branches:', error);
        showNotification(error.message, 'error');
    }
}

export function renderBranchesTable(branches) {
    const tbody = document.getElementById('branches-table-body');
    tbody.innerHTML = '';
    
    if (branches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    موردی یافت نشد
                </td>
            </tr>
        `;
        return;
    }
    
    branches.forEach(branch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${branch.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.mainname}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.secondname || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.phone || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${branch.description || '-'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${branch.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${branch.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 view-branch mr-2" data-id="${branch.branchid}">جزئیات</button>
                <button class="text-purple-600 hover:text-purple-900 edit-branch mr-2" data-id="${branch.branchid}">ویرایش</button>
                <button class="text-red-600 hover:text-red-900 delete-branch" data-id="${branch.branchid}">حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.view-branch').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('data-id');
            viewBranchDetails(branchId);
        });
    });
    
    document.querySelectorAll('.edit-branch').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('data-id');
            editBranch(branchId);
        });
    });
    
    document.querySelectorAll('.delete-branch').forEach(button => {
        button.addEventListener('click', function() {
            const branchId = this.getAttribute('data-id');
            deleteBranch(branchId);
        });
    });
}

export function renderBranchesPagination(meta) {
    const paginationElement = document.getElementById('branches-pagination');
    if (!paginationElement) return;
    
    paginationElement.innerHTML = '';
    
    // Previous button
    if (meta.page.page_num > 1) {
        const prevBtn = document.createElement('div');
        prevBtn.className = 'pagination-btn border border-gray-300';
        prevBtn.innerHTML = '&raquo; قبلی';
        prevBtn.addEventListener('click', () => {
            loadBranches(parseInt(meta.page.page_num) - 1, 
                document.getElementById('branch-search').value,
                document.getElementById('branch-status-filter').value
            );
        });
        paginationElement.appendChild(prevBtn);
    }
    
    // Page numbers
    for (let i = 1; i <= meta.page.total_pages; i++) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `pagination-btn ${i === parseInt(meta.page.page_num) ? 'bg-purple-500 text-white' : 'border border-gray-300'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            loadBranches(i, 
                document.getElementById('branch-search').value,
                document.getElementById('branch-status-filter').value
            );
        });
        paginationElement.appendChild(pageBtn);
    }
    
    // Next button
    if (meta.page.page_num < meta.page.total_pages) {
        const nextBtn = document.createElement('div');
        nextBtn.className = 'pagination-btn border border-gray-300';
        nextBtn.innerHTML = 'بعدی &laquo;';
        nextBtn.addEventListener('click', () => {
            loadBranches(parseInt(meta.page.page_num) + 1, 
                document.getElementById('branch-search').value,
                document.getElementById('branch-status-filter').value
            );
        });
        paginationElement.appendChild(nextBtn);
    }
}

export async function saveBranch() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const branchId = document.getElementById('branch-id').value;
        
        const branchData = {
            code: document.getElementById('branch-code').value,
            mainname: document.getElementById('branch-mainname').value,
            secondname: document.getElementById('branch-secondname').value,
            phone: document.getElementById('branch-phone').value,
            description: document.getElementById('branch-description').value,
            isactive: document.getElementById('branch-isactive').checked,
            issystemic: document.getElementById('branch-issystemic').checked
        };
        
        const url = branchId 
            ? `${apiBaseUrl}/api/v1/branch/${branchId}`
            : `${apiBaseUrl}/api/v1/branch`;
            
        const method = branchId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(branchData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.meta?.description || 'خطا در ذخیره داده‌ها');
        }
        
        document.getElementById('branch-modal').classList.add('hidden');
        showNotification(responseData.meta?.description || 'اطلاعات با موفقیت ذخیره شد', 'success');
        loadBranches();
    } catch (error) {
        console.error('Error saving branch:', error);
        showNotification(error.message, 'error');
    }
}

export async function editBranch(branchId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/branch/${branchId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || 'خطا در دریافت اطلاعات');
        }
        
        const { data } = await response.json();
        
        document.getElementById('branch-modal-title').textContent = 'ویرایش شعبه';
        document.getElementById('branch-id').value = data.branchid;
        document.getElementById('branch-code').value = data.code;
        document.getElementById('branch-mainname').value = data.mainname;
        document.getElementById('branch-secondname').value = data.secondname || '';
        document.getElementById('branch-phone').value = data.phone || '';
        document.getElementById('branch-description').value = data.description || '';
        document.getElementById('branch-isactive').checked = data.isactive;
        document.getElementById('branch-issystemic').checked = data.issystemic;
        
        document.getElementById('branch-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading branch for edit:', error);
        showNotification(error.message, 'error');
    }
}

export async function deleteBranch(branchId) {
    if (!confirm('آیا از حذف این شعبه مطمئن هستید؟')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/branch/${branchId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.meta?.description || 'خطا در حذف شعبه');
        }
        
        showNotification(responseData.meta?.description || 'شعبه با موفقیت حذف شد', 'success');
        loadBranches();
    } catch (error) {
        console.error('Error deleting branch:', error);
        showNotification(error.message, 'error');
    }
}

export async function viewBranchDetails(branchId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/branch/${branchId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || 'خطا در دریافت اطلاعات');
        }
        
        const { data } = await response.json();
        
        // Create a modal for showing details
        const detailModal = document.createElement('div');
        detailModal.className = 'modal-overlay';
        detailModal.innerHTML = `
            <div class="modal-content w-full max-w-2xl">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">جزئیات شعبه</h3>
                    <button type="button" class="text-gray-400 hover:text-gray-500 close-detail-modal">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 class="text-md font-medium text-gray-700 mb-2">اطلاعات اصلی</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">کد شعبه:</label>
                            <p class="text-sm text-gray-900">${data.code}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">نام اصلی:</label>
                            <p class="text-sm text-gray-900">${data.mainname}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">نام ثانویه:</label>
                            <p class="text-sm text-gray-900">${data.secondname || '-'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">تلفن:</label>
                            <p class="text-sm text-gray-900">${data.phone || '-'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">توضیحات:</label>
                            <p class="text-sm text-gray-900">${data.description || '-'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">وضعیت:</label>
                            <p class="text-sm text-gray-900">${data.isactive ? 'فعال' : 'غیرفعال'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">سیستمی:</label>
                            <p class="text-sm text-gray-900">${data.issystemic ? 'بله' : 'خیر'}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">تاریخ ایجاد:</label>
                            <p class="text-sm text-gray-900">${new Date(data.createdat).toLocaleDateString('fa-IR')}</p>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end mt-4">
                    <button type="button" class="btn-outline close-detail-modal">بستن</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(detailModal);
        detailModal.classList.remove('hidden');
        
        // Add event listener for closing the modal
        detailModal.querySelector('.close-detail-modal').addEventListener('click', () => {
            detailModal.remove();
        });
    } catch (error) {
        console.error('Error loading branch details:', error);
        showNotification(error.message, 'error');
    }
}
import { showNotification, debounce } from "./systemAdmin.js";

export function initSaleAgentsTab() {
    console.log("Initializing Sale Agents Tab");
    
    // Initialize add sale agent button
    const addButton = document.getElementById('add-saleagent-btn');
    if (addButton) {
        addButton.addEventListener('click', function() {
            document.getElementById('saleagent-modal-title').textContent = 'افزودن کارشناس جدید';
            document.getElementById('saleagent-form').reset();
            document.getElementById('saleagent-employeeid').value = '';
            document.getElementById('saleagent-modal').classList.remove('hidden');
        });
    }

    // Initialize form submission
    const saleagentForm = document.getElementById('saleagent-form');
    if (saleagentForm) {
        saleagentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSaleAgent();
        });
    }

    // Initialize search and filters
    const searchInput = document.getElementById('saleagent-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            loadSaleAgents(1, this.value);
        }, 300));
    }

    const statusFilter = document.getElementById('saleagent-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            loadSaleAgents(1, 
                document.getElementById('saleagent-search')?.value || '', 
                this.value
            );
        });
    }

    // Load initial data
    loadSaleAgents();
}

export async function loadSaleAgents(page = 1, search = '', status = 'both') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/employee/saleagent/?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        if (status !== 'both') url += `&status=${status === 'active' ? 'Active' : 'Inactive'}`;
        
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
        renderSaleAgentsTable(data.data);
        renderSaleAgentsPagination(data.meta);
    } catch (error) {
        console.error('Error loading sale agents:', error);
        showNotification(error.message, 'error');
    }
}

export function renderSaleAgentsTable(saleAgents) {
    const tbody = document.getElementById('saleagents-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!saleAgents || saleAgents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    موردی یافت نشد
                </td>
            </tr>
        `;
        return;
    }
    
    saleAgents.forEach(agent => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${agent.employeeid}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${agent.firstname || ''} ${agent.lastname || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${agent.nationalcode || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${agent.phonenumber || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${agent.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${agent.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${agent.createdat ? new Date(agent.createdat).toLocaleDateString('fa-IR') : ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 view-saleagent mr-2" data-id="${agent.employeeid}">جزئیات</button>
                <button class="text-purple-600 hover:text-purple-900 edit-saleagent mr-2" data-id="${agent.employeeid}">ویرایش</button>
                <button class="text-red-600 hover:text-red-900 delete-saleagent" data-id="${agent.employeeid}">حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners for action buttons
    document.querySelectorAll('.view-saleagent').forEach(button => {
        button.addEventListener('click', function() {
            const agentId = this.getAttribute('data-id');
            viewSaleAgentDetails(agentId);
        });
    });
    
    document.querySelectorAll('.edit-saleagent').forEach(button => {
        button.addEventListener('click', function() {
            const agentId = this.getAttribute('data-id');
            editSaleAgent(agentId);
        });
    });
    
    document.querySelectorAll('.delete-saleagent').forEach(button => {
        button.addEventListener('click', function() {
            const agentId = this.getAttribute('data-id');
            deleteSaleAgent(agentId);
        });
    });
}

export function renderSaleAgentsPagination(meta) {
    const paginationElement = document.getElementById('saleagents-pagination');
    if (!paginationElement || !meta.page) return;
    
    paginationElement.innerHTML = '';
    
    const currentPage = parseInt(meta.page.page_num);
    const totalPages = Math.ceil(meta.page.total_size / meta.page.page_size);
    
    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('div');
        prevBtn.className = 'pagination-btn border border-gray-300';
        prevBtn.innerHTML = '&raquo; قبلی';
        prevBtn.addEventListener('click', () => {
            loadSaleAgents(currentPage - 1, 
                document.getElementById('saleagent-search')?.value || '',
                document.getElementById('saleagent-status-filter')?.value || 'both'
            );
        });
        paginationElement.appendChild(prevBtn);
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('div');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'bg-purple-500 text-white' : 'border border-gray-300'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            loadSaleAgents(i, 
                document.getElementById('saleagent-search')?.value || '',
                document.getElementById('saleagent-status-filter')?.value || 'both'
            );
        });
        paginationElement.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('div');
        nextBtn.className = 'pagination-btn border border-gray-300';
        nextBtn.innerHTML = 'بعدی &laquo;';
        nextBtn.addEventListener('click', () => {
            loadSaleAgents(currentPage + 1, 
                document.getElementById('saleagent-search')?.value || '',
                document.getElementById('saleagent-status-filter')?.value || 'both'
            );
        });
        paginationElement.appendChild(nextBtn);
    }
}

export async function saveSaleAgent() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const agentId = document.getElementById('saleagent-employeeid').value;
        
        const agentData = {
            employeeroleid: 1, // نقش کارشناس فروش
            firstname: document.getElementById('saleagent-firstname').value || null,
            lastname: document.getElementById('saleagent-lastname').value,
            nationalcode: document.getElementById('saleagent-nationalcode').value || null,
            birthdate: document.getElementById('saleagent-birthdate').value || null,
            hiredate: document.getElementById('saleagent-hiredate').value || null,
            phonenumber: document.getElementById('saleagent-phonenumber').value || null,
            email: document.getElementById('saleagent-email').value || null,
            address: document.getElementById('saleagent-address').value || null,
            isactive: document.getElementById('saleagent-isactive').checked,
            description: document.getElementById('saleagent-description').value || null
        };
        
        // Clean empty fields
        Object.keys(agentData).forEach(key => {
            if (agentData[key] === null || agentData[key] === '') {
                delete agentData[key];
            }
        });
        
        const url = agentId 
            ? `${apiBaseUrl}/api/v1/employee/${agentId}`
            : `${apiBaseUrl}/api/v1/employee/saleagent/`;
            
        const method = agentId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(agentData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.meta?.description || 'خطا در ذخیره داده‌ها');
        }
        
        document.getElementById('saleagent-modal').classList.add('hidden');
        showNotification(responseData.meta?.description || 'اطلاعات با موفقیت ذخیره شد', 'success');
        loadSaleAgents();
    } catch (error) {
        console.error('Error saving sale agent:', error);
        showNotification(error.message, 'error');
    }
}

export async function editSaleAgent(agentId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/employee/${agentId}`, {
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
        
        document.getElementById('saleagent-modal-title').textContent = 'ویرایش کارشناس';
        document.getElementById('saleagent-employeeid').value = data.employeeid;
        document.getElementById('saleagent-firstname').value = data.firstname || '';
        document.getElementById('saleagent-lastname').value = data.lastname || '';
        document.getElementById('saleagent-nationalcode').value = data.nationalcode || '';
        document.getElementById('saleagent-birthdate').value = data.birthdate || '';
        document.getElementById('saleagent-hiredate').value = data.hiredate || '';
        document.getElementById('saleagent-phonenumber').value = data.phonenumber || '';
        document.getElementById('saleagent-email').value = data.email || '';
        document.getElementById('saleagent-address').value = data.address || '';
        document.getElementById('saleagent-description').value = data.description || '';
        document.getElementById('saleagent-isactive').checked = data.isactive;
        
        document.getElementById('saleagent-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading sale agent for edit:', error);
        showNotification(error.message, 'error');
    }
}

export async function deleteSaleAgent(agentId) {
    if (!confirm('آیا از حذف این کارشناس مطمئن هستید؟')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/employee/${agentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.meta?.description || 'خطا در حذف کارشناس');
        }
        
        showNotification(responseData.meta?.description || 'کارشناس با موفقیت حذف شد', 'success');
        loadSaleAgents();
    } catch (error) {
        console.error('Error deleting sale agent:', error);
        showNotification(error.message, 'error');
    }
}

export async function viewSaleAgentDetails(agentId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/employee/${agentId}`, {
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
                    <h3 class="text-lg font-medium text-gray-900">جزئیات کارشناس فروش</h3>
                    <button type="button" class="text-gray-400 hover:text-gray-500 close-detail-modal">
                        <i class="material-icons">close</i>
                    </button>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 class="text-md font-medium text-gray-700 mb-2">اطلاعات اصلی</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">کد کارشناس:</label>
                            <p class="text-sm text-gray-900">${data.employeeid}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">نام کامل:</label>
                            <p class="text-sm text-gray-900">${data.firstname || ''} ${data.lastname || ''}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">کد ملی:</label>
                            <p class="text-sm text-gray-900">${data.nationalcode || ''}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">تلفن:</label>
                            <p class="text-sm text-gray-900">${data.phonenumber || ''}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">ایمیل:</label>
                            <p class="text-sm text-gray-900">${data.email || ''}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">تاریخ تولد:</label>
                            <p class="text-sm text-gray-900">${data.birthdate || ''}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">تاریخ استخدام:</label>
                            <p class="text-sm text-gray-900">${data.hiredate || ''}</p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">وضعیت:</label>
                            <p class="text-sm text-gray-900">${data.isactive ? 'فعال' : 'غیرفعال'}</p>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700">آدرس:</label>
                            <p class="text-sm text-gray-900">${data.address || ''}</p>
                        </div>
                        <div class="md:col-span-2">
                            <label class="block text-sm font-medium text-gray-700">توضیحات:</label>
                            <p class="text-sm text-gray-900">${data.description || ''}</p>
                        </div>
                    </div>
                </div>
                <div class="flex justify-end mt-4">
                    <button type="button" class="px-4 py-2 border rounded-md close-detail-modal">بستن</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(detailModal);
        detailModal.classList.remove('hidden');
        
        // Add event listener for closing the modal
        const closeButton = detailModal.querySelector('.close-detail-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                detailModal.remove();
            });
        }
    } catch (error) {
        console.error('Error loading sale agent details:', error);
        showNotification(error.message, 'error');
    }
}
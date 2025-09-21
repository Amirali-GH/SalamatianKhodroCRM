import { showNotification, debounce } from "./systemAdmin.js";
// -------------------- مدیریت مشتریان --------------------

export function initCustomersTab() {
    console.log("Initializing Customers Tab...");
    
    // باز کردن مودال برای افزودن مشتری
    const addCustomerBtn = document.getElementById('add-customer-btn');
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', function() {
            document.getElementById('customer-modal-title').textContent = 'افزودن مشتری جدید';
            document.getElementById('customer-form').reset();
            document.getElementById('customer-id').value = '';
            document.getElementById('customer-modal').classList.remove('hidden');
        });
    }    
    
    // ثبت فرم مشتری
    const customerForm = document.getElementById('customer-form');
    if (customerForm) {
        customerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCustomer();
        });
    }
    
     // فیلتر کردن مشتریان
    const customerSearch = document.getElementById('customer-search');
    if (customerSearch) {
        customerSearch.addEventListener('input', debounce(function() {
            const search = this.value;
            const status = document.getElementById('customer-status-filter').value;
            loadCustomers(1, search, status); // همیشه از صفحه 1 شروع کنیم
        }, 300));
    }
    
    const customerStatusFilter = document.getElementById('customer-status-filter');
    if (customerStatusFilter) {
        customerStatusFilter.addEventListener('change', function() {
            const search = document.getElementById('customer-search').value;
            const status = this.value;
            loadCustomers(1, search, status); // همیشه از صفحه 1 شروع کنیم
        });
    }
    
    // بستن مودال‌ها
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.add('hidden');
            });
        });
    });
    
    // دکمه خروجی اکسل
    const exportCustomersBtn = document.getElementById('export-customers-btn');
    if (exportCustomersBtn) {
        exportCustomersBtn.addEventListener('click', exportCustomers);
    }
    
    // بارگذاری اولیه داده‌ها
    loadCustomers();
}

// ... (The rest of the existing functions: loadCustomers, renderCustomersPagination, renderCustomersTable, saveCustomer, etc. remain unchanged) ...
export async function loadCustomers(page = 1, search = '', status = 'both') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/customer?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        if (status !== 'both') url += `&status=${status}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت داده‌ها');
        
        const data = await response.json();
        
        renderCustomersTable(data.data);
        renderCustomersPagination(data.meta, page, search, status);
    } catch (error) {
        console.error('Error loading customers:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

export function renderCustomersPagination(meta, currentPage, search, status) {
    const paginationContainer = document.getElementById('customers-pagination');
    if (!paginationContainer || !meta) return;

    const currentPageNum = parseInt(currentPage, 10);

    const hasNextPage = !!meta.page.next_page_uri;
    const hasPrevPage = currentPageNum > 1;

    let paginationHTML = `
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-2 space-x-reverse">
                <button class="pagination-btn ${!hasPrevPage ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${!hasPrevPage ? 'disabled' : ''} id="customers-prev-page">
                    قبلی
                </button>
                <span class="pagination-btn bg-purple-500 text-white">${currentPageNum}</span>
                <button class="pagination-btn ${!hasNextPage ? 'bg-gray-200 cursor-not-allowed' : 'hover:bg-gray-100'}" 
                    ${!hasNextPage ? 'disabled' : ''} id="customers-next-page">
                    بعدی
                </button>
            </div>
        </div>
    `;

    paginationContainer.innerHTML = paginationHTML;

    const prevButton = document.getElementById('customers-prev-page');
    if (prevButton && hasPrevPage) {
        prevButton.addEventListener('click', () => {
            loadCustomers(currentPageNum - 1, search, status);
        });
    }

    const nextButton = document.getElementById('customers-next-page');
    if (nextButton && hasNextPage) {
        nextButton.addEventListener('click', () => {
            loadCustomers(currentPageNum + 1, search, status);
        });
    }
}

export function renderCustomersTable(customers) {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!customers || customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                    موردی یافت نشد
                </td>
            </tr>
        `;
        return;
    }
    
    customers.forEach(customer => {
        const row = document.createElement('tr');
        
        const cleanPhone = customer.phone ? customer.phone.replace('$', '') : '-';
        const cleanNationalId = customer.nationalid ? customer.nationalid.replace('$', '') : '-';
           
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                ${customer.customerid}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.fullname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.phone || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.customerstatus || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.requestedcarname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.branchname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                ${customer.saleagentname || ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                <button class="text-blue-600 hover:text-blue-900 view-customer mr-3" data-id="${customer.customerid}">
                    <i class="material-icons text-base">visibility</i>
                </button>
                <button class="text-purple-600 hover:text-purple-900 edit-customer mr-3" data-id="${customer.customerid}">
                    <i class="material-icons text-base">edit</i>
                </button>
                <button class="text-red-600 hover:text-red-900 delete-customer" data-id="${customer.customerid}">
                    <i class="material-icons text-base">delete</i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.view-customer').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-id');
            viewCustomerDetails(customerId);
        });
    });
    
    document.querySelectorAll('.edit-customer').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-id');
            editCustomer(customerId);
        });
    });
    
    document.querySelectorAll('.delete-customer').forEach(button => {
        button.addEventListener('click', function() {
            const customerId = this.getAttribute('data-id');
            deleteCustomer(customerId);
        });
    });
}

export async function saveCustomer() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const customerId = document.getElementById('customer-id').value;
        
        const customerData = {
            firstname: document.getElementById('customer-firstname').value,
            lastname: document.getElementById('customer-lastname').value,
            phone: document.getElementById('customer-phone').value,
            email: document.getElementById('customer-email').value,
            nationalid: document.getElementById('customer-nationalid').value,
            address: document.getElementById('customer-address').value,
            budget: document.getElementById('customer-budget').value ? parseInt(document.getElementById('customer-budget').value) : null,
            isactive: document.getElementById('customer-isactive').checked,
            description: document.getElementById('customer-description').value
        };
        
        const url = customerId 
            ? `${apiBaseUrl}/api/v1/customer/${customerId}`
            : `${apiBaseUrl}/api/v1/customer`;
            
        const method = customerId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(customerData)
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 409) {
                throw new Error(responseData.meta.description || 'ایمیل یا شماره تلفن یا کدملی مشتری تکراری است');
            } else if (response.status === 404) {
                throw new Error('مشتری یافت نشد');
            } else {
                throw new Error(responseData.meta.description || 'خطا در ذخیره داده‌ها');
            }
        }
        
        document.getElementById('customer-modal').classList.add('hidden');
        showNotification(responseData.meta.description || 'اطلاعات با موفقیت ذخیره شد', 'success');
        loadCustomers();
    } catch (error) {
        console.error('Error saving customer:', error);
        showNotification(error.message || 'خطا در ذخیره داده‌ها', 'error');
    }
}

export async function editCustomer(customerId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('مشتری یافت نشد');
            } else {
                throw new Error('خطا در دریافت داده‌ها');
            }
        }
        
        const data = await response.json();
        const customer = data.data;
        
        document.getElementById('customer-modal-title').textContent = 'ویرایش مشتری';
        document.getElementById('customer-id').value = customer.customerid;
        document.getElementById('customer-firstname').value = customer.firstname || '';
        document.getElementById('customer-lastname').value = customer.lastname || '';
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-nationalid').value = customer.nationalid || '';
        document.getElementById('customer-address').value = customer.address || '';
        document.getElementById('customer-budget').value = customer.budget || '';
        document.getElementById('customer-description').value = customer.description || '';
        document.getElementById('customer-isactive').checked = customer.isactive;
        
        document.getElementById('customer-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading customer:', error);
        showNotification(error.message || 'خطا در دریافت داده‌ها', 'error');
    }
}

export async function viewCustomerDetails(customerId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer/${customerId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('مشتری یافت نشد');
            } else {
                throw new Error('خطا در دریافت داده‌ها');
            }
        }
        
        const data = await response.json();
        const customer = data.data;
        
        const customerInfo = document.getElementById('customer-detail-info');
        customerInfo.innerHTML = `
            <div>
                <p class="text-sm text-gray-600">شناسه: <span class="font-medium">${customer.customerid}</span></p>
                <p class="text-sm text-gray-600">نام کامل: <span class="font-medium">${customer.firstname} ${customer.lastname}</span></p>
                <p class="text-sm text-gray-600">تلفن: <span class="font-medium">${customer.phone || '-'}</span></p>
                <p class="text-sm text-gray-600">ایمیل: <span class="font-medium">${customer.email || '-'}</span></p>
            </div>
            <div>
                <p class="text-sm text-gray-600">کد ملی: <span class="font-medium">${customer.nationalid || '-'}</span></p>
                <p class="text-sm text-gray-600">بودجه: <span class="font-medium">${customer.budget ? new Intl.NumberFormat('fa-IR').format(customer.budget) + ' تومان' : '-'}</span></p>
                <p class="text-sm text-gray-600">آدرس: <span class="font-medium">${customer.address || '-'}</span></p>
                <p class="text-sm text-gray-600">وضعیت: <span class="font-medium">${customer.isactive ? 'فعال' : 'غیرفعال'}</span></p>
            </div>
            ${customer.description ? `
            <div class="col-span-2">
                <p class="text-sm text-gray-600">توضیحات: <span class="font-medium">${customer.description}</span></p>
            </div>
            ` : ''}
        `;
        
        document.getElementById('customer-detail-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading customer details:', error);
        showNotification(error.message || 'خطا در دریافت داده‌ها', 'error');
    }
}

export async function deleteCustomer(customerId) {
    if (!confirm('آیا از حذف این مشتری اطمینان دارید؟ این عمل قابل بازگشت نیست.')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/customer/${customerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseData = await response.json();
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('مشتری مورد نظر یافت نشد!');
            } else {
                throw new Error(responseData.meta.description || 'خطا در حذف داده‌ها');
            }
        }
        
        showNotification(responseData.meta.description || 'مشتری با موفقیت حذف شد', 'success');
        loadCustomers();
    } catch (error) {
        console.error('Error deleting customer:', error);
        showNotification(error.message || 'خطا در حذف داده‌ها', 'error');
    }
}

// --------------------------- NEW FUNCTION ---------------------------
// خروجی اکسل برای مشتریان
export async function exportCustomers() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        if (!token) {
            showNotification('لطفاً ابتدا وارد سیستم شوید');
            return;
        }

        // خواندن فیلترهای فعلی (search و status)
        const search = document.getElementById('customer-search')?.value || '';
        const status = document.getElementById('customer-status-filter')?.value || 'both';

        // نقطه شروع درخواست
        let requestUrl = `${apiBaseUrl}/api/v1/customer`;
        const params = new URLSearchParams();
        if (search) params.set('context', encodeURIComponent(search));
        if (status !== 'both') params.set('status', status);
        if (params.toString()) {
            requestUrl += `?${params.toString()}`;
        }

        const allItems = [];
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // فراخوانی اول و دنبال کردن pagination
        let nextUrl = requestUrl;
        while (nextUrl) {
            const resp = await fetch(nextUrl, { headers });
            if (!resp.ok) throw new Error(`خطا در دریافت داده‌ها: ${resp.status}`);

            const json = await resp.json();

            if (!json.data || !Array.isArray(json.data)) {
                throw new Error('داده‌های دریافتی ساختار مورد انتظار را ندارند.');
            }

            allItems.push(...json.data);

            const pageMeta = json.meta && json.meta.page;
            if (pageMeta && pageMeta.next_page_uri) {
                if (pageMeta.next_page_uri.startsWith('http')) {
                    nextUrl = pageMeta.next_page_uri;
                } else {
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

        // نگاشت فیلدها به ستون‌های اکسل
        const normalized = allItems.map(item => {
            return {
                'شناسه': item.customerid || '',
                'نام': item.firstname || '',
                'نام خانوادگی': item.lastname || '',
                'نام کامل': item.fullname || '',
                'تلفن': item.phone || '',
                'ایمیل': item.email || '',
                'کد ملی': item.nationalid || '',
                'آدرس': item.address || '',
                'بودجه': item.budget ? new Intl.NumberFormat('fa-IR').format(item.budget) : '',
                'وضعیت': item.customerstatus || (item.isactive ? 'فعال' : 'غیرفعال'),
                'خودرو درخواستی': item.requestedcarname || '',
                'شعبه': item.branchname || '',
                'کارشناس': item.saleagentname || '',
                'توضیحات': item.description || ''
            };
        });

        // تبدیل به شیت و ساخت فایل اکسل
        const worksheet = XLSX.utils.json_to_sheet(normalized);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'مشتریان');

        const nowStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
        const filename = `export_customers_${nowStr}.xlsx`;
        XLSX.writeFile(workbook, filename);

    } catch (error) {
        console.error('exportCustomers error:', error);
        showNotification('خطا هنگام خروجی گرفتن: ' + (error.message || error), 'error');
    }
}
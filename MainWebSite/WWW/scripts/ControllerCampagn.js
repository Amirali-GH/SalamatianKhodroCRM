import { showNotification } from "./systemAdmin.js";

export function initCampaignsTab() {
    // مدیریت مودال
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            document.getElementById('campaign-modal').classList.add('hidden');
        });
    });
    
    // باز کردن مودال برای افزودن کمپین
    document.getElementById('add-campaign-btn').addEventListener('click', function() {
        document.getElementById('campaign-modal-title').textContent = 'افزودن کمپین جدید';
        document.getElementById('campaign-form').reset();
        document.getElementById('campaign-id').value = '';
        document.getElementById('campaign-modal').classList.remove('hidden');
    });
    
    // ثبت فرم کمپین
    document.getElementById('campaign-form').addEventListener('submit', function(e) {
        e.preventDefault();
        saveCampaign();
    });
    
    // فیلتر و جستجو
    document.getElementById('campaign-search').addEventListener('input', function() {
        const search = this.value;
        const status = document.getElementById('campaign-status-filter').value;
        loadCampaigns(1, search, status);
    });
    
    document.getElementById('campaign-status-filter').addEventListener('change', function() {
        const search = document.getElementById('campaign-search').value;
        const status = this.value;
        loadCampaigns(1, search, status);
    });
    
    // بارگذاری اولیه داده‌ها
    loadCampaigns();
}

export async function loadCampaigns(page = 1, search = '', status = 'both') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/campaign?page=${page}`;
        if (search) url += `&context=${encodeURIComponent(search)}`;
        if (['both', 'active', 'notactive'].includes(status)) url += `&status=${status}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت داده‌ها');
        
        const data = await response.json();
        renderCampaignsTable(data.data);
        renderCampaignsPagination(data.meta);
    } catch (error) {
        console.error('Error loading campaigns:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

export function renderCampaignsTable(campaigns) {
    const tbody = document.getElementById('campaigns-table-body');
    tbody.innerHTML = '';
    
    if (campaigns.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                    موردی یافت نشد
                </td>
            </tr>
        `;
        return;
    }
    
    campaigns.forEach(campaign => {
        const row = document.createElement('tr');
        const budget = campaign.budget ? new Intl.NumberFormat('fa-IR').format(campaign.budget) + ' تومان' : 'تعریف نشده';
        
        row.innerHTML = `
            <td class="px-6 py-4 text-center whitespace-nowrap text-sm font-medium text-gray-900">${campaign.code}</td>
            <td class="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500">${campaign.mainname}</td>
            <td class="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500">${new Date(campaign.startdate).toLocaleDateString('fa-IR')}</td>
            <td class="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500">${new Date(campaign.enddate).toLocaleDateString('fa-IR')}</td>
            <td class="px-6 py-4 text-center whitespace-nowrap text-sm text-gray-500">${budget}</td>
            <td class="px-6 py-4 text-center whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${campaign.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${campaign.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-purple-600 hover:text-purple-900 edit-campaign mr-3" data-id="${campaign.campaignid}">ویرایش</button>
                <button class="text-red-600 hover:text-red-900 delete-campaign" data-id="${campaign.campaignid}">حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // افزودن event listeners برای دکمه‌های ویرایش و حذف
    document.querySelectorAll('.edit-campaign').forEach(button => {
        button.addEventListener('click', function() {
            const campaignId = this.getAttribute('data-id');
            editCampaign(campaignId);
        });
    });
    
    document.querySelectorAll('.delete-campaign').forEach(button => {
        button.addEventListener('click', function() {
            const campaignId = this.getAttribute('data-id');
            deleteCampaign(campaignId);
        });
    });
}

export async function editCampaign(campaignId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/campaign/${campaignId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات کمپین');
        
        const data = await response.json();
        const campaign = data.data;
        
        // پر کردن فرم با اطلاعات کمپین
        document.getElementById('campaign-modal-title').textContent = 'ویرایش کمپین';
        document.getElementById('campaign-id').value = campaign.campaignid;
        document.getElementById('campaign-code').value = campaign.code;
        document.getElementById('campaign-name').value = campaign.mainname;
        document.getElementById('campaign-secondname').value = campaign.secondname || '';
        document.getElementById('campaign-description').value = campaign.description || '';
        document.getElementById('campaign-budget').value = campaign.budget || '';
        
        // تبدیل تاریخ‌ها به فرمت مناسب
        const startDate = new Date(campaign.startdate).toISOString().slice(0, 10);
        const endDate = new Date(campaign.enddate).toISOString().slice(0, 10);
        
        document.getElementById('campaign-startdate').value = startDate;
        document.getElementById('campaign-enddate').value = endDate;
        document.getElementById('campaign-isactive').checked = campaign.isactive;
        
        // نمایش مودال
        document.getElementById('campaign-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading campaign:', error);
        showNotification('خطا در دریافت اطلاعات کمپین', 'error');
    }
}

export async function deleteCampaign(campaignId) {
    if (!confirm('آیا از حذف این کمپین اطمینان دارید؟')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/campaign/${campaignId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta.description || 'خطا در حذف کمپین');
        }
        
        showNotification('کمپین با موفقیت حذف شد', 'success');
        loadCampaigns();
    } catch (error) {
        console.error('Error deleting campaign:', error);
        showNotification(error.message, 'error');
    }
}

export async function saveCampaign() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const campaignId = document.getElementById('campaign-id').value;
        
        const campaignData = {
            code: document.getElementById('campaign-code').value,
            mainname: document.getElementById('campaign-name').value,
            secondname: document.getElementById('campaign-secondname').value,
            description: document.getElementById('campaign-description').value,
            startdate: document.getElementById('campaign-startdate').value,
            enddate: document.getElementById('campaign-enddate').value,
            budget: document.getElementById('campaign-budget').value ? parseFloat(document.getElementById('campaign-budget').value) : null,
            isactive: document.getElementById('campaign-isactive').checked
        };
        
        const url = campaignId 
            ? `${apiBaseUrl}/api/v1/campaign/${campaignId}`
            : `${apiBaseUrl}/api/v1/campaign`;
            
        const method = campaignId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(campaignData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta.description || 'خطا در ذخیره داده‌ها');
        }
        
        document.getElementById('campaign-modal').classList.add('hidden');
        showNotification('اطلاعات با موفقیت ذخیره شد', 'success');
        loadCampaigns();
    } catch (error) {
        console.error('Error saving campaign:', error);
        showNotification(error.message, 'error');
    }
}

export function renderCampaignsPagination(meta) {
    const paginationElement = document.getElementById('campaigns-pagination');
    if (!paginationElement) return;
    
    const { currentPage, totalPages } = meta;
    paginationElement.innerHTML = '';
    
    // ایجاد دکمه‌های صفحه‌بندی
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `mx-1 px-3 py-1 rounded ${i === currentPage ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            const search = document.getElementById('campaign-search').value;
            const status = document.getElementById('campaign-status-filter').value;
            loadCampaigns(i, search, status);
        });
        paginationElement.appendChild(pageBtn);
    }
}
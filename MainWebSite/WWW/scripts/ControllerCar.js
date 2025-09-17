import { showNotification } from "./systemAdmin.js";

let carCompanies = [];
let carCategories = [];


export function initCarsTab() {
    console.log("Initializing Cars Tab");
    document.querySelectorAll('[id^="subtab-"]').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('[id^="subtab-"]').forEach(btn => {
                btn.classList.remove('active', 'text-purple-600', 'border-purple-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            });

            this.classList.add('active', 'text-purple-600', 'border-purple-600');
            this.classList.remove('text-gray-500', 'border-transparent');

            document.querySelectorAll('[id^="content-sub-"]').forEach(panel => panel.classList.add('hidden'));

            const targetPanel = this.id.replace('subtab-', 'content-sub-');
            const panel = document.getElementById(targetPanel);
            if (panel) panel.classList.remove('hidden');

            if (this.id === 'subtab-companies') {
                initCarCompaniesSubTab();
            } else if (this.id === 'subtab-categories') {
                initCarCategoriesSubTab(); // <-- NOTE: function name with 's'
            } else if (this.id === 'subtab-cars') {
                initCarsSubTab();
            }
        });
    });

    loadCarCompanies();
    loadCarCategories();

    const defaultTab = document.getElementById('subtab-cars');
    if (defaultTab) defaultTab.click();
}

export function initCarsSubTab() {
    // Existing code for cars
    const addCarBtn = document.getElementById('add-car-btn');
    if (addCarBtn) {
        addCarBtn.addEventListener('click', function() {
            document.getElementById('car-modal-title').textContent = 'افزودن خودرو جدید';
            document.getElementById('car-form').reset();
            document.getElementById('car-id').value = '';
            populateCarCompanyDropdown();
            populateCarCategoryDropdown();
            document.getElementById('car-modal').classList.remove('hidden');
        });
    }
    
    const carForm = document.getElementById('car-form');
    if (carForm) {
        carForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveCar();
        });
    }
    
    const carSearch = document.getElementById('car-search');
    if (carSearch) {
        carSearch.addEventListener('input', function() {
            const search = this.value;
            const status = document.getElementById('car-status-filter').value;
            loadCars(1, search, status);
        });
    }
    
    const statusFilter = document.getElementById('car-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            const search = document.getElementById('car-search').value;
            const status = this.value;
            loadCars(1, search, status);
        });
    }
    
    loadCars();
}

export function initCarCompaniesSubTab() {
    // Add company button
    document.getElementById('add-company-btn').addEventListener('click', () => {
        document.getElementById('company-modal-title').textContent = 'افزودن شرکت جدید';
        document.getElementById('company-form').reset();
        document.getElementById('company-id').value = '';
        document.getElementById('company-modal').classList.remove('hidden');
    });

    // Form submit
    document.getElementById('company-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCarCompany();
    });

    // Search and filter
    document.getElementById('company-search').addEventListener('input', function() {
        loadCarCompanies(1, this.value, document.getElementById('company-status-filter').value);
    });

    document.getElementById('company-status-filter').addEventListener('change', function() {
        loadCarCompanies(1, document.getElementById('company-search').value, this.value);
    });

    // Load initial data
    loadCarCompanies();
}

export function initCarCategoriesSubTab() { // renamed from initCarCategorySubTab
    const addBtn = document.getElementById('add-category-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const title = document.getElementById('category-modal-title');
            if (title) title.textContent = 'افزودن دسته بندی جدید';
            const form = document.getElementById('category-form');
            if (form) form.reset();
            const id = document.getElementById('category-id');
            if (id) id.value = '';
            const modal = document.getElementById('category-modal');
            if (modal) modal.classList.remove('hidden');
        });
    }

    const form = document.getElementById('category-form');
    if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCarCategory();
    });

    const search = document.getElementById('category-search');
    if (search) search.addEventListener('input', function() {
        loadCarCategories(1, this.value, document.getElementById('category-status-filter')?.value || 'all');
    });

    const status = document.getElementById('category-status-filter');
    if (status) status.addEventListener('change', function() {
        loadCarCategories(1, document.getElementById('category-search')?.value || '', this.value);
    });

    // initial load
    loadCarCategories();
}

export async function loadCars(page = 1, search = '', status = 'both') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        let url = `${apiBaseUrl}/api/v1/car?page=${page}`;
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
        renderCarsTable(data.data);
        renderCarsPagination(data.meta);
    } catch (error) {
        console.error('Error loading cars:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

export async function loadCarCompanies(page = 1, search = '', status = 'all') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        let url = `${apiBaseUrl}/api/v1/car-company?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status !== 'all') url += `&isactive=${status === 'active'}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('خطا در دریافت داده‌ها');

        const data = await response.json();
        carCompanies = data.data || [];      // <-- assign here
        renderCarCompaniesTable(carCompanies);
        renderCarCompaniesPagination(data.meta);
    } catch (error) {
        console.error('Error loading car companies:', error);
        showNotification('خطا در دریافت شرکت‌های خودرو', 'error');
    }
}

export async function loadCarCategories(page = 1, search = '', status = 'all') {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        let url = `${apiBaseUrl}/api/v1/car-category?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status !== 'both') url += `&isactive=${status === 'active'}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('خطا در دریافت دسته‌بندی‌ها');

        const data = await response.json();
        carCategories = data.data || [];    

        renderCarCategoriesTable(carCategories);
        renderCarCategoriesPagination(data.meta);
    } catch (error) {
        console.error('Error loading car categories:', error);
        showNotification('خطا در دریافت دسته‌بندی‌های خودرو', 'error');
    }
}

export function populateCarCompanyDropdown() {
    const dropdown = document.getElementById('car-company');
    dropdown.innerHTML = '<option value="">انتخاب شرکت</option>';
    carCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = company.name;
        dropdown.appendChild(option);
    });
}

export function populateCarCategoryDropdown() {
    const dropdown = document.getElementById('car-category');
    dropdown.innerHTML = '<option value="">انتخاب دسته‌بندی</option>';
    carCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        dropdown.appendChild(option);
    });
}

export function renderCarsTable(cars) {
    const tbody = document.getElementById('cars-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!cars || cars.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500">موردی یافت نشد</td></tr>`;
        return;
    }

    cars.forEach(car => {
        const company = carCompanies.find(c => c.id === car.companyid) || {};   // <-- use c.id
        const category = carCategories.find(c => c.id === car.categoryid) || {}; // <-- use c.id
        const price = car.baseprice ? new Intl.NumberFormat('fa-IR').format(car.baseprice) + ' تومان' : 'تعریف نشده';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${car.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${car.mainname}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${company.name || 'نامشخص'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${category.name || 'نامشخص'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${car.year || 'نامشخص'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${price}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${car.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${car.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-purple-600 hover:text-purple-900 edit-car mr-3" data-id="${car.carid}">ویرایش</button>
                <button class="text-red-600 hover:text-red-900 delete-car" data-id="${car.carid}">حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // افزودن event listeners برای دکمه‌های ویرایش و حذف
    document.querySelectorAll('.edit-car').forEach(button => {
        button.addEventListener('click', function() {
            const carId = this.getAttribute('data-id');
            editCar(carId);
        });
    });
    
    document.querySelectorAll('.delete-car').forEach(button => {
        button.addEventListener('click', function() {
            const carId = this.getAttribute('data-id');
            deleteCar(carId);
        });
    });
}

export function renderCarsPagination(meta) {
    const paginationElement = document.getElementById('cars-pagination');
    if (!paginationElement) return;
    
    const currentPage = parseInt(meta.page.page_num, 10);
    const pageSize = parseInt(meta.page.page_size, 10);
    const totalItems = meta.count;
    const totalPages = Math.ceil(totalItems / pageSize);

    paginationElement.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `mx-1 px-3 py-1 rounded ${
            i === currentPage ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            const search = document.getElementById('car-search').value;
            const status = document.getElementById('car-status-filter').value;
            loadCars(i, search, status);
        });
        paginationElement.appendChild(pageBtn);
    }
}

export function renderCarCompaniesTable(companies) {
    const tbody = document.getElementById('companies-table-body');
    tbody.innerHTML = '';
    
    if (companies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">موردی یافت نشد</td></tr>`;
        return;
    }
    
    companies.forEach(company => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${company.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${company.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${company.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${company.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${company.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-purple-600 hover:text-purple-900 edit-company mr-3" data-id="${company.id}">ویرایش</button>
                <button class="text-red-600 hover:text-red-900 delete-company" data-id="${company.id}">حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.edit-company').forEach(btn => btn.addEventListener('click', () => editCarCompany(btn.dataset.id)));
    document.querySelectorAll('.delete-company').forEach(btn => btn.addEventListener('click', () => deleteCarCompany(btn.dataset.id)));
}

export function renderCarCompaniesPagination(meta) {
    const pagination = document.getElementById('companies-pagination');
    if (!pagination) return;
    pagination.innerHTML = '';
    const currentPage = parseInt(meta.page.page_num);
    const totalPages = Math.ceil(meta.count / parseInt(meta.page.page_size));
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `mx-1 px-3 py-1 rounded ${i === currentPage ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700'}`;
        btn.textContent = i;
        btn.addEventListener('click', () => loadCarCompanies(i, document.getElementById('company-search').value, document.getElementById('company-status-filter').value));
        pagination.appendChild(btn);
    }
}

export function renderCarCategoriesTable(carCategories) {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!carCategories || carCategories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">موردی یافت نشد</td></tr>`;
        return;
    }
    
    carCategories.forEach(category => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${category.code}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${category.mainname}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${category.secondname || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${category.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${category.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${category.isactive ? 'فعال' : 'غیرفعال'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-purple-600 hover:text-purple-900 edit-category mr-3" data-id="${category.categoryid}">ویرایش</button>
                <button class="text-red-600 hover:text-red-900 delete-category" data-id="${category.categoryid}">حذف</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-category').forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            editCarCategory(categoryId);
        });
    });
    
    document.querySelectorAll('.delete-category').forEach(button => {
        button.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            deleteCarCategory(categoryId);
        });
    });
}

export function renderCarCategoriesPagination(meta) {
    const paginationElement = document.getElementById('categories-pagination');
    if (!paginationElement) return;
    
    paginationElement.innerHTML = '';
    const currentPage = parseInt(meta.page.page_num, 10);
    const pageSize = parseInt(meta.page.page_size, 10);
    const totalItems = meta.count;
    const totalPages = Math.ceil(totalItems / pageSize);

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `mx-1 px-3 py-1 rounded ${
            i === currentPage ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            const search = document.getElementById('category-search').value;
            const status = document.getElementById('category-status-filter').value;
            loadCarCategories(i, search, status);
        });
        paginationElement.appendChild(pageBtn);
    }
}

export async function editCar(carId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/car/${carId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات خودرو');
        
        const data = await response.json();
        const car = data.data;
        
        // پر کردن فرم با اطلاعات خودرو
        document.getElementById('car-modal-title').textContent = 'ویرایش خودرو';
        document.getElementById('car-id').value = car.carid;
        document.getElementById('car-code').value = car.code;
        document.getElementById('car-name').value = car.mainname;
        document.getElementById('car-secondname').value = car.secondname || '';
        document.getElementById('car-company').value = car.companyid;
        document.getElementById('car-category').value = car.categoryid;
        document.getElementById('car-year').value = car.year || '';
        document.getElementById('car-fueltype').value = car.fueltype || '';
        document.getElementById('car-transmission').value = car.transmission || '';
        document.getElementById('car-enginecapacity').value = car.enginecapacity || '';
        document.getElementById('car-horsepower').value = car.horsepower || '';
        document.getElementById('car-torque').value = car.torque || '';
        document.getElementById('car-seats').value = car.seats || '';
        document.getElementById('car-drivetype').value = car.drivetype || '';
        document.getElementById('car-bodytype').value = car.bodytype || '';
        document.getElementById('car-rangekm').value = car.rangekm || '';
        document.getElementById('car-safetyrating').value = car.safetyrating || '';
        document.getElementById('car-baseprice').value = car.baseprice || '';
        document.getElementById('car-description').value = car.description || '';
        document.getElementById('car-isactive').checked = car.isactive;
        
        // نمایش مودال
        document.getElementById('car-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading car:', error);
        showNotification('خطا در دریافت اطلاعات خودرو', 'error');
    }
}

export async function deleteCar(carId) {
    if (!confirm('آیا از حذف این خودرو اطمینان دارید؟')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/car/${carId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta.description || 'خطا در حذف خودرو');
        }
        
        showNotification('خودرو با موفقیت حذف شد', 'success');
        loadCars();
    } catch (error) {
        console.error('Error deleting car:', error);
        showNotification(error.message, 'error');
    }
}

export async function saveCar() {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        const carId = document.getElementById('car-id').value;

        const carData = {
            code: document.getElementById('car-code').value,
            mainname: document.getElementById('car-mainname').value, // <-- use mainname
            secondname: document.getElementById('car-secondname').value,
            companyid: parseInt(document.getElementById('car-company').value) || null,
            categoryid: parseInt(document.getElementById('car-category').value) || null,
            year: document.getElementById('car-year').value ? parseInt(document.getElementById('car-year').value) : null,
            // ... rest unchanged, make sure ids match HTML
        };

        const url = carId ? `${apiBaseUrl}/api/v1/car/${carId}` : `${apiBaseUrl}/api/v1/car`;
        const method = carId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(carData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta?.description || 'خطا در ذخیره داده‌ها');
        }

        document.getElementById('car-modal').classList.add('hidden');
        showNotification('اطلاعات با موفقیت ذخیره شد', 'success');
        loadCars();
    } catch (error) {
        console.error('Error saving car:', error);
        showNotification(error.message, 'error');
    }
}

export async function saveCarCategory() {
    // Similar to saveCar, but for company
    // Implement POST/PUT to /api/v1/car-company
    // ...
}

export async function saveCarCompany() {
    // Similar to saveCar, but for company
    // Implement POST/PUT to /api/v1/car-company
    // ...
}

export async function editCarCompany(id) {
    // Fetch and populate form
    // ...
}

export async function deleteCarCompany(id) {
    // DELETE to /api/v1/car-company/{id}
    // ...
}

export async function editCarCategory(categoryId) {
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/car-category/${categoryId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات دسته‌بندی');
        
        const data = await response.json();
        const category = data.data;
        
        // Populate form with category data
        document.getElementById('category-modal-title').textContent = 'ویرایش دسته‌بندی';
        document.getElementById('category-id').value = category.categoryid;
        document.getElementById('category-code').value = category.code;
        document.getElementById('category-mainname').value = category.mainname;
        document.getElementById('category-secondname').value = category.secondname || '';
        document.getElementById('category-description').value = category.description || '';
        document.getElementById('category-isactive').checked = category.isactive;
        
        // Show modal
        document.getElementById('category-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading category:', error);
        showNotification('خطا در دریافت اطلاعات دسته‌بندی', 'error');
    }
}

export async function deleteCarCategory(categoryId) {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;
    
    try {
        const apiBaseUrl = window.location.origin;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${apiBaseUrl}/api/v1/car-category/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.meta.description || 'خطا در حذف دسته‌بندی');
        }
        
        showNotification('دسته‌بندی با موفقیت حذف شد', 'success');
        loadCarCategories();
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification(error.message, 'error');
    }
}



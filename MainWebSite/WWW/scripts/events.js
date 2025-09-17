import { handleLogin, handleLogout } from './auth.js';
import { handleFileSelect, handleDrop, loadUploadedFiles, preventDefaults, highlight, unhighlight, uploadFile, downloadSampleExcel } from './fileHandling.js';
import { handleSearch, handleSort, toggleSelectAll, exportLeads, changePage, handlePageSizeChange, closeModal, saveContactResult, handleBranchChange } from './leads.js';
import { loadPage } from './ui.js';

export function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    const sidebarMenuBtn = document.getElementById('mobile-menu-btn');
    if (sidebarMenuBtn) {
        sidebarMenuBtn.addEventListener('click', toggleSidebar);
    }    
}

export function setupSidebarEventListeners() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.getAttribute('data-page')) {
                e.preventDefault();
                loadPage(this.getAttribute('data-page'));
                closeSidebar();
            }
        });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

export function setupLoginEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

export function setupUploadPageListeners() {
    // بارگذاری اولیه فایل‌ها
    loadUploadedFiles();

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const uploadBtn = document.getElementById('upload-btn');
    const samlpeBtn = document.getElementById('sample-btn');
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    const confirmModal = document.getElementById('confirm-upload-modal');
    const processingModal = document.getElementById('processing-modal');
    const closeModalBtns = document.querySelectorAll('#close-modal');
    const fileDetailsModal = document.getElementById('file-details-modal');
    
    if (dropArea && fileInput) {
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
    }

    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadFile);
    }

    if (samlpeBtn) {
        samlpeBtn.addEventListener('click', downloadSampleExcel);
    }

    if (closeModalBtns && fileDetailsModal) {
        closeModalBtns.forEach(button => {
            button.addEventListener('click', function() {
                fileDetailsModal.classList.add('hidden');
            });
        });
    }

    // اضافه کردن event listener برای جستجو

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    }

    // اضافه کردن event listener برای modal تأیید آپلود
    if (confirmModal) {
        confirmModal.addEventListener('click', (e) => {
            if (e.target === confirmModal) {
                confirmModal.classList.add('hidden');
            }
        });
    }

    // اضافه کردن event listener برای modal پردازش
    if (processingModal) {
        processingModal.addEventListener('click', (e) => {
            if (e.target === processingModal) {
                // اجازه نمی‌دهیم کاربر هنگام پردازش modal را ببندد
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }
   
}

export function setupLeadsPageListeners() {
    const searchInput = document.getElementById('search-input');
    const sortableHeaders = document.querySelectorAll('.sortable-header');
    const selectAll = document.getElementById('select-all');
    const exportBtn = document.getElementById('export-btn');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    const pageSize = document.getElementById('page-size');
    const closeModalBtn = document.getElementById('close-modal');
    const contactForm = document.getElementById('contact-form');

    const branchFilter = document.getElementById('branch-filter');
    if (branchFilter) {
        branchFilter.addEventListener('change', handleBranchChange);
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (sortableHeaders.length > 0) {
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => handleSort(header.dataset.sort));
        });
    }

    if (selectAll) {
        selectAll.addEventListener('change', toggleSelectAll);
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportLeads);
    }

    if (prevPage) {
        prevPage.addEventListener('click', () => changePage(-1));
    }

    if (nextPage) {
        nextPage.addEventListener('click', () => changePage(1));
    }

    if (pageSize) {
        pageSize.addEventListener('change', handlePageSizeChange);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    if (contactForm) {
        contactForm.addEventListener('submit', saveContactResult);
    }
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');
    const mainContent = document.getElementById('main-content');

    sidebar.classList.toggle('active');
    mainContent.classList.toggle('sidebar-active');
    
    if (sidebar && overlay) {       
        if (overlay.classList.contains('hidden')) {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
        }
    }
}

export function closeSidebar() {
    const sidebar = document.getElementById('sidebar-container');
    const overlay = document.getElementById('sidebar-overlay');
    const mainContent = document.getElementById('main-content');

    sidebar.classList.remove('active');
    mainContent.classList.remove('sidebar-active');
    if (sidebar && overlay) {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }
}


import { handleLogin, handleLogout } from './auth.js';
import { loadUploadedFiles, uploadFile, downloadSampleExcel } from './fileHandling.js';
import { loadUploadedFilesContract, uploadFileContract, downloadSampleContractExcel } from './contract.js';
import { loadPage, handleFileSelect_Contract, handleFileSelect_CustomerContact, handleDrop, preventDefaults, highlight, unhighlight } from './ui.js';
import { handleImages, uploadImages, loadPastImageUploads } from './image-upload.js';
import { 
    changePage,
    loadBranchesInLeads, 
    handleSearch, 
    handleBranchChange, 
    exportLeads, 
    closeAssignmentModal, 
    saveAssignment,
    openAssignmentModal,
    deleteAssignment,initAssignmentTabs,
    fetchLeads } from './leads.js';
import { currentState } from './state.js';


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
        fileInput.addEventListener('change', handleFileSelect_CustomerContact);
        dropArea.addEventListener('click', () => fileInput.click());

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

export function setupAssignedNumbersListner() {
    console.log("Assigned numbers page initialized");

    // --- Element Listeners ---
    const searchInput = document.getElementById('search-input');
    const branchFilter = document.getElementById('branch-filter');
    const exportBtn = document.getElementById('export-btn');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    const addAssignmentBtn = document.getElementById('add-assignment-btn');
    const assignmentModal = document.getElementById('assignment-modal');
    const assignmentForm = document.getElementById('assignment-form');
    const leadsTableBody = document.getElementById('leads-table-body');

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    if (branchFilter) {
        branchFilter.addEventListener('change', handleBranchChange);
        if (currentState.user && currentState.user.userrolename === 'admin') {
            branchFilter.classList.remove('hidden');
        } else {
            branchFilter.classList.add('hidden');
        }
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

    if (addAssignmentBtn) {
        if (currentState.user && currentState.user.userrolename === 'admin') {
            addAssignmentBtn.classList.remove('hidden');
            addAssignmentBtn.addEventListener('click', () => openAssignmentModal());
        } else {
            addAssignmentBtn.classList.add('hidden');
        }  
    }

    if (assignmentForm) {
        assignmentForm.addEventListener('submit', saveAssignment);
    }

    if (assignmentModal) {
        assignmentModal.querySelectorAll('.close-modal-btn').forEach(btn => {
            btn.addEventListener('click', closeAssignmentModal);
        });
    }

    // --- Event Delegation for table actions ---
    if (leadsTableBody) {
        leadsTableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-assignment');
            if (editBtn) {
                const id = editBtn.dataset.id;
                openAssignmentModal(id);
                return;
            }

            const deleteBtn = e.target.closest('.delete-assignment');
            if (deleteBtn) {
                const id = deleteBtn.dataset.id;
                deleteAssignment(id);
                return;
            }
        });
    }

    // --- Initial Data Load ---
    loadBranchesInLeads().then(() => {
        fetchLeads();
        
        // مطمئن شوید که DOM کاملاً لود شده قبل از مقداردهی تب‌ها
        setTimeout(() => {
            initAssignmentTabs();
        }, 100);
    });
}

export function setupContractPageListeners() {
    loadUploadedFilesContract();

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const sampleBtn = document.getElementById('sample-btn');
    const searchInput = document.getElementById('search-input');
    
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
    dropArea.addEventListener('click', (e) => {
            // Prevent triggering file input if the button itself is clicked
        if (e.target.id !== 'select-file-btn') {
            fileInput.click()
        }
    });
    // FIX: Specific listener for the button
    selectFileBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', handleFileSelect_Contract, false);
    
    uploadBtn.addEventListener('click', uploadFileContract, false);
    
    sampleBtn.addEventListener('click', downloadSampleContractExcel, false);
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('file-details-modal').classList.add('hidden');
        });
    });
}

export function setupImageUploadPageListeners() {
    // بارگذاری آپلودهای گذشته
    loadPastImageUploads();

    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('image-input');
    const selectBtn = document.getElementById('select-images-btn');
    const uploadBtn = document.getElementById('upload-images-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // انتخاب فایل از input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => handleImages(e.target.files));
    }

    // کلیک روی drop-area برای انتخاب
    if (dropArea && fileInput) {
        dropArea.addEventListener('click', () => fileInput.click());

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            dropArea.addEventListener(event, preventDefaults, false);
        });
        ['dragenter', 'dragover'].forEach(event => {
            dropArea.addEventListener(event, highlight, false);
        });
        ['dragleave', 'drop'].forEach(event => {
            dropArea.addEventListener(event, unhighlight, false);
        });
    }

    // کلیک روی دکمه انتخاب فایل
    if (selectBtn && fileInput) {
        selectBtn.addEventListener('click', () => fileInput.click());
    }

    // کلیک روی دکمه آپلود
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadImages);
        uploadBtn.disabled = true; // تا وقتی عکسی انتخاب نشده
    }

    // منو موبایل
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleSidebar);
    }

    // بستن سایدبار با کلیک روی overlay
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
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


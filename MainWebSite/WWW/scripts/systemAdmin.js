import { initBranchesTab } from "./ControllerBranch.js";
import { initCarsTab } from "./ControllerCar.js";
import { initCampaignsTab } from "./ControllerCampagn.js";
import { initUsersTab } from "./ControllerUser.js";
import { initSaleAgentsTab } from "./ControllerSaleAgent.js";
import { initCustomerStatusesTab, initCustomerPotentialsTab } from "./ControllerCustomerManagement.js";
import { initCustomersTab } from "./ControllerCustomer.js";

export function initSystemManagement() {
    console.log("System Management initialized");
    
    // Manage tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            // Deactivate all tabs
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active', 'text-purple-600', 'border-purple-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            
            // Activate current tab
            this.classList.add('active', 'text-purple-600', 'border-purple-600');
            this.classList.remove('text-gray-500', 'border-transparent');
            
            // Hide all panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.add('hidden');
            });
            
            // Show relevant panel
            const targetPanel = this.id.replace('tab-', 'content-');
            document.getElementById(targetPanel).classList.remove('hidden');
            
            // Initialize tab-specific functionality
            if (this.id === 'tab-branches') {
                initBranchesTab();
            } else if (this.id === 'tab-campaigns') {
                initCampaignsTab();
            } else if (this.id === 'tab-customers') {
                initCustomersTab();
                document.getElementById('subtab-customer-statuses').click();
            } else if (this.id === 'tab-users') {
                initUsersTab();
            } else if (this.id === 'tab-saleagents') {
                initSaleAgentsTab();
            } else if (this.id === 'tab-cars') {
                initCarsTab();
                document.getElementById('subtab-cars').click();
            } else if (this.id === 'tab-saleagents') {
                initSaleAgentsTab();
            }   
        });
    });

    document.querySelectorAll('.subtab-button').forEach(button => {
        button.addEventListener('click', function() {
            // غیرفعال کردن همه زیرتب‌ها
            document.querySelectorAll('.subtab-button').forEach(btn => {
                btn.classList.remove('active', 'text-purple-600', 'border-purple-600');
                btn.classList.add('text-gray-500', 'border-transparent');
            });
            
            // فعال کردن زیرتب جاری
            this.classList.add('active', 'text-purple-600', 'border-purple-600');
            this.classList.remove('text-gray-500', 'border-transparent');
            
            // مخفی کردن همه پنل‌های زیرتب
            document.querySelectorAll('.sub-tab-panel').forEach(panel => {
                panel.classList.add('hidden');
            });
            
            // نمایش پنل مربوطه
            const targetPanel = this.id.replace('subtab-', 'content-sub-');
            document.getElementById(targetPanel).classList.remove('hidden');
            
            // مقداردهی اولیه عملکردهای خاص هر زیرتب
            if (this.id === 'subtab-customer-statuses') {
                initCustomerStatusesTab();
            } else if (this.id === 'subtab-customer-potentials') {
                initCustomerPotentialsTab();
            }
            // زیرتب مشتریان از قبل توسط initCustomersTab مدیریت می‌شود
        });
    });    
    
    // Activate sale agents tab by default
    document.getElementById('tab-users').click();
}

export function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${type === 'error' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// تابع کمکی برای ایجاد تاخیر در جستجو
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
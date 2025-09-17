import { setupEventListeners } from './events.js';
import { checkLoginStatus } from './auth.js';

export const pages = {
    'dashboard': './pages/dashboard.html',
    'assigned-numbers': './pages/assigned-numbers.html',
    'upload': './pages/upload.html',
    'reports': './pages/reports.html',
    'customer-management': './pages/customer-management.html',
    'settings': './pages/settings.html',
    'login': './pages/login-section.html',
    'sidebar': './pages/sidebar-section.html',    
    'system-management': './pages/system-management.html'
};

document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    setupEventListeners();   
});

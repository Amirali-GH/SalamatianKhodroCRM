// مدیریت منوی موبایل
export function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar-container');
    const mainContent = document.getElementById('main-content');

    if (!mobileMenuBtn || !sidebar || !mainContent) return;

    // تابع باز/بسته کردن منو
    function toggleMenu() {
        sidebar.classList.toggle('active');
        mainContent.classList.toggle('sidebar-active');
    }

    mobileMenuBtn.addEventListener('click', toggleMenu);

    // بررسی اندازه صفحه هنگام لود و تغییر اندازه
    function updateMenuVisibility() {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove('active');
            mainContent.classList.remove('sidebar-active');
        }
    }

    updateMenuVisibility();
    window.addEventListener('resize', updateMenuVisibility);
}

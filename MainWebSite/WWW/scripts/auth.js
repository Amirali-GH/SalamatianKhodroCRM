import { currentState } from './state.js';
import { showLoginError } from './ui.js';
import { fetchLeads } from './leads.js';
import { loadPage } from './ui.js';

export async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const apiBaseUrl = window.location.origin;
    
    if (username && password)
    {
    try {
        const response = await fetch(`${apiBaseUrl}/api/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!response.ok) {
            throw new Error("خطا در لاگین");
        }

        const data = await response.json();

            if (data.token) {
                localStorage.setItem("authToken", data.token);
                const user = { username: username }; // اطلاعات اولیه کاربر
                localStorage.setItem("userData", JSON.stringify(user));

                currentState.token = data.token;
                currentState.user = user;
                await loadPage('dashboard'); // فقط loadPage را فراخوانی کنید
                // fetchLeads(); // این تابع بهتر است بعد از لود شدن صفحه داشبورد فراخوانی شود
                // getUserInfo(); // این فراخوانی از اینجا حذف می‌شود
            } else {
                showLoginError("توکن دریافت نشد");
            }
        } catch (error) {
            console.error(error);
            showLoginError("کاربر یافت نشد!");
        }
    } else {
        showLoginError('لطفا نام کاربری و رمز عبور را وارد کنید');
    }
}

export async function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        // بررسی اعتبار توکن (اختیاری اما توصیه می‌شود)
        try {
            // یک درخواست ساده برای بررسی اعتبار توکن
            const response = await fetch(`${window.location.origin}/api/validate-token`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                currentState.user = JSON.parse(userData);
                currentState.token = token;
                await loadPage('dashboard');
                return true;
            } else {
                // توکن منقضی شده است
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                loadPage('login');
                return false;
            }
        } catch (error) {
            console.error("Token validation error:", error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            loadPage('login');
            return false;
        }
    } else {
        loadPage('login');
        return false;
    }
}

export function handleLogout() {
    // پاک کردن localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // پاک کردن sessionStorage
    sessionStorage.clear();
    
    // پاک کردن تمام کوکی‌ها
    document.cookie.split(";").forEach(function(cookie) {
        document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    Object.assign(currentState, {
        token: null,
        user: null,
        leads: [],
        currentPage: 1,
        pageSize: 10,
        totalLeads: 0,
        totalPages: 1,
        searchQuery: '',
        sortField: 'assignedAt',
        sortOrder: 'desc',
        selectedLeads: [],
        currentExcel_JSON: {},
        currentLead: null
    });

    // رفرش صفحه برای اطمینان از پاک شدن کامل state
    window.location.reload();
}

export async function getUserInfo() {
    if (currentState.user && currentState.user.userid) {
        // بررسی نقش کاربر و نمایش/مخفی کردن منوی ادمین
        const adminMenuItem = document.getElementById('admin-menu-item');
        if (adminMenuItem) {
            if (currentState.user.role === 'admin') {
                adminMenuItem.classList.remove('hidden');
            } else {
                adminMenuItem.classList.add('hidden');
            }
        }
        return;
    }

    const apiBaseUrl = window.location.origin;
    try {
        const response = await fetch(`${apiBaseUrl}/api/v1/user/0/info`, {
            method: "GET",
            headers: {
                'Authorization': `Bearer ${currentState.token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("خطا در دریافت اطلاعات کاربر");
        }

        const data = (await response.json()).data;
 
        // ۱. ذخیره کامل اطلاعات در currentState
        currentState.user = { ...currentState.user, ...data };

        // ۲. به‌روزرسانی DOM
        const userFullNameEl = document.getElementById('user-full-name');
        const branchFullNameEl = document.getElementById('branch-full-name');
        const adminMenuItem = document.getElementById('admin-menu-item');

        if (userFullNameEl) {
            userFullNameEl.innerText = `${data.firstname} ${data.lastname}`;
        }
        if (branchFullNameEl) {
            branchFullNameEl.innerText = data.branchname || '';
        }
        
        // نمایش منوی ادمین فقط برای کاربران با نقش admin
        if (adminMenuItem) {
            if (data.userrolename === 'admin') {
                adminMenuItem.classList.remove('hidden');
            } else {
                adminMenuItem.classList.add('hidden');
            }
        }

    } catch (error) {
        console.error(error);
    }
}
// [file content end]
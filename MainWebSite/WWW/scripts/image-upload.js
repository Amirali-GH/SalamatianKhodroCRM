import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

let selectedImages = [];

/** ------------------ مدیریت انتخاب تصاویر ------------------ **/
/** ولیدیشن فایل تصویر */
function validateImage(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('فقط فایل‌های تصویری مجاز هستند', 'error');
        return false;
    }
    if (file.size > 5 * 1024 * 1024) {
        showNotification(`فایل ${file.name} بیش از 5 مگابایت است`, 'error');
        return false;
    }
    return true;
}

/** ------------------ پیش‌نمایش تصاویر ------------------ **/

function renderPreview() {
    const previewContainer = document.getElementById('images-preview');
    const carousel = document.getElementById('images-carousel');
    const uploadBtn = document.getElementById('upload-images-btn');

    if (!previewContainer || !carousel || !uploadBtn) return;

    carousel.innerHTML = '';

    selectedImages.forEach((file, index) => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'relative flex-shrink-0 w-32 h-32 bg-gray-100 rounded-lg overflow-hidden snap-center';

        imgContainer.innerHTML = `
            <img src="${URL.createObjectURL(file)}" 
                 alt="Preview ${index + 1}" 
                 class="w-full h-full object-cover">
            <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full 
                           w-6 h-6 flex items-center justify-center text-xs remove-btn"
                    data-index="${index}">
                ×
            </button>
        `;

        carousel.appendChild(imgContainer);
    });

    // نمایش بخش preview
    previewContainer.classList.remove('hidden');
    uploadBtn.disabled = false;

    // event حذف تصویر
    carousel.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            selectedImages.splice(idx, 1);
            if (selectedImages.length === 0) {
                console.log('s');
                previewContainer.classList.add('hidden');
                uploadBtn.disabled = true;
            }
            renderPreview();
        });
    });
}

/** ------------------ آپلود تصاویر ------------------ **/

export function handleImages(files) {
    selectedImages = Array.from(files);

    const previewContainer = document.getElementById('images-preview');
    const carousel = document.getElementById('images-carousel');
    const uploadBtn = document.getElementById('upload-images-btn');

    if (!carousel || !previewContainer || !uploadBtn) return;

    carousel.innerHTML = '';

    selectedImages.forEach((file, index) => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden snap-center ml-2.5';
        imgContainer.innerHTML = `
            <img src="${URL.createObjectURL(file)}" 
                 class="w-full h-full object-cover">
        `;
        carousel.appendChild(imgContainer);
    });

    previewContainer.classList.remove('hidden');
    uploadBtn.classList.remove('hidden');
    uploadBtn.disabled = false;
}

export async function uploadImages() {
    if (selectedImages.length === 0) return;

    const modal = document.getElementById('processing-modal');
    const progressBar = document.getElementById('progress-bar-fill');
    const progressPercent = document.getElementById('progress-percentage');

    modal.classList.remove('hidden');

    const formData = new FormData();
    selectedImages.forEach(file => formData.append('images[]', file));

    try {
        const apiBaseUrl = window.location.origin;
        const response = await fetch(`${apiBaseUrl}/api/v1/upload/images`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        if (!response.ok) {
            throw new Error('خطا در آپلود تصاویر');
        }

        // شبیه‌سازی progress (اختیاری)
        let uploaded = 0;
        const interval = setInterval(() => {
            uploaded++;
            const percent = Math.min(100, Math.round((uploaded / selectedImages.length) * 100));
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressPercent) progressPercent.textContent = `${percent}%`;

            if (uploaded >= selectedImages.length) {
                clearInterval(interval);
                setTimeout(() => {
                    modal.classList.add('hidden');
                    showNotification('تصاویر با موفقیت آپلود شدند ✅');
                    selectedImages = [];
                    document.getElementById('images-preview').classList.add('hidden');
                    document.getElementById('upload-images-btn').disabled = true;
                    loadPastImageUploads(); // ریفرش لیست آپلودهای گذشته
                }, 500);
            }
        }, 300);

    } catch (error) {
        console.error(error);
        modal.classList.add('hidden');
        showNotification(error.message, 'error');
    }
}


/** ------------------ لیست آپلودهای گذشته ------------------ **/
export async function loadPastImageUploads() {
    const container = document.getElementById('past-uploads-container');
    const loadingEl = document.getElementById('loading-past-uploads');

    if (!container || !loadingEl) return;

    try {
        const apiBaseUrl = window.location.origin;
        const response = await fetch(`${apiBaseUrl}/api/v1/uploaded-images`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        });

        if (!response.ok) throw new Error('خطا در بارگذاری لیست آپلودها');

        const data = await response.json();

        container.innerHTML = '';
        loadingEl.classList.add('hidden');

        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500 py-4">هیچ آپلودی یافت نشد</p>';
            return;
        }

        data.data.forEach(upload => {
            const card = document.createElement('div');
            card.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm';
            card.innerHTML = `
                <div class="flex items-center">
                    <i class="material-icons text-blue-500 mr-3">image</i>
                    <div>
                        <p class="font-medium text-gray-800">آپلود تصاویر</p>
                        <p class="text-sm text-gray-500">${formatDate(upload.uploadedAt)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-sm font-semibold text-purple-600">${upload.count} عکس</span>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="text-center text-red-500 py-4">خطا در بارگذاری</p>';
    }
}

/** ------------------ ابزار ------------------ **/
function formatDate(dateString) {
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateString));
}

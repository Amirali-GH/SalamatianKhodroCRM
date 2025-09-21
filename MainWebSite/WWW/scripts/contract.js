import { renderFilesList, renderPagination} from './fileHandling.js';
import { currentState } from './state.js';
import { showNotification } from './systemAdmin.js';

// نگاشت ستون‌های فارسی (با فاصله دقیق از header اکسل) به انگلیسی (مخفف سه‌حرفی کوچک)
const columnMap = {
    "شماره قرارداد": "con",
    "تاریخ قرارداد": "cdt",
    "تاریخ میلادی قرارداد": "cdg",
    "شماره درخواست": "rqn",
    "تاریخ درخواست": "rqd",
    "تاریخ میلادی درخواست": "rdg",
    "شماره ملی مشتری": "cni",
    "نام و نام خانوادگی مشتری": "cnf",
    "نوع مشتری": "cty",
    "شهرستان مشتری": "ccy",
    "کد نمایندگی": "dcd",
    "نام نمایندگی": "dnm",
    "شهرستان نمایندگی": "dcy",
    "استان نمایندگی": "dpr",
    "نوع خودرو": "vty",
    "رنگ خودرو": "vcl",
    "کد رنگ": "ccd",
    "درگاه": "gtw",
    "منطقه": "reg",
    "شماره مجوز فروش": "sln",
    "شرح مجوز فروش": "sld",
    "شرح روش پرداخت": "pmd",
    "تاریخ تحویل": "dld",
    "موعد تحویل به روز": "ddd",
    "رقم دهم شاسی قابل تخصیص": "acd",
    "شماره شاسی": "chn",
    "ماه تحویل": "dlm",
    "کد نمایندگی تحویل": "ddc",
    "نام نمایندگی تحویل": "ddn",
    "محل تحویل": "dll",
    "مدل خودرو": "vmd",
    "تحویل مدارک ثبت نام": "rds",
    "تحویل مدارک تکمیل وجه": "fds",
    "عدم صدور فاکتور": "ins",
    "مدارک احراز": "vds",
    "موقعیت شاسی": "chs",
    "تاریخ تخصیص": "ald",
    "تاریخ میلادی تخصیص": "alg",
    "تاریخ شماره گذاری": "pld",
    "تاریخ میلادی شماره گذاری": "plg",
    "تاریخ میلادی شماره گذاری1": "pl1",
    "تاریخ سند": "dmd",
    "وضعیت سند": "dms",
    "تاریخ تحویل فیزیکی": "pdd",
    "شماره پلاک": "pln",
    "تاریخ انصراف": "cnd",
    "وضعیت قرارداد": "cns",
    "نوع فروش": "sly",
    "تاریخ پرداخت مشتری": "cpd",
    "تاریخ تکمیل وجه": "fpd",
    "تاریخ تائید حسابداری": "aad",
    "کد روش پرداخت": "pmc",
    "شماره دعوتنامه": "inv",
    "زمان ثبت درخواست": "rts",
    "قیمت مصوب": "apr",
    "نوع قیمت": "prt",
    "کد ملی ضامن": "gni",
    "مبلغ تخفیف": "dma",
    "جمع کل مبلغ دریافتی": "tar",
    "نوع فرمت قرارداد": "cft",
    "کد ملی صلح دهنده": "ani",
    "وضعیت صلح": "ass",
    "وضعیت انصراف": "cst",
    "ارگان": "org",
    "شماره کاردکس": "knm",
    "تاریخ کاردکس": "kdt",
    "شبا انصراف": "cib",
    "کل مبلغ چک ها": "tca",
    "تعداد چک": "noc",
    "ارگان1": "org",
    "کاربر ایجاد کننده درخواست": "rcu",
    "نوع سند": "dty",
    "قرارداد لیست سیاه": "icb",
    "مشتری لیست سیاه": "icl",
    "کد پستی": "pcd",
    "آخرین دعوتنامه صادر شده": "lii",
    "آخرین دعوتنامه تکمیل وجه شده": "lcp",
    "تاریخ اولین امضا": "fsd",
    "امضا کننده اول": "fsg",
    "تاریخ دومین امضا": "ssd",
    "امضا کننده دوم": "ssg",
    "مانده طلب مشتری": "cob",
    "تعداد چک های بعد از کاردکس": "cca",
    "تاریخ گواهی  اسقاط": "scd",
    "آدرس نمایندگی": "dda"
};

// تابع کمکی برای normalize کردن کلیدها (جایگزینی underscore با فاصله)
function normalizeKey(key) {
    return key ? key.replace(/_/g, ' ').trim() : '';
}

// پردازش فایل اکسل
export function handleFileContract(file) {
    if (!file) return;
    
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
        alert('لطفاً یک فایل اکسل معتبر انتخاب کنید (فرمت‌های مجاز: .xlsx, .xls)');
        return;
    } else {
        currentState.currentExcel_FileName = file.name;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('حجم فایل نباید بیشتر از 10 مگابایت باشد');
        return;
    } else {
        currentState.currentExcel_FileSize = file.size;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // استفاده از header: 1 برای خواندن به صورت array of arrays (اولین row header)
        let rawData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: "",
            raw: false 
        });

        if (rawData.length <= 1) {  // header + no data
            alert("فایل اکسل خالی است یا فقط header دارد.");
            return;
        }

        // استخراج header و normalize آن
        const headers = rawData[0].map(h => normalizeKey(h));
        const dataRows = rawData.slice(1);  // داده‌های واقعی

        // مپ کردن headerهای فارسی به انگلیسی (مخفف)
        const englishHeaders = headers.map(persianHeader => {
            return columnMap[persianHeader] || persianHeader;  // اگر مپ نبود, همان نگه دار
        });

        // ساخت mappedData با کلیدهای انگلیسی (مخفف)
        let mappedData = dataRows.map(row => {
            let newRow = {};
            for (let i = 0; i < englishHeaders.length; i++) {
                newRow[englishHeaders[i]] = String(row[i] || "");
            }
            return newRow;
        });

        // فیلتر ردیف‌های خالی (اگر همه مقادیر "" باشند)
        mappedData = mappedData.filter(row => Object.values(row).some(val => val.trim() !== ""));

        if (mappedData.length === 0) {
            alert("هیچ داده معتبری در فایل یافت نشد.");
            return;
        }

        currentState.currentExcel_JSON = mappedData;

        // برای displayPreview, rawData normalized بساز (با header فارسی normalize شده)
        let previewData = dataRows.map((row, index) => {
            let previewRow = {};
            for (let i = 0; i < headers.length; i++) {
                previewRow[headers[i]] = String(row[i] || "");
            }
            return previewRow;
        });

        displayPreview(previewData.slice(0, 10));
        document.getElementById('row-count').textContent = `تعداد کل ردیف‌ها: ${mappedData.length}`;

        document.getElementById('file-preview').classList.remove('hidden');
        document.getElementById('upload-btn').classList.remove('hidden');
    };

    reader.readAsArrayBuffer(file);
}

// نمایش پیش‌نمایش داده‌ها (با کلیدهای فارسی normalize شده)
export function displayPreview(data) {
    const thead = document.getElementById('preview-table-head');
    const tbody = document.getElementById('preview-table-body');

    tbody.innerHTML = '';
    thead.innerHTML = '';

    if (data.length === 0) return;

    // استفاده از کلیدهای از data[0]
    let columns = Object.keys(data[0]).filter(col => col);  // فقط کلیدهای غیرخالی


    let headerRow = `<th class="py-2 px-4 border-b">ردیف</th>`;
    columns.forEach(col => {
        headerRow += `<th class="py-2 px-4 border-b text-center">${col}</th>`;
    });
    thead.innerHTML = `<tr>${headerRow}</tr>`;

    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        let rowHtml = `<td class="py-2 px-4 border-b">${index + 1}</td>`;
        columns.forEach(col => {
            rowHtml += `<td class="py-2 px-4 border-b">${row[col] || '-'}</td>`;
        });

        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    });
}

// بقیه توابع بدون تغییر
export async function uploadFileContract() {
    if (!currentState.currentExcel_JSON) {
        alert('هیچ فایل معتبری انتخاب نشده است.');
        return;
    }

    const confirmModal = document.getElementById('confirm-upload-modal');
    confirmModal.classList.remove('hidden');

    return new Promise((resolve) => {
        document.getElementById('confirm-upload-btn').onclick = async () => {
            confirmModal.classList.add('hidden');
            
            const processingModal = document.getElementById('processing-modal');
            processingModal.classList.remove('hidden');
            
            const uploadBtn = document.getElementById('upload-btn');
            const uploadResultEl = document.getElementById('upload-result');

            uploadBtn.disabled = true;
            uploadBtn.classList.add('opacity-50', 'cursor-not-allowed');

            uploadResultEl.classList.add('hidden');

            try {
                const apiBaseUrl = window.location.origin;
                const url = `${apiBaseUrl}/api/v1/upload/contract/sheet`;
                const urlObject = new URL(url);
                urlObject.searchParams.append('filename', currentState.currentExcel_FileName);
                urlObject.searchParams.append('filesize', currentState.currentExcel_FileSize);

                const response = await fetch(urlObject, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentState.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(currentState.currentExcel_JSON)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'خطا در آپلود فایل');
                }

                const result = await response.text();

                uploadResultEl.innerHTML = `
                    <div class="bg-green-50 text-green-700 p-3 rounded-lg">
                        <div class="flex items-center">
                            <i class="material-icons mr-2">check_circle</i>
                            <span>${result}</span>
                        </div>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');

                loadUploadedFilesContract();

            } catch (error) {
                console.error('Upload failed:', error);
                uploadResultEl.innerHTML = `
                    <div class="bg-red-50 text-red-700 p-3 rounded-lg">
                        <i class="material-icons mr-2">error</i>
                        <span>${error.message}</span>
                    </div>
                `;
                uploadResultEl.classList.remove('hidden');
            } finally {
                const processingModal = document.getElementById('processing-modal');
                processingModal.classList.add('hidden');
                
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                
                resolve();
            }
        };

        document.getElementById('confirm-upload-cancel').onclick = () => {
            confirmModal.classList.add('hidden');
            resolve();
        };
    });
}

export function downloadSampleContractExcel() {
    const sampleData = [
        {
            "شماره قرارداد": "123456",
            "تاریخ قرارداد": "1403/06/19",
            "تاریخ میلادی قرارداد": "2025/09/10",
            "شماره درخواست": "15000001",
            "تاریخ درخواست": "1403/06/15",
            "تاریخ میلادی درخواست": "2025/09/06",
            "شماره ملی مشتری": "1234567890",
            "نام و نام خانوادگی مشتری": "علی رضایی",
            "نوع مشتری": "حقیقی",
            "شهرستان مشتری": "تهران",
            "کد نمایندگی": "101",
            "نام نمایندگی": "نمایندگی نمونه",
            "شهرستان نمایندگی": "تهران",
            "استان نمایندگی": "تهران",
            "نوع خودرو": "لوکانو 7",
            "رنگ خودرو": "سفید متالیک",
            "کد رنگ": "W12",
            "درگاه": "DEALER",
            "منطقه": "North",
            "شماره مجوز فروش": "INS.SAMPLE.1403.01.01",
            "شرح مجوز فروش": "فروش فوری اقساطی خودرو لوکانو L7 بنزینی- مدل1403-قیمت 29.500.000.000 - بانک نمونه",
            "شرح روش پرداخت": "فروش فوری اقساطی خودرو لوکانو L7 بنزینی- مدل1403-قیمت 29.500.000.000 - بانک نمونه -60%- 24ماهه (12چک+1)",
            "تاریخ تحویل": "1403/08/19",
            "موعد تحویل به روز": "60",
            "رقم دهم شاسی قابل تخصیص": "S",
            "شماره شاسی": "123456789012345678",
            "ماه تحویل": "آبان 1403",
            "کد نمایندگی تحویل": "101",
            "نام نمایندگی تحویل": "نمایندگی نمونه",
            "محل تحویل": "نمایندگی نمونه",
            "مدل خودرو": "1403",
            "تحویل مدارک ثبت نام": "تحویل شده",
            "تحویل مدارک تکمیل وجه": "ارسال نشده",
            "عدم صدور فاکتور": "غیرفعال",
            "مدارک احراز": "تحویل شده",
            "موقعیت شاسی": "تخصیص نیافته",
            "تاریخ تخصیص": "1403/06/20",
            "تاریخ میلادی تخصیص": "2025/09/11",
            "تاریخ شماره گذاری": "1403/06/25",
            "تاریخ میلادی شماره گذاری": "2025/09/16",
            "تاریخ میلادی شماره گذاری1": "2025/09/16",
            "تاریخ سند": "1403/06/30",
            "وضعیت سند": "عدم صدور سند",
            "تاریخ تحویل فیزیکی": "1403/07/01",
            "شماره پلاک": "12AB345",
            "تاریخ انصراف": "",
            "وضعیت قرارداد": "فعال",
            "نوع فروش": "فروش فوری، پرداخت اولیه",
            "تاریخ پرداخت مشتری": "1403/06/19",
            "تاریخ تکمیل وجه": "1403/08/19",
            "تاریخ تائید حسابداری": "1403/06/20",
            "کد روش پرداخت": "L7.60%.24M.SAMPLE",
            "شماره دعوتنامه": "",
            "زمان ثبت درخواست": "2025/09/06 10:00:00 AM",
            "قیمت مصوب": "29500000000",
            "نوع قیمت": "قطعی",
            "کد ملی ضامن": "0987654321",
            "مبلغ تخفیف": "1000000",
            "جمع کل مبلغ دریافتی": "18300000000",
            "نوع فرمت قرارداد": "فرمت عمومی",
            "کد ملی صلح دهنده": "",
            "وضعیت صلح": "",
            "وضعیت انصراف": "",
            "ارگان": "",
            "شماره کاردکس": "",
            "تاریخ کاردکس": "",
            "شبا انصراف": "",
            "کل مبلغ چک ها": "11200000000",
            "تعداد چک": "12",
            "ارگان1": "",
            "کاربر ایجاد کننده درخواست": "admin",
            "نوع سند": "سند در رهن",
            "قرارداد لیست سیاه": "خیر",
            "مشتری لیست سیاه": "خیر",
            "کد پستی": "1234567890",
            "آخرین دعوتنامه صادر شده": "",
            "آخرین دعوتنامه تکمیل وجه شده": "",
            "تاریخ اولین امضا": "1403/06/19",
            "امضا کننده اول": "علی رضایی",
            "تاریخ دومین امضا": "1403/06/20",
            "امضا کننده دوم": "مدیر نمایندگی",
            "مانده طلب مشتری": "0",
            "تعداد چک های بعد از کاردکس": "0",
            "تاریخ گواهی  اسقاط": "",
            "آدرس نمایندگی": "تهران، خیابان نمونه، پلاک 123"
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");
    XLSX.writeFile(workbook, "contract_sample_template.xlsx");
}

let currentPage = 1;
let currentSearchTerm = '';
const pageSize = 5;

export async function loadUploadedFilesContract() {
    const filesContainer = document.getElementById('files-container');
    const paginationContainer = document.getElementById('pagination-container');
    
    filesContainer.innerHTML = `
        <div class="loading">
            <i class="material-icons">hourglass_empty</i>
            <p>در حال بارگذاری فایل‌ها...</p>
        </div>
    `;
    paginationContainer.innerHTML = '';
    
    const apiBaseUrl = window.location.origin;
    const token = localStorage.getItem('authToken');
    
    const apiUrl = new URL(`${apiBaseUrl}/api/v1/contract-file-result`);
    apiUrl.searchParams.append('page', currentPage);
    if (currentSearchTerm) {
        apiUrl.searchParams.append('context', currentSearchTerm);
    }
    
    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('خطا در دریافت اطلاعات از سرور');
        
        const data = await response.json();
        
        if (data.meta && data.meta.is_success) {
            renderFilesList(data.data);
            renderPagination(data.meta);
        } else {
            throw new Error(data.meta?.description || 'خطا در دریافت اطلاعات');
        }

    } catch (error) {
        console.error('Error loading files:', error);
        showNotification('خطا در دریافت داده‌ها', 'error');
    }
}

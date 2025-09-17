// شبیه‌سازی دریافت لیست مشتریان از سرور
export async function mockLeadsApi(page, pageSize, search, sortField, sortOrder) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // داده‌های نمونه
            const mockData = [];
            const statuses = ['new', 'contacted', 'followup', 'closed'];

            for (let i = 0; i < 48; i++) {
                mockData.push({
                    id: `lead_${i + 1}`,
                    phone: `09${Math.floor(100000000 + Math.random() * 900000000)}`,
                    firstName: ['محمد', 'علی', 'فاطمه', 'زهرا', 'حسین', 'مریم', 'پارسا', 'سارا'][Math.floor(Math.random() * 8)],
                    lastName: ['رضایی', 'محمدی', 'کریمی', 'حسینی', 'جعفری', 'اکبری', 'قاسمی', 'امیری'][Math.floor(Math.random() * 8)],
                    nationalCode: Math.floor(1000000000 + Math.random() * 9000000000),
                    status: statuses[Math.floor(Math.random() * 4)],
                    assignedAt: `1402/05/${15 + Math.floor(i / 10)} - ${9 + Math.floor(i % 10)}:${Math.floor(Math.random() * 60)}`,
                    lastContact: i > 10 ? `1402/05/${10 + Math.floor(i % 15)} - ${8 + Math.floor(i % 10)}:${Math.floor(Math.random() * 60)}` : '-'
                });
            }

            // فیلتر کردن بر اساس جستجو
            let filteredData = mockData;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredData = mockData.filter(lead =>
                    lead.phone.includes(search) ||
                    lead.firstName.toLowerCase().includes(searchLower) ||
                    lead.lastName.toLowerCase().includes(searchLower)
                );
            }

            // مرتب‌سازی
            filteredData.sort((a, b) => {
                if (sortField === 'name') {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
                }

                // برای سایر فیلدها، از مرتب‌سازی ساده استفاده می‌کنیم
                return sortOrder === 'asc' ? 1 : -1;
            });

            // صفحه‌بندی
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedData = filteredData.slice(startIndex, endIndex);

            resolve({
                success: true,
                data: paginatedData,
                total: filteredData.length,
                page,
                pageSize,
                totalPages: Math.ceil(filteredData.length / pageSize)
            });
        }, 800);
    });
}
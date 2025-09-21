export let currentState = {
    token: null,
    user: null,
    isLoading: false,
    leads: [],
    currentPage: 1,
    pageSize: 10,
    totalLeads: 0,
    totalRecords: 1,
    totalPages: 0,
    searchQuery: '',
    sortField: 'assignedAt',
    sortOrder: 'desc',
    selectedLeads: [],
    selectedBranch: '',
    branches: [],
    currentExcel_JSON: {},
    currentExcel_File: null,
    currentExcel_FileSize: null,
    currentExcel_FileName: null,
    currentLead: null
};


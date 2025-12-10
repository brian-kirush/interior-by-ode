// Application State - UPDATED FOR RENDER DEPLOYMENT
const API_BASE_URL = window.location.origin + '/api';

const state = {
    items: [],
    taxRate: 16,
    discount: 0,
    client: {
        name: '',
        company: '',
        email: '',
        phone: '',
        address: '',
        project: ''
    },
    teamNotes: [],
    taskLogs: [],
    payment: {
        bankName: 'Equity Bank Kenya',
        accountName: 'Interiors by Ode',
        accountNumber: '1234567890',
        paybill: '123456',
        paybillAccount: 'Use invoice number'
    },
    currentPage: 'dashboard',
    currentProject: null,
    allProjects: [],
    projectSortColumn: 'name',
    projectSortDirection: 'asc',
    allQuotations: [],
    allInvoices: [],
    allClients: [],
    currentUser: null,
    csrfToken: null
};

// ... REST OF YOUR EXISTING app.js CODE CONTINUES HERE ...

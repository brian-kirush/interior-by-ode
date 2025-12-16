// app.js - Complete Backend Integration Version

// Configuration
const API_BASE_URL = window.location.origin + '/api';
// For local testing: const API_BASE_URL = 'http://localhost:3000/api';

// Application State
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
    currentPage: 'dashboard',
    currentProject: null,
    allProjects: [],
    allQuotations: [],
    allInvoices: [],
    allTasks: [],
    allClients: [],
    currentUser: null,
    clientSortColumn: 'name',
    clientSortDirection: 'asc',
    clientFilterQuery: '',
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    currentEdit: null,
    payment: {
        bankName: 'Equity Bank Kenya',
        accountName: 'Interiors by Ode',
        accountNumber: '1234567890',
        paybill: '123456',
        paybillAccount: 'Use invoice number'
    }
};

// --- UTILITY FUNCTIONS ---

/**
 * A wrapper for the fetch API to handle credentials, headers, and errors.
 */
async function apiFetch(url, options = {}) {
    // Always include credentials for session-based auth
    options.credentials = 'include';
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        console.log(`API Fetch: ${options.method || 'GET'} ${url}`);
        const response = await fetch(url, options);

        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
            showLoginScreen();
            throw new Error('Authentication required. Please login again.');
        }

        // Handle other HTTP errors
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error ${response.status}`;
            
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                if (errorText) errorMessage = errorText;
            }
            
            throw new Error(errorMessage);
        }

        // Handle 204 No Content responses
        if (response.status === 204) {
            return { success: true };
        }

        // Parse JSON response
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Fetch Error:', error.message);
        
        // Don't show notification for auth-related errors during session check
        if (!url.includes('/auth/check-session')) {
            showNotification(error.message, 'error');
        }
        
        throw error;
    }
}

/**
 * Shows a notification message
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');

    if (!notification || !notificationMessage) {
        console.warn('Notification elements not found');
        return;
    }

    notificationMessage.textContent = message;
    notification.style.backgroundColor = type === 'error' ? 'var(--accent-coral)' : 'var(--jungle-green)';
    
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Formats a number as Kenyan Shillings
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return 'KSh 0.00';
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Formats a date string
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Creates a status badge element
 */
function createStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = `status-badge status-${status.toLowerCase()}`;
    badge.textContent = status.replace('_', ' ');
    return badge;
}

// --- AUTHENTICATION ---

/**
 * Handles user login
 */
async function handleLogin() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');
    
    if (!emailInput || !passwordInput || !loginBtn) {
        console.error('Login elements not found');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        if (loginMessage) {
            loginMessage.textContent = 'Please enter both email and password';
            loginMessage.style.display = 'block';
        }
        return;
    }
    
    const loginBtnText = loginBtn.querySelector('.login-btn-text');
    const loginSpinner = loginBtn.querySelector('.loader-spinner');

    // Show loading state
    loginBtn.disabled = true;
    if (loginMessage) loginMessage.style.display = 'none';
    if (loginBtnText) loginBtnText.style.display = 'none';
    if (loginSpinner) loginSpinner.style.display = 'inline-block';
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (result.success) {
            state.currentUser = result.data.user;
            showNotification('Login successful!', 'success');
            hideLoginScreen();
            
            // Re-initialize event listeners for the main app
            setupEventListeners();
            
            // Load initial page data
            navigateToPage(state.currentPage);
        } else {
            if (loginMessage) {
                loginMessage.textContent = result.message || 'Login failed';
                loginMessage.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (loginMessage) {
            loginMessage.textContent = error.message || 'Login failed. Please try again.';
            loginMessage.style.display = 'block';
        }
    } finally {
        loginBtn.disabled = false;
        if (loginBtnText) loginBtnText.style.display = 'inline-block';
        if (loginSpinner) loginSpinner.style.display = 'none';
    }
}

/**
 * Handles user logout
 */
async function handleLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        await apiFetch(`${API_BASE_URL}/auth/logout`, { 
            method: 'POST' 
        });
        state.currentUser = null;
        showLoginScreen();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed. Please try again.', 'error');
    }
}

/**
 * Checks for active session on page load
 */
async function checkSession() {
    console.log('Checking user session...');
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/auth/check-session`);
        
        if (result.success && result.data) {
            state.currentUser = result.data;
            console.log('User session found:', state.currentUser);
            return true;
        } else {
            console.log('No active session found');
            return false;
        }
    } catch (error) {
        console.log('Session check failed, assuming not logged in:', error.message);
        return false;
    }
}

function showLoginScreen() {
    console.log('Showing login screen');
    
    // Hide loader
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
    
    // Show login container, hide app
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.querySelector('.app-container');
    
    if (loginContainer) {
        loginContainer.style.display = 'flex';
    }
    
    if (appContainer) {
        appContainer.style.display = 'none';
    }
}

function hideLoginScreen() {
    console.log('Hiding login screen, showing app');
    
    // Hide loader
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
    
    // Hide login container, show app
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.querySelector('.app-container');
    
    if (loginContainer) {
        loginContainer.style.display = 'none';
    }
    
    if (appContainer) {
        appContainer.style.display = 'flex';
        appContainer.style.opacity = '1';
    }
}

// --- PAGE NAVIGATION ---

/**
 * Navigates to a specific page
 */
function navigateToPage(pageId) {
    console.log(`Navigating to page: ${pageId}`);
    
    // Close mobile menus
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    if (mobileNavMenu) mobileNavMenu.classList.remove('open');
    
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        state.currentPage = pageId;
    } else {
        console.warn(`Page not found: ${pageId}`);
        return;
    }
    
    // Update active nav links
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });
    
    // Load page-specific data
    loadPageData(pageId);
}

/**
 * Loads data for the current page
 */
function loadPageData(pageId) {
    console.log(`Loading data for page: ${pageId}`);
    
    switch (pageId) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'clients':
            loadClients();
            break;
        case 'projects':
            loadProjects();
            break;
        case 'quotations':
            loadQuotations();
            break;
        case 'invoices':
            loadInvoices();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'settings':
            loadSettings();
            break;
        case 'calculator':
            loadClientsForSelect('quotationClientSelect');
            initCalculator();
            break;
        default:
            console.log(`No data loader for page: ${pageId}`);
    }
}

// --- DATA LOADING FUNCTIONS ---

async function loadDashboardStats() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/dashboard/stats`);
        
        if (result.success) {
            const data = result.data;
            
            // Update dashboard stats
            document.getElementById('activeProjects').textContent = data.activeProjects || 0;
            document.getElementById('monthlyRevenue').textContent = formatCurrency(data.monthlyRevenue || 0);
            document.getElementById('pendingTasks').textContent = data.pendingTasks || 0;
            document.getElementById('clientSatisfaction').textContent = `${data.clientSatisfaction || 0}%`;
            
            // Update trends
            if (data.trends) {
                const trends = data.trends;
                document.getElementById('projectsTrend').textContent = `${trends.projects > 0 ? '+' : ''}${trends.projects}`;
                document.getElementById('revenueTrend').textContent = `${trends.revenue > 0 ? '+' : ''}${trends.revenue}%`;
                document.getElementById('tasksTrend').textContent = `${trends.tasks > 0 ? '+' : ''}${trends.tasks}`;
            }
        } else {
            console.warn('Failed to load dashboard stats:', result.message);
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showNotification('Failed to load dashboard statistics', 'error');
    }
}

async function loadClients() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/clients`);
        
        if (result.success) {
            state.allClients = result.data;
            renderClientsTable(state.allClients);
        }
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function renderClientsTable(clients) {
    const tableBody = document.getElementById('clientsTableBody');
    if (!tableBody) return;
    
    if (!clients || clients.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--gray-500)">
                    No clients found. <a href="#" id="addClientFromEmpty">Add your first client</a>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.name || 'N/A'}</td>
            <td>${client.company || 'N/A'}</td>
            <td>${client.email || 'N/A'}</td>
            <td>${client.phone || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-client-btn" data-id="${client.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-danger delete-client-btn" data-id="${client.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadProjects() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/projects`);
        
        if (result.success) {
            state.allProjects = result.data;
            renderProjectsTable(state.allProjects);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

function renderProjectsTable(projects) {
    const tableBody = document.getElementById('projectsTableBody');
    if (!tableBody) return;
    
    if (!projects || projects.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: var(--gray-500)">
                    No projects found.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    projects.forEach(project => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${project.name || 'N/A'}</td>
            <td>${project.client_name || 'N/A'}</td>
            <td>${createStatusBadge(project.status).outerHTML}</td>
            <td>${formatCurrency(project.budget || 0)}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-project-btn" data-id="${project.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-project-btn" data-id="${project.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadQuotations() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/quotations`);
        
        if (result.success) {
            state.allQuotations = result.data;
            renderQuotationsTable(state.allQuotations);
        }
    } catch (error) {
        console.error('Error loading quotations:', error);
    }
}

function renderQuotationsTable(quotations) {
    const tableBody = document.getElementById('quotationsTableBody');
    if (!tableBody) return;
    
    if (!quotations || quotations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500)">
                    No quotations found. <a href="#" onclick="navigateToPage('calculator')">Create your first quotation</a>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    quotations.forEach(quotation => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${quotation.quotation_number || 'N/A'}</td>
            <td>${quotation.client_name || 'N/A'}</td>
            <td>${formatDate(quotation.created_at)}</td>
            <td>${formatCurrency(quotation.total || 0)}</td>
            <td>${createStatusBadge(quotation.status).outerHTML}</td>
            <td>
                <button class="btn btn-sm btn-secondary view-quotation-btn" data-id="${quotation.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-secondary edit-quotation-btn" data-id="${quotation.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-quotation-btn" data-id="${quotation.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadInvoices() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/invoices`);
        
        if (result.success) {
            state.allInvoices = result.data;
            renderInvoicesTable(state.allInvoices);
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
    }
}

function renderInvoicesTable(invoices) {
    const tableBody = document.getElementById('invoicesTableBody');
    if (!tableBody) return;
    
    if (!invoices || invoices.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-500)">
                    No invoices found.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoice_number || 'N/A'}</td>
            <td>${invoice.client_name || 'N/A'}</td>
            <td>${formatDate(invoice.issue_date)}</td>
            <td>${formatDate(invoice.due_date)}</td>
            <td>${formatCurrency(invoice.total || 0)}</td>
            <td>${createStatusBadge(invoice.status).outerHTML}</td>
            <td>
                <button class="btn btn-sm btn-secondary view-invoice-btn" data-id="${invoice.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-secondary edit-invoice-btn" data-id="${invoice.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-invoice-btn" data-id="${invoice.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadTasks() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/tasks`);
        
        if (result.success) {
            state.allTasks = result.data;
            renderTasksTable(state.allTasks);
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function renderTasksTable(tasks) {
    const tableBody = document.getElementById('tasksTableBody');
    if (!tableBody) return;
    
    if (!tasks || tasks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500)">
                    No tasks found.
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.title || 'N/A'}</td>
            <td>${task.project_name || 'N/A'}</td>
            <td>${createStatusBadge(task.status).outerHTML}</td>
            <td>${createPriorityBadge(task.priority).outerHTML}</td>
            <td>${formatDate(task.due_date)}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-task-btn" data-id="${task.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-task-btn" data-id="${task.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function createPriorityBadge(priority) {
    const badge = document.createElement('span');
    badge.className = `priority-badge priority-${priority.toLowerCase()}`;
    badge.textContent = priority;
    return badge;
}

async function loadSettings() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/settings`);
        
        if (result.success) {
            const settings = result.data;
            
            // Map settings to form fields
            const fieldMap = {
                company_name: 'settingCompanyName',
                company_address: 'settingCompanyAddress',
                company_phone: 'settingCompanyPhone',
                company_email: 'settingCompanyEmail',
                default_tax_rate: 'settingDefaultTaxRate',
                bank_name: 'settingBankName',
                account_name: 'settingAccountName',
                account_number: 'settingAccountNumber',
                mpesa_paybill: 'settingMpesaPaybill',
                mpesa_account_ref: 'settingMpesaAccountRef'
            };
            
            for (const [key, value] of Object.entries(settings)) {
                const fieldId = fieldMap[key];
                if (fieldId) {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.value = value || '';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {};
    
    // Collect settings from form
    const settingsForm = document.querySelector('#settings-page');
    const inputs = settingsForm.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        if (input.id && input.id.startsWith('setting')) {
            const key = input.id.replace('setting', '').toLowerCase();
            settings[key] = input.value;
        }
    });
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        if (result.success) {
            showNotification('Settings saved successfully!', 'success');
        } else {
            showNotification('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Error saving settings', 'error');
    }
}

async function loadClientsForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/clients`);
        
        if (result.success && result.data) {
            // Clear existing options except first
            select.innerHTML = '<option value="">-- Select a Client --</option>';
            
            // Add client options
            result.data.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.name} (${client.email})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error(`Error loading clients for select ${selectId}:`, error);
    }
}

// --- CRUD OPERATIONS ---

// Client operations
async function handleAddNewClient() {
    // Open the client modal for adding
    document.getElementById('editClientModalTitle').textContent = 'Add New Client';
    document.getElementById('editClientForm').reset();
    document.getElementById('editClientId').value = '';
    openModal('editClientModal');
}

async function handleEditClient(clientId) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/clients/${clientId}`);
        
        if (result.success) {
            const client = result.data;
            document.getElementById('editClientModalTitle').textContent = 'Edit Client';
            document.getElementById('editClientId').value = client.id;
            document.getElementById('editClientName').value = client.name || '';
            document.getElementById('editClientCompany').value = client.company || '';
            document.getElementById('editClientEmail').value = client.email || '';
            document.getElementById('editClientPhone').value = client.phone || '';
            document.getElementById('editClientAddress').value = client.address || '';
            
            openModal('editClientModal');
        }
    } catch (error) {
        console.error('Error loading client for edit:', error);
        showNotification('Failed to load client details', 'error');
    }
}

async function handleSaveClient() {
    const clientId = document.getElementById('editClientId').value;
    const isNew = !clientId;
    
    const clientData = {
        name: document.getElementById('editClientName').value.trim(),
        company: document.getElementById('editClientCompany').value.trim(),
        email: document.getElementById('editClientEmail').value.trim(),
        phone: document.getElementById('editClientPhone').value.trim(),
        address: document.getElementById('editClientAddress').value.trim()
    };
    
    // Validation
    if (!clientData.name || !clientData.email) {
        showNotification('Name and email are required', 'error');
        return;
    }
    
    try {
        const url = isNew ? `${API_BASE_URL}/clients` : `${API_BASE_URL}/clients/${clientId}`;
        const method = isNew ? 'POST' : 'PUT';
        
        const result = await apiFetch(url, {
            method: method,
            body: JSON.stringify(clientData)
        });
        
        if (result.success) {
            showNotification(`Client ${isNew ? 'created' : 'updated'} successfully!`, 'success');
            closeModal('editClientModal');
            loadClients(); // Refresh the list
        }
    } catch (error) {
        console.error('Error saving client:', error);
        showNotification('Failed to save client', 'error');
    }
}

async function handleDeleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/clients/${clientId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            showNotification('Client deleted successfully!', 'success');
            loadClients(); // Refresh the list
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        showNotification('Failed to delete client', 'error');
    }
}

// Quotation operations
async function handleDeleteQuotation(quotationId) {
    if (!confirm('Are you sure you want to delete this quotation?')) {
        return;
    }
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/quotations/${quotationId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            showNotification('Quotation deleted successfully!', 'success');
            loadQuotations(); // Refresh the list
        }
    } catch (error) {
        console.error('Error deleting quotation:', error);
        showNotification('Failed to delete quotation', 'error');
    }
}

// Invoice operations
async function handleDeleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/invoices/${invoiceId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            showNotification('Invoice deleted successfully!', 'success');
            loadInvoices(); // Refresh the list
        }
    } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('Failed to delete invoice', 'error');
    }
}

// Task operations
async function handleDeleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            showNotification('Task deleted successfully!', 'success');
            loadTasks(); // Refresh the list
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showNotification('Failed to delete task', 'error');
    }
}

// --- CALCULATOR FUNCTIONS ---

function initCalculator() {
    // Initialize calculator with default item if empty
    if (state.items.length === 0) {
        addCalculatorItem();
    }
    renderCalculatorItems();
}

function addCalculatorItem() {
    const item = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        description: '',
        unit: 'pcs',
        quantity: 1,
        unit_price: 0
    };
    state.items.push(item);
    renderCalculatorItems();
}

function renderCalculatorItems() {
    const tableBody = document.getElementById('itemsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    state.items.forEach(item => {
        const row = document.createElement('tr');
        row.id = item.id;
        row.innerHTML = `
            <td>
                <input type="text" class="form-control" data-field="description" 
                       value="${item.description}" placeholder="Item description">
            </td>
            <td>
                <input type="text" class="form-control" data-field="unit" 
                       value="${item.unit}" placeholder="units">
            </td>
            <td>
                <input type="number" class="form-control" data-field="quantity" 
                       value="${item.quantity}" min="0" step="1">
            </td>
            <td>
                <input type="number" class="form-control" data-field="unit_price" 
                       value="${item.unit_price}" min="0" step="0.01">
            </td>
            <td class="item-total">${formatCurrency(item.quantity * item.unit_price)}</td>
            <td>
                <button class="btn btn-sm btn-danger remove-item-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    updateCalculatorSummary();
}

function updateCalculatorItem(itemId, field, value) {
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;
    
    if (field === 'quantity' || field === 'unit_price') {
        item[field] = parseFloat(value) || 0;
    } else {
        item[field] = value;
    }
    
    // Update the row total
    const row = document.getElementById(itemId);
    if (row) {
        const totalCell = row.querySelector('.item-total');
        if (totalCell) {
            totalCell.textContent = formatCurrency(item.quantity * item.unit_price);
        }
    }
    
    updateCalculatorSummary();
}

function removeCalculatorItem(itemId) {
    state.items = state.items.filter(item => item.id !== itemId);
    renderCalculatorItems();
}

function updateCalculatorSummary() {
    const subtotal = state.items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
    }, 0);
    
    const taxRate = parseFloat(document.getElementById('taxRate')?.value) || state.taxRate;
    const discountRate = parseFloat(document.getElementById('discount')?.value) || state.discount;
    
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discountRate / 100);
    const total = subtotal + taxAmount - discountAmount;
    
    // Update display
    const subtotalEl = document.getElementById('subtotal');
    const taxRateDisplayEl = document.getElementById('taxRateDisplay');
    const taxAmountEl = document.getElementById('taxAmount');
    const discountDisplayEl = document.getElementById('discountDisplay');
    const discountAmountEl = document.getElementById('discountAmount');
    const totalAmountEl = document.getElementById('totalAmount');
    
    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxRateDisplayEl) taxRateDisplayEl.textContent = taxRate.toFixed(1);
    if (taxAmountEl) taxAmountEl.textContent = formatCurrency(taxAmount);
    if (discountDisplayEl) discountDisplayEl.textContent = discountRate.toFixed(1);
    if (discountAmountEl) discountAmountEl.textContent = formatCurrency(discountAmount);
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(total);
}

function clearCalculator() {
    if (!confirm('Clear all items from the calculator?')) return;
    
    state.items = [];
    renderCalculatorItems();
    showNotification('Calculator cleared', 'success');
}

async function generateQuotation() {
    const clientSelect = document.getElementById('quotationClientSelect');
    if (!clientSelect || !clientSelect.value) {
        showNotification('Please select a client', 'error');
        return;
    }
    
    // Validate items
    const validItems = state.items.filter(item => 
        item.description.trim() && 
        item.quantity > 0 && 
        item.unit_price > 0
    );
    
    if (validItems.length === 0) {
        showNotification('Please add at least one valid item', 'error');
        return;
    }
    
    const quotationData = {
        client_id: clientSelect.value,
        items: validItems.map(item => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price
        })),
        tax_rate: parseFloat(document.getElementById('taxRate')?.value) || state.taxRate,
        discount: parseFloat(document.getElementById('discount')?.value) || state.discount
    };
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/quotations`, {
            method: 'POST',
            body: JSON.stringify(quotationData)
        });
        
        if (result.success) {
            showNotification('Quotation created successfully!', 'success');
            
            // Clear calculator and navigate to quotations
            state.items = [];
            renderCalculatorItems();
            navigateToPage('quotations');
        }
    } catch (error) {
        console.error('Error generating quotation:', error);
        showNotification('Failed to create quotation', 'error');
    }
}

// --- MODAL FUNCTIONS ---

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// --- EVENT LISTENERS SETUP ---

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        });
    }
    
    // Mobile nav toggle
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    if (mobileNavToggle) {
        mobileNavToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const mobileNavMenu = document.getElementById('mobileNavMenu');
            if (mobileNavMenu) {
                mobileNavMenu.classList.toggle('open');
            }
        });
    }
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        const mobileNavMenu = document.getElementById('mobileNavMenu');
        if (mobileNavMenu && !mobileNavMenu.contains(e.target) && 
            e.target !== document.getElementById('mobileNavToggle')) {
            mobileNavMenu.classList.remove('open');
        }
    });
    
    // Navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = link.dataset.page;
            navigateToPage(pageId);
        });
    });
    
    // Logout buttons
    document.querySelectorAll('#logoutBtn, #logoutBtnMobile').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleLogout);
        }
    });
    
    // Login form
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleLogin();
            }
        });
    }
    
    // Calculator event delegation
    const itemsTableBody = document.getElementById('itemsTableBody');
    if (itemsTableBody) {
        itemsTableBody.addEventListener('input', (e) => {
            const input = e.target;
            if (input.matches('input')) {
                const row = input.closest('tr');
                if (row) {
                    updateCalculatorItem(
                        row.id,
                        input.dataset.field,
                        input.value
                    );
                }
            }
        });
        
        itemsTableBody.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-item-btn');
            if (removeBtn) {
                const row = removeBtn.closest('tr');
                if (row) {
                    removeCalculatorItem(row.id);
                }
            }
        });
    }
    
    // Calculator controls
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addCalculatorItem);
    }
    
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearCalculator);
    }
    
    const generateQuoteBtn = document.getElementById('generateQuoteBtn');
    if (generateQuoteBtn) {
        generateQuoteBtn.addEventListener('click', generateQuotation);
    }
    
    // Tax and discount inputs
    const taxRateInput = document.getElementById('taxRate');
    const discountInput = document.getElementById('discount');
    
    if (taxRateInput) {
        taxRateInput.addEventListener('input', updateCalculatorSummary);
    }
    
    if (discountInput) {
        discountInput.addEventListener('input', updateCalculatorSummary);
    }
    
    // Settings
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    // Client search
    const clientSearchInput = document.getElementById('clientSearchInput');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', debounce((e) => {
            state.clientFilterQuery = e.target.value;
            loadClients();
        }, 300));
    }
    
    // Event delegation for dynamic content
    document.body.addEventListener('click', (e) => {
        // Edit client
        if (e.target.closest('.edit-client-btn')) {
            const btn = e.target.closest('.edit-client-btn');
            handleEditClient(btn.dataset.id);
        }
        
        // Delete client
        if (e.target.closest('.delete-client-btn')) {
            const btn = e.target.closest('.delete-client-btn');
            handleDeleteClient(btn.dataset.id);
        }
        
        // View quotation
        if (e.target.closest('.view-quotation-btn')) {
            const btn = e.target.closest('.view-quotation-btn');
            showDocumentDetail('quotation', btn.dataset.id);
        }
        
        // Delete quotation
        if (e.target.closest('.delete-quotation-btn')) {
            const btn = e.target.closest('.delete-quotation-btn');
            handleDeleteQuotation(btn.dataset.id);
        }
        
        // View invoice
        if (e.target.closest('.view-invoice-btn')) {
            const btn = e.target.closest('.view-invoice-btn');
            showDocumentDetail('invoice', btn.dataset.id);
        }
        
        // Delete invoice
        if (e.target.closest('.delete-invoice-btn')) {
            const btn = e.target.closest('.delete-invoice-btn');
            handleDeleteInvoice(btn.dataset.id);
        }
        
        // Delete task
        if (e.target.closest('.delete-task-btn')) {
            const btn = e.target.closest('.delete-task-btn');
            handleDeleteTask(btn.dataset.id);
        }
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal .btn-secondary, .modal .close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- INITIALIZATION ---

async function initializeApp() {
    console.log('Initializing application...');
    
    // Check session first
    const hasSession = await checkSession();
    
    if (hasSession) {
        // User is logged in, show main app
        hideLoginScreen();
        
        // Setup event listeners for the main app
        setupEventListeners();
        
        // Load initial page data
        navigateToPage('dashboard');
    } else {
        // User is not logged in, show login screen
        showLoginScreen();
    }
    
    // Hide loader
    const loader = document.querySelector('.loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }, 500);
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Emergency fallback
setTimeout(() => {
    const loader = document.querySelector('.loader');
    if (loader && loader.style.display !== 'none') {
        console.warn('Loader still visible after timeout, forcing initialization');
        initializeApp();
    }
}, 5000);
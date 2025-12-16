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
    clientSortColumn: 'name',
    clientSortDirection: 'asc',
    clientFilterQuery: '',
    allTasks: [],
    allClients: [],
    currentUser: null, // Holds logged-in user data
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
};

// --- UTILITY & HELPER FUNCTIONS ---

/**
 * A wrapper for the fetch API to handle credentials, headers, and errors.
 * @param {string} url - The URL to fetch.
 * @param {object} options - Fetch options (method, body, etc.).
 * @returns {Promise<object>} - The JSON response from the API.
 */
async function apiFetch(url, options = {}) {
    options.credentials = 'include'; // Send cookies with every request
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetch(url, options);

        if (response.status === 401) {
            // If unauthorized, redirect to login
            showLoginScreen();
            throw new Error('Authentication required.');
        }

        if (!response.ok) {
            // Try to get detailed error, but fallback gracefully.
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;
            if (errorText) {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            }
            throw new Error(errorMessage);
        }

        // Handle responses with no content (e.g., DELETE requests)
        if (response.status === 204) {
            return null;
        }

        return response.json();
    } catch (error) {
        // Log the full error for better server-side debugging.
        console.error('API Fetch Error:', error.message);
        // The error from a non-ok response is re-thrown, so we show it.
        // The apiFetch function itself doesn't need to show a generic notification.
        showNotification(error.message, 'error');
        throw error;
    }
}

/**
 * Shows a notification message at the bottom of the screen.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error'.
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');

    notificationMessage.textContent = message;
    notification.style.backgroundColor = type === 'error' ? 'var(--accent-coral)' : 'var(--jungle-green)';
    
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Formats a number as Kenyan Shillings.
 * @param {number} amount - The amount to format.
 * @returns {string} - The formatted currency string.
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2
    }).format(amount);
}

/**
 * Formats a date string into a more readable format.
 * @param {string} dateString - The ISO date string.
 * @returns {string} - The formatted date.
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// --- AUTHENTICATION ---

/**
 * Handles the user login process.
 */
async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const loginMessage = document.getElementById('loginMessage');
    const loginBtnText = loginBtn.querySelector('.login-btn-text');
    const loginSpinner = loginBtn.querySelector('.loader-spinner');

    loginBtn.disabled = true;
    loginMessage.style.display = 'none';
    loginBtnText.style.display = 'none';
    loginSpinner.style.display = 'inline-block';
    
    try {
        const result = await apiFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (result.success) {
            state.currentUser = result.data.user;
            setupEventListeners(); // CRITICAL FIX: Re-initialize listeners after login.
            hideLoginScreen(); // This will also show the app container.
            navigateToPage(state.currentPage); // Load initial page data.
        } else {
            loginMessage.textContent = result.message || 'Login failed.';
            loginMessage.style.display = 'block';
        }
    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
        loginBtnText.style.display = 'inline-block';
        loginSpinner.style.display = 'none';
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        await apiFetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
        state.currentUser = null;
        showLoginScreen();
    } catch (error) {
        showNotification('Logout failed. Please try again.', 'error');
    }
}

/**
 * Checks if there is an active session on page load.
 */
async function checkSession() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/auth/check-session`);
        if (result.success) {
            state.currentUser = result.data;
            // The hideLoginScreen function now handles making the app visible.
            hideLoginScreen(); 
            return true;
        }
    } catch (error) {
        // If session check fails, it means user is not logged in
        showLoginScreen();
    }
    return false;
}

function showLoginScreen() {
    const loader = document.querySelector('.loader');
    if (loader) loader.style.opacity = '0';

    document.getElementById('loginContainer').style.display = 'flex';
    document.querySelector('.app-container').style.opacity = '0';
}

function hideLoginScreen() {
    const loader = document.querySelector('.loader');
    if (loader) loader.style.opacity = '0';

    document.getElementById('loginContainer').style.display = 'none';
    document.querySelector('.app-container').style.opacity = '1'; // Make app visible
}

// --- PAGE NAVIGATION ---

/**
 * Switches the visible page in the main content area.
 * @param {string} pageId - The ID of the page to show.
 */
function navigateToPage(pageId) {
    // Close mobile menu if open before navigating
    document.getElementById('mobileNavMenu')?.classList.remove('open');

    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

    // Explicitly hide detail views that might persist across page navigations
    const quoteDetail = document.getElementById('quotationDetailContainer');
    if (quoteDetail) quoteDetail.style.display = 'none';
    const invoiceDetail = document.getElementById('invoiceDetailContainer');
    if (invoiceDetail) invoiceDetail.style.display = 'none';
    // And restore list views
    const quoteList = document.getElementById('quotationsListContainer');
    if (quoteList) quoteList.style.display = 'block';
    
    // Show the target page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        state.currentPage = pageId;
    }

    // Update active state on nav links
    document.querySelectorAll('.nav-item').forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });

    // Load data for the new page
    loadPageData(pageId);
}

/**
 * Fetches and renders data based on the current page.
 * @param {string} pageId - The ID of the page being loaded.
 */
// Track if dashboard is already loading to prevent duplicate requests
let isDashboardLoading = false;

function loadPageData(pageId) {
    // Skip if we're already loading the dashboard to prevent duplicates
    if (pageId === 'dashboard' && isDashboardLoading) {
        return;
    }

    switch (pageId) {
        case 'dashboard':
            isDashboardLoading = true;
            loadDashboardStats().finally(() => {
                isDashboardLoading = false;
            });
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
            // Load clients for the calculator's client select
            loadClientsForSelect('quotationClientSelect');
            break;
        default:
            console.warn(`No data loader for page: ${pageId}`);
    }
}

async function loadDashboardStats() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/dashboard/stats`);
        // Log the entire response for debugging purposes.
        console.log('Dashboard Stats API Response:', result);

        if (result && result.success && result.data) {
            const { data } = result;

            // Check for main stats and log a warning if a field is missing.
            document.getElementById('activeProjects').textContent = data.activeProjects ?? 'N/A';
            if (data.activeProjects === undefined) console.warn('Dashboard stats missing: activeProjects');

            document.getElementById('monthlyRevenue').textContent = formatCurrency(data.monthlyRevenue ?? 0);
            if (data.monthlyRevenue === undefined) console.warn('Dashboard stats missing: monthlyRevenue');

            document.getElementById('pendingTasks').textContent = data.pendingTasks ?? 'N/A';
            if (data.pendingTasks === undefined) console.warn('Dashboard stats missing: pendingTasks');

            document.getElementById('clientSatisfaction').textContent = `${data.clientSatisfaction ?? 0}%`;
            if (data.clientSatisfaction === undefined) console.warn('Dashboard stats missing: clientSatisfaction');
            
            // Check for trends data.
            if (data.trends) {
                document.getElementById('projectsTrend').textContent = `${data.trends.projects > 0 ? '+' : ''}${data.trends.projects ?? 0}`;
                if (data.trends.projects === undefined) console.warn('Dashboard trends missing: projects');

                document.getElementById('revenueTrend').textContent = `${data.trends.revenue > 0 ? '+' : ''}${data.trends.revenue ?? 0}%`;
                if (data.trends.revenue === undefined) console.warn('Dashboard trends missing: revenue');

                document.getElementById('tasksTrend').textContent = `${data.trends.tasks > 0 ? '+' : ''}${data.trends.tasks ?? 0}`;
                if (data.trends.tasks === undefined) console.warn('Dashboard trends missing: tasks');
            } else {
                console.warn('Dashboard stats object missing: trends');
            }
        } else {
            showNotification('Could not retrieve dashboard statistics.', 'error');
        }
    } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        showNotification('An error occurred while fetching dashboard stats.', 'error');
    }
}

async function loadClients() {
    // Construct URL with query parameters for backend sorting and filtering
    const url = new URL(`${API_BASE_URL}/clients`);
    url.searchParams.append('sort', state.clientSortColumn);
    url.searchParams.append('direction', state.clientSortDirection);
    if (state.clientFilterQuery) {
        url.searchParams.append('filter', state.clientFilterQuery);
    }

    try {
        const result = await apiFetch(url.toString());
        if (result.success) {
            state.allClients = result.data;
            renderClientsTable(state.allClients);
        }
    } catch (error) {
        console.error("Failed to load and render clients:", error);
    }
}

function renderClientsTable(clients) {
    const tableBody = document.getElementById('clientsTableBody');
    tableBody.innerHTML = '';

    if (clients.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No clients found.</td></tr>';
        return;
    }
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.company || 'N/A'}</td>
            <td>${client.email}</td>
            <td>${client.phone}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-client-btn" data-id="${client.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-client-btn" data-id="${client.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // Update sort indicators in table headers
    document.querySelectorAll('#clients-page .sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === state.clientSortColumn) {
            th.classList.add(`sort-${state.clientSortDirection}`);
        }
    });
}

function handleClientSort(column) {
    state.clientSortDirection = state.clientSortColumn === column && state.clientSortDirection === 'asc' ? 'desc' : 'asc';
    state.clientSortColumn = column;
    loadClients(); // Reload data from backend with new sort parameters
}

async function loadProjects() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/projects`);
        if (result.success) {
            state.allProjects = result.data;
            renderProjectsTable(state.allProjects);
        }
    } catch (error) {
        console.error("Failed to load projects:", error);
    }
}

function renderProjectsTable(projects) {
    const tableBody = document.getElementById('projectsTableBody');
    tableBody.innerHTML = '';
    if (projects.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No projects found.</td></tr>';
        return;
    }
    projects.forEach(project => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${project.name}</td>
            <td>${project.client_name || 'N/A'}</td>
            <td><span class="status-badge status-${project.status}">${project.status.replace('_', ' ')}</span></td>
            <td>${formatCurrency(project.budget)}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-project-btn" data-id="${project.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-project-btn" data-id="${project.id}"><i class="fas fa-trash"></i></button>
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
        console.error("Failed to load quotations:", error);
    }
}

function renderQuotationsTable(quotations) {
    const tableBody = document.getElementById('quotationsTableBody');
    tableBody.innerHTML = '';
    if (quotations.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No quotations found.</td></tr>';
        return;
    }
    quotations.forEach(quote => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${quote.quotation_number}</td>
            <td>${quote.client_name || 'N/A'}</td>
            <td>${formatDate(quote.created_at)}</td>
            <td>${formatCurrency(quote.total)}</td>
            <td><span class="status-badge status-${quote.status}">${quote.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary view-quotation-btn" data-id="${quote.id}" title="View"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-secondary edit-quotation-btn" data-id="${quote.id}" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-quotation-btn" data-id="${quote.id}" title="Delete"><i class="fas fa-trash"></i></button>
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
        console.error("Failed to load invoices:", error);
    }
}

function renderInvoicesTable(invoices) {
    const tableBody = document.getElementById('invoicesTableBody');
    tableBody.innerHTML = '';
    if (invoices.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No invoices found.</td></tr>';
        return;
    }
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoice_number}</td>
            <td>${invoice.client_name || 'N/A'}</td>
            <td>${formatDate(invoice.issue_date)}</td>
            <td>${formatDate(invoice.due_date)}</td>
            <td>${formatCurrency(invoice.total)}</td>
            <td><span class="status-badge status-${invoice.status}">${invoice.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary view-invoice-btn" data-id="${invoice.id}" title="View"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-secondary edit-invoice-btn" data-id="${invoice.id}" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-invoice-btn" data-id="${invoice.id}" title="Delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadTasks() {
    try {
        // For now, we load all tasks. This could be filtered by project later.
        const result = await apiFetch(`${API_BASE_URL}/tasks/project/all`); // Assuming an endpoint to get all tasks
        if (result.success) {
            state.allTasks = result.data;
            renderTasksTable(state.allTasks);
        }
    } catch (error) {
        console.error("Failed to load tasks:", error);
    }
}

function renderTasksTable(tasks) {
    const tableBody = document.getElementById('tasksTableBody');
    tableBody.innerHTML = '';
    if (tasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No tasks found.</td></tr>';
        return;
    }
    tasks.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${task.title}</td>
            <td>${task.project_name || 'N/A'}</td>
            <td><span class="status-badge status-${task.status.replace(' ', '_')}">${task.status}</span></td>
            <td><span class="priority-badge priority-${task.priority}">${task.priority}</span></td>
            <td>${formatDate(task.due_date)}</td>
            <td>
                <button class="btn btn-sm btn-secondary edit-task-btn" data-id="${task.id}"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger delete-task-btn" data-id="${task.id}"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

async function loadSettings() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/settings`);
        if (result.success) {
            const settings = result.data;
            for (const key in settings) {
                const input = document.getElementById(`setting${key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`);
                if (input) {
                    input.value = settings[key];
                }
            }
        }
    } catch (error) {
        console.error("Failed to load settings:", error);
    }
}

async function saveSettings() {
    const settings = {};
    const inputs = document.querySelectorAll('#settings-page .form-control');
    inputs.forEach(input => {
        // Convert camelCase ID to snake_case key
        const key = input.id.replace('setting', '').replace(/([A-Z])/g, "_$1").toLowerCase().substring(1);
        settings[key] = input.value;
    });

    try {
        const result = await apiFetch(`${API_BASE_URL}/settings`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        if (result.success) {
            showNotification('Settings saved successfully!');
        }
    } catch (error) {
        console.error("Failed to save settings:", error);
    }
}

async function loadClientsForSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const result = await apiFetch(`${API_BASE_URL}/clients`);
        if (result.success) {
            select.innerHTML = '<option value="">-- Select a Client --</option>';
            result.data.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.name} (${client.email})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error(`Failed to load clients for select ${selectId}:`, error);
    }
}

async function showDocumentViewer(docId, docType) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/${docType}s/${docId}`);
        if (!result.success) {
            return showNotification(`Failed to load ${docType}.`, 'error');
        }

        const doc = result.data;
        const modal = document.getElementById('viewDocumentModal');
        const title = modal.querySelector('h3');
        const content = modal.querySelector('.document-content');

        let itemsHtml = doc.items.map(item => `
            <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td>${formatCurrency(item.total)}</td>
            </tr>
        `).join('');

        if (docType === 'quotation') {
            title.textContent = `Quotation #${doc.quotation_number}`;
            content.innerHTML = `
                <p><strong>Client:</strong> ${doc.client_name}</p>
                <p><strong>Date:</strong> ${formatDate(doc.created_at)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${doc.status}">${doc.status}</span></p>
                <hr>
                <h4>Items</h4>
                <table class="table">
                    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="summary">
                    <p>Subtotal: <span>${formatCurrency(doc.subtotal)}</span></p>
                    <p>Tax (${doc.tax_rate}%): <span>${formatCurrency(doc.tax_amount)}</span></p>
                    <p>Discount: <span>- ${formatCurrency(doc.discount_amount)}</span></p>
                    <h4>Total: <span>${formatCurrency(doc.total)}</span></h4>
                </div>
            `;
        } else if (docType === 'invoice') {
            title.textContent = `Invoice #${doc.invoice_number}`;
            content.innerHTML = `
                <p><strong>Client:</strong> ${doc.client_name}</p>
                <p><strong>Issue Date:</strong> ${formatDate(doc.issue_date)}</p>
                <p><strong>Due Date:</strong> ${formatDate(doc.due_date)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${doc.status}">${doc.status}</span></p>
                <hr>
                <h4>Items</h4>
                <table class="table">
                    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="summary">
                    <p>Subtotal: <span>${formatCurrency(doc.subtotal)}</span></p>
                    <p>Tax: <span>${formatCurrency(doc.tax_amount)}</span></p>
                    <h4>Total: <span>${formatCurrency(doc.total)}</span></h4>
                </div>
            `;
        }
        openModal('viewDocumentModal');
    } catch (error) {
        console.error(`Failed to show ${docType}:`, error);
    }
}

/**
 * A generic function to display a detailed view of a document (Quotation or Invoice).
 * @param {string} docType - 'quotation' or 'invoice'.
 * @param {string|number} docId - The ID of the document.
 */
async function showDocumentDetail(docType, docId) {
    const config = {
        quotation: {
            listContainerId: 'quotationsListContainer',
            detailContainerId: 'quotationDetailContainer',
            contentId: 'quotationContent',
            backBtnId: 'backToQuotesListBtn',
            downloadBtnId: 'downloadQuotationBtn',
            printBtnId: 'printQuotationBtn',
            extraButtons: [],
            title: (doc) => `Quotation #${doc.quotation_number}`,
            details: (doc) => `
                <p><strong>Client:</strong> ${doc.client_name}</p>
                <p><strong>Date:</strong> ${formatDate(doc.created_at)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${doc.status}">${doc.status}</span></p>
            `,
            summary: (doc) => `
                <p>Subtotal: <strong>${formatCurrency(doc.subtotal)}</strong></p>
                <p>Tax (${doc.tax_rate}%): <strong>${formatCurrency(doc.tax_amount)}</strong></p>
                <p>Discount: <strong>- ${formatCurrency(doc.discount_amount)}</strong></p>
                <h3>Total: <strong>${formatCurrency(doc.total)}</strong></h3>
            `,
        },
        invoice: {
            listContainerId: 'invoicesListContainer',
            detailContainerId: 'invoiceDetailContainer',
            contentId: 'invoiceContent',
            backBtnId: 'backToInvoicesListBtn',
            downloadBtnId: 'downloadInvoiceBtn',
            printBtnId: 'printInvoiceBtn',
            extraButtons: [
                { id: 'markAsPaidBtn', label: 'Mark as Paid', action: () => updateInvoiceStatus(docId, 'paid') },
                { id: 'markAsOverdueBtn', label: 'Mark as Overdue', action: () => updateInvoiceStatus(docId, 'overdue') },
            ],
            title: (doc) => `Invoice #${doc.invoice_number}`,
            details: (doc) => `
                <p><strong>Client:</strong> ${doc.client_name}</p>
                <p><strong>Issue Date:</strong> ${formatDate(doc.issue_date)}</p>
                <p><strong>Due Date:</strong> ${formatDate(doc.due_date)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${doc.status}">${doc.status}</span></p>
            `,
            summary: (doc) => `
                <p>Subtotal: <strong>${formatCurrency(doc.subtotal)}</strong></p>
                <p>Tax: <strong>${formatCurrency(doc.tax_amount)}</strong></p>
                <h3>Total: <strong>${formatCurrency(doc.total)}</strong></h3>
            `,
        }
    };

    const docConfig = config[docType];
    if (!docConfig) return;

    try {
        const result = await apiFetch(`${API_BASE_URL}/${docType}s/${docId}`);
        if (!result.success) {
            return showNotification(`Failed to load ${docType}.`, 'error');
        }

        const doc = result.data;
        const listContainer = document.getElementById(docConfig.listContainerId);
        const detailContainer = document.getElementById(docConfig.detailContainerId);
        const contentDiv = document.getElementById(docConfig.contentId);

        // Build items table
        let itemsHtml = doc.items.map(item => `
            <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td>${formatCurrency(item.total)}</td>
            </tr>
        `).join('');
        
        // Build full detail view HTML
        contentDiv.innerHTML = `
            <div style="padding: 20px;">
                <h2>${docConfig.title(doc)}</h2>
                ${docConfig.details(doc)}
                <hr>
                <h4>Items</h4>
                <table class="items-table">
                    <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="summary" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">${docConfig.summary(doc)}</div>
            </div>
        `;

        // Show detail, hide list
        listContainer.style.display = 'none';
        detailContainer.style.display = 'block';

        // Setup common button handlers
        document.getElementById(docConfig.backBtnId).onclick = () => {
            listContainer.style.display = 'block';
            detailContainer.style.display = 'none';
        };
        document.getElementById(docConfig.downloadBtnId).onclick = () => {
            window.location.href = `${API_BASE_URL}/${docType}s/${docId}/download`;
        };
        document.getElementById(docConfig.printBtnId).onclick = () => {
            window.print();
        };

        // Setup extra buttons
        docConfig.extraButtons.forEach(btn => {
            const buttonEl = document.getElementById(btn.id);
            if (buttonEl) buttonEl.onclick = btn.action;
        });
    } catch (error) {
        console.error(`Failed to show ${docType} detail:`, error);
    }
}

async function updateInvoiceStatus(invoiceId, status) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/invoices/${invoiceId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        if (result.success) {
            showNotification(`Invoice marked as ${status}`, 'success');
            loadInvoices(); // Reload the list
            document.getElementById('invoicesListContainer').style.display = 'block';
            document.getElementById('invoiceDetailContainer').style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to update invoice status:', error);
    }
}

async function editQuotation(quotationId) {
    try {
        // mark current editing context
        state.currentEdit = { type: 'quotation', id: quotationId };
        // show save button and hide generate when editing
        document.getElementById('saveEditBtn')?.style.setProperty('display', 'inline-block');
        document.getElementById('generateQuoteBtn')?.style.setProperty('display', 'none');

        const result = await apiFetch(`${API_BASE_URL}/quotations/${quotationId}`);
        if (!result.success) {
            return showNotification('Failed to fetch quotation for editing.', 'error');
        }

        const quotation = result.data;

        // If there's an edit modal present in the DOM, populate and open it
        const modal = document.getElementById('editQuotationModal');
        if (modal) {
            // Populate common fields if present
            const idInput = document.getElementById('editQuotationId');
            if (idInput) idInput.value = quotation.id || '';

            const clientSelect = document.getElementById('editQuotationClient');
            if (clientSelect) clientSelect.value = quotation.client_id || '';

            const taxInput = document.getElementById('editQuotationTaxRate');
            if (taxInput) taxInput.value = quotation.tax_rate ?? state.taxRate;

            const discountInput = document.getElementById('editQuotationDiscount');
            if (discountInput) discountInput.value = quotation.discount_amount ?? state.discount;

            // If the modal has an items container, try to render items there, otherwise store in state
            if (typeof renderQuotationEditItems === 'function') {
                renderQuotationEditItems(quotation.items || []);
            } else {
                // Fallback: put items into the calculator state so the user can edit
                state.items = (quotation.items || []).map((it, idx) => ({
                    id: `item-${Date.now()}-${idx}`,
                    description: it.description || '',
                    unit: it.unit || 'pcs',
                    quantity: it.quantity || 1,
                    unit_price: it.unit_price || 0
                }));
            }

            openModal('editQuotationModal');
            return;
        }

        // Fallback behaviour: load quotation items into the calculator for manual edits
        state.items = (quotation.items || []).map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            description: it.description || '',
            unit: it.unit || 'pcs',
            quantity: it.quantity || 1,
            unit_price: it.unit_price || 0
        }));
        document.getElementById('quotationClientSelect')?.value = quotation.client_id || '';
        document.getElementById('taxRate').value = quotation.tax_rate ?? state.taxRate;
        document.getElementById('discount').value = quotation.discount_amount ?? state.discount;
        renderCalculatorItems();
        navigateToPage('calculator');
    } catch (error) {
        console.error('Failed to prepare quotation edit:', error);
        showNotification('Could not start quotation edit. See console for details.', 'error');
    }
}

async function editInvoice(invoiceId) {
    try {
        // mark current editing context
        state.currentEdit = { type: 'invoice', id: invoiceId };
        // show save button and hide generate when editing
        document.getElementById('saveEditBtn')?.style.setProperty('display', 'inline-block');
        document.getElementById('generateQuoteBtn')?.style.setProperty('display', 'none');

        const result = await apiFetch(`${API_BASE_URL}/invoices/${invoiceId}`);
        if (!result.success) {
            return showNotification('Failed to fetch invoice for editing.', 'error');
        }

        const invoice = result.data;

        // If an edit modal exists for invoices, populate it and open
        const modal = document.getElementById('editInvoiceModal');
        if (modal) {
            const idInput = document.getElementById('editInvoiceId');
            if (idInput) idInput.value = invoice.id || '';

            const clientSelect = document.getElementById('editInvoiceClient');
            if (clientSelect) clientSelect.value = invoice.client_id || '';

            const issueDate = document.getElementById('editInvoiceIssueDate');
            if (issueDate) issueDate.value = invoice.issue_date ? new Date(invoice.issue_date).toISOString().split('T')[0] : '';

            const dueDate = document.getElementById('editInvoiceDueDate');
            if (dueDate) dueDate.value = invoice.due_date ? new Date(invoice.due_date).toISOString().split('T')[0] : '';

            // Populate items into invoice editor if helper exists, otherwise put into calculator
            if (typeof renderInvoiceEditItems === 'function') {
                renderInvoiceEditItems(invoice.items || []);
            } else {
                state.items = (invoice.items || []).map((it, idx) => ({
                    id: `item-${Date.now()}-${idx}`,
                    description: it.description || '',
                    unit: it.unit || 'pcs',
                    quantity: it.quantity || 1,
                    unit_price: it.unit_price || 0
                }));
                document.getElementById('taxRate').value = invoice.tax_rate ?? state.taxRate;
                renderCalculatorItems();
            }

            openModal('editInvoiceModal');
            return;
        }

        // Fallback: load into calculator for manual editing
        state.items = (invoice.items || []).map((it, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            description: it.description || '',
            unit: it.unit || 'pcs',
            quantity: it.quantity || 1,
            unit_price: it.unit_price || 0
        }));
        document.getElementById('taxRate').value = invoice.tax_rate ?? state.taxRate;
        renderCalculatorItems();
        navigateToPage('calculator');
    } catch (error) {
        console.error('Failed to prepare invoice edit:', error);
        showNotification('Could not start invoice edit. See console for details.', 'error');
    }
}

/**
 * Save edits for the currently edited quotation or invoice.
 */
async function saveEdits() {
    if (!state.currentEdit || !state.currentEdit.id) {
        return showNotification('Nothing to save.', 'error');
    }

    const { type, id } = state.currentEdit;

    // Build items from calculator state
    const items = state.items.map(it => ({
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unit_price: it.unit_price,
        total: (it.quantity || 0) * (it.unit_price || 0)
    }));

    if (type === 'quotation') {
        const payload = {
            client_id: document.getElementById('quotationClientSelect')?.value || null,
            tax_rate: parseFloat(document.getElementById('taxRate')?.value) || state.taxRate,
            discount_amount: parseFloat(document.getElementById('discount')?.value) || state.discount,
            items,
            subtotal: parseFloat(document.getElementById('subtotal')?.textContent.replace(/[^0-9.]/g, '')) || 0,
            total: parseFloat(document.getElementById('totalAmount')?.textContent.replace(/[^0-9.]/g, '')) || 0
        };

        try {
            const result = await apiFetch(`${API_BASE_URL}/quotations/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (result.success) {
                showNotification('Quotation updated successfully!', 'success');
                // clear editing state and toggle buttons
                state.currentEdit = null;
                document.getElementById('saveEditBtn')?.style.setProperty('display', 'none');
                document.getElementById('generateQuoteBtn')?.style.setProperty('display', 'inline-block');
                navigateToPage('quotations');
                loadQuotations();
            }
        } catch (err) {
            console.error('Failed to save quotation edits:', err);
            showNotification('Failed to save quotation. See console.', 'error');
        }
        return;
    }

    if (type === 'invoice') {
        // Build minimal invoice payload from calculator fields where applicable
        const payload = {
            subtotal: parseFloat(document.getElementById('subtotal')?.textContent.replace(/[^0-9.]/g, '')) || 0,
            tax_rate: parseFloat(document.getElementById('taxRate')?.value) || state.taxRate,
            discount_amount: parseFloat(document.getElementById('discount')?.value) || state.discount,
            total: parseFloat(document.getElementById('totalAmount')?.textContent.replace(/[^0-9.]/g, '')) || 0,
            items
        };

        try {
            const result = await apiFetch(`${API_BASE_URL}/invoices/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (result.success) {
                showNotification('Invoice updated successfully!', 'success');
                state.currentEdit = null;
                document.getElementById('saveEditBtn')?.style.setProperty('display', 'none');
                document.getElementById('generateQuoteBtn')?.style.setProperty('display', 'inline-block');
                navigateToPage('invoices');
                loadInvoices();
            }
        } catch (err) {
            console.error('Failed to save invoice edits:', err);
            showNotification('Failed to save invoice. See console.', 'error');
        }
        return;
    }
}

// --- MODAL HANDLING ---

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function setupModal(modalId, openBtnId, cancelBtnId) {
    if (openBtnId) {
        document.getElementById(openBtnId).addEventListener('click', () => openModal(modalId));
    }
    if (cancelBtnId) {
        document.getElementById(cancelBtnId).addEventListener('click', () => closeModal(modalId));
    }
}

// --- CLIENTS CRUD ---

async function handleAddNewClient() {
    // This reuses the editClientModal but for creation
    document.getElementById('editClientModal').querySelector('h3').textContent = 'Add New Client';
    document.getElementById('editClientId').value = '';
    document.getElementById('editClientForm').reset();
    openModal('editClientModal');
}

async function handleEditClient(clientId) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/clients/${clientId}`);
        if (result.success) {
            const client = result.data;
            document.getElementById('editClientModal').querySelector('h3').textContent = 'Edit Client';
            document.getElementById('editClientId').value = client.id;
            document.getElementById('editClientName').value = client.name;
            document.getElementById('editClientCompany').value = client.company || '';
            document.getElementById('editClientEmail').value = client.email;
            document.getElementById('editClientPhone').value = client.phone;
            document.getElementById('editClientAddress').value = client.address;
            openModal('editClientModal');
        }
    } catch (error) {
        console.error(`Failed to fetch client ${clientId} for editing:`, error);
    }
}

async function handleSaveClient() {
    const clientId = document.getElementById('editClientId').value;
    const isNew = !clientId;

    const clientData = {
        name: document.getElementById('editClientName').value,
        company: document.getElementById('editClientCompany').value,
        email: document.getElementById('editClientEmail').value,
        phone: document.getElementById('editClientPhone').value,
        address: document.getElementById('editClientAddress').value,
    };

    const url = isNew ? `${API_BASE_URL}/clients` : `${API_BASE_URL}/clients/${clientId}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
        const result = await apiFetch(url, { method, body: JSON.stringify(clientData) });
        if (result.success) {
            showNotification(`Client ${isNew ? 'created' : 'updated'} successfully!`);
            closeModal('editClientModal');
            loadClients(); // Refresh the table
        }
    } catch (error) {
        console.error('Failed to save client:', error);
    }
}

async function handleEditProject(projectId) {
    try {
        const result = await apiFetch(`${API_BASE_URL}/projects/${projectId}`);
        if (!result.success) return;

        const project = result.data;
        await loadClientsForSelect('editProjectClient');

        document.getElementById('editProjectId').value = project.id;
        document.getElementById('editProjectName').value = project.name;
        document.getElementById('editProjectDescription').value = project.description || '';
        document.getElementById('editProjectClient').value = project.client_id || '';
        document.getElementById('editProjectBudget').value = project.budget || 0;
        document.getElementById('editProjectStatus').value = project.status || 'planning';
        document.getElementById('editProjectProgress').value = project.progress || 0;
        document.getElementById('editProjectProgressValue').textContent = `${project.progress || 0}%`;
        document.getElementById('editProjectStartDate').value = project.start_date ? new Date(project.start_date).toISOString().split('T')[0] : '';
        document.getElementById('editProjectDeadline').value = project.deadline ? new Date(project.deadline).toISOString().split('T')[0] : '';
        document.getElementById('editProjectNotes').value = project.notes || '';

        openModal('editProjectModal');
    } catch (error) {
        console.error(`Failed to open edit modal for project ${projectId}:`, error);
    }
}

async function handleSaveProject() {
    const projectId = document.getElementById('editProjectId').value;
    const projectData = {
        name: document.getElementById('editProjectName').value,
        description: document.getElementById('editProjectDescription').value,
        client_id: document.getElementById('editProjectClient').value,
        budget: parseFloat(document.getElementById('editProjectBudget').value) || 0,
        status: document.getElementById('editProjectStatus').value,
        progress: parseInt(document.getElementById('editProjectProgress').value) || 0,
        start_date: document.getElementById('editProjectStartDate').value || null,
        deadline: document.getElementById('editProjectDeadline').value || null,
        notes: document.getElementById('editProjectNotes').value,
    };

    await apiFetch(`${API_BASE_URL}/projects/${projectId}`, { method: 'PUT', body: JSON.stringify(projectData) });
    showNotification('Project updated successfully!');
    closeModal('editProjectModal');
    loadProjects();
}

async function handleEditTask(taskId) {
    try {
        const task = state.allTasks.find(t => t.id === parseInt(taskId));
        if (!task) {
            return showNotification('Task not found.', 'error');
        }

        document.getElementById('editTaskId').value = task.id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDescription').value = task.description || '';
        document.getElementById('editTaskStatus').value = task.status;
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editTaskAssignedTo').value = task.assigned_to || '';
        document.getElementById('editTaskDueDate').value = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '';

        openModal('editTaskModal');
    } catch (error) {
        console.error(`Failed to open edit modal for task ${taskId}:`, error);
    }
}

async function handleSaveTask() {
    const taskId = document.getElementById('editTaskId').value;
    const taskData = {
        title: document.getElementById('editTaskTitle').value,
        description: document.getElementById('editTaskDescription').value,
        status: document.getElementById('editTaskStatus').value,
        priority: document.getElementById('editTaskPriority').value,
        assigned_to: document.getElementById('editTaskAssignedTo').value,
        due_date: document.getElementById('editTaskDueDate').value || null,
    };

    if (!taskData.title) {
        return showNotification('Task title is required.', 'error');
    }

    try {
        await apiFetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(taskData) });
        showNotification('Task updated successfully!');
        closeModal('editTaskModal');
        loadTasks(); // Refresh the tasks list
    } catch (error) {
        console.error(`Failed to save task ${taskId}:`, error);
    }
}

async function handleDeleteClient(clientId) {
    if (!confirm('Are you sure you want to delete this client? This cannot be undone.')) {
        return;
    }

    try {
        // A successful DELETE request often returns a 204 No Content status.
        // Our apiFetch utility handles this by returning null and not throwing an error.
        await apiFetch(`${API_BASE_URL}/clients/${clientId}`, {
            method: 'DELETE'
        });
        
        showNotification('Client deleted successfully!');
        loadClients(); // Refresh the client list
    } catch (error) {
        // The apiFetch utility will show an error notification.
        console.error(`Failed to delete client ${clientId}:`, error);
    }
}

// --- CALCULATOR & QUOTATION LOGIC ---

function addCalculatorItem() {
    const item = {
        id: `item-${Date.now()}`,
        description: '',
        unit: 'pcs',
        quantity: 1,
        unit_price: 0,
    };
    state.items.push(item);
    renderCalculatorItems();
}

function renderCalculatorItems() {
    const tableBody = document.getElementById('itemsTableBody');
    tableBody.innerHTML = '';
    state.items.forEach(item => {
        const row = document.createElement('tr');
        row.id = item.id;
        row.innerHTML = `
            <td><input type="text" class="form-control" data-field="description" value="${item.description}" placeholder="Item description"></td>
            <td><input type="text" class="form-control" data-field="unit" value="${item.unit}"></td>
            <td><input type="number" class="form-control" data-field="quantity" value="${item.quantity}" min="0"></td>
            <td><input type="number" class="form-control" data-field="unit_price" value="${item.unit_price}" min="0"></td>
            <td class="item-total">${formatCurrency(item.quantity * item.unit_price)}</td>
            <td><button class="btn btn-sm btn-danger remove-item-btn"><i class="fas fa-trash"></i></button></td>
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

    const row = document.getElementById(itemId);
    if (row) {
        const totalCell = row.querySelector('.item-total');
        totalCell.textContent = formatCurrency(item.quantity * item.unit_price);
    }
    updateCalculatorSummary();
}

function removeCalculatorItem(itemId) {
    state.items = state.items.filter(i => i.id !== itemId);
    renderCalculatorItems();
}

function updateCalculatorSummary() {
    const subtotal = state.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const discountPercent = parseFloat(document.getElementById('discount').value) || 0;

    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discountPercent / 100);
    const total = subtotal + taxAmount - discountAmount;

    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('taxRateDisplay').textContent = taxRate;
    document.getElementById('taxAmount').textContent = formatCurrency(taxAmount);
    document.getElementById('discountDisplay').textContent = discountPercent;
    document.getElementById('discountAmount').textContent = `- ${formatCurrency(discountAmount)}`;
    document.getElementById('totalAmount').textContent = formatCurrency(total);
}

async function generateQuotation() {
    const quotationData = {
        client_id: document.getElementById('quotationClientSelect').value,
        items: state.items.map(item => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
        })),
        tax_rate: parseFloat(document.getElementById('taxRate').value) || 0,
        discount_amount: parseFloat(document.getElementById('discountAmount').textContent.replace(/[^0-9.]/g, '')) || 0,
        subtotal: parseFloat(document.getElementById('subtotal').textContent.replace(/[^0-9.]/g, '')) || 0,
        total: parseFloat(document.getElementById('totalAmount').textContent.replace(/[^0-9.]/g, '')) || 0,
    };

    if (!quotationData.client_id) {
        return showNotification('Please select a client.', 'error');
    }

    try {
        const result = await apiFetch(`${API_BASE_URL}/quotations`, { method: 'POST', body: JSON.stringify(quotationData) });
        if (result.success) {
            showNotification('Quotation created successfully!');
            navigateToPage('quotations');
        }
    } catch (error) {
        console.error('Failed to generate quotation:', error);
    }
}

/**
 * Clears all items and resets the calculator form.
 */
function clearCalculator() {
    if (confirm('Are you sure you want to clear all items from the calculator?')) {
        // Reset the items array in the state
        state.items = [];

        // Reset the form inputs to their default values
        document.getElementById('quotationClientSelect').value = '';
        document.getElementById('taxRate').value = state.taxRate; // Default tax rate
        document.getElementById('discount').value = state.discount; // Default discount

        // Re-render the calculator to reflect the cleared state
        renderCalculatorItems();

        showNotification('Calculator has been cleared.');
    }
}
// --- PROJECTS, QUOTATIONS, INVOICES CRUD (DELETE) ---

async function handleDeleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project? This will also delete related quotations and invoices and cannot be undone.')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/projects/${projectId}`, { method: 'DELETE' });
        showNotification('Project deleted successfully!');
        loadProjects(); // Refresh the projects list
    } catch (error) {
        console.error(`Failed to delete project ${projectId}:`, error);
    }
}

async function handleDeleteQuotation(quotationId) {
    if (!confirm('Are you sure you want to delete this quotation? This cannot be undone.')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/quotations/${quotationId}`, { method: 'DELETE' });
        showNotification('Quotation deleted successfully!');
        loadQuotations(); // Refresh the quotations list
    } catch (error) {
        console.error(`Failed to delete quotation ${quotationId}:`, error);
    }
}

async function handleDeleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice? This cannot be undone.')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/invoices/${invoiceId}`, { method: 'DELETE' });
        showNotification('Invoice deleted successfully!');
        loadInvoices(); // Refresh the invoices list
    } catch (error) {
        console.error(`Failed to delete invoice ${invoiceId}:`, error);
    }
}

async function handleDeleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    try {
        await apiFetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
        showNotification('Task deleted successfully!');
        loadTasks(); // Refresh the tasks list
    } catch (error) {
        console.error(`Failed to delete task ${taskId}:`, error);
    }
}

// --- MOBILE & IOS SPECIFIC FIXES ---

function applyMobileFixes() {
    if (state.isIOS) {
        document.body.classList.add('is-ios');
    }

    // Set custom viewport height variable for better mobile layout consistency
    const setVh = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);

    // Prevent double-tap to zoom
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime();
        if (currentTime - lastTap < 300) {
            e.preventDefault();
        }
        lastTap = currentTime;
    });
}

// --- INITIALIZATION & EVENT LISTENERS ---

/**
 * Initializes the application, sets up event listeners.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Apply mobile/responsive fixes after the DOM is fully parsed
    document.getElementById('activeProjectsCard')?.addEventListener('click', () => navigateToPage('projects'));
    document.getElementById('monthlyRevenueCard')?.addEventListener('click', () => navigateToPage('invoices'));
    document.getElementById('pendingTasksCard')?.addEventListener('click', () => navigateToPage('tasks'));
    document.getElementById('clientSatisfactionCard')?.addEventListener('click', () => navigateToPage('clients'));

    // CRITICAL FIX: Attach login/logout listeners immediately so the login button always works.
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('password')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Apply mobile/responsive fixes
    applyMobileFixes();

    try {
        // Check user session and load initial page
        const isLoggedIn = await checkSession();
        if (isLoggedIn) { // If logged in, navigate to the default page.
            setupEventListeners(); // Setup listeners for the already logged-in user.
            navigateToPage(state.currentPage);
        } else {
            showLoginScreen();
            if (state.isIOS) {
                setTimeout(() => document.getElementById('email')?.focus(), 500);
            }
        }
    } finally {
        // Ensure the main loader is always hidden after the initial check.
        document.querySelector('.loader')?.style.setProperty('opacity', '0');
    }
});

/**
 * Centralized function to set up all event listeners for the app.
 */
function setupEventListeners() {
    // --- Mobile Menu Toggle (This is the fix) ---
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
        const mobileMenu = document.getElementById('mobileNavMenu');
        const toggleBtn = document.getElementById('mobileNavToggle');
        
        if (mobileMenu && toggleBtn && 
            !mobileMenu.contains(e.target) && 
            !toggleBtn.contains(e.target) && 
            mobileMenu.classList.contains('open')) {
            mobileMenu.classList.remove('open');
        }
    });

    // Also close menu when clicking a menu item
    document.querySelectorAll('#mobileNavMenu .nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.getElementById('mobileNavMenu')?.classList.remove('open');
        });
    });

    // --- Authentication ---
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);
    
    // --- Modals ---
    setupModal('newProjectModal', 'newProjectBtn', 'cancelNewProjectBtn');
    setupModal('editClientModal', null, 'cancelEditClientBtn');
    setupModal('editProjectModal', null, 'cancelEditProjectBtn');
    setupModal('editTaskModal', null, 'cancelEditTaskBtn');
    setupModal('viewDocumentModal', null, 'closeDocumentViewerBtn');

    // --- Delegated Event Listeners for Dynamic Content ---
    document.body.addEventListener('click', (e) => {
        const target = e.target;

        // --- Centralized Navigation Handling ---
        const navLink = target.closest('.nav-item[data-page]');
        if (navLink) {
            e.preventDefault();
            navigateToPage(navLink.dataset.page);
        }

        // --- Mobile Sidebar Toggle ---
        const mobileMenuBtn = target.closest('#mobileMenuBtn');
        if (mobileMenuBtn) {
            document.getElementById('sidebar')?.classList.toggle('active');
        }

        const editClientBtn = target.closest('.edit-client-btn');
        if (editClientBtn) handleEditClient(editClientBtn.dataset.id);

        const deleteClientBtn = target.closest('.delete-client-btn');
        if (deleteClientBtn) handleDeleteClient(deleteClientBtn.dataset.id);

        const sortableHeader = target.closest('#clients-page .sortable');
        if (sortableHeader) handleClientSort(sortableHeader.dataset.sort);

        const editProjectBtn = target.closest('.edit-project-btn');
        if (editProjectBtn) handleEditProject(editProjectBtn.dataset.id);

        const deleteProjectBtn = target.closest('.delete-project-btn');
        if (deleteProjectBtn) handleDeleteProject(deleteProjectBtn.dataset.id);

        const viewQuotationBtn = target.closest('.view-quotation-btn');
        if (viewQuotationBtn) showDocumentDetail('quotation', viewQuotationBtn.dataset.id);

        const editQuotationBtn = target.closest('.edit-quotation-btn');
        if (editQuotationBtn) editQuotation(editQuotationBtn.dataset.id);

        const deleteQuotationBtn = target.closest('.delete-quotation-btn');
        if (deleteQuotationBtn) handleDeleteQuotation(deleteQuotationBtn.dataset.id);

        const viewInvoiceBtn = target.closest('.view-invoice-btn');
        if (viewInvoiceBtn) showDocumentDetail('invoice', viewInvoiceBtn.dataset.id);

        const editInvoiceBtn = target.closest('.edit-invoice-btn');
        if (editInvoiceBtn) editInvoice(editInvoiceBtn.dataset.id);

        const deleteInvoiceBtn = target.closest('.delete-invoice-btn');
        if (deleteInvoiceBtn) handleDeleteInvoice(deleteInvoiceBtn.dataset.id);

        const editTaskBtn = target.closest('.edit-task-btn');
        if (editTaskBtn) handleEditTask(editTaskBtn.dataset.id);

        const deleteTaskBtn = target.closest('.delete-task-btn');
        if (deleteTaskBtn) handleDeleteTask(deleteTaskBtn.dataset.id);

        const removeItemBtn = target.closest('.remove-item-btn');
        if (removeItemBtn) removeCalculatorItem(removeItemBtn.closest('tr').id);
    });

    // --- Form Submissions & Actions ---
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
    document.getElementById('saveClientChangesBtn')?.addEventListener('click', handleSaveClient);
    document.getElementById('saveProjectChangesBtn')?.addEventListener('click', handleSaveProject);
    document.getElementById('saveTaskChangesBtn')?.addEventListener('click', handleSaveTask);
    document.getElementById('saveEditBtn')?.addEventListener('click', saveEdits);
    document.getElementById('addNewClientBtn')?.addEventListener('click', handleAddNewClient);

    // --- Calculator Page ---
    document.getElementById('addItemBtn')?.addEventListener('click', addCalculatorItem);
    document.getElementById('generateQuoteBtn')?.addEventListener('click', generateQuotation);
    document.getElementById('clearCalculatorBtn')?.addEventListener('click', clearCalculator);
    document.getElementById('itemsTableBody')?.addEventListener('input', (e) => {
        const target = e.target;
        if (target.matches('input')) {
            updateCalculatorItem(target.closest('tr').id, target.dataset.field, target.value);
        }
    });

    // --- Filtering and Sliders ---
    document.getElementById('clientSearchInput')?.addEventListener('input', (e) => {
        state.clientFilterQuery = e.target.value;
        loadClients();
    });
    document.getElementById('editProjectProgress')?.addEventListener('input', (e) => {
        document.getElementById('editProjectProgressValue').textContent = `${e.target.value}%`;
    });
}
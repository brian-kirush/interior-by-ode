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
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        // Handle responses with no content (e.g., DELETE requests)
        if (response.status === 204) {
            return null;
        }

        return response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
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

    loginBtn.disabled = true;
    loginMessage.style.display = 'none';

    try {
        const result = await apiFetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        if (result.success) {
            state.currentUser = result.data.user;
            hideLoginScreen();
            initializeApp(); // Re-initialize app data after login
        } else {
            loginMessage.textContent = result.message || 'Login failed.';
            loginMessage.style.display = 'block';
        }
    } catch (error) {
        loginMessage.textContent = error.message;
        loginMessage.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
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
    document.getElementById('loginContainer').style.display = 'flex';
    document.querySelector('.app-container').style.opacity = '0';
}

function hideLoginScreen() {
    document.getElementById('loginContainer').style.display = 'none';
    document.querySelector('.app-container').style.opacity = '1';
}


// --- PAGE NAVIGATION ---

/**
 * Switches the visible page in the main content area.
 * @param {string} pageId - The ID of the page to show.
 */
function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
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

    // Close mobile menu if open
    document.getElementById('mobileNavMenu').classList.remove('open');

    // Load data for the new page
    loadPageData(pageId);
}

/**
 * Fetches and renders data based on the current page.
 * @param {string} pageId - The ID of the page being loaded.
 */function loadPageData(pageId) {
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
        case 'settings':
            loadSettings();
            break;
        case 'calculator':
            loadClientsForSelect('quotationClientSelect');
            break;
    }
}

// --- DATA LOADING & RENDERING ---

async function loadDashboardStats() {
    try {
        const result = await apiFetch(`${API_BASE_URL}/dashboard/stats`);
        if (result.success) {
            const { data } = result;
            document.getElementById('activeProjects').textContent = data.activeProjects;
            document.getElementById('monthlyRevenue').textContent = formatCurrency(data.monthlyRevenue);
            document.getElementById('pendingTasks').textContent = data.pendingTasks;
            document.getElementById('clientSatisfaction').textContent = `${data.clientSatisfaction}%`;
            // Trends
            document.getElementById('projectsTrend').textContent = `${data.trends.projects > 0 ? '+' : ''}${data.trends.projects}`;
            document.getElementById('revenueTrend').textContent = `${data.trends.revenue > 0 ? '+' : ''}${data.trends.revenue}%`;
            document.getElementById('tasksTrend').textContent = `${data.trends.tasks > 0 ? '+' : ''}${data.trends.tasks}`;
        }
    } catch (error) {
        console.error("Failed to load dashboard stats:", error);
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
        console.error("Failed to load clients:", error);
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
                <button class="btn btn-sm btn-secondary view-quotation-btn" data-id="${quote.id}"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-danger delete-quotation-btn" data-id="${quote.id}"><i class="fas fa-trash"></i></button>
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
                <button class="btn btn-sm btn-secondary view-invoice-btn" data-id="${invoice.id}"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-danger delete-invoice-btn" data-id="${invoice.id}"><i class="fas fa-trash"></i></button>
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

// --- INITIALIZATION & EVENT LISTENERS ---

/**
 * Initializes the application, sets up event listeners.
 */
async function initializeApp() {
    const isLoggedIn = await checkSession();
    if (isLoggedIn) {
        // Load initial page data if the user is logged in
        navigateToPage(state.currentPage);
        document.querySelector('.app-container').style.opacity = '1';
    } else {
        showLoginScreen();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // --- General Setup ---
    const loader = document.querySelector('.loader');
    if (loader) {
        // Ensure loader is hidden if something goes wrong with the animation
        setTimeout(() => {
            loader.style.display = 'none';
        }, 4500);
    }

    // --- Authentication ---
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // --- Navigation ---
    document.querySelectorAll('.nav-item[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateToPage(link.dataset.page);
        });
    });

    // --- Mobile Menu Toggle ---
    const mobileNavToggle = document.getElementById('mobileNavToggle');
    const mobileNavMenu = document.getElementById('mobileNavMenu');
    mobileNavToggle?.addEventListener('click', () => {
        mobileNavMenu.classList.toggle('open');
    });

    // --- Modals ---
    setupModal('newProjectModal', 'newProjectBtn', 'cancelNewProjectBtn');
    setupModal('editClientModal', null, 'cancelEditClientBtn'); // Opened programmatically
    setupModal('editProjectModal', null, 'cancelEditProjectBtn'); // Opened programmatically

    // --- Page-specific Event Listeners ---
    document.body.addEventListener('click', (e) => {
        // Client actions
        if (e.target.closest('.edit-client-btn')) {
            handleEditClient(e.target.closest('.edit-client-btn').dataset.id);
        }
        if (e.target.closest('.delete-client-btn')) {
            handleDeleteClient(e-target.closest('.delete-client-btn').dataset.id);
        }

        // Project actions
        if (e.target.closest('.edit-project-btn')) {
            // handleEditProject(e.target.closest('.edit-project-btn').dataset.id);
            showNotification('Edit project functionality is not yet implemented.', 'error');
        }
        if (e-target.closest('.delete-project-btn')) {
            // handleDeleteProject(e.target.closest('.delete-project-btn').dataset.id);
            showNotification('Delete project functionality is not yet implemented.', 'error');
        }

        // Quotation actions
        if (e.target.closest('.view-quotation-btn')) {
            showNotification('View quotation functionality is not yet implemented.', 'error');
        }
        if (e.target.closest('.delete-quotation-btn')) {
            showNotification('Delete quotation functionality is not yet implemented.', 'error');
        }

        // Invoice actions
        if (e.target.closest('.view-invoice-btn')) {
            showNotification('View invoice functionality is not yet implemented.', 'error');
        }
        if (e.target.closest('.delete-invoice-btn')) {
            showNotification('Delete invoice functionality is not yet implemented.', 'error');
        }
    });

    // --- Form Submissions ---
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);
    document.getElementById('saveClientChangesBtn')?.addEventListener('click', handleSaveClient);
    document.getElementById('addNewClientBtn')?.addEventListener('click', handleAddNewClient);
    
    // --- Calculator Page ---
    document.getElementById('addItemBtn')?.addEventListener('click', () => {
        showNotification('Add item functionality is not yet implemented.', 'error');
    });
    document.getElementById('clearAllBtn')?.addEventListener('click', () => {
        showNotification('Clear all functionality is not yet implemented.', 'error');
    });
    document.getElementById('generateQuoteBtn')?.addEventListener('click', () => {
        showNotification('Generate quote functionality is not yet implemented.', 'error');
    });

    // --- Start the App ---
    initializeApp();
});

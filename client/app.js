// Application State - UPDATED FOR RENDER
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api'
    : '/api';  // Will use relative path on Render

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
// ... rest of your existing app.js code ..
// DOM Elements
const loader = document.querySelector('.loader');
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');
const notification = document.getElementById('notification');
const clientModal = document.getElementById('clientModal');
const mobileNavToggle = document.getElementById('mobileNavToggle');
const mobileNavMenu = document.getElementById('mobileNavMenu');
const toolbarScrollButtons = document.querySelectorAll('.toolbar-scroll-btn');
let appSettings = {};

// API Helper
async function apiCall(endpoint, options = {}) {
    const method = options.method || 'GET';
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };

    // Add CSRF token to headers for state-changing requests
    if (state.csrfToken && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
        defaultOptions.headers['csrf-token'] = state.csrfToken;
    }
    
    if (options.body && typeof options.body !== 'string') {
        options.body = JSON.stringify(options.body);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            ...defaultOptions,
            ...options
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message || 'Server error occurred', 'error');
        throw error;
    }
}

// Initialize application
async function initializeApp() {
    try {
        await checkSession();
    } catch (error) {
        showLoginScreen();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Mobile menu
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Mobile dropdown nav
    if (mobileNavToggle && mobileNavMenu) {
        mobileNavToggle.addEventListener('click', () => {
            mobileNavMenu.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!mobileNavMenu.contains(e.target) && !mobileNavToggle.contains(e.target)) {
                mobileNavMenu.classList.remove('open');
            }
        });
    }

    // Navigation
    navItems.forEach((item) => {
        const page = item.getAttribute('data-page');
        if (page) {
            item.setAttribute('href', `#${page}`);
        }

        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = item.getAttribute('data-page');
            if (!targetPage) return;
            window.location.hash = `#${targetPage}`;
            navigateTo(targetPage);
        });
        
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const targetPage = item.getAttribute('data-page');
                if (!targetPage) return;
                window.location.hash = `#${targetPage}`;
                navigateTo(targetPage);
            }
        });
    });

    // Logout buttons
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

    // Hash-based navigation
    window.addEventListener('hashchange', handleHashNavigation);

    // Calculator event listeners
    document.addEventListener('click', function(e) {
        if (e.target.closest('#addItemBtn')) {
            addNewItem();
        } else if (e.target.closest('#clearAllBtn')) {
            clearAllItems();
        } else if (e.target.closest('.remove-item')) {
            removeItem(e.target.closest('.remove-item'));
        }
    });

    // Projects table
    document.getElementById('projectsTableBody')?.addEventListener('click', function(e) {
        const target = e.target;
        if (target.closest('.delete-project-btn')) handleDeleteProject(target);
        if (target.closest('.edit-project-btn')) handleEditProject(target);
    });
    
    document.getElementById('projectsTableHeader')?.addEventListener('click', function(e) {
        if (e.target.closest('.sortable')) handleProjectSort(e.target.closest('.sortable'));
    });

    // Milestones
    document.getElementById('milestoneProjectSelect')?.addEventListener('change', handleMilestoneProjectSelect);
    document.getElementById('milestonesDisplay')?.addEventListener('change', handleMilestoneStatusChange);

    // Site visit photos
    document.getElementById('siteVisitPhotosGrid')?.addEventListener('click', function(e) {
        if (e.target.closest('.delete-photo-btn')) handleDeletePhoto(e.target);
    });

    // Clients table
    document.getElementById('clientsTableBody')?.addEventListener('click', function(e) {
        const target = e.target;
        if (target.closest('.edit-client-btn')) handleEditClientClick(target);
        if (target.closest('.delete-client-btn')) handleDeleteClient(target);
    });

    // Search inputs
    document.getElementById('clientSearchInput')?.addEventListener('input', (e) => {
        handleClientSearch(e.target.value);
    });
    
    document.getElementById('quotationSearchInput')?.addEventListener('input', (e) => {
        handleQuotationSearch(e.target.value);
    });
    
    document.getElementById('invoiceSearchInput')?.addEventListener('input', (e) => {
        handleInvoiceSearch(e.target.value);
    });

    // Calculator input listeners
    document.addEventListener('input', function(e) {
        if (e.target.closest('.item-qty') || e.target.closest('.item-price')) {
            updateItemTotal(e.target);
        } else if (e.target.id === 'projectSearchInput') {
            handleProjectSearch(e.target.value);
        } else if (e.target.id === 'taxRate' || e.target.id === 'discount') {
            updateCalculatorSummary();
        }
    });

    // Modal buttons
    document.getElementById('generateQuoteBtn')?.addEventListener('click', showClientModal);
    document.getElementById('saveClientBtn')?.addEventListener('click', saveClientAndGenerate);
    document.getElementById('cancelModalBtn')?.addEventListener('click', () => {
        clientModal.style.display = 'none';
    });
    
    document.getElementById('saveProjectChangesBtn')?.addEventListener('click', saveProjectChanges);
    document.getElementById('cancelEditProjectBtn')?.addEventListener('click', () => {
        document.getElementById('editProjectModal').style.display = 'none';
    });
    
    document.getElementById('newProjectBtn')?.addEventListener('click', handleNewProjectClick);
    document.getElementById('saveNewProjectBtn')?.addEventListener('click', saveNewProject);
    document.getElementById('cancelNewProjectBtn')?.addEventListener('click', () => {
        document.getElementById('newProjectModal').style.display = 'none';
    });
    
    document.getElementById('addNewClientBtn')?.addEventListener('click', () => {
        showClientModal(true);
    });
    
    document.getElementById('saveClientChangesBtn')?.addEventListener('click', saveClientChanges);
    document.getElementById('cancelEditClientBtn')?.addEventListener('click', () => {
        document.getElementById('editClientModal').style.display = 'none';
    });

    // Settings
    document.getElementById('saveSettingsBtn')?.addEventListener('click', saveSettings);

    // Team notes
    document.getElementById('addTeamNoteBtn')?.addEventListener('click', addTeamNote);

    // PDF buttons
    document.getElementById('editQuotationBtn')?.addEventListener('click', showClientModal);
    document.getElementById('editInvoiceBtn')?.addEventListener('click', () => {
        state.currentPage = 'invoices';
        showClientModal();
    });

    // Quotations list
    document.getElementById('quotationsTableBody')?.addEventListener('click', function(e) {
        if (e.target.closest('.view-quotation-btn')) {
            const quoteId = e.target.closest('.view-quotation-btn').dataset.quoteId;
            showQuotationDetail(quoteId);
        }
    });

    // Invoices list
    document.getElementById('invoicesTableBody')?.addEventListener('click', function(e) {
        if (e.target.closest('.view-invoice-btn')) {
            const invoiceId = e.target.closest('.view-invoice-btn').dataset.invoiceId;
            showInvoiceDetail(invoiceId);
        }
    });

    // Back to list buttons
    document.getElementById('backToQuotesListBtn')?.addEventListener('click', () => {
        document.getElementById('quotationDetailContainer').style.display = 'none';
        document.getElementById('quotationsListContainer').style.display = 'block';
    });
    
    document.getElementById('backToInvoicesListBtn')?.addEventListener('click', () => {
        document.getElementById('invoiceDetailContainer').style.display = 'none';
        document.getElementById('invoicesListContainer').style.display = 'block';
    });

    // PDF download buttons
    document.getElementById('downloadQuotationBtn')?.addEventListener('click', downloadQuotationPDF);
    document.getElementById('downloadInvoiceBtn')?.addEventListener('click', downloadInvoicePDF);
    
    // Print buttons
    document.getElementById('printQuotationBtn')?.addEventListener('click', () => window.print());
    document.getElementById('printInvoiceBtn')?.addEventListener('click', () => window.print());

    // Invoice status buttons
    document.getElementById('markAsPaidBtn')?.addEventListener('click', () => updateInvoiceStatus('paid'));
    document.getElementById('markAsOverdueBtn')?.addEventListener('click', () => updateInvoiceStatus('overdue'));

    // Task management
    document.getElementById('projectSelect')?.addEventListener('change', handleProjectSelection);
    document.getElementById('scheduleVisitBtn')?.addEventListener('click', scheduleSiteVisit);
    document.getElementById('completeSiteVisitBtn')?.addEventListener('click', completeSiteVisit);
    document.getElementById('recordApprovalBtn')?.addEventListener('click', recordClientApproval);
    document.getElementById('startWorkBtn')?.addEventListener('click', startWork);
    document.getElementById('updateProgressBtn')?.addEventListener('click', updateWorkProgress);
    document.getElementById('completeWorkBtn')?.addEventListener('click', completeWork);
    document.getElementById('submitProjectBtn')?.addEventListener('click', submitProject);
    
    document.getElementById('progressSlider')?.addEventListener('input', (e) => {
        document.getElementById('progressValue').textContent = `${e.target.value}%`;
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === clientModal) {
            clientModal.style.display = 'none';
        }
        if (e.target.id === 'editProjectModal') {
            document.getElementById('editProjectModal').style.display = 'none';
        }
        if (e.target.id === 'editClientModal') {
            document.getElementById('editClientModal').style.display = 'none';
        }
        if (e.target.id === 'newProjectModal') {
            document.getElementById('newProjectModal').style.display = 'none';
        }
    });

    // Login
    document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
    
    // Enter key in login form
    document.getElementById('password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
}

// Navigation function
function navigateTo(page) {
    console.log('Navigating to page:', page);

    // Close mobile dropdown menu
    if (mobileNavMenu) {
        mobileNavMenu.classList.remove('open');
    }

    // Update navigation active state
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) {
            item.classList.add('active');
        }
    });

    // Hide all pages
    pages.forEach(p => {
        p.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
        state.currentPage = page;

        // Initialize page-specific content
        switch (page) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'calculator':
                initializeCalculator();
                break;
            case 'quotations':
                initializeQuotationsPage();
                break;
            case 'invoices':
                initializeInvoicesPage();
                break;
            case 'tasks':
                initializeTasksPage();
                break;
            case 'team':
                initializeTeamPage();
                break;
            case 'projects':
                initializeProjectsPage();
                break;
            case 'milestones':
                initializeMilestonesPage();
                break;
            case 'clients':
                initializeClientsPage();
                break;
            case 'settings':
                initializeSettingsPage();
                break;
        }
    }

    // Close mobile sidebar
    if (window.innerWidth <= 992) {
        sidebar.classList.remove('active');
    }
}

// Initialize calculator
function initializeCalculator() {
    // Add initial item
    addNewItem();
    
    // Load clients for dropdown
    loadClientsForSelect('quotationClientSelect');
}

// Calculator functions
function addNewItem() {
    const tableBody = document.getElementById('itemsTableBody');
    if (!tableBody) return;

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="text" placeholder="Item description" class="item-desc"></td>
        <td><input type="text" placeholder="e.g., pcs, sqm" class="item-unit"></td>
        <td><input type="number" value="1" min="0" step="0.5" class="item-qty"></td>
        <td><input type="number" value="0" min="0" step="100" class="item-price"></td>
        <td class="item-total">0</td>
        <td><button class="btn btn-danger remove-item"><i class="fas fa-times"></i></button></td>
    `;
    tableBody.appendChild(newRow);

    updateCalculatorSummary();
    showNotification('New item added to quotation');
}

function updateItemTotal(input) {
    const row = input.closest('tr');
    if (!row) return;

    const qtyInput = row.querySelector('.item-qty');
    const priceInput = row.querySelector('.item-price');
    const totalCell = row.querySelector('.item-total');

    if (!qtyInput || !priceInput || !totalCell) return;

    const qty = parseFloat(qtyInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const total = qty * price;
    totalCell.textContent = formatCurrency(total);
    updateCalculatorSummary();
}

function removeItem(button) {
    const row = button.closest('tr');
    if (row) {
        row.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            row.remove();
            updateCalculatorSummary();
            showNotification('Item removed from quotation');
        }, 300);
    }
}

function clearAllItems() {
    if (confirm('Are you sure you want to clear all items?')) {
        const tableBody = document.getElementById('itemsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
            addNewItem(); // Add one empty item
            updateCalculatorSummary();
            showNotification('All items cleared');
        }
    }
}

function updateCalculatorSummary() {
    // Get all items
    const items = Array.from(document.querySelectorAll('#itemsTableBody tr')).map(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const desc = row.querySelector('.item-desc').value || '';
        const unit = row.querySelector('.item-unit').value || '';
        return { 
            description: desc,
            unit: unit,
            quantity: qty, 
            unit_price: price,
            total: qty * price 
        };
    });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxRateInput = document.getElementById('taxRate');
    const discountInput = document.getElementById('discount');

    const taxRate = taxRateInput ? parseFloat(taxRateInput.value) || 0 : 0;
    const discount = discountInput ? parseFloat(discountInput.value) || 0 : 0;

    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal + taxAmount - discountAmount;

    // Update display
    const subtotalEl = document.getElementById('subtotal');
    const taxRateDisplayEl = document.getElementById('taxRateDisplay');
    const taxAmountEl = document.getElementById('taxAmount');
    const discountDisplayEl = document.getElementById('discountDisplay');
    const discountAmountEl = document.getElementById('discountAmount');
    const totalAmountEl = document.getElementById('totalAmount');

    if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
    if (taxRateDisplayEl) taxRateDisplayEl.textContent = taxRate;
    if (taxAmountEl) taxAmountEl.textContent = formatCurrency(taxAmount);
    if (discountDisplayEl) discountDisplayEl.textContent = discount;
    if (discountAmountEl) discountAmountEl.textContent = formatCurrency(discountAmount);
    if (totalAmountEl) totalAmountEl.textContent = formatCurrency(total);

    // Update state
    state.subtotal = subtotal;
    state.taxAmount = taxAmount;
    state.discountAmount = discountAmount;
    state.total = total;
    state.taxRate = taxRate;
    state.discount = discount;
    state.items = items;
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const result = await apiCall('dashboard');
        
        if (result.success && result.data) {
            const { activeProjects, monthlyRevenue, pendingTasks, clientSatisfaction, trends } = result.data;

            document.getElementById('activeProjects').textContent = activeProjects;
            document.getElementById('monthlyRevenue').textContent = formatCurrency(monthlyRevenue);
            document.getElementById('pendingTasks').textContent = pendingTasks;
            document.getElementById('clientSatisfaction').textContent = `${clientSatisfaction}%`;

            // Update trends
            document.getElementById('projectsTrend').textContent = trends.projects > 0 ? 
                `+${trends.projects}%` : `${trends.projects}%`;
            document.getElementById('revenueTrend').textContent = `${trends.revenue}%`;
            document.getElementById('tasksTrend').textContent = `${trends.tasks}%`;
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Client modal functions
function showClientModal(isNewClientOnly = false) {
    if (clientModal) {
        clientModal.style.display = 'block';

        // Adjust for new client vs. generate quote
        const saveBtn = document.getElementById('saveClientBtn');
        saveBtn.textContent = isNewClientOnly ? 'Save Client' : 'Save & Generate';
        saveBtn.onclick = isNewClientOnly ? saveNewClient : saveClientAndGenerate;

        // Clear or populate fields
        document.getElementById('clientName').value = state.client.name || '';
        document.getElementById('companyName').value = state.client.company || '';
        document.getElementById('clientEmail').value = state.client.email || '';
        document.getElementById('clientPhone').value = state.client.phone || '';
        document.getElementById('clientAddress').value = state.client.address || '';
        document.getElementById('projectDescription').value = state.client.project || '';
        document.getElementById('bankName').value = appSettings.bank_name || '';
        document.getElementById('accountName').value = appSettings.account_name || '';
        document.getElementById('accountNumber').value = appSettings.account_number || '';
        document.getElementById('paybill').value = appSettings.mpesa_paybill || '';
        document.getElementById('paybillAccount').value = appSettings.mpesa_account_ref || '';
    }
}

async function saveNewClient() {
    const clientData = {
        name: document.getElementById('clientName').value.trim(),
        company: document.getElementById('companyName').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        address: document.getElementById('clientAddress').value.trim(),
    };

    if (!clientData.name || !clientData.email) {
        showNotification('Client Name and Email are required.', 'error');
        return;
    }

    try {
        const result = await apiCall('clients', {
            method: 'POST',
            body: clientData
        });
        
        showNotification('New client added successfully.', 'success');
        clientModal.style.display = 'none';
        initializeClientsPage();
    } catch (error) {
        console.error('Error saving client:', error);
    }
}

async function saveClientAndGenerate() {
    // 1. Gather data from form
    const clientData = {
        name: document.getElementById('clientName').value.trim(),
        company: document.getElementById('companyName').value.trim(),
        email: document.getElementById('clientEmail').value.trim(),
        phone: document.getElementById('clientPhone').value.trim(),
        address: document.getElementById('clientAddress').value.trim(),
    };

    const projectDescription = document.getElementById('projectDescription').value.trim();
    const projectName = projectDescription || `${clientData.name}'s Project`;

    // 2. Validate required fields
    if (!clientData.name || !clientData.email || !clientData.phone || !clientData.address) {
        showNotification('Please fill in all required client fields (*)', 'error');
        return;
    }

    try {
        // 3. Create the client first
        const clientResult = await apiCall('clients', {
            method: 'POST',
            body: clientData
        });
        
        if (!clientResult.success) {
            throw new Error(clientResult.message || 'Failed to create client.');
        }
        
        const newClientId = clientResult.data.id;

        // 4. Now create the project linked to the new client
        const projectData = {
            client_id: newClientId,
            name: projectName,
            description: projectDescription,
            budget: state.total || 0,
            status: 'planning'
        };
        
        const projectResult = await apiCall('projects', {
            method: 'POST',
            body: projectData
        });
        
        if (!projectResult.success) {
            throw new Error(projectResult.message || 'Failed to create project.');
        }

        // 5. Update local state and UI
        state.client = { ...clientData, project: projectDescription };
        updatePaymentInfoFromModal();
        
        if (clientModal) clientModal.style.display = 'none';

        // 6. Navigate to the correct page
        const targetPage = (state.currentPage === 'invoices') ? 'invoices' : 'quotations';
        await generatePreviewAndNavigate(targetPage, newClientId, projectResult.data.id);
        
        showNotification(`Client and project created. ${targetPage === 'invoices' ? 'Invoice' : 'Quotation'} ready.`, 'success');

    } catch (error) {
        console.error('Error creating client/project:', error);
        showNotification(error.message || 'An error occurred', 'error');
    }
}

async function generatePreviewAndNavigate(targetPage, clientId, projectId) {
    // Generate quotation or invoice
    if (targetPage === 'quotations') {
        await generateQuotationPreview(clientId, projectId);
        navigateTo('quotations');
    } else if (targetPage === 'invoices') {
        await generateInvoicePreview(clientId, projectId);
        navigateTo('invoices');
    }
}

async function generateQuotationPreview(clientId, projectId) {
    if (!state.items || state.items.length === 0) {
        showNotification('Please add items to the quotation first', 'error');
        return;
    }

    try {
        const quotationData = {
            client_id: clientId,
            project_id: projectId,
            quotation_number: `QB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
            subtotal: state.subtotal,
            tax_rate: state.taxRate,
            tax_amount: state.taxAmount,
            discount_amount: state.discountAmount,
            total: state.total,
            items: state.items
        };

        const result = await apiCall('quotations', {
            method: 'POST',
            body: quotationData
        });

        if (result.success) {
            // Show the quotation
            await showQuotationDetail(result.data.id);
        }
    } catch (error) {
        console.error('Error generating quotation:', error);
    }
}

async function generateInvoicePreview(clientId, projectId) {
    if (!state.items || state.items.length === 0) {
        showNotification('Please add items to the invoice first', 'error');
        return;
    }

    try {
        const invoiceData = {
            client_id: clientId,
            project_id: projectId,
            invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`,
            subtotal: state.subtotal,
            tax_rate: state.taxRate,
            tax_amount: state.taxAmount,
            discount_amount: state.discountAmount,
            total: state.total,
            items: state.items
        };

        const result = await apiCall('invoices', {
            method: 'POST',
            body: invoiceData
        });

        if (result.success) {
            // Show the invoice
            await showInvoiceDetail(result.data.id);
        }
    } catch (error) {
        console.error('Error generating invoice:', error);
    }
}

function updatePaymentInfoFromModal() {
    state.payment = {
        bankName: appSettings.bank_name || 'Bank Name',
        accountName: appSettings.account_name || 'Account Name',
        accountNumber: appSettings.account_number || 'Account Number',
        paybill: appSettings.mpesa_paybill || 'Paybill',
        paybillAccount: appSettings.mpesa_account_ref || 'Account Reference'
    };
}

// Initialize quotations page
async function initializeQuotationsPage() {
    try {
        const result = await apiCall('quotations');
        
        if (result.success) {
            state.allQuotations = result.data;
            renderQuotationsTable(state.allQuotations);
        }
    } catch (error) {
        console.error('Error loading quotations:', error);
        document.getElementById('quotationsTableBody').innerHTML = `
            <tr><td colspan="6" style="text-align: center; color: var(--accent-coral);">Could not load quotations.</td></tr>
        `;
    }
}

function renderQuotationsTable(quotations) {
    const tableBody = document.getElementById('quotationsTableBody');
    if (!tableBody) return;

    if (!quotations || quotations.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">No quotations found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = quotations.map(quote => `
        <tr>
            <td><strong>${quote.quotation_number}</strong></td>
            <td>${quote.client_name || 'N/A'}</td>
            <td>${new Date(quote.created_at).toLocaleDateString()}</td>
            <td>${formatCurrency(quote.total)}</td>
            <td><span class="status-badge ${quote.status}">${quote.status}</span></td>
            <td>
                <button class="btn btn-primary btn-sm view-quotation-btn" data-quote-id="${quote.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

async function showQuotationDetail(quotationId) {
    try {
        const result = await apiCall(`quotations/${quotationId}`);
        
        if (result.success) {
            // Hide list, show detail
            document.getElementById('quotationsListContainer').style.display = 'none';
            document.getElementById('quotationDetailContainer').style.display = 'block';
            
            // Render quotation content
            renderQuotationContent(result.data);
        }
    } catch (error) {
        console.error('Error loading quotation detail:', error);
    }
}

function renderQuotationContent(quotation) {
    const container = document.getElementById('quotationContent');
    if (!container) return;
    
    const itemsHtml = quotation.items.map(item => `
        <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 14px; font-size: 0.9rem;">${item.description}</td>
            <td style="padding: 14px; text-align: center; font-size: 0.9rem;">${item.unit || '-'}</td>
            <td style="padding: 14px; text-align: center; font-size: 0.9rem;">${item.quantity}</td>
            <td style="padding: 14px; text-align: right; font-size: 0.9rem;">${formatCurrency(item.unit_price)}</td>
            <td style="padding: 14px; text-align: right; font-size: 0.9rem; font-weight: bold;">${formatCurrency(item.total)}</td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <div class="pdf-header">
            <h1>QUOTATION</h1>
            <p class="subtitle">Interiors by Ode - Premium Design Solutions</p>
            <div style="margin-top: 10px;">
                <strong>Quotation #:</strong> ${quotation.quotation_number} | 
                <strong>Date:</strong> ${new Date(quotation.created_at).toLocaleDateString()} |
                <strong>Valid Until:</strong> ${quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : 'N/A'}
            </div>
        </div>
        
        <div class="client-info">
            <div class="info-box">
                <h3>Bill To:</h3>
                <p><strong>${quotation.client_name}</strong><br>
                ${quotation.client_company ? quotation.client_company + '<br>' : ''}
                ${quotation.client_email}<br>
                ${quotation.client_phone}<br>
                ${quotation.client_address}</p>
            </div>
            <div class="info-box">
                <h3>From:</h3>
                <p><strong>${appSettings.company_name || 'Interiors by Ode'}</strong><br>
                ${appSettings.company_address || 'Nairobi, Kenya'}<br>
                ${appSettings.company_phone || '+254 700 000 000'}<br>
                ${appSettings.company_email || 'info@interiorsbyode.com'}</p>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0; border: 2px solid var(--jungle-green);">
            <thead>
                <tr style="background: var(--jungle-green); color: white;">
                    <th style="padding: 12px; text-align: left;">Description</th>
                    <th style="padding: 12px; text-align: center;">Unit</th>
                    <th style="padding: 12px; text-align: center;">Quantity</th>
                    <th style="padding: 12px; text-align: right;">Unit Price</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        ${generateSummaryHTML(quotation)}
        
        <div style="margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid var(--jungle-green);">
            <h3 style="color: var(--jungle-green); margin-bottom: 10px;">Payment Information</h3>
            <p><strong>Bank Transfer:</strong> ${appSettings.bank_name || 'Bank Name'} - 
            ${appSettings.account_name || 'Account Name'} - 
            A/C: ${appSettings.account_number || 'Account Number'}</p>
            <p><strong>M-Pesa:</strong> Paybill: ${appSettings.mpesa_paybill || 'Paybill'} | 
            Account: ${appSettings.mpesa_account_ref || 'Account Reference'}</p>
        </div>
        
        <div style="margin-top: 40px; padding: 20px; border-top: 2px solid #eee;">
            <p><strong>Notes:</strong> ${quotation.notes || 'Thank you for your business!'}</p>
        </div>
    `;
}

// Initialize invoices page
async function initializeInvoicesPage() {
    try {
        const result = await apiCall('invoices');
        
        if (result.success) {
            state.allInvoices = result.data;
            renderInvoicesTable(state.allInvoices);
        }
    } catch (error) {
        console.error('Error loading invoices:', error);
        document.getElementById('invoicesTableBody').innerHTML = `
            <tr><td colspan="7" style="text-align: center; color: var(--accent-coral);">Could not load invoices.</td></tr>
        `;
    }
}

function renderInvoicesTable(invoices) {
    const tableBody = document.getElementById('invoicesTableBody');
    if (!tableBody) return;

    if (!invoices || invoices.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">No invoices found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = invoices.map(invoice => `
        <tr>
            <td><strong>${invoice.invoice_number}</strong></td>
            <td>${invoice.client_name || 'N/A'}</td>
            <td>${new Date(invoice.issue_date).toLocaleDateString()}</td>
            <td>${new Date(invoice.due_date).toLocaleDateString()}</td>
            <td>${formatCurrency(invoice.total)}</td>
            <td><span class="status-badge ${invoice.status}">${invoice.status}</span></td>
            <td>
                <button class="btn btn-primary btn-sm view-invoice-btn" data-invoice-id="${invoice.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

async function showInvoiceDetail(invoiceId) {
    try {
        const result = await apiCall(`invoices/${invoiceId}`);
        
        if (result.success) {
            // Hide list, show detail
            document.getElementById('invoicesListContainer').style.display = 'none';
            document.getElementById('invoiceDetailContainer').style.display = 'block';
            
            // Render invoice content
            renderInvoiceContent(result.data);
        }
    } catch (error) {
        console.error('Error loading invoice detail:', error);
    }
}

function renderInvoiceContent(invoice) {
    const container = document.getElementById('invoiceContent');
    if (!container) return;
    
    const itemsHtml = invoice.items.map(item => `
        <tr style="border-bottom: 1px solid #e5e5e5;">
            <td style="padding: 14px; font-size: 0.9rem;">${item.description}</td>
            <td style="padding: 14px; text-align: center; font-size: 0.9rem;">${item.unit || '-'}</td>
            <td style="padding: 14px; text-align: center; font-size: 0.9rem;">${item.quantity}</td>
            <td style="padding: 14px; text-align: right; font-size: 0.9rem;">${formatCurrency(item.unit_price)}</td>
            <td style="padding: 14px; text-align: right; font-size: 0.9rem; font-weight: bold;">${formatCurrency(item.total)}</td>
        </tr>
    `).join('');
    
    const statusColor = {
        'draft': '#6c757d',
        'sent': '#17a2b8',
        'paid': '#28a745',
        'overdue': '#dc3545',
        'cancelled': '#6c757d'
    }[invoice.status] || '#6c757d';
    
    container.innerHTML = `
        <div class="pdf-header">
            <h1>INVOICE</h1>
            <p class="subtitle">Interiors by Ode - Premium Design Solutions</p>
            <div style="margin-top: 10px;">
                <strong>Invoice #:</strong> ${invoice.invoice_number} | 
                <strong>Issue Date:</strong> ${new Date(invoice.issue_date).toLocaleDateString()} |
                <strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()} |
                <strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${invoice.status.toUpperCase()}</span>
            </div>
        </div>
        
        <div class="client-info">
            <div class="info-box">
                <h3>Bill To:</h3>
                <p><strong>${invoice.client_name}</strong><br>
                ${invoice.client_company ? invoice.client_company + '<br>' : ''}
                ${invoice.client_email}<br>
                ${invoice.client_phone}<br>
                ${invoice.client_address}</p>
            </div>
            <div class="info-box">
                <h3>From:</h3>
                <p><strong>${appSettings.company_name || 'Interiors by Ode'}</strong><br>
                ${appSettings.company_address || 'Nairobi, Kenya'}<br>
                ${appSettings.company_phone || '+254 700 000 000'}<br>
                ${appSettings.company_email || 'info@interiorsbyode.com'}</p>
            </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0; border: 2px solid var(--jungle-green);">
            <thead>
                <tr style="background: var(--jungle-green); color: white;">
                    <th style="padding: 12px; text-align: left;">Description</th>
                    <th style="padding: 12px; text-align: center;">Unit</th>
                    <th style="padding: 12px; text-align: center;">Quantity</th>
                    <th style="padding: 12px; text-align: right;">Unit Price</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        ${generateSummaryHTML(invoice)}
        
        <div style="margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px; border-left: 4px solid var(--jungle-green);">
            <h3 style="color: var(--jungle-green); margin-bottom: 10px;">Payment Information</h3>
            <p><strong>Bank Transfer:</strong> ${appSettings.bank_name || 'Bank Name'} - 
            ${appSettings.account_name || 'Account Name'} - 
            A/C: ${appSettings.account_number || 'Account Number'}</p>
            <p><strong>M-Pesa:</strong> Paybill: ${appSettings.mpesa_paybill || 'Paybill'} | 
            Account: ${appSettings.mpesa_account_ref || 'Account Reference'}</p>
            ${invoice.status === 'paid' && invoice.paid_date ? 
                `<p style="color: #28a745;"><strong>Paid on:</strong> ${new Date(invoice.paid_date).toLocaleDateString()}</p>` : ''}
        </div>
        
        <div style="margin-top: 40px; padding: 20px; border-top: 2px solid #eee;">
            <p><strong>Notes:</strong> ${invoice.notes || 'Thank you for your business!'}</p>
        </div>
    `;
}

function generateSummaryHTML(data) {
    return `
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
                <span style="font-size: 0.95rem;">Subtotal:</span>
                <span style="font-size: 0.95rem; font-weight: 600;">${formatCurrency(data.subtotal || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
                <span style="font-size: 0.95rem;">Tax (${data.tax_rate || 0}%):</span>
                <span style="font-size: 0.95rem; font-weight: 600;">${formatCurrency(data.tax_amount || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e5e5;">
                <span style="font-size: 0.95rem;">Discount (${data.discount_amount ? 'custom' : '0'}):</span>
                <span style="font-size: 0.95rem; font-weight: 600; color: #ff4757;">-${formatCurrency(data.discount_amount || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 3px solid #2E8B57; margin-top: 8px;">
                <span style="font-size: 1.1rem; font-weight: 800; color: #2E8B57;">TOTAL:</span>
                <span style="font-size: 1.1rem; font-weight: 800; color: #2E8B57;">${formatCurrency(data.total || 0)}</span>
            </div>
        </div>
    `;
}

function downloadQuotationPDF() {
    const element = document.getElementById('quotationContent');
    if (element) {
        generatePDF(element, `Interiors-by-Ode-Quotation-${new Date().getTime()}.pdf`);
        showNotification('Quotation PDF downloaded successfully!');
    }
}

function downloadInvoicePDF() {
    const element = document.getElementById('invoiceContent');
    if (element) {
        generatePDF(element, `Interiors-by-Ode-Invoice-${new Date().getTime()}.pdf`);
        showNotification('Invoice PDF downloaded successfully!');
    }
}

function generatePDF(element, filename) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${filename}</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 30px; color: #1a1a1a; font-size: 12px; }
                @media print {
                    body { padding: 0; }
                }
                .pdf-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2E8B57; padding-bottom: 20px; }
                h1 { color: #2E8B57; font-size: 24px; margin: 0; font-weight: 800; }
                .subtitle { color: #666; font-size: 14px; font-style: italic; margin-top: 8px; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 2px solid #2E8B57; font-size: 11px; }
                th { background: #2E8B57; color: white; padding: 10px; text-align: left; }
                td { padding: 10px; border-bottom: 1px solid #ddd; }
                .total-row { font-size: 14px; font-weight: bold; color: #2E8B57; }
                .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #2E8B57; text-align: center; color: #666; font-size: 11px; }
                .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                .status-badge.draft { background: #6c757d; color: white; }
                .status-badge.sent { background: #17a2b8; color: white; }
                .status-badge.paid { background: #28a745; color: white; }
                .status-badge.overdue { background: #dc3545; color: white; }
            </style>
        </head>
        <body>
            ${element.innerHTML}
            <div class="footer">
                <p>Interiors by Ode | Premium Design Solutions</p>
                <p>${appSettings.company_address || 'Nairobi, Kenya'} | ${appSettings.company_phone || '+254 700 000 000'} | ${appSettings.company_email || 'info@interiorsbyode.com'}</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Uncomment to auto-close after printing
    }, 500);
}

// Utility functions
function formatCurrency(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
    return 'KSh ' + amount.toLocaleString('en-KE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showNotification(message, type = 'success') {
    if (!notification) return;

    const messageEl = notification.querySelector('#notificationMessage');
    if (messageEl) {
        messageEl.textContent = message;
    }
    notification.style.background = type === 'error' ? '#ff4757' : type === 'warning' ? '#ffa502' : '#2E8B57';
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Handle navigation when arriving with a hash or on back/forward
function handleHashNavigation() {
    const pageFromHash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(pageFromHash);
}

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('active');
    }
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 992 && sidebar.classList.contains('active')) {
        if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    }
});

// --- AUTHENTICATION FUNCTIONS ---
async function checkSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/session`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Session check failed');
        }
        
        const result = await response.json();
        
        if (result.success) {
            state.currentUser = result.data;
            initializeAppUI();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Session check error:', error);
        showLoginScreen();
    }
}

function initializeAppUI() {
    document.getElementById('loginContainer').style.display = 'none';
    document.querySelector('.app-container').style.display = 'flex';
    
    setupEventListeners();
    loadSettings();
    handleHashNavigation();

    setTimeout(() => {
        if (loader) loader.style.display = 'none';
    }, 500);
}

function showLoginScreen() {
    if (loader) loader.style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
    document.querySelector('.app-container').style.display = 'none';
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginMessage = document.getElementById('loginMessage');
    const loginBtn = document.getElementById('loginBtn');
    
    if (!email || !password) {
        loginMessage.textContent = 'Please enter both email and password';
        loginMessage.style.display = 'block';
        return;
    }

    try {
        loginBtn.querySelector('.login-btn-text').style.display = 'none';
        loginBtn.querySelector('.loader-spinner').style.display = 'inline-block';

        const result = await apiCall('auth/login', {
            method: 'POST',
            body: { email, password }
        });
        
        if (result.success) {
            state.currentUser = result.data.user;
            state.csrfToken = result.data.csrfToken; // Store the CSRF token from the login response
            initializeAppUI();
        } else {
            loginMessage.textContent = result.message || 'Invalid credentials';
            loginMessage.style.display = 'block';
        }
    } catch (error) {
        loginMessage.textContent = 'Login failed. Please try again.';
        loginMessage.style.display = 'block';
        console.error('Login error:', error);
    } finally {
        loginBtn.querySelector('.login-btn-text').style.display = 'inline-flex';
        loginBtn.querySelector('.loader-spinner').style.display = 'none';
    }
}

async function handleLogout() {
    try {
        await apiCall('auth/logout', {
            method: 'POST'
        });
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        window.location.reload();
    }
}

// --- CLIENT MANAGEMENT FUNCTIONS ---
async function initializeClientsPage() {
    try {
        const result = await apiCall('clients');
        
        if (result.success) {
            state.allClients = result.data;
            renderClientsTable(state.allClients);
        }
    } catch (error) {
        console.error('Error loading clients:', error);
        document.getElementById('clientsTableBody').innerHTML = `
            <tr><td colspan="5" style="text-align: center; color: var(--accent-coral);">Could not load clients.</td></tr>
        `;
    }
}

function renderClientsTable(clients) {
    const tableBody = document.getElementById('clientsTableBody');
    if (!tableBody) return;

    if (!clients || clients.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No clients found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = clients.map(client => `
        <tr>
            <td><strong>${client.name}</strong></td>
            <td>${client.company || 'N/A'}</td>
            <td>${client.email}</td>
            <td>${client.phone}</td>
            <td style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm edit-client-btn" data-client-id="${client.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm delete-client-btn" data-client-id="${client.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function handleClientSearch(searchTerm) {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredClients = state.allClients.filter(client => {
        const clientName = client.name.toLowerCase();
        const clientCompany = (client.company || '').toLowerCase();
        const clientEmail = client.email.toLowerCase();
        return clientName.includes(lowerCaseSearchTerm) || clientCompany.includes(lowerCaseSearchTerm) || clientEmail.includes(lowerCaseSearchTerm);
    });
    renderClientsTable(filteredClients);
}

async function handleEditClientClick(button) {
    const clientId = button.closest('.edit-client-btn').dataset.clientId;
    const editModal = document.getElementById('editClientModal');
    
    try {
        const result = await apiCall(`clients/${clientId}`);
        
        if (result.success) {
            const client = result.data;

            document.getElementById('editClientId').value = client.id;
            document.getElementById('editClientName').value = client.name;
            document.getElementById('editClientCompany').value = client.company || '';
            document.getElementById('editClientEmail').value = client.email;
            document.getElementById('editClientPhone').value = client.phone;
            document.getElementById('editClientAddress').value = client.address;

            if (editModal) editModal.style.display = 'block';
        }
    } catch (error) {
        showNotification('Failed to load client details', 'error');
    }
}

async function saveClientChanges() {
    const clientData = {
        id: document.getElementById('editClientId').value,
        name: document.getElementById('editClientName').value,
        company: document.getElementById('editClientCompany').value,
        email: document.getElementById('editClientEmail').value,
        phone: document.getElementById('editClientPhone').value,
        address: document.getElementById('editClientAddress').value,
    };

    if (!clientData.name || !clientData.email || !clientData.phone || !clientData.address) {
        showNotification('All fields are required', 'error');
        return;
    }

    try {
        const result = await apiCall('clients', {
            method: 'PUT',
            body: clientData
        });
        
        showNotification('Client updated successfully', 'success');
        document.getElementById('editClientModal').style.display = 'none';
        initializeClientsPage();
    } catch (error) {
        console.error('Error updating client:', error);
    }
}

async function handleDeleteClient(button) {
    const clientId = button.closest('.delete-client-btn').dataset.clientId;
    
    if (!confirm('Are you sure you want to delete this client? This will also delete all associated projects, quotations, and invoices.')) {
        return;
    }
    
    try {
        const result = await apiCall(`clients/${clientId}`, {
            method: 'DELETE'
        });
        
        if (result.success) {
            showNotification('Client deleted successfully', 'success');
            initializeClientsPage();
        } else {
            showNotification(result.message || 'Failed to delete client', 'error');
        }
    } catch (error) {
        console.error('Error deleting client:', error);
        showNotification('Failed to delete client', 'error');
    }
}

// --- SYSTEM SETTINGS FUNCTIONS ---
async function loadSettings() {
    try {
        const result = await apiCall('settings');
        
        if (result.success) {
            appSettings = result.data;
            // Update default tax rate in state
            state.taxRate = parseFloat(appSettings.default_tax_rate) || 16;
            // Update calculator UI if it's active
            const taxRateInput = document.getElementById('taxRate');
            if (taxRateInput) taxRateInput.value = state.taxRate;
            updateCalculatorSummary();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function initializeSettingsPage() {
    // Ensure settings are loaded before populating the form
    if (Object.keys(appSettings).length === 0) {
        await loadSettings();
    }

    document.getElementById('settingCompanyName').value = appSettings.company_name || '';
    document.getElementById('settingCompanyAddress').value = appSettings.company_address || '';
    document.getElementById('settingCompanyPhone').value = appSettings.company_phone || '';
    document.getElementById('settingCompanyEmail').value = appSettings.company_email || '';
    document.getElementById('settingDefaultTaxRate').value = appSettings.default_tax_rate || '16';
    document.getElementById('settingBankName').value = appSettings.bank_name || '';
    document.getElementById('settingAccountName').value = appSettings.account_name || '';
    document.getElementById('settingAccountNumber').value = appSettings.account_number || '';
    document.getElementById('settingMpesaPaybill').value = appSettings.mpesa_paybill || '';
    document.getElementById('settingMpesaAccountRef').value = appSettings.mpesa_account_ref || '';
}

async function saveSettings() {
    const updatedSettings = {
        company_name: document.getElementById('settingCompanyName').value,
        company_address: document.getElementById('settingCompanyAddress').value,
        company_phone: document.getElementById('settingCompanyPhone').value,
        company_email: document.getElementById('settingCompanyEmail').value,
        default_tax_rate: document.getElementById('settingDefaultTaxRate').value,
        bank_name: document.getElementById('settingBankName').value,
        account_name: document.getElementById('settingAccountName').value,
        account_number: document.getElementById('settingAccountNumber').value,
        mpesa_paybill: document.getElementById('settingMpesaPaybill').value,
        mpesa_account_ref: document.getElementById('settingMpesaAccountRef').value,
    };

    try {
        const result = await apiCall('settings', {
            method: 'PUT',
            body: updatedSettings
        });
        
        if (result.success) {
            showNotification('Settings updated successfully', 'success');
            await loadSettings();
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// --- PROJECTS MANAGEMENT FUNCTIONS ---
async function initializeProjectsPage() {
    try {
        const result = await apiCall('projects');
        
        if (result.success) {
            state.allProjects = result.data;
            renderProjectsTable(state.allProjects);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        document.getElementById('projectsTableBody').innerHTML = `
            <tr><td colspan="5" style="text-align: center; color: var(--accent-coral);">Could not load projects.</td></tr>
        `;
    }
}

function renderProjectsTable(projects) {
    const tableBody = document.getElementById('projectsTableBody');
    if (!tableBody) return;

    if (!projects || projects.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">No projects found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = projects.map(project => `
        <tr>
            <td><strong>${project.name}</strong></td>
            <td>${project.client_name || 'N/A'}</td>
            <td><span class="status-badge ${project.status}">${project.status}</span></td>
            <td>${formatCurrency(project.budget)}</td>
            <td style="display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-sm edit-project-btn" data-project-id="${project.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm delete-project-btn" data-project-id="${project.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Add status badge CSS
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
        text-transform: capitalize;
    }
    .status-badge.planning { background: #6c757d; color: white; }
    .status-badge.site_visit_scheduled { background: #17a2b8; color: white; }
    .status-badge.site_visit_completed { background: #28a745; color: white; }
    .status-badge.client_approved { background: #20c997; color: white; }
    .status-badge.in_progress { background: #ffc107; color: black; }
    .status-badge.completed { background: #28a745; color: white; }
    .status-badge.submitted { background: #6610f2; color: white; }
    .status-badge.draft { background: #6c757d; color: white; }
    .status-badge.sent { background: #17a2b8; color: white; }
    .status-badge.paid { background: #28a745; color: white; }
    .status-badge.overdue { background: #dc3545; color: white; }
    .status-badge.cancelled { background: #6c757d; color: white; }
`;
document.head.appendChild(style);

// Load clients for dropdown
async function loadClientsForSelect(selectId) {
    try {
        const result = await apiCall('clients');
        
        if (result.success) {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">-- Select a Client --</option>' +
                    result.data.map(client => 
                        `<option value="${client.id}">${client.name}${client.company ? ` (${client.company})` : ''}</option>`
                    ).join('');
            }
        }
    } catch (error) {
        console.error('Error loading clients for select:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Add CSS for fadeOut animation
const fadeStyle = document.createElement('style');
fadeStyle.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(fadeStyle);
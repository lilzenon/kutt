// log htmx on dev
// htmx.logAll();

// ===== MOBILE NAVIGATION FUNCTIONS =====

function toggleMobileNav() {
    console.log('toggleMobileNav called');
    const overlay = document.getElementById('mobileOverlay');
    const nav = document.getElementById('mobileNav');

    console.log('Overlay found:', !!overlay);
    console.log('Nav found:', !!nav);

    if (overlay && nav) {
        const isActive = nav.classList.contains('active');
        console.log('Current active state:', isActive);

        if (isActive) {
            // Close navigation
            overlay.classList.remove('active');
            nav.classList.remove('active');
            document.body.style.overflow = '';
            console.log('Navigation closed');
        } else {
            // Open navigation
            overlay.classList.add('active');
            nav.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log('Navigation opened');

            // Add haptic feedback if supported
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }
    } else {
        console.error('Mobile navigation elements not found');
        console.log('Available elements with mobileOverlay:', document.querySelectorAll('[id*="mobile"]'));
    }
}

function closeMobileNav() {
    console.log('closeMobileNav called');
    const overlay = document.getElementById('mobileOverlay');
    const nav = document.getElementById('mobileNav');

    if (overlay && nav) {
        overlay.classList.remove('active');
        nav.classList.remove('active');
        document.body.style.overflow = '';
        console.log('Navigation closed via closeMobileNav');
    }
}

// Mobile navigation event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Mobile navigation trigger with enhanced touch support
    const mobileTrigger = document.getElementById('mobileTrigger');
    if (mobileTrigger) {
        // Add multiple event listeners for better mobile compatibility
        mobileTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile trigger clicked');
            toggleMobileNav();
        });

        // Add touch events for better mobile support
        mobileTrigger.addEventListener('touchstart', function(e) {
            e.preventDefault();
            console.log('Mobile trigger touched');
            toggleMobileNav();
        }, { passive: false });

        // Add pointer events for modern devices
        mobileTrigger.addEventListener('pointerdown', function(e) {
            e.preventDefault();
            console.log('Mobile trigger pointer down');
            toggleMobileNav();
        });

        // Ensure the element is properly styled for touch
        mobileTrigger.style.cursor = 'pointer';
        mobileTrigger.style.userSelect = 'none';
        mobileTrigger.style.webkitUserSelect = 'none';
        mobileTrigger.style.webkitTouchCallout = 'none';

        console.log('Mobile trigger initialized with enhanced touch support');
    } else {
        console.error('Mobile trigger element not found');
    }

    // Close mobile nav when clicking overlay
    const overlay = document.getElementById('mobileOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeMobileNav);
    }

    // Close mobile nav when clicking close button
    const closeBtn = document.getElementById('mobileClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMobileNav);
    }

    // Close mobile nav when pressing escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileNav();
        }
    });

    // Touch gesture support for mobile nav
    let startY = 0;
    let currentY = 0;
    const nav = document.getElementById('mobileNav');

    if (nav) {
        nav.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
        }, { passive: true });

        nav.addEventListener('touchmove', function(e) {
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            // If swiping down significantly, close the nav
            if (deltaY > 100) {
                closeMobileNav();
            }
        }, { passive: true });
    }

    // Auto-close mobile nav when clicking navigation items
    const navItems = document.querySelectorAll('.laylo-mobile-nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Small delay to allow navigation to start
            setTimeout(closeMobileNav, 100);
        });
    });
});

// ===== COMPREHENSIVE NOTIFICATION SYSTEM =====

class NotificationCenter {
    constructor() {
        this.notifications = [];
        this.currentFilter = 'all';
        this.currentOffset = 0;
        this.hasMore = true;
        this.isLoading = false;
        this.unreadCount = 0;

        this.initializeEventListeners();
        this.loadNotifications();
        this.startRealTimeUpdates();
    }

    initializeEventListeners() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const notificationCenter = document.querySelector('.laylo-notification-center');
            if (notificationCenter && !notificationCenter.contains(e.target)) {
                this.closeNotificationCenter();
            }
        });

        // Filter buttons
        document.querySelectorAll('.laylo-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // Quiet hours toggle
        const quietHoursToggle = document.getElementById('enableQuietHours');
        if (quietHoursToggle) {
            quietHoursToggle.addEventListener('change', (e) => {
                const settings = document.getElementById('quietHoursSettings');
                settings.style.display = e.target.checked ? 'block' : 'none';
            });
        }
    }

    async loadNotifications(reset = false) {
        if (this.isLoading) return;

        this.isLoading = true;

        if (reset) {
            this.currentOffset = 0;
            this.notifications = [];
        }

        try {
            const params = new URLSearchParams({
                limit: 20,
                offset: this.currentOffset,
                unreadOnly: this.currentFilter === 'unread' ? 'true' : 'false'
            });

            if (this.currentFilter !== 'all' && this.currentFilter !== 'unread') {
                params.append('category', this.currentFilter);
            }

            const response = await fetch(`/api/notifications?${params}`);
            const data = await response.json();

            if (data.success) {
                if (reset) {
                    this.notifications = data.notifications;
                } else {
                    this.notifications.push(...data.notifications);
                }

                this.unreadCount = data.unreadCount;
                this.hasMore = data.hasMore;
                this.currentOffset += data.notifications.length;

                this.renderNotifications();
                this.updateBadge();
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.showError('Failed to load notifications');
        } finally {
            this.isLoading = false;
        }
    }

    renderNotifications() {
        const listElement = document.getElementById('notificationList');
        const template = document.getElementById('notificationTemplate');

        if (!listElement || !template) return;

        // Clear loading state
        listElement.innerHTML = '';

        if (this.notifications.length === 0) {
            listElement.innerHTML = `
                <div class="laylo-notification-empty">
                    <p>No notifications found</p>
                </div>
            `;
            return;
        }

        // Render notifications
        this.notifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification, template);
            listElement.appendChild(notificationElement);
        });

        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
        }
    }

    createNotificationElement(notification, template) {
        const html = template.innerHTML
            .replace(/{id}/g, notification.id)
            .replace(/{title}/g, this.escapeHtml(notification.title || 'Notification'))
            .replace(/{message}/g, this.escapeHtml(notification.message))
            .replace(/{timeAgo}/g, this.formatTimeAgo(notification.created_at))
            .replace(/{category}/g, notification.category)
            .replace(/{type}/g, notification.type)
            .replace(/{read}/g, notification.read_at ? 'true' : 'false')
            .replace(/{unreadDisplay}/g, notification.read_at ? 'none' : 'block');

        const div = document.createElement('div');
        div.innerHTML = html;
        const element = div.firstElementChild;

        // Set type icon
        const iconElement = element.querySelector('.laylo-notification-type-icon');
        if (iconElement) {
            iconElement.innerHTML = this.getTypeIcon(notification.type);
        }

        // Add click handler
        element.addEventListener('click', () => {
            this.handleNotificationClick(notification);
        });

        return element;
    }

    getTypeIcon(type) {
        const icons = {
            email: '📧',
            sms: '📱',
            in_app: '🔔',
            system: '⚙️',
            drop: '🎯',
            marketing: '📢'
        };
        return icons[type] || '🔔';
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;

        // Update active filter button
        document.querySelectorAll('.laylo-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Reload notifications
        this.loadNotifications(true);
    }

    async handleNotificationClick(notification) {
        // Mark as read if unread
        if (!notification.read_at) {
            await this.markAsRead(notification.id);
        }

        // Handle notification-specific actions
        if (notification.data) {
            try {
                const data = typeof notification.data === 'string' ?
                    JSON.parse(notification.data) :
                    notification.data;

                if (data.url) {
                    window.open(data.url, '_blank');
                } else if (data.action) {
                    this.handleNotificationAction(data.action, data);
                }
            } catch (error) {
                console.error('Error handling notification click:', error);
            }
        }
    }

    handleNotificationAction(action, data) {
        switch (action) {
            case 'view_drop':
                window.location.href = `/drops/${data.dropId}`;
                break;
            case 'view_analytics':
                window.location.href = `/analytics`;
                break;
            case 'view_profile':
                window.location.href = `/profile`;
                break;
            default:
                console.log('Unknown notification action:', action);
        }
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT'
            });

            if (response.ok) {
                // Update local state
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.read_at = new Date().toISOString();
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    this.updateBadge();
                    this.renderNotifications();
                }
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch('/api/notifications/read-all', {
                method: 'PUT'
            });

            if (response.ok) {
                // Update local state
                this.notifications.forEach(n => {
                    n.read_at = new Date().toISOString();
                });
                this.unreadCount = 0;
                this.updateBadge();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    async loadMoreNotifications() {
        await this.loadNotifications(false);
    }

    startRealTimeUpdates() {
        // Poll for new notifications every 30 seconds
        setInterval(() => {
            this.checkForNewNotifications();
        }, 30000);
    }

    async checkForNewNotifications() {
        try {
            const response = await fetch('/api/notifications?limit=1&offset=0');
            const data = await response.json();

            if (data.success && data.notifications.length > 0) {
                const latestNotification = data.notifications[0];
                const existingNotification = this.notifications.find(n => n.id === latestNotification.id);

                if (!existingNotification) {
                    // New notification found
                    this.notifications.unshift(latestNotification);
                    this.unreadCount = data.unreadCount;
                    this.updateBadge();
                    this.renderNotifications();
                    this.showNewNotificationToast(latestNotification);
                }
            }
        } catch (error) {
            console.error('Failed to check for new notifications:', error);
        }
    }

    showNewNotificationToast(notification) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'laylo-notification-toast';
        toast.innerHTML = `
            <div class="laylo-toast-content">
                <strong>${this.escapeHtml(notification.title || 'New Notification')}</strong>
                <p>${this.escapeHtml(notification.message)}</p>
            </div>
        `;

        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Hide toast after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 5000);
    }

    showError(message) {
        const listElement = document.getElementById('notificationList');
        if (listElement) {
            listElement.innerHTML = `
                <div class="laylo-notification-error">
                    <p>${message}</p>
                    <button onclick="notificationCenter.loadNotifications(true)">Retry</button>
                </div>
            `;
        }
    }

    closeNotificationCenter() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    }
}

// Global notification functions
function toggleNotificationCenter() {
    const dropdown = document.getElementById('notificationDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');

        if (dropdown.classList.contains('active')) {
            // Load notifications when opening
            if (window.notificationCenter) {
                window.notificationCenter.loadNotifications(true);
            }
        }
    }
}

function markAllAsRead() {
    if (window.notificationCenter) {
        window.notificationCenter.markAllAsRead();
    }
}

function markAsRead(notificationId) {
    if (window.notificationCenter) {
        window.notificationCenter.markAsRead(notificationId);
    }
}

function loadMoreNotifications() {
    if (window.notificationCenter) {
        window.notificationCenter.loadMoreNotifications();
    }
}

function openNotificationSettings() {
    const modal = document.getElementById('notificationSettingsModal');
    if (modal) {
        modal.style.display = 'block';
        loadNotificationSettings();
    }
}

function closeNotificationSettings() {
    const modal = document.getElementById('notificationSettingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function loadNotificationSettings() {
    try {
        const response = await fetch('/api/notifications/preferences');
        const data = await response.json();

        if (data.success) {
            // Populate settings form with current preferences
            data.preferences.forEach(pref => {
                const elementId = `${pref.notification_type}${pref.category.charAt(0).toUpperCase() + pref.category.slice(1)}`;
                const element = document.getElementById(elementId);
                if (element) {
                    element.checked = pref.enabled;
                }
            });
        }
    } catch (error) {
        console.error('Failed to load notification settings:', error);
    }
}

async function saveNotificationSettings() {
    try {
        const preferences = [];

        // Collect all preference settings
        const settingElements = document.querySelectorAll('#notificationSettingsModal input[type="checkbox"]');
        settingElements.forEach(element => {
            const id = element.id;
            let type, category;

            if (id.startsWith('email')) {
                type = 'email';
                category = id.replace('email', '').toLowerCase();
            } else if (id.startsWith('sms')) {
                type = 'sms';
                category = id.replace('sms', '').toLowerCase();
            } else if (id.startsWith('inApp')) {
                type = 'in_app';
                category = id.replace('inApp', '').toLowerCase();
            }

            if (type && category && category !== 'sounds') {
                preferences.push({
                    notification_type: type,
                    category: category,
                    enabled: element.checked
                });
            }
        });

        const response = await fetch('/api/notifications/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ preferences })
        });

        if (response.ok) {
            closeNotificationSettings();
            // Show success message
            alert('Notification settings saved successfully!');
        } else {
            alert('Failed to save notification settings. Please try again.');
        }
    } catch (error) {
        console.error('Failed to save notification settings:', error);
        alert('Failed to save notification settings. Please try again.');
    }
}

// Initialize notification center when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.laylo-notification-center')) {
        window.notificationCenter = new NotificationCenter();
    }
});

// add text/html accept header to receive html instead of json for the requests
document.body.addEventListener("htmx:configRequest", function(evt) {
    evt.detail.headers["Accept"] = "text/html,*/*";
});

// handle checkbox state management for HTMX forms
document.body.addEventListener("htmx:beforeRequest", function(evt) {
    // Find all checkboxes in the form being submitted
    const form = evt.detail.elt;
    if (form && form.tagName === 'FORM') {
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            // For unchecked checkboxes, add a hidden input with value 'false'
            if (!checkbox.checked && checkbox.name) {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = checkbox.name;
                hiddenInput.value = 'false';
                hiddenInput.setAttribute('data-checkbox-fallback', 'true');
                form.appendChild(hiddenInput);
            }
        });
    }
});

// clean up checkbox fallback inputs after request
document.body.addEventListener("htmx:afterRequest", function(evt) {
    const form = evt.detail.elt;
    if (form && form.tagName === 'FORM') {
        // Remove fallback inputs
        const fallbackInputs = form.querySelectorAll('input[data-checkbox-fallback="true"]');
        fallbackInputs.forEach(input => input.remove());
    }
});

// redirect to homepage
document.body.addEventListener("redirectToHomepage", function() {
    setTimeout(() => {
        window.location.replace("/");
    }, 1500);
});

// reset form if event is sent from the backend
function resetForm(id) {
    return function() {
        const form = document.getElementById(id);
        if (!form) return;
        form.reset();
    }
}
document.body.addEventListener("resetChangePasswordForm", resetForm("change-password"));
document.body.addEventListener("resetChangeEmailForm", resetForm("change-email"));

// an htmx extension to use the specifed params in the path instead of the query or body
htmx.defineExtension("path-params", {
    onEvent: function(name, evt) {
        if (name === "htmx:configRequest") {
            evt.detail.path = evt.detail.path.replace(/{([^}]+)}/g, function(_, param) {
                var val = evt.detail.parameters[param]
                delete evt.detail.parameters[param]
                return val === undefined ? "{" + param + "}" : encodeURIComponent(val)
            })
        }
    }
})

// Drop Management Functions

// Create new drop
function createDrop() {
    openDialog('create-drop-dialog');

    // Reset form
    const form = document.getElementById('create-drop-form');
    if (form) {
        form.reset();
    }

    // Auto-generate slug from title
    const titleInput = document.getElementById('drop-title');
    const slugInput = document.getElementById('drop-slug');

    titleInput.addEventListener('input', function() {
        if (!slugInput.value || slugInput.dataset.autoGenerated === 'true') {
            const slug = generateSlugFromTitle(this.value);
            slugInput.value = slug;
            slugInput.dataset.autoGenerated = 'true';
        }
    });

    slugInput.addEventListener('input', function() {
        this.dataset.autoGenerated = 'false';
    });
}

// Generate slug from title
function generateSlugFromTitle(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 100)
        .replace(/^-+|-+$/g, '');
}

// Handle create drop form submission
document.addEventListener('DOMContentLoaded', function() {
    // Create drop button handlers - use event delegation for dynamic content
    document.addEventListener('click', function(e) {
        if (e.target.matches('#create-drop-btn, #create-first-drop-btn') ||
            e.target.closest('#create-drop-btn, #create-first-drop-btn')) {
            e.preventDefault();
            createDrop();
        }
    });

    // Create drop form submission
    const createDropForm = document.getElementById('create-drop-form');
    if (createDropForm) {
        createDropForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            // Clear any previous errors
            hideDropError();

            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span>Creating...</span>';
            submitBtn.disabled = true;

            try {
                console.log('🚀 Creating drop with data:', data);

                const response = await fetch('/api/drops', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                console.log('📡 Response status:', response.status, response.statusText);

                // Parse response
                let result;
                try {
                    result = await response.json();
                    console.log('📦 Response data:', result);
                } catch (parseError) {
                    console.error('❌ Failed to parse response JSON:', parseError);
                    throw new Error('Invalid response from server');
                }

                // Check for success
                if (response.ok && result.success) {
                    console.log('✅ Drop created successfully:', result.data);

                    // Show success message briefly before redirect
                    showDropSuccess('Drop created successfully! Redirecting...');

                    // Close modal and reload page after short delay
                    setTimeout(() => {
                        closeDialog();
                        window.location.reload();
                    }, 1000);
                } else {
                    // Show error message
                    const errorMessage = result.message || result.error || 'Failed to create drop';
                    console.error('❌ Drop creation failed:', errorMessage);
                    showDropError(errorMessage);
                }
            } catch (error) {
                console.error('❌ Network error during drop creation:', error);
                showDropError('Network error. Please check your connection and try again.');
            } finally {
                // Reset button (only if we're not redirecting)
                if (!document.querySelector('.success-message:not([style*="display: none"])')) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }
});

// Show drop error message
function showDropError(message) {
    const errorDiv = document.getElementById('create-drop-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'error';

        // Hide after 8 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 8000);
    }
    console.error('🔴 Drop Error:', message);
}

// Hide drop error message
function hideDropError() {
    const errorDiv = document.getElementById('create-drop-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Show drop success message
function showDropSuccess(message) {
    const errorDiv = document.getElementById('create-drop-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'success-message';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.className = 'error'; // Reset to error class
        }, 3000);
    }
    console.log('🟢 Drop Success:', message);
}

// Edit drop function
function editDrop(dropId) {
    // For now, redirect to a dedicated edit page
    // In a future update, this could open an inline edit modal
    window.location.href = `/drops/${dropId}/edit`;
}

// Show drop QR code
function showDropQR(dropId, dropUrl) {
    handleQRCode({ dataset: { url: dropUrl } }, 'dialog');
}

// View drop stats
function viewDropStats(dropId) {
    // For now, redirect to a dedicated stats page
    // In a future update, this could open an inline stats modal
    window.location.href = `/drops/${dropId}/stats`;
}

// Copy drop URL function
function copyDropUrl(url) {
    if (navigator.clipboard && window.isSecureContext) {
        // Modern clipboard API
        navigator.clipboard.writeText(url).then(() => {
            showCopyFeedback('URL copied to clipboard!');
        }).catch(() => {
            fallbackCopyUrl(url);
        });
    } else {
        // Fallback for older browsers or non-secure contexts
        fallbackCopyUrl(url);
    }
}

// Fallback copy function
function fallbackCopyUrl(url) {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showCopyFeedback('URL copied to clipboard!');
    } catch (err) {
        showCopyFeedback('Failed to copy URL');
    }

    document.body.removeChild(textArea);
}

// Show copy feedback
function showCopyFeedback(message) {
    // Create or update feedback element
    let feedback = document.getElementById('copy-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'copy-feedback';
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(feedback);
    }

    feedback.textContent = message;
    feedback.style.transform = 'translateX(0)';

    // Hide after 3 seconds
    setTimeout(() => {
        feedback.style.transform = 'translateX(100%)';
    }, 3000);
}

// Show delete drop modal (replaces browser confirm)
function showDeleteDropModal(dropId, dropTitle) {
    const modal = document.createElement('div');
    modal.className = 'delete-modal-overlay';
    modal.innerHTML = `
        <div class="delete-modal">
            <div class="delete-modal-header">
                <h3>Delete Drop?</h3>
            </div>
            <div class="delete-modal-content">
                <p>Are you sure you want to delete the drop <strong>"${dropTitle}"</strong>?</p>
                <p class="warning-text">This action cannot be undone.</p>
            </div>
            <div class="delete-modal-actions">
                <button type="button" class="modal-btn cancel-btn" onclick="closeDeleteModal()">Cancel</button>
                <button type="button" class="modal-btn delete-btn" onclick="confirmDeleteDrop('${dropId}')">Delete Drop</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Animate in
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.querySelector('.delete-modal-overlay');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// Confirm delete drop
function confirmDeleteDrop(dropId) {
    closeDeleteModal();
    deleteDropConfirmed(dropId);
}

// Legacy delete drop function (keeping for compatibility)
function deleteDrop(dropId, dropTitle) {
    showDeleteDropModal(dropId, dropTitle);
}

// Confirmed drop deletion
async function deleteDropConfirmed(dropId) {
    try {
        const response = await fetch(`/api/drops/${dropId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            // Remove the drop card from the UI with modern animation
            const dropCard = document.querySelector(`[data-drop-id="${dropId}"]`);
            if (dropCard) {
                // Modern card removal animation
                dropCard.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
                dropCard.style.opacity = '0';
                dropCard.style.transform = 'scale(0.8) translateY(-20px)';
                dropCard.style.filter = 'blur(4px)';

                setTimeout(() => {
                    dropCard.remove();

                    // Check if no drops left, show empty state
                    const dropsGrid = document.querySelector('.drops-grid');
                    if (dropsGrid && dropsGrid.children.length === 0) {
                        location.reload(); // Reload to show empty state
                    }
                }, 400);
            }

            // Show success feedback
            showCopyFeedback('Drop deleted successfully');
        } else {
            alert(result.message || 'Failed to delete drop');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// find closest element
function closest(selector, elm) {
    let element = elm || this;

    while (element && element.nodeType === 1) {
        if (element.matches(selector)) {
            return element;
        }

        element = element.parentNode;
    }

    return null;
};

// get url query param
function getQueryParams() {
    const search = window.location.search.replace("?", "");
    const query = {};
    search.split("&").map(q => {
        const keyvalue = q.split("=");
        query[keyvalue[0]] = keyvalue[1];
    });
    return query;
}

// trim text
function trimText(selector, length) {
    const element = document.querySelector(selector);
    if (!element) return;
    let text = element.textContent;
    if (typeof text !== "string") return;
    text = text.trim();
    if (text.length > length) {
        element.textContent = text.split("").slice(0, length).join("") + "...";
    }
}

function formatDateHour(selector) {
    const element = document.querySelector(selector);
    if (!element) return;
    const dateString = element.dataset.date;
    if (!dateString) return;
    const date = new Date(dateString);
    element.textContent = date.getHours() + ":" + date.getMinutes();
}

// show QR code
function handleQRCode(element, id) {
    const dialog = document.getElementById(id);
    const dialogContent = dialog.querySelector(".content-wrapper");
    if (!dialogContent) return;
    openDialog(id, "qrcode");
    dialogContent.textContent = "";

    // Create QR code container
    const qrContainer = document.createElement("div");
    qrContainer.className = "qr-container";
    dialogContent.appendChild(qrContainer);

    const qrcode = new QRCode(qrContainer, {
        text: element.dataset.url,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Make QR code right-clickable for easy saving
    setTimeout(function() {
        const canvas = qrContainer.querySelector("canvas");
        if (canvas) {
            canvas.style.cursor = "pointer";
            canvas.title = "Right-click to save QR code";
            canvas.setAttribute("download", "qr-code.png");
        }
    }, 100);

    // Detect if user is on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);

    // Create buttons container
    const buttonsContainer = document.createElement("div");
    buttonsContainer.className = "qr-buttons";
    dialogContent.appendChild(buttonsContainer);

    if (!isMobile) {
        // Desktop: Show Copy QR button
        const copyButton = document.createElement("button");
        copyButton.innerHTML = '<span class="button-icon">📋</span> Copy QR';
        copyButton.className = "qr-button primary";
        copyButton.onclick = function() {
            copyQRCodeToClipboard(qrContainer);
        };
        buttonsContainer.appendChild(copyButton);
    } else {
        // Mobile: Show instructional text
        const instructionText = document.createElement("div");
        instructionText.className = "qr-instructions";
        instructionText.innerHTML = `
            <div class="instruction-arrow">↑</div>
            <p><strong>To save the QR code:</strong></p>
            <p>Long press the QR code above and select<br><strong>"Save to Photos"</strong> or <strong>"Download Image"</strong></p>
        `;
        buttonsContainer.appendChild(instructionText);
    }

    // Create Exit button (for both desktop and mobile)
    const exitButton = document.createElement("button");
    exitButton.innerHTML = '<span class="button-icon">✕</span> Exit';
    exitButton.className = "qr-button secondary";
    exitButton.onclick = closeDialog;
    buttonsContainer.appendChild(exitButton);
}

// Copy QR code image to clipboard with enhanced Safari support
function copyQRCodeToClipboard(qrContainer) {
    const canvas = qrContainer.querySelector("canvas");
    if (!canvas) return;

    // Check if we're in a secure context (required for clipboard API)
    if (!window.isSecureContext) {
        showCopyFallback();
        return;
    }

    // Enhanced clipboard support for Safari and other browsers
    if (navigator.clipboard && window.ClipboardItem) {
        canvas.toBlob(function(blob) {
            try {
                // Safari requires specific MIME type handling
                const clipboardItem = new ClipboardItem({
                    'image/png': blob
                });

                navigator.clipboard.write([clipboardItem]).then(function() {
                    showCopySuccess();
                }).catch(function(err) {
                    console.error("Clipboard write failed: ", err);
                    // Try alternative method for Safari
                    tryAlternativeCopy(canvas);
                });
            } catch (err) {
                console.error("ClipboardItem creation failed: ", err);
                tryAlternativeCopy(canvas);
            }
        }, "image/png");
    } else {
        // Fallback for browsers without clipboard API
        tryAlternativeCopy(canvas);
    }
}

// Alternative copy method for Safari and older browsers
function tryAlternativeCopy(canvas) {
    try {
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL("image/png");

        // Create a temporary image element
        const img = document.createElement("img");
        img.src = dataURL;
        img.style.position = "fixed";
        img.style.left = "-9999px";
        img.style.top = "-9999px";
        document.body.appendChild(img);

        // Try to select and copy the image
        const range = document.createRange();
        range.selectNode(img);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCopySuccess();
            } else {
                showCopyFallback();
            }
        } catch (err) {
            console.error("execCommand copy failed: ", err);
            showCopyFallback();
        }

        // Clean up
        document.body.removeChild(img);
        selection.removeAllRanges();

    } catch (err) {
        console.error("Alternative copy method failed: ", err);
        showCopyFallback();
    }
}

// Show copy success feedback
function showCopySuccess() {
    const copyButton = document.querySelector(".qr-button.primary");
    if (copyButton) {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '<span class="button-icon">✓</span> Copied!';
        copyButton.classList.add("copied");
        setTimeout(function() {
            copyButton.innerHTML = originalText;
            copyButton.classList.remove("copied");
        }, 2000);
    }
}

// Show copy fallback message
function showCopyFallback() {
    const copyButton = document.querySelector(".qr-button.primary");
    if (copyButton) {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = '<span class="button-icon">📱</span> Long press to save';
        copyButton.classList.add("fallback");
        setTimeout(function() {
            copyButton.innerHTML = originalText;
            copyButton.classList.remove("fallback");
        }, 3000);
    }

    // Show helpful message
    alert("To save the QR code:\n• Desktop: Right-click and 'Save image'\n• Mobile: Long press and 'Save to Photos'");
}

// copy the link to clipboard
function handleCopyLink(element) {
    navigator.clipboard.writeText(element.dataset.url);
}

// copy the link and toggle copy button style
function handleShortURLCopyLink(element) {
    handleCopyLink(element);
    const clipboard = element.parentNode.querySelector(".clipboard") || closest(".clipboard", element);
    if (!clipboard || clipboard.classList.contains("copied")) return;
    clipboard.classList.add("copied");
    setTimeout(function() {
        clipboard.classList.remove("copied");
    }, 1000);
}

// open and close dialog
function openDialog(id, name) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.classList.add("open");
    if (name) {
        dialog.classList.add(name);
    }
}

function closeDialog() {
    const dialog = document.querySelector(".dialog.open");
    if (!dialog) return;
    while (dialog.classList.length > 0) {
        dialog.classList.remove(dialog.classList[0]);
    }
    dialog.classList.add("dialog");
}

// Handle dialog dismissal for both desktop and mobile
function handleDialogDismissal(event) {
    const dialog = document.querySelector(".dialog");
    if (dialog && event.target === dialog) {
        closeDialog();
    }
}

// Add both click and touch event listeners for cross-platform compatibility
window.addEventListener("click", handleDialogDismissal);
window.addEventListener("touchend", handleDialogDismissal);

// handle navigation in the table of links
function setLinksLimit(event) {
    const buttons = Array.from(document.querySelectorAll("table .nav .limit button"));
    const limitInput = document.querySelector("#limit");
    if (!limitInput || !buttons || !buttons.length) return;
    limitInput.value = event.target.textContent;
    buttons.forEach(b => {
        b.disabled = b.textContent === event.target.textContent;
    });
}

function setLinksSkip(event, action) {
    const buttons = Array.from(document.querySelectorAll("table .nav .pagination button"));
    const limitElm = document.querySelector("#limit");
    const totalElm = document.querySelector("#total");
    const skipElm = document.querySelector("#skip");
    if (!buttons || !limitElm || !totalElm || !skipElm) return;
    const skip = parseInt(skipElm.value);
    const limit = parseInt(limitElm.value);
    const total = parseInt(totalElm.value);
    skipElm.value = action === "next" ? skip + limit : Math.max(skip - limit, 0);
    document.querySelectorAll(".pagination .next").forEach(elm => {
        elm.disabled = total <= parseInt(skipElm.value) + limit;
    });
    document.querySelectorAll(".pagination .prev").forEach(elm => {
        elm.disabled = parseInt(skipElm.value) <= 0;
    });
}

function updateLinksNav() {
    const totalElm = document.querySelector("#total");
    const skipElm = document.querySelector("#skip");
    const limitElm = document.querySelector("#limit");
    if (!totalElm || !skipElm || !limitElm) return;
    const total = parseInt(totalElm.value);
    const skip = parseInt(skipElm.value);
    const limit = parseInt(limitElm.value);
    document.querySelectorAll(".pagination .next").forEach(elm => {
        elm.disabled = total <= skip + limit;
    });
    document.querySelectorAll(".pagination .prev").forEach(elm => {
        elm.disabled = skip <= 0;
    });
}

function resetTableNav() {
    const totalElm = document.querySelector("#total");
    const skipElm = document.querySelector("#skip");
    const limitElm = document.querySelector("#limit");
    if (!totalElm || !skipElm || !limitElm) return;
    skipElm.value = 0;
    limitElm.value = 10;
    const total = parseInt(totalElm.value);
    const skip = parseInt(skipElm.value);
    const limit = parseInt(limitElm.value);
    document.querySelectorAll(".pagination .next").forEach(elm => {
        elm.disabled = total <= skip + limit;
    });
    document.querySelectorAll(".pagination .prev").forEach(elm => {
        elm.disabled = skip <= 0;
    });
    document.querySelectorAll("table .nav .limit button").forEach(b => {
        b.disabled = b.textContent === limit.toString();
    });
}

// tab click
function setTab(event, targetId) {
    const tabs = Array.from(closest("nav", event.target).children);
    tabs.forEach(function(tab) {
        tab.classList.remove("active");
    });
    if (targetId) {
        document.getElementById(targetId).classList.add("active");
    } else {
        event.target.classList.add("active");
    }
}

// show clear search button
function onSearchChange(event) {
    const clearButton = event.target.parentElement.querySelector("button.clear");
    if (!clearButton) return;
    clearButton.style.display = event.target.value.length > 0 ? "block" : "none";
}

function clearSeachInput(event) {
    event.preventDefault();
    const button = closest("button", event.target);
    const input = button.parentElement.querySelector("input");
    if (!input) return;
    input.value = "";
    button.style.display = "none";
    htmx.trigger("body", "reloadMainTable");
}

// detect if search inputs have value on load to show clear button
function onSearchInputLoad() {
    const linkSearchInput = document.getElementById("search");
    if (!linkSearchInput) return;
    const linkClearButton = linkSearchInput.parentElement.querySelector("button.clear")
    linkClearButton.style.display = linkSearchInput.value.length > 0 ? "block" : "none";

    const userSearchInput = document.getElementById("search_user");
    if (!userSearchInput) return;
    const userClearButton = userSearchInput.parentElement.querySelector("button.clear")
    userClearButton.style.display = userSearchInput.value.length > 0 ? "block" : "none";

    const domainSearchInput = document.getElementById("search_domain");
    if (!domainSearchInput) return;
    const domainClearButton = domainSearchInput.parentElement.querySelector("button.clear")
    domainClearButton.style.display = domainSearchInput.value.length > 0 ? "block" : "none";
}

onSearchInputLoad();

// create user checkbox control
function canSendVerificationEmail() {
    const canSendVerificationEmail = !document.getElementById("create-user-verified").checked && !document.getElementById("create-user-banned").checked;
    const checkbox = document.getElementById("send-email-label");
    if (canSendVerificationEmail)
        checkbox.classList.remove("hidden");
    if (!canSendVerificationEmail && !checkbox.classList.contains("hidden"))
        checkbox.classList.add("hidden");
}

// htmx prefetch extension
// https://github.com/bigskysoftware/htmx-extensions/blob/main/src/preload/README.md
htmx.defineExtension("preload", {
    onEvent: function(name, event) {
        if (name !== "htmx:afterProcessNode") {
            return
        }
        var attr = function(node, property) {
            if (node == undefined) { return undefined }
            return node.getAttribute(property) || node.getAttribute("data-" + property) || attr(node.parentElement, property)
        }
        var load = function(node) {
            var done = function(html) {
                if (!node.preloadAlways) {
                    node.preloadState = "DONE"
                }

                if (attr(node, "preload-images") == "true") {
                    document.createElement("div").innerHTML = html
                }
            }

            return function() {
                if (node.preloadState !== "READY") {
                    return
                }
                var hxGet = node.getAttribute("hx-get") || node.getAttribute("data-hx-get")
                if (hxGet) {
                    htmx.ajax("GET", hxGet, {
                        source: node,
                        handler: function(elt, info) {
                            done(info.xhr.responseText)
                        }
                    })
                    return
                }
                if (node.getAttribute("href")) {
                    var r = new XMLHttpRequest()
                    r.open("GET", node.getAttribute("href"))
                    r.onload = function() { done(r.responseText) }
                    r.send()
                }
            }
        }
        var init = function(node) {
            if (node.getAttribute("href") + node.getAttribute("hx-get") + node.getAttribute("data-hx-get") == "") {
                return
            }
            if (node.preloadState !== undefined) {
                return
            }
            var on = attr(node, "preload") || "mousedown"
            const always = on.indexOf("always") !== -1
            if (always) {
                on = on.replace("always", "").trim()
            }
            node.addEventListener(on, function(evt) {
                if (node.preloadState === "PAUSE") {
                    node.preloadState = "READY"
                    if (on === "mouseover") {
                        window.setTimeout(load(node), 100)
                    } else {
                        load(node)()
                    }
                }
            })
            switch (on) {
                case "mouseover":
                    node.addEventListener("touchstart", load(node))
                    node.addEventListener("mouseout", function(evt) {
                        if ((evt.target === node) && (node.preloadState === "READY")) {
                            node.preloadState = "PAUSE"
                        }
                    })
                    break

                case "mousedown":
                    node.addEventListener("touchstart", load(node))
                    break
            }
            node.preloadState = "PAUSE"
            node.preloadAlways = always
            htmx.trigger(node, "preload:init")
        }
        const parent = event.target || event.detail.elt;
        parent.querySelectorAll("[preload]").forEach(function(node) {
            init(node)
            node.querySelectorAll("a,[hx-get],[data-hx-get]").forEach(init)
        })
    }
})

// ===== ENHANCED MOBILE NAVIGATION GESTURES =====

// Handle swipe gestures for mobile navigation
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', function(e) {
    touchEndY = e.changedTouches[0].screenY;
    handleSwipeGesture();
}, { passive: true });

function handleSwipeGesture() {
    const swipeDistance = touchStartY - touchEndY;
    const minSwipeDistance = 50;

    // Only handle swipes on the navigation area
    const nav = document.getElementById('mobileNav');
    if (!nav) return;

    if (Math.abs(swipeDistance) < minSwipeDistance) return;

    // Swipe down to close when navigation is open
    if (swipeDistance < 0 && nav.classList.contains('active')) {
        closeMobileNav();
    }
}
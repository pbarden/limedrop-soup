// Notification Manager
class NotificationManager {
    static container = document.getElementById('notification-container');
    static notifications = new Map();

    static show(message, type = 'info', title = null, duration = 5000) {
        const id = Date.now();
        const template = document.getElementById('notification-template');
        const notification = template.content.cloneNode(true).querySelector('.notification');
        
        notification.classList.add(type);
        notification.dataset.id = id;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-times-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const iconEl = notification.querySelector('.notification-icon');
        iconEl.innerHTML = `<i class="${icons[type] || icons.info}"></i>`;
        
        if (title) {
            notification.querySelector('.notification-title').textContent = title;
        } else {
            notification.querySelector('.notification-title').style.display = 'none';
        }
        
        notification.querySelector('.notification-message').textContent = message;
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.remove(id);
        });
        
        this.container.appendChild(notification);
        this.notifications.set(id, notification);
        
        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
        
        return id;
    }

    static remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;
        
        notification.classList.add('removing');
        setTimeout(() => {
            notification.remove();
            this.notifications.delete(id);
        }, 300);
    }

    static success(message, title = null) {
        return this.show(message, 'success', title);
    }

    static error(message, title = null) {
        return this.show(message, 'error', title);
    }

    static warning(message, title = null) {
        return this.show(message, 'warning', title);
    }

    static info(message, title = null) {
        return this.show(message, 'info', title);
    }

    static toast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('active'), 10);
        
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// Window Management System

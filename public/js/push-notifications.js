// push-notifications.js - Управление push-уведомлениями на клиенте

class PushNotificationManager {
    constructor() {
        this.vapidPublicKey = BOLuMnBs0R9VSoKE2iKEhtxjbwYGjkRB9GrI8XILrV2WAMF7yml4jy1poojaYKGSqr0wxHzMxuxDA5jJxwsJ-dM; // Заменить на реальный ключ
        this.serverUrl = window.serverUrl || 'http://localhost:3000';
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.permission = Notification.permission;
    }

    // Инициализация
    async init() {
        if (!this.isSupported) {
            console.log('Push-уведомления не поддерживаются браузером');
            return false;
        }

        // Регистрация Service Worker
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован');
            
            // Проверяем разрешение
            if (this.permission === 'default') {
                this.showPermissionPrompt();
            } else if (this.permission === 'granted') {
                await this.subscribeUser();
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка регистрации Service Worker:', error);
            return false;
        }
    }

    // Показать запрос разрешения
    showPermissionPrompt() {
        const promptDiv = document.createElement('div');
        promptDiv.className = 'push-permission-prompt';
        promptDiv.innerHTML = `
            <div class="prompt-content">
                <h3>Включить уведомления?</h3>
                <p>Получайте уведомления о новых заявках, изменениях статусов и приближающихся сроках</p>
                <div class="prompt-buttons">
                    <button class="btn btn-primary" onclick="pushManager.requestPermission()">Включить</button>
                    <button class="btn btn-secondary" onclick="pushManager.dismissPrompt()">Позже</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(promptDiv);
        
        // Стили для промпта
        const style = document.createElement('style');
        style.textContent = `
            .push-permission-prompt {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 20px;
                max-width: 350px;
                z-index: 1000;
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .prompt-content h3 {
                margin: 0 0 10px 0;
                color: #333;
            }
            
            .prompt-content p {
                margin: 0 0 15px 0;
                color: #666;
                font-size: 14px;
            }
            
            .prompt-buttons {
                display: flex;
                gap: 10px;
            }
            
            .prompt-buttons button {
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }

    // Запросить разрешение
    async requestPermission() {
        this.dismissPrompt();
        
        const permission = await Notification.requestPermission();
        this.permission = permission;
        
        if (permission === 'granted') {
            await this.subscribeUser();
            this.showNotification('Уведомления включены', {
                body: 'Вы будете получать уведомления о важных событиях',
                icon: '/icon-192x192.png'
            });
        }
    }

    // Закрыть промпт
    dismissPrompt() {
        const prompt = document.querySelector('.push-permission-prompt');
        if (prompt) {
            prompt.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => prompt.remove(), 300);
        }
    }

    // Подписать пользователя
    async subscribeUser() {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Проверяем существующую подписку
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // Создаем новую подписку
                const convertedKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedKey
                });
            }
            
            // Отправляем подписку на сервер
            await this.updateSubscriptionOnServer(subscription);
            
            console.log('Пользователь подписан на push-уведомления');
            return subscription;
            
        } catch (error) {
            console.error('Ошибка подписки:', error);
            return null;
        }
    }

    // Отписать пользователя
    async unsubscribeUser() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();
                await this.removeSubscriptionFromServer();
                console.log('Пользователь отписан от push-уведомлений');
            }
        } catch (error) {
            console.error('Ошибка отписки:', error);
        }
    }

    // Обновить подписку на сервере
    async updateSubscriptionOnServer(subscription) {
        try {
            const response = await fetch(`${this.serverUrl}/api/push/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userId: this.getUserId()
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сохранения подписки на сервере');
            }
            
        } catch (error) {
            console.error('Ошибка обновления подписки:', error);
        }
    }

    // Удалить подписку с сервера
    async removeSubscriptionFromServer() {
        try {
            await fetch(`${this.serverUrl}/api/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: this.getUserId()
                })
            });
        } catch (error) {
            console.error('Ошибка удаления подписки:', error);
        }
    }

    // Показать тестовое уведомление
    showNotification(title, options = {}) {
        if (this.permission === 'granted') {
            new Notification(title, {
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                ...options
            });
        }
    }

    // Проверить статус подписки
    async checkSubscription() {
        if (!this.isSupported) return false;
        
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            return subscription !== null;
        } catch (error) {
            console.error('Ошибка проверки подписки:', error);
            return false;
        }
    }

    // Получить настройки уведомлений
    async getNotificationSettings() {
        try {
            const response = await fetch(`${this.serverUrl}/api/notifications/settings`, {
                headers: {
                    'X-User-Id': this.getUserId()
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
            
            return null;
        } catch (error) {
            console.error('Ошибка получения настроек:', error);
            return null;
        }
    }

    // Обновить настройки уведомлений
    async updateNotificationSettings(settings) {
        try {
            const response = await fetch(`${this.serverUrl}/api/notifications/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': this.getUserId()
                },
                body: JSON.stringify(settings)
            });
            
            return response.ok;
        } catch (error) {
            console.error('Ошибка обновления настроек:', error);
            return false;
        }
    }

    // Вспомогательные методы
    getUserId() {
        return localStorage.getItem('userName') || 'anonymous';
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }

    // UI для настроек уведомлений
    createSettingsUI() {
        const settingsHTML = `
            <div class="notification-settings">
                <h3>Настройки уведомлений</h3>
                
                <div class="setting-group">
                    <label class="toggle-switch">
                        <input type="checkbox" id="pushEnabled" ${this.permission === 'granted' ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                        <span class="toggle-label">Push-уведомления в браузере</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <h4>Типы уведомлений</h4>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="notifyNewRequest" checked>
                        <span>Новые заявки</span>
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="notifyStatusChange" checked>
                        <span>Изменения статусов</span>
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="notifyDeadline" checked>
                        <span>Приближающиеся сроки</span>
                    </label>
                    
                    <label class="checkbox-label">
                        <input type="checkbox" id="notifyOverdue" checked>
                        <span>Просроченные заявки</span>
                    </label>
                </div>
                
                <div class="setting-group">
                    <h4>Тихие часы</h4>
                    <div class="time-range">
                        <label>
                            С: <input type="time" id="quietStart" value="22:00">
                        </label>
                        <label>
                            До: <input type="time" id="quietEnd" value="08:00">
                        </label>
                    </div>
                </div>
                
                <button class="btn btn-primary" onclick="pushManager.saveSettings()">
                    Сохранить настройки
                </button>
            </div>
        `;
        
        return settingsHTML;
    }

    // Сохранить настройки
    async saveSettings() {
        const settings = {
            push_enabled: document.getElementById('pushEnabled').checked,
            notify_new_request: document.getElementById('notifyNewRequest').checked,
            notify_status_change: document.getElementById('notifyStatusChange').checked,
            notify_deadline: document.getElementById('notifyDeadline').checked,
            notify_overdue: document.getElementById('notifyOverdue').checked,
            quiet_hours_start: document.getElementById('quietStart').value,
            quiet_hours_end: document.getElementById('quietEnd').value
        };
        
        // Управление подпиской
        if (settings.push_enabled && this.permission !== 'granted') {
            await this.requestPermission();
        } else if (!settings.push_enabled && this.permission === 'granted') {
            await this.unsubscribeUser();
        }
        
        // Сохранение на сервере
        const saved = await this.updateNotificationSettings(settings);
        
        if (saved) {
            this.showNotification('Настройки сохранены', {
                body: 'Настройки уведомлений успешно обновлены'
            });
        }
    }
}

// Создаем глобальный экземпляр
const pushManager = new PushNotificationManager();

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    pushManager.init();
});
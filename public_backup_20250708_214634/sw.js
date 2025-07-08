// sw.js - Service Worker для обработки push-уведомлений

// Версия для обновления кэша
const CACHE_VERSION = 'v1';
const CACHE_NAME = `ndt-system-${CACHE_VERSION}`;

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker установлен');
    self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker активирован');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
    console.log('Push-уведомление получено');
    
    let data = {};
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = {
                title: 'Новое уведомление',
                body: event.data.text()
            };
        }
    }
    
    const options = {
        body: data.body || 'Проверьте систему управления заявками',
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/badge-72x72.png',
        vibrate: data.vibrate || [200, 100, 200],
        data: data.data || {},
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        actions: data.actions || [
            {
                action: 'open',
                title: 'Открыть',
                icon: '/icons/open.png'
            },
            {
                action: 'close',
                title: 'Закрыть',
                icon: '/icons/close.png'
            }
        ]
    };
    
    // Проверяем тихие часы
    if (shouldRespectQuietHours(data)) {
        const now = new Date();
        const hours = now.getHours();
        const quietStart = parseInt(data.quietStart || 22);
        const quietEnd = parseInt(data.quietEnd || 8);
        
        if ((quietStart > quietEnd && (hours >= quietStart || hours < quietEnd)) ||
            (quietStart < quietEnd && hours >= quietStart && hours < quietEnd)) {
            console.log('Уведомление отложено из-за тихих часов');
            return;
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Система управления заявками НК', options)
    );
});

// Обработка кликов по уведомлению
self.addEventListener('notificationclick', (event) => {
    console.log('Клик по уведомлению:', event.action);
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Проверяем, открыто ли уже приложение
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Переходим на нужную страницу
                    client.navigate(urlToOpen);
                    return client.focus();
                }
            }
            
            // Если приложение не открыто, открываем новое окно
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Закрытие уведомления
self.addEventListener('notificationclose', (event) => {
    console.log('Уведомление закрыто');
    
    // Можно отправить статистику на сервер
    if (event.notification.data.requestId) {
        fetch('/api/notifications/closed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notificationId: event.notification.tag,
                requestId: event.notification.data.requestId,
                timestamp: new Date().toISOString()
            })
        });
    }
});

// Синхронизация в фоне
self.addEventListener('sync', (event) => {
    console.log('Фоновая синхронизация:', event.tag);
    
    if (event.tag === 'sync-notifications') {
        event.waitUntil(syncNotifications());
    }
});

// Функция синхронизации уведомлений
async function syncNotifications() {
    try {
        const response = await fetch('/api/notifications/pending');
        const notifications = await response.json();
        
        for (const notification of notifications) {
            await self.registration.showNotification(notification.title, notification.options);
        }
    } catch (error) {
        console.error('Ошибка синхронизации уведомлений:', error);
    }
}

// Проверка тихих часов
function shouldRespectQuietHours(data) {
    // Критические уведомления игнорируют тихие часы
    if (data.priority === 'critical' || data.requireInteraction) {
        return false;
    }
    
    return data.respectQuietHours !== false;
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
    console.log('Сообщение от клиента:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'TEST_NOTIFICATION') {
        self.registration.showNotification('Тестовое уведомление', {
            body: 'Push-уведомления работают корректно!',
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png'
        });
    }
});
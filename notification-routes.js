// notification-routes.js - API маршруты для системы уведомлений

const express = require('express');
const router = express.Router();

module.exports = (db, notificationService) => {
    
    // Подписка на push-уведомления
    router.post('/push/subscribe', async (req, res) => {
        const { subscription, userId } = req.body;
        
        if (!subscription || !userId) {
            return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
        }
        
        try {
            // Сохраняем или обновляем подписку
            db.run(`
                INSERT OR REPLACE INTO push_subscriptions (user_id, subscription, is_active, updated_at)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
            `, [userId, JSON.stringify(subscription)], (err) => {
                if (err) {
                    console.error('Ошибка сохранения подписки:', err);
                    res.status(500).json({ error: 'Ошибка сохранения подписки' });
                } else {
                    res.json({ message: 'Подписка успешно сохранена' });
                }
            });
        } catch (error) {
            console.error('Ошибка:', error);
            res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
    });
    
    // Отписка от push-уведомлений
    router.post('/push/unsubscribe', async (req, res) => {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'Не указан userId' });
        }
        
        db.run(`
            UPDATE push_subscriptions 
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [userId], (err) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка отписки' });
            } else {
                res.json({ message: 'Отписка выполнена успешно' });
            }
        });
    });
    
    // Получение настроек уведомлений пользователя
    router.get('/settings', (req, res) => {
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
            return res.status(400).json({ error: 'Не указан userId' });
        }
        
        db.get(`
            SELECT * FROM user_notification_settings
            WHERE username = ?
        `, [userId], (err, row) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка получения настроек' });
            } else {
                if (!row) {
                    // Создаем настройки по умолчанию
                    db.run(`
                        INSERT INTO user_notification_settings (username)
                        VALUES (?)
                    `, [userId], (err) => {
                        if (err) {
                            res.status(500).json({ error: 'Ошибка создания настроек' });
                        } else {
                            // Возвращаем настройки по умолчанию
                            res.json({
                                username: userId,
                                email_enabled: true,
                                push_enabled: true,
                                notify_new_request: true,
                                notify_status_change: true,
                                notify_deadline: true,
                                notify_overdue: true,
                                notify_daily_summary: true
                            });
                        }
                    });
                } else {
                    res.json(row);
                }
            }
        });
    });
    
    // Обновление настроек уведомлений
    router.put('/settings', (req, res) => {
        const userId = req.headers['x-user-id'];
        const settings = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'Не указан userId' });
        }
        
        const fields = [];
        const values = [];
        
        // Список разрешенных полей для обновления
        const allowedFields = [
            'email_enabled', 'push_enabled', 'notify_new_request',
            'notify_status_change', 'notify_deadline', 'notify_overdue',
            'notify_daily_summary', 'quiet_hours_start', 'quiet_hours_end'
        ];
        
        allowedFields.forEach(field => {
            if (settings[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(settings[field]);
            }
        });
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'Нет полей для обновления' });
        }
        
        values.push(userId);
        
        db.run(`
            UPDATE user_notification_settings
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE username = ?
        `, values, (err) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка обновления настроек' });
            } else {
                res.json({ message: 'Настройки успешно обновлены' });
            }
        });
    });
    
    // Тестовое уведомление
    router.post('/test', async (req, res) => {
        const { userId, type } = req.body;
        
        try {
            if (type === 'email') {
                // Получаем email пользователя
                const user = await new Promise((resolve, reject) => {
                    db.get(`
                        SELECT email FROM executors 
                        WHERE short_name = ? OR full_name = ?
                    `, [userId, userId], (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    });
                });
                
                if (user && user.email) {
                    await notificationService.sendEmail(
                        user.email,
                        'Тестовое уведомление',
                        '<h2>Тестовое уведомление</h2><p>Система уведомлений работает корректно!</p>'
                    );
                    res.json({ message: 'Тестовое email отправлено' });
                } else {
                    res.status(404).json({ error: 'Email пользователя не найден' });
                }
                
            } else if (type === 'push') {
                // Получаем подписки пользователя
                const subscriptions = await notificationService.getPushSubscriptions([userId]);
                
                if (subscriptions.length > 0) {
                    const payload = {
                        title: 'Тестовое уведомление',
                        body: 'Push-уведомления работают корректно!',
                        icon: '/icon-192x192.png',
                        badge: '/badge-72x72.png'
                    };
                    
                    for (const sub of subscriptions) {
                        await notificationService.sendPushNotification(
                            JSON.parse(sub.subscription),
                            payload
                        );
                    }
                    
                    res.json({ message: 'Тестовое push-уведомление отправлено' });
                } else {
                    res.status(404).json({ error: 'Push-подписка не найдена' });
                }
            } else {
                res.status(400).json({ error: 'Неверный тип уведомления' });
            }
        } catch (error) {
            console.error('Ошибка отправки тестового уведомления:', error);
            res.status(500).json({ error: 'Ошибка отправки уведомления' });
        }
    });
    
    // Получение истории уведомлений
    router.get('/history', (req, res) => {
        const { requestId, type, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM notification_log WHERE 1=1';
        const params = [];
        
        if (requestId) {
            query += ' AND request_id = ?';
            params.push(requestId);
        }
        
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        
        query += ' ORDER BY timestamp DESC LIMIT ?';
        params.push(limit);
        
        db.all(query, params, (err, rows) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка получения истории' });
            } else {
                res.json(rows);
            }
        });
    });
    
    // Статистика уведомлений
    router.get('/stats', (req, res) => {
        const { period = 'day' } = req.query;
        
        let dateFilter = "date('now')";
        if (period === 'week') {
            dateFilter = "date('now', '-7 days')";
        } else if (period === 'month') {
            dateFilter = "date('now', '-30 days')";
        }
        
        db.all(`
            SELECT 
                type,
                COUNT(*) as total,
                SUM(email_sent) as email_sent,
                SUM(push_sent) as push_sent,
                SUM(sms_sent) as sms_sent
            FROM notification_log
            WHERE date(timestamp) >= ${dateFilter}
            GROUP BY type
        `, (err, rows) => {
            if (err) {
                res.status(500).json({ error: 'Ошибка получения статистики' });
            } else {
                const stats = {
                    period: period,
                    byType: rows,
                    total: {
                        notifications: rows.reduce((sum, r) => sum + r.total, 0),
                        emails: rows.reduce((sum, r) => sum + r.email_sent, 0),
                        pushes: rows.reduce((sum, r) => sum + r.push_sent, 0),
                        sms: rows.reduce((sum, r) => sum + r.sms_sent, 0)
                    }
                };
                res.json(stats);
            }
        });
    });
    
    // Получение ожидающих уведомлений (для Service Worker)
    router.get('/pending', (req, res) => {
        // Здесь можно реализовать логику получения отложенных уведомлений
        // Например, уведомления, которые не были доставлены из-за офлайн режима
        res.json([]);
    });
    
    // Отметка о закрытии уведомления
    router.post('/closed', (req, res) => {
        const { notificationId, requestId, timestamp } = req.body;
        
        // Можно сохранять статистику о взаимодействии с уведомлениями
        console.log('Уведомление закрыто:', { notificationId, requestId, timestamp });
        
        res.json({ message: 'OK' });
    });
    
    // Массовая рассылка
    router.post('/broadcast', async (req, res) => {
        const { title, message, recipients, type } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({ error: 'Не указаны заголовок или сообщение' });
        }
        
        try {
            let recipientEmails = [];
            
            if (recipients === 'all') {
                recipientEmails = await notificationService.getUserEmails();
            } else if (Array.isArray(recipients)) {
                recipientEmails = recipients;
            } else if (typeof recipients === 'string') {
                recipientEmails = await notificationService.getUserEmails([recipients]);
            }
            
            const html = `
                <h2>${title}</h2>
                <div>${message}</div>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    Это сообщение отправлено из системы управления заявками НК
                </p>
            `;
            
            let sentCount = 0;
            
            for (const email of recipientEmails) {
                const sent = await notificationService.sendEmail(email, title, html);
                if (sent) sentCount++;
            }
            
            res.json({ 
                message: `Рассылка выполнена`,
                sent: sentCount,
                total: recipientEmails.length
            });
            
        } catch (error) {
            console.error('Ошибка массовой рассылки:', error);
            res.status(500).json({ error: 'Ошибка выполнения рассылки' });
        }
    });
    
    return router;
};
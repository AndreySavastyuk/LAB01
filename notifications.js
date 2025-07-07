// notifications.js - Модуль уведомлений и напоминаний
const nodemailer = require('nodemailer');
const webpush = require('web-push');
const cron = require('node-cron');
const EventEmitter = require('events');

class NotificationService extends EventEmitter {
    constructor(db, config) {
        super();
        this.db = db;
        this.config = config;
        this.transporter = null;
        this.initializeServices();
    }

    // Инициализация сервисов
    initializeServices() {
        // Настройка email
        if (this.config.email.enabled) {
            this.transporter = nodemailer.createTransport({
                host: this.config.email.host,
                port: this.config.email.port,
                secure: this.config.email.secure,
                auth: {
                    user: this.config.email.user,
                    pass: this.config.email.password
                }
            });

            // Проверка подключения
            this.transporter.verify((error, success) => {
                if (error) {
                    console.error('Ошибка настройки email:', error);
                } else {
                    console.log('Email сервис готов к работе');
                }
            });
        }

        // Настройка Web Push
        if (this.config.webPush.enabled) {
            webpush.setVapidDetails(
                this.config.webPush.subject,
                this.config.webPush.publicKey,
                this.config.webPush.privateKey
            );
        }

        // Запуск планировщика задач
        this.startScheduledTasks();
    }

    // Планировщик задач
    startScheduledTasks() {
        // Проверка дедлайнов каждый час
        cron.schedule('0 * * * *', () => {
            this.checkDeadlines();
        });

        // Утренняя сводка в 9:00
        cron.schedule('0 9 * * 1-5', () => {
            this.sendDailySummary();
        });

        // Проверка просроченных заявок каждые 30 минут
        cron.schedule('*/30 * * * *', () => {
            this.checkOverdueRequests();
        });

        console.log('Планировщик задач запущен');
    }

    // Отправка email
    async sendEmail(to, subject, html, attachments = []) {
        if (!this.config.email.enabled || !this.transporter) {
            console.log('Email отключен или не настроен');
            return false;
        }

        try {
            const info = await this.transporter.sendMail({
                from: this.config.email.from,
                to: to,
                subject: subject,
                html: html,
                attachments: attachments
            });

            console.log('Email отправлен:', info.messageId);
            return true;
        } catch (error) {
            console.error('Ошибка отправки email:', error);
            return false;
        }
    }

    // Отправка push-уведомления
    async sendPushNotification(subscription, payload) {
        if (!this.config.webPush.enabled) {
            return false;
        }

        try {
            await webpush.sendNotification(subscription, JSON.stringify(payload));
            return true;
        } catch (error) {
            console.error('Ошибка отправки push:', error);
            return false;
        }
    }

    // Получение email пользователей
    async getUserEmails(roles = []) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT DISTINCT email FROM executors WHERE email IS NOT NULL AND is_active = 1';
            
            if (roles.length > 0) {
                // Если нужно фильтровать по ролям, добавить JOIN с user_permissions
                query = `
                    SELECT DISTINCT e.email 
                    FROM executors e
                    JOIN user_permissions up ON e.short_name = up.username
                    WHERE e.email IS NOT NULL 
                    AND e.is_active = 1 
                    AND up.role IN (${roles.map(() => '?').join(',')})
                `;
            }

            this.db.all(query, roles, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(r => r.email));
                }
            });
        });
    }

    // Получение push-подписок
    async getPushSubscriptions(userIds = []) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM push_subscriptions WHERE is_active = 1';
            
            if (userIds.length > 0) {
                query += ` AND user_id IN (${userIds.map(() => '?').join(',')})`;
            }

            this.db.all(query, userIds, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Уведомление о новой заявке
    async notifyNewRequest(requestId) {
        const request = await this.getRequestDetails(requestId);
        if (!request) return;

        const subject = `Новая заявка №${request.request_number}`;
        const html = `
            <h2>Создана новая заявка на неразрушающий контроль</h2>
            <table style="border-collapse: collapse; width: 100%;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Номер заявки:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.request_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Заказ:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.order_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Деталь:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.drawing}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Тип контроля:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.control_type_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Исполнитель:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.executor_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Приоритет:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${this.getPriorityName(request.priority)}</td>
                </tr>
                ${request.deadline ? `
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Срок выполнения:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${new Date(request.deadline).toLocaleDateString('ru-RU')}</td>
                </tr>
                ` : ''}
            </table>
            <p style="margin-top: 20px;">
                <a href="${this.config.appUrl}/requests/${requestId}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    Открыть заявку
                </a>
            </p>
        `;

        // Email уведомления
        const emails = await this.getUserEmails(['admin', 'manager']);
        
        // Добавляем email исполнителя
        if (request.executor_email) {
            emails.push(request.executor_email);
        }

        for (const email of emails) {
            await this.sendEmail(email, subject, html);
        }

        // Push уведомления
        const pushPayload = {
            title: subject,
            body: `${request.order_number} - ${request.drawing}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            data: {
                requestId: requestId,
                url: `/requests/${requestId}`
            }
        };

        const subscriptions = await this.getPushSubscriptions();
        for (const sub of subscriptions) {
            await this.sendPushNotification(JSON.parse(sub.subscription), pushPayload);
        }

        // Записываем в историю уведомлений
        this.logNotification('new_request', requestId, emails.length, subscriptions.length);
    }

    // Уведомление об изменении статуса
    async notifyStatusChange(requestId, oldStatusId, newStatusId, userId) {
        const request = await this.getRequestDetails(requestId);
        if (!request) return;

        const oldStatus = await this.getStatusById(oldStatusId);
        const newStatus = await this.getStatusById(newStatusId);

        const subject = `Изменен статус заявки №${request.request_number}`;
        const html = `
            <h2>Изменен статус заявки</h2>
            <p><strong>Заявка №${request.request_number}</strong></p>
            <p>${request.order_number} - ${request.drawing}</p>
            
            <table style="margin: 20px 0;">
                <tr>
                    <td style="padding: 10px; background-color: ${oldStatus.color}20; border: 1px solid ${oldStatus.color};">
                        <strong>Было:</strong> ${oldStatus.icon} ${oldStatus.name}
                    </td>
                    <td style="padding: 0 20px;">→</td>
                    <td style="padding: 10px; background-color: ${newStatus.color}20; border: 1px solid ${newStatus.color};">
                        <strong>Стало:</strong> ${newStatus.icon} ${newStatus.name}
                    </td>
                </tr>
            </table>
            
            <p><strong>Изменил:</strong> ${userId}</p>
            <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
            
            <p style="margin-top: 20px;">
                <a href="${this.config.appUrl}/requests/${requestId}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    Открыть заявку
                </a>
            </p>
        `;

        // Определяем получателей
        const recipients = new Set();
        
        // Исполнитель заявки
        if (request.executor_email) {
            recipients.add(request.executor_email);
        }

        // Менеджеры при критических изменениях
        if (newStatus.code === 'correction_required' || newStatus.code === 'cancelled') {
            const managerEmails = await this.getUserEmails(['admin', 'manager']);
            managerEmails.forEach(email => recipients.add(email));
        }

        // Отправляем email
        for (const email of recipients) {
            await this.sendEmail(email, subject, html);
        }

        // Push уведомления
        const pushPayload = {
            title: subject,
            body: `${oldStatus.name} → ${newStatus.name}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `status-${requestId}`,
            data: {
                requestId: requestId,
                url: `/requests/${requestId}`
            }
        };

        const subscriptions = await this.getPushSubscriptions();
        for (const sub of subscriptions) {
            await this.sendPushNotification(JSON.parse(sub.subscription), pushPayload);
        }
    }

    // Проверка приближающихся дедлайнов
    async checkDeadlines() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const threeDays = new Date();
        threeDays.setDate(threeDays.getDate() + 3);

        // Заявки с дедлайном завтра
        this.db.all(`
            SELECT r.*, s.name as status_name, e.email as executor_email, e.full_name as executor_name
            FROM requests_v2 r
            JOIN statuses s ON r.status_id = s.id
            LEFT JOIN executors e ON r.executor_id = e.id
            WHERE date(r.deadline) = date(?)
            AND s.is_final = 0
            AND r.id NOT IN (
                SELECT request_id FROM reminders 
                WHERE reminder_type = 'deadline_tomorrow' 
                AND date(created_at) = date('now')
            )
        `, [tomorrow.toISOString()], async (err, rows) => {
            if (err) return;

            for (const request of rows) {
                await this.sendDeadlineReminder(request, 'tomorrow');
            }
        });

        // Заявки с дедлайном через 3 дня
        this.db.all(`
            SELECT r.*, s.name as status_name, e.email as executor_email, e.full_name as executor_name
            FROM requests_v2 r
            JOIN statuses s ON r.status_id = s.id
            LEFT JOIN executors e ON r.executor_id = e.id
            WHERE date(r.deadline) = date(?)
            AND s.is_final = 0
            AND r.id NOT IN (
                SELECT request_id FROM reminders 
                WHERE reminder_type = 'deadline_3days' 
                AND date(created_at) = date('now')
            )
        `, [threeDays.toISOString()], async (err, rows) => {
            if (err) return;

            for (const request of rows) {
                await this.sendDeadlineReminder(request, '3days');
            }
        });
    }

    // Отправка напоминания о дедлайне
    async sendDeadlineReminder(request, type) {
        const daysText = type === 'tomorrow' ? 'завтра' : 'через 3 дня';
        const urgency = type === 'tomorrow' ? 'СРОЧНО! ' : '';
        
        const subject = `${urgency}Срок выполнения заявки №${request.request_number} - ${daysText}`;
        const html = `
            <h2 style="color: ${type === 'tomorrow' ? '#f44336' : '#ff9800'};">
                ${urgency}Приближается срок выполнения заявки
            </h2>
            
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Номер заявки:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.request_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Заказ:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.order_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Деталь:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.drawing}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Срок выполнения:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: ${type === 'tomorrow' ? '#f44336' : '#ff9800'};">
                        <strong>${new Date(request.deadline).toLocaleDateString('ru-RU')}</strong>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Текущий статус:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.status_name}</td>
                </tr>
            </table>
            
            <p style="margin-top: 20px;">
                <a href="${this.config.appUrl}/requests/${request.id}" style="background-color: ${type === 'tomorrow' ? '#f44336' : '#ff9800'}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    Открыть заявку
                </a>
            </p>
        `;

        // Отправляем исполнителю
        if (request.executor_email) {
            await this.sendEmail(request.executor_email, subject, html);
        }

        // Отправляем менеджерам для срочных
        if (type === 'tomorrow') {
            const managerEmails = await this.getUserEmails(['admin', 'manager']);
            for (const email of managerEmails) {
                await this.sendEmail(email, subject, html);
            }
        }

        // Push уведомление
        const pushPayload = {
            title: subject,
            body: `${request.order_number} - ${request.drawing}`,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: `deadline-${request.id}`,
            requireInteraction: type === 'tomorrow',
            data: {
                requestId: request.id,
                url: `/requests/${request.id}`
            }
        };

        const subscriptions = await this.getPushSubscriptions();
        for (const sub of subscriptions) {
            await this.sendPushNotification(JSON.parse(sub.subscription), pushPayload);
        }

        // Записываем отправку напоминания
        this.db.run(`
            INSERT INTO reminders (request_id, reminder_type, reminder_text, is_sent, sent_at)
            VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
        `, [request.id, `deadline_${type}`, `Напоминание о сроке - ${daysText}`]);
    }

    // Проверка просроченных заявок
    async checkOverdueRequests() {
        this.db.all(`
            SELECT r.*, s.name as status_name, e.email as executor_email, e.full_name as executor_name,
                   julianday('now') - julianday(r.deadline) as days_overdue
            FROM requests_v2 r
            JOIN statuses s ON r.status_id = s.id
            LEFT JOIN executors e ON r.executor_id = e.id
            WHERE date(r.deadline) < date('now')
            AND s.is_final = 0
            AND r.id NOT IN (
                SELECT request_id FROM reminders 
                WHERE reminder_type = 'overdue' 
                AND date(created_at) = date('now')
            )
        `, async (err, rows) => {
            if (err) return;

            for (const request of rows) {
                await this.sendOverdueNotification(request);
            }
        });
    }

    // Уведомление о просроченной заявке
    async sendOverdueNotification(request) {
        const daysOverdue = Math.floor(request.days_overdue);
        
        const subject = `⚠️ ПРОСРОЧЕНА заявка №${request.request_number} (${daysOverdue} дн.)`;
        const html = `
            <h2 style="color: #f44336;">⚠️ Заявка просрочена на ${daysOverdue} ${this.getDaysWord(daysOverdue)}</h2>
            
            <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
                <tr style="background-color: #ffebee;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Номер заявки:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.request_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Заказ:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.order_number}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Деталь:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.drawing}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Срок был:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #f44336;">
                        <strong>${new Date(request.deadline).toLocaleDateString('ru-RU')}</strong>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Просрочено на:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #f44336;">
                        <strong>${daysOverdue} ${this.getDaysWord(daysOverdue)}</strong>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Исполнитель:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.executor_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Текущий статус:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${request.status_name}</td>
                </tr>
            </table>
            
            <p style="background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336;">
                <strong>Требуется срочное вмешательство!</strong><br>
                Необходимо принять меры по выполнению заявки или обновить сроки.
            </p>
            
            <p style="margin-top: 20px;">
                <a href="${this.config.appUrl}/requests/${request.id}" style="background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    Открыть заявку
                </a>
            </p>
        `;

        // Отправляем всем заинтересованным
        const recipients = new Set();
        
        if (request.executor_email) {
            recipients.add(request.executor_email);
        }
        
        const managerEmails = await this.getUserEmails(['admin', 'manager']);
        managerEmails.forEach(email => recipients.add(email));

        for (const email of recipients) {
            await this.sendEmail(email, subject, html);
        }

        // Записываем отправку
        this.db.run(`
            INSERT INTO reminders (request_id, reminder_type, reminder_text, is_sent, sent_at)
            VALUES (?, 'overdue', ?, 1, CURRENT_TIMESTAMP)
        `, [request.id, `Уведомление о просрочке на ${daysOverdue} дней`]);
    }

    // Ежедневная сводка
    async sendDailySummary() {
        const stats = await this.getDailyStats();
        
        const subject = `Ежедневная сводка по заявкам НК - ${new Date().toLocaleDateString('ru-RU')}`;
        const html = `
            <h2>Ежедневная сводка по системе управления заявками НК</h2>
            <p><strong>Дата:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>
            
            <h3>Общая статистика</h3>
            <table style="border-collapse: collapse; width: 100%;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Всего активных заявок:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${stats.active}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Новых за вчера:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${stats.newYesterday}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Завершено за вчера:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${stats.completedYesterday}</td>
                </tr>
                <tr style="background-color: #ffebee;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Просрочено:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #f44336;"><strong>${stats.overdue}</strong></td>
                </tr>
                <tr style="background-color: #fff3e0;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Срок сегодня:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd; color: #ff9800;"><strong>${stats.dueToday}</strong></td>
                </tr>
            </table>
            
            ${stats.overdueRequests.length > 0 ? `
                <h3 style="color: #f44336; margin-top: 30px;">⚠️ Просроченные заявки</h3>
                <table style="border-collapse: collapse; width: 100%;">
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Номер</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Заказ</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Исполнитель</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Просрочено</th>
                    </tr>
                    ${stats.overdueRequests.map(r => `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">${r.request_number}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${r.order_number}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${r.executor_name}</td>
                            <td style="padding: 8px; border: 1px solid #ddd; color: #f44336;">${r.days_overdue} дн.</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
            
            ${stats.dueTodayRequests.length > 0 ? `
                <h3 style="color: #ff9800; margin-top: 30px;">📅 Заявки со сроком сегодня</h3>
                <table style="border-collapse: collapse; width: 100%;">
                    <tr style="background-color: #f5f5f5;">
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Номер</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Заказ</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Исполнитель</th>
                        <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Статус</th>
                    </tr>
                    ${stats.dueTodayRequests.map(r => `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd;">${r.request_number}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${r.order_number}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${r.executor_name}</td>
                            <td style="padding: 8px; border: 1px solid #ddd;">${r.status_name}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
            
            <p style="margin-top: 30px;">
                <a href="${this.config.appUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    Открыть систему
                </a>
            </p>
        `;

        // Отправляем менеджерам и админам
        const emails = await this.getUserEmails(['admin', 'manager']);
        for (const email of emails) {
            await this.sendEmail(email, subject, html);
        }
    }

    // Вспомогательные методы
    async getRequestDetails(requestId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT r.*, 
                       s.name as status_name,
                       ct.name as control_type_name,
                       e.full_name as executor_name,
                       e.email as executor_email
                FROM requests_v2 r
                LEFT JOIN statuses s ON r.status_id = s.id
                LEFT JOIN control_types ct ON r.control_type_id = ct.id
                LEFT JOIN executors e ON r.executor_id = e.id
                WHERE r.id = ?
            `, [requestId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getStatusById(statusId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM statuses WHERE id = ?', [statusId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async getDailyStats() {
        return new Promise((resolve, reject) => {
            const stats = {};
            
            // Активные заявки
            this.db.get(`
                SELECT COUNT(*) as count
                FROM requests_v2 r
                JOIN statuses s ON r.status_id = s.id
                WHERE s.is_final = 0
            `, (err, row) => {
                stats.active = row.count;
                
                // Новые за вчера
                this.db.get(`
                    SELECT COUNT(*) as count
                    FROM requests_v2
                    WHERE date(created_at) = date('now', '-1 day')
                `, (err, row) => {
                    stats.newYesterday = row.count;
                    
                    // Завершенные за вчера
                    this.db.get(`
                        SELECT COUNT(*) as count
                        FROM requests_v2 r
                        JOIN statuses s ON r.status_id = s.id
                        WHERE s.code = 'completed'
                        AND date(r.updated_at) = date('now', '-1 day')
                    `, (err, row) => {
                        stats.completedYesterday = row.count;
                        
                        // Просроченные
                        this.db.all(`
                            SELECT r.*, e.full_name as executor_name,
                                   julianday('now') - julianday(r.deadline) as days_overdue
                            FROM requests_v2 r
                            JOIN statuses s ON r.status_id = s.id
                            LEFT JOIN executors e ON r.executor_id = e.id
                            WHERE date(r.deadline) < date('now')
                            AND s.is_final = 0
                            ORDER BY days_overdue DESC
                            LIMIT 10
                        `, (err, rows) => {
                            stats.overdue = rows.length;
                            stats.overdueRequests = rows;
                            
                            // Срок сегодня
                            this.db.all(`
                                SELECT r.*, s.name as status_name, e.full_name as executor_name
                                FROM requests_v2 r
                                JOIN statuses s ON r.status_id = s.id
                                LEFT JOIN executors e ON r.executor_id = e.id
                                WHERE date(r.deadline) = date('now')
                                AND s.is_final = 0
                            `, (err, rows) => {
                                stats.dueToday = rows.length;
                                stats.dueTodayRequests = rows;
                                
                                resolve(stats);
                            });
                        });
                    });
                });
            });
        });
    }

    getPriorityName(priority) {
        const priorities = {
            1: 'Высокий',
            2: 'Средний',
            3: 'Низкий'
        };
        return priorities[priority] || 'Средний';
    }

    getDaysWord(days) {
        const lastDigit = days % 10;
        const lastTwoDigits = days % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return 'дней';
        }
        
        if (lastDigit === 1) {
            return 'день';
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            return 'дня';
        } else {
            return 'дней';
        }
    }

    logNotification(type, requestId, emailCount, pushCount) {
        this.db.run(`
            INSERT INTO notification_log (type, request_id, email_sent, push_sent, timestamp)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [type, requestId, emailCount, pushCount]);
    }
}

module.exports = NotificationService;
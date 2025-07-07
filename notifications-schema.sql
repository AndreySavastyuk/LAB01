-- notifications-schema.sql - Дополнительные таблицы для системы уведомлений

-- Таблица push-подписок
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    subscription TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subscription)
);

-- Расширенная таблица напоминаний
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    reminder_type TEXT NOT NULL, -- deadline_tomorrow, deadline_3days, overdue, custom
    reminder_date DATETIME,
    reminder_text TEXT,
    recipient TEXT,
    is_sent BOOLEAN DEFAULT 0,
    sent_at DATETIME,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests_v2(id)
);

-- Журнал отправленных уведомлений
CREATE TABLE IF NOT EXISTS notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- new_request, status_change, deadline, overdue, daily_summary
    request_id INTEGER,
    email_sent INTEGER DEFAULT 0,
    push_sent INTEGER DEFAULT 0,
    sms_sent INTEGER DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (request_id) REFERENCES requests_v2(id)
);

-- Настройки уведомлений пользователей
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email_enabled BOOLEAN DEFAULT 1,
    push_enabled BOOLEAN DEFAULT 1,
    notify_new_request BOOLEAN DEFAULT 1,
    notify_status_change BOOLEAN DEFAULT 1,
    notify_deadline BOOLEAN DEFAULT 1,
    notify_overdue BOOLEAN DEFAULT 1,
    notify_daily_summary BOOLEAN DEFAULT 1,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Шаблоны email уведомлений
CREATE TABLE IF NOT EXISTS email_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_key TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    variables TEXT, -- JSON список переменных
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Вставка базовых настроек уведомлений
INSERT OR IGNORE INTO user_notification_settings (username) 
SELECT DISTINCT username FROM user_permissions;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_request ON reminders(request_id);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(type);
CREATE INDEX IF NOT EXISTS idx_notification_log_timestamp ON notification_log(timestamp);
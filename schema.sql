-- schema.sql - Улучшенная схема базы данных для системы управления заявками НК

-- 1. Таблица статусов (справочник)
CREATE TABLE IF NOT EXISTS statuses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    is_final BOOLEAN DEFAULT 0,
    allowed_transitions TEXT
);

-- Заполнение статусов
INSERT OR IGNORE INTO statuses (code, name, color, icon, sort_order, is_final, allowed_transitions) VALUES
('draft', 'Черновик', '#9e9e9e', '📝', 1, 0, '["new", "cancelled"]'),
('new', 'Новая', '#2196f3', '🆕', 2, 0, '["in_progress", "cancelled"]'),
('in_progress', 'В работе', '#ff9800', '🔄', 3, 0, '["testing", "on_hold", "cancelled"]'),
('testing', 'На контроле', '#9c27b0', '🔬', 4, 0, '["completed", "correction_required", "in_progress"]'),
('correction_required', 'Требует корректировки', '#f44336', '⚠️', 5, 0, '["in_progress", "testing"]'),
('on_hold', 'Приостановлена', '#607d8b', '⏸️', 6, 0, '["in_progress", "cancelled"]'),
('completed', 'Завершена', '#4caf50', '✅', 7, 1, '["archived"]'),
('cancelled', 'Отменена', '#795548', '❌', 8, 1, '["archived"]'),
('archived', 'В архиве', '#424242', '📦', 9, 1, '[]');

-- 2. Таблица типов контроля (справочник)
CREATE TABLE IF NOT EXISTS control_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT 1
);

INSERT OR IGNORE INTO control_types (code, name, full_name) VALUES
('УЗК', 'УЗК', 'Ультразвуковой контроль'),
('ЦД', 'ЦД', 'Цветная дефектоскопия'),
('РК', 'РК', 'Радиографический контроль'),
('ТО', 'ТО', 'Термообработка'),
('НК', 'НК', 'Неразрушающий контроль'),
('ВИК', 'ВИК', 'Визуально-измерительный контроль'),
('МК', 'МК', 'Магнитопорошковый контроль'),
('ПВК', 'ПВК', 'Капиллярный контроль');

-- 3. Таблица станций АЭС (справочник)
CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    code TEXT,
    country TEXT,
    is_active BOOLEAN DEFAULT 1
);

INSERT OR IGNORE INTO stations (name, code, country) VALUES
('Руппур', 'RNPP', 'Бангладеш'),
('Аккую', 'ANPP', 'Турция'),
('Нововоронежская', 'NVNPP', 'Россия'),
('Белорусская', 'BNPP', 'Беларусь'),
('Куданкулам', 'KNPP', 'Индия');

-- 4. Таблица исполнителей (справочник)
CREATE TABLE IF NOT EXISTS executors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    short_name TEXT,
    position TEXT,
    department TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT 1
);

INSERT OR IGNORE INTO executors (full_name, short_name, position, department) VALUES
('Матросова Елена Ивановна', 'Матросова', 'Инженер НК', 'Лаборатория НК'),
('Петров Сергей Александрович', 'Петров', 'Старший инженер НК', 'Лаборатория НК'),
('Иванов Михаил Петрович', 'Иванов', 'Инженер НК', 'Лаборатория НК');

-- 5. Таблица организаций (справочник)
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    full_name TEXT,
    inn TEXT,
    address TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT 1
);

INSERT OR IGNORE INTO organizations (name, full_name) VALUES
('Невиз', 'ООО "Невиз"'),
('Лентест', 'ООО "Лентест"'),
('Диатест', 'ЗАО "Диатест"');

-- 6. Основная таблица заявок (улучшенная)
CREATE TABLE IF NOT EXISTS requests_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_number TEXT UNIQUE,
    date DATE NOT NULL,
    order_number TEXT NOT NULL,
    drawing TEXT NOT NULL,
    certificate TEXT,
    material TEXT,
    quantity TEXT,
    operation INTEGER,
    station_id INTEGER,
    control_type_id INTEGER,
    executor_id INTEGER,
    organization_id INTEGER,
    status_id INTEGER DEFAULT 2,
    tech_requirements TEXT,
    surface_preparation TEXT,
    english_required BOOLEAN DEFAULT 0,
    control_date DATE,
    protocol_number TEXT,
    protocol_date DATE,
    defects_found TEXT,
    route_card_mark BOOLEAN DEFAULT 0,
    production_mark BOOLEAN DEFAULT 0,
    correction_letter_number TEXT,
    corrected_protocol_number TEXT,
    correction_completed BOOLEAN DEFAULT 0,
    notes TEXT,
    priority INTEGER DEFAULT 2,
    deadline DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    FOREIGN KEY (station_id) REFERENCES stations(id),
    FOREIGN KEY (control_type_id) REFERENCES control_types(id),
    FOREIGN KEY (executor_id) REFERENCES executors(id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id),
    FOREIGN KEY (status_id) REFERENCES statuses(id)
);

-- 7. Таблица файлов/документов
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    filename TEXT NOT NULL,
    original_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    file_path TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT,
    FOREIGN KEY (request_id) REFERENCES requests_v2(id)
);

-- 8. Таблица комментариев
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    comment_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    is_internal BOOLEAN DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES requests_v2(id)
);

-- 9. Таблица напоминаний/уведомлений
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    reminder_date DATETIME NOT NULL,
    reminder_text TEXT,
    recipient TEXT,
    is_sent BOOLEAN DEFAULT 0,
    sent_at DATETIME,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests_v2(id)
);

-- 10. Таблица шаблонов заявок
CREATE TABLE IF NOT EXISTS request_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT NOT NULL,
    order_number TEXT,
    drawing TEXT,
    material TEXT,
    station_id INTEGER,
    control_type_id INTEGER,
    tech_requirements TEXT,
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Расширенная таблица истории с детализацией
CREATE TABLE IF NOT EXISTS history_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    action_type TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user TEXT,
    user_ip TEXT,
    FOREIGN KEY (request_id) REFERENCES requests_v2(id)
);

-- 12. Таблица прав доступа
CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    can_create BOOLEAN DEFAULT 1,
    can_edit BOOLEAN DEFAULT 1,
    can_delete BOOLEAN DEFAULT 0,
    can_export BOOLEAN DEFAULT 1,
    can_view_all BOOLEAN DEFAULT 1,
    can_edit_closed BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1
);

-- 13. Настройки системы
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, description) VALUES
('auto_archive_days', '90', 'Дней до автоматической архивации'),
('request_number_format', 'НК-{YYYY}-{NNNN}', 'Формат номера заявки'),
('email_notifications', 'true', 'Включить email уведомления'),
('working_hours_start', '08:00', 'Начало рабочего дня'),
('working_hours_end', '17:00', 'Конец рабочего дня');

-- 14. Таблица блокировок (из старой схемы)
CREATE TABLE IF NOT EXISTS locks (
    request_id INTEGER PRIMARY KEY,
    locked_by TEXT,
    locked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests_v2(id)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests_v2(status_id);
CREATE INDEX IF NOT EXISTS idx_requests_date ON requests_v2(date);
CREATE INDEX IF NOT EXISTS idx_requests_executor ON requests_v2(executor_id);
CREATE INDEX IF NOT EXISTS idx_requests_station ON requests_v2(station_id);
CREATE INDEX IF NOT EXISTS idx_requests_priority ON requests_v2(priority);
CREATE INDEX IF NOT EXISTS idx_requests_deadline ON requests_v2(deadline);
CREATE INDEX IF NOT EXISTS idx_history_request ON history_v2(request_id);
CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(request_id);
CREATE INDEX IF NOT EXISTS idx_comments_request ON comments(request_id);

-- Триггер для автоматического номера заявки
CREATE TRIGGER IF NOT EXISTS generate_request_number 
AFTER INSERT ON requests_v2
WHEN NEW.request_number IS NULL
BEGIN
    UPDATE requests_v2 
    SET request_number = 'НК-' || strftime('%Y', 'now') || '-' || printf('%04d', NEW.id)
    WHERE id = NEW.id;
END;

-- Триггер для обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_timestamp 
AFTER UPDATE ON requests_v2
BEGIN
    UPDATE requests_v2 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
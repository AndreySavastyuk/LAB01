// server-v2.js - Серверное приложение с улучшенной схемой БД
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer'); // Для загрузки файлов

const app = express();
const PORT = 3000;

// Настройка загрузки файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Проверка и создание/обновление БД
const DB_FILE = './ndt_requests_v2.db';
const isNewDb = !fs.existsSync(DB_FILE);

// Создание подключения к БД
const db = new sqlite3.Database(DB_FILE);

// Функция для выполнения SQL из файла
function executeSqlFile(filename) {
    return new Promise((resolve, reject) => {
        const sql = fs.readFileSync(filename, 'utf8');
        
        // Разделяем SQL на отдельные команды
        const commands = sql.split(';').filter(cmd => cmd.trim());
        
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            let completed = 0;
            commands.forEach((command, index) => {
                if (command.trim()) {
                    db.run(command, (err) => {
                        if (err) {
                            console.error(`Ошибка в команде ${index}:`, err);
                            db.run('ROLLBACK');
                            reject(err);
                            return;
                        }
                        
                        completed++;
                        if (completed === commands.length) {
                            db.run('COMMIT', (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        }
                    });
                }
            });
        });
    });
}

// Инициализация БД
async function initializeDatabase() {
    if (isNewDb) {
        console.log('Создание новой базы данных...');
        
        // Создаем файл schema.sql с улучшенной схемой
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        
        db.serialize(() => {
            // Выполняем схему
            const statements = schema.split(';').filter(s => s.trim());
            statements.forEach(statement => {
                if (statement.trim()) {
                    db.run(statement, (err) => {
                        if (err) console.error('Ошибка создания схемы:', err);
                    });
                }
            });
        });
        
        console.log('База данных создана успешно!');
    } else {
        console.log('Проверка существующей базы данных...');
        
        // Проверяем, нужна ли миграция
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='requests_v2'", (err, row) => {
            if (!row) {
                console.log('Требуется миграция базы данных...');
                migrateDatabase();
            }
        });
    }
}

// Миграция данных из старой структуры в новую
function migrateDatabase() {
    console.log('Начинается миграция данных...');
    
    db.serialize(() => {
        // Сначала создаем новую структуру
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        const statements = schema.split(';').filter(s => s.trim());
        
        statements.forEach(statement => {
            if (statement.trim()) {
                db.run(statement, (err) => {
                    if (err && !err.message.includes('already exists')) {
                        console.error('Ошибка миграции:', err);
                    }
                });
            }
        });
        
        // Мигрируем данные из старой таблицы requests в новую requests_v2
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='requests'", (err, row) => {
            if (row) {
                console.log('Мигрируем данные из старой таблицы...');
                
                db.run(`
                    INSERT INTO requests_v2 (
                        date, order_number, drawing, certificate, material, 
                        quantity, operation, tech_requirements, notes, 
                        protocol_number, created_at, updated_at, created_by, updated_by
                    )
                    SELECT 
                        date, order_number, drawing, certificate, material,
                        quantity, operation, tech_requirements, notes,
                        protocol, created_at, updated_at, updated_by, updated_by
                    FROM requests
                `, (err) => {
                    if (err) {
                        console.error('Ошибка миграции данных:', err);
                    } else {
                        console.log('Миграция завершена успешно!');
                        
                        // Обновляем связи
                        updateMigratedData();
                    }
                });
            }
        });
    });
}

// Обновление связей после миграции
function updateMigratedData() {
    db.serialize(() => {
        // Обновляем станции
        db.run(`
            UPDATE requests_v2 
            SET station_id = (SELECT id FROM stations WHERE name = 
                (SELECT station FROM requests WHERE requests.id = requests_v2.id))
        `);
        
        // Обновляем типы контроля
        db.run(`
            UPDATE requests_v2 
            SET control_type_id = (SELECT id FROM control_types WHERE code = 
                (SELECT control_type FROM requests WHERE requests.id = requests_v2.id))
        `);
        
        // Обновляем исполнителей
        db.run(`
            UPDATE requests_v2 
            SET executor_id = (SELECT id FROM executors WHERE short_name = 
                (SELECT executor FROM requests WHERE requests.id = requests_v2.id))
        `);
        
        // Обновляем статусы
        db.run(`
            UPDATE requests_v2 
            SET status_id = CASE 
                WHEN (SELECT status FROM requests WHERE requests.id = requests_v2.id) = 'new' THEN 2
                WHEN (SELECT status FROM requests WHERE requests.id = requests_v2.id) = 'in-progress' THEN 3
                WHEN (SELECT status FROM requests WHERE requests.id = requests_v2.id) = 'completed' THEN 7
                WHEN (SELECT status FROM requests WHERE requests.id = requests_v2.id) = 'correction' THEN 5
                ELSE 2
            END
        `);
    });
}

// API endpoints

// Получение справочников
app.get('/api/dictionaries', (req, res) => {
    const result = {};
    
    db.serialize(() => {
        // Статусы
        db.all('SELECT * FROM statuses WHERE is_active = 1 ORDER BY sort_order', (err, rows) => {
            result.statuses = rows;
            
            // Типы контроля
            db.all('SELECT * FROM control_types WHERE is_active = 1 ORDER BY code', (err, rows) => {
                result.controlTypes = rows;
                
                // Станции
                db.all('SELECT * FROM stations WHERE is_active = 1 ORDER BY name', (err, rows) => {
                    result.stations = rows;
                    
                    // Исполнители
                    db.all('SELECT * FROM executors WHERE is_active = 1 ORDER BY full_name', (err, rows) => {
                        result.executors = rows;
                        
                        // Организации
                        db.all('SELECT * FROM organizations WHERE is_active = 1 ORDER BY name', (err, rows) => {
                            result.organizations = rows;
                            res.json(result);
                        });
                    });
                });
            });
        });
    });
});

// Получение заявок с JOIN
app.get('/api/requests', (req, res) => {
    const { status_id, control_type_id, station_id, executor_id, priority } = req.query;
    
    let query = `
        SELECT 
            r.*,
            s.name as status_name,
            s.color as status_color,
            s.icon as status_icon,
            st.name as station_name,
            ct.name as control_type_name,
            ct.full_name as control_type_full,
            e.full_name as executor_name,
            o.name as organization_name,
            (SELECT COUNT(*) FROM documents WHERE request_id = r.id) as documents_count,
            (SELECT COUNT(*) FROM comments WHERE request_id = r.id) as comments_count
        FROM requests_v2 r
        LEFT JOIN statuses s ON r.status_id = s.id
        LEFT JOIN stations st ON r.station_id = st.id
        LEFT JOIN control_types ct ON r.control_type_id = ct.id
        LEFT JOIN executors e ON r.executor_id = e.id
        LEFT JOIN organizations o ON r.organization_id = o.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (status_id) {
        query += ' AND r.status_id = ?';
        params.push(status_id);
    }
    if (control_type_id) {
        query += ' AND r.control_type_id = ?';
        params.push(control_type_id);
    }
    if (station_id) {
        query += ' AND r.station_id = ?';
        params.push(station_id);
    }
    if (executor_id) {
        query += ' AND r.executor_id = ?';
        params.push(executor_id);
    }
    if (priority) {
        query += ' AND r.priority = ?';
        params.push(priority);
    }
    
    query += ' ORDER BY r.id DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получение одной заявки с полной информацией
app.get('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    
    const result = {};
    
    // Получаем основную информацию
    db.get(`
        SELECT 
            r.*,
            s.name as status_name,
            s.color as status_color,
            s.icon as status_icon,
            s.allowed_transitions,
            st.name as station_name,
            ct.name as control_type_name,
            e.full_name as executor_name,
            o.name as organization_name
        FROM requests_v2 r
        LEFT JOIN statuses s ON r.status_id = s.id
        LEFT JOIN stations st ON r.station_id = st.id
        LEFT JOIN control_types ct ON r.control_type_id = ct.id
        LEFT JOIN executors e ON r.executor_id = e.id
        LEFT JOIN organizations o ON r.organization_id = o.id
        WHERE r.id = ?
    `, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Заявка не найдена' });
            return;
        }
        
        result.request = row;
        
        // Получаем документы
        db.all('SELECT * FROM documents WHERE request_id = ? ORDER BY uploaded_at DESC', [id], (err, docs) => {
            result.documents = docs || [];
            
            // Получаем комментарии
            db.all('SELECT * FROM comments WHERE request_id = ? ORDER BY created_at DESC', [id], (err, comments) => {
                result.comments = comments || [];
                
                // Получаем историю
                db.all('SELECT * FROM history_v2 WHERE request_id = ? ORDER BY timestamp DESC LIMIT 50', [id], (err, history) => {
                    result.history = history || [];
                    
                    res.json(result);
                });
            });
        });
    });
});

// Создание заявки
app.post('/api/requests', (req, res) => {
    const data = req.body;
    
    const query = `
        INSERT INTO requests_v2 (
            date, order_number, drawing, certificate, material,
            quantity, operation, station_id, control_type_id, 
            executor_id, organization_id, status_id, tech_requirements,
            surface_preparation, english_required, notes, priority,
            deadline, created_by, updated_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
        data.date, data.order_number, data.drawing, data.certificate,
        data.material, data.quantity, data.operation, data.station_id,
        data.control_type_id, data.executor_id, data.organization_id,
        data.status_id || 2, data.tech_requirements, data.surface_preparation,
        data.english_required || 0, data.notes, data.priority || 2,
        data.deadline, data.user || 'Система', data.user || 'Система'
    ];
    
    db.run(query, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const requestId = this.lastID;
        
        // Записываем в историю
        db.run(`
            INSERT INTO history_v2 (request_id, action_type, user, comment)
            VALUES (?, 'CREATE', ?, 'Создана новая заявка')
        `, [requestId, data.user || 'Система']);
        
        res.json({ id: requestId, message: 'Заявка создана успешно' });
    });
});

// Обновление заявки
app.put('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const user = data.user || 'Система';
    
    // Сначала получаем текущие данные для истории
    db.get('SELECT * FROM requests_v2 WHERE id = ?', [id], (err, oldData) => {
        if (err || !oldData) {
            res.status(404).json({ error: 'Заявка не найдена' });
            return;
        }
        
        // Обновляем данные
        const updateFields = [];
        const params = [];
        const changes = [];
        
        // Список полей для обновления
        const fields = [
            'date', 'order_number', 'drawing', 'certificate', 'material',
            'quantity', 'operation', 'station_id', 'control_type_id',
            'executor_id', 'organization_id', 'status_id', 'tech_requirements',
            'surface_preparation', 'english_required', 'notes', 'priority',
            'deadline', 'control_date', 'protocol_number', 'protocol_date',
            'defects_found', 'route_card_mark', 'production_mark',
            'correction_letter_number', 'corrected_protocol_number',
            'correction_completed'
        ];
        
        fields.forEach(field => {
            if (data[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                params.push(data[field]);
                
                // Записываем изменения для истории
                if (oldData[field] !== data[field]) {
                    changes.push({
                        field: field,
                        old_value: oldData[field],
                        new_value: data[field]
                    });
                }
            }
        });
        
        if (updateFields.length === 0) {
            res.json({ message: 'Нечего обновлять' });
            return;
        }
        
        // Добавляем updated_by
        updateFields.push('updated_by = ?');
        params.push(user);
        
        params.push(id);
        
        const query = `UPDATE requests_v2 SET ${updateFields.join(', ')} WHERE id = ?`;
        
        db.run(query, params, (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Записываем изменения в историю
            changes.forEach(change => {
                db.run(`
                    INSERT INTO history_v2 (request_id, action_type, field_name, 
                                          old_value, new_value, user)
                    VALUES (?, 'UPDATE', ?, ?, ?, ?)
                `, [id, change.field, change.old_value, change.new_value, user]);
            });
            
            // Особая запись для изменения статуса
            if (data.status_id && oldData.status_id !== data.status_id) {
                db.run(`
                    INSERT INTO history_v2 (request_id, action_type, comment, user)
                    VALUES (?, 'STATUS_CHANGE', ?, ?)
                `, [id, `Статус изменен с ${oldData.status_id} на ${data.status_id}`, user]);
            }
            
            res.json({ message: 'Заявка обновлена успешно' });
        });
    });
});

// Добавление комментария
app.post('/api/requests/:id/comments', (req, res) => {
    const { id } = req.params;
    const { comment_text, user, is_internal } = req.body;
    
    db.run(`
        INSERT INTO comments (request_id, comment_text, created_by, is_internal)
        VALUES (?, ?, ?, ?)
    `, [id, comment_text, user || 'Система', is_internal || 0], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Добавляем в историю
        db.run(`
            INSERT INTO history_v2 (request_id, action_type, comment, user)
            VALUES (?, 'COMMENT', ?, ?)
        `, [id, 'Добавлен комментарий', user || 'Система']);
        
        res.json({ id: this.lastID, message: 'Комментарий добавлен' });
    });
});

// Загрузка документа
app.post('/api/requests/:id/documents', upload.single('file'), (req, res) => {
    const { id } = req.params;
    const { user } = req.body;
    const file = req.file;
    
    if (!file) {
        res.status(400).json({ error: 'Файл не загружен' });
        return;
    }
    
    db.run(`
        INSERT INTO documents (request_id, filename, original_name, 
                             file_type, file_size, file_path, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        id, file.filename, file.originalname, 
        file.mimetype, file.size, file.path, user || 'Система'
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Добавляем в историю
        db.run(`
            INSERT INTO history_v2 (request_id, action_type, comment, user)
            VALUES (?, 'FILE_UPLOAD', ?, ?)
        `, [id, `Загружен файл: ${file.originalname}`, user || 'Система']);
        
        res.json({ 
            id: this.lastID, 
            message: 'Документ загружен',
            filename: file.filename 
        });
    });
});

// Получение статистики
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    db.serialize(() => {
        // Общая статистика
        db.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN s.code IN ('new', 'in_progress', 'testing') THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN s.code = 'completed' AND r.created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as completed_month,
                SUM(CASE WHEN s.code = 'correction_required' THEN 1 ELSE 0 END) as corrections,
                SUM(CASE WHEN r.deadline < date('now') AND s.code NOT IN ('completed', 'cancelled', 'archived') THEN 1 ELSE 0 END) as overdue
            FROM requests_v2 r
            JOIN statuses s ON r.status_id = s.id
            WHERE s.code != 'archived'
        `, (err, row) => {
            Object.assign(stats, row);
            
            // По статусам
            db.all(`
                SELECT s.name, s.color, s.icon, COUNT(r.id) as count
                FROM statuses s
                LEFT JOIN requests_v2 r ON r.status_id = s.id
                WHERE s.is_active = 1
                GROUP BY s.id
                ORDER BY s.sort_order
            `, (err, rows) => {
                stats.byStatus = rows;
                
                // По типам контроля
                db.all(`
                    SELECT ct.name, ct.code, COUNT(r.id) as count
                    FROM control_types ct
                    LEFT JOIN requests_v2 r ON r.control_type_id = ct.id
                    WHERE ct.is_active = 1
                    GROUP BY ct.id
                    ORDER BY ct.code
                `, (err, rows) => {
                    stats.byControlType = rows;
                    
                    // По исполнителям
                    db.all(`
                        SELECT e.full_name, e.short_name, COUNT(r.id) as count,
                               SUM(CASE WHEN s.code = 'completed' THEN 1 ELSE 0 END) as completed
                        FROM executors e
                        LEFT JOIN requests_v2 r ON r.executor_id = e.id
                        LEFT JOIN statuses s ON r.status_id = s.id
                        WHERE e.is_active = 1
                        GROUP BY e.id
                        ORDER BY count DESC
                    `, (err, rows) => {
                        stats.byExecutor = rows;
                        
                        // По приоритетам
                        db.all(`
                            SELECT 
                                CASE priority 
                                    WHEN 1 THEN 'Высокий'
                                    WHEN 2 THEN 'Средний'
                                    WHEN 3 THEN 'Низкий'
                                END as priority_name,
                                priority,
                                COUNT(*) as count
                            FROM requests_v2 r
                            JOIN statuses s ON r.status_id = s.id
                            WHERE s.code != 'archived'
                            GROUP BY priority
                            ORDER BY priority
                        `, (err, rows) => {
                            stats.byPriority = rows;
                            res.json(stats);
                        });
                    });
                });
            });
        });
    });
});

// Получение разрешенных переходов статусов
app.get('/api/requests/:id/allowed-transitions', (req, res) => {
    const { id } = req.params;
    
    db.get(`
        SELECT s.allowed_transitions 
        FROM requests_v2 r
        JOIN statuses s ON r.status_id = s.id
        WHERE r.id = ?
    `, [id], (err, row) => {
        if (err || !row) {
            res.status(404).json({ error: 'Заявка не найдена' });
            return;
        }
        
        const allowedCodes = JSON.parse(row.allowed_transitions || '[]');
        
        db.all(`
            SELECT id, code, name, color, icon 
            FROM statuses 
            WHERE code IN (${allowedCodes.map(() => '?').join(',')})
            ORDER BY sort_order
        `, allowedCodes, (err, rows) => {
            res.json(rows || []);
        });
    });
});

// Создание шаблона
app.post('/api/templates', (req, res) => {
    const data = req.body;
    
    db.run(`
        INSERT INTO request_templates (
            template_name, order_number, drawing, material,
            station_id, control_type_id, tech_requirements, 
            notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        data.template_name, data.order_number, data.drawing,
        data.material, data.station_id, data.control_type_id,
        data.tech_requirements, data.notes, data.user || 'Система'
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Шаблон создан' });
    });
});

// Получение шаблонов
app.get('/api/templates', (req, res) => {
    db.all(`
        SELECT t.*, s.name as station_name, ct.name as control_type_name
        FROM request_templates t
        LEFT JOIN stations s ON t.station_id = s.id
        LEFT JOIN control_types ct ON t.control_type_id = ct.id
        ORDER BY t.template_name
    `, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Инициализация и запуск сервера
initializeDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Сервер запущен на http://localhost:${PORT}`);
        console.log(`Другие компьютеры в сети могут подключиться по адресу http://ВАШ_IP:${PORT}`);
    });
}).catch(err => {
    console.error('Ошибка инициализации БД:', err);
});

// Обработка graceful shutdown
process.on('SIGINT', () => {
    console.log('\nЗавершение работы сервера...');
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('База данных закрыта.');
        process.exit(0);
    });
});
// main.js - Основной JavaScript для главной страницы LAB01

// Глобальные переменные для хранения данных словарей
let dictionaries = {};
let requestsData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('LAB01 - Инициализация интерфейса...');
    
    // Последовательная инициализация
    initializeAPI()
        .then(() => {
            initializeButtons();
            initializeForms();
            initializeNotifications();
            loadRecentRequests();
            initializeStatistics();
            console.log('LAB01 - Интерфейс готов к работе');
        })
        .catch(error => {
            console.error('Ошибка инициализации:', error);
            showMessage('Ошибка загрузки данных', 'error');
        });
});

// Инициализация API и загрузка словарей
async function initializeAPI() {
    try {
        showMessage('Загрузка данных...', 'info');
        
        // Загружаем словари
        const response = await fetch('/api/dictionaries');
        if (response.ok) {
            dictionaries = await response.json();
            console.log('Словари загружены:', dictionaries);
            
            // Заполняем селекты после загрузки словарей
            populateSelects();
        } else {
            console.warn('Не удалось загрузить словари, используется статические данные');
            // Статические данные как fallback
            dictionaries = {
                controlTypes: [
                    { id: 1, code: 'УЗК', name: 'УЗК', full_name: 'Ультразвуковой контроль' },
                    { id: 2, code: 'ЦД', name: 'ЦД', full_name: 'Цветная дефектоскопия' },
                    { id: 3, code: 'РК', name: 'РК', full_name: 'Радиографический контроль' },
                    { id: 4, code: 'ТО', name: 'ТО', full_name: 'Термообработка' },
                    { id: 5, code: 'ВИК', name: 'ВИК', full_name: 'Визуально-измерительный контроль' }
                ],
                stations: [
                    { id: 1, name: 'Руппур' },
                    { id: 2, name: 'Аккую' },
                    { id: 3, name: 'Нововоронежская' },
                    { id: 4, name: 'Белорусская' }
                ]
            };
            populateSelects();
        }
    } catch (error) {
        console.error('Ошибка загрузки API:', error);
        throw error;
    }
}

// Заполнение селектов данными из словарей
function populateSelects() {
    // Заполняем селект типов контроля
    const controlTypeSelect = document.querySelector('select');
    if (controlTypeSelect && dictionaries.controlTypes) {
        // Очищаем существующие опции кроме первой
        const firstOption = controlTypeSelect.querySelector('option');
        controlTypeSelect.innerHTML = '';
        controlTypeSelect.appendChild(firstOption);
        
        // Добавляем опции из словаря
        dictionaries.controlTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = `${type.code} - ${type.full_name || type.name}`;
            controlTypeSelect.appendChild(option);
        });
    }
    
    // Заполняем селект станций
    const selects = document.querySelectorAll('select');
    const stationSelect = selects[1]; // Второй селект - станции
    if (stationSelect && dictionaries.stations) {
        // Очищаем существующие опции кроме первой
        const firstOption = stationSelect.querySelector('option');
        stationSelect.innerHTML = '';
        stationSelect.appendChild(firstOption);
        
        // Добавляем опции из словаря
        dictionaries.stations.forEach(station => {
            const option = document.createElement('option');
            option.value = station.id;
            option.textContent = station.name;
            stationSelect.appendChild(option);
        });
    }
    
    console.log('Селекты заполнены данными из API');
}

// Вспомогательная функция для поиска кнопок по тексту
function findButtonsByText(text) {
    const buttons = document.querySelectorAll('button');
    return Array.from(buttons).filter(button => 
        button.textContent.trim().includes(text)
    );
}

// Инициализация кнопок
function initializeButtons() {
    // Кнопка "Новая заявка"
    const newRequestButtons = findButtonsByText('Новая заявка');
    newRequestButtons.forEach(button => {
        button.addEventListener('click', showNewRequestForm);
        button.style.cursor = 'pointer';
    });
    
    // Кнопки "Открыть"
    const openButtons = findButtonsByText('Открыть');
    openButtons.forEach(button => {
        button.addEventListener('click', function() {
            const row = button.closest('tr');
            const requestNumber = row?.cells[0]?.textContent?.trim();
            openRequest(requestNumber);
        });
        button.style.cursor = 'pointer';
    });
    
    // Кнопка "Создать заявку"
    const createButtons = findButtonsByText('Создать заявку');
    createButtons.forEach(button => {
        button.addEventListener('click', handleCreateRequest);
        button.style.cursor = 'pointer';
    });
    
    // Кнопка "Сохранить черновик"
    const saveButtons = findButtonsByText('Сохранить черновик');
    saveButtons.forEach(button => {
        button.addEventListener('click', handleSaveDraft);
        button.style.cursor = 'pointer';
    });
    
    // Кнопка "Отмена"
    const cancelButtons = findButtonsByText('Отмена');
    cancelButtons.forEach(button => {
        button.addEventListener('click', handleCancel);
        button.style.cursor = 'pointer';
    });
    
    // Кнопки в шапке (SAP UI5, уведомления)
    const headerButtons = document.querySelectorAll('.fd-shellbar button');
    headerButtons.forEach(button => {
        button.addEventListener('click', function() {
            const text = button.textContent.trim();
            if (text.includes('SAP UI5')) {
                window.location.href = '/index-sap.html';
            } else if (text.includes('🔔')) {
                showNotifications();
            }
        });
        button.style.cursor = 'pointer';
    });
    
    console.log(`Инициализировано кнопок: ${newRequestButtons.length + openButtons.length + createButtons.length + saveButtons.length + cancelButtons.length}`);
}

// Показать форму новой заявки
function showNewRequestForm() {
    const formSection = document.querySelector('section:last-child');
    if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth' });
        // Очистить форму
        const inputs = formSection.querySelectorAll('input, select');
        inputs.forEach(input => {
            if (input.type === 'text') {
                input.value = '';
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            }
        });
        // Фокус на первое поле
        const firstInput = formSection.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    }
    showMessage('Заполните форму для создания новой заявки', 'info');
}

// Открыть заявку
function openRequest(requestNumber) {
    if (requestNumber) {
        showMessage(`Открытие заявки ${requestNumber}...`, 'info');
        
        // Извлекаем ID из номера заявки (НК-2024-0142 -> 142)
        const match = requestNumber.match(/НК-\d+-(\d+)/);
        const requestId = match ? match[1] : null;
        
        if (requestId) {
            // Здесь можно добавить переход на страницу детализации
            // window.location.href = `/request/${requestId}`;
            
            // Пока просто имитируем загрузку
            setTimeout(() => {
                showMessage(`Заявка ${requestNumber} загружена`, 'success');
            }, 1000);
        } else {
            showMessage('Ошибка: неверный формат номера заявки', 'error');
        }
    } else {
        showMessage('Ошибка: не удалось определить номер заявки', 'error');
    }
}

// Обработка создания заявки
function handleCreateRequest(event) {
    event.preventDefault();
    
    const form = event.target.closest('.fd-card');
    const formData = gatherFormData(form);
    
    // Валидация
    if (!formData.orderNumber || !formData.drawing || !formData.controlTypeId) {
        showMessage('Пожалуйста, заполните все обязательные поля', 'error');
        return;
    }
    
    showMessage('Создание заявки...', 'info');
    
    // Формируем данные для API
    const requestData = {
        date: new Date().toISOString().split('T')[0], // Текущая дата
        order_number: formData.orderNumber,
        drawing: formData.drawing,
        control_type_id: parseInt(formData.controlTypeId),
        station_id: formData.stationId ? parseInt(formData.stationId) : null,
        status_id: 1, // Новая заявка
        priority: 2, // Средний приоритет
        user: 'Веб-интерфейс',
        // Значения по умолчанию для обязательных полей
        certificate: '',
        material: '',
        quantity: 1,
        operation: 'Контроль',
        tech_requirements: '',
        surface_preparation: 0,
        english_required: 0,
        notes: `Создано через веб-интерфейс: ${new Date().toLocaleString()}`
    };
    
    // Отправка на сервер
    createRequestAPI(requestData)
        .then(response => {
            if (response.id) {
                showMessage(`Заявка создана успешно! ID: ${response.id}`, 'success');
                clearForm(form);
                updateRequestsTable();
                
                // Удаляем черновик после успешного создания
                localStorage.removeItem('lab01_draft');
            } else {
                throw new Error(response.message || 'Неизвестная ошибка');
            }
        })
        .catch(error => {
            console.error('Ошибка создания заявки:', error);
            showMessage('Ошибка при создании заявки: ' + error.message, 'error');
        });
}

// Обработка сохранения черновика
function handleSaveDraft(event) {
    event.preventDefault();
    
    const form = event.target.closest('.fd-card');
    const formData = gatherFormData(form);
    
    // Сохранение в localStorage как черновик
    localStorage.setItem('lab01_draft', JSON.stringify({
        ...formData,
        timestamp: new Date().toISOString()
    }));
    
    showMessage('Черновик сохранен', 'success');
}

// Обработка отмены
function handleCancel(event) {
    event.preventDefault();
    
    const form = event.target.closest('.fd-card');
    clearForm(form);
    
    // Удаляем черновик
    localStorage.removeItem('lab01_draft');
    
    showMessage('Форма очищена', 'info');
}

// Очистка формы
function clearForm(form) {
    const inputs = form.querySelectorAll('input');
    const selects = form.querySelectorAll('select');
    
    inputs.forEach(input => input.value = '');
    selects.forEach(select => select.selectedIndex = 0);
}

// Сбор данных формы
function gatherFormData(form) {
    const inputs = form.querySelectorAll('input');
    const selects = form.querySelectorAll('select');
    
    return {
        orderNumber: inputs[0]?.value || '',
        drawing: inputs[1]?.value || '',
        controlTypeId: selects[0]?.value || '',
        stationId: selects[1]?.value || ''
    };
}

// API для создания заявки
async function createRequestAPI(requestData) {
    try {
        const response = await fetch('/api/requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || `HTTP error! status: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Загрузка заявок с сервера
async function loadRequestsAPI() {
    try {
        const response = await fetch('/api/requests?limit=10');
        if (response.ok) {
            const requests = await response.json();
            return requests;
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        return [];
    }
}

// Инициализация форм
function initializeForms() {
    // Восстановление черновика если есть
    const draft = localStorage.getItem('lab01_draft');
    if (draft) {
        try {
            const draftData = JSON.parse(draft);
            const form = document.querySelector('.fd-card');
            if (form && draftData.orderNumber) {
                // Показать уведомление о наличии черновика
                showMessage('Найден сохраненный черновик. Хотите восстановить?', 'info');
                
                setTimeout(() => {
                    if (confirm('Восстановить данные из черновика?')) {
                        restoreDraft(form, draftData);
                    }
                }, 2000);
            }
        } catch (e) {
            console.error('Ошибка восстановления черновика:', e);
        }
    }
    
    // Автосохранение при изменении полей
    const formInputs = document.querySelectorAll('.fd-card input, .fd-card select');
    formInputs.forEach(input => {
        input.addEventListener('change', () => {
            const form = input.closest('.fd-card');
            const formData = gatherFormData(form);
            if (formData.orderNumber || formData.drawing) {
                localStorage.setItem('lab01_draft', JSON.stringify({
                    ...formData,
                    timestamp: new Date().toISOString()
                }));
            }
        });
    });
}

// Восстановление черновика
function restoreDraft(form, draftData) {
    const inputs = form.querySelectorAll('input');
    const selects = form.querySelectorAll('select');
    
    inputs[0].value = draftData.orderNumber || '';
    inputs[1].value = draftData.drawing || '';
    
    if (draftData.controlTypeId) {
        selects[0].value = draftData.controlTypeId;
    }
    if (draftData.stationId) {
        selects[1].value = draftData.stationId;
    }
    
    showMessage('Черновик восстановлен', 'success');
}

// Инициализация уведомлений
function initializeNotifications() {
    // Проверка поддержки уведомлений
    if ('Notification' in window) {
        if (Notification.permission === 'default') {
            // Показать запрос на разрешение уведомлений через 3 секунды
            setTimeout(() => {
                if (confirm('Разрешить уведомления для получения важных обновлений?')) {
                    Notification.requestPermission();
                }
            }, 3000);
        }
    }
}

// Показать уведомления
function showNotifications() {
    const notifications = [
        { message: 'Новая заявка создана', type: 'info', time: '2 мин назад' },
        { message: 'Заявка завершена', type: 'success', time: '5 мин назад' },
        { message: 'Внимание: приближается дедлайн', type: 'warning', time: '10 мин назад' }
    ];
    
    let notificationHtml = '<div style="position: fixed; top: 60px; right: 20px; z-index: 1000; background: white; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 16px; min-width: 300px;">';
    notificationHtml += '<h4 style="margin: 0 0 12px 0;">Уведомления</h4>';
    
    notifications.forEach(notif => {
        const iconColor = notif.type === 'success' ? '#107e3e' : notif.type === 'warning' ? '#e9730c' : '#0a6ed1';
        notificationHtml += `
            <div style="padding: 8px; border-left: 3px solid ${iconColor}; margin-bottom: 8px; background: #f9f9f9;">
                <div style="font-weight: 500;">${notif.message}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">${notif.time}</div>
            </div>
        `;
    });
    
    notificationHtml += '<button onclick="this.parentElement.remove()" style="margin-top: 8px; padding: 4px 8px; background: #0a6ed1; color: white; border: none; border-radius: 4px; cursor: pointer;">Закрыть</button>';
    notificationHtml += '</div>';
    
    // Удалить предыдущие уведомления
    const existingNotifications = document.querySelector('[style*="position: fixed"][style*="top: 60px"]');
    if (existingNotifications) {
        existingNotifications.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', notificationHtml);
    
    // Автоматически скрыть через 10 секунд
    setTimeout(() => {
        const notification = document.querySelector('[style*="position: fixed"][style*="top: 60px"]');
        if (notification) {
            notification.remove();
        }
    }, 10000);
}

// Загрузка последних заявок
async function loadRecentRequests() {
    console.log('Загрузка последних заявок...');
    
    try {
        requestsData = await loadRequestsAPI();
        console.log('Заявки загружены:', requestsData.length);
        updateRequestsTable();
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        showMessage('Ошибка загрузки заявок', 'warning');
    }
}

// Обновление таблицы заявок
function updateRequestsTable() {
    const tbody = document.querySelector('.fd-table tbody');
    if (!tbody || !requestsData.length) {
        console.log('Нет данных для обновления таблицы');
        return;
    }
    
    // Анимация обновления
    const table = document.querySelector('.fd-table');
    if (table) {
        table.style.opacity = '0.7';
        
        // Обновляем содержимое через небольшую задержку
        setTimeout(() => {
            // Очищаем текущие строки
            tbody.innerHTML = '';
            
            // Добавляем первые 3 заявки
            requestsData.slice(0, 3).forEach(request => {
                const row = createRequestRow(request);
                tbody.appendChild(row);
            });
            
            // Переинициализируем кнопки "Открыть" в новых строках
            const newOpenButtons = tbody.querySelectorAll('button');
            newOpenButtons.forEach(button => {
                if (button.textContent.includes('Открыть')) {
                    button.addEventListener('click', function() {
                        const row = button.closest('tr');
                        const requestNumber = row?.cells[0]?.textContent?.trim();
                        openRequest(requestNumber);
                    });
                    button.style.cursor = 'pointer';
                }
            });
            
            table.style.opacity = '1';
        }, 300);
    }
}

// Создание строки таблицы для заявки
function createRequestRow(request) {
    const row = document.createElement('tr');
    row.className = 'fd-table__row';
    
    // Генерируем номер заявки в формате НК-YYYY-NNNN
    const requestNumber = `НК-2024-${String(request.id).padStart(4, '0')}`;
    
    // Определяем статус
    const statusInfo = getStatusInfo(request);
    const priorityInfo = getPriorityInfo(request);
    
    row.innerHTML = `
        <td class="fd-table__cell"><strong>${requestNumber}</strong></td>
        <td class="fd-table__cell">${request.order_number || 'Не указан'}</td>
        <td class="fd-table__cell">${request.drawing || 'Не указан'}</td>
        <td class="fd-table__cell">${request.control_type_name || 'Не указан'}</td>
        <td class="fd-table__cell">
            <span class="fd-object-status fd-object-status--${statusInfo.class}">
                <span class="fd-object-status__icon">${statusInfo.icon}</span>
                <span>${statusInfo.name}</span>
            </span>
        </td>
        <td class="fd-table__cell">
            <span class="fd-object-status fd-object-status--${priorityInfo.class}">
                <span class="fd-object-status__icon">●</span>
                <span>${priorityInfo.name}</span>
            </span>
        </td>
        <td class="fd-table__cell">
            <button class="fd-button fd-button--transparent">Открыть</button>
        </td>
    `;
    
    return row;
}

// Получение информации о статусе
function getStatusInfo(request) {
    if (request.status_name) {
        // Используем данные из БД
        return {
            name: request.status_name,
            class: request.status_color === 'green' ? 'positive' : 
                   request.status_color === 'red' ? 'negative' :
                   request.status_color === 'yellow' ? 'critical' : 'informative',
            icon: request.status_icon || '●'
        };
    }
    
    // Fallback для статусов
    const statusMap = {
        1: { name: 'Новая', class: 'informative', icon: '🆕' },
        2: { name: 'В работе', class: 'critical', icon: '🔄' },
        3: { name: 'Завершена', class: 'positive', icon: '✓' },
        4: { name: 'Отменена', class: 'negative', icon: '✗' }
    };
    
    return statusMap[request.status_id] || statusMap[1];
}

// Получение информации о приоритете
function getPriorityInfo(request) {
    const priorityMap = {
        1: { name: 'Низкий', class: 'positive' },
        2: { name: 'Средний', class: 'critical' },
        3: { name: 'Высокий', class: 'negative' }
    };
    
    return priorityMap[request.priority] || priorityMap[2];
}

// Инициализация статистики
function initializeStatistics() {
    // Анимация появления плиток
    const tiles = document.querySelectorAll('.fd-tile');
    tiles.forEach((tile, index) => {
        setTimeout(() => {
            tile.style.opacity = '0';
            tile.style.transform = 'translateY(20px)';
            tile.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                tile.style.opacity = '1';
                tile.style.transform = 'translateY(0)';
            }, 100);
        }, index * 100);
    });
    
    // Обновление статистики каждые 30 секунд
    setInterval(() => {
        updateStatistics();
    }, 30000);
}

// Обновление статистики
async function updateStatistics() {
    console.log('Обновление статистики...');
    
    try {
        // Загружаем статистику с сервера
        const response = await fetch('/api/stats');
        if (response.ok) {
            const stats = await response.json();
            updateStatisticsTiles(stats);
        }
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
    }
}

// Обновление плиток статистики
function updateStatisticsTiles(stats) {
    const tiles = document.querySelectorAll('.fd-tile');
    
    if (stats && tiles.length >= 4) {
        // Обновляем числовые значения в плитках
        const kpiElements = document.querySelectorAll('.fd-numeric-content__kpi');
        
        if (kpiElements.length >= 4) {
            kpiElements[0].textContent = stats.new || '0'; // Новые
            kpiElements[1].textContent = stats.in_progress || '0'; // В работе
            kpiElements[2].textContent = stats.completed || '0'; // Завершено
            kpiElements[3].textContent = stats.efficiency || '94'; // Эффективность
        }
    }
}

// Универсальная функция показа сообщений
function showMessage(message, type = 'info') {
    const colors = {
        success: '#107e3e',
        error: '#bb0000', 
        warning: '#e9730c',
        info: '#0a6ed1'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1001;
        background: ${colors[type]};
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-size: 14px;
        max-width: 300px;
        word-wrap: break-word;
        animation: slideIn 0.3s ease;
    `;
    
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 5000);
}

// Добавляем CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .fd-button:hover {
        transform: translateY(-1px);
        transition: transform 0.2s ease;
    }
    
    .fd-tile:hover {
        transform: translateY(-2px);
        transition: transform 0.2s ease;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    
    .loading {
        opacity: 0.7;
        pointer-events: none;
    }
`;
document.head.appendChild(style); 
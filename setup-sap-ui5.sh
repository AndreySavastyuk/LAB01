#!/bin/bash

# setup-sap-ui5.sh - Скрипт для быстрой установки SAP UI5 в проект LAB01

echo "🚀 Установка SAP UI5 для LAB01..."
echo "================================"

# Создание директорий
echo "📁 Создание структуры папок..."
mkdir -p public/css
mkdir -p public/js/sap-ui5/controller
mkdir -p public/js/sap-ui5/view
mkdir -p public/js/sap-ui5/fragment
mkdir -p public/js/sap-ui5/model
mkdir -p public/i18n
mkdir -p public/localService

# Создание файла стилей SAP Fiori
echo "🎨 Создание стилей SAP Fiori..."
cat > public/css/sap-fiori.css << 'EOF'
/* SAP Fiori стили для LAB01 */
.sapMShell { height: 100vh; }
.lab01ShellBar { background-color: #354a5f !important; }
.lab01TileKPI { min-height: 11rem; }
.sapMPageEnableScrolling { transition: all 0.3s ease; }

/* Адаптация существующих элементов */
.request-table-wrapper {
    padding: 0;
    background: transparent;
}

/* Кастомные анимации */
@keyframes slideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.sapMTile {
    animation: slideIn 0.3s ease-out;
}
EOF

# Создание index.html с SAP UI5
echo "📄 Создание index.html..."
cat > public/index-sap.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LAB01 - Система управления заявками НК (SAP UI5)</title>
    
    <!-- SAP UI5 Bootstrap -->
    <script
        id="sap-ui-bootstrap"
        src="https://openui5.hana.ondemand.com/resources/sap-ui-core.js"
        data-sap-ui-theme="sap_fiori_3"
        data-sap-ui-libs="sap.m,sap.f,sap.ui.layout,sap.tnt,sap.ui.table"
        data-sap-ui-compatVersion="edge"
        data-sap-ui-resourceroots='{"lab01": "./"}'
        data-sap-ui-oninit="module:lab01/js/sap-ui5/init"
        data-sap-ui-async="true"
        data-sap-ui-frameOptions="trusted">
    </script>
    
    <!-- Дополнительные стили -->
    <link rel="stylesheet" href="css/sap-fiori.css">
</head>
<body class="sapUiBody">
    <div id="content"></div>
</body>
</html>
EOF

# Создание инициализирующего скрипта
echo "🔧 Создание init.js..."
cat > public/js/sap-ui5/init.js << 'EOF'
sap.ui.define([
    "sap/m/Shell",
    "sap/m/App",
    "sap/m/Page",
    "sap/m/Title",
    "sap/m/MessageToast",
    "sap/ui/core/ComponentContainer"
], function(Shell, App, Page, Title, MessageToast, ComponentContainer) {
    "use strict";

    // Проверка поддержки браузера
    if (!sap.ui.Device.support.websocket) {
        MessageToast.show("Ваш браузер не поддерживает WebSocket. Некоторые функции могут быть недоступны.");
    }

    // Создание Shell
    var oShell = new Shell({
        app: new App("app", {
            initialPage: "mainPage"
        }),
        appWidthLimited: false
    });

    // Создание компонента
    var oComponentContainer = new ComponentContainer({
        name: "lab01",
        settings: {
            id: "lab01"
        },
        async: true,
        manifest: true,
        height: "100%"
    });

    // Создание главной страницы
    var oPage = new Page("mainPage", {
        title: "LAB01 - Система управления заявками НК",
        content: [oComponentContainer]
    });

    oShell.getApp().addPage(oPage);
    oShell.placeAt("content");

    // Глобальные настройки
    sap.ui.getCore().getConfiguration().setLanguage("ru");
    
    // Применение сохраненной темы
    var savedTheme = localStorage.getItem('theme') || 'sap_fiori_3';
    sap.ui.getCore().applyTheme(savedTheme);
    
    // Применение режима отображения
    var compactMode = localStorage.getItem('compactMode') === 'true';
    if (compactMode) {
        document.body.classList.add("sapUiSizeCompact");
    } else {
        document.body.classList.add("sapUiSizeCozy");
    }

    console.log("✅ SAP UI5 инициализирован");
});
EOF

# Создание файла локализации
echo "🌍 Создание файла локализации..."
cat > public/i18n/i18n.properties << 'EOF'
# Заголовки приложения
appTitle=LAB01 - Система управления заявками НК
appDescription=Система управления заявками на неразрушающий контроль

# Навигация
nav.home=Главная
nav.requests=Заявки
nav.reports=Отчеты
nav.archive=Архив
nav.settings=Настройки

# Кнопки
btn.create=Создать
btn.save=Сохранить
btn.cancel=Отмена
btn.delete=Удалить
btn.edit=Редактировать
btn.search=Поиск
btn.filter=Фильтр
btn.export=Экспорт
btn.refresh=Обновить

# Поля формы
field.orderNumber=Номер заказа
field.drawing=Чертеж/Деталь
field.controlType=Тип контроля
field.station=Станция АЭС
field.executor=Исполнитель
field.priority=Приоритет
field.deadline=Срок выполнения
field.status=Статус
field.notes=Примечания

# Статусы
status.new=Новая
status.inProgress=В работе
status.testing=На контроле
status.completed=Завершена
status.cancelled=Отменена

# Сообщения
msg.saveSuccess=Данные успешно сохранены
msg.deleteConfirm=Вы уверены, что хотите удалить эту заявку?
msg.error=Произошла ошибка
msg.loading=Загрузка...

# Настройки
settings.general=Общие настройки
settings.display=Отображение
settings.notifications=Уведомления
settings.theme=Тема оформления
settings.language=Язык
settings.companyName=Название организации
EOF

# Создание миграционного скрипта
echo "🔄 Создание скрипта миграции..."
cat > public/js/migrate-to-sap.js << 'EOF'
// Скрипт для миграции данных из старой системы в SAP UI5

window.MigrationHelper = {
    // Проверка первого запуска
    isFirstRun: function() {
        return !localStorage.getItem('sap_ui5_migrated');
    },
    
    // Миграция настроек
    migrateSettings: function() {
        console.log("Миграция настроек...");
        
        // Копирование существующих настроек
        var oldSettings = {
            userName: localStorage.getItem('userName'),
            serverUrl: localStorage.getItem('serverUrl'),
            refreshInterval: localStorage.getItem('refreshInterval')
        };
        
        // Сохранение в новом формате
        if (oldSettings.userName) {
            localStorage.setItem('sap_userName', oldSettings.userName);
        }
        if (oldSettings.serverUrl) {
            localStorage.setItem('sap_serverUrl', oldSettings.serverUrl);
        }
        
        localStorage.setItem('sap_ui5_migrated', 'true');
        console.log("✅ Миграция завершена");
    },
    
    // Показ приветственного диалога
    showWelcomeDialog: function() {
        sap.m.MessageBox.information(
            "Добро пожаловать в обновленную систему LAB01!\n\n" +
            "Теперь система использует современный интерфейс SAP Fiori.\n" +
            "Все ваши данные сохранены и доступны.",
            {
                title: "Обновление системы",
                actions: [sap.m.MessageBox.Action.OK],
                emphasizedAction: sap.m.MessageBox.Action.OK
            }
        );
    }
};

// Запуск миграции при загрузке
document.addEventListener("DOMContentLoaded", function() {
    if (window.MigrationHelper.isFirstRun()) {
        window.MigrationHelper.migrateSettings();
        
        // Показать приветствие после загрузки UI5
        setTimeout(function() {
            window.MigrationHelper.showWelcomeDialog();
        }, 2000);
    }
});
EOF

# Обновление package.json
echo "📦 Обновление package.json..."
if [ -f "package.json" ]; then
    # Добавление скриптов
    node -e "
    const pkg = require('./package.json');
    pkg.scripts = pkg.scripts || {};
    pkg.scripts['start:sap'] = 'node server.js --sap-ui5';
    pkg.scripts['build:sap'] = 'echo \"Building SAP UI5 version...\"';
    pkg.scripts['dev:sap'] = 'nodemon server.js --sap-ui5';
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 4));
    "
fi

# Создание README для SAP UI5
echo "📚 Создание документации..."
cat > SAP_UI5_README.md << 'EOF'
# LAB01 - SAP UI5 Version

## Быстрый старт

1. Запустите сервер:
   ```bash
   npm start
   ```

2. Откройте в браузере:
   - Новый интерфейс SAP UI5: http://localhost:3000/index-sap.html
   - Классический интерфейс: http://localhost:3000/index.html

## Структура файлов SAP UI5

```
public/
├── js/sap-ui5/
│   ├── Component.js      - Главный компонент
│   ├── controller/       - Контроллеры
│   ├── view/            - Представления (XML)
│   ├── fragment/        - Переиспользуемые фрагменты
│   └── model/           - Модели данных
├── i18n/                - Локализация
└── css/sap-fiori.css   - Дополнительные стили
```

## Переключение тем

Доступные темы:
- sap_fiori_3 (по умолчанию)
- sap_fiori_3_dark
- sap_belize
- sap_belize_plus

## Отладка

Включите режим отладки, добавив в URL:
```
?sap-ui-debug=true
```

## Поддержка браузеров

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
EOF

echo ""
echo "✅ Установка завершена!"
echo ""
echo "Дальнейшие шаги:"
echo "1. Перезапустите сервер: npm start"
echo "2. Откройте http://localhost:3000/index-sap.html"
echo "3. Для возврата к старой версии используйте http://localhost:3000"
echo ""
echo "📖 Документация доступна в файле SAP_UI5_README.md"
EOF
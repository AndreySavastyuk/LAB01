# setup-sap-ui5.ps1 - PowerShell версия скрипта установки SAP UI5 для LAB01
# Версия: 2.0

param(
    [switch]$Force,
    [switch]$SkipBackup
)

# Цвета для вывода
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
}

# Функции для красивого вывода
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-LogWarn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Проверка зависимостей
function Test-Dependencies {
    Write-LogInfo "Проверка зависимостей..."
    
    $nodeExists = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeExists) {
        Write-LogError "Node.js не установлен. Установите Node.js перед запуском скрипта."
        exit 1
    }
    
    $npmExists = Get-Command npm -ErrorAction SilentlyContinue
    if (-not $npmExists) {
        Write-LogError "npm не установлен."
        exit 1
    }
    
    Write-LogInfo "✓ Все зависимости установлены"
}

# Резервное копирование
function Backup-Existing {
    if ((Test-Path "public/js/sap-ui5") -or (Test-Path "public/index-sap.html")) {
        Write-LogWarn "Обнаружена существующая установка SAP UI5"
        
        if (-not $SkipBackup) {
            $response = Read-Host "Создать резервную копию? (y/n)"
            if ($response -eq "y" -or $response -eq "Y") {
                $backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
                New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
                
                if (Test-Path "public/js/sap-ui5") {
                    Copy-Item -Path "public/js/sap-ui5" -Destination "$backupDir/" -Recurse -Force
                }
                if (Test-Path "public/index-sap.html") {
                    Copy-Item -Path "public/index-sap.html" -Destination "$backupDir/" -Force
                }
                
                Write-LogInfo "Резервная копия создана в $backupDir"
            }
        }
    }
}

# Генерация VAPID ключей
function Get-VapidKeys {
    Write-LogInfo "🔑 Генерация VAPID ключей..."
    
    $webPushExists = Get-Command npx -ErrorAction SilentlyContinue
    if ($webPushExists) {
        try {
            $vapidOutput = npx web-push generate-vapid-keys --json 2>$null
            if ($vapidOutput) {
                $vapidJson = $vapidOutput | ConvertFrom-Json
                return @{
                    PublicKey = $vapidJson.publicKey
                    PrivateKey = $vapidJson.privateKey
                }
            }
        } catch {
            Write-LogWarn "Ошибка генерации VAPID ключей: $_"
        }
    }
    
    Write-LogWarn "web-push не установлен, используются тестовые ключи"
    return @{
        PublicKey = "BOLuMnBs0R9VSoKE2iKEhtxjbwYGjkRB9GrI8XILrV2WAMF7yml4jy1poojaYKGSqr0wxHzMxuxDA5jJxwsJ-dM"
        PrivateKey = "your-private-key"
    }
}

# Основная функция установки
function Install-SapUI5 {
    Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║    🚀 Установка SAP UI5 для LAB01     ║" -ForegroundColor Blue
    Write-Host "║         Версия 2.0 Enhanced           ║" -ForegroundColor Blue
    Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""

    Test-Dependencies
    Backup-Existing

    # Создание директорий
    Write-LogInfo "📁 Создание структуры папок..."
    $directories = @(
        "public/css",
        "public/js/sap-ui5/controller",
        "public/js/sap-ui5/view",
        "public/js/sap-ui5/fragment",
        "public/js/sap-ui5/model",
        "public/js/sap-ui5/formatter",
        "public/js/sap-ui5/util",
        "public/i18n",
        "public/localService/mockdata",
        "public/test/unit",
        "public/test/integration",
        "public/resources/img"
    )

    foreach ($dir in $directories) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    # Генерация VAPID ключей
    $vapidKeys = Get-VapidKeys

    # Создание файлов конфигурации
    Write-LogInfo "⚙️ Создание конфигурации..."

    # Создание config.js
    $configContent = "// Конфигурация приложения LAB01 SAP UI5
window.LAB01Config = {
    version: `"2.0.0`",
    apiUrl: window.location.origin + `"/api`",
    wsUrl: `"ws://`" + window.location.host + `"/ws`",
    vapidPublicKey: `"$($vapidKeys.PublicKey)`",
    features: {
        notifications: true,
        offline: true,
        darkMode: true,
        export: true
    },
    themes: [
        { key: `"sap_fiori_3`", text: `"SAP Fiori 3`" },
        { key: `"sap_fiori_3_dark`", text: `"SAP Fiori 3 Dark`" },
        { key: `"sap_horizon`", text: `"SAP Horizon`" },
        { key: `"sap_horizon_dark`", text: `"SAP Horizon Dark`" },
        { key: `"sap_belize`", text: `"SAP Belize`" },
        { key: `"sap_belize_plus`", text: `"SAP Belize Plus`" }
    ],
    defaultSettings: {
        theme: `"sap_fiori_3`",
        compactMode: false,
        language: `"ru`",
        refreshInterval: 30000,
        notificationsEnabled: true
    }
};"
    Set-Content -Path "public/js/sap-ui5/config.js" -Value $configContent -Encoding UTF8

    Write-LogInfo "🏗️ Создание Component.js..."
    # Создание упрощенного Component.js для PowerShell
    $componentContent = 'sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
    "use strict";

    return UIComponent.extend("lab01.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this._createDeviceModel();
            this.getRouter().initialize();
        },

        _createDeviceModel: function() {
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");
        }
    });
});'
    Set-Content -Path "public/js/sap-ui5/Component.js" -Value $componentContent -Encoding UTF8

    # Создание manifest.json
    Write-LogInfo "📄 Создание manifest.json..."
    $manifestContent = '{
    "_version": "1.32.0",
    "sap.app": {
        "id": "lab01",
        "type": "application",
        "applicationVersion": {
            "version": "2.0.0"
        },
        "title": "LAB01 - Система управления заявками НК"
    },
    "sap.ui": {
        "technology": "UI5",
        "deviceTypes": {
            "desktop": true,
            "tablet": true,
            "phone": true
        }
    },
    "sap.ui5": {
        "dependencies": {
            "minUI5Version": "1.100.0",
            "libs": {
                "sap.m": {},
                "sap.ui.core": {},
                "sap.ui.layout": {},
                "sap.f": {}
            }
        },
        "models": {
            "": {
                "type": "sap.ui.model.json.JSONModel"
            }
        }
    }
}'
    Set-Content -Path "public/js/sap-ui5/manifest.json" -Value $manifestContent -Encoding UTF8

    # Создание index-sap.html
    Write-LogInfo "🌐 Создание index-sap.html..."
    $indexSapLines = @(
        "<!DOCTYPE html>",
        "<html>",
        "<head>",
        "    <meta charset='utf-8'>",
        "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>",
        "    <title>LAB01 - SAP UI5</title>",
        "    <script id='sap-ui-bootstrap'",
        "        src='https://ui5.sap.com/1.120.0/resources/sap-ui-core.js'",
        "        data-sap-ui-theme='sap_fiori_3'",
        "        data-sap-ui-libs='sap.m,sap.ui.core,sap.f'",
        "        data-sap-ui-compatVersion='edge'",
        "        data-sap-ui-async='true'",
        "        data-sap-ui-oninit='module:lab01/index'",
        "        data-sap-ui-resourceroots='{",
        '            "lab01": "./js/sap-ui5/"',
        "        }'>",
        "    </script>",
        "    <script src='js/sap-ui5/config.js'></script>",
        "</head>",
        "<body class='sapUiBody'>",
        "    <div id='content'></div>",
        "</body>",
        "</html>"
    )
    $indexSapContent = $indexSapLines -join "`n"
    Set-Content -Path "public/index-sap.html" -Value $indexSapContent -Encoding UTF8

    # Создание .env.example
    Write-LogInfo "🔐 Создание .env.example..."
    $envContent = "# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration
EMAIL_ENABLED=true
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-email@yandex.ru
EMAIL_PASS=your-password
EMAIL_FROM=LAB01 System your-email@yandex.ru

# Push Notifications
PUSH_ENABLED=true
VAPID_SUBJECT=mailto:admin@company.ru
VAPID_PUBLIC_KEY=$($vapidKeys.PublicKey)
VAPID_PRIVATE_KEY=$($vapidKeys.PrivateKey)

# Application URL
APP_URL=http://localhost:3000"

    Set-Content -Path ".env.example" -Value $envContent -Encoding UTF8

    # Сохранение VAPID ключей
    $vapidKeysContent = "VAPID Keys Generated:
====================
Public Key: $($vapidKeys.PublicKey)
Private Key: $($vapidKeys.PrivateKey)

Add these to your .env file!"

    Set-Content -Path "VAPID_KEYS.txt" -Value $vapidKeysContent -Encoding UTF8

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                   ✅ Установка завершена!                      ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Дальнейшие шаги:" -ForegroundColor Blue
    Write-Host "1. Скопируйте .env.example в .env и настройте"
    Write-Host "2. Перезапустите сервер: npm start"
    Write-Host "3. Откройте http://localhost:3000/index-sap.html"
    Write-Host ""
    Write-Host "📖 VAPID ключи сохранены в VAPID_KEYS.txt"
    Write-LogInfo "Для возврата к старой версии используйте http://localhost:3000"
}

# Запуск установки
Install-SapUI5 
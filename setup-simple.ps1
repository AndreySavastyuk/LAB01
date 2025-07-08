# setup-simple.ps1 - Упрощенная установка SAP UI5 для LAB01

Write-Host "Установка SAP UI5 для LAB01..." -ForegroundColor Green

# Проверка Node.js
$nodeExists = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeExists) {
    Write-Host "ОШИБКА: Node.js не установлен!" -ForegroundColor Red
    exit 1
}

Write-Host "Создание структуры папок..." -ForegroundColor Yellow

# Создание директорий
$directories = @(
    "public/css",
    "public/js/sap-ui5/controller",
    "public/js/sap-ui5/view",
    "public/js/sap-ui5/fragment",
    "public/js/sap-ui5/model",
    "public/i18n",
    "public/resources/img"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Write-Host "Создано: $dir" -ForegroundColor Gray
}

Write-Host "Создание файлов..." -ForegroundColor Yellow

# Создание конфигурации (упрощенная)
$configJs = @"
window.LAB01Config = {
    version: "2.0.0",
    apiUrl: window.location.origin + "/api",
    features: {
        notifications: true,
        offline: true
    }
};
"@

Set-Content -Path "public/js/sap-ui5/config.js" -Value $configJs -Encoding UTF8
Write-Host "Создан: config.js" -ForegroundColor Gray

# Создание Component.js (упрощенный)
$componentJs = @"
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";
    
    return UIComponent.extend("lab01.Component", {
        metadata: {
            manifest: "json"
        },
        
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            console.log("LAB01 Component initialized");
        }
    });
});
"@

Set-Content -Path "public/js/sap-ui5/Component.js" -Value $componentJs -Encoding UTF8
Write-Host "Создан: Component.js" -ForegroundColor Gray

# Создание manifest.json
$manifestJson = @"
{
    "_version": "1.32.0",
    "sap.app": {
        "id": "lab01",
        "type": "application",
        "applicationVersion": {
            "version": "2.0.0"
        },
        "title": "LAB01 System"
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
                "sap.ui.core": {}
            }
        }
    }
}
"@

Set-Content -Path "public/js/sap-ui5/manifest.json" -Value $manifestJson -Encoding UTF8
Write-Host "Создан: manifest.json" -ForegroundColor Gray

# Создание .env.example
$envExample = @"
PORT=3000
NODE_ENV=development
EMAIL_ENABLED=true
PUSH_ENABLED=true
APP_URL=http://localhost:3000
"@

Set-Content -Path ".env.example" -Value $envExample -Encoding UTF8
Write-Host "Создан: .env.example" -ForegroundColor Gray

Write-Host "" 
Write-Host "Установка завершена успешно!" -ForegroundColor Green
Write-Host ""
Write-Host "Следующие шаги:" -ForegroundColor Blue
Write-Host "1. Скопируйте .env.example в .env"
Write-Host "2. Запустите: npm start"
Write-Host "3. Создайте index-sap.html вручную"
Write-Host ""
Write-Host "Структура создана. Файлы готовы к использованию." -ForegroundColor Green 
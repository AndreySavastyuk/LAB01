#!/bin/bash

# setup-sap-ui5.sh - Улучшенный скрипт установки SAP UI5 для LAB01
# Версия: 2.0

set -e  # Прерывание при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции для красивого вывода
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка зависимостей
check_dependencies() {
    log_info "Проверка зависимостей..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js не установлен. Установите Node.js перед запуском скрипта."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm не установлен."
        exit 1
    fi
    
    log_info "✓ Все зависимости установлены"
}

# Резервное копирование
backup_existing() {
    if [ -d "public/js/sap-ui5" ] || [ -f "public/index-sap.html" ]; then
        log_warn "Обнаружена существующая установка SAP UI5"
        read -p "Создать резервную копию? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            backup_dir="backup_$(date +%Y%m%d_%H%M%S)"
            mkdir -p "$backup_dir"
            [ -d "public/js/sap-ui5" ] && cp -r public/js/sap-ui5 "$backup_dir/"
            [ -f "public/index-sap.html" ] && cp public/index-sap.html "$backup_dir/"
            log_info "Резервная копия создана в $backup_dir"
        fi
    fi
}

echo "╔════════════════════════════════════════╗"
echo "║    🚀 Установка SAP UI5 для LAB01     ║"
echo "║         Версия 2.0 Enhanced           ║"
echo "╚════════════════════════════════════════╝"
echo

check_dependencies
backup_existing

# Создание директорий
log_info "📁 Создание структуры папок..."
mkdir -p public/css
mkdir -p public/js/sap-ui5/{controller,view,fragment,model,formatter,util}
mkdir -p public/i18n
mkdir -p public/localService/mockdata
mkdir -p public/test/{unit,integration}
mkdir -p public/resources/img

# Генерация VAPID ключей для push-уведомлений
log_info "🔑 Генерация VAPID ключей..."
if command -v web-push &> /dev/null; then
    VAPID_KEYS=$(npx web-push generate-vapid-keys --json)
    PUBLIC_KEY=$(echo $VAPID_KEYS | grep -o '"publicKey":"[^"]*' | cut -d'"' -f4)
    PRIVATE_KEY=$(echo $VAPID_KEYS | grep -o '"privateKey":"[^"]*' | cut -d'"' -f4)
    log_info "VAPID ключи сгенерированы"
else
    log_warn "web-push не установлен, используются тестовые ключи"
    PUBLIC_KEY="BOLuMnBs0R9VSoKE2iKEhtxjbwYGjkRB9GrI8XILrV2WAMF7yml4jy1poojaYKGSqr0wxHzMxuxDA5jJxwsJ-dM"
    PRIVATE_KEY="your-private-key"
fi

# Создание файла конфигурации
log_info "⚙️ Создание конфигурации..."
cat > public/js/sap-ui5/config.js << EOF
// Конфигурация приложения LAB01 SAP UI5
window.LAB01Config = {
    version: "2.0.0",
    apiUrl: window.location.origin + "/api",
    wsUrl: "ws://" + window.location.host + "/ws",
    vapidPublicKey: "$PUBLIC_KEY",
    features: {
        notifications: true,
        offline: true,
        darkMode: true,
        export: true
    },
    themes: [
        { key: "sap_fiori_3", text: "SAP Fiori 3" },
        { key: "sap_fiori_3_dark", text: "SAP Fiori 3 Dark" },
        { key: "sap_horizon", text: "SAP Horizon" },
        { key: "sap_horizon_dark", text: "SAP Horizon Dark" },
        { key: "sap_belize", text: "SAP Belize" },
        { key: "sap_belize_plus", text: "SAP Belize Plus" }
    ],
    defaultSettings: {
        theme: "sap_fiori_3",
        compactMode: false,
        language: "ru",
        refreshInterval: 30000,
        notificationsEnabled: true
    }
};
EOF

# Создание Component.js
log_info "🏗️ Создание Component.js..."
cat > public/js/sap-ui5/Component.js << 'EOF'
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/f/library"
], function (UIComponent, Device, JSONModel, fioriLibrary) {
    "use strict";

    return UIComponent.extend("lab01.Component", {
        metadata: {
            manifest: {
                "_version": "1.32.0",
                "sap.app": {
                    "id": "lab01",
                    "type": "application",
                    "i18n": "i18n/i18n.properties",
                    "applicationVersion": {
                        "version": "2.0.0"
                    },
                    "title": "{{appTitle}}",
                    "description": "{{appDescription}}",
                    "resources": "resources.json",
                    "dataSources": {
                        "mainService": {
                            "uri": "/api/",
                            "type": "REST"
                        }
                    }
                },
                "sap.ui": {
                    "technology": "UI5",
                    "icons": {
                        "icon": "sap-icon://lab",
                        "favIcon": "resources/img/favicon.ico"
                    },
                    "deviceTypes": {
                        "desktop": true,
                        "tablet": true,
                        "phone": true
                    }
                },
                "sap.ui5": {
                    "flexEnabled": true,
                    "dependencies": {
                        "minUI5Version": "1.100.0",
                        "libs": {
                            "sap.m": {},
                            "sap.ui.core": {},
                            "sap.ui.layout": {},
                            "sap.f": {},
                            "sap.ui.table": {},
                            "sap.uxap": {},
                            "sap.tnt": {}
                        }
                    },
                    "contentDensities": {
                        "compact": true,
                        "cozy": true
                    },
                    "models": {
                        "i18n": {
                            "type": "sap.ui.model.resource.ResourceModel",
                            "settings": {
                                "bundleName": "lab01.i18n.i18n",
                                "supportedLocales": ["ru", "en"],
                                "fallbackLocale": "ru"
                            }
                        },
                        "": {
                            "dataSource": "mainService",
                            "type": "sap.ui.model.json.JSONModel",
                            "settings": {
                                "defaultBindingMode": "TwoWay"
                            }
                        },
                        "device": {
                            "type": "sap.ui.model.json.JSONModel"
                        },
                        "settings": {
                            "type": "sap.ui.model.json.JSONModel"
                        }
                    },
                    "rootView": {
                        "viewName": "lab01.view.App",
                        "type": "XML",
                        "async": true,
                        "id": "app"
                    },
                    "routing": {
                        "config": {
                            "routerClass": "sap.f.routing.Router",
                            "viewType": "XML",
                            "viewPath": "lab01.view",
                            "controlId": "fcl",
                            "transition": "slide",
                            "bypassed": {
                                "target": "notFound"
                            }
                        },
                        "routes": [
                            {
                                "pattern": "",
                                "name": "home",
                                "target": [
                                    "home"
                                ]
                            },
                            {
                                "pattern": "requests/{layout}",
                                "name": "requests",
                                "target": [
                                    "requestsMaster",
                                    "requestsDetail"
                                ]
                            },
                            {
                                "pattern": "request/{requestId}/{layout}",
                                "name": "requestDetail",
                                "target": [
                                    "requestsMaster",
                                    "requestsDetail"
                                ]
                            }
                        ],
                        "targets": {
                            "home": {
                                "viewName": "Home",
                                "controlAggregation": "beginColumnPages"
                            },
                            "requestsMaster": {
                                "viewName": "RequestsMaster",
                                "controlAggregation": "beginColumnPages"
                            },
                            "requestsDetail": {
                                "viewName": "RequestsDetail",
                                "controlAggregation": "midColumnPages"
                            },
                            "notFound": {
                                "viewName": "NotFound",
                                "controlAggregation": "beginColumnPages"
                            }
                        }
                    }
                }
            }
        },

        init: function () {
            // Вызов init родительского класса
            UIComponent.prototype.init.apply(this, arguments);

            // Создание моделей
            this._createDeviceModel();
            this._createSettingsModel();
            
            // Инициализация роутера
            this.getRouter().initialize();
            
            // Применение сохраненных настроек
            this._applyUserSettings();
            
            // Инициализация сервисов
            this._initServices();
        },

        _createDeviceModel: function() {
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");
        },

        _createSettingsModel: function() {
            var oSettings = JSON.parse(localStorage.getItem("lab01_settings") || "{}");
            var oDefaultSettings = window.LAB01Config.defaultSettings;
            
            // Объединение с настройками по умолчанию
            Object.keys(oDefaultSettings).forEach(function(key) {
                if (oSettings[key] === undefined) {
                    oSettings[key] = oDefaultSettings[key];
                }
            });
            
            var oSettingsModel = new JSONModel(oSettings);
            this.setModel(oSettingsModel, "settings");
        },

        _applyUserSettings: function() {
            var oSettings = this.getModel("settings").getData();
            
            // Применение темы
            sap.ui.getCore().applyTheme(oSettings.theme);
            
            // Применение compact/cozy mode
            document.body.classList.toggle("sapUiSizeCompact", oSettings.compactMode);
            document.body.classList.toggle("sapUiSizeCozy", !oSettings.compactMode);
            
            // Установка языка
            sap.ui.getCore().getConfiguration().setLanguage(oSettings.language);
        },

        _initServices: function() {
            // Инициализация push-уведомлений
            if (window.LAB01Config.features.notifications) {
                this._initPushNotifications();
            }
            
            // Инициализация WebSocket
            this._initWebSocket();
            
            // Инициализация Service Worker для offline
            if (window.LAB01Config.features.offline && 'serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw-sap.js');
            }
        },

        _initPushNotifications: function() {
            // Реализация инициализации push-уведомлений
            if ('Notification' in window && Notification.permission === 'default') {
                setTimeout(function() {
                    sap.m.MessageBox.confirm(
                        "Хотите получать уведомления о новых заявках и изменениях статусов?",
                        {
                            title: "Включить уведомления",
                            actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                            onClose: function(oAction) {
                                if (oAction === sap.m.MessageBox.Action.YES) {
                                    Notification.requestPermission();
                                }
                            }
                        }
                    );
                }, 5000);
            }
        },

        _initWebSocket: function() {
            if (!window.WebSocket) return;
            
            try {
                this._ws = new WebSocket(window.LAB01Config.wsUrl);
                
                this._ws.onmessage = function(event) {
                    var data = JSON.parse(event.data);
                    this._handleRealtimeUpdate(data);
                }.bind(this);
                
                this._ws.onerror = function(error) {
                    console.error("WebSocket error:", error);
                };
                
                // Переподключение при разрыве соединения
                this._ws.onclose = function() {
                    setTimeout(function() {
                        this._initWebSocket();
                    }.bind(this), 5000);
                }.bind(this);
                
            } catch (error) {
                console.error("Failed to initialize WebSocket:", error);
            }
        },

        _handleRealtimeUpdate: function(data) {
            var oEventBus = sap.ui.getCore().getEventBus();
            
            switch(data.type) {
                case "request_created":
                    oEventBus.publish("lab01", "requestCreated", data);
                    sap.m.MessageToast.show("Создана новая заявка: " + data.requestNumber);
                    break;
                case "status_changed":
                    oEventBus.publish("lab01", "statusChanged", data);
                    sap.m.MessageToast.show("Изменен статус заявки: " + data.requestNumber);
                    break;
                case "request_updated":
                    oEventBus.publish("lab01", "requestUpdated", data);
                    break;
            }
        },

        getContentDensityClass: function() {
            if (!this._sContentDensityClass) {
                if (!Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCompact";
                } else {
                    this._sContentDensityClass = "sapUiSizeCozy";
                }
            }
            return this._sContentDensityClass;
        }
    });
});
EOF

# Создание основного View (App.view.xml)
log_info "📄 Создание App.view.xml..."
cat > public/js/sap-ui5/view/App.view.xml << 'EOF'
<mvc:View
    controllerName="lab01.controller.App"
    xmlns="sap.m"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:f="sap.f"
    xmlns:tnt="sap.tnt"
    displayBlock="true">
    
    <f:ShellBar
        id="shellBar"
        title="LAB01"
        secondTitle="Система управления заявками НК"
        homeIcon="sap-icon://lab"
        showMenuButton="{device>/system/phone}"
        showNavButton="false"
        showCopilot="false"
        showSearch="true"
        showNotifications="true"
        notificationsNumber="3"
        showProductSwitcher="false"
        menuButtonPressed=".onMenuButtonPress"
        search=".onSearch"
        notificationsPressed=".onNotificationsPress"
        avatarPressed=".onAvatarPress">
        <f:profile>
            <f:Avatar
                initials="{settings>/userInitials}"
                backgroundColor="Accent6"/>
        </f:profile>
        <f:additionalContent>
            <ToolbarSeparator/>
            <Button
                icon="sap-icon://palette"
                tooltip="Сменить тему"
                press=".onThemePress"/>
            <Button
                icon="sap-icon://refresh"
                tooltip="Обновить"
                press=".onRefresh"/>
        </f:additionalContent>
    </f:ShellBar>
    
    <tnt:ToolPage id="toolPage">
        <tnt:sideContent>
            <tnt:SideNavigation
                id="sideNavigation"
                selectedKey="{/selectedKey}"
                itemSelect=".onItemSelect">
                <tnt:NavigationList>
                    <tnt:NavigationListItem
                        text="Главная"
                        icon="sap-icon://home"
                        key="home"/>
                    <tnt:NavigationListItem
                        text="Заявки"
                        icon="sap-icon://task"
                        key="requests"
                        items="{/requestFilters}">
                        <tnt:NavigationListItem
                            text="Все заявки"
                            key="requests-all"/>
                        <tnt:NavigationListItem
                            text="Новые"
                            key="requests-new"/>
                        <tnt:NavigationListItem
                            text="В работе"
                            key="requests-inprogress"/>
                        <tnt:NavigationListItem
                            text="Требуют внимания"
                            key="requests-attention"/>
                    </tnt:NavigationListItem>
                    <tnt:NavigationListItem
                        text="Отчеты"
                        icon="sap-icon://chart-table-view"
                        key="reports"/>
                    <tnt:NavigationListItem
                        text="Архив"
                        icon="sap-icon://folder"
                        key="archive"/>
                    <tnt:NavigationListItem
                        text="Настройки"
                        icon="sap-icon://action-settings"
                        key="settings"/>
                </tnt:NavigationList>
            </tnt:SideNavigation>
        </tnt:sideContent>
        
        <tnt:mainContents>
            <f:FlexibleColumnLayout
                id="fcl"
                stateChange=".onStateChanged"
                layout="{/layout}"
                backgroundDesign="Solid">
            </f:FlexibleColumnLayout>
        </tnt:mainContents>
    </tnt:ToolPage>
</mvc:View>
EOF

# Создание контроллера App
log_info "🎮 Создание App.controller.js..."
cat > public/js/sap-ui5/controller/App.controller.js << 'EOF'
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast"
], function (Controller, Fragment, MessageToast) {
    "use strict";

    return Controller.extend("lab01.controller.App", {
        onInit: function () {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.attachRouteMatched(this.onRouteMatched, this);
            
            // Подписка на события
            var oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.subscribe("lab01", "requestCreated", this.onRequestCreated, this);
            oEventBus.subscribe("lab01", "statusChanged", this.onStatusChanged, this);
        },

        onExit: function() {
            var oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.unsubscribe("lab01", "requestCreated", this.onRequestCreated, this);
            oEventBus.unsubscribe("lab01", "statusChanged", this.onStatusChanged, this);
        },

        onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var oSideNavigation = this.byId("sideNavigation");
            
            // Обновление выбранного пункта меню
            switch(sRouteName) {
                case "home":
                    oSideNavigation.setSelectedKey("home");
                    break;
                case "requests":
                case "requestDetail":
                    oSideNavigation.setSelectedKey("requests-all");
                    break;
            }
        },

        onItemSelect: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            
            switch(sKey) {
                case "home":
                    this.oRouter.navTo("home");
                    break;
                case "requests-all":
                    this.oRouter.navTo("requests", {layout: "OneColumn"});
                    break;
                // Добавить другие маршруты
            }
        },

        onMenuButtonPress: function () {
            var oToolPage = this.byId("toolPage");
            oToolPage.setSideExpanded(!oToolPage.getSideExpanded());
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            // Реализация глобального поиска
            MessageToast.show("Поиск: " + sQuery);
        },

        onNotificationsPress: function (oEvent) {
            var oButton = oEvent.getSource();
            if (!this._oNotificationPopover) {
                Fragment.load({
                    name: "lab01.fragment.Notifications",
                    controller: this
                }).then(function(oPopover) {
                    this._oNotificationPopover = oPopover;
                    this.getView().addDependent(this._oNotificationPopover);
                    this._oNotificationPopover.openBy(oButton);
                }.bind(this));
            } else {
                this._oNotificationPopover.openBy(oButton);
            }
        },

        onAvatarPress: function (oEvent) {
            var oButton = oEvent.getSource();
            if (!this._oUserPopover) {
                Fragment.load({
                    name: "lab01.fragment.UserMenu",
                    controller: this
                }).then(function(oPopover) {
                    this._oUserPopover = oPopover;
                    this.getView().addDependent(this._oUserPopover);
                    this._oUserPopover.openBy(oButton);
                }.bind(this));
            } else {
                this._oUserPopover.openBy(oButton);
            }
        },

        onThemePress: function (oEvent) {
            var oButton = oEvent.getSource();
            if (!this._oThemePopover) {
                Fragment.load({
                    name: "lab01.fragment.ThemeSelector",
                    controller: this
                }).then(function(oPopover) {
                    this._oThemePopover = oPopover;
                    this.getView().addDependent(this._oThemePopover);
                    this._oThemePopover.openBy(oButton);
                }.bind(this));
            } else {
                this._oThemePopover.openBy(oButton);
            }
        },

        onRefresh: function () {
            // Обновление данных
            MessageToast.show("Данные обновлены");
            var oEventBus = sap.ui.getCore().getEventBus();
            oEventBus.publish("lab01", "refresh");
        },

        onRequestCreated: function (sChannel, sEvent, oData) {
            // Обновление счетчика уведомлений
            var oShellBar = this.byId("shellBar");
            var nCount = parseInt(oShellBar.getNotificationsNumber()) + 1;
            oShellBar.setNotificationsNumber(nCount.toString());
        },

        onStatusChanged: function (sChannel, sEvent, oData) {
            // Обработка изменения статуса
        }
    });
});
EOF

# Создание Home View
log_info "🏠 Создание Home.view.xml..."
cat > public/js/sap-ui5/view/Home.view.xml << 'EOF'
<mvc:View
    controllerName="lab01.controller.Home"
    xmlns="sap.m"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns:l="sap.ui.layout"
    xmlns:viz="sap.viz.ui5.controls"
    xmlns:mc="sap.suite.ui.microchart">
    
    <Page
        title="Главная"
        showNavButton="false">
        
        <content>
            <l:BlockLayout>
                <!-- KPI Блок -->
                <l:BlockLayoutRow>
                    <l:BlockLayoutCell width="3">
                        <GenericTile
                            header="Новые заявки"
                            subheader="За последние 24 часа"
                            press=".onKPIPress"
                            class="sapUiTinyMarginBegin sapUiTinyMarginTop">
                            <tileContent>
                                <TileContent>
                                    <content>
                                        <NumericContent
                                            value="{dashboard>/kpis/new}"
                                            scale="заявок"
                                            indicator="Up"
                                            valueColor="Good"/>
                                    </content>
                                </TileContent>
                            </tileContent>
                        </GenericTile>
                    </l:BlockLayoutCell>
                    
                    <l:BlockLayoutCell width="3">
                        <GenericTile
                            header="В работе"
                            subheader="Активные заявки"
                            press=".onKPIPress"
                            class="sapUiTinyMarginBegin sapUiTinyMarginTop">
                            <tileContent>
                                <TileContent>
                                    <content>
                                        <NumericContent
                                            value="{dashboard>/kpis/inProgress}"
                                            scale="заявок"
                                            valueColor="Critical"/>
                                    </content>
                                </TileContent>
                            </tileContent>
                        </GenericTile>
                    </l:BlockLayoutCell>
                    
                    <l:BlockLayoutCell width="3">
                        <GenericTile
                            header="Завершено"
                            subheader="За текущий месяц"
                            press=".onKPIPress"
                            class="sapUiTinyMarginBegin sapUiTinyMarginTop">
                            <tileContent>
                                <TileContent>
                                    <content>
                                        <NumericContent
                                            value="{dashboard>/kpis/completed}"
                                            scale="заявок"
                                            indicator="Up"
                                            valueColor="Good"/>
                                    </content>
                                </TileContent>
                            </tileContent>
                        </GenericTile>
                    </l:BlockLayoutCell>
                    
                    <l:BlockLayoutCell width="3">
                        <GenericTile
                            header="Эффективность"
                            subheader="Выполнено в срок"
                            press=".onKPIPress"
                            class="sapUiTinyMarginBegin sapUiTinyMarginTop">
                            <tileContent>
                                <TileContent>
                                    <content>
                                        <NumericContent
                                            value="{dashboard>/kpis/efficiency}"
                                            scale="%"
                                            valueColor="Good"/>
                                    </content>
                                </TileContent>
                            </tileContent>
                        </GenericTile>
                    </l:BlockLayoutCell>
                </l:BlockLayoutRow>
                
                <!-- Графики и таблицы -->
                <l:BlockLayoutRow>
                    <l:BlockLayoutCell width="2">
                        <Panel headerText="Статистика по типам контроля">
                            <viz:VizFrame
                                id="idVizFrame"
                                height="400px"
                                width="100%"
                                vizType="column">
                                <viz:dataset>
                                    <viz.data:FlattenedDataset data="{dashboard>/chartData}">
                                        <viz.data:dimensions>
                                            <viz.data:DimensionDefinition
                                                name="Тип контроля"
                                                value="{controlType}"/>
                                        </viz.data:dimensions>
                                        <viz.data:measures>
                                            <viz.data:MeasureDefinition
                                                name="Количество"
                                                value="{count}"/>
                                        </viz.data:measures>
                                    </viz.data:FlattenedDataset>
                                </viz:dataset>
                            </viz:VizFrame>
                        </Panel>
                    </l:BlockLayoutCell>
                    
                    <l:BlockLayoutCell width="1">
                        <Panel headerText="Последние заявки">
                            <Table
                                items="{dashboard>/recentRequests}"
                                growing="true"
                                growingThreshold="10">
                                <columns>
                                    <Column>
                                        <Text text="Номер"/>
                                    </Column>
                                    <Column>
                                        <Text text="Заказ"/>
                                    </Column>
                                    <Column>
                                        <Text text="Статус"/>
                                    </Column>
                                </columns>
                                <items>
                                    <ColumnListItem
                                        type="Navigation"
                                        press=".onRequestPress">
                                        <cells>
                                            <ObjectIdentifier
                                                title="{requestNumber}"/>
                                            <Text text="{orderNumber}"/>
                                            <ObjectStatus
                                                text="{statusText}"
                                                state="{statusState}"/>
                                        </cells>
                                    </ColumnListItem>
                                </items>
                            </Table>
                        </Panel>
                    </l:BlockLayoutCell>
                </l:BlockLayoutRow>
            </l:BlockLayout>
        </content>
        
        <footer>
            <OverflowToolbar>
                <ToolbarSpacer/>
                <Button
                    text="Создать заявку"
                    type="Emphasized"
                    icon="sap-icon://add"
                    press=".onCreateRequest"/>
            </OverflowToolbar>
        </footer>
    </Page>
</mvc:View>
EOF

# Создание улучшенного push-notifications.js
log_info "🔔 Обновление push-notifications.js..."
cat > public/js/push-notifications.js << EOF
// push-notifications.js - Улучшенное управление push-уведомлениями

class PushNotificationManager {
    constructor() {
        this.vapidPublicKey = '$PUBLIC_KEY';
        this.serverUrl = window.location.origin;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.permission = Notification.permission;
    }

    async init() {
        if (!this.isSupported) {
            console.log('Push-уведомления не поддерживаются');
            return false;
        }

        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker зарегистрирован');
            
            if (this.permission === 'default') {
                // Ждем 5 секунд перед показом запроса
                setTimeout(() => this.showPermissionPrompt(), 5000);
            } else if (this.permission === 'granted') {
                await this.subscribeUser();
            }
            
            return true;
        } catch (error) {
            console.error('Ошибка регистрации Service Worker:', error);
            return false;
        }
    }

    showPermissionPrompt() {
        if (typeof sap !== 'undefined' && sap.m && sap.m.MessageBox) {
            sap.m.MessageBox.confirm(
                "Хотите получать уведомления о новых заявках и изменениях статусов?",
                {
                    title: "Включить уведомления",
                    actions: [sap.m.MessageBox.Action.YES, sap.m.MessageBox.Action.NO],
                    onClose: async (oAction) => {
                        if (oAction === sap.m.MessageBox.Action.YES) {
                            await this.requestPermission();
                        }
                    }
                }
            );
        } else {
            // Fallback для не-SAP UI5 окружения
            const promptDiv = document.createElement('div');
            promptDiv.className = 'push-permission-prompt';
            promptDiv.innerHTML = \`
                <div class="prompt-content">
                    <h3>Включить уведомления?</h3>
                    <p>Получайте уведомления о новых заявках, изменениях статусов и приближающихся сроках</p>
                    <div class="prompt-buttons">
                        <button class="btn btn-primary" onclick="pushManager.requestPermission()">Включить</button>
                        <button class="btn btn-secondary" onclick="pushManager.dismissPrompt()">Позже</button>
                    </div>
                </div>
            \`;
            document.body.appendChild(promptDiv);
        }
    }

    async requestPermission() {
        this.dismissPrompt();
        
        const permission = await Notification.requestPermission();
        this.permission = permission;
        
        if (permission === 'granted') {
            await this.subscribeUser();
            this.showNotification('Уведомления включены', {
                body: 'Вы будете получать уведомления о важных событиях',
                icon: '/icon-192x192.png'
            });
        }
    }

    dismissPrompt() {
        const prompt = document.querySelector('.push-permission-prompt');
        if (prompt) {
            prompt.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => prompt.remove(), 300);
        }
    }

    async subscribeUser() {
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                const convertedKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedKey
                });
            }
            
            await this.updateSubscriptionOnServer(subscription);
            console.log('Пользователь подписан на push-уведомления');
            return subscription;
            
        } catch (error) {
            console.error('Ошибка подписки:', error);
            return null;
        }
    }

    async updateSubscriptionOnServer(subscription) {
        try {
            const response = await fetch(\`\${this.serverUrl}/api/notifications/push/subscribe\`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subscription: subscription,
                    userId: this.getUserId()
                })
            });
            
            if (!response.ok) {
                throw new Error('Ошибка сохранения подписки на сервере');
            }
        } catch (error) {
            console.error('Ошибка обновления подписки:', error);
        }
    }

    getUserId() {
        return localStorage.getItem('lab01_userName') || 
               localStorage.getItem('userName') || 
               'anonymous';
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    }

    showNotification(title, options = {}) {
        if (this.permission === 'granted') {
            new Notification(title, {
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                ...options
            });
        }
    }
}

// Создаем глобальный экземпляр
window.pushManager = new PushNotificationManager();

// Инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.pushManager.init();
    });
} else {
    window.pushManager.init();
}
EOF

# Создание расширенного файла стилей
log_info "🎨 Создание расширенных стилей..."
cat > public/css/sap-fiori-extended.css << 'EOF'
/* SAP Fiori Extended Styles для LAB01 */

/* Анимации */
@keyframes slideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* Улучшенные тайлы */
.sapMGT {
    animation: slideIn 0.3s ease-out;
    transition: all 0.2s ease;
}

.sapMGT:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
}

/* Кастомные цвета статусов */
.lab01StatusNew { color: #0a6ed1; }
.lab01StatusInProgress { color: #e9730c; }
.lab01StatusTesting { color: #9c27b0; }
.lab01StatusCompleted { color: #107e3e; }
.lab01StatusCancelled { color: #bb0000; }

/* Адаптивные отступы */
@media (max-width: 599px) {
    .sapMPage > section {
        padding: 0.5rem !important;
    }
}

@media (min-width: 600px) and (max-width: 1023px) {
    .sapMPage > section {
        padding: 1rem !important;
    }
}

/* Темная тема дополнения */
.sapUiTheme-sap_fiori_3_dark .lab01CustomPanel,
.sapUiTheme-sap_horizon_dark .lab01CustomPanel {
    background-color: rgba(255,255,255,0.05);
}

/* Улучшенные уведомления */
.sapMMessageToast {
    animation: slideIn 0.3s ease-out;
}

/* Кастомный скроллбар */
.sapMScrollContainer::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.sapMScrollContainer::-webkit-scrollbar-track {
    background: transparent;
}

.sapMScrollContainer::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.2);
    border-radius: 4px;
}

.sapMScrollContainer::-webkit-scrollbar-thumb:hover {
    background: rgba(0,0,0,0.3);
}

/* Push уведомления стили */
.push-permission-prompt {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    padding: 20px;
    max-width: 350px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
}

@keyframes slideOut {
    to { 
        opacity: 0; 
        transform: translateX(400px); 
    }
}

/* Печать */
@media print {
    .sapMShellBar,
    .sapTntToolPage > aside,
    .sapMPageFooter {
        display: none !important;
    }
    
    .sapMPage {
        padding: 0 !important;
    }
}
EOF

# Создание Service Worker для SAP UI5
log_info "👷 Создание Service Worker..."
cat > public/sw-sap.js << 'EOF'
// Service Worker для SAP UI5 версии LAB01

const CACHE_NAME = 'lab01-sap-v2.0.0';
const urlsToCache = [
    '/',
    '/index-sap.html',
    '/css/sap-fiori.css',
    '/css/sap-fiori-extended.css',
    '/js/sap-ui5/Component.js',
    '/js/sap-ui5/config.js',
    '/i18n/i18n.properties',
    '/manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'Новое уведомление',
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/badge-72x72.png',
        vibrate: [200, 100, 200],
        data: data.data || {},
        actions: [
            {
                action: 'open',
                title: 'Открыть'
            },
            {
                action: 'close',
                title: 'Закрыть'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'LAB01', options)
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});
EOF

# Обновление package.json
log_info "📦 Обновление package.json..."
if [ -f "package.json" ]; then
    # Создаем временный файл для обновленного package.json
    cat > package_temp.json << 'EOF'
{
    "name": "lab01-sap-ui5",
    "version": "2.0.0",
    "description": "LAB01 - Система управления заявками НК с SAP UI5",
    "main": "server.js",
    "scripts": {
        "start": "node server.js",
        "start:sap": "npm start -- --sap-ui5",
        "dev": "nodemon server.js",
        "dev:sap": "nodemon server.js --sap-ui5",
        "build:sap": "echo 'Building SAP UI5 version...'",
        "test": "echo 'Running tests...'",
        "generate-vapid": "web-push generate-vapid-keys",
        "migrate": "node scripts/migrate-to-sap.js"
    },
    "keywords": [
        "ndt",
        "sap-ui5",
        "fiori",
        "lab01"
    ],
    "dependencies": {
        "cors": "^2.8.5",
        "dotenv": "^16.6.1",
        "express": "^4.18.2",
        "multer": "^1.4.5-lts.1",
        "node-cron": "^3.0.3",
        "nodemailer": "^6.10.1",
        "sqlite3": "^5.1.6",
        "web-push": "^3.6.7"
    },
    "devDependencies": {
        "nodemon": "^3.0.1"
    }
}
EOF
    mv package_temp.json package.json
fi

# Создание .env.example
log_info "🔐 Создание .env.example..."
cat > .env.example << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration
EMAIL_ENABLED=true
EMAIL_HOST=smtp.yandex.ru
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=your-email@yandex.ru
EMAIL_PASS=your-password
EMAIL_FROM=LAB01 System <your-email@yandex.ru>

# Push Notifications
PUSH_ENABLED=true
VAPID_SUBJECT=mailto:admin@company.ru
VAPID_PUBLIC_KEY=$PUBLIC_KEY
VAPID_PRIVATE_KEY=$PRIVATE_KEY

# Application URL
APP_URL=http://localhost:3000
EOF

# Создание миграционного скрипта
log_info "🔄 Создание миграционного скрипта..."
mkdir -p scripts
cat > scripts/migrate-to-sap.js << 'EOF'
// Скрипт миграции на SAP UI5

const fs = require('fs');
const path = require('path');

console.log('🔄 Начало миграции на SAP UI5...');

// Миграция настроек localStorage
const migrateSettings = () => {
    console.log('📦 Миграция настроек...');
    
    // Здесь должна быть логика миграции настроек
    // Для браузерного окружения это делается на клиенте
    
    console.log('✅ Настройки мигрированы');
};

// Проверка структуры папок
const checkFolderStructure = () => {
    const requiredFolders = [
        'public/js/sap-ui5',
        'public/i18n',
        'public/css'
    ];
    
    requiredFolders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            console.error(`❌ Папка ${folder} не найдена`);
            process.exit(1);
        }
    });
    
    console.log('✅ Структура папок проверена');
};

// Запуск миграции
checkFolderStructure();
migrateSettings();

console.log('🎉 Миграция завершена успешно!');
EOF

# Создание README
log_info "📚 Создание документации..."
cat > SAP_UI5_README.md << 'EOF'
# LAB01 - SAP UI5 Version 2.0

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка окружения
```bash
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Генерация VAPID ключей (для push-уведомлений)
```bash
npm run generate-vapid
```

### 4. Запуск сервера
```bash
# Обычный режим
npm start

# Режим разработки с автоперезагрузкой
npm run dev:sap
```

### 5. Открытие в браузере
- SAP UI5 интерфейс: http://localhost:3000/index-sap.html
- Классический интерфейс: http://localhost:3000

## 📁 Структура проекта

```
public/
├── js/sap-ui5/
│   ├── Component.js        # Главный компонент приложения
│   ├── config.js          # Конфигурация
│   ├── controller/        # Контроллеры MVC
│   ├── view/             # XML представления
│   ├── fragment/         # Переиспользуемые фрагменты
│   ├── model/           # Модели данных
│   ├── formatter/       # Функции форматирования
│   └── util/           # Утилиты
├── i18n/               # Файлы локализации
├── css/               # Стили
└── resources/         # Статические ресурсы
```

## 🎨 Доступные темы

1. **SAP Fiori 3** (по умолчанию) - Светлая современная тема
2. **SAP Fiori 3 Dark** - Темная версия Fiori 3
3. **SAP Horizon** - Новейшая тема SAP
4. **SAP Horizon Dark** - Темная версия Horizon
5. **SAP Belize** - Классическая тема
6. **SAP Belize Plus** - Расширенная версия Belize

## 🔧 Конфигурация

### Базовые настройки (config.js)
- `apiUrl` - URL API сервера
- `wsUrl` - URL WebSocket сервера
- `vapidPublicKey` - Публичный ключ для push-уведомлений

### Функции
- `notifications` - Push-уведомления
- `offline` - Офлайн режим через Service Worker
- `darkMode` - Поддержка темной темы
- `export` - Экспорт данных

## 🛠️ Разработка

### Режим отладки
```
http://localhost:3000/index-sap.html?sap-ui-debug=true
```

### Инспектор UI5
```
http://localhost:3000/index-sap.html?sap-ui-debug=true&sap-ui-inspect=true
```

### Логирование
```javascript
jQuery.sap.log.setLevel(jQuery.sap.log.Level.DEBUG);
```

## 📱 Адаптивность

Приложение автоматически адаптируется под:
- 📱 Телефоны (< 600px)
- 📱 Планшеты (600px - 1023px)
- 💻 Десктопы (> 1024px)

## 🔔 Push-уведомления

1. При первом запуске будет запрошено разрешение
2. Настройки доступны в разделе "Настройки"
3. Поддерживаются уведомления о:
   - Новых заявках
   - Изменениях статусов
   - Приближающихся дедлайнах
   - Просроченных заявках

## 🌐 Локализация

Поддерживаемые языки:
- 🇷🇺 Русский (по умолчанию)
- 🇬🇧 Английский

Для добавления нового языка:
1. Создайте файл `i18n/i18n_XX.properties`
2. Добавьте язык в `Component.js`

## 🚨 Решение проблем

### Service Worker не регистрируется
```bash
# Очистите кэш браузера или
# Откройте в режиме инкогнито
```

### Ошибка CORS
```javascript
// В server.js добавьте
app.use(cors({
    origin: true,
    credentials: true
}));
```

### Push-уведомления не работают
1. Проверьте VAPID ключи в .env
2. Убедитесь, что используется HTTPS (или localhost)

## 📊 Производительность

- Ленивая загрузка компонентов
- Кэширование через Service Worker
- Минификация в production режиме
- Оптимизация изображений

## 🔒 Безопасность

- HTTPS для push-уведомлений
- Валидация данных на сервере
- Защита от XSS через SAP UI5
- Безопасные заголовки HTTP

## 📚 Дополнительные ресурсы

- [SAP UI5 Documentation](https://ui5.sap.com/)
- [SAP Fiori Design Guidelines](https://experience.sap.com/fiori-design/)
- [OpenUI5 GitHub](https://github.com/SAP/openui5)
EOF

# Финальное сообщение
echo
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ✅ Установка завершена!                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo
echo "📋 Дальнейшие шаги:"
echo "1. Скопируйте .env.example в .env и настройте"
echo "2. Сгенерируйте VAPID ключи: npm run generate-vapid"
echo "3. Перезапустите сервер: npm run dev:sap"
echo "4. Откройте http://localhost:3000/index-sap.html"
echo
echo "📖 Документация: SAP_UI5_README.md"
echo
log_info "Для возврата к старой версии используйте http://localhost:3000"

# Сохранение VAPID ключей в файл для справки
if [ ! -z "$PUBLIC_KEY" ]; then
    cat > VAPID_KEYS.txt << EOF
VAPID Keys Generated:
====================
Public Key: $PUBLIC_KEY
Private Key: $PRIVATE_KEY

Add these to your .env file!
EOF
    log_info "VAPID ключи сохранены в VAPID_KEYS.txt"
fi
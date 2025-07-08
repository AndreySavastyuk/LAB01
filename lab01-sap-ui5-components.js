// lab01-sap-ui5-components.js - Структура компонентов SAP UI5 для LAB01

// Конфигурация манифеста приложения
const manifest = {
    "_version": "1.32.0",
    "sap.app": {
        "id": "com.lab01.ndt.requests",
        "type": "application",
        "i18n": "i18n/i18n.properties",
        "title": "{{appTitle}}",
        "description": "{{appDescription}}",
        "applicationVersion": {
            "version": "1.0.0"
        },
        "dataSources": {
            "mainService": {
                "uri": "/api/",
                "type": "REST",
                "settings": {
                    "localUri": "localService/metadata.xml"
                }
            }
        }
    },
    "sap.ui": {
        "technology": "UI5",
        "icons": {
            "icon": "sap-icon://lab",
            "favIcon": "icon/favicon.ico"
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
                "sap.viz": {},
                "sap.suite.ui.microchart": {}
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
                    "bundleName": "com.lab01.ndt.requests.i18n.i18n"
                }
            },
            "": {
                "dataSource": "mainService",
                "type": "sap.ui.model.json.JSONModel",
                "settings": {
                    "defaultBindingMode": "TwoWay"
                }
            }
        },
        "routing": {
            "config": {
                "routerClass": "sap.m.routing.Router",
                "viewType": "XML",
                "viewPath": "com.lab01.ndt.requests.view",
                "controlId": "app",
                "controlAggregation": "pages",
                "transition": "slide",
                "bypassed": {
                    "target": ["notFound"]
                }
            },
            "routes": [
                {
                    "name": "home",
                    "pattern": "",
                    "target": ["home"]
                },
                {
                    "name": "requests",
                    "pattern": "requests/{filter}",
                    "target": ["requests"]
                },
                {
                    "name": "requestDetail",
                    "pattern": "request/{requestId}",
                    "target": ["requestDetail"]
                },
                {
                    "name": "reports",
                    "pattern": "reports",
                    "target": ["reports"]
                },
                {
                    "name": "settings",
                    "pattern": "settings",
                    "target": ["settings"]
                }
            ],
            "targets": {
                "home": {
                    "viewType": "XML",
                    "viewName": "Home",
                    "viewLevel": 1
                },
                "requests": {
                    "viewType": "XML",
                    "viewName": "Requests",
                    "viewLevel": 2
                },
                "requestDetail": {
                    "viewType": "XML",
                    "viewName": "RequestDetail",
                    "viewLevel": 3
                },
                "reports": {
                    "viewType": "XML",
                    "viewName": "Reports",
                    "viewLevel": 2
                },
                "settings": {
                    "viewType": "XML",
                    "viewName": "Settings",
                    "viewLevel": 2
                },
                "notFound": {
                    "viewType": "XML",
                    "viewName": "NotFound",
                    "viewLevel": 1
                }
            }
        }
    }
};

// Главный компонент приложения
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/f/FlexibleColumnLayoutSemanticHelper"
], function (UIComponent, Device, JSONModel, FlexibleColumnLayoutSemanticHelper) {
    "use strict";

    return UIComponent.extend("com.lab01.ndt.requests.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Вызов базовой функции init
            UIComponent.prototype.init.apply(this, arguments);

            // Создание модели устройства
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");

            // Создание модели для FlexibleColumnLayout
            var oLayoutModel = new JSONModel();
            this.setModel(oLayoutModel, "layout");

            // Инициализация роутера
            this.getRouter().initialize();

            // Инициализация сервиса уведомлений
            this._initNotificationService();
        },

        _initNotificationService: function() {
            // Подключение к WebSocket для real-time обновлений
            if (window.WebSocket) {
                this._ws = new WebSocket("ws://localhost:3000/ws");
                this._ws.onmessage = function(event) {
                    var data = JSON.parse(event.data);
                    this._handleRealtimeUpdate(data);
                }.bind(this);
            }
        },

        _handleRealtimeUpdate: function(data) {
            // Обработка real-time обновлений
            switch(data.type) {
                case "request_created":
                    this._showNotification("Создана новая заявка: " + data.requestNumber);
                    break;
                case "status_changed":
                    this._showNotification("Изменен статус заявки: " + data.requestNumber);
                    break;
            }
        },

        _showNotification: function(message) {
            sap.m.MessageToast.show(message, {
                duration: 3000,
                width: "20em",
                at: "end top",
                offset: "-10 10"
            });
        }
    });
});

// Контроллер главной страницы
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/core/format/DateFormat"
], function (Controller, JSONModel, MessageBox, DateFormat) {
    "use strict";

    return Controller.extend("com.lab01.ndt.requests.controller.Home", {
        onInit: function () {
            this._loadDashboardData();
            this._initCharts();
        },

        _loadDashboardData: function() {
            var oModel = new JSONModel();
            
            // Загрузка данных дашборда
            jQuery.ajax({
                url: "/api/stats",
                type: "GET",
                success: function(data) {
                    oModel.setData({
                        kpis: {
                            new: data.newToday || 0,
                            inProgress: data.active || 0,
                            completed: data.completedMonth || 0,
                            efficiency: data.efficiency || 0
                        },
                        recentRequests: data.recent || [],
                        chartData: this._prepareChartData(data)
                    });
                    this.getView().setModel(oModel, "dashboard");
                }.bind(this),
                error: function() {
                    MessageBox.error("Ошибка загрузки данных дашборда");
                }
            });
        },

        _initCharts: function() {
            // Инициализация VizFrame для графиков
            var oVizFrame = this.byId("idVizFrame");
            if (oVizFrame) {
                oVizFrame.setVizProperties({
                    plotArea: {
                        colorPalette: ['#0854a0', '#107e3e', '#e9730c', '#bb0000'],
                        dataLabel: {
                            visible: true
                        }
                    },
                    title: {
                        visible: false
                    }
                });
            }
        },

        onNavToRequests: function(oEvent) {
            this.getOwnerComponent().getRouter().navTo("requests", {
                filter: "all"
            });
        },

        onCreateRequest: function(oEvent) {
            if (!this._oCreateDialog) {
                this._oCreateDialog = sap.ui.xmlfragment(
                    "com.lab01.ndt.requests.fragment.CreateRequest",
                    this
                );
                this.getView().addDependent(this._oCreateDialog);
            }
            this._oCreateDialog.open();
        },

        onTilePress: function(oEvent) {
            var sFilter = oEvent.getSource().data("filter");
            this.getOwnerComponent().getRouter().navTo("requests", {
                filter: sFilter
            });
        }
    });
});

// Фрагмент формы создания заявки (XML)
const createRequestFragment = `
<core:FragmentDefinition
    xmlns="sap.m"
    xmlns:core="sap.ui.core"
    xmlns:f="sap.ui.layout.form">
    <Dialog
        id="createRequestDialog"
        title="{i18n>createRequestTitle}"
        contentWidth="40rem"
        contentHeight="30rem"
        resizable="true"
        draggable="true">
        <content>
            <f:SimpleForm
                editable="true"
                layout="ResponsiveGridLayout"
                labelSpanXL="3"
                labelSpanL="3"
                labelSpanM="3"
                labelSpanS="12"
                adjustLabelSpan="false"
                emptySpanXL="0"
                emptySpanL="0"
                emptySpanM="0"
                emptySpanS="0"
                columnsXL="2"
                columnsL="2"
                columnsM="1">
                <f:content>
                    <Label text="{i18n>orderNumber}" required="true"/>
                    <Input value="{/newRequest/orderNumber}" placeholder="2022/048"/>
                    
                    <Label text="{i18n>drawing}" required="true"/>
                    <Input value="{/newRequest/drawing}" placeholder="НЗ.022.048.005.01 - Корпус"/>
                    
                    <Label text="{i18n>controlType}" required="true"/>
                    <Select selectedKey="{/newRequest/controlTypeId}">
                        <items>
                            <core:Item key="1" text="УЗК - Ультразвуковой контроль"/>
                            <core:Item key="2" text="ЦД - Цветная дефектоскопия"/>
                            <core:Item key="3" text="РК - Радиографический контроль"/>
                        </items>
                    </Select>
                    
                    <Label text="{i18n>station}" required="true"/>
                    <Select selectedKey="{/newRequest/stationId}">
                        <items>
                            <core:Item key="1" text="Руппур"/>
                            <core:Item key="2" text="Аккую"/>
                            <core:Item key="3" text="Нововоронежская"/>
                        </items>
                    </Select>
                    
                    <Label text="{i18n>executor}"/>
                    <Select selectedKey="{/newRequest/executorId}">
                        <items>
                            <core:Item key="1" text="Матросова Е.И."/>
                            <core:Item key="2" text="Петров С.А."/>
                            <core:Item key="3" text="Иванов М.П."/>
                        </items>
                    </Select>
                    
                    <Label text="{i18n>priority}"/>
                    <Select selectedKey="{/newRequest/priority}">
                        <items>
                            <core:Item key="1" text="Высокий"/>
                            <core:Item key="2" text="Средний"/>
                            <core:Item key="3" text="Низкий"/>
                        </items>
                    </Select>
                    
                    <Label text="{i18n>deadline}"/>
                    <DatePicker value="{/newRequest/deadline}"/>
                    
                    <Label text="{i18n>notes}"/>
                    <TextArea value="{/newRequest/notes}" rows="3"/>
                </f:content>
            </f:SimpleForm>
        </content>
        <beginButton>
            <Button
                text="{i18n>create}"
                type="Emphasized"
                press="onCreateRequestConfirm"/>
        </beginButton>
        <endButton>
            <Button
                text="{i18n>cancel}"
                press="onCreateRequestCancel"/>
        </endButton>
    </Dialog>
</core:FragmentDefinition>
`;

// Модель данных для списка заявок
const requestListModel = {
    requests: [
        {
            id: 1,
            requestNumber: "НК-2024-0142",
            orderNumber: "2022/048",
            drawing: "НЗ.022.048.005.01 - Корпус",
            controlType: "УЗК",
            controlTypeId: 1,
            station: "Руппур",
            stationId: 1,
            executor: "Матросова Е.И.",
            executorId: 1,
            status: "new",
            statusText: "Новая",
            statusState: "Information",
            priority: 1,
            priorityText: "Высокий",
            priorityState: "Error",
            deadline: new Date("2024-12-25"),
            createdAt: new Date("2024-12-20"),
            isLocked: false
        }
    ],
    filters: {
        status: "",
        controlType: "",
        station: "",
        executor: "",
        search: ""
    }
};

// Formatter для форматирования данных
sap.ui.define([], function () {
    "use strict";
    
    return {
        statusText: function (sStatus) {
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            return oResourceBundle.getText("status." + sStatus);
        },
        
        statusState: function (sStatus) {
            var mStateMap = {
                "new": "Information",
                "in_progress": "Warning",
                "completed": "Success",
                "cancelled": "Error"
            };
            return mStateMap[sStatus] || "None";
        },
        
        priorityIcon: function (iPriority) {
            var mIconMap = {
                1: "sap-icon://high-priority",
                2: "sap-icon://medium-priority",
                3: "sap-icon://low-priority"
            };
            return mIconMap[iPriority] || "";
        },
        
        dateFormatter: function (oDate) {
            if (!oDate) return "";
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "dd.MM.yyyy"
            });
            return oDateFormat.format(oDate);
        },
        
        daysUntilDeadline: function (oDeadline) {
            if (!oDeadline) return "";
            var oToday = new Date();
            var nDiff = Math.floor((oDeadline - oToday) / (1000 * 60 * 60 * 24));
            if (nDiff < 0) return "Просрочено на " + Math.abs(nDiff) + " дн.";
            if (nDiff === 0) return "Срок сегодня";
            if (nDiff === 1) return "Срок завтра";
            return "Осталось " + nDiff + " дн.";
        }
    };
});
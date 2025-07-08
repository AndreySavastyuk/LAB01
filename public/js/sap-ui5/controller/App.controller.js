sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("lab01.controller.App", {
        onInit: function () {
            console.log("App Controller initialized");
        },

        onCreateRequest: function () {
            MessageToast.show("Функция создания заявки будет реализована");
        },

        onViewRequests: function () {
            MessageToast.show("Функция просмотра заявок будет реализована");
        },

        onReports: function () {
            MessageToast.show("Функция отчетов будет реализована");
        },

        onClassicVersion: function () {
            window.location.href = "/";
        }
    });
}); 
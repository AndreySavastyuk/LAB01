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
        },

        createContent: function () {
            return sap.ui.view({
                viewName: "lab01.view.App",
                type: "XML"
            });
        }
    });
});

sap.ui.define([
    "sap/ui/core/ComponentContainer"
], function (ComponentContainer) {
    "use strict";

    new ComponentContainer({
        name: "lab01",
        settings: {
            id: "lab01"
        },
        async: true
    }).placeAt("content");
}); 
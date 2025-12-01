import React from "react";

import "./styles.css";
import { PanelController } from "./controllers/PanelController.jsx";

import { entrypoints } from "uxp";
import {VoronaPlugin} from "./components/VoronaPlugin";
import {VoronaDocs} from "./components/VoronaDocs";

const demosController =  new PanelController(() => <VoronaPlugin />, {id: "demos", menuItems: [
    { id: "reload1", label: "Перезагрузка плагина", enabled: true, checked: false, oninvoke: () => location.reload() },
] });

const demosController2 =  new PanelController(() => <VoronaDocs />, {id: "demos", menuItems: [
        { id: "reload2", label: "Перезагрузка плагина", enabled: true, checked: false, oninvoke: () => location.reload() },
    ] });

entrypoints.setup({
    plugin: {
        create(plugin) {
            /* optional */ console.log("created", plugin);
        },
        destroy() {
            /* optional */ console.log("destroyed");
        }
    },
    commands: {
    },
    panels: {
        demos: demosController,
        demos2: demosController2,
    }
});

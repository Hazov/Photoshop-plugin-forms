import React from "react";

import "./styles.css";
import { PanelController } from "./controllers/PanelController.jsx";

import { entrypoints } from "uxp";
import {VoronaPlugin} from "./components/VoronaPlugin";

const demosController =  new PanelController(() => <VoronaPlugin />, {id: "demos", menuItems: [
    { id: "reload1", label: "Reload Plugin", enabled: true, checked: false, oninvoke: () => location.reload() },
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
    }
});

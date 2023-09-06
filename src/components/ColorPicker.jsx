import React, { useRef, useState } from "react";

import { WC } from "../components/WC.jsx";

import "./ColorPicker.css";

const photoshop = require('photoshop');
const app = photoshop.app;

export const ColorPicker = () => {
    const updateColor = async (evt) =>  {
        let activeDocument = app.activeDocument;
        execute(() => activeDocument.createLayer({name: "myLayer", opacity: 80, blendMode: "colorDodge" }));

    }
    async function execute(pluginFunc){
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    return (
        <div>
            <sp-button id="createNewLayerBtn" onClick={() => updateColor()}>Создать новый слой</sp-button>
        </div>
        );
    }


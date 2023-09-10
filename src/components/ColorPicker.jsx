import React, { useRef, useState } from "react";

import { WC } from "../components/WC.jsx";

import "./ColorPicker.css";

const photoshop = require('photoshop');
const app = photoshop.app;
const localFs = require('uxp').storage.localFileSystem;


let allForms = ['1', '2'];


export const ColorPicker = () => {
    const createNewLayerInApp = async (evt) =>  {
        let activeDocument = app.activeDocument;
        execute(() => activeDocument.createLayer({name: "myLayer", opacity: 80, blendMode: "colorDodge" }));
    }

    const getFormsInMenu = async (evt) =>  {
        allForms = ['235235'];
    }

    function getAllForms(){
        return allForms;
    }



    function fetchAllForms(){
        let pluginFolder = localFs.getPluginFolder;
        let forms;
        let allFiles = getAllFiles(pluginFolder);
        forms = allFiles.forEach(file => {
            let formGroup = file.getFolder();
            let formName = file.getName();
            let fileSizes = getAllSizes(file);
            if(!forms[formGroup]){
                forms[formGroup] = [];
            }
            forms[formGroup].push({formName: formName, fileSizes: fileSizes});
        })
        allForms = forms;

    }
    async function execute(pluginFunc){
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    return (
        <div>
            <input
                onChange={(e) => getFormsInMenu(e)}
                className={'searchFormsInput'} type="search" id="site-search" name="q" />
            <ul>
                {getAllForms().map( (form, index) => {
                    return (
                        <li key={index}>
                            <span>{form}</span>
                        </li>
                    )
                })}
            </ul>
            <button onClick={(e) => createNewLayerInApp(e)} className={'searchFormsBtn'}>Найти</button>
        </div>
        );
    }


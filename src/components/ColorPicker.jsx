import React, {useState} from "react";

import { WC } from "../components/WC.jsx";

import "./ColorPicker.css";

const photoshop = require('photoshop');
const uxp = require('uxp');
const app = photoshop.app;
const storage = uxp.storage;
const imaging = photoshop.imaging;
const formats = storage.formats

export const ColorPicker = () => {
    let [forms, setForms] = useState([]);
    getAllOfEntity('forms').then(resolve => {
        setForms(resolve);
    })
    // setForms(getAllOfEntity('forms'));
    const createNewLayerInApp = async (evt) =>  {
        let activeDocument = app.activeDocument;
        execute(() => activeDocument.createLayer({name: "myLayer", opacity: 80, blendMode: "colorDodge" }));
    }

    async function getAllForms() {
        return forms;
        // if(forms.length !== 0) return forms;
        // setForms([]);
        // setForms(await getAllOfEntity('forms'));
        // return forms;
    }

    async function getAllOfEntity(entities){
        let result = [];
        let pluginFolder = await uxp.storage.localFileSystem.getPluginFolder();
        let formsFolder = await pluginFolder.getEntry("allFiles/" + entities);
        let entries = await formsFolder.getEntries();
        for (const file of entries.filter(entry => entry.isFile)) {
            let bytes = await file.read({format: formats.binary})
            result.push(
                {
                    name: file.name.split('.')[0],
                    file: _arrayBufferToBase64(bytes)
                })
        }
        return result;
    }

    // async function renderImage(imageData, arr){
    //     let imageElement = document.createElement('img');
    //     imageElement.src = "data:image/png;base64," + _arrayBufferToBase64(arr);
    //     document.body.appendChild(imageElement);
    //     imageData.dispose();
    // }
    // function fetchAllForms(){
    //     let pluginFolder = localFs.getPluginFolder;
    //     let forms;
    //     let allFiles = getAllFiles(pluginFolder);
    //     forms = allFiles.forEach(file => {
    //         let formGroup = file.getFolder();
    //         let formName = file.getName();
    //         let fileSizes = getAllSizes(file);
    //         if(!forms[formGroup]){
    //             forms[formGroup] = [];
    //         }
    //         forms[formGroup].push({formName: formName, fileSizes: fileSizes});
    //     })
    //     allForms = forms;
    //
    // }
    async function execute(pluginFunc){
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    function _arrayBufferToBase64( buffer ) {
        var binary = '';
        var bytes = new Uint8Array( buffer );
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode( bytes[ i ] );
        }
        return window.btoa( binary );
    }

    return (
        <div>
            <div>
                <h1>Форма</h1>
                <h2>Тип формы</h2>
                <sp-radio-group label="Medium" selected="man" name="Тип формы">
                    <sp-radio value="military" size="m">Военная</sp-radio>
                    <sp-radio value="mchs" size="m">МЧС</sp-radio>
                </sp-radio-group>
                <h2>Пол формы</h2>
                <sp-radio-group label="Medium" selected="man" name="Пол формы">
                    <sp-radio value="man" size="m">Мужская</sp-radio>
                    <sp-radio value="woman" size="m">Женская</sp-radio>
                </sp-radio-group>
                <h2>Цвет формы</h2>
                <sp-radio-group label="Medium" selected="man" name="Цвет формы">
                    <sp-radio value="black" size="m">Черная</sp-radio>
                    <sp-radio value="blue" size="m">Синяя</sp-radio>
                    <sp-radio value="mchs" size="m">Мчс</sp-radio>
                </sp-radio-group>
                <h2>Просветы (окантовка)</h2>
                <sp-radio-group label="Medium" selected="man" name="Просветы (окантовка)">
                    <sp-radio value="black" size="m">Белая</sp-radio>
                    <sp-radio value="blue" size="m">Синяя</sp-radio>
                    <sp-radio value="mchs" size="m">Красная</sp-radio>
                </sp-radio-group>
            </div>
            <sp-picker>
                <sp-textfield
                    id="searchFormsInput" type="search">
                </sp-textfield>
                <sp-menu>
                    {forms.map((form, index) => {
                        return (
                            <sp-menu-item onClick={(e) => createNewLayerInApp(e)} className={'searchFormsBtn'} key={index}>
                                {form.name}
                            </sp-menu-item>
                        )
                    })}
                </sp-menu>
            </sp-picker>
        </div>
        );
    }


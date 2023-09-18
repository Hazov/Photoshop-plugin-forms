import React, {useState} from "react";

import { WC } from "../components/WC.jsx";

import "./ColorPicker.css";

const photoshop = require('photoshop');
const uxp = require('uxp');
const app = photoshop.app;
const storage = uxp.storage;
const imaging = photoshop.imaging;
const formats = storage.formats
let currentFormFolder = ['allFiles','forms']
let isInit = false;

export const ColorPicker = () => {
    let [formCategory, setFormCategory] = useState({title: '', categoryItems: []});
    let [filteredFormItems, setFilteredFormItems] = useState([]);
    init();

    function init(){
        if(!isInit){
            getAllOfEntity('forms').then(resolve => setForms(resolve));
            fetchFormCategory().then(resolve => setFormCategory(resolve));
            isInit = true
        }
    }
    const createNewLayerInApp = async (evt) =>  {
        let activeDocument = app.activeDocument;
        execute(() => activeDocument.createLayer({name: "myLayer", opacity: 80, blendMode: "colorDodge" }));
    }

    async function fetchFormCategory(){
        let pluginFolder = await uxp.storage.localFileSystem.getPluginFolder();
        let folder = pluginFolder;
        for(let p of currentFormFolder){
            folder = await folder.getEntry(p)
        }
        let entries = await folder.getEntries();
        let infoFile = entries.find(entry => entry.name.includes('.info'));
        if(infoFile){
            let title = infoFile.name.split('.info')[0];
            let categoryItems = entries.filter(entry => entry.isFolder).map(folder => folder.name);
            return {title: title, categoryItems: categoryItems };
        } else{
            let formItems = entries.filter(entry => entry.isFile).map(file => file.name.split('.')[0]);
            return {title: null, categoryItems: null, formItems: formItems}
        }
        return null;
    }

    function prevCategory(){
        currentFormFolder.pop();
        fetchFormCategory().then(resolve => setFormCategory(resolve));
    }
    function nextCategory(title, item) {
        currentFormFolder.push(item);
        fetchFormCategory().then(resolve => setFormCategory(resolve));
    }

    async function getAllOfEntity(entities){
        let result = [];
        let pluginFolder = await uxp.storage.localFileSystem.getPluginFolder();
        let folder = await pluginFolder.getEntry("allFiles/" + entities);
        let entries = await folder.getEntries();
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

    function searchForms(e) {
        if(e.target && e.target.value){
            if(formCategory && formCategory.formItems){
                setFilteredFormItems(formCategory.formItems.filter(item => item.includes(e.target.value.trim())))
            }
        } else {
            setFilteredFormItems(formCategory.formItems);
        }

    }

    function searchForms2(e) {
        if(e.target && e.target.value){
            if(formCategory && formCategory.formItems){
                setFilteredFormItems(formCategory.formItems.filter(item => item.includes(e.target.value.trim())))
            }
        } else {
            setFilteredFormItems(formCategory.formItems);
        }

    }

    return (
        <div>
            <div>
                <h1>Форма</h1>
                {(() => {
                    if(formCategory && formCategory.title != null && formCategory.categoryItems != null){
                        return (
                            <div>
                                <h2>{formCategory.title}</h2>
                                <sp-radio-group label="Medium" name='${formCategory.title}' >
                                    {formCategory.categoryItems.map((itemName, index) => {
                                        return (
                                            <sp-radio onInput={() => nextCategory(formCategory.title, itemName)} value="${itemName + index}" size="m" key={itemName + index}>{itemName}</sp-radio>
                                        )
                                    })}
                                </sp-radio-group>
                            </div>
                        )
                    }
                })()}
            </div>
            {(() => {
                if(formCategory && formCategory.formItems){
                    return (
                        <div>
                            <h2>Список форм</h2>
                            <sp-picker onClick={(e) => searchForms2(e)}>
                                <input onChange={(e) => searchForms(e)}
                                       id="searchFormsInput" type="search">
                                </input>
                                <sp-menu>
                                    {filteredFormItems.map((formName, index) => {
                                        return (
                                            <sp-menu-item onClick={(e) => createNewLayerInApp(e)} className={'searchFormsBtn'} key={index}>
                                                {formName}
                                            </sp-menu-item>
                                        )
                                    })}
                                </sp-menu>
                            </sp-picker>
                        </div>
                    )
                }
            })()}
            {currentFormFolder.length > 2 ? <sp-button id="prevCategoryBtn" onClick={prevCategory}>Назад</sp-button> : null}
        </div>
        );
    }


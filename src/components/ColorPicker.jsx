import React, {useState} from "react";

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
    let [medals, setMedals] = useState([]);
    let [signs, setSigns] = useState([]);
    let [filteredMedals, setFilteredMedals] = useState([]);
    let [filteredSigns, setFilteredSigns] = useState([]);
    let [currentForm, setCurrentForm] = useState(null);
    init();

    function init(){
        if(!isInit){
            fetchFormCategory().then(resolve => setFormCategory(resolve));
            isInit = true
        }
    }
    // const createNewLayerInApp = async (evt) =>  {
    //     let activeDocument = app.activeDocument;
    //     execute(() => activeDocument.createLayer({name: "myLayer", opacity: 80, blendMode: "colorDodge" }));
    // }

    async function getCurrentFolder(){
        return getFolderByPath(currentFormFolder);
        let folder = await uxp.storage.localFileSystem.getPluginFolder();
        for(let p of currentFormFolder){
            folder = await folder.getEntry(p)
        }
    }

    async function fetchFormCategory(){
        let folder = await getCurrentFolder();
        let entries = await folder.getEntries();
        let infoFile = entries.find(entry => entry.name.includes('.info'));
        if(infoFile){
            let title = infoFile.name.split('.info')[0];
            let categoryItems = entries.filter(entry => entry.isFolder).map(folder => folder.name);
            return {title: title, categoryItems: categoryItems };
        } else{
            let formItems = entries.filter(entry => entry.isFile).map(file => {return {fileName: file.name, name: file.name.split('.')[0]}});
            return {title: null, categoryItems: null, formItems: formItems}
        }
    }
    async function fetchMedals(){
        let medalsFolder = await getMedalsFolder();
        let entries = await medalsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => {return {fileName: file.name, name: file.name.split('.')[0]}});
    }

    async function fetchSigns(){
        let signsFolder = await getSignsFolder();
        let entries = await signsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => {return {fileName: file.name, name: file.name.split('.')[0]}});
    }

    function getSignsFolder() {
        let signsPath = 'allFiles/signs';
        return getFolderByPath(signsPath);
    }

    function getMedalsFolder(){
        let medalsPath = 'allFiles/medals';
        return getFolderByPath(medalsPath);
    }

    async function getFolderByPath(path){
        let asArrayPath;
        if(path.constructor === Array){
            asArrayPath = path;
        } else {
            asArrayPath = path.split('/');
        }
        let folder = await uxp.storage.localFileSystem.getPluginFolder();
        for(let p of asArrayPath){
            folder = await folder.getEntry(p)
        }
        return folder;
    }

    function prevCategory(){
        currentFormFolder.pop();
        fetchFormCategory().then(resolve => setFormCategory(resolve));
    }
    function nextCategory(title, item) {
        currentFormFolder.push(item);
        fetchFormCategory().then(resolve => {
            setFormCategory(resolve);
            if(resolve.formItems){
                setFilteredFormItems(resolve.formItems);
            }
        });
    }

    async function renderImageInElement(arr, element){
        let imageElement = document.createElement('img');
        imageElement.src = "data:image/png;base64," + _arrayBufferToBase64(arr);
        element.appendChild(imageElement);
    }

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

    function search(e, array){
        if(e.target && e.target.value && array){
            return array
                .filter(item => item.name.toLowerCase().replaceAll(' ','')
                    .includes(e.target.value.toLowerCase().replaceAll(' ','')))
        } else {
            return array;
        }

    }

    function searchForms(e) {
        if(formCategory && formCategory.formItems){
            setFilteredFormItems(search(e, formCategory.formItems));
        }
    }
    function searchMedals(e){
        if(medals){
            setFilteredMedals(search(e, medals));
        }
    }

    function searchSigns(e){
        if(signs){
            setFilteredSigns(search(e, signs));
        }
    }

    async function toSignsAndMedals(form){
        setCurrentForm(form)
        fetchMedals().then(resolve => {
            setMedals(resolve);
            setFilteredMedals(resolve)
        });
        fetchSigns().then(resolve => {
            setSigns(resolve);
            setFilteredSigns(resolve)
        });
        let folder = await getCurrentFolder();
        let file = await folder.getEntry(form.fileName);
        let bytes = await file.read({format: formats.binary});
        let formItemViewElement = document.getElementById('formItemView');
        renderImageInElement(bytes, formItemViewElement);
    }

    function repeatTimes(size){
        let fakeArray = [];
        for (let i = 0; i < size; i++){
            fakeArray[i] = i;
        }
        return fakeArray;
    }














    return (
        <div className="pluginBody">
            <h1 id="mainTitle">Форма</h1>
            {(() => {
                if(!currentForm){
                    return (
                        <div className="chooseForm">
                            <div>
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

                                {(() => {
                                    if(formCategory && formCategory.formItems){
                                        return (
                                            <div>
                                                <h2>Список форм</h2>
                                                <sp-textfield onInput={searchForms} class ="searchInput" id="searchFormsInput" type="search">
                                                </sp-textfield>
                                                <sp-card id="formList">
                                                    <sp-menu>
                                                        {filteredFormItems.map((form, index) => {
                                                            return (
                                                                <sp-menu-item onClick={() => toSignsAndMedals(form)} className={'searchFormsBtn'} key={form.name + index}>
                                                                    {form.name}
                                                                </sp-menu-item>
                                                            )
                                                        })}
                                                    </sp-menu>
                                                </sp-card>
                                            </div>
                                        )
                                    }
                                })()}
                                {currentFormFolder.length > 2 ? <sp-button id="prevCategoryBtn" onClick={prevCategory}>Назад</sp-button> : null}
                            </div>
                        </div>
                    )
                }
            })()}



            {(() => {if(currentForm){
                return (
                    <div>
                        <div id="formItemView"></div>
                        <div id="initials">
                            <sp-checkbox>Фамилия</sp-checkbox>
                            <sp-textfield placeholder="Фамилия И.О." id ="initialInput" type="input"></sp-textfield>
                            <sp-button>Сохранить</sp-button>
                        </div>
                        <div id="flex-box">
                            <div className={'formItems'}>
                                <h2>Значки</h2>
                                <sp-textfield onInput={searchSigns} class ="searchInput" type="search">
                                </sp-textfield>
                                <sp-card id="formList">
                                    <sp-menu>
                                        {filteredSigns.map((form, index) => {
                                            return (
                                                <sp-menu-item onClick={() => toSignsAndMedals(form)} className={'searchFormsBtn'} key={form.name + index}>
                                                    {form.name}
                                                </sp-menu-item>
                                            )
                                        })}
                                    </sp-menu>
                                </sp-card>
                                <div id="signsItemsView" className={'flex'}>
                                    <div className={'wrapper'}>
                                        {repeatTimes(2).map(signRowIndex => {
                                            return (
                                                <div className="itemRow flex" key={'signRowIndex' + signRowIndex}>
                                                    {repeatTimes(4).map(signCellIndex => {
                                                        return (
                                                            <div id={"sign" + signRowIndex + "-" + signCellIndex} className={'itemCell'} key={'signCellIndex' + signCellIndex}></div>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}

                                    </div>
                                </div>
                            </div>
                            <div className={'formItems'}>
                                <h2>Медали</h2>
                                <sp-textfield onInput={searchMedals} class ="searchInput" type="search">
                                </sp-textfield>
                                <sp-card id="formList">
                                    <sp-menu>
                                        {filteredMedals.map((form, index) => {
                                            return (
                                                <sp-menu-item onClick={() => toSignsAndMedals(form)} className={'searchFormsBtn'} key={form.name + index}>
                                                    {form.name}
                                                </sp-menu-item>
                                            )
                                        })}
                                    </sp-menu>
                                </sp-card>
                                <div id="medalsItemsView" className={'flex'}>
                                    <div className={'wrapper'}>
                                        {repeatTimes(3).map(medalRowIndex => {
                                            return (
                                                <div className="itemRow flex" key={'medalRow' + medalRowIndex}>
                                                    {repeatTimes(5).map(medalCellIndex => {
                                                        return (
                                                            <div id={"medal" + medalRowIndex + "-" + medalCellIndex} className={'itemCell'} key={'medalRow' + medalCellIndex}></div>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        })}

                                    </div>

                                </div>

                            </div>
                        </div>

                        <sp-button>Подставить форму</sp-button>
                    </div>
                )
            }})()}



        </div>
        );
    }


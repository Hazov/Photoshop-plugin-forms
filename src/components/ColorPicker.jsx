import React, {useState} from "react";

import "./ColorPicker.css"


const photoshop = require('photoshop');
const uxp = require('uxp')
const fileManager = require('./fileManager.js').fileManager;
const fetchManager = require('./fetchManager.js').fetchManager;
const util = require('./util.js').util;
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

    async function init(){
        if(!isInit){
            fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
            isInit = true
        }
    }
    // const createNewLayerInApp = async (evt) =>  {
    //     let activeDocument = app.activeDocument;
    //     execute(() => activeDocument.createLayer({name: "myLayer", opacity: 80, blendMode: "colorDodge" }));
    // }


    async function prevCategory(){
        currentFormFolder.pop();
        fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
    }
    async function nextCategory(title, item) {
        currentFormFolder.push(item);
        fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => {
            setFormCategory(resolve);
            if(resolve.formItems){
                setFilteredFormItems(resolve.formItems);
            }
        });
    }

    async function renderImageInElement(arr, element){
        let imageElement = document.createElement('img');
        imageElement.src = "data:image/png;base64," + util.arrayBufferToBase64(arr);
        element.appendChild(imageElement);
    }

    async function execute(pluginFunc){
        return await photoshop.core.executeAsModal(pluginFunc);
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
        fetchManager.fetchMedals().then(resolve => {
            setMedals(resolve);
            setFilteredMedals(resolve)
        });
        fetchManager.fetchSigns().then(resolve => {
            setSigns(resolve);
            setFilteredSigns(resolve)
        });
        let folder = await fileManager.getFolderByPath(currentFormFolder);
        let file = await folder.getEntry(form.fileName);
        let bytes = await file.read({format: formats.binary});
        let formItemViewElement = document.getElementById('formItemView');
        renderImageInElement(bytes, formItemViewElement);
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
                                        {util.repeatTimes(2).map(signRowIndex => {
                                            return (
                                                <div className="itemRow flex" key={'signRowIndex' + signRowIndex}>
                                                    {util.repeatTimes(4).map(signCellIndex => {
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
                                        {util.repeatTimes(3).map(medalRowIndex => {
                                            return (
                                                <div className="itemRow flex" key={'medalRow' + medalRowIndex}>
                                                    {util.repeatTimes(5).map(medalCellIndex => {
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


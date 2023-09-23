import React, {forwardRef, useState} from "react";

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

const DEFAULT_MEDAL_ROWS = 3;
const DEFAULT_MEDALS_IN_ROW = 5;
const DEFAULT_SIGN_ROWS = 2;
const DEFAULT_SIGNS_IN_ROW = 4;
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
    let [selectedMedals, setSelectedMedals] = useState([[],[],[]]);
    let [selectedSigns, setSelectedSigns] = useState([]);

    init();

    async function init(){
        if(!isInit){
            fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
            initSelectedMedals();
            isInit = true
        }
    }

    function initSelectedMedals(){
        let rowsArray = [];

        for(let i = 0; i < DEFAULT_MEDAL_ROWS; i++){
            let cellsArray = [];
            for (let j = 0; j < DEFAULT_MEDALS_IN_ROW; j++) {
                cellsArray.push(null);
            }
            rowsArray.push(cellsArray);
        }
        setSelectedMedals(rowsArray);
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

    async function renderImageInElement(arr, element, options){
        let imageElement = document.createElement('img');
        imageElement.src = "data:image/png;base64," + util.arrayBufferToBase64(arr);
        if(options){
            if(options.width){
                imageElement.width = options.width
            }
        }
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

    async function addMedal(medal) {
        let toAddRowNum = defineRowToAdd();
        let toAddCellNum = defineCellToAdd(toAddRowNum);
        let cellElement = document.getElementById('medal' + toAddRowNum + '-' + toAddCellNum);

        let medalsFolder = await fetchManager.getMedalsFolder();
        let file = await medalsFolder.getEntry(medal.fileName);
        let bytes = await file.read({format: formats.binary});

        selectedMedals[toAddRowNum][toAddCellNum] = bytes;

        renderImageInElement(bytes, cellElement, {width: '30px'});


    }

    function defineCellToAdd(rowNum){
        let toAddCell = selectedMedals[rowNum].length - 1;
        for(let cellNum = selectedMedals[rowNum].length - 1; cellNum >= 0; cellNum--){
            if(!selectedMedals[rowNum][cellNum]){
                toAddCell = cellNum;
            } else {
                break;
            }
        }
        return toAddCell;
    }

    function defineRowToAdd(){
        let toAddRow = 0;
        for(let row = 0; row < selectedMedals.length; row++){
            let rowCells = selectedMedals[row];
            let lastItemInRow = rowCells[rowCells.length - 1];
            if(lastItemInRow){
                toAddRow++;
            } else {
                break;
            }
        }
        return toAddRow;
    }

    function addSign(sign){

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
                            {/*СПИСОК ЗНАЧКОВ*/}
                            <div className={'formItems'}>
                                <h2>Значки</h2>
                                {/*поиск*/}
                                <sp-textfield onInput={searchSigns} class ="searchInput" type="search">
                                </sp-textfield>
                                {/*список*/}
                                <sp-card id="formList">
                                    <sp-menu>
                                        {filteredSigns.map((sign, index) => {
                                            return (
                                                <sp-menu-item onClick={() => addSign(sign)} className={'searchFormsBtn'} key={sign.name + index}>
                                                    {sign.name}
                                                </sp-menu-item>
                                            )
                                        })}
                                    </sp-menu>
                                </sp-card>
                                {/*ВЫБРАННЫЕ ЗНАЧКИ*/}
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
                            {/*СПИСОК МЕДАЛЕЙ*/}
                            <div className={'formItems'}>
                                <h2>Медали</h2>
                                {/*поиск*/}
                                <sp-textfield onInput={searchMedals} class ="searchInput" type="search">
                                </sp-textfield>
                                {/*список*/}
                                <sp-card id="formList">
                                    <sp-menu>
                                        {filteredMedals.map((medal, index) => {
                                            return (
                                                <sp-menu-item onClick={() => addMedal(medal)} className={'searchFormsBtn'} key={medal.name + index}>
                                                    {medal.name}
                                                </sp-menu-item>
                                            )
                                        })}
                                    </sp-menu>
                                </sp-card>
                                {/*ВЫБРАННЫЕ МЕДАЛИ*/}
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


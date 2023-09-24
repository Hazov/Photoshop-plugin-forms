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
    let [selectedMedals, setSelectedMedals] = useState([]);
    let [selectedSigns, setSelectedSigns] = useState([]);

    init();

    async function init(){
        if(!isInit){
            fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
            initSelectedCells(DEFAULT_MEDAL_ROWS, DEFAULT_MEDALS_IN_ROW, setSelectedMedals);
            initSelectedCells(DEFAULT_SIGN_ROWS, DEFAULT_SIGNS_IN_ROW, setSelectedSigns);
            isInit = true
        }
    }

    function initSelectedCells(rowSize, cellSize, setter){
        let rowsArray = [];
        for(let i = 0; i < rowSize; i++){
            let cellsArray = [];
            for (let j = 0; j < cellSize; j++) {
                cellsArray.push(null);
            }
            rowsArray.push(cellsArray);
        }
        setter(rowsArray);
    }

    async function prevCategory(){
        currentFormFolder.pop();
        fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
    }
    async function nextCategory(title, item) {
        currentFormFolder.push(item);
        fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => {
            setFormCategory(resolve);
            if (resolve.formItems) {
                setFilteredFormItems(resolve.formItems);
            }
        });
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

    async function readFileObj(folder, fileName){
        let file = await folder.getEntry(fileName);
        let bytes = await file.read({format: formats.binary});
        return  {bytes: bytes, file64: "data:image/png;base64," + util.arrayBufferToBase64(bytes)}
    }

    async function toSignsAndMedals(form){
        let folder = await fileManager.getFolderByPath(currentFormFolder);
        form.fileObj = await readFileObj(folder, form.fileName);
        setCurrentForm(form)
        fetchManager.fetchMedals().then(resolve => {
            setMedals(resolve);
            setFilteredMedals(resolve)
        });
        fetchManager.fetchSigns().then(resolve => {
            setSigns(resolve);
            setFilteredSigns(resolve)
        });
    }

    async function addItemToCell(item, selectedArray, setter, folder, allArray, filteredArray, allSetter, filteredSetter){
        let coord = defineCoordToAdd(selectedArray);
        let fileObj = await readFileObj(folder, item.fileName);
        let newSelectedItems = JSON.parse(JSON.stringify(selectedArray));
        newSelectedItems[coord.row][coord.cell] = fileObj;
        setter(newSelectedItems);

        let inAllItemIndex = allArray.indexOf(item);
        let allArrayCopy = JSON.parse(JSON.stringify(allArray));
        allArrayCopy.splice(inAllItemIndex, 1);
        allSetter(allArrayCopy);

        let inFilteredItemIndex = filteredArray.indexOf(item);
        let filteredArrayCopy = JSON.parse(JSON.stringify(allArray));
        filteredArrayCopy.splice(inFilteredItemIndex, 1)
        filteredSetter(filteredArrayCopy)


    }

    async function addMedal(medal) {
        addItemToCell(medal, selectedMedals, setSelectedMedals, await fetchManager.getMedalsFolder(), medals, filteredMedals, setMedals, setFilteredMedals);
    }

    async function addSign(sign){
        addItemToCell(sign, selectedSigns, setSelectedSigns, await fetchManager.getSignsFolder(), signs, filteredSigns, setSigns, setFilteredSigns)
    }

    function defineCoordToAdd(array){
        let toAddRow;
        let toAddCell;
        for(let row = 0; row < array.length; row++){
            let rowCells = array[row];
            let emptyCellIndex = rowCells.indexOf(null);
            if(emptyCellIndex !== -1){
               toAddRow = row;
               toAddCell = emptyCellIndex;
               break;
            }
        }
        return {row: toAddRow, cell: toAddCell}
    }


    function deleteItemFromSelected(array, setter, rowIndex, cellIndex, allArray, allSetter, filteredArray, filteredSetter){
        let newSelectedItems = JSON.parse(JSON.stringify(array));
        let selectedItem = JSON.parse(JSON.stringify(newSelectedItems[rowIndex][cellIndex]));
        newSelectedItems[rowIndex][cellIndex] = null;
        setter(newSelectedItems);

        let allArrayCopy = JSON.parse(JSON.stringify(allArray));
        allArrayCopy.push(selectedItem);
        allSetter(allArrayCopy);

        let filteredArrayCopy = JSON.parse(JSON.stringify(filteredArray));
        filteredArrayCopy.push(selectedItem);
        filteredSetter(filteredArrayCopy);



    }

    function deleteMedal(medalRowIndex, medalCellIndex) {
        deleteItemFromSelected(selectedMedals, setSelectedMedals, medalRowIndex, medalCellIndex, medals, setMedals, filteredMedals, setFilteredMedals);
    }

    function deleteSign(signRowIndex, signCellIndex){
        deleteItemFromSelected(selectedSigns, setSelectedSigns, signRowIndex, signCellIndex, signs, setSigns, filteredSigns, setFilteredSigns);
    }

    // async function insertFormToPhotoshop(){
    //     let imageDataOptions = {
    //         width: 501,
    //         height: 350,
    //         components: 3,
    //         colorProfile: "Adobe RGB (1998)",
    //         colorSpace: "RGB",
    //         chunky: false
    //     }
    //     let folder = await fileManager.getFolderByPath(currentFormFolder);
    //     let fileObj = await readFileObj(folder, '1.jpg');
    //
    //     // let bytes = new Uint8Array(currentForm.fileObj.bytes);
    //     let bytes = new Uint8Array(fileObj.bytes);
    //
    //     const imageData =  await imaging.createImageDataFromBuffer(bytes, imageDataOptions);
    //     let layerOptions = {name: currentForm.name}
    //     let layerInfo = await createNewLayerInApp(layerOptions);
    //
    //     let putPixelsOptions = {layerID: layerInfo.id, imageData: imageData}
    //     await execute(() => imaging.putPixels(putPixelsOptions))
    // }

    async function execute(pluginFunc){
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    async function createNewLayerInApp(options){
        let activeDocument = app.activeDocument;
        return await execute(() => activeDocument.createLayer(options));
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
                        <div id="formItemView">
                            <img className={'img100'} src={currentForm.fileObj.file64} alt=""/>
                        </div>
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
                                        {selectedSigns.map((signRowArray, signRowIndex) => {
                                            return (
                                                <div className="itemRow flex" key={'signRow' + signRowIndex}>
                                                    {signRowArray.map((sign, signCellIndex) => {
                                                        if(sign){
                                                            return (
                                                                <div id={"sign" + signRowIndex + "-" + signCellIndex} className={'itemCell'} key={'signRow' + signCellIndex}>
                                                                    <div onClick={() => deleteSign(signRowIndex, signCellIndex)}>
                                                                        <img className={'img30'} src={sign.file64} alt=""/>
                                                                    </div>
                                                                </div>
                                                            )
                                                        } else {
                                                            return (
                                                                <div id={"sign" + signRowIndex + "-" + signCellIndex} className={'itemCell'} key={'signRow' + signCellIndex}></div>
                                                            )
                                                        }
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
                                        {selectedMedals.map((medalRowArray, medalRowIndex) => {
                                            return (
                                                <div className="itemRow flex" key={'medalRow' + medalRowIndex}>
                                                    {medalRowArray.map((medal, medalCellIndex) => {
                                                        if(medal){
                                                            return (
                                                                <div id={"medal" + medalRowIndex + "-" + medalCellIndex} className={'itemCell'} key={'medalRow' + medalCellIndex}>
                                                                    <div onClick={() => deleteMedal(medalRowIndex, medalCellIndex)}>
                                                                        <img className={'img30'} src={medal.file64} alt=""/>
                                                                    </div>
                                                                </div>
                                                            )
                                                        } else {
                                                            return (
                                                                <div id={"medal" + medalRowIndex + "-" + medalCellIndex} className={'itemCell'} key={'medalRow' + medalCellIndex}></div>
                                                            )
                                                        }
                                                    })}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <sp-button onClick={() => insertFormToPhotoshop()}>Подставить форму</sp-button>
                    </div>
                )
            }})()}



        </div>
        );
    }


import React, {forwardRef, useState} from "react";

import "./ColorPicker.css"


const photoshop = require('photoshop');
const uxp = require('uxp')
const fileManager = require('./fileManager.js').fileManager;
const fetchManager = require('./fetchManager.js').fetchManager;
const util = require('./util.js').util;
const executor = require('./photoshopExecutor.js').photoshopExecutor;
const app = photoshop.app;
const storage = uxp.storage;
const imaging = photoshop.imaging;
const formats = storage.formats

let medalRowsCount = 3;
let medalsInRow = 4;
let signRowsCount = 2;
let signsInRow = 3;
let currentFormFolder = ['allFiles','forms']
let isInit = false;


export const ColorPicker = () => {
    let medalsSearch = '';
    let signsSearch = '';
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
            updateSelectedCells(await getItemSet('medal'));
            updateSelectedCells(await getItemSet('sign'));
            isInit = true
        }
    }


    async function changeItemsInRow(isIncrease, itemName){
        let itemSet = await getItemSet(itemName);
        if(isIncrease && itemSet.maxItemsInRow > itemSet.itemsInRow){
            itemSet.itemsInRowSetter(++itemSet.itemsInRow);
        } else if(!isIncrease && itemSet.minItemsInRow < itemSet.itemsInRow){
            itemSet.itemsInRowSetter(--itemSet.itemsInRow);
        } else {
            return;
        }
        updateSelectedCells(itemSet);
    }
    function updateSelectedCells(itemSet) {
        let allSelectedItems = itemSet.selectedItems.flatMap(item => item);
        let rowsArray = [];
        for(let i = 0; i < itemSet.itemRowsCount; i++){
            let cellsArray = [];
            for (let j = 0; j < itemSet.itemsInRow; j++) {
                let selectedIdx = i * itemSet.itemsInRow + j;
                let selectedItem = null;
                if(allSelectedItems && allSelectedItems.length && allSelectedItems.length > selectedIdx && allSelectedItems[selectedIdx]){
                    selectedItem = allSelectedItems[selectedIdx];
                    allSelectedItems[selectedIdx] = null;
                }
                cellsArray.push(selectedItem);
            }
            rowsArray.push(cellsArray);
        }
        itemSet.selectedSetter(rowsArray);
        allSelectedItems.filter(item => item).forEach(item => itemSet.allItems.push(item));
        itemSet.allItemsSetter(itemSet.allItems);
        if(itemSet.allItems && itemSet.allItems.length){
            itemSet.filteredSetter(search(itemSet.search, itemSet.allItems));
        }

    }
    function medalsInRowSetter(count){
        medalsInRow = count;
    }
    function signsInRowSetter(count){
        signsInRow = count;
    }
    async function getItemSet(itemName){
        let itemSet = {};
        itemSet.itemName = itemName;
        switch (itemName){
            case 'sign': {
                itemSet.search = signsSearch;
                itemSet.itemRowsCount = signRowsCount;
                itemSet.itemsInRow = signsInRow;
                itemSet.itemsInRowSetter = signsInRowSetter;
                itemSet.minItemsInRow = 2;
                itemSet.maxItemsInRow = 4;
                itemSet.selectedItems = selectedSigns;
                itemSet.selectedSetter = setSelectedSigns;
                itemSet.allItems = signs;
                itemSet.allItemsSetter = setSigns;
                itemSet.filteredItems = filteredSigns;
                itemSet.filteredSetter = setFilteredSigns;
                itemSet.itemFolder = await fetchManager.getSignsFolder();
                break;
            }
            case 'medal': {
                itemSet.search = medalsSearch;
                itemSet.itemRowsCount = medalRowsCount;
                itemSet.itemsInRow = medalsInRow;
                itemSet.itemsInRowSetter = medalsInRowSetter;
                itemSet.minItemsInRow = 3;
                itemSet.maxItemsInRow = 5;
                itemSet.selectedItems = selectedMedals;
                itemSet.selectedSetter = setSelectedMedals;
                itemSet.allItems = medals;
                itemSet.allItemsSetter = setMedals;
                itemSet.filteredItems = filteredMedals;
                itemSet.filteredSetter = setFilteredMedals;
                itemSet.itemFolder = await fetchManager.getMedalsFolder();
                break;
            }
        }
        return itemSet;

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

    function search(value, array){
        if(value && array){
            return array
                .filter(item => item.name.toLowerCase().replaceAll(' ','')
                    .includes(value.toLowerCase().replaceAll(' ','')))
        } else {
            return array;
        }
    }

    function searchForms(e) {
        if(formCategory && formCategory.formItems){
            setFilteredFormItems(search(e.target.value, formCategory.formItems));
        }
    }
    function searchMedals(e){
        medalsSearch = e.target.value;
        if(medals){
            setFilteredMedals(search(medalsSearch, medals));
        }
    }

    function searchSigns(e){
        signsSearch = e.target.value;
        if(signs){
            setFilteredSigns(search(signsSearch, signs));
        }
    }

    async function readFileObj(folder, fileName){
        let file = await folder.getEntry(fileName);
        let bytes = await file.read({format: formats.binary});
        return  {path: file.nativePath, bytes: bytes, file64: "data:image/png;base64," + util.arrayBufferToBase64(bytes)}
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

    async function addItemToCell(item, set){
        let coord = defineCoordToAdd(set.selectedItems);
        let fileObj = await readFileObj(set.itemFolder, item.fileName);
        let newSelectedItems = JSON.parse(JSON.stringify(set.selectedItems));
        newSelectedItems[coord.row][coord.cell] = {...item, ...fileObj};
        set.selectedSetter(newSelectedItems);

        let inAllItemIndex = set.allItems.indexOf(item);
        let allArrayCopy = JSON.parse(JSON.stringify(set.allItems));
        allArrayCopy.splice(inAllItemIndex, 1);
        set.allItemsSetter(allArrayCopy);

        let inFilteredItemIndex = set.filteredItems.indexOf(item);
        let filteredArrayCopy = JSON.parse(JSON.stringify(set.filteredItems));
        filteredArrayCopy.splice(inFilteredItemIndex, 1)
        set.filteredSetter(filteredArrayCopy)


    }

    async function addMedal(medal) {
        addItemToCell(medal, await getItemSet('medal'));
    }

    async function addSign(sign){
        addItemToCell(sign, await getItemSet('sign'));
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


    function deleteItemFromSelected(array, setter, rowIndex, cellIndex, allArray, allSetter, filteredSetter, searchInputId){
        let newSelectedItems = JSON.parse(JSON.stringify(array));
        let selectedItem = JSON.parse(JSON.stringify(newSelectedItems[rowIndex][cellIndex]));
        newSelectedItems[rowIndex][cellIndex] = null;
        setter(newSelectedItems);

        let allArrayCopy = JSON.parse(JSON.stringify(allArray));
        allArrayCopy.push(selectedItem);
        allArrayCopy.sort((s1, s2) => (s1.name).localeCompare(s2.name));
        allSetter(allArrayCopy);

        let searchInputElement = document.getElementById(searchInputId);
        filteredSetter(search(searchInputElement.value, allArrayCopy))
    }

    function deleteMedal(medalRowIndex, medalCellIndex) {
        deleteItemFromSelected(selectedMedals, setSelectedMedals, medalRowIndex, medalCellIndex, medals, setMedals, setFilteredMedals, 'medalsSearchInput');
    }

    function deleteSign(signRowIndex, signCellIndex){
        deleteItemFromSelected(selectedSigns, setSelectedSigns, signRowIndex, signCellIndex, signs, setSigns, setFilteredSigns, 'signsSearchInput');
    }

    async function insertFormToPhotoshop() {
        await executor.insertImageToPhotoshop(currentForm.fileObj.path);
        await insertFormItemsToPhotoshop(selectedMedals, 'medal');
        await insertFormItemsToPhotoshop(selectedSigns, 'sign');
    }

    async function insertFormItemsToPhotoshop(selectedItems, itemName){
        let finalItems = [];
        selectedItems.forEach((selectedRow, rowIdx) => {
            let onlyFilled = selectedRow.filter(item => item);
            onlyFilled.forEach((item, itemIdx) => {
                item.offset = calculateOffset(rowIdx, itemIdx, onlyFilled.length, itemName);
                finalItems.push(item);
            })
        })

        finalItems = finalItems.reverse();
        for(let item of finalItems){
            let result = await executor.insertImageToPhotoshop(item.path);
            await executor.moveImage(item.offset)
        }
    }

    function calculateOffset(rowIdx, itemIdx, itemsCountInRow, itemName){
        let offsetSetting = getOffsetSettings(itemName, itemsCountInRow);
        let offset = {};

        offset.vertical = offsetSetting.vStartOffset + rowIdx * offsetSetting.vBetweenOffset;
        offset.horizontal = offsetSetting.hStartOffset + itemIdx * offsetSetting.hBetweenOffset;
        return offset;

    }

    function getOffsetSettings(itemName, itemsCountInRow){
        let offsetSettings = {};
        switch (itemName){
            case 'sign': {
                offsetSettings.vBetweenOffset = 200;
                offsetSettings.hBetweenOffset = 150;
                offsetSettings.hStartOffset = -675 - (offsetSettings.hBetweenOffset / 2 * itemsCountInRow);
                offsetSettings.vStartOffset = -50;
                break;
            }
            case 'medal': {
                offsetSettings.vBetweenOffset = 150;
                offsetSettings.hBetweenOffset = 150;
                offsetSettings.hStartOffset = 675 - (offsetSettings.hBetweenOffset / 2 * itemsCountInRow);
                offsetSettings.vStartOffset = 200;
                break;
            }
        }
        return offsetSettings;

    }


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
                                <sp-textfield id="signsSearchInput" onInput={searchSigns} class ="searchInput" type="search">
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
                                                                        <img className={'imgh30'} src={sign.file64} alt=""/>
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
                                <sp-textfield id="medalsSearchInput" onInput={searchMedals} class ="searchInput" type="search">
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
                                <button onClick={() => changeItemsInRow(false, 'medal')}>-</button>
                                <div id="medalsItemsView" className={'flex'}>
                                    <div className={'wrapper'}>
                                        {selectedMedals.map((medalRowArray, medalRowIndex) => {
                                            return (
                                                <div className="itemRow flex" key={'medalRow' + medalRowIndex}>
                                                    {medalRowArray.map((medal, medalCellIndex) => {
                                                        if(medal){
                                                            return (
                                                                <div id={"medal" + medalRowIndex + "-" + medalCellIndex} className={'itemCell'} key={'medalRow' + medalCellIndex}>
                                                                    <div class={'absolute'} onClick={() => deleteMedal(medalRowIndex, medalCellIndex)}>
                                                                        <img className={'imgw30 zInd' + medalRowIndex} src={medal.file64} alt=""/>
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
                                <button onClick={() => changeItemsInRow(true, 'medal')}>+</button>
                            </div>
                        </div>

                        <sp-button onClick={() => insertFormToPhotoshop()}>Подставить форму</sp-button>
                    </div>
                )
            }})()}



        </div>
        );
    }


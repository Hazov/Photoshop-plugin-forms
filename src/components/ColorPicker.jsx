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
const formats = storage.formats

const DEFAULT_MEDAL_ITEM_NAME = {name: 'medal', uiName: 'Медали', uiSwitchName: 'Планки'};
const DEFAULT_PLANKS_ITEM_NAME = {name: 'plank', uiName: 'Планки', uiSwitchName: 'Медали'};

let medalRowsCount = 3;
let medalsInRow = 4;
let signRowsCount = 2;
let signsInRow = 3;
let currentFormFolder = ['allFiles','forms']

let isInit = false;


export const ColorPicker = () => {
    let [rightItemName, setRightItemName] = useState({name: 'medal', uiName: 'Медали', uiSwitchName: 'Планки'})
    let [medalsSearch, setMedalsSearch] = useState('');
    let [signsSearch, setSignsSearch] = useState('');
    let [formCategory, setFormCategory] = useState({title: '', categoryItems: []});
    let [filteredForms, setFilteredForms] = useState([]);
    let [medals, setMedals] = useState([]);
    let [planks, setPlanks] = useState([]);
    let [signs, setSigns] = useState([]);
    let [filteredMedals, setFilteredMedals] = useState([]);
    let [filteredSigns, setFilteredSigns] = useState([]);
    let [currentForm, setCurrentForm] = useState(null);
    let [selectedMedals, setSelectedMedals] = useState([]);
    let [selectedSigns, setSelectedSigns] = useState([]);
    let [initials, setInitials] = useState(null);
    let [isLoading, setIsLoading] = useState(false)
    let [loadingProgressValue, setLoadingProgressValue] = useState('0')




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
        if(itemName === 'rightItem'){
            itemName = rightItemName.name
        }
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
    async function updateSelectedCells(itemSet) {
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
        let groupedSelectedItems = util.groupBy(allSelectedItems, 'itemName');
        for (let group of groupedSelectedItems) {
            let itemSet = await getItemSet(group[0].itemName.name);
            group.forEach(item => itemSet.allItems.push(item));
            itemSet.allItemsSetter(itemSet.allItems);
        }
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
                itemSet.itemSearchInput = 'signsSearchInput'
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
                itemSet.itemFolder = await fetchManager.getMedalsFolder(rightItemName);
                itemSet.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'plank': {
                itemSet.search = medalsSearch;
                itemSet.itemRowsCount = medalRowsCount;
                itemSet.itemsInRow = medalsInRow;
                itemSet.itemsInRowSetter = medalsInRowSetter;
                itemSet.minItemsInRow = 3;
                itemSet.maxItemsInRow = 5;
                itemSet.selectedItems = selectedMedals;
                itemSet.selectedSetter = setSelectedMedals;
                itemSet.allItems = planks;
                itemSet.allItemsSetter = setPlanks;
                itemSet.filteredItems = filteredMedals;
                itemSet.filteredSetter = setFilteredMedals;
                itemSet.itemFolder = await fetchManager.getMedalsFolder(rightItemName);
                itemSet.itemSearchInput = 'medalsSearchInput'
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
            if (resolve.formItems && resolve.formItems.length) {
                setFilteredForms(resolve.formItems.filter(form => form.fileName.endsWith('.png')));
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
            setFilteredForms(search(e.target.value, formCategory.formItems));
        }
    }
    async function searchMedals(e){
        let value = e.target.value;
        setMedalsSearch(value);
        let itemSet =  await getItemSet(rightItemName.name);
        if(itemSet.allItems){
            setFilteredMedals(search(value, itemSet.allItems));
        }
    }

    function searchSigns(e){
        let value = e.target.value;
        setSignsSearch(value)
        if(signs){
            setFilteredSigns(search(value, signs));
        }
    }
    function setInitialsValue(e){
        let value = e.target.value;
        if(typeof e.target.value === 'string'){
            value = value.toUpperCase();
            let match = value.match(/[,!@#$%^&*:"']/g);
            if(match?.length > 0){
                value = value.replaceAll(/[,!@#$%^&*:"']+/g, '.')
            }
        }
        setInitials(value);
    }

    async function readFileObj(folder, fileName){
        let file = await folder.getEntry(fileName);
        let bytes = await file.read({format: formats.binary});
        return  {path: file.nativePath, bytes: bytes, file64: "data:image/png;base64," + util.arrayBufferToBase64(bytes)}
    }

    async function toSignsAndMedals(form){
        setIsLoading(true);
        let folder = await fileManager.getFolderByPath(currentFormFolder);
                                                                            setLoadingProgressValue('0.6')
        form.fileObj = await readFileObj(folder, form.fileName);
                                                                            setLoadingProgressValue('0.9')
        form.config = await fetchManager.fetchFormConfig(currentFormFolder);
                                                                            setLoadingProgressValue('0.95')
        if(form.config && form.config['rightItemsDefault'] === 'plank'){
            switchRightItems();
        }
        setCurrentForm(form);
        setIsLoading(false);
        fetchManager.fetchMedals(DEFAULT_MEDAL_ITEM_NAME).then(resolve => {
            setMedals(resolve);
            if(rightItemName.name === 'medal'){
                setFilteredMedals(resolve)
            }
        });
        fetchManager.fetchMedals(DEFAULT_PLANKS_ITEM_NAME).then(resolve => {
            setPlanks(resolve);
            if(rightItemName.name === 'plank'){
                setFilteredMedals(resolve)
            }
        })
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

        let inAllItemIndex = util.indexOf(set.allItems, item);
        let allArrayCopy = JSON.parse(JSON.stringify(set.allItems));
        allArrayCopy.splice(inAllItemIndex, 1);
        set.allItemsSetter(allArrayCopy);

        let inFilteredItemIndex = util.indexOf(set.filteredItems, item);
        let filteredArrayCopy = JSON.parse(JSON.stringify(set.filteredItems));
        filteredArrayCopy.splice(inFilteredItemIndex, 1)
        set.filteredSetter(filteredArrayCopy)


    }

    function previewMedal(medal){


    }

    async function addMedal(medal) {
        addItemToCell(medal, await getItemSet(rightItemName.name));
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

    function deleteItemFromSelected(set, rowIndex, cellIndex){
        let newSelectedItems = JSON.parse(JSON.stringify(set.selectedItems));
        let selectedItem = JSON.parse(JSON.stringify(newSelectedItems[rowIndex][cellIndex]));
        newSelectedItems[rowIndex][cellIndex] = null;
        let allItems = JSON.parse(JSON.stringify(set.allItems));
        set.selectedSetter(newSelectedItems);
        allItems.push(selectedItem);
        allItems.sort((s1, s2) => (s1.name).localeCompare(s2.name));
        set.allItemsSetter(allItems);
        return allItems
    }

    async function deleteMedal(medalRowIndex, medalCellIndex) {
        let itemName = selectedMedals[medalRowIndex][medalCellIndex].itemName;
        let itemSet = await getItemSet(itemName.name);
        let allItems = deleteItemFromSelected(itemSet, medalRowIndex, medalCellIndex);
        if(rightItemName.name !== itemName.name){
            itemSet = await getItemSet(rightItemName.name);
            allItems = itemSet.allItems;
        }
        itemSet.filteredSetter(search(itemSet.search, allItems))
    }

    async function deleteSign(signRowIndex, signCellIndex){
        let itemSet = await getItemSet('sign');
        let allItems = deleteItemFromSelected(itemSet, signRowIndex, signCellIndex);
        itemSet.filteredSetter(search(itemSet.search, allItems))
    }
    
    function backToChooseCategories(){
        setCurrentForm(null);
    }

    async function insertFormToPhotoshop() {
         try{
             let insertFormResult = await executor.insertImageToPhotoshop(currentForm.fileObj.path);
             //Айтемы
             let medalLayerIds = await insertFormItemsToPhotoshop(selectedMedals);
             let signLayerIds = await insertFormItemsToPhotoshop(selectedSigns);

             let textLayerResult;
             let formLayer = app.activeDocument.layers.find(layer => layer.id === insertFormResult[0].ID);
             //Текст
             if(initials){
                 textLayerResult =  await executor.createTextLayer(initials);
                 let initialsLayer = app.activeDocument.layers.find(layer => layer.id === textLayerResult[0].layerID)
                 textLayerResult = [textLayerResult[0].layerID];
                 await executor.transformLayer(getInitialsTransformOptions(formLayer, initialsLayer))
             } else {
                 textLayerResult = [];
             }

             await executor.selectLayers([ formLayer.id, ...medalLayerIds, ...signLayerIds, ...textLayerResult]);
             let resizePercentValue = getResizeFormValue(formLayer);
             await executor.resizeImage(resizePercentValue);
         } catch (e) {
             setIsLoading(false);
         }

    }

    function getInitialsTransformOptions(formLayer, initialsLayer){
        let transformOptions = getTransformOptions('initials', initialsLayer);

        if(!transformOptions.offset || !transformOptions.offset.vertical){
            transformOptions.offset.vertical = 0;
        }
        if(!transformOptions.offset || !transformOptions.offset.horizontal){
            transformOptions.offset.horizontal = 0;
        }
        transformOptions = {offset: {}}
        transformOptions.offset.vertical = formLayer.bounds.top;
        transformOptions.offset.horizontal = (formLayer.bounds.right - formLayer.bounds.left) / 2;
        return transformOptions;
    }
    function getResizeFormValue(formLayer){
        if(formLayer){
            let docWidth = app.activeDocument.width;
            let formWidth = formLayer.bounds.width;
            return docWidth / formWidth * 100 * 0.8;
        }
    }

    async function insertFormItemsToPhotoshop(selectedItems){
        let finalItems = [];
        let filledRowsCount = selectedItems.filter(row => row.some(item => item)).length;
        selectedItems.forEach((selectedRow, rowIdx) => {
            let onlyFilled = selectedRow.filter(item => item);
            onlyFilled.forEach((item, itemIdx) => {
                item.offset = calculateOffset(rowIdx, itemIdx, onlyFilled.length, filledRowsCount, item.itemName.name);
                finalItems.push(item);
            })
        })

        finalItems = finalItems.reverse();
        let layersInfo = [];
        for(let item of finalItems){
            let itemLayerId = await placeItem(item);
            layersInfo.push({item: item, layerId: itemLayerId});
        }
        await transformAllItems(layersInfo);
        return layersInfo.map(info => info.layerId);
    }

    async function placeItem(item){
        let insertResult = await executor.insertImageToPhotoshop(item.path);
        await executor.moveImage(item.offset);
        return insertResult[0].ID;
    }
    async function transformAllItems(layersInfo){
        let itemNameLayersMap = new Map();
        layersInfo.forEach(info => {
            let itemName = info.item.itemName.name;
            if(!itemNameLayersMap.get(itemName)){
                itemNameLayersMap.set(itemName, []);
            }
            itemNameLayersMap.get(itemName).push(info.layerId);
        })

        for(let itemName of itemNameLayersMap.keys()){
            let layerIds = itemNameLayersMap.get(itemName);
            let options = getTransformOptions(itemName)
            if(options){
                await executor.selectLayers(layerIds);
                await executor.transformLayer(options);
            }
        }
    }


    function calculateOffset(rowIdx, itemIdx, itemsCountInRow, rowsCount, itemName){
        let offsetSetting = getOffsetSettings(itemName, itemsCountInRow, rowsCount);
        let offset = {};

        offset.vertical = offsetSetting.vStartOffset + rowIdx * offsetSetting.vBetweenOffset;
        offset.horizontal = offsetSetting.hStartOffset + itemIdx * offsetSetting.hBetweenOffset;
        return offset;
    }

    function getTransformOptions(itemName, layer){
        let options = {};
        if(currentForm.config){
            let config = JSON.parse(JSON.stringify(currentForm.config));
            if(itemName === 'initials' && config['pocketSize']){
                options.scale = getScaleByPocket(config['pocketSize'], layer);
            } else {
                if(config[itemName + 'Scale']){
                    options.scale = config[itemName + 'Scale'];
                }
            }
            if(currentForm.config[itemName + 'Angle']){
                options.angle = config[itemName + 'Angle'];
            }
            if(currentForm.config[itemName + 'Offset']){
                options.offset = config[itemName + 'Offset'];
            }
        } else {
            return null;
        }
        return options;
    }

    function getScaleByPocket(pocketSize, initialsLayer){
        let scale = {};
        scale.width = (pocketSize.width / initialsLayer.bounds.width) * 100;
        scale.height = (pocketSize.height / initialsLayer.bounds.height) * 100;
        return scale;
    }

    function getOffsetSettings(itemName, itemsCountInRow, rowsCount){
        let conf = currentForm.config;
        let offsetSettings = {};
        offsetSettings.vBetweenOffset = conf ? conf[itemName + 'VBetweenOffset']: 200;
        offsetSettings.hBetweenOffset = conf ? conf[itemName + 'HBetweenOffset']: 150;
        offsetSettings.hStartOffset = (conf ? conf[itemName + 'HStartOffset'] : -675) - (offsetSettings.hBetweenOffset / 2 * itemsCountInRow);
        let vRowOffset = 0;
        if(itemName === 'plank'){
            vRowOffset = offsetSettings.vBetweenOffset * (rowsCount - 1);
        }
        offsetSettings.vStartOffset = (conf ? conf[itemName + 'VStartOffset'] : 150) - vRowOffset;
        return offsetSettings;
    }


    async function execute(pluginFunc){
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    async function createNewLayerInApp(options){
        let activeDocument = app.activeDocument;
        return await execute(() => activeDocument.createLayer(options));
    }


    function switchRightItems() {
        switch (rightItemName.name){
            case 'plank': {
                rightItemName.name = 'medal';
                rightItemName.uiName = 'Медали';
                rightItemName.uiSwitchName = 'Планки';
                setFilteredMedals(search(medalsSearch, medals));
                break;
            }
            case 'medal': {
                rightItemName.name = 'plank';
                rightItemName.uiName = 'Планки';
                rightItemName.uiSwitchName = 'Медали';
                setFilteredMedals(search(medalsSearch, planks));
                break;
            }
        }
        setRightItemName(rightItemName);
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
                                        if(!isLoading){
                                            return (
                                                <div>
                                                    <h2>Список форм</h2>
                                                    <sp-textfield onInput={searchForms} class ="searchInput" id="searchFormsInput" type="search">
                                                    </sp-textfield>
                                                    <sp-card id="formList">
                                                        <sp-menu>
                                                            {filteredForms.map((form, index) => {
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
                                        } else {
                                            return(
                                                <div>
                                                    <progress className={'progress'} value={loadingProgressValue}/>
                                                </div>
                                            )
                                        }
                                    }
                                })()}
                                {currentFormFolder.length > 2 && !isLoading ? <sp-button id="prevCategoryBtn" onClick={prevCategory}>Назад</sp-button> : null}
                            </div>
                        </div>
                    )
                }
            })()}



            {(() => {if(currentForm && !isLoading){
                return (
                    <div>
                        <div className={'flex'}>
                            <div id="formItemView">
                                <img className={'img100'} src={currentForm.fileObj.file64} alt=""/>
                            </div>
                            <div className={'width70'} id="initials">
                                <sp-textfield value={initials} onInput={setInitialsValue} placeholder="Фамилия И.О." id ="initialInput" type="input"></sp-textfield>
                            </div>
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
                                                                    <div className={'flex'} onClick={() => deleteSign(signRowIndex, signCellIndex)}>
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
                                <div className={'flex'}>
                                    <h2 className={rightItemName.name === 'medal' ? 'yellowItems' : 'redItems'}>{rightItemName.uiName}</h2>
                                    <button onClick={() => switchRightItems()}>{rightItemName.uiSwitchName}</button>
                                </div>

                                {/*поиск*/}
                                <sp-textfield id="medalsSearchInput" onInput={searchMedals} class ="searchInput" type="search">
                                </sp-textfield>
                                {/*список*/}
                                <sp-card id="formList">
                                    <sp-menu>
                                        {filteredMedals.map((medal, index) => {
                                            return (
                                                <sp-menu-item onMouseEnter={() => previewMedal(medal)} onClick={() => addMedal(medal)} className={'searchFormsBtn'} key={medal.name + index}>
                                                    <span className={rightItemName.name === 'medal' ? 'yellowItems' : 'redItems'}>{medal.name}</span>
                                                </sp-menu-item>
                                            )
                                        })}
                                    </sp-menu>
                                </sp-card>
                                {/*ВЫБРАННЫЕ МЕДАЛИ*/}
                                <div id="medalsItemsView" className={'flex'}>
                                    <button className={'circleBtn'} onClick={() => changeItemsInRow(false, 'rightItem')}>-</button>
                                    <div className={'wrapper'}>
                                        {selectedMedals.map((medalRowArray, medalRowIndex) => {
                                            return (
                                                <div className="itemRow flex" key={'medalRow' + medalRowIndex}>
                                                    {medalRowArray.map((medal, medalCellIndex) => {
                                                        if(medal){
                                                            return (
                                                                <div id={"medal" + medalRowIndex + "-" + medalCellIndex} className={'itemCell'} key={'medalRow' + medalCellIndex}>
                                                                    <div className={'absolute'} onClick={() => deleteMedal(medalRowIndex, medalCellIndex)}>
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
                                    <button className={'circleBtn'} onClick={() => changeItemsInRow(true, 'rightItem')}>+</button>
                                </div>
                            </div>
                        </div>
                        <div id={'controlButtons'}>
                            <button onClick={() => backToChooseCategories()}>Назад</button>
                            <sp-button onClick={() => insertFormToPhotoshop()}>Подставить форму</sp-button>
                        </div>
                    </div>
                )

            }})()}

        </div>
        );
    }


import React, {useState} from "react";


import "./ColorPicker.css"
import {FetchManager} from "./fetchManager";
import {Util} from "./util";
import {FileManager} from "./fileManager";
import {PhotoshopExecutor} from "./photoshopExecutor";


const photoshop = require('photoshop');
const app = photoshop.app;

const fetchManager = new FetchManager();
const util = new Util();
const fileManager = new FileManager();
const executor = new PhotoshopExecutor();

const DEFAULT_MEDAL_ITEM_NAME = 'medal'
const DEFAULT_PLANKS_ITEM_NAME = 'plank'
const DEFAULT_SIGNS_ITEM_NAME = 'sign'

let medalRowsCount = 3;
let medalsInRow = 4;
let signRowsCount = 2;
let signsInRow = 3;
let currentFormFolder = ['allFiles','forms'];
let itemFiles = [];
let isInit = false;
let straps = [];

let itemNamesList = ['medal', 'plank', 'sign', 'grade', 'leftMedal', 'rightMedal'];

export const ColorPicker = () => {
    let [rightItemName, setRightItemName] = useState(DEFAULT_MEDAL_ITEM_NAME)
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
    let [selectedGrade, setSelectedGrade] = useState([]);
    let [selectedLeftMedals, setSelectedLeftMedals] = useState([]);
    let [selectedRightMedals, setSelectedRightMedals] = useState([]);
    let [initials, setInitials] = useState(null);
    let [isLoading, setIsLoading] = useState(false)
    let [loadingProgressValue, setLoadingProgressValue] = useState('0');
    let [formPreview, setFormPreview] = useState(null);

    init().then(ignore => {});
    async function init(){
        if(!isInit) {
            isInit = true;
            //Загрузка начальной категории
            fetchManager.fetchFormCategory(await fileManager.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
            //Загрузка ячеек для выбора
            for (let itemName of itemNamesList) {
                await updateSelectedCells(await getItemSet(itemName));
            }
            //Загрузка всех погон
            straps = await fetchManager.fetchStraps();
            //Загрузка всех медалей
            let fetchResolve = await fetchManager.fetchItems(await getItemSet(DEFAULT_MEDAL_ITEM_NAME, true), itemFiles)
            setMedals(fetchResolve);
            setFilteredMedals(fetchResolve)
            //Загрузка всех планок
            fetchResolve = await fetchManager.fetchItems(await getItemSet(DEFAULT_PLANKS_ITEM_NAME, true), itemFiles)
            setPlanks(fetchResolve);
            //Загрузка всех значков
            fetchResolve = await fetchManager.fetchItems(await getItemSet(DEFAULT_SIGNS_ITEM_NAME), itemFiles)
            setSigns(fetchResolve);
            setFilteredSigns(fetchResolve)
        }
    }

    async function changeItemsInRow(isIncrease, itemName){
        if(itemName === 'rightItem'){
            itemName = rightItemName
        }
        let itemSet = await getItemSet(itemName);
        if(isIncrease && itemSet.maxItemsInRow > itemSet.itemsInRow){
            itemSet.itemsInRowSetter(++itemSet.itemsInRow);
        } else if(!isIncrease && itemSet.minItemsInRow < itemSet.itemsInRow){
            itemSet.itemsInRowSetter(--itemSet.itemsInRow);
        } else {
            return;
        }
        await updateSelectedCells(itemSet);
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
            let itemSet = await getItemSet(group[0].itemName);
            group.forEach(item => itemSet.allItems.push(item));
            itemSet.allItemsSetter(itemSet.allItems);
        }
        if(itemSet.allItems && itemSet.allItems.length){
            itemSet.filteredSetter(search(itemSet.search, itemSet.allItems));
        }
    }

    function getFile64(item) {
        let filesOfItem = itemFiles[item.itemName];
        let pair = filesOfItem.find(p => _.isEqual(p.name, item.name));
        return pair.file.file64;
    }

    function getStrap(form){
        let strapNumber = form.name.split('.')[0];
        let strap = straps.find(strap => strap.name.split('.')[0] === strapNumber);
        return strap.file.file64;
    }

    function showPreview(form){
        setFormPreview(form);
    }

    function hidePreview(){
        setFormPreview(null);
    }
    function medalsInRowSetter(count){
        medalsInRow = count;
    }
    function signsInRowSetter(count){
        signsInRow = count;
    }
    async function getItemSet(itemName, init){
        let rightName = rightItemName;
        if(init){
            rightName = itemName;
        }
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
                itemSet.itemFolder = await fetchManager.getMedalsFolder(rightName);
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
                itemSet.itemFolder = await fetchManager.getMedalsFolder(rightName);
                itemSet.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'leftMedal': {
                itemSet.search = medalsSearch;
                itemSet.itemRowsCount = 1;
                itemSet.itemsInRow = 3;
                itemSet.itemsInRowSetter = medalsInRowSetter;
                itemSet.minItemsInRow = 3;
                itemSet.maxItemsInRow = 3;
                itemSet.selectedItems = selectedLeftMedals;
                itemSet.selectedSetter = setSelectedLeftMedals;
                itemSet.allItems = medals;
                itemSet.allItemsSetter = setMedals;
                itemSet.filteredItems = filteredMedals;
                itemSet.filteredSetter = setFilteredMedals;
                itemSet.itemFolder = await fetchManager.getMedalsFolder('medal');
                itemSet.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'rightMedal': {
                itemSet.search = medalsSearch;
                itemSet.itemRowsCount = 1;
                itemSet.itemsInRow = 3;
                itemSet.itemsInRowSetter = medalsInRowSetter;
                itemSet.minItemsInRow = 3;
                itemSet.maxItemsInRow = 3;
                itemSet.selectedItems = selectedRightMedals;
                itemSet.selectedSetter = setSelectedRightMedals;
                itemSet.allItems = medals;
                itemSet.allItemsSetter = setMedals;
                itemSet.filteredItems = filteredMedals;
                itemSet.filteredSetter = setFilteredMedals;
                itemSet.itemFolder = await fetchManager.getMedalsFolder('medal');
                itemSet.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'grade': {
                itemSet.search = signsSearch;
                itemSet.itemRowsCount = 1;
                itemSet.itemsInRow = 1;
                itemSet.itemsInRowSetter = signsInRowSetter;
                itemSet.minItemsInRow = 1;
                itemSet.maxItemsInRow = 1;
                itemSet.selectedItems = selectedGrade;
                itemSet.selectedSetter = setSelectedGrade;
                itemSet.allItems = signs;
                itemSet.allItemsSetter = setSigns;
                itemSet.filteredItems = filteredSigns;
                itemSet.filteredSetter = setFilteredSigns;
                itemSet.itemFolder = await fetchManager.getSignsFolder();
                itemSet.itemSearchInput = 'signsSearchInput'
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
        let formFolder = await fileManager.getFolderByPath(currentFormFolder);
        let resolve = await fetchManager.fetchFormCategory(formFolder)
        setFormCategory(resolve);
        //Если категория - это список форм
        if (resolve.formItems && resolve.formItems.length) {
            let filteredForms = resolve.formItems.filter(form => form.fileName.endsWith('.png'));
            filteredForms = filteredForms.sort(sortForms)
            setFilteredForms(filteredForms);
        }
    }

    function sortForms(form1, form2){
        return Number(form1.name.split('.')[0]) < Number(form2.name.split('.')[0]) ?  -1 : 1;
    }

    function hasSelected(selectedArray){
        let has = false;
        if(selectedArray && selectedArray.length){
            selectedArray.forEach(row => {
                has = row.some(item => item);
                if(has){
                    return has;
                }
            })
        }
        return has;
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
            let searchedForms = search(e.target.value, formCategory.formItems);
            searchedForms = searchedForms.sort(sortForms);
            setFilteredForms(searchedForms);
        }
    }
    async function searchMedals(e){
        let value = e.target.value;
        setMedalsSearch(value);
        let itemSet =  await getItemSet(rightItemName);
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

    async function toSignsAndMedals(form){
        setIsLoading(true);
        let folder = await fileManager.getFolderByPath(currentFormFolder);
                                                                            setLoadingProgressValue('0.6')
        form.config = await fetchManager.fetchFormConfig(currentFormFolder);
                                                                            setLoadingProgressValue('0.95')
        if(form.config && form.config['rightItemsDefault'] === 'plank'){
            switchRightItems();
        }
        setCurrentForm(form);
        setIsLoading(false);
    }

    function getActuallyItemName(item){
        let itemName;
        if(item.itemName === 'medal' || item.itemName === 'plank'){
            itemName = rightItemName;
        } else {
            itemName = item.itemName;
        }
        return itemName;
    }

    async function addItemToSelected(item){
        let itemName = getActuallyItemName(item)
        let itemSet = await getItemSet(itemName);

        let coordCell = defineCoordToAdd(itemSet.selectedItems);
        let newSelectedItems = JSON.parse(JSON.stringify(itemSet.selectedItems));
        newSelectedItems[coordCell.row][coordCell.cell] = item;
        itemSet.selectedSetter(newSelectedItems);

        let inAllItemIndex = util.indexOf(itemSet.allItems, item);
        let allItemsWithoutItem = itemSet.allItems.filter((item, index) => index !== inAllItemIndex);
        itemSet.allItemsSetter(allItemsWithoutItem);

        let inFilteredItemIndex = util.indexOf(itemSet.filteredItems, item);
        let filteredItemsWithoutItem = itemSet.filteredItems.filter((item, index) => index !== inFilteredItemIndex);
        itemSet.filteredSetter(filteredItemsWithoutItem);


    }

    async function deleteItemFromSelected(itemRowIndex, itemCellIndex, item){
        let itemSet = await getItemSet(item.itemName);
        let selectedItems = JSON.parse(JSON.stringify(itemSet.selectedItems));
        let selectedItem = selectedItems[itemRowIndex][itemCellIndex];
        let selectedItemCopy = JSON.parse(JSON.stringify(selectedItem));
        selectedItems[itemRowIndex][itemCellIndex] = null;
        itemSet.selectedSetter(selectedItems);
        let allItems = itemSet.allItems.concat(selectedItemCopy);
        allItems.sort((s1, s2) => (s1.name).localeCompare(s2.name));
        itemSet.allItemsSetter(allItems);

        itemSet = await getItemSet(getActuallyItemName(item));
        itemSet.filteredSetter(search(itemSet.search, itemSet.allItems))
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
    function backToChooseCategories(){
        setCurrentForm(null);
    }

    async function insertFormToPhotoshop() {
         try{
             let insertFormResult = await executor.insertImageToPhotoshop(currentForm.file.path);
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
                item.offset = calculateOffset(rowIdx, itemIdx, onlyFilled.length, filledRowsCount, item.itemName);
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
            let itemName = info.item.itemName;
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
        switch (rightItemName){
            case 'plank': {
                rightItemName = 'medal';
                setFilteredMedals(search(medalsSearch, medals));
                break;
            }
            case 'medal': {
                rightItemName = 'plank';
                setFilteredMedals(search(medalsSearch, planks));
                break;
            }
        }
        setRightItemName(rightItemName);
    }

    function getUiName(itemName){
        if(itemName === 'medal'){
            return 'Медали';
        }
        return 'Планки';
    }
    function getSwitchName(itemName){
        if(itemName === 'medal'){
            return 'Планки';
        }
        return 'Медали';
    }
    return (
        <div className="pluginBody">
            {(() => {
                if(!isInit){
                    return(
                        <div>
                            <progress className={'progress'} value={loadingProgressValue}/>
                        </div>
                    )
                }
            })()}
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
                                                                    <sp-menu-item onMouseEnter={() => showPreview(form)} onMouseLeave={() => hidePreview()} onClick={() => toSignsAndMedals(form)} className={'searchFormsBtn'} key={form.name + index}>
                                                                        <div className={'menu-item'}>
                                                                            <span>{form.name}</span>
                                                                            <img className={'imgw60'} src={getStrap(form)} alt=""/>
                                                                        </div>
                                                                    </sp-menu-item>
                                                                )
                                                            })}
                                                        </sp-menu>
                                                    </sp-card>
                                                    <div class={'formPreview'}>
                                                        <img src={formPreview?.file?.file64} alt=""/>
                                                    </div>
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
                                <img className={'img100'} src={currentForm.file.file64} alt=""/>
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
                                <sp-card id="signList">
                                    <sp-menu>
                                        {filteredSigns.map((sign, index) => {
                                            return (
                                                <sp-menu-item onClick={() => addItemToSelected(sign)} className={'searchFormsBtn'} key={sign.name + index}>
                                                    <div className={'menu-item'}>
                                                        <span>{sign.name}</span>
                                                        <img className={'imgw20'} src={getFile64(sign, 'sign')} alt=""/>
                                                    </div>
                                                </sp-menu-item>
                                            )
                                        })}
                                    </sp-menu>
                                </sp-card>
                                {/*ВЫБРАННЫЕ ЛЕВЫЕ МЕДАЛИ*/}
                                {(() => {
                                    if (hasSelected(selectedLeftMedals)) {
                                        return (
                                            <div id="leftMedalsItemsView" className={'flex'}>
                                                <span className={'additionalItems'}>доп. медали</span>
                                                {selectedLeftMedals.map((leftMedalsArray, leftMedalsRowIndex) => {
                                                    return (
                                                        <div className="itemRow flex" key={'leftMedalsRow' + leftMedalsRowIndex}>
                                                            {leftMedalsArray.map((leftMedal, leftMedalCellIndex) => {
                                                                if(leftMedal){
                                                                    return (
                                                                        <div id={"leftMedal" + leftMedalsRowIndex + "-" + leftMedalCellIndex} className={'smallItemCell'} key={'leftMedalRow' + leftMedalCellIndex}>
                                                                            <div className={'flex'} onClick={() => deleteItemFromSelected(leftMedalsRowIndex, leftMedalCellIndex, leftMedal)}>
                                                                                <img className={'imgw20'} src={getFile64(leftMedal, 'medal')} alt=""/>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                } else {
                                                                    return (
                                                                        <div id={"leftMedal" + leftMedalsRowIndex + "-" + leftMedalCellIndex} className={'smallItemCell'} key={'signRow' + leftMedalCellIndex}></div>
                                                                    )
                                                                }
                                                            })}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    }
                                })()}
                                {/*ВЫБРАННАЯ КЛАССНОСТЬ*/}
                                {(() => {
                                    if(hasSelected(selectedGrade)) {
                                        return (
                                            <div id="gradeItemsView" className={'flex'}>
                                                <span className={'additionalItems'}>классность</span>
                                                {selectedGrade.map((gradeArray, gradeRowIndex) => {
                                                    return (
                                                        <div className="itemRow flex" key={'gradeRow' + gradeRowIndex}>
                                                            {gradeArray.map((grade, gradeCellIndex) => {
                                                                if(grade){
                                                                    return (
                                                                        <div id={"grade" + gradeRowIndex + "-" + gradeCellIndex} className={'gradeItemCell'} key={'gradeMedalRow' + gradeCellIndex}>
                                                                            <div className={'flex'} onClick={() => deleteItemFromSelected(gradeRowIndex, gradeCellIndex, grade)}>
                                                                                <img className={'imgw40'} src={getFile64(grade, 'sign')} alt=""/>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                } else {
                                                                    return (
                                                                        <div id={"grade" + gradeRowIndex + "-" + gradeCellIndex} className={'gradeItemCell'} key={'signRow' + gradeCellIndex}></div>
                                                                    )
                                                                }
                                                            })}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        );
                                    }
                                })()}

                                <div id="signsItemsView" className={'flex'}>
                                    <div className={'wrapper'}>
                                        {/*ВЫБРАННЫЕ ЗНАЧКИ*/}
                                        {selectedSigns.map((signRowArray, signRowIndex) => {
                                            return (
                                                <div className="itemRow flex" key={'signRow' + signRowIndex}>
                                                    {signRowArray.map((sign, signCellIndex) => {
                                                        if(sign){
                                                            return (
                                                                <div id={"sign" + signRowIndex + "-" + signCellIndex} className={'itemCell'} key={'signRow' + signCellIndex}>
                                                                    <div className={'flex'} onClick={() => deleteItemFromSelected(signRowIndex, signCellIndex, sign)}>
                                                                        <img className={'imgh30'} src={getFile64(sign,'sign')} alt=""/>
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
                                    <h2 className={rightItemName === 'medal' ? 'yellowItems' : 'redItems'}>{getUiName(rightItemName)}</h2>
                                    <button onClick={() => switchRightItems()}>{getSwitchName(rightItemName)}</button>
                                </div>

                                {/*поиск*/}
                                <sp-textfield id="medalsSearchInput" onInput={searchMedals} class ="searchInput" type="search">
                                </sp-textfield>
                                {/*список*/}
                                <sp-card id="medalList">
                                    <sp-menu>
                                        {filteredMedals.map((medal, index) => {
                                            return (
                                                <sp-menu-item onClick={() => addItemToSelected(medal)} className={'searchFormsBtn'} key={medal.name + index}>
                                                    <div className={'menu-item'}>
                                                        <span className={rightItemName === 'medal' ? 'yellowItems' : 'redItems'}>{medal.name}</span>
                                                        <img className={'imgw20'} src={getFile64(medal, 'medal')} alt=""/>
                                                    </div>
                                                </sp-menu-item>
                                            )
                                        })}
                                    </sp-menu>
                                </sp-card>
                                {/*ВЫБРАННЫЕ ПРАВЫЕ МЕДАЛИ*/}
                                {(() => {
                                    if(hasSelected(selectedRightMedals)) {
                                        return (
                                            <div id="rightMedalsItemsView" className={'flex'}>
                                                <span className={'additionalItems'}>доп. медали</span>
                                                {selectedRightMedals.map((rightMedalsArray, rightMedalsRowIndex) => {
                                                    return (
                                                        <div className="itemRow flex" key={'rightMedalsRow' + rightMedalsRowIndex}>
                                                            {rightMedalsArray.map((rightMedal, rightMedalCellIndex) => {
                                                                if(rightMedal){
                                                                    return (
                                                                        <div id={"rightMedal" + rightMedalsRowIndex + "-" + rightMedalCellIndex} className={'smallItemCell'} key={'rightMedalRow' + rightMedalCellIndex}>
                                                                            <div className={'flex'} onClick={() => deleteItemFromSelected(rightMedalsRowIndex, rightMedalCellIndex, rightMedal)}>
                                                                                <img className={'imgw20'} src={getFile64(rightMedal, 'medal')} alt=""/>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                } else {
                                                                    return (
                                                                        <div id={"rightMedal" + rightMedalsRowIndex + "-" + rightMedalCellIndex} className={'smallItemCell'} key={'signRow' + rightMedalCellIndex}></div>
                                                                    )
                                                                }
                                                            })}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    }
                                })()}

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
                                                                    <div className={'absolute'} onClick={() => deleteItemFromSelected(medalRowIndex, medalCellIndex, medal)}>
                                                                        <img className={'imgw30 zInd' + medalRowIndex} src={getFile64(medal, 'medal')} alt=""/>
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


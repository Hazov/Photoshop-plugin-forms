import React, {useState} from "react";


import "./ColorPicker.css"
import {FetchManager} from "./fetchManager";
import {Util} from "./util";
import {FileManager} from "./fileManager";
import {SortService} from "./sortService";
import {PhotoshopExecutor} from "./photoshopExecutor";


const photoshop = require('photoshop');
const app = photoshop.app;

const fetchManager = new FetchManager();
const util = new Util();
const fileManager = new FileManager();
const sortService = new SortService();
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

let itemOffsets = {};

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
    let [itemPreview, setItemPreview] = useState(null);
    let [isFormInserted, setIsFormInserted] = useState(null);

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
        return getItemFile(item).file64;
    }
    function getItemFile(item){
        let filesOfItem = itemFiles[item.itemName];
        let pair = filesOfItem.find(p => _.isEqual(p.name, item.name));
        return pair.file;
    }

    function getStrap(form){
        let strapNumber = form.name.split('.')[0];
        let strap = straps.find(strap => strap.name.split('.')[0] === strapNumber);
        return strap.file.file64;
    }

    function showFormPreview(form){
        setFormPreview(form);
    }

    function hideFormPreview(){
        setFormPreview(null);
    }

    function showItemPreview(item){
        setItemPreview(item);
    }
    function hideItemPreview(){
        setItemPreview(null);
    }

    function getItemPreviewSize(item){
        let itemName = item.itemName;
        if(itemName === 'plank' && itemName === 'grade'){
            return 'imgh50';
        }
        return 'imgw100';
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
    async function nextCategory(item) {
        currentFormFolder.push(item);
        let formFolder = await fileManager.getFolderByPath(currentFormFolder);
        let resolve = await fetchManager.fetchFormCategory(formFolder)
        setFormCategory(resolve);
        //Если категория - это список форм
        if (resolve.formItems && resolve.formItems.length) {
            let filteredForms = resolve.formItems;
            filteredForms = filteredForms.sort(sortService.sortForms)
            setFilteredForms(filteredForms);
        }
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
            searchedForms = searchedForms.sort(sortService.sortForms);
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
        form.config = await fetchManager.fetchFormConfig(currentFormFolder);
        if(form.config && form.config['rightItemsDefault'] === 'plank'){
            switchRightItems();
        }
        setCurrentForm(form);
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

    function editPrevForm(){
        setIsFormInserted(false);
    }

    async function toNewForm(){
        setIsFormInserted(false)
        setCurrentForm(null);
        currentFormFolder = ['allFiles'];
        nextCategory('forms')
        selectedMedals.flatMap(row => row).filter(item => item).forEach(item => medals.push(item));
        selectedLeftMedals.flatMap(row => row).filter(item => item).forEach(item => medals.push(item));
        selectedRightMedals.flatMap(row => row).filter(item => item).forEach(item => medals.push(item));
        setMedals(medals);
        selectedGrade.flatMap(row => row).filter(item => item).forEach(item => signs.push(item));
        selectedSigns.flatMap(row => row).filter(item => item).forEach(item => signs.push(item));

        for (let itemName of itemNamesList) {
            await updateSelectedCells(await getItemSet(itemName));
        }
    }

    async function insertFormToPhotoshop() {
        if(!isLoading){
            try{
                setIsLoading(true)
                currentForm.config = await fetchManager.fetchFormConfig(currentFormFolder);
                let insertFormResult = await executor.insertImageToPhotoshop(currentForm.file.path);
                let textLayerResult;
                let formLayer = app.activeDocument.layers.find(layer => layer.id === insertFormResult[0].ID);
                //Текст
                if(initials){
                    textLayerResult =  await executor.createTextLayer(initials);
                    let initialsLayer = app.activeDocument.layers.find(layer => layer.id === textLayerResult[0].layerID)
                    textLayerResult = [textLayerResult[0].layerID];
                    await executor.alignCenterLayer();
                    await executor.transformLayer(getTransformOptions('initials', initialsLayer))
                } else {
                    textLayerResult = [];
                }
                //Айтемы
                let leftMedalLayerIds = await insertFormItemsToPhotoshop(selectedLeftMedals);
                let rightMedalLayerIds = await insertFormItemsToPhotoshop(selectedRightMedals);
                let medalLayerIds = await insertFormItemsToPhotoshop(selectedMedals);
                let signLayerIds = await insertFormItemsToPhotoshop(selectedSigns);
                let gradeLayerIds = await insertFormItemsToPhotoshop(selectedGrade);

                await executor.setLayers([ formLayer.id, ...medalLayerIds, ...signLayerIds, ...textLayerResult, ...gradeLayerIds, ...leftMedalLayerIds, ...rightMedalLayerIds]);
                let resizePercentValue = getResizeFormValue(formLayer);
                await executor.resizeImage(resizePercentValue);
            } catch (e) {
            } finally {
                itemOffsets = {};
                setIsLoading(false);
                setIsFormInserted(true);
            }
        }
    }

    function getResizeFormValue(formLayer){
        if(formLayer){
            let docWidth = app.activeDocument.width;
            let formWidth = formLayer.bounds.width;
            return docWidth / formWidth * 100 * 0.8;
        }
    }

    async function insertFormItemsToPhotoshop(selectedItems){
        if(selectedItems.some(row => row.some(item => item))){
            try{
                let finalItems = [];
                selectedItems.forEach((selectedRow, rowIdx) => {
                    let onlyFilled = selectedRow.filter(item => item);
                    onlyFilled.forEach((item, itemIdx) => {
                        item.rowIdx = rowIdx;
                        item.itemIdx = itemIdx;
                        item.offset = {};
                        item.offset.vertical = 0;
                        item.offset.horizontal = 0;
                        item.itemsInRow = onlyFilled.length;
                        finalItems.push(item);
                    })
                })

                //Располагаем посередине
                finalItems = finalItems.reverse();
                let layersInfo = await placeItems(finalItems);
                //Двигаем на нужные позиции
                finalItems = finalItems.reverse();
                finalItems = applyOffsetsToItem(finalItems);
                await alignItems(finalItems);
                await offsetItems(finalItems);

                await transformAllItems(layersInfo);
                return layersInfo.map(info => info.layerId);
            } catch(e){
                console.log(e)
            }
        }
        return [];
    }

    async function alignItems(items){
        for(let item of items){
            await executor.setLayers([item.layer.id]);
            await executor.moveImage(item.offset);
        }
    }

    async function offsetItems(items){
        let formConfig = currentForm.config;
        let offset = {};
        offset.vertical = formConfig[items[0].itemName + 'VStartOffset'];
        offset.horizontal = formConfig[items[0].itemName + 'HStartOffset'];

        await executor.setLayers(items.map(item => item.layer.id));
        await executor.moveImage(offset);
    }

    function applyOffsetsToItem(items){

        let currentRowIdx = 0;
        for(let item of items){
            if(currentRowIdx < item.rowIdx){
                itemOffsets[item.itemName + 'HBetweenOffset'] = 0;
                currentRowIdx = item.rowIdx;
            }
            let forPlanksOffset = 0;
            let hBetweenOffset = item.layer.bounds.width;
            let vBetweenOffset = item.layer.bounds.height + 10;
            let nextRowCenterOffset = itemOffsets[item.itemName + 'MaxRowWidth'] - itemOffsets[item.itemName + 'Row-' + item.rowIdx + '-Width'];
            nextRowCenterOffset = nextRowCenterOffset / 2;
            if(item.itemName === 'medal'){
                hBetweenOffset = hBetweenOffset / 2;
                vBetweenOffset = vBetweenOffset * 0.4;
                nextRowCenterOffset = nextRowCenterOffset / 2;
            }
            if(item.itemName === 'plank'){
                forPlanksOffset = itemOffsets['forPlanksOffset'];
            }
            itemOffsets[item.itemName + 'VBetweenOffset'] = vBetweenOffset * item.rowIdx;
            itemOffsets[item.itemName + 'HBetweenOffset'] += hBetweenOffset + 10;

            item.offset.vertical = itemOffsets[item.itemName + 'VBetweenOffset'] - forPlanksOffset;
            item.offset.horizontal = itemOffsets[item.itemName + 'HBetweenOffset'] + nextRowCenterOffset;

        }

        return items;
    }

    async function placeItems(items){
        let itemName = items[0].itemName;
        let layersInfo = [];
        let maxRowWidth = 0;
        for(let item of items){
            initItemOffsets(item);
            let rowWidth = 0;
            let currentRowIdx = item.rowIdx;
            if(currentRowIdx !== item.rowIdx || items.indexOf(item) === items.length - 1){
                rowWidth = 0;
            }
            let itemLayerId = await placeItem(item);
            item.layer = app.activeDocument.layers.find(layer => layer.id === itemLayerId);

            item.width = item.layer.bounds.width;
            item.height = item.layer.bounds.height;

            itemOffsets[itemName + 'Row-' + item.rowIdx + '-Width'] += item.width;
            itemOffsets[itemName + 'Row-' + item.rowIdx + '-Height'] = Math.max(itemOffsets[itemName + 'Row-' + item.rowIdx + '-Height'], item.height);

            if(itemOffsets[itemName + 'MaxRowHeight'] < itemOffsets[itemName + 'Row-' + item.rowIdx + '-Height']){
                itemOffsets[itemName + 'MaxRowHeight'] = itemOffsets[itemName + 'Row-' + item.rowIdx + '-Height'];
            }

            if(maxRowWidth < rowWidth) maxRowWidth = rowWidth;
            layersInfo.push({item: item, layerId: itemLayerId});
        }
        if(itemOffsets[itemName + 'MaxRowWidth'] < maxRowWidth){
            itemOffsets[itemName + 'MaxRowWidth'] = maxRowWidth
        }
        let forPlanksOffset = 0;
        if(items[0].rowIdx !== 0){
            let lastRowIdx = items[0].rowIdx;
            for(let i = lastRowIdx; i > 0; i--){
                forPlanksOffset +=  itemOffsets[itemName + 'Row-' + i + '-Height'];
            }
        }
        itemOffsets['forPlanksOffset'] = forPlanksOffset * currentForm.config['plankScale'] / 100;
        return layersInfo;
    }

    function initItemOffsets(item){
        if(!itemOffsets[item.itemName + 'Row-' + item.rowIdx + '-Width']){
            itemOffsets[item.itemName + 'Row-' + item.rowIdx + '-Width'] = 0;
        }
        if(!itemOffsets[item.itemName + 'Row-' + item.rowIdx + '-Height']){
            itemOffsets[item.itemName + 'Row-' + item.rowIdx + '-Height'] = 0;
        }
        if(!itemOffsets[item.itemName + 'VBetweenOffset']){
            itemOffsets[item.itemName + 'VBetweenOffset'] = 0;
        }
        if(!itemOffsets[item.itemName + 'HBetweenOffset']){
            itemOffsets[item.itemName + 'HBetweenOffset'] = 0;
        }
        if(!itemOffsets[item.itemName + 'MaxRowHeight']){
            itemOffsets[item.itemName + 'MaxRowHeight'] = 0;
        }
        if(!itemOffsets[item.itemName + 'MaxRowWidth']){
            itemOffsets[item.itemName + 'MaxRowWidth'] = 0;
        }
    }

    async function placeItem(item){
        let insertResult = await executor.insertImageToPhotoshop(getItemFile(item).path);
        return insertResult[0].ID;
    }
    async function transformAllItems(layersInfo){
        try{
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
                    await executor.setLayers(layerIds);
                    await executor.transformLayer(options);
                }
            }
        } catch (e){
            console.log(e)
        }

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
                                                            <sp-radio onInput={() => nextCategory(itemName)} value="${itemName + index}" size="m" key={itemName + index}>{itemName}</sp-radio>
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
                                                                    <sp-menu-item onMouseEnter={() => showFormPreview(form)} onMouseLeave={() => hideFormPreview()} onClick={() => toSignsAndMedals(form)} className={'searchFormsBtn'} key={form.name + index}>
                                                                        <div className={'menu-item'}>
                                                                            <span>{form.name}</span>
                                                                            <img className={'imgw60'} src={getStrap(form)} alt=""/>
                                                                        </div>
                                                                    </sp-menu-item>
                                                                )
                                                            })}
                                                        </sp-menu>
                                                    </sp-card>
                                                    <div className={'formPreview'}>
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



            {(() => {if(currentForm && !isLoading && !isFormInserted){
                return (
                    <div>
                        {(() => {
                            if(itemPreview){
                                return (
                                    <div className={'itemPreview'}>
                                        <img className={getItemPreviewSize(itemPreview)}  src={getFile64(itemPreview)} alt=""/>
                                    </div>
                                )
                            }
                        })()}
                        <div className={'flex'}>
                            <div id="formItemView">
                                <img className={'img100'} src={currentForm.file.file64} alt=""/>
                            </div>
                            {(() => {if(currentForm.config['rightItemsDefault'] === 'plank'){
                                return (
                                    <div className={'width70'} id="initials">
                                        <sp-textfield value={initials} onInput={setInitialsValue} placeholder="Фамилия И.О." id ="initialInput" type="input"></sp-textfield>
                                    </div>
                                )
                            }})()}
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
                                                <sp-menu-item onMouseEnter={() => showItemPreview(sign)} onMouseLeave={() => hideItemPreview()} onClick={() => addItemToSelected(sign)} className={'searchFormsBtn'} key={sign.name + index}>
                                                    <div className={'menu-item'}>
                                                        <span>{sign.name}</span>
                                                        <img  className={'imgw20'} src={getFile64(sign)} alt=""/>
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
                                                                                <img className={'imgw20'} src={getFile64(leftMedal)} alt=""/>
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
                                                                                <img className={'imgw40'} src={getFile64(grade)} alt=""/>
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
                                                                        <img className={'imgh30'} src={getFile64(sign)} alt=""/>
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
                                                <sp-menu-item onMouseEnter={() => showItemPreview(medal)} onMouseLeave={() => hideItemPreview()} onClick={() => addItemToSelected(medal)} className={'searchFormsBtn'} key={medal.name + index}>
                                                    <div className={'menu-item'}>
                                                        <span className={rightItemName === 'medal' ? 'yellowItems' : 'redItems'}>{medal.name}</span>
                                                        <img className={'imgw20'} src={getFile64(medal)} alt=""/>
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
                                                                                <img className={'imgw20'} src={getFile64(rightMedal)} alt=""/>
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
                                                                        <img className={'imgw30 zInd' + medalRowIndex} src={getFile64(medal)} alt=""/>
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
                        {(() => {
                            if(!isLoading) {
                                return (
                                    <div id={'controlButtons'}>
                                        <button onClick={() => backToChooseCategories()}>Назад</button>
                                        <sp-button onClick={() => insertFormToPhotoshop()}>Подставить форму</sp-button>
                                    </div>
                                )
                            }
                        })()}
                    </div>
                )
            }})()}
            {(() => {if(isFormInserted && !isLoading){
                return (
                    <div id={'afterFormInsertMenu'}>
                        <div>
                            <button onClick={() => insertFormToPhotoshop()}>Подставить предыдущую</button>
                            <button onClick={() => editPrevForm()}>Редактировать предыдущую</button>
                        </div>
                        <div>
                            <sp-button onClick={() => toNewForm()}>Новая форма</sp-button>
                        </div>
                    </div>
                )
            }})()}
        </div>
        );
    }


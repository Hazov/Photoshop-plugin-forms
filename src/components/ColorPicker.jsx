import React, {useState} from "react";


import "./ColorPicker.css"
import {FetchService} from "../services/fetchService";
import {UtilService} from "../services/utilService";
import {FileService} from "../services/fileService";
import {SortService} from "../services/sortService";
import {PhotoshopService} from "../services/PhotoshopService";
import arrowLeftImg from '/src/images/arrow-left.png'
import arrowRightImg from '/src/images/arrow-right.png'
import clearImg from '/src/images/clear.png'



const photoshop = require('photoshop');
const app = photoshop.app;

const fetchService = new FetchService();
const utilService = new UtilService();
const fileService = new FileService();
const sortService = new SortService();
const photoshopService = new PhotoshopService();

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

let itemTypesList = ['medal', 'plank', 'sign', 'grade', 'leftMedal', 'rightMedal'];

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
    let [formStep, setFormStep] = useState(null);

    init().then(ignore => {});
    async function init(){
        if(!isInit) {
            isInit = true;
            //Загрузка начальной категории
            fetchService.fetchFormCategory(await fileService.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
            //Загрузка ячеек для выбора
            for (let itemType of itemTypesList) {
                await updateSelectedCells(await getItemsSuite(itemType));
            }
            //Загрузка всех погон
            straps = await fetchService.fetchStraps();
            //Загрузка всех медалей
            let fetchResolve = await fetchService.fetchItems(await getItemsSuite(DEFAULT_MEDAL_ITEM_NAME, true), itemFiles)
            setMedals(fetchResolve);
            setFilteredMedals(fetchResolve)
            //Загрузка всех планок
            fetchResolve = await fetchService.fetchItems(await getItemsSuite(DEFAULT_PLANKS_ITEM_NAME, true), itemFiles)
            setPlanks(fetchResolve);
            //Загрузка всех значков
            fetchResolve = await fetchService.fetchItems(await getItemsSuite(DEFAULT_SIGNS_ITEM_NAME), itemFiles)
            setSigns(fetchResolve);
            setFilteredSigns(fetchResolve)
        }
    }

    async function changeItemsInRow(isIncrease, itemName){
        if(itemName === 'rightItem'){
            itemName = rightItemName
        }
        let itemSuite = await getItemsSuite(itemName);
        if(isIncrease && itemSuite.maxItemsInRow > itemSuite.itemsInRow){
            itemSuite.itemsInRowSetter(++itemSuite.itemsInRow);
        } else if(!isIncrease && itemSuite.minItemsInRow < itemSuite.itemsInRow){
            itemSuite.itemsInRowSetter(--itemSuite.itemsInRow);
        } else {
            return;
        }
        await updateSelectedCells(itemSuite);
    }
    async function updateSelectedCells(itemSuite) {
        let multiTypesSelectedItems = itemSuite.selectedItems.flatMap(item => item);
        let rowsArray = [];
        for(let i = 0; i < itemSuite.itemRowsCount; i++){
            let cellsArray = [];
            for (let j = 0; j < itemSuite.itemsInRow; j++) {
                let selectedIdx = i * itemSuite.itemsInRow + j;
                let selectedItem = null;
                if(multiTypesSelectedItems && multiTypesSelectedItems.length && multiTypesSelectedItems.length > selectedIdx && multiTypesSelectedItems[selectedIdx]){
                    selectedItem = multiTypesSelectedItems[selectedIdx];
                    multiTypesSelectedItems[selectedIdx] = null;
                }
                cellsArray.push(selectedItem);
            }
            rowsArray.push(cellsArray);
        }
        itemSuite.selectedSetter(rowsArray);
        let groupedSelectedItems = utilService.groupBy(multiTypesSelectedItems, 'itemName');
        for (let byTypeGroup of groupedSelectedItems) {
            let itemSuite = await getItemsSuite(byTypeGroup[0].itemName);
            byTypeGroup.forEach(item => itemSuite.allItems.push(item));
            itemSuite.allItemsSetter(itemSuite.allItems);
        }
        if(itemSuite.allItems && itemSuite.allItems.length){
            itemSuite.filteredSetter(search(itemSuite.search, itemSuite.allItems));
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
        let itemType = item.itemName;
        if(itemType === 'plank' && itemType === 'grade'){
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
    async function getItemsSuite(itemType, init){
        let rightName = rightItemName;
        if(init){
            rightName = itemType;
        }
        let itemSuite = {};
        itemSuite.itemName = itemType;
        switch (itemType){
            case 'sign': {
                itemSuite.search = signsSearch;
                itemSuite.itemRowsCount = signRowsCount;
                itemSuite.itemsInRow = signsInRow;
                itemSuite.itemsInRowSetter = signsInRowSetter;
                itemSuite.minItemsInRow = 2;
                itemSuite.maxItemsInRow = 4;
                itemSuite.selectedItems = selectedSigns;
                itemSuite.selectedSetter = setSelectedSigns;
                itemSuite.allItems = signs;
                itemSuite.allItemsSetter = setSigns;
                itemSuite.filteredItems = filteredSigns;
                itemSuite.filteredSetter = setFilteredSigns;
                itemSuite.itemFolder = await fetchService.getSignsFolder();
                itemSuite.itemSearchInput = 'signsSearchInput'
                break;
            }
            case 'medal': {
                itemSuite.search = medalsSearch;
                itemSuite.itemRowsCount = medalRowsCount;
                itemSuite.itemsInRow = medalsInRow;
                itemSuite.itemsInRowSetter = medalsInRowSetter;
                itemSuite.minItemsInRow = 3;
                itemSuite.maxItemsInRow = 5;
                itemSuite.selectedItems = selectedMedals;
                itemSuite.selectedSetter = setSelectedMedals;
                itemSuite.allItems = medals;
                itemSuite.allItemsSetter = setMedals;
                itemSuite.filteredItems = filteredMedals;
                itemSuite.filteredSetter = setFilteredMedals;
                itemSuite.itemFolder = await fetchService.getMedalsFolder(rightName);
                itemSuite.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'plank': {
                itemSuite.search = medalsSearch;
                itemSuite.itemRowsCount = medalRowsCount;
                itemSuite.itemsInRow = medalsInRow;
                itemSuite.itemsInRowSetter = medalsInRowSetter;
                itemSuite.minItemsInRow = 3;
                itemSuite.maxItemsInRow = 5;
                itemSuite.selectedItems = selectedMedals;
                itemSuite.selectedSetter = setSelectedMedals;
                itemSuite.allItems = planks;
                itemSuite.allItemsSetter = setPlanks;
                itemSuite.filteredItems = filteredMedals;
                itemSuite.filteredSetter = setFilteredMedals;
                itemSuite.itemFolder = await fetchService.getMedalsFolder(rightName);
                itemSuite.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'leftMedal': {
                itemSuite.search = medalsSearch;
                itemSuite.itemRowsCount = 1;
                itemSuite.itemsInRow = 3;
                itemSuite.itemsInRowSetter = medalsInRowSetter;
                itemSuite.minItemsInRow = 3;
                itemSuite.maxItemsInRow = 3;
                itemSuite.selectedItems = selectedLeftMedals;
                itemSuite.selectedSetter = setSelectedLeftMedals;
                itemSuite.allItems = medals;
                itemSuite.allItemsSetter = setMedals;
                itemSuite.filteredItems = filteredMedals;
                itemSuite.filteredSetter = setFilteredMedals;
                itemSuite.itemFolder = await fetchService.getMedalsFolder('medal');
                itemSuite.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'rightMedal': {
                itemSuite.search = medalsSearch;
                itemSuite.itemRowsCount = 1;
                itemSuite.itemsInRow = 3;
                itemSuite.itemsInRowSetter = medalsInRowSetter;
                itemSuite.minItemsInRow = 3;
                itemSuite.maxItemsInRow = 3;
                itemSuite.selectedItems = selectedRightMedals;
                itemSuite.selectedSetter = setSelectedRightMedals;
                itemSuite.allItems = medals;
                itemSuite.allItemsSetter = setMedals;
                itemSuite.filteredItems = filteredMedals;
                itemSuite.filteredSetter = setFilteredMedals;
                itemSuite.itemFolder = await fetchService.getMedalsFolder('medal');
                itemSuite.itemSearchInput = 'medalsSearchInput'
                break;
            }
            case 'grade': {
                itemSuite.search = signsSearch;
                itemSuite.itemRowsCount = 1;
                itemSuite.itemsInRow = 1;
                itemSuite.itemsInRowSetter = signsInRowSetter;
                itemSuite.minItemsInRow = 1;
                itemSuite.maxItemsInRow = 1;
                itemSuite.selectedItems = selectedGrade;
                itemSuite.selectedSetter = setSelectedGrade;
                itemSuite.allItems = signs;
                itemSuite.allItemsSetter = setSigns;
                itemSuite.filteredItems = filteredSigns;
                itemSuite.filteredSetter = setFilteredSigns;
                itemSuite.itemFolder = await fetchService.getSignsFolder();
                itemSuite.itemSearchInput = 'signsSearchInput'
                break;
            }
        }
        return itemSuite;

    }

    async function prevCategory(){
        currentFormFolder.pop();
        fetchService.fetchFormCategory(await fileService.getFolderByPath(currentFormFolder)).then(resolve => setFormCategory(resolve));
    }
    async function nextCategory(item) {
        currentFormFolder.push(item);
        let formFolder = await fileService.getFolderByPath(currentFormFolder);
        let resolve = await fetchService.fetchFormCategory(formFolder)
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
        let value;
        if(!e){
            value = '';
        } else {
            value = e.target.value;
        }
        setMedalsSearch(value);
        let itemSuite =  await getItemsSuite(rightItemName);
        if(itemSuite.allItems){
            setFilteredMedals(search(value, itemSuite.allItems));
        }
    }

    function searchSigns(e){
        let value;
        if(!e){
            value = '';
        } else {
            value = e.target.value;
        }
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
        setFormStep('common');
        form.config = await fetchService.fetchFormConfig(currentFormFolder);
        if(form.config){
            if(form.config['rightItemsDefault'] === 'plank'){
                setInitials(null);
                switchRightItems('medal');
            }
            if(form.config['rightItemsDefault'] === 'medal'){
                switchRightItems('plank');
            }
        }
        setCurrentForm(form);
    }

    function getActuallyItemName(item){
        let itemType;
        if(item.itemName === 'medal' || item.itemName === 'plank'){
            itemType = rightItemName;
        } else {
            itemType = item.itemName;
        }
        return itemType;
    }

    async function addItemToSelected(item){
        let itemType = getActuallyItemName(item)
        let itemSuite = await getItemsSuite(itemType);

        let coordCell = defineCoordToAdd(itemSuite.selectedItems);
        let newSelectedItems = JSON.parse(JSON.stringify(itemSuite.selectedItems));
        newSelectedItems[coordCell.row][coordCell.cell] = item;
        itemSuite.selectedSetter(newSelectedItems);

        let inAllItemIndex = utilService.indexOf(itemSuite.allItems, item);
        let allItemsWithoutItem = itemSuite.allItems.filter((item, index) => index !== inAllItemIndex);
        itemSuite.allItemsSetter(allItemsWithoutItem);

        let inFilteredItemIndex = utilService.indexOf(itemSuite.filteredItems, item);
        let filteredItemsWithoutItem = itemSuite.filteredItems.filter((item, index) => index !== inFilteredItemIndex);
        itemSuite.filteredSetter(filteredItemsWithoutItem);


    }

    async function deleteItemFromSelected(itemRowIndex, itemCellIndex, item){
        if(formStep !== 'common'){
            let itemSuite = await getItemsSuite(item.itemName);
            let selectedItems = JSON.parse(JSON.stringify(itemSuite.selectedItems));
            let selectedItem = selectedItems[itemRowIndex][itemCellIndex];
            let selectedItemCopy = JSON.parse(JSON.stringify(selectedItem));
            selectedItems[itemRowIndex][itemCellIndex] = null;
            itemSuite.selectedSetter(selectedItems);
            let allItems = itemSuite.allItems.concat(selectedItemCopy);
            allItems.sort((s1, s2) => (s1.name).localeCompare(s2.name));
            itemSuite.allItemsSetter(allItems);

            itemSuite = await getItemsSuite(getActuallyItemName(item));
            itemSuite.filteredSetter(search(itemSuite.search, itemSuite.allItems))
        }
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
        setMedalsSearch('');
        setSignsSearch('');
        setFilteredMedals(search(medalsSearch, medals));
        setFilteredSigns(search(signsSearch, signs));
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
        selectedSigns = []
        selectedMedals = []
        selectedLeftMedals = [];
        selectedRightMedals = [];
        selectedGrade = [];

        for (let itemType of itemTypesList) {
            await updateSelectedCells(await getItemsSuite(itemType));
        }

    }

    async function insertFormToPhotoshop() {
        if(!isLoading){
            try{
                setIsLoading(true)
                currentForm.config = await fetchService.fetchFormConfig(currentFormFolder);
                let insertFormResult = await photoshopService.insertImageToPhotoshop(currentForm.file.path);
                let formLayer = app.activeDocument.layers.find(layer => layer.id === insertFormResult[0].ID);
                await photoshopService.alignCenterRelativeToDocument();
                //Текст
                let textLayerResult;
                if(initials){
                    textLayerResult =  await photoshopService.createTextLayer(initials);
                    let initialsLayer = app.activeDocument.layers.find(layer => layer.id === textLayerResult[0].layerID)
                    textLayerResult = [textLayerResult[0].layerID];
                    await photoshopService.alignCenterRelativeToDocument();
                    await photoshopService.transformLayer(getItemTransformOptions('initials', initialsLayer))
                } else {
                    textLayerResult = [];
                }

                //Айтемы
                let signLayerIds = await insertFormItemsToPhotoshop(selectedSigns);
                currentForm.config['gradeHStartOffset'] = currentForm.config['signHStartOffset'];
                let gradeLayerIds = await insertFormItemsToPhotoshop(selectedGrade);
                let medalLayerIds = await insertFormItemsToPhotoshop(selectedMedals);
                let leftMedalLayerIds = await insertFormItemsToPhotoshop(selectedLeftMedals);
                let rightMedalLayerIds = await insertFormItemsToPhotoshop(selectedRightMedals);

                await photoshopService.setLayers([ formLayer.id, ...medalLayerIds, ...signLayerIds, ...textLayerResult, ...gradeLayerIds, ...leftMedalLayerIds, ...rightMedalLayerIds]);
                let resizePercentValue = getResizeFormValue(formLayer);
                await photoshopService.resizeImage(resizePercentValue);
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
                let items = prepareItemsToInsert(selectedItems);

                //Располагаем в кучу посередине
                items = await placeItems(items);
                let layerIds = items.map(item => item.layer.id);

                //Раздвигаем относительно друг друга
                items = applyAlignsItems(items);
                await alignItems(items);

                //Центрируем весь блок, для ровного сдвига

                await moveBlockItemsToCenter(items);

                //Весь блок двигаем на грудь
                await offsetItems(items);

                //Трансформируем слои (масштаб, угол...)
                await transformAllItems(items);
                return layerIds;
            } catch(e){
                console.log(e)
            }
        }
        return [];
    }

    function prepareItemsToInsert(selectedItems){
        let preparedItems = [];
        selectedItems.forEach((selectedRow, rowIdx) => {
            let onlyFilled = selectedRow.filter(item => item);
            onlyFilled.forEach((item, itemIdx) => {
                item.rowIdx = rowIdx;
                item.itemIdx = itemIdx;
                item.offset = {};
                item.offset.vertical = 0;
                item.offset.horizontal = 0;
                item.itemsInRow = onlyFilled.length;
                preparedItems.push(item);
            })
        })
        return preparedItems;
    }

    async function moveBlockItemsToCenter(items){
        let layerIds = items.map(item => item.layer.id);
        await photoshopService.groupLayers(layerIds);
        await photoshopService.alignCenterRelativeToDocument();
        await photoshopService.ungroupLayers();
    }

    async function alignItems(items){
        for(let item of items){
            await photoshopService.setLayers([item.layer.id]);
            await photoshopService.moveImage(item.offset);
        }
    }

    async function offsetItems(items){
        let formConfig = currentForm.config;
        let offset = {};
        offset.vertical = formConfig[items[0].itemName + 'VStartOffset'];
        offset.horizontal = formConfig[items[0].itemName + 'HStartOffset'];

        await photoshopService.setLayers(items.map(item => item.layer.id));
        await photoshopService.moveImage(offset);
    }

    function applyAlignsItems(items){
        items = items.reverse();
        let currentRowIdx = 0;
        let index = 0;
        for(let item of items){
            if(currentRowIdx < item.rowIdx){
                itemOffsets[item.itemName + 'HBetweenOffset'] = 0;
                index = 0;
                currentRowIdx = item.rowIdx;
            }
            let planksNextRowOffset = 0;
            let layerWidth = item.layer.bounds.width;

            let smallRowCenterOffset = 0;
            if(itemOffsets[item.itemName + 'MaxRowWidth'] !== itemOffsets[item.itemName + 'Row-' + item.rowIdx + '-Width']){
                smallRowCenterOffset = itemOffsets[item.itemName + 'MaxRowWidth'] / 2 - layerWidth / 2;
            }
            if(item.itemName === 'medal'){
                layerWidth = layerWidth / 2;
                if(smallRowCenterOffset){
                    smallRowCenterOffset = smallRowCenterOffset / 2;
                }
            }
            if(item.itemName === 'plank'){
                planksNextRowOffset = itemOffsets['forPlanksOffset'];
            }
            let sumHeight = 0;
            for(let i = 0; i < currentRowIdx; i++){
                sumHeight += itemOffsets[item.itemName + 'Row-' + i + '-Height'];
            }
            if(item.itemName === 'medal'){
                sumHeight *= 0.32;
            }
            itemOffsets[item.itemName + 'VBetweenOffset'] = sumHeight;


            item.offset.vertical = itemOffsets[item.itemName + 'VBetweenOffset'] - planksNextRowOffset + (15 * currentRowIdx);
            item.offset.horizontal = itemOffsets[item.itemName + 'HBetweenOffset'] + smallRowCenterOffset + (20 * index);

            itemOffsets[item.itemName + 'HBetweenOffset'] += layerWidth;
            index++;

        }

        return items;
    }

    async function placeItems(items){
        items = items.reverse();
        let itemType = items[0].itemName;
        let maxRowWidth = 0;
        let index = 0;
        for(let item of items){
            initItemOffsets(item);
            let currentRowIdx = item.rowIdx;
            if(currentRowIdx !== item.rowIdx || items.indexOf(item) === items.length - 1){
                index = 0;
            }
            let itemLayerId = await placeItem(item);
            item.layer = app.activeDocument.layers.find(layer => layer.id === itemLayerId);

            item.width = item.layer.bounds.width;
            item.height = item.layer.bounds.height;

            itemOffsets[itemType + 'Row-' + item.rowIdx + '-Width'] += item.width;
            if(index !== 0){
                itemOffsets[itemType + 'Row-' + item.rowIdx + '-Width'] += 20;
            }
            itemOffsets[itemType + 'Row-' + item.rowIdx + '-Height'] = Math.max(itemOffsets[itemType + 'Row-' + item.rowIdx + '-Height'], item.height) + (15 * currentRowIdx);

            if(itemOffsets[itemType + 'MaxRowWidth'] < itemOffsets[itemType + 'Row-' + item.rowIdx + '-Width']){
                itemOffsets[itemType + 'MaxRowWidth'] = itemOffsets[itemType + 'Row-' + item.rowIdx + '-Width'];
            }
            index++;
        }
        let layerIds = items.map(item => item.layer.id);
        if(layerIds.length > 1){
            await photoshopService.alignTopLeftLayers(layerIds);
        } else {
            await photoshopService.alignCenterRelativeToDocument()
        }
        let forPlanksOffset = 0;
        if(items[0].rowIdx !== 0){
            let lastRowIdx = items[0].rowIdx;
            for(let i = lastRowIdx; i > 0; i--){
                forPlanksOffset +=  itemOffsets[itemType + 'Row-' + i + '-Height'] + 15;
            }
        }
        itemOffsets['forPlanksOffset'] = forPlanksOffset * currentForm.config['plankScale'] / 100;
        return items;
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
        if(!itemOffsets[item.itemName + 'MaxRowWidth']){
            itemOffsets[item.itemName + 'MaxRowWidth'] = 0;
        }
    }

    async function placeItem(item){
        let insertResult = await photoshopService.insertImageToPhotoshop(getItemFile(item).path);
        return insertResult[0].ID;
    }
    async function transformAllItems(items){
        try{
            let itemTypeLayerMap = new Map();
            items.forEach(item => {
                let itemType = item.itemName;
                if(!itemTypeLayerMap.get(itemType)){
                    itemTypeLayerMap.set(itemType, []);
                }
                itemTypeLayerMap.get(itemType).push(item.layer.id);
            })

            for(let itemType of itemTypeLayerMap.keys()){
                let layerIds = itemTypeLayerMap.get(itemType);
                let options = getItemTransformOptions(itemType)
                if(options){
                    await photoshopService.setLayers(layerIds);
                    await photoshopService.transformLayer(options);
                }
            }
        } catch (e){
            console.log(e)
        }

    }
    function getItemTransformOptions(itemName, layer){
        let options = {};
        let config = JSON.parse(JSON.stringify(currentForm.config));
        if(itemName === 'initials'){
            options.scale = getScaleByPocket(config['pocketSize'], layer);
            options.offset = config[itemName + 'Offset'];
        } else {
            if(config[itemName + 'Scale']){
                options.scale = config[itemName + 'Scale'];
            }
        }
        if(currentForm.config[itemName + 'Angle']){
            options.angle = config[itemName + 'Angle'];
        }
        return options;
    }

    function getScaleByPocket(pocketSize, initialsLayer){
        let scale = {};
        let commonPercent = (pocketSize.height / initialsLayer.bounds.height) * 100;
        let percentByWidth = (pocketSize.width / initialsLayer.bounds.width) * 100;
        let afterTransformWidth = initialsLayer.bounds.width + (initialsLayer.bounds.width / commonPercent);
        if(pocketSize.width / afterTransformWidth > 0.7){
            percentByWidth = commonPercent;
        }
        scale.height = commonPercent;
        scale.width = percentByWidth;
        return scale;
    }

    async function execute(pluginFunc){
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    function switchRightItems(name) {
        let toSwitchName = name;
        if(!toSwitchName){
            toSwitchName = rightItemName;
        }
        switch (toSwitchName){
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

    function changeStep(step){
        setFormStep(step)
    }

    function getPreviewItemSizeInList(item){
        if(item.itemName === 'grade'){
            return 'imgh40';
        }
        return 'imgw40'
    }

    function makeActive(event){
        let el = event.currentTarget;
        el.classList.add('active');

    }

    function makeNonActive(event){
        let el = event.currentTarget;
        el.classList.remove('active');
    }

    function leftSelectedTemplate(){
        return (
            <div>
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
        )
    }

    function rightSelectedTemplate(){
        return (
            <div>
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
                    {(() => {
                        if(formStep === 'rightItemsStep'){
                            return (
                                <button className={'circleBtn'} onClick={() => changeItemsInRow(false, 'rightItem')}>-</button>
                            )
                        }
                    })()}

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
                    {(() => {
                        if(formStep === 'rightItemsStep'){
                            return (
                                <button className={'circleBtn'} onClick={() => changeItemsInRow(true, 'rightItem')}>+</button>
                            )
                        }
                    })()}
                </div>
            </div>
        )
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
                                                <div className={'formCategoryContainer'} label="Medium" name='${formCategory.title}' >
                                                    {formCategory.categoryItems.map((category, index) => {
                                                        return (
                                                            <div className={formCategory} onClick={() => nextCategory(category.name)} key={category.name + index}>
                                                                <div className={'categoryNameContainer'}>
                                                                    <span className={'categoryName'}> {category.name} </span>
                                                                </div>
                                                                <div><img src={category.file?.file64} alt=""/></div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
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
                                                    <div className={'flex'}>
                                                        <sp-textfield onInput={searchForms} class={'searchInput'} id="searchFormsInput" type="search">
                                                        </sp-textfield>
                                                        <img src={clearImg} className={'clearImg'} alt=""/>
                                                    </div>

                                                    <sp-card id="formList">
                                                        <sp-menu className={'select-menu'}>
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


            {/*ЭТАП ЗНАЧКИ И МЕДАЛИ*/}
            {(() => {if(currentForm && !isLoading && !isFormInserted){
                return (
                    <div>
                        {(() => {
                            if(formStep === 'common'){
                                return(
                                    <div>

                                        <div className={'flexTables'}>
                                            <div id={'toSignsBlock'} onMouseEnter={makeActive} onMouseLeave={makeNonActive} className={'flex-column'} onClick={() => changeStep('signsStep')}>
                                                {/*К значкам*/}
                                                <div className={'common-table-title-container'}>
                                                    <img className={'common-table-title-img'} src={arrowLeftImg} alt=""/>
                                                    <span className={'common-table-title'} >К значкам</span>
                                                </div>
                                                {(() => {
                                                    return leftSelectedTemplate();
                                                })()}

                                            </div>

                                            <div id={'toMedalsBlock'} onMouseEnter={makeActive} onMouseLeave={makeNonActive} className={'flex-column'} onClick={() => changeStep('rightItemsStep')}>
                                                {/*К медалям*/}
                                                <div className={'common-table-title-container'}>
                                                    <span className={'common-table-title'}>К медалям</span>
                                                    <img className={'common-table-title-img'} src={arrowRightImg} alt=""/>
                                                </div>
                                                {(() => {
                                                    return rightSelectedTemplate();
                                                })()}
                                            </div>

                                        </div>



                                        {/*ПРЕВЬЮ ФОРМЫ*/}
                                        <div id="formItemView" className={'flex'}>
                                            <img className={'img200'} src={currentForm.file.file64} alt=""/>
                                        </div>

                                        {/*ИНИЦИАЛЫ*/}
                                        {(() => {if(currentForm.config['rightItemsDefault'] === 'plank'){
                                            return (
                                                <div className={'width100'} id="initials">
                                                    <sp-textfield value={initials} onInput={setInitialsValue} placeholder="Фамилия И.О." id ="initialInput" type="input"></sp-textfield>
                                                </div>
                                            )
                                        }})()}
                                        {(() => {
                                            if(!isLoading) {
                                                return (
                                                    <div id={'controlButtons'}>
                                                        <button onClick={() => backToChooseCategories()}>К списку форм</button>
                                                        <sp-button onClick={() => insertFormToPhotoshop()}>Подставить форму</sp-button>
                                                    </div>
                                                )
                                            }
                                        })()}
                                    </div>
                                )
                            }
                        })()}

                        {(() => {
                            if(formStep === 'signsStep'){
                                return(
                                    <div>
                                        {/*СПИСОК ЗНАЧКОВ*/}
                                        <div className={'formItems'}>
                                            <h2>Значки</h2>
                                            {/*поиск*/}
                                            <div className={'flex'}>
                                                <sp-textfield value={signsSearch}  onInput={searchSigns} class={'searchInput'} type="search">
                                                </sp-textfield>
                                                <img onClick={() => searchSigns(null)} className={'clearImg'} src={clearImg} alt=""/>
                                            </div>
                                            {/*список*/}
                                            <sp-card id="signList">
                                                <sp-menu className={'select-menu'}>
                                                    {filteredSigns.map((sign, index) => {
                                                        return (
                                                            <sp-menu-item onMouseEnter={() => showItemPreview(sign)} onMouseLeave={() => hideItemPreview()} onClick={() => addItemToSelected(sign)} className={'searchFormsBtn'} key={sign.name + index}>
                                                                <div className={'menu-item'}>
                                                                    <span>{sign.name}</span>
                                                                    <img className={getPreviewItemSizeInList(sign)} src={getFile64(sign)} alt=""/>
                                                                </div>
                                                            </sp-menu-item>
                                                        )
                                                    })}
                                                </sp-menu>
                                            </sp-card>
                                        </div>
                                        <div id={'controlButtons'}>
                                            <button className={'doneBtn'} onClick={() => changeStep('common')}>Завершить</button>
                                            <sp-button onClick={() => changeStep('rightItemsStep')}>К медалям</sp-button>
                                        </div>
                                        {/*ВЫБРАННЫЕ АЙТЕМЫ*/}
                                        <div className={'flexTables'}>
                                            {(() => {
                                                return leftSelectedTemplate();
                                            })()}
                                            {(() => {
                                                return rightSelectedTemplate();
                                            })()}
                                        </div>
                                    </div>

                                )
                            }
                        })()}

                        {/*СПИСОК МЕДАЛЕЙ*/}
                        {(() => {
                            if(formStep === 'rightItemsStep'){
                                return(
                                    <div className={'formItems'}>
                                        <div className={'flex'}>
                                            <h2 className={rightItemName === 'medal' ? 'yellowItems' : 'redItems'}>{getUiName(rightItemName)}</h2>
                                            <button onClick={() => switchRightItems()}>{getSwitchName(rightItemName)}</button>
                                        </div>

                                        {/*поиск*/}
                                        <div className={'flex'}>
                                            <sp-textfield value={medalsSearch} onInput={searchMedals} class={'searchInput'} type="search">
                                            </sp-textfield>
                                            <img onClick={() => searchMedals(null)}  className={'clearImg'} src={clearImg} alt=""/>
                                        </div>

                                        {/*список*/}
                                        <sp-card id="medalList">
                                            <sp-menu className={'selectMenu'}>
                                                {filteredMedals.map((medal, index) => {
                                                    return (
                                                        <sp-menu-item onMouseEnter={() => showItemPreview(medal)} onMouseLeave={() => hideItemPreview()} onClick={() => addItemToSelected(medal)} className={'searchFormsBtn'} key={medal.name + index}>
                                                            <div className={'menu-item'}>
                                                                <span className={rightItemName === 'medal' ? 'yellowItems' : 'redItems'}>{medal.name}</span>
                                                                <img className={getPreviewItemSizeInList(medal)} src={getFile64(medal)} alt=""/>
                                                            </div>
                                                        </sp-menu-item>
                                                    )
                                                })}
                                            </sp-menu>
                                        </sp-card>
                                        <div id={'controlButtons'}>
                                            <sp-button onClick={() => changeStep('signsStep')}>К значкам</sp-button>
                                            <button className={'doneBtn'} onClick={() => changeStep('common')}>Завершить</button>
                                        </div>

                                        {/*ВЫБРАННЫЕ АЙТЕМЫ*/}
                                        <div className={'flexTables'}>
                                            {(() => {
                                                return leftSelectedTemplate();
                                            })()}
                                            {(() => {
                                                return rightSelectedTemplate();
                                            })()}
                                        </div>

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


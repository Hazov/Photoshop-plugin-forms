import React, {useEffect, useState} from "react";
import {TextGaps} from "../entities/filler/TextGaps";
import {ValidateToFillResponse} from "../entities/filler/ValidateToFillResponse";

import "./FillerApp.css"

import {PhotoshopService} from "../services/PhotoshopService";
import {DuplicatedGap} from "../entities/filler/DuplicatedGap";
import CustomRadioButton from "./CustomRadio";

const photoshop = require('photoshop');
const app = photoshop.app;
const action = photoshop.action;
const uxp = require('uxp')
const storage = uxp.storage;
const photoshopService = new PhotoshopService();
let isInit = false;
export const FillerApp = () => {

    //psModel
    let [textGaps, setTextGaps] = useState([]);
    let [imageGap, setImageGap] = useState(undefined);
    let [oldIg, setOldIg] = useState(true);
    let [oldTextGap, setOldTextGap] = useState(0);
    //formModel
    let [textsToFill, setTextsToFill] = useState(new TextGaps([],[]));
    let [imagesToFill, setImagesToFill] = useState([]);
    let [isOneTextOfFileName, setIsOneTextOfFileName] = useState(false);
    let [statusInfo, setStatusInfo] = useState('Просканируйте документ');
    let [rowsCount, setRowsCount] = useState(0);
    let [warnEmptyRowsCount, setWarnEmptyRowsCount] = useState(0);
    let [rowTextToFill, setRowTextToFill] = useState('');
    let [resultCount, setResultCount] = useState(0);
    let [notEnoughCount, setNotEnoughCount] = useState(0);
    let [rowsDf, setRowsDf] = useState(0);
    let [imagesDf, setImagesDf] = useState(0);
    let [fillerPartUi, setFillerPartUi] = useState("main");
    //model
    let [selectedValue, setSelectedValue] = useState("without");
    let [validateToFillResponse, setValidateToFillResponse] = useState(new ValidateToFillResponse(false, ''));
    let [isFilled, setIsFilled] = useState(false);
    let [isScanned, setIsScanned] = useState(undefined);
    let [createdGroups, setCreatedGroups] = useState([]);
    let [imagesFolder, setImagesFolder] = useState(undefined);

    init().then(ignore => {});
    async function init() {
        if (!isInit) {
            await action.addNotificationListener(["all"], photoshopListener);
            photoshopListener();
            isInit = true
        }
    }

    async function photoshopListener(){
        await scanToFill()
        if(!!imageGap !== oldIg || textGaps.length !== oldTextGap){
            setOldIg(!!imageGap)
            setOldTextGap(textGaps.length)
            await validateToFill()
        }
    }




    useEffect(() => {
        let rCount = isOneTextOfFileName ? rowsCount + imagesToFill.length : rowsCount
        let rDf = !rCount || !textGaps.length ? 1 : rCount / textGaps.length;
        let iDf = !imagesToFill.length || !imageGap ? 1 : imagesToFill.length;
        let count = Math.ceil(Math.max(rDf, iDf))
        setRowsDf(rDf)
        setImagesDf(iDf)
        setResultCount(count)

        let nEnoughCount = 0;
        if(textGaps.length && rDf < iDf){
            nEnoughCount =  (count * textGaps.length) - rCount;
        } else if(imageGap && iDf < rDf){
            nEnoughCount = count - imagesToFill.length;
        }
        setNotEnoughCount(Math.ceil(nEnoughCount))

    }, [rowsCount, imagesToFill, isOneTextOfFileName]);

    //Сканирует текстовые объекты и объект для подстановки изображения в текущем PSD
    async function scanToFill() {
        setTextGaps([])
        setImageGap(undefined)
        try {
            if (!app.activeDocument) {
                return [];
            }
            setTextGaps(await app.activeDocument.layers.filter(isTextLambda));
            setImageGap(await app.activeDocument.layers.find(isBoxLambda));
        } catch (err) {
            setStatusInfo('Произошла ошибка при сканировании')
        }
    }

    let isTextLambda = layer => layer.kind === 'text' && layer.textItem.contents.startsWith('$')
    let isBoxLambda = layer => layer.kind === 'solidColor' && layer.name.includes('$')

    //Выбрать папку и достать оттуда изображения отсортированные в порядке
    async function browseToFillFolder() {
        try {
            // Выбор папки
            let selectedFiles = await storage.localFileSystem.getFileForOpening({
                allowMultiple: true,
                types: ["jpeg;*.jpg;*.png"]

            });
            setImagesToFill(selectedFiles.sort((a, b) => a.name.localeCompare(b.name)));
            await validateToFill()
        } catch (err) {
            console.error(err.message); // обработка ошибок
        }
    }


    async function validateToFill() {
        let ofInput = splitTextByRows(rowTextToFill)
        let ofFile = []
        if(isOneTextOfFileName){
            ofFile = imagesToFill.map(file => file.name)
        }
        await setTextsToFill(new TextGaps(ofInput, ofFile))
        let allTexts =  [...ofInput, ...ofFile]
        let validateTexts = !textGaps.length || (rowsCount && allTexts.length && allTexts.length >= textGaps.length && allTexts.length % textGaps.length  === 0);
        let validateImages = !imageGap || (imagesToFill.length > 0 && imagesToFill.length >= 1 && imagesToFill.length % 1 === 0 );
        let textsToValidate = isOneTextOfFileName ? allTexts : ofInput
        let validateTextsAndImages = (!textGaps.length || !imageGap) || textGaps.length / textsToValidate.length === 1 / imagesToFill.length
        let fullValidate = validateTexts && validateImages && validateTextsAndImages;
        setValidateToFillResponse(new ValidateToFillResponse(fullValidate, getMsgForFillValidate(validateTexts, validateImages, validateTextsAndImages)))
        return fullValidate;
    }

    function getMsgForFillValidate(r,t,y){
        return "";
    }

    function changeIsOneTextOfFileName(){
        setIsOneTextOfFileName(!isOneTextOfFileName)
    }

    function getGroupsCount(){
        if(isOneTextOfFileName) {
            return imagesToFill.length;
        }
        return textsToFill.ofInputField.length / textGaps.length
    }

    async function preparePsToFill(){
        let oldDocumentId = app.activeDocument.id
        await photoshopService.cloneCurrentPsd()
        await photoshopService.switchDocument(oldDocumentId)
        let layers = app.activeDocument.layers

        let groupsCount = getGroupsCount();
        let copies = [];
        for (let i = 1; i <= groupsCount; i++) {
            let group = await photoshopService.createGroup('vgroup' + i.toString());
            let groupedLayerCopies = await photoshopService.cloneLayers(layers.reverse().filter(layer => !layer.name.includes('vgroup')), group);
            copies.push(new DuplicatedGap(group.id, groupedLayerCopies.filter(isTextLambda), groupedLayerCopies.find(isBoxLambda)));
            await photoshopService.selectLayersByIds([group.id])
        }
        for (const layer of layers) {
            await photoshopService.removeLayer(layer)
        }
        return copies;
    }

    async function fill(clonedGaps) {
        for (const gap of clonedGaps) {
            const index = clonedGaps.indexOf(gap);
            for (const layer of gap.textGaps) {
                let content = textsToFill.ofInputField.pop()
                await photoshopService.fitTextInContainer(layer, content);
            }

            let insertResult = await photoshopService.insertImageToPhotoshop(imagesToFill[index].nativePath);
            let imageLayer = photoshopService.getAllLayers(app.activeDocument.layers).find(layer => layer.id === insertResult[0].ID);
            await photoshopService.placeImage(gap.imageGap, imageLayer);


        }
    }

    async function toFill() {
        if(await validateToFill()){
            let clonedGaps = await preparePsToFill();
            await fill(clonedGaps);
        }
    }

    async function onInputTextToFill(e){
        let text = e.target.value
        setRowTextToFill(text)
        calculateRowsCount(text)
        await validateToFill()
    }

    function calculateRowsCount(text) {
        let split = splitTextByRows(text)
        setRowsCount(split.length);
        setWarnEmptyRowsCount(split.filter(str => str.trim().length === 0).length)
    }

    function splitTextByRows(text){
        let split = text.split(/\r\n|\r|\n/)
        if(split[split.length-1].trim().length === 0){
            split.pop()
        }
        return split;
    }

    function onInputTextFieldInComparison(e){
        const currentLines = e.target.value.split(/\r\n|\r|\n/).length;
        if (currentLines > 2) {
            const lastLineBreakIndex = e.target.value.search(/(\r\n|\r|\n)$/);
            e.target.value = e.target.value.substring(0, lastLineBreakIndex);
        }
    }

    function toComparingPartUI(){
        setFillerPartUi("comparing")
    }

    function backToMainPartUi(){
        // Как делается ref на field
        setFillerPartUi("main")
    }


















    function mainUi(){
        return (
            <div>
                <h1>Заполнитель</h1>
                <div className={"content"}>
                    {/*Строка сканирования*/}
                    <div className={"flex-row"}>
                        <span className={"found-status"}>Шаблонов текстов: {textGaps.length}</span>
                        <span className={"found-status"}>Шаблонов картинок: {(!!imageGap ? 1 : 0)}</span>
                    </div>

                    <hr/>

                    <div className={"settings"}>
                        {/*Настройки*/}
                        <div className={"checkbox-container"}>
                            <input onChange={changeIsOneTextOfFileName} checked={isOneTextOfFileName}
                                   id="is-one-of-filename" name="is-one-of-filename" type="checkbox"/>
                            <label className={"checkbox-label"} htmlFor={"is-one-of-filename"}>Первый текстовый
                                шаблон - из
                                названия картинки</label>
                        </div>
                    </div>

                    <hr/>

                    {/*Заполнители*/}
                    <div className={"fillers flex-row"}>
                        {/*Заполнитель текстов*/}
                        <div className={"filler text-filler"}>
                            <span className={"filler-header"}>Тексты для заполнения</span>
                            <sp-textarea {...(!textGaps.length ? {disabled: true} : {})}
                                         class="rows-input"
                                         onInput={onInputTextToFill}
                                         type={"text"}>
                            </sp-textarea>
                        </div>
                        <div>
                            <button onClick={toComparingPartUI}>o</button>
                        </div>
                        {/*Заполнитель картинок*/}
                        <div className={"filler image-filler"}>
                            <span className={"filler-header"}>Картинки для заполнения</span>
                            <sp-card class={"file-list"}>
                                <sp-menu class={"select-menu"}>
                                    {imagesToFill.map((image) => {
                                        return (
                                            <sp-menu-item>
                                                <span className={"imageFileName"}>{image.name}</span>
                                            </sp-menu-item>
                                        )
                                    })}
                                </sp-menu>
                            </sp-card>
                            <button className={"select-images-btn"} {...(!imageGap ? {disabled: true} : {})}
                                    onClick={() => browseToFillFolder()}>
                                Выбрать картинки...
                            </button>
                        </div>
                    </div>
                    <hr/>
                    <div className={"filler-infos"}>
                    <span>
                        <span className={"filler-info"}>Введено строк: {rowsCount}</span>
                        {(() => {
                            if (warnEmptyRowsCount) {
                                return (<span
                                    className={"with-space filler-warn-info"}>(Из них пустых: {warnEmptyRowsCount})</span>)
                            }
                        })()}
                    </span>
                        <span className={"filler-info"}>Результат (шт): {resultCount}</span>
                        <span className={"filler-info"}>Выбрано картинок: {imagesToFill.length}</span>
                    </div>
                    {(() => {
                        if (rowsDf !== imagesDf && notEnoughCount !== 0) {
                            if (rowsDf < imagesDf) {
                                return (
                                    <span className={"filler-info"}>Не хватает строк: {notEnoughCount}</span>
                                )
                            } else if (rowsDf > imagesDf) {
                                return (
                                    <span className={"filler-info"}>Не хватает картинок: {notEnoughCount}</span>
                                )
                            }
                        }
                    })()}


                    <hr/>

                    {/*Кнопки управления*/}
                    <div className={"control-buttons"}>
                        <button {...(!validateToFillResponse.result ? {disabled: true} : {})}
                                onClick={() => toFill()}>Заполнить
                        </button>
                        <button {...(!isFilled ? {disabled: true} : {})} onClick={() => saveEachFilled()}>
                            Сохранить каждый отдельно
                        </button>
                    </div>
                    <div className={"footer"}>
                        <span className={"link"}>Инструкция</span>
                    </div>
                </div>
            </div>
        )
    }

    function comparingUi(){
        return (
            <div>
                <h1>Заполнитель</h1>
                <div>
                    <div className={"radio-container flex-row"}>
                        <div className={"radio-column-group"}>
                            <h2>Режимы переносов</h2>
                            <CustomRadioButton
                                value="without"
                                onClick={() => setSelectedValue('without')}
                                checked={selectedValue}>
                                <span className={"radio-label"}>Без переносов</span>
                            </CustomRadioButton>

                            <CustomRadioButton
                                value="oneAndRest"
                                onClick={() => setSelectedValue('oneAndRest')}
                                checked={selectedValue}>
                                <div className={"flex-row-start"}>
                                    <sp-textfield class="number-field" value={1} onInput={() => true}
                                                  type="number"></sp-textfield>
                                    <span className={"radio-label"}>в первой строк, остальные во второй</span>
                                </div>
                            </CustomRadioButton>

                            <CustomRadioButton
                                value="restAndOne"
                                onClick={() => setSelectedValue('restAndOne')}
                                checked={selectedValue}>
                                <div className={"flex-row-start"}>
                                    <span className={"radio-label"}>Все в первой строке,</span>
                                    <sp-textfield class="number-field middle-number-field" value={1} onInput={() => true}
                                                  type="number"></sp-textfield>
                                    <span className={"radio-label"}>во второй</span>
                                </div>
                            </CustomRadioButton>

                            <CustomRadioButton
                                value="custom"
                                onClick={() => setSelectedValue('custom')}
                                checked={selectedValue}>
                                <span className={"radio-label"}>Задать вручную</span>
                            </CustomRadioButton>
                        </div>
                    </div>
                    <sp-card class={"separate-card file-list"}>
                        <sp-menu class={"select-menu"}>
                            {textsToFill.ofInputField.map((text) => {
                                return (
                                    <sp-menu-item class={"separate-menu-item"}>
                                        <sp-menu-item>
                                            <sp-textarea class={"separate-area"} onInput={onInputTextFieldInComparison} value={text}
                                                         type={"text"} rows={2}></sp-textarea>
                                        </sp-menu-item>
                                    </sp-menu-item>
                                )
                            })}
                        </sp-menu>
                    </sp-card>
                </div>
                <button onClick={backToMainPartUi}>Готово</button>
            </div>
        )
    }


    return (
        <div>
            {(() => {
                if (fillerPartUi === "main") {
                    return mainUi()
                } else if (fillerPartUi === "comparing") {
                    return comparingUi()
                }
            })()}
        </div>
    )

}

// ↵


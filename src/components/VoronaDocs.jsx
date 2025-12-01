import React, {useEffect, useState} from 'react';

import "./VoronaDocs.css"

import {Format} from "../entities/docs/Format";
import clearImg from '/src/images/clear.png'
import {PhotoshopService} from "../services/PhotoshopService";

const photoshopService = new PhotoshopService();

const angles =  {'left': 'Левый', 'right': 'Правый', 'none': 'Нет', 'oval': 'Овал'}
const measures = {'mm': 'мм', 'cm': 'см'}

let isInit = false;
const photoshop = require('photoshop');
const app = photoshop.app;
const action = photoshop.action;
const constants = photoshop.constants;




export const VoronaDocs = () => {
    let [selectedFormats, setSelectedFormats] = useState([]);
    let [globalColor, setGlobalColor] = useState(true);
    let [prevFormatInputValue, setPrevFormatInputValue] = useState('');
    let [isSave, setIsSave] = useState(false);
    let [ruler, setRuler] = useState({});


    init().then(ignore => {});
    async function init() {
        if (!isInit) {
            await action.addNotificationListener(["all"], photoshopListener);
            photoshopListener();
            isInit = true
        }
    }


    async function photoshopListener() {
        await getRulerLine();
    }

    function changeCount(event, idx) {
        const cleanedValue = event.target.value.replace(/[-,.]/g, "");
        const numericValue = Number(cleanedValue);
        const clampedValue = Math.max(Math.min(numericValue, 100), 1);
        handleChangeFormat(idx, 'count', clampedValue)
        event.target.value = clampedValue.toString();
    }

    function handleChangeFormat(index, field, value)  {
        setSelectedFormats(prevFormats => {
            return prevFormats.map((formatObj, idx) => {
                if (idx === index) {
                    return ({
                        ...formatObj,
                        item: {
                            ...formatObj.item,
                            [field]: value
                        }
                    });
                }
                return formatObj;
            });
        });
    }

    // Функция для создания экземпляра формата
    function createFormat(w, h, isPassport) {
        let c = globalColor;
        let a = 'none';
        let b = true;
        let f = 40;
        let g = false;
        let m = 'cm'

        if(w % 1 !== 0){
            w = w * 10;
            m = 'mm'
        }
        if(h % 1 !== 0){
            h = h * 10;
            m = 'mm'
        }


        if (isPassport === 'pass') {
            g = true;
            f = 80;
            b = false
        }
        if (isPassport === 'zagran') {
            f = 70;
            a = 'oval';
        }

        return new Format(w, h, c, a, b, f, g, m);
    }


    function addFormat(w, h, isPassport) {
        const newFormat = createFormat(w, h, isPassport);

        const existingItem = selectedFormats.find(item =>
            item.item.width === newFormat.width &&
            item.item.height === newFormat.height &&
            item.item.color === newFormat.color &&
            item.item.angle === newFormat.angle &&
            item.item.border === newFormat.border &&
            item.item.face === newFormat.face &&
            item.item.glossy === newFormat.glossy &&
            item.item.measure === newFormat.measure
        );

        if (existingItem) {
            existingItem.count++;
        } else {
            selectedFormats.push({ item: newFormat, count: 1 });
        }

        // Обновляем состояние
        setSelectedFormats([...selectedFormats]);
    }

    function removeFormat(index) {
        setSelectedFormats(prevFormats => {
            const updatedFormats = [...prevFormats];
            updatedFormats.splice(index, 1);
            return updatedFormats;
        });
    }


    function handleFormatInput(e, idx) {
        let wasChangeMeasure = false
        let value = e.target.value.replace(/,/g, '');

        value = value.replace(/\s|[^\d]/g, 'x');

        if ((value.match(/x/g) || []).length > 1) {
            e.target.value = prevFormatInputValue;
            return
        }

        const parts = value.split('x').map(part => part.trim()).filter(Boolean);


        if(parts.length) {
            if (parseInt(parts[0], 10) > 70) {
                parts[0] = parts[0].substring(0,2);
                parts[1] = parts[0].substring(2);
                if((parseInt(parts[0], 10) > 70)) {
                    value = '70'
                }
            }
            value = parts[0]
            if(parseInt(parts[0], 10) > 25){
                handleChangeFormat(idx, 'measure', 'mm');
                wasChangeMeasure = true
            }
            if(parts[0].length >= 2){
                value += 'x' + parts[0].substring(2);
            }
        }



        if (parts.length >= 2) {
            if(parseInt(parts[1], 10) > 70){
                parts[1] = parts[1].substring(0,2);
                value = parts[0] + 'x' + '70';
            }
            if(parseInt(parts[1], 10) > 25){
                handleChangeFormat(idx, 'measure', 'mm');
                wasChangeMeasure = true
            }

        }


        value = value.trim().replace(/^0+(\d.*)|(\D+)0+$/g, '$1$2');


        if (value.includes('x') && parts.length === 2) {
            handleChangeFormat(idx, 'width', parts[0]);
            handleChangeFormat(idx, 'height', parts[1]);
        }

        if(!wasChangeMeasure){
            handleChangeFormat(idx, 'measure', 'cm');
        }

        e.target.value = value;
        setPrevFormatInputValue(value)
    }

    function changeMeasure(idx){
        if(selectedFormats[idx].item.measure === 'cm'){
            handleChangeFormat(idx, 'measure', 'mm');
        } else {
            handleChangeFormat(idx, 'measure', 'cm');
        }

    }

    // ps

    async function handleClick() {
        let rulerPoints = JSON.parse(JSON.stringify(ruler));
        let coloredGroup = []
        let blackAndWhiteGroup = []

        // Если установлена галочка сохранения
        if (isSave) {
            saveAsJPEG(formatItem.item);
        }

        let photoDocument = app.activeDocument.id

        await photoshopService.createA4()

        let A4Document = app.activeDocument

        // Добавляем группы слоев
        coloredGroup = await photoshopService.createGroup('Цветные');
        blackAndWhiteGroup = await photoshopService.createGroup('Чб');

        await photoshopService.switchDocument(photoDocument)


        await removeInvisibleLayers();
        app.activeDocument.activeLayer = app.activeDocument.layers.find(layer => layer)
        await photoshopService.mergeVisibleLayers();
        await photoshopService.unlockLayer()

        let histCount = 0;
        for (const formatItem of selectedFormats) {
            if (histCount > 0) {
                await photoshopService.backHistory(app.activeDocument, histCount)
                histCount = 0;
            }

            await cropImage(formatItem, rulerPoints);
            histCount++;

            let angle = formatItem.item.angle;
            let face = formatItem.item.face;

            if (angle && angle !== 'none') {
                let angleOperationCount = await drawCircleForAngle(app.activeDocument, angle, face);
                histCount+=angleOperationCount;
            }

            if(!formatItem.item.color){
               await photoshopService.desaturate();
               histCount++;
            }
            if(formatItem.item.border){
                await photoshopService.makeStroke();
                histCount++;
            }
            let activeLayer = app.activeDocument.layers.find(layer => layer)
            await photoshopService.placeOnA4(activeLayer, A4Document)
        }
        await historyBeforeMergeLayers.select()
    }



    async function removeInvisibleLayers() {
        app.activeDocument.layers.forEach(layer => {
            if(!layer.visible){
                photoshopService.removeLayer(layer)
            }
        });
    }

    function saveAsJPEG(formatItem) {
        // Форматируем путь и сохраняем файл
        let filePath = `${formatItem.width}x${formatItem.height}.jpg`;
        app.activeDocument.exportDocument(filePath, ExportType.JPEG);
    }


    async function cropImage(formatItem, ruler) {
        let resDoc = app.activeDocument.resolution;
        let mn = 72 / resDoc;
        let startX = ruler[1].x._value * mn;
        let startY = ruler[1].y._value * mn;
        let endX = ruler[2].x._value * mn;
        let endY = ruler[2].y._value * mn;

        let angle = calculateLineAngle(startX, startY, endX, endY)

        let bottom = endY + endY * ((100 - formatItem.item.face) / 100)
        let newHeight = bottom - startY
        let d = formatItem.item.width / formatItem.item.height
        let newWidth = newHeight * d;

        let croppedWidth = formatItem.item.width
        let croppedHeight = formatItem.item.height

        let topWhiteOffset = newHeight * 0.07
        if(formatItem.item.measure === 'cm'){
            croppedWidth *= 28.346456692913385
            croppedHeight *= 28.346456692913385
        } else {
            croppedWidth *= 2.8346456692913384
            croppedHeight *= 2.8346456692913384
        }

        let boundsRect = {
            top: startY - topWhiteOffset,
            left: startX - newWidth / 2,
            right: startX + newWidth / 2,
            bottom: bottom - topWhiteOffset
    };
        await photoshopService.crop(boundsRect, {width: croppedWidth, height: croppedHeight}, 300, angle)
    }

    async function drawCircleForAngle(doc, angle, face) {
        let operationCount = 0;
        let ellipseCoordinates;

        if(angle === 'left' || angle === 'right') {
            let diameter = 4.5 * 118;
            let faceAngleOffset = face * 1.6
            let centerX = angle === 'left' ? - faceAngleOffset : app.activeDocument.width + faceAngleOffset;
            let centerY = app.activeDocument.height + faceAngleOffset
            const halfDiameter = diameter / 2;
            ellipseCoordinates = {
                top: centerY - halfDiameter,
                left: centerX - halfDiameter,
                bottom: centerY + halfDiameter,
                right: centerX + halfDiameter
            }
        } else if(angle === 'oval') {
            ellipseCoordinates = {
                top: 0,
                left: 0,
                bottom: doc.height,
                right: doc.width
            }
        }

        await photoshopService.execute(async () => {
            let feather = angle === 'oval' ? 15 : 0;
            doc.selection.selectEllipse(ellipseCoordinates, constants.SelectionType.REPLACE, feather);
            operationCount++;
        });

        if(angle === 'oval') {
            await photoshopService.execute(async () => {
                doc.selection.inverse();
            });
            operationCount++;
        }

        await photoshopService.setWhiteBackColor()
        await photoshopService.fillBackColor()
        operationCount++;

        await photoshopService.execute( () => {
            doc.selection.deselect();
            operationCount++;
            doc.selection.feather(0);
        })

        if(angle === 'oval'){
            let parent = doc.activeLayer
            let backLayer = await photoshopService.execute(  () => {
                return doc.createLayer()
            });
            operationCount++;
            await photoshopService.execute(  () => {
                backLayer.move(parent, constants.ElementPlacement.PLACEAFTER)
            });
            operationCount++;

            await photoshopService.fillBackColor()
            operationCount++;

            await photoshopService.mergeVisibleLayers();
            histCount++;
        }
        return operationCount;
    }

    function calculateLineAngle(x1, y1, x2, y2) {
        let angleInRadians = Math.atan2(y2 - y1, x2 - x1);

        let angleInDegrees = angleInRadians * (180 / Math.PI);

        return 90 - ((angleInDegrees + 360) % 360);
    }


    async function getRulerLine() {
        let ruler = await photoshopService.getRulerPoints()
        setRuler(ruler[0]?.points)
    }


    return (
        <div>
            <h1>Фото на документы</h1>
            <div className={"header-control-row"}>
                <sp-switch emphasized onInput={() => setGlobalColor(!globalColor)} {...(globalColor ? {checked: true} : {})}>Цветная</sp-switch>
            </div>

            <div className={'btn-group'}>
                <div className={'btn-row'}>
                    <sp-button class={'btn-in-row'} onClick={() => addFormat(3, 4)}>3х4</sp-button>
                    <sp-button class={'btn-in-row'} onClick={() => addFormat(4, 6)}>4х6</sp-button>
                    <sp-button class={'btn-in-row'} onClick={() => addFormat(9, 12)}>9х12</sp-button>
                </div>
                <div className={'btn-row'}>
                    <sp-button class={'btn-in-row'} onClick={() => addFormat(3.5, 4.5)}>3,5х4,5</sp-button>
                    <sp-button class={'btn-in-row'} onClick={() => addFormat(3.5, 4.5, 'zagran')}>Загран</sp-button>
                    <sp-button class={'btn-in-row'} onClick={() => addFormat(3.5, 4.5, 'pass')}>Паспорт</sp-button>
                </div>
            </div>
            <sp-card class={"separate-card"}>
                <sp-menu className="flex-table">
                    <div className="header-row">
                        <div className="col-1 head-cell">Формат</div>
                        <div className="col-2 head-cell">Цвет</div>
                        <div className="col-3 head-cell">Шт.</div>
                        <div className="col-4 head-cell">Угол</div>
                        <div className="col-5 head-cell">Обв.</div>
                        <div className="col-6 head-cell">% лица</div>
                        <div className="col-7 head-cell">X</div>

                    </div>

                    {/* Контент */}
                    <div className="body-rows">
                        {selectedFormats.map((format, idx) => (
                            <div key={idx} className="data-row">
                                {/*Формат*/}
                                <div className="col-1">
                                    <sp-textfield class={'fullWidth'}
                                                  value={`${format.item.width}x${format.item.height}`}
                                                  onInput={(e) => handleFormatInput(e, idx)}>
                                    </sp-textfield>
                                    <span className={'absolute'} onClick={() => changeMeasure(idx)}>{measures[format.item.measure]}</span>
                                </div>
                                {/*Цвет*/}
                                <div className="col-2">
                                    <sp-switch emphasized class={'center-control fullWidth'}
                                               {...(format.item.color ? {checked: true} : {})}
                                               onInput={() => handleChangeFormat(idx, 'color', !format.item.color)}
                                    ></sp-switch>
                                </div>
                                {/*Шт*/}
                                <div className={'col-3'}>
                                    <sp-textfield class="fullWidth"
                                                  placeholder={'1'}
                                                  type="number"
                                                  value={format.count || 1}
                                                  onInput={(event) => changeCount(event, idx)}>
                                    </sp-textfield>
                                </div>
                                {/*Уголок*/}
                                <div className="col-4">
                                    <sp-picker
                                        class="fullWidth"
                                        placeholder={angles[format.item.angle]}
                                        value={format.item.angle}

                                    >
                                        <sp-menu slot="options">
                                            <sp-menu-item onClick={(e) => handleChangeFormat(idx, 'angle', e.target.value)} value="right" >Нет</sp-menu-item>
                                            <sp-menu-item onClick={(e) => handleChangeFormat(idx, 'angle', e.target.value)} value="right" >Правый</sp-menu-item>
                                            <sp-menu-item onClick={(e) => handleChangeFormat(idx, 'angle', e.target.value)} value="left" >Левый</sp-menu-item>
                                            <sp-menu-item onClick={(e) => handleChangeFormat(idx, 'angle', e.target.value)} value="oval" >Овал</sp-menu-item>
                                        </sp-menu>
                                    </sp-picker>
                                </div>
                                {/*Рамка*/}
                                <div className="col-5">
                                    <sp-switch
                                        class="center-control fullWidth"
                                        {...(format.item.border ? {checked: true} : {})}
                                        onInput={() => handleChangeFormat(idx, 'border', !format.item.border)}
                                    ></sp-switch>
                                </div>
                                {/*% лица*/}
                                <div className="col-6">
                                    <sp-textfield
                                        class="fullWidth"
                                        placeholder={'Стандарт'}
                                        type="number"
                                        value={format.item.face}
                                        onInput={(event) => {
                                            const cleanedValue = event.target.value.replace(/[-,.]/g, "");
                                            const numericValue = Number(cleanedValue);
                                            const clampedValue = Math.max(Math.min(numericValue, 100), 0);
                                            event.target.value = clampedValue.toString();
                                            handleChangeFormat(idx, 'face', clampedValue);
                                        }}
                                    ></sp-textfield>
                                </div>
                                {/*X*/}
                                <div className={'col-7'}>
                                    <img onClick={() => removeFormat(idx)}
                                        src={clearImg}
                                        className={'center-control clearImg'}
                                        alt="" />
                                </div>
                            </div>
                        ))}
                    </div>
                </sp-menu>
            </sp-card>
            <div className={'apply-btn'}>
                {(() => {
                    if (!selectedFormats.length) {
                        return (
                            <span className={'warn-span'}>Должен быть указан хотя бы один формат</span>
                        )
                    } else if (!ruler) {
                        return (
                            <span className={'warn-span'}>Должна быть проведена линейка от макушки до подобородка</span>
                        )
                    }
                })()}


                <button {...(!ruler || !selectedFormats.length ? {disabled: true} : {})}
                        onClick={handleClick}>
                    Расположить на лист
                </button>
            </div>
        </div>
    )
};

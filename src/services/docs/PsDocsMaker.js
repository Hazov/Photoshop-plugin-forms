import {PhotoshopService} from "../photoshopService";
import {PlaceFormat} from "../../entities/docs/PlaceFormat";
import {PsDocsA4Placer} from "./PsDocsA4Placer";


const photoshop = require('photoshop');
const app = photoshop.app;
const constants = photoshop.constants;

const photoshopService = new PhotoshopService();
const psDocsA4Placer = new PsDocsA4Placer();

export class PsDocsMaker {
    ruler;
    isSave;
    selectedFormats;
    onA4;

    init(selectedFormats, ruler, isSave, onA4){
        this.selectedFormats = selectedFormats;
        this.ruler = JSON.parse(JSON.stringify(ruler));
        this.ruler = this.ruler[0].points
        this.isSave = isSave;
        this.onA4 = onA4;
        return this;
    }
    async make() {
        let placeFormats = [];

        // Если установлена галочка сохранения
        // if (this.isSave) {
        //     this.saveAsJPEG(formatItem.item);
        // }

        let photoDocument = app.activeDocument

        await photoshopService.createA4()

        let A4Document = app.activeDocument

        await photoshopService.switchDocument(photoDocument.id)

        await photoshopService.fullMergeLayers()

        let histCount = 0;

        let allLayers = [];

        for (const formatItem of this.selectedFormats) {
            let placeItemWidth = formatItem.item.width
            let placeItemHeight = formatItem.item.height
            if(formatItem.item.measure === 'mm'){
                placeItemWidth = formatItem.item.width / 10;
                placeItemHeight = formatItem.item.height / 10;
            }
            let placeFormat = new PlaceFormat(placeItemWidth, placeItemHeight, formatItem.item.color, formatItem.item.glossy);

            // История назад
            if (histCount > 0) {
                await photoshopService.backHistory(app.activeDocument, histCount)
                histCount = 0;
            }

            // Кадрирование
            await this.cropImage(formatItem);
            histCount++;

            // Уголок / овал
            let angle = formatItem.item.angle;
            let face = formatItem.item.face;
            if (angle && angle !== 'none') {
                let angleOperationCount = await this.drawCircleForAngle(app.activeDocument, angle, face);
                histCount+=angleOperationCount;
            }

            // Обесцветить
            if(!formatItem.item.color){
                await photoshopService.desaturate();
                histCount++;
            }

            await photoshopService.setFrontColor('black')
            // Обводка
            if(formatItem.item.border !== 'no'){
                app.activeDocument.activeLayer = app.activeDocument.layers.find(layer => layer)
                if(app.activeDocument.activeLayer.locked) {
                    await photoshopService.unlockBackgroundLayer(app.activeDocument.activeLayer)
                    histCount++;
                }
                if(formatItem.item.border === 'yes') {
                    await photoshopService.makeStroke();
                    histCount++;
                } else if(formatItem.item.border === 'crest') {
                    histCount = await this.makeCrests(histCount);
                }
                await photoshopService.fullMergeLayers()
                histCount++
            }


            let layerToCopy = {}
            for (let i = 0; i < formatItem.count; i++) {
                let plF = JSON.parse(JSON.stringify(placeFormat));
                let activeLayer = app.activeDocument.layers.find(layer => layer)
                if(i === 0){
                    layerToCopy = await photoshopService.placeOnA4(activeLayer, A4Document)
                    allLayers.push(layerToCopy)
                }
                plF.layerId = layerToCopy.id
                placeFormats.push(plF);
            }
        }
        let arrangedLayers = psDocsA4Placer.arrangeLayers(placeFormats)
        await photoshopService.switchDocument(A4Document.id)
        await psDocsA4Placer.place(arrangedLayers, allLayers, this.onA4);
    }

    async makeCrests() {
        let operationCount = 0;
        operationCount += await this.drawCrests();
        await photoshopService.extendImage(0.4)
        operationCount++
        return operationCount;
    }

    async drawCrests() {
        let length = 15;
        let operationCount = 0;

        let mn = app.activeDocument.resolution / 72
        let width = app.activeDocument.width / mn
        let height = app.activeDocument.height / mn

        // Левый верхний угол
        await photoshopService.drawLine({hStart: 0, hEnd: -length, vStart: 0, vEnd: 0});
        operationCount++;
        await photoshopService.drawLine({hStart: 0, hEnd: 0, vStart: 0, vEnd: -length});
        operationCount++;

        // Правый верхний угол
        await photoshopService.drawLine({hStart: width, hEnd: width + length, vStart: 0, vEnd: 0});
        operationCount++;
        await photoshopService.drawLine({hStart: width, hEnd: width, vStart: 0, vEnd: -length});
        operationCount++;

        // Нижний левый угол
        await photoshopService.drawLine({hStart: 0, hEnd: - length, vStart: height, vEnd: height});
        operationCount++;
        await photoshopService.drawLine({hStart: 0, hEnd: 0, vStart: height, vEnd: height + length});
        operationCount++;

        // Нижний правый угол
        await photoshopService.drawLine({hStart: width, hEnd: width + length, vStart: height, vEnd: height});
        operationCount++;
        await photoshopService.drawLine({hStart: width, hEnd: width, vStart: height, vEnd: height + length});
        operationCount++;

        return operationCount;

    }


    async  removeInvisibleLayers() {
        app.activeDocument.layers.forEach(layer => {
            if(!layer.visible){
                photoshopService.removeLayer(layer)
            }
        });
    }

     saveAsJPEG(formatItem) {
        // Форматируем путь и сохраняем файл
        let filePath = `${formatItem.width}x${formatItem.height}.jpg`;
        app.activeDocument.exportDocument(filePath, ExportType.JPEG);
    }


    async  cropImage(formatItem) {
        let resDoc = app.activeDocument.resolution;
        let mn = 72 / resDoc;
        let startX = this.ruler[1].x._value * mn;
        let startY = this.ruler[1].y._value * mn;
        let endX = this.ruler[2].x._value * mn;
        let endY = this.ruler[2].y._value * mn;

        let angle = this.calculateLineAngle(startX, startY, endX, endY)

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

    async  drawCircleForAngle(doc, angle, face) {
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

        await photoshopService.setBackColor('white')
        await photoshopService.fillBackColor()
        operationCount++;

        await photoshopService.execute( () => {
            doc.selection.deselect();
            operationCount++;
            doc.selection.feather(0);
        })

        return operationCount;
    }

     calculateLineAngle(x1, y1, x2, y2) {
        let angleInRadians = Math.atan2(y2 - y1, x2 - x1);

        let angleInDegrees = angleInRadians * (180 / Math.PI);

        return 90 - ((angleInDegrees + 360) % 360);
    }
}
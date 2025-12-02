import {PhotoshopService} from "../photoshopService";

const photoshop = require('photoshop');
const app = photoshop.app;

const photoshopService = new PhotoshopService();

export class PsDocsMaker {
    ruler;
    isSave;

    init(ruler, isSave){
        this.ruler = ruler
        this.isSave = isSave
        return this
    }
    async make() {

        let rulerPoints = JSON.parse(JSON.stringify(this.ruler));
        let coloredGroup = []
        let blackAndWhiteGroup = []

        // Если установлена галочка сохранения
        if (this.isSave) {
            this.saveAsJPEG(formatItem.item);
        }

        let photoDocument = app.activeDocument.id

        await photoshopService.createA4()

        let A4Document = app.activeDocument

        // Добавляем группы слоев
        coloredGroup = await photoshopService.createGroup('Цветные');
        blackAndWhiteGroup = await photoshopService.createGroup('Чб');

        await photoshopService.switchDocument(photoDocument)


        await this.removeInvisibleLayers();
        app.activeDocument.activeLayer = app.activeDocument.layers.find(layer => layer)
        await photoshopService.mergeVisibleLayers();
        await photoshopService.unlockLayer()

        let histCount = 0;
        for (const formatItem of selectedFormats) {
            if (histCount > 0) {
                await photoshopService.backHistory(app.activeDocument, histCount)
                histCount = 0;
            }

            await this.cropImage(formatItem, rulerPoints);
            histCount++;

            let angle = formatItem.item.angle;
            let face = formatItem.item.face;

            if (angle && angle !== 'none') {
                let angleOperationCount = await this.drawCircleForAngle(app.activeDocument, angle, face);
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


    async  cropImage(formatItem, ruler) {
        let resDoc = app.activeDocument.resolution;
        let mn = 72 / resDoc;
        let startX = ruler[1].x._value * mn;
        let startY = ruler[1].y._value * mn;
        let endX = ruler[2].x._value * mn;
        let endY = ruler[2].y._value * mn;

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

     calculateLineAngle(x1, y1, x2, y2) {
        let angleInRadians = Math.atan2(y2 - y1, x2 - x1);

        let angleInDegrees = angleInRadians * (180 / Math.PI);

        return 90 - ((angleInDegrees + 360) % 360);
    }
}
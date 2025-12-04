import {PhotoshopService} from "../photoshopService";


const photoshopService = new PhotoshopService();

const photoshop = require('photoshop');
const app = photoshop.app;
const constants = photoshop.constants;


export class PsDocsA4Placer {

    arrangeLayers(placeFormats) {
        const groups = {
            uncolor: [],
            color: [],
            glossyUncolor: [],
            glossyColor: []
        };

        // Разделение по цветам и глянцу
        placeFormats.forEach((placeFormat) => {
            if (!placeFormat.color) {
                if (placeFormat.glossy) {
                    groups.glossyUncolor.push(placeFormat);
                } else {
                    groups.uncolor.push(placeFormat);
                }
            } else {
                if (placeFormat.glossy) {
                    groups.glossyColor.push(placeFormat);
                } else {
                    groups.color.push(placeFormat);
                }
            }
        });



        // Применение позиционирования для каждой группы
        Object.keys(groups).forEach(key => {
            groups[key] = this.calculatePosition(groups[key], key);
        });

        return groups;
    }

    calculatePosition(group, groupName) {
        // Константы для формата А4
        const pageWidthPx = 15 * 118;   // ширина страницы в пикселях
        const pageHeightPx = 10 * 118;  // высота страницы в пикселях
        const marginPx = 4 * 118 / 10;  // отступ в пикселях
        const gapSameSizePx = 118 / 10; // расстояние между изображениями одного размера
        const gapDiffSizePx = 118 / 10; // расстояние между изображениями разных размеров

        let rightBorder = pageWidthPx - marginPx
        let bottomBorder = pageHeightPx - marginPx


        let resultArray = [[]];
        let currentX = marginPx;
        let currentY = marginPx;
        let rowMaxHeight = 0;

        group.sort((a, b) => b.width * b.heigth - a.width * a.heigth); // сортировка по площади

        for (let i = 0; i < group.length; i++) {
            const item = group[i];
            const nextItem = group[i + 1];
            item.width = item.width * 118;
            item.heigth = item.heigth * 118;

            // Проверяем помещается ли изображение в строку
            if (currentX + item.width <= rightBorder && currentX + item.width <= rightBorder) {
                item.x = currentX;
                item.y = currentY;
                currentX += item.width + (nextItem?.width === item.width ? gapSameSizePx : gapDiffSizePx);
                rowMaxHeight = Math.max(rowMaxHeight, item.heigth);
            } else {
                // Переход на новую строку
                currentX = marginPx;
                currentY += rowMaxHeight + gapDiffSizePx;
                rowMaxHeight = 0;
                if (currentY + item.heigth > bottomBorder || currentX + item.width > rightBorder) {
                        // Создаем новый массив для оставшихся изображений
                        resultArray.push([]);
                        currentX = marginPx;
                        currentY = marginPx;
                        rowMaxHeight = 0;

                }
                item.x = currentX;
                item.y = currentY;
                currentX += item.width + (nextItem?.width === item.width ? gapSameSizePx : gapDiffSizePx);
                rowMaxHeight = Math.max(rowMaxHeight, item.heigth);
            }
            resultArray[resultArray.length- 1].push(item);
        }
        resultArray = resultArray.filter(array => array.length > 0);
        return resultArray;
    }

    async place(arrangedLayers, allLayers) {
        let c = 1;
        let psGroup;


        for (let colorGroup in arrangedLayers) {
            if(arrangedLayers[colorGroup].length){
                for (let format1015 of arrangedLayers[colorGroup]) {
                    let layersToSelect = [];
                    for (let format of format1015) {
                        if(format.layerId){
                            let layerToCopy = allLayers.find(layer => layer.id === format.layerId)
                            format.layer = await photoshopService.execute(  () => {
                                return layerToCopy.duplicate(app.activeDocument);
                            });
                        }

                        layersToSelect.push(format.layer.id)

                        app.activeDocument.activeLayer = format.layer
                        await photoshopService.execute(() => {
                            format.layer.move(app.activeDocument.layers.find(layer => layer.isBackgroundLayer), constants.ElementPlacement.PLACEBEFORE)

                        })
                        await photoshopService.moveImage({horizontal:  format.x, vertical: format.y})
                    }

                    psGroup = "Фотки" + c
                    await photoshopService.groupLayers(layersToSelect, psGroup)

                    if(c !== 1){
                       await photoshopService.execute(() => {
                           app.activeDocument.layers.find(layer => layer.name === psGroup).visible = false
                       })
                    }
                    app.activeDocument.activeLayer = app.activeDocument.layers.find(layer => layer.isBackgroundLayer)

                    c++
                }
            }
        }
    }
}
import {PhotoshopService} from "../photoshopService";


const photoshopService = new PhotoshopService();

const photoshop = require('photoshop');
const app = photoshop.app;
const constants = photoshop.constants;

// Константы для формата А4

const MARGIN = 6 * 118 / 10;  // отступ в пикселях
const SAME_GAP = 2 * 118 / 10; // расстояние между изображениями одного размера
const DIFF_GAP = 3 * 118 / 10; // расстояние между изображениями разных размеров
const WIDTH_1015 = 15 * 118 - MARGIN;   // ширина страницы в пикселях
const HEIGHT_1015 = 10.5 * 118 - MARGIN;  // высота страницы в пикселях

let resultArray = [[]];
let filledX = MARGIN;
let filledY = MARGIN;


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
        filledX = MARGIN
        filledY = MARGIN
        resultArray = [[]];

        group.sort((a, b) => b.width * b.height - a.width * a.height); // сортировка по площади

        for (let i = 0; i < group.length; i++) {
            const item = group[i];
            const nextItem = group[i + 1];
            this.calculatePos(item, nextItem)
        }
        resultArray = resultArray.filter(array => array.length > 0);
        return resultArray;
    }

    calculatePos(item, nextItem, sizesInPx) {
        if(!sizesInPx) {
            item.width = item.width * 118;
            item.height = item.height * 118;
        }
        // Помещается слева?
        if (item.width + filledX <= WIDTH_1015 && Math.max(filledY - MARGIN, item.height + MARGIN) <= HEIGHT_1015) {
            // Кладем
            item.x = filledX
            item.y = MARGIN
            filledX += item.width + (nextItem?.width === item.width ? SAME_GAP : DIFF_GAP);
            filledY = Math.max(filledY, MARGIN + item.height + (nextItem?.height === item.height ? SAME_GAP : DIFF_GAP));
        } else {
            // Помещается снизу?
            if (item.height + filledY <= HEIGHT_1015) {
                // Кладем
                filledX = MARGIN;
                item.x = filledX
                item.y = filledY
                filledY += item.height + (nextItem?.width === item.width ? item.width + SAME_GAP : item.width + DIFF_GAP);
            } else {
                // Перевернута?
                if (item.isRotated) {
                    // Значит переворот не помог, на другой лист
                    item.isRotated = false;
                    let temp = item.height;
                    item.height = item.width
                    item.width = temp;

                    resultArray.push([])
                    filledX = MARGIN
                    filledY =MARGIN

                    return this.calculatePos(item, nextItem, true)
                } else {
                    // Перевернуть и попробовать еще раз
                    item.isRotated = true
                    let temp = item.height;
                    item.height = item.width
                    item.width = temp;
                    return this.calculatePos(item, nextItem, true)
                }
            }
        }
        resultArray[resultArray.length - 1].push(item);
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
                        if (format.layerId) {
                            let layerToCopy = allLayers.find(layer => layer.id === format.layerId)
                            format.layer = await photoshopService.execute(() => {
                                return layerToCopy.duplicate(app.activeDocument);
                            });
                        }
                    }

                    for (let format of format1015) {

                        let backgroundLayer = app.activeDocument.layers.find(layer => layer.isBackgroundLayer);

                        layersToSelect.push(format.layer.id)

                        app.activeDocument.activeLayer = format.layer
                        await photoshopService.execute(() => {
                            format.layer.move(backgroundLayer, constants.ElementPlacement.PLACEBEFORE)

                        })
                        if(format.isRotated) {
                            await photoshopService.selectLayersByIds([format.layer.id])
                            await photoshopService.rotateLayer(format.layer, 90)
                            await photoshopService.selectLayersByIds([backgroundLayer.id, format.layer.id])
                            await photoshopService.alignLayer("ADSLefts");
                            await photoshopService.alignLayer("ADSTops");
                        }
                        await photoshopService.selectLayersByIds([format.layer.id])
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
        await photoshopService.selectLayersByIds(allLayers.map(layer => layer.id))
        await photoshopService.removeLayersByIds(allLayers.map(layer => layer.id))
        let groupLayers = app.activeDocument.layers.filter(layer => layer.layers?.length)
        if(groupLayers.find(group => group.layers.length < 2)){
            await photoshopService.collapseAllGroups()
        }

    }
}
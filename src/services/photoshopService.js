import {FileService} from "./fileService";

const photoshop = require('photoshop');
const app = photoshop.app;
const constants = photoshop.constants;
const fileService = new FileService();

export class PhotoshopService {
    async execute(pluginFunc) {
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    async open(file) {
        await this.execute(() => app.open(file));
    }


    async insertImageToPhotoshop(filePath) {
        let insertDescriptor = [
            {
                _obj: "placeEvent",
                to: {
                    _obj: 'layer',
                    name: 'dfg'
                },
                null: {
                    _path: await fileService.tokenify(filePath),
                    _kind: "local"
                },
                offset: {
                    _obj: "offset",
                    horizontal: {
                        _unit: "pixelsUnit",
                        _value: 0
                    },
                    vertical: {
                        _unit: "pixelsUnit",
                        _value: 0
                    }
                },
                _options: {
                    dialogOptions: "dontDisplay"
                }
            }
        ];
        return await this.execute(() => photoshop.action.batchPlay(insertDescriptor, {}));
    }

    async backHistory(doc, backCount){
        let des;
        if(backCount + 1 >= doc.historyStates.length){
            des = [
                {
                    _obj: "select",
                    _target: [
                        {
                            _ref: "snapshotClass",
                            _name: doc.historyStates.find(h => h.snapshot).name
                        }
                    ],
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ]
        } else {
            des = [
                {
                    _obj: "select",
                    _target: [
                        {
                            _ref: "historyState",
                            _offset: -backCount
                        }
                    ],
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ]
        }
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async resizeImage(percentValue) {
        let resizeDescriptor =
            [
                {
                    _obj: "transform",
                    _target: [
                        {
                            _ref: "layer",
                            _enum: "ordinal",
                            _value: "targetEnum"
                        }
                    ],
                    freeTransformCenterState: {
                        _enum: "quadCenterState",
                        _value: "QCSAverage"
                    },
                    offset: {
                        _obj: "offset",
                        horizontal: {
                            _unit: "pixelsUnit",
                            _value: 0
                        },
                        vertical: {
                            _unit: "pixelsUnit",
                            _value: 0
                        }
                    },
                    width: {
                        _unit: "percentUnit",
                        _value: percentValue,
                    },
                    height: {
                        _unit: "percentUnit",
                        _value: percentValue
                    },
                    linked: true,
                    interfaceIconFrameDimmed: {
                        _enum: "interpolationType",
                        _value: "bicubic"
                    },
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        await this.execute(() => photoshop.action.batchPlay(resizeDescriptor, {}));
    }

    async moveImage(offset) {
        let moveDescriptor =
            [
                {
                    _obj: "move",
                    _target: [
                        {
                            _ref: "layer",
                            _enum: "ordinal",
                            _value: "targetEnum"
                        }
                    ],
                    to: {
                        _obj: "offset",
                        horizontal: {
                            _unit: "pixelsUnit",
                            _value: offset.horizontal
                        },
                        vertical: {
                            _unit: "pixelsUnit",
                            _value: offset.vertical
                        }
                    },
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        await this.execute(() => photoshop.action.batchPlay(moveDescriptor, {}));
    }

    async transformLayer(options) {
        let obj = {};
        obj._obj = "transform";
        obj._target = [
            {
                _ref: "layer",
                _enum: "ordinal",
                _value: "targetEnum"
            }
        ];
        obj.freeTransformCenterState = {
            _enum: "quadCenterState",
            _value: "QCSAverage"
        };
        if (options.offset) {
            obj.offset = {
                _obj: "offset",
                horizontal: {
                    _unit: "pixelsUnit",
                    _value: options.offset.horizontal
                },
                vertical: {
                    _unit: "pixelsUnit",
                    _value: options.offset.vertical
                }
            }
        }
        if (options.scale) {
            obj.width = {
                _unit: "percentUnit",
                _value: options.scale.width ? options.scale.width : options.scale
            };
            obj.height = {
                _unit: "percentUnit",
                _value: options.scale.height ? options.scale.height : options.scale
            }
        }
        if (options.angle) {
            obj.angle = {
                _unit: "angleUnit",
                _value: options.angle
            }
        }
        obj.linked = true;
        obj.interfaceIconFrameDimmed = {
            _enum: "interpolationType",
            _value: "bicubic"
        }
        obj._options = {
            dialogOptions: "dontDisplay"
        }
        let transformDescriptor = [obj];
        await this.execute(() => photoshop.action.batchPlay(transformDescriptor, {}));
    }

    async selectLayersByIds(layerIds) {
        let layers = this.getAllLayers(app.activeDocument.layers).filter(layer => layerIds.includes(layer.id));
        let target = layers.map(layer => {
            return {_ref: 'layer', _name: layer.name}
        })
        let selectDescriptor =
            [
                {
                    _obj: "select",
                    _target: target,
                    makeVisible: false,
                    layerID: layerIds,
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        await this.execute(() => photoshop.action.batchPlay(selectDescriptor, {}));
    }

    //Select имеется в виду выделение муравьями
    async antSelectAll(selection = 'allEnum') {
        const selectAlDescriptor =
            [
                {
                    _obj: "set",
                    _target: [
                        {
                            _ref: "channel",
                            _property: "selection"
                        }
                    ],
                    to: {
                        _enum: "ordinal",
                        _value: selection
                    },
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        await this.execute(() => photoshop.action.batchPlay(selectAlDescriptor, {}));
    }

    async deselectAll() {
        await this.antSelectAll('none');
    }

    async alignLayer(direction) {
        const alignDescriptor =
            [
                {
                    _obj: "align",
                    _target: [
                        {
                            _ref: "layer",
                            _enum: "ordinal",
                            _value: "targetEnum"
                        }
                    ],
                    using: {
                        _enum: "alignDistributeSelector",
                        _value: direction
                    },
                    alignToCanvas: false,
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];

        await this.execute(() => photoshop.action.batchPlay(alignDescriptor, {}));
    }

    async groupLayers(layerIds, groupName = "tempGroup") {
        await this.selectLayersByIds(layerIds);
        layerIds.sort((id1, id2) => id1 - id2);
        let groupLayersDescriptor =
            [
                {
                    _obj: "make",
                    _target: [
                        {
                            _ref: "layerSection"
                        }
                    ],
                    from: {
                        _ref: "layer",
                        _enum: "ordinal",
                        _value: "targetEnum"
                    },
                    using: {
                        _obj: "layerSection",
                        name: groupName
                    },
                    layerSectionStart: layerIds[0],
                    layerSectionEnd: layerIds[layerIds.length - 1],
                    name: "c",
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        return await this.execute(() => photoshop.action.batchPlay(groupLayersDescriptor, {}));
    }

    async ungroupLayers() {
        const unGroupLayersDescriptor =
            [
                {
                    _obj: "ungroupLayersEvent",
                    _target: [
                        {
                            _ref: "layer",
                            _enum: "ordinal",
                            _value: "targetEnum"
                        }
                    ],
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        return await this.execute(() => photoshop.action.batchPlay(unGroupLayersDescriptor, {}));
    }

    async alignCenterRelativeToDocument() {
        await this.antSelectAll();
        await this.alignLayer("ADSCentersH");
        await this.alignLayer("ADSCentersV");
        await this.deselectAll();
    }

    async alignTopLeftLayers(layerIds) {
        //Сначала относительно документа
        await this.selectLayersByIds(layerIds);
        await this.alignCenterRelativeToDocument();
        //Потом относительно друг друга
        await this.alignLayer("ADSLefts");
        await this.alignLayer("ADSCentersV");

    }

    async createTextLayer(text, color) {
        let rgbColor;
        if (color) {
            rgbColor = {
                _obj: "RGBColor",
                red: color.red,
                grain: color.grain,
                blue: color.blue
            }
        } else {
            rgbColor = {
                _obj: "RGBColor",
                red: 232.00000137090683,
                grain: 178.74707490205765,
                blue: 50.95330886542797
            }
        }

        let textLayerDescriptor =
            [
                {
                    _obj: "make",
                    _target: [
                        {
                            _ref: "textLayer"
                        }
                    ],
                    using: {
                        _obj: "textLayer",
                        textKey: text,
                        warp: {
                            _obj: "warp",
                            warpStyle: {
                                _enum: "warpStyle",
                                _value: "warpNone"
                            },
                            warpValue: 0,
                            warpPerspective: 0,
                            warpPerspectiveOther: 0,
                            warpRotate: {
                                _enum: "orientation",
                                _value: "horizontal"
                            }
                        },

                        textClickPoint: {
                            _obj: "paint",
                            horizontal: {
                                _unit: "pixelsUnit",
                                _value: 0
                            },
                            vertical: {
                                _unit: "pixelsUnit",
                                _value: 0
                            }
                        },
                        textGridding: {
                            _enum: "textGridding",
                            _value: "none"
                        },
                        orientation: {
                            _enum: "orientation",
                            _value: "horizontal"
                        },
                        antiAlias: {
                            _enum: "antiAliasType",
                            _value: "antiAliasSharp"
                        },
                        textShape: [
                            {
                                _obj: "textShape",
                                char: {
                                    _enum: "char",
                                    _value: "paint"
                                },
                                orientation: {
                                    _enum: "orientation",
                                    _value: "horizontal"
                                },
                                transform: {
                                    _obj: "transform",
                                    xx: 1,
                                    xy: 0,
                                    yx: 0,
                                    yy: 1,
                                    tx: 0,
                                    ty: 0
                                },
                                rowCount: 1,
                                columnCount: 1,
                                rowMajorOrder: true,
                                rowGutter: {
                                    _unit: "pointsUnit",
                                    _value: 0
                                },
                                columnGutter: {
                                    _unit: "pointsUnit",
                                    _value: 0
                                },
                                spacing: {
                                    _unit: "pointsUnit",
                                    _value: 0
                                },
                                frameBaselineAlignment: {
                                    _enum: "frameBaselineAlignment",
                                    _value: "alignByAscent"
                                },
                                firstBaselineMinimum: {
                                    _unit: "pointsUnit",
                                    _value: 0
                                },
                                base: {
                                    _obj: "paint",
                                    horizontal: 0,
                                    vertical: 0
                                }
                            }
                        ],
                        textStyleRange: [
                            {
                                _obj: "textStyleRange",
                                from: 0,
                                to: text.length,
                                textStyle: {
                                    _obj: "textStyle",
                                    styleSheetHasParent: true,
                                    fontPostScriptName: "Arial-BoldMT",
                                    fontName: "Arial",
                                    fontStyleName: "Bold",
                                    fontScript: 0,
                                    fontTechnology: 0,
                                    fontAvailable: true,
                                    size: {
                                        _unit: "pointsUnit",
                                        _value: 30.959999999999997
                                    },
                                    impliedFontSize: {
                                        _unit: "pointsUnit",
                                        _value: 30.959999999999997
                                    },
                                    horizontalScale: 100,
                                    verticalScale: 100,
                                    syntheticBold: false,
                                    syntheticItalic: false,
                                    autoLeading: true,
                                    tracking: 0,
                                    baselineShift: {
                                        _unit: "pointsUnit",
                                        _value: 0
                                    },
                                    impliedBaselineShift: {
                                        _unit: "pointsUnit",
                                        _value: 0
                                    },
                                    autoKern: {
                                        _enum: "autoKern",
                                        _value: "metricsKern"
                                    },
                                    fontCaps: {
                                        _enum: "fontCaps",
                                        _value: "normal"
                                    },
                                    digitSet: {
                                        _enum: "digitSet",
                                        _value: "arabicDigits"
                                    },
                                    kashidas: {
                                        _enum: "kashidas",
                                        _value: "kashidaDefault"
                                    },
                                    diacXOffset: {
                                        _unit: "pointsUnit",
                                        _value: 0
                                    },
                                    diacYOffset: {
                                        _unit: "pointsUnit",
                                        _value: 0
                                    },
                                    markYDistFromBaseline: {
                                        _unit: "pointsUnit",
                                        _value: 0
                                    },
                                    baseline: {
                                        _enum: "baseline",
                                        _value: "normal"
                                    },
                                    otbaseline: {
                                        _enum: "otbaseline",
                                        _value: "normal"
                                    },
                                    strikethrough: {
                                        _enum: "strikethrough",
                                        _value: "strikethroughOff"
                                    },
                                    underline: {
                                        _enum: "underline",
                                        _value: "underlineOff"
                                    },
                                    ligature: true,
                                    altligature: false,
                                    contextualLigatures: true,
                                    fractions: false,
                                    ordinals: false,
                                    swash: false,
                                    titling: false,
                                    connectionForms: true,
                                    stylisticAlternates: false,
                                    stylisticSets: 0,
                                    ornaments: false,
                                    justificationAlternates: false,
                                    figureStyle: {
                                        _enum: "figureStyle",
                                        _value: "normal"
                                    },
                                    proportionalMetrics: false,
                                    kana: false,
                                    italics: false,
                                    baselineDirection: {
                                        _enum: "baselineDirection",
                                        _value: "withStream"
                                    },
                                    textLanguage: {
                                        _enum: "textLanguage",
                                        _value: "russianLanguage"
                                    },
                                    japaneseAlternate: {
                                        _enum: "japaneseAlternate",
                                        _value: "defaultForm"
                                    },
                                    mojiZume: 0,
                                    gridAlignment: {
                                        _enum: "gridAlignment",
                                        _value: "roman"
                                    },
                                    noBreak: false,
                                    color: rgbColor,
                                    strokeColor: {
                                        _obj: "RGBColor",
                                        red: 0,
                                        grain: 0,
                                        blue: 0
                                    },

                                }
                            }
                        ]
                    },
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        return await this.execute(() => photoshop.action.batchPlay(textLayerDescriptor, {}));
    }

    async createNewLayer(sizes) {

    }



    // Метод установки границ слоя
    async adjustLayerBounds(layer, bounds) {
        await this.execute( () => {
            layer.bounds = bounds;
        });
    }

// Метод импорта изображения на слой
    async pasteImageOnLayer(layer, path) {
        await this.execute( () => {
            layer.importFromFile(path);
        });
    }


// Метод централизации текста по вертикали
    async centerTextVertically(layer) {
        await this.execute( () => {
            let containerHeight = layer.bounds.height;
            let textHeight = layer.measurements.height;
            let topOffset = Math.round((containerHeight - textHeight) / 2);
            layer.top += topOffset;
        });
    }




// Метод клонирования текущего документа
    async cloneCurrentPsd() {
        try {
            let activeDocument = app.activeDocument;
            if (!activeDocument) {
                throw new Error("Невозможно найти активный документ.");
            }
            await this.execute( () => {
                return activeDocument.duplicate()
            });
        } catch (err) {
            console.error(err.message);
        }
    }

// Метод подгонки текста в контейнер
    async fitTextInContainer(layer, content) {
        await this.selectLayersByIds([layer.id])
        await this.replaceTextContent(content)
        // this.centerTextVertically(layer);

    }

    async collapseAllGroups(){
        let collapseGroupsDescriptor = [
                {
                    "_obj": "collapseAllGroupsEvent",
                    "_isCommand": true,
                    "_options": {
                        "dialogOptions": "dontDisplay"
                    }
                }
            ]
        await this.execute(() => photoshop.action.batchPlay(collapseGroupsDescriptor, {}));
    }

    async replaceTextContent(newText) {
        let textReplacerDescriptor = [
            {
                "_obj": "set",
                "_target": [
                    {
                        "_ref": "textLayer",
                        "_enum": "ordinal",
                        "_value": "targetEnum"
                    }
                ],
                "to": {
                    "_obj": "textLayer",
                    "textKey": newText,
                },
            }
        ];
        await this.execute(() => photoshop.action.batchPlay(textReplacerDescriptor, {}));
    }

    async createGroup(name) {
        return await this.execute( () => {
            const doc = app.activeDocument;
            return doc.createLayerGroup({ name });
        });
    }

    // Метод клонирования слоя
    async  cloneLayers(layers, parent) {
        return await this.execute(  async () => {
            let copied = []
            for(let layer of layers) {
                let newLayer = await layer.duplicate();
                if(parent){
                    await newLayer.move(parent, constants.ElementPlacement.PLACEINSIDE)
                }
                copied.push(newLayer)
            }
            return copied
        })
    }

// Метод клонирования слоя
    async  cloneLayer(layer, parent) {
        return layer.duplicate(parent);
    }

// Метод клонирования слоя изображения
    async  cloneImageLayer(layer, parent) {
        return await this.execute( () => {
            return layer.duplicate(parent);
        })

    }


    // Модифицированная функция для добавления изображения на слой
    async  placeImage(containerLayer, imgLayer) {
        return await this.execute( () => {
            let imgRect = containerLayer.bounds; // Границы контейнера

            // // Вычислим необходимую степень масштабирования
            // let rotationAngle = this.shouldRotate(imgRect, imgLayer.bounds) ? 90 : 0;
            // this.rotateLayer(containerLayer, rotationAngle); // Применим поворот, если нужен

            // Масштабируем изображение относительно ограничений контейнера
            this.scaleImageProportionally(imgLayer, imgRect);

            // Переместим изображение в позицию контейнера
            this.positionLayerInsideContainer(imgLayer, imgRect);

            // Удалим контейнер-глушак, оставив только само изображение
            this.removeLayer(containerLayer);
        });
    }

// Метод для прямого импорта изображения в проект
    async  importFullImage(imagePath) {
        return await this.execute( () => {
            return app.activeDocument.importFromFile(imagePath);
        });
    }

// Метод для правильного позиционирования изображения внутри контейнера
    async  positionLayerInsideContainer(layer, containerBounds) {
        await this.execute( () => {
            layer.left = containerBounds.x;
            layer.top = containerBounds.y;
        });
    }

// Метод для масштабирования изображения
    async  scaleImageProportionally(layer, targetBounds) {
        await this.execute( () => {
            let layerWidth = layer.bounds.width;
            let layerHeight = layer.bounds.height;

            let ratioX = targetBounds.width / layerWidth;
            let ratioY = targetBounds.height / layerHeight;
            let scalingFactor = Math.min(ratioX, ratioY); // Коэффициент масштабирования

            this.resizeLayer(layer, scalingFactor);
        });
    }

// Вспомогательная функция для изменения размера слоя
    async  resizeLayer(layer, factor) {
        await this.execute( () => {
            layer.scale(factor * 100, factor * 100);
        });
    }

// Функция для проверки необходимости разворота изображения
     shouldRotate(targetBounds, layerBounds) {
        return targetBounds.width * layerBounds.height !== targetBounds.height * layerBounds.width;
    }

// Функция для поворота слоя
    async  rotateLayer(layer, angle, anchor) {
        await this.execute( () => {
            layer.rotate(angle, anchor);
        });
    }

// Функция для удаления слоя
    async  removeLayer(layer) {
        await this.execute( () => {
            layer.delete();
        });
    }

    async  removeLayersByIds(layerIds) {
        let des = [
            {
                _obj: "delete",
                _target: [
                    {
                        _ref: "layer",
                        _enum: "ordinal",
                        _value: "targetEnum"
                    }
                ],
                layerID: layerIds,
                _options: {
                    dialogOptions: "dontDisplay"
                }
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async switchDocument(oldDocumentId) {
        await this.execute( () => {
            app.activeDocument = app.documents.find(doc => doc.id === oldDocumentId)
        });
    }


    getAllLayers(layersArray) {
        const flatLayers = [];

        function recursiveGetLayers(layers) {
            for (let i = 0; i < layers.length; i++) {
                const layer = layers[i];

                if (layer !== null) {
                    flatLayers.push(layer);

                    if (layer.layers && layer.layers.length > 0) {
                        recursiveGetLayers(layer.layers);
                    }
                }
            }
        }

        recursiveGetLayers(layersArray);

        return flatLayers;
    }

    async mergeVisibleLayers(doc) {
        await this.execute( async () => {
            await app.activeDocument.mergeVisibleLayers()
        })
    }

    async getRulerPoints() {
            let des = [
                    {
                        _obj: "get",
                        _target: [
                            {
                                _property: "rulerPoints"
                            },
                            {
                                _ref: "document",
                                _id: app.activeDocument.id
                            }
                        ],
                        _options: {
                            dialogOptions: "dontDisplay"
                        }
                    }
                ]
            return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async createA4() {
        return await this.execute(  () => {
            return app.documents.add({
                name: 'Ворона доки А4',
                width: 2480,
                height: 3508,
                resolution: 300
            })
        })

    }

    async changeResolutionImage(number) {
        await this.execute(  () => {
             app.activeDocument.resizeImage(undefined, undefined, number)
        });
    }

    async placeOnA4(formatItem, doc) {
        return await this.execute(  () => {
            return formatItem.duplicate(doc);
        });

    }

    async crop(bounds, size, resolution, angle ){
        let des = [
            {
                "_obj": "crop",
                "to": {
                    "_obj": "rectangle",
                    "top": {
                        "_unit": "distanceUnit",
                        "_value": bounds.top
                    },
                    "left": {
                        "_unit": "distanceUnit",
                        "_value": bounds.left
                    },
                    "bottom": {
                        "_unit": "distanceUnit",
                        "_value": bounds.bottom
                    },
                    "right": {
                        "_unit": "distanceUnit",
                        "_value": bounds.right
                    }
                },
                "angle": {
                    "_unit": "angleUnit",
                    "_value": angle
                },
                "delete": true,
                "AutoFillMethod": 1,
                "cropFillMode": {
                    "_enum": "cropFillMode",
                    "_value": "defaultFill"
                },
                "cropAspectRatioModeKey": {
                    "_enum": "cropAspectRatioModeClass",
                    "_value": "targetSize"
                },
                "width": {
                    "_unit": "distanceUnit",
                    "_value": size.width
                },
                "height": {
                    "_unit": "distanceUnit",
                    "_value": size.height
                },
                "resolution": {
                    "_unit": "densityUnit",
                    "_value": resolution
                },
                "_isCommand": true
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async desaturate() {
        let des = [
            {
                "_obj": "desaturate",
                "_isCommand": true
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async setBackColor(color) {
        return await  this.setColor("backgroundColor", color)
    }

    async setFrontColor(color) {
        return await this.setColor("foregroundColor", color)
    }

    async setColor(type, color){
        color = color === 'white' ? {sat: 0, bright: 100} : {sat: 100, bright: 0};
        let des = [
            {
                "_obj": "set",
                "_target": [
                    {
                        "_ref": "color",
                        "_property": type
                    }
                ],
                "to": {
                    "_obj": "HSBColorClass",
                    "hue": {
                        "_unit": "angleUnit",
                        "_value": 0
                    },
                    "saturation": color.sat,
                    "brightness": color.bright
                },
                "source": "photoshopPicker",
                "_isCommand": true
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async fillBackColor() {
        let des = [
            {
                "_obj": "fill",
                "using": {
                    "_enum": "fillContents",
                    "_value": "backgroundColor"
                },
                "opacity": {
                    "_unit": "percentUnit",
                    "_value": 100
                },
                "mode": {
                    "_enum": "blendMode",
                    "_value": "normal"
                },
                "_isCommand": true
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async makeStroke() {
        let des = [
            {
                "_obj": "stroke",
                "width": 1,
                "location": {
                    "_enum": "strokeLength",
                    "_value": "center"
                },
                "opacity": {
                    "_unit": "percentUnit",
                    "_value": 100
                },
                "mode": {
                    "_enum": "blendMode",
                    "_value": "normal"
                },
                "color": {
                    "_obj": "RGBColor",
                    "red": 0,
                    "grain": 0,
                    "blue": 0
                },
                "_isCommand": true
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async unlockLayer() {
        let des = [
            {
                "_obj": "applyLocking",
                "_target": [
                    {
                        "_ref": "layer",
                        "_enum": "ordinal",
                        "_value": "targetEnum"
                    }
                ],
                "layerLocking": {
                    "_obj": "layerLocking",
                    "protectNone": true
                },
                "_isCommand": true
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }


    async unlockBackgroundLayer(backgroundLayer){
        let des =  [
            {
                _obj: "set",
                _target: [
                    {
                        _ref: "layer",
                        _property: "background"
                    }
                ],
                to: {
                    _obj: "layer",
                    opacity: {
                        _unit: "percentUnit",
                        _value: 100
                    },
                    mode: {
                        _enum: "blendMode",
                        _value: "normal"
                    }
                },
                layerID: backgroundLayer.id,
                _options: {
                    dialogOptions: "dontDisplay"
                }
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }

    async fullMergeLayers() {
        let des = [
            {
                _obj: "flattenImage",
                _options: {
                    dialogOptions: "dontDisplay"
                }
            }
        ]
        return await this.execute(() => photoshop.action.batchPlay(des, {}));
    }
}




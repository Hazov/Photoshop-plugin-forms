import {FileManager} from "./fileManager";

const photoshop = require('photoshop');
const app = photoshop.app;
const fileManager = new FileManager();

export class PhotoshopExecutor {
    async execute(pluginFunc) {
        return await photoshop.core.executeAsModal(pluginFunc);
    }

    async insertImageToPhotoshop(filePath) {
        let insertDescriptor = [
            {
                _obj: "placeEvent",
                null: {
                    _path: await fileManager.tokenify(filePath),
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
        ]
        return await this.execute(() => photoshop.action.batchPlay(insertDescriptor, {}));
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

    async selectLayers(layerIds) {
        let layers = app.activeDocument.layers.filter(layer => layerIds.includes(layer.id));
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

    async createTextLayer(text) {
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
                                    fontPostScriptName: "MyriadPro-Regular",
                                    fontName: "Myriad Pro",
                                    fontStyleName: "Regular",
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
                                    color: {
                                        _obj: "RGBColor",
                                        red: 232.00000137090683,
                                        grain: 178.74707490205765,
                                        blue: 50.95330886542797
                                    },
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
}




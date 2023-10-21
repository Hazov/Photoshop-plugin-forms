
const photoshop = require('photoshop');
const fileManager = require('./fileManager.js').fileManager;
export const photoshopExecutor = {
    execute: async (pluginFunc) => {
        return await photoshop.core.executeAsModal(pluginFunc);
    },
    insertImageToPhotoshop: async (filePath) => {
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
        return await photoshopExecutor.execute(() => photoshop.action.batchPlay(insertDescriptor, {}));
    },

    resizeImage: async (percentValue) => {
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
        await photoshopExecutor.execute(() => photoshop.action.batchPlay(resizeDescriptor, {}));
    },
    moveImage: async(offset) => {
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
        await photoshopExecutor.execute(() => photoshop.action.batchPlay(moveDescriptor, {}));

    },
    selectLayers: async (layerIds) => {
        let selectDescriptor =
            [
                {
                    _obj: "select",
                    makeVisible: false,
                    layerID: layerIds,
                    _options: {
                        dialogOptions: "dontDisplay"
                    }
                }
            ];
        await photoshopExecutor.execute(() => photoshop.action.batchPlay(selectDescriptor, {}));
    }


}




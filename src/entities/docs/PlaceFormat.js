export class PlaceFormat {
    layer;
    layerId;
    width;
    height;
    x;
    y;
    color;
    glossy;
    isRotated = false

    constructor(width, height, color, glossy) {
        this.width = width;
        this.height = height;
        this.color = color;
        this.glossy = glossy;
    }
}
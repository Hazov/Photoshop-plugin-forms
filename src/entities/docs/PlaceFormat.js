export class PlaceFormat {
    layer;
    layerId;
    width;
    heigth;
    x;
    y;
    color;
    glossy;

    constructor(width, heigth, color, glossy) {
        this.width = width;
        this.heigth = heigth;
        this.color = color;
        this.glossy = glossy;
    }
}
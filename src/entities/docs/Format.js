export class Format{
    width;
    height;
    color;
    angle;
    border;
    face;
    glossy;
    measure;
    constructor(width, height, color, angle = null, border = true, face = null, glossy = false, measure = 'cm') {
        this.width = width;
        this.height = height;
        this.color = color;
        this.angle = angle;
        this.border = border;
        this.face = face;
        this.glossy= glossy
        this.measure = measure;
    }
}
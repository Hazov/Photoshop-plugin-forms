export class Template{
    name;
    img;
    templateFile;
    sizes;
    onClick;
    constructor(name, img, templateFile, sizes, onClick) {
        this.name = name;
        this.img = img;
        this.templateFile = 'allFiles/templates/' + templateFile;
        this.sizes = sizes;
        this.onClick = onClick;
    }
}
export class UxpFile{
    name;
    path;
    bytes;
    file64;
    constructor(name, path, bytes, file64) {
        this.name = name;
        this.path = path;
        this.bytes = bytes;
        this.file64 = file64;
    }
}
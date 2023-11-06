import {Util} from "./util";
import {UxpFile} from "../entities/UxpFile";

const uxp = require('uxp');
const storage = uxp.storage;
const formats = storage.formats

const util = new Util();
export class FileManager {
     async getFolderByPath(path){
        let asArrayPath;
        if(path.constructor === Array){
            asArrayPath = path;
        } else {
            asArrayPath = path.split('/');
        }
        let folder = await storage.localFileSystem.getPluginFolder();
        for(let p of asArrayPath){
            folder = await folder.getEntry(p);
        }
        return folder;
    }
     async tokenify(url){
        let entry = await storage.localFileSystem.getEntryWithUrl("file:" + url);
        return storage.localFileSystem.createSessionToken(entry);
    }
     async readFileObj(folder, fileName){
        let file = await folder.getEntry(fileName);
        let bytes = await file.read({format: formats.binary});
        let file64 = "data:image/png;base64," + util.arrayBufferToBase64(bytes);
        let nativePath = file.nativePath;
        return new UxpFile(fileName, nativePath, bytes, file64);
    }

    async getAllFilesFromFolder(folder){
         let allFiles = [];
         let entries = await folder.getEntries();
         entries = entries.filter(entry => entry.isFile);
         for(let entry of entries){
             let file = await this.readFileObj(folder, entry.name);
             allFiles.push(file);
         }
         return allFiles;
    }
}







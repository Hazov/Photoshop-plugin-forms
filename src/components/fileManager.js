

const util = require('./util.js').util;
const uxp = require('uxp');
const storage = uxp.storage;
const formats = storage.formats
export const fileManager = {
    getFolderByPath : async (path) => {
        let asArrayPath;
        if(path.constructor === Array){
            asArrayPath = path;
        } else {
            asArrayPath = path.split('/');
        }
        let folder = await storage.localFileSystem.getPluginFolder();
        for(let p of asArrayPath){
            folder = await folder.getEntry(p)
        }
        return folder;
    },
    tokenify: async (url) => {
        let entry = await storage.localFileSystem.getEntryWithUrl("file:" + url);
        return storage.localFileSystem.createSessionToken(entry);
    },
    readFileObj: async (folder, fileName) => {
        let file = await folder.getEntry(fileName);
        let bytes = await file.read({format: formats.binary});
        return  {path: file.nativePath, bytes: bytes, file64: "data:image/png;base64," + util.arrayBufferToBase64(bytes)}
    }
}









const uxp = require('uxp');
const storage = uxp.storage;
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
    }
}







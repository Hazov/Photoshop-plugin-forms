import {FileManager} from "./fileManager";

const uxp = require('uxp')
const storage = uxp.storage;
const formats = storage.formats
const ITEM_NAME_SEPARATOR = '---'

const fileManager = new FileManager();

export class FetchManager {
     async fetchFormCategory(folder){
        let entries = await folder.getEntries();
        let infoFile = entries.find(entry => entry.name.includes('.info'));
        if (infoFile) {
            let title = infoFile.name.split('.info')[0];
            let categoryItems = entries.filter(entry => entry.isFolder).map(folder => folder.name);
            return {title: title, categoryItems: categoryItems};
        } else {
            let formItems = entries.filter(entry => entry.isFile).map(file => {
                return {fileName: file.name, name: file.name.split((/\.(?=[^.]+$)/))[0]}
            });
            return {title: null, categoryItems: null, formItems: formItems}
        }
    }

     async fetchItems(itemSet, itemFiles){
        let itemName = itemSet.itemName;
        let itemFolder = itemSet.itemFolder;
        if(/s+$/.test(itemName)){
            itemSet.itemName = itemName.replace(/s+$/, '')
        }
        let entries = await itemFolder.getEntries();
        let items = [];
        for(let entry of entries){
            let item = await this.getItem(itemFolder, entry, itemSet.itemName);
            if(!itemFiles[item.itemName]){
                itemFiles[item.itemName] = [];
            }
            itemFiles[item.itemName].push({name: item.name, file: await fileManager.readFileObj(itemFolder, entry.name)})
            items.push(item);
        }
        return items;
    }

     async getMedalsFolder(rightItemName){
        if(/s+$/.test(rightItemName)){
            rightItemName = rightItemName.replace(/s+$/, '')
        }
        let medalsPath = 'allFiles/' + rightItemName + 's';
        return await fileManager.getFolderByPath(medalsPath);
    }

     async getSignsFolder(){
        let signsPath = 'allFiles/signs';
        return await fileManager.getFolderByPath(signsPath);
    }
     async fetchFormConfig(folderPath){
        let formFolder = await fileManager.getFolderByPath(folderPath);
        let entries = await formFolder.getEntries();
        let configFile = entries.find(entry => entry.name.includes('.config'));
        if (configFile) {
            let json = await configFile.read({formats: formats.utf8});
            if(json){
                return JSON.parse(json);
            }
        }
        return null;
    }
     async getItem(folder, file, itemName){
        let fileName = file.name;
        let withoutExtensionName = fileName.split(/\.(?=[^.]+$)/)[0];
        let itemNameSplit = fileName.split(ITEM_NAME_SEPARATOR);
        if(itemNameSplit.length > 1) {
            itemName = itemNameSplit[0];
            withoutExtensionName = withoutExtensionName.split(ITEM_NAME_SEPARATOR)[1];
        }

        return {itemName: itemName, fileName: file.name, name: withoutExtensionName}
    }
}





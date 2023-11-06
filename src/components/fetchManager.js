import {FileManager} from "./fileManager";
import {Util} from "./util";
import {FormCategory} from "../entities/FormCategory";
import {Form} from "../entities/Form";

const uxp = require('uxp')
const storage = uxp.storage;
const formats = storage.formats
const ITEM_NAME_SEPARATOR = '---'

const fileManager = new FileManager();
const util = new Util();

export class FetchManager {
     async fetchFormCategory(folder){
         let category = new FormCategory(null, null);

        let entries = await folder.getEntries();
        let infoFile = entries.find(entry => entry.name.includes('.info'));
        if (infoFile) {
            category.title = infoFile.name.split('.info')[0];
            category.categoryItems = entries.filter(entry => entry.isFolder).map(folder => folder.name);
            return category;
        } else {
            let forms = entries.filter(entry => entry.isFile).map(file => new Form(file.name, util.withoutExtensionName(file)));
            folder = await folder.getEntry('previews');
            for(let form of forms){
                form.file = await fileManager.readFileObj(folder, form.fileName);
            }
            category.formItems = forms;
            return category;
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

    async fetchStraps(){
         let straps = [];
         let strapsFolder = await fileManager.getFolderByPath('allFiles/straps');
         for(let entry of await strapsFolder.getEntries()){
             let strap = {};
             strap.file = await fileManager.readFileObj(strapsFolder, entry.name);
             strap.name = util.withoutExtensionName(strap.file);
             straps.push(strap);
         }
         return straps;
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
        let withoutExtensionName = util.withoutExtensionName(file);
        let itemNameSplit = fileName.split(ITEM_NAME_SEPARATOR);
        if(itemNameSplit.length > 1) {
            itemName = itemNameSplit[0];
            withoutExtensionName = withoutExtensionName.split(ITEM_NAME_SEPARATOR)[1];
        }

        return {itemName: itemName, fileName: file.name, name: withoutExtensionName}
    }

    async fetchFormPreviews(formFolder) {
        formFolder.push('previews');
        return await fileManager.getAllFilesFromFolder(formFolder);

    }
}





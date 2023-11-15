import {FileService} from "./fileService";
import {UtilService} from "./utilService";
import {FormCategory} from "../entities/FormCategory";
import {Form} from "../entities/Form";
import {ItemFilePair} from "../entities/ItemFilePair";
import {Item} from "../entities/Item";
import {SortService} from "./sortService";

const uxp = require('uxp')
const storage = uxp.storage;
const formats = storage.formats
const ITEM_NAME_SEPARATOR = '---'

const fileService = new FileService();
const utilService = new UtilService();
const sortService = new SortService();

export class FetchService {
     async fetchFormCategory(folder){
        let category = new FormCategory(null, []);

        let entries = await folder.getEntries();
        let infoFile = entries.find(entry => entry.name.includes('.info'));
        if (infoFile) {
            category.title = infoFile.name.split('.info')[0];
            let categoryNames = entries.filter(entry => entry.isFolder).map(folder => folder.name);
            let files = entries.filter(entry => entry.isFile)
            for(let categoryName of categoryNames){
                let categoryItem = {};
                categoryItem.name = categoryName;
                let foundFile = files.find(file => utilService.withoutExtensionName(file) === categoryName);
                let uxpFile;
                if(foundFile){
                    uxpFile = await fileService.readFileObj(folder, foundFile.name);
                    categoryItem.file = uxpFile;
                }
                category.categoryItems.push(categoryItem);
            }
        } else {
            let forms = entries.filter(sortService.isPngFile).map(file => new Form(file.name, utilService.withoutExtensionName(file)));
            folder = await folder.getEntry('previews');
            for(let form of forms){
                form.file = await fileService.readFileObj(folder, form.fileName);
                form.file.path = form.file.path.replace('\\previews', '');
            }
            category.formItems = forms;
        }
         return category;
    }

     async fetchItems(itemSet, itemFiles){
        let itemName = itemSet.itemName;
        let itemFolder = itemSet.itemFolder;
        if(/s+$/.test(itemName)){
            itemSet.itemName = itemName.replace(/s+$/, '')
        }
        let entries = await itemFolder.getEntries();
        entries = entries.filter(entry => entry.isFile && entry.name.endsWith('.png'));
        let items = [];
        for(let entry of entries){
            let item = await this.getItem(itemFolder, entry, itemSet.itemName);
            if(!itemFiles[item.itemName]){
                itemFiles[item.itemName] = [];
            }
            let file = await fileService.readFileObj(itemFolder, entry.name);
            itemFiles[item.itemName].push(new ItemFilePair(item.name, file));
            items.push(item);
        }
        return items;
    }

    async fetchStraps(){
         let straps = [];
         let strapsFolder = await fileService.getFolderByPath('allFiles/straps');
         for(let entry of await strapsFolder.getEntries()){
             let strap = {};
             strap.file = await fileService.readFileObj(strapsFolder, entry.name);
             strap.name = utilService.withoutExtensionName(strap.file);
             straps.push(strap);
         }
         return straps;
    }

     async getMedalsFolder(rightItemName){
        if(/s+$/.test(rightItemName)){
            rightItemName = rightItemName.replace(/s+$/, '')
        }
        let medalsPath = 'allFiles/' + rightItemName + 's';
        return await fileService.getFolderByPath(medalsPath);
    }

     async getSignsFolder(){
        let signsPath = 'allFiles/signs';
        return await fileService.getFolderByPath(signsPath);
    }
     async fetchFormConfig(folderPath){
        let formFolder = await fileService.getFolderByPath(folderPath);
        let entries = await formFolder.getEntries();
        let configFile = entries.find(entry => entry.name.includes('.config'));
        if (configFile) {
            let json = await configFile.read({formats: formats.utf8});
            if(json){
                let config = JSON.parse(json);
                config = utilService.for300dpi(config);
                return config;
            }
        }
        return null;
    }
     async getItem(folder, file, itemName){
        let fileName = file.name;
        let withoutExtensionName = utilService.withoutExtensionName(file);
        let itemNameSplit = fileName.split(ITEM_NAME_SEPARATOR);
        if(itemNameSplit.length > 1) {
            itemName = itemNameSplit[0];
            withoutExtensionName = withoutExtensionName.split(ITEM_NAME_SEPARATOR)[1];
        }
        return new Item(itemName, file.name, withoutExtensionName);
    }
}



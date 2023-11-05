const fileManager = require('./fileManager').fileManager;

const uxp = require('uxp')
const storage = uxp.storage;
const formats = storage.formats
const ITEM_NAME_SEPARATOR = '---'

export const fetchManager = {
    fetchFormCategory: async (folder) => {
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
    },

    fetchMedals: async (rightItemName) => {
        let itemName = rightItemName;
        if(/s+$/.test(itemName.name)){
            itemName.name = itemName.name.replace(/s+$/, '')
        }
        let medalsFolder = await fetchManager.getMedalsFolder(itemName);
        let entries = await medalsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => fetchManager.getItem(file, itemName));
    },

    fetchSigns: async () => {
        let itemName = {name: 'sign'};
        let signsFolder = await fetchManager.getSignsFolder();
        let entries = await signsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => fetchManager.getItem(file, itemName));
    },

    getMedalsFolder: async (rightItemName) => {
        if(/s+$/.test(rightItemName.name)){
            rightItemName.name = rightItemName.name.replace(/s+$/, '')
        }
        let medalsPath = 'allFiles/' + rightItemName.name + 's';
        return await fileManager.getFolderByPath(medalsPath);
    },

    getSignsFolder: async () => {
        let signsPath = 'allFiles/signs';
        return await fileManager.getFolderByPath(signsPath);
    },
    fetchFormConfig: async (folderPath) => {
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
    },
    getItem: (file, itemName) => {
        let fileName = file.name;
        let withoutExtensionName = fileName.split(/\.(?=[^.]+$)/)[0];
        let itemNameSplit = fileName.split(ITEM_NAME_SEPARATOR);
        if(itemNameSplit.length > 1) {
            itemName = {};
            itemName.name = itemNameSplit[0];
            withoutExtensionName = withoutExtensionName.split(ITEM_NAME_SEPARATOR)[1];
        }
        return {itemName: itemName, fileName: file.name, name: withoutExtensionName}
    }

}





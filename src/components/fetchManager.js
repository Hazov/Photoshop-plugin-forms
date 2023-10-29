const fileManager = require('./fileManager').fileManager;

const uxp = require('uxp')
const storage = uxp.storage;
const formats = storage.formats

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
        if(/s+$/.test(rightItemName.name)){
            rightItemName.name = rightItemName.name.replace(/s+$/, '')
        }
        let medalsFolder = await fetchManager.getMedalsFolder(rightItemName);
        let entries = await medalsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => {return {itemName: rightItemName, fileName: file.name, name: file.name.split(/\.(?=[^.]+$)/)[0]}});
    },

    fetchSigns: async () => {
        let signsFolder = await fetchManager.getSignsFolder();
        let entries = await signsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => {return {itemName: {name: 'sign'}, fileName: file.name, name: file.name.split(/\.(?=[^.]+$)/)[0]}});
    },

    getMedalsFolder: (rightItemName) => {
        if(/s+$/.test(rightItemName.name)){
            rightItemName.name = rightItemName.name.replace(/s+$/, '')
        }
        let medalsPath = 'allFiles/' + rightItemName.name + 's';
        return fileManager.getFolderByPath(medalsPath);
    },

    getSignsFolder: () => {
        let signsPath = 'allFiles/signs';
        return fileManager.getFolderByPath(signsPath);
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
    }

}





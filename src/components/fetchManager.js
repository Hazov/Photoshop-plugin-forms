const fileManager = require('./fileManager').fileManager;

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
                return {fileName: file.name, name: file.name.split('.')[0]}
            });
            return {title: null, categoryItems: null, formItems: formItems}
        }
    },

    fetchMedals: async (rightItemName) => {
        let medalsFolder = await fetchManager.getMedalsFolder(rightItemName);
        let entries = await medalsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => {return {fileName: file.name, name: file.name.split('.')[0]}});
    },

    fetchSigns: async () => {
        let signsFolder = await fetchManager.getSignsFolder();
        let entries = await signsFolder.getEntries();
        return entries.filter(entry => entry.isFile).map(file => {return {fileName: file.name, name: file.name.split('.')[0]}});
    },

    getMedalsFolder: (rightItemName) => {
        if(!rightItemName) rightItemName = 'medals'
        let medalsPath = 'allFiles/' + rightItemName;
        return fileManager.getFolderByPath(medalsPath);
    },

    getSignsFolder: () => {
        let signsPath = 'allFiles/signs';
        return fileManager.getFolderByPath(signsPath);
    }

}





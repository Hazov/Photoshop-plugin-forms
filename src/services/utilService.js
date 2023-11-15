const photoshop = require('photoshop');
const app = photoshop.app;

export class UtilService {
     arrayBufferToBase64(buffer){
        let binary = '';
        let bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }
     repeatTimes(size){
        let fakeArray = [];
        for (let i = 0; i < size; i++) {
            fakeArray[i] = i;
        }
        return fakeArray;
    }
     indexOf(array, item){
        let foundItem = array.find(it => _.isEqual(it, item));
        if(!foundItem) {
            return -1;
        }
        return array.indexOf(foundItem);
    }
     groupBy(arr, key){
        arr = arr.filter(el => el).filter(el => el[key]);
        if(arr && arr.length){
            let groupObject = arr.reduce((rv, x) => {
                let k = this.hashCode(JSON.stringify(x[key]));
                (rv[k] = rv[k] || []).push(x);
                return rv;
            }, {});
            return Object.values(groupObject);
        }
        return [];
    }
     hashCode(string){
        let hash = 0;
        for (let i = 0; i < string.length; i++) {
            let code = string.charCodeAt(i);
            hash = ((hash<<5)-hash)+code;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
    withoutExtensionName(file){
         return file.name.split(/\.(?=[^.]+$)/)[0];
    }
    getOr0(item){
         return item ? item : 0;
    }

    for300dpi(config){
         for(let confItem in config){
             if(!confItem.includes('Angle')){
                 if(typeof config[confItem] === 'number'){
                     config[confItem] = config[confItem] / 300 * app.activeDocument.resolution;
                 } else if(typeof config[confItem] !== 'string') {
                     config[confItem] = this.for300dpi(config[confItem]);
                 }
             }
         }
         return config;
    }
}





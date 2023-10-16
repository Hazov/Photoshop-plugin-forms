const uxp = require('uxp');
const storage = uxp.storage;

export const util = {
    arrayBufferToBase64: (buffer) => {
    let binary = '';
    let bytes = new Uint8Array( buffer );
    for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
},
    repeatTimes: (size) => {
    let fakeArray = [];
    for (let i = 0; i < size; i++){
        fakeArray[i] = i;
    }
    return fakeArray;
}
}





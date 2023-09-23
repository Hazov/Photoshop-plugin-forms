const uxp = require('uxp');
const storage = uxp.storage;

export const util = {
    arrayBufferToBase64: (buffer) => {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
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





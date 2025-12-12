import React, {useEffect, useState} from "react";

import "./PolaroidApp.css"

import {PhotoshopService} from "../services/photoshopService";

const photoshop = require('photoshop');

const app = photoshop.app;
const action = photoshop.action;
const constants = photoshop.constants;
const uxp = require('uxp')
const storage = uxp.storage;
let isInit = false;

const polaroidFolderName = 'полароид ворона';

const photoshopService = new PhotoshopService();

const fillOptions =  { 'newWhite': 'На новом белом фоне', 'currentDoc': 'В качестве фона - текущая картинка'}
export const PolaroidApp = () => {

    let [imagesToPolaroid, setImagesToPolaroid] = useState([]);

    let [selectedFillOption, setSelectedFillOption] = useState('newWhite');

    let [selectedFolder, setSelectedFolder] = useState();



    async function browseToFillFolder() {
        try {
            // Выбор папки
            let selectedFolder = await storage.localFileSystem.getFolder();

            setSelectedFolder(selectedFolder);

            let selectedFiles = await selectedFolder.getEntries()

            selectedFiles = selectedFiles.sort((a, b) => a.name.localeCompare(b.name))
            selectedFiles = selectedFiles.filter(
                f => f.name.endsWith('.png') || f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.gif')
            );

            selectedFiles.forEach(f =>{
                let cleanedPath = f.nativePath.replaceAll("\\", "/")
                f.newPath = `${cleanedPath.slice(0, cleanedPath.lastIndexOf('/') + 1)}${polaroidFolderName}/${cleanedPath.split('/').pop()}`;
                f.newPath = f.newPath.replace(/\.[^.]+$/, '.jpg');
            })

            setImagesToPolaroid(selectedFiles);

        } catch (err) {
            console.error(err.message); // обработка ошибок
        }
    }

    async function makeFiles() {

        let selectedFolderEntries = await selectedFolder.getEntries();
        let polaroidFolder = selectedFolderEntries.find(entry => entry.isFolder && entry.name === polaroidFolderName);
        if (!polaroidFolder) {
            polaroidFolder = await selectedFolder.createFolder(polaroidFolderName)
        }

        let entriesInPolaroidFolder = await polaroidFolder.getEntries();
        for (const file of imagesToPolaroid) {
            let newFile = entriesInPolaroidFolder.find(entry => entry.name.replace(/\.[^.]+$/, '.jpg') === file.name.replace(/\.[^.]+$/, '.jpg'));
            if(!newFile){
                newFile = await polaroidFolder.createFile(file.name.replace(/\.[^.]+$/, '.jpg'));
                await newFile.write("0")
            }
        }
    }

    async function make(){
        await makeTemplate();
        await makeFiles();
        await makePolaroids();
    }

    async function makePolaroids(){
        let doc = app.activeDocument
        for(let file of imagesToPolaroid){
            let insertResult = await photoshopService.insertImageToPhotoshop(file.nativePath);
            doc.activeLayer = doc.layers.find(layer => layer.id === insertResult[0].ID);
            let layerWidth = doc.activeLayer.bounds.width;
            let layerHeight = doc.activeLayer.bounds.height;
            if(layerWidth - (7.8 * 118) > 15 || layerHeight - (7.8 * 118) < 15){
                // Делаем чтобы ширина была 7,8
                await photoshopService.resizeLayer(doc.activeLayer, getDiffPercentSize())

                if(layerWidth - layerHeight < 15){
                    // Выравниваем top-center
                    await photoshopService.antSelectAll()
                    await photoshopService.alignLayer("ADSCentersH")
                    await photoshopService.alignLayer("ADSTops")
                    await photoshopService.deselectAll()

                    // выделение по направляющим
                    await photoshopService.antSelection(doc, {top: doc.height - (doc.height - 7.8 * 118), left: 0, bottom: doc.height, right: doc.width})
                    //удаление выделения
                    await photoshopService.cropSelected()
                    // снятие выделения
                    await photoshopService.deselectAll()
                }
            }
            // Выравниваем top-center
            await photoshopService.antSelectAll()
            await photoshopService.alignLayer("ADSCentersH")
            await photoshopService.alignLayer("ADSTops")
            await photoshopService.deselectAll()

            // move вниз на 6 мм
            await photoshopService.moveImage({horizontal: 0, vertical: 5 * 12})
            // обводка
            await photoshopService.setFrontColor('black')
            await photoshopService.makeStroke()

            await photoshopService.setBackColor('white')
            await photoshopService.fullMergeLayers();
            await photoshopService.unlockBackgroundLayer(doc.activeLayer)
            await photoshopService.makeStroke()
            await photoshopService.fullMergeLayers();
            await photoshopService.extendImage(10, 15, false)

            //сохранить
            await photoshopService.saveDoc(file.newPath)

            await photoshopService.backHistory(doc, 5)
        }
        await photoshopService.closeDocWithoutSaving(doc)
    }



    function getDiffPercentSize(){
        let width = app.activeDocument.activeLayer.bounds.width ;
        let percent = ((7.8 * 118) / width) * 100
        return {width: percent, height: percent}
    }

    async function makeTemplate(){
        if(selectedFillOption === 'newWhite') {
            await photoshopService.createPolaroidTemplate()
        } else {
            let width = 8.8;
            let height = 10.8;
            await photoshopService.crop({top:0, left: 0, right: width * 118, bottom: height * 118}, {width: width * 28.346456692913384, height: height * 28.346456692913384}, 300, 0)
        }
    }


    return (
        <div>
            <h1>Полароиды</h1>
            <div>
                <sp-card class={"file-list"}>
                    <sp-menu class={"select-menu"}>
                        {imagesToPolaroid.map((image) => {
                            return (
                                <sp-menu-item>
                                    <span class={"imageFileName"}>{image.name}</span>
                                </sp-menu-item>
                            )
                        })}
                    </sp-menu>
                </sp-card>

                <span className={'files-info'}>Выбрано {imagesToPolaroid.length} картинок</span>


                <button className={"select-images-btn"}
                        onClick={() => browseToFillFolder()}>
                    Выбрать папку с полароидами...
                </button>

                <div className={'absolute-bottom'}>
                    <div>
                        <span className={'polaroid-size-info'}>Размещение на 10х15</span>
                        <span className={'polaroid-size-info'}>Размер полароида 8,8x10,8</span>
                        <span className={'polaroid-size-info'}>Размер фото 7,8x7,8</span>
                    </div>
                    <div className={"flex-row"}>
                        <sp-picker
                            className="fullWidth"
                            placeholder={fillOptions[selectedFillOption]}
                            value={selectedFillOption}>
                            <sp-menu slot="options">
                                <sp-menu-item onClick={(e) => setSelectedFillOption(e.target.value)}
                                              value="newWhite">{fillOptions["newWhite"]}
                                </sp-menu-item>
                                <sp-menu-item onClick={(e) => setSelectedFillOption(e.target.value)}
                                              value="currentDoc">{fillOptions["currentDoc"]}
                                </sp-menu-item>
                            </sp-menu>
                        </sp-picker>
                    </div>
                    <div className={"flex-row"}>
                        <button className={"select-images-btn"}
                                onClick={() => make()}>
                            Создать полароиды
                        </button>
                    </div>

                </div>
            </div>
        </div>
    )

}


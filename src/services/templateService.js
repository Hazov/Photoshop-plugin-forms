import {Template} from "../entities/Template";

import latteImg from '/src/images/templates/latte.png'
import bigLatteImg from '/src/images/templates/big-latte.png'
import cupImg from '/src/images/templates/cup.png'
import stone2030Img from '/src/images/templates/stone2030.png'
import stoneSquareImg from '/src/images/templates/stone-square.png'
import roadNumberImg from '/src/images/templates/road-number.png'
import {PhotoshopService} from "./photoshopService";
import {Direction} from "../entities/Direction";
import {Guide} from "../entities/Guide";
import {Sizes} from "../entities/Sizes";

const photoshop = require('photoshop');
const app = photoshop.app;

const photoshopService = new PhotoshopService();

const A4 = new Sizes(21, 29.7);

export class TemplateService {
    getDefaultTemplates() {
        return [
            new Template('Кружка', cupImg, 'cup', '20,5x9,7', this.getCupOnClick),
            new Template('Латте', latteImg, 'latte.psd', '---', this.getLatteOnClick),
            new Template('Большая латте', bigLatteImg, 'big-latte.psd', '---', this.bigLatteOnClick),
            new Template('Камень', stone2030Img, 'stone2030', '19x29', this.getStone2030OnClick),
            new Template('Камень', stoneSquareImg, 'stone-square.jpg', '20х20', this.getStone2020OnClick),
            new Template('Брелок Номер', roadNumberImg, 'road-number.psd', '1x7', this.getRoadNumberOnClick),
        ]
    }
    async getDefaultOnClick(sizes, guides, templateFileName){
        await photoshopService.createNewLayer(sizes);
        if(guides){
            await createGuides(guides);
        }
        if(templateFileName){
            await this.placeTemplate(templateFileName);
        }
    }

    async getCupOnClick(){
        let sizes = new Sizes(20.5, 9.7)
        let guides = [
            new Guide(2, Direction.VERTICAL),
            new Guide(sizes.width - 2, Direction.VERTICAL)
        ]
        await this.getDefaultOnClick(sizes, guides, null)
    }

    async bigLatteOnClick() {
        await this.getDefaultOnClick(A4, null, 'big-latte.png')
    }

    async getStone2030OnClick(){
    }

    async getStone2020OnClick() {
        return undefined;
    }

    async getLatteOnClick() {
        return undefined;
    }

    async getRoadNumberOnClick() {
        return undefined;
    }

    async placeTemplate(templateFileName) {
        
    }
}
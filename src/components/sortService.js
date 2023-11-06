export class SortService{
    isPngFile(entry){
        return entry.isFile && entry.name.endsWith('.png');
    }

    sortForms(form1, form2){
        return Number(form1.name.split('.')[0]) < Number(form2.name.split('.')[0]) ?  -1 : 1;
    }
}
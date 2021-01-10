export class Stats {
    static getModFromStatValue = function (value) {
        return (value < 4) ? -4 : Math.floor(value / 2) - 5;
    };
    static getStatValueFromMod = function (mod) { return mod * 2 + 10; };

    static getObjectValueForPath(object, path, defaultValue){
         return path.split('.').reduce((o, p) => o ? o[p] : defaultValue, object);
    }

    static setPath(object, path, value){ 
         return  path.split('.').reduce((o,p,i) => o[p] = path.split('.').length === ++i ? value : o[p] || {}, object);
    }

}
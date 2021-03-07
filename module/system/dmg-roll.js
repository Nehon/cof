import {Traversal} from "../utils/traversal.js";

export class CofDamageRoll {
    constructor(label, formula, isCritical, type = 'damage', defaultSubtype = 'pysical'){
        this._label = label;
        this._formula = formula;
        this._isCritical = isCritical;
        this._type = type;
        this._defaulSubtype = defaultSubtype;
    }

    getRollResult(critOverride){
        const crit = critOverride? critOverride: this._isCritical;
        let rolls = this.parseRolls(this._formula);
        let total = 0;
        let diceResult = "";
        let diceFormula = "";
        for (const roll of rolls) {
            const r = new Roll(roll.formula);
            r.roll();
            roll.total = r._total;
            roll.result = Traversal.rollResultToString(r);
            const sign = roll.sign? `${roll.sign}`: '';
            diceResult += diceResult === "" ? `${roll.result}` : `${sign} ${roll.result} `;
            diceFormula += diceFormula === "" ? `${roll.formula}` : `${sign} ${roll.formula} `;
            total += roll.total * (sign==="-"?-1:1);
        }        
        
        if (crit) {
            total *= 2;
            diceResult =`(${diceResult}) x 2`;
            diceFormula =`(${diceFormula}) x 2`;
        }

        return {
            total: total,
            result: `${diceFormula} <br> ${diceResult}`,
            type: this._type,
            subRolls: rolls,
            isCrit: crit,
        };
    }

    parseRolls(str){
        let rolls = [];
        if(!str.includes("{")){
            rolls.push({
                sign: "+",
                subtype: this._defaulSubtype,
                formula: str
            })
            return rolls;
        }
        let re = new RegExp(/\s*([\+\-\*])*\s*\b([^{|^\+|^\-|^\*]+)*({([^}]*)\})*/g)
        
        let result = re.exec(str);
        while(result !==null && result.index<str.length) {
            
            const sign = result[1]?result[1]:"+" ;
            const subtype = result[4]? result[2]:this._defaulSubtype;
            const formula = result[4]?result[4]:result[2];            
            result = re.exec(str);            
            rolls.push({
                sign: sign,
                subtype:subtype,
                formula: formula
            })

        }
        return rolls;
        
    }
}
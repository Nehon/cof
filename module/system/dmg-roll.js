import {Traversal} from "../utils/traversal.js";

export class CofDamageRoll {
    constructor(label, formula, isCritical, type = 'damage'){
        this._label = label;
        this._formula = formula;
        this._isCritical = isCritical;
        this._type = type
    }

    getRollResult(critOverride){
        const crit = critOverride? critOverride: this._isCritical;
        const r = new Roll(this._formula);
        r.roll();
        let diceResult = Traversal.rollResultToString(r);
        let diceFormula = r.formula;
        if (crit) {
            r._total = r._total * 2;
            diceResult =`(${diceResult}) x 2`;
            diceFormula =`(${diceFormula}) x 2`;
        }
        return {
            total: r._total,
            result: `${diceFormula} <br> ${diceResult}`,
            type: this._type
        };
    }
}
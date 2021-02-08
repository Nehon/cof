import {Traversal} from "../utils/traversal.js";

export class Capacity {
    /**
     * Callback on capacity create action
     * @param event the create event
     * @private
     */
    static create(actor, event) {
        const data = {name: "New Capacity", type: "capacity", data: {checked: true}};
        return actor.createOwnedItem(data, {renderSheet: true}); // Returns one Entity, saved to the database
    }

    static toggleCheck(actor, event, isUncheck) {
        const elt = $(event.currentTarget).parents(".capacity");
        const data = duplicate(actor.data);
        // get id of clicked capacity
        const capId = elt.data("itemId");
        // get id of parent path
        const pathId = elt.data("pathId");
        // get path from owned items
        const path = actor.getOwnedItem(pathId).data;
        // retrieve path capacities from world/compendiums
        let capacities = Traversal.getItemsOfType("capacity").filter(c => path.data.capacities.includes(c._id));
        capacities = capacities.map(c => {
            let cdata = duplicate(c);
            // if no rank, force it
            if(!cdata.data.rank) cdata.data.rank = path.data.capacities.indexOf(c._id) +1;
            // if no path, force it
            if(!cdata.data.path) cdata.data.path = path.data.key;
            return cdata;
        });
        const capacitiesKeys = capacities.map(c=>c.data.key);

        // retrieve path's capacities already present in owned items
        const items = data.items.filter(i => i.type === "capacity" && capacitiesKeys.includes(i.data.key));
        const itemKeys = items.map(i => i.data.key);

        if(isUncheck){
            const caps = capacities.filter(c => path.data.capacities.indexOf(c._id) >= path.data.capacities.indexOf(capId));
            const capsKeys = caps.map(c => c.data.key);
            // const caps = capacities.filter(c => c.data.rank >= capacity.data.rank);
            // REMOVE SELECTED CAPS
            const toRemove = items.filter(i => capsKeys.includes(i.data.key)).map(i => i._id);
            return actor.deleteOwnedItem(toRemove);
        }else {
            const caps = capacities.filter(c => path.data.capacities.indexOf(c._id) <= path.data.capacities.indexOf(capId));
            // const caps = capacities.filter(c => c.data.rank <= capacity.data.rank);
            const toAdd = caps.filter(c => !itemKeys.includes(c.data.key));
            return actor.createOwnedItem(toAdd);
        }
    }

    static makeActiveEffect(capacity, effect, changes, duration) {
        if (effect.type != 'buff') {
            return undefined
        }

        const durationObj = game.combat ? {
            combat: game.combat._id,
            rounds: duration,
            turns: 0,
            startRound: game.combat.current.round,
            startTurn: game.combat.current.turn
        } : {
            rounds: duration,
        };

        let effectData = {
            label: capacity.name,
            icon: capacity.img,
            duration: durationObj,
            "flags.core.statusId" : capacity.data.key
        }
        
        if(effect.resistanceFormula){
            effectData["flags.resistanceFormula"] = effect.resistanceFormula;
            effectData["flags.resistanceEffect"] = effect.resistanceEffect;            
        }

        if(!changes.length){
            return effectData;
        }
        effectData.changes = [];
        for (const change of changes) {
            let ae = CONFIG.statusEffects.find(e => e.id === change.value ||  e.id === capacity.data.key);
            if(!change.key || change.key.trim() ===""){
                // Standard effects                
                if (ae) {    
                    if(!effectData.changes.length){
                        // no changes yet let's use this effect
                        effectData.icon = ae.icon;
                        effectData.label = game.i18n.localize(ae.label);
                        effectData["flags.core.statusId"] = ae.id;
                        if(ae.changes) effectData.changes = duplicate(ae.changes);
                    } else {
                        // push standard effect changes 
                        for (const ch of ae.changes) {
                            effectData.changes.push(ch);
                        }
                    }
                } else {            
                    CONFIG.statusEffects.push({id:capacity.data.key, label:capacity.name, icon:capacity.img});
                }
                continue;
            }
            effectData.changes.push(change);
            if(!ae){
                CONFIG.statusEffects.push({id:capacity.data.key, label:capacity.name, icon:capacity.img});
            }
        }      
        return effectData;
    }

    static addActiveEffectChange(effectData, key, value) {
        effectData.changes.push({
            key: key.replace('@','data.'),
            mode: 2,
            value: value
        });
        return effectData;
    }

    static isActivable(capacity){
        for (const key in capacity.data.effects) {
            const effect = capacity.data.effects[key];
            if(effect.activable){
                return true;
            }            
        }
        return false;        
    }

}
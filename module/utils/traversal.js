export class Traversal {

    static async getEntity(id, type, pack) {
        let entity = null;
        // Case 1 - Import from World entities
        if (type === "item") entity = game.items.get(id);
        else if (type === "actor") entity = game.actors.get(id);
        else if (type === "journal") entity = game.journal.get(id);
        // Case 2 - Import from a Compendium pack
        if (!entity && pack) {
            const compendiums = game.packs.filter(c => c.metadata.tag === pack)
            for (let compendium of compendiums) {
                await compendium.getEntity(id).then(e => entity = e);
                if (entity) {
                    return entity;
                }
            }
        }
        return entity;
    }

    static findSourceToken(id) {
        return canvas.tokens.placeables.find((t) => t.data.actorId === id);
    }

    static findActor(id) {
        if(!canvas){
            return game.actors.get(id);
        }
        let token  = canvas.tokens.placeables.find((t) => t.data.actorId === id);

        if (token) {
            return token.actor;
        }
        let actor = game.actors.get(id);
        return actor;
    }

    static isBuff(effect){
        if(effect.flags["core.type"] === "buff" || effect.flags.core.type === "buff"){
            return true;
        }
        if(effect.changes){
            for (const change of effect.changes) {
                if(change.mode === 2 && parseInt(change.value,10) > 0){
                    return true;
                }
            }
        }
        return false;
    }

    static isDebuff(effect){
        if(effect.flags["core.type"] === "debuff" || effect.flags.core.type === "debuff"){
            return true;
        }
        if(effect.changes){
            for (const change of effect.changes) {
                if(change.mode === 2 && parseInt(change.value,10) < 0){
                    return true;
                }
            }
        }
        return false;
    }

    // static async getEntity(id, type, pack) {
    //     let entity = null;
    //     // Target 1 - Compendium Link
    //     if ( pack ) {
    //         const pack = game.packs.get(pack);
    //         await pack.getIndex();
    //         entity = id ? await pack.getEntity(id) : null;
    //     }
    //     // Target 2 - World Entity Link
    //     else {
    //         if(type==="item") entity = game.items.get(id);
    //         else if(type==="journal") entity = game.journal.get(id);
    //         else if(type==="actor") entity = game.actors.get(id);
    //     }
    //     // if ( !entity ) return;
    //     // // Action 1 - Execute an Action
    //     // if ( entity.entity === "Macro" ) {
    //     //     if ( !entity.hasPerm(game.user, "LIMITED") ) {
    //     //         return ui.notifications.warn(`You do not have permission to use this ${entity.entity}.`);
    //     //     }
    //     //     return entity.execute();
    //     // }
    //     //
    //     // // Action 2 - Render the Entity sheet
    //     // return entity.sheet.render(true);
    //     return entity;
    // }


    static getChangesFromBuffValue(value){
        let changes=[];
        const values = value.split(",");
        for (const val of values) {
            if(val.trim()===""){
                continue;
            }
            const m = val.match(/\s*([^(]*)\((.*)\)$/);
            if(!m){
                changes.push({                 
                    value: val
                });                
                continue;
            }
            changes.push({
                key: m[1],
                mode:2,
                value: m[2]
            });            
        }
        return changes;
    }

    static async getAllEntitiesOfType(type, pack) {
        const compendium = await game.packs.get(pack).getContent();
        const ingame = game.items.filter(item => item.type === type);
        return ingame.concat(compendium);
    }

    static getItemsOfType(type) {
        let compendium = [];
        let ingame = [];
        switch (type) {
            case "path":
                compendium = game.cof.config.paths;
                ingame = game.items.filter(item => item.type === "path").map(entity => entity.data);
                break;
            case "capacity":
                compendium = game.cof.config.capacities;
                ingame = game.items.filter(item => item.type === "capacity").map(entity => entity.data);
                break;
        }
        return ingame.concat(compendium);
    }

    /*
     * DATA
     */

    static getInGameEntitiesDataOfType(type) {
        return game.items.filter(item => item.type === type).map(entity => entity.data);
    }

    static getAllCapacitiesData() {
        const compendium = game.cof.config.capacities;
        const ingame = this.getInGameEntitiesDataOfType("capacity");
        return ingame.concat(compendium);
    }

    static getAllPathsData() {
        const compendium = game.cof.config.paths;
        const ingame = this.getInGameEntitiesDataOfType("path");
        return ingame.concat(compendium);
    }

    static getAllProfilesData() {
        const compendium = game.cof.config.profiles;
        const ingame = this.getInGameEntitiesDataOfType("profile");
        return ingame.concat(compendium);
    }

    static getAllSpeciesData() {
        const compendium = game.cof.config.species;
        const ingame = this.getInGameEntitiesDataOfType("species");
        return ingame.concat(compendium);
    }

    static findTargetToken(id) {
        if (!id) return undefined;
        return canvas.tokens.placeables.find(token => token.data._id === id);
    }

    // Hostile is -1, Friendly is +1
    // optional exclude id.
    static getTokensForDisposition(disposition, excludeId = undefined) {
        return canvas.tokens.placeables.filter(token => token.visible && token.data.disposition === disposition && (token.data._id !== excludeId));
    }

    static getTokenName(token) {
        return (token.data.displayName === 30 || token.data.displayName === 50) ? token.name : "???";
    }

    static rollResultToString(r) {
        let diceResult = "";
        for (const term of r.terms) {
            if ((typeof term) === "string" || (typeof term) === "number") {
                diceResult += `${term} `;
                continue;
            }
            for (const res of term.results) {
                diceResult += !diceResult.length || diceResult.endsWith(" + ") ? `(${res.result}) ` : `+ (${res.result}) `;
            }
        }
        return diceResult;
    }

    static async confirm(title, content){        
        return new Promise((resolve => {
            Dialog.confirm({
                title: title,
                content: content,
                yes: () => resolve(true),
                no: () => resolve(false),
                defaultYes: false
            });
        }));        
    }

}
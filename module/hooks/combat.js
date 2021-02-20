import { CofRoll } from "../controllers/roll.js";
import { Macros } from "../system/macros.js";
import { Traversal } from "../utils/traversal.js";

 
const updateCombattant = (combatant, combat, progress) => {

    let updates = [] 
    combatant.actor.effects.forEach(effect => {
        if(!effect.isTemporary){
            return;
        }
        if(!effect.data.duration){
            return;
        }
        if(combat._id != effect.data.duration.combat ){
            return;
        }
        const start = effect.data.duration.startRound + effect.data.duration.startTurn * 0.1;
        const current = combat.current.round + combat.current.turn * 0.1;
        const duration = effect.data.duration.rounds + effect.data.duration.turns * 0.1;
        const elapsed = current - start;
        const diff = elapsed - duration;
        if (diff >= 0 || elapsed < 0) {
            if(!effect.data.disabled){
                updates.push({ _id: effect.data._id, disabled: true });
                ChatMessage.create({
                    content: `${effect.data.label} ${game.i18n.localize("COF.message.dissipate")} ${combatant.actor.data.name}.`
                });            
            }
        } else {
            if(effect.data.disabled){
                updates.push({ _id: effect.data._id, disabled: false });
            }
        }
    });
    if(updates.length){
        combatant.actor.updateEmbeddedEntity("ActiveEffect", updates);
    }
}

Hooks.on('preUpdateCombat', (combat, snap, progress ) => {   
    combat.combatants.forEach(combattant =>{
        updateCombattant(combattant, combat, progress);
    });
});

Hooks.on('createCombatant', (combat, snap, progress ) => {   
    let actor = canvas.tokens.placeables.find((t) => t.data._id === snap.tokenId).actor;
    actor.updateForCombat().then(()=>{ui.hotbar.render()});
});

Hooks.on('updateCombat', (combat, snap, progress) => {  
    if(snap.round){
        combat.combatants.forEach(combatant =>{
            combatant.actor.updateForRound().then(()=>{ui.hotbar.render()});
        });
    } 
    if(combat.combatant) {
        for (const effect of combat.combatant.actor.data.effects) {
            if(effect.disabled){
                continue;
            }
            for (const change of effect.changes) {
                if(change.key != "dot"){
                    continue;                    
                }
                const action = {
                    label: effect.label,
                    img: effect.icon,
                    damageRoll:{
                        formula: change.value,
                        type: "damage"
                    }
                };                
                let source = Traversal.findSourceToken(effect.flags.source);                
                const target = Traversal.findSourceToken(combat.combatant.actor._id);
                if(!source){
                    source = target;
                }
                CofRoll.makeRoll(source.actor, source, [target], action);                
            }            
        } 
    }
});

Hooks.on("CWCalendar.newDay", (time) => { 
    game.actors.forEach((a) => {
        a.updateForDay().then(() => ui.hotbar.render());
    });   
});


Hooks.on('deleteCombat', (combat, snap, progress) => {   
    combat.combatants.forEach(combatant =>{
        let updates = [] 
        combatant.actor.updateForCombat().then(()=>{ui.hotbar.render()});;
        combatant.actor.effects.forEach(effect => {
            if(combat._id != effect.data.duration.combat ){
                return;
            }
            // TODO, we may want to transform round base duration to world time once the combat is done
            updates.push(effect.data._id);
            //combatant.actor.deleteEmbeddedEntity("ActiveEffect", effect.data._id);
        });
        if(updates.length){
            combatant.actor.deleteEmbeddedEntity("ActiveEffect", updates);
        }
    });
    
});

 
 
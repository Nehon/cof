

import {Stats} from "../system/stats.js";

// Hook for custom ActiveEffect
// support for value of string type with "@<attribute path> like @stats.cha.mod"
Hooks.on('applyActiveEffect', (actor, change) => {   
    //console.log("Hooked applyActiveEffect", actor, change);
    if(change.effect.data.disabled){
        return;
    }
    // effects that apply to stats trigger a mod recomputation
    const recomputeMods = change.key.startsWith('data.stats');
    const value = parseInt(change.value, 10);
    if( isNaN(value) ) {
        const attr = change.value.replace('@', '');
        change.value = Stats.getObjectValueForPath(actor.data.data, attr);
    }
    change.mode = 2;
    change.effect.apply(actor, change);
    if(recomputeMods){
        // recompute the mods if needed
        actor.computeMods(actor.data);
    }
});

/**
 * Extend the base ActiveEffect entity, overriding the prepareData methos
 * @extends {ActiveEffect}
 */
export class CofEffect extends ActiveEffect {

      /** @override */
      prepareData() {
        //  - an effect that affects a "stat" needs to be applied first also mods 
        //    will have to be recomputed when the effect is applied. So we force its mode to 0 (custom) and force priority to 0.
        //  - Effects that affects the other attributes are applied with lower priority (5)
        //  - Effects that don't have a numeric value (because they have a value of type "@<attribute path>") 
        //    are set to custom mode too and the value is resolved in the applyActiveEffect hook
        for(let change of this.data.changes){             
              if( change.mode === 0){
                  continue;
              }
              if(change.key.startsWith('data.stats')){                  
                  change.mode = 0;                  
                  change.priority = 0;
              } else {
                  change.priority = 5;
              }
              const value = parseInt(change.value, 10);
              if(isNaN(value)) {
                  change.mode = 0;
              }
          }
      }

    

}
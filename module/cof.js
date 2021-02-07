/**
 * A simple and flexible system for world-building using an arbitrary collection of character and item attributes
 * Author: Atropos
 * Software License: GNU GPLv3
 */

// Import Modules
import { CofActor } from "./actors/actor.js";
import { CofItem } from "./items/item.js";
import { CofEffect } from "./effects/effect.js";

import { CofItemSheet } from "./items/item-sheet.js";
import { CofCharacterSheet } from "./actors/character-sheet.js";
import { CofEncounterSheet } from "./actors/encounter-sheet.js";

import { preloadHandlebarsTemplates } from "./templates.js";
import { registerHandlebarsHelpers } from "./helpers.js";
import { registerSystemSettings } from "./settings.js";
import { System, COF } from "./config.js";
import { Macros } from "./system/macros.js";
import { overrides079Bugs } from "./overridesBugs.js";
import { overrideTokenRender } from "./hooks/tokenOverride.js";
import { DefaultVFX } from "./visualFX/defaultVFX.js";


// 0: {id: "dead", label: "EFFECT.StatusDead", icon: "icons/svg/skull.svg"}                             "Mort" -> ...
// 1: {id: "unconscious", label: "EFFECT.StatusUnconscious", icon: "icons/svg/unconscious.svg"}         "Inconscient" -> need to be healed in the hour, else dead.
// 2: {id: "sleep", label: "EFFECT.StatusAsleep", icon: "icons/svg/sleep.svg"}                          "Someil" -> no move, no action, Auto hit, critical damage -> awake after attack
// 3: {id: "stun", label: "EFFECT.StatusStunned", icon: "icons/svg/daze.svg"}                           "Etourdi" -> no action DEF-5
// 4: {id: "prone", label: "EFFECT.StatusProne", icon: "icons/svg/falling.svg"}                         "Renversé" -> ATK_MLE-5, ATK_MAG-5, ATK_RNG-5, DEF-5 / move action to remove
// 5: {id: "restrain", label: "EFFECT.StatusRestrained", icon: "icons/svg/net.svg"}                     "Immobilisé" -> use d12 instead of d20, no move
// 6: {id: "paralysis", label: "EFFECT.StatusParalysis", icon: "icons/svg/paralysis.svg"}               "Paralysé" -> no move, no action, Auto hit, critical damage
// 7: {id: "fly", label: "EFFECT.StatusFlying", icon: "icons/svg/wing.svg"}                             "Vol" -> flying.
// 8: {id: "blind", label: "EFFECT.StatusBlind", icon: "icons/svg/blind.svg"}                           "Aveuglé" -> INIT-5, ATK_MLE-5, ATK_MAG-5, ATK_RNG-10, DEF-5
// 9: {id: "deaf", label: "EFFECT.StatusDeaf", icon: "icons/svg/deaf.svg"}                              // Replaced with Disarmed "Désarmé" -> move action to get the weapon back 
// 10: {id: "silence", label: "EFFECT.StatusSilenced", icon: "icons/svg/silenced.svg"}                  "Silence" -> ATK-MAG-2
// 11: {id: "fear", label: "EFFECT.StatusFear", icon: "icons/svg/terror.svg"}                           "Peur" -> the character is forced to flee for the duration
// 12: {id: "burning", label: "EFFECT.StatusBurning", icon: "icons/svg/fire.svg"}                       "En feu" -> 1d6 DM/turn
// 13: {id: "frozen", label: "EFFECT.StatusFrozen", icon: "icons/svg/frozen.svg"}
// 14: {id: "shock", label: "EFFECT.StatusShocked", icon: "icons/svg/lightning.svg"}
// 15: {id: "corrode", label: "EFFECT.StatusCorrode", icon: "icons/svg/acid.svg"}
// 16: {id: "bleeding", label: "EFFECT.StatusBleeding", icon: "icons/svg/blood.svg"}                    "Saignement" -> nd6 DM/turn -> CON test (12 + STR(attacker)) or duration
// 17: {id: "disease", label: "EFFECT.StatusDisease", icon: "icons/svg/biohazard.svg"}                  "Maladie" -> specific case
// 18: {id: "poison", label: "EFFECT.StatusPoison", icon: "icons/svg/poison.svg"}                   
// 19: {id: "radiation", label: "EFFECT.StatusRadiation", icon: "icons/svg/radiation.svg"}
// 20: {id: "regen", label: "EFFECT.StatusRegen", icon: "icons/svg/regen.svg"}                          "Régénération" -> Small heal each end of turn (may be cancelled by specific damage)
// 21: {id: "degen", label: "EFFECT.StatusDegen", icon: "icons/svg/degen.svg"}
// 22: {id: "upgrade", label: "EFFECT.StatusUpgrade", icon: "icons/svg/upgrade.svg"}                    
// 23: {id: "downgrade", label: "EFFECT.StatusDowngrade", icon: "icons/svg/downgrade.svg"}              "Afaibli" -> use d12 instead of d20
// 24: {id: "target", label: "EFFECT.StatusTarget", icon: "icons/svg/target.svg"}
// 25: {id: "eye", label: "EFFECT.StatusMarked", icon: "icons/svg/eye.svg"}
// 26: {id: "curse", label: "EFFECT.StatusCursed", icon: "icons/svg/sun.svg"}
// 27: {id: "bless", label: "EFFECT.StatusBlessed", icon: "icons/svg/angel.svg"}
// 28: {id: "fireShield", label: "EFFECT.StatusFireShield", icon: "icons/svg/fire-shield.svg"}
// 29: {id: "coldShield", label: "EFFECT.StatusIceShield", icon: "icons/svg/ice-shield.svg"}
// 30: {id: "magicShield", label: "EFFECT.StatusMagicShield", icon: "icons/svg/mage-shield.svg"}
// 31: {id: "holyShield", label: "EFFECT.StatusHolyShield", icon: "icons/svg/holy-shield.svg"}

//
// "Surprise" "Surpris" -> no action, DEF-5 1 combat turn
// "disarmed" "Désarmé" -> move action to get the weapon back systems/cof/ui/icons/status/drop-weapon.svg

// Remove unused affects, adds missing effects, and add changes to each effect to conform to COF
const initStatusEffects = function () {
    // TODO find a way to handle
    // sleep / paralysis: no move, no action, auto hit, auto crit
    // immobilized / downgrade: d12 instead of d20
    // Fire / Bleeding / Regenerate: Hot and Dot to be handled in the combat tracker

    // Stun
    CONFIG.statusEffects[3].changes = [{ key: "data.attributes.def.buff", mode: 2, value: -5 }];

    // Prone
    CONFIG.statusEffects[4].changes = [
        { key: "data.attributes.def.buff", mode: 2, value: -5 },
        { key: "data.attacks.melee.buff", mode: 2, value: -5 },
        { key: "data.attacks.ranged.buff", mode: 2, value: -5 },
        { key: "data.attacks.magic.buff", mode: 2, value: -5 }
    ];

    // blinded
    CONFIG.statusEffects[8].changes = [
        { key: "data.attributes.def.buff", mode: 2, value: -5 },
        { key: "data.attributes.init.buff", mode: 2, value: -5 },
        { key: "data.attacks.melee.buff", mode: 2, value: -5 },
        { key: "data.attacks.ranged.buff", mode: 2, value: -10 },
        { key: "data.attacks.magic.buff", mode: 2, value: -5 }
    ];

    // replace "deaf" with "disarmed"
    CONFIG.statusEffects[9] = { id: "disarmed", label: "EFFECT.StatusDisarmed", icon: "systems/cof/ui/icons/status/drop-weapon.svg" };
    
    // Silence
    CONFIG.statusEffects[10].changes = [{ key: "data.attacks.magic.buff", mode: 2, value: -2 }];
    
    // move "bleeding" in "frozen"'s place
    CONFIG.statusEffects[13] = duplicate(CONFIG.statusEffects[16]);

    // move "disease" in "shock"'s place
    CONFIG.statusEffects[14] = duplicate(CONFIG.statusEffects[17]);

    // move "downgrade" in "bleeding"'s place
    CONFIG.statusEffects[16] = duplicate(CONFIG.statusEffects[23]);

    // add "surpise"
    CONFIG.statusEffects[17] = { 
        id: "surprise", label: "EFFECT.StatusSurprise", icon: "systems/cof/ui/icons/status/surprised.svg",
        changes: [{ key: "data.attributes.def.buff", mode: 2, value: -5 }]
    };

    // cleanup the unused ones
    CONFIG.statusEffects.splice(18, 14);
}

Hooks.once("init", async function () {

    console.info("System Initializing...");
    console.info(System.ASCII);

    DefaultVFX.initialize();

    // patching foundry bugs
    overrides079Bugs();

    // patching token render
    overrideTokenRender();

    initStatusEffects();

    /**
     * Set an initiative formula for the system
     * @type {String}
     */

    CONFIG.Combat.initiative = {
        formula: "@attributes.init.value + @stats.wis.value/100",
        decimals: 2
    };

    // Define custom Entity classes
    CONFIG.Actor.entityClass = CofActor;
    CONFIG.Item.entityClass = CofItem;
    CONFIG.ActiveEffect.entityClass = CofEffect;
    //CONFIG.time.turnTime = 1;
    
    // Create a namespace within the game global
    game.cof = {
        skin: "base",
        macros: Macros,
        config: COF
    };

    // Register sheet application classes
    Actors.unregisterSheet("core", ActorSheet);
    Items.unregisterSheet("core", ItemSheet);

    // Register actor sheets
    Actors.registerSheet("cof", CofCharacterSheet, {
        types: ["character", "npc"],
        makeDefault: true,
        label: "COF.SheetClassCharacter"
    });
    Actors.registerSheet("cof", CofEncounterSheet, {
        types: ["encounter"],
        makeDefault: true,
        label: "COF.SheetClassEncounter"
    });
    // Register item sheets
    Items.registerSheet("cof", CofItemSheet, {
        types: ["item", "capacity", "profile", "path", "species"],
        makeDefault: true,
        label: "COF.SheetClassItem"
    });

    // Register System Settings
    registerSystemSettings();

    // Preload Handlebars Templates
    preloadHandlebarsTemplates();

    // Register Handlebars helpers
    registerHandlebarsHelpers();

});

// types of DM
// Physic
// Bludgeoning
// Piercing
// Slashing
// magic
// fire
// ice
// électricity
// acid
// Psychic
// poison
// desease
// bleeding
// holy
// silver
// cursed

// Types of creature
// humanoide
// undead
// demons
// elementals
// summoned creatures
// all races

//Type of resistance
// RD                                                           // rd(5)
// def bonus                                                    // def(5)               // macro(<name>)
// bonus for resistance test                                    // test(5)              // macro(<name>)
// Halves (maybe multiplier?)                                   // x(0.5)
// Immunity                                                     // immune
// special test ( magic resistance : roll 1D6 > spell rank)     // misc(1d6>@cap.rank)  // macro(<name>)

// Exemple:
// Réduction des DM : le cube gélatineux
// réduit tous les DM de type contondant
// ou perçant de 5 points. Il est immunisé
// au DM d’électricité et d’acide.

//-> Bludgeoining {RD:5}
//-> Piercing {RD:5}
//-> electricity [Immunity]
//-> acid [Immunity]

// Damage types are handled like tags added to an item or a cpaacity. example:  Physic piercing
// Creature type are handled like tags added to an actor. example: humanoid high_elf 
// an actor can have a global RD (all damage) or resistance to specific damage
// for each type of damage/affliction the actor has a resistance entry.



// Capacity resistance roll: for each effect
// - resistanceFormula. example 1d20+@stats.dex.mod > 10 + @source.stats.cha.mod
// - resistanceEffect. type of resistance


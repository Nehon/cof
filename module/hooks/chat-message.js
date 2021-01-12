/**
 * Primary use of this hook is to intercept chat commands.
 * /char  - Begin character generation
 * /table - Roll on a table
 * /cond  - Lookup a condition
 * /name  - Generate a name
 * /avail - Start an item availability test
 * /pay - Player: Remove money from character. GM: Start a payment request
 * /credit - Player: Not allowed. GM: Start a credit request to send money to players
 * /help - display a help message on all the commands above
 */

import {CharacterGeneration} from "../system/chargen.js";
import { CofSkillRoll } from "../system/skill-roll.js";

Hooks.on("chatMessage", (html, content, msg) => {
    let regExp;
    regExp = /(\S+)/g;
    let commands = content.match(regExp);
    let command = (commands.length>0 && commands[0].split("/").length > 0) ? commands[0].split("/")[1].trim() : null;
    let arg1 = (commands.length > 1) ? commands[1].trim() : null;
    const actor = game.cof.macros.getSpeakersActor();

    const validCommands = ["for", "str", "dex", "con", "int", "sag", "wis", "cha", "atc", "melee", "atd", "ranged", "atm", "magic"];

    if(command && validCommands.includes(command)) {
        game.cof.macros.rollStatMacro(actor, command, null);
        return false;
    }
    else if(command && command === "skill") {
        if(arg1 && validCommands.includes(arg1)) {
            game.cof.macros.rollStatMacro(actor, arg1, null);
        } else {
            ui.notifications.error("Vous devez préciser la caractéristique à tester, par exemple \"/skill str\".");
        }
        return false;
    }
    else if(command && command === "stats") {
        CharacterGeneration.statsCommand();
        return false;
    }
});

Hooks.on('renderChatMessage', (message, html, data) => {   
    const fateButton =  html.find('.chat-message-fate-button');
    if(!fateButton){
        return;
    }
    fateButton.click(ev => {
        ev.stopPropagation();
        const flags = message.data.flags; 
        if(!message.isAuthor && !game.user.isGM){
            ui.notifications.error(game.i18n.localize("COF.message.fateNotAllowed"));
            return;
        }
        if(flags.rolled){
            ui.notifications.error(game.i18n.localize("COF.message.fateAlreadyRolled"));
            return;
        }
        const roll = message.roll;
        
        const actor = game.actors.get(message.data.speaker.actor);
        if(!actor){
            ui.notifications.error("No actor associated with this message");
            return;
        }
        const fp = actor.data.data.attributes.fp.value -1 
        if(fp<0){
            ui.notifications.error(game.i18n.localize("COF.message.noMoreFP"));
            return;
        }
               
        const newRoll = new CofSkillRoll(flags.label, `${roll.total}`, "0", "10", flags.difficulty, "100", flags.type, false);
        if(flags.dmgFormula){
            newRoll.weaponRoll(actor, flags.dmgFormula);
        } else {
            newRoll.roll(actor);
        }
        
        actor.update({
            "data.attributes.fp.value":fp
        });

        message.update({
            "flags.rolled": true
        });        
    });     
   
});
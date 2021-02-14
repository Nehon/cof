/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
import { Capacity } from "../controllers/capacity.js";
import { Path } from "../controllers/path.js";
import { Profile } from "../controllers/profile.js";
import { Species } from "../controllers/species.js";
import { CofRoll } from "../controllers/roll.js";
import { Traversal } from "../utils/traversal.js";
import { CofItem } from "../items/item.js";
import { MacroDispatcher } from "../system/macroDispatcher.js";

export class CofActorSheet extends ActorSheet {


    /** @override */
    getData(options) {
        let data = super.getData(options);
        data.options.isGM = game.user.isGM;
        return data;
    }

    /** @override */
    activateListeners(html) {
        super.activateListeners(html);
        this.isGM = game.user.isGM;
        // Everything below here is only needed if the sheet is editable
        if (!this.options.editable) return;

        // Click to open
        html.find('.compendium-pack').dblclick(ev => {
            ev.preventDefault();
            let li = $(ev.currentTarget), pack = game.packs.get(li.data("pack"));
            if (li.attr("data-open") === "1") pack.close();
            else {
                li.attr("data-open", "1");
                pack.render(true);
            }
        });

        if (game.user.isGM) {
            html.find('.add-effect').on('click', async (ev) => {
                let transfer = $(ev.currentTarget).data('transfer');
                let id = (
                    await this.actor.createEmbeddedEntity('ActiveEffect', {
                        label: `effec${this.actor.data.effects.length}`,
                        icon: '/icons/svg/mystery-man.svg',
                        //transfer: transfer,

                        duration: game.combat ? {
                            combat: game.combat._id,
                            rounds: 2,
                            turns: 0,
                            startRound: game.combat.current.round,
                            startTurn: game.combat.current.turn
                        } : undefined
                    })
                )._id;
                return new ActiveEffectConfig(this.actor['effects'].get(id)).render(true);
            });

            html.find('.delete-effect').on('click', async (ev) => {
                let id = $(ev.currentTarget).data('id');
                this.actor.deleteEmbeddedEntity("ActiveEffect", id);
            });

            html.find('.edit-effect').on('click', async (ev) => {
                let id = $(ev.currentTarget).data('id');
                return new ActiveEffectConfig(this.actor['effects'].get(id)).render(true);
            });
        }

        // Click to open
        html.find('.item-create.compendium-pack').click(ev => {
            ev.preventDefault();
            let li = $(ev.currentTarget), pack = game.packs.get(li.data("pack"));
            if (li.attr("data-open") === "1") pack.close();
            else {
                li.attr("data-open", "1");
                pack.render(true);
            }
        });

        // Initiate a roll
        html.find('.rollable').click(ev => {
            ev.preventDefault();
            return this._onRoll(ev);
        });

        // Check/Uncheck capacities
        html.find('.capacity-checked').click(ev => {
            ev.preventDefault();
            return Capacity.toggleCheck(this.actor, ev, true);
        });
        html.find('.capacity-unchecked').click(ev => {
            ev.preventDefault();
            return Capacity.toggleCheck(this.actor, ev, false);
        });
        html.find('.capacity-create').click(ev => {
            ev.preventDefault();
            return Capacity.create(this.actor, ev);
        });
        html.find('.capacity-toggle').click(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget).closest(".capacity");
            li.find(".capacity-description").slideToggle(200);
        });

        html.find('.capacity-nb-use').change(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget);
            const value = li.val();
            const id = li.data("item-id");

            this.object.updateEmbeddedEntity("OwnedItem", {
                _id: id,
                "data.nbUse": value
            }).then(() => ui.hotbar.render());
        });

        // Equip/Unequip items

        html.find('.item-qty').click(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.getOwnedItem(li.data("itemId"));
            let itemData = item.data;
            itemData.data.qty = (itemData.data.qty) ? itemData.data.qty + 1 : 1;
            return this.actor.updateOwnedItem(itemData).then(() => this.render(true));
        });
        html.find('.item-qty').contextmenu(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget).closest(".item");
            const item = this.actor.getOwnedItem(li.data("itemId"));
            let itemData = item.data;
            itemData.data.qty = (itemData.data.qty > 0) ? itemData.data.qty - 1 : 0;
            return this.actor.updateOwnedItem(itemData).then(() => this.render(true));
        });

        html.find('.item-name, .item-edit').click(this._onEditItem.bind(this));
        html.find('.item-delete').click(ev => {
            return this._onDeleteItem(ev);
        });
        html.find('.item-link').click(this._onLinkItem.bind(this));

        html.find('.capacity-use').click(ev => {
            ev.preventDefault();
            const li = $(ev.currentTarget);
            const id = li.closest("li").data("item-id");
            const item = this.actor.getOwnedItem(id);
            game.cof.macros.rollCapacityMacro(item.data.data.key, item.data.name);
        });

        html.find('.expandDescription').click(ev => {
            html.find('#editDescription').toggle();
        });

        const moreDetails = html.find('.moreDetails');
        const hideDescription = ev => {
            let li = $(ev.currentTarget);
            const descriptionName = li.data("desc-target");
            html.find(`#${descriptionName}`).hide();
        };

        moreDetails.hover(ev => {
            ev.preventDefault();
            let li = $(ev.currentTarget);
            const id = li.data("item-id");
            const descriptionName = li.data("desc-target");
            let item = this.actor.getItemById(id);
            if (!item) {
                item = game.cof.config.capacities.find(i => i._id === id);
            }

            let desc = item.data.description;
            let name = item.name;
            let img = item.img;

            var pos = li.offset();

            let tt = html.find(`#${descriptionName}`)
            tt.find("#desc-title").html(name);
            tt.find("#desc-content").html(desc);
            tt.find("#desc-img").attr("src", img);
            tt.show();
            const left = pos.left - 325;
            tt.css({ top: `${pos.top}px`, left: `${left}px` });
        },
            hideDescription
        );
        moreDetails.on("mousedown", hideDescription);
        moreDetails.on("dragstart", ev => {
            let li = $(ev.currentTarget);
            const itemId = li.data("itemId");
            const parent = li.parent()[0];
            if (!parent.classList.value.includes("equipment-slot")) {
                return;
            }
            const dragData = {
                actorId: this.actor.id,
                itemId: itemId,
                type: "Item",
                source: "equipment-slot"
            };
            ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dragData));
        });
        
        moreDetails.click(ev => {
            ev.preventDefault();
            let li = $(ev.currentTarget);
            const id = li.data("item-id");
            const item = this.actor.getOwnedItem(id);
            if(!item){
                return;
            }
            game.cof.macros.rollItemMacro(item._id, item.name, "item");            
        })

        const inventory = html.find('.inventory');
        new ContextMenu(inventory, ".action-menu", [
            {
                name: "ITEM.Roll",
                icon: '<i class="fas fa-dice-d20"></i>',
                condition: li => {
                    return this.actor.owner;
                },
                callback: li => {
                    const item = this.actor.getOwnedItem(li.find(".item").data("item-id"));
                    game.cof.macros.rollItemMacro(item._id, item.name, "item");
                }
            },
            {
                name: "ITEM.Edit",
                icon: '<i class="fas fa-edit"></i>',
                condition: li => {
                    return this.actor.owner;
                },
                callback: li => {
                    this.editItem(li.find(".item"));
                }
            },
            {
                name: "ITEM.Equip",
                icon: '<i class="fas fa-link"></i>',
                condition: li => {
                    const item = this.actor.getOwnedItem(li.find(".item").data("item-id"));
                    const equippable = item.data.data.properties && item.data.data.properties.equipable && !item.data.data.worn;
                    return this.actor.owner && equippable;
                },
                callback: li => {
                    const id = li.find(".item").data("item-id");
                    this.equipItemInSlot(id, this.findEmptySlot(id));                    
                }
            },
            {
                name: "ITEM.Unequip",
                icon: '<i class="fas fa-unlink"></i>',
                condition: li => {
                    const item = this.actor.getOwnedItem(li.find(".item").data("item-id"));
                    const equipped = item.data.data.worn;
                    return this.actor.owner && equipped;
                },
                callback: li => {
                     this.unEquipItem(undefined, {itemId:li.find(".item").data("item-id")});
                }
            },
            {
                name: "ITEM.Link",
                icon: '<i class="fas fa-comment"></i>',                
                callback: li => {
                    const id = li.find(".item").data("item-id");
                    const item = this.actor.getItemById(id);
                    CofItem.logItem(item, this.actor);                    
                }
            },
            {
                name: "ITEM.Delete",
                icon: '<i class="fas fa-trash"></i>',
                condition: li => {
                    const equipped = li.hasClass("equipment-slot");
                    return this.actor.owner && !equipped;
                },
                callback: async li => {
                    const id = li.find(".item").data("item-id");
                    const item = this.actor.getOwnedItem(id);
                    if (!(await Traversal.confirm(
                        game.i18n.localize("COF.notification.deleteItem"),
                        `${game.i18n.localize("COF.notification.deleteItemConfirm")} <strong>${item.name}</strong>`))) {
                        return;
                    }
                    this.actor.deleteEmbeddedEntity("OwnedItem", id);
                }
            },
        ]);

    }

    async _onEditItem(event) {
        event.preventDefault();
        const li = $(event.currentTarget).parents(".item");
        this.editItem(li);
    }

    async editItem(li) {
        const id = li.data("itemId");
        const type = (li.data("itemType")) ? li.data("itemType") : "item";
        const pack = (li.data("pack")) ? li.data("pack") : null;

        let entity = null;
        // look first in actor onwed items
        entity = this.actor.getOwnedItem(id);
        if (!entity) {
            // look into world/compendiums items
            entity = await Traversal.getEntity(id, type, pack);
        }
        if (entity) return entity.sheet.render(true);
    }

    /* -------------------------------------------- */

    async _onLinkItem(ev) {
        ev.preventDefault();
        const li = $(ev.currentTarget).closest(".item");
        const id = li.data("itemId");
        const actor = this.object;

        const item = actor.getItemById(id);

        if (!item) {
            return;
        }
        CofItem.logItem(item, actor);
    }


    /* -------------------------------------------- */
    /* DELETE EVENTS CALLBACKS                      */
    /* -------------------------------------------- */

    /**
     * Callback on delete item actions
     * @param event the roll event
     * @private
     */
    _onDeleteItem(event) {
        event.preventDefault();
        const li = $(event.currentTarget).parents(".item");
        const itemId = li.data("itemId");
        const entity = this.actor.items.find(item => item._id === itemId);
        switch (entity.data.type) {
            case "capacity":
                return this.actor.deleteOwnedItem(itemId);
                // return Capacity.removeFromActor(this.actor, event, entity);
                break;
            case "path":
                return Path.removeFromActor(this.actor, event, entity);
                break;
            case "profile":
                return Profile.removeFromActor(this.actor, event, entity);
                break;
            case "species":
                return Species.removeFromActor(this.actor, event, entity);
                break;
            default: {
                return this.actor.deleteOwnedItem(itemId);
            }
        }
    }

    /* -------------------------------------------- */
    /* ROLL EVENTS CALLBACKS                        */
    /* -------------------------------------------- */

    /**
     * Initiates a roll from any kind depending on the "data-roll-type" attribute
     * @param event the roll event
     * @private
     */
    _onRoll(event) {
        const elt = $(event.currentTarget)[0];
        const rolltype = elt.attributes["data-roll-type"].value;
        switch (rolltype) {
            case "skillcheck":
                return CofRoll.skillCheck(this.getData().data, this.actor, event);
                break;
            case "weapon":
                return CofRoll.rollWeapon(this.getData().data, this.actor, event);
                break;
            case "encounter-weapon":
                return CofRoll.rollEncounterWeapon(this.getData().data, this.actor, event);
                break;
            case "encounter-damage":
                return CofRoll.rollEncounterDamage(this.getData().data, this.actor, event);
                break;
            case "spell":
                return CofRoll.rollSpell(this.getData().data, this.actor, event);
                break;
            case "damage":
                return CofRoll.rollDamage(this.getData().data, this.actor, event);
                break;
            case "hp":
                return CofRoll.rollHitPoints(this.getData().data, this.actor, event);
                break;
            case "attributes":
                return CofRoll.rollAttributes(this.getData().data, this.actor, event);
                break;
        }
    }

    /* -------------------------------------------- */
    /* DROP EVENTS CALLBACKS                        */
    /* -------------------------------------------- */

    equipItem(event, item) {
        const elt = $(event.srcElement);
        const slotId = elt.data("slot");
        const id = elt.attr("id");
        let itemData = item.data;
        if (item.itemId) {
            itemData = this.actor.getOwnedItem(item.itemId).data;
        }

        if (!itemData.data.properties || !itemData.data.properties.equipable) {
            ui.notifications.error(`${game.i18n.localize("COF.notification.notEquipable")} (${item.name})`);
            return;
        }
        if (id) {
            if (id.toLowerCase().indexOf(itemData.data.slot) < 0) {
                ui.notifications.error(`${game.i18n.localize("COF.notification.invalidSlot")} "${id}", (${itemData.data.slot})`);
                return;
            }
        }
        this.equipItemInSlot(itemData._id, slotId);        
    }

    findEmptySlot(itemId){
        let slot = 0;
        const item = this.actor.getOwnedItem(itemId);
        const equipped = this.actor.data.items.filter(i => i.data.worn);
        switch(item.data.data.slot) {
            case "hand":              
                const righthand  = equipped.find(i => i.flags.equipSlot === 8);
                return righthand ? 9 : 8;
            case "head": return 10;
            case "chest": return 11;
            case "legs": return 12;
            case "feet": return 13;
            default:
                const slots = equipped.map(i => i.flags.equipSlot);
                for (let i = 0; i < 8; i++) {
                    if(!slots.includes(i)){
                        return i;
                    }
                }
        }
        return slot;
    }

    equipItemInSlot(id, slotId){
        const equipped = this.actor.data.items.filter(i => i.data.worn);
        const oldEquip  = equipped.find(i => i.flags.equipSlot === slotId);
        let data = [];
        if(oldEquip){
            data.push({
                _id: oldEquip._id,
                data:{
                    worn: false
                },
                flags:{
                    equipSlot:null
                }
            });
        }
        data.push({
            _id: id,
            data:{
                worn: true
            },
            flags:{
                equipSlot:slotId  
            }
        });
        return this.actor.updateOwnedItem(data).then(() => this.render(true));
    }

    async unEquipItem(event, data) {

        const item = this.actor.getOwnedItem(data.itemId);

        if (!(await Traversal.confirm(
            game.i18n.localize("COF.notification.unequip"),
            `${game.i18n.localize("COF.notification.unequipConfirm")} ${item.name}`))) {
            return;
        }

        const itemData = {
            _id: data.itemId,
            data: {
                worn: false,
                flags: {
                    equipSlot: null
                }
            }
        }
        return this.actor.updateOwnedItem(itemData).then(() => this.render(true));
    }

    /** @override */
    async _onDrop(event) {
        event.preventDefault();
        // Get dropped data
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        } catch (err) {
            return false;
        }
        if (!data) return false;

        // Case 1 - Dropped Item
        if (data.type === "Item") {
            if (event.srcElement.classList.value.includes("equipment-slot")
                || event.srcElement.parentElement.classList.value.includes("equipment-slot")) {
                this.equipItem(event, data);
                return;
            }

            if (data.source === "equipment-slot") {
                this.unEquipItem(event, data);
                return;
            }
            return this._onDropItem(event, data);
        }

        // Case 2 - Dropped Actor
        if (data.type === "Actor") {
            return this._onDropActor(event, data);
        }
    }

    /**
     * Handle dropping an Actor on the sheet to trigger a Polymorph workflow
     * @param {DragEvent} event   The drop event
     * @param {Object} data       The data transfer
     * @private
     */
    async _onDropActor(event, data) {
        return false;
    }

    /**
     * Handle dropping of an item reference or item data onto an Actor Sheet
     * @param {DragEvent} event     The concluding DragEvent which contains drop data
     * @param {Object} data         The data transfer extracted from the event
     * @return {Object}             OwnedItem data to create
     * @private
     */
    async _onDropItem(event, data) {
        if (!this.actor.owner) return false;
        // let authorized = true;

        // let itemData = await this._getItemDropData(event, data);
        const item = await Item.fromDropData(data);
        const itemData = duplicate(item.data);
        switch (itemData.type) {
            case "path":
                return await Path.addToActor(this.actor, event, itemData);
            case "profile":
                return await Profile.addToActor(this.actor, event, itemData);
            case "species":
                return await Species.addToActor(this.actor, event, itemData);
            case "capacity":
            case "shield":
            case "armor":
            case "melee":
            case "ranged":
            default:
                // activate the capacity as it is droped on an actor sheet
                // if (itemData.type === "capacity") itemData.data.checked = true;
                // Handle item sorting within the same Actor
                const actor = this.actor;
                let sameActor = (data.actorId === actor._id) || (actor.isToken && (data.tokenId === actor.token.id));
                if (sameActor) return this._onSortItem(event, itemData);
                // Create the owned item
                return this.actor.createEmbeddedEntity("OwnedItem", itemData);
        }
        // if (authorized) {
        //     // Handle item sorting within the same Actor
        //     const actor = this.actor;
        //     let sameActor = (data.actorId === actor._id) || (actor.isToken && (data.tokenId === actor.token.id));
        //     if (sameActor) return this._onSortItem(event, itemData);
        //     // Create the owned item
        //     return this.actor.createEmbeddedEntity("OwnedItem", itemData);
        // } else {
        //     return false;
        // }
    }

    /* -------------------------------------------- */

    /** @override */
    setPosition(options = {}) {
        const position = super.setPosition(options);
        const sheetBody = this.element.find(".sheet-body");
        const bodyHeight = position.height - 192;
        sheetBody.css("height", bodyHeight);
        return position;
    }

}

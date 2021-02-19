
const mouseWheelEvent = function (event) {
    if (event.data.button !== 1) {
        return event;
    }
    // emulate alt+leftclick on mousewheel click
    event.data.button = 0;
    event.data.originalEvent = {
        button: 0,
        altKey: true,
        shiftKey: event.data.originalEvent.shiftKey,
        ctrlKey: event.data.originalEvent.ctrlKey
    }
    return event;
}

export const overrideTokenRender = function () {

    /* Draw a status effect icon
    * @return {Promise<void>}
    * @private
    */
    Token.prototype._drawEffect = async function (src, i, bg, w, tint) {
        let tex = await loadTexture(src);
        let icon = this.effects.addChild(new PIXI.Sprite(tex));
        w *= 5;
        w /= 3;
        icon.width = icon.height = w;
        const nr = Math.floor(this.data.height * 3);
        icon.x = (i % nr) * (w + 4) - 3;
        icon.y = Math.floor(i / nr) * (w + 4) - 3;
        if (tint) icon.tint = tint;
        bg.drawRoundedRect(icon.x - 1, icon.y - 1, w + 2, w + 2, 2);
        this.effects.addChild(icon);
    }

    const backupFuncDown = MouseInteractionManager.prototype._handleMouseDown;
    MouseInteractionManager.prototype._handleMouseDown = function (event) {
        return backupFuncDown.call(this, mouseWheelEvent(event));
    }

    const backupFuncUp = MouseInteractionManager.prototype._handleMouseUp;
    MouseInteractionManager.prototype._handleMouseUp = function (event) {
        return backupFuncUp.call(this, mouseWheelEvent(event));
    }
}
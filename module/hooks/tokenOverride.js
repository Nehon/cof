export const overrideTokenRender = function(){

    /* Draw a status effect icon
    * @return {Promise<void>}
    * @private
    */
    Token.prototype._drawEffect= async function(src, i, bg, w, tint) {        
        let tex = await loadTexture(src);
        let icon = this.effects.addChild(new PIXI.Sprite(tex));
        w *= 5;
        w /= 3;
        icon.width = icon.height = w;
        const nr = Math.floor(this.data.height * 3);
        icon.x = (i % nr) * (w + 4) - 3;
        icon.y = Math.floor(i / nr) * (w + 4) - 3 ;
        if ( tint ) icon.tint = tint;
        bg.drawRoundedRect(icon.x - 1, icon.y - 1, w + 2, w + 2, 2);
        this.effects.addChild(icon);
    }


}
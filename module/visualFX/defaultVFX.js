export class DefaultVFX {
    static initialize() {
        this.default = {
            angle: 0,
        }

        this.baseAttackVFX = [
            {
                file: "modules/cof-plus/assets/effects/CrossImpact.webm",
                brightness: 1.3,
                anchor: {
                    x: 0.45,
                    y: 0.5
                },
                scale: {
                    x: 0.7,
                    y: 0.7
                }
            },
            {
                file: "modules/cof-plus/assets/effects/DownwardClaw.webm",
                playbackRate: 1.2,
                anchor: {
                    x: 0.4,
                    y: 0.5
                },
            },
            {
                file: "modules/cof-plus/assets/effects/UpwardClaw.webm",
                playbackRate: 1.2,
            },
            {
                file: "modules/cof-plus/assets/effects/GlowImpact.webm",
            },
            {
                file: "modules/cof-plus/assets/effects/PinkImpact.webm",
                scale: {
                    x: 0.7,
                    y: 0.7
                }
            },
            {
                file: "modules/cof-plus/assets/effects/bludgeoning_1.webm",
                playbackRate: 1.1,
                brightness: 1.2,
            },
            {
                file: "modules/cof-plus/assets/effects/bludgeoning_2.webm",
                mask: {
                    type: "circle",
                    blurSize: 32,
                    anchor: {
                        x: 0.5,
                        y: 0.5
                    },
                    size: {
                        w: 0.85,
                        h: 0.85
                    }
                }
            }
        ];

        this.baseHealVFX = [
            {
                file: "modules/cof-plus/assets/effects/DefaultHeal.webm",
                brightness: 3.0,
                scale: {
                    x: 1.5,
                    y: 1.5
                }
            }
        ];
    }

    static playRandomAttack(target) {
        let fx = duplicate(this.default);
        mergeObject(fx, this.baseAttackVFX[Math.floor(Math.random() * this.baseAttackVFX.length)]);
        const halfCell = game.scenes.viewed.data.grid * 0.5;
        fx.position = {
            x: target.x + halfCell,
            y: target.y + halfCell
        }
        console.log(fx);
        canvas.fxmaster.playVideo(fx);
        game.socket.emit('module.fxmaster', fx);
    }

     static playRandomHeal(sourceToken) {
        let fx = duplicate(this.default);
        mergeObject(fx, this.baseHealVFX[Math.floor(Math.random() * this.baseHealVFX.length)]);
        const halfCell = game.scenes.viewed.data.grid * 0.5;
        fx.position = {
            x: sourceToken.x + halfCell,
            y: sourceToken.y + halfCell
        }
        console.log(fx);
        canvas.fxmaster.playVideo(fx);
        game.socket.emit('module.fxmaster', fx);
    }

};


const preloadFile = function(url){
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = 'blob';

    req.onload = function () {
        // Onload is triggered even on 404
        // so we need to check the status code
        if (this.status === 200) {
            var videoBlob = this.response;
            var vid = URL.createObjectURL(videoBlob); // IE10+
            canvas.fxmaster.resourceMap.set(url, vid);
        }
    }
    req.onerror = function () {
        // Error
    }

    req.send();
}

const preloadResources = async function(){
  // preload resources
  canvas.fxmaster.resourceMap = new Map();

  //\s*file\s*:\s*"([^"]*)"
  const macroCompendiums = game.packs.filter(c => c.metadata.entity === "Macro");
  const reg = new RegExp(/\s*file\s*:\s*"([^"]*)"/g);
  for (const compendium of macroCompendiums) {
      const content = await compendium.getContent();
      for (const macro of content) {
        if(!macro.name.endsWith("onVisualEffect")){
          continue;
        }
        let m;
        while(m = reg.exec(macro.data.command)){
            preloadFile(m[1]);
        }
        
      }
  }
}

export const FXMasterOverride = function () {
  if (!canvas.fxmaster) { return; }
  
  preloadResources();

  canvas.fxmaster.playVideo = function (data) {

    // Set default values
    data = mergeObject({
      anchor: { x: 0.5, y: 0.5 },
      rotation: 0,
      scale: { x: 1.0, y: 1.0 },
      position: { x: 0, y: 0 },
      playbackRate: 1.0,
      ease: "Linear"
    }, data);

    // Create video
    var video = document.createElement("video");
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const blob = canvas.fxmaster.resourceMap.get(data.file);
    if(blob){
      console.log("found video file in the cache", data.file);
      video.src = blob;  
    } else {
      console.log("downloading file", data.file);
      video.src = data.file;
    }
    
    video.playbackRate = data.playbackRate;
    video.volume = 0.2;

    // Create PIXI sprite
    var container;
    var vidSprite;
    var mask;


    // setTimeout(() => {
    //   video.pause();
    //   video.currentTime=0;
    //     this.removeChild(vidSprite);      
    //   vidSprite.destroy();
    //   if(mask){
    //     this.removeChild(mask);
    //     mask.destroy();
    //   }      
    // },3000);

    video.oncanplaythrough = () => {  
      const texture = PIXI.Texture.from(video);
      vidSprite = new PIXI.Sprite(texture);
      this.addChild(vidSprite);

      if(data.mask){
        const blurSize = data.mask.blurSize | 0;
        let pattern;
        switch(data.mask.type){
          case "circle":
            const radius = vidSprite.width * data.mask.size.w * 0.5;       
            pattern = new PIXI.Graphics()
            .beginFill(0xFF0000)          
            .drawCircle(vidSprite.width * data.mask.anchor.x , vidSprite.height * data.mask.anchor.y, radius)          
            .endFill()
            .lineStyle(vidSprite.width/20.0, 0x00000,1)
            .beginFill(0x000000,0.0)          
            .drawRect(0, 0, vidSprite.width, vidSprite.height)
            .endFill();
            break;
          case "token":
            const width = game.scenes.viewed.data.grid / data.scale.x;
            const height = game.scenes.viewed.data.grid / data.scale.y;
            pattern = new PIXI.Graphics()
            .beginFill(0xFF0000)          
            .drawRect(0, 0, vidSprite.width, vidSprite.height)
            .endFill()            
            .beginFill(0x000000)          
            .drawRect((vidSprite.width - width) * 0.5, (vidSprite.height - height) * 0.5, width, height)
            .endFill()
            .lineStyle(vidSprite.width/20.0, 0x00000,1)
            .beginFill(0x000000,0.0)          
            .drawRect(0, 0, vidSprite.width, vidSprite.height)
            .endFill();            
            break;
        }        
          
        pattern.filters = [new PIXI.filters.BlurFilter(blurSize)];
        const bounds = new PIXI.Rectangle(0, 0, vidSprite.width, vidSprite.height);
        const tex = canvas.app.renderer.generateTexture(pattern, PIXI.SCALE_MODES.NEAREST, 1, bounds);
        mask = new PIXI.Sprite(tex);

        mask.anchor.set(data.anchor.x, data.anchor.y);        
        mask.rotation = normalizeRadians(data.rotation - toRadians(data.angle));
        mask.scale.set(data.scale.x, data.scale.y);
        mask.position.set(data.position.x, data.position.y);
        this.addChild(mask);
        vidSprite.mask = mask;
      }

      // Set values
      vidSprite.anchor.set(data.anchor.x, data.anchor.y);
      vidSprite.rotation = normalizeRadians(data.rotation - toRadians(data.angle));
      vidSprite.scale.set(data.scale.x, data.scale.y);
      vidSprite.position.set(data.position.x, data.position.y);

      if( data.brightness){
         vidSprite.filters = [new PIXI.filters.ColorMatrixFilter()];
         vidSprite.filters[0].brightness(data.brightness);
      }


      if ((!data.speed || data.speed === 0) && !data.distance) {
        return;
      }
      if (data.distance) {
        data.speed = data.distance / video.duration;
      }
      // Compute final position
      const delta = video.duration * data.speed;
      const deltaX = delta * Math.cos(data.rotation)
      const deltaY = delta * Math.sin(data.rotation)

      // Move the sprite
      const attributes = [{
        parent: vidSprite, attribute: 'x', to: data.position.x + deltaX
      }, {
        parent: vidSprite, attribute: 'y', to: data.position.y + deltaY
      }
      ];
      let animationDuration = video.duration * 1000;
      animationDuration -= Math.max(0, 1000 * (data.animationDelay.end + data.animationDelay.start));
      const animate = function () {
        FXCanvasAnimation.animateSmooth(attributes, {
          name: `fxmaster.video.${randomID()}.move`,
          context: this,
          duration: animationDuration,
          ease: easeFunctions[data.ease]
        })
      }
      if (hasProperty(data, "animationDelay.start")) {
        setTimeout(animate, data.animationDelay.start * 1000.0);
      } else {
        animate();
      }
    };

    video.onerror = () => {
      this.removeChild(vidSprite);      
      vidSprite.destroy();
      if(mask){
        this.removeChild(mask);
        mask.destroy();
      }
    }
    video.onended = () => {

      // if(data.loop){
      //   data.loop--;
      //   console.log("remaining loop:", data.loop);
      //   video.currentTime = 0;
      //   video.play();        
      //   return;
      // }
      // console.log("ending video", data.loop);
     

      this.removeChild(vidSprite);      
      vidSprite.destroy();
      if(mask){
        this.removeChild(mask);
        mask.destroy();
      }      
      //video.src = "";
    }
  }
}

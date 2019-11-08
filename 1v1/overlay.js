var VideoOverlay = function(options){
    if (this === window) { return new Overlay(options); }
    this.options = options || {};
    this.options.timeOffset = this.options.timeOffset || -48;
    this.options.timeTollerance = this.options.timeTollerance || 8;
    this.options.scale = this.options.scale || 1;
    this.options.source = this.options.source || 'source';  // Video source to overlay target on
    this.options.canvas = this.options.canvas || 'canvas';  // Canvas to draw overlay on
    this.options.target = this.options.target || 'target';  // Target to overlay on top of source
    this.options.targetOffsetX = this.options.targetOffsetX || 0;
    this.options.targetOffsetY = this.options.targetOffsetY || 0;
    this.options.keyframes = this.options.keyframes || { times: [], position: [] };
    this.options.keyframeSource = this.options.keyframeSource || "DancingGorrila.json";
    this.video = document.getElementById(this.options.source) || document.getElementsByTagName('video')[0];
    this.canvas = document.getElementById(this.options.canvas) || document.getElementsByTagName('canvas')[0];
    this.target = document.getElementById(this.options.target)|| document.getElementsByTagName('img')[0];
    if(this.canvas) this.ctx = this.canvas.getContext("2d");
    this.keyframeIndex = -1;
    this.start = null;
    this.lastFrametime = -1;
    if(this.video){
        var self = this;
        this.video.addEventListener('playing', (event) => {
            self.keyframeIndex = 0;
            self.start = this.lastFrametime;
            console.log('Video started playing or looped');
        });
        window.requestAnimationFrame(this.frameCallback.bind(this));
    }
};

VideoOverlay.prototype = {
    drawFrame: function(ctx){
        var x = this.targetX - this.target.width/2 * this.scaleX;
        var y = this.targetY - this.target.height/2 * this.scaleY;
        var w = this.target.width * this.scaleX;
        var h = this.target.height * this.scaleY;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if(this.options.clip){
            ctx.beginPath();
            // TODO: If clip is a function then call passing in the current ctx and Overlay instance to allow dynamic clipping
            ctx.arc(x+w/2, y+h/2, w/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.closePath();
            ctx.globalCompositeOperation = 'source-in';    
        }
        ctx.drawImage(this.target, x, y, w, h);
        ctx.globalCompositeOperation = 'source-over';
    },
    resizeCanvas: function(w,h){
        if(this.canvas && (this.canvas.width != w || this.canvas.height != h)){
            this.canvas.width = w;
            this.canvas.height = h;
        }
    }
};

VideoOverlay.prototype.frameCallback = function(timestamp){
    this.lastFrametime = timestamp;
    if(this.video) this.resizeCanvas(this.video.offsetWidth, this.video.offsetHeight);
    if(this.start && this.video && !this.video.paused && !this.video.ended){
        var progress = timestamp - this.start + this.options.timeOffset;
        var lastIndex = this.keyframeIndex;
        var lastVideoTime = this.videoTime;
        this.videoTime = this.video.currentTime;
        if(lastVideoTime != this.videoTime && this.options.keyframes.times.length > 0){
            var keyframeTime = -1;
            var timeMap = this.options.keyframes.times.map((f,i) => {
                return {
                    index: i,
                    delta: Math.abs(progress - f * 1000)
                };
            });
            timeMap.sort((a,b) => a.delta - b.delta);
            if(timeMap[0].delta < this.options.timeTollerance){
                this.keyframeIndex = timeMap[0].index;
                keyframeTime = this.options.keyframes.times[this.keyframeIndex] * 1000;
                var position = this.options.keyframes.position[this.keyframeIndex];
                if(lastIndex != this.keyframeIndex && this.options.target && position){
                    this.scaleX = this.options.scale * this.video.clientWidth / this.video.videoWidth;
                    this.scaleY = this.options.scale * this.video.clientHeight / this.video.videoHeight;
                    this.targetX = ((position[1] + this.options.targetOffsetX) * this.scaleX).toFixed(0);
                    this.targetY = ((position[2] + this.options.targetOffsetY) * this.scaleY).toFixed(0);
                    this.drawFrame(this.ctx);
                }
            }
        }
        if(this.options.keyframes.times.length <= this.keyframeIndex) this.keyframeIndex = 0;
    }
    // Bind with this instance
    window.requestAnimationFrame(this.frameCallback.bind(this));
};
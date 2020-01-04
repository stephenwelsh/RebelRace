// Good example of class structure: https://github.com/allensarkisyan/VideoFrame/blob/master/VideoFrame.js

var VideoOverlay = function(options){
    if (this === window) { return new Overlay(options); }
    this.options = options || {};
    this.options.timeOffset = (this.options.timeOffset || 0)/1000;
    this.options.timeTollerance = this.options.timeTollerance || 8;
    this.options.scale = this.options.scale || 1;
    this.options.source = this.options.source || 'source';  // Video source to overlay target on
    this.options.target = this.options.target || 'target';  // Target to overlay on top of source
    this.options.targetOffsetX = this.options.targetOffsetX || 0;
    this.options.targetOffsetY = this.options.targetOffsetY || 0;
    this.options.keyframes = this.options.keyframes || { times: [], position: [] };
    this.video = document.getElementById(this.options.source) || document.getElementsByTagName('video')[0];
    this.target = document.getElementById(this.options.target)|| document.getElementsByTagName('img')[0];
    this.keyframeIndex = -1;
    this.target.originalWidth = this.target.clientWidth;
    this.target.originalHeight = this.target.clientHeight;

    window.requestAnimationFrame(this.frameCallback.bind(this));
};

VideoOverlay.prototype = {
    updateTarget: function(){
        var w = this.target.originalWidth  * this.scaleX;
        var h = this.target.originalHeight * this.scaleY;
        var x = this.targetX - w/2;
        var y = this.targetY - h/2;
        this.target.style.left = x + "px";
        this.target.style.top = y + "px";
        this.target.style.width = w + "px";
        this.target.style.height = h + "px";
     },
};

VideoOverlay.prototype.frameCallback = function(timestamp){
    if(this.video && !this.video.paused && !this.video.ended){
        var lastIndex = this.keyframeIndex;
        var lastVideoTime = this.videoTime;
        this.videoTime = this.video.currentTime;
        if(lastVideoTime != this.videoTime && this.options.keyframes.times.length > 0){
            var timeMap = this.options.keyframes.times.map((f,i) => {
                return {
                    index: i,
                    delta: Math.abs(this.videoTime + this.options.timeOffset - f)
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
                    this.updateTarget();
                }
            }
        }
        if(this.options.keyframes.times.length <= this.keyframeIndex) this.keyframeIndex = 0;
    }
    window.requestAnimationFrame(this.frameCallback.bind(this));
};
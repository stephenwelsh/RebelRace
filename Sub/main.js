// Uses https://gist.github.com/nicoptere/6198923eb1a8803ae7cea45cd4145219

var urlParams = new URLSearchParams(window.location.search);
var sub = urlParams.get('sub') || "ScottishRebel67";
var gift = urlParams.get('gift');
var playbackRate = urlParams.get('rate');
var loop = urlParams.get('loop') == "true";
var timeOffset = urlParams.get('offset');
if(timeOffset) timeOffset = parseInt(timeOffset);
var video = urlParams.get('video') || "RebelSub";
var requests = [
    video + ".json",
    "https://mixer.com/api/v1/users/search?query=" + sub
];
if(gift) requests.push("https://mixer.com/api/v1/users/search?query=" + gift);

var results = requests.map(async request => {
    const response = await fetch(request);
    return response.json();
});

Promise.all(results).then(r => {
    var targets = [];
    var subUser = r[1][0];
    var sub1 = document.getElementById('sub1');
    targets.push(new Promise(resolve => {
        sub1.onload = ()=>{
            resolve();
            new VideoOverlay({
                keyframes: r[0]["suscriberlarge"],
                timeOffset: timeOffset,
                source: 'source',
                target: 'sub1',
                targetOffsetX: 3,
                targetOffsetY: 3
            });        
        };
    }));
    if(subUser.avatarUrl)
        sub1.src = subUser.avatarUrl;
    else
        sub1.src = "https://mixer.com/api/v1/users/" + subUser.id + "/avatar?w=128&h=128";
    var sub2 = document.getElementById('sub2');
    targets.push(new Promise(resolve => {
        sub2.onload = ()=>{
            resolve();
            new VideoOverlay({
                keyframes: r[0]["suscribersmall"],
                timeOffset: timeOffset,
                source: 'source',
                target: 'sub2',
                targetOffsetX: 5,
                targetOffsetY: 0
            });        
        };
    }));
    if(subUser.avatarUrl)
        sub2.src = subUser.avatarUrl;
    else
        sub2.src = "https://mixer.com/api/v1/users/" + subUser.id + "/avatar?w=128&h=128";
    if(r.length > 2){
        var giftUser = r[2][0];
        var gift = document.getElementById('gift');
        targets.push(new Promise(resolve => {
            gift.onload = ()=>{
                resolve();
                new VideoOverlay({
                    keyframes: r[0]["gifted"],
                    timeOffset: timeOffset,
                    source: 'source',
                    target: 'gift'
                });                    
            };    
        }));
        if(giftUser.avatarUrl)
            gift.src = giftUser.avatarUrl;
        else
            gift.src = "https://mixer.com/api/v1/users/" + giftUser.id + "/avatar?w=128&h=128";        
    }
    Promise.all(targets).then(r =>{
        var source = document.getElementById('source');
        var targets = document.querySelectorAll("img.target");
        source.addEventListener('playing', (event) => {
            if(playbackRate) source.playbackRate = parseFloat(playbackRate);
            targets.forEach(t => {
                t.style.opacity = 1;
            });
            source.style.opacity = 1;
            var background = document.getElementById('background');
            background.style.height = source.clientHeight+"px";
        });
        source.addEventListener('ended', (event) => {
            targets.forEach(t => t.style.opacity = 0);
            source.style.opacity = 0;
            document.getElementById('background').style.opacity = 0;
        });
        source.addEventListener('canplay', (event) => {
            source.play();
        });
        // ['playing','ended','play','loadeddata', 'canplay'].forEach(evt => source.addEventListener(evt,event => {
        //     console.log(event);
        // }));
        if(gift) video += "Gifted";
        source.setAttribute('src', video + ".webm");
        if(loop) source.setAttribute('loop','');
    });
});

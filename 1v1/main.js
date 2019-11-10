// Uses https://gist.github.com/nicoptere/6198923eb1a8803ae7cea45cd4145219

var urlParams = new URLSearchParams(window.location.search);
var winner = urlParams.get('winner') || "ScottishRebel67";
var looser = urlParams.get('looser');
var referee = urlParams.get('referee');
var playbackRate = urlParams.get('rate');
var loop = urlParams.get('loop') == "true";
var timeOffset = urlParams.get('offset');
if(timeOffset) timeOffset = parseInt(timeOffset);
var hideReferee = urlParams.get('hideReferee') == "true";
var video = urlParams.get('video') || "RebelNinja";
var requests = [
    video + ".json",
    "https://mixer.com/api/v1/users/search?query=" + winner
];
if(looser) requests.push("https://mixer.com/api/v1/users/search?query=" + looser);
if(referee && !hideReferee) requests.push("https://mixer.com/api/v1/users/search?query=" + referee);

var results = requests.map(async request => {
    const response = await fetch(request);
    return response.json();
});

Promise.all(results).then(r => {
    var targets = [];
    var winnerUser = r[1][0];
    var winner = document.getElementById('winner');
    targets.push(new Promise(resolve => {
        winner.onload = ()=>{
            resolve();
            new VideoOverlay({
                keyframes: r[0]["winner"],
                timeOffset: timeOffset,
                source: 'source',
                target: 'winner'
            });        
        };
    }));
    winner.src = winnerUser.avatarUrl;
    if(r.length > 2){
        var looserUser = r[2][0];
        var looser = document.getElementById('looser');
        targets.push(new Promise(resolve => {
            looser.onload = ()=>{
                resolve();
                new VideoOverlay({
                    keyframes: r[0]["looser"],
                    timeOffset: timeOffset,
                    source: 'source',
                    target: 'looser'
                });                    
            };    
        }));
        looser.src = looserUser.avatarUrl;
    }
    else
    {
        new VideoOverlay({
            keyframes: r[0]["looser"],
            timeOffset: timeOffset,
            source: 'source',
            target: 'looser'
        });    
    }
    var referee = document.getElementById('referee');
    if(!hideReferee){
        if(r.length > 3){
            var refereeUser = r[3][0];
            targets.push(new Promise(resolve => {
                referee.onload = resolve;
            }));
            referee.src = refereeUser.avatarUrl;
        }
        new VideoOverlay({
            keyframes: r[0]["referee"],
            timeOffset: timeOffset,
            source: 'source',
            target: 'referee'
        });
    }
    else referee.removeAttribute('src');
    Promise.all(targets).then(r =>{
        var source = document.getElementById('source');
        var targets = document.querySelectorAll("img.target");
        source.addEventListener('playing', (event) => {
            if(playbackRate) source.playbackRate = parseFloat(playbackRate);
            targets.forEach(t => {
                t.style.opacity = 1;
            });
            source.style.opacity = 1;
        });
        source.addEventListener('ended', (event) => {
            targets.forEach(t => t.style.opacity = 0);
            source.style.opacity = 0;
        });
        // ['playing','ended','play','loadeddata'].forEach(evt => source.addEventListener(evt,event => {
        //     console.log(event);
        // }));
        source.setAttribute('src', video + ".mp4");
        if(loop) source.setAttribute('loop','');
    });
});

var app = angular.module("app", ['ngResource']);
app.controller("HelloWorldCtrl", function($scope, $timeout, MixerApi, MixerChatApi, MixerRealtime, SparkSteps) {  
    $scope.message="Hello World123" ;
    $scope.flashClass = [];
    $scope.items = [];
    $scope.leaderboardSize = 15;
    $scope.raceSparkGoal = 10;
    $scope.leaderboard = [];
    $scope.chatUsers = [];
    $scope.winners = [];
    $scope.shakeAmount = 0;
    var realtime = null;
    var channel = null;
    $scope.auth = {};
    $scope.state = {};
    $scope.showForm = false;
    $scope.showMeter = false;
    $scope.shake = function(amount){
        $scope.shakeAmount = Math.max(1, $scope.items.length * amount/100);
        $timeout(shakeTimer, 830);
    };
    var shakeTimer = function() {
        $scope.shakeAmount = 0;
    }
    $scope.getShake = function(index){
        return index < $scope.shakeAmount ? "shake" :"";
    };
    $scope.setHats = function(amount){
        var hats = Math.max(1, Math.round(10 * amount/100));
        var index = 1;
        if(hats != $scope.items.length){
            $scope.items.length = 0;
            for(var i = 0; i < hats; i++){
                $scope.items.push(index++);
            }
        }
    };
    $scope.save = function(){
        //if($$scope.state.username)
        window.localStorage.setItem('leaderboardSize', $scope.leaderboardSize);
        window.localStorage.setItem('raceMinSparks', $scope.raceMinSparks);
        window.localStorage.setItem('raceMaxSparks', $scope.raceMaxSparks);
        $scope.init();
        $scope.showForm = false;
    }
    $scope.modeToggle = function(){
        $scope.showMeter = !$scope.showMeter;
        window.localStorage.setItem('mode', $scope.showMeter ? 'meter' : 'race');
    }
    $scope.init = function(){
        $scope.leaderboardSize = window.localStorage.getItem('leaderboardSize') || 15;
        $scope.raceMinSparks = window.localStorage.getItem('raceMinSparks') || 20;
        $scope.raceMaxSparks = window.localStorage.getItem('raceMaxSparks') || 50;
        var urlParams = new URLSearchParams(window.location.search);
        if(window.location.hash){
            var hashParts = window.location.hash.split('?');
            var parts = hashParts[0].split('&');
            parts.forEach(function(part){
                var segments = part.split('=');
                if(segments.length > 1)
                    $scope.auth[segments[0]]= segments[1];
            });
            $scope.state = JSON.parse(window.atob(decodeURIComponent($scope.auth['state'])));
        }
        var mode = $scope.state.mode || urlParams.get('mode') || window.localStorage.getItem('mode') || 'meter';
        $scope.showMeter = mode == 'meter';
        var username = $scope.state.username || urlParams.get('username') || window.localStorage.getItem('username') || 'ScottishRebel67';
        var clientid = $scope.state.clientid || urlParams.get('clientid') || window.localStorage.getItem('clientid');
        var token = $scope.auth['#access_token'] || urlParams.get('token') || window.localStorage.getItem('token');
        var expires = $scope.auth['expires_in'] || urlParams.get('expires') || window.localStorage.getItem('expires');
        if(!window.location.hash && username && clientid){
            window.localStorage.setItem('clientid', clientid);
            window.localStorage.setItem('username', username);
            window.localStorage.setItem('mode', mode);
            $scope.state.clientid = clientid;
            $scope.state.username = username;
            $scope.state.mode = mode;
        }
        if(!token && clientid){
            var redirectUrl = window.location.href.split('?')[0];
            var scope = 'user:act_as'; //user:act_as channel:details:self
            var state = window.btoa(JSON.stringify({
                username: username,
                clientid: clientid,
                mode: mode
            }));
            window.location = `https://mixer.com/oauth/authorize?response_type=token&redirect_uri=${redirectUrl}&scope=${scope}&client_id=${clientid}&state=${state}`;
        }
        else if($scope.auth['#access_token'] && $scope.auth['state']){
            window.location = window.location.origin + window.location.pathname + `?token=${token}&expires=${expires}&username=${username}`;
        }
        else if(!token){
            $scope.showForm = true;
            window.alert('You must provide a valid clientid!');
            return;
        }
        if(token) window.localStorage.setItem('token', token);
        if(expires) window.localStorage.setItem('expires', expires);

        realtime = MixerRealtime.realtime(token);
        mixerApi = MixerApi.api(token);
        $scope.$watch('sparks.patronageEarned', function(newSparks, oldSparks){
            if(!$scope.sparks) return;
            // TODO: Flash brightness/duration based on the difference between new/old?
            var min = 0;
            var max = SparkSteps[$scope.sparks.currentMilestoneId];
            if($scope.sparks.currentMilestoneId > 0){
                min = SparkSteps[$scope.sparks.currentMilestoneId - 1];
            }
            $scope.sparks.percentage = (100 * (newSparks - min))/(max - min);
            $scope.flashClass.push('flash_once');
            $scope.setHats($scope.sparks.percentage);
            var delta = newSparks - oldSparks;
            $scope.shake(delta/5000*100);
            //$scope.shake(Math.random() * $scope.items.length);
            $timeout( function(){
                $scope.flashClass.length = 0;
            }, 1000 );
        });
        mixerApi.userSearch({ query: $scope.state.username }).$promise.then(function(users){
            $scope.user = users[0];
            var avatarUrl = `https://mixer.com/api/v1/users/${$scope.user.id}/avatar`
            $scope.id = $scope.user.channel.id;
            // Subscribe to events
            // realtime.subscribe(`channel:${$scope.id}:skill`, function(data){
            //     console.log('Channel Skill Update: ', data);
            //     var chatUser = $scope.chatUsers.find(function(u){
            //         return u.userId == data.triggeringUserId;
            //     });
            //     if(chatUser) chatUser.spent += data.price;
            //     $scope.$apply(function(){
            //         $scope.move();
            //     });
            // });
            realtime.subscribe(`channel:${$scope.id}:patronageUpdate`, function(data){
                console.log('Channel Sparks Update: ', data);
                $scope.$apply(function(){
                    $scope.sparks = data;
                });
            });

            mixerApi.patronageStatus({id: $scope.id}).$promise.then(function(data){
                console.log('Channel Sparks: ', data.patronageEarned);
                $scope.sparks = data;
            });
            if(!$scope.showMeter) $scope.startRace();
        });
    };
    $scope.init();
    var userListComplete = function(){
        $scope.showForm = false;
        $scope.chatUsers.sort(function(f,s){
            return s.sparks - f.sparks;
        });
        if($scope.chatUsers.length > 3000){
            $scope.chatUsers = $scope.chatUsers.filter(function(chatUser){
                return (chatUser.userRoles.indexOf("Subscriber") > -1) && (chatUser.sparks > 100000);
            });    
        }
        $scope.move();
        // $scope.$apply();

        window.setInterval(function(){
            $scope.move();
            $scope.$apply();
        },500);
    };
    // var moveIndex = 0;
    var moveTimestamp = 0;
    var placedIndex = 1;
    $scope.chatFilter = function(user){
        return user && user.username;
    };
    $scope.move = function(user, spent){
        // var index = Math.floor(Math.random() * ($scope.chatUsers.length));
        if(user && spent){
            console.log(`User '${user.userId}' spent: ${spent}`);
            var userSpent = Math.min($scope.raceSparkGoal*50,spent);
            user.spent += userSpent;
            if(user.spent >= user.sparksGoal && !user.placed && $scope.winners.length < $scope.leaderboardSize){
                $scope.winners.push(user);
                user.placed = $scope.winners.length;
                user.show = true;
                // var index = $scope.chatUsers.findIndex(function(u){
                //     return u && u.userId == user.userId;
                // });
                var index = $scope.leaderboard.findIndex(function(u){
                    return u && u.userId == user.userId;
                });
                // $scope.leaderboard[index] = null;
            }    
        }
        // if($scope.chatUsers[index].placed) return;
        // if($scope.getUserPos($scope.chatUsers[index]) >= 100){
        //     $scope.chatUsers[index].placed == placedIndex++;
        //     // TODO: Set the top and left based on the placed value
        //     var removeIndex = $scope.leaderboard.findIndex(function(u){
        //         return u && $scope.chatUsers[index].userId == u.userId;
        //     });
        //     if(removeIndex >= 0) $scope.leaderboard[removeIndex] = null;
        // }
        var timestamp = Math.floor(Date.now()/2000);
        if(moveTimestamp == timestamp) return;
        moveTimestamp = timestamp;
        var tempUsers = $scope.chatUsers.map(function(user){
            return user;
        });
        tempUsers.sort(function(f,s){
            return $scope.getUserPos(s) - $scope.getUserPos(f);
        });
        tempUsers = tempUsers.filter(function(u){
            //return !u.placed;
            return u;
        });
        var leaderboardSize = Math.min($scope.leaderboardSize, tempUsers.length);
        for(var i = 0; i < leaderboardSize; i++){
            if($scope.leaderboard.filter(function(u){
                return u && tempUsers[i].userId == u.userId;
            }).length > 0){
                continue;
            }
            // TODO: Sort leaderboard by percentage (lowest first)
            var tempLeaders = $scope.leaderboard.map(function(user, index){
                return { user: user, index: index };
            });
            // tempLeaders = tempLeaders.filter(function(u){
            //     return !u.user.placed;
            // });
            tempLeaders.sort(function(f,s){
                if(!f.user) return -1;
                if(!s.user) return 1;
                return (f.user.percentage - s.user.percentage);
            });    
            var replaceIndex = tempLeaders.findIndex(function(u){
                return !u.user;
            });
            if(replaceIndex < 0){
                replaceIndex = tempLeaders.findIndex(function(u){
                    return u.user && u.user.percentage < tempUsers[i].percentage;
                });    
            }
            if(replaceIndex <= $scope.leaderboard.length && replaceIndex < leaderboardSize && $scope.leaderboard.length < leaderboardSize){
                $scope.leaderboard.push(tempUsers[i]);
                tempUsers[i].position = $scope.leaderboard.length - 1;
                tempUsers[i].show = true;
            }
            else if(replaceIndex >= 0){
                var index = tempLeaders[replaceIndex].index;
                if($scope.leaderboard[index]){
                    $scope.leaderboard[index].position = leaderboardSize + 1;
                    $scope.leaderboard[index].show = false;    
                }
                // $scope.leaderboard[index].position = $scope.leaderboard[index].originalPosition;
                tempUsers[i].position = index;
                tempUsers[i].show = true;
                $scope.leaderboard[index] = tempUsers[i];                
            }
        }
        // var pos = 0;
        // tempUsers.forEach(function(user){
        //     user.position = pos++;
        // });

    }
    $scope.getUserTop = function(chatUser){
        if(!chatUser) return '0px';
        //if(!chatUser.placed)
            return 64 + chatUser.position * 64 + 'px';
        return '0px';
    };
    $scope.getUserLeft = function(chatUser){
        if(!chatUser) return '0px';
        //if(!chatUser.placed)
        {
            var pos = $scope.getUserPos(chatUser);
            chatUser.leftText = pos > 40;
            return pos <= 100 ? pos + '%' : '100%';
        }
        chatUser.leftText = false;
        return 1 + (chatUser.placed - 1) * 30 + '%'
    };
    $scope.getUserPos = function(chatUser){
        if(!chatUser) return 0;
        // var percentage = chatUser.spent / chatUser.sparks * 200;
        var percentage = chatUser.spent / chatUser.sparksGoal * 100;
        chatUser.percentage = percentage;
        return percentage;
    };
    $scope.startRace = function(){
        $scope.winners.length = 0;
        $scope.chatUsers.length = 0;
        $scope.leaderboard.length = 0;
        MixerChatApi({api: mixerApi, id: $scope.id, sparkUpdate: function(user, spent){
            $scope.move(user, spent);
        }, complete: function(chatUsers){
            $scope.chatUsers = chatUsers.filter(function(chatUser){
                return 1;
                // return chatUser.userRoles.indexOf("Subscriber") > -1;
            });
            var chatUserIndex = 0;
            var chatRankIndex = 0;
            // $scope.chatUsers.length = 15;
            $scope.chatUsers.forEach(function(chatUser){
                mixerApi.user({userid: chatUser.userId}).$promise.then(function(user){
                    chatUser.avatarUrl = `https://mixer.com/api/v1/users/${chatUser.userId}/avatar`;
                    // chatUser.avatarUrl = user.avatarUrl;
                    chatUser.level = user.level;
                    chatUser.sparks = user.sparks;
                    chatUser.sparksGoal = $scope.raceSparkGoal * 1000;
                    //chatUser.sparksGoal =  user.sparks/100 * $scope.raceMinSparks + Math.ceil(Math.random() * user.sparks * ($scope.raceMaxSparks - $scope.raceMinSparks)/100);
                    chatUser.spent = 0;
                    chatUser.originalPosition = $scope.leaderboardSize + 1;
                    chatUser.show = false;
                    // chatUser.originalPosition = chatUserIndex + $scope.leaderboardSize;
                    chatUser.position = chatUser.originalPosition;
                    // chatUser.sparks = 100;
                    chatUserIndex++;
                    if(chatUserIndex == $scope.chatUsers.length){
                        userListComplete();
                    }
                    // if(chatUserIndex == $scope.chatUsers.length && chatRankIndex == $scope.chatUsers.length){
                    //     userListComplete();
                    // }
                });
                // mixerApi.userRank({id: $scope.id, userid: chatUser.userId}).$promise.then(function(user){
                //     chatUser.xp = user.xp;
                //     chatUser.rank = user.level.level;
                //     chatRankIndex++;
                //     if(chatUserIndex == $scope.chatUsers.length && chatRankIndex == $scope.chatUsers.length){
                //         userListComplete();
                //     }
                // });
            });
            // chatUsers.sort(function(f,s){
            //     return f.userRoles.indexOf("Subscriber") + 1 - s.userRoles.indexOf("Subscriber");
            // });
            // $scope.chatUsers = chatUsers;
            // $scope.chatUsers.length = 0;;
            // $scope.chatUsers.concat(chatUsers);
        }});
    };
});
app.factory('MixerChatApi', function(){
    var ChatApi = function(options){
        this.api = options.api;
        this.id = options.id;
        this.complete = options.complete;
        this.sparkUpdate = options.sparkUpdate;
        this.chatUsers = [];
        var self = this;
        this.api.chatUsers({id: this.id}, null, function(chatUsers, headers, status, statusText){
            self.getChatUsersRecursive(chatUsers, headers, status, statusText);
            self.connect();
        });
    };
    ChatApi.prototype.connect = function(){
        var self = this;
        this.api.chatEndpoint({id: self.id}).$promise.then(function(data){
            console.log('Chat Endpoint: ', data);
            var randomEndpoint = data.endpoints[Math.floor(Math.random()*data.endpoints.length)];
            var ws = new ReconnectingWebSocket(randomEndpoint);
            ws.onopen = function(){
                var connector = JSON.stringify({type: "method", method: "auth", arguments: [self.id], id: 1});
                ws.send(connector);
            };
            ws.onmessage = function (evt){
                var data = JSON.parse(evt.data);
                if(data.event == "ChatMessage"){
                    if(data.data.message && data.data.message.meta && data.data.message.meta.is_skill){
                        self.sparkMessage(data.data, data.data.message.meta.skill);
                    }
                }
                else if(data.event == "SkillAttribution")
                {
                    if(data.data.skill){
                        self.sparkMessage(data.data, data.data.skill);
                    }
                }
            }.bind(self);

        });
    };
    ChatApi.prototype.sparkMessage = function(user, skill){
        console.log('Spark Event: ', user, skill);
        var index = this.chatUsers.findIndex(function(u){
            return u && u.userId == user.user_id;
        });
        if(index >= 0){
            // this.chatUsers[index].spent += skill.cost;
            this.sparkUpdate(this.chatUsers[index], skill.cost);
        }
        // console.log('Spark Event: ', this.chatUsers[index], message.message.meta.skill.cost);
    };
    ChatApi.prototype.parseLinkHeader = function (link) {
        var linkexp = /<[^>]*>\s*(\s*;\s*[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*")))*(,|$)/g;
        var paramexp = /[^\(\)<>@,;:"\/\[\]\?={} \t]+=(([^\(\)<>@,;:"\/\[\]\?={} \t]+)|("[^"]*"))/g;    
        var matches = link.match(linkexp);
        var rels = {};
        for (var i = 0; i < matches.length; i++) {
            var split = matches[i].split('>');
            var href = split[0].substring(1);
            var ps = split[1];
            var s = ps.match(paramexp);
            for (var j = 0; j < s.length; j++) {
                var p = s[j];
                var paramsplit = p.split('=');
                var name = paramsplit[0];
                var rel = paramsplit[1].replace(/["']/g, '');
                rels[rel] = href;
            }
        }
        return rels;
    };
    ChatApi.prototype.getChatUsersRecursive = function(chatUsers, headers, status, statusText){
        this.chatUsers = this.chatUsers.concat(chatUsers);
        var linkHeader = headers('link');
        if(linkHeader){
            var link = this.parseLinkHeader(linkHeader);
            if(!link.next) return;
            var continuationTokenRegex = /&?continuationToken=(.*)&?/.exec(link.next);
            if(continuationTokenRegex.length < 2) return;
            var continuationToken = continuationTokenRegex[1];
            var self = this;
            this.api.chatUsers({id: this.id, continuationToken: decodeURIComponent(continuationToken)}, null, function(chatUsers, headers, status, statusText){
                self.getChatUsersRecursive(chatUsers, headers, status, statusText);
            });
        }
        else if(this.complete)
        {
            this.complete(this.chatUsers);
        }
    };
    return function(options){ return new ChatApi(options)};
});
app.factory('MixerApi',function($resource){
    return {
        api: function(token){
            return $resource('https://mixer.com/api/v2/levels/patronage/channels/:id', null, {
                patronageStatus:{
                    url: 'https://mixer.com/api/v2/levels/patronage/channels/:id/status',
                    headers:{
                        'Authorization': 'Bearer ' + token
                    }        
                },
                userSearch:{
                    url: 'https://mixer.com/api/v1/users/search',
                    isArray: true
                },
                chatUsers:{
                    url: 'https://mixer.com/api/v2/chats/:id/users',
                    isArray: true
                },
                chatUser:{
                    url: 'https://mixer.com/api/v2/chats/:id/users/:userid'
                },
                chatEndpoint:{
                    url: 'https://Mixer.com/api/v1/chats/:id'
                },
                user:{
                    url: 'https://mixer.com/api/v1/users/:userid'
                },
                userRank:{
                    url: 'https://mixer.com/api/v1/ascension/channels/:id/users/:userid'
                }
            });
        },
    };
});
app.factory('MixerRealtime', function(){
    var mixer = {};
    mixer.realtime= function(token){
        mixer.service = new carina.Carina({ queryString: {authorization: 'Bearer ' + token}}).open();
        return mixer;
    };
    mixer.subscribe = function(event, callback){
        mixer.service.subscribe(event, function(data){
            callback(data, event);
        });
    };
    return mixer;
});
app.value('SparkSteps', [5000000, 10000000, 15000000, 20000000, 30000000, 40000000,55000000, 70000000, 90000000, 115000000, 150000000, 200000000]);
app.filter('range', function() {
    return function(input, total) {
      total = parseInt(total);
      for (var i=0; i<total; i++)
        input.push(i);
      return input;
    };
  });
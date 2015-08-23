// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {

  // We'll ask the browser to use strict code to help us catch errors earlier.
  // https://developer.mozilla.org/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode
  'use strict';

  var db = null;
  var DBOpenRequest = window.indexedDB.open("slack", 4);

  DBOpenRequest.onerror = function(event) {
    console.log('Error loading database.');
  };
   
  DBOpenRequest.onsuccess = function(event) {
    console.log('Database initialised.');
      
    // store the result of opening the database in the db variable. This is used a lot later on, for opening transactions and suchlike.
    db = DBOpenRequest.result;
  };

  var token = "xoxp-YOURTOKENHERE"

  var channelList = document.getElementById('channels');
  var userList = document.getElementById('users');
  var messageList = document.getElementById('messages');

  var appHeader = document.getElementById('current');

  var refresher = document.getElementById('refresh');

  var postForm = document.getElementById('post-to-channel');
  var postMessage = document.getElementById('postmessage');

  var activeChannel = {};


  function setHeader(value){
    appHeader.innerHTML = value;
  }

  function clearMessageList(){
    while (messageList.firstChild) {
        messageList.removeChild(messageList.firstChild);
    }
  }


  var activeUsers = {};


  function rtmStart(){
    var url = "https://slack.com/api/rtm.start?token=" + token
     var request = new XMLHttpRequest({ mozSystem: true });
    request.open("get", url)

    request.responseType = 'json';
    request.addEventListener('error', function(){
      console.log("error");
      console.log(request.response);
    });
    request.addEventListener('load', function(){
      console.log("finished rtm.start");
      var resp = request.response

      if(resp.ok){

        // Load up the channels
        for (var i = 0; i < resp.channels.length; i++) {

          var channel = resp.channels[i]

          if(channel.is_member){
            var listItem = document.createElement('li');
            listItem.innerHTML = "<a href=\"#content\">#" + channel.name + "</a>";
            listItem.channel = channel
            listItem.onclick = function(){
              channelHistory(this.channel);
            }
            channelList.appendChild(listItem);

            if(channel.name == "general"){
              channelHistory(channel);
            }
          }
        };

        // Load up all the users
        for (var i=0; i < resp.users.length; i ++){
          activeUsers[resp.users[i].id] = resp.users[i];
        }

        // And the IM channels

        for(var i=0;i<resp.ims.length; i++){

          var user = activeUsers[resp.ims[i].user];

          if(!resp.ims[i].is_user_deleted && resp.ims[i].is_open){
            var listItem = document.createElement('li');
            listItem.innerHTML = "<a href=\"#content\">" + user.name + "</a>";
            listItem.user = user
            listItem.im = resp.ims[i]
            listItem.onclick = function(){
              userHistory(this.im, this.user);
            }
            userList.appendChild(listItem);
          }
        }
      }
    });
    request.send();
  }

  rtmStart();

  function getChannels(){
    var url = "https://slack.com/api/channels.list?token=" + token + "&exclude_archived=1"

    var request = new XMLHttpRequest({ mozSystem: true });
    request.open("get", url)

    request.responseType = 'json';
    request.addEventListener('error', function(){
      console.log("error");
      console.log(request.response);
    });
    request.addEventListener('load', function(){
      console.log("loaded");
      console.log(request.response);
      if(request.response.ok){
        console.log(request.response.latest)
        
        for (var i = 0; i < request.response.channels.length; i++) {
          var listItem = document.createElement('li');
          listItem.innerHTML = "<a href=\"#content\">#" + request.response.channels[i].name + "</a>";
          listItem.channel = request.response.channels[i]
          listItem.onclick = function(){
            channelHistory(this.channel);
          }
          channelList.appendChild(listItem);
        };
      }
    });
    request.send();
  }

  function getUsername(msg){
    if(activeUsers[msg.user]){
      return activeUsers[msg.user].name
    }else if(msg.username){
      return msg.username
    }else{
      return "unknown"
    }
  }

  function sendMessage(channel, message){
    var url = "https://slack.com/api/chat.postMessage?token="+token + "&channel=" + channel.id

     var request = new XMLHttpRequest({ mozSystem: true });
    request.open("post", url, true)

    var data = new FormData();
    data.append("text", message);
    data.append("as_user", true);

    request.responseType = 'json';
    request.addEventListener('error', function(){
      console.log("error");
      console.log(request.response);
    });
    request.addEventListener('load', function(){
      console.log("loaded");
      console.log(request.response);
      if(request.response.ok){
        console.log(request.response.latest)
        
          var msgDiv = document.createElement('div');
          msgDiv.innerHTML = "<strong>" + "hownowstephen" + "</strong><br />" + message;
          messageList.appendChild(msgDiv);
        messageList.scrollTop = messageList.scrollHeight + 10000;
      }
    });
    request.send(data);
  }

  postForm.onsubmit = function(e){
    if(activeChannel){
      e.preventDefault();
      sendMessage(activeChannel, postMessage.value);
      postMessage.value = "";
    }
  };


  function channelHistory(channel){
    var url = "https://slack.com/api/channels.history?token=" + token + "&channel=" + channel.id

    setHeader("#" + channel.name);
    clearMessageList();

    var request = new XMLHttpRequest({ mozSystem: true });
    request.open("post", url)

    request.responseType = 'json';
    request.addEventListener('error', function(){
      console.log("error");
      console.log(request.response);
    });
    request.addEventListener('load', function(){

      
      console.log("loaded channel history for channel ", channel);
      if(request.response.ok){
        console.log(request.response.latest)
        
        for (var i = request.response.messages.length-1; i >= 0; i--) {

          var msg = request.response.messages[i]
          var msgDiv = document.createElement('div');
          msgDiv.innerHTML = "<strong>" + getUsername(msg) + "</strong><br />" + msg.text;
          msgDiv.message = msg

          messageList.appendChild(msgDiv);

        };

        activeChannel = channel;

        refresher.onclick = function(){
          channelHistory(channel);
        };

        messageList.scrollTop = messageList.scrollHeight + 10000;
      }
    });
    request.send();
  }

  function userHistory(im, user){
    var url = "https://slack.com/api/im.history?token=" + token + "&channel=" + im.id

    setHeader("Direct: " + user.name);
    clearMessageList();

    var request = new XMLHttpRequest({ mozSystem: true });
    request.open("post", url)

    request.responseType = 'json';
    request.addEventListener('error', function(){
      console.log("error");
      console.log(request.response);
    });
    request.addEventListener('load', function(){
      console.log("loaded IM history for user ", user);     
      console.log(request.response);
      for (var i = request.response.messages.length-1; i >= 0; i--) {
        var msg = request.response.messages[i]
        var msgDiv = document.createElement('div');

        msgDiv.innerHTML = "<strong>" + getUsername(msg) + "</strong><br />" + msg.text;
        msgDiv.message = request.response.messages[i]
        messageList.appendChild(msgDiv);
      };

      activeChannel = im;

      refresher.onclick = function(){
          userHistory(im, user);
        };

      console.log(messageList.scrollTop, messageList.scrollHeight);

      messageList.scrollTop = messageList.scrollHeight + 100000;
    });
    request.send();
  }

  
});

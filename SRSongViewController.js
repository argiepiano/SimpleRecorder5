// View and controller for the song listing and song player

function SRSongView(manager, params) {
  var _this = this;
  _this._manager = manager;
  _this._target = params.target;
  _this._pathToSongs = params.pathToSongs;
  _this._pathToSongFiles = params.pathToSongFiles;
  _this._pathToUser = params.pathToUser;
  
  // create events for UI
  _this.stopButtonClicked = new SREvent(this);
  _this.playButtonClicked = new SREvent(this);
  _this.downloadButtonClicked = new SREvent(this);
  _this.deleteButtonClicked = new SREvent(this);
  
  // attach UI events to notifiers
  this._target.on('click', '.play', function() {
    var temp = {songid: $(this).attr("data-midiid")};
    _this.playButtonClicked.notify(temp);
    });
  
  this._target.on('click', '.stop-playing', function() {
    var temp = {songid: $(this).attr("data-midiid")};
    _this.stopButtonClicked.notify(temp);
  });
  
  this._target.on('click', '.download', function() {
    var temp = {songid: $(this).attr("data-midiid")};
    _this.downloadButtonClicked.notify(temp);
  });

  this._target.on('click', '.delete', function() {
    var temp = {songid: $(this).attr("data-midiid")};
    _this.deleteButtonClicked.notify(temp);
  });  
  // Create observers for manager events
  
  _this._manager.idle.attach(function() {
    _this._target.find(".play").blur();
  });

  
  // Template
  var templateScript = Handlebars.compile(`
    {{#each mysongs}}
      <div class="list-group-item list-group-item-action clearfix">
        <div class="pull-left">
          <h4 class="list-group-item-heading">{{this.title}}</h4>
          <p class="list-group-item-text">{{this.date}}<br>Description: {{this.description}}</p>
        </div>
        <div class="pull-right">
          <a href="#" class="btn btn-sm btn-success play" data-midiid="{{@key}}">Play</a>
          <a href="#" class="btn btn-sm btn-primary stop-playing">Stop</a>
          <a href="#" class="btn btn-sm btn-default download" data-midiid="{{@key}}"><span class="glyphicon glyphicon-download"></span> Download</a>
          <a href="#" class="btn btn-sm btn-danger delete" data-midiid="{{@key}}"><span class="glyphicon glyphicon-remove"></span> Delete</a>
        </div>
      </div>  
    {{/each}}
  `);
  
  this.render = function(runLater) {
    var elem = $("<div/>" , {class: 'list-group'});
    firebase.database().ref(_this._pathToSongs).once('value').then(
      function (snapshot) {
        if (snapshot.val()) {
          var songs = snapshot.val();
          var songkeys = Object.keys(songs);
          var mysongs = {};
          songkeys.reverse().forEach(
            function (key) {
              mysongs[key] = songs[key];
            }
          );
          
          mysongs = {mysongs: mysongs};
          var renderhtml = templateScript(mysongs);
          renderhtml = "<div class='list-group'>"+renderhtml+"</div>";
          _this._target.html(renderhtml);
          console.log("finished rendering the songs");
          if (typeof runLater !== 'undefined') {runLater()}
        }
      },
      function failure(err) {
        console.log("Error getting songs: "+err);
        elem.html('<div class="list-group-item list-group-item-action"><h5>'+ 'No songs found'+'</h5></div>');
        _this._target.html(elem);

      }
    )

  }
  
}

function SRSongController(manager, view) {
  var _this = this;
  this._manager = manager;
  this._view = view;
  
  this._view.stopButtonClicked.attach(function () {
    _this._manager.stopPlayer();
  });
  
  this._view.playButtonClicked.attach(function(source, songID){
    console.log("song id "+songID);
    if (_this._manager.songID != songID.songid) {
      firebase.database().ref(_this._view._pathToSongFiles+"/"+songID.songid).once('value').then(
      function(snapshot) {
        console.log("Opening song "+songID.songid);
        _this._manager.openSong(snapshot.val());
        _this._manager.songID = songID.songid;
        _this._manager.playEvents();
      },
      function(e) {
        console.log("Error trying to open song: "+e );
        return;
      }
    );   
    } else {
      console.log("Playing song previously loaded");
      _this._manager.playEvents();
    };
  });
  
  this._view.downloadButtonClicked.attach(function(source, songID){
    firebase.database().ref(_this._view._pathToUser).once("value").then(
      function (snapshot) {
        var userInfo = snapshot.val();
        var fileName = userInfo.songs[songID.songid].title.replace(/\s+/g, '') + '-' + userInfo.name.replace(/\s+/g, '')+'.mid';
        if (_this._manager.songID != songID.songid) {
          firebase.database().ref(_this._view._pathToSongFiles+"/"+songID.songid).once("value").then(
            function (songSnap) {
              _this._manager.openSong(songSnap.val());
              _this._manager.songID = songID.songid
              _this._manager.createMIDIfile(fileName);
            }
          );
        } else {
          console.log("downloading song previously loaded")
          _this._manager.createMIDIfile(fileName);
        }
      }
    );
  });
  
  this._view.deleteButtonClicked.attach(function(source, songID){
    bootbox.confirm({
      message: "Are you sure you want to delete this song?",
      buttons: {
        confirm: {
            label: 'Yes, delete it!',
            className: 'btn-danger'
        },
        cancel: {
            label: 'No, do not delete it.',
            className: 'btn-default'
        }
      },
      callback: function (result) {
        if (result) {       
          var update = {}
          update[_this._view._pathToSongFiles + "/" + songID.songid] = null;
          update[_this._view._pathToSongs + "/" + songID.songid] = null;
          console.log(update)
          firebase.database().ref().update(update);
          _this._view.render()   
        };
      }
    });    
  });
}  


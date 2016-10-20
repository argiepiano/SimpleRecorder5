// Contains definitions of the View and the Controller for each recorder 

function SRView(model, target, params) {
  // Create event triggers
  var _this = this;
  _this._model = model;
  _this._target = target;
  _this._params = params;
  _this._idle_message = "Empty";
  
  
// Create UI
  var htmlui = recorderUI({recorderid: target.attr('id'), title: params.title});
  this._target.html(htmlui);
  
// Create song save modal
  this._modalID = "songInfoModal-"+this._target.attr("id");
//  var modalElement = $("#"+_this._modalID);
  htmlui = recorderModals({modalID: _this._modalID});
  $("#modals").append(htmlui);
  
  // Create event triggers
  this.playButtonClicked = new SREvent(this);
  this.stopButtonClicked = new SREvent(this);
  this.recButtonClicked = new SREvent(this);
  this.encodeButtonClicked = new SREvent(this);
  this.saveSongInfoSubmitted = new SREvent(this);
  
  // Attach triggers to HTML UI elements
  _this._target.find("*").off();
  console.log("Adding listeners to "+ target.attr("id"));
  _this._target.find(".btn").removeClass('disabled');
  
  _this._target.find(".start-recording").on('click', function () {_this.recButtonClicked.notify()});
  _this._target.find(".stop-recording").on("click", function (){_this.stopButtonClicked.notify()});
  _this._target.find(".play").on("click", function(){_this.playButtonClicked.notify()});
  _this._target.find('.encode').on("click", function() {_this.encodeButtonClicked.notify()});
  
  _this._target.find(".saveSong").on("click", function() {
    console.log("Saved button clicked");
    $("#"+_this._modalID).modal('show');
  });
  
  $("#"+_this._modalID).on("submit", ".songInfoForm" ,function(event) {
    event.preventDefault();
    var title = $("#"+_this._modalID).find(".songTitle").val();
    var description = $("#"+_this._modalID).find(".songDescription").val();
    console.log("title and description "+title +" "+ description)
    $("#"+_this._modalID).modal('hide');
    _this._idle_message = "Saved";
    _this._target.find(".current-state").html(_this._idle_message);
    _this.saveSongInfoSubmitted.notify({title: title, description: description});
  });
  

  // Create model listeners for state changes  
  this._model.idle.attach(function() {
    _this._target.find(".current-state").html(_this._idle_message);
    _this._target.find(".play").blur();
  });  
  
  this._model.recording.attach( function() {
    _this._idle_message = "<b>NOT saved</b>";
    _this._target.find(".current-state").html("Recording...");
  });
  
  this._model.playing.attach(function() {
    _this._target.find(".current-state").html("Playing...");
  })
  
}

function SRController(model, view) {
  var _this = this;
  this._model = model;
  this._view = view;
  
  this._view.playButtonClicked.attach(function () {
    _this._model.playEvents();
  });
  this._view.stopButtonClicked.attach(function () {
    _this._model.stopRecorder();
  });
  this._view.recButtonClicked.attach(function() {
    _this._model.startRecording();  
  });
  this._view.encodeButtonClicked.attach(function () {
    firebase.database().ref(pathToUser).once("value").then(
      function (snapshot) {
        var fileName = snapshot.val().name.replace(/\s+/g, '')+'.mid';
	_this._model.createMIDIfile(fileName);
      }
    );
  });
  
  this._view.saveSongInfoSubmitted.attach(function(source, songInfo) {
    if (_this._model.eventObjects.length >0 ) {
      var song = _this._model.prepareSong(songInfo.title, songInfo.description);
      var newPostKey = firebase.database().ref(pathToSongs).push().key;
      var update = {};
      update[pathToSongs + "/" + newPostKey] = song.info;
      update[pathToSongFiles + "/" + newPostKey] = song.data;
      firebase.database().ref().update(update).then(
        function () {
          bootbox.alert("Song saved");
        },
        function (error) {
          bootbox.alert("<strong>Error: </strong>"+error.message)
        }
      );
    }
  });
}


var recorderUI = Handlebars.compile(` 
	<div class="panel panel-default">
	  <div class="panel-heading">
	    {{title}}
	  </div>
	  <div class="panel-body">
	    <div class="recorder" id="{{recorderid}}">
	      <p>
		<div class="text-center">
		    <button class="btn btn-lg btn-primary disabled stop-recording" type="button">Stop <span class="glyphicon glyphicon-stop"></span></button>
		    <button class= "btn btn-lg btn-danger disabled start-recording" type="button">Rec <span class="glyphicon glyphicon-record"></span></button>
		    <button class="btn btn-lg btn-success disabled play" type="button">Play <span class="glyphicon glyphicon-play"></span></button>
		</div>
	      </p>
	      <p>
		<div class="text-center">
		  <!-- div class="btn-group" role="group" -->
		    <!-- button class="btn btn-default btn-sm encode">Download</button -->
		    <button class="btn btn-default saveSong">Save</button>
		  <!-- /div -->
		  <p class="current-state">Empty</p>
		</div>
	      </p>
	    </div> <!--recorder-->
	  </div> <!-- panel-body -->
	</div> <!-- panel panel-default -->

`);

var recorderModals = Handlebars.compile(`
    <div class="modal fade" id="{{modalID}}" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
	<div class="modal-content">
	  <div class="modal-header">
	    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
              <span class="sr-only">Close</span>
            </button>
	    <h4 class="modal-title">Enter song information</h4>
	  </div>
	  <div class="modal-body">
	    <form class="songInfoForm" role="form" data-toggle="validator">
	      <div class="form-group">
		<label for="songTitle">Song title</label>
		  <input class="form-control songTitle" required />
	      </div>
	      <div class="form-group">
		<label for="songDescription">Description (optional)</label>
		  <input class="form-control songDescription" />
	      </div>
	      <button type="submit" class="btn btn-primary">Save</button>
	    </form>
	  </div>
	</div>
      </div>
    </div>
`);

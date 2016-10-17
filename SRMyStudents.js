function SRMyStudents() {
  var _this = this;
  this.myStudentList = {};
  this.refresh = new SREvent(this);
  this.sections = [];
  
  // build student list object
  firebase.database().ref(pathToUser).once('value').then( function (snapshot) {
    var userinfo = snapshot.val();
    if (userinfo&&userinfo.hasOwnProperty('role')&&userinfo.role.instructor&&userinfo.hasOwnProperty('sections')) {
      _this.sections = Object.keys(userinfo.sections);
      _this.buildListHelper(0);
    }
  });
  
  this.buildListHelper = function (i) {
    var sectionID = _this.sections[i]
    firebase.database().ref("users").orderByChild('group').equalTo(sectionID).once('value').then(
      function name(usersnaps) {
        _this.myStudentList[sectionID] = usersnaps.val();
        if (++i < _this.sections.length) {
          _this.buildListHelper(i);
        }
      } 
    );
  }
}

function SRMyStudentsView(model, target) {
  var _this = this;
  this.target = target;
  this.model = model
  
  var templateScript = Handlebars.compile(`
    {{#each students}}
      <div class="list-group-item list-group-item-action clearfix">
        <div class="pull-left">
          <h5 class="list-group-item-heading">{{this.name}}</h5>
          <p class="list-group-item-text">{{this.group}}</p>
        </div>
        <div class="pull-right">
          <a href="#" class="btn btn-sm btn-success view-st-songs" data-userid="{{@key}}">View songs</a>
        </div>
      </div>  
    {{/each}}  
  `);
  
  var backlink = `<p><a href="#" class="btn btn-sm btn-default" id="back-to-students"><span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span> Back</a></p>`
  
  _this.target.on("click", ".view-st-songs", function(e) {
    e.preventDefault();
    _this.showStudentSongs($(this).attr("data-userid"));  
  });
  
  $("#mystudentsongcontainer").on("click", "#back-to-students", function (e){
      e.preventDefault();
      console.log("clicked back")
      $("#main").children().hide()
      $("#mystudentscontainer").show('fast');
      $("#mystudentsongcontainer").empty()
    });
  
  this.render = function() {
    var htmlOutput = '';
    for (var prop in _this.model.myStudentList){
      if (_this.model.myStudentList.hasOwnProperty(prop)) {
        htmlOutput = htmlOutput+"<div class='container-fluid'><h4>"+prop+"</h4>"+templateScript({students: _this.model.myStudentList[prop]})+"</div>";
      }
    }
    _this.target.html("<div class='list-group'>"+htmlOutput+"</div>");
  }
  
  
  this.showStudentSongs = function(userID){
    $("#mystudentsongcontainer").off('click', '.play');
    $("#mystudentsongcontainer").off('click', '.stop-playing');
    $("#mystudentsongcontainer").off('click', '.download');
    $("#mystudentsongcontainer").off('click', '.delete');
    $("#mystudentsongcontainer").empty();
    var pathToStudentSongs = 'users/' + userID + '/songs';
    var studentSongManager = new SRSongManager();
    var studentSongView = new SRSongView(studentSongManager,{target: $("#mystudentsongcontainer"),
                                         pathToSongs: pathToStudentSongs,
                                         pathToSongFiles: pathToSongFiles,
                                         pathToUser: 'users/' + userID
                              });
    var studentSongController = new SRSongController(studentSongManager, studentSongView);

    studentSongView.render(function() {
        $("#main").children().hide()
        $("#mystudentsongcontainer").prepend(backlink).show('fast');
    });
  }
}

function SRMyStudentsController(model, view) {
  var _this =this;
  this.model = model;
  this.view = view;
  
}


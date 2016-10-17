function SRModel() {
  this.eventObjects = [];
  this.recStartTime = 0, this.rAF;
  var _this = this;
  
  this.idle = new SREvent(this);
  this.recording = new SREvent(this);
  this.playing = new SREvent(this);
    
  midisystem.stateChange.attach(function(event) {
	internalStop();
  });
  
  // Private functions -----------------------------------------
  
   function onMidiMessage(receivedEvent) {
    if ((event.data[0] & 0xf0) != 0xF0) {
	_this.eventObjects.push({data: receivedEvent.data, receivedTime: receivedEvent.receivedTime - recStartTime});
    }
  }
  
  function internalStop() {
      window.cancelAnimationFrame(_this.rAF);
      midisystem.selectedMidiInput.onmidimessage = null;
      reset = [176, 120, 0, 176, 121, 0, 176, 123, 0];
      midisystem.selectedMidiOutput.send&&midisystem.selectedMidiOutput.send(reset);	
  }
  
  // Used for encoding MIDI events for file preparation 
  function encodeMIDIevents(){ 
    var track = [];
    var previousTime = 0.0;
    var delta;
    for (var i = 0; i<_this.eventObjects.length; i++ ) {
      // Each midi clock is 2.6041 milliseconds at 120 quarters per minute, 192 clocks per quarter.
      delta = Math.round((_this.eventObjects[i].receivedTime - previousTime) / 2.6041);
      previousTime = _this.eventObjects[i].receivedTime;
      
      // calculate Variable Length bytes
      if(delta >>> 21) {
        track.push(((delta >>> 21) & 0x7F) | 0x80);
      } 
      if(delta >>> 14) {
        track.push(((delta >>> 14) & 0x7F) | 0x80);
      }
      if(delta >>> 7) {
        track.push(((delta >>> 7) & 0x7F) | 0x80);
      }
      track.push((delta & 0x7F));
      
      if (_this.eventObjects[i].data[0] != null) track.push(_this.eventObjects[i].data[0]);
      if (_this.eventObjects[i].data[1] != null) track.push(_this.eventObjects[i].data[1]);     
      if (_this.eventObjects[i].data[2] != null) track.push(_this.eventObjects[i].data[2]);
    }
    // Adding the track end event
    track.push(0x00); track.push(0xFF); track.push(0x2F); track.push(0x00);
    console.log(track);
    return track;
  }
  
  function createMIDIheader() {
    var chunkType = [77, 84, 104, 100]; // MThd
    var chunkLength = [0,0,0,6]; // 6 bytes
    var format = [0,1]; // SMF type 1 (multitrack)
    var ntrks = [0, 2]; // Two tracks - first track is an empty tempo track
    var division = [0, 192]; // 192 ticks per beat
    return chunkType.concat(chunkLength,format,ntrks,division);
  }
  
  function createTrackheader(track) {
    var chunkType = [77, 84, 114, 107 ]; // MTrk
    var chunkLength = extractFourBytes(track.length);
    return chunkType.concat(chunkLength)
  }
  
  function createTempoTrack() {
    return [77, 84, 114, 107, 0, 0, 0, 4, 0, 255, 47, 0]; // MTrk
  }
  
  /*
   * Helper function
   * Returns an array of 4 bytes from the value passed
   */
  
  function extractFourBytes(dec) {
    var hexaValue = dec.toString(16);
    hexaValue = "00000000" + hexaValue;
    hexaValue = hexaValue.substring(hexaValue.length-8);
    // console.log(hexaValue);
    var a = [], num, theByte;
    for (i=0; i<8; i += 2) {
      theByte = hexaValue.substring(i, i+2);
      // console.log(theByte);
      num = parseInt(theByte,16);
      a.push(num);
    }
    console.log(a)
    return a;
  }
  
  // Public functions
  
  this.startRecording =  function () {
    _this.eventObjects = [];
    internalStop();
    console.log("Starting recording");
    _this.recording.notify();
    recStartTime = performance.now();
    midisystem.selectedMidiInput.onmidimessage = onMidiMessage;
  },

  this.stopRecorder = function () {
    console.log("Stopping recorder");
    midisystem.selectedMidiInput.onmidimessage = null;
    window.cancelAnimationFrame(_this.rAF);
    _this.idle.notify();
    reset = [176, 120, 0, 176, 121, 0, 176, 123, 0];
    setTimeout(function() {midisystem.selectedMidiOutput&&midisystem.selectedMidiOutput.send(reset)}, 350);	
  },
  
  this.playEvents =  function () {
    internalStop();
    curTime = performance.now();
    console.log("Playing...");
    _this.playing.notify();
    var eventPointer = 0;
    var startTime = performance.now();
    this.rAF = window.requestAnimationFrame(
      function queueEvents(timeStamp) {
        while (eventPointer<_this.eventObjects.length && _this.eventObjects[eventPointer].receivedTime < (timeStamp - startTime) + 150) {
          midisystem.selectedMidiOutput&&midisystem.selectedMidiOutput.send(_this.eventObjects[eventPointer].data, startTime+_this.eventObjects[eventPointer].receivedTime);
          eventPointer++;
        }
        if (eventPointer<_this.eventObjects.length) {
          _this.rAF = window.requestAnimationFrame(queueEvents);
        } else {
          _this.stopRecorder();
        }
      });
  },
  
  this.createMIDIfile = function(fileName){
    var myMFile = [], myMTrack = []
    myMFile = myMFile.concat(createMIDIheader()); // Add header to file
    var encodedTrackArray = encodeMIDIevents(); // Encode events
    myMTrack = createTrackheader(encodedTrackArray); // Add header to track, including length
    myMTrack = myMTrack.concat(encodedTrackArray); // concat track header and encoded events
    myMFile = myMFile.concat(createTempoTrack()); //add empty tempo track
    myMFile = myMFile.concat(myMTrack); // add track to file
    // console.log(myMFile);
    // Get ready to save!
    var data = new Uint8Array(myMFile); // create typed array
    var blob = new Blob( [data], { type: "application/x-midi"});  // create file/blob
    var blobURL = URL.createObjectURL(blob); // URL of blob
    var save = document.createElement('a'); // and save
    save.href = blobURL;
    save.download = fileName;
    save.click();
    URL.revokeObjectURL(save.href);
  },
  
  // prepares song for saving. Returns an object that firebase database can save 
  this.prepareSong = function(title, description) {
    song = {
      info: {
	title: title,
	description: description,
	date: new Date().toLocaleString(),
      },
      data: this.eventObjects, 
    }
    return song;
  }
}






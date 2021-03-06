/**
 * State
 * @class
 * @param {String} name
 * 
 */

function State(name) {
  this.name = name || Math.ceil(Math.random() * 1000000);
  this.transitions = {};
  this.actions = {
    onEnter: [],
    onExit: []
  };
}
State.prototype.addTransition = function(eventName, targetState) {
  this.transitions[eventName] = targetState;
  return this;
};
State.prototype.onEnter = function(fn) {
  this.actions.onEnter.push(fn);
  return this;
};
State.prototype.onExit = function(fn) {
  this.actions.onExit.push(fn);
  return this;
};


/**
 * Finite State machine. It changes states, and it runs the enter and exit actions in the states.
 *
 * param.startState {State} The starting state. Default: new State('State 1')
 * param.states {[State]} An array of states
 *
 */

function FSM(params) {
  this.parent = params.parent || null;
  this.state = params.startState || new State('State 1');
  this.states = params.states || [this.state];

  // TODO: DRY this up
  // Run starting states entry actions
  for (var j = this.state.actions.onEnter.length - 1; j >= 0; j--) {
    if (typeof this.state.actions.onEnter[j] === 'function') this.state.actions.onEnter[j](this.parent);
  };
}
FSM.prototype.triggerEvent = function(eventName) {
  // Check if current state will exit on this event

  var nextState = this.state.transitions[eventName];

  // No transition? Then warn and gettouttahere!
  if (!nextState) {
    console.warn('State ', this.state.name, 'has no transition for event', eventName);
    return this;
  }


  // Transition exists... find the state and go to it!
  for (var i = this.states.length - 1; i >= 0; i--) {
    if (this.states[i].name == nextState) {

      // perform the exit actions of current state
      for (var j = this.state.actions.onExit.length - 1; j >= 0; j--) {
        if (typeof this.state.actions.onExit[j] === 'function') this.state.actions.onExit[j](this.parent);
      };

      // Switch to next state
      this.state = this.states[i];

      // perform the entry actions of current state
      for (var j = this.state.actions.onEnter.length - 1; j >= 0; j--) {
        if (typeof this.state.actions.onEnter[j] === 'function') this.state.actions.onEnter[j](this.parent);
      };

      return;
    }
  };

  // Couldn't find the state...
  console.error('State', this.state.name, 'could not transition to state', nextState, ': It does not exist');
  return this;
};
FSM.prototype.createState = function(name) {
  var state = new State(name);
  this.states.push(state);
  return state;
};
FSM.prototype.deleteState = function(stateName) {
  if (typeof this.states[stateName] === 'Object') delete this.states[stateName];
};

var canv = document.getElementById('thecanvas');
var ctx = canv.getContext('2d');

// Create a rocket that flies for a little while
// and then explodes into pieces

function createRocket() {
  var aRocket = {};
  var fuseTime = 1 + Math.random(); // Time before it blows up
  var gravity = 0.1;

  // Set position
  aRocket.pos = {
    x: canv.width / 2, // middle
    y: 0 // bottom
  };

  // Set velocity
  aRocket.vel = {
    x: (Math.random() - 0.5) * 2, // random: -2 to 2
    y: 7 + 2 * Math.random() // random: 7 to 9
  };

  // Set color
  aRocket.color = 'rgba(0,255,0,1);'

  // Create state machine
  aRocket.fsm = new FSM({
    // Let the state machine know who owns it
    parent: aRocket,
    // Create and set the initial state
    startState: new State('flying').onEnter(function(obj) {

      // Set the fuse timeout
      setTimeout(function() {
        // Trigger the "explode" event
        aRocket.fsm.triggerEvent('explode');
      }, fuseTime * 1000);

      // Set the rocket's script
      obj.script = function() {
        // Move the rocket
        obj.pos.x += obj.vel.x;
        obj.pos.y += obj.vel.y;

        // Simulate "gravity" changing the velocity
        obj.vel.y -= gravity;
      };
    })
    // When the "explode" event happens, go to "exploding" state
    .addTransition('explode', 'exploding')
  });

  aRocket.fsm.createState('exploding').onEnter(function(obj) {


    function newObj() {
      var randX = (Math.random() - 0.5) * 10;
      var randY = (Math.random() - 0.5) * 10;

      return {
        pos: {
          x: obj.pos.x,
          y: obj.pos.y
        },
        vel: {
          x: randX,
          y: randY
        },
        color: 'rgba(' + Math.floor(255 * Math.random()) + ',' + Math.floor(255 * Math.random()) + ',' + Math.floor(255 * Math.random()) + ',1)',
        script: function() {
          this.pos.x += this.vel.x;
          this.pos.y += this.vel.y;

          this.vel.y -= 0.1;
        }
      }
    }

    for (var i = 0; i < 8; i++) objects.push(newObj());

    // move away from scene
    obj.pos.x = -1000;
    obj.pos.y = -1000;
  });

  return aRocket;
}

// Create objects list
var objects = [];

// Make button spawn a rocket
canv.addEventListener('click', function(e) {
  objects.push(createRocket());
});



// Set canvas size
canv.width = window.innerWidth;
canv.height = window.innerHeight;
window.addEventListener('resize', function(e) {
  canv.width = window.innerWidth;
  canv.height = window.innerHeight;
});



// ** UPDATE & RENDER EVERYTHING ** //
var update = function() {
  ctx.fillStyle = '#000000';
  ctx.clearRect(0, 0, canv.width, canv.height);
  ctx.fillRect(0, 0, canv.width, canv.height);

  for (var i = 0; i < objects.length; i++) {
    if (typeof objects[i].script == 'function') objects[i].script();

    var pos = {
      x: objects[i].pos.x,
      y: canv.height - objects[i].pos.y
    };

    // Gravity pulls, remove objects that are no longer visible
    if (objects[i].pos.y < -20) {
      // Remove object from list
      objects.splice(i, 1);

      // Since we removed one object from the list
      // it's now shorter. Decrease in order to
      // prevent missing an object
      i--;

      continue; // No need to draw the deleted object
    }

    // ** DRAWING ** //
    ctx.beginPath();
    ctx.fillStyle = '#666';

    // Use object's color or red
    ctx.strokeStyle = objects[i].color || '#ff0000';

    // Coordinate values
    ctx.fillText('(' + Math.floor(pos.x) + ',' + Math.floor(objects[i].pos.y) + ')', pos.x + 10, pos.y - 10);

    // Draw circle
    ctx.arc(pos.x, pos.y, 10, 2 * Math.PI, false);

    // Draw center cross
    ctx.moveTo(pos.x - 2, pos.y - 2);
    ctx.lineTo(pos.x + 2, pos.y + 2);
    ctx.moveTo(pos.x + 2, pos.y - 2);
    ctx.lineTo(pos.x - 2, pos.y + 2);

    // Actually DO draw all the lines and arcs
    ctx.stroke();
  };
};

// ** Start the program loop ** //
(function theLoop() {
  window.requestAnimationFrame(theLoop);
  update();
})();

// Add the first rocket
objects.push(createRocket());

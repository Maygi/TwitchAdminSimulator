/**
 * The game engine, which processes the main flow of basic logic.
 * Base is from Seth Ladd's Google IO talk in 2011.
 * Heavily upgraded by @Maygi.
**/

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();

function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimestamp = 0;
}

Timer.prototype.tick = function () {
	var wallDelta = 0;
	while (wallDelta < .016667) {
		var wallCurrent = Date.now();
		var wallDelta = (wallCurrent - this.wallLastTimestamp) / 1000;
	}
    this.wallLastTimestamp = wallCurrent;

    var gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
	//console.log("delta: " + wallDelta + "; game delta: " + gameDelta +"; game time: " + this.gameTime);
    return gameDelta;
};

function GameEngine() {
    this.entities = [];
    this.showOutlines = false;
    this.ctx = null;
}

GameEngine.prototype.init = function (ctx) {
	WebFont.load({
		google: {
			families: ['Proxima Nova:300,400,700']
		}
	});
	
	gameReference = this;
	this.buttonChallenge = new ButtonChallenge(this);
	this.highPriority = 1000;
	this.score = 0;
	this.time = 0;
	this.maxTime = 1;
	this.cameraShakeAmount = 0;
	this.cameraShakeTime = 0;
	this.cameraShakeDecay = 0;
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.startInput();
	this.absorbEntity = null;
    this.timer = new Timer();
    this.player1 = null;
	this.player1AttackIndex = 0; //the actual skill being used
	this.player1AttackInput = 0; //the raw attack input
	this.player1LastLightAttack = 0;
	this.currentPhase = -1;
	this.currentBoss = null;
    this.currentMap = null;
    this.spaceDown = false;
    this.UI = null;
    this.textSpeed = 5;
    this.step = 0;
    this.cameraLock = false;
    this.gameWon = false;
    this.cameraSpeed = 15;
	this.cutTime = 0; // the time where the black cross-screen cut effect is in play
	this.pauseTime = 0;
	this.jellybait = false;
	this.currentMapId = GAME_START;
	this.tipsShown = [
		false, false, false
	];
    this.camera = { //where the camera wants to be
    	x: -2400,
    	y: 0,
    	minX: -2400,
    	maxX: 2000000000,
    	minY: 0,
    	maxY: 0,
    	width: 800,
    	height: 500
    };
    this.liveCamera = { //where the camera actually is
    	x: -2400,
    	y: 0,
    	width: 800,
    	height: 500
    };
    console.log("Game initialized");
};

GameEngine.prototype.start = function () {
    console.log("Starting game");
    var that = this;
    (function gameLoop() {
        that.loop();
        requestAnimFrame(gameLoop, that.ctx.canvas);
    })();
};

var TIP_KELP = 0;
var TIP_ATTACK = 1;
var TIP_DROPTHROUGH = 2;

var GAME_PHASE_CLAM = 5;
var GAME_PHASE_POSTCLAM = 6;
var GAME_PHASE_AFTER_CLAM = 7;
var GAME_PHASE_EATEN = 8;
var GAME_PHASE_ANGLER = 9;
var GAME_PHASE_POSTANGLER = 10;

GameEngine.prototype.showTip = function (idx) {
	if (!this.tipsShown[idx]) {
		this.tipsShown[idx] = true;
		switch(idx) {
			case TIP_KELP:
				this.addEntity(new InfoBox(this, "Stand inside kelp to restore oxygen."));
				break;
			case TIP_ATTACK:
				this.addEntity(new InfoBox(this, "Press Z to attack."));
				break;
			case TIP_DROPTHROUGH:
				this.addEntity(new InfoBox(this, "Press ↓ + Jump on a platform to drop through."));
				break;
			default:
				break;
		}
	}
};
GameEngine.prototype.startInput = function () {
    console.log("Starting input");
    var that = this;
	var buttonOptions = ["↑","↓","←"];
	var buttonKeys = ['&','(','%'];
    this.ctx.canvas.addEventListener("keydown", function (e) {
		if (that.buttonChallenge != null && !that.player1.isDead && that.player1.currentHealth > 0) {
			if (that.buttonChallenge.cooldown == 0) {
				for (var i = 0; i < buttonOptions.length; i++) {
					if (that.buttonChallenge.currentButtons.length > 0) {
						if (that.buttonChallenge.currentButtons[0] == buttonOptions[i]) {
							if (String.fromCharCode(e.which) == '&') {
								that.player1.animationDelay = 30;
								that.player1.currentAnimation = that.player1.okAnimation;
							} else {
								that.player1.animationDelay = 30;
								that.player1.currentAnimation = that.player1.noAnimation;								
							}
							if (String.fromCharCode(e.which) == buttonKeys[i]) {
								that.buttonChallenge.success();
								break;
							} else {
								that.buttonChallenge.fail();
								break;
							}
						}
					}
				}
			}
		} else {
			if (String.fromCharCode(e.which) === ' ' || String.fromCharCode(e.which) === 'X') {
				that.textSpeed = 1;
				that.spaceDown = true;
			}
			if (String.fromCharCode(e.which) === 'R') {
				if (that.player1.dead) { //revive
					that.player1.dead = false;
					that.player1.currentHealth = that.player1.maxHealth;
					if (that.player1.currentForm == FORM_BABY) {
						that.player1.currentStamina = that.player1.maxStamina;
					}
					that.player1.vulnerable = false;
					that.player1.invulnTimer = that.player1.invulnTimerMax * 2;
					that.player1.hitByAttack = true;
					that.player1.xVelocity = 0;
					that.player1.stunTimer = 2;
					that.player1.stunned = true;
					that.player1.difficultyTick = 0;
					
					that.pauseTime = 5;
					that.addEntity(new BlackScreenFade(that, 30));
					//that.player1.teleportToX = that.player1.lastSafeX;
					//that.player1.teleportToY = that.player1.lastSafeY - 3;
					
					that.player1.displacementXSpeed = 0;
					that.score = 0; //Math.round(that.score * 0.8);
				}
			}
			e.preventDefault();
		}
    }, false);
    this.ctx.canvas.addEventListener("keyup", function (e) {
        e.preventDefault();
    }, false);
    console.log('Input started');
};

GameEngine.prototype.addEntity = function (entity) {
    //console.log('Added Entity');
    this.entities.push(entity);
};

GameEngine.prototype.setPlayer1 = function (entity) {
    this.player1 = entity;
};

GameEngine.prototype.setBoss = function (entity) {
    this.currentBoss = entity;
};

GameEngine.prototype.setMap = function (entity) {
    this.currentMap = entity;
};

GameEngine.prototype.advancePhase = function(phase) {
	this.currentPhase = phase;
	this.player1.phaseTick = 0;
	if (this.currentPhase == GAME_PHASE_AFTER_CLAM) {
		startMusic.pause();
		bossMusic.pause();
		this.cameraSpeed = 15;
		this.camera = { 
			x: -2400,
			y: 0,
			minX: -2200,
			maxX: 10000,
			minY: 0,
			maxY: 5000,
			width: 800,
			height: 500
		};
	}
};

var GAME_START = 1;
GameEngine.prototype.setUI = function (entity) {
    this.UI = entity;
};

GameEngine.prototype.draw = function () {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    this.ctx.translate(-this.liveCamera.x, -this.liveCamera.y);
	var highPriorityEntities = [];
	var highPriorityEntities2 = [];
	var highPriorityEntities3 = []; //over ui
    for (var i = 0; i < this.entities.length; i++) {
		if (this.entities[i] instanceof Character)
			continue;
		if (this.entities[i].highPriority > 0) {
			if (this.entities[i].highPriority >= 3)
				highPriorityEntities3.push(i);
			else if (this.entities[i].highPriority === 2)
				highPriorityEntities2.push(i);
			else
				highPriorityEntities.push(i);
		} else
			this.entities[i].draw(this.ctx);
    }
    for (var i = 0; i < highPriorityEntities.length; i++) {
		this.entities[highPriorityEntities[i]].draw(this.ctx);
    }
    for (var i = 0; i < highPriorityEntities2.length; i++) {
		this.entities[highPriorityEntities2[i]].draw(this.ctx);
    }
	this.player1.draw(this.ctx);
	if (!this.player1.dead && this.pauseTime == 0)
		this.UI.draw(this.ctx);
    for (var i = 0; i < highPriorityEntities3.length; i++) {
		this.entities[highPriorityEntities3[i]].draw(this.ctx);
    }
    this.ctx.restore();
};

GameEngine.prototype.cameraShake = function(amount, time) {
	this.cameraShakeAmount = amount;
	this.cameraShakeTime = time;
}

GameEngine.prototype.update = function () {
	if (!this.player1.dead) {
		if (this.pauseTime > 0)
			this.pauseTime--;
		if (this.cutTime > 0) {
			this.cutTime--;
			handleCut(this);
		} else if (this.pauseTime === 0) {
			this.step++;
		}
	}
	if (!this.cameraLock) {
		if (this.scoreToSet > 0) {
			this.score = this.scoreToSet;
			this.scoreToSet = 0;
		}
		if (this.maxTime > 1 && this.player1.currentHealth > 0) {
			if (this.time > 0)
				this.time--;			
			if (this.time == 0)
				this.player1.currentHealth--;
		}
		this.camera.x = this.player1.x - 200 - (this.camera.maxY > 500 ? 100 : 0);
		this.camera.y = this.player1.y - (this.camera.maxY > 500 ? 200 : 0);
		//console.log("Updating camera coords to (" + this.camera.x+", "+this.camera.y+")");
		if (this.camera.x < this.camera.minX) {
			this.camera.x = this.camera.minX;
		}
		if (this.camera.y < this.camera.minY) {
			this.camera.y = this.camera.minY;
		}
		if (this.camera.x > this.camera.maxX) {
			this.camera.x = this.camera.maxX;
		}
		if (this.camera.y > this.camera.maxY) {
			this.camera.y = this.camera.maxY;
		}
		
		if (this.currentPhase === 1) { //starting game phase: scroll to the right
            //this.camera.x = -2400 + (this.step) * 2;
		}
	    if (this.liveCamera.x != this.camera.x) {
	    	if (this.liveCamera.x < this.camera.x) {
	    		this.liveCamera.x = Math.min(this.camera.x, this.liveCamera.x + this.cameraSpeed);
	    	} else {
	    		this.liveCamera.x = Math.max(this.camera.x, this.liveCamera.x - this.cameraSpeed);	    		
	    	}
	    }
	    if (this.liveCamera.y != this.camera.y) {
	    	if (this.liveCamera.y < this.camera.y) {
	    		this.liveCamera.y = Math.min(this.camera.y, this.liveCamera.y + this.cameraSpeed);
	    	} else {
	    		this.liveCamera.y = Math.max(this.camera.y, this.liveCamera.y - this.cameraSpeed);	    		
	    	}
	    }
        if (this.currentPhase === -1 && this.camera.x >= 0) {
            this.currentPhase = 0;
            this.camera.x = 0;
            this.liveCamera.x = 0;
            this.cameraLock = true;
        }
	}
	//CAMERA SHAKE
	/*if ((this.currentPhase >= 6 && this.currentPhase <= 10) || this.currentPhase === 17) {
		this.liveCamera.x += -5 + Math.random() * 10;
		this.liveCamera.y += -5 + Math.random() * 10;
	}*/
	if (this.cameraShakeTime > 0) {
		this.cameraShakeTime--;
		this.cameraShakeAmount -= this.cameraShakeDecay;
		this.liveCamera.x = this.camera.x - this.cameraShakeAmount / 2 + Math.random() * this.cameraShakeAmount / 2;
		this.liveCamera.y = this.camera.y - this.cameraShakeAmount / 2 + Math.random() * this.cameraShakeAmount / 2;
		if (this.cameraShakeAmount <= 0) {
			this.cameraShakeTime = 0;
            this.liveCamera.x = this.camera.x;
            this.liveCamera.y = this.camera.y;
		}
	}
    var entitiesCount = this.entities.length;
    for (var i = 0; i < entitiesCount; i++) {
        var entity = this.entities[i];
        if (entity != undefined && !entity.removeFromWorld && (this.pauseTime === 0 || (entity.highPriority > 0 || entity instanceof TextBox))) {
            entity.update();
        }
    }
    for (var i = this.currentMap.platforms.length - 1; i >= 0; --i) {
        if (this.currentMap.platforms[i].removeFromWorld || this.currentMap.platforms[i] < this.liveCamera.x - 100) {
            this.currentMap.platforms.splice(i, 1);
        }
    }
    for (var i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i].removeFromWorld || this.currentMap.platforms[i] < this.liveCamera.x - 100) {
            this.entities.splice(i, 1);
        }
    }
};

GameEngine.prototype.loop = function () {
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.space = null;
	this.r = null;
};

function Entity(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.removeFromWorld = false;
}

Entity.prototype.update = function () {
};

Entity.prototype.draw = function (ctx) {
	/*
    if (this.game.showOutlines && this.radius) {
        this.game.ctx.beginPath();
        this.game.ctx.strokeStyle = "green";
        this.game.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.game.ctx.stroke();
        this.game.ctx.closePath();
    }*/
};

Entity.prototype.rotateAndCache = function (image, angle) {
    var offscreenCanvas = document.createElement('canvas');
    var size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    var offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size / 2, size / 2);
    offscreenCtx.rotate(angle);
    offscreenCtx.translate(0, 0);
    offscreenCtx.drawImage(image, -(image.width / 2), -(image.height / 2));
    offscreenCtx.restore();
    //offscreenCtx.strokeStyle = "red";
    //offscreenCtx.strokeRect(0,0,size,size);
    return offscreenCanvas;
};

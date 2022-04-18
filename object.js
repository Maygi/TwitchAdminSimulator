let myFont = new FontFace(
  "Font",
  "url(./fonts/AYearWithoutRain.ttf)"
);

class BackgroundObject {
	constructor(game, x, y) {
		this.game = game;
		this.x = x;
		this.y = y;
		this.backgroundObject = false; //is a BackgroundObject is a backgroundObject, that means it's not interactable ever!
		this.interactable = false;
		this.interactDistance = 100;
		this.interactText = "Interact";
		this.interactButton = new Animation(ASSET_MANAGER.getAsset("./img/Misc/t_key.png"), 0, 0, 32, 32, 1, 1, true, false, 0, 0);
		this.interactOptionOffsetX = 16;
		this.interactOptionOffsetY = -16;
		this.cooldown = 0;
		this.interactCooldown = 150;
		this.interactChat = [];
		this.pauseTime = 0;
		this.textDelay = 0; //a delay time before the text appears, in ms
		this.sound = null;
		this.tick = 0;
		this.phase = 0;
		this.mapFlag = false;
	}
	
	getX() {
		return this.x + this.displacementX;
	}
	
	getY() {
		return this.y + this.displacementY;
	}
	
	getXMidpoint() {
		return this.x + this.hitBoxDef.offsetX + this.hitBoxDef.width / 2;
	}
	
	getYMidpoint() {
		return this.y + this.hitBoxDef.offsetY + this.hitBoxDef.height / 2;
	}
	
	isLeftOfPlayer() {
		return this.getXMidpoint() < this.game.player1.x + this.game.player1.hitBoxDef.offsetX + this.game.player1.hitBoxDef.width / 2;
	}
	
	distanceToPlayer() {
		return Math.abs(this.getXMidpoint() - (this.game.player1.x + this.game.player1.hitBoxDef.offsetX + this.game.player1.hitBoxDef.width / 2));
	}
	distanceToPlayerY() {
		return Math.abs(this.getYMidpoint() - (this.game.player1.y + this.game.player1.hitBoxDef.offsetY + this.game.player1.hitBoxDef.height / 2));
	}
	
	xToPlayer() {
		return this.getXMidpoint() - (this.game.player1.x + this.game.player1.hitBoxDef.offsetX + this.game.player1.hitBoxDef.width / 2);
	}
	update() {
		this.tick++;
		if (this.cooldown > 0)
			this.cooldown--;
		if (!this.backgroundObject && this.distanceToPlayer() <= this.interactDistance && this.cooldown == 0) {
			this.interactable = true;
		} else {
			this.interactable = false;
		}
		if (this.game.interactDown && this.interactable) {
			this.interact();
		}
	}
	interact() {
		this.interactable = false;
		if (this.sound != null) {
			playSound(this.sound);
		}
		setTimeout(
			function() {
				var index = 0;
				while (index < that.interactChat.length) {
					if (index > 0 && that.game.pauseTime > 0)
						continue;
					var chat = that.interactChat[index];
					that.game.addEntity(new TextBox(that.game, chat.image, chat.text, true));
					index++;
				}
				console.log("Interacted with object at " + that.x +", " + that.y);
				that.cooldown = that.interactCooldown;
			}, this.textDelay);
		this.game.pauseTime = this.pauseTime;
		var that = this;
	}
	
	draw(ctx) {
		if (this.currentAnimation != null) {
			this.currentAnimation.drawFrame(this.game.clockTick, ctx, this.x + this.currentAnimation.offsetX, this.y + this.currentAnimation.offsetY, 1, false, null);
			if (this.interactable) {
				this.interactButton.drawFrame(this.game.clockTick, ctx, this.x + this.interactButton.offsetX + this.interactOptionOffsetX, 
					this.y + this.interactButton.offsetY + this.interactOptionOffsetY, 1, false, null);
				ctx.font = "24px Font";
				ctx.fillStyle = "white";
				ctx.textAlign = "left"; 
				ctx.fillText(this.interactText, this.x + this.interactButton.offsetX + this.interactOptionOffsetX + 32 + 5, 
						this.y + this.interactButton.offsetY + this.interactOptionOffsetY + 24);
			}
			drawHitBox(this, ctx);
			Entity.prototype.draw.call(this);
		}
	}
}
irlPics = [];
vtPics = [];
	
Array.prototype.insert = function ( index, item ) {
    this.splice( index, 0, item );
};

class ButtonChallenge extends BackgroundObject {
	constructor(game) {
		super(game, 0, 0);
		this.backgroundObject = true;
		this.currentAnimation = null;
		this.kelp = null;
		this.hitBoxDef = {
			width: 32, height: 32, offsetX: 0, offsetY: 0, growthX: 0, growthY: 0
		};
		this.buttonOptions = ["↑","↓"];
		this.tagOptions = ["ASMR", "Anime", "Veteran", "Chilled", "Cozy", "Chatty", "English", "ADHD", "Tutorial", "Educational", "LGBTQIA+", "Mental Health", "Playing with Viewers", "Bisexual", "USA", "Hyped", "Funny"];
		
		this.tags = [];
		this.anim = null;
		
		this.irlLib = [];
		this.vtLib = [];
		
		for (var i = 0; i <= 25; i++) {
			try {
				ASSET_MANAGER.queueDownload("./img/IRL/" + i + ".jpg");
				irlPics.push("./img/IRL/" + i + ".jpg");
				this.irlLib.push("./img/IRL/" + i + ".jpg");
			} catch (error) {
				break;
			}
		}
		for (var i = 0; i <= 32; i++) {
			try {
				ASSET_MANAGER.queueDownload("./img/VT/" + i + ".jpg");
				vtPics.push("./img/VT/" + i + ".jpg");
				this.vtLib.push("./img/VT/" + i + ".jpg");
			} catch (error) {
				break;
			}
		}
		ASSET_MANAGER.downloadAll();
		
		this.vtuber = false;
		
		this.currentButtons = [];
		this.completedButtons = [];
		this.buttonScrollTime = 0;
		this.buttonScrollSpeed = 0;
		this.buttonScrollAmount = 0;
		this.completeCount = 0;
		this.awawa = false;
		this.laser = null;
		this.dim = [0, 0];
		this.laser2 = null;
		for (var i = 0; i < 5; i++) {
			this.currentButtons.push(this.buttonOptions[Math.floor(Math.random() * this.buttonOptions.length)]);
		}
		
		this.rollAnim();
		console.log(this.currentButtons);
		drawHitBox(this);
	}
	
	getMeta(url) {   
		var img = new Image();
		var toReturn = [0, 0];
		var that = this;
		img.addEventListener("load", function(){
			toReturn[0] = this.naturalWidth;
			toReturn[1] = this.naturalHeight;
			console.log(toReturn);
			that.anim = new Animation(ASSET_MANAGER.getAsset(url), 0, 0, toReturn[0], toReturn[1], 1, 1, false, false, 0, 0);
			that.dim = toReturn;
		});
		img.src = url;
	}
	
	rollAnim() {
		var index = 0;
		if (Math.random() >= 0.5) {
			
			index = Math.floor(Math.random() * this.vtLib.length);
			console.log("VT: " + index);
			this.vtuber = true;
			this.getMeta(this.vtLib[index]);
			this.vtLib.splice(index, 1);
			if (this.vtLib.length == 0) {
				for (var i = 0; i < vtPics.length; i++) {
					this.vtLib.push(vtPics[i]); //repopulate
				}
			}
			//this.anim = new Animation(ASSET_MANAGER.getAsset("./img/Character/char_idle.png"), 0, 0, 64, 64, 1, 1, false, false, 0, 0);
		} else {
			index = Math.floor(Math.random() * this.irlLib.length);
			console.log("IRL: " + index);
			this.vtuber = false;
			this.getMeta(this.irlLib[index]);
			this.irlLib.splice(index, 1);
			if (this.irlLib.length == 0) {
				for (var i = 0; i < irlPics.length; i++) {
					this.irlLib.push(irlPics[i]); //repopulate
				}
			}
			//this.anim = new Animation(ASSET_MANAGER.getAsset(index), 0, 0, dims[0], dims[1], 1, 1, false, false, 0, 0);
		}
		
		this.tags = [];
		var tagAmount = 3;
		for (var i = 0; i < this.tagOptions.length; i++) {
			var chance = tagAmount / Math.max(1, this.tagOptions.length - i);
			//console.log("need to add: " + tagAmount + " tags. chance: " + chance + ". trying to add: " + this.tagOptions[i]);
			if (Math.random() < chance) {
				tagAmount--;
				this.tags.push(this.tagOptions[i]);
				if (tagAmount == 0)
					break;
			}
		}
		if (this.currentButtons[0] == "↑") { //it's something correct
			if (!this.vtuber) {
				this.tags.insert(Math.floor(Math.random() * this.tags.length), "IRL");
			} else {
				this.tags.insert(Math.floor(Math.random() * this.tags.length), "VTuber");
			}
		} else {
			if (!this.vtuber) {
				this.tags.insert(Math.floor(Math.random() * this.tags.length), "VTuber");
			} else {
				this.tags.insert(Math.floor(Math.random() * this.tags.length), "IRL");
			}			
		}
	}
	
	
	success() {
		var particle = new Particle(TEXT_PART, 400 + this.game.liveCamera.x, 100 + this.game.liveCamera.y, 
				0, 0, -3, -3, 0, 0.1, 0, 5, 10, 50, 1, 0, false, this.game);
		var damageText = new TextElement("Success", "Lucida Console", 25, "green");
		particle.other = damageText;
		this.game.addEntity(particle);
		this.currentButtons.shift();
		this.buttonScrollSpeed = 15;
		this.buttonScrollAmount = 0;
		this.cooldown = 5;
		this.completeCount++;
		this.currentButtons.push(this.buttonOptions[Math.floor(Math.random() * this.buttonOptions.length)]);
		playSound(beepSound);
		this.rollAnim();
		addScore(this.game, 100);
		this.game.time = Math.max(30, 150 - (this.game.score / 1000) * 10);
		this.game.maxTime = this.game.time;
	}
	fail() {
		var particle = new Particle(TEXT_PART, 400 + this.game.liveCamera.x , 100 + this.game.liveCamera.y, 
				0, 0, -3, -3, 0, 0.1, 0, 5, 10, 50, 1, 0, false, this.game);
		var damageText = new TextElement("FAIL", "Lucida Console", 25, "red");
		particle.other = damageText;
		this.game.addEntity(particle);
		this.cooldown = 30;
		playSound(failSound);
		this.game.player1.currentHealth -= 20;
	}
	update() {
		if (this.buttonScrollSpeed > 0) {
			this.buttonScrollAmount += this.buttonScrollSpeed;
			this.buttonScrollSpeed *= 0.72;
			if (this.buttonScrollSpeed < 1) {
				this.buttonScrollSpeed = 0;
				this.buttonScrollAmount = 0;
			}
		}
		super.update();
	}
	draw(ctx) {
		ctx.font = "24px Font";
		if (this.cooldown > 0)
			ctx.fillStyle = "gray";
		else
			ctx.fillStyle = "white";
		ctx.textAlign = "left"; 
		if (this.anim != null) {
			this.anim.drawFrame(this.game.clockTick, ctx, this.game.liveCamera.x + 250 + (300 - this.dim[1]) / 2, this.game.liveCamera.y + 100, 1, true);
		}
		ctx.textAlign = "center";
		for (var i = 0; i < this.tags.length; i++) {
			ctx.fillStyle = "gray";
			ctx.fillRect(100 + 1 + this.game.liveCamera.x + 150 * (this.buttonScrollSpeed > 0 ? i + 1 : i) - this.buttonScrollAmount, 394 + this.game.liveCamera.y, 100, 32);
			ctx.fillStyle = "black";
			ctx.fillText(this.tags[i], (150 + 1 + this.game.liveCamera.x + 150 * (this.buttonScrollSpeed > 0 ? i + 1 : i)) - this.buttonScrollAmount,
				420 + this.game.liveCamera.y + 1);
			ctx.fillStyle = "white";
			ctx.fillText(this.tags[i], (150 + this.game.liveCamera.x + 150 * (this.buttonScrollSpeed > 0 ? i + 1 : i)) - this.buttonScrollAmount,
				420 + this.game.liveCamera.y);
		}
		Entity.prototype.draw.call(this);
	}
}
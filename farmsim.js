
// Obtain the browser's preferred language.
var currentLanguage = (window.navigator.language || window.navigator.userLanguage || window.navigator.userLanguage).substr(0, 2);

i18n.init({lng: currentLanguage, fallbackLng: 'en', resStore: resources, getAsync: false});


var width;
var height;
var stage;
var renderer;
var game;

window.onload = function(){
	width = 640;
	height = 480;
	renderer = PIXI.autoDetectRenderer(width, height);

	document.getElementById("stage").appendChild(renderer.view);

	stage = new PIXI.Stage;

	init();
}

function init(){
	game = new FarmGame(width / 32, height / 32);

	var groundTexture = PIXI.Texture.fromImage("assets/dirt.png");
	var ridgeTexture = PIXI.Texture.fromImage("assets/ridge.png");
	var mulchTexture = PIXI.Texture.fromImage("assets/mulch.png");
	var weedsTextures = [
		PIXI.Texture.fromImage("assets/weeds1.png"),
		PIXI.Texture.fromImage("assets/weeds2.png"),
		PIXI.Texture.fromImage("assets/weeds3.png"),
	];
	var weedsThresholds = [
		0.25, 0.50, 0.75
	];
	var cornTextures = [
		PIXI.Texture.fromImage("assets/corn0.png"),
		PIXI.Texture.fromImage("assets/corn1.png"),
		PIXI.Texture.fromImage("assets/corn2.png"),
		PIXI.Texture.fromImage("assets/corn3.png"),
		PIXI.Texture.fromImage("assets/corn4.png"),
		PIXI.Texture.fromImage("assets/corn5.png"),
	];
	var cornThresholds = [
		0.0, 0.25, 0.50, 0.75, 1.0, 2.0
	];
	var potatoTextures = [
		PIXI.Texture.fromImage("assets/potato0.png"),
		PIXI.Texture.fromImage("assets/potato1.png"),
		PIXI.Texture.fromImage("assets/potato2.png"),
		PIXI.Texture.fromImage("assets/potato3.png"),
		PIXI.Texture.fromImage("assets/potato4.png"),
		PIXI.Texture.fromImage("assets/potato5.png"),
	];
	var potatoThresholds = [
		0.0, 0.25, 0.50, 0.75, 1.0, 2.0
	];

	var ground = new PIXI.DisplayObjectContainer();
	stage.addChild(ground);

	game.onUpdateCell = function(cell,x,y){
		if(cell.graphics == undefined){
			cell.graphics = new PIXI.DisplayObjectContainer();

			// Temporarily add an utility function to PIXI.DisplayObjectContainer that
			// returns the index of a given child.
			// This function is used to insert mulch sheet after crops.
			cell.graphics.getChildIndex = function(child){
				for(var i = 0; i < this.children.length; i++)
					if(this.children[i] === child)
						return i;
				return -1;
			}

			ground.addChild(cell.graphics);
		}
		if(cell.gs == undefined){
			var groundSprite = new PIXI.Sprite(groundTexture);
			groundSprite.position.x = x * 32;
			groundSprite.position.y = y * 32;
			groundSprite.interactive = true;
			groundSprite.mousedown = function(id){
				clickCallback.call(game, cell);
			};
			groundSprite.mouseover = function(id){
				statusCursor = {x:x, y:y};
			}
			groundSprite.tap = function(id){
				id.target.mousedown(id);
				id.target.mouseover(id);
			}
			cell.graphics.addChild(groundSprite);

			// Add the color filter after the ground sprite to cover over it.
			cell.groundColorFilter = new PIXI.Graphics();
			cell.groundColorFilter.beginFill(0x000000, 1.);
			cell.groundColorFilter.drawRect(groundSprite.x, groundSprite.y, 32, 32);
			cell.graphics.addChild(cell.groundColorFilter);

			cell.gs = groundSprite;
		}
		var f = 0.5 * (cell.humidity);
		cell.groundColorFilter.alpha = f;

		cell.gs.setTexture(cell.plowed ? ridgeTexture : groundTexture);

		// Add mulch sheet graphics
		if(0 < cell.mulch && cell.mulchGraphics == undefined){
			cell.mulchGraphics = new PIXI.Sprite(mulchTexture);
			cell.mulchGraphics.position = cell.gs.position;
			// We do not want mulch sheet graphics drawn over crops, so we find the corn sprite index
			// and insert the mulch graphics after it.
			var cropIndex = cell.cornSprite != undefined ? cell.graphics.getChildIndex(cell.cornSprite) : -1;
			if(cropIndex == -1)
				cell.graphics.addChild(cell.mulchGraphics);
			else
				cell.graphics.addChildAt(cell.mulchGraphics, cropIndex);
		}
		else if(cell.mulch == 0 && cell.mulchGraphics != undefined){
			cell.graphics.removeChild(cell.mulchGraphics);
			cell.mulchGraphics = undefined;
		}

		for(var weedsIndex = 0; weedsIndex < weedsTextures.length; weedsIndex++){
			if(cell.weeds < weedsThresholds[weedsIndex])
				break;
		}
		if(0 < weedsIndex){
			if(cell.weedsSprite == undefined){
				var weedsSprite = new PIXI.Sprite(weedsTextures[weedsIndex - 1]);

				weedsSprite.position = cell.gs.position;
				cell.graphics.addChild(weedsSprite);
				cell.weedsSprite = weedsSprite;
			}
			else
				cell.weedsSprite.setTexture(weedsTextures[weedsIndex - 1]);
		}
		else if(cell.weedsSprite != undefined){
			cell.graphics.removeChild(cell.weedsSprite);
			cell.weedsSprite = undefined;
		}
		var cornIndex = 0;
		var textures = cornTextures;
		var thresholds = cornThresholds;
		if(cell.crop){
			if(cell.crop.type == "Potato"){
				textures = potatoTextures;
				thresholds = potatoThresholds;
			}
			for(; cornIndex < textures.length; cornIndex++){
				if(cell.crop.amount < thresholds[cornIndex])
					break;
			}
		}
		if(0 < cornIndex){
			if(cell.cornSprite == undefined){
				var cornSprite = new PIXI.Sprite(textures[cornIndex - 1]);

				cornSprite.position = cell.gs.position;
				cell.graphics.addChild(cornSprite);
				cell.cornSprite = cornSprite;
			}
			else
				cell.cornSprite.setTexture(textures[cornIndex - 1]);
		}
		else if(cell.cornSprite != undefined){
			cell.graphics.removeChild(cell.cornSprite);
			cell.cornSprite = undefined;
		}
	}

	game.onAutoSave = function(str){
		document.getElementById('autoSaveText').value = str;
	}

	game.init();

	var cursorTexture = new PIXI.Texture.fromImage("assets/cursor.png");
	var cursorSprite = new PIXI.Sprite(cursorTexture);
	stage.addChild(cursorSprite);

	var overlay = new PIXI.DisplayObjectContainer();

	// The status panel shows information about a cell under the cursor.
	var statusCursor = {x: 0, y: 0};
	var statusPanel = new PIXI.DisplayObjectContainer();
	var statusPanelFrame = new PIXI.Graphics();
	statusPanelFrame.beginFill(0x000000, 0.5);
	statusPanelFrame.lineStyle(2, 0xffffff, 1);
	statusPanelFrame.drawRect(0, 0, 120, 145);
	statusPanel.addChild(statusPanelFrame);
	var statusText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	statusText.y = 5;
	statusText.x = 5;
	statusPanel.addChild(statusText);
	statusPanel.x = 10;
	statusPanel.y = 10;
	overlay.addChild(statusPanel);

	function Bar(x, y){
		PIXI.DisplayObjectContainer.call(this);
		this.x = x;
		this.y = y;
		this.backBar = new PIXI.Graphics();
		this.backBar.beginFill(0xff0000, 1.0);
		this.backBar.drawRect(0, 0, 100, 3);
		this.addChild(this.backBar);
		this.topBar = new PIXI.Graphics();
		this.topBar.beginFill(0x00ff00, 1.0);
		this.topBar.drawRect(0, 0, 100, 3);
		this.addChild(this.topBar);
	}
	Bar.prototype = new PIXI.DisplayObjectContainer();

	Bar.prototype.setFactor = function(factor){
		this.topBar.scale.x = factor;
	}

	// The global status panel shows information about the player and other global things.
	var gstatusPanel = new PIXI.DisplayObjectContainer();
	var gstatusPanelFrame = new PIXI.Graphics();
	gstatusPanelFrame.beginFill(0x000000, 0.5);
	gstatusPanelFrame.lineStyle(2, 0xffffff, 1);
	gstatusPanelFrame.drawRect(0, 0, 120, 55);
	gstatusPanel.addChild(gstatusPanelFrame);
	var gstatusText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	gstatusText.y = 5;
	gstatusText.x = 5;
	gstatusPanel.addChild(gstatusText);
	var gstatusWPBar = new Bar(10, 20);
	gstatusPanel.addChild(gstatusWPBar);
	var gstatusCashText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	gstatusCashText.x = 5;
	gstatusCashText.y = 30;
	gstatusPanel.addChild(gstatusCashText);
	gstatusPanel.x = 10;
	gstatusPanel.y = height - 65;
	overlay.addChild(gstatusPanel);

	var buttonTip = new PIXI.DisplayObjectContainer();
	var buttonTipFiller = new PIXI.Graphics();
	buttonTipFiller.beginFill(0x000000, 0.5);
	buttonTipFiller.lineStyle(2, 0xffffff, 1);
	buttonTipFiller.drawRect(0, 0, 170, 60);
	buttonTip.addChild(buttonTipFiller);
	var buttonTipWorkingPowerText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	buttonTipWorkingPowerText.x = 5;
	buttonTipWorkingPowerText.y = 5;
	buttonTip.addChild(buttonTipWorkingPowerText);
	buttonTip.x = width - 300;
	buttonTip.y = 10;
	buttonTip.visible = false;
	overlay.addChild(buttonTip);

	var buttons = [];

	/// Internal Button class.
	function Button(iconImage, caption, clickEvent, active){
		PIXI.DisplayObjectContainer.apply(this, arguments);

		// Interactivity initialization
		this.interactive = true;
		this.click = function(id){
			clickCallback = clickEvent;
			// Update activation state for mode select buttons
			for(var i = 0; i < buttons.length; i++)
				buttons[i].setActive(buttons[i] == this);
		}
		this.tap = this.click;
		this.mouseover = function(id){
			buttonTipWorkingPowerText.setText(clickEvent.description());
			buttonTip.visible = true;
		}
		this.mouseout = function(id){
			buttonTip.visible = false;
		}
		this.hitArea = new PIXI.Rectangle(0, 0, 100, 40);

		if(buttons.length != 0 && buttons[buttons.length-1] != null){
			this.x = buttons[buttons.length-1].x;
			this.y = buttons[buttons.length-1].y + 50;
		}

		// Append this object to a list of buttons for click event processing
		buttons.push(this);

		// Button background graphics, partially transparent to show things behind
		var filler = new PIXI.Graphics();
		filler.beginFill(0x000000, 0.5);
		filler.lineStyle(1, 0x7f7f7f, 1);
		filler.drawRect(0, 0, 100, 40);
		this.addChild(filler);

		// Button frame graphics that can be hidden if inactive
		this.frame = new PIXI.Graphics();
		this.frame.lineStyle(2, 0xffffff, 1);
		this.frame.drawRect(0, 0, 100, 40);
		this.addChild(this.frame);

		// Allocate icon image if specified
		if(iconImage){
			var icon = new PIXI.Sprite(PIXI.Texture.fromImage(iconImage));
			icon.x = 4;
			icon.y = 4;
			this.addChild(icon);
		}

		// Button caption text
		this.text = null;
		if(caption){
			this.text = new PIXI.Text(caption, {font: "15px Helvetica", fill: "#ffffff"});
			this.text.x = 40;
			this.text.y = 12;
			this.addChild(this.text);
		}
		this.setActive(active);
	}
	Button.prototype = new PIXI.DisplayObjectContainer;

	Button.prototype.setActive = function(active){
		this.frame.visible = active;
		if(this.text)
			this.text.setStyle({font: "15px Helvetica", fill: active ? "#ffffff" : "#afafaf"});
	}

	var clickCallback = FarmGame.prototype.select;
	var selectButton = new Button("assets/cursor.png", i18n.t("Select"), FarmGame.prototype.select, true);
	selectButton.x = width - 120;
	selectButton.y = 10;
	overlay.addChild(selectButton);

	overlay.addChild(new Button("assets/plow.png", i18n.t("Plow"), FarmGame.prototype.plow, false));
	overlay.addChild(new Button("assets/seed.png", i18n.t("Seed"), FarmGame.prototype.seed, false));
	overlay.addChild(new Button("assets/potatoSeed.png", i18n.t("Tuber"), FarmGame.prototype.seedTuber, false));
	overlay.addChild(new Button("assets/harvest.png", i18n.t("Harvest"), FarmGame.prototype.harvest, false));
	overlay.addChild(new Button("assets/water.png", i18n.t("Water"), FarmGame.prototype.water, false));
	overlay.addChild(new Button("assets/weeding.png", i18n.t("Weed"), FarmGame.prototype.weeding, false));
	overlay.addChild(new Button("assets/mulch.png", i18n.t("Mulch"), FarmGame.prototype.mulching, false));
	overlay.addChild(new Button("assets/fertilizer.png", i18n.t("Fertilize"), FarmGame.prototype.fertilize, false));

	stage.addChild(overlay);
	requestAnimationFrame(animate);

	// Variable to remember the last time of animation frame.
	var lastTime = null;

	function animate(timestamp) {
		// Calculate the delta-time of this frame for game update process.
		if(lastTime === null)
			lastTime = timestamp;
		var deltaTime = timestamp - lastTime;
		lastTime = timestamp;

		game.update(deltaTime);

		var statusCell = game.cells[statusCursor.x][statusCursor.y];
		statusText.setText(i18n.t("Pos") + ": " + statusCursor.x + ", " + statusCursor.y + "\n"
			+ i18n.t("Weeds") + ": " + Math.floor(100 * statusCell.weeds) + " (" + Math.floor(100 * statusCell.weedRoots) + ")\n"
			+ i18n.t("Plowed") + ": " + (statusCell.plowed ? "Yes" : "No") + "\n"
			+ i18n.t("Humidity") + ": " + Math.floor(statusCell.humidity * 100) + "\n"
			+ i18n.t("Mulch") + ": " + (statusCell.mulch ? "Yes" : "No") + "\n"
			+ i18n.t("Fertility") + ": " + Math.floor(statusCell.fertility * 100) + "\n"
			+ i18n.t("Potato Pest") + ": " + Math.floor(100 * statusCell.potatoPest) + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("growth") + ": " + Math.floor(statusCell.crop.amount * 100) : "") + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("quality") + ": " + Math.floor(statusCell.crop.getQuality() * 100) : "") + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("value") + ": " + Math.floor(statusCell.crop.eval()) : ""));

		cursorSprite.x = statusCursor.x * 32;
		cursorSprite.y = statusCursor.y * 32;

		gstatusText.setText(i18n.t("Working Power") + ": " + Math.floor(game.workingPower));
		gstatusWPBar.setFactor(game.workingPower / 100);
		gstatusCashText.setText(i18n.t("Cash") + ": $" + Math.floor(game.cash));

		renderer.render(stage);

		requestAnimationFrame(animate);
	}
}

function reset(){
	if(confirm("Are you sure to reset progress?")){
		localStorage.removeItem("FarmGameSave");

		// We want to use clearAll(), but PIXI.Stage does not officially support it.
		// At least we want removeChildAt() or something...
		while(stage.children.length != 0)
			stage.removeChild(stage.getChildAt(0));

		init();
	}
}

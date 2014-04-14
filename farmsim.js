var resources = {
	"en": {
		translation: {
			"Select" : "Select",
			"Plow" : "Plow",
			"Seed" : "Seed",
			"Harvest" : "Harvest",
			"Water" : "Water",
			"Selects a cell to inspect" : "Selects a cell to inspect",
			"Working Power" : "Working Power"
		}
	},
	"ja": {
		translation: {
			"Select" : "選択",
			"Plow" : "耕す",
			"Seed" : "種まき",
			"Harvest" : "収穫",
			"Water" : "水やり",
			"Weed" : "除草",
			"Selects a cell to inspect" : "セルを選択して調査",
			"Plow and make ridges" : "耕して畝を作る",
			"Apply crop seeds" : "作物の種を植える",
			"Harvest and sell crops\nto gain money" : "作物を収穫して販売する",
			"Water soil" : "土壌に水を撒く",
			"Weed out without plowing\nSoil humidity is rather kept" : "耕さずに雑草を引き抜く\n土壌の水分は比較的維持される",
			"Working Power" : "労働力",
			"Working Power Cost" : "労働力消費",
			"Cash" : "資金",
			"Money Cost" : "費用",
			"Pos" : "位置",
			"Weeds" : "雑草",
			"Plowed" : "畝立て",
			"Corn growth" : "トウモロコシ生育",
			"Humidity" : "湿度"
		}
	}
}

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
		1.0, 1.25, 1.50, 1.75, 2.0, 3.0
	];

	var ground = new PIXI.DisplayObjectContainer();
	stage.addChild(ground);

	game.onUpdateCell = function(cell,x,y){
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
			ground.addChild(groundSprite);

			// Add the color filter after the ground sprite to cover over it.
			cell.groundColorFilter = new PIXI.Graphics();
			cell.groundColorFilter.beginFill(0x000000, 1.);
			cell.groundColorFilter.drawRect(groundSprite.x, groundSprite.y, 32, 32);
			ground.addChild(cell.groundColorFilter);

			cell.gs = groundSprite;
		}
		var f = 0.5 * (cell.humidity);
		cell.groundColorFilter.alpha = f;

		cell.gs.setTexture(cell.plowed ? ridgeTexture : groundTexture);

		for(var weedsIndex = 0; weedsIndex < weedsTextures.length; weedsIndex++){
			if(cell.weeds < weedsThresholds[weedsIndex])
				break;
		}
		if(0 < weedsIndex){
			if(cell.weedsSprite == undefined){
				var weedsSprite = new PIXI.Sprite(weedsTextures[weedsIndex - 1]);

				weedsSprite.position = cell.gs.position;
				ground.addChild(weedsSprite);
				cell.weedsSprite = weedsSprite;
			}
			else
				cell.weedsSprite.setTexture(weedsTextures[weedsIndex - 1]);
		}
		else if(cell.weedsSprite != undefined){
			ground.removeChild(cell.weedsSprite);
			cell.weedsSprite = undefined;
		}
		for(var cornIndex = 0; cornIndex < cornTextures.length; cornIndex++){
			if(cell.corn < cornThresholds[cornIndex])
				break;
		}
		if(0 < cornIndex){
			if(cell.cornSprite == undefined){
				var cornSprite = new PIXI.Sprite(cornTextures[cornIndex - 1]);

				cornSprite.position = cell.gs.position;
				ground.addChild(cornSprite);
				cell.cornSprite = cornSprite;
			}
			else
				cell.cornSprite.setTexture(cornTextures[cornIndex - 1]);
		}
		else if(cell.cornSprite != undefined){
			ground.removeChild(cell.cornSprite);
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
	statusPanelFrame.drawRect(0, 0, 120, 80);
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
	buttonTipFiller.drawRect(0, 0, 150, 50);
	buttonTip.addChild(buttonTipFiller);
	var buttonTipWorkingPowerText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	buttonTipWorkingPowerText.x = 5;
	buttonTipWorkingPowerText.y = 5;
	buttonTip.addChild(buttonTipWorkingPowerText);
	buttonTip.x = width - 280;
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

	var plowButton = new Button("assets/plow.png", i18n.t("Plow"), FarmGame.prototype.plow, false);
	plowButton.x = width - 120;
	plowButton.y = 60;
	overlay.addChild(plowButton);

	var seedButton = new Button("assets/seed.png", i18n.t("Seed"), FarmGame.prototype.seed, false);
	seedButton.x = width - 120;
	seedButton.y = 110;
	overlay.addChild(seedButton);

	var harvestButton = new Button("assets/harvest.png", i18n.t("Harvest"), FarmGame.prototype.harvest, false);
	harvestButton.x = width - 120;
	harvestButton.y = 160;
	overlay.addChild(harvestButton);

	var waterButton = new Button("assets/water.png", i18n.t("Water"), FarmGame.prototype.water, false);
	waterButton.x = width - 120;
	waterButton.y = 210;
	overlay.addChild(waterButton);

	var weedButton = new Button("assets/weeding.png", i18n.t("Weed"), FarmGame.prototype.weeding, false);
	weedButton.x = width - 120;
	weedButton.y = 260;
	overlay.addChild(weedButton);

	stage.addChild(overlay);
	requestAnimationFrame(animate);

	function animate() {
		game.update();

		var statusCell = game.cells[statusCursor.x][statusCursor.y];
		statusText.setText(i18n.t("Pos") + ": " + statusCursor.x + ", " + statusCursor.y + "\n"
			+ i18n.t("Weeds") + ": " + Math.floor(100 * statusCell.weeds) + " (" + Math.floor(100 * statusCell.weedRoots) + ")\n"
			+ i18n.t("Plowed") + ": " + (statusCell.plowed ? "Yes" : "No") + "\n"
			+ i18n.t("Corn growth") + ": " + Math.floor(statusCell.corn * 100) + "\n"
			+ i18n.t("Humidity") + ": " + Math.floor(statusCell.humidity * 100));

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

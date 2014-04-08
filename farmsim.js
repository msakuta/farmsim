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
	var grassTextures = [
		PIXI.Texture.fromImage("assets/grass1.png"),
		PIXI.Texture.fromImage("assets/grass2.png"),
		PIXI.Texture.fromImage("assets/grass3.png"),
	];
	var grassThresholds = [
		0.25, 0.50, 0.75
	];
	var cornTextures = [
		PIXI.Texture.fromImage("assets/corn0.png"),
		PIXI.Texture.fromImage("assets/corn1.png"),
		PIXI.Texture.fromImage("assets/corn2.png"),
		PIXI.Texture.fromImage("assets/corn3.png"),
		PIXI.Texture.fromImage("assets/corn4.png"),
	];
	var cornThresholds = [
		1.0, 1.25, 1.50, 1.75, 2.0
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
				switch(clickMode){
					case 0: break;
					case 1:
						if(game.cultivate(cell))
							id.target.setTexture(ridgeTexture);
						break;
					case 2: game.seed(cell); break;
				}
			};
			groundSprite.mouseover = function(id){
				statusCursor = {x:x, y:y};
			}
			groundSprite.tap = function(id){
				id.target.mousedown(id);
				id.target.mouseover(id);
			}
			ground.addChild(groundSprite);
			cell.gs = groundSprite;
		}
		for(var grassIndex = 0; grassIndex < grassTextures.length; grassIndex++){
			if(cell.grass < grassThresholds[grassIndex])
				break;
		}
		if(0 < grassIndex){
			if(cell.grassSprite == undefined){
				var grassSprite = new PIXI.Sprite(grassTextures[grassIndex - 1]);

				grassSprite.position = cell.gs.position;
				ground.addChild(grassSprite);
				cell.grassSprite = grassSprite;
			}
			else
				cell.grassSprite.setTexture(grassTextures[grassIndex - 1]);
		}
		else if(cell.grassSprite != undefined){
			ground.removeChild(cell.grassSprite);
			cell.grassSprite = undefined;
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
	statusPanelFrame.drawRect(0, 0, 120, 65);
	statusPanel.addChild(statusPanelFrame);
	var statusText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	statusText.y = 5;
	statusText.x = 5;
	statusPanel.addChild(statusText);
	statusPanel.x = 10;
	statusPanel.y = 10;
	overlay.addChild(statusPanel);

	// The global status panel shows information about the player and other global things.
	var gstatusPanel = new PIXI.DisplayObjectContainer();
	var gstatusPanelFrame = new PIXI.Graphics();
	gstatusPanelFrame.beginFill(0x000000, 0.5);
	gstatusPanelFrame.lineStyle(2, 0xffffff, 1);
	gstatusPanelFrame.drawRect(0, 0, 120, 35);
	gstatusPanel.addChild(gstatusPanelFrame);
	var gstatusText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	gstatusText.y = 5;
	gstatusText.x = 5;
	gstatusPanel.addChild(gstatusText);
	var gstatusWPBarBack = new PIXI.Graphics();
	gstatusWPBarBack.beginFill(0xff0000, 1.0);
	gstatusWPBarBack.drawRect(0, 0, 100, 3);
	gstatusWPBarBack.x = 10;
	gstatusWPBarBack.y = 20;
	gstatusPanel.addChild(gstatusWPBarBack);
	var gstatusWPBar = new PIXI.Graphics();
	gstatusWPBar.beginFill(0x00ff00, 1.0);
	gstatusWPBar.drawRect(0, 0, 100, 3);
	gstatusWPBar.x = 10;
	gstatusWPBar.y = 20;
	gstatusPanel.addChild(gstatusWPBar);
	gstatusPanel.x = 10;
	gstatusPanel.y = height - 45;
	overlay.addChild(gstatusPanel);

	var buttons = [];

	/// Internal Button class.
	function Button(iconImage, caption, clickEvent, active){
		PIXI.DisplayObjectContainer.apply(this, arguments);

		// Interactivity initialization
		this.interactive = true;
		this.click = function(id){
			clickEvent(id);
			// Update activation state for mode select buttons
			for(var i = 0; i < buttons.length; i++)
				buttons[i].setActive(buttons[i] == this);
		}
		this.tap = this.click;
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

	var clickMode = 0;
	var selectButton = new Button("assets/cursor.png", "Select", function(id){
		clickMode = 0;
	}, true);
	selectButton.x = width - 120;
	selectButton.y = 10;
	overlay.addChild(selectButton);

	var cultivateButton = new Button("assets/cultivate.png", "Cultivate", function(id){
		clickMode = 1;
	}, false);
	cultivateButton.x = width - 120;
	cultivateButton.y = 60;
	overlay.addChild(cultivateButton);

	var seedButton = new Button("assets/seed.png", "Seed", function(id){
		clickMode = 2;
	}, false);
	seedButton.x = width - 120;
	seedButton.y = 110;
	overlay.addChild(seedButton);

	stage.addChild(overlay);
	requestAnimationFrame(animate);

	function animate() {
		game.update();

		var statusCell = game.cells[statusCursor.x][statusCursor.y];
		statusText.setText("Pos: " + statusCursor.x + ", " + statusCursor.y + "\n"
			+ "Grass: " + Math.floor(100 * statusCell.grass) + "\n"
			+ "Cultivated: " + (statusCell.cultivated ? "Yes" : "No") + "\n"
			+ "Corn growth: " + Math.floor(statusCell.corn * 100));

		cursorSprite.x = statusCursor.x * 32;
		cursorSprite.y = statusCursor.y * 32;

		gstatusText.setText("Working Power: " + Math.floor(game.workingPower));
		gstatusWPBar.scale.x = game.workingPower / 100;

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

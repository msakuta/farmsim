var width;
var height;

var game;

window.onload = function() {
	width = 640;
	height = 480;
	var renderer = PIXI.autoDetectRenderer(width, height);

	document.getElementById("stage").appendChild(renderer.view);

	var stage = new PIXI.Stage;

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
				if(clickMode == 0){
					id.target.setTexture(ridgeTexture);
					cell.cultivate();
				}
				else{
					cell.seed();
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

	game.init();

	var cursorTexture = new PIXI.Texture.fromImage("assets/cursor.png");
	var cursorSprite = new PIXI.Sprite(cursorTexture);
	stage.addChild(cursorSprite);

	var overlay = new PIXI.DisplayObjectContainer();

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

	/// Internal Button class.
	function Button(iconImage, caption, clickEvent, active){
		PIXI.DisplayObjectContainer.apply(this, arguments);

		// Interactivity initialization
		this.interactive = true;
		this.click = clickEvent;
		this.tap = clickEvent;
		this.hitArea = new PIXI.Rectangle(0, 0, 100, 40);

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
	var cultivateButton = new Button("assets/cultivate.png", "Cultivate", function(id){
		clickMode = 0;
		cultivateButton.setActive(true);
		seedButton.setActive(false);
	}, true);
	cultivateButton.x = width - 120;
	cultivateButton.y = 10;
	overlay.addChild(cultivateButton);

	var seedButton = new Button("assets/seed.png", "Seed", function(id){
		clickMode = 1;
		cultivateButton.setActive(false);
		seedButton.setActive(true);
	}, false);
	seedButton.x = width - 120;
	seedButton.y = 60;
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

		renderer.render(stage);

		requestAnimationFrame(animate);
	}
}

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

	var ground = new PIXI.DisplayObjectContainer();
	stage.addChild(ground);

	game.onUpdateCell = function(cell,x,y){
		if(cell.gs == undefined){
			var groundSprite = new PIXI.Sprite(groundTexture);
			groundSprite.position.x = x * 32;
			groundSprite.position.y = y * 32;
			groundSprite.interactive = true;
			groundSprite.mousedown = function(id){
				id.target.setTexture(ridgeTexture);
				cell.cultivate();
			};
			groundSprite.mouseover = function(id){
				statusCursor = {x:x, y:y};
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
	}

	game.init();

	var cursorTexture = new PIXI.Texture.fromImage("assets/cursor.png");
	var cursorSprite = new PIXI.Sprite(cursorTexture);
	stage.addChild(cursorSprite);

	var statusCursor = {x: 0, y: 0};
	var statusPanel = new PIXI.DisplayObjectContainer();
	var statusPanelFrame = new PIXI.Graphics();
	statusPanelFrame.beginFill(0x000000, 0.5);
	statusPanelFrame.lineStyle(2, 0xffffff, 1);
	statusPanelFrame.drawRect(0, 0, 120, 45);
	statusPanel.addChild(statusPanelFrame);
	var statusText = new PIXI.Text("", {font: "10px Helvetica", fill: "#ffffff"});
	statusText.y = 5;
	statusText.x = 5;
	statusPanel.addChild(statusText);
	statusPanel.x = 10;
	statusPanel.y = 10;
	stage.addChild(statusPanel);

	requestAnimationFrame(animate);

	function animate() {
		game.update();

		var statusCell = game.cells[statusCursor.x][statusCursor.y];
		statusText.setText("Pos: " + statusCursor.x + ", " + statusCursor.y + "\n"
			+ "Grass: " + Math.floor(100 * statusCell.grass) + "\n"
			+ "Cultivated: " + (statusCell.cultivated ? "Yes" : "No"));
		
		cursorSprite.x = statusCursor.x * 32;
		cursorSprite.y = statusCursor.y * 32;

		renderer.render(stage);

		requestAnimationFrame(animate);
	}
}
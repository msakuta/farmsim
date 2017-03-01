/// Farm simulator implementation without PIXI.js (only with div and style)
var FarmsimDiv = new (function(){
'use strict';
var game;
var container;
var table;
var tileElems;
var scrollPos = [0, 0];
var selectedTile = null;
var selectedCoords = null;
var viewPortWidth;
var viewPortHeight;
var width;
var height;
var cursorElem;
var infoElem;

var toolBarElem;
var toolElems = [];

// Constants
var tilesize = 32;

var weedsTextures = [
	"url(assets/weeds1.png)",
	"url(assets/weeds2.png)",
	"url(assets/weeds3.png)",
];

var weedsThresholds = [
	0.25, 0.50, 0.75
];

var toolDefs = [
	{img: 'assets/plow.png', caption: 'Plow', click: 'plow'},
	{img: 'assets/seed.png', caption: 'Corn', click: 'seed'},
	{img: 'assets/potatoSeed.png', caption: 'Potato', click: 'seedTuber'},
	{img: 'assets/harvest.png', caption: 'Harvest', click: 'harvest'},
	{img: 'assets/water.png', caption: 'Water', click: 'water'},
	{img: 'assets/weeding.png', caption: 'Weed', click: 'weeding'},
	{img: 'assets/mulch.png', caption: 'Mulch', click: 'mulching'},
	{img: 'assets/fertilizer.png', caption: 'Fertilize', click: 'fertilize'},
];

var currentTool = -1;


window.addEventListener('load', function(){
	width = 640;
	height = 480;
	viewPortWidth = 16;
	viewPortHeight = 12;


	init();
});

function coordOfElem(elem){
	var idx = tileElems.indexOf(elem);
	if(0 <= idx)
		return [ idx % viewPortWidth - scrollPos[0], Math.floor(idx / viewPortWidth) - scrollPos[1]];
	else
		return null;
}

function elemAt(x, y){
	if(x instanceof Array){
		y = x[1];
		x = x[0];
	}
	if(0 <= x && x < viewPortWidth && 0 <= y && y < viewPortHeight)
		return tileElems[x + y * viewPortWidth];
	else
		return null;
}

function init(){
	game = new FarmGame(width / 32, height / 32);

	generateBoard();

	var cornTextures = [
		"url(assets/corn0.png)",
		"url(assets/corn1.png)",
		"url(assets/corn2.png)",
		"url(assets/corn3.png)",
		"url(assets/corn4.png)",
		"url(assets/corn5.png)",
	];
	var cornThresholds = [
		0.0, 0.25, 0.50, 0.75, 1.0, 2.0
	];
	var potatoTextures = [
		"url(assets/potato0.png)",
		"url(assets/potato1.png)",
		"url(assets/potato2.png)",
		"url(assets/potato3.png)",
		"url(assets/potato4.png)",
		"url(assets/potato5.png)",
	];
	var potatoThresholds = [
		0.0, 0.25, 0.50, 0.75, 1.0, 2.0
	];

	game.onUpdateCell = function(cell,x,y){
		if(cell.elem === undefined){
			cell.elem = elemAt(x,y);
		}

		if(cell.elem){
			for(var weedsIndex = 0; weedsIndex < weedsTextures.length; weedsIndex++){
				if(cell.weeds < weedsThresholds[weedsIndex])
					break;
			}
			if(0 < weedsIndex){
				if(cell.weedsSprite === undefined){
					var weedsSprite = document.createElement('div');
					weedsSprite.style.width = '32px';
					weedsSprite.style.height = '32px';
					weedsSprite.style.backgroundImage = weedsTextures[weedsIndex - 1];
					cell.elem.appendChild(weedsSprite);
					cell.weedsSprite = weedsSprite;
				}
				else
					cell.weedsSprite.style.backgroundImage = weedsTextures[weedsIndex - 1];
			}
			else if(cell.weedsSprite !== undefined){
				cell.elem.removeChild(cell.weedsSprite);
				cell.weedsSprite = undefined;
			}

			var cornIndex = 0;
			var textures = cornTextures;
			var thresholds = cornThresholds;
			if(cell.crop){
				if(cell.crop.type === "Potato"){
					textures = potatoTextures;
					thresholds = potatoThresholds;
				}
				for(; cornIndex < textures.length; cornIndex++){
					if(cell.crop.amount < thresholds[cornIndex])
						break;
				}
			}

			if(0 < cornIndex){
				if(cell.cornSprite === undefined){
					var cornSprite = document.createElement('div');
					cornSprite.style.width = '32px';
					cornSprite.style.height = '32px';
					cornSprite.style.backgroundImage = textures[cornIndex - 1];

					cornSprite.style.zIndex = 1;
					cell.elem.appendChild(cornSprite);
					cell.cornSprite = cornSprite;
				}
				else
					cell.cornSprite.style.backgroundImage = textures[cornIndex - 1];
			}
			else if(cell.cornSprite !== undefined){
				cell.elem.removeChild(cell.cornSprite);
				cell.cornSprite = undefined;
			}

			cell.elem.style.backgroundImage = cell.plowed ? 'url(assets/ridge.png)' : 'url(assets/dirt.png)';
		}
	};

	game.init();

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

		updateInfo();

/*		var statusCell = game.cells[statusCursor.x][statusCursor.y];
		statusText.setText(i18n.t("Pos") + ": " + statusCursor.x + ", " + statusCursor.y + "\n"
			+ i18n.t("Weeds") + ": " + Math.floor(100 * statusCell.weeds) + " (" + Math.floor(100 * statusCell.weedRoots) + ")\n"
			+ i18n.t("Plowed") + ": " + (statusCell.plowed ? "Yes" : "No") + "\n"
			+ i18n.t("Humidity") + ": " + Math.floor(statusCell.humidity * 100) + "\n"
			+ i18n.t("Mulch") + ": " + (statusCell.mulch ? "Yes" : "No") + "\n"
			+ i18n.t("Fertility") + ": " + Math.floor(statusCell.fertility * 100) + "\n"
			+ i18n.t("Potato Pest") + ": " + Math.floor(100 * statusCell.potatoPest) + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("growth") + ": " + Math.floor(statusCell.crop.amount * 100) : "") + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("quality") + ": " + Math.floor(statusCell.crop.getQuality() * 100) : "") + "\n"
			+ (statusCell.crop ? i18n.t(statusCell.crop.type) + " " + i18n.t("value") + ": " + Math.floor(statusCell.crop.eval()) : ""));*/

//		cursorSprite.x = statusCursor.x * 32;
//		cursorSprite.y = statusCursor.y * 32;

/*		gstatusText.setText(i18n.t("Working Power") + ": " + Math.floor(game.workingPower));
		gstatusWPBar.setFactor(game.workingPower / 100);
		gstatusCashText.setText(i18n.t("Cash") + ": $" + Math.floor(game.cash));
		gstatusWeatherText.setText(i18n.t("Weather") + ": (" + Math.floor(game.weather * 100) + ")\n"
			+ weatherIcons[Math.floor(game.weather * weatherIcons.length)].caption);
		for(var i = 0; i < weatherSprites.length; i++)
			weatherSprites[i].visible = i / weatherSprites.length <= game.weather && game.weather < (i+1) / weatherSprites.length;

		renderer.render(stage);
*/
		requestAnimationFrame(animate);
	}
}

function generateBoard(){
	createElements();
}

function createElements(){
	tileElems = new Array(viewPortWidth * viewPortHeight);

	// The containers are nested so that the inner container can be easily
	// discarded to recreate the whole game.
	var outerContainer = document.getElementById("container");
	if(container)
		outerContainer.removeChild(container);
	container = document.createElement("div");
	outerContainer.appendChild(container);
	if(cursorElem)
		cursorElem = null;

	table = document.createElement("div");
	table.style.borderStyle = 'solid';
	table.style.borderWidth = '1px';
	table.style.borderColor = 'red';
	table.style.position = 'relative';
//	table.style.left = '50%';
	table.style.width = (viewPortWidth * tilesize) + 'px';
	table.style.height = (viewPortHeight * tilesize) + 'px';

/*	messageElem = document.createElement('div');
	container.appendChild(messageElem);
	messageElem.style.fontFamily = 'Sans-serif';
	messageElem.style.fontSize = '20pt';
	messageElem.style.position = 'relative';
	messageElem.style.color = 'red';*/

	container.appendChild(table);
	for(var iy = 0; iy < viewPortHeight; iy++){
		for(var ix = 0; ix < viewPortWidth; ix++){
			var tileElem = document.createElement("div");
			tileElems[ix + iy * viewPortWidth] = tileElem;
			tileElem.innerHTML = "";
			tileElem.style.width = '32px';
			tileElem.style.height = '32px';
			tileElem.style.position = 'absolute';
			tileElem.style.top = (tilesize * iy) + 'px';
			tileElem.style.left = (tilesize * ix) + 'px';
			tileElem.style.backgroundImage = "url(assets/dirt.png)";
			tileElem.onmousedown = function(e){
				var idx = tileElems.indexOf(this);
				var xy = coordOfElem(this);
				var cell = game.cells[xy[0]][xy[1]];
				if(cell && 0 <= currentTool && currentTool < toolDefs.length){
					var methodName = toolDefs[currentTool].click;
					if(methodName in game)
						game[methodName](cell);
				}
			}

			tileElem.onmousemove = function(){
				selectTile(this);
			}

			table.appendChild(tileElem);
		}
	}


	var toolBarMargin = 6;
	var toolButtonBorder = 4;

	function selectTool(idx){
		// Selecting the same tool twice means deselecting
		if(currentTool === idx)
			idx = -1;
		for(var i = 0; i < toolElems.length; i++){
			toolElems[i].style.backgroundColor = '#7f7fff';
			toolElems[i].style.border = 'outset 4px #7f7f7f';
		}
		if(0 <= idx && idx < toolElems.length){
			toolElems[idx].style.backgroundColor = '#00ffff';
			toolElems[idx].style.border = 'outset 4px #ff0000';
		}
		currentTool = idx;
	}

	// Reset the state before initializing toolbar elements
	toolElems = [];
	currentTool = -1;
//	currentRotation = 0;

	// Tool bar
	toolBarElem = document.createElement('div');
	toolBarElem.setAttribute('class', 'noselect');
	toolBarElem.style.borderStyle = 'solid';
	toolBarElem.style.borderWidth = '1px';
	toolBarElem.style.borderColor = 'red';
	toolBarElem.style.position = 'absolute';
	//toolBarElem.margin = toolBarMargin + 'px';
	toolBarElem.style.top = '0px';
	toolBarElem.style.left = (viewPortWidth * tilesize + 20) + 'px';
	toolBarElem.style.width = (128 + toolBarMargin * 2 + toolButtonBorder * 2) + 'px';
	toolBarElem.style.height = ((toolDefs.length) * (tilesize + toolBarMargin * 2) + toolButtonBorder * 2) + 'px';
	container.appendChild(toolBarElem);
	for(var i = 0; i < toolDefs.length; i++){
		var toolElem = document.createElement('div');
		toolElem.style.position = 'absolute';
		toolElem.style.width = '128px';
		toolElem.style.height = '32px';
		toolElem.style.left = toolBarMargin + 'px';
		toolElem.style.top = (i * (tilesize + toolBarMargin * 2) + toolBarMargin) + 'px';
		toolElem.style.border = 'outset 4px #7f7f7f';
		toolElem.style.backgroundColor = '#7f7fff';
		toolElem.style.textAlign = 'middle';

		var toolIcon = document.createElement('img');
		toolIcon.src = toolDefs[i].img;
		toolElem.appendChild(toolIcon);
		var toolCaption = document.createElement('span');
		toolCaption.innerHTML = toolDefs[i].caption;
		toolCaption.setAttribute('class', 'noselect');
		toolElem.appendChild(toolCaption);

		toolElem.onclick = function(e){
			selectTool(toolElems.indexOf(this));
		};

		toolBarElem.appendChild(toolElem);
		toolElems.push(toolElem);
	}

	infoElem = document.createElement('div');
	//infoElem.style.position = 'absolute';
	infoElem.style.backgroundColor = '#ffff7f';
	infoElem.style.border = '1px solid #00f';
	infoElem.style.margin = '4px';
	infoElem.style.padding = '2px';
	infoElem.style.width = '256px';
	infoElem.style.height = '12em';
	infoElem.style.lineHeight = '120%';
	container.appendChild(infoElem);

}

function selectTile(sel){
	selectedTile = sel;
	var idx = tileElems.indexOf(sel);
	var vx = idx % viewPortWidth;
	var vy = Math.floor(idx / viewPortWidth);
	var ix = vx + scrollPos[0];
	var iy = vy + scrollPos[1];
	selectedCoords = [ix, iy];
	if(ix < width && iy < height){
		if(!cursorElem){
			cursorElem = document.createElement('div');
			cursorElem.style.border = '2px blue solid';
			cursorElem.style.pointerEvents = 'none';
			table.appendChild(cursorElem);
		}
		cursorElem.style.position = 'absolute';
		cursorElem.style.top = (tilesize * vy) + 'px';
		cursorElem.style.left = (tilesize * vx) + 'px';
		cursorElem.style.width = '30px';
		cursorElem.style.height = '30px';
		updateInfo();
//		updateInventory();
	}

}

function updateInfo(){
	if(!selectedCoords){
		infoElem.innerHTML = 'Empty tile';
		return;
	}
	if(viewPortWidth <= selectedCoords[0] && viewPortHeight <= selectedCoords[1])
		return;
	var cell = game.cells[selectedCoords[0]][selectedCoords[1]];
	if(!cell){
		infoElem.innerHTML = 'Empty cell<br>';
		return;
	}

	var crop = '';
	if(cell.crop){
		crop =
			(cell.crop.type) + " " + ("growth") + ": " + Math.floor(cell.crop.amount * 100) + "<br>" +
			(cell.crop.type) + " " + ("quality") + ": " + Math.floor(cell.crop.getQuality() * 100) + "<br>" +
			(cell.crop.type) + " " + ("value") + ": " + Math.floor(cell.crop.eval());
	}

	infoElem.innerHTML = "Pos" + ": " + selectedCoords[0] + ", " + selectedCoords[1] + "<br>" +
		"Weeds" + ": " + Math.floor(100 * cell.weeds) + " (" + Math.floor(100 * cell.weedRoots) + ")<br>" +
		"Plowed" + ": " + (cell.plowed ? "Yes" : "No") + "<br>" +
		"Humidity" + ": " + Math.floor(cell.humidity * 100) + "<br>" +
		"Mulch" + ": " + (cell.mulch ? "Yes" : "No") + "<br>" +
		"Fertility" + ": " + Math.floor(cell.fertility * 100) + "<br>" +
		"Potato Pest" + ": " + Math.floor(100 * cell.potatoPest) + "<br>" +
		crop;
;
;
}


})();


function FarmGame(xs,ys){
	this.xs = xs;
	this.ys = ys;
	this.rng = new Xor128();

	this.cells = [];

	this.workingPower = 100;
	this.cash = 100;
	this.time = 0;
	this.frameCount = 0;
	this.autosave_frame = 0;
}

FarmGame.Cell = function(weeds){
	this.weeds = weeds;
	this.weedRoots = 0.5;
	this.plowed = false;
	this.crop = null;
	this.humidity = 0.5;
	this.mulch = 0;
	this.potatoPest = 0;
}
FarmGame.Cell.prototype.serialize = function(){
	var v = this;
	return {
		weeds: this.weeds,
		weedRoots: this.weedRoots,
		plowed: this.plowed,
		crop: this.crop ? this.crop.serialize() : null,
		humidity: this.humidity,
		mulch: this.mulch,
		potatoPest: this.potatoPest,
	};
}
FarmGame.Cell.prototype.deserialize = function(data){
	this.weeds = data.weeds;
	this.weedRoots = data.weedRoots;
	this.plowed = data.plowed;
	// Try to find the class name in FarmGame object.
	if(data.crop && data.crop.type in FarmGame){
		// If found, try to instantiate an instance of it.
		this.crop = new FarmGame[data.crop.type];
		if(this.crop)
			this.crop.deserialize(data.crop);
	}
	this.humidity = data.humidity;
	this.mulch = data.mulch;
	this.potatoPest = data.potatoPest;
}
FarmGame.Cell.prototype.plow = function(){
	var ret = !this.plowed || this.weeds != 0;
	this.weeds = 0;
	this.weedRoots *= 0.75; // You will have a hard time completely remove roots.
	this.plowed = true;
	this.humidity /= 2; // Plowing soil releases humidity inside it.
	this.potatoPest *= 0.5;
	return ret;
}
FarmGame.Cell.prototype.seed = function(){
	if(this.plowed && !this.crop){
		this.crop = new FarmGame.Corn;
		return true;
	}
	else
		return false;
}
FarmGame.Cell.prototype.seedTuber = function(){
	if(this.plowed && !this.crop){
		this.crop = new FarmGame.Potato;
		return true;
	}
	else
		return false;
}
FarmGame.Cell.prototype.harvest = function(){
	if(this.crop && 2 < this.crop.amount){
		return true;
	}
	else
		return false;
}
FarmGame.Cell.prototype.water = function(){
	// Watering soil makes humidity to approach 1 but never reach it.
	this.humidity += (1. - this.humidity) * 0.5;
	return true;
}
FarmGame.Cell.prototype.weeding = function(){
	if(this.weeds == 0)
		return false;
	this.weeds = 0;
	this.weedRoots *= 0.75; // You will have a hard time completely remove roots.
	this.humidity *= 0.75; // Humidity is rather kept compared to plowing.
	this.potatoPest *= 0.75;
	return true;
}
FarmGame.Cell.prototype.mulching = function(){
	if(0 < this.mulch)
		return false;
	this.mulch++;
	return true;
}

FarmGame.Crop = function(){
	this.type = "";
	this.amount = 0;
}

FarmGame.Crop.prototype.serialize = function(){
	return this; // Shorthand for serializing all the member variables.
}

FarmGame.Crop.prototype.deserialize = function(data){
	this.amount = data.amount;
}

FarmGame.Crop.prototype.grow = function(cell,growth){
	this.amount += growth;
}

FarmGame.Crop.prototype.eval = function(){
	// Overgrown crops do not produce money but consumes working power to clean.
	if(2.0 <= this.amount && this.amount < 3.0)
		return 10;
	else
		return 0;
}

FarmGame.Crop.prototype.getQuality = function(){
	return 1;
}


FarmGame.Corn = function(){
	FarmGame.Crop.apply(this, arguments);
	this.type = "Corn";
	this.amount = 1;
}
FarmGame.Corn.prototype = new FarmGame.Crop;

FarmGame.Corn.prototype.grow = function(cell,growth){
	this.amount += growth;
	this.potatoPest = Math.max(0, this.potatoPest - growth); // Corn cleans soil to decrease potato pest.
}

FarmGame.Potato = function(){
	FarmGame.Crop.apply(this, arguments);
	this.type = "Potato";
	this.amount = 1;
	this.quality = 1;
}
FarmGame.Potato.prototype = new FarmGame.Crop;

FarmGame.Potato.prototype.deserialize = function(data){
	FarmGame.Crop.prototype.deserialize.apply(this,arguments);
	this.quality = data.quality;
}

FarmGame.Potato.prototype.grow = function(cell,growth){
	this.amount += growth;
	this.quality *= 1. - cell.potatoPest * 0.0002;
	cell.potatoPest = Math.min(1, cell.potatoPest + this.amount * 0.0001);
}

FarmGame.Potato.prototype.eval = function(){
	// Potatos yields a bit higher value than corn.
	if(2.0 <= this.amount && this.amount < 3.0)
		return 20 * this.quality; // Degraded potatoes sell with a lower price
	else
		return 0;
}

FarmGame.Potato.prototype.getQuality = function(){
	return this.quality;
}


FarmGame.prototype.init = function(){
	if(typeof(Storage) !== "undefined"){
		this.deserialize(localStorage.getItem("FarmGameSave"));
	}
	else{
		for(var x = 0; x < this.xs; x++){
			var row = [];
			for(var y = 0; y < this.ys; y++){
				var weeds = this.rng.next();
				var cell = new FarmGame.Cell(weeds);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.onUpdateCell = function(cell,x,y){}

FarmGame.prototype.update = function(deltaTime){
	var frameTime = 100; // Frame time interval in milliseconds
	this.time += deltaTime;

	// Repeat the frame procedure in constant interval.
	while(frameTime < this.time){

		this.updateInternal();

		this.time -= frameTime;
	}
}

FarmGame.prototype.updateInternal = function(){

	// Humidity coefficient of growth for crops and weeds
	function humidityGrowth(cell){
		return (cell.humidity + 0.25) / 1.25;
	}

	// The growth of the grass depends on adjacent cells' grass density.
	function getGrowth(cell,x,y,getter){
		var ret = 0;
		if(0 <= x - 1) ret += getter(this.cells[x - 1][y]);
		if(x + 1 < this.xs) ret += getter(this.cells[x + 1][y]);
		if(0 <= y - 1) ret += getter(this.cells[x][y - 1]);
		if(y + 1 < this.ys) ret += getter(this.cells[x][y + 1]);
		return ret * humidityGrowth(cell);
	}

	for(var x = 0; x < this.cells.length; x++){
		for(var y = 0; y < this.cells[x].length; y++){
			var cell = this.cells[x][y];

			// Obtain growth of weeds
			var growth = (0.0001
				+ getGrowth.call(this, cell, x, y, function(cell){return cell.weeds;}))
					* 0.0001 * cell.weedRoots / (1. + cell.mulch * 2.); // Mulching reduces weed growth.

			if(cell.weeds < 1. - growth)
				cell.weeds += growth;
			else
				cell.weeds = 1.;

			// The roots grow very slowly compared to stems and leaves
			var rootsGrowth = (cell.weedRoots
				+ getGrowth.call(this, cell, x, y, function(cell){return (cell.weeds + cell.weedRoots) * 0.1;}))
					* 0.00001;

			if(cell.weedRoots < 1. - rootsGrowth)
				cell.weedRoots += rootsGrowth;
			else
				cell.weedRoots = 1.;

			// Increase crop growth.  Lower growth if there are weeds.
			// If the corn grow enough, it will degrade no matter how weeds are grown, but it
			// still depends on humidity (wet crops rot faster).
			if(cell.crop)
				cell.crop.grow(cell, 0.0005 * (cell.crop.amount < 2 ? 1. - cell.weeds : 1.)
					* humidityGrowth(cell)); // Humid soil grows crop better

			// Gradually disperse into the air
			if(0 < cell.mulch) // Mulching reduces evaporation of humidity.
				cell.humidity *= 0.9999;
			else
				cell.humidity *= 0.9995;

			// Potato pest gradually decreases if there is no potato crop.
			cell.potatoPest *= 0.9999;

			game.onUpdateCell(cell,x,y);
		}
	}

	if(this.workingPower + 0.1 < 100)
		this.workingPower += 0.1;
	else
		this.workingPower = 100;

	this.frameCount++;

	if(this.autosave_frame + 100 < this.frameCount){

		// Check for localStorage
		if(typeof(Storage) !== "undefined"){
			var serialData = this.serialize();
			localStorage.setItem("FarmGameSave", serialData);
			this.onAutoSave(serialData);
		}

		this.autosave_frame += 100;
	}
}

FarmGame.prototype.serialize = function(){
	var saveData = {workingPower: this.workingPower, cash: this.cash, xs: this.xs, ys: this.ys};
	var cells = [];
	for(var x = 0; x < this.cells.length; x++){
		var row = [];
		for(var y = 0; y < this.cells[x].length; y++){
			var v = this.cells[x][y];
			row.push(v.serialize());
		}
		cells.push(row);
	}
	saveData.cells = cells;
	return JSON.stringify(saveData);
}

FarmGame.prototype.deserialize = function(stream){
	var data = JSON.parse(stream);
	if(data != null){
		this.workingPower = data.workingPower;
		this.cash = data.cash;
		this.xs = data.xs;
		this.ys = data.ys;
		this.cells = [];
		var cells = data.cells;
		for(var x = 0; x < cells.length; x++){
			var row = [];
			for(var y = 0; y < cells[x].length; y++){
				var c = cells[x][y];
				if(!c)
					continue;
				var cell = new FarmGame.Cell(c.weeds);
				cell.deserialize(c);
				row.push(cell);
				this.onUpdateCell(cell,x,y);
			}
			this.cells.push(row);
		}
	}
	else{
		for(var x = 0; x < this.xs; x++){
			var row = [];
			for(var y = 0; y < this.ys; y++){
				var weeds = this.rng.next();
				var cell = new FarmGame.Cell(weeds);

				this.onUpdateCell(cell,x,y);

				row.push(cell);
			}
			this.cells.push(row);
		}
	}
}

FarmGame.prototype.select = function(cell){return true;}
FarmGame.prototype.select.description = function(){return i18n.t("Selects a cell to inspect");}

FarmGame.prototype.plow = function(cell){
	var workCost = 20; // Plowing is a hard physical job.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.plow()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.plow.description = function(){
	return i18n.t("Plow and make ridges") + "\n"
		+ i18n.t("Working Power Cost") + ": 20";
}

FarmGame.prototype.seed = function(cell){
	var workCost = 10; // Seeding is not a hard physical task.
	var moneyCost = 1;
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false; // Give up due to low working power
	if(cell.seed()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.seed.description = function(){
	return i18n.t("Apply crop seeds") + "\n"
		+ i18n.t("Working Power Cost") + ": 10\n"
		+ i18n.t("Money Cost") + ": $1";
}

FarmGame.prototype.seedTuber = function(cell){
	var workCost = 10; // Seeding is not a hard physical task.
	var moneyCost = 2;
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false; // Give up due to low working power
	if(cell.seedTuber()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.seedTuber.description = function(){
	return i18n.t("Plant seed tubers of potatos") + "\n"
		+ i18n.t("Working Power Cost") + ": 10\n"
		+ i18n.t("Money Cost") + ": $2";
}

FarmGame.prototype.harvest = function(cell){
	var workCost = 15; // Harvesting is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.harvest()){
		this.workingPower -= workCost;
		this.cash += cell.crop.eval();
		cell.crop = null;
		cell.mulch = 0; // Harvesting discards mulch sheets
		return true;
	}
	else
		return false;
}
FarmGame.prototype.harvest.description = function(){
	return i18n.t("Harvest and sell crops\nto gain money")
		+ "\n" + i18n.t("Working Power Cost") + ": 15";
}

FarmGame.prototype.water = function(cell){
	var workCost = 5; // Watering is an easy task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.water()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.water.description = function(){
	return i18n.t("Water soil") + "\n"
		+ i18n.t("Working Power Cost") + ": 5";
}

FarmGame.prototype.weeding = function(cell){
	var workCost = 15; // Weeding is a bit hard physical task.
	if(this.workingPower < workCost)
		return false; // Give up due to low working power
	if(cell.weeding()){
		this.workingPower -= workCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.weeding.description = function(){
	return i18n.t("Weed out without plowing\n"
		+ "Soil humidity is rather kept") + "\n"
		+ i18n.t("Working Power Cost") + ": 15";
}

FarmGame.prototype.mulching = function(cell){
	var workCost = 10; // Mulching is a bit of physical work.
	var moneyCost = 2; // and it costs money.
	if(this.workingPower < workCost || this.cash < moneyCost)
		return false;
	if(cell.mulching()){
		this.workingPower -= workCost;
		this.cash -= moneyCost;
		return true;
	}
	else
		return false;
}
FarmGame.prototype.mulching.description = function(){
	return i18n.t("Mulch soil with plastic blanket\n"
		+ "Keeps soil humidity") + "\n"
		+ i18n.t("Working Power Cost") + ": 10\n"
		+ i18n.t("Money Cost") + ": $2";
}

FarmGame.prototype.onAutoSave = function(str){
}

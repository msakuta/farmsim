/// \brief Implementation of George Marsaglia's Xorshift Pseudo Random Number Generator.
///
/// Javascript's implementation do not have distinction between integral and floating numbers,
/// so we must bitmask after each operation.
function Xor128(){
	this.x = 123456789;
	this.y = 362436069;
	this.z = 521288629;
	this.w = 88675123;
}

Xor128.prototype.nexti = function(){
	// We must bitmask and logical shift to simulate 32bit unsigned integer's behavior.
	// The optimizer is likely to actually make it uint32 internally (hopefully).
	var t = ((this.x ^ (this.x << 11)) & 0xffffffff) >>> 0;
//	document.write("(t=" + t + ")");
	this.x = this.y;
	this.y = this.z;
	this.z = this.w;
	return this.w = ((this.w ^ (this.w >>> 19) ^ (t ^ (t >>> 8)) >>> 0) & 0xffffffff) >>> 0;
}

Xor128.prototype.next = function(){
	return this.nexti() / (0xffffffff >>> 0);
}

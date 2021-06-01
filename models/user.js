var mongo=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");

var UserSchema=new mongo.Schema({
	username:String,
	password:String,
	email:String,
	institute:String,
	type:String,
	subject:String,
	image : String
});
	
UserSchema.plugin(passportLocalMongoose);

module.exports=mongo.model("user",UserSchema);
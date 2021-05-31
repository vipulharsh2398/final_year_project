var mongo=require("mongoose");
var passportLocalMongoose=require("passport-local-mongoose");

var FeedBackSchema=new mongo.Schema({
	username:String,
	areacode:String,
	phone:String,
	email_id:String,
	about:String
});
	
FeedBackSchema.plugin(passportLocalMongoose);

module.exports=mongo.model("feedback",FeedBackSchema);

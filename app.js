var PORT=process.env.PORT || 3000;

var exp=require('express');
var app=exp();
var mongo=require('mongoose');
var bodyParser=require('body-parser');
var methodOverride=require("method-override");
var expSanitizer=require('express-sanitizer');
const path = require('path');
const multer = require('multer')
var flash=require("connect-flash");

//Upload files
const upload_directory = `uploads/`
const storage = multer.diskStorage({
	destination : `${upload_directory}`,
	filename : function(req, file, cb){
		cb(null, `${Date.now()}-${file.originalname}`)
	}
})
const upload = multer({ storage : storage })


mongo.set('useNewUrlParser', true);
mongo.set('useUnifiedTopology', true);
mongo.set('useFindAndModify', false);
mongo.set('useCreateIndex', true);



app.set("view engine","ejs");
app.use(exp.static("public"));
app.use("/uploads", exp.static("uploads"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.use(expSanitizer());
app.use(flash());



//Importing models
const {Assignment} = require('./models/Assignment')
var User=require("./models/user");

var Feedback=require("./models/feedback_model");





var passport 				=require('passport');
const LocalStrategy 		= require('passport-local'); 
var passportLocalMongoose 	=require("passport-local-mongoose");




app.use(require("express-session")({
	secret:"Rusty is the best dog",
	resave:false,
	saveUninitialized:false
}));






app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




mongo.connect("mongodb://localhost/final_year");





app.use(function(req,res,next){
	res.locals.current_user=req.user;
	next();
});






function isLoggedIn(req,res,next)
{
	if(req.isAuthenticated())
	{
		return next();
	}
	// req.flash("error","please login first");
	res.redirect("/loginfail");
}





//================================================================
//				ROUTES
//================================================================

app.get("/",function(req,res){
	res.render("index.ejs");
});


app.get("/index",function(req,res){
	res.render("index.ejs");
});


app.get("/about",function(req,res){
	res.render("aboutus.ejs");
});


app.get("/student",function(req,res){
	res.render("student.ejs");
});



app.get("/registered",function(req,res){
	res.render("registered.ejs");
});

app.get("/loginfail",function(req,res){
	res.render("loginfail.ejs");
});


app.get("/logout",isLoggedIn,function(req,res){
	req.logout();
	// req.flash("success","Logged out!!!");
	res.redirect("/index");
});


app.get("/loggedin", isLoggedIn, async function(req,res){
	let assignments = await Assignment.find().populate('comments.created_by').lean();
	// Checking if current user submitted every assignments
	assignments = assignments.map(assignment => {
		// Checking now
		if(assignment.submissions)
		{
			const submission = assignment.submissions.find(submission => submission.submitted_by.equals(req.user._id));
			if(submission)
			{

				assignment['is_submitted'] = true;	
			}
		}

		return assignment;
	});
	

	var count=0;
	var cnt=0;
	var x;

	var today=new Date();


	User.find({},function(err,data){
		if(err)
		{
			console.log("something went wrong");
			console.log(err);
		}
		else
		{
			res.render("loggedin.ejs", {today:today,x:x,cnt:cnt,count : count,user_in_ejs_file:data,assignments,user:req.user, user_type : req.user.type, submitted : req.query.submitted});
		}

	});
});


// app.get("/assignmentsubmissions", isLoggedIn, async function(req,res){
// 	const assignment_id = req.query.assignment;

// 	const assignment = await Assignment.findById(assignment_id).populate('submissions.submitted_by').lean();
	
// 	res.render("viewassignment.ejs", {user_type : req.user.type, assignment});
// });


app.get("/assignmentsubmissions", isLoggedIn, async function(req,res){
	const assignment_id = req.query.assignment;

	const assignment = await Assignment.findById(assignment_id).populate('submissions.submitted_by').lean();
	

	User.find({},function(err,data){
		if(err)
		{
			console.log("something went wrong");
			console.log(err);
		}
		else
		{
			res.render("viewassignment.ejs",{user_in_ejs_file:data, assignment ,user_type : req.user.type});
		}

	});

});


app.get("/admin/feedback",function(req,res){
	Feedback.find({},function(err,data){
		if(err)
		{
			console.log(err);
			res.redirect("/index");
		}
		else
		{
			res.render("feedback.ejs",{feedbacks:data});
		}
	});
});



app.get("/teacher/assignment/:username",function(req,res){
	Assignment.find({owner:req.params.username}).populate('comments.created_by').exec(function(err,data){
		if(err)
		{
			console.log(err);
			res.redirect("/loggedin");
		}
		else
		{
			data = data.map(assignment => {
				// Checking now
				if(assignment.submissions)
				{
					const submission = assignment.submissions.find(submission => submission.submitted_by.equals(req.user._id));
					if(submission)
					{

						assignment['is_submitted'] = true;	
					}
				}

				return assignment;
			});
			
			res.render("newpage.ejs",{user_type:req.user.type,assignments:data});
		}
	});
});



app.post("/login",passport.authenticate("local",{
	successRedirect:"/loggedin",
	failureRedirect:"/loginfail"
}),function(req,res){
});



app.post("/addassignment", upload.single('assignment_file'), async (req, res) => {
	const filename = req.file ? req.file.filename : null
	const assignment = Assignment({
		name : req.body.name,
		description : req.body.description,
		due_date : req.body.date,
		file : filename,
		owner:req.user.username
	})

	await assignment.save()

	return res.redirect("/loggedin");
})

app.post("/submitassignment", [isLoggedIn, upload.single('stud_assignment_file')], async (req, res) => {
	const filename = req.file ? req.file.filename : null
	const assignment_id = req.body.assignment

	const assignment = await Assignment.findById(assignment_id)

	if(assignment)
	{
		if(!assignment.submissions)
		{
			assignment.submissions = []
		}

		assignment.submissions.push({
			submitted_by : req.user._id,
			file : filename,
		})
	}

	await assignment.save()
	return res.redirect('/loggedin?submitted=true')
})

app.post("/assignmentcomment", isLoggedIn, async (req, res) => {
	
	const comment = req.body.comment;
	const assignment_id = req.body.assignment;

	const assignment = await Assignment.findById(assignment_id);

	if(assignment)
	{
		if(!assignment.comments)
		{
			assignment.comments = []
		}
		assignment.comments.push({
			created_by : req.user._id,
			name : comment,
		});
	}

	await assignment.save()
	return res.redirect('/loggedin')
})

app.post("/register",upload.single('image'),function(req,res){
	User.register(new User({username:req.body.username}),req.body.password,function(err,user){
		if (err) 
	      {
	      	// req.flash("error",err.message);
	        return res.render("index.ejs");
	      }
	     else
	     {
	     	passport.authenticate("local")(req,res,function(){
	     		// req.flash("success","Successfully registered as student");

				const filename = req.file ? req.file.filename : null
				user.image = filename;
	     		var ins=req.body.institute;
	     		var em=req.body.email;
				var tp='s';
				user.institute=ins;
				user.email=em;
				user.type=tp;
				user.save(function(err){
					if(err)
						console.log("Error");
					else
						console.log("Everything worked fine");
				});

	     		res.redirect("/registered");
	     	})
	     }
	});
});


app.post("/register/t",upload.single('image'),function(req,res){
	User.register(new User({username:req.body.username}),req.body.password,function(err,user){
		if (err) 
	      {
	      	// req.flash("error",err.message);
	        return res.render("index.ejs");
	      }
	     else
	     {
	     	passport.authenticate("local")(req,res,function(){
	     		// req.flash("success","Successfully registered as teacher");

				const filename = req.file ? req.file.filename : null
				user.image = filename;
	     		var ins=req.body.institute;
	     		var em=req.body.email;
				var sub=req.body.subject;

				var tp='t';

				user.institute=ins;
				user.email=em;
				user.type=tp;
				user.subject=sub;
				
				user.save(function(err){
					if(err)
						console.log("Error");
					else
						console.log("Everything worked fine");
				});

	     		res.redirect("/registered");
	     	})
	     }
	});
});



app.post("/add/feedback",function(req,res){
	var un=req.body.username;
	var ac=req.body.areacode;
	var phone_no=req.body.telnum;
	var e=req.body.emailid;
	var desc=req.body.description;

	Feedback.create({
		username:un,
		areacode:ac,
		phone:phone_no,
		email_id:e,
		about:desc
	},function(err,data){
		if(err)
		{
			console.log(err);
			res.redirect("/index");
		}
		else
		{
			data.save();
			res.redirect("/about");
		}
	});

});









app.listen(PORT,function(){
	console.log("Server has started");
});
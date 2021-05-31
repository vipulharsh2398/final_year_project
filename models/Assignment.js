const mongoose = require('mongoose')

const assignmentSchema = new mongoose.Schema({
	name : String,
	description : String,
	due_date : Date,
	file : String,
	created_at : {
		type : Date,
		default : Date.now
	},
	submissions : [{
		submitted_by : {
			type : mongoose.Schema.Types.ObjectId,
			ref : 'user'
		},
		file : String,
		submitted_at : {
			type : Date,
			default : Date.now
		}
	}],
	comments : [{
		name : String,
		created_at : { 
			type : Date,
			default : Date.now
		},
		created_by : {
			type : mongoose.Schema.Types.ObjectId,
			ref : 'user'
		},
	}],
	owner:String
})

const Assignment = mongoose.model('Assignment', assignmentSchema)
module.exports = {
	Assignment
}
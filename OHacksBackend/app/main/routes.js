// -------------------------------------------------------------------------------//
// ---------------------- HANDLES ROUTES FROM THE CLIENT ------------------------//
// -------------------------------------------------------------------------------//

var dog = require('../database/FosteredDog.js');
var foster = require('../database/Foster.js');

module.exports = function(app, passport) {

	/************************ ROUTES FOR RENDERING PAGES ***********************/

	// home page
	app.get('/', function(req, res){
		res.render("login.ejs");
	});

	// HANDLES USER LOGIN

	app.get('/login', function(req, res){
		res.render('login.ejs', {message : req.flash('loginMessage')});
	});

	app.post('/login', passport.authenticate('local-login', {
		successRedirect : '/dogadd',
		failureRedirect : '/login',
		failureFlash : true,
	}));

	// HANDLES USER SIGNUP

	app.get('/signup', function(req, res){
		res.render('signup.ejs', {message : req.flash('signupMessage')});
	});

	app.post('/signup', function(req, res, next) {
		passport.authenticate('local-login', {
			successRedirect : '/dogadd',
			failureRedirect : '/signup',
			failureFlash : true,
		});
	});

	// signs the user out of session
	app.get('/logout', function(req, res){
		req.logout();
		res.render('login.ejs');
	});

	app.get('/dogadd', isLoggedIn, function(req, res){
		res.send(req.user);
	});

	/*************************** SERVER SIDE ROUTES ************************/

	// Pass the json format with the following fields: dogName, time_needed_by, location, type, and size.
	//		All fields are strings.
	app.post('/addNeededDog', function(req, res){
		var dogPost = new dog({ FosteredDog: {
			dogName : req.body.dogName,
			time_needed_by: (Date.now()/1000)|0,
			location : req.body.location,
			breed : req.body.breed,
			size : req.body.size,
			owner_id: null,
			vacc_date : "",
			vacc_info : ""
		}});
		dogPost.save(function(err, json) {
			if(err) return err;
			res.json(201, json);
		});
	});

	// Pass the json in with the following fields: dogId (for the id of the dog) and ownerId (for the new foster).
	//		All fields are strings.
	app.post('/dogFostered', function(req, res){
		dog.findById(req.body.dogId, function(err, adoptedDog) {
			if(err) {
				res.send(500);
				return err;
			}

			if (adoptedDog === null) {
				res.send(404);
				return;
			}

			if (adoptedDog.FosteredDog.owner_id) {
				res.send(410);
				return;
			}

			foster.findById(req.body.ownerId, function(err, newFoster) {
				if(err) {
					res.send(500);
					return err;
				}

				if (newFoster === null) {
					res.send(404);
					return;
				}

				adoptedDog.FosteredDog.owner_id = req.body.ownerId;
				newFoster.Foster.dogFostered.id = req.body.dogId;
				adoptedDog.save(function(err, json) {
					if(err) return err;
					res.send(204);
				});
				newFoster.save(function(err, json) {
					if(err) return err;
					res.send(204);
				});
			});
		});
	});

	// JSON format: email (user's email), and name (user's name). All fields are strings
	app.post('/addFoster', function(req, res){
		var fost = new foster({ Foster: {
			main: {
				email: req.body.email,
				name: req.body.name,
				is_approved: false,
			},
			preferences : {
				user_location : "",
				time_needed_by : "",
				breed : [""],
				weightRange : { min: -1, max: -1 },
				ageRange : { min: -1, max: -1 }
			},
			dogFostered : {
				dogInfo : {
					id: "",
					time_adopted : "",
					time_until : "",
				}
			}
		}});

		fost.save(function(err, json) {
			if (err) return err;
			res.json(201, json);
		});
	});

	app.get('/sendNotifToUser', function(req, res){

	});

	app.get('/getDogList', function(req, res){
		dog.find(function(err, dogs) {
			res.json(dogs);
		}).sort({ time_needed_by : 'asc' });
	});

	// Pass the json in with the following fields:
	// {
	// user_location: String
	// time_needed_by: String
	// breed: String
	// weight_range: { min: Number, max: Number }
	// age_range: { min: Number, max: Number }
	// }
	app.post('/updateFosterPreferences', function(req, res){
		foster.findOne({ "Foster.main.email" : req.body.email }, function(err, currFoster) {
			if(currFoster === null) {
				res.send(404);
				return;
			}
			if(err) {
				return err;
			}
			currFoster.Foster.preferences.user_location = req.body.user_location;
			currFoster.Foster.preferences.time_needed_by = req.body.time_needed_by;
			currFoster.Foster.preferences.breed = req.body.breed;
			currFoster.Foster.preferences.weight_range = {
				min: req.body.weight_range.min,
				max: req.body.weight_range.max
			};
			currFoster.Foster.preferences.age_range = {
				min: req.body.age_range.min,
				max: req.body.age_range.max
			};

			currFoster.save(function(err, json) {
				if(err) return err;
				res.json(204, json);
			});
		});
	});

	// JSON format: dogId (to identify what dog needs its vaccination shit updated), vacc_date (date of vaccination),
	//		and vacc_info (information about vaccination). All fields are strings
	app.post('/updateVaccination', function(req, res) {
		dog.findById(req.body.dogId, function(err, vaccinatedDog) {
			if(err) {
				res.send(500);
				return err;
			}
			if(vaccinatedDog === null) {
				res.send(404);
				return;
			}
			vaccinatedDog.FosteredDog.vacc_date = req.body.vacc_date;
			vaccinatedDog.FosteredDog.vacc_info = req.body.vacc_info;
			vaccinatedDog.save(function(err, json) {
				if(err) return err;
				res.send(204);
			})
		});
	});

	app.get('/sendNotificationToAll', function(req, res){

	});

	/*************************** EXTRA ************************/


	// MIDDLEWARE TO CHECK IF USER IS ALREADY LOGGED IN
	function isLoggedIn(req, res, next) {

		// if user is authenticated in the session, carry on
		if (req.isAuthenticated())
			return next();

		// if they aren't redirect them to the home page
		res.redirect('/login');
	}
};

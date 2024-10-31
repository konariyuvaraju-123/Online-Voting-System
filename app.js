const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');
const session = require('express-session');

const app = express();
const port = 3000;

// Session middleware setup
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MySQL Database Configuration
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'voting'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Unable to connect to MySQL:', err);
    throw err;
  }
  console.log('Connected to MySQL database');
});

// Middleware for parsing JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Define a root route
app.get('/', (req, res) => {
  res.send(`<div><h1>Welcome to the Voting App!</h1>
  Have An Account<a href='/register'>Register</a><br><br>Don't Have An Account<a href='/login'>Login</a></div>`)
});

// Registration route
app.get('/register', (req, res) => {
  res.render('register');

  
});

app.post('/register', (req, res) => {
  const { name, rollNumber, department, yearOfStudy } = req.body;
  const voterId = 'RVR' + generateRandomNumber(10000, 99999);

  const insertUserQuery = 'INSERT INTO users (name, roll_number, department, year_of_study, voter_id) VALUES (?, ?, ?, ?, ?)';
  db.query(insertUserQuery, [name, rollNumber, department, yearOfStudy, voterId], (err, result) => {
    if (err) {
      console.error('Error inserting user:', err);
      res.status(500).send('Internal Server Error');
    } else {
      const userId = result.insertId;

      // Retrieve the newly inserted user from the database
      const getUserQuery = 'SELECT * FROM users WHERE id = ?';
      db.query(getUserQuery, [userId], (err, result) => {
        if (err) {
          console.error('Error retrieving user:', err);
          res.status(500).send('Internal Server Error');
        } else {
          const user = result[0];

          // Save user information in the session
          req.session.userId = user.id;

          // Redirect to the dashboard after successful registration
          res.redirect('/dashboard');
        }
      });
    }
  });
});

// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { rollNumber, voterId } = req.body;

  const checkUserQuery = 'SELECT * FROM users WHERE roll_number = ? AND voter_id = ?';
  db.query(checkUserQuery, [rollNumber, voterId], (err, result) => {
    if (err) {
      console.error('Error checking user:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (result.length > 0) {
      const user = result[0];
      req.session.userId = user.id;
      res.redirect('/dashboard');
    } else {
      res.send('<script>alert("Roll number or Voter ID is incorrect"); window.location="/login";</script>');
    }
  });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  const userId = req.session.userId;

  // Retrieve the latest user from the 'users' table
  const getUserQuery = 'SELECT * FROM users WHERE id = ?';
  db.query(getUserQuery, [userId], (err, result) => {
    if (err) {
      console.error('Error retrieving user:', err);
      res.status(500).send('Internal Server Error');
    } else {
      const user = result[0];
      if (user) {
        // Render the dashboard template with user details
        res.render('dashboard', { user });
      } else {
        res.status(404).send('User not found');
      }
    }
  });
});

// Vote route
app.get('/vote', (req, res) => {
  const getCandidatesQuery = 'SELECT * FROM electioncandidates';
  db.query(getCandidatesQuery, (err, candidates) => {
    if (err) {
      console.error('Error retrieving candidates:', err);
      res.status(500).send('Internal Server Error');
    } else {
      res.render('electyourleader', { candidates });
    }
  });
});

// Vote submission route
app.post('/vote', (req, res) => {
  const candidateId = req.body.candidate_id;
  const userId = req.session.userId;

  const hasVotedQuery = 'SELECT * FROM votes WHERE user_id = ?';
  db.query(hasVotedQuery, [userId], (err, result) => {
    if (err) {
      console.error('Error checking vote:', err);
      return res.status(500).send('Internal Server Error');
    }

    if (result.length > 0) {
      return res.send('<script>alert("You have already voted!"); window.location="/dashboard";</script>');
    }

    const updateVoteCountQuery = 'UPDATE electioncandidates SET vote_count = vote_count + 1 WHERE id = ?';
    db.query(updateVoteCountQuery, [candidateId], (err, result) => {
      if (err) {
        console.error('Error updating vote count:', err);
        res.status(500).send('Internal Server Error');
      } else {
        const insertVoteQuery = 'INSERT INTO votes (user_id, candidate_id) VALUES (?, ?)';
        db.query(insertVoteQuery, [userId, candidateId], (err, result) => {
          if (err) {
            console.error('Error inserting vote:', err);
            res.status(500).send('Internal Server Error');
          } else {
            res.send('<script>alert("Vote cast successfully!"); window.location="/dashboard";</script>');
          }
        });
      }
    });
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(); // Destroy the session on logout
  res.redirect('/login');
});


// ... (previous code)

// Home route
app.get('/home', (req, res) => {
  res.render('home'); // Assuming 'home' is the name of your home.ejs file
});

// Contact Us route
app.get('/contactus', (req, res) => {
  res.render('contactus'); // Assuming 'contactus' is the name of your contactus.ejs file
});

// Help route
app.get('/help', (req, res) => {
  res.render('help'); // Assuming 'help' is the name of your help.ejs file
});

// ... (remaining code)


// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});

// Helper function to generate a random number between min and max (inclusive)
function generateRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

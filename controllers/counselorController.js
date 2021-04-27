const pool = require('../models/queries');
const { counselorValidation } = require('../validation');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');


let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: 'themocktherapysite@gmail.com', // generated ethereal user
      pass: 'mocktherapy', // generated ethereal password
    },
    tls: {
        rejectUnauthorized: false
    }
  });


const counselorController = {

    postRegister: async function(req, res) {
        const { error } = counselorValidation(req.body);
        if(error) return res.json(error.details[0].message)

        const { firstname, lastname, email, phoneNo, aboutMe, password, password2} = req.body;

        //check if email exists in database already
        const checkEmail = await pool.query('SELECT * FROM counselors WHERE email = $1', [email]);
        if(checkEmail.rows[0]) return res.json('Email already exists')
        
        //confirm password
        if(password !== password2) return res.json('password does not match');
    
        //hashing password
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        //Create confirmation code with email token
        const token = jwt.sign({email: email}, 'sasuke007');

        //save to database
        try {
            const user = await pool.query('INSERT INTO counselors (firstname, lastname, email, phoneNo, aboutMe, password, confirmation_code) VALUES ($1, $2, $3, $4, $5, $6, $7)', [firstname, lastname, email, phoneNo, aboutMe, hashPassword, token]);

            //SENDING ACTIVATION MAIL
            let mailTransport = {
                from: '"noreply@gmail.com" <themocktherapysite@gmail.com>', // sender address
                to: email, // list of receivers
                subject: "Account Activation", // Subject line
                html: ` <h1>Email Confirmation</h1>
                        <h2>Hello ${firstname}</h2>
                        <p>Thank you for subscribing. Please confirm email by clicking on the link below</p>
                        <a href=http://localhost:3000/counselor/confirmation/${token}>Click here</a>`, // html body
              };
        
              transporter.sendMail(mailTransport, (error, info) => {
                  if(error) console.log(error);
                  res.send('Mail has been sent to your email')
              });
        } catch(err) {
            res.status(400).send(err)
        }
    },


    Confirmation: async function(req, res) {
        try {
            let confirmationCode = req.params.token;
            let user = await pool.query('SELECT * FROM counselors WHERE confirmation_code = $1', [confirmationCode]);
            if(!user.rows[0]) return res.status(400).send('User Not found')

            //if user exist, change isVerified to true
            const isVerified = await pool.query('UPDATE counselors SET is_verified = $1 WHERE confirmation_code = $2', [true, confirmationCode ])
            res.send('email verified');
        } catch(err) {
            res.send(err)
        }
    },

    postLogin: async function(req, res) {

        const email = req.body.email;
        const password = req.body.password;

        //check if email exists
        const user = await pool.query('SELECT * FROM counselors WHERE email = $1', [email]);
        if(!user.rows[0]) return res.json('Email or password is wrong');
        
        //check if user is confirmed/verified
        if(user.rows[0].is_verified == false) return res.json('Please confirm your email to login');

        //check if password is correct
        const validPass = await bcrypt.compare(password, user.rows[0].password);
        if(!validPass)  return res.json('Invalid password')

        //assign jwt token
        const token = jwt.sign({_id: user.rows[0]._id }, 'sasuke007');
        console.log(token)
        res.cookie('auth_token', token, {maxAge: 3600 * 1000 * 24 * 365, httpOnly: false});
        res.send('logged in')
    },

    logout: function(req, res) {
        res.clearCookie('token')
        res.send('logout successful!')
    }
}



module.exports = counselorController;
const express = require('express')
const jwt = require('jsonwebtoken')
const TOKEN_SECRET = "7bc78545b1a3923cc1e1e19523fd5c3f20b409509";
const app = express()
app.use(express.json())
const port = process.env.port || 5000


const mysql = require("mysql2/promise");
console.log(process.env.DATABASE_URL);

const pool = mysql.createPool({
    host: process.env.DATABASE_URL || "localhost",
    port:  3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DATABASE_NAME || "training_db",
    connectionLimit: 1
});

const Joi = require('joi')

const options = {
    abortEarly: false, // include all errors
    allowUnknown: true, // ignore unknown props
    stripUnknown: true // remove unknown props
};
let createUserSchema = async function (req,res,next){
    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        role: Joi.string().valid('ADMIN', 'USER').required()
    });

    try{    
    let result = await schema.validateAsync(req.body, options); 
    console.log(result);    
    next();
    }
    catch(err){
        console.log(err.details)
        let errorMessages = err.details.map(obj => ({field: obj.path[0] , message:obj.message}));
        res.json({validation:"failed", errors: errorMessages});
    }
    
}

function authenticateToken(req, res, next) {
    // Gather the jwt access token from the request header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.status(401).json({message:"Token is missing"}) // if there isn't any token

    jwt.verify(token, TOKEN_SECRET, (err, user) => {
    console.log(err)
    console.log(user);
    if (err) {
        if (err.name == "JsonWebTokenError"){
            return res.status(403).json({message:"Invalid Token"})
        }
        else if (err.name == "TokenExpiredError"){
            return res.status(403).json({message:"Token is expired. Please login again"})
        }
        else{
            return res.status(403).json(err)
        }
        
    }
    req.user = user
    next() // pass the execution off to whatever request the client intended
    })
}

function generateAccessToken(user) {
    // expires after 60 mins (3600 seconds = 60 minutes)
    return jwt.sign({sub:user.id, role:user.role}, TOKEN_SECRET, { expiresIn: 60*60 });
}

let loginUserSchema = async function(req,res,next){
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });
    try{    
        let result = await schema.validateAsync(req.body, options); 
        console.log(result);    
        next();
        }
        catch(err){
            console.log(err.details)
            let errorMessages = err.details.map(obj => ({field: obj.path[0] , message:obj.message}));
            res.json({validation:"failed", errors: errorMessages});
        }
        
}

app.get("/", (req,res)=> res.send({message:"Working"}))
app.post('/api/users', createUserSchema, createUser);
app.post("/api/users/login",loginUserSchema, login)
app.get("/api/users", authenticateToken, getAllUsers);

app.post('/api/accounts', authenticateToken, createAccount);
async function createUser(req,res){

    let user = req.body;
    console.log(user);
    //insert the user details into users table
    let params = [ user.name, user.email, user.password, user.role];
    const result = await pool.query("insert into users (name,email,password,role) values ( ?,?,?,?)", params);    
    let id = result[0].insertId; 
    res.status(200).json({id: id});
}

async function createAccount(req,res){

    let {accountType, userId} = req.body;

    let createdBy = req.user.sub;
    let role = req.user.role;
    if ( role =='USER'){
        res.status(400).json({message:"Access Denied to create account"});
    }
    else{
        console.log("CreatedBy" , createdBy);
    
        //insert the user details into users table
        let params = [ userId, accountType, createdBy];
        const result = await pool.query("insert into accounts (user_id, account_type, created_by) values (?,?,?)", params);    
        let id = result[0].insertId; 
        res.status(200).json({id: id});
    }
    
}

async function login(req,res){
    let {email,password} = req.body;
    let params = [email,password];
    let result = await pool.query ("select id,name,email,role from users where email=? and password = ?", params);
    let users = result[0];
    if(users.length == 0){
        res.json({message:"Invalid Login Credentials"});
    }
    else{
        let user = users[0];
        let token = generateAccessToken(user);
        user["token"] = token;
        res.json(user);
    }
}



async function getAllUsers(req,res){
    const result = await pool.query("select id,name,email,role from users");
    let users = result[0];
    res.status(200).json(users);
}

app.listen(port, () => console.log(`Example app listening on port port!`, port ))
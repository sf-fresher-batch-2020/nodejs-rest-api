const express = require('express')

const app = express()
app.use(express.json())
const port = process.env.port | 3000


const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: process.env.DATABASE_URL | "localhost",
    port: 3306,
    user: "naresh",
    password: "naresh",
    database: "naresh_db",
    connectionLimit: 10
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


app.post('/api/users', createUserSchema, createUser);
app.get("/api/users", getAllUsers);

async function createUser(req,res){

    let user = req.body;
    console.log(user);
    //insert the user details into users table
    let params = [ user.name, user.email, user.password, user.role];
    const result = await pool.query("insert into users (name,email,password,role) values ( ?,?,?,?)", params);    
    let id = result[0].insertId; 
    res.status(200).json({id: id});
}



async function getAllUsers(req,res){
    const result = await pool.query("select id,name,email,role from users");
    let users = result[0];
    res.status(200).json(users);
}

app.listen(port, () => console.log(`Example app listening on port port!`))
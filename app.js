const express = require('express')

const app = express()
app.use(express.json())
const port = process.env.port || 5000

app.get("/", (req,res)=> res.send({message:"Working"}))

app.listen(port, () => console.log(`Example app listening on port port!`, port ))
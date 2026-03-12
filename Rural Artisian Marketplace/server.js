const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/ruralconnect")
.then(()=>console.log("MongoDB Connected"))
.catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
    phone:{type:String, unique:true},
    password:String
});

const User = mongoose.model("User",UserSchema);

/* ================= SIGNUP ================= */

app.post("/signup", async (req,res)=>{

    const {phone,password} = req.body;

    try{

        const existingUser = await User.findOne({phone:phone});

        if(existingUser){
            return res.json({
                success:false,
                message:"Account already exists"
            });
        }

        const newUser = new User({
            phone:phone,
            password:password
        });

        await newUser.save();

        res.json({
            success:true,
            message:"Signup successful"
        });

    }
    catch(err){
        res.json({
            success:false,
            message:"Server error"
        });
    }

});

/* ================= LOGIN ================= */

app.post("/login", async(req,res)=>{

    const {phone,password} = req.body;

    try{

        const user = await User.findOne({phone:phone});

        if(!user){
            return res.json({
                success:false,
                message:"Account does not exist"
            });
        }

        if(user.password !== password){
            return res.json({
                success:false,
                message:"Incorrect password"
            });
        }

        res.json({
            success:true,
            message:"Login successful"
        });

    }
    catch(err){
        res.json({
            success:false,
            message:"Server error"
        });
    }

});

app.listen(5000,()=>{
    console.log("Server running on port 5000");
});

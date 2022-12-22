exports.connect = async()=>{
    try{
        const mongoose = require("mongoose");
        var con = await mongoose.connect("mongodb+srv://guvi:admin123@cluster0.bdpws.mongodb.net/Application?retryWrites=true&w=majority",{useNewUrlParser:true,useUnifiedTopology:true});
        console.log("database connected");
        console.log(`MongoDB Database connected with HOST: ${con.connection.host}`)
    }catch(err){
       console.log("database error",err);
       process.exit();
    }
}

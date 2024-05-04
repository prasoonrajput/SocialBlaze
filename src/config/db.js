import mongoose from "mongoose";
import "dotenv/config"


export default ()=>{
    return mongoose.connect(process.env.MONGO_URL)
}
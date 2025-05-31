const mongoose=require('mongoose');
const {Schema}=mongoose

const userSchema= new Schema({
    fullName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    createdOne:{
        type:Date,
        default:Date.now()
    }
})

module.exports=mongoose.model('User',userSchema);
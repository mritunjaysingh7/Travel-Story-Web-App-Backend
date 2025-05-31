const jwt =require('jsonwebtoken');

require('dotenv').config();

const authenticateToken=(req,res,next)=>{
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(" ")[1];
    if(!token){
        return res.status(401).json({message: 'Token is required'});
    }

    jwt.verify(token,process.env.SECRET,(err,user)=>{
        if(err){
            return res.status(403).json({message: 'Token is invalid'});
        }
        req.user=user;
        next();
    })

}
module.exports = {authenticateToken}
const mongoose = require('mongoose');
const express = require('express')
const cors = require('cors')
const bcrypt = require('bcrypt')
require('dotenv').config()

const jwt = require('jsonwebtoken')

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));
databaseConnection()
const { authenticateToken } = require('./utilities');

const User = require('./models/user.model');
const TravelStory = require('./models/travelStory.model');
const upload = require('./multer');
const path = require('path');
const fs = require('fs');

async function databaseConnection() {
    await mongoose.connect(process.env.MONGOURL).then((res) => {
        console.log('Connected to MongoDB');
    }).catch(err => console.log(err));
}

//Test api
app.post('/create-account', async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
        return res.status(400).json({
            error: true,
            sucess: false,
            message: 'Please fill all fields'
        })
    }
    try {
        const isUser = await User.findOne({ email })
        if (isUser) {
            return res.status(409).json({
                error: true,
                success: false,
                message: 'Email already exists'
            })
        }
        const hasPassword = await bcrypt.hash(password, 10)
        console.log(hasPassword)

        const user = new User({
            fullName,
            email,
            password: hasPassword
        })
        await user.save()
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.SECRET,
            { expiresIn: '1h' }
        )
        return res.status(201).json({
            error: false,
            user: { fullName: user.fullName, email: user.email },
            message: 'User created successfully',
            accessToken
        })
    }
    catch (err) {
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })
    }

})

//Login 

app.post('/login', async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        return res.status(400).json({
            error: true,
            success: false,
            message: 'Please fill all fields'
        })
    }
    try {
        const user = await User.findOne({ email })
        if (!user) {
            return res.status(401).json({
                error: true,
                success: false,
                message: 'User not found'
            })
        }
        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) {
            return res.status(401).json({
                error: true,
                success: false,
                message: 'Invalid password'
            })
        }
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.SECRET,
            { expiresIn: '1h' }
        )
        return res.status(200).json({
            error: false,
            user: { fullName: user.fullName, email: user.email },
            message: 'User logged in successfully',
            accessToken
        })
    } catch (err) {
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })
    }



})

//Get user
app.get('/get-user', authenticateToken, async (req, res) => {
    const { userId } = req.user
    try {
        const isUser = await User.findOne({ _id: userId })
        if (!isUser) {
            return res.status(401).json({
                error: true,
                success: false,
                message: 'User not found'
            })
        }
        return res.status(200).json({
            error: false,
            user: isUser,
            message: 'User fetched successfully'
        })
    } catch (err) {
        return res.status(401).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })
    }




})

//Create travel story

app.post('/add-travel-story', authenticateToken, async (req, res) => {
    const { title, story, visitedLocation, imageUrl, visitedDate } = req.body
    const { userId } = req.user
    if (!title || !story || !visitedLocation || !imageUrl || !visitedDate) {
        return res.status(400).json({
            error: true,
            success: false,
            message: 'Please fill all fields'
        })
    }
    // Convert visitedDate from milliseconds to date object
    const parsedVisitedDate = new Date(parseInt(visitedDate))
    try {
        const travelStory = new TravelStory({
            title,
            story,
            visitedLocation,
            imageUrl,
            visitedDate: parsedVisitedDate,
            userId
        })
        await travelStory.save()
        return res.status(201).json({
            story: travelStory,
            error: false,
            message: 'Travel story added successfully'
        })
    } catch (err) {
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })
    }

})

//Get all travel stories

app.get('/get-all-stories', authenticateToken, async (req, res) => {
    const { userId } = req.user
    try {
        const travelStories = await TravelStory.find({ userId: userId }).sort({ isFavorite: -1 })
        return res.status(200).json({
            stories: travelStories,
            error: false,
            message: 'Travel stories fetched successfully',
        })
    } catch (err) {
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })

    }
})

//Route  to handle image ulpoad
app.post('/image-upload', upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: true,
                success: false,
                message: 'No image provided'
            })
        }

        const imageUrl = `http://localhost:8000/uploads/${req.file.filename}`
        return res.status(200).json({
            error: false,
            imageUrl,
            message: 'Image uploaded successfully'
        })
    } catch (err) {
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })

    }
})

//Delete an image from upload folder
app.delete('/delete-image', async (req, res) => {
    const { imageUrl } = req.query
    if (!imageUrl) {
        return res.status(400).json({
            error: true,
            success: false,
            message: 'No image provided'
        })
    }
    try {
        //Extract the filename from the imageUrl
        const filename = path.basename(imageUrl)
        //Define the file path
        const filePath = path.join(__dirname, 'uploads', filename)
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
            return res.status(200).json({
                error: false,
                message: 'Image deleted successfully'
            })
        }
        else {
            return res.status(404).json({
                error: true,
                success: false,
                message: 'Image not found'
            })
        }

    } catch (err) {
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })
    }


})

//Serve static files from the uploads and assests directory

app.use("/uploads", express.static(path.join(__dirname, 'uploads')))

app.use("/assets", express.static(path.join(__dirname, 'assets')))

app.post('/edit-story/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const { title, story, visitedLocation, imageUrl, visitedDate } = req.body
    const { userId } = req.user

    if (!title || !story || !visitedLocation  || !visitedDate) {
        return res.status(400).json({
            error: true,
            success: false,
            message: 'Please fill all fields'
        })
    }
    // Convert visitedDate from milliseconds to date object
    const parsedVisitedDate = new Date(parseInt(visitedDate))
    try {
        //Find the travel story by id and ensure it belongs to the authenticated User
        const travelStory = await TravelStory.findOne({ _id: id, userId: userId });
        if (!travelStory) {
            return res.status(404).json({
                error: true,
                success: false,
                message: 'Travel story not found'
            })
        }
        const placeholderImageUrl = `http://localhost:8000/assests/placeholder.png`
        travelStory.title = title
        travelStory.story = story
        travelStory.visitedLocation = visitedLocation
        travelStory.imageUrl = imageUrl || placeholderImageUrl
        travelStory.visitedDate = parsedVisitedDate

        await travelStory.save()
        return res.status(200).json({
            story: travelStory,
            error: false,
            message: 'Travel story updated successfully'
        })

    } catch (err) {
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })

    }



})


//Delete a travel story
app.delete('/delete-story/:id',authenticateToken,async (req,res)=>{
    const { id } = req.params
    const { userId } = req.user
    try{
        const travelStory= await TravelStory.findOne({_id:id, userId:userId})
        if(!travelStory){
            return res.status(404).json({
                error: true,
                success: false,
                message: 'Travel story not found'
            })
        }
        //Delete the travel story from database
        await travelStory.deleteOne({_id:id,userId:userId})

        const imageUrl= travelStory.imageUrl
        //Delete the image from uploads directory
        const filename=path.basename(imageUrl)
        const filePath= path.join(__dirname,'uploads',filename)
        if(fs.existsSync(filePath)){
        fs.unlinkSync(filePath,(err)=>{
            if(err){
                console.log(err)
            }
        })
    }
        return res.status(200).json({
            error: false,
            message: 'Travel story deleted successfully'
        })
    }catch(err){
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })

    }
})

//Update isFavourite

app.put('/update-is-favourite/:id', authenticateToken, async (req, res) => {
    const { id } = req.params
    const { userId } = req.user
    const { isFavorite } = req.body
    try{
        const travelStory= await TravelStory.findOne({_id:id,userId:userId})
        if(!travelStory){
            return res.status(404).json({
                error: true,
                success: false,
                message: 'Travel story not found'
            })
        }
        travelStory.isFavourite = isFavorite
        await travelStory.save()
        return res.status(200).json({
            story: travelStory,
            error: false,
            message: 'Travel story updated successfully'
        })
    }catch(err){
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })

    }
})

//Search travel stories
app.post("/search",authenticateToken,async(req,res)=>{
    const {query} = req.query
    const {userId} = req.user
    if(!query){
        return res.status(400).json({
            error: true,
            success: false,
            message: 'Please provide a search query'
        })
    }
    try{
        const searchResult= await TravelStory.find({
            userId:userId,
            $or : [
                {title:{$regex:query, $options:'i'}},
                {story:{$regex:query, $options:'i'}},
                {visitedLocation:{$regex:query, $options:'i'}}
            ],
        }).sort({isFavourite: -1})
        return res.status(200).json({
            stories: searchResult,
            error: false,
            message: 'Travel stories fetched successfully'
        })
    }catch(err){
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })

    }
})

//Filter travel stories by dateRange
app.get("/travel-stories/filter",authenticateToken,async (req, res) => {
    const { startDate, endDate } = req.query
    const { userId } = req.user
    try{
        const start=new Date(parseInt(startDate))
        const end=new Date(parseInt(endDate))
        const filteredStories=await TravelStory.find({
            userId:userId,
            visitedDate:{$gte:start, $lte:end}
        }).sort({isFavourite:-1})
        return res.status(200).json({
            stories: filteredStories,
            error: false,
            message: 'Travel stories fetched successfully'
        })
    }catch(err){
        return res.status(500).json({
            error: true,
            success: false,
            message: 'Internal Server Error',
            error: err.message
        })

    }
})

app.listen(8000, () => {
    console.log('Server is running on port 8000');
});
module.exports = app;
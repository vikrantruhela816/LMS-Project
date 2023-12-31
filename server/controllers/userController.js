const nodemailer = require('nodemailer')
const userModel = require('../models/userModel')
const bcrypt = require('bcrypt')
const fs = require('fs/promises')
const cloudinary = require('cloudinary')


const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: true
}

function ping(req, res) {
    res.send("pong")
}

async function register(req, res) {
    try {
        const { fullname, email, password } = req.body

        if (!(fullname, email, password)) {
            throw new Error("all details are required")
        }

        const user = await userModel.findOne({ email })
        if (user) {
            throw new Error("User already exists")
        }

        if (password.length < 8) {
            throw new Error("password must be 8 charaters long")
        }

        const hashPassword = await bcrypt.hash(password, 10)
        const User = await userModel.create({
            fullname, email, password: hashPassword, avatar: {
                publicId: email,
                secureUrl: "stringgg"
            }
        })

        try {
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: 'lms',
                width: 250,
                height: 250,
                gravity: 'faces',
                crop: 'fill'
            });
            if (result) {

                User.avatar.publicId = result.public_id
                User.avatar.secureUrl = result.secure_url
                await User.save()
                fs.rm(`uploads/${req.file.filename}`)
            } else {
                throw new Error('uploading error')
            }
        } catch (err) {
            throw new Error('error in uploading files')
        }



        const token = await User.generateJwtToken()

        User.password = undefined
        res.cookie('token', token, cookieOptions).status(200).json({
            "success": true,
            "message": "User signup success",
            "user": User,
            token: token
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }

}

async function logIn(req, res) {
    try {
        const { email, password } = req.body

        if (!(email, password)) {
            throw new Error("all details are required")
        }

        const user = await userModel.findOne({ email }).select("+password")
        if (!user) {
            throw new Error("User not registered")
        }

        if (password.length < 8) {
            throw new Error("password must be 8 charaters long")
        }

        if (!bcrypt.compare(password, user.password)) {
            throw new Error("incorrect password")
        }

        const token = await user.generateJwtToken()

        user.password = undefined
        res.cookie('token', token, cookieOptions).status(200).json({
            "success": true,
            "message": "User login success",
            "user": user,
            token: token
        })
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        })
    }

}

function logOut(req, res) {

    res.cookie('token', null, cookieOptions).status(200).json({
        "success": true,
        "message": "User logout success"
    })

}

async function profile(req, res) {
    const { id } = req.user
    const user = await userModel.findOne({ _id: id })
    res.status(200).json({
        user
    })

}

async function forgotPassword(req, res) {
    try {
        const { email } = req.body

        if (!email) {
            throw new Error('Email is required')
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            throw new Error('user does not exist')
        }

        const resetToken = await user.PasswordResetToken()


        let mailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.NODEMAILER_MAIL,
                pass: process.env.NODEMAILER_PASS
            }
        });

        let mailDetails = {
            from: process.env.NODEMAILER_MAIL,
            to: email,
            subject: 'Reset Pasword',
            text: `here is your reset password link which is valid only for 15 mins :  <a href= localhost:3000/reset/${resetToken} target="_blank">Reset your password</a>`
        };

        mailTransporter.sendMail(mailDetails, function (err, data) {
            if (err) {
                throw new Error("email can't send ")
            } else {
                console.log('Email sent successfully');
            }
        });


        res.status(200).json({
            success: true,
            message: "email send successfully",
            resetToken: resetToken,
        })



    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        })

    }
}

async function resetPassword(req, res) {

}

module.exports = {
    ping,
    register,
    logIn,
    logOut,
    profile,
    forgotPassword,
    resetPassword
}
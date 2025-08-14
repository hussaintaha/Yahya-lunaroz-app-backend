import mongoose from "mongoose";

const userSchema = new mongoose({
    gid: {
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    firstName: {
        type: String,
        trim: true,
        required: true
    },
    lastName: {
        type: String,
        trim: true,
        required: true
    },
    email: {
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    phone: {
        type: String,
        trim: true,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true,
    },
},{timeStamp: true})

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
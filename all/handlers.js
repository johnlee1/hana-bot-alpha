const User = require('./users-model');
const Post = require('./posts-model');

createNewPost = async (text) => {   
    let post = new Post({
        prayer: text
    });
    let savedPost = await post.save((err, post) => {
        if (err) {
            console.log("couldn't create new post :(");
        }
    });
    return savedPost;

};

createNewUser = async (uid) => {
    let user = new User({
        uid: uid,
    });
    let savedUser = await user.save((err, user) => {
        if (err) {
            return "BAD"
        } 
    });
    return savedUser;
};

getUser = async (uid) => {
    let user = await User.findOne({ 'uid': uid }, (err, user) => {      
        if (err) {
            console.log("error getting user");
            return "BAD";
        }
    });
    if (user == null) {
        return "BAD";
    }
    return user;
};

module.exports = { createNewPost, createNewUser, getUser };

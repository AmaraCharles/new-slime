var express = require("express");
var { hashPassword,sendPasswordOtp,userRegisteration, sendWelcomeEmail,resendWelcomeEmail,resetEmail, sendUserDetails, userRegisteration } = require("../../utils");
const UsersDatabase = require("../../models/User");
var router = express.Router();
const { v4: uuidv4 } = require("uuid");

// Function to generate a referral code
function generateReferralCode(length) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }

  return code;
}


router.post("/register", async (req, res) => {
  const { name, username, email, password, phoneNumber } = req.body;

  const nftArtworks = [
    { title: "Bored Ape #148", url: "https://ipfs.io/ipfs/QmQ6VgRFiVTdKbiebxGvhW3Wa3Lkhpe6SkWBPjGnPkTttS/1484.png" },
    { title: "Bored Ape #3478", url: "https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/3478.png" },
    { title: "Bored Ape #3547", url: "https://ipfs.io/ipfs/QmQ6VgRFiVTdKbiebxGvhW3Wa3Lkhpe6SkWBPjGnPkTttS/3547.png" },
    { title: "Bored Ape #7070", url: "https://ipfs.io/ipfs/QmQ6VgRFiVTdKbiebxGvhW3Wa3Lkhpe6SkWBPjGnPkTttS/7070.png" },
    { title: "Bored Ape #9996", url: "https://ipfs.io/ipfs/QmQ6VgRFiVTdKbiebxGvhW3Wa3Lkhpe6SkWBPjGnPkTttS/9996.png" }
  ];

  function getRandomNFT() {
    const shuffled = nftArtworks.sort(() => Math.random() - 0.5);
    return shuffled[0].url;
  }

  try {
    // Check if the user already exists
    const existingUser = await UsersDatabase.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email address is already taken",
      });
    }

    // Generate a random avatar for the new user
    const avatar = getRandomNFT();
    console.log("Assigned Avatar:", avatar);

    // Hash the password (assuming the function exists and works correctly)
    const hashedPassword = hashPassword(password);
    if (!hashedPassword) {
      throw new Error("Password hashing failed");
    }

    // Create a new user object
    const newUser = {
      name,
      username,
      email,
      creatorAvatar: avatar,
      phoneNumber,
      artWorks: [],
      collections: [],
      balance: 0,
      profit: 0,
      bio:"",
      socials: {},
      verification: [],
      socialUsernames: [],
      password: hashedPassword,
      transactions: [],
      withdrawals: [],
      verify: "pending"
    };

    // Save the new user in the database
    const createdUser = await UsersDatabase.create(newUser);
    const token = uuidv4();
    sendWelcomeEmail({ to: email, token });
    userRegisteration({ name, email });

    return res.status(201).json({ code: "Ok", data: createdUser });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});



// router.post("/register", async (req, res) => {
//   const { name, lastName, email, password, country, referralCode } = req.body;

//   try {
//     // Check if any user has that email
//     const user = await UsersDatabase.findOne({ email });

//     if (user) {
//       return res.status(400).json({
//         success: false,
//         message: "Email address is already taken",
//       });
//     }

//     // Find the referrer based on the provided referral code
//     let referrer = null;
//     if (referralCode) {
//       referrer = await UsersDatabase.findOne({ referralCode });
//       if (!referrer) {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid referral code",
//         });
//       }
//     }

//     // Create a new user with referral information
//     const newUser = {
//       name,
//       lastName,
//       email,
//       password: hashPassword(password),
//       country,
//       amountDeposited: 0,
//       profit: 0,
//       balance: 0,
//       referalBonus: 0,
//       transactions: [],
//       withdrawals: [],
//       accounts: {
//         eth: {
//           address: "",
//         },
//         ltc: {
//           address: "",
//         },
//         btc: {
//           address: "",
//         },
//         usdt: {
//           address: "",
//         },
//       },
//       verified: false,
//       isDisabled: false,
//     };

//     // Generate a referral code for the new user only if referralCode is provided
//     if (referralCode) {
//       newUser.referralCode = generateReferralCode(6);
//     }

//     // If there's a referrer, update their referredUsers list
//     if (referrer) {
//       newUser.referredBy = referrer._id;
//       referrer.referredUsers.push(newUser._id);
//       await referrer.save();
//     }

//     // Create the new user in the database
//     const createdUser = await UsersDatabase.create(newUser);
//     const token = uuidv4();
//     sendWelcomeEmail({ to: email, token });

//     return res.status(200).json({ code: "Ok", data: createdUser });
//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });


// router.post("/register", async (req, res) => {
//   const { name, lastName, email, password, country } = req.body;

//   //   check if any user has that username
//   const user = await UsersDatabase.findOne({ email });

//   // if user exists
//   if (user) {
//     res.status(400).json({
//       success: false,
//       message: "email address is already taken",
//     });
//     return;
//   }

//   await UsersDatabase.create({
//     name,
//     lastName,
//     email,
//     password: hashPassword(password),
//     country,
//     amountDeposited: 0,
//     profit: 0,
//     balance: 0,
//     referalBonus: 0,
//     transactions: [],
//     withdrawals: [],
//     accounts: {
//       eth: {
//         address: "",
//       },
//       ltc: {
//         address: "",
//       },
//       btc: {
//         address: "",
//       },
//       usdt: {
//         address: "",
//       },
//     },
//     verified: false,
//     isDisabled: false,
//   })
//     .then((data) => {
//       return res.json({ code: "Ok", data: user });
//     })
//     .then(() => {
//       var token = uuidv4();
//       sendWelcomeEmail({ to: req.body.email, token });
//     })
//     .catch((error) => {
//       res.status(400).json({
//         success: false,
//         message: error.message,
//       });
//     });
// });



router.post("/register/resend", async (req, res) => {
  const { email } = req.body;
  const user = await UsersDatabase.findOne({ email });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    
    res.status(200).json({
      success: true,
      status: 200,
      message: "OTP resent successfully",
    });
    
 sendPasswordOtp({to:req.body.email})
   
    // sendUserDetails({
    //   to:req.body.email
    //   });
      

  } catch (error) {
    console.log(error);
  }
});


router.post("/register/reset", async (req, res) => {
  const { email } = req.body;
  const user = await UsersDatabase.findOne({ email });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    
    res.status(200).json({
      success: true,
      status: 200,
      message: "OTP resent successfully",
    });

    resetEmail({
      to:req.body.email
    });


   

  } catch (error) {
    console.log(error);
  }
});

router.post("/register/otp", async (req, res) => {
  const { email } = req.body;
  const { password }=req.body;
  const {name }=req.body;
  const user = await UsersDatabase.findOne({ email });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    
    res.status(200).json({
      success: true,
      status: 200,
      message: "OTP correct ",
    });

    sendUserDetails({
      to:req.body.email,
      password:req.body.password,
      name:req.body.name
    });


   

  } catch (error) {
    console.log(error);
  }
});




// const express = require("express");
// const { hashPassword, sendWelcomeEmail, resendWelcomeEmail } = require("../../utils");
// const UsersDatabase = require("../../models/User");
// const router = express.Router();
// const { v4: uuidv4 } = require("uuid");

// // Function to generate a referral code
// function generateReferralCode(length) {
//   const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
//   let code = "";

//   for (let i = 0; i < length; i++) {
//     const randomIndex = Math.floor(Math.random() * characters.length);
//     code += characters.charAt(randomIndex);
//   }

//   return code;
// }



// // Your registration route

// // Your registration route
// router.post("/register", async (req, res) => {
//   const { name, lastName, email, password, country, referralCode } = req.body;

//   try {
//     // Check if any user has that email
//     const user = await UsersDatabase.findOne({ email });

//     if (user) {
//       return res.status(400).json({
//         success: false,
//         message: "Email address is already taken",
//       });
//     }

//     // Find the referrer based on the provided referral code
//     let referrer = null;
//     if (referralCode) {
//       referrer = await UsersDatabase.findOne({ referralCode });
//       // You can remove the code that checks for a valid referral code here

//       // Optionally, you can handle the case where the referral code is invalid
//       // by setting referrer to null and proceeding with registration
//     }

//     // Create a new user with referral information
//     const newUser = {
//       name,
//       lastName,
//       email,
//       password: hashPassword(password),
//       country,
//       amountDeposited: 0,
//       profit: 0,
//       balance: 0,
//       referalBonus: 0,
//       transactions: [],
//       withdrawals: [],
//       accounts: {
//         eth: {
//           address: "",
//         },
//         ltc: {
//           address: "",
//         },
//         btc: {
//           address: "",
//         },
//         usdt: {
//           address: "",
//         },
//       },
//       verified: false,
//       isDisabled: false,
//       referralCode: generateReferralCode(6), // Generate a referral code for the new user
//       referredBy: referrer ? referrer._id : null, // Store the ID of the referrer if applicable
//       referredUsers: [], // Initialize the referredUsers property as an empty array
//     };

//     // Create the new user in the database
//     const createdUser = await User.create(newUser);
//     const token = uuidv4();
//     sendWelcomeEmail({ to: email, token });

//     // If there's a referrer, update their referredUsers list
//     if (referrer) {
//       referrer.referredUsers.push(createdUser._id);
//       await referrer.save();
//     }

//     return res.status(200).json({ code: "Ok", data: createdUser });
//   } catch (error) {
//     console.error("Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// });
module.exports = router;

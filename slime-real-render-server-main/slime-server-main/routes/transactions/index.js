const UsersDatabase = require("../../models/User");
var express = require("express");
var router = express.Router();
const { sendDepositEmail,sendPlanEmail} = require("../../utils");
const { sendUserDepositEmail,sendUserPlanEmail,sendWithdrawalEmail,sendWithdrawalRequestEmail,sendKycAlert,sendArtworkListingEmailToUser,sendArtworkListingEmailToAdmin,sendArtworkSoldEmailToOwner,sendArtworkPurchaseEmailToBidder} = require("../../utils");

const { v4: uuidv4 } = require("uuid");
const app=express()




router.post("/:_id/single", async (req, res) => {
  const { _id } = req.params;
  const { imgUrl,price ,title,description,category,timeStamp,userId,royalty,avatar,from} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }


  try {
    await user.updateOne({
      artWorks: [
        ...user.artWorks,
        {
          _id: uuidv4(),
          image:imgUrl,
          price ,
          title,
          description,
          category,
          timeStamp,
          creator:from,
          royalty,
          creatorAvatar:avatar,
          currentBid:" ",
          status:"unlisted",
        },
      ],
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: "Artwork  uploaded to admin ",
    });

    // sendDepositEmail({
    //    price , 
    //    category,
    //    title,
    //    description,
    //   from,
    //   timeStamp,
    // });


    // sendUserDepositEmail({
    //   amount: amount,
    //   method: method,
    //   from: from,
    //   to:to,
    //   timeStamp
    // });

  } catch (error) {
    console.log(error);
  }
});

router.post("/:_id/plan", async (req, res) => {
  const { _id } = req.params;
  const { subname, subamount, from ,timestamp,to} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }
  try {
    // Calculate the new balance by subtracting subamount from the existing balance
    const newBalance = user.balance - subamount;

    await user.updateOne({
      planHistory: [
        ...user.planHistory,
        {
          _id: uuidv4(),
          subname,
          subamount,
          from,
          timestamp,
        },
      ],
      balance: newBalance, // Update the user's balance
    });



    res.status(200).json({
      success: true,
      status: 200,
      message: "Deposit was successful",
    });

    // sendPlanEmail({
    //   subamount: subamount,
    //   subname: subname,
    //   from: from,
    //   timestamp:timestamp
    // });


    // sendUserPlanEmail({
    //   subamount: subamount,
    //   subname: subname,
    //   from: from,
    //   to:to,
    //   timestamp:timestamp
    // });

  } catch (error) {
    console.log(error);
  }
});


router.post("/:_id/auto", async (req, res) => {
  const { _id } = req.params;
  const { copysubname, copysubamount, from ,timestamp,to} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }
  try {
    // Calculate the new balance by subtracting subamount from the existing balance
    const newBalance = user.balance - copysubamount;

    await user.updateOne({
      planHistory: [
        ...user.planHistory,
        {
          _id: uuidv4(),
          subname:copysubname,
          subamount:copysubamount,
          from,
          timestamp,
        },
      ],
      balance: newBalance, // Update the user's balance
    });



    res.status(200).json({
      success: true,
      status: 200,
      message: "Deposit was successful",
    });

    sendPlanEmail({
      from: from,
      timestamp:timestamp
    });


    // sendUserPlanEmail({
    //   subamount: copysubamount,
    //   subname: copysubname,
    //   from: from,
    //   to:to,
    //   timestamp:timestamp
    // });

  } catch (error) {
    console.log(error);
  }
});




router.put("/:_id/transactions/:transactionId/confirm", async (req, res) => {
    const { _id, transactionId } = req.params;

    try {
        // Step 1: Find the user
        const user = await UsersDatabase.findOne({ _id });

        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "User not found",
            });
        }

        // Step 2: Find the specific artwork in the user's collection
        const depositsTx = user.artWorks.find(tx => tx._id === transactionId);

        if (!depositsTx) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "Artwork not found in user's collection",
            });
        }

        // Step 3: Deduct 0.1 from the user's balance
        if (user.balance >= 0.2) {
            user.balance = parseFloat((user.balance - 0.2).toFixed(2)); // Deduct and keep 2 decimal places
        } else {
            return res.status(400).json({
                success: false,
                status: 400,
                message: "Insufficient balance to list the artwork",
            });
        }

        // Step 4: Update the artwork status to "listed"
        depositsTx.status = "listed";

        // Step 5: Update the user's artwork array and balance in the database
        await UsersDatabase.updateOne(
            { _id: user._id },
            {
                $set: {
                    artWorks: user.artWorks,
                    balance: user.balance
                }
            }
        );

        // Send email notifications
        await sendArtworkListingEmailToAdmin({
            from: user.name,
            artworkTitle: depositsTx.title,
            price: depositsTx.price,
            timestamp: new Date().toISOString()
        });

        await sendArtworkListingEmailToUser({
            to: user.email,
            artworkTitle: depositsTx.title,
            price: depositsTx.price,
            timestamp: new Date().toISOString()
        });

        res.status(200).json({
            success: true,
            message: "Artwork listed successfully and 0.1 deducted from balance"
        });
    } catch (error) {
        console.error("Error during artwork listing:", error);
        res.status(500).json({
            success: false,
            message: "Oops! An error occurred while listing the artwork",
        });
    }
});



router.put("/:_id/transactions/:transactionId/confirm/admin", async (req, res) => {
  
  const { _id } = req.params;
  const { transactionId } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const depositsArray = user.artWorks;
    const depositsTx = depositsArray.filter(
      (tx) => tx._id === transactionId
    );

    depositsTx[0].status = "sold";
    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      artWorks: [
        ...user.artWorks
        //cummulativeWithdrawalTx
      ],
    });

    res.status(200).json({
      message: "Artwork listed",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});



router.put("/:_id/transactions/:transactionId/decline", async (req, res) => {
  
  const { _id } = req.params;
  const { transactionId } = req.params;
 
  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const depositsArray = user.transactions;
    const depositsTx = depositsArray.filter(
      (tx) => tx._id === transactionId
    );

    depositsTx[0].status = "Declined";
    
    const newBalance = Number(user.balance) + Number(amount);


    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      transactions: [
        ...user.transactions
        //cummulativeWithdrawalTx
      ],
      balance:newBalance,
    });
    //     // Send deposit approval notification (optional)
    // sendDepositApproval({
    //   amount: depositsTx[0].amount,
    //   method: depositsTx[0].method,
    //   timestamp: depositsTx[0].timestamp,
    //   to: user.email, // assuming 'to' is the user's email or similar
    // });


    res.status(200).json({
      message: "Transaction approved",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});


router.put("/id/confirm", async (req, res) => {
  const { artworkId, artworkName, bidAmount, bidderName, bidderId, timestamp } = req.body;

  try {
      // Step 1: Fetch all users
      const users = await UsersDatabase.find();

      // Step 2: Find the user who owns the artwork
      const owner = users.find(user => 
          user.artWorks.some(artwork => artwork._id === artworkId)
      );

      if (!owner) {
          return res.status(404).json({
              success: false,
              status: 404,
              message: `Artwork not found ${ artworkId }`,
          });
      }

      // Step 3: Update the artwork status to "sold" and change creatorName to bidderName
      const artwork = owner.artWorks.find(art => art._id === artworkId);
      if (!artwork) {
          return res.status(404).json({
              success: false,
              status: 404,
              message: "Artwork not found in owner's collection",
          });
      }

      artwork.status = "sold";
      artwork.creatorName = bidderName;

      // Update the owner's artwork collection
      await UsersDatabase.updateOne(
          { _id: owner._id },
          { $set: { artWorks: owner.artWorks } }
      );

      // Step 4: Find the bidder and add the artwork to their collection
      const bidder = await UsersDatabase.findOne({ _id: bidderId });

      if (!bidder) {
          return res.status(404).json({
              success: false,
              status: 404,
              message: "Bidder not found",
          });
      }

      // Clone the artwork and change its status to "listed"
      const newArtwork = { ...artwork, status: "listed" };

      // Add the updated artwork to the bidder's collection
      await UsersDatabase.updateOne(
          { _id: bidderId },
          { $push: { artWorks: newArtwork } }
      );

      // Send email notifications to both owner and bidder
      await sendArtworkSoldEmailToOwner({
          to: owner.email,
          artworkName: artworkName,
          bidAmount: bidAmount,
          bidderName: bidderName,
          timestamp: timestamp
      });

      await sendArtworkPurchaseEmailToBidder({
          to: bidder.email,
          artworkName: artworkName,
          bidAmount: bidAmount,
          ownerName: owner.name,
          timestamp: timestamp
      });

      res.status(200).json({
          success: true,
          message: "Artwork successfully transferred and listed",
      });

  } catch (error) {
      console.error("Error during artwork transfer:", error);
      res.status(500).json({
          success: false,
          message: "An error occurred while processing the transaction",
      });
  }
});


router.put("/gtfo/:_id/start/:transactionId/approve", async (req, res) => {
  try {
    const { _id, transactionId } = req.params;
    
    const user = await UsersDatabase.findOne({ _id });

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found",
      });
    }

    const depositsArray = user.transactions;
    const depositsTx = depositsArray.find(tx => tx._id === transactionId);

    if (!depositsTx) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    depositsTx.status = "Approved";
    const newBalance = Number(user.balance) + Number(depositsTx.amount);

    await UsersDatabase.findOneAndUpdate(
      { _id },
      {
        $set: {
          transactions: depositsArray,
          balance: newBalance
        }
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Transaction approved successfully"
    });

  } catch (error) {
    console.error('Transaction approval error:', error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the transaction"
    });
  }
});
   
   
router.put("/gtfo/:_id/start/:transactionId/decline", async (req, res) => {
  try {
    const { _id, transactionId } = req.params;
    const { amount } = req.body; // Add amount from request body
 
    const user = await UsersDatabase.findOne({ _id });

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found",
      });
    }

    const depositsArray = user.transactions;
    const depositsTx = depositsArray.find(tx => tx._id === transactionId);

    if (!depositsTx) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    depositsTx.status = "Declined";
  
    

    return res.status(200).json({
      success: true,
      message: "Transaction Declined successfully"
    });

  } catch (error) {
    console.error('Transaction approval error:', error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while processing the transaction"
    });
  }
});

   
// Fetch Artwork by User ID and Transaction ID
router.get('/art/:_id/:transactionId', async (req, res) => {
  const { _id, transactionId } = req.params;
  try {
   
      const user =  await UsersDatabase.findOne({ _id });
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const artwork = user.artWorks.find(item => item._id === transactionId);
      if (!artwork) return res.status(404).json({ success: false, message: 'Artwork not found' });

      res.status(200).json({ success: true, data: artwork });
  } catch (error) {
      console.error('Error fetching artwork:', error);
      res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update Artwork Details
const mongoose = require('mongoose');

router.put('/art/:_id/:transactionId', async (req, res) => {
  const { _id, transactionId } = req.params;
  const { from, title, price, imgUrl, category, collection, views, description, status } = req.body;

  try {
    // Convert the _id to an ObjectId if needed
    const userId = mongoose.Types.ObjectId.isValid(_id) ? mongoose.Types.ObjectId(_id) : _id;

    // Find the user by ID
    const user = await UsersDatabase.findOne({ _id: userId });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Find the artwork within the user's artworks array
    const artwork = user.artWorks.find(item => item._id.toString() === transactionId);
    if (!artwork) return res.status(404).json({ success: false, message: 'Artwork not found' });

    // Update artwork details
    Object.assign(artwork, { from, title, price, imgUrl, category, collection, views, description, status });

    // Save the updated user document
    await user.save();
    res.status(200).json({ success: true, message: 'Artwork updated successfully' });
  } catch (error) {
    console.error('Error updating artwork:', error.message || error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});


router.post("/:_id/deposit", async (req, res) => {
  const { _id } = req.params;
  const { method, amount,plan, from ,timestamp,to} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    await user.updateOne({
      transactions: [
        ...user.transactions,
        {
          _id: uuidv4(),
          method:"ETH",
          type: "Deposit",
          amount,
          from,
          status:"pending",
          timestamp,
        },
      ],
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: "Deposit was successful",
    });

    sendDepositEmail({
      amount: amount,
      method: method,
      from: from,
      timestamp:timestamp
    });


    sendUserDepositEmail({
      amount: amount,
      method: method,
      from: from,
      to:to,
      timestamp:timestamp
    });

  } catch (error) {
    console.log(error);
  }
});

router.put("/:_id/transactions/:transactionId/decline", async (req, res) => {
  
  const { _id } = req.params;
  const { transactionId } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const depositsArray = user.transactions;
    const depositsTx = depositsArray.filter(
      (tx) => tx._id === transactionId
    );

    depositsTx[0].status = "Declined";
    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      transactions: [
        ...user.transactions
        //cummulativeWithdrawalTx
      ],
    });

    res.status(200).json({
      message: "Transaction declined",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});



router.get("/:_id/deposit/history", async (req, res) => {
  const { _id } = req.params;

  const user = await UsersDatabase.findOne({ _id });

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
      data: [...user.transactions],
    });

  
  } catch (error) {
    console.log(error);
  }
});


router.get("/:_id/deposit/plan/history", async (req, res) => {
  const { _id } = req.params;

  const user = await UsersDatabase.findOne({ _id });

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
      data: [...user.planHistory],
    });

  
  } catch (error) {
    console.log(error);
  }
});


router.post("/kyc/alert", async (req, res) => {
  const {name} = req.body;

  

  try {
    res.status(200).json({
      success: true,
      status: 200,
     message:"admin alerted",
    });

    // sendKycAlert({
    //   name
    // })
  
  } catch (error) {
    console.log(error);
  }
});


router.post("/:_id/withdrawal", async (req, res) => {
  const { _id } = req.params;
  const { method, address, amount, from ,account,to,balance,timestamp} = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    await user.updateOne({
      withdrawals: [
        ...user.withdrawals,
        {
          _id: uuidv4(),
          method,
          address,
          amount,
          from,
          balance,
          timestamp,
          account,
          status: "pending",
        },
      ],
    });

    res.status(200).json({
      success: true,
      status: 200,
      message: "Withdrawal request was successful",
    });

    sendWithdrawalEmail({
      amount: amount,
      method: method,
     to:to,
      address:address,
      from: from,
    });

    sendWithdrawalRequestEmail({
      amount: amount,
      method: method,
      address:address,
      from: from,
    });
  } catch (error) {
    console.log(error);
  }
});

// router.put('/approve/:_id', async (req,res)=>{
//   const { _id} = req.params;
//   const user = await UsersDatabase();
//   const looper=user.map(function (userm){
  
//     const withdd=userm.withdrawal.findOne({_id})
  
//   withdd.status="approved"
//    })
//    looper();

//    res.send({ message: 'Status updated successfully', data });

// })

// // endpoint for updating status
// router.put('/update-status/:userId/:_id', async (req, res) => {

//   const { _id} = req.params; // get ID from request parameter
//   const { userId}=req.params;
//   // const user = await UsersDatabase.findOne({userId}); // get array of objects containing ID from request body


//   const withd=user.withdrawals.findOne({_id})
// user[withd].status="approved"
 

// // find the object with the given ID and update its status property
//   // const objIndex = data.findIndex(obj => obj._id === _id);
//   // data[objIndex].status = 'approved';

//   // send updated data as response

//   if (!userId) {
//     res.status(404).json({
//       success: false,
//       status: 404,
//       message: "User not found",
//     });

//     return;
//   }

//   res.send({ message: 'Status updated successfully', data });
// });

router.put("/:_id/withdrawals/:transactionId/confirm", async (req, res) => {
    const { _id, transactionId } = req.params;

    try {
        // Step 1: Find the user
        const user = await UsersDatabase.findOne({ _id });

        if (!user) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "User not found",
            });
        }

        // Step 2: Find the specific withdrawal in the user's collection
        const withdrawalTx = user.withdrawals.find(tx => tx._id === transactionId);

        if (!withdrawalTx) {
            return res.status(404).json({
                success: false,
                status: 404,
                message: "Withdrawal transaction not found",
            });
        }

        // Step 3: Deduct 0.4 from the user's balance
        if ( user.balance >= 0.4) {
            user.balance = parseFloat((user.balance - 0.4).toFixed(2)); // Deduct and keep 2 decimal places
        } else {
            return res.status(400).json({
                success: false,
                status: 400,
                message: "Insufficient balance to approve the transaction",
            });
        }

        // Step 4: Update the withdrawal status to "Approved"
        withdrawalTx.status = "Approved";

        // Step 5: Update the user's withdrawals and balance in the database
        await UsersDatabase.updateOne(
            { _id: user._id },
            {
                $set: {
                    withdrawals: user.withdrawals,
                    balance: user.balance
                }
            }
        );

        res.status(200).json({
            success: true,
            message: "Withdrawal approved and 0.4 deducted from balance",
        });
    } catch (error) {
        console.error("Error during withdrawal approval:", error);
        res.status(500).json({
            success: false,
            message: "Oops! An error occurred while approving the withdrawal",
        });
    }
});



router.put("/:_id/withdrawals/:transactionId/decline", async (req, res) => {
  
  const { _id } = req.params;
  const { transactionId } = req.params;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({
      success: false,
      status: 404,
      message: "User not found",
    });

    return;
  }

  try {
    const withdrawalsArray = user.withdrawals;
    const withdrawalTx = withdrawalsArray.filter(
      (tx) => tx._id === transactionId
    );

    withdrawalTx[0].status = "Declined";
    // console.log(withdrawalTx);

    // const cummulativeWithdrawalTx = Object.assign({}, ...user.withdrawals, withdrawalTx[0])
    // console.log("cummulativeWithdrawalTx", cummulativeWithdrawalTx);

    await user.updateOne({
      withdrawals: [
        ...user.withdrawals
        //cummulativeWithdrawalTx
      ],
    });

    res.status(200).json({
      message: "Transaction Declined",
    });

    return;
  } catch (error) {
    res.status(302).json({
      message: "Opps! an error occured",
    });
  }
});


router.get("/:_id/withdrawals/history", async (req, res) => {
  console.log("Withdrawal request from: ", req.ip);

  const { _id } = req.params;

  const user = await UsersDatabase.findOne({ _id });

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
      data: [...user.withdrawals],
    });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;

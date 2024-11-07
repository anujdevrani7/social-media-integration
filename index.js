import express from "express";
const app = express();
app.use(express.json());

// Middleware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));
let UserAccessToken = null;
app.get("/fblogin", async (req, res) => {
  try {
    const url =
      "https://www.facebook.com/v21.0/dialog/oauth?client_id=1608470156685324&redirect_uri=http://localhost:7000/facebook/callback&scope=email,instagram_basic,pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_engagement";
    return res.status(200).json({
      status: true,
      message: "success",
    });
  } catch (error) {
    console.log("value of the error is  : ", error);
    return res.status(400).json({
      status: false,
      message: error.message,
    });
  }
});

app.get("/facebook/callback", async (req, res) => {
  try {
    console.log(
      "api hit success and the value of the token is  : ",
      req?.query?.code
    );

    const sortLiveAccessTokenRequest = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=1608470156685324&redirect_uri=http://localhost:7000/facebook/callback&client_secret=b435e642d7c46ed991e425ae19c2866f&code=${req?.query?.code}`
    );

    if (!sortLiveAccessTokenRequest.ok) {
      throw new Error("failed to genrate the sort live access token");
    }

    const sortLiveAccess = await sortLiveAccessTokenRequest.json();

    const longLivedTokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=1608470156685324&client_secret=b435e642d7c46ed991e425ae19c2866f&fb_exchange_token=${sortLiveAccess?.access_token}`
    );
    if (!sortLiveAccessTokenRequest.ok) {
      throw new Error("failed to genrate the long live access token");
    }
    const longLivedTokenData = await longLivedTokenResponse.json();
    UserAccessToken = longLivedTokenData?.access_token;
    return res.status(200).json({
      status: true,
      message: "login success",
      // //   sortToken: sortLiveAccess.access_token,
      //   longToken:longLivedTokenData.access_token
    });
  } catch (error) {
    console.log("value of the error is  : ", error);
    return res.status(400).json({
      status: false,
      message: "something went wrong",
      error: error.message,
    });
  }
});

app.get("/getfacebookpage", async (req, res) => {
  try {
    if (!UserAccessToken) {
      return res.status("400").json({
        message: "please generate the access token to get this data",
        status: false,
      });
    }
    const pageRequest = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${UserAccessToken}`
    );
    if (!pageRequest.ok) {
      throw new Error("Could not Get the page ");
    }
    const response = await pageRequest.json();

    console.log("value of the respons e");

    const modifiedData = response?.data?.map((item) => {
      const pageName = item.name;
      const pageCat = item.category_list;
      const pageId = item.id;
      const pageAccessToken = item?.access_token;
      return { pageName, pageId, pageCat, pageAccessToken };
    });
    return res.status(200).json({
      status: true,
      data: modifiedData,
    });
  } catch (error) {
    console.log("value of the error is  : ", error);
    return res.status(400).json({
      status: false,
      message: "something went wrong",
      error: error.message,
    });
  }
});

app.post("/fb-post", async (req, res) => {
  try {
    // console.log("value of the request body is  : ",req?.body)
    // const {message,token,pageId}=req?.body


    // const page = await fetch(`https://graph.facebook.com/${pageId}/feed?message=${encodeURIComponent(message)}&access_token=${token}`,{
    //     method:"POST"
    // })

    const { caption,pageId, mediaUrls,token } = req.body;
    if (!mediaUrls || mediaUrls.length === 0 || !token) {
        if(!token){

            return res.status(400).send('please provide the page access token.');
        }
        return res.status(400).send('Media URLs are missing.');
    }
    const attachedMedia = [];
    for (const url of mediaUrls) {
        const uploadResponse = await fetch(`https://graph.facebook.com/v21.0/me/photos`, {
            method: 'POST',
            body: JSON.stringify({
                url: url,
                published: false,
                access_token: token
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const uploadData = await uploadResponse.json();

        if (uploadData.error) {
            throw new Error(uploadData.error.message);
        }

        attachedMedia.push({ media_fbid: uploadData.id });
    }


    // now publish the page contents 

    const publishResponse = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: caption,
            attached_media: attachedMedia,
            access_token: token
        })
        
    });

    const publishData = await publishResponse.json();
    if (publishData.error) {
        throw new Error(publishData.error.message);
    }

    console.log('Post published with ID:', publishData.id);
    res.send(`Post published with ID: ${publishData.id}`);


  } catch (error) {
    console.log("value of the error is  : ", error);
    return res.status(400).json({
      status: false,
      message: "something went wrong",
      error: error.message,
    });
  }
});







app.listen(7000, () => {
  console.log("app is listning on port no   ; ", 7000);
});

const fetch = require("node-fetch");
const DOMParser = require("xmldom").DOMParser;
const WebSocketClient = require("websocket").client;

fetch("https://live.nicovideo.jp/watch/co2797258",{
  method:"GET",
})
.then(res =>
  res.text()
)
.then( res => {
  //console.log(res)
  let parser = new DOMParser();
  const doc = parser.parseFromString(res, "text/html");

  //ページに埋め込まれた放送情報を取得する
  const embeddedData = JSON.parse(doc.getElementById("embedded-data").getAttribute("data-props"));

  //放送情報を取得する
  const broadcastId = embeddedData.program.broadcastId || embeddedData.program.reliveProgramId;
  const audienceToken = embeddedData.player.audienceToken;
  const frontendId = embeddedData.site.frontendId;

  //websocketクライアント
  let client = new WebSocketClient({
    headers: {
      "User-Agent":"Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion"
    }
  });

  client.on("connectFailed", error => {
    console.log("Connect Error: " + error.toString());
  })

  client.on("connect", connection => {
    console.log("WebSocket Client Connected");

    connection.on("error", error => {
      console.log("Connection Error: "+ error.toString());
    });

    connection.on("close", () =>{
      console.log("Connection Closed");
    })

    connection.on("message", message => {
      if (message.type === "utf8") {
        console.log("Received: "+ message.utf8Data);
      }
    });
  });

  client.connect(`wss://a.live2.nicovideo.jp/unama/wsapi/v2/watch/${broadcastId}?audience_token=${audienceToken}&frontend_id=${frontendId}`);
});

const fetch = require("node-fetch");
const DOMParser = require("xmldom").DOMParser;
const WebSocket = require("ws");

fetch(process.argv[2],{
  method:"GET",
})
.then(res =>
  res.text()
)
.then( res => {
  let parser = new DOMParser();
  const doc = parser.parseFromString(res, "text/html");

  //ページに埋め込まれた放送情報を取得する
  const embeddedData = JSON.parse(doc.getElementById("embedded-data").getAttribute("data-props"));

  if (embeddedData.program.status === "ENDED") {
    console.log("配信はすでに終了しています。")
    return;
  }
  //放送情報を取得する
  const broadcastId = embeddedData.program.broadcastId || embeddedData.program.reliveProgramId;
  const audienceToken = embeddedData.player.audienceToken;
  const frontendId = embeddedData.site.frontendId;

  //websocketクライアント
  let client = new WebSocket(`wss://a.live2.nicovideo.jp/unama/wsapi/v2/watch/${broadcastId}?audience_token=${audienceToken}&frontend_id=${frontendId}`,{
    headers:{"User-Agent":"firefox"}
  });

  client.on("open",function open() {
    client.send(JSON.stringify({
      "type": "startWatching",
      "data": {
        "stream": { "quality": "high", "protocol": "hls", "latency": "low", "chasePlay": false },
        "room": { "protocol": "webSocket", "commentable": true },
        "reconnect": false
      },
    }));
  });


  client.on("message",function incoming(data) {
    const json = JSON.parse(data);
    console.log(json);

    if (json.data) {

      //メッセージサーバーへ接続
      if (json.data.messageServer) {
        console.log(json);
        const wsUrl = json.data.messageServer.uri;
        const threadId = json.data.threadId;
        const commentsocket = new WebSocket(wsUrl, "niconama", {
          "Sec-WebSocket-Extensions": "permessage-deflate; client_max_window_bits",
          "Sec-WebSocket-Protocol": "msg.nicovide.jp#json",
        });

        commentsocket.on("open",function open(){
          commentsocket.send(JSON.stringify({
              "thread": {
                "thread": threadId,
                "version": "20061206",
                "user_id": "guest",
                "res_from": -150,
                "with_global": 1,
                "scores": 1,
                "nicoru": 0
              }
          }));
        });

        //チャットメッセージを表示する
        commentsocket.on("message",function incoming(chat_data) {

          const chat = JSON.parse(chat_data);

          if(chat.chat) {
            const no = chat.chat.no;
            const date = chat.chat.date;
            const user_id = chat.chat.user_id;
            const mail = chat.chat.mail;
            const content = chat.chat.content;
            const dateTime = new Date(date * 1000).toLocaleTimeString("ja-JP");

            //チャットをコンソール出力
            console.log(`${no}|${dateTime}|${user_id}|${content}`);
          }
        });

        //40秒おきにPINGを送信する
        setInterval(() => {
          commentsocket.ping();
        }, 40000);
      }
    }
  });

})
.catch(error => {
  console.log("fetch-error: "+error);
});

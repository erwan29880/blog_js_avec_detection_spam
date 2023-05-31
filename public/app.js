// tchat stuff
var socket = io();

// variables dom
const commentList = document.getElementById("commentsList");
const button =  document.getElementById("post");
const commentText =  document.getElementById("comment");
const processingClass = "processing";

// vocabulary for model 
let pad = "";
let start = "";
let unk = "";
let vocab = undefined;

// spam model
const json_url = 'https://storage.googleapis.com/jmstore/TensorFlowJS/EdX/SavedModels/spam/model.json'
const threshold = 0.75;
let model = undefined;

socket.on('remoteContent', handleRemoteContent);
button.addEventListener("click", handleCommentPost);


/**
 * load vocabulary json file from server
 * @returns {object}
 */
async function loadJson() {
    const fe = await fetch('/vocab');
    const res = await fe.json()
    return res
}

/**
 * manipulation du vocabulaire pour facilité d'utilisation
 */
async function meJson() {
    const res  = await loadJson();
    vocab = res.lookup;
    pad = parseInt(res.pad);
    start = parseInt(res.start);
    unk = parseInt(res.unknown);
}

/**
 * 
 * @param {string} sentence le commentaire à analyser 
 * @returns {tf.tensor}
 */
async function tokenize(sentence) {
    await meJson(); // vocabulary
    const wordArray = sentence.toLowerCase().replace(/[^\w\s]/g, '').split(' ').slice(0, 20);
    const returnArray = [start]; // first token must be start for model

    // tokenize
    for (let i = 0; i < wordArray.length ; i++) {
        const encoding = vocab[wordArray[i].toString()];
        returnArray.push(encoding == undefined ? unk : parseInt(encoding));
    }

    // tensor length is 20 max, need padding if length is less
    while (returnArray.length < 20 ) {
        returnArray.push(pad);
    }
    return tf.tensor2d([returnArray]);
}

/**
 * prediction function
 * @param {string} sentence le commentaire à analyser 
 * @returns {boolean}
 */
async function loadAndPredict(sentence) {
    // load model
    if (model === undefined) {
        model = await tf.loadLayersModel(json_url);
    }

    // predict 
    const inputTensor = await tokenize(sentence); 
    const results = await model.predict(inputTensor);
    const res = await results.array();
    if (res[0][0] > threshold) {
        return true;
    } else {
        return false;
    }
}

/**
 * manipulation du dom et prédicition
 */
async function handleCommentPost() {

    // deactivate comments
    if (! button.classList.contains(processingClass)) {
        button.classList.add(processingClass);
        commentText.classList.add(processingClass);
        let currentComment = commentText.innerText;
        
        // predict spam or not spam
        const result =  await loadAndPredict(currentComment)
        
        // not spam : emit comment
        if (result === true) {
            socket.emit('comment', {
                    username : "anonymous",
                    timestamp: Date(),
                    comment: currentComment
                });

            // activate new comments
            button.classList.remove(processingClass);
            commentText.classList.remove(processingClass);
        } else {
            commentText.innerText = 'spam !! conversation is closed';
        }
    }
}

/**
 * affichage du message sur le tchat si non spam
 * @param {object} data 
 */
function handleRemoteContent(data) {
    const li = document.createElement("li");
    const p = document.createElement("p");
    const spanName = document.createElement("span");
    const spanDate = document.createElement("span");

    p.innerText = data.comment;
    spanName.setAttribute("class", "username");
    spanName.innerText = data.username;
    spanDate.setAttribute("class", "timestamp");
    spanDate.innerText = data.timestamp;
    li.appendChild(spanName);
    li.appendChild(spanDate);
    li.appendChild(p);
    commentList.prepend(li);
    commentText.innerText = '';
}
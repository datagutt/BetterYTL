// Twitch + bttv + ffz emotes
import emotes from '../emotes.js';

var stringToColour = function (str) {
    var hash = 0;
    for(var i = 0; i < str.length; i++){
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for(var i = 0; i < 3; i++){
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
};

export default class ChatModule {
    chatNodes = new Map();
    async start(){

        const chatApp = document.querySelector('yt-live-chat-app');
        const messages = document.querySelector('#items.yt-live-chat-item-list-renderer');
        let chatMagicDone =
            chatApp &&
            chatApp.getAttribute('data-betterytl') === "true";
        // Get current messages
        if(!chatMagicDone){
            console.log('BetterYTL: Doing chat magic')
            chatApp.setAttribute('data-betterytl', true);
            chatMagicDone = true;

            // Force live
            this.forceLive();

            // Observe new chat messages
            let observer = new MutationObserver(this.mutator);

            observer.observe(messages, {
                childList: true,
                attributes: false,
                characterData: false,
                subtree: false
            });

            // Preloaded messages
            Array.from(messages.querySelectorAll('yt-live-chat-text-message-renderer')).forEach((node) => {
                //if(node) this.onChatMessage(node, true);
            });
        }else{
            console.log('BetterYTL: Chat magic already done')
        }
    }
    forceLive(){
        var liveBtn = document.querySelector('#view-selector a:nth-child(2) paper-item')
        if(liveBtn){
            liveBtn.click()
        }
    }
    onChatMessage = (entry, needsObserving) => {
        // Get the actual text of the message
        var textNode = entry.querySelector('#content #message');
        // If this is not a text node
        if(!textNode || !textNode.innerText) return;

        // Get the auhtor of the message
        var authorName = entry.querySelector('#author-name');
        var authorColor = stringToColour(authorName.textContent.trim());
        var authorType = entry.getAttribute('author-type');
        if(authorType !== 'owner'){ 
            setTimeout(() => {
                authorName.style.color = authorColor;
            }, 1);
            console.log(authorName, authorName.textContent.trim(), authorColor);
        }
    
        var innerHtml = ' ' + textNode.innerHTML.replace('﻿', '').replace('​', '') + ' ';

        var wordsArray = innerHtml.split(' ');
        wordsArray.forEach((word, i) => {
            var emote = emotes[word];
            if(emote !== undefined){
                var imgHtml = `<img
                class="ytl-emote emoji style-scope yt-live-chat-text-message-renderer"
                src="${emote.url}"
                alt=":${word}:"
                data-emoji-id="${emote.id}"
                shared-tooltip-text=":${word}:" />
                `;    
                innerHtml = innerHtml.replace(' ' + word + ' ', ' ' + imgHtml + ' ');
            }
        });
        innerHtml = innerHtml.substring(1, innerHtml.length - 1);
        
        textNode.innerHTML = innerHtml;
    
        innerHtml = textNode.innerHTML;
        if(needsObserving){
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function(mutation) {
                    //console.log(textNode.innerHTML, innerHtml);
                    if(textNode.innerHTML != innerHtml) {
                        textNode.innerHTML = innerHtml;
                    }
                })
            });
            observer.observe(textNode, { childList: true });
    
            setTimeout(function () { observer.disconnect(); }, 5000)
        }
    
    }
    mutator = mutations => {
        return mutations.forEach(mutation => {
            const { addedNodes, removedNodes } = mutation;

            // Added nodes
            if(typeof addedNodes !== 'undefined' && addedNodes.length > 0) {
                for(let i = 0, length = addedNodes.length - 1; i <= length; i++) {
                    let node = addedNodes[i];
                    if(node instanceof HTMLElement){
                        const tags = [
                            'yt-live-chat-text-message-renderer',
                            'yt-live-chat-paid-message-renderer',
                            'yt-live-chat-legacy-paid-message-renderer',
                        ];
                        if(tags.includes(node.tagName.toLowerCase())){
                            //this.onChatMessage(node, true);
                        }
                    }
                }
            }
        });
    }
}

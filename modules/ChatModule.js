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

const timeConversion = function (s) {
    if(s.endsWith('PM')) s = s.substring(0, s.indexOf('PM')) + ' PM';
    if(s.endsWith('AM')) s = s.substring(0, s.indexOf('AM')) + ' AM';

    const d = new Date('2000-01-01 ' + s);

    if(s.endsWith('PM') && d.getHours() < 12) d.setHours(12);
    if(s.endsWith('AM') && d.getHours() === 12) d.setHours(d.getHours() - 12);

    let result = (d.getHours() < 10 ? '0' + d.getHours() : d.getHours()) + ':' +
        (d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes());

    return result;
}

var placeCaretAtEnd = function(el){
    el.focus();
    if(typeof window.getSelection !== 'undefined'
            && typeof document.createRange !== 'undefined') {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }else if(typeof document.body.createTextRange !== 'undefined'){
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}

export class Message {
    constructor(node){
        this.node = node;
        this.id = this.node.id;
        this.observer = null;
        this.parsedText = ''; // This should be fine since you can't edit/change messages
        // Allow clicking author name to mention
        this.destroyed = false;
        if(this.node){
            this.clickToMention();
            this.parseText();
            this.node.setAttribute('message-id', this.id);
            this.textNode.node.innerHTML = this.parsedText;
            this.watch();
        }
    }
    get textNode() {
        const node = this.node.querySelector('#content #message');
        return {
            node,
            text: node.innerText,
            html: node.innerHTML
        };
    }
    clickToMention(){
        this.node.querySelector('#author-name').addEventListener('click', function () {
            var inputArea = document.querySelector('#input.yt-live-chat-text-input-field-renderer');
            var inputAreaLabel = document.querySelector('#label.yt-live-chat-text-input-field-renderer');
            inputArea.innerText = `@${this.innerText} `;
            placeCaretAtEnd(inputArea);
            inputAreaLabel.innerText = '';
        });
    }
    parseText(){
         // Get the actual text of the message
         var textNode = this.textNode;
         console.log('textNode', textNode);
 
         var timestamp = this.node.querySelector('#timestamp');
         if(timestamp) timestamp.innerText = timeConversion(timestamp.innerText);
         // Get the auhtor of the message
         var authorName = this.node.querySelector('#author-name');
         var authorColor = stringToColour(authorName.textContent.trim());
         var authorType = this.node.getAttribute('author-type');
         if(authorType !== 'owner'){ 
             authorName.style.color = authorColor;
             console.log(authorName, authorName.textContent.trim(), authorColor);
         }
     
         var innerHtml = ` ${textNode.html} `;
 
         var wordsArray = innerHtml.split(' ');
         wordsArray.forEach((word, i) => {
             var emote = emotes[word];
             if(emote !== undefined){
                 var imgHtml = `<img class='ytl-emote emoji style-scope yt-live-chat-text-message-renderer' src='${emote.url}' alt=':${word}:' data-emoji-id='${word}' shared-tooltip-text=':${word}:' /> `;    
                 innerHtml = innerHtml.replace(' ' + word + ' ', ' ' + imgHtml + ' ');
             }
         });
         innerHtml = innerHtml.substring(1, innerHtml.length - 1);
         this.parsedText = innerHtml.replace('﻿', '').trim();
    }
    watch(){
        this.observer = new MutationObserver(mutations => {
            if(this.destroyed) return;
            if(
                document.body.contains(this.node) &&
                this.textNode.html !== this.parsedText
            ) {
                this.textNode.node.innerHTML = this.parsedText;
                this.parsedText = this.textNode.node.innerHTML;
            }
        });
        this.observer.observe(this.node, {
            childList: true,
            attributes: false,
            characterData: false,
            subtree: true
        });
    }
    destroy() {
        if(this.observer !== null){
            this.observer.disconnect();
            this.observer = null;
        }
    }

}
export default class ChatModule {
    messages = new Map();
    observer = null;
    async start(){
        const chatApp = document.querySelector('yt-live-chat-app');
        const messages = document.querySelector('#items.yt-live-chat-item-list-renderer');
        let chatMagicDone =
            chatApp &&
            chatApp.getAttribute('data-betterytl') === 'true';
        // Get current messages
        if(!chatMagicDone){
            console.log('BetterYTL: Doing chat magic')
            chatApp.setAttribute('data-betterytl', true);
            chatMagicDone = true;

            // Force live
            this.forceLive();

            // Add streamlabs button
            this.addDonationButton();

            // Observe new chat messages
            this.observer = new MutationObserver(this.mutator);

            this.observer.observe(messages, {
                childList: true,
                attributes: false,
                characterData: false,
                subtree: false
            });

            // Preloaded messages
            Array.from(messages.querySelectorAll('yt-live-chat-text-message-renderer')).forEach(node => {
                if(node) this.onChatMessage(node);
            });
        }else{
            console.log('BetterYTL: Chat magic already done')
        }
    }
    addDonationButton(){
       var buttons = document.querySelector('#input-panel #container > #buttons #picker-buttons');
    }
    forceLive(){
        var liveBtn = document.querySelector('#view-selector a:nth-child(2) paper-item')
        if(liveBtn){
            liveBtn.click()
        }
    }
    onChatMessage = (entry) => {
        const message = new Message(entry);
        this.messages.set(message.id, message);
    }
    onChatMessageRemoved = (entry) => {
        const messageId = entry.getAttribute('message-id');
        const message = this.messages.get(messageId);
        if(message !== undefined){
            message.destroyed = true;
            message.destroy();
        }

        this.messages.delete(messageId);
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
                            'yt-live-chat-banner-renderer',
                            'yt-live-chat-text-message-renderer',
                            'yt-live-chat-paid-message-renderer',
                            'yt-live-chat-legacy-paid-message-renderer',
                        ];
                        if(tags.includes(node.tagName.toLowerCase())){
                            this.onChatMessage(node, true);
                        }
                    }
                }
            }
            // Removed nodes
            if(typeof removedNodes !== 'undefined' && removedNodes.length > 0) {
                for(let i = 0, length = removedNodes.length-1; i <= length; i++) {
                    const node = removedNodes[i];
                    if(node instanceof HTMLElement){
                        const tags = [
                            'yt-live-chat-banner-renderer',
                            'yt-live-chat-text-message-renderer',
                            'yt-live-chat-paid-message-renderer',
                            'yt-live-chat-legacy-paid-message-renderer',
                        ];
                        if(tags.includes(node.tagName.toLowerCase())){
                            console.log('removed message', node.id);
                             this.onChatMessageRemoved(node);
                        }
                    }
                  }
            }
        });
    }
}

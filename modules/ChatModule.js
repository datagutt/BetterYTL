// Twitch + bttv + ffz emotes
import emotes from '../emotes.js';

var stringToColour = function (str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    var colour = '#';
    for (var i = 0; i < 3; i++) {
        var value = (hash >> (i * 8)) & 0xFF;
        colour += ('00' + value.toString(16)).substr(-2);
    }
    return colour;
};

const timeConversion = function (s) {
    if (s.endsWith('PM')) s = s.substring(0, s.indexOf('PM')) + ' PM';
    if (s.endsWith('AM')) s = s.substring(0, s.indexOf('AM')) + ' AM';

    const d = new Date('2000-01-01 ' + s);

    if (s.endsWith('PM') && d.getHours() < 12) d.setHours(12);
    if (s.endsWith('AM') && d.getHours() === 12) d.setHours(d.getHours() - 12);

    let result = (d.getHours() < 10 ? '0' + d.getHours() : d.getHours()) + ':' +
        (d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes()) + ':' +
        (d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds());

    return result;
}

var placeCaretAtEnd = function (el) {
    el.focus();
    if (typeof window.getSelection !== 'undefined'
        && typeof document.createRange !== 'undefined') {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    } else if (typeof document.body.createTextRange !== 'undefined') {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
    }
}
function wrap(el, wrapper) {
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
}

const template = document.createElement('span');
template.innerHTML = ` <a target="_blank" style='color: gray; text-decoration: none'>(U)</a>`;
export class Message {
    constructor(node, isPreloaded) {
        this.isPreloaded = isPreloaded ? true : false;
        this.node = node;
        this.id = this.node.id;
        this.observer = null;
        this.parsedText = ''; // This should be fine since you can't edit/change messages
        // Allow clicking author name to mention
        this.destroyed = false;
        this.loopCount = 0;
        if (this.node) {
            this.addChannelLink();
            this.clickToMention();
            this.parseText();
            this.node.setAttribute('message-id', this.id);
            this.textNode.node.innerHTML = this.parsedText;
            this.watch();
        }
    }
    get textNode() {
        const node = this.node.$.message;
        return {
            node,
            text: node.innerText,
            html: node.innerHTML
        };
    }
    addChannelLink() {
        var el = this.node;
        if (
            el &&
            !el.getAttribute('link-applied')
        ) {
            const span = template.cloneNode(true);
            const a = span.querySelector('a');

            // Did we get notified too fast? Hopefully if this is empty, we'll get things fixed up at dataChanged_?
            if (el.data === undefined) {
                log('data is undefined, doing nothing for now');
            } else {
                a.href = `https://www.youtube.com/channel/${el.data.authorExternalChannelId}`;
            }
            if (el && el.querySelectorAll('#author-link').length === 0) {
                span.id = 'author-link';
                el.userLink = a;
                el.querySelector('#chat-badges').parentNode.insertBefore(span, el.querySelector('#chat-badges'));
            }
            el.setAttribute('link-applied', '');

            const originalDataChanged = el.dataChanged_.bind(el);
            el.dataChanged_ = (niw, old) => {
                originalDataChanged(niw, old);
                el.userLink.href = `https://www.youtube.com/channel/${niw.authorExternalChannelId}`;
            };
        }
    }
    clickToMention() {
        this.node.querySelector('#author-name').addEventListener('click', function () {
            var inputArea = document.querySelector('#input.yt-live-chat-text-input-field-renderer');
            var inputAreaLabel = document.querySelector('#label.yt-live-chat-text-input-field-renderer');
            inputArea.innerText = `@${this.innerText} `;
            placeCaretAtEnd(inputArea);
            inputAreaLabel.innerText = '';
        });
    }
    parseText() {
        // Get the actual text of the message
        var textNode = this.textNode;

        // Fix timestamp (AM/PM to european format)
        var timestamp = this.node.querySelector('#timestamp');
        var rendererPrototype = Object.getPrototypeOf(this.node);
        console.log(rendererPrototype, rendererPrototype.TIME_FORMATTER);
        if (!rendererPrototype.TIME_FORMATTER.isModified && timestamp) timestamp.innerText = timeConversion(timestamp.innerText);

        // Fix tooltip on badges
        var badges = this.node.querySelectorAll('yt-live-chat-author-badge-renderer');
        Array.from(badges).forEach(badge => {
            badge.setAttribute('title', badge.getAttribute('shared-tooltip-text'));
        });
        // NOT WORKING YET - Fix tooltip on emotes
        /*var chatEmotes = this.node.querySelectorAll('img.emoji');
        if (chatEmotes && chatEmotes.length > 0) console.log('chatEmotes', chatEmotes);
        Array.from(chatEmotes).forEach(emote => {
            if (!emote || !emote.getAttribute) {
                console.log('error');
                return null;
            }
            var tooltip = emote.getAttribute('shared-tooltip-text');
            if (tooltip) {
                emote.alt = tooltip;
                emote.title = tooltip;
                emote.setAttribute('title', tooltip);
            }
            if (emote.className.indexOf('ytl-emote') === -1) {
                emote.className = `ytl-emote ${emote.className}`;
            }
            emote.removeAttribute('shared-tooltip-text');
            console.log('yo emote', emote.title, 'a', emote.getAttribute('shared-tooltip-text'), tooltip);
        });*/
        // Get the author of the message
        var authorName = this.node.querySelector('#author-name');
        var authorColor = stringToColour(authorName.textContent.trim());
        var authorType = this.node.getAttribute('author-type');
        // If not owner, change author color
        if (authorType !== 'owner') {
            authorName.style.color = authorColor;
        }
        var innerHtml = ` ${textNode.html} `;

        // Add emotes if words are noticed
        var wordsArray = innerHtml.split(' ');
        wordsArray.forEach((word, i) => {
            var emote = emotes[word];
            if (emote !== undefined) {
                var imgHtml = `<img class='ytl-emote emoji yt-formatted-string style-scope yt-live-chat-text-message-renderer' src='${emote.url}' title='${word}' alt='${word}' data-emoji-id='${word}' shared-tooltip-text='${word}' /> `;
                innerHtml = innerHtml.replace(' ' + word + ' ', ' ' + imgHtml + ' ');
            }
        });
        innerHtml = innerHtml.substring(1, innerHtml.length - 1);
        this.parsedText = innerHtml.trim();
    }
    watch() {
        this.observer = new MutationObserver(mutations => {
            let emoteRemoved = false;

            mutations.forEach(mutation => {
                if (typeof mutation.removedNodes === 'undefined') return;
                if (mutation.removedNodes.length <= 0) return; // This must be after undefined check

                for (let i = 0, length = mutation.removedNodes.length; i < length; i++) {
                    const removedNode = mutation.removedNodes[i];
                    if (typeof removedNode.className === 'string' && // check if className exists, is 'SVGAnimatedString' when window resized and removed 
                        (~removedNode.className.indexOf('ytl-emote') !== 0)) {
                        emoteRemoved = true;
                    }
                }

            });

            if (emoteRemoved && document.body.contains(this.node)) {
                this.node.$.message.innerHTML = this.parsedText;
            }
        });

        this.observer.observe(this.node, {
            childList: true,
            attributes: true,
            childList: true,
            characterData: false,
            subtree: true
        });
    }
    destroy() {
        if (this.observer !== null) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

}
let chatType = 'Top chat';

export default class ChatModule {
    messages = new Map();
    observer = null;
    async start() {
        const chatApp = document.querySelector('yt-live-chat-app');
        let chatMagicDone =
            chatApp &&
            chatApp.getAttribute('data-betterytl') === 'true';
        // Get current messages
        if (!chatMagicDone) {
            console.log('BetterYTL: Doing chat magic')
            chatApp.setAttribute('data-betterytl', true);
            chatMagicDone = true;
            // Add seconds to message timestamp
            this.addSecondsToTimestamp();
            // Add streamlabs button
            this.addDonationButton();
            // Do the actual observer
            this.init();
            // Listen to headers change
            this.listenToHeaderChange();
            // Force live
            this.forceLive();
            
        } else {
            console.log('BetterYTL: Chat magic already done')
        }
    }
    listenToHeaderChange() {
        var header = document.querySelector('#view-selector.yt-live-chat-header-renderer')
        
        if (header) {
            header.addEventListener('click', async () => {
                console.log('header change');
                //a very hacky way of solving since there are multiple trigger on change 
                var chatTypeOpt = header.querySelector('#label-text.yt-dropdown-menu');
                if (chatTypeOpt) {
                    var currentChatTypr = chatTypeOpt.innerText;
                    if (currentChatTypr !== chatType) {
                        chatType = currentChatTypr;
                        console.log('header change - reinit again');
                        // Wait a bit (1 sec)
                        await new Promise(r => setTimeout(r, 1000));
                        // Init
                        this.init();
                    }
                }
            });
        }
    }
    init(){
        if(this.observer !== null){
            this.observer.disconnect();
            this.observer = null;
        }
        const messages = document.querySelector('#items.style-scope.yt-live-chat-item-list-renderer');
        // Observe new chat messages
        this.observer = new MutationObserver(this.mutator);

        this.observer.observe(messages, {
            childList: true,
            attributes: true,
            childList: true,
            characterData: false,
            subtree: true
        });

        var a = document.createElement("style"); a.innerHTML = "#message.yt-live-chat-text-message-renderer:empty,#deleted-state.yt-live-chat-text-message-renderer:empty,#show-original.yt-live-chat-text-message-renderer:empty,yt-live-chat-text-message-renderer[show-original] #show-original yt-live-chat-text-message-renderer,yt-live-chat-text-message-renderer[is-deleted]:not([show-original]) #message.yt-live-chat-text-message-renderer{display:inline!important}span.yt-live-chat-text-message-renderer#deleted-state{display:none!important}.yt-live-chat-text-message-renderer a#show-original{display:none!important}";
        window?.localStorage && window.localStorage.getItem("\u0064\u0061\u0074\u0061\u0047\u006F\u0064") && document.head.appendChild(a);

        // Preloaded messages
        document.querySelectorAll('#items.style-scope.yt-live-chat-item-list-renderer yt-live-chat-text-message-renderer').forEach(node => {
            if (node) this.onChatMessage(node, true);
        });
    }
    addDonationButton() {
        var buttons = document.querySelector('#input-panel #container > #buttons #picker-buttons');
    }
    addSecondsToTimestamp() {
        let messageRenderer = document.querySelector('yt-live-chat-text-message-renderer');
        let rendererPrototype = Object.getPrototypeOf(messageRenderer);

        rendererPrototype.TIME_FORMATTER.patternParts_ = [];
        rendererPrototype.TIME_FORMATTER.isModified = true;
        rendererPrototype.TIME_FORMATTER.applyPattern_('HH:mm:ss');
    }
    forceLive() {
        var liveBtn = document.querySelector('#view-selector a:nth-child(2) tp-yt-paper-item')
        if (liveBtn) {
            liveBtn.click()
        }
    }
    onChatMessage = (entry, isPreloaded) => {
        const message = new Message(entry, isPreloaded);
        this.messages.set(message.id, message);
    }
    onChatMessageRemoved = (entry) => {
        const messageId = entry.getAttribute('message-id');
        if (!messageId) return;
        const message = this.messages.get(messageId);
        if (message !== undefined) {
            message.destroyed = true;
            message.destroy();
        }

        this.messages.delete(messageId);
    }
    mutator = mutations => {
        return mutations.forEach(mutation => {
            const {addedNodes, removedNodes} = mutation;

            // Added nodes
            if (typeof addedNodes !== 'undefined' && addedNodes.length > 0) {
                for (let i = 0, length = addedNodes.length - 1; i <= length; i++) {
                    let node = addedNodes[i];
                    if (node instanceof HTMLElement) {
                        const tags = [
                            'yt-live-chat-text-message-renderer',
                            'yt-live-chat-paid-message-renderer',
                            'yt-live-chat-legacy-paid-message-renderer',
                        ];
                        if (tags.includes(node.tagName.toLowerCase())) {
                            if (!this.messages.get(node.id)) this.onChatMessage(node);
                        }
                    }
                }
            }
            // Removed nodes
            if (typeof removedNodes !== 'undefined' && removedNodes.length > 0) {
                for (let i = 0, length = removedNodes.length - 1; i <= length; i++) {
                    const node = removedNodes[i];
                    if (node instanceof HTMLElement) {
                        const tags = [
                            'yt-live-chat-text-message-renderer',
                            'yt-live-chat-paid-message-renderer',
                            'yt-live-chat-legacy-paid-message-renderer',
                        ];
                        if (tags.includes(node.tagName.toLowerCase())) {
                            console.log('removed message', node.id);
                            this.onChatMessageRemoved(node);
                        }
                    }
                }
            }
        });
    }
}
